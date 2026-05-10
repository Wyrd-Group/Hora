import React from 'react';

/**
 * Top-down F1 car SVG icon — polished version.
 * Shows car silhouette with team livery colors, halo, sidepods,
 * front wing endplates, floor detail, and driver number.
 */
export default function CarIcon({
  color = '#DC0000',
  accent = '#FFF200',
  number = '',
  rotation = 0,
  highlighted = false,
  inPit = false,
  size = 32,
  className = '',
  style = {},
}) {
  const w = size;
  const h = size * 0.44;

  return (
    <svg
      width={w} height={h} viewBox="0 0 64 28"
      className={`flex-shrink-0 ${className}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        filter: highlighted ? `drop-shadow(0 0 8px ${color})` : undefined,
        opacity: inPit ? 0.5 : 1,
        transition: 'transform 0.3s ease, opacity 0.3s',
        ...style,
      }}
    >
      {/* Floor / bargeboard (widest, subtle) */}
      <path
        d="M10 7 L6 9 L4 14 L6 19 L10 21 L52 21 L56 19 L58 14 L56 9 L52 7 Z"
        fill={color}
        fillOpacity="0.25"
      />

      {/* Car body — main shape */}
      <path
        d="M6 11 L2 13 L0 14 L2 15 L6 17 L10 19 L16 21 L22 22 L38 22 L46 20 L52 18 L58 16 L62 15 L64 14 L62 13 L58 12 L52 10 L46 8 L38 6 L22 6 L16 7 L10 9 Z"
        fill={color}
        stroke={accent}
        strokeWidth="0.6"
        strokeOpacity="0.6"
      />

      {/* Sidepod inlet left */}
      <path d="M18 8 L24 7 L24 10 L18 10 Z" fill={accent} fillOpacity="0.15" />
      {/* Sidepod inlet right */}
      <path d="M18 20 L24 21 L24 18 L18 18 Z" fill={accent} fillOpacity="0.15" />

      {/* Engine cover / spine */}
      <rect x="30" y="12.5" width="20" height="3" rx="1.5" fill={accent} fillOpacity="0.1" />

      {/* Livery stripe (prominent) */}
      <line x1="14" y1="14" x2="50" y2="14" stroke={accent} strokeWidth="2" strokeOpacity="0.25" />

      {/* Front wing — wider with endplates */}
      <rect x="2" y="7" width="6" height="14" rx="1" fill={accent} fillOpacity="0.35" />
      {/* Front wing endplates */}
      <rect x="1" y="5.5" width="3" height="3" rx="0.7" fill={accent} fillOpacity="0.5" />
      <rect x="1" y="19.5" width="3" height="3" rx="0.7" fill={accent} fillOpacity="0.5" />
      {/* Front wing elements (horizontal slats) */}
      <line x1="2" y1="9" x2="7" y2="9" stroke={accent} strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1="2" y1="19" x2="7" y2="19" stroke={accent} strokeWidth="0.4" strokeOpacity="0.4" />

      {/* Halo / cockpit */}
      <ellipse cx="26" cy="14" rx="5.5" ry="4" fill="#0a0a0a" stroke="#333" strokeWidth="0.6" />
      {/* Halo device */}
      <path d="M22 14 C22 11, 26 9.5, 30 11 L30 12.5 C27 10.5, 23 11.5, 22.5 14" fill="#333" fillOpacity="0.8" />
      <path d="M22 14 C22 17, 26 18.5, 30 17 L30 15.5 C27 17.5, 23 16.5, 22.5 14" fill="#333" fillOpacity="0.8" />
      {/* Driver helmet (tiny dot) */}
      <circle cx="25" cy="14" r="1.8" fill={accent} fillOpacity="0.6" />

      {/* Rear wing */}
      <rect x="54" y="6" width="5" height="16" rx="1.2" fill={accent} fillOpacity="0.6" />
      {/* Rear wing DRS flap */}
      <rect x="56" y="7" width="2" height="14" rx="0.5" fill={color} fillOpacity="0.5" />
      {/* Rear wing endplates */}
      <rect x="58" y="5" width="2" height="3" rx="0.5" fill={accent} fillOpacity="0.4" />
      <rect x="58" y="20" width="2" height="3" rx="0.5" fill={accent} fillOpacity="0.4" />

      {/* Exhaust / rear light */}
      <rect x="60" y="13" width="2" height="2" rx="0.5" fill="#FF3333" fillOpacity="0.6" />

      {/* Wheels — front */}
      <ellipse cx="14" cy="5.5" rx="3.5" ry="2.2" fill="#1a1a1a" stroke="#444" strokeWidth="0.5" />
      <ellipse cx="14" cy="22.5" rx="3.5" ry="2.2" fill="#1a1a1a" stroke="#444" strokeWidth="0.5" />
      {/* Wheel tread lines — front */}
      <line x1="11.5" y1="5.5" x2="16.5" y2="5.5" stroke="#333" strokeWidth="0.3" />
      <line x1="11.5" y1="22.5" x2="16.5" y2="22.5" stroke="#333" strokeWidth="0.3" />

      {/* Wheels — rear (slightly wider) */}
      <ellipse cx="46" cy="5.5" rx="4" ry="2.5" fill="#1a1a1a" stroke="#444" strokeWidth="0.5" />
      <ellipse cx="46" cy="22.5" rx="4" ry="2.5" fill="#1a1a1a" stroke="#444" strokeWidth="0.5" />
      {/* Wheel tread lines — rear */}
      <line x1="43" y1="5.5" x2="49" y2="5.5" stroke="#333" strokeWidth="0.3" />
      <line x1="43" y1="22.5" x2="49" y2="22.5" stroke="#333" strokeWidth="0.3" />

      {/* Driver number on nose */}
      {number && (
        <text
          x="10" y="14"
          textAnchor="middle" dominantBaseline="central"
          fill={accent}
          fontSize="6"
          fontFamily="ui-monospace, monospace"
          fontWeight="900"
        >
          {number}
        </text>
      )}

      {/* Highlight pulse ring */}
      {highlighted && (
        <rect x="-2" y="-2" width="68" height="32" rx="4" fill="none" stroke={color} strokeWidth="1.5">
          <animate attributeName="stroke-opacity" values="0.9;0.2;0.9" dur="0.8s" repeatCount="indefinite" />
        </rect>
      )}
    </svg>
  );
}
