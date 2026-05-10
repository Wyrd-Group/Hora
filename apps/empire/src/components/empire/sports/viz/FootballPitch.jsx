import React, { useMemo, useRef, useEffect, useState } from 'react';
import JerseyIcon from './JerseyIcon';
import { TEAM_META } from '../../../../data/teamMeta';

/**
 * FM-style 2D football pitch with jersey icons.
 * Ball moves between player positions simulating passes, with goals going into the net.
 * SVG viewBox uses FIFA regulation proportions (105m × 68m → scaled to 1050 × 680).
 *
 * KEY FIX: Ball uses a two-phase approach:
 *   Phase 1 (0–70% of tick): ball travels from previous holder to current holder's position
 *   Phase 2 (70–100% of tick): ball sits at current holder
 * This ensures the ball visually ARRIVES at the player before the next tick fires.
 * Players use very subtle sway so their positions are mostly stable.
 */

// ── Formation position maps (normalized 0-1 coordinates on pitch half) ──
// Base 4-3-3 formation
const BASE_FORMATION = [
  { pos: 'GK', x: 0.05, y: 0.5 },
  { pos: 'LB', x: 0.22, y: 0.15 },
  { pos: 'CB', x: 0.18, y: 0.35 },
  { pos: 'CB', x: 0.18, y: 0.65 },
  { pos: 'RB', x: 0.22, y: 0.85 },
  { pos: 'CDM', x: 0.38, y: 0.5 },
  { pos: 'CM', x: 0.42, y: 0.28 },
  { pos: 'CM', x: 0.42, y: 0.72 },
  { pos: 'LW', x: 0.58, y: 0.15 },
  { pos: 'RW', x: 0.58, y: 0.85 },
  { pos: 'ST', x: 0.60, y: 0.5 },
];

// Tactic X-offsets: shift entire outfield forward or back
// Positive = more attacking (players pushed up), negative = more defensive (players sit back)
const TACTIC_OFFSETS = {
  'ultra-defensive': -0.10,
  'defensive':       -0.05,
  'balanced':         0.00,
  'offensive':        0.05,
  'ultra-offensive':  0.10,
};

function applyTactic(formation, tactic) {
  const offset = TACTIC_OFFSETS[tactic] || 0;
  return formation.map(p => {
    if (p.pos === 'GK') return p; // GK stays put
    return { ...p, x: Math.max(0.08, Math.min(0.70, p.x + offset)) };
  });
}

const FORMATIONS = {
  '4-3-3': BASE_FORMATION,
};

function mirrorPositions(positions) {
  return positions.map(p => ({ ...p, x: 1 - p.x }));
}

// ── Deterministic PRNG (same seed = same sequence) ──
function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s >>> 0) / 0x7fffffff;
  };
}

