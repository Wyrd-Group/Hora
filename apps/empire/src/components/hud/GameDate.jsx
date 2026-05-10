import React from 'react';
import { useEmpireStore } from '../../store/empireStore';

const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/**
 * GameDate — pill in the top nav showing current in-game date and time.
 *
 * Time mapping (1 game week = 1 real day):
 *   1 tick  = 1 game minute  (~8.57 real seconds)
 *   1440 ticks = 1 game day  (~3.43 real hours)
 *   10080 ticks = 1 game week (= 1 real day = 24 real hours)
 *
 * Clock advances 00:00 → 00:01 → 00:02 … smoothly, one minute per tick.
 */
export default function GameDate() {
  const gameDate = useEmpireStore((s) => s.gameDate);
  const gameTick = useEmpireStore((s) => s.gameTick);

  const monthLabel = MONTH_NAMES[(gameDate.month - 1)] || 'JAN';

  // 1 tick = 1 game minute → time within day
  const TICKS_PER_DAY = 1440;
  const tickInDay = gameTick % TICKS_PER_DAY;
  const hours = Math.floor(tickInDay / 60);
  const minutes = tickInDay % 60;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  // Day of week
  const totalDays = Math.floor(gameTick / TICKS_PER_DAY);
  const dayOfWeek = DAY_NAMES[totalDays % 7];

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[7px] font-mono tracking-wider select-none"
      style={{ color: '#E8E0D0' }}
      title={`Tick ${gameTick} — ${dayOfWeek}, ${gameDate.day} ${monthLabel} ${gameDate.year} — ${timeStr}`}
    >
      <span className="text-amber-400/70 text-[8px]">⏱</span>
      <span className="text-white/80 text-[8px]">{timeStr}</span>
      <span className="text-white/30">·</span>
      <span className="text-[#00e5ff]/60 text-[7px]">{dayOfWeek}</span>
      <span className="text-white/60">{gameDate.day} {monthLabel}</span>
      <span className="text-white/30">{gameDate.year}</span>
    </div>
  );
}
