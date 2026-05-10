import React from 'react';

/**
 * Basketball player badge icon — circular jersey with team color + player number.
 * Also shows possession indicator (pulsing ring).
 */
export default function PlayerIcon({
  color = '#CE1141',
  accent = '#FFFFFF',
  number = '',
  hasBall = false,
  highlighted = false,
  size = 24,
  className = '',
  style = {},
}) {
  const r = size / 2;

  return (
    <svg
      width={size} height={size} viewBox="0 0 40 40"
      className={`flex-shrink-0 ${className}`}
      style={{
        filter: highlighted ? `drop-shadow(0 0 6px ${color})` : undefined,
        ...style,
      }}
    >
      {/* Possession ring */}
      {hasBall && (
        <circle cx="20" cy="20" r="19" fill="none" stroke="#FFC72C" strokeWidth="2.5">
          <animate attributeName="r" values="17;19;17" dur="0.8s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Outer ring */}
      <circle cx="20" cy="20" r="16" fill={color} stroke={accent} strokeWidth="2" />
      {/* Inner circle — jersey look */}
      <circle cx="20" cy="20" r="12" fill={color} stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
      {/* Shoulder lines (jersey style) */}
      <path d="M10 14 L20 10 L30 14" fill="none" stroke={accent} strokeWidth="1.2" strokeOpacity="0.4" />
      {/* Number */}
      {number && (
        <text
          x="20" y="22"
          textAnchor="middle" dominantBaseline="central"
          fill={accent}
          fontSize={number.toString().length > 1 ? "12" : "14"}
          fontFamily="ui-monospace, monospace"
          fontWeight="900"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
        >
          {number}
        </text>
      )}
      {/* Highlight glow */}
      {highlighted && (
        <circle cx="20" cy="20" r="18" fill="none" stroke={color} strokeWidth="2">
          <animate attributeName="stroke-opacity" values="0.8;0.2;0.8" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}
