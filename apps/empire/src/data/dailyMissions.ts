/**
 * dailyMissions.ts — Rotating daily challenge pool.
 * Each day, 3 missions are selected from the pool using a seed based on the date.
 * Completing all 3 grants a streak bonus. Consecutive days build the streak multiplier.
 */

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  icon: string;
  checkKey: string;       // key checked against daily progress counters
  target: number;
  reward: { xp: number; ap: number; bpXp: number };
  difficulty: 'easy' | 'medium' | 'hard';
}

// ── Mission Pool (rotated daily, 3 picked per day) ────────────────

export const DAILY_MISSION_POOL: DailyMission[] = [
  // ── Easy ──
  { id: 'daily-login',          title: 'Report for Duty',       description: 'Log in today',                          icon: '◈', checkKey: 'login',          target: 1,  reward: { xp: 25, ap: 10, bpXp: 5 },  difficulty: 'easy' },
  { id: 'daily-1-trade',        title: 'Market Opener',         description: 'Execute 1 trade on any exchange',        icon: '⇄', checkKey: 'trades',         target: 1,  reward: { xp: 30, ap: 15, bpXp: 5 },  difficulty: 'easy' },
  { id: 'daily-read-bulletin',  title: 'Morning Briefing',      description: 'Read a MarketWire bulletin',             icon: '◆', checkKey: 'bulletins_read', target: 1,  reward: { xp: 20, ap: 10, bpXp: 5 },  difficulty: 'easy' },
  { id: 'daily-collect-income', title: 'Cash Flow',             description: 'Collect income from any node',           icon: '¤', checkKey: 'income_collected', target: 1, reward: { xp: 25, ap: 10, bpXp: 5 },  difficulty: 'easy' },
  { id: 'daily-open-academy',   title: 'Student',               description: 'Open any Academy lesson',                icon: '◉', checkKey: 'lessons_opened', target: 1,  reward: { xp: 20, ap: 10, bpXp: 5 },  difficulty: 'easy' },
  { id: 'daily-check-portfolio',title: 'Portfolio Check',       description: 'View your portfolio dashboard',          icon: '⊞', checkKey: 'portfolio_views', target: 1, reward: { xp: 15, ap: 5, bpXp: 3 },   difficulty: 'easy' },
  { id: 'daily-use-athena',     title: 'Consult the Oracle',    description: 'Ask Athena AI a question',               icon: '♦', checkKey: 'athena_queries', target: 1,  reward: { xp: 25, ap: 10, bpXp: 5 },  difficulty: 'easy' },
  { id: 'daily-view-event',     title: 'World Watcher',         description: 'View a world event',                     icon: '⚑', checkKey: 'events_viewed',  target: 1,  reward: { xp: 20, ap: 10, bpXp: 5 },  difficulty: 'easy' },

  // ── Medium ──
  { id: 'daily-3-trades',       title: 'Active Markets',        description: 'Execute 3 trades today',                 icon: '⇄', checkKey: 'trades',         target: 3,  reward: { xp: 60, ap: 30, bpXp: 10 }, difficulty: 'medium' },
  { id: 'daily-profit-500',     title: 'Green Day',             description: 'Earn $500 profit from trades today',     icon: '▲', checkKey: 'trade_profit',   target: 500, reward: { xp: 75, ap: 35, bpXp: 12 }, difficulty: 'medium' },
  { id: 'daily-acquire-node',   title: 'Land Grab',             description: 'Acquire a new business node',            icon: '⊕', checkKey: 'nodes_acquired', target: 1,  reward: { xp: 80, ap: 40, bpXp: 15 }, difficulty: 'medium' },
  { id: 'daily-complete-lesson',title: 'Scholar',               description: 'Complete an Academy lesson',             icon: '★', checkKey: 'lessons_completed', target: 1, reward: { xp: 60, ap: 25, bpXp: 10 }, difficulty: 'medium' },
  { id: 'daily-5-bulletins',    title: 'News Junkie',           description: 'Read 5 MarketWire bulletins',            icon: '◆', checkKey: 'bulletins_read', target: 5,  reward: { xp: 50, ap: 25, bpXp: 8 },  difficulty: 'medium' },
  { id: 'daily-hire-agent',     title: 'Talent Scout',          description: 'Open a card pack or hire an agent',      icon: '♠', checkKey: 'packs_opened',   target: 1,  reward: { xp: 50, ap: 20, bpXp: 8 },  difficulty: 'medium' },
  { id: 'daily-2-sectors',      title: 'Sector Sweep',          description: 'Trade in 2 different sectors',           icon: '◎', checkKey: 'sectors_traded', target: 2,  reward: { xp: 65, ap: 30, bpXp: 10 }, difficulty: 'medium' },
  { id: 'daily-market-call',    title: 'Prediction Time',       description: 'Make a market call on BizTok',           icon: '◈', checkKey: 'calls_made',     target: 1,  reward: { xp: 55, ap: 25, bpXp: 10 }, difficulty: 'medium' },
  { id: 'daily-dept-project',   title: 'Department Head',       description: 'Start or complete a department project',  icon: '⊡', checkKey: 'dept_actions',   target: 1,  reward: { xp: 60, ap: 30, bpXp: 10 }, difficulty: 'medium' },
  { id: 'daily-lab-session',    title: 'Lab Rat',               description: 'Complete a Lab simulation session',       icon: '⚗', checkKey: 'lab_sessions',   target: 1,  reward: { xp: 70, ap: 30, bpXp: 12 }, difficulty: 'medium' },

  // ── Hard ──
  { id: 'daily-5-trades',       title: 'Day Trader',            description: 'Execute 5 trades today',                 icon: '⇄', checkKey: 'trades',         target: 5,  reward: { xp: 100, ap: 50, bpXp: 20 }, difficulty: 'hard' },
  { id: 'daily-profit-2k',      title: 'Big Gains',             description: 'Earn $2,000 profit from trades today',   icon: '▲', checkKey: 'trade_profit',   target: 2000, reward: { xp: 120, ap: 60, bpXp: 25 }, difficulty: 'hard' },
  { id: 'daily-replay-star',    title: 'Scenario Star',         description: 'Earn a star in any replay scenario',     icon: '★', checkKey: 'replay_stars',   target: 1,  reward: { xp: 100, ap: 50, bpXp: 20 }, difficulty: 'hard' },
  { id: 'daily-pass-exam',      title: 'Examiner',              description: 'Pass an ECFL exam',                      icon: '♛', checkKey: 'exams_passed',   target: 1,  reward: { xp: 150, ap: 75, bpXp: 30 }, difficulty: 'hard' },
  { id: 'daily-3-nodes',        title: 'Expansion Spree',       description: 'Acquire 3 new nodes in a single day',    icon: '⊕', checkKey: 'nodes_acquired', target: 3,  reward: { xp: 130, ap: 60, bpXp: 25 }, difficulty: 'hard' },
  { id: 'daily-10k-networth',   title: 'Growth Spurt',          description: 'Increase net worth by $10,000 today',    icon: '◉', checkKey: 'networth_gain',  target: 10000, reward: { xp: 120, ap: 60, bpXp: 25 }, difficulty: 'hard' },
  { id: 'daily-3-lessons',      title: 'Marathon Learner',      description: 'Complete 3 Academy lessons',             icon: '★', checkKey: 'lessons_completed', target: 3, reward: { xp: 120, ap: 50, bpXp: 20 }, difficulty: 'hard' },
  { id: 'daily-shadow-op',      title: 'Shadow Agent',          description: 'Complete a shadow operation',            icon: '⚠', checkKey: 'shadow_ops',     target: 1,  reward: { xp: 100, ap: 50, bpXp: 20 }, difficulty: 'hard' },
];

