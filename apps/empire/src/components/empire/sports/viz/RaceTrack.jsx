import React, { useRef, useEffect, useMemo, useState } from 'react';
import { TEAM_META } from '../../../../data/teamMeta';
import { getCircuitData } from '../../../../data/f1CircuitPaths';

/**
 * RaceTrack — Premium F1 race visualization with 3D isometric perspective.
 * Inspired by F1 Manager with futuristic neon/holographic aesthetic.
 * Features: 3D CSS perspective, per-circuit environments, glowing track edges,
 * colored car dots with labels, glassmorphism HUD, animated elements,
 * minimap, sector markers, DRS zones, pit lane, start/finish line.
 */

function offsetPoint(path, dist, totalLen, offset) {
  const pt = path.getPointAtLength(dist);
  const ptA = path.getPointAtLength(Math.min(dist + 3, totalLen));
  const dx = ptA.x - pt.x;
  const dy = ptA.y - pt.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    x: pt.x + (-dy / len) * offset,
    y: pt.y + (dx / len) * offset,
  };
}

function getTrackConditions(name) {
  let h = 0;
  for (const c of name) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  const abs = Math.abs(h);
  const temp = 18 + (abs % 20);
  const trackTemp = temp + 8 + (abs % 7);
  const rubberLevels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
  const gripLevels = ['Low', 'Normal', 'High', 'Very High'];
  return {
    temp,
    trackTemp,
    rubber: rubberLevels[abs % rubberLevels.length],
    grip: gripLevels[abs % gripLevels.length],
    wind: 5 + (abs % 25),
    humidity: 20 + (abs % 55),
  };
}

// Tire compound colors (deterministic per driver)
const TIRE_COMPOUNDS = ['S', 'M', 'H', 'I', 'W'];
const TIRE_COLORS = { S: '#EF4444', M: '#EAB308', H: '#E5E7EB', I: '#22D3EE', W: '#3B82F6' };

function getTireForDriver(driverId, currentLap) {
  let h = 0;
  for (const c of (driverId || '')) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  const abs = Math.abs(h);
  if (currentLap < 15) return TIRE_COMPOUNDS[abs % 3];
  if (currentLap < 35) return TIRE_COMPOUNDS[(abs + 1) % 3];
  return TIRE_COMPOUNDS[(abs + 2) % 3];
}

// Default fallback environment (original dark space theme)
const DEFAULT_ENVIRONMENT = {
  theme: 'space',
  skyGradient: ['#050810', '#080d18', '#060a14'],
  groundColor: '#0a0f1c',
  trackSurround: '#12151d',
  accentGlow: '#00e5ff',
  timeOfDay: 'day',
  features: [],
};

