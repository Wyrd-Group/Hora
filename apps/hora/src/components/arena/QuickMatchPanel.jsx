import { useState, useEffect, useCallback, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MODES = [
  { id: 'ffa',      icon: '\u25C9', label: 'Free for All',   desc: 'Highest net worth wins' },
  { id: 'blitz',    icon: '\u26A1', label: 'Trading Blitz',  desc: 'Most profitable trades' },
  { id: 'rush',     icon: '\uD83C\uDFD7',  label: 'Empire Rush',    desc: 'Most nodes owned' },
  { id: 'agents',   icon: '\u2694',  label: 'Agent Wars',     desc: 'Best agent deployment' },
];

const AI_NAMES = [
  'NexusTrade', 'WolfCapital', 'ZeroHedge', 'AlphaVenture',
  'IronForge', 'SilkRoute', 'VanguardCEO', 'OmegaFund', 'TitanGrowth',
];

const TIER_BADGES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

const REWARDS_TEXT = '1st: \u20AC5M + 5000 XP + Champion title';

const DURATION_OPTIONS = [
  { key: '10min',  label: '10m' },
  { key: '20min',  label: '20m' },
  { key: '30min',  label: '30m' },
  { key: '45min',  label: '45m' },
  { key: '60min',  label: '1h' },
  { key: '3h',     label: '3h' },
  { key: '6h',     label: '6h' },
  { key: '12h',    label: '12h' },
  { key: '24h',    label: '24h' },
  { key: '72h',    label: '3d' },
  { key: '1week',  label: '1w' },
];

function randomBetween(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function generateOpponents() {
  return AI_NAMES.map((name) => ({
    name,
    tier: TIER_BADGES[randomBetween(0, 4)],
    winRate: randomBetween(38, 82),
    isPlayer: false,
  }));
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ModeCard({ mode, selected, onSelect }) {
  const active = selected === mode.id;
  return (
    <button
      onClick={() => onSelect(mode.id)}
      className={`
        flex-1 min-w-[140px] p-4 rounded-xl border text-left transition-all duration-200
        backdrop-blur-xl font-mono cursor-pointer
        ${active
          ? 'border-red-500 bg-red-500/15 shadow-[0_0_24px_rgba(239,68,68,0.25)]'
          : 'border-white/10 bg-white/5 hover:border-red-500/40 hover:bg-red-500/5'}
      `}
    >
      <span className="text-2xl block mb-2">{mode.icon}</span>
      <span className={`text-sm font-bold tracking-wide block ${active ? 'text-red-400' : 'text-[#E8E0D0]'}`}>
        {mode.label}
      </span>
      <span className="text-xs text-[#9C8E7E] block mt-1">{mode.desc}</span>
      <span className="text-[10px] text-amber-400/80 block mt-2">{REWARDS_TEXT}</span>
    </button>
  );
}

function PulseRing({ delay = 0 }) {
  return (
    <span
      className="absolute inset-0 rounded-full border border-red-500/40 animate-ping"
      style={{ animationDelay: `${delay}ms`, animationDuration: '2s' }}
    />
  );
}

function PlayerRow({ player, index }) {
  const tierColor = {
    Bronze: 'text-orange-400',
    Silver: 'text-gray-300',
    Gold: 'text-yellow-400',
    Platinum: 'text-cyan-400',
    Diamond: 'text-purple-400',
  }[player.tier] || 'text-gray-400';

  return (
    <div
      className={`
        flex items-center justify-between px-4 py-2 rounded-lg font-mono text-sm
        ${player.isPlayer ? 'bg-red-500/15 border border-red-500/30' : 'bg-white/5 border border-white/5'}
        animate-[fadeSlideIn_0.3s_ease_forwards]
      `}
      style={{ animationDelay: `${index * 80}ms`, opacity: 0 }}
    >
      <div className="flex items-center gap-3">
        <span className="text-[#9C8E7E] w-5 text-right">{index + 1}.</span>
        <span className={player.isPlayer ? 'text-red-400 font-bold' : 'text-[#E8E0D0]'}>
          {player.name}
          {player.isPlayer && <span className="ml-1 text-[10px] text-red-500">(YOU)</span>}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-xs font-bold ${tierColor}`}>{player.tier}</span>
        <span className="text-xs text-[#9C8E7E]">{player.winRate}% WR</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function QuickMatchPanel({ onBack, onMatchStart }) {
  const [phase, setPhase] = useState('select');       // select | searching | lobby
  const [selectedMode, setSelectedMode] = useState('ffa');
  const [selectedDuration, setSelectedDuration] = useState('10min');
  const [isBotMatch, setIsBotMatch] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [playersFound, setPlayersFound] = useState(0);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [countdown, setCountdown] = useState(5);
  const [matchFlash, setMatchFlash] = useState(true);

  const timerRef = useRef(null);
  const searchRef = useRef(null);
  const countdownRef = useRef(null);

  /* ---- cleanup all timers on unmount ---- */
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(searchRef.current);
      clearInterval(countdownRef.current);
    };
  }, []);

  /* ---- Phase: searching ---- */
  const startSearch = useCallback(() => {
    setPhase('searching');
    setSearchTime(0);
    setPlayersFound(0);

    // tick search timer every second
    timerRef.current = setInterval(() => {
      setSearchTime((t) => t + 1);
    }, 1000);

    // simulate players trickling in
    const trickle = [
      { delay: 800,  count: 2 },
      { delay: 1600, count: 4 },
      { delay: 2400, count: 6 },
      { delay: 3200, count: 8 },
      { delay: 3800, count: 10 },
    ];
    trickle.forEach(({ delay, count }) => {
      setTimeout(() => setPlayersFound(count), delay);
    });

    // auto-transition to lobby after ~4s
    searchRef.current = setTimeout(() => {
      clearInterval(timerRef.current);
      enterLobby();
    }, randomBetween(3000, 5000));
  }, []);

  /* ---- Phase: lobby ---- */
  const enterLobby = useCallback(() => {
    const opponents = generateOpponents();
    const me = { name: 'You', tier: 'Gold', winRate: 65, isPlayer: true };
    // insert player at random-ish position (slot 3-6)
    const pos = randomBetween(3, 6);
    opponents.splice(pos, 0, me);
    // only take first 10
    setLobbyPlayers(opponents.slice(0, 10));
    setPhase('lobby');
    setMatchFlash(true);
    setCountdown(5);

    // flash disappears after 1.5s
    setTimeout(() => setMatchFlash(false), 1500);

    // countdown
    let c = 5;
    countdownRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countdownRef.current);
        onMatchStart?.();
      }
    }, 1000);
  }, [onMatchStart]);

  /* ---- Cancel search ---- */
  const cancelSearch = useCallback(() => {
    clearInterval(timerRef.current);
    clearTimeout(searchRef.current);
    setPhase('select');
  }, []);

  /* ---- Format seconds as M:SS ---- */
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* keyframe injection (once) */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes radarSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes matchFlash {
          0%   { opacity: 0; transform: scale(0.8); }
          40%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="w-full max-w-3xl mx-auto px-6">

        {/* =========== PHASE 1: MODE SELECTION =========== */}
        {phase === 'select' && (
          <div className="animate-[fadeSlideIn_0.4s_ease_forwards]">
            <h1 className="text-3xl font-black font-mono tracking-wider text-[#ef4444] text-center mb-1">
              QUICK MATCH
            </h1>
            <p className="text-center text-[#9C8E7E] text-sm mb-8 font-mono">
              PvP arena -- choose mode, duration & opponents
            </p>

            {/* mode cards */}
            <div className="flex flex-wrap gap-3 mb-6">
              {MODES.map((m) => (
                <ModeCard key={m.id} mode={m} selected={selectedMode} onSelect={setSelectedMode} />
              ))}
            </div>

            {/* Duration selector */}
            <div className="mb-5">
              <p className="text-xs text-[#9C8E7E] font-mono mb-2 text-center tracking-wider">MATCH DURATION</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {DURATION_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedDuration(key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-150
                      ${selectedDuration === key
                        ? 'bg-red-500/20 border border-red-500/50 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                        : 'border border-white/10 text-[#9C8E7E] hover:border-white/20 hover:text-[#E8E0D0]'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bot vs Players toggle */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <button
                onClick={() => setIsBotMatch(false)}
                className={`px-4 py-2 rounded-lg font-mono text-xs tracking-wider transition-all
                  ${!isBotMatch
                    ? 'bg-red-500/15 border border-red-500/40 text-red-400'
                    : 'border border-white/10 text-[#9C8E7E] hover:text-[#E8E0D0]'
                  }`}
              >
                VS PLAYERS
              </button>
              <button
                onClick={() => setIsBotMatch(true)}
                className={`px-4 py-2 rounded-lg font-mono text-xs tracking-wider transition-all
                  ${isBotMatch
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                    : 'border border-white/10 text-[#9C8E7E] hover:text-[#E8E0D0]'
                  }`}
              >
                VS BOTS
              </button>
            </div>

            {/* actions */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={onBack}
                className="px-5 py-2.5 rounded-lg border border-white/10 text-[#9C8E7E] font-mono text-sm
                           hover:border-white/20 hover:text-[#E8E0D0] transition-colors"
              >
                &larr; BACK
              </button>
              <button
                onClick={isBotMatch ? enterLobby : startSearch}
                className={`px-8 py-2.5 rounded-lg text-white font-mono text-sm font-bold tracking-wider transition-colors
                  ${isBotMatch
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                  }`}
              >
                {isBotMatch ? 'START BOT MATCH' : 'FIND MATCH'}
              </button>
            </div>
          </div>
        )}

        {/* =========== PHASE 2: SEARCHING =========== */}
        {phase === 'searching' && (
          <div className="flex flex-col items-center animate-[fadeSlideIn_0.4s_ease_forwards]">
            {/* radar / pulse */}
            <div className="relative w-32 h-32 mb-8">
              {/* spinning radar line */}
              <div
                className="absolute inset-0 rounded-full"
                style={{ animation: 'radarSpin 2s linear infinite' }}
              >
                <div className="absolute top-1/2 left-1/2 w-1/2 h-[2px] bg-gradient-to-r from-red-500 to-transparent origin-left" />
              </div>
              {/* concentric rings */}
              <PulseRing delay={0} />
              <PulseRing delay={600} />
              <PulseRing delay={1200} />
              {/* center dot */}
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
            </div>

            <p className="text-lg font-mono font-bold tracking-wider text-[#E8E0D0] mb-2">
              SEARCHING FOR OPPONENTS
              <span className="inline-block w-6 text-left animate-pulse">...</span>
            </p>

            <div className="flex gap-6 text-sm font-mono text-[#9C8E7E] mb-4">
              <span>Search time: <span className="text-[#E8E0D0]">{fmtTime(searchTime)}</span></span>
              <span>Players found: <span className="text-red-400">{playersFound}/10</span></span>
            </div>

            {/* player dots */}
            <div className="flex gap-2 mb-8">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    i < playersFound ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={cancelSearch}
              className="px-6 py-2 rounded-lg border border-white/10 text-[#9C8E7E] font-mono text-sm
                         hover:border-red-500/40 hover:text-red-400 transition-colors"
            >
              CANCEL
            </button>
          </div>
        )}

        {/* =========== PHASE 3: LOBBY FOUND =========== */}
        {phase === 'lobby' && (
          <div className="animate-[fadeSlideIn_0.3s_ease_forwards]">
            {/* flash banner */}
            {matchFlash && (
              <div
                className="text-center mb-6"
                style={{ animation: 'matchFlash 0.6s ease forwards' }}
              >
                <h2 className="text-4xl font-black font-mono tracking-widest text-red-500
                               drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]">
                  MATCH FOUND
                </h2>
              </div>
            )}
            {!matchFlash && (
              <h2 className="text-2xl font-black font-mono tracking-wider text-red-500 text-center mb-4">
                MATCH FOUND
              </h2>
            )}

            {/* player list */}
            <div className="space-y-1.5 mb-6 max-h-[420px] overflow-y-auto pr-1">
              {lobbyPlayers.map((p, i) => (
                <PlayerRow key={p.name} player={p} index={i} />
              ))}
            </div>

            {/* countdown */}
            <div className="text-center">
              <p className="font-mono text-[#9C8E7E] text-sm mb-1">Match starts in</p>
              <span
                className="text-5xl font-black font-mono text-red-500
                           drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]
                           animate-pulse"
              >
                {countdown}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
