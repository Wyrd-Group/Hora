/**
 * HoraOrb — the brand sigil. Hourglass + coins.
 * Per docs/VISUAL_DIRECTION.md §5.
 */
export interface HoraOrbProps {
  size?: number;
  animated?: boolean;
}

export default function HoraOrb({ size = 96, animated = false }: HoraOrbProps) {
  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      aria-label="Hora — the hourglass that pays"
      style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.18))' }}
    >
      <defs>
        <linearGradient id="hora-orb-glass" x1="0" y1="-50" x2="0" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFD78A" />
          <stop offset="50%" stopColor="#FFB820" />
          <stop offset="100%" stopColor="#FF8A4A" />
        </linearGradient>
        <linearGradient id="hora-orb-rim" x1="0" y1="-50" x2="0" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C5CFF" />
          <stop offset="100%" stopColor="#FF5C6E" />
        </linearGradient>
        <radialGradient id="hora-orb-coin" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="100%" stopColor="#FFB820" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="48" fill="url(#hora-orb-rim)" opacity="0.18" />
      <path
        d="M -28 -36 L 28 -36 L 4 0 L 28 36 L -28 36 L -4 0 Z"
        fill="url(#hora-orb-glass)"
        stroke="#FF8A4A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M -22 32 L 22 32 L 14 22 Q 0 18 -14 22 Z" fill="#1FCDB8" opacity="0.85" />
      <rect x="-1.4" y="-4" width="2.8" height="22" fill="#1FCDB8" opacity="0.7" rx="1">
        {animated && <animate attributeName="height" values="22;0;22" dur="2.4s" repeatCount="indefinite" />}
      </rect>
      <g>
        <circle cx="-12" cy="-22" r="5" fill="url(#hora-orb-coin)" stroke="#FF8A4A" strokeWidth="0.8" />
        <circle cx="10" cy="-12" r="4" fill="url(#hora-orb-coin)" stroke="#FF8A4A" strokeWidth="0.8" />
        <circle cx="-6" cy="-2" r="3" fill="url(#hora-orb-coin)" stroke="#FF8A4A" strokeWidth="0.8" />
        {animated && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,24; 0,0"
            dur="3.2s"
            repeatCount="indefinite"
          />
        )}
      </g>
      <rect x="-30" y="-40" width="60" height="6" rx="2" fill="url(#hora-orb-rim)" />
      <rect x="-30" y="34" width="60" height="6" rx="2" fill="url(#hora-orb-rim)" />
    </svg>
  );
}
