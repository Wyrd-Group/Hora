/**
 * Multiplayer Sync — Supabase CRUD + Realtime for friends, rooms, and invites.
 */
import { supabase } from './supabase';
import { createLogger } from './logger';

const log = createLogger('multiplayer');

// ── Types ───────────────────────────────────────────────────

export interface FriendRequestRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  responded_at: string | null;
  // Joined profile data
  sender_display_name?: string;
  receiver_display_name?: string;
  sender_game_state?: Record<string, unknown>;
  receiver_game_state?: Record<string, unknown>;
}

export interface UserProfile {
  id: string;
  display_name: string;
  tier: string;
  level: number;
  netWorth: string;
}

export interface GameRoom {
  id: string;
  code: string;
  host_id: string;
  host_name: string;
  mode: string;
  duration: number;
  time_multiplier: number;
  max_players: number;
  starting_capital: number;
  allow_agents: boolean;
  event_frequency: string;
  status: string;
  created_at: string;
  player_count?: number;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string | null;
  display_name: string;
  is_host: boolean;
  is_ready: boolean;
  is_bot: boolean;
  slot: number;
  joined_at: string;
}

export interface GameInviteRow {
  id: string;
  room_id: string;
  room_code: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  mode: string;
  duration: number;
  status: string;
  created_at: string;
}

// ── Helper: extract profile data from game_state ────────────

function extractProfileData(gameState: Record<string, unknown> | null | undefined): { tier: string; level: number; netWorth: string } {
  if (!gameState) return { tier: 'Bronze', level: 1, netWorth: '€0' };
  const nw = (gameState.netWorth as number) || 0;
  const formatted = nw >= 1_000_000 ? `€${(nw / 1_000_000).toFixed(1)}M` :
                    nw >= 1_000 ? `€${(nw / 1_000).toFixed(0)}K` : `€${nw}`;
  return {
    tier: (gameState.playerTier as string) || 'Bronze',
    level: (gameState.playerLevel as number) || 1,
    netWorth: formatted,
  };
}

// ── User Search ─────────────────────────────────────────────

export async function searchUsers(query: string, currentUserId: string, limit = 10): Promise<UserProfile[]> {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, game_state')
    .ilike('display_name', `%${query}%`)
    .neq('id', currentUserId)
    .limit(limit);

  if (error) {
    log.error('searchUsers error', error);
    return [];
  }

  return (data || []).map(p => {
    const { tier, level, netWorth } = extractProfileData(p.game_state as Record<string, unknown>);
    return { id: p.id, display_name: p.display_name || 'Anonymous', tier, level, netWorth };
  });
}

// ── Friend Requests ─────────────────────────────────────────

export async function sendFriendRequest(senderId: string, receiverId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_requests')
    .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' });

  if (error) {
    if (error.code === '23505') return true; // Already sent
    log.error('sendFriendRequest error', error);
    return false;
  }
  return true;
}

export async function acceptFriendRequest(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) {
    log.error('acceptFriendRequest error', error);
    return false;
  }
  return true;
}

export async function declineFriendRequest(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) {
    log.error('declineFriendRequest error', error);
    return false;
  }
  return true;
}

export async function removeFriendship(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    log.error('removeFriendship error', error);
    return false;
  }
  return true;
}

export async function fetchFriends(userId: string): Promise<Array<FriendRequestRow & { friendProfile: UserProfile }>> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*, sender:profiles!friend_requests_sender_profile_fkey(id, display_name, game_state), receiver:profiles!friend_requests_receiver_profile_fkey(id, display_name, game_state)')
    .eq('status', 'accepted')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error) {
    log.error('fetchFriends error', error);
    return [];
  }

  return (data || []).map((row: any) => {
    const isSender = row.sender_id === userId;
    const friendData = isSender ? row.receiver : row.sender;
    const { tier, level, netWorth } = extractProfileData(friendData?.game_state);
    return {
      ...row,
      friendProfile: {
        id: friendData?.id || (isSender ? row.receiver_id : row.sender_id),
        display_name: friendData?.display_name || 'Anonymous',
        tier, level, netWorth,
      },
    };
  });
}

