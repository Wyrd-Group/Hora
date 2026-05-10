/**
 * foundationsUnlocks.ts — F0 course → game-feature gate table.
 *
 * Each F0 Foundations course completion unlocks a slice of game functionality.
 * This module is the single source of truth for that gate mapping.
 *
 * The same table also carries reward tiers (Pass / Merit / Distinction / High
 * Distinction) with payout scaling — cash, Aegis Points, and pack grants that
 * fire when the exam is passed (and grow with the player's score).
 */

import type { DistinctionLevel } from '../types/curriculum';

// ── Public types ────────────────────────────────────────────────

export type FeatureFlag =
  | 'incomeTracker'
  | 'expenseCategorizer'
  | 'savingsVault'
  | 'creditBonds'
  | 'bankAccounts'
  | 'markets'
  | 'insurance'
  | 'retirement'
  | 'taxOptimizer'
  | 'consumerProtection';

export interface FoundationUnlock {
  courseId: string;
  feature: FeatureFlag;
  featureLabel: string;
  featureDescription: string;
  /** What in-game panel / route this feature lives on. */
  location: string;
  /** 1-indexed position in the recommended play order. */
  order: number;
}

export interface RewardPayload {
  cash: number;
  aegisPoints: number;
  packId: string | null;
}

// ── Course → feature map ───────────────────────────────────────

export const FOUNDATION_UNLOCKS: FoundationUnlock[] = [
  {
    courseId: 'f0-money-earning',
    feature: 'incomeTracker',
    featureLabel: 'Income Tracker',
    featureDescription:
      'Salary, freelance, and passive-income lines appear on the Empire dashboard — and feed into net-worth math.',
    location: 'Empire › Dashboard › Income',
    order: 1,
  },
  {
    courseId: 'f0-spending-budgeting',
    feature: 'expenseCategorizer',
    featureLabel: 'Expense Categorizer',
    featureDescription:
      'Unlocks the 50/30/20 budget envelope and categorized expense tracking on the Empire and Desk panels.',
    location: 'Empire › Finances › Budget',
    order: 2,
  },
  {
    courseId: 'f0-saving-emergency',
    feature: 'savingsVault',
    featureLabel: 'Savings Vault',
    featureDescription:
      'Dedicated interest-bearing savings vault with emergency-fund targets and HYSA-style rates.',
    location: 'Empire › Finances › Vaults',
    order: 3,
  },
  {
    courseId: 'f0-debt-credit',
    feature: 'creditBonds',
    featureLabel: 'Credit Lines & Bonds',
    featureDescription:
      'Unlocks borrowing (credit cards, lines of credit), debt amortization, and bond-buying at the Desk.',
    location: 'Desk › Fixed Income',
    order: 4,
  },
  {
    courseId: 'f0-banking-payments',
    feature: 'bankAccounts',
    featureLabel: 'Bank Accounts',
    featureDescription:
      'Full multi-bank system: checking/savings, wire transfers, FX, and the banking relationship meter.',
    location: 'Empire › Banks',
    order: 5,
  },
  {
    courseId: 'f0-markets-investing',
    feature: 'markets',
    featureLabel: 'Market Access',
    featureDescription:
      'Unlocks the Desk trading floor — equities, ETFs, and mutual funds with order-book depth.',
    location: 'Desk › Markets',
    order: 6,
  },
  {
    courseId: 'f0-insurance-risk',
    feature: 'insurance',
    featureLabel: 'Insurance Products',
    featureDescription:
      'Health, life, liability, and asset insurance — shields your empire against world events.',
    location: 'Empire › Risk › Insurance',
    order: 7,
  },
  {
    courseId: 'f0-retirement-longterm',
    feature: 'retirement',
    featureLabel: 'Retirement Planning',
    featureDescription:
      '401(k) / IRA analog with employer match, tax-advantaged compounding, and retire-early calculator.',
    location: 'Empire › Finances › Retirement',
    order: 8,
  },
  {
    courseId: 'f0-taxes-govt',
    feature: 'taxOptimizer',
    featureLabel: 'Tax Optimizer',
    featureDescription:
      'Progressive tax brackets, loss-harvesting UI, and the corporate-structure tax planner.',
    location: 'Office › Tax',
    order: 9,
  },
  {
    courseId: 'f0-scams-protection',
    feature: 'consumerProtection',
    featureLabel: 'Consumer Protection Shield',
    featureDescription:
      'Unlocks scam-detection prompts in the inbox and consumer-rights toolkit. Required to unlock DeFi later.',
    location: 'Empire › Messages › Shield',
    order: 10,
  },
];

// ── Lookup helpers ─────────────────────────────────────────────

const byCourseId = new Map<string, FoundationUnlock>(
  FOUNDATION_UNLOCKS.map(u => [u.courseId, u]),
);

const byFeature = new Map<FeatureFlag, FoundationUnlock>(
  FOUNDATION_UNLOCKS.map(u => [u.feature, u]),
);

export function getUnlockForCourse(courseId: string): FoundationUnlock | undefined {
  return byCourseId.get(courseId);
}

export function getUnlockForFeature(feature: FeatureFlag): FoundationUnlock | undefined {
  return byFeature.get(feature);
}

export function isFoundationCourse(courseId: string): boolean {
  return byCourseId.has(courseId);
}

// ── Reward tiers ───────────────────────────────────────────────
//
// A player who passes at 70 % (Pass) gets the base payout.
// Merit (80 %+), Distinction (90 %+), and High Distinction (95 %+) scale up.
// Distinction & HD additionally grant an Aegis pack.

const TIER_MULTIPLIER: Record<DistinctionLevel, number> = {
  'Pass':              1.0,
  'Merit':             1.5,
  'Distinction':       2.25,
  'High Distinction':  3.0,
};

const BASE_REWARD = {
  cash: 2_500,     // personalBalance grant
  aegisPoints: 120,
};

/**
 * Map a 0–100 exam percentage to a distinction tier.
 * Matches scoreToDistinction() in curriculumStore but redefined here so
 * this module has no circular dependency on the store.
 */
export function scoreToTier(pct: number): DistinctionLevel {
  if (pct >= 95) return 'High Distinction';
  if (pct >= 90) return 'Distinction';
  if (pct >= 80) return 'Merit';
  return 'Pass';
}

/**
 * Compute the reward payload for a graded exam result.
 * Returns zero on a failing score (below the 70 % passing threshold).
 */
export function rewardForExam(score: number, passed: boolean): RewardPayload {
  if (!passed) return { cash: 0, aegisPoints: 0, packId: null };
  const tier = scoreToTier(score);
  const mult = TIER_MULTIPLIER[tier];
  return {
    cash:         Math.round(BASE_REWARD.cash * mult),
    aegisPoints:  Math.round(BASE_REWARD.aegisPoints * mult),
    // Distinction+ earns a Study Pack; Merit and Pass do not. (Study packs
    // are free to open, so we don't pre-fund AP for them.)
    packId: tier === 'Distinction' || tier === 'High Distinction' ? 'STUDY' : null,
  };
}

/** All feature flags — convenient for UI enumerating locked/unlocked state. */
export const ALL_FEATURES: FeatureFlag[] = FOUNDATION_UNLOCKS.map(u => u.feature);

/**
 * Returns the prerequisite chain (all earlier courses in the recommended
 * order) for a given F0 course ID. Empty array for the first course.
 */
export function prereqsForCourse(courseId: string): string[] {
  const u = byCourseId.get(courseId);
  if (!u) return [];
  return FOUNDATION_UNLOCKS
    .filter(x => x.order < u.order)
    .map(x => x.courseId);
}
