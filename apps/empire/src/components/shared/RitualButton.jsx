/**
 * RitualButton — the cyan-bracketed primary CTA used by the AEGIS ritual.
 *
 * Mono-tracked uppercase label, hairline cyan top + bottom strokes, gentle
 * scale-on-hover/tap from motion. Used for the ritual's "I am ready",
 * "Continue", "Inscribe", "I accept" actions, and reusable on any onboarding
 * surface that wants the same register.
 *
 * Props:
 *   children   — label text
 *   onClick    — click handler
 *   disabled   — disables click + dims to 25%
 *   big        — taller variant (px-12 py-4) for hero CTAs
 *   testId     — passed through as data-testid for end-to-end tests
 */

import React from 'react';
import { motion } from 'motion/react';

export default function RitualButton({
  children,
  onClick,
  disabled = false,
  big = false,
  testId,
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={`
        font-mono uppercase text-[11px] tracking-[0.45em] rounded-none
        border border-cyan-400/50 bg-cyan-400/[0.06] text-cyan-200
        hover:bg-cyan-400/[0.14] hover:border-cyan-300
        disabled:opacity-25 disabled:cursor-not-allowed
        relative
        ${big ? 'px-12 py-4 text-[12px]' : 'px-9 py-3'}
      `}
      style={{
        boxShadow:
          '0 0 0 0 rgba(0,229,255,0.4), inset 0 0 24px rgba(0,229,255,0.05)',
      }}
    >
      <span className="absolute -top-px left-3 right-3 h-px bg-cyan-400/60" />
      <span className="absolute -bottom-px left-3 right-3 h-px bg-cyan-400/60" />
      {children}
    </motion.button>
  );
}
