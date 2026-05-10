/**
 * Social Store — Zustand store for live social platform state.
 * Bridges local NPC content with real Supabase-backed user posts.
 * Falls back gracefully when user is in guest mode or offline.
 */
import { create } from 'zustand';
import { useAuthStore } from './authStore';
import {
  fetchPosts, createPost, deletePost,
  fetchComments, createComment,
  likePost, unlikePost, fetchUserLikes,
  followUser, unfollowUser, fetchFollowing, fetchFollowerCount,
  fetchLeaderboard, upsertLeaderboardScore,
  subscribeToNewPosts, subscribeToPostUpdates,
  type SocialPost, type SocialComment, type LeaderboardEntry,
} from '../lib/socialSync';

interface SocialState {
  // Live posts from Supabase
  livePosts: SocialPost[];
  livePostsLoading: boolean;
  livePostsLoaded: boolean;

  // Comments (per post)
  commentsCache: Record<string, SocialComment[]>;
  commentsLoading: Record<string, boolean>;

  // User's likes (post IDs)
  userLikes: Set<string>;

  // User's follows (user IDs)
  userFollowing: Set<string>;
  followerCount: number;

  // Leaderboard
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;

  // Realtime subscription cleanup
  _realtimeCleanup: (() => void) | null;

  // Actions
  loadPosts: () => Promise<void>;
  publishPost: (text: string) => Promise<SocialPost | null>;
  removePost: (postId: string) => Promise<void>;
  loadComments: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleFollow: (userId: string) => Promise<void>;
  loadUserSocialData: () => Promise<void>;
  loadLeaderboard: () => Promise<void>;
  syncLeaderboardScore: (data: Omit<LeaderboardEntry, 'updated_at'>) => Promise<void>;
  startRealtime: () => void;
  stopRealtime: () => void;
}

function getUserId(): string | null {
  const { user, guestMode } = useAuthStore.getState();
  if (guestMode || !user) return null;
  return user.id;
}

export const useSocialStore = create<SocialState>()((set, get) => ({
  livePosts: [],
  livePostsLoading: false,
  livePostsLoaded: false,
  commentsCache: {},
  commentsLoading: {},
  userLikes: new Set<string>(),
  userFollowing: new Set<string>(),
  followerCount: 0,
  leaderboard: [],
  leaderboardLoading: false,
  _realtimeCleanup: null,

  loadPosts: async () => {
    if (get().livePostsLoading) return;
    set({ livePostsLoading: true });
    const posts = await fetchPosts(50);
    set({ livePosts: posts, livePostsLoading: false, livePostsLoaded: true });
  },

  publishPost: async (text: string) => {
    const userId = getUserId();
    if (!userId) return null;
    const post = await createPost(userId, text);
    if (post) {
      // Optimistically add to local state
      const displayName = useAuthStore.getState().user?.user_metadata?.display_name || 'You';
      set(s => ({
        livePosts: [{ ...post, display_name: displayName }, ...s.livePosts],
      }));
    }
    return post;
  },

  removePost: async (postId: string) => {
    const ok = await deletePost(postId);
    if (ok) {
      set(s => ({ livePosts: s.livePosts.filter(p => p.id !== postId) }));
    }
  },

  loadComments: async (postId: string) => {
    set(s => ({ commentsLoading: { ...s.commentsLoading, [postId]: true } }));
    const comments = await fetchComments(postId);
    set(s => ({
      commentsCache: { ...s.commentsCache, [postId]: comments },
      commentsLoading: { ...s.commentsLoading, [postId]: false },
    }));
  },

  addComment: async (postId: string, text: string) => {
    const userId = getUserId();
    if (!userId) return;
    const comment = await createComment(postId, userId, text);
    if (comment) {
      const displayName = useAuthStore.getState().user?.user_metadata?.display_name || 'You';
      set(s => ({
        commentsCache: {
          ...s.commentsCache,
          [postId]: [...(s.commentsCache[postId] || []), { ...comment, display_name: displayName }],
        },
      }));
    }
  },

  toggleLike: async (postId: string) => {
    const userId = getUserId();
    if (!userId) return;
    const { userLikes } = get();
    const isLiked = userLikes.has(postId);

    // Optimistic update
    const next = new Set(userLikes);
    if (isLiked) {
      next.delete(postId);
    } else {
      next.add(postId);
    }
    set(s => ({
      userLikes: next,
      livePosts: s.livePosts.map(p =>
        p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
      ),
    }));

    // Persist
    const ok = isLiked ? await unlikePost(postId, userId) : await likePost(postId, userId);
    if (!ok) {
      // Revert on failure
      const revert = new Set(get().userLikes);
      if (isLiked) revert.add(postId); else revert.delete(postId);
      set(s => ({
        userLikes: revert,
        livePosts: s.livePosts.map(p =>
          p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? 1 : -1) } : p
        ),
      }));
    }
  },

  toggleFollow: async (userId: string) => {
    const myId = getUserId();
    if (!myId) return;
    const { userFollowing } = get();
    const isFollowing = userFollowing.has(userId);

    // Optimistic
    const next = new Set(userFollowing);
    if (isFollowing) next.delete(userId); else next.add(userId);
    set({ userFollowing: next });

    const ok = isFollowing
      ? await unfollowUser(myId, userId)
      : await followUser(myId, userId);
    if (!ok) {
      // Revert
      const revert = new Set(get().userFollowing);
      if (isFollowing) revert.add(userId); else revert.delete(userId);
      set({ userFollowing: revert });
    }
  },

  loadUserSocialData: async () => {
    const userId = getUserId();
    if (!userId) return;
    const [likes, following, count] = await Promise.all([
      fetchUserLikes(userId),
      fetchFollowing(userId),
      fetchFollowerCount(userId),
    ]);
    set({
      userLikes: new Set(likes),
      userFollowing: new Set(following),
      followerCount: count,
    });
  },

  loadLeaderboard: async () => {
    set({ leaderboardLoading: true });
    const data = await fetchLeaderboard(20);
    set({ leaderboard: data, leaderboardLoading: false });
  },

  syncLeaderboardScore: async (data) => {
    await upsertLeaderboardScore(data);
  },

  startRealtime: () => {
    const sub1 = subscribeToNewPosts((post) => {
      set(s => {
        // Avoid duplicates
        if (s.livePosts.some(p => p.id === post.id)) return s;
        return { livePosts: [post, ...s.livePosts] };
      });
    });
    const sub2 = subscribeToPostUpdates((updated) => {
      set(s => ({
        livePosts: s.livePosts.map(p =>
          p.id === updated.id ? { ...p, ...updated } : p
        ),
      }));
    });
    set({
      _realtimeCleanup: () => {
        sub1.unsubscribe();
        sub2.unsubscribe();
      },
    });
  },

  stopRealtime: () => {
    get()._realtimeCleanup?.();
    set({ _realtimeCleanup: null });
  },
}));
