import React, { useEffect, useRef, useCallback } from 'react';
import { useEmpireStore } from '../../store/empireStore';

const TYPE_CONFIG = {
  construction: { icon: '🏗', color: '#f59e0b', label: 'CONSTRUCTION' },
  research:     { icon: '🔬', color: '#8b5cf6', label: 'R&D' },
  trade:        { icon: '📈', color: '#10b981', label: 'TRADE' },
  alert:        { icon: '⚠️', color: '#ef4444', label: 'ALERT' },
  info:         { icon: 'ℹ️', color: '#06b6d4', label: 'INFO' },
};

/**
 * NotificationBanner — shows a slide-in banner for each new notification.
 * Auto-dismisses after 10 seconds. Plays a short sound.
 * Has an "OPEN" button to navigate to the relevant location.
 */
export default function NotificationBanner({ onNavigate }) {
  const notifications = useEmpireStore((s) => s.notifications);
  const dismissNotification = useEmpireStore((s) => s.dismissNotification);
  const playedRef = useRef(new Set());

  // Play a notification sound
  const playSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Two-tone chime: C5 → E5
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, ctx.currentTime);        // C5
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12); // E5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (_) {
      // Audio not available — silent fallback
    }
  }, []);

  // Active (undismissed) notifications
  const active = notifications.filter((n) => !n.dismissed);

  // Auto-dismiss after 10 seconds + play sound on new
  useEffect(() => {
    for (const notif of active) {
      if (!playedRef.current.has(notif.id)) {
        playedRef.current.add(notif.id);
        playSound();

        // Auto-dismiss after 10 seconds
        const timer = setTimeout(() => {
          dismissNotification(notif.id);
        }, 10_000);

        // Cleanup on unmount
        return () => clearTimeout(timer);
      }
    }
  }, [active, dismissNotification, playSound]);

  // Clean up stale refs
  useEffect(() => {
    if (playedRef.current.size > 100) {
      playedRef.current = new Set();
    }
  }, [notifications.length]);

  if (active.length === 0) return null;

  return (
    <div className="fixed top-12 right-4 z-[60] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 360 }}>
      {active.slice(0, 3).map((notif) => {
        const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
        return (
          <div
            key={notif.id}
            className="pointer-events-auto animate-slide-in-right rounded-lg border shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(10, 14, 24, 0.95)',
              borderColor: `${config.color}30`,
              backdropFilter: 'blur(16px)',
              animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              className="h-[2px] w-full"
              style={{ background: `linear-gradient(90deg, ${config.color}, transparent)` }}
            />
            <div className="px-3 py-2.5">
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[8px] font-mono tracking-[0.2em] font-semibold"
                      style={{ color: config.color }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-white/90 mt-0.5">{notif.title}</div>
                  <div className="text-[9px] font-mono text-white/40 mt-0.5 leading-relaxed">
                    {notif.message}
                  </div>
                </div>
                <button
                  onClick={() => dismissNotification(notif.id)}
                  className="text-white/20 hover:text-white/60 text-[10px] transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>
              {/* Action row */}
              {notif.navigateTo && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => {
                      onNavigate?.(notif.navigateTo);
                      dismissNotification(notif.id);
                    }}
                    className="text-[8px] font-mono tracking-[0.15em] px-2.5 py-1 rounded border transition-all"
                    style={{
                      borderColor: `${config.color}40`,
                      color: config.color,
                      background: `${config.color}10`,
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = `${config.color}25`;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = `${config.color}10`;
                    }}
                  >
                    OPEN →
                  </button>
                </div>
              )}
            </div>
            {/* Countdown bar */}
            <div className="h-[2px] w-full overflow-hidden bg-white/5">
              <div
                className="h-full"
                style={{
                  background: config.color,
                  animation: 'shrinkWidth 10s linear forwards',
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Inline keyframes */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes shrinkWidth {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
