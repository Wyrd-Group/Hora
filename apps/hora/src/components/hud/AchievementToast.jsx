import React, { useEffect, useState } from 'react';
import { useAchievementsStore } from '../../store/achievementsStore';
import { ACHIEVEMENTS, TIER_COLORS } from '../../data/achievements';

/**
 * AchievementToast — Shows a brief pop-up when achievements are unlocked.
 * Displays one at a time, auto-dismisses after 4 seconds.
 */
const AchievementToast = () => {
  const notificationQueue = useAchievementsStore(s => s.notificationQueue);
  const dismissNotification = useAchievementsStore(s => s.dismissNotification);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (notificationQueue.length === 0 || current) return;

    const id = notificationQueue[0];
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) {
      dismissNotification(id);
      return;
    }

    setCurrent(ach);
    // Delay to trigger CSS transition
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        dismissNotification(id);
        setCurrent(null);
      }, 400);
    }, 4000);

    return () => clearTimeout(timer);
  }, [notificationQueue, current, dismissNotification]);

  if (!current) return null;

  const tierColor = TIER_COLORS[current.tier] || '#fff';

  return (
    <div
      className={`fixed top-20 right-4 z-[200] transition-all duration-400 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-16'
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md font-mono shadow-2xl"
        style={{
          background: 'rgba(11, 16, 24, 0.95)',
          borderColor: `${tierColor}40`,
          boxShadow: `0 0 20px ${tierColor}20`,
        }}
      >
        {/* Trophy */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{
            backgroundColor: `${tierColor}20`,
            color: tierColor,
            border: `1px solid ${tierColor}40`,
          }}
        >
          {current.icon}
        </div>

        <div>
          <div className="text-[8px] uppercase tracking-[0.2em] text-white/40 mb-0.5">
            Achievement Unlocked
          </div>
          <div className="text-[11px] font-bold text-tactical-text">
            {current.title}
          </div>
          <div className="text-[8px] text-white/30 mt-0.5">
            <span style={{ color: `${tierColor}99` }}>{current.tier}</span>
            {' · '}
            <span className="text-[#ec4899]/60">+{current.reward.ap} AP</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementToast;
