/**
 * missions.ts -- Solo mission definitions for Lab and Replay modes.
 * Ported from MVP soloMissions.js into the typed Mission interface.
 */

import type { Mission, MissionContext } from '../types/social';

// ── Lab Missions (practice-focused) ────────────────────────────────

export const LAB_MISSIONS: Mission[] = [
  {
    id: 'lab-first-trade',
    title: 'First Trade',
    description: 'Execute your first trade in Lab mode',
    context: 'lab',
    checkFn: 'lab_has_holdings',
    target: 1,
    reward: { xp: 50, ap: 20, bpXp: 10, cash: 1000 },
  },
  {
    id: 'lab-profit-1k',
    title: 'Thousand Maker',
    description: 'Reach 1,000 profit in Lab',
    context: 'lab',
    checkFn: 'lab_profit_gte',
    target: 1000,
    reward: { xp: 100, ap: 40, bpXp: 15, cash: 2000 },
  },
  {
    id: 'lab-portfolio-150k',
    title: 'Growing Empire',
    description: 'Reach 150,000 portfolio value in Lab',
    context: 'lab',
    checkFn: 'lab_portfolio_gte',
    target: 150000,
    reward: { xp: 150, ap: 60, bpXp: 20, cash: 5000 },
  },
  {
    id: 'lab-diversified',
    title: 'Diversified',
    description: 'Hold 5+ different assets simultaneously in Lab',
    context: 'lab',
    checkFn: 'lab_unique_holdings_gte',
    target: 5,
    reward: { xp: 100, ap: 40, bpXp: 15, cash: 3000 },
  },
  {
    id: 'lab-5-trades',
    title: 'Active Trader',
    description: 'Execute 5 trades in Lab mode',
    context: 'lab',
    checkFn: 'lab_trade_count_gte',
    target: 5,
    reward: { xp: 75, ap: 30, bpXp: 10, cash: 1500 },
  },
  {
    id: 'lab-10-trades',
    title: 'Speed Demon',
    description: 'Make 10 trades in a single Lab session',
    context: 'lab',
    checkFn: 'lab_trade_count_gte',
    target: 10,
    reward: { xp: 75, ap: 30, bpXp: 10, cash: 1000 },
  },
  {
    id: 'lab-profit-10k',
    title: 'Serious Gains',
    description: 'Reach 10,000 profit in Lab',
    context: 'lab',
    checkFn: 'lab_profit_gte',
    target: 10000,
    reward: { xp: 200, ap: 80, bpXp: 25, cash: 10000 },
  },
  {
    id: 'lab-profit-50k',
    title: 'Lab Legend',
    description: 'Reach 50,000 profit in Lab',
    context: 'lab',
    checkFn: 'lab_profit_gte',
    target: 50000,
    reward: { xp: 500, ap: 200, bpXp: 50, cash: 25000 },
  },
];

// ── Replay Missions (scenario-focused) ─────────────────────────────

