import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useFriendsStore } from '../../store/friendsStore';
import { useCampaignStore } from '../../store/campaignStore';
import { useShallow } from 'zustand/shallow';
import {
  createRoom, joinRoom, leaveRoom, deleteRoom,
  updateReadyState, addBotToRoom, removeBotFromRoom, startRoom,
  fetchRoomByCode, fetchRoomPlayers, fetchOpenRooms,
  sendGameInvite as sendInvite,
  subscribeToRoomPlayers, subscribeToRoomStatus,
} from '../../lib/multiplayerSync';
import { supabase } from '../../lib/supabase';

// ── Game mode definitions ───────────────────────────────────────
const GAME_MODES = [
  { id: 'free_for_all',   label: 'FREE FOR ALL' },
  { id: 'trading_blitz',  label: 'TRADING BLITZ' },
  { id: 'empire_rush',    label: 'EMPIRE RUSH' },
  { id: 'agent_wars',     label: 'AGENT WARS' },
];

const DURATIONS = [5, 10, 15, 20, 0]; // 0 = unlimited
const TIME_MULTIPLIERS = [5, 10, 20];
const STARTING_CAPITALS = [
  { value: 100_000,   label: '100K' },
  { value: 500_000,   label: '500K' },
  { value: 1_000_000, label: '1M' },
  { value: 5_000_000, label: '5M' },
];
const EVENT_FREQUENCIES = ['Low', 'Normal', 'High'];

// ── Player color palette ───────────────────────────────────────
const PLAYER_COLORS = [
  { id: 'emerald',  label: 'Emerald',  hex: '#10b981', rgb: [16, 185, 129] },
  { id: 'cyan',     label: 'Cyan',     hex: '#06b6d4', rgb: [6, 182, 212] },
  { id: 'violet',   label: 'Violet',   hex: '#8b5cf6', rgb: [139, 92, 246] },
  { id: 'rose',     label: 'Rose',     hex: '#f43f5e', rgb: [244, 63, 94] },
  { id: 'amber',    label: 'Amber',    hex: '#f59e0b', rgb: [245, 158, 11] },
  { id: 'sky',      label: 'Sky',      hex: '#0ea5e9', rgb: [14, 165, 233] },
  { id: 'lime',     label: 'Lime',     hex: '#84cc16', rgb: [132, 204, 22] },
  { id: 'fuchsia',  label: 'Fuchsia',  hex: '#d946ef', rgb: [217, 70, 239] },
  { id: 'orange',   label: 'Orange',   hex: '#f97316', rgb: [249, 115, 22] },
  { id: 'teal',     label: 'Teal',     hex: '#14b8a6', rgb: [20, 184, 166] },
];

const BOT_NAMES = [
  'TradingTitan', 'AlphaSeeker', 'QuantumTrader', 'WallStreetWolf',
  'MarketMaven', 'BullRunner', 'VaultKing', 'NexusTrader',
  'ShadowCapital', 'IronLedger', 'PhantomFund', 'CryptoNomad',
  'OmegaAlpha', 'ZeroSumKing', 'DeltaForce', 'ArcticWhale',
];

