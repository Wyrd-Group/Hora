import React, { useMemo } from 'react';
import PlayerIcon from './PlayerIcon';
import { TEAM_META } from '../../../../data/teamMeta';

/**
 * NBA-style 2D basketball court with realistic ball movement.
 * Ball changes teams, goes into baskets on scores, defense shadows offense.
 * SVG proportions: 94ft × 50ft → viewBox 940 × 500.
 *
 * Possession system: deterministic sequence based on team names.
 * Each minute has a possessing team and ball carrier.
 * ~50% possession split, scoring events send ball to the basket.
 */

// Offense positions (attacking left basket)
const OFFENSE_LEFT = [
  { pos: 'PG', x: 0.30, y: 0.50 },
  { pos: 'SG', x: 0.22, y: 0.20 },
  { pos: 'SF', x: 0.22, y: 0.80 },
  { pos: 'PF', x: 0.13, y: 0.35 },
  { pos: 'C',  x: 0.10, y: 0.65 },
];

// Offense positions (attacking right basket)
const OFFENSE_RIGHT = OFFENSE_LEFT.map(p => ({ ...p, x: 1 - p.x }));

// Defense positions: shadow the offense, shifted toward the basket they defend
const DEFENSE_LEFT = OFFENSE_RIGHT.map(p => ({ ...p, x: p.x - 0.05 }));
const DEFENSE_RIGHT = OFFENSE_LEFT.map(p => ({ ...p, x: p.x + 0.05 }));

// Basket locations
const LEFT_BASKET = { x: 0.063, y: 0.50 };
const RIGHT_BASKET = { x: 0.937, y: 0.50 };
const CENTER = { x: 0.50, y: 0.50 };

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s >>> 0) / 0x7fffffff;
  };
}

/**
 * Build a possession sequence for the full NBA game (48 minutes).
 * Each minute: which team has the ball, which player index (0-4) holds it,
 * and whether a score happens at this minute.
 */
function buildNBASequence(totalMinutes, events, homeTeamId, seed) {
  const rng = seededRng(seed);
  const seq = new Array(totalMinutes + 2);

  // Map score events
  const scoreMinutes = new Map();
  for (const e of events) {
    if (e.type === 'basket' || e.type === 'three_pointer' || e.type === 'free_throw' ||
        e.type === 'goal' || e.type === 'dunk' || e.type === 'layup' ||
        e.points > 0) {
      scoreMinutes.set(e.minute, { teamId: e.teamId, points: e.points || 2, type: e.type });
    }
  }

  let possessionHome = true;
  let carrier = 0; // PG

  for (let m = 0; m <= totalMinutes; m++) {
    const scoreEvt = scoreMinutes.get(m);

    if (scoreEvt) {
      const isHomeScoring = scoreEvt.teamId === homeTeamId;
      seq[m] = {
        type: 'score',
        possessionHome: isHomeScoring,
        isHomeScoring,
        points: scoreEvt.points,
        carrier,
      };
      // After score, other team gets the ball (inbound)
      possessionHome = !isHomeScoring;
      carrier = 0; // PG brings it up
      continue;
    }

    // Normal play: pass the ball around
    const r = rng();

    // Possession change (~20% per minute — fast-paced NBA)
    if (r < 0.20) {
      possessionHome = !possessionHome;
      carrier = Math.floor(rng() * 5); // steal/turnover → random defender
    } else {
      // Pass within team
      const r2 = rng();
      // PG distributes a lot, post players get fewer touches
      if (carrier === 0) {
        // PG → SG (30%), SF (25%), PF (25%), C (20%)
        carrier = r2 < 0.30 ? 1 : r2 < 0.55 ? 2 : r2 < 0.80 ? 3 : 4;
      } else if (carrier === 4) {
        // C → PG (40%), PF (35%), others (25%)
        carrier = r2 < 0.40 ? 0 : r2 < 0.75 ? 3 : Math.floor(rng() * 3);
      } else {
        // Wings: pass to PG (30%), other wing (25%), big (20%), or self drive (25%)
        const others = [0, 1, 2, 3, 4].filter(i => i !== carrier);
        carrier = others[Math.floor(rng() * others.length)];
      }
    }

    seq[m] = { type: 'play', possessionHome, carrier };
  }

  return seq;
}

