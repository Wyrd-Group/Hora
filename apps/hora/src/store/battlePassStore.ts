import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TIERS_TOTAL, XP_PER_TIER } from '../data/battlePassRewards';
import { useAuthStore, selectHasPremiumPass } from './authStore';

// ── Types ─────────────────────────────────────────────────────────
interface BattlePassState {
  currentTier: number;
  bpXp: number;
  xpPerTier: number;
  isPremium: boolean;
  seasonStart: number;
  seasonEnd: number;
  claimedFree: number[];
  claimedPremium: number[];
  totalBpXpEarned: number;

  // Actions
  awardBPXP: (amount: number) => void;
  claimReward: (tier: number, track: 'free' | 'premium') => boolean;
  upgradeToPremium: () => void;
  initSeason: () => void;
  getMaxTier: () => number;
}

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

export const useBattlePassStore = create<BattlePassState>()(
  persist(
    (set, get) => ({
      currentTier: 0,
      bpXp: 0,
      xpPerTier: XP_PER_TIER,
      isPremium: false,
      seasonStart: 0,
      seasonEnd: 0,
      claimedFree: [],
      claimedPremium: [],
      totalBpXpEarned: 0,

      awardBPXP: (amount: number) => {
        set((s) => {
          let newXp = s.bpXp + amount;
          let newTier = s.currentTier;
          const xpNeeded = s.xpPerTier;

          // Auto-advance tiers
          while (newXp >= xpNeeded && newTier < TIERS_TOTAL) {
            newXp -= xpNeeded;
            newTier += 1;
          }

          // Cap at max tier
          if (newTier >= TIERS_TOTAL) {
            newTier = TIERS_TOTAL;
            // Keep overflow XP but don't advance further
          }

          return {
            bpXp: newXp,
            currentTier: newTier,
            totalBpXpEarned: s.totalBpXpEarned + amount,
          };
        });
      },

      claimReward: (tier: number, track: 'free' | 'premium'): boolean => {
        const s = get();

        // Must have reached the tier
        if (tier > s.currentTier) return false;

        // Premium track requires premium (via local flag OR subscription tier 2+)
        const hasPremiumSub = selectHasPremiumPass(useAuthStore.getState());
        if (track === 'premium' && !s.isPremium && !hasPremiumSub) return false;

        const claimedList = track === 'free' ? s.claimedFree : s.claimedPremium;

        // Already claimed
        if (claimedList.includes(tier)) return false;

        set({
          [track === 'free' ? 'claimedFree' : 'claimedPremium']:
            [...claimedList, tier],
        });

        return true;
      },

      upgradeToPremium: () => {
        set({ isPremium: true });
      },

      initSeason: () => {
        const s = get();
        const now = Date.now();

        // Auto-grant premium if subscription tier provides it
        const hasPremiumSub = selectHasPremiumPass(useAuthStore.getState());
        if (hasPremiumSub && !s.isPremium) {
          set({ isPremium: true });
        }

        // If no season exists or season has expired, start fresh
        if (s.seasonStart === 0 || now >= s.seasonEnd) {
          set({
            currentTier: 0,
            bpXp: 0,
            isPremium: hasPremiumSub,
            seasonStart: now,
            seasonEnd: now + SIXTY_DAYS_MS,
            claimedFree: [],
            claimedPremium: [],
            totalBpXpEarned: 0,
          });
        }
      },

      getMaxTier: (): number => {
        const s = get();
        const raw = Math.floor(s.totalBpXpEarned / s.xpPerTier);
        return Math.min(raw, TIERS_TOTAL);
      },
    }),
    {
      name: 'empire-battle-pass',
      version: 1,
    }
  )
);
