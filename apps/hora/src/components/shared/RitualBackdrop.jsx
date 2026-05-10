/**
 * RitualBackdrop — the reusable atmosphere shared by every onboarding surface.
 *
 * Renders, as a self-contained absolute-positioned block:
 *   - a deep navy field (#050810)
 *   - a faint cyan grid
 *   - a light shaft from above (full density only)
 *   - drifting dust orbs (radial, blurred)
 *   - drifting cyan embers (full density: 26, subtle: 12)
 *   - dual-layer scanlines (full density only)
 *   - film grain
 *   - heavy radial vignette (lighter on subtle)
 *
 * Density modes:
 *   'full'    — used by the ritual itself; everything on, vignette dark
 *   'subtle'  — used by mode-selection surfaces; embers reduced, no light
 *               shaft, scanlines softened, vignette lighter so foreground
 *               cards stay legible
 *
 * Usage:
 *   <div className="relative">
 *     <RitualBackdrop density="subtle" />
 *     ... your foreground content ...
 *   </div>
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';

export default function RitualBackdrop({ density = 'full' }) {
  const isFull = density === 'full';

  const dust = isFull
    ? [
        { x: '12%', y: '70%', size: 360, hue: 'rgba(0,229,255,0.06)',  dur: 22 },
        { x: '78%', y: '18%', size: 280, hue: 'rgba(124,58,237,0.07)', dur: 28 },
        { x: '60%', y: '82%', size: 420, hue: 'rgba(0,229,255,0.04)',  dur: 34 },
        { x: '20%', y: '20%', size: 220, hue: 'rgba(0,229,255,0.05)',  dur: 26 },
      ]
    : [
        { x: '15%', y: '70%', size: 320, hue: 'rgba(0,229,255,0.045)', dur: 24 },
        { x: '78%', y: '20%', size: 260, hue: 'rgba(124,58,237,0.05)', dur: 30 },
        { x: '55%', y: '78%', size: 380, hue: 'rgba(0,229,255,0.035)', dur: 36 },
      ];

  // Embers: full=26, subtle=12. Memoised so positions are stable across renders.
  const emberCount = isFull ? 26 : 12;
  const embers = useMemo(
    () => Array.from({ length: emberCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 14,
      dur: 14 + Math.random() * 16,
      size: 1 + Math.random() * 2.4,
    })),
    [emberCount],
  );

  const vignette = isFull
    ? 'radial-gradient(ellipse at center, transparent 12%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.92) 100%)'
    : 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.72) 100%)';

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* base navy field */}
      <div className="absolute inset-0 bg-[#050810]" />

      {/* faint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: isFull ? 0.04 : 0.03,
          backgroundImage:
            'linear-gradient(rgba(0,229,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.4) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      {/* shaft of light from above — full density only */}
      {isFull && <div className="ritual-shaft" />}

      {/* drifting dust orbs */}
      {dust.map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: d.x,
            top: d.y,
            width: d.size,
            height: d.size,
            background: `radial-gradient(closest-side, ${d.hue} 0%, transparent 70%)`,
            filter: 'blur(80px)',
          }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: d.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* drifting embers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {embers.map((e) => (
          <motion.span
            key={e.id}
            className="absolute rounded-full"
            style={{
              left: `${e.x}%`,
              bottom: -10,
              width: e.size,
              height: e.size,
              background: 'rgba(0,229,255,0.7)',
              boxShadow: '0 0 6px rgba(0,229,255,0.65)',
            }}
            initial={{ y: 0, opacity: 0 }}
            animate={{
              y: -(typeof window !== 'undefined' ? window.innerHeight : 1080) - 100,
              opacity: [0, isFull ? 0.8 : 0.55, isFull ? 0.8 : 0.55, 0],
            }}
            transition={{
              duration: e.dur,
              repeat: Infinity,
              delay: e.delay,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* scanlines */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          opacity: isFull ? 0.10 : 0.05,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.22) 0 1px, transparent 1px 3px)',
        }}
      />
      {isFull && (
        <div
          className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(0,229,255,0.4) 0 1px, transparent 1px 7px)',
          }}
        />
      )}

      {/* film grain */}
      <div className="ritual-grain" />

      {/* vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: vignette }}
      />
    </div>
  );
}