/** Render ambient environment features as SVG elements */
function EnvironmentFeatures({ features, groundColor, accentGlow }) {
  if (!features || features.length === 0) return null;

  const elements = [];

  if (features.includes('water')) {
    elements.push(
      <ellipse key="water-1" cx="15%" cy="72%" rx="12%" ry="5%" fill="#1a5276" fillOpacity="0.15"
        stroke="#2980b9" strokeWidth="0.5" strokeOpacity="0.08" />,
      <ellipse key="water-2" cx="82%" cy="78%" rx="8%" ry="3.5%" fill="#1a5276" fillOpacity="0.12"
        stroke="#2980b9" strokeWidth="0.3" strokeOpacity="0.06" />,
    );
  }

  if (features.includes('buildings')) {
    const bldgs = [
      { x: '5%', y: '50%', w: '3%', h: '8%' },
      { x: '9%', y: '48%', w: '2.5%', h: '10%' },
      { x: '88%', y: '49%', w: '3.5%', h: '9%' },
      { x: '92%', y: '51%', w: '2%', h: '7%' },
      { x: '14%', y: '52%', w: '2%', h: '6%' },
    ];
    bldgs.forEach((b, i) => {
      elements.push(
        <rect key={`bldg-${i}`} x={b.x} y={b.y} width={b.w} height={b.h}
          fill="#0a0e1a" fillOpacity="0.25" rx="1" />,
      );
      // Lit windows
      for (let w = 0; w < 3; w++) {
        elements.push(
          <circle key={`bldg-win-${i}-${w}`}
            cx={`${parseFloat(b.x) + parseFloat(b.w) * 0.5}%`}
            cy={`${parseFloat(b.y) + parseFloat(b.h) * (0.2 + w * 0.3)}%`}
            r="0.3%" fill="#f0c040" fillOpacity="0.15" />
        );
      }
    });
  }

  if (features.includes('skyscrapers')) {
    const towers = [
      { x: '3%', y: '38%', w: '2.5%', h: '20%' },
      { x: '7%', y: '42%', w: '2%', h: '16%' },
      { x: '90%', y: '40%', w: '2.5%', h: '18%' },
      { x: '94%', y: '44%', w: '1.8%', h: '14%' },
      { x: '12%', y: '45%', w: '1.5%', h: '13%' },
      { x: '85%', y: '43%', w: '2%', h: '15%' },
    ];
    towers.forEach((t, i) => {
      elements.push(
        <rect key={`tower-${i}`} x={t.x} y={t.y} width={t.w} height={t.h}
          fill="#080c18" fillOpacity="0.3" rx="0.5" />,
      );
      // Neon glow strip
      elements.push(
        <line key={`tower-neon-${i}`}
          x1={`${parseFloat(t.x) + parseFloat(t.w) * 0.5}%`} y1={t.y}
          x2={`${parseFloat(t.x) + parseFloat(t.w) * 0.5}%`} y2={`${parseFloat(t.y) + parseFloat(t.h)}%`}
          stroke={accentGlow} strokeWidth="0.3" strokeOpacity="0.08" />,
      );
      // Windows
      for (let w = 0; w < 5; w++) {
        elements.push(
          <circle key={`tower-win-${i}-${w}`}
            cx={`${parseFloat(t.x) + parseFloat(t.w) * (0.3 + (w % 2) * 0.4)}%`}
            cy={`${parseFloat(t.y) + parseFloat(t.h) * (0.1 + w * 0.18)}%`}
            r="0.25%" fill={accentGlow} fillOpacity="0.12" />
        );
      }
    });
  }

  if (features.includes('trees')) {
    const positions = [
      [8, 68], [15, 75], [22, 70], [78, 72], [85, 68], [92, 74],
      [30, 76], [65, 71], [45, 80], [55, 77],
    ];
    positions.forEach(([cx, cy], i) => {
      elements.push(
        <g key={`tree-${i}`}>
          <circle cx={`${cx}%`} cy={`${cy}%`} r="1.5%" fill="#1a5c1a" fillOpacity="0.18" />
          <circle cx={`${cx - 0.5}%`} cy={`${cy - 1}%`} r="1.2%" fill="#1e6b1e" fillOpacity="0.14" />
          <circle cx={`${cx + 0.5}%`} cy={`${cy - 0.5}%`} r="1%" fill="#22802a" fillOpacity="0.12" />
        </g>
      );
    });
  }

  if (features.includes('palms')) {
    const positions = [[10, 66], [25, 73], [75, 69], [90, 72], [50, 78]];
    positions.forEach(([cx, cy], i) => {
      elements.push(
        <g key={`palm-${i}`}>
          <line x1={`${cx}%`} y1={`${cy + 3}%`} x2={`${cx}%`} y2={`${cy}%`}
            stroke="#4a3520" strokeWidth="0.4" strokeOpacity="0.2" />
          <ellipse cx={`${cx}%`} cy={`${cy - 0.5}%`} rx="2%" ry="1%"
            fill="#228B22" fillOpacity="0.15" />
          <ellipse cx={`${cx - 1}%`} cy={`${cy}%`} rx="1.5%" ry="0.7%"
            fill="#2d9e2d" fillOpacity="0.12" transform={`rotate(-25, ${cx - 1}, ${cy})`} />
        </g>
      );
    });
  }

  if (features.includes('sand')) {
    elements.push(
      <ellipse key="dune-1" cx="20%" cy="75%" rx="18%" ry="4%" fill="#c4956a" fillOpacity="0.08" />,
      <ellipse key="dune-2" cx="70%" cy="72%" rx="14%" ry="3%" fill="#d4a574" fillOpacity="0.06" />,
      <ellipse key="dune-3" cx="50%" cy="80%" rx="20%" ry="5%" fill="#b8895a" fillOpacity="0.07" />,
    );
  }

  if (features.includes('mountains')) {
    elements.push(
      <polygon key="mtn-1" points="0%,55% 12%,35% 24%,55%" fill="#1a1a2e" fillOpacity="0.2" />,
      <polygon key="mtn-2" points="18%,55% 28%,38% 38%,55%" fill="#151528" fillOpacity="0.18" />,
      <polygon key="mtn-3" points="70%,55% 82%,32% 94%,55%" fill="#1a1a2e" fillOpacity="0.2" />,
      <polygon key="mtn-4" points="80%,55% 90%,40% 100%,55%" fill="#12122a" fillOpacity="0.15" />,
    );
  }

  if (features.includes('grandstands')) {
    const stands = [
      { x: '8%', y: '58%', w: '6%', h: '3%' },
      { x: '86%', y: '60%', w: '7%', h: '3%' },
      { x: '40%', y: '82%', w: '8%', h: '2.5%' },
    ];
    stands.forEach((s, i) => {
      elements.push(
        <g key={`stand-${i}`}>
          <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="#1a1a2e" fillOpacity="0.2" rx="0.5" />
          {/* Horizontal stripes */}
          {[0.25, 0.5, 0.75].map((pct, j) => (
            <line key={`stand-stripe-${i}-${j}`}
              x1={s.x} y1={`${parseFloat(s.y) + parseFloat(s.h) * pct}%`}
              x2={`${parseFloat(s.x) + parseFloat(s.w)}%`} y2={`${parseFloat(s.y) + parseFloat(s.h) * pct}%`}
              stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />
          ))}
        </g>
      );
    });
  }

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ pointerEvents: 'none' }}>
      {elements}
    </svg>
  );
}

/** Night mode overlay: vignette + trackside lights */
function NightOverlay({ timeOfDay, accentGlow }) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'twilight';
  if (!isNight) return null;

  const lights = [];
  for (let i = 0; i < 30; i++) {
    const x = 5 + (i * 3.1 + 7) % 90;
    const y = 55 + (i * 2.3 + 11) % 40;
    lights.push(
      <circle key={`light-${i}`} cx={`${x}%`} cy={`${y}%`} r="0.3%"
        fill={accentGlow} fillOpacity={0.06 + (i % 3) * 0.04} />
    );
  }

  return (
    <>
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%)',
      }} />
      {/* Trackside lights */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {lights}
      </svg>
    </>
  );
}