export const REPLAY_MISSIONS: Mission[] = [
  {
    id: 'replay-first-trade',
    title: 'First Replay Trade',
    description: 'Execute your first trade during a replay scenario',
    context: 'replay',
    checkFn: 'replay_has_holdings',
    target: 1,
    reward: { xp: 50, ap: 20, bpXp: 10, cash: 1000 },
  },
  {
    id: 'replay-profit',
    title: 'Replay Profit',
    description: 'End a replay with more than your starting balance',
    context: 'replay',
    checkFn: 'replay_profit_gte',
    target: 1,
    reward: { xp: 100, ap: 40, bpXp: 15, cash: 2000 },
  },
  {
    id: 'replay-5-trades',
    title: 'Replay Trader',
    description: 'Make 5 trades during a single replay',
    context: 'replay',
    checkFn: 'replay_trade_count_gte',
    target: 5,
    reward: { xp: 75, ap: 30, bpXp: 10, cash: 1500 },
  },
  {
    id: 'replay-multi-asset',
    title: 'Multi-Asset Trader',
    description: 'Hold 3+ different assets during a replay',
    context: 'replay',
    checkFn: 'replay_unique_holdings_gte',
    target: 3,
    reward: { xp: 100, ap: 40, bpXp: 15, cash: 3000 },
  },
  {
    id: 'replay-10-return',
    title: 'Double Digit',
    description: 'Achieve a 10% return in any replay scenario',
    context: 'replay',
    checkFn: 'replay_return_pct_gte',
    target: 10,
    reward: { xp: 150, ap: 60, bpXp: 20, cash: 5000 },
  },
  {
    id: 'replay-hold-50',
    title: 'Diamond Hands',
    description: 'Hold a position for 50+ ticks during a replay',
    context: 'replay',
    checkFn: 'replay_hold_ticks_gte',
    target: 50,
    reward: { xp: 100, ap: 40, bpXp: 15, cash: 2000 },
  },
  {
    id: 'replay-complete-3',
    title: 'History Buff',
    description: 'Complete 3 different replay scenarios',
    context: 'replay',
    checkFn: 'replay_scenarios_completed_gte',
    target: 3,
    reward: { xp: 200, ap: 80, bpXp: 25, cash: 8000 },
  },
  {
    id: 'replay-complete-5',
    title: 'History Student',
    description: 'Complete 5 different replay scenarios',
    context: 'replay',
    checkFn: 'replay_scenarios_completed_gte',
    target: 5,
    reward: { xp: 300, ap: 120, bpXp: 30, cash: 15000 },
  },
  {
    id: 'replay-star-1',
    title: 'First Star',
    description: 'Earn at least 1 star in any scenario',
    context: 'replay',
    checkFn: 'replay_total_stars_gte',
    target: 1,
    reward: { xp: 75, ap: 30, bpXp: 10, cash: 1500 },
  },
  {
    id: 'replay-star-10',
    title: 'Star Collector',
    description: 'Earn 10 total stars across all scenarios',
    context: 'replay',
    checkFn: 'replay_total_stars_gte',
    target: 10,
    reward: { xp: 250, ap: 100, bpXp: 30, cash: 12000 },
  },
  {
    id: 'replay-3star-single',
    title: 'Perfect Run',
    description: 'Earn 3 stars in any single scenario',
    context: 'replay',
    checkFn: 'replay_max_stars_gte',
    target: 3,
    reward: { xp: 200, ap: 100, bpXp: 25, cash: 10000 },
  },
  {
    id: 'replay-crash-survivor',
    title: 'Crash Survivor',
    description: 'End a crash/bear scenario with positive returns',
    context: 'replay',
    checkFn: 'replay_crash_positive_return',
    target: 1,
    reward: { xp: 200, ap: 80, bpXp: 25, cash: 10000 },
  },
  {
    id: 'replay-20k',
    title: 'Portfolio 20k',
    description: 'Reach 20,000 portfolio value during any replay',
    context: 'replay',
    checkFn: 'replay_portfolio_gte',
    target: 20000,
    reward: { xp: 100, ap: 40, bpXp: 15, cash: 5000 },
  },
  {
    id: 'replay-50k',
    title: 'Replay Master',
    description: 'Reach 50,000 portfolio value during any replay',
    context: 'replay',
    checkFn: 'replay_portfolio_gte',
    target: 50000,
    reward: { xp: 250, ap: 100, bpXp: 30, cash: 15000 },
  },
  {
    id: 'replay-100-return',
    title: 'Perfect Timing',
    description: 'End a replay with 100%+ return',
    context: 'replay',
    checkFn: 'replay_return_pct_gte',
    target: 100,
    reward: { xp: 500, ap: 200, bpXp: 50, cash: 25000 },
  },
];

// ── Empire Missions (main game) ───────────────────────────────────

