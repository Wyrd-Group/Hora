// ── Battle Pass Rewards ───────────────────────────────────────────
// 50-tier reward table for the Empire Battle Pass.

export interface TierReward {
  tier: number;
  track: 'free' | 'premium' | 'both';
  type: 'ap' | 'pack' | 'xp' | 'badge' | 'title';
  amount?: number;
  packType?: string;
  label: string;
}

export const TIERS_TOTAL = 50;
export const XP_PER_TIER = 100;
export const PREMIUM_COST = 2500;

export const TIER_REWARDS: TierReward[] = [
  // ── Tier 1-10: Small rewards ───────────────────────────────────
  { tier: 1,  track: 'free',    type: 'ap', amount: 50,  label: '50 AP' },
  { tier: 1,  track: 'premium', type: 'ap', amount: 100, label: '100 AP' },
  { tier: 2,  track: 'free',    type: 'xp',     amount: 50,  label: '50 XP' },
  { tier: 2,  track: 'premium', type: 'ap', amount: 75,  label: '75 AP' },
  { tier: 3,  track: 'free',    type: 'ap', amount: 75,  label: '75 AP' },
  { tier: 3,  track: 'premium', type: 'xp',     amount: 100, label: '100 XP' },
  { tier: 4,  track: 'free',    type: 'xp',     amount: 75,  label: '75 XP' },
  { tier: 4,  track: 'premium', type: 'ap', amount: 100, label: '100 AP' },
  { tier: 5,  track: 'free',    type: 'pack',   packType: 'study', label: 'Study Pack' },
  { tier: 5,  track: 'premium', type: 'pack',   packType: 'study', label: 'Study Pack x2' },
  { tier: 6,  track: 'free',    type: 'ap', amount: 100, label: '100 AP' },
  { tier: 6,  track: 'premium', type: 'xp',     amount: 100, label: '100 XP' },
  { tier: 7,  track: 'free',    type: 'xp',     amount: 100, label: '100 XP' },
  { tier: 7,  track: 'premium', type: 'ap', amount: 150, label: '150 AP' },
  { tier: 8,  track: 'free',    type: 'ap', amount: 100, label: '100 AP' },
  { tier: 8,  track: 'premium', type: 'pack',   packType: 'study', label: 'Study Pack' },
  { tier: 9,  track: 'free',    type: 'xp',     amount: 100, label: '100 XP' },
  { tier: 9,  track: 'premium', type: 'ap', amount: 150, label: '150 AP' },
  { tier: 10, track: 'free',    type: 'pack',   packType: 'study', label: 'Study Pack' },
  { tier: 10, track: 'premium', type: 'pack',   packType: 'standard', label: 'Standard Pack' },

  // ── Tier 11-20: Medium rewards ─────────────────────────────────
  { tier: 11, track: 'free',    type: 'ap', amount: 150, label: '150 AP' },
  { tier: 11, track: 'premium', type: 'ap', amount: 200, label: '200 AP' },
  { tier: 12, track: 'free',    type: 'xp',     amount: 150, label: '150 XP' },
  { tier: 12, track: 'premium', type: 'xp',     amount: 200, label: '200 XP' },
  { tier: 13, track: 'free',    type: 'ap', amount: 200, label: '200 AP' },
  { tier: 13, track: 'premium', type: 'pack',   packType: 'standard', label: 'Standard Pack' },
  { tier: 14, track: 'free',    type: 'xp',     amount: 150, label: '150 XP' },
  { tier: 14, track: 'premium', type: 'ap', amount: 250, label: '250 AP' },
  { tier: 15, track: 'free',    type: 'pack',   packType: 'standard', label: 'Standard Pack' },
  { tier: 15, track: 'premium', type: 'pack',   packType: 'standard', label: 'Standard Pack x2' },
  { tier: 16, track: 'free',    type: 'ap', amount: 200, label: '200 AP' },
  { tier: 16, track: 'premium', type: 'xp',     amount: 250, label: '250 XP' },
  { tier: 17, track: 'free',    type: 'xp',     amount: 200, label: '200 XP' },
  { tier: 17, track: 'premium', type: 'ap', amount: 300, label: '300 AP' },
  { tier: 18, track: 'free',    type: 'ap', amount: 250, label: '250 AP' },
  { tier: 18, track: 'premium', type: 'pack',   packType: 'standard', label: 'Standard Pack' },
  { tier: 19, track: 'free',    type: 'xp',     amount: 200, label: '200 XP' },
  { tier: 19, track: 'premium', type: 'ap', amount: 350, label: '350 AP' },
  { tier: 20, track: 'free',    type: 'pack',   packType: 'standard', label: 'Standard Pack' },
  { tier: 20, track: 'premium', type: 'pack',   packType: 'premium', label: 'Premium Pack' },

  // ── Tier 21-30: Large rewards ──────────────────────────────────
  { tier: 21, track: 'free',    type: 'ap', amount: 300, label: '300 AP' },
  { tier: 21, track: 'premium', type: 'ap', amount: 400, label: '400 AP' },
  { tier: 22, track: 'free',    type: 'xp',     amount: 250, label: '250 XP' },
  { tier: 22, track: 'premium', type: 'xp',     amount: 350, label: '350 XP' },
  { tier: 23, track: 'free',    type: 'ap', amount: 300, label: '300 AP' },
  { tier: 23, track: 'premium', type: 'pack',   packType: 'premium', label: 'Premium Pack' },
  { tier: 24, track: 'free',    type: 'xp',     amount: 250, label: '250 XP' },
  { tier: 24, track: 'premium', type: 'ap', amount: 450, label: '450 AP' },
  { tier: 25, track: 'free',    type: 'pack',   packType: 'premium', label: 'Premium Pack' },
  { tier: 25, track: 'premium', type: 'pack',   packType: 'premium', label: 'Premium Pack x2' },
  { tier: 26, track: 'free',    type: 'ap', amount: 350, label: '350 AP' },
  { tier: 26, track: 'premium', type: 'xp',     amount: 400, label: '400 XP' },
  { tier: 27, track: 'free',    type: 'xp',     amount: 300, label: '300 XP' },
  { tier: 27, track: 'premium', type: 'ap', amount: 500, label: '500 AP' },
  { tier: 28, track: 'free',    type: 'ap', amount: 400, label: '400 AP' },
  { tier: 28, track: 'premium', type: 'pack',   packType: 'premium', label: 'Premium Pack' },
  { tier: 29, track: 'free',    type: 'xp',     amount: 300, label: '300 XP' },
  { tier: 29, track: 'premium', type: 'ap', amount: 550, label: '550 AP' },
  { tier: 30, track: 'free',    type: 'pack',   packType: 'premium', label: 'Premium Pack' },
  { tier: 30, track: 'premium', type: 'pack',   packType: 'elite', label: 'Elite Pack' },

  // ── Tier 31-40: Bigger rewards ─────────────────────────────────
  { tier: 31, track: 'free',    type: 'ap', amount: 400, label: '400 AP' },
  { tier: 31, track: 'premium', type: 'ap', amount: 600, label: '600 AP' },
  { tier: 32, track: 'free',    type: 'xp',     amount: 350, label: '350 XP' },
  { tier: 32, track: 'premium', type: 'xp',     amount: 500, label: '500 XP' },
  { tier: 33, track: 'free',    type: 'ap', amount: 450, label: '450 AP' },
  { tier: 33, track: 'premium', type: 'pack',   packType: 'premium', label: 'Premium Pack' },
  { tier: 34, track: 'free',    type: 'xp',     amount: 350, label: '350 XP' },
  { tier: 34, track: 'premium', type: 'ap', amount: 650, label: '650 AP' },
  { tier: 35, track: 'free',    type: 'pack',   packType: 'premium', label: 'Premium Pack' },
  { tier: 35, track: 'premium', type: 'pack',   packType: 'elite', label: 'Elite Pack' },
  { tier: 36, track: 'free',    type: 'ap', amount: 500, label: '500 AP' },
  { tier: 36, track: 'premium', type: 'xp',     amount: 500, label: '500 XP' },
  { tier: 37, track: 'free',    type: 'xp',     amount: 400, label: '400 XP' },
  { tier: 37, track: 'premium', type: 'ap', amount: 700, label: '700 AP' },
  { tier: 38, track: 'free',    type: 'ap', amount: 550, label: '550 AP' },
  { tier: 38, track: 'premium', type: 'pack',   packType: 'elite', label: 'Elite Pack' },
  { tier: 39, track: 'free',    type: 'xp',     amount: 400, label: '400 XP' },
  { tier: 39, track: 'premium', type: 'ap', amount: 750, label: '750 AP' },
  { tier: 40, track: 'free',    type: 'pack',   packType: 'elite', label: 'Elite Pack' },
  { tier: 40, track: 'premium', type: 'pack',   packType: 'elite', label: 'Elite Pack x2' },

  // ── Tier 41-50: Grand rewards ──────────────────────────────────
  { tier: 41, track: 'free',    type: 'ap', amount: 600, label: '600 AP' },
  { tier: 41, track: 'premium', type: 'ap', amount: 800, label: '800 AP' },
  { tier: 42, track: 'free',    type: 'xp',     amount: 500, label: '500 XP' },
  { tier: 42, track: 'premium', type: 'xp',     amount: 600, label: '600 XP' },
  { tier: 43, track: 'free',    type: 'ap', amount: 650, label: '650 AP' },
  { tier: 43, track: 'premium', type: 'pack',   packType: 'elite', label: 'Elite Pack' },
  { tier: 44, track: 'free',    type: 'xp',     amount: 500, label: '500 XP' },
  { tier: 44, track: 'premium', type: 'ap', amount: 850, label: '850 AP' },
  { tier: 45, track: 'free',    type: 'pack',   packType: 'elite', label: 'Elite Pack' },
  { tier: 45, track: 'premium', type: 'pack',   packType: 'elite', label: 'Elite Pack x2' },
  { tier: 46, track: 'free',    type: 'ap', amount: 700, label: '700 AP' },
  { tier: 46, track: 'premium', type: 'xp',     amount: 700, label: '700 XP' },
  { tier: 47, track: 'free',    type: 'xp',     amount: 600, label: '600 XP' },
  { tier: 47, track: 'premium', type: 'ap', amount: 900, label: '900 AP' },
  { tier: 48, track: 'free',    type: 'ap', amount: 800, label: '800 AP' },
  { tier: 48, track: 'premium', type: 'pack',   packType: 'elite', label: 'Elite Pack' },
  { tier: 49, track: 'free',    type: 'xp',     amount: 700, label: '700 XP' },
  { tier: 49, track: 'premium', type: 'ap', amount: 1000, label: '1000 AP' },
  { tier: 50, track: 'free',    type: 'badge',  label: 'Season Finisher Badge' },
  { tier: 50, track: 'premium', type: 'title',  label: 'Elite Operator Title' },
];
