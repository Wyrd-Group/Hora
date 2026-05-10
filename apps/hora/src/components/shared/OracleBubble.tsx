/**
 * OracleBubble — Hora's mascot/companion bubble.
 *
 * A small persistent character bubble in the bottom-left of the
 * gameplay screens. Shows contextual tips. No avatar art yet — placeholder
 * is a sky-blue rounded square with a smile glyph; commission real art
 * once the audience response to v1 is known.
 *
 * Per docs/VISUAL_DIRECTION.md §5 (Mascot) + docs/GAME_DESIGN.md §8.
 */
import { useEffect, useState } from 'react';

export interface OracleBubbleProps {
  /** Current message. Pass empty/undefined to hide bubble. */
  message?: string;
  /** Auto-hide after this many ms. 0 = persistent. Default 4000. */
  autoHideMs?: number;
  /** Tone affects the bubble colour. */
  tone?: 'tip' | 'cheer' | 'warning';
}

const TONE_BG: Record<NonNullable<OracleBubbleProps['tone']>, string> = {
  tip:     'rgba(79, 184, 255, 0.95)',  // hora-sky
  cheer:   'rgba(31, 205, 184, 0.95)',  // hora-teal
  warning: 'rgba(255, 138, 74, 0.95)',  // peach-coral
};

export default function OracleBubble({
  message,
  autoHideMs = 4000,
  tone = 'tip',
}: OracleBubbleProps) {
  const [visible, setVisible] = useState<boolean>(!!message);

  useEffect(() => {
    if (!message) { setVisible(false); return; }
    setVisible(true);
    if (autoHideMs <= 0) return;
    const t = setTimeout(() => setVisible(false), autoHideMs);
    return () => clearTimeout(t);
  }, [message, autoHideMs]);

  if (!message || !visible) {
    // Render the mascot avatar alone (resting state)
    return (
      <div
        aria-hidden
        className="absolute left-4 bottom-24 z-40 select-none"
        style={{ width: 52, height: 52 }}
      >
        <Mascot />
      </div>
    );
  }

  return (
    <div
      role="status"
      className="absolute left-4 bottom-24 z-40 flex items-end gap-2 select-none"
      style={{ maxWidth: 'calc(100% - 32px)' }}
    >
      <Mascot />
      <div
        className="rounded-2xl px-4 py-2 text-white"
        style={{
          background: TONE_BG[tone],
          boxShadow: '0 6px 14px rgba(0, 0, 0, 0.2)',
          fontFamily: 'Fredoka, system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 13,
          maxWidth: 240,
          animation: 'hora-oracle-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {message}
      </div>
      <style>{`
        @keyframes hora-oracle-pop {
          0%   { transform: scale(0.5) translateY(8px); opacity: 0; }
          70%  { transform: scale(1.06) translateY(0); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Mascot() {
  // Placeholder mascot — chibi smile in a violet circle.
  // Replace with commissioned art before public launch.
  return (
    <div
      aria-label="The Oracle"
      className="shrink-0"
      style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 35% 35%, #B59CFF 0%, #7C5CFF 70%, #5A3FCF 100%)',
        boxShadow:
          '0 6px 12px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 26,
        animation: 'hora-oracle-bob 3.6s ease-in-out infinite',
      }}
    >
      <span aria-hidden>✨</span>
      <style>{`
        @keyframes hora-oracle-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