function getPlayerSway(bx, by, minute, idx, seed) {
  const phase = (minute * 0.2 + idx * 1.7 + seed) % (Math.PI * 2);
  return {
    x: Math.max(0.03, Math.min(0.97, bx + Math.sin(phase) * 0.012)),
    y: Math.max(0.05, Math.min(0.95, by + Math.cos(phase * 1.5) * 0.015)),
  };
}

export default function BasketballCourt({
  homeTeamName,
  awayTeamName,
  homeTeamId = '',
  homeRoster = [],
  awayRoster = [],
  currentMinute = 0,
  events = [],
  score = { home: 0, away: 0 },
  quarter = 1,
  highlightedPlayerId = null,
  playbackSpeed = 1,
}) {
  const homeMeta = TEAM_META[homeTeamName] || { color: '#1D428A', accent: '#FFC72C', abbr: 'HOM' };
  const awayMeta = TEAM_META[awayTeamName] || { color: '#CE1141', accent: '#FFFFFF', abbr: 'AWY' };

  // Deterministic seed from team names
  const matchSeed = useMemo(() => {
    let s = 0;
    const combined = (homeTeamName || '') + (awayTeamName || '');
    for (let i = 0; i < combined.length; i++) {
      s = ((s << 5) - s + combined.charCodeAt(i)) | 0;
    }
    return Math.abs(s);
  }, [homeTeamName, awayTeamName]);

  // Build sequence for the full game
  const sequence = useMemo(() => {
    return buildNBASequence(48, events, homeTeamId, matchSeed);
  }, [events.length, homeTeamId, matchSeed]);

  const currentEntry = sequence[currentMinute] || { type: 'play', possessionHome: true, carrier: 0 };
  const possHome = currentEntry.possessionHome;
  const isScoring = currentEntry.type === 'score';

  // Player positions: offense attacks a basket, defense guards it
  // Home attacks RIGHT basket, Away attacks LEFT basket
  // When home has possession: home = offense on right side, away = defense on right side
  // When away has possession: away = offense on left side, home = defense on left side

  const homePositions = useMemo(() => {
    const base = possHome ? OFFENSE_RIGHT : DEFENSE_LEFT;
    return base.map((p, i) => getPlayerSway(p.x, p.y, currentMinute, i, 1));
  }, [possHome, currentMinute]);

  const awayPositions = useMemo(() => {
    const base = possHome ? DEFENSE_RIGHT : OFFENSE_LEFT;
    return base.map((p, i) => getPlayerSway(p.x, p.y, currentMinute, i + 5, 2));
  }, [possHome, currentMinute]);

  // Ball position
  const ballPos = useMemo(() => {
    if (isScoring) {
      // Ball goes to the basket
      if (currentEntry.isHomeScoring) {
        return RIGHT_BASKET; // Home scores on right
      } else {
        return LEFT_BASKET; // Away scores on left
      }
    }

    // Ball is with the carrier
    const carrierIdx = currentEntry.carrier || 0;
    if (possHome) {
      return homePositions[carrierIdx] || CENTER;
    } else {
      return awayPositions[carrierIdx] || CENTER;
    }
  }, [currentMinute, isScoring, possHome, currentEntry, homePositions, awayPositions]);

  // Ball holder index for highlight
  const ballHolderInfo = useMemo(() => {
    if (isScoring) return { team: null, idx: -1 };
    return {
      team: possHome ? 'home' : 'away',
      idx: currentEntry.carrier || 0,
    };
  }, [currentMinute, isScoring, possHome, currentEntry]);

  const W = 940, H = 500;
  const transitionMs = Math.max(200, Math.round(600 / playbackSpeed));

  const toSvg = (nx, ny) => ({
    sx: 20 + nx * (W - 40),
    sy: 20 + ny * (H - 40),
  });

  const ballSvg = toSvg(ballPos.x, ballPos.y);

  return (
    <div className="relative w-full" style={{ aspectRatio: '940/500' }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full rounded-lg overflow-hidden">
        {/* Court background — hardwood */}
        <defs>
          <linearGradient id="wood-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C4956A" />
            <stop offset="50%" stopColor="#B8864E" />
            <stop offset="100%" stopColor="#C4956A" />
          </linearGradient>
          <pattern id="wood-grain" patternUnits="userSpaceOnUse" width="20" height="500">
            <rect width="1" height="500" fill="rgba(0,0,0,0.03)" />
          </pattern>
          <filter id="bb-holder-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#FFD700" floodOpacity="0.6" />
          </filter>
          <filter id="bb-score-flash" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#FF6B00" floodOpacity="0.9" />
          </filter>
          <radialGradient id="bb-shadow">
            <stop offset="0%" stopColor="rgba(0,0,0,0.3)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#wood-grad)" />
        <rect width={W} height={H} fill="url(#wood-grain)" />

        {/* Court markings */}
        <g stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none">
          <rect x="20" y="20" width={W - 40} height={H - 40} />
          <line x1={W / 2} y1="20" x2={W / 2} y2={H - 20} />
          <circle cx={W / 2} cy={H / 2} r="60" />
          <circle cx={W / 2} cy={H / 2} r="3" fill="rgba(255,255,255,0.5)" />

          {/* Left three-point line */}
          <path d={`M 20 70 L 160 70 A 170 170 0 0 1 160 ${H - 70} L 20 ${H - 70}`} />
          <rect x="20" y="150" width="180" height="200" />
          <circle cx="200" cy={H / 2} r="60" />
          <line x1="50" y1="215" x2="50" y2="285" strokeWidth="3" stroke="rgba(255,255,255,0.8)" />
          <circle cx="60" cy={H / 2} r="12" stroke="#FF4500" strokeWidth="2" />

          {/* Right three-point line */}
          <path d={`M ${W - 20} 70 L ${W - 160} 70 A 170 170 0 0 0 ${W - 160} ${H - 70} L ${W - 20} ${H - 70}`} />
          <rect x={W - 200} y="150" width="180" height="200" />
          <circle cx={W - 200} cy={H / 2} r="60" />
          <line x1={W - 50} y1="215" x2={W - 50} y2="285" strokeWidth="3" stroke="rgba(255,255,255,0.8)" />
          <circle cx={W - 60} cy={H / 2} r="12" stroke="#FF4500" strokeWidth="2" />
        </g>

        {/* Home team players */}
        {homePositions.map((pos, i) => {
          const { sx, sy } = toSvg(pos.x, pos.y);
          const player = homeRoster[i] || { id: `h${i}` };
          const isHolder = ballHolderInfo.team === 'home' && ballHolderInfo.idx === i;

          return (
            <g key={`h-${i}`}
              style={{ transition: `transform ${transitionMs}ms ease-in-out` }}
              transform={`translate(${sx - 12}, ${sy - 12})`}
              filter={isHolder ? 'url(#bb-holder-glow)' : undefined}
            >
              <PlayerIcon
                color={homeMeta.color}
                accent={homeMeta.accent}
                number={i + 1}
                hasBall={isHolder}
                highlighted={highlightedPlayerId === player.id}
                size={24}
              />
            </g>
          );
        })}

        {/* Away team players */}
        {awayPositions.map((pos, i) => {
          const { sx, sy } = toSvg(pos.x, pos.y);
          const player = awayRoster[i] || { id: `a${i}` };
          const isHolder = ballHolderInfo.team === 'away' && ballHolderInfo.idx === i;

          return (
            <g key={`a-${i}`}
              style={{ transition: `transform ${transitionMs}ms ease-in-out` }}
              transform={`translate(${sx - 12}, ${sy - 12})`}
              filter={isHolder ? 'url(#bb-holder-glow)' : undefined}
            >
              <PlayerIcon
                color={awayMeta.color}
                accent={awayMeta.accent}
                number={i + 1}
                hasBall={isHolder}
                highlighted={highlightedPlayerId === player.id}
                size={24}
              />
            </g>
          );
        })}

        {/* Ball shadow */}
        <ellipse
          cx={ballSvg.sx}
          cy={ballSvg.sy + 4}
          rx="7" ry="3"
          fill="url(#bb-shadow)"
          style={{ transition: `cx ${transitionMs}ms linear, cy ${transitionMs}ms linear` }}
        />

        {/* Basketball */}
        <g
          style={{ transition: `transform ${transitionMs}ms linear` }}
          transform={`translate(${ballSvg.sx}, ${ballSvg.sy})`}
          filter={isScoring ? 'url(#bb-score-flash)' : undefined}
        >
          <circle r="6" fill="#FF6B00" stroke="#CC5500" strokeWidth="1" />
          {/* Ball seams */}
          <line x1="-6" y1="0" x2="6" y2="0" stroke="#222" strokeWidth="0.5" />
          <path d="M 0 -6 Q -3 0 0 6" fill="none" stroke="#222" strokeWidth="0.5" />
          <path d="M 0 -6 Q 3 0 0 6" fill="none" stroke="#222" strokeWidth="0.5" />
        </g>

        {/* Possession indicator arrow */}
        <g opacity="0.5">
          <text x={W / 2} y={H - 8} textAnchor="middle" fill={possHome ? homeMeta.color : awayMeta.color}
            fontSize="14" fontWeight="bold" fontFamily="ui-sans-serif, system-ui">
            {possHome ? `◀ ${homeMeta.abbr}` : `${awayMeta.abbr} ▶`}
          </text>
        </g>

        {/* Scoring celebration overlay */}
        {isScoring && (
          <>
            {/* Highlight the basket */}
            <circle
              cx={currentEntry.isHomeScoring ? (W - 60) : 60}
              cy={H / 2}
              r="20"
              fill="none" stroke="#FFD700" strokeWidth="3"
            >
              <animate attributeName="r" values="12;30;25" dur="0.6s" fill="freeze" />
              <animate attributeName="stroke-opacity" values="1;0.5;1" dur="0.6s" repeatCount="2" />
            </circle>

            {/* Points popup */}
            <text
              x={currentEntry.isHomeScoring ? (W - 60) : 60}
              y={H / 2 - 35}
              textAnchor="middle" fill="#FFD700" fontSize="24" fontWeight="900"
              fontFamily="ui-sans-serif, system-ui"
            >
              <animate attributeName="y" from={H / 2 - 20} to={H / 2 - 45} dur="0.5s" fill="freeze" />
              <animate attributeName="opacity" values="0;1;1" dur="0.3s" fill="freeze" />
              +{currentEntry.points || 2}
            </text>
          </>
        )}
      </svg>

      {/* Scoreboard */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/85 px-5 py-2 rounded-lg border border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: homeMeta.color }} />
          <span className="text-[10px] font-bold uppercase" style={{ color: homeMeta.color }}>{homeMeta.abbr}</span>
          <span className="text-white font-mono text-xl font-black">{score.home}</span>
        </div>
        <div className="text-center">
          <div className="text-[8px] text-white/40 uppercase">Q{quarter}</div>
          <div className="text-[10px] text-white/60 font-mono">{12 - (currentMinute % 12)}:00</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white font-mono text-xl font-black">{score.away}</span>
          <span className="text-[10px] font-bold uppercase" style={{ color: awayMeta.color }}>{awayMeta.abbr}</span>
          <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: awayMeta.color }} />
        </div>
      </div>
    </div>
  );
}