// ── Passing chain system ──
function buildPassingSequence(totalMinutes, events, homeTeamId, seed) {
  const rng = seededRng(seed);
  const seq = new Array(totalMinutes + 2);

  const goalMinutes = new Map();
  for (const e of events) {
    if (e.type === 'goal' || e.type === 'penalty' || e.type === 'own_goal') {
      goalMinutes.set(e.minute, { teamId: e.teamId, type: e.type });
    }
  }

  const homeMidfield = [5, 6, 7];
  const homeAttack = [8, 9, 10];
  const homeDefense = [1, 2, 3, 4];
  const awayMidfield = [16, 17, 18];
  const awayAttack = [19, 20, 21];
  const awayDefense = [12, 13, 14, 15];

  let possessionHome = true;
  let lastPlayer = 5;

  for (let m = 0; m <= totalMinutes; m++) {
    const goal = goalMinutes.get(m);
    if (goal) {
      seq[m] = { type: 'goal', teamId: goal.teamId, isHome: goal.teamId === homeTeamId };
      if (m + 1 <= totalMinutes) {
        seq[m + 1] = { type: 'kickoff' };
        possessionHome = goal.teamId !== homeTeamId;
      }
      continue;
    }

    if (seq[m]) {
      lastPlayer = possessionHome ? 5 : 16;
      continue;
    }

    const r = rng();

    if (r < 0.15) {
      possessionHome = !possessionHome;
      const newPool = possessionHome
        ? [...homeDefense, ...homeMidfield]
        : [...awayDefense, ...awayMidfield];
      lastPlayer = newPool[Math.floor(rng() * newPool.length)];
    } else {
      const r2 = rng();
      let pool;

      if (possessionHome) {
        const isDefender = homeDefense.includes(lastPlayer) || lastPlayer === 0;
        const isMidfielder = homeMidfield.includes(lastPlayer);

        if (isDefender) {
          pool = r2 < 0.70 ? homeMidfield : r2 < 0.95 ? homeDefense : [0];
        } else if (isMidfielder) {
          pool = r2 < 0.55 ? homeAttack : r2 < 0.85 ? homeMidfield : homeDefense;
        } else {
          pool = r2 < 0.45 ? homeAttack : r2 < 0.90 ? homeMidfield : homeAttack;
        }
      } else {
        const isDefender = awayDefense.includes(lastPlayer) || lastPlayer === 11;
        const isMidfielder = awayMidfield.includes(lastPlayer);

        if (isDefender) {
          pool = r2 < 0.70 ? awayMidfield : r2 < 0.95 ? awayDefense : [11];
        } else if (isMidfielder) {
          pool = r2 < 0.55 ? awayAttack : r2 < 0.85 ? awayMidfield : awayDefense;
        } else {
          pool = r2 < 0.45 ? awayAttack : r2 < 0.90 ? awayMidfield : awayAttack;
        }
      }

      const filtered = pool.filter(p => p !== lastPlayer);
      lastPlayer = filtered.length > 0
        ? filtered[Math.floor(rng() * filtered.length)]
        : pool[Math.floor(rng() * pool.length)];
    }

    seq[m] = { type: 'player', playerIdx: lastPlayer, possessionHome };
  }

  return seq;
}

// ── Player position with VERY subtle formation sway ──
// Keep sway minimal so the ball visually arrives at the player
function getPlayerPosition(baseX, baseY, minute, playerIdx, seed) {
  const phase = (minute * 0.15 + playerIdx * 2.3 + seed * 0.7) % (Math.PI * 2);
  // Very subtle sway — ±1% max so players stay nearly at formation spots
  const swayX = Math.sin(phase) * 0.010;
  const swayY = Math.cos(phase * 1.3 + 0.5) * 0.008;

  return {
    x: Math.max(0.02, Math.min(0.98, baseX + swayX)),
    y: Math.max(0.05, Math.min(0.95, baseY + swayY)),
  };
}

// ── Kit clash detection ──
function resolveKitColors(homeMeta, awayMeta) {
  const home = { color: homeMeta.color, accent: homeMeta.accent };
  let away = { color: awayMeta.color, accent: awayMeta.accent };

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  }

  function colorDist(c1, c2) {
    const a = hexToRgb(c1);
    const b = hexToRgb(c2);
    return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
  }

  const dist = colorDist(home.color, away.color);

  if (dist < 120) {
    const swappedDist = colorDist(home.color, away.accent);
    if (swappedDist > 120 && away.accent !== '#FFFFFF' && away.accent !== '#000000') {
      away = { color: away.accent, accent: away.color };
    } else {
      const isHomeLight = hexToRgb(home.color).r + hexToRgb(home.color).g + hexToRgb(home.color).b > 400;
      away = isHomeLight
        ? { color: '#1a1a2e', accent: awayMeta.accent }
        : { color: '#FFFFFF', accent: awayMeta.color || '#333333' };
    }
  }

  const homeBright = hexToRgb(home.color);
  const awayBright = hexToRgb(away.color);
  const homeL = homeBright.r * 0.299 + homeBright.g * 0.587 + homeBright.b * 0.114;
  const awayL = awayBright.r * 0.299 + awayBright.g * 0.587 + awayBright.b * 0.114;

  if (homeL < 60 && awayL < 60) {
    away = { color: '#FFFFFF', accent: awayMeta.color || '#333333' };
  }
  if (homeL > 200 && awayL > 200) {
    away = { color: '#1a1a2e', accent: awayMeta.accent || '#FFFFFF' };
  }

  return { home, away };
}

