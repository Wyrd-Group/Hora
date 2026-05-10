/**
 * AegisShield — the AEGIS sigil as an SVG seal.
 *
 * Round, guilloché rosette field, AEGIS engraved on top arc and
 * "SHIELD · KNOWLEDGE · DEFENCE" on bottom arc, undulating snake fringe
 * (slowly counter-rotating), mint-edge serration ticks, central protection
 * circle with an upward triangle of candlestick segments, Latin
 * micro-inscription EX · IGNORANTIA · CAPTIVITAS, and a € coin mark.
 *
 * Pure SVG, framework-agnostic. Slow rotations driven by CSS keyframes
 * (.shield-rotate-cw / .shield-rotate-ccw — see src/styles/ritual.css).
 *
 * Props:
 *   size           — rendered px (default 360)
 *   withWordmark   — toggle the engraved AEGIS arc text (default true)
 *   glowing        — toggle drop-shadow glow + inner blur filter (default true)
 */

import React, { useMemo } from 'react';

export default function AegisShield({
  size = 360,
  withWordmark = true,
  glowing = true,
}) {
  // Build a guilloché rosette: 24 circles arranged around centre.
  const rosette = useMemo(() => {
    const out = [];
    const n = 24;
    const R = 28;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push({ cx: Math.cos(a) * R, cy: Math.sin(a) * R, r: 32 });
    }
    return out;
  }, []);

  // Snake fringe: a path that undulates sinusoidally around the rim.
  const snakePath = useMemo(() => {
    const N = 240;
    const R = 95;
    const A = 3; // amplitude of wave
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const r = R + Math.sin(t * 16) * A; // 16 waves around
      pts.push(`${(Math.cos(t) * r).toFixed(2)},${(Math.sin(t) * r).toFixed(2)}`);
    }
    return 'M ' + pts.join(' L ') + ' Z';
  }, []);

  // Candlestick triangle (growth). Bottom row 5, middle 3, top 1.
  const candles = useMemo(() => {
    const layout = [];
    const rows = [
      { count: 5, y: 18,  span: 36, h: [10, 14, 18, 14, 10] },
      { count: 3, y: 0,   span: 22, h: [16, 22, 16] },
      { count: 1, y: -18, span: 0,  h: [18] },
    ];
    rows.forEach((row) => {
      for (let i = 0; i < row.count; i++) {
        const x = row.count === 1
          ? 0
          : -row.span / 2 + (row.span / (row.count - 1)) * i;
        const h = row.h[i];
        layout.push({ x, y: row.y, h });
      }
    });
    return layout;
  }, []);

  const stroke = '#00e5ff';
  const innerFilter = glowing ? 'url(#aegis-shield-glow)' : undefined;

  return (
    <svg
      viewBox="-110 -110 220 220"
      width={size}
      height={size}
      style={{
        filter: glowing
          ? 'drop-shadow(0 0 36px rgba(0,229,255,0.45))'
          : 'none',
      }}
    >
      <defs>
        <filter id="aegis-shield-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <radialGradient id="aegis-shield-fill" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#0a1828" />
          <stop offset="60%"  stopColor="#060a12" />
          <stop offset="100%" stopColor="#02050a" />
        </radialGradient>
        <path id="aegis-arc-top"    d="M -68,0 A 68,68 0 0 1 68,0" />
        <path id="aegis-arc-bottom" d="M -68,0 A 68,68 0 0 0 68,0" />
      </defs>

      {/* shield body fill */}
      <circle cx="0" cy="0" r="100" fill="url(#aegis-shield-fill)" />

      {/* outer rim */}
      <circle cx="0" cy="0" r="100" fill="none" stroke={stroke} strokeWidth="0.7"  opacity="0.95" />
      <circle cx="0" cy="0" r="97"  fill="none" stroke={stroke} strokeWidth="0.25" opacity="0.55" />

      {/* snake fringe — undulating ribbon */}
      <path
        d={snakePath}
        fill="none"
        stroke={stroke}
        strokeWidth="0.35"
        opacity="0.55"
        className="shield-rotate-cw"
        style={{ transformOrigin: 'center' }}
      />

      {/* serration ticks (mint coin edge) */}
      <g className="shield-rotate-ccw" style={{ transformOrigin: 'center' }}>
        {Array.from({ length: 96 }).map((_, i) => {
          const a = (i / 96) * Math.PI * 2;
          const r1 = 89;
          const r2 = 92;
          return (
            <line
              key={i}
              x1={Math.cos(a) * r1}
              y1={Math.sin(a) * r1}
              x2={Math.cos(a) * r2}
              y2={Math.sin(a) * r2}
              stroke={stroke}
              strokeWidth="0.3"
              opacity="0.6"
            />
          );
        })}
      </g>

      {/* AEGIS engraved along arc */}
      {withWordmark && (
        <g>
          <text
            fontFamily='"JetBrains Mono", monospace'
            fontSize="9"
            letterSpacing="9"
            fill={stroke}
            opacity="0.95"
          >
            <textPath href="#aegis-arc-top" startOffset="50%" textAnchor="middle">
              A · E · G · I · S
            </textPath>
          </text>
          <text
            fontFamily='"JetBrains Mono", monospace'
            fontSize="6"
            letterSpacing="6"
            fill={stroke}
            opacity="0.55"
          >
            <textPath href="#aegis-arc-bottom" startOffset="50%" textAnchor="middle">
              SHIELD · KNOWLEDGE · DEFENCE
            </textPath>
          </text>
        </g>
      )}

      {/* inner double ring */}
      <circle cx="0" cy="0" r="78" fill="none" stroke={stroke} strokeWidth="0.4" opacity="0.85" />
      <circle cx="0" cy="0" r="58" fill="none" stroke={stroke} strokeWidth="0.3" opacity="0.6" />

      {/* guilloché rosette field */}
      <g className="shield-rotate-cw" style={{ transformOrigin: 'center' }}>
        {rosette.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill="none"
            stroke={stroke}
            strokeWidth="0.18"
            opacity="0.30"
          />
        ))}
      </g>

      {/* central protection circle (where Gorgoneion would sit) */}
      <circle
        cx="0" cy="0" r="34"
        fill="#02050a"
        stroke={stroke}
        strokeWidth="0.6"
        opacity="0.95"
        filter={innerFilter}
      />
      <circle cx="0" cy="0" r="34" fill="none" stroke={stroke} strokeWidth="0.18" opacity="0.4" />

      {/* triangle outline — growth */}
      <polygon
        points="0,-26 24,16 -24,16"
        fill="none"
        stroke={stroke}
        strokeWidth="0.5"
        opacity="0.5"
      />

      {/* candlesticks composed inside triangle */}
      <g>
        {candles.map((c, i) => (
          <g key={i}>
            {/* wick */}
            <line
              x1={c.x} y1={c.y - c.h / 2 - 3}
              x2={c.x} y2={c.y + c.h / 2 + 3}
              stroke={stroke}
              strokeWidth="0.4"
              opacity="0.85"
            />
            {/* body */}
            <rect
              x={c.x - 1.6}
              y={c.y - c.h / 2}
              width="3.2"
              height={c.h}
              fill={stroke}
              opacity="0.95"
            />
          </g>
        ))}
      </g>

      {/* Latin micro-inscription */}
      <text
        x="0" y="56" textAnchor="middle"
        fontFamily='"JetBrains Mono", monospace'
        fontSize="4"
        letterSpacing="3"
        fill={stroke}
        opacity="0.5"
      >
        EX · IGNORANTIA · CAPTIVITAS
      </text>

      {/* central tiny € coin mark */}
      <text
        x="0" y="-46" textAnchor="middle"
        fontFamily='"JetBrains Mono", monospace'
        fontSize="6"
        fill={stroke}
        opacity="0.7"
      >
        €
      </text>
    </svg>
  );
}
