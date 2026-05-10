import React from 'react';
import { TEAM_META } from '../../data/teamMeta';

/**
 * TeamBadge — SVG shield/crest with team colors + abbreviation.
 * Renders inline next to team names across the sports UI.
 *
 * @param {string}  name   – Team name (must match TEAM_META key)
 * @param {'xs'|'sm'|'md'|'lg'} size – Badge size preset
 * @param {string}  [className] – Extra classes
 */
const SIZES = {
  xs: { w: 20, h: 24, font: 6, stroke: 0.8 },
  sm: { w: 26, h: 31, font: 7.5, stroke: 1 },
  md: { w: 34, h: 40, font: 9, stroke: 1.2 },
  lg: { w: 44, h: 52, font: 11, stroke: 1.4 },
};

export default function TeamBadge({ name, size = 'sm', className = '' }) {
  const meta = TEAM_META[name];
  if (!meta) return null;

  const { w, h, font, stroke } = SIZES[size] || SIZES.sm;
  const { abbr, color, accent } = meta;

  // Shield path scaled to a 34x40 viewBox
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 34 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      style={{ verticalAlign: 'middle' }}
    >
      {/* Outer glow */}
      <defs>
        <linearGradient id={`bg-${abbr}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
        <filter id={`glow-${abbr}`}>
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={color} floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Shield shape */}
      <path
        d="M17 2 L31 7 L31 18 C31 28 17 37 17 37 C17 37 3 28 3 18 L3 7 Z"
        fill={`url(#bg-${abbr})`}
        stroke={accent}
        strokeWidth={stroke}
        filter={`url(#glow-${abbr})`}
      />

      {/* Inner highlight line */}
      <path
        d="M17 5 L28.5 9 L28.5 18 C28.5 26.5 17 34 17 34 C17 34 5.5 26.5 5.5 18 L5.5 9 Z"
        fill="none"
        stroke={accent}
        strokeWidth={stroke * 0.4}
        strokeOpacity="0.25"
      />

      {/* Abbreviation text */}
      <text
        x="17"
        y="21"
        textAnchor="middle"
        dominantBaseline="central"
        fill={accent}
        fontSize={font}
        fontFamily="ui-monospace, monospace"
        fontWeight="800"
        letterSpacing="0.5"
        style={{ textShadow: `0 1px 2px rgba(0,0,0,0.6)` }}
      >
        {abbr}
      </text>
    </svg>
  );
}