export default function RaceTrack({
  circuitName = 'Bahrain Grand Prix',
  drivers = [],
  currentLap = 0,
  totalLaps = 57,
  events = [],
  highlightedDriverId = null,
  fastestLap = null,
}) {
  const pathRef = useRef(null);
  const svgContainerRef = useRef(null);
  const [pathLength, setPathLength] = useState(0);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const circuit = useMemo(() => getCircuitData(circuitName), [circuitName]);
  const conditions = useMemo(() => getTrackConditions(circuitName), [circuitName]);

  // Resolve environment with fallback
  const env = useMemo(() => circuit.environment || DEFAULT_ENVIRONMENT, [circuit]);
  const accentGlow = env.accentGlow || '#00e5ff';
  const isNightMode = env.timeOfDay === 'night' || env.timeOfDay === 'twilight';
  const nightGlowMultiplier = isNightMode ? 2.5 : 1;

  useEffect(() => {
    if (pathRef.current) setPathLength(pathRef.current.getTotalLength());
  }, [circuit.path]);

  // Reset zoom/pan when circuit changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [circuitName]);

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(5, prev * delta)));
  };

  // Drag to pan
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const container = svgContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scaleX = 500 / rect.width;
    const scaleY = 500 / rect.height;
    const dx = (e.clientX - dragStart.current.x) * scaleX / zoom;
    const dy = (e.clientY - dragStart.current.y) * scaleY / zoom;
    setPan({ x: dragStart.current.panX - dx, y: dragStart.current.panY - dy });
  };
  const handleMouseUp = () => setIsDragging(false);

  // Compute viewBox from zoom + pan
  const VB = 500;
  const vbSize = VB / zoom;
  const vbX = (VB - vbSize) / 2 + pan.x;
  const vbY = (VB - vbSize) / 2 + pan.y;
  const viewBox = `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbSize.toFixed(1)} ${vbSize.toFixed(1)}`;

  const activeEvents = useMemo(() => {
    return events.filter(e =>
      (e.type === 'overtake' || e.type === 'pit_stop') &&
      e.lap >= currentLap - 2 && e.lap <= currentLap
    );
  }, [events, currentLap]);

  const pitting = useMemo(() => {
    const set = new Set();
    for (const e of activeEvents) {
      if (e.type === 'pit_stop' && e.lap >= currentLap - 1) set.add(e.driverId);
    }
    return set;
  }, [activeEvents, currentLap]);

  const overtaking = useMemo(() => {
    const map = new Map();
    for (const e of activeEvents) {
      if (e.type === 'overtake' && e.lap === currentLap) map.set(e.driverId, e);
    }
    return map;
  }, [activeEvents, currentLap]);

  const carPositions = useMemo(() => {
    if (!pathLength || !pathRef.current) return [];
    const path = pathRef.current;
    const totalLen = pathLength;

    return drivers.map((driver) => {
      if (driver.dnf) return { ...driver, x: -200, y: -200, angle: 0, isPitting: false, isOvertaking: false };

      const leaderProgress = totalLaps > 0 ? (currentLap / totalLaps) : 0;
      let gapSeconds = 0;
      if (typeof driver.gap === 'string' && driver.gap !== 'LEADER') {
        const parsed = parseFloat(driver.gap.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed)) gapSeconds = parsed;
      }

      const gapFraction = Math.min(gapSeconds / 90, 0.45);
      const rawProgress = (leaderProgress - gapFraction + 10) % 1;
      const dist = rawProgress * totalLen;
      const pt = path.getPointAtLength(dist);
      const ptAhead = path.getPointAtLength((dist + 4) % totalLen);
      const angle = Math.atan2(ptAhead.y - pt.y, ptAhead.x - pt.x) * (180 / Math.PI);
      const isPitting = pitting.has(driver.driverId);
      const isOvertaking = overtaking.has(driver.driverId);

      let finalX = pt.x, finalY = pt.y;
      if (isPitting) {
        const off = offsetPoint(path, dist, totalLen, 22);
        finalX = off.x;
        finalY = off.y;
      }
      return { ...driver, x: finalX, y: finalY, angle, isPitting, isOvertaking };
    });
  }, [drivers, currentLap, totalLaps, pathLength, pitting, overtaking]);

  const drsSegments = useMemo(() => {
    if (!pathLength || !pathRef.current) return [];
    const path = pathRef.current;
    const segs = [];
    for (const zone of circuit.drsZones) {
      const points = [];
      const startDist = zone.start * pathLength;
      const endDist = zone.end * pathLength;
      const steps = 40;
      for (let s = 0; s <= steps; s++) {
        const d = startDist + (endDist - startDist) * (s / steps);
        const pt = path.getPointAtLength(d);
        points.push(`${s === 0 ? 'M' : 'L'}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`);
      }
      segs.push(points.join(' '));
    }
    return segs;
  }, [pathLength, circuit.drsZones]);

  const startLine = useMemo(() => {
    if (!pathLength || !pathRef.current) return null;
    const pt = pathRef.current.getPointAtLength(0);
    const ptA = pathRef.current.getPointAtLength(4);
    const dx = ptA.x - pt.x;
    const dy = ptA.y - pt.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;
    return {
      x1: pt.x + perpX * 24, y1: pt.y + perpY * 24,
      x2: pt.x - perpX * 24, y2: pt.y - perpY * 24,
    };
  }, [pathLength]);

  const pitLanePath = useMemo(() => {
    if (!pathLength || !pathRef.current) return '';
    const path = pathRef.current;
    const startDist = circuit.pitEntry * pathLength;
    const endDist = circuit.pitExit * pathLength;
    const points = [];
    const steps = 25;
    for (let s = 0; s <= steps; s++) {
      let d;
      if (endDist > startDist) {
        d = startDist + (endDist - startDist) * (s / steps);
      } else {
        const totalPitDist = (pathLength - startDist) + endDist;
        d = (startDist + totalPitDist * (s / steps)) % pathLength;
      }
      const off = offsetPoint(path, d, pathLength, 24);
      points.push(`${s === 0 ? 'M' : 'L'}${off.x.toFixed(1)} ${off.y.toFixed(1)}`);
    }
    return points.join(' ');
  }, [pathLength, circuit.pitEntry, circuit.pitExit]);

  // Sector markers (3 sectors at 0%, 33%, 66%)
  const sectorMarkers = useMemo(() => {
    if (!pathLength || !pathRef.current) return [];
    const path = pathRef.current;
    return [0.33, 0.66].map((pct, i) => {
      const dist = pct * pathLength;
      const pt = path.getPointAtLength(dist);
      const ptA = path.getPointAtLength(dist + 3);
      const dx = ptA.x - pt.x;
      const dy = ptA.y - pt.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const perpX = -dy / len;
      const perpY = dx / len;
      return {
        x1: pt.x + perpX * 20, y1: pt.y + perpY * 20,
        x2: pt.x - perpX * 20, y2: pt.y - perpY * 20,
        cx: pt.x + perpX * 26, cy: pt.y + perpY * 26,
        label: `S${i + 2}`,
      };
    });
  }, [pathLength]);

  const sortedDrivers = useMemo(() => [...drivers].filter(d => !d.dnf).sort((a, b) => a.position - b.position), [drivers]);
  const dnfDrivers = useMemo(() => drivers.filter(d => d.dnf), [drivers]);

  const racePct = totalLaps > 0 ? (currentLap / totalLaps) * 100 : 0;

  const rubberColor = { 'Very Low': '#EF4444', 'Low': '#F59E0B', 'Medium': '#EAB308', 'High': '#22C55E', 'Very High': '#10B981' }[conditions.rubber] || '#888';
  const gripColor = { 'Low': '#F59E0B', 'Normal': '#E5E7EB', 'High': '#22C55E', 'Very High': '#10B981' }[conditions.grip] || '#888';

  // Build sky gradient background
  const sky = env.skyGradient || DEFAULT_ENVIRONMENT.skyGradient;
  const skyBackground = `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 40%, ${sky[2]} 100%)`;

  // Track surface tint: blend groundColor into the track surface gradient
  const groundTint = env.groundColor || '#1a1e2c';

  // Neon glow color from environment (replace hardcoded #00e5ff)
  const neonGlowRgba = (opacity) => {
    // Parse hex to rgba
    const hex = accentGlow.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  };

  return (
    <div className="relative w-full flex" style={{ aspectRatio: '1100/540' }}>

      {/* =================== LEADERBOARD (left panel) =================== */}
      <div className="w-60 flex-shrink-0 flex flex-col overflow-hidden rounded-l-xl" style={{
        background: 'linear-gradient(180deg, #080c16 0%, #0a0f1c 100%)',
        borderRight: `1px solid ${neonGlowRgba(0.08)}`,
      }}>
        {/* F1 Header */}
        <div className="px-3 py-2.5 flex items-center justify-between" style={{
          background: 'linear-gradient(90deg, rgba(220,38,38,0.15) 0%, rgba(220,38,38,0.03) 100%)',
          borderBottom: '1px solid rgba(220,38,38,0.2)',
        }}>
          <div className="flex items-center gap-2">
            <div className="bg-red-600 text-white font-black text-[9px] italic px-1.5 py-0.5 rounded-sm tracking-tight leading-none">F1</div>
            <span className="text-white/90 font-black text-[10px] uppercase tracking-[0.15em]">Race</span>
          </div>
          <div className="text-right">
            <div className="text-[7px] text-white/30 uppercase tracking-wider">Lap</div>
            <div className="text-white font-mono text-[11px] font-black leading-none">
              {currentLap}<span className="text-white/25">/{totalLaps}</span>
            </div>
          </div>
        </div>

        {/* Race progress mini-bar */}
        <div className="h-[2px] w-full bg-white/[0.04]">
          <div className="h-full transition-all duration-700" style={{
            width: `${racePct}%`,
            background: 'linear-gradient(90deg, #DC2626 0%, #F59E0B 50%, #22C55E 100%)',
          }} />
        </div>

        {/* Column header */}
        <div className="flex items-center px-2.5 py-1.5 text-[6.5px] text-white/20 uppercase font-mono tracking-[0.12em]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span className="w-5 text-center">P</span>
          <span className="w-[3px] ml-0.5" />
          <span className="flex-1 ml-1.5">Driver</span>
          <span className="w-4 text-center">T</span>
          <span className="w-[52px] text-right">Gap</span>
        </div>

        {/* Driver rows */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {sortedDrivers.map((driver) => {
            const meta = TEAM_META[driver.teamName] || { color: '#666', accent: '#FFF' };
            const isFastest = fastestLap?.driverId === driver.driverId;
            const isHL = highlightedDriverId === driver.driverId;
            const abbr = driver.driverName?.split(' ').pop()?.slice(0, 3).toUpperCase() || '???';
            const tire = getTireForDriver(driver.driverId, currentLap);
            const tireCol = TIRE_COLORS[tire];

            const posColor = driver.position === 1 ? '#FFD700' : driver.position === 2 ? '#C0C0C0' : driver.position === 3 ? '#CD7F32' : driver.position <= 10 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.25)';

            return (
              <div
                key={driver.driverId}
                className="flex items-center px-2.5 py-[5px] transition-all duration-200"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.025)',
                  background: isHL ? `${neonGlowRgba(0.08)}` : 'transparent',
                  borderLeft: isHL ? `2px solid ${neonGlowRgba(0.5)}` : '2px solid transparent',
                }}
              >
                <span className="w-5 text-center font-black text-[10px] tabular-nums" style={{ color: posColor }}>
                  {driver.position}
                </span>
                <div className="w-[3px] h-[14px] rounded-full ml-0.5 flex-shrink-0" style={{
                  backgroundColor: meta.color,
                  boxShadow: `0 0 4px ${meta.color}40`,
                }} />
                <div className="flex-1 ml-1.5 min-w-0 flex items-center gap-1">
                  <span className="text-[9px] font-bold text-white/85 truncate font-mono tracking-wide">{abbr}</span>
                  {isFastest && <span className="text-[7px] text-purple-400">&#9201;</span>}
                </div>
                {/* Tire compound */}
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{
                  border: `1.5px solid ${tireCol}`,
                  backgroundColor: `${tireCol}15`,
                }}>
                  <span className="text-[6px] font-black" style={{ color: tireCol }}>{tire}</span>
                </div>
                {/* Gap */}
                <span className="w-[52px] text-right text-[8px] font-mono tabular-nums ml-1" style={{
                  color: driver.position === 1 ? accentGlow : 'rgba(255,255,255,0.3)',
                }}>
                  {driver.position === 1 ? 'INTERVAL' : driver.gap || '\u2014'}
                </span>
              </div>
            );
          })}
          {dnfDrivers.map(driver => (
            <div key={driver.driverId} className="flex items-center px-2.5 py-[5px] opacity-30" style={{ borderBottom: '1px solid rgba(255,255,255,0.025)' }}>
              <span className="w-5 text-center text-[7px] text-red-500 font-bold">DNF</span>
              <div className="w-[3px] h-[14px] rounded-full ml-0.5 flex-shrink-0 bg-red-900/50" />
              <span className="text-[8px] text-white/30 ml-1.5 font-mono">{driver.driverName?.split(' ').pop()?.slice(0, 3).toUpperCase()}</span>
            </div>
          ))}
        </div>

        {/* Fastest lap footer */}
        {fastestLap && (
          <div className="px-2.5 py-2 flex items-center gap-1.5" style={{
            background: 'linear-gradient(90deg, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0.03) 100%)',
            borderTop: '1px solid rgba(168,85,247,0.2)',
          }}>
            <span className="text-purple-400 text-[8px]">&#9201;</span>
            <span className="text-[7px] text-purple-300 font-mono font-bold truncate">{fastestLap.driverName}</span>
            <span className="text-[7px] text-purple-400/60 font-mono ml-auto">{fastestLap.time}</span>
          </div>
        )}
      </div>

      {/* =================== TRACK VIEW (main area) =================== */}
      <div className="flex-1 relative overflow-hidden rounded-r-xl" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>

        {/* ── Environment background layers (NOT transformed) ── */}
        <div className="absolute inset-0" style={{ background: skyBackground }}>
          {/* Ground plane (bottom 55%) with perspective grid */}
          <div className="absolute left-0 right-0 bottom-0" style={{
            height: '55%',
            background: `linear-gradient(180deg, ${env.trackSurround || env.groundColor} 0%, ${env.groundColor} 100%)`,
          }}>
            {/* Subtle perspective grid on ground */}
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: `
                linear-gradient(0deg, rgba(255,255,255,0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
              `,
              backgroundSize: '40px 30px',
              transform: 'perspective(400px) rotateX(30deg)',
              transformOrigin: 'center top',
            }} />
          </div>

          {/* Ambient environment features */}
          <EnvironmentFeatures features={env.features} groundColor={env.groundColor} accentGlow={accentGlow} />
        </div>

        {/* Night mode overlays */}
        <NightOverlay timeOfDay={env.timeOfDay} accentGlow={accentGlow} />

        {/* ── 3D Perspective Container ── */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '800px' }}>
          <div style={{
            transform: 'rotateX(55deg) rotateZ(-15deg)',
            transformStyle: 'preserve-3d',
            width: '85%',
            height: '85%',
          }}>
            <svg
              ref={svgContainerRef}
              viewBox={viewBox}
              className="w-full h-full"
              style={{ display: 'block' }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <defs>
                {/* Checkered pattern */}
                <pattern id="checkered" width="6" height="6" patternUnits="userSpaceOnUse">
                  <rect width="3" height="3" fill="white" />
                  <rect x="3" y="3" width="3" height="3" fill="white" />
                  <rect x="3" width="3" height="3" fill="#1a1a1a" />
                  <rect y="3" width="3" height="3" fill="#1a1a1a" />
                </pattern>

                {/* Track edge neon glow — tinted by environment */}
                <filter id="neon-edge" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Car highlight glow */}
                <filter id="car-glow" x="-200%" y="-200%" width="500%" height="500%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>

                {/* Pit glow */}
                <filter id="pit-glow" x="-200%" y="-200%" width="500%" height="500%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#FF6600" floodOpacity="0.6" />
                </filter>

                {/* DRS zone glow */}
                <filter id="drs-glow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#22C55E" floodOpacity="0.3" />
                </filter>

                {/* Track surface gradient — tinted with environment ground color */}
                <linearGradient id="track-surface" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={isNightMode ? '#101420' : '#1c2030'} />
                  <stop offset="50%" stopColor={isNightMode ? '#0e1220' : '#1a1e2c'} />
                  <stop offset="100%" stopColor={isNightMode ? '#0c1018' : '#181c28'} />
                </linearGradient>

                {/* Ground tint overlay for embedding track in terrain */}
                <linearGradient id="track-ground-tint" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={groundTint} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={groundTint} stopOpacity="0.03" />
                </linearGradient>

                {/* Night reflection highlight */}
                {isNightMode && (
                  <linearGradient id="night-reflection" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="white" stopOpacity="0" />
                    <stop offset="45%" stopColor="white" stopOpacity="0.03" />
                    <stop offset="55%" stopColor="white" stopOpacity="0.03" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                )}

                {/* Background vignette */}
                <radialGradient id="vignette" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                </radialGradient>
              </defs>

              {/* Vignette overlay */}
              <rect width={VB} height={VB} fill="url(#vignette)" />

              {/* ── TRACK LAYERS ──
                   Layer order (outermost to innermost):
                   1. Neon ambient glow (60)
                   2. Gravel/runoff (52)
                   3. Red/white kerbs as THIN outer border (48, dashed)
                   4. Track surface (44) — the main road, cars drive HERE
                   5. Edge lines (45/43)
                   6. Reference path for getPointAtLength (44, same width as surface)
                   7. Center dashed line
              */}

              {/* 1. Outer ambient glow — uses environment accent color */}
              <path d={circuit.path} fill="none" stroke={neonGlowRgba(0.06 * nightGlowMultiplier)}
                strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" filter="url(#neon-edge)" />

              {/* 2. Gravel/runoff */}
              <path d={circuit.path} fill="none" stroke={env.trackSurround || '#12151d'}
                strokeWidth="52" strokeLinecap="round" strokeLinejoin="round" />

              {/* 3a. Red kerb (thin outer edge border) */}
              <path d={circuit.path} fill="none" stroke="#DC2626" strokeWidth="48"
                strokeDasharray="5 5" strokeOpacity="0.55" strokeLinecap="round" strokeLinejoin="round" />

              {/* 3b. White kerb (alternating with red) */}
              <path d={circuit.path} fill="none" stroke="#FFFFFF" strokeWidth="48"
                strokeDasharray="5 5" strokeDashoffset="5" strokeOpacity="0.2" strokeLinecap="round" strokeLinejoin="round" />

              {/* 4. Track surface (asphalt) */}
              <path d={circuit.path} fill="none" stroke="url(#track-surface)"
                strokeWidth="44" strokeLinecap="round" strokeLinejoin="round" />

              {/* 4b. Ground tint overlay to embed track in terrain */}
              <path d={circuit.path} fill="none" stroke="url(#track-ground-tint)"
                strokeWidth="44" strokeLinecap="round" strokeLinejoin="round" />

              {/* Night reflection highlight */}
              {isNightMode && (
                <path d={circuit.path} fill="none" stroke="url(#night-reflection)"
                  strokeWidth="44" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* 5a. Outer edge line */}
              <path d={circuit.path} fill="none" stroke="rgba(255,255,255,0.08)"
                strokeWidth="44.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* 5b. Inner edge line */}
              <path d={circuit.path} fill="none" stroke="rgba(255,255,255,0.05)"
                strokeWidth="43" strokeLinecap="round" strokeLinejoin="round" />

              {/* 6. Racing surface (reference path for getPointAtLength) */}
              <path
                ref={pathRef}
                d={circuit.path}
                fill="none"
                stroke={isNightMode ? '#10141e' : '#1a1e2c'}
                strokeWidth="42"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 7. Center racing line (dashed) */}
              <path d={circuit.path} fill="none" stroke="rgba(255,255,255,0.035)"
                strokeWidth="0.8" strokeDasharray="12 18" />

              {/* ── DRS ZONES ── */}
              {drsSegments.map((seg, i) => (
                <g key={`drs-${i}`}>
                  <path d={seg} fill="none" stroke="#22C55E" strokeWidth="46"
                    strokeOpacity="0.08" strokeLinecap="round" filter="url(#drs-glow)" />
                  <path d={seg} fill="none" stroke="#22C55E" strokeWidth="42"
                    strokeOpacity="0.12" strokeLinecap="round" />
                  <path d={seg} fill="none" stroke="#22C55E" strokeWidth="1.2"
                    strokeOpacity="0.6" strokeLinecap="round" />
                </g>
              ))}

              {/* DRS labels */}
              {drsSegments.length > 0 && pathRef.current && circuit.drsZones.map((zone, i) => {
                const midDist = ((zone.start + zone.end) / 2) * pathLength;
                const pt = pathRef.current.getPointAtLength(midDist);
                return (
                  <g key={`drs-l-${i}`}>
                    <rect x={pt.x - 11} y={pt.y - 30} width={22} height={10} rx={2.5}
                      fill="rgba(0,0,0,0.7)" stroke="#22C55E" strokeWidth="0.5" strokeOpacity="0.7" />
                    <text x={pt.x} y={pt.y - 25} textAnchor="middle" dominantBaseline="central"
                      fill="#22C55E" fontSize="5.5" fontFamily="ui-monospace,monospace" fontWeight="bold">
                      DRS
                    </text>
                  </g>
                );
              })}

              {/* ── SECTOR MARKERS — uses environment accent ── */}
              {sectorMarkers.map((s, i) => (
                <g key={`sec-${i}`}>
                  <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                    stroke={accentGlow} strokeWidth="1.2" strokeOpacity="0.25" strokeDasharray="2 2" />
                  <circle cx={s.cx} cy={s.cy} r="6" fill="rgba(0,0,0,0.7)"
                    stroke={accentGlow} strokeWidth="0.5" strokeOpacity="0.4" />
                  <text x={s.cx} y={s.cy} textAnchor="middle" dominantBaseline="central"
                    fill={accentGlow} fontSize="4.5" fontFamily="ui-monospace,monospace"
                    fontWeight="bold" fillOpacity="0.6">
                    {s.label}
                  </text>
                </g>
              ))}

              {/* ── PIT LANE ── */}
              {pitLanePath && (
                <>
                  <path d={pitLanePath} fill="none" stroke="#13161f" strokeWidth="12" strokeLinecap="round" />
                  <path d={pitLanePath} fill="none" stroke="#FF6600" strokeWidth="0.6"
                    strokeDasharray="3 5" strokeOpacity="0.5" />
                  {pathRef.current && (() => {
                    const pitMid = ((circuit.pitEntry + circuit.pitExit) / 2) % 1;
                    const off = offsetPoint(pathRef.current, pitMid * pathLength, pathLength, 24);
                    return (
                      <g>
                        <rect x={off.x - 9} y={off.y - 5.5} width={18} height={11} rx={2.5}
                          fill="rgba(0,0,0,0.75)" stroke="#FF6600" strokeWidth="0.5" strokeOpacity="0.6" />
                        <text x={off.x} y={off.y} textAnchor="middle" dominantBaseline="central"
                          fill="#FF6600" fontSize="5.5" fontFamily="ui-monospace,monospace" fontWeight="bold">
                          PIT
                        </text>
                      </g>
                    );
                  })()}
                </>
              )}

              {/* ── START/FINISH LINE ── */}
              {startLine && (
                <>
                  <line x1={startLine.x1} y1={startLine.y1} x2={startLine.x2} y2={startLine.y2}
                    stroke="url(#checkered)" strokeWidth="5" />
                  <line x1={startLine.x1} y1={startLine.y1} x2={startLine.x2} y2={startLine.y2}
                    stroke="white" strokeWidth="0.6" strokeOpacity="0.4" />
                </>
              )}

              {/* ══ CAR DOTS ══ */}
              {carPositions.map((car) => {
                if (car.x < -100) return null;
                const meta = TEAM_META[car.teamName] || { color: '#666', accent: '#FFF' };
                const isHL = highlightedDriverId === car.driverId;
                const abbr = car.driverName?.split(' ').pop()?.slice(0, 3).toUpperCase() || '???';
                const isFastest = fastestLap?.driverId === car.driverId;
                const dotR = car.isPitting ? 3.5 : 4.5;

                return (
                  <g
                    key={car.driverId}
                    transform={`translate(${car.x}, ${car.y})`}
                    style={{ transition: 'transform 0.5s ease' }}
                    filter={car.isOvertaking ? 'url(#car-glow)' : car.isPitting ? 'url(#pit-glow)' : undefined}
                    opacity={car.isPitting ? 0.6 : 1}
                  >
                    {/* Pulsing ring for highlighted / overtaking */}
                    {(isHL || car.isOvertaking) && (
                      <circle r={dotR + 4} fill="none" stroke={car.isOvertaking ? '#FFD700' : meta.color}
                        strokeWidth="1.2" strokeOpacity="0.8">
                        <animate attributeName="r" values={`${dotR + 4};${dotR + 7};${dotR + 4}`} dur="1s" repeatCount="indefinite" />
                        <animate attributeName="stroke-opacity" values="0.8;0.15;0.8" dur="1s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Glow behind dot */}
                    <circle r={dotR + 2} fill={meta.color} fillOpacity="0.15" />

                    {/* Main colored dot */}
                    <circle r={dotR} fill={meta.color} stroke="rgba(0,0,0,0.7)" strokeWidth="1.2" />

                    {/* Inner highlight */}
                    <circle r={dotR * 0.45} fill="white" fillOpacity="0.35" cy={-dotR * 0.2} />

                    {/* Purple dot for fastest lap */}
                    {isFastest && <circle r={2} fill="#A855F7" stroke="white" strokeWidth="0.3" />}

                    {/* Label pill: "P | ABR" */}
                    <g transform="translate(0, -14)">
                      <rect x="-19" y="-7" width="38" height="14" rx="3.5"
                        fill="rgba(5,8,16,0.92)" stroke={meta.color} strokeWidth="0.7" strokeOpacity="0.5" />
                      <rect x="-19" y="-7" width="14" height="14" rx="3.5" fill={meta.color} fillOpacity="0.2" />
                      <text x="-12" y="0.5" textAnchor="middle" dominantBaseline="central"
                        fill={car.position <= 3 ? '#FFD700' : 'white'} fillOpacity={car.position <= 3 ? 1 : 0.8}
                        fontSize="6.5" fontFamily="ui-monospace,monospace" fontWeight="900">
                        {car.position}
                      </text>
                      <line x1="-5" y1="-4" x2="-5" y2="4" stroke={meta.color} strokeWidth="0.5" strokeOpacity="0.35" />
                      <text x="6" y="0.5" textAnchor="middle" dominantBaseline="central"
                        fill="white" fillOpacity="0.9"
                        fontSize="5.5" fontFamily="ui-monospace,monospace" fontWeight="bold" letterSpacing="0.3">
                        {abbr}
                      </text>
                    </g>

                    {/* Pit stop label */}
                    {car.isPitting && (
                      <g transform="translate(0, 13)">
                        <rect x="-10" y="-4.5" width="20" height="9" rx="2" fill="#FF6600"
                          stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
                        <text x="0" y="0.5" textAnchor="middle" dominantBaseline="central"
                          fill="white" fontSize="5" fontFamily="ui-monospace,monospace" fontWeight="bold">
                          PIT
                        </text>
                      </g>
                    )}

                    {/* Overtake flash */}
                    {car.isOvertaking && (
                      <g transform="translate(0, 14)">
                        <rect x="-18" y="-4.5" width="36" height="9" rx="2" fill="#FFD700">
                          <animate attributeName="fill-opacity" values="0.95;0.35;0.95" dur="0.4s" repeatCount="5" />
                        </rect>
                        <text x="0" y="0.5" textAnchor="middle" dominantBaseline="central"
                          fill="#000" fontSize="4.5" fontFamily="ui-monospace,monospace" fontWeight="900" letterSpacing="0.5">
                          OVERTAKE
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* =================== HUD OVERLAYS (NOT transformed, screen-space) =================== */}

        {/* Lap counter — top-left glass panel */}
        <div className="absolute top-3 left-3 rounded-lg overflow-hidden z-10" style={{
          background: 'linear-gradient(135deg, rgba(8,12,22,0.92) 0%, rgba(12,18,30,0.88) 100%)',
          border: `1px solid ${neonGlowRgba(0.12)}`,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          <div className="px-3 py-0.5" style={{ background: 'linear-gradient(90deg, rgba(220,38,38,0.2) 0%, transparent 100%)', borderBottom: '1px solid rgba(220,38,38,0.15)' }}>
            <span className="text-[7px] text-red-400 font-black uppercase tracking-[0.2em]">Race</span>
          </div>
          <div className="px-3 py-1.5">
            <div className="text-white font-mono text-sm font-black leading-none">
              LAP <span style={{ color: accentGlow }}>{currentLap}</span>
              <span className="text-white/20 text-xs"> / {totalLaps}</span>
            </div>
          </div>
        </div>

        {/* Track info — top-right glass panel */}
        <div className="absolute top-3 right-3 rounded-lg overflow-hidden z-10" style={{
          background: 'linear-gradient(135deg, rgba(8,12,22,0.92) 0%, rgba(12,18,30,0.88) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
          minWidth: '180px',
        }}>
          <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-[8px] text-white/70 uppercase tracking-[0.15em] font-bold">Race View</span>
            <div className="flex items-center gap-1">
              <span className="text-[8px]">{isNightMode ? '\u{1F319}' : '\u2600\uFE0F'}</span>
              <span className="text-[8px] text-white/50 font-mono">{conditions.temp}&deg;C</span>
            </div>
          </div>
          <div className="px-3 py-2 space-y-[6px]">
            {[
              { label: 'Track', value: `${conditions.trackTemp}\u00B0C`, color: '#fff', icon: '\u{1F321}' },
              { label: 'Conditions', value: 'Dry', color: '#fff', icon: '\u2601' },
              { label: 'Track Rubber', value: conditions.rubber, color: rubberColor, icon: '\u25C9' },
              { label: 'Track Grip', value: conditions.grip, color: gripColor, icon: '\u25C8' },
              { label: 'Wind', value: `${conditions.wind} km/h`, color: '#fff', icon: '\u{1F4A8}' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-[8px] font-mono">
                <span className="text-white/35 flex items-center gap-1">
                  <span className="text-[7px] opacity-50">{row.icon}</span>
                  {row.label}
                </span>
                <span className="font-bold" style={{ color: row.color === '#fff' ? 'rgba(255,255,255,0.7)' : row.color }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Circuit name — bottom-left */}
        <div className="absolute bottom-3 left-3 rounded-lg px-3 py-1.5 z-10" style={{
          background: 'linear-gradient(135deg, rgba(8,12,22,0.9) 0%, rgba(12,18,30,0.85) 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(8px)',
        }}>
          <div className="text-[11px] text-white font-bold tracking-wide">{circuit.countryFlag} {circuit.name}</div>
          <div className="text-[7px] text-white/25 font-mono tracking-wider">{circuit.country}</div>
        </div>

        {/* Zoom controls — right side */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 z-10">
          <button
            onClick={() => setZoom(prev => Math.min(5, prev * 1.3))}
            className="w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white text-sm font-bold transition-all hover:scale-105"
            style={{ background: 'rgba(8,12,22,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}
          >+</button>
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev * 0.7))}
            className="w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white text-sm font-bold transition-all hover:scale-105"
            style={{ background: 'rgba(8,12,22,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}
          >&minus;</button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-white text-[8px] font-mono font-bold transition-all hover:scale-105"
            style={{ background: 'rgba(8,12,22,0.85)', border: '1px solid rgba(255,255,255,0.1)', color: accentGlow }}
          >&#10226;</button>
          <div className="text-[7px] text-white/25 font-mono mt-0.5">{Math.round(zoom * 100)}%</div>
        </div>

        {/* Minimap — bottom-right */}
        <div className="absolute bottom-3 right-3 rounded-lg p-2 z-10" style={{
          background: 'rgba(8,12,22,0.85)',
          border: `1px solid ${neonGlowRgba(0.1)}`,
          width: '80px',
          height: '80px',
        }}>
          <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-full" style={{ opacity: 0.6 }}>
            <path d={circuit.path} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            {/* Current viewport rectangle when zoomed */}
            {zoom > 1.1 && (
              <rect x={vbX} y={vbY} width={vbSize} height={vbSize}
                fill="none" stroke={accentGlow} strokeWidth="4" strokeOpacity="0.5" rx="4" />
            )}
            {/* Leader dot on minimap */}
            {carPositions[0] && carPositions[0].x > -100 && (
              <circle cx={carPositions[0].x} cy={carPositions[0].y} r="8" fill={accentGlow}>
                <animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
          </svg>
        </div>

        {/* Race progress bar — bottom center */}
        <div className="absolute bottom-3 left-44 right-24 z-10" style={{ height: '3px' }}>
          <div className="w-full h-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${racePct}%`,
              background: 'linear-gradient(90deg, #DC2626 0%, #F59E0B 40%, #22C55E 100%)',
              boxShadow: '0 0 8px rgba(220,38,38,0.3)',
            }} />
          </div>
        </div>

        {/* Chequered flag overlay */}
        {currentLap >= totalLaps && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20" style={{
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%)',
          }}>
            <div className="px-8 py-4 rounded-2xl" style={{
              background: 'linear-gradient(135deg, rgba(8,12,22,0.95) 0%, rgba(15,20,35,0.9) 100%)',
              border: '1px solid rgba(255,215,0,0.3)',
              boxShadow: '0 0 40px rgba(255,215,0,0.1), 0 8px 32px rgba(0,0,0,0.5)',
            }}>
              <div className="text-[#FFD700] text-xl font-black uppercase tracking-[0.2em] text-center">
                &#127937; Chequered Flag
              </div>
              <div className="text-white/40 text-[10px] text-center mt-1 font-mono tracking-wider">RACE COMPLETE</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
