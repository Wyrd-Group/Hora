/**
 * foundationsStore.ts — Persisted state for the F0 Foundations track.
 *
 * Responsibilities:
 *  1. Track which gameplay features the player has unlocked by passing F0 exams.
 *  2. Keep a ledger of rewards already granted per course (avoids double-pay on
 *     retakes).
 *  3. Expose a single `grantExamRewards()` action called by curriculumStore
 *     when an F0 exam is passed — it wires into empireStore (cash) and
 *     cardEconomyStore (Aegis Points + pack grant).
 *
 * Feature-flag reads (`isUnlocked(feature)`) are the runtime gate any in-game
 * panel should use to decide whether to render the full feature or a teaser.
 */

import { createPersistedStore } from './createPersistedStore';
import { eventBridge } from '../lib/eventBridge';
import {
  FOUNDATION_UNLOCKS,
  getUnlockForCourse,
  rewardForExam,
  type FeatureFlag,
  type RewardPayload,
} from '../lib/foundationsUnlocks';
import { useEmpireStore } from './empireStore';
import { useCardEconomyStore } from './cardEconomyStore';

// ── Events emitted by this store ───────────────────────────────

export const FOUNDATION_EVENTS = {
  FEATURE_UNLOCKED: 'foundations:featureUnlocked',
  REWARDS_GRANTED:  'foundations:rewardsGranted',
} as const;

// ── Types ──────────────────────────────────────────────────────

export interface GrantedReward extends RewardPayload {
  courseId: string;
  tier: string;
  score: number;
  grantedAt: number;
}

interface FoundationsState {
  /** Feature flags unlocked by passing the corresponding F0 exam. */
  unlockedFeatures: FeatureFlag[];
  /** Course IDs whose rewards have already been paid out. */
  rewardedCourseIds: string[];
  /** Full ledger of reward grants (for Empire history UI + audit). */
  grantHistory: GrantedReward[];

  // ── actions ──
  grantExamRewards: (
    courseId: string,
    score: number,
    passed: boolean,
  ) => GrantedReward | null;
  /** Imperative unlock — used by dev tools / achievement overrides. */
  forceUnlock: (feature: FeatureFlag) => void;
  /** Reset everything (for dev tools and tests). */
  resetFoundations: () => void;
  // ── selectors ──
  isUnlocked: (feature: FeatureFlag) => boolean;
  hasReceivedReward: (courseId: string) => boolean;
  unlockProgress: () => { unlocked: number; total: number; pct: number };
}

// ── Store ─────────────────────────────────────────────────────

export const useFoundationsStore = createPersistedStore<FoundationsState>(
  'foundations',
  (set, get) => ({
    unlockedFeatures: [],
    rewardedCourseIds: [],
    grantHistory: [],

    grantExamRewards: (courseId, score, passed) => {
      const unlock = getUnlockForCourse(courseId);
      if (!unlock) return null; // not an F0 course

      const state = get();
      const alreadyPaid = state.rewardedCourseIds.includes(courseId);
      const reward = rewardForExam(score, passed);

      // Unlock the feature on pass (whether or not rewards fire — idempotent).
      if (passed && !state.unlockedFeatures.includes(unlock.feature)) {
        set({ unlockedFeatures: [...state.unlockedFeatures, unlock.feature] });
        eventBridge.emit(FOUNDATION_EVENTS.FEATURE_UNLOCKED, {
          feature: unlock.feature,
          courseId,
          label: unlock.featureLabel,
        });
      }

      // First pass → full payout.  Retakes at higher tier → pay the *delta*.
      if (!passed) return null;
      if (alreadyPaid) {
        // Pay the upgrade differential if the player cleared a higher tier.
        const prior = state.grantHistory
          .filter(g => g.courseId === courseId)
          .sort((a, b) => b.score - a.score)[0];
        if (!prior || score <= prior.score) return null;
        const deltaCash  = reward.cash        - prior.cash;
        const deltaAP    = reward.aegisPoints - prior.aegisPoints;
        // Only emit a grant if there is a positive delta (cash OR ap OR new pack).
        const newPack    = reward.packId && !prior.packId ? reward.packId : null;
        if (deltaCash <= 0 && deltaAP <= 0 && !newPack) return null;

        dispatchPayout({ cash: deltaCash, aegisPoints: deltaAP, packId: newPack });
        const granted: GrantedReward = {
          courseId,
          tier: distinctionFromScore(score),
          score,
          cash: deltaCash,
          aegisPoints: deltaAP,
          packId: newPack,
          grantedAt: Date.now(),
        };
        set({ grantHistory: [...state.grantHistory, granted] });
        eventBridge.emit(FOUNDATION_EVENTS.REWARDS_GRANTED, granted);
        return granted;
      }

      // First-time pass.
      dispatchPayout(reward);
      const granted: GrantedReward = {
        courseId,
        tier: distinctionFromScore(score),
        score,
        ...reward,
        grantedAt: Date.now(),
      };
      set({
        rewardedCourseIds: [...state.rewardedCourseIds, courseId],
        grantHistory: [...state.grantHistory, granted],
      });
      eventBridge.emit(FOUNDATION_EVENTS.REWARDS_GRANTED, granted);
      return granted;
    },

    forceUnlock: (feature) => {
      const state = get();
      if (state.unlockedFeatures.includes(feature)) return;
      set({ unlockedFeatures: [...state.unlockedFeatures, feature] });
      eventBridge.emit(FOUNDATION_EVENTS.FEATURE_UNLOCKED, { feature, courseId: null, label: feature });
    },

    resetFoundations: () => {
      set({ unlockedFeatures: [], rewardedCourseIds: [], grantHistory: [] });
    },

    isUnlocked: (feature) => get().unlockedFeatures.includes(feature),
    hasReceivedReward: (courseId) => get().rewardedCourseIds.includes(courseId),

    unlockProgress: () => {
      const total = FOUNDATION_UNLOCKS.length;
      const unlocked = get().unlockedFeatures.length;
      return { unlocked, total, pct: Math.round((unlocked / total) * 100) };
    },
  }),
);

// ── Helpers ────────────────────────────────────────────────────

function distinctionFromScore(pct: number): string {
  if (pct >= 95) return 'High Distinction';
  if (pct >= 90) return 'Distinction';
  if (pct >= 80) return 'Merit';
  if (pct >= 70) return 'Pass';
  return 'Fail';
}

/**
 * Push a reward payload into the appropriate wallets.
 * Pure side-effect helper — never fails; clamps negatives to 0.
 */
function dispatchPayout(payload: RewardPayload) {
  const cash = Math.max(0, Math.round(payload.cash || 0));
  const ap   = Math.max(0, Math.round(payload.aegisPoints || 0));

  if (cash > 0) {
    // Credit the player's personal wallet.  We use setState directly so this
    // works in both app code and in node-side tests without needing an empire
    // action to exist.
    useEmpireStore.setState(s => ({ personalBalance: (s.personalBalance ?? 0) + cash }));
  }

  if (ap > 0) {
    useCardEconomyStore.getState().awardAegisPoints(ap, 'foundations_reward');
  }

  if (payload.packId) {
    // openPack pays in AP; we pre-funded above, so this should succeed.
    try { useCardEconomyStore.getState().openPack(payload.packId); } catch { /* ignore */ }
  }
}