export async function fetchIncomingRequests(userId: string): Promise<Array<FriendRequestRow & { senderProfile: UserProfile }>> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*, sender:profiles!friend_requests_sender_profile_fkey(id, display_name, game_state)')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    log.error('fetchIncomingRequests error', error);
    return [];
  }

  return (data || []).map((row: any) => {
    const { tier, level, netWorth } = extractProfileData(row.sender?.game_state);
    return {
      ...row,
      senderProfile: {
        id: row.sender?.id || row.sender_id,
        display_name: row.sender?.display_name || 'Anonymous',
        tier, level, netWorth,
      },
    };
  });
}

export async function fetchOutgoingRequests(userId: string): Promise<FriendRequestRow[]> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*, receiver:profiles!friend_requests_receiver_profile_fkey(id, display_name)')
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    log.error('fetchOutgoingRequests error', error);
    return [];
  }
  return data || [];
}

// ── Game Rooms ──────────────────────────────────────────────

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export interface RoomSettings {
  mode: string;
  duration: number;
  timeMultiplier: number;
  maxPlayers: number;
  startingCapital: number;
  allowAgents: boolean;
  eventFrequency: string;
}

export async function createRoom(hostId: string, hostName: string, settings: RoomSettings): Promise<GameRoom | null> {
  const code = generateRoomCode();

  const { data, error } = await supabase
    .from('game_rooms')
    .insert({
      code,
      host_id: hostId,
      host_name: hostName,
      mode: settings.mode,
      duration: settings.duration,
      time_multiplier: settings.timeMultiplier,
      max_players: settings.maxPlayers,
      starting_capital: settings.startingCapital,
      allow_agents: settings.allowAgents,
      event_frequency: settings.eventFrequency,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) {
    log.error('createRoom error', error);
    return null;
  }

  // Add host as first player
  await supabase.from('room_players').insert({
    room_id: data.id,
    user_id: hostId,
    display_name: hostName,
    is_host: true,
    is_ready: false,
    is_bot: false,
    slot: 1,
  });

  return data;
}

export async function joinRoom(roomId: string, userId: string, displayName: string): Promise<RoomPlayer | null> {
  // Get current player count for slot assignment
  const { count } = await supabase
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId);

  const slot = (count || 0) + 1;

  const { data, error } = await supabase
    .from('room_players')
    .insert({
      room_id: roomId,
      user_id: userId,
      display_name: displayName,
      is_host: false,
      is_ready: false,
      is_bot: false,
      slot,
    })
    .select()
    .single();

  if (error) {
    log.error('joinRoom error', error);
    return null;
  }
  return data;
}

export async function leaveRoom(roomId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);

  if (error) {
    log.error('leaveRoom error', error);
    return false;
  }
  return true;
}

export async function deleteRoom(roomId: string): Promise<boolean> {
  const { error } = await supabase
    .from('game_rooms')
    .delete()
    .eq('id', roomId);

  if (error) {
    log.error('deleteRoom error', error);
    return false;
  }
  return true;
}

export async function updateReadyState(roomId: string, playerId: string, isReady: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('room_players')
    .update({ is_ready: isReady })
    .eq('room_id', roomId)
    .eq('id', playerId);

  if (error) {
    log.error('updateReadyState error', error);
    return false;
  }
  return true;
}

export async function addBotToRoom(roomId: string, botName: string, slot: number): Promise<RoomPlayer | null> {
  const { data, error } = await supabase
    .from('room_players')
    .insert({
      room_id: roomId,
      user_id: null,
      display_name: botName,
      is_host: false,
      is_ready: true,
      is_bot: true,
      slot,
    })
    .select()
    .single();

  if (error) {
    log.error('addBotToRoom error', error);
    return null;
  }
  return data;
}

export async function removeBotFromRoom(botPlayerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('id', botPlayerId);

  if (error) {
    log.error('removeBotFromRoom error', error);
    return false;
  }
  return true;
}

export async function startRoom(roomId: string): Promise<boolean> {
  const { error } = await supabase
    .from('game_rooms')
    .update({ status: 'starting', started_at: new Date().toISOString() })
    .eq('id', roomId);

  if (error) {
    log.error('startRoom error', error);
    return false;
  }
  return true;
}