export const EMPIRE_MISSIONS: Mission[] = [
  { id: 'empire-first-node',      title: 'First Acquisition',      description: 'Acquire your first business node',                  context: 'global', checkFn: 'empire_nodes_gte',           target: 1,       reward: { xp: 100, ap: 50, bpXp: 15, cash: 5000 } },
  { id: 'empire-5-nodes',         title: 'Portfolio Builder',       description: 'Own 5 business nodes',                              context: 'global', checkFn: 'empire_nodes_gte',           target: 5,       reward: { xp: 200, ap: 100, bpXp: 30, cash: 15000 } },
  { id: 'empire-20-nodes',        title: 'Tycoon Rising',          description: 'Own 20 business nodes',                             context: 'global', checkFn: 'empire_nodes_gte',           target: 20,      reward: { xp: 400, ap: 200, bpXp: 60, cash: 50000 } },
  { id: 'empire-first-trade',     title: 'Exchange Debut',         description: 'Execute your first trade on the live exchange',      context: 'exchange', checkFn: 'exchange_trades_gte',      target: 1,       reward: { xp: 75, ap: 30, bpXp: 10, cash: 2000 } },
  { id: 'empire-10-trades',       title: 'Floor Trader',           description: 'Execute 10 trades on the live exchange',             context: 'exchange', checkFn: 'exchange_trades_gte',      target: 10,      reward: { xp: 150, ap: 60, bpXp: 20, cash: 5000 } },
  { id: 'empire-50-trades',       title: 'Exchange Veteran',       description: 'Execute 50 trades on the live exchange',             context: 'exchange', checkFn: 'exchange_trades_gte',      target: 50,      reward: { xp: 300, ap: 150, bpXp: 40, cash: 20000 } },
  { id: 'empire-networth-100k',   title: 'Six Figures',            description: 'Reach $100,000 total net worth',                    context: 'global', checkFn: 'empire_networth_gte',        target: 100000,  reward: { xp: 200, ap: 100, bpXp: 25, cash: 10000 } },
  { id: 'empire-networth-1m',     title: 'Millionaire',            description: 'Reach $1,000,000 total net worth',                  context: 'global', checkFn: 'empire_networth_gte',        target: 1000000, reward: { xp: 500, ap: 250, bpXp: 60, cash: 50000 } },
  { id: 'empire-networth-10m',    title: 'Decamillionaire',        description: 'Reach $10,000,000 total net worth',                 context: 'global', checkFn: 'empire_networth_gte',        target: 10000000,reward: { xp: 1000, ap: 500, bpXp: 120, cash: 200000 } },
  { id: 'empire-incorporate',     title: 'Incorporated',           description: 'Register a company structure',                      context: 'global', checkFn: 'empire_incorporated',         target: 1,       reward: { xp: 150, ap: 75, bpXp: 20, cash: 5000 } },
  { id: 'empire-first-route',     title: 'Connected',              description: 'Establish your first trade route',                  context: 'global', checkFn: 'empire_routes_gte',           target: 1,       reward: { xp: 100, ap: 50, bpXp: 15, cash: 3000 } },
  { id: 'empire-5-routes',        title: 'Supply Chain',           description: 'Establish 5 trade routes',                          context: 'global', checkFn: 'empire_routes_gte',           target: 5,       reward: { xp: 250, ap: 120, bpXp: 35, cash: 15000 } },
  { id: 'empire-first-lesson',    title: 'Student',                description: 'Complete your first Academy lesson',                context: 'global', checkFn: 'empire_lessons_gte',          target: 1,       reward: { xp: 50, ap: 25, bpXp: 10, cash: 1000 } },
  { id: 'empire-10-lessons',      title: 'Scholar',                description: 'Complete 10 Academy lessons',                       context: 'global', checkFn: 'empire_lessons_gte',          target: 10,      reward: { xp: 200, ap: 100, bpXp: 30, cash: 10000 } },
  { id: 'empire-first-exam',      title: 'Certified',              description: 'Pass your first ECFL exam',                         context: 'global', checkFn: 'empire_exams_gte',            target: 1,       reward: { xp: 150, ap: 75, bpXp: 20, cash: 5000 } },
  { id: 'empire-followers-100',   title: 'Rising Star',            description: 'Reach 100 followers on BizTok',                     context: 'global', checkFn: 'empire_followers_gte',        target: 100,     reward: { xp: 100, ap: 50, bpXp: 15, cash: 3000 } },
  { id: 'empire-followers-1k',    title: 'Influencer',             description: 'Reach 1,000 followers',                             context: 'global', checkFn: 'empire_followers_gte',        target: 1000,    reward: { xp: 300, ap: 150, bpXp: 40, cash: 20000 } },
  { id: 'empire-first-call',      title: 'Market Oracle',          description: 'Make your first market call',                       context: 'global', checkFn: 'empire_calls_gte',            target: 1,       reward: { xp: 75, ap: 30, bpXp: 10, cash: 2000 } },
  { id: 'empire-correct-5',       title: 'Prophet',                description: 'Make 5 correct market calls',                       context: 'global', checkFn: 'empire_correct_calls_gte',    target: 5,       reward: { xp: 250, ap: 125, bpXp: 35, cash: 15000 } },
  { id: 'empire-open-10-packs',   title: 'Collector',              description: 'Open 10 card packs',                                context: 'global', checkFn: 'empire_packs_gte',            target: 10,      reward: { xp: 100, ap: 50, bpXp: 15, cash: 5000 } },
  { id: 'empire-dept-project',    title: 'Department Head',        description: 'Complete a department project',                     context: 'global', checkFn: 'empire_dept_projects_gte',    target: 1,       reward: { xp: 100, ap: 50, bpXp: 15, cash: 5000 } },
  { id: 'empire-luxury-buy',      title: 'The Good Life',          description: 'Purchase your first luxury item',                   context: 'global', checkFn: 'empire_luxury_gte',           target: 1,       reward: { xp: 100, ap: 50, bpXp: 15, cash: 3000 } },
  { id: 'empire-rnd-complete',    title: 'Innovator',              description: 'Complete an R&D project',                           context: 'global', checkFn: 'empire_rnd_gte',              target: 1,       reward: { xp: 150, ap: 75, bpXp: 20, cash: 8000 } },
  { id: 'empire-politics-1',      title: 'Lobbyist',               description: 'Reach political tier 1',                            context: 'global', checkFn: 'empire_political_tier_gte',   target: 1,       reward: { xp: 100, ap: 50, bpXp: 15, cash: 5000 } },
  { id: 'empire-shadow-1',        title: 'Shadow Agent',           description: 'Complete your first shadow operation',              context: 'global', checkFn: 'empire_shadow_ops_gte',       target: 1,       reward: { xp: 150, ap: 75, bpXp: 20, cash: 8000 } },
  { id: 'empire-sports-team',     title: 'Team Owner',             description: 'Purchase a sports franchise',                       context: 'global', checkFn: 'empire_sports_teams_gte',     target: 1,       reward: { xp: 200, ap: 100, bpXp: 30, cash: 15000 } },
  { id: 'empire-bp-tier-10',      title: 'Pass Grinder',           description: 'Reach Battle Pass tier 10',                         context: 'global', checkFn: 'empire_bp_tier_gte',          target: 10,      reward: { xp: 150, ap: 75, bpXp: 20, cash: 8000 } },
  { id: 'empire-daily-streak-3',  title: 'Consistent',             description: 'Maintain a 3-day daily mission streak',             context: 'global', checkFn: 'empire_streak_gte',           target: 3,       reward: { xp: 100, ap: 50, bpXp: 15, cash: 3000 } },
  { id: 'empire-daily-streak-7',  title: 'Dedicated',              description: 'Maintain a 7-day daily mission streak',             context: 'global', checkFn: 'empire_streak_gte',           target: 7,       reward: { xp: 250, ap: 125, bpXp: 35, cash: 10000 } },
];

// ── Helpers ────────────────────────────────────────────────────────

export const ALL_MISSIONS: Mission[] = [...LAB_MISSIONS, ...REPLAY_MISSIONS, ...EMPIRE_MISSIONS];

export function getMissionsByContext(context: MissionContext): Mission[] {
  return ALL_MISSIONS.filter((m) => m.context === context);
}

export function getMissionById(id: string): Mission | undefined {
  return ALL_MISSIONS.find((m) => m.id === id);
}
