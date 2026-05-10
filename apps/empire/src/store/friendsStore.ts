/**
 * Friends Store — Supabase-backed friends, requests, and game invites.
 * No NPC seeds. All data comes from real authenticated users.
 * Falls back gracefully when user is in guest mode.
 */
import { create } from 'zustand';
import { useAuthStore } from './authStore';
import {
  searchUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest,
  removeFriendship, fetchFriends, fetchIncomingRequests, fetchOutgoingRequests,
  fetchPendingInvites, sendGameInvite, respondToGameInvite,
  subscribeToFriendRequests, subscribeToGameInvites,
  trackPresence, getPresenceState,
  type UserProfile, type GameInviteRow,
} from '../lib/multiplayerSync';
import { supabase } from '../lib/supabase';

export interface Friend {
  requestId: string;    // friend_requests row ID (for removal)
  userId: string;       // the friend's auth user ID
  name: string;
  tier: string;
  level: number;
  netWorth: string;
  status: 'online' | 'offline';
  avatar: string;
  friendsSince: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderTier: string;
  senderLevel: number;
  avatar: string;
  sentAt: string;
  direction: 'incoming' | 'outgoing';
}

export interface GameInvite {
  id: string;
  roomCode: string;
  senderName: string;
  mode: string;
  duration: number;
  status: string;
  sentAt: string;
}

interface FriendsState {
  friends: Friend[];
  requests: FriendRequest[];
  invites: GameInvite[];
  searchResults: UserProfile[];
  searchLoading: boolean;
  loading: boolean;
  initialized: boolean;
  onlineUserIds: Set<string>;
  _cleanup: (() => void) | null;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  clearSearch: () => void;
  sendRequest: (receiverId: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  removeFriend: (requestId: string) => Promise<void>;
  sendGameInvite: (roomId: string, roomCode: string, receiverId: string, mode: string, duration: number) => Promise<void>;
  respondToInvite: (inviteId: string, accept: boolean) => Promise<void>;
  getFriend: (userId: string) => Friend | undefined;
  cleanup: () => void;
}

function getUserId(): string | null {
  const { user, guestMode } = useAuthStore.getState();
  if (guestMode || !user) return null;
  return user.id;
}

function getDisplayName(): string {
  const { user } = useAuthStore.getState();
  return user?.user_metadata?.display_name || 'Anonymous';
}

export const useFriendsStore = create<FriendsState>()((set, get) => ({
  friends: [],
  requests: [],
  invites: [],
  searchResults: [],
  searchLoading: false,
  loading: false,
  initialized: false,
  onlineUserIds: new Set<string>(),
  _cleanup: null,

  init: async () => {
    if (get().initialized) return;
    const userId = getUserId();
    if (!userId) {
      set({ initialized: true });
      return;
    }

    set({ loading: true });
    await get().refresh();

    // Subscribe to friend request changes (realtime)
    const frChannel = subscribeToFriendRequests(userId, () => {
      get().refresh();
    });

    // Subscribe to game invite notifications
    const invChannel = subscribeToGameInvites(userId, (invite: GameInviteRow) => {
      set(s => ({
        invites: [{
          id: invite.id,
          roomCode: invite.room_code,
          senderName: invite.sender_name,
          mode: invite.mode,
          duration: invite.duration,
          status: invite.status,
          sentAt: invite.created_at,
        }, ...s.invites],
      }));
    });

    // Track online presence — pass onSync callback BEFORE subscribe
    let presenceChannel: ReturnType<typeof trackPresence>;
    presenceChannel = trackPresence(userId, getDisplayName(), () => {
      const onlineIds = getPresenceState(presenceChannel);
      set({ onlineUserIds: onlineIds });
    });

    set({
      initialized: true,
      loading: false,
      _cleanup: () => {
        supabase.removeChannel(frChannel);
        supabase.removeChannel(invChannel);
        supabase.removeChannel(presenceChannel);
      },
    });
  },

  refresh: async () => {
    const userId = getUserId();
    if (!userId) return;

    const [friendsData, incoming, outgoing, pendingInvites] = await Promise.all([
      fetchFriends(userId),
      fetchIncomingRequests(userId),
      fetchOutgoingRequests(userId),
      fetchPendingInvites(userId),
    ]);

    const { onlineUserIds } = get();

    const friends: Friend[] = friendsData.map(f => ({
      requestId: f.id,
      userId: f.friendProfile.id,
      name: f.friendProfile.display_name,
      tier: f.friendProfile.tier,
      level: f.friendProfile.level,
      netWorth: f.friendProfile.netWorth,
      status: onlineUserIds.has(f.friendProfile.id) ? 'online' as const : 'offline' as const,
      avatar: (f.friendProfile.display_name[0] || '?').toUpperCase(),
      friendsSince: f.created_at,
    }));

    const requests: FriendRequest[] = [
      ...incoming.map(r => ({
        id: r.id,
        senderId: r.sender_id,
        senderName: r.senderProfile.display_name,
        senderTier: r.senderProfile.tier,
        senderLevel: r.senderProfile.level,
        avatar: (r.senderProfile.display_name[0] || '?').toUpperCase(),
        sentAt: r.created_at,
        direction: 'incoming' as const,
      })),
      ...outgoing.map((r: any) => ({
        id: r.id,
        senderId: r.receiver_id,
        senderName: r.receiver?.display_name || 'Unknown',
        senderTier: 'Bronze',
        senderLevel: 1,
        avatar: ((r.receiver?.display_name || '?')[0]).toUpperCase(),
        sentAt: r.created_at,
        direction: 'outgoing' as const,
      })),
    ];

    const invites: GameInvite[] = pendingInvites.map(inv => ({
      id: inv.id,
      roomCode: inv.room_code,
      senderName: inv.sender_name,
      mode: inv.mode,
      duration: inv.duration,
      status: inv.status,
      sentAt: inv.created_at,
    }));

    set({ friends, requests, invites });
  },

  searchUsers: async (query: string) => {
    const userId = getUserId();
    if (!userId) return;
    set({ searchLoading: true });
    const results = await searchUsers(query, userId);
    set({ searchResults: results, searchLoading: false });
  },

  clearSearch: () => set({ searchResults: [] }),

  sendRequest: async (receiverId: string) => {
    const userId = getUserId();
    if (!userId) return;
    await sendFriendRequest(userId, receiverId);
    await get().refresh();
    set({ searchResults: [] });
  },

  acceptRequest: async (requestId: string) => {
    await acceptFriendRequest(requestId);
    await get().refresh();
  },

  declineRequest: async (requestId: string) => {
    await declineFriendRequest(requestId);
    await get().refresh();
  },

  removeFriend: async (requestId: string) => {
    await removeFriendship(requestId);
    await get().refresh();
  },

  sendGameInvite: async (roomId: string, roomCode: string, receiverId: string, mode: string, duration: number) => {
    const userId = getUserId();
    if (!userId) return;
    const name = getDisplayName();
    await sendGameInvite(roomId, roomCode, userId, name, receiverId, mode, duration);
  },

  respondToInvite: async (inviteId: string, accept: boolean) => {
    await respondToGameInvite(inviteId, accept);
    set(s => ({
      invites: s.invites.map(i => i.id === inviteId ? { ...i, status: accept ? 'accepted' : 'declined' } : i),
    }));
  },

  getFriend: (userId: string) => get().friends.find(f => f.userId === userId),

  cleanup: () => {
    get()._cleanup?.();
    set({ _cleanup: null, initialized: false });
  },
}));