export async function fetchRoomByCode(code: string): Promise<GameRoom | null> {
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('status', 'waiting')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    log.error('fetchRoomByCode error', error);
    return null;
  }
  return data;
}

export async function fetchRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
  const { data, error } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('slot', { ascending: true });

  if (error) {
    log.error('fetchRoomPlayers error', error);
    return [];
  }
  return data || [];
}

export async function fetchOpenRooms(limit = 20): Promise<GameRoom[]> {
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*, room_players(count)')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    log.error('fetchOpenRooms error', error);
    return [];
  }

  return (data || []).map((r: any) => ({
    ...r,
    player_count: r.room_players?.[0]?.count || 0,
  }));
}

// ── Game Invites ────────────────────────────────────────────

export async function sendGameInvite(
  roomId: string, roomCode: string, senderId: string, senderName: string,
  receiverId: string, mode: string, duration: number
): Promise<boolean> {
  const { error } = await supabase
    .from('game_invites')
    .insert({
      room_id: roomId,
      room_code: roomCode,
      sender_id: senderId,
      sender_name: senderName,
      receiver_id: receiverId,
      mode,
      duration,
      status: 'pending',
    });

  if (error) {
    if (error.code === '23505') return true; // Already invited
    log.error('sendGameInvite error', error);
    return false;
  }
  return true;
}

export async function fetchPendingInvites(userId: string): Promise<GameInviteRow[]> {
  const { data, error } = await supabase
    .from('game_invites')
    .select('*')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    log.error('fetchPendingInvites error', error);
    return [];
  }
  return data || [];
}

export async function respondToGameInvite(inviteId: string, accept: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('game_invites')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', inviteId);

  if (error) {
    log.error('respondToGameInvite error', error);
    return false;
  }
  return true;
}

// ── Realtime Subscriptions ──────────────────────────────────

export function subscribeToRoomPlayers(roomId: string, callback: (players: RoomPlayer[]) => void) {
  const channel = supabase
    .channel(`room-players-${roomId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'room_players',
      filter: `room_id=eq.${roomId}`,
    }, async () => {
      // Re-fetch full player list on any change
      const players = await fetchRoomPlayers(roomId);
      callback(players);
    })
    .subscribe();

  return channel;
}

export function subscribeToRoomStatus(roomId: string, callback: (status: string) => void) {
  const channel = supabase
    .channel(`room-status-${roomId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'game_rooms',
      filter: `id=eq.${roomId}`,
    }, (payload) => {
      callback((payload.new as any).status);
    })
    .subscribe();

  return channel;
}

export function subscribeToFriendRequests(userId: string, callback: () => void) {
  const channel = supabase
    .channel(`friend-requests-${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'friend_requests',
      filter: `receiver_id=eq.${userId}`,
    }, () => callback())
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'friend_requests',
      filter: `sender_id=eq.${userId}`,
    }, () => callback())
    .subscribe();

  return channel;
}

export function subscribeToGameInvites(userId: string, callback: (invite: GameInviteRow) => void) {
  const channel = supabase
    .channel(`game-invites-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'game_invites',
      filter: `receiver_id=eq.${userId}`,
    }, (payload) => {
      callback(payload.new as GameInviteRow);
    })
    .subscribe();

  return channel;
}

// ── Presence (online status) ────────────────────────────────

export function trackPresence(userId: string, displayName: string, onSync?: () => void) {
  const channel = supabase.channel('online-users', {
    config: { presence: { key: userId } },
  });

  // IMPORTANT: register presence callbacks BEFORE calling subscribe()
  if (onSync) {
    channel.on('presence', { event: 'sync' }, onSync);
  }

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: userId, display_name: displayName, online_at: new Date().toISOString() });
    }
  });

  return channel;
}

export function getPresenceState(channel: ReturnType<typeof supabase.channel>): Set<string> {
  const state = channel.presenceState();
  const onlineIds = new Set<string>();
  for (const key of Object.keys(state)) {
    onlineIds.add(key);
  }
  return onlineIds;
}
