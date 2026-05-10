import { createPersistedStore } from './createPersistedStore';
import { eventBridge, EVENTS } from '../lib/eventBridge';
import type {
  FollowerSnapshot,
  InfluencerTier,
  Sponsorship,
  MarketCall,
} from '../types/social';

// ── Constants ────────────────────────────────────────────────────────
const MIN_FOLLOWERS = 10;
const MAX_HISTORY = 500;
const MAX_CALLS = 50;
const CREDIBILITY_CORRECT = 5;
const CREDIBILITY_WRONG = 8;

// ── Tier thresholds ──────────────────────────────────────────────────
const TIER_THRESHOLDS: { min: number; tier: InfluencerTier }[] = [
  { min: 100_000, tier: 'mega' },
  { min: 10_000,  tier: 'macro' },
  { min: 1_000,   tier: 'mid' },
  { min: 100,     tier: 'micro' },
  { min: 0,       tier: 'unknown' },
];

function tierFromFollowers(f: number): InfluencerTier {
  for (const t of TIER_THRESHOLDS) {
    if (f >= t.min) return t.tier;
  }
  return 'unknown';
}

// ── Verification requirements ────────────────────────────────────────
const VERIFICATION_REQUIREMENTS = {
  minFollowers: 1_000,
  minCredibility: 70,
  minActivityDays: 30,
};

// ── State shape ──────────────────────────────────────────────────────
interface SocialExtState {
  followers: number;
  followerHistory: FollowerSnapshot[];
  credibility: number;
  influencerTier: InfluencerTier;
  isVerified: boolean;
  sponsorships: Sponsorship[];
  marketCalls: MarketCall[];
  totalCallsMade: number;
  correctCalls: number;
  accountCreatedAt: number;

  // Actions
  addFollowers: (count: number) => void;
  removeFollowers: (count: number) => void;
  calculateTier: () => InfluencerTier;
  addSponsorship: (sponsorship: Sponsorship) => void;
  removeSponsorship: (id: string) => void;
  getSponsorshipIncome: () => number;
  createMarketCall: (call: Omit<MarketCall, 'id' | 'resolved' | 'correct'>) => void;
  resolveMarketCall: (callId: string, currentPrice: number) => void;
  getCredibility: () => number;
  checkVerification: () => { eligible: boolean; progress: { followers: number; credibility: number; activityDays: number } };
  verify: () => boolean;
}

export const useSocialExtStore = createPersistedStore<SocialExtState>(
  'social-ext',
  (set, get) => ({
    followers: 0,
    followerHistory: [],
    credibility: 50,
    influencerTier: 'unknown',
    isVerified: false,
    sponsorships: [],
    marketCalls: [],
    totalCallsMade: 0,
    correctCalls: 0,
    accountCreatedAt: Date.now(),

    addFollowers: (count: number) => {
      if (count <= 0) return;
      const rounded = Math.round(count);
      set((s) => {
        const newTotal = s.followers + rounded;
        const snapshot: FollowerSnapshot = {
          count: newTotal,
          timestamp: Date.now(),
        };
        const history = [...s.followerHistory, snapshot].slice(-MAX_HISTORY);
        const tier = tierFromFollowers(newTotal);
        return {
          followers: newTotal,
          followerHistory: history,
          influencerTier: tier,
        };
      });
      eventBridge.emit(EVENTS.FOLLOWER_CHANGE, { followers: get().followers, delta: rounded });
    },

    removeFollowers: (count: number) => {
      if (count <= 0) return;
      const rounded = Math.round(count);
      set((s) => {
        const newTotal = Math.max(MIN_FOLLOWERS, s.followers - rounded);
        const snapshot: FollowerSnapshot = {
          count: newTotal,
          timestamp: Date.now(),
        };
        const history = [...s.followerHistory, snapshot].slice(-MAX_HISTORY);
        const tier = tierFromFollowers(newTotal);
        return {
          followers: newTotal,
          followerHistory: history,
          influencerTier: tier,
        };
      });
      eventBridge.emit(EVENTS.FOLLOWER_CHANGE, { followers: get().followers, delta: -rounded });
    },

    calculateTier: () => {
      const tier = tierFromFollowers(get().followers);
      set({ influencerTier: tier });
      return tier;
    },

    addSponsorship: (sponsorship: Sponsorship) => {
      const s = get();
      if (!s.isVerified) return;
      set({ sponsorships: [...s.sponsorships, sponsorship] });
    },

    removeSponsorship: (id: string) => {
      set((s) => ({
        sponsorships: s.sponsorships.filter((sp) => sp.id !== id),
      }));
    },

    getSponsorshipIncome: () => {
      const s = get();
      const now = Date.now();
      return s.sponsorships
        .filter((sp) => sp.expiresAt > now)
        .reduce((sum, sp) => sum + (sp.cpmRate * s.followers) / 1000, 0);
    },

    createMarketCall: (call) => {
      const id = `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const fullCall: MarketCall = {
        ...call,
        id,
        resolved: false,
      };
      set((s) => ({
        marketCalls: [...s.marketCalls.slice(-MAX_CALLS), fullCall],
        totalCallsMade: s.totalCallsMade + 1,
      }));
    },

    resolveMarketCall: (callId: string, currentPrice: number) => {
      set((s) => {
        const calls = s.marketCalls.map((c) => {
          if (c.id !== callId || c.resolved) return c;
          const isCorrect =
            (c.direction === 'bullish' && currentPrice > c.priceAtCreation) ||
            (c.direction === 'bearish' && currentPrice < c.priceAtCreation);
          return {
            ...c,
            resolved: true,
            correct: isCorrect,
            priceAtResolution: currentPrice,
          };
        });

        // Recalculate credibility based on the resolution
        const justResolved = calls.find((c) => c.id === callId && c.resolved);
        const credDelta = justResolved?.correct ? CREDIBILITY_CORRECT : -CREDIBILITY_WRONG;
        const newCredibility = Math.max(0, Math.min(100, s.credibility + credDelta));
        const newCorrect = justResolved?.correct ? s.correctCalls + 1 : s.correctCalls;

        return {
          marketCalls: calls,
          credibility: newCredibility,
          correctCalls: newCorrect,
        };
      });
    },

    getCredibility: () => get().credibility,

    checkVerification: () => {
      const s = get();
      const ageDays = (Date.now() - s.accountCreatedAt) / 86_400_000;
      return {
        eligible:
          s.followers >= VERIFICATION_REQUIREMENTS.minFollowers &&
          s.credibility >= VERIFICATION_REQUIREMENTS.minCredibility &&
          ageDays >= VERIFICATION_REQUIREMENTS.minActivityDays,
        progress: {
          followers: Math.min(100, Math.round((s.followers / VERIFICATION_REQUIREMENTS.minFollowers) * 100)),
          credibility: Math.min(100, Math.round((s.credibility / VERIFICATION_REQUIREMENTS.minCredibility) * 100)),
          activityDays: Math.min(100, Math.round((ageDays / VERIFICATION_REQUIREMENTS.minActivityDays) * 100)),
        },
      };
    },

    verify: () => {
      const s = get();
      const { eligible } = s.checkVerification();
      if (!eligible) return false;
      set({ isVerified: true });
      return true;
    },
  }),
);
