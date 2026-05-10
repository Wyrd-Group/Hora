/**
 * Social Sync — Supabase CRUD for social platform features.
 * Posts, comments, likes, follows, leaderboard.
 */
import { supabase } from './supabase';
import { createLogger } from './logger';

const log = createLogger('social');

// ── Types ───────────────────────────────────────────────────

export interface SocialPost {
  id: string;
  author_id: string;
  text: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  // Joined fields
  display_name?: string;
  is_liked?: boolean;
}

export interface SocialComment {
  id: string;
  post_id: string;
  author_id: string;
  text: string;
  created_at: string;
  display_name?: string;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  net_worth: number;
  level: number;
  tier: string;
  followers: number;
  win_rate: number;
  reputation: number;
  updated_at: string;
}

// ── Posts ────────────────────────────────────────────────────

export async function fetchPosts(limit = 30, offset = 0): Promise<SocialPost[]> {
  const { data, error } = await supabase
    .from('social_posts')
    .select('*, profiles!social_posts_author_id_fkey(display_name)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    log.error('fetchPosts error', error);
    // Fallback: try without join
    const { data: fallback } = await supabase
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return (fallback || []).map(p => ({ ...p, display_name: 'Anonymous' }));
  }

  return (data || []).map(p => ({
    ...p,
    display_name: (p as any).profiles?.display_name || 'Anonymous',
  }));
}

export async function createPost(authorId: string, text: string): Promise<SocialPost | null> {
  // Extract $TICKER tags
  const tags = (text.match(/\$[A-Z]+/g) || []).map(t => t.slice(1));

  const { data, error } = await supabase
    .from('social_posts')
    .insert({ author_id: authorId, text, tags })
    .select()
    .single();

  if (error) {
    log.error('createPost error', error);
    return null;
  }
  return data;
}

export async function deletePost(postId: string): Promise<boolean> {
  const { error } = await supabase
    .from('social_posts')
    .delete()
    .eq('id', postId);

  if (error) {
    log.error('deletePost error', error);
    return false;
  }
  return true;
}

// ── Comments ────────────────────────────────────────────────

export async function fetchComments(postId: string): Promise<SocialComment[]> {
  const { data, error } = await supabase
    .from('social_comments')
    .select('*, profiles!social_comments_author_id_fkey(display_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    log.error('fetchComments error', error);
    const { data: fallback } = await supabase
      .from('social_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    return (fallback || []).map(c => ({ ...c, display_name: 'Anonymous' }));
  }

  return (data || []).map(c => ({
    ...c,
    display_name: (c as any).profiles?.display_name || 'Anonymous',
  }));
}

export async function createComment(postId: string, authorId: string, text: string): Promise<SocialComment | null> {
  const { data, error } = await supabase
    .from('social_comments')
    .insert({ post_id: postId, author_id: authorId, text })
    .select()
    .single();

  if (error) {
    log.error('createComment error', error);
    return null;
  }
  return data;
}

// ── Likes ───────────────────────────────────────────────────

export async function likePost(postId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('social_post_likes')
    .insert({ post_id: postId, user_id: userId });

  if (error) {
    // Already liked (unique constraint) — not an error
    if (error.code === '23505') return true;
    log.error('likePost error', error);
    return false;
  }
  return true;
}

export async function unlikePost(postId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('social_post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) {
    log.error('unlikePost error', error);
    return false;
  }
  return true;
}

export async function fetchUserLikes(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('social_post_likes')
    .select('post_id')
    .eq('user_id', userId);

  if (error) {
    log.error('fetchUserLikes error', error);
    return [];
  }
  return (data || []).map(d => d.post_id);
}

// ── Follows ─────────────────────────────────────────────────

export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  const { error } = await supabase
    .from('social_follows')
    .insert({ follower_id: followerId, following_id: followingId });

  if (error) {
    if (error.code === '23505') return true; // Already following
    log.error('followUser error', error);
    return false;
  }
  return true;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  const { error } = await supabase
    .from('social_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) {
    log.error('unfollowUser error', error);
    return false;
  }
  return true;
}

export async function fetchFollowing(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('social_follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (error) {
    log.error('fetchFollowing error', error);
    return [];
  }
  return (data || []).map(d => d.following_id);
}

export async function fetchFollowerCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('social_follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  if (error) {
    log.error('fetchFollowerCount error', error);
    return 0;
  }
  return count || 0;
}

// ── Leaderboard ─────────────────────────────────────────────

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  // Pull directly from profiles table — game_state JSONB has all player stats
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, game_state')
    .not('game_state', 'is', null);

  if (error) {
    log.error('fetchLeaderboard error', error);
    return [];
  }

  // Extract leaderboard fields from game_state JSONB and rank by net worth
  return (data || [])
    .filter(p => p.game_state && typeof p.game_state === 'object')
    .map(p => {
      const gs = p.game_state as Record<string, any>;
      return {
        user_id: p.id,
        display_name: p.display_name || gs.companyName || 'Anonymous',
        net_worth: gs.netWorth || gs.balance || 0,
        level: gs.playerLevel || 1,
        tier: gs.playerTier || 'Bronze',
        followers: gs.followers || 0,
        win_rate: 0,
        reputation: gs.socialReputation || 0,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(e => e.net_worth > 0)
    .sort((a, b) => b.net_worth - a.net_worth)
    .slice(0, limit);
}

export async function upsertLeaderboardScore(entry: Omit<LeaderboardEntry, 'updated_at'>): Promise<boolean> {
  const { error } = await supabase
    .from('leaderboard_scores')
    .upsert({
      ...entry,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    log.error('upsertLeaderboard error', error);
    return false;
  }
  return true;
}

// ── Realtime Subscriptions ──────────────────────────────────

export function subscribeToNewPosts(callback: (post: SocialPost) => void) {
  return supabase
    .channel('social_posts_realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'social_posts',
    }, (payload) => {
      callback(payload.new as SocialPost);
    })
    .subscribe();
}

export function subscribeToPostUpdates(callback: (post: Partial<SocialPost> & { id: string }) => void) {
  return supabase
    .channel('social_posts_updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'social_posts',
    }, (payload) => {
      callback(payload.new as any);
    })
    .subscribe();
}
