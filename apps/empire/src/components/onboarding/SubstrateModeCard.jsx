/**
 * SubstrateModeCard — the new mode card on OnboardingHub.
 *
 * Per AEGIS_BUILD_SPEC.md §5.1, Substrate is the 9th game mode. Phase 1
 * unlocks the card from the Phase 0 greyed-out state — clicking now
 * routes to `gameMode === 'substrate'` (the route check already lives in
 * App.jsx).
 *
 * Visual contract:
 *   - Same card chrome as the existing 8 modes (`ModeCard` in
 *     `OnboardingHub.jsx`).
 *   - Uses the AEGIS sigil (`<AegisShield size={...} />`) at small size
 *     as the icon. The other 8 modes use Unicode glyphs; the AEGIS sigil
 *     signals that Substrate is the foundational, atmospheric mode.
 *   - Title `SUBSTRATE`, subtitle `Build something real.` — both
 *     British-English-clean.
 */

import React, { useState } from 'react';
import AegisShield from '../shared/AegisShield';

const ACCENT = '#9beaff'; // soft cyan, sits between the live modes' palette

export default function SubstrateModeCard({ index = 8, onSelect, disabled = false }) {
  const [hovered, setHovered] = useState(false);
  // When disabled (R&D-gated), suppress hover state so we don't flicker
  // accent treatment on a non-clickable card.
  const visualHover = !disabled && hovered;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : () => onSelect && onSelect('substrate')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      aria-label={disabled ? 'Substrate Mode (in development)' : 'Enter Substrate Mode'}
      aria-disabled={disabled || undefined}
      className="group relative flex flex-col items-start gap-3 rounded-lg border p-5 text-left transition-all duration-300 ease-out"
      style={{
        background: visualHover ? 'rgba(10, 14, 24, 0.92)' : 'rgba(10, 14, 24, 0.82)',
        borderColor: visualHover ? 'rgba(155,234,255,0.32)' : 'rgba(155,234,255,0.10)',
        boxShadow: visualHover
          ? `0 0 28px ${ACCENT}18, inset 0 1px 0 ${ACCENT}18`
          : 'none',
        transform: visualHover ? 'scale(1.012)' : 'scale(1)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animationDelay: `${index * 60}ms`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {/* R&D pill — only shown when the flag is off */}
      {disabled && (
        <span
          className="absolute top-3 right-3 font-mono text-[8px] font-bold uppercase tracking-[0.3em] rounded px-1.5 py-0.5 select-none"
          style={{
            color: 'rgba(155,234,255,0.7)',
            border: '1px solid rgba(155,234,255,0.3)',
            background: 'rgba(155,234,255,0.05)',
          }}
        >
          R&amp;D
        </span>
      )}

      {/* Icon — AEGIS sigil at small size */}
      <span
        aria-hidden="true"
        className="flex items-center justify-center"
        style={{ width: 28, height: 28, color: ACCENT }}
      >
        <AegisShield size={28} withWordmark={false} glowing={visualHover} />
      </span>

      {/* Title */}
      <span
        className="font-mono text-[11px] font-bold uppercase leading-none"
        style={{
          letterSpacing: '0.12em',
          color: visualHover ? ACCENT : '#E8E0D0',
          transition: 'color 0.3s',
        }}
      >
        Substrate
      </span>

      {/* Subtitle */}
      <span
        className="font-mono text-[9px] leading-relaxed"
        style={{
          color: 'rgba(156, 163, 175, 0.85)',
          letterSpacing: '0.04em',
        }}
      >
        Build something real.
      </span>

      {/* Bottom accent line on hover */}
      <div
        className="absolute bottom-0 left-4 right-4 h-px transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
          opacity: visualHover ? 0.6 : 0,
        }}
      />
    </button>
  );
}
