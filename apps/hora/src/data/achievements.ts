/**
 * achievements.ts — Persistent career trophies.
 * Tracked across sessions; never reset. Organized by category.
 */

export type AchievementCategory =
  | 'trading'
  | 'empire'
  | 'academy'
  | 'social'
  | 'collection'
  | 'special';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  checkKey: string;       // key in the cumulative stats
  target: number;
  reward: { ap: number; bpXp: number };
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

export const TIER_COLORS: Record<string, string> = {
  bronze:   '#CD7F32',
  silver:   '#C0C0C0',
  gold:     '#FFD700',
  platinum: '#E5E4E2',
  diamond:  '#B9F2FF',
};

// ── Achievement Definitions ───────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  // ── Trading ──
  { id: 'first-trade',       title: 'First Steps',         description: 'Execute your first trade',                       icon: '⇄', category: 'trading',    checkKey: 'total_trades',          target: 1,      reward: { ap: 25, bpXp: 10 },  tier: 'bronze' },
  { id: 'trade-10',          title: 'Getting Started',     description: 'Execute 10 trades',                              icon: '⇄', category: 'trading',    checkKey: 'total_trades',          target: 10,     reward: { ap: 50, bpXp: 20 },  tier: 'bronze' },
  { id: 'trade-50',          title: 'Active Trader',       description: 'Execute 50 trades',                              icon: '⇄', category: 'trading',    checkKey: 'total_trades',          target: 50,     reward: { ap: 100, bpXp: 40 }, tier: 'silver' },
  { id: 'trade-200',         title: 'Market Veteran',      description: 'Execute 200 trades',                             icon: '⇄', category: 'trading',    checkKey: 'total_trades',          target: 200,    reward: { ap: 250, bpXp: 80 }, tier: 'gold' },
  { id: 'trade-1000',        title: 'Wall Street Legend',  description: 'Execute 1,000 trades',                           icon: '⇄', category: 'trading',    checkKey: 'total_trades',          target: 1000,   reward: { ap: 500, bpXp: 150 },tier: 'diamond' },
  { id: 'profit-1k',         title: 'Penny Earned',        description: 'Earn $1,000 total profit',                       icon: '▲', category: 'trading',    checkKey: 'total_profit',          target: 1000,   reward: { ap: 50, bpXp: 15 },  tier: 'bronze' },
  { id: 'profit-10k',        title: 'Five Figures',        description: 'Earn $10,000 total profit',                      icon: '▲', category: 'trading',    checkKey: 'total_profit',          target: 10000,  reward: { ap: 100, bpXp: 30 }, tier: 'silver' },
  { id: 'profit-100k',       title: 'Six Figures',         description: 'Earn $100,000 total profit',                     icon: '▲', category: 'trading',    checkKey: 'total_profit',          target: 100000, reward: { ap: 300, bpXp: 80 }, tier: 'gold' },
  { id: 'profit-1m',         title: 'Millionaire Trader',  description: 'Earn $1,000,000 total profit',                   icon: '▲', category: 'trading',    checkKey: 'total_profit',          target: 1000000,reward: { ap: 1000, bpXp: 250 },tier: 'platinum' },
  { id: 'sectors-3',         title: 'Diversifier',         description: 'Trade in 3 different sectors',                   icon: '◎', category: 'trading',    checkKey: 'sectors_traded_ever',   target: 3,      reward: { ap: 75, bpXp: 20 },  tier: 'bronze' },
  { id: 'sectors-all',       title: 'Omnivore',            description: 'Trade in every available sector',                icon: '◎', category: 'trading',    checkKey: 'sectors_traded_ever',   target: 8,      reward: { ap: 200, bpXp: 60 }, tier: 'gold' },

  // ── Empire ──
  { id: 'first-node',        title: 'Landowner',           description: 'Acquire your first business node',               icon: '⊕', category: 'empire',     checkKey: 'total_nodes_acquired',  target: 1,      reward: { ap: 50, bpXp: 15 },  tier: 'bronze' },
  { id: 'nodes-5',           title: 'Portfolio Builder',   description: 'Own 5 business nodes',                           icon: '⊕', category: 'empire',     checkKey: 'total_nodes_acquired',  target: 5,      reward: { ap: 100, bpXp: 30 }, tier: 'silver' },
  { id: 'nodes-20',          title: 'Real Estate Mogul',   description: 'Own 20 business nodes',                          icon: '⊕', category: 'empire',     checkKey: 'total_nodes_acquired',  target: 20,     reward: { ap: 300, bpXp: 80 }, tier: 'gold' },
  { id: 'nodes-50',          title: 'Empire Builder',      description: 'Own 50 business nodes',                          icon: '⊕', category: 'empire',     checkKey: 'total_nodes_acquired',  target: 50,     reward: { ap: 750, bpXp: 200 },tier: 'platinum' },
  { id: 'first-route',       title: 'Connected',           description: 'Establish your first trade route',               icon: '⛓', category: 'empire',     checkKey: 'total_routes',          target: 1,      reward: { ap: 50, bpXp: 15 },  tier: 'bronze' },
  { id: 'routes-10',         title: 'Logistics Network',   description: 'Establish 10 trade routes',                      icon: '⛓', category: 'empire',     checkKey: 'total_routes',          target: 10,     reward: { ap: 200, bpXp: 50 }, tier: 'silver' },
  { id: 'incorporate',       title: 'Incorporated',        description: 'Register a corporate structure',                 icon: '◈', category: 'empire',     checkKey: 'incorporated',          target: 1,      reward: { ap: 100, bpXp: 30 }, tier: 'silver' },
  { id: 'networth-100k',     title: 'Hundred Grand',       description: 'Reach $100,000 net worth',                       icon: '◉', category: 'empire',     checkKey: 'peak_networth',         target: 100000, reward: { ap: 100, bpXp: 30 }, tier: 'bronze' },
  { id: 'networth-1m',       title: 'Millionaire',         description: 'Reach $1,000,000 net worth',                     icon: '◉', category: 'empire',     checkKey: 'peak_networth',         target: 1000000,reward: { ap: 300, bpXp: 80 }, tier: 'gold' },
  { id: 'networth-10m',      title: 'Decamillionaire',     description: 'Reach $10,000,000 net worth',                    icon: '◉', category: 'empire',     checkKey: 'peak_networth',         target: 10000000,reward: { ap: 750, bpXp: 200 },tier: 'platinum' },
  { id: 'networth-100m',     title: 'Tycoon',              description: 'Reach $100,000,000 net worth',                   icon: '◉', category: 'empire',     checkKey: 'peak_networth',         target: 100000000,reward: { ap: 2000, bpXp: 500 },tier: 'diamond' },
  { id: 'employees-10',      title: 'Team Leader',         description: 'Employ 10 agents',                               icon: '♠', category: 'empire',     checkKey: 'total_agents',          target: 10,     reward: { ap: 75, bpXp: 20 },  tier: 'bronze' },
  { id: 'employees-50',      title: 'Executive',           description: 'Employ 50 agents',                               icon: '♠', category: 'empire',     checkKey: 'total_agents',          target: 50,     reward: { ap: 250, bpXp: 60 }, tier: 'gold' },
  { id: 'dept-project-5',    title: 'Department Head',     description: 'Complete 5 department projects',                  icon: '⊡', category: 'empire',     checkKey: 'dept_projects_done',    target: 5,      reward: { ap: 100, bpXp: 30 }, tier: 'silver' },

  // ── Academy ──
  { id: 'first-lesson',      title: 'Student',             description: 'Complete your first lesson',                     icon: '★', category: 'academy',    checkKey: 'total_lessons',         target: 1,      reward: { ap: 25, bpXp: 10 },  tier: 'bronze' },
  { id: 'lessons-10',        title: 'Scholar',             description: 'Complete 10 lessons',                            icon: '★', category: 'academy',    checkKey: 'total_lessons',         target: 10,     reward: { ap: 75, bpXp: 25 },  tier: 'silver' },
  { id: 'lessons-30',        title: 'Academic',            description: 'Complete 30 lessons',                            icon: '★', category: 'academy',    checkKey: 'total_lessons',         target: 30,     reward: { ap: 200, bpXp: 60 }, tier: 'gold' },
  { id: 'first-exam',        title: 'Test Taker',          description: 'Pass your first ECFL exam',                      icon: '♛', category: 'academy',    checkKey: 'total_exams_passed',    target: 1,      reward: { ap: 75, bpXp: 25 },  tier: 'bronze' },
  { id: 'exams-5',           title: 'Certified',           description: 'Pass 5 ECFL exams',                              icon: '♛', category: 'academy',    checkKey: 'total_exams_passed',    target: 5,      reward: { ap: 200, bpXp: 60 }, tier: 'silver' },
  { id: 'exams-all',         title: 'Valedictorian',       description: 'Pass all ECFL exams',                            icon: '♛', category: 'academy',    checkKey: 'total_exams_passed',    target: 12,     reward: { ap: 500, bpXp: 150 },tier: 'gold' },
  { id: 'replay-5',          title: 'Time Traveler',       description: 'Complete 5 replay scenarios',                    icon: '⏱', category: 'academy',    checkKey: 'total_replays',         target: 5,      reward: { ap: 100, bpXp: 30 }, tier: 'silver' },
  { id: 'replay-stars-15',   title: 'Star Student',        description: 'Earn 15 total replay stars',                     icon: '⏱', category: 'academy',    checkKey: 'total_replay_stars',    target: 15,     reward: { ap: 250, bpXp: 75 }, tier: 'gold' },
  { id: 'lab-profit-100k',   title: 'Lab Millionaire',     description: 'Earn $100,000 profit across all Lab sessions',   icon: '⚗', category: 'academy',    checkKey: 'total_lab_profit',      target: 100000, reward: { ap: 300, bpXp: 80 }, tier: 'gold' },

  // ── Social ──
  { id: 'followers-100',     title: 'Rising Star',         description: 'Reach 100 followers',                            icon: '◈', category: 'social',     checkKey: 'peak_followers',        target: 100,    reward: { ap: 50, bpXp: 15 },  tier: 'bronze' },
  { id: 'followers-1k',      title: 'Influencer',          description: 'Reach 1,000 followers',                          icon: '◈', category: 'social',     checkKey: 'peak_followers',        target: 1000,   reward: { ap: 150, bpXp: 40 }, tier: 'silver' },
  { id: 'followers-10k',     title: 'Mega Influencer',     description: 'Reach 10,000 followers',                         icon: '◈', category: 'social',     checkKey: 'peak_followers',        target: 10000,  reward: { ap: 400, bpXp: 100 },tier: 'gold' },
  { id: 'calls-correct-5',   title: 'Oracle',              description: 'Make 5 correct market calls',                    icon: '◆', category: 'social',     checkKey: 'correct_calls',         target: 5,      reward: { ap: 100, bpXp: 30 }, tier: 'silver' },
  { id: 'calls-correct-20',  title: 'Prophet',             description: 'Make 20 correct market calls',                   icon: '◆', category: 'social',     checkKey: 'correct_calls',         target: 20,     reward: { ap: 300, bpXp: 80 }, tier: 'gold' },
  { id: 'verified',          title: 'Verified',            description: 'Earn the verified badge on BizTok',              icon: '✓', category: 'social',     checkKey: 'is_verified',           target: 1,      reward: { ap: 200, bpXp: 50 }, tier: 'gold' },
  { id: 'sponsorships-3',    title: 'Sponsored',           description: 'Secure 3 brand sponsorships',                    icon: '♣', category: 'social',     checkKey: 'total_sponsorships',    target: 3,      reward: { ap: 150, bpXp: 40 }, tier: 'silver' },

  // ── Collection ──
  { id: 'cards-10',          title: 'Collector',           description: 'Own 10 agent cards',                             icon: '♠', category: 'collection', checkKey: 'total_cards_owned',     target: 10,     reward: { ap: 50, bpXp: 15 },  tier: 'bronze' },
  { id: 'cards-50',          title: 'Card Hoarder',        description: 'Own 50 agent cards',                             icon: '♠', category: 'collection', checkKey: 'total_cards_owned',     target: 50,     reward: { ap: 200, bpXp: 50 }, tier: 'silver' },
  { id: 'cards-100',         title: 'Full Roster',         description: 'Own 100 agent cards',                            icon: '♠', category: 'collection', checkKey: 'total_cards_owned',     target: 100,    reward: { ap: 500, bpXp: 120 },tier: 'gold' },
  { id: 'legendary-card',    title: 'Legendary Pull',      description: 'Own a Legendary rarity card',                    icon: '✦', category: 'collection', checkKey: 'owns_legendary',        target: 1,      reward: { ap: 200, bpXp: 50 }, tier: 'gold' },
  { id: 'packs-10',          title: 'Pack Addict',         description: 'Open 10 card packs',                             icon: '⊡', category: 'collection', checkKey: 'total_packs_opened',    target: 10,     reward: { ap: 75, bpXp: 20 },  tier: 'bronze' },
  { id: 'packs-50',          title: 'Pack Rat',            description: 'Open 50 card packs',                             icon: '⊡', category: 'collection', checkKey: 'total_packs_opened',    target: 50,     reward: { ap: 250, bpXp: 60 }, tier: 'silver' },
  { id: 'luxury-1',          title: 'Luxury Life',         description: 'Purchase your first luxury item',                icon: '♦', category: 'collection', checkKey: 'luxury_items_owned',    target: 1,      reward: { ap: 75, bpXp: 20 },  tier: 'bronze' },
  { id: 'luxury-5',          title: 'Connoisseur',         description: 'Own 5 luxury items',                             icon: '♦', category: 'collection', checkKey: 'luxury_items_owned',    target: 5,      reward: { ap: 250, bpXp: 60 }, tier: 'gold' },

  // ── Special ──
  { id: 'daily-streak-7',    title: 'Weekly Warrior',      description: 'Maintain a 7-day daily mission streak',          icon: '🔥', category: 'special',   checkKey: 'peak_streak',           target: 7,      reward: { ap: 200, bpXp: 50 }, tier: 'silver' },
  { id: 'daily-streak-30',   title: 'Monthly Master',      description: 'Maintain a 30-day daily mission streak',         icon: '🔥', category: 'special',   checkKey: 'peak_streak',           target: 30,     reward: { ap: 1000, bpXp: 250 },tier: 'diamond' },
  { id: 'bp-tier-25',        title: 'Halfway There',       description: 'Reach Battle Pass tier 25',                      icon: '★', category: 'special',    checkKey: 'bp_tier',               target: 25,     reward: { ap: 200, bpXp: 50 }, tier: 'silver' },
  { id: 'bp-tier-50',        title: 'Season Champion',     description: 'Reach Battle Pass tier 50',                      icon: '★', category: 'special',    checkKey: 'bp_tier',               target: 50,     reward: { ap: 500, bpXp: 150 },tier: 'gold' },
  { id: 'athena-25',         title: 'AI Apprentice',       description: 'Ask Athena 25 questions',                        icon: '♦', category: 'special',    checkKey: 'total_athena_queries',  target: 25,     reward: { ap: 75, bpXp: 25 },  tier: 'bronze' },
  { id: 'athena-100',        title: 'AI Whisperer',        description: 'Ask Athena 100 questions',                       icon: '♦', category: 'special',    checkKey: 'total_athena_queries',  target: 100,    reward: { ap: 250, bpXp: 60 }, tier: 'silver' },
  { id: 'shadow-op-1',       title: 'Dark Agent',          description: 'Complete your first shadow operation',           icon: '⚠', category: 'special',    checkKey: 'total_shadow_ops',      target: 1,      reward: { ap: 100, bpXp: 30 }, tier: 'silver' },
  { id: 'shadow-op-10',      title: 'Ghost',               description: 'Complete 10 shadow operations',                  icon: '⚠', category: 'special',    checkKey: 'total_shadow_ops',      target: 10,     reward: { ap: 400, bpXp: 100 },tier: 'gold' },
  { id: 'politics-tier-3',   title: 'Politician',          description: 'Reach political tier 3',                         icon: '⚑', category: 'special',    checkKey: 'political_tier',        target: 3,      reward: { ap: 200, bpXp: 50 }, tier: 'silver' },
  { id: 'sports-team',       title: 'Team Owner',          description: 'Purchase a sports franchise',                    icon: '⚽', category: 'special',    checkKey: 'sports_teams_owned',    target: 1,      reward: { ap: 200, bpXp: 50 }, tier: 'silver' },
];

export const CATEGORIES: { key: AchievementCategory; label: string; color: string }[] = [
  { key: 'trading',    label: 'Trading',    color: '#00e5ff' },
  { key: 'empire',     label: 'Empire',     color: '#10b981' },
  { key: 'academy',    label: 'Academy',    color: '#f59e0b' },
  { key: 'social',     label: 'Social',     color: '#a78bfa' },
  { key: 'collection', label: 'Collection', color: '#ec4899' },
  { key: 'special',    label: 'Special',    color: '#ef4444' },
];
