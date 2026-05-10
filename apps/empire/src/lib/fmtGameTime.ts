/**
 * fmtGameTime — Converts game ticks (1 tick = 1 game minute) to a human-readable duration.
 *
 * Time scale: 1 real second = 1 game minute = 1 tick.
 *   1 game hour  = 60 ticks
 *   1 game day   = 1,440 ticks   (24 real min)
 *   1 game month = 43,200 ticks  (~12h real)
 *   1 game year  = 525,600 ticks (~6 real days)
 *
 * Examples: "2y 3mo", "6mo", "15d", "2h", "45min"
 */
export function fmtGameTime(ticks: number): string {
  const TICKS_PER_HOUR  = 60;
  const TICKS_PER_DAY   = 1_440;
  const TICKS_PER_MONTH = 43_200;   // 30 days
  const TICKS_PER_YEAR  = 525_600;  // 365 days

  if (ticks >= TICKS_PER_YEAR) {
    const y = Math.floor(ticks / TICKS_PER_YEAR);
    const m = Math.floor((ticks % TICKS_PER_YEAR) / TICKS_PER_MONTH);
    return m > 0 ? `${y}y ${m}mo` : `${y}y`;
  }
  if (ticks >= TICKS_PER_MONTH) {
    const m = Math.floor(ticks / TICKS_PER_MONTH);
    const d = Math.floor((ticks % TICKS_PER_MONTH) / TICKS_PER_DAY);
    return d > 0 ? `${m}mo ${d}d` : `${m}mo`;
  }
  if (ticks >= TICKS_PER_DAY) {
    const d = Math.floor(ticks / TICKS_PER_DAY);
    return `${d}d`;
  }
  if (ticks >= TICKS_PER_HOUR) {
    const h = Math.floor(ticks / TICKS_PER_HOUR);
    return `${h}h`;
  }
  return `${Math.round(ticks)}min`;
}