function pickBotNames(count, exclude = []) {
  const pool = BOT_NAMES.filter((n) => !exclude.includes(n));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── Sub-components ──────────────────────────────────────────────

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const optValue = typeof opt === 'object' ? opt.value : opt;
        const optLabel = typeof opt === 'object' ? opt.label : String(opt);
        return (
          <button
            key={optValue}
            onClick={() => onChange(optValue)}
            className={`px-3 py-1.5 rounded text-[11px] font-mono tracking-wider border transition-all ${
              value === optValue
                ? 'bg-[#a78bfa]/15 text-[#a78bfa] border-[#a78bfa]/40 shadow-[0_0_8px_rgba(167,139,250,0.15)]'
                : 'bg-black/30 text-white/40 border-white/10 hover:border-white/20 hover:text-white/60'
            }`}
          >
            {optLabel}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] font-mono text-white/50 tracking-wide">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full border transition-all relative ${
          value ? 'bg-[#a78bfa]/20 border-[#a78bfa]/40' : 'bg-black/30 border-white/10'
        }`}
      >
        <div className={`w-3.5 h-3.5 rounded-full absolute top-[2px] transition-all ${
          value ? 'right-[3px] bg-[#a78bfa]' : 'left-[3px] bg-white/30'
        }`} />
      </button>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-mono mb-2 mt-4 first:mt-0">
      {children}
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────

export default function PrivateServerPanel({ onBack, onStartMatch, initialRoomCode }) {
  const { user, guestMode } = useAuthStore();
  const userId = user?.id;
  const displayName = user?.user_metadata?.display_name || 'Anonymous';
  const isGuest = guestMode || !userId;

  // Create game state
  const [mode, setMode] = useState('free_for_all');
  const [duration, setDuration] = useState(10);
  const [timeMultiplier, setTimeMultiplier] = useState(10);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [startingCapital, setStartingCapital] = useState(500_000);
  const [allowAgents, setAllowAgents] = useState(true);
  const [eventFrequency, setEventFrequency] = useState('Normal');
  const [myColor, setMyColor] = useState(PLAYER_COLORS[0].id);

  // Join game state
  const [joinCode, setJoinCode] = useState(initialRoomCode || '');
  const [joinError, setJoinError] = useState('');

  // Friends
  const friendsStore = useFriendsStore(useShallow(s => s));
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  useEffect(() => { friendsStore.init(); }, []);

  // Active rooms from Supabase
  const [activeRooms, setActiveRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  // Lobby state
  const [phase, setPhase] = useState('setup');
  const [roomId, setRoomId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [myPlayerId, setMyPlayerId] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [creating, setCreating] = useState(false);

  // Realtime channel refs
  const playersChannelRef = useRef(null);
  const statusChannelRef = useRef(null);

  // Load active rooms on mount
  useEffect(() => {
    if (isGuest) return;
    loadActiveRooms();
    const interval = setInterval(loadActiveRooms, 15000);
    return () => clearInterval(interval);
  }, [isGuest]);

  // Auto-join when initialRoomCode is provided (from game invite)
  const autoJoinedRef = useRef(false);
  useEffect(() => {
    if (!initialRoomCode || isGuest || autoJoinedRef.current) return;
    autoJoinedRef.current = true;
    const t = setTimeout(async () => {
      const room = await fetchRoomByCode(initialRoomCode);
      if (!room) return;

      // Check if we're already in this room (e.g., we created it)
      const existingPlayers = await fetchRoomPlayers(room.id);
      const mySlot = existingPlayers.find(p => p.user_id === userId);

      if (mySlot) {
        // Already in room — just load lobby state
        setRoomId(room.id);
        setRoomCode(room.code);
        setIsHost(mySlot.is_host);
        setMyPlayerId(mySlot.id);
        setMaxPlayers(room.max_players);
        setMode(room.mode);
        setDuration(room.duration);
        setTimeMultiplier(room.time_multiplier);
        setPlayers(existingPlayers.map(p => ({
          id: p.id, name: p.display_name, isReady: p.is_ready,
          isHost: p.is_host, isBot: p.is_bot, isFriend: false,
          userId: p.user_id, slot: p.slot,
        })));
        subscribeToRoom(room.id);
        setPhase('lobby');
      } else {
        // Not in room yet — join normally
        handleJoinRoom(initialRoomCode);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [initialRoomCode, isGuest]);

  // Cleanup realtime on unmount
  useEffect(() => {
    return () => cleanupChannels();
  }, []);

  const loadActiveRooms = async () => {
    setRoomsLoading(true);
    const rooms = await fetchOpenRooms();
    setActiveRooms(rooms);
    setRoomsLoading(false);
  };

  const cleanupChannels = () => {
    if (playersChannelRef.current) supabase.removeChannel(playersChannelRef.current);
    if (statusChannelRef.current) supabase.removeChannel(statusChannelRef.current);
    playersChannelRef.current = null;
    statusChannelRef.current = null;
  };

  const subscribeToRoom = useCallback((rid) => {
    cleanupChannels();

    // Subscribe to player changes
    playersChannelRef.current = subscribeToRoomPlayers(rid, (updatedPlayers) => {
      setPlayers(updatedPlayers.map(p => ({
        id: p.id,
        name: p.display_name,
        isReady: p.is_ready,
        isHost: p.is_host,
        isBot: p.is_bot,
        isFriend: false,
        userId: p.user_id,
        slot: p.slot,
      })));
    });

    // Subscribe to room status (for when host starts)
    statusChannelRef.current = subscribeToRoomStatus(rid, (status) => {
      if (status === 'starting') {
        cleanupChannels();
        onStartMatch?.({ roomCode, mode, duration, timeMultiplier, maxPlayers, startingCapital, allowAgents, eventFrequency, players, myColor });
      }
    });
  }, [roomCode, mode, duration, timeMultiplier, maxPlayers, startingCapital, allowAgents, eventFrequency, onStartMatch, myColor]);

  // ── Create Room ───────────────────────────────────────────────
  const handleCreateRoom = async () => {
    if (isGuest || creating) return;
    setCreating(true);

    const room = await createRoom(userId, displayName, {
      mode, duration, timeMultiplier: timeMultiplier, maxPlayers, startingCapital, allowAgents, eventFrequency,
    });

    if (!room) {
      setCreating(false);
      return;
    }

    setRoomId(room.id);
    setRoomCode(room.code);
    setIsHost(true);

    // Fetch initial players (includes self as host)
    const initialPlayers = await fetchRoomPlayers(room.id);
    const self = initialPlayers.find(p => p.user_id === userId);
    if (self) setMyPlayerId(self.id);

    setPlayers(initialPlayers.map(p => ({
      id: p.id,
      name: p.display_name,
      isReady: p.is_ready,
      isHost: p.is_host,
      isBot: p.is_bot,
      isFriend: false,
      userId: p.user_id,
      slot: p.slot,
    })));

    subscribeToRoom(room.id);
    setPhase('lobby');
    setCreating(false);
  };

  // ── Join Room by Code ─────────────────────────────────────────
  const handleJoinRoom = async (codeOverride) => {
    const code = codeOverride || joinCode;
    if (code.length !== 6 || isGuest) return;
    setJoinError('');

    const room = await fetchRoomByCode(code);
    if (!room) {
      setJoinError('Room not found or already started');
      return;
    }

    // Check if room is full
    const existingPlayers = await fetchRoomPlayers(room.id);
    if (existingPlayers.length >= room.max_players) {
      setJoinError('Room is full');
      return;
    }

    const player = await joinRoom(room.id, userId, displayName);
    if (!player) {
      setJoinError('Failed to join room');
      return;
    }

    setRoomId(room.id);
    setRoomCode(room.code);
    setIsHost(false);
    setMyPlayerId(player.id);
    setMaxPlayers(room.max_players);
    setMode(room.mode);
    setDuration(room.duration);
    setTimeMultiplier(room.time_multiplier);
    if (room.starting_capital) setStartingCapital(room.starting_capital);

    const allPlayers = await fetchRoomPlayers(room.id);
    setPlayers(allPlayers.map(p => ({
      id: p.id,
      name: p.display_name,
      isReady: p.is_ready,
      isHost: p.is_host,
      isBot: p.is_bot,
      isFriend: false,
      userId: p.user_id,
      slot: p.slot,
    })));

    subscribeToRoom(room.id);
    setPhase('lobby');
  };

  // ── Join from Active Rooms List ───────────────────────────────
  const handleJoinActiveRoom = async (code) => {
    setJoinCode(code);
    // Defer to handleJoinRoom logic
    const room = await fetchRoomByCode(code);
    if (!room) return;

    const existingPlayers = await fetchRoomPlayers(room.id);
    if (existingPlayers.length >= room.max_players) return;

    const player = await joinRoom(room.id, userId, displayName);
    if (!player) return;

    setRoomId(room.id);
    setRoomCode(room.code);
    setIsHost(false);
    setMyPlayerId(player.id);
    setMaxPlayers(room.max_players);
    setMode(room.mode);
    setDuration(room.duration);
    setTimeMultiplier(room.time_multiplier);
    if (room.starting_capital) setStartingCapital(room.starting_capital);

    const allPlayers = await fetchRoomPlayers(room.id);
    setPlayers(allPlayers.map(p => ({
      id: p.id, name: p.display_name, isReady: p.is_ready,
      isHost: p.is_host, isBot: p.is_bot, isFriend: false,
      userId: p.user_id, slot: p.slot,
    })));

    subscribeToRoom(room.id);
    setPhase('lobby');
  };

  // ── Invite Friend ──────────────────────────────────────────────
  const handleInviteFriend = async (friend) => {
    if (players.length >= maxPlayers || !roomId) return;
    await friendsStore.sendGameInvite(roomId, roomCode, friend.userId, mode, duration);
    setShowInvitePanel(false);
  };

  // ── Toggle Ready ──────────────────────────────────────────────
  const handleToggleReady = async () => {
    const newReady = !isReady;
    setIsReady(newReady);
    if (myPlayerId) {
      await updateReadyState(roomId, myPlayerId, newReady);
    }
  };

  // ── Add Bots ──────────────────────────────────────────────────
  const handleFillBots = async () => {
    const currentNames = players.map(p => p.name.replace(' (BOT)', ''));
    const spotsAvailable = maxPlayers - players.length;
    if (spotsAvailable <= 0) return;
    const botNames = pickBotNames(spotsAvailable, currentNames);
    for (let i = 0; i < botNames.length; i++) {
      await addBotToRoom(roomId, `${botNames[i]} (BOT)`, players.length + i + 1);
    }
  };

  // ── Kick Bot ──────────────────────────────────────────────────
  const handleKickBot = async (playerId) => {
    await removeBotFromRoom(playerId);
  };

  // ── Start Match (host only) ───────────────────────────────────
  const handleStartMatch = async () => {
    const selfPlayer = players.find(p => p.userId === userId);
    if (!selfPlayer?.isReady) return;
    if (players.length < 2) return;
    await startRoom(roomId);
    cleanupChannels();
    onStartMatch?.({ roomCode, mode, duration, timeMultiplier, maxPlayers, startingCapital, allowAgents, eventFrequency, players, myColor });
  };

  // ── Leave Lobby ───────────────────────────────────────────────
  const handleLeaveLobby = async () => {
    cleanupChannels();
    if (isHost && roomId) {
      await deleteRoom(roomId);
    } else if (roomId && userId) {
      await leaveRoom(roomId, userId);
    }
    setPhase('setup');
    setRoomId('');
    setRoomCode('');
    setPlayers([]);
    setIsReady(false);
    setIsHost(false);
    setMyPlayerId('');
  };

  // ── Render: Guest Mode Warning ────────────────────────────────
  if (isGuest) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col items-center justify-center">
        <div className="text-center max-w-md px-6">
          <span className="text-4xl mb-4 block">🔒</span>
          <h2 className="text-white font-mono text-lg mb-2">Sign In Required</h2>
          <p className="text-white/40 font-mono text-xs mb-6">
            Private Server requires a Supabase account to create and join real multiplayer rooms.
          </p>
          <button onClick={onBack} className="px-6 py-2.5 rounded text-[11px] font-mono tracking-wider bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30 hover:bg-[#a78bfa]/25 transition-all">
            BACK TO HUB
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Lobby ─────────────────────────────────────────────
  if (phase === 'lobby') {
    const selfPlayer = players.find(p => p.userId === userId);
    const selfReady = selfPlayer?.isReady || isReady;
    const canStart = selfReady && players.length >= 2;
    const emptySlots = maxPlayers - players.length;
    const onlineFriends = friendsStore.friends;

    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
          <button onClick={handleLeaveLobby} className="text-[11px] font-mono tracking-widest text-white/40 hover:text-white/70 transition-colors">
            &larr; LEAVE
          </button>
          <div className="flex-1" />
          <span className="text-[11px] font-mono tracking-[0.2em] text-[#a78bfa]/60">PRIVATE LOBBY</span>
        </div>

        {/* Lobby content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 overflow-y-auto">
          {/* Room code display */}
          <div className="text-center">
            <div className="text-[10px] tracking-[0.3em] uppercase text-white/30 font-mono mb-3">ROOM CODE</div>
            <div className="text-5xl font-mono tracking-[0.4em] text-[#a78bfa] font-bold drop-shadow-[0_0_20px_rgba(167,139,250,0.3)]">
              {roomCode}
            </div>
            <div className="text-[11px] font-mono text-white/25 mt-2 tracking-wide flex items-center justify-center gap-3">
              Share this code with friends
              {isHost && emptySlots > 0 && onlineFriends.length > 0 && (
                <button
                  onClick={() => setShowInvitePanel(!showInvitePanel)}
                  className="px-3 py-1 rounded text-[9px] font-mono font-bold tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition-all"
                >
                  INVITE FRIENDS
                </button>
              )}
            </div>
          </div>

          {/* Match info */}
          <div className="flex items-center gap-6 text-[10px] font-mono text-white/30 tracking-wider">
            <span>{GAME_MODES.find(m => m.id === mode)?.label}</span>
            <span className="text-white/10">|</span>
            <span>{duration === 0 ? '∞ UNLIMITED' : `${duration} MIN`}</span>
            <span className="text-white/10">|</span>
            <span>{timeMultiplier}x SPEED</span>
          </div>

          {/* Color Picker */}
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono text-white/25 tracking-wide">YOUR COLOR</span>
            <div className="flex gap-1.5">
              {PLAYER_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setMyColor(c.id)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    myColor === c.id
                      ? 'scale-125 shadow-[0_0_10px_var(--glow)]'
                      : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: c.hex,
                    borderColor: myColor === c.id ? c.hex : 'transparent',
                    '--glow': `${c.hex}80`,
                  }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Invite Friends Panel */}
          {showInvitePanel && (
            <div className="w-full max-w-lg bg-[#0d0d18] border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] tracking-[0.2em] uppercase text-purple-400/70 font-mono">
                  INVITE FRIENDS ({onlineFriends.length})
                </span>
                <button onClick={() => setShowInvitePanel(false)} aria-label="Close invite panel" className="text-white/20 hover:text-white/50 text-xs">✕</button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {onlineFriends.filter(f => !players.some(p => p.userId === f.userId)).map(friend => (
                  <button
                    key={friend.userId}
                    onClick={() => handleInviteFriend(friend)}
                    disabled={players.length >= maxPlayers}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-purple-500/[0.04] border border-purple-500/10 hover:border-purple-500/30 hover:bg-purple-500/[0.08] transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[10px] border bg-emerald-500/15 border-emerald-500/30 text-emerald-400">
                        {friend.avatar}
                      </div>
                      <div className="text-left">
                        <span className="text-white/70 font-mono text-[11px] font-bold block">{friend.name}</span>
                        <span className="text-[8px] font-mono text-white/25">{friend.tier} · LVL {friend.level}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-purple-400/50 group-hover:text-purple-400 tracking-wider transition-colors">INVITE</span>
                  </button>
                ))}
                {onlineFriends.filter(f => !players.some(p => p.userId === f.userId)).length === 0 && (
                  <div className="text-center py-4 text-[10px] font-mono text-white/20">No friends to invite</div>
                )}
              </div>
            </div>
          )}

          {/* Player slots */}
          <div className="w-full max-w-lg space-y-2">
            <div className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-mono mb-3">
              PLAYERS ({players.length}/{maxPlayers})
            </div>

            {players.map(p => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-3 rounded border backdrop-blur-sm transition-all ${
                  p.isReady ? 'bg-[#a78bfa]/5 border-[#a78bfa]/20' : 'bg-white/[0.02] border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${p.isReady ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-white/20'}`} />
                  <span className="text-[12px] font-mono text-white/70">{p.name}</span>
                  {p.isHost && <span className="text-[9px] font-mono text-amber-400/60 tracking-wider">HOST</span>}
                  {p.userId === userId && <span className="text-[9px] font-mono text-cyan-400/60 tracking-wider">YOU</span>}
                  {p.isBot && <span className="text-[9px] font-mono text-white/20 tracking-wider">BOT</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono tracking-wider ${p.isReady ? 'text-emerald-400' : 'text-white/20'}`}>
                    {p.isReady ? 'READY' : 'NOT READY'}
                  </span>
                  {isHost && p.isBot && (
                    <button onClick={() => handleKickBot(p.id)} className="text-[9px] font-mono text-rose-400/50 hover:text-rose-400 tracking-wider transition-colors">
                      KICK
                    </button>
                  )}
                </div>
              </div>
            ))}

            {Array.from({ length: Math.max(0, emptySlots) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center px-4 py-3 rounded border border-dashed border-white/5 bg-white/[0.01]">
                <span className="text-[11px] font-mono text-white/10 tracking-wide">Waiting...</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={handleToggleReady}
              className={`px-6 py-2.5 rounded text-[11px] font-mono tracking-[0.15em] border transition-all ${
                isReady
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-white/5 text-white/50 border-white/10 hover:border-white/20 hover:text-white/70'
              }`}
            >
              {isReady ? 'READY' : 'CLICK TO READY'}
            </button>

            {isHost && emptySlots > 0 && (
              <button onClick={handleFillBots} className="px-5 py-2.5 rounded text-[11px] font-mono tracking-[0.15em] border bg-white/5 text-white/40 border-white/10 hover:border-white/20 hover:text-white/60 transition-all">
                + FILL BOTS
              </button>
            )}

            {isHost && (
              <button
                onClick={handleStartMatch}
                disabled={!canStart}
                className={`px-8 py-2.5 rounded text-[11px] font-mono tracking-[0.15em] border transition-all ${
                  canStart
                    ? 'bg-[#a78bfa]/15 text-[#a78bfa] border-[#a78bfa]/40 hover:bg-[#a78bfa]/25 shadow-[0_0_12px_rgba(167,139,250,0.15)]'
                    : 'bg-white/[0.02] text-white/15 border-white/5 cursor-not-allowed'
                }`}
              >
                START MATCH
              </button>
            )}
          </div>

          <div className="text-[10px] font-mono text-white/15 tracking-wider">
            {!selfReady
              ? 'Click READY to enable match start'
              : emptySlots > 0
              ? `${emptySlots} slot${emptySlots > 1 ? 's' : ''} open — invite friends, add bots, or share the code`
              : 'All slots filled — start when ready'}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Setup (Create / Join) ─────────────────────────────
  const [serverMode, setServerMode] = useState('private'); // 'campaign' | 'private'
  const campaignStore = useCampaignStore();
  const [campaignJoining, setCampaignJoining] = useState(false);
  const [campaignError, setCampaignError] = useState(null);

  const handleJoinCampaign = async () => {
    if (!userId) return;
    setCampaignJoining(true);
    setCampaignError(null);
    const result = await campaignStore.joinCampaign(userId, displayName);
    setCampaignJoining(false);
    if (!result.success) setCampaignError(result.error);
  };

  const handleLeaveCampaign = () => {
    campaignStore.leave();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
        <button onClick={onBack} className="text-[11px] font-mono tracking-widest text-white/40 hover:text-white/70 transition-colors">
          &larr; BACK
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {[
            { key: 'campaign', label: 'CAMPAIGN', color: '#10b981' },
            { key: 'private', label: 'PRIVATE SERVER', color: '#a78bfa' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setServerMode(tab.key)}
              className={`px-4 py-2 text-[10px] font-mono tracking-[0.15em] rounded-lg transition-all ${
                serverMode === tab.key
                  ? 'font-bold'
                  : 'text-white/35 hover:text-white/60'
              }`}
              style={serverMode === tab.key ? {
                color: tab.color,
                backgroundColor: `${tab.color}10`,
                border: `1px solid ${tab.color}30`,
              } : { border: '1px solid transparent' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="w-16" />
      </div>

      {/* Campaign Mode */}
      {serverMode === 'campaign' && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            <div className="text-center mb-8">
              <div className="text-2xl font-mono font-bold text-[#10b981] tracking-[0.3em] mb-2">LIVE CAMPAIGN</div>
              <div className="text-[11px] text-white/40 font-mono max-w-lg mx-auto leading-relaxed">
                Persistent shared world — all players see the same stock market, same date, same events.
                Your progress continues even when you're offline. Max 100 players per server.
              </div>
            </div>

            {campaignStore.connected ? (
              <div className="space-y-6">
                {/* Connected status */}
                <div className="rounded-xl border border-[#10b981]/30 bg-[#10b981]/5 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[11px] text-[#10b981] font-mono font-bold uppercase tracking-widest">Connected to Campaign</div>
                      <div className="text-[9px] text-white/30 font-mono mt-1">Server ID: {campaignStore.serverId.slice(0, 8)}...</div>
                    </div>
                    <button onClick={handleLeaveCampaign} className="px-4 py-2 rounded-lg border border-[#ef4444]/30 text-[#ef4444] text-[10px] font-mono uppercase tracking-widest hover:bg-[#ef4444]/10 transition-colors">
                      Disconnect
                    </button>
                  </div>

                  {/* Game clock */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <div className="text-[8px] text-white/30 uppercase font-mono">Day</div>
                      <div className="text-xl font-bold font-mono text-[#10b981]">{campaignStore.gameDay}</div>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <div className="text-[8px] text-white/30 uppercase font-mono">Month</div>
                      <div className="text-xl font-bold font-mono text-[#10b981]">{campaignStore.gameMonth}</div>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <div className="text-[8px] text-white/30 uppercase font-mono">Players Online</div>
                      <div className="text-xl font-bold font-mono text-[#10b981]">{campaignStore.players.length}</div>
                    </div>
                  </div>

                  {/* Leaderboard */}
                  <div className="text-[9px] text-white/40 uppercase tracking-widest font-mono mb-2">Leaderboard</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {campaignStore.players.slice(0, 20).map((p, i) => (
                      <div key={p.user_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/20">
                        <span className="text-[10px] font-mono text-white/30 w-5">#{i + 1}</span>
                        <span className="text-[10px] font-mono text-white/70 flex-1">{p.display_name}</span>
                        <span className="text-[10px] font-mono text-[#10b981]">€{Math.round(p.net_worth).toLocaleString()}</span>
                      </div>
                    ))}
                    {campaignStore.players.length === 0 && (
                      <div className="text-[10px] text-white/20 font-mono text-center py-4">Waiting for players...</div>
                    )}
                  </div>
                </div>

                {/* Live prices */}
                {Object.keys(campaignStore.prices).length > 0 && (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="text-[9px] text-white/40 uppercase tracking-widest font-mono mb-3">Server Prices (Live)</div>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {Object.entries(campaignStore.prices).slice(0, 15).map(([id, data]) => (
                        <div key={id} className="bg-black/20 rounded-lg p-2 text-center">
                          <div className="text-[8px] font-mono text-white/50">{id}</div>
                          <div className="text-[10px] font-mono font-bold text-white/80">€{data.price.toLocaleString()}</div>
                          <div className={`text-[8px] font-mono ${data.change_pct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {data.change_pct >= 0 ? '+' : ''}{data.change_pct.toFixed(2)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity feed */}
                {campaignStore.activityFeed.length > 0 && (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="text-[9px] text-white/40 uppercase tracking-widest font-mono mb-3">Activity Feed</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {campaignStore.activityFeed.slice(0, 15).map(entry => (
                        <div key={entry.id} className="text-[9px] font-mono text-white/40">
                          <span className="text-white/60">{entry.player_name}</span> {entry.action} {entry.detail}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <button
                  onClick={handleJoinCampaign}
                  disabled={campaignJoining || isGuest}
                  className="px-8 py-4 rounded-xl text-[12px] font-mono uppercase tracking-[0.2em] font-bold transition-all bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] hover:bg-[#10b981]/25 disabled:opacity-40"
                >
                  {campaignJoining ? 'Connecting...' : isGuest ? 'Login Required' : 'Join Campaign'}
                </button>
                {campaignError && (
                  <div className="mt-4 text-[10px] text-[#ef4444] font-mono">{campaignError}</div>
                )}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Same Market', desc: 'All players see identical prices', icon: '📊' },
                    { label: 'Persistent', desc: 'Progress continues offline', icon: '🔄' },
                    { label: 'Max 100', desc: 'Players per server instance', icon: '👥' },
                    { label: 'Data Lab', desc: 'Micro-economics research', icon: '🔬' },
                  ].map(f => (
                    <div key={f.label} className="bg-white/[0.02] border border-white/5 rounded-lg p-4 text-center">
                      <div className="text-xl mb-2">{f.icon}</div>
                      <div className="text-[10px] font-mono font-bold text-[#10b981] mb-1">{f.label}</div>
                      <div className="text-[8px] font-mono text-white/30">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Private Server content */}
      {serverMode === 'private' && (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Create */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-6">
            <h2 className="text-[12px] font-mono tracking-[0.25em] text-[#a78bfa] mb-6">CREATE MATCH</h2>

            <SectionLabel>GAME MODE</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {GAME_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`px-3 py-2.5 rounded border text-[10px] font-mono tracking-[0.15em] transition-all ${
                    mode === m.id
                      ? 'bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/30'
                      : 'bg-black/20 text-white/35 border-white/5 hover:border-white/15 hover:text-white/50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <SectionLabel>DURATION</SectionLabel>
            <RadioGroup options={DURATIONS.map(d => ({ value: d, label: d === 0 ? '∞ UNLIMITED' : `${d} MIN` }))} value={duration} onChange={setDuration} />

            <SectionLabel>TIME MULTIPLIER</SectionLabel>
            <RadioGroup options={TIME_MULTIPLIERS.map(t => ({ value: t, label: `${t}x` }))} value={timeMultiplier} onChange={setTimeMultiplier} />

            <SectionLabel>MAX PLAYERS</SectionLabel>
            <div className="flex items-center gap-3">
              <input type="range" min={2} max={10} value={maxPlayers}
                onChange={e => setMaxPlayers(parseInt(e.target.value, 10))}
                className="flex-1 h-1 appearance-none bg-white/10 rounded-full accent-[#a78bfa] cursor-pointer"
              />
              <span className="text-[13px] font-mono text-[#a78bfa] w-6 text-center">{maxPlayers}</span>
            </div>

            <SectionLabel>STARTING CAPITAL</SectionLabel>
            <RadioGroup options={STARTING_CAPITALS} value={startingCapital} onChange={setStartingCapital} />

            <div className="mt-4">
              <ToggleSwitch label="ALLOW AGENTS" value={allowAgents} onChange={setAllowAgents} />
            </div>

            <SectionLabel>EVENT FREQUENCY</SectionLabel>
            <RadioGroup options={EVENT_FREQUENCIES.map(f => ({ value: f, label: f.toUpperCase() }))} value={eventFrequency} onChange={setEventFrequency} />

            <button
              onClick={handleCreateRoom}
              disabled={creating}
              className={`w-full mt-6 py-3 rounded-lg text-[11px] font-mono tracking-[0.2em] font-semibold border transition-all ${
                creating
                  ? 'bg-white/5 text-white/20 border-white/5 cursor-wait'
                  : 'bg-[#a78bfa]/15 text-[#a78bfa] border-[#a78bfa]/30 hover:bg-[#a78bfa]/25 hover:shadow-[0_0_20px_rgba(167,139,250,0.15)]'
              }`}
            >
              {creating ? 'CREATING...' : 'CREATE ROOM'}
            </button>
          </div>

          {/* Right: Join */}
          <div className="space-y-6">
            {/* Join by code */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-6">
              <h2 className="text-[12px] font-mono tracking-[0.25em] text-[#a78bfa] mb-6">JOIN MATCH</h2>

              <SectionLabel>ROOM CODE</SectionLabel>
              <div className="flex gap-3">
                <input
                  type="text" maxLength={6} value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setJoinError(''); }}
                  placeholder="XXXXXX"
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-center text-xl font-mono tracking-[0.5em] text-white/80 placeholder:text-white/15 outline-none focus:border-[#a78bfa]/40 transition-all"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={joinCode.length !== 6}
                  className={`px-6 py-3 rounded-lg text-[11px] font-mono tracking-[0.2em] border transition-all ${
                    joinCode.length === 6
                      ? 'bg-[#a78bfa]/15 text-[#a78bfa] border-[#a78bfa]/30 hover:bg-[#a78bfa]/25'
                      : 'bg-white/[0.02] text-white/15 border-white/5 cursor-not-allowed'
                  }`}
                >
                  JOIN
                </button>
              </div>
              {joinError && (
                <div className="mt-2 text-[10px] font-mono text-rose-400/70">{joinError}</div>
              )}
            </div>

            {/* Active Rooms (real from Supabase) */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[12px] font-mono tracking-[0.25em] text-white/40">ACTIVE ROOMS</h2>
                {!roomsLoading && (
                  <button onClick={loadActiveRooms} className="text-[9px] font-mono text-white/20 hover:text-white/40 tracking-wider transition-colors">
                    REFRESH
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {activeRooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => handleJoinActiveRoom(room.code)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-white/5 bg-black/20 hover:border-[#a78bfa]/20 hover:bg-[#a78bfa]/[0.03] transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[13px] font-mono tracking-[0.15em] text-[#a78bfa]/70 group-hover:text-[#a78bfa]">
                        {room.code}
                      </span>
                      <div className="text-left">
                        <div className="text-[11px] font-mono text-white/50">{room.host_name}</div>
                        <div className="text-[9px] font-mono text-white/20 tracking-wider">
                          {GAME_MODES.find(m => m.id === room.mode)?.label || room.mode}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-mono text-white/30">
                        {room.player_count || 0}/{room.max_players}
                      </span>
                      <span className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full border text-emerald-400/60 border-emerald-400/20 bg-emerald-400/5">
                        OPEN
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {activeRooms.length === 0 && !roomsLoading && (
                <div className="text-center py-8 text-[11px] font-mono text-white/15 tracking-wide">
                  No active rooms — create one to get started
                </div>
              )}

              {roomsLoading && (
                <div className="text-center py-6 text-[11px] font-mono text-white/20 animate-pulse">
                  Loading rooms...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
