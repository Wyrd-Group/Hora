import React from 'react';

/**
 * FM-style football jersey SVG icon.
 * Shows a mini shirt with team color, accent collar/trim, and player number.
 */
export default function JerseyIcon({
  color = '#E30613',
  accent = '#FFFFFF',
  number = '',
  isGK = false,
  highlighted = false,
  size = 22,
  className = '',
  style = {},
}) {
  const w = size;
  const h = size * 1.1;

  return (
    <svg
      width={w} height={h} viewBox="0 0 40 44"
      className={`flex-shrink-0 ${className}`}
      style={{ filter: highlighted ? `drop-shadow(0 0 6px ${color})` : undefined, ...style }}
    >
      {/* Shirt body */}
      <path
        d={isGK
          ? "M8 12 L2 18 L2 40 C2 42 4 44 6 44 L34 44 C36 44 38 42 38 40 L38 18 L32 12 L28 8 L20 4 L12 8 Z"
          : "M8 12 L2 18 L2 40 C2 42 4 44 6 44 L34 44 C36 44 38 42 38 40 L38 18 L32 12 L28 8 L20 4 L12 8 Z"
        }
        fill={isGK ? '#2a2a2a' : color}
        stroke={accent}
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />
      {/* Sleeves */}
      <path d="M8 12 L0 20 L2 22 L8 16 Z" fill={isGK ? '#333' : color} stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
      <path d="M32 12 L40 20 L38 22 L32 16 Z" fill={isGK ? '#333' : color} stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Collar / neckline */}
      <path d="M12 8 L20 4 L28 8" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      {/* Collar accent V */}
      <path d="M16 10 L20 14 L24 10" fill="none" stroke={accent} strokeWidth="1.2" strokeOpacity="0.5" />
      {/* Center stripe accent */}
      <line x1="20" y1="14" x2="20" y2="40" stroke={accent} strokeWidth="0.6" strokeOpacity="0.15" />
      {/* GK diamond pattern */}
      {isGK && (
        <>
          <line x1="10" y1="20" x2="30" y2="40" stroke={accent} strokeWidth="0.4" strokeOpacity="0.15" />
          <line x1="30" y1="20" x2="10" y2="40" stroke={accent} strokeWidth="0.4" strokeOpacity="0.15" />
          <line x1="20" y1="16" x2="20" y2="42" stroke={color} strokeWidth="0.3" strokeOpacity="0.2" />
        </>
      )}
      {/* Number */}
      {number && (
        <text
          x="20" y="30"
          textAnchor="middle" dominantBaseline="central"
          fill={accent}
          fontSize={number.toString().length > 1 ? "12" : "14"}
          fontFamily="ui-monospace, monospace"
          fontWeight="900"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {number}
        </text>
      )}
      {/* Highlight glow ring */}
      {highlighted && (
        <rect
          x="-2" y="-2" width="44" height="48" rx="6"
          fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.7"
        >
          <animate attributeName="stroke-opacity" values="0.7;0.2;0.7" dur="1.5s" repeatCount="indefinite" />
        </rect>
      )}
    </svg>
  );
}
