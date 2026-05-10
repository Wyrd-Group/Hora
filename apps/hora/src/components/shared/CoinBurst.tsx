/**
 * CoinBurst — particle animation for the tap-to-collect reward beat.
 *
 * Pure CSS / framer-motion-free for now. A handful of golden circles
 * spawn at the centre and arc outward + downward, fading out.
 *
 * Render conditionally with a `key` change to retrigger.
 */
import { useMemo } from 'react';

export interface CoinBurstProps {
  /** Number of coins. Default 12. */
  count?: number;
  /** Pixel size of each coin. Default 14. */
  size?: number;
  /** Animation duration in ms. Default 700. */
  durationMs?: number;
}

export default function CoinBurst({ count = 12, size = 14, durationMs = 700 }: CoinBurstProps) {
  // Pre-compute random per-coin trajectories so they don't re-randomise
  // on every parent re-render mid-animation.
  const coins = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const distance = 80 + Math.random() * 80;
      return {
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance - 40, // slight upward bias
        delay: Math.random() * 90,
        rotate: (Math.random() - 0.5) * 360,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {coins.map((c, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 35% 35%, #FFE9A8 0%, #FFB820 60%, #FF8A4A 100%)',
            boxShadow:
              '0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.6)',
            transform: 'translate(0, 0) rotate(0deg)',
            animation: `hora-coinburst ${durationMs}ms cubic-bezier(0.2, 0.7, 0.4, 1) ${c.delay}ms forwards`,
            // CSS custom props for the animation
            ['--dx' as string]: `${c.dx}px`,
            ['--dy' as string]: `${c.dy}px`,
            ['--rot' as string]: `${c.rotate}deg`,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes hora-coinburst {
          0%   { transform: translate(0, 0) rotate(0deg) scale(0.6); opacity: 0; }
          15%  { opacity: 1; transform: translate(calc(var(--dx) * 0.15), calc(var(--dy) * 0.15)) rotate(calc(var(--rot) * 0.2)) scale(1); }
          80%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.7); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