// ── Goal positions (inside the net) ──
const GOAL_LEFT = { x: 0.01, y: 0.5 };
const GOAL_RIGHT = { x: 0.99, y: 0.5 };
const CENTER = { x: 0.5, y: 0.5 };

export default function FootballPitch({
  homeTeamName,
  awayTeamName,
  homeTeamId = '',
  awayTeamId = '',
  homeRoster = [],
  awayRoster = [],
  currentMinute = 0,
  events = [],
  score = { home: 0, away: 0 },
  highlightedPlayerId = null,
  playbackSpeed = 1,
  tactic = 'balanced',
}) {
  const homeMeta = TEAM_META[homeTeamName] || { color: '#1B458F', accent: '#FFFFFF', abbr: 'HOM' };
  const awayMeta = TEAM_META[awayTeamName] || { color: '#E30613', accent: '#FFFFFF', abbr: 'AWY' };

  const kits = useMemo(() => resolveKitColors(homeMeta, awayMeta), [homeMeta.color, awayMeta.color, homeMeta.accent, awayMeta.accent]);

  // Apply tactic to home team formation (player's team), away stays default
  const homeFormation = useMemo(() => applyTactic(FORMATIONS['4-3-3'], tactic), [tactic]);
  const awayFormation = mirrorPositions(FORMATIONS['4-3-3']);

  // All 22 base positions: 0–10 home, 11–21 away
  const basePositions = useMemo(() => {
    return [
      ...homeFormation.map(p => ({ ...p, team: 'home' })),
      ...awayFormation.map(p => ({ ...p, team: 'away' })),
    ];
  }, [homeFormation]);

  // Animated positions with subtle sway
  const animatedPositions = useMemo(() => {
    return basePositions.map((pos, i) =>
      getPlayerPosition(pos.x, pos.y, currentMinute, i, i < 11 ? 1 : 2)
    );
  }, [currentMinute, basePositions]);

  // Build the full passing sequence once per match (deterministic from events)
  const matchSeed = useMemo(() => {
    let s = 0;
    const combined = (homeTeamName || '') + (awayTeamName || '');
    for (let i = 0; i < combined.length; i++) {
      s = ((s << 5) - s + combined.charCodeAt(i)) | 0;
    }
    return Math.abs(s);
  }, [homeTeamName, awayTeamName]);

  const passingSequence = useMemo(() => {
    return buildPassingSequence(90, events, homeTeamId, matchSeed);
  }, [events.length, homeTeamId, matchSeed]);

  // ── Ball position: two-phase system ──
  // We track the ball's ACTUAL rendered position using state, not just a computed value.
  // When currentMinute changes, we immediately set the ball target to the new player's
  // BASE formation position (not animated), ensuring the ball heads to a stable point.
  //
  // The key insight: use the player's FORMATION position (stable, known in advance)
  // for ball targeting, and only use sway for visual player jitter.
  // This way the ball always arrives exactly where the player is.

  const getBallTarget = (minute) => {
    const entry = passingSequence[minute];
    if (!entry) return CENTER;

    if (entry.type === 'goal') {
      if (entry.isHome) {
        return { x: GOAL_RIGHT.x, y: 0.47 + (minute % 3) * 0.02 };
      } else {
        return { x: GOAL_LEFT.x, y: 0.47 + (minute % 3) * 0.02 };
      }
    }

    if (entry.type === 'kickoff') {
      return CENTER;
    }

    // Use the animated position of the TARGET player — since sway is now minimal,
    // this will be very close to the base position
    const pIdx = entry.playerIdx;
    if (pIdx >= 0 && pIdx < basePositions.length) {
      // Use the actual animated position so ball lands exactly on the player
      return getPlayerPosition(
        basePositions[pIdx].x,
        basePositions[pIdx].y,
        minute,
        pIdx,
        pIdx < 11 ? 1 : 2
      );
    }

    return CENTER;
  };

  // Current ball target position
  const ballPos = useMemo(() => getBallTarget(currentMinute), [currentMinute, passingSequence, basePositions]);

  // Which player currently has the ball?
  const ballHolderIdx = useMemo(() => {
    const entry = passingSequence[currentMinute];
    if (!entry || entry.type !== 'player') return -1;
    return entry.playerIdx;
  }, [currentMinute, passingSequence]);

  // Is it a goal right now?
  const isGoalMinute = useMemo(() => {
    const entry = passingSequence[currentMinute];
    return entry?.type === 'goal';
  }, [currentMinute, passingSequence]);

  // Goal scorer info for the cinematic overlay
  const goalScorerInfo = useMemo(() => {
    if (!isGoalMinute) return null;
    const goalEvent = events.find(e =>
      e.minute === currentMinute && (e.type === 'goal' || e.type === 'penalty' || e.type === 'own_goal')
    );
    if (!goalEvent) return null;
    const team = goalEvent.teamId === homeTeamId ? homeTeamName : awayTeamName;
    const player = goalEvent.playerName || goalEvent.scorerName || '';
    return player ? `⚽ ${player} · ${team} · ${currentMinute}'` : `⚽ ${team} · ${currentMinute}'`;
  }, [isGoalMinute, currentMinute, events, homeTeamId, homeTeamName, awayTeamName]);

  const W = 1050, H = 680;

  // Convert normalized coords to SVG coords
  const toSvg = (nx, ny) => ({
    sx: 30 + nx * (W - 60),
    sy: 30 + ny * (H - 60),
  });

  const ballSvg = toSvg(ballPos.x, ballPos.y);

  // Transition timing: ball should travel fast enough to arrive before next tick.
  // At 1x speed, ticks are 1000ms apart. Ball transition = 650ms gives 350ms rest at target.
  // At 2x speed, ticks are 500ms apart. Ball transition = 325ms.
  const ballTransitionMs = Math.max(200, Math.round(650 / playbackSpeed));
  const playerTransitionMs = Math.max(300, Math.round(800 / playbackSpeed));

  return (
    <div className="relative w-full" style={{ aspectRatio: '1050/680' }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full rounded-lg overflow-hidden">
        {/* Defs */}
        <defs>
          <linearGradient id="pitch-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a6b1a" />
            <stop offset="100%" stopColor="#145214" />
          </linearGradient>
          <pattern id="stripes" patternUnits="userSpaceOnUse" width="80" height="680">
            <rect width="40" height="680" fill="rgba(255,255,255,0.02)" />
          </pattern>
          <radialGradient id="ball-shadow">
            <stop offset="0%" stopColor="rgba(0,0,0,0.35)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <filter id="holder-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#FFD700" floodOpacity="0.6" />
          </filter>
          <filter id="goal-flash" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#FFFFFF" floodOpacity="0.9" />
          </filter>
        </defs>

        {/* Pitch */}
        <rect width={W} height={H} fill="url(#pitch-grad)" />
        <rect width={W} height={H} fill="url(#stripes)" />

        {/* Pitch markings */}
        <g stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none">
          <rect x="30" y="30" width={W - 60} height={H - 60} />
          <line x1={W / 2} y1="30" x2={W / 2} y2={H - 30} />
          <circle cx={W / 2} cy={H / 2} r="70" />
          <circle cx={W / 2} cy={H / 2} r="3" fill="rgba(255,255,255,0.5)" />

          {/* Left penalty area */}
          <rect x="30" y="168" width="130" height="344" />
          <rect x="30" y="250" width="50" height="180" />
          <circle cx="120" cy={H / 2} r="3" fill="rgba(255,255,255,0.5)" />
          <path d={`M 160 ${H / 2 - 65} A 70 70 0 0 1 160 ${H / 2 + 65}`} />
          <rect x="15" y="280" width="15" height="120" strokeWidth="3" stroke="rgba(255,255,255,0.7)" />

          {/* Right penalty area */}
          <rect x={W - 160} y="168" width="130" height="344" />
          <rect x={W - 80} y="250" width="50" height="180" />
          <circle cx={W - 120} cy={H / 2} r="3" fill="rgba(255,255,255,0.5)" />
          <path d={`M ${W - 160} ${H / 2 - 65} A 70 70 0 0 0 ${W - 160} ${H / 2 + 65}`} />
          <rect x={W - 30} y="280" width="15" height="120" strokeWidth="3" stroke="rgba(255,255,255,0.7)" />

          {/* Corners */}
          <path d="M 30 42 A 12 12 0 0 1 42 30" />
          <path d={`M ${W - 30} 42 A 12 12 0 0 0 ${W - 42} 30`} />
          <path d={`M 30 ${H - 42} A 12 12 0 0 0 42 ${H - 30}`} />
          <path d={`M ${W - 30} ${H - 42} A 12 12 0 0 1 ${W - 42} ${H - 30}`} />
        </g>

        {/* Goal nets */}
        <rect x="10" y="275" width="20" height="130" rx="2" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <rect x={W - 30} y="275" width="20" height="130" rx="2" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <g stroke="rgba(255,255,255,0.06)" strokeWidth="0.5">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <React.Fragment key={`net-${i}`}>
              <line x1="10" y1={280 + i * 22} x2="30" y2={280 + i * 22} />
              <line x1={W - 30} y1={280 + i * 22} x2={W - 10} y2={280 + i * 22} />
              <line x1={12 + i * 3} y1="275" x2={12 + i * 3} y2="405" />
              <line x1={W - 28 + i * 3} y1="275" x2={W - 28 + i * 3} y2="405" />
            </React.Fragment>
          ))}
        </g>

        {/* Home team players (indices 0–10) */}
        {homeFormation.map((fPos, i) => {
          const anim = animatedPositions[i];
          const { sx, sy } = toSvg(anim.x, anim.y);
          const player = homeRoster[i] || { id: `h${i}`, name: `Player ${i + 1}` };
          const isHolder = ballHolderIdx === i;
          const isHighlighted = highlightedPlayerId === player.id;

          return (
            <g
              key={`home-${i}`}
              style={{ transition: `transform ${playerTransitionMs}ms ease-in-out` }}
              transform={`translate(${sx - 11}, ${sy - 12})`}
              filter={isHolder ? 'url(#holder-glow)' : undefined}
            >
              <JerseyIcon
                color={kits.home.color}
                accent={kits.home.accent}
                number={i + 1}
                isGK={fPos.pos === 'GK'}
                highlighted={isHighlighted || isHolder}
                size={22}
              />
            </g>
          );
        })}

        {/* Away team players (indices 11–21) */}
        {awayFormation.map((fPos, i) => {
          const anim = animatedPositions[i + 11];
          const { sx, sy } = toSvg(anim.x, anim.y);
          const player = awayRoster[i] || { id: `a${i}`, name: `Player ${i + 1}` };
          const isHolder = ballHolderIdx === (i + 11);
          const isHighlighted = highlightedPlayerId === player.id;

          return (
            <g
              key={`away-${i}`}
              style={{ transition: `transform ${playerTransitionMs}ms ease-in-out` }}
              transform={`translate(${sx - 11}, ${sy - 12})`}
              filter={isHolder ? 'url(#holder-glow)' : undefined}
            >
              <JerseyIcon
                color={kits.away.color}
                accent={kits.away.accent}
                number={i + 1}
                isGK={fPos.pos === 'GK'}
                highlighted={isHighlighted || isHolder}
                size={22}
              />
            </g>
          );
        })}

        {/* Ball shadow */}
        <ellipse
          cx={ballSvg.sx}
          cy={ballSvg.sy + 5}
          rx="9" ry="3.5"
          fill="url(#ball-shadow)"
          style={{ transition: `cx ${ballTransitionMs}ms linear, cy ${ballTransitionMs}ms linear` }}
        />

        {/* Ball — uses linear easing so it travels at constant speed like a real pass */}
        <g
          style={{ transition: `transform ${ballTransitionMs}ms linear` }}
          transform={`translate(${ballSvg.sx}, ${ballSvg.sy})`}
          filter={isGoalMinute ? 'url(#goal-flash)' : undefined}
        >
          <circle r="7" fill="white" stroke="#555" strokeWidth="0.8" />
          <circle r="3" fill="none" stroke="#333" strokeWidth="0.6" />
          <line x1="-2" y1="-3" x2="0" y2="-6.5" stroke="#333" strokeWidth="0.4" />
          <line x1="2" y1="-3" x2="4" y2="-5.5" stroke="#333" strokeWidth="0.4" />
          <line x1="3" y1="1" x2="6.5" y2="2" stroke="#333" strokeWidth="0.4" />
          <line x1="-3" y1="1" x2="-6.5" y2="2" stroke="#333" strokeWidth="0.4" />
          <line x1="0" y1="3" x2="0" y2="6.5" stroke="#333" strokeWidth="0.4" />
        </g>

        {/* ══════════ GOAL CINEMATIC ══════════ */}
        {isGoalMinute && (
          <>
            {/* Dark overlay */}
            <rect width={W} height={H} fill="black">
              <animate attributeName="fill-opacity" values="0;0.65;0.5" dur="0.6s" fill="freeze" />
            </rect>

            {/* Radial burst / stadium lights */}
            <circle cx={W / 2} cy={H / 2} r="0" fill="none" stroke="#FFD700" strokeWidth="3" opacity="0.6">
              <animate attributeName="r" from="0" to="500" dur="1.2s" fill="freeze" />
              <animate attributeName="opacity" values="0.6;0" dur="1.2s" fill="freeze" />
            </circle>
            <circle cx={W / 2} cy={H / 2} r="0" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.4">
              <animate attributeName="r" from="0" to="400" dur="0.9s" begin="0.15s" fill="freeze" />
              <animate attributeName="opacity" values="0.4;0" dur="0.9s" begin="0.15s" fill="freeze" />
            </circle>

            {/* Firework bursts (random positions) */}
            {[
              { cx: 180, cy: 120, delay: '0.2s', color: '#FF4444' },
              { cx: 850, cy: 150, delay: '0.5s', color: '#44FF44' },
              { cx: 300, cy: 550, delay: '0.3s', color: '#4488FF' },
              { cx: 750, cy: 500, delay: '0.7s', color: '#FFAA00' },
              { cx: 500, cy: 100, delay: '0.4s', color: '#FF44FF' },
              { cx: 150, cy: 350, delay: '0.6s', color: '#44FFFF' },
              { cx: 900, cy: 380, delay: '0.1s', color: '#FFD700' },
            ].map((fw, i) => (
              <g key={`fw-${i}`}>
                {/* Starburst lines */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                  <line
                    key={angle}
                    x1={fw.cx} y1={fw.cy}
                    x2={fw.cx + Math.cos(angle * Math.PI / 180) * 3}
                    y2={fw.cy + Math.sin(angle * Math.PI / 180) * 3}
                    stroke={fw.color} strokeWidth="2" strokeLinecap="round"
                  >
                    <animate attributeName="x2" to={fw.cx + Math.cos(angle * Math.PI / 180) * 45} dur="0.6s" begin={fw.delay} fill="freeze" />
                    <animate attributeName="y2" to={fw.cy + Math.sin(angle * Math.PI / 180) * 45} dur="0.6s" begin={fw.delay} fill="freeze" />
                    <animate attributeName="opacity" values="0;1;0.8;0" dur="0.8s" begin={fw.delay} fill="freeze" />
                  </line>
                ))}
                {/* Center flash */}
                <circle cx={fw.cx} cy={fw.cy} r="2" fill={fw.color}>
                  <animate attributeName="r" from="2" to="12" dur="0.4s" begin={fw.delay} fill="freeze" />
                  <animate attributeName="opacity" values="0;1;0" dur="0.6s" begin={fw.delay} fill="freeze" />
                </circle>
              </g>
            ))}

            {/* Sparkle particles */}
            {Array.from({ length: 20 }, (_, i) => {
              const angle = (i / 20) * Math.PI * 2;
              const speed = 80 + (i % 5) * 30;
              const dx = Math.cos(angle) * speed;
              const dy = Math.sin(angle) * speed;
              return (
                <circle key={`spark-${i}`} cx={W / 2} cy={H / 2} r="2" fill="#FFD700">
                  <animate attributeName="cx" to={W / 2 + dx} dur="1s" begin="0.1s" fill="freeze" />
                  <animate attributeName="cy" to={H / 2 + dy} dur="1s" begin="0.1s" fill="freeze" />
                  <animate attributeName="r" values="2;3;1;0" dur="1s" begin="0.1s" fill="freeze" />
                  <animate attributeName="opacity" values="1;1;0.5;0" dur="1s" begin="0.1s" fill="freeze" />
                </circle>
              );
            })}

            {/* Main GOAL text — large, dramatic */}
            <text x={W / 2} y={H / 2 - 15} textAnchor="middle" dominantBaseline="central"
              fill="#FFD700" fontSize="72" fontFamily="ui-sans-serif, system-ui" fontWeight="900"
              letterSpacing="12" stroke="#000" strokeWidth="3" paintOrder="stroke"
            >
              <animate attributeName="font-size" from="20" to="72" dur="0.4s" fill="freeze" />
              GOAL!
            </text>

            {/* Scorer name (show which team scored) */}
            {goalScorerInfo && (
              <text x={W / 2} y={H / 2 + 30} textAnchor="middle" dominantBaseline="central"
                fill="white" fontSize="16" fontFamily="ui-sans-serif, system-ui" fontWeight="700"
                opacity="0"
              >
                <animate attributeName="opacity" values="0;1" dur="0.3s" begin="0.5s" fill="freeze" />
                {goalScorerInfo}
              </text>
            )}

            {/* Pulsing border */}
            <rect x="2" y="2" width={W - 4} height={H - 4} rx="8" fill="none" stroke="#FFD700" strokeWidth="4">
              <animate attributeName="stroke-opacity" values="0;1;0.5;1;0.5;1" dur="1.5s" fill="freeze" />
            </rect>

            {/* Screen flash */}
            <rect width={W} height={H} fill="white">
              <animate attributeName="fill-opacity" values="0.4;0;0" dur="0.5s" fill="freeze" />
            </rect>
          </>
        )}
      </svg>

      {/* Scoreboard overlay */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/85 px-5 py-2 rounded-lg border border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: kits.home.color, border: `1px solid ${kits.home.accent}` }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: kits.home.color }}>{homeMeta.abbr}</span>
        </div>
        <span className="text-white font-mono text-lg font-black">{score.home} - {score.away}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: kits.away.color }}>{awayMeta.abbr}</span>
          <div className="w-3 h-4 rounded-sm" style={{ backgroundColor: kits.away.color, border: `1px solid ${kits.away.accent}` }} />
        </div>
        <span className="text-[10px] text-white/50 ml-2 font-mono">{currentMinute}'</span>
      </div>

      {/* Kit legend */}
      <div className="absolute bottom-2 left-3 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded text-[8px] text-white/50">
        <div className="w-2.5 h-3 rounded-sm" style={{ backgroundColor: kits.home.color }} />
        <span>{homeTeamName}</span>
      </div>
      <div className="absolute bottom-2 right-3 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded text-[8px] text-white/50">
        <div className="w-2.5 h-3 rounded-sm" style={{ backgroundColor: kits.away.color }} />
        <span>{awayTeamName}</span>
      </div>
    </div>
  );
}