// ── Streak Rewards ────────────────────────────────────────────────

export const STREAK_BONUSES = [
  { days: 3,  label: '3-Day Streak',   apBonus: 50,  bpXpBonus: 15 },
  { days: 7,  label: 'Weekly Warrior',  apBonus: 150, bpXpBonus: 40 },
  { days: 14, label: 'Fortnight Force', apBonus: 400, bpXpBonus: 100 },
  { days: 30, label: 'Monthly Master',  apBonus: 1000, bpXpBonus: 250 },
] as const;

// ── Helpers ────────────────────────────────────────────────────────

/** Deterministic daily seed from date string "YYYY-MM-DD" */
export function getDaySeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Pick 3 missions for a given day: 1 easy, 1 medium, 1 hard */
export function getDailyMissions(dateStr: string): DailyMission[] {
  const seed = getDaySeed(dateStr);
  const easy = DAILY_MISSION_POOL.filter(m => m.difficulty === 'easy');
  const medium = DAILY_MISSION_POOL.filter(m => m.difficulty === 'medium');
  const hard = DAILY_MISSION_POOL.filter(m => m.difficulty === 'hard');

  return [
    easy[seed % easy.length],
    medium[(seed >> 4) % medium.length],
    hard[(seed >> 8) % hard.length],
  ];
}

/** Get today's date key */
export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** All-clear bonus for completing all 3 daily missions */
export const ALL_CLEAR_BONUS = { ap: 75, bpXp: 25, xp: 100 };
