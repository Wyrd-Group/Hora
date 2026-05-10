/**
 * Foundations track tests — covers the F0 gate/reward pipeline end-to-end.
 *
 *  1. foundationsUnlocks.ts — tier math, reward scaling, prereq chain.
 *  2. foundationsStore.ts   — first-pass payout, retake deltas, feature
 *                             unlock emission, cross-store wiring
 *                             (empireStore cash, cardEconomyStore AP).
 *  3. curriculumStore hand-off — recordExamResult must trigger
 *                                grantExamRewards for any F0 course.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  FOUNDATION_UNLOCKS,
  ALL_FEATURES,
  getUnlockForCourse,
  getUnlockForFeature,
  isFoundationCourse,
  rewardForExam,
  scoreToTier,
  prereqsForCourse,
} from '../lib/foundationsUnlocks';

import { useFoundationsStore, FOUNDATION_EVENTS } from '../store/foundationsStore';
import { useCurriculumStore } from '../store/curriculumStore';
import { useEmpireStore } from '../store/empireStore';
import { useCardEconomyStore } from '../store/cardEconomyStore';
import { eventBridge } from '../lib/eventBridge';

// ── Shared reset ────────────────────────────────────────────────

function resetAll() {
  useFoundationsStore.getState().resetFoundations();
  useCurriculumStore.setState({
    currentCourseId: null,
    currentLessonIndex: 0,
    completedLessons: [],
    quizScores: {},
    examResults: {},
    certificates: [],
    notebook: [],
    ttsActive: false,
    ecflBand: null,
  });
  useEmpireStore.setState({ personalBalance: 0 });
  useCardEconomyStore.setState({
    aegisPoints: 100000, // plenty of headroom so openPack('STUDY') succeeds
    totalAegisPointsEarned: 100000,
    ownedCards: {},
    pityCounter: 0,
    marketplaceListings: [],
  });
}

beforeEach(resetAll);

// ═══════════════════════════════════════════════════════════════════
// 1. foundationsUnlocks — pure functions
// ═══════════════════════════════════════════════════════════════════

describe('foundationsUnlocks — shape', () => {
  it('has exactly 10 F0 unlocks', () => {
    expect(FOUNDATION_UNLOCKS).toHaveLength(10);
  });

  it('every unlock has a unique courseId', () => {
    const ids = FOUNDATION_UNLOCKS.map(u => u.courseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every unlock has a unique feature flag', () => {
    const feats = FOUNDATION_UNLOCKS.map(u => u.feature);
    expect(new Set(feats).size).toBe(feats.length);
  });

  it('orders are 1..10 contiguous', () => {
    const orders = FOUNDATION_UNLOCKS.map(u => u.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('ALL_FEATURES matches the unlock list 1:1', () => {
    expect(ALL_FEATURES.sort()).toEqual(FOUNDATION_UNLOCKS.map(u => u.feature).sort());
  });
});

describe('foundationsUnlocks — lookup helpers', () => {
  it('getUnlockForCourse returns the matching unlock', () => {
    const u = getUnlockForCourse('f0-money-earning');
    expect(u?.feature).toBe('incomeTracker');
  });

  it('getUnlockForCourse returns undefined for non-F0 course', () => {
    expect(getUnlockForCourse('course-financial-awareness')).toBeUndefined();
  });

  it('getUnlockForFeature returns the matching unlock', () => {
    expect(getUnlockForFeature('markets')?.courseId).toBe('f0-markets-investing');
  });

  it('getUnlockForFeature supplies display strings for every feature (FeatureTeaser contract)', () => {
    for (const u of FOUNDATION_UNLOCKS) {
      const found = getUnlockForFeature(u.feature);
      expect(found).toBeDefined();
      expect(found!.featureLabel.length).toBeGreaterThan(0);
      expect(found!.featureDescription.length).toBeGreaterThan(10);
      expect(found!.courseId).toMatch(/^f0-/);
      expect(found!.order).toBeGreaterThanOrEqual(1);
      expect(found!.order).toBeLessThanOrEqual(10);
    }
  });

  it('isFoundationCourse matches every F0 id', () => {
    for (const u of FOUNDATION_UNLOCKS) {
      expect(isFoundationCourse(u.courseId)).toBe(true);
    }
  });

  it('isFoundationCourse is false for F1+ ids', () => {
    expect(isFoundationCourse('course-financial-awareness')).toBe(false);
    expect(isFoundationCourse('nonexistent')).toBe(false);
  });
});

describe('foundationsUnlocks — scoreToTier', () => {
  it.each([
    [100, 'High Distinction'],
    [95, 'High Distinction'],
    [94, 'Distinction'],
    [90, 'Distinction'],
    [89, 'Merit'],
    [80, 'Merit'],
    [79, 'Pass'],
    [70, 'Pass'],
    [69, 'Pass'], // still classified as 'Pass' tier even if below passing gate
    [0,  'Pass'],
  ])('scoreToTier(%i) = %s', (score, tier) => {
    expect(scoreToTier(score)).toBe(tier);
  });
});

describe('foundationsUnlocks — rewardForExam', () => {
  it('returns zero payout on fail', () => {
    expect(rewardForExam(65, false)).toEqual({ cash: 0, aegisPoints: 0, packId: null });
  });

  it('Pass tier pays the base reward (no pack)', () => {
    const r = rewardForExam(75, true);
    expect(r.cash).toBe(2500);
    expect(r.aegisPoints).toBe(120);
    expect(r.packId).toBeNull();
  });

  it('Merit tier pays 1.5x (no pack)', () => {
    const r = rewardForExam(85, true);
    expect(r.cash).toBe(Math.round(2500 * 1.5));
    expect(r.aegisPoints).toBe(Math.round(120 * 1.5));
    expect(r.packId).toBeNull();
  });

  it('Distinction tier pays 2.25x and grants a STUDY pack', () => {
    const r = rewardForExam(92, true);
    expect(r.cash).toBe(Math.round(2500 * 2.25));
    expect(r.aegisPoints).toBe(Math.round(120 * 2.25));
    expect(r.packId).toBe('STUDY');
  });

  it('High Distinction tier pays 3x and grants a STUDY pack', () => {
    const r = rewardForExam(98, true);
    expect(r.cash).toBe(2500 * 3);
    expect(r.aegisPoints).toBe(120 * 3);
    expect(r.packId).toBe('STUDY');
  });

  it('cash scales strictly monotonic across tiers', () => {
    const p = rewardForExam(70, true).cash;
    const m = rewardForExam(80, true).cash;
    const d = rewardForExam(90, true).cash;
    const hd = rewardForExam(95, true).cash;
    expect(p).toBeLessThan(m);
    expect(m).toBeLessThan(d);
    expect(d).toBeLessThan(hd);
  });
});

describe('foundationsUnlocks — prereqs', () => {
  it('first course has no prereqs', () => {
    expect(prereqsForCourse('f0-money-earning')).toEqual([]);
  });

  it('nth course has n-1 prereqs matching order', () => {
    const last = FOUNDATION_UNLOCKS.find(u => u.order === 10)!;
    const chain = prereqsForCourse(last.courseId);
    expect(chain).toHaveLength(9);
  });

  it('prereqs are all real F0 courses', () => {
    const chain = prereqsForCourse('f0-scams-protection');
    for (const id of chain) {
      expect(isFoundationCourse(id)).toBe(true);
    }
  });

  it('unknown course returns empty chain', () => {
    expect(prereqsForCourse('not-a-course')).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. foundationsStore — grant flow, retakes, unlocks
// ═══════════════════════════════════════════════════════════════════

describe('foundationsStore — grantExamRewards (first pass)', () => {
  it('no-ops for a non-F0 course', () => {
    const g = useFoundationsStore.getState().grantExamRewards('course-financial-awareness', 95, true);
    expect(g).toBeNull();
    expect(useFoundationsStore.getState().grantHistory).toHaveLength(0);
  });

  it('on pass: unlocks the feature, credits cash & AP, records grant', () => {
    const before = useEmpireStore.getState().personalBalance;
    const g = useFoundationsStore.getState().grantExamRewards('f0-money-earning', 92, true);

    expect(g).not.toBeNull();
    expect(g!.cash).toBe(Math.round(2500 * 2.25));
    expect(useFoundationsStore.getState().unlockedFeatures).toContain('incomeTracker');
    expect(useFoundationsStore.getState().rewardedCourseIds).toContain('f0-money-earning');
    expect(useFoundationsStore.getState().grantHistory).toHaveLength(1);
    expect(useEmpireStore.getState().personalBalance).toBe(before + g!.cash);
  });

  it('on fail: does not unlock, does not pay, does not record reward', () => {
    const g = useFoundationsStore.getState().grantExamRewards('f0-money-earning', 40, false);
    expect(g).toBeNull();
    expect(useFoundationsStore.getState().unlockedFeatures).toEqual([]);
    expect(useFoundationsStore.getState().rewardedCourseIds).toEqual([]);
    expect(useFoundationsStore.getState().grantHistory).toEqual([]);
    expect(useEmpireStore.getState().personalBalance).toBe(0);
  });

  it('emits FEATURE_UNLOCKED once on first-time pass', () => {
    const handler = vi.fn();
    const unsub = eventBridge.on(FOUNDATION_EVENTS.FEATURE_UNLOCKED, handler);
    useFoundationsStore.getState().grantExamRewards('f0-markets-investing', 80, true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'markets', courseId: 'f0-markets-investing' }),
    );
    unsub();
  });

  it('emits REWARDS_GRANTED on first-time pass', () => {
    const handler = vi.fn();
    const unsub = eventBridge.on(FOUNDATION_EVENTS.REWARDS_GRANTED, handler);
    useFoundationsStore.getState().grantExamRewards('f0-banking-payments', 85, true);
    expect(handler).toHaveBeenCalledTimes(1);
    unsub();
  });
});

describe('foundationsStore — retakes', () => {
  function pass(courseId: string, score: number) {
    return useFoundationsStore.getState().grantExamRewards(courseId, score, true);
  }

  it('second pass at the same score pays nothing extra', () => {
    pass('f0-money-earning', 75);
    const balanceAfterFirst = useEmpireStore.getState().personalBalance;
    const g2 = pass('f0-money-earning', 75);
    expect(g2).toBeNull();
    expect(useEmpireStore.getState().personalBalance).toBe(balanceAfterFirst);
  });

  it('retake at a lower score pays nothing extra', () => {
    pass('f0-money-earning', 90);
    const balanceAfterFirst = useEmpireStore.getState().personalBalance;
    const g2 = pass('f0-money-earning', 75);
    expect(g2).toBeNull();
    expect(useEmpireStore.getState().personalBalance).toBe(balanceAfterFirst);
  });

  it('retake at a higher tier pays the differential', () => {
    pass('f0-money-earning', 75);     // Pass tier — 2500 cash
    const after1 = useEmpireStore.getState().personalBalance;

    const g2 = pass('f0-money-earning', 95);   // HD — 7500 cash
    expect(g2).not.toBeNull();
    // Delta should be 7500 - 2500 = 5000
    expect(g2!.cash).toBe(7500 - 2500);
    expect(useEmpireStore.getState().personalBalance).toBe(after1 + g2!.cash);
  });

  it('retake from Merit→Distinction grants a STUDY pack (new pack, positive delta)', () => {
    pass('f0-money-earning', 85);     // Merit — no pack
    const g2 = pass('f0-money-earning', 92);   // Distinction — pack
    expect(g2).not.toBeNull();
    expect(g2!.packId).toBe('STUDY');
  });

  it('feature is only unlocked once, even on repeated passes', () => {
    pass('f0-money-earning', 75);
    pass('f0-money-earning', 95);
    const feats = useFoundationsStore.getState().unlockedFeatures.filter(f => f === 'incomeTracker');
    expect(feats).toHaveLength(1);
  });
});

describe('foundationsStore — isUnlocked / progress', () => {
  it('starts with 0/10 unlocked', () => {
    const p = useFoundationsStore.getState().unlockProgress();
    expect(p).toEqual({ unlocked: 0, total: 10, pct: 0 });
  });

  it('5 passes → 50%', () => {
    const { grantExamRewards } = useFoundationsStore.getState();
    grantExamRewards('f0-money-earning', 80, true);
    grantExamRewards('f0-spending-budgeting', 80, true);
    grantExamRewards('f0-saving-emergency', 80, true);
    grantExamRewards('f0-debt-credit', 80, true);
    grantExamRewards('f0-banking-payments', 80, true);
    const p = useFoundationsStore.getState().unlockProgress();
    expect(p.unlocked).toBe(5);
    expect(p.pct).toBe(50);
  });

  it('forceUnlock bypasses the exam flow', () => {
    useFoundationsStore.getState().forceUnlock('retirement');
    expect(useFoundationsStore.getState().isUnlocked('retirement')).toBe(true);
  });

  it('forceUnlock is idempotent', () => {
    const { forceUnlock } = useFoundationsStore.getState();
    forceUnlock('retirement');
    forceUnlock('retirement');
    const feats = useFoundationsStore.getState().unlockedFeatures.filter(f => f === 'retirement');
    expect(feats).toHaveLength(1);
  });

  it('resetFoundations wipes everything', () => {
    useFoundationsStore.getState().grantExamRewards('f0-money-earning', 95, true);
    useFoundationsStore.getState().resetFoundations();
    const s = useFoundationsStore.getState();
    expect(s.unlockedFeatures).toEqual([]);
    expect(s.rewardedCourseIds).toEqual([]);
    expect(s.grantHistory).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. curriculumStore → foundationsStore hand-off
// ═══════════════════════════════════════════════════════════════════

describe('curriculumStore.recordExamResult → foundations', () => {
  it('passing an F0 exam triggers the foundations pipeline', () => {
    useCurriculumStore.getState().recordExamResult('f0-money-earning', 88, 70, {
      totalQuestions: 10,
      correctAnswers: 9,
      band: 'F0',
      courseName: 'Money & Earning',
    });
    expect(useFoundationsStore.getState().isUnlocked('incomeTracker')).toBe(true);
    expect(useFoundationsStore.getState().rewardedCourseIds).toContain('f0-money-earning');
  });

  it('failing an F0 exam still records the failed attempt but does not unlock', () => {
    useCurriculumStore.getState().recordExamResult('f0-money-earning', 40, 70, {
      totalQuestions: 10,
      correctAnswers: 4,
      band: 'F0',
    });
    expect(useCurriculumStore.getState().examResults['f0-money-earning']?.passed).toBe(false);
    expect(useFoundationsStore.getState().isUnlocked('incomeTracker')).toBe(false);
  });

  it('non-F0 exam does NOT touch foundationsStore', () => {
    useCurriculumStore.getState().recordExamResult('course-financial-awareness', 95, 70, {
      band: 'F1',
    });
    expect(useFoundationsStore.getState().unlockedFeatures).toEqual([]);
    expect(useFoundationsStore.getState().grantHistory).toEqual([]);
  });

  it('certificate is created and band advances to F0 after an F0 pass', () => {
    useCurriculumStore.getState().recordExamResult('f0-money-earning', 95, 70, {
      band: 'F0',
      courseName: 'Money & Earning',
    });
    const certs = useCurriculumStore.getState().certificates;
    expect(certs).toHaveLength(1);
    expect(certs[0].band).toBe('F0');
    expect(useCurriculumStore.getState().ecflBand).toBe('F0');
  });
});
