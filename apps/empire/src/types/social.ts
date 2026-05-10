// ── Followers & Influencer ──

export interface FollowerSnapshot {
  count: number;
  timestamp: number;
}

export type InfluencerTier = 'unknown' | 'micro' | 'mid' | 'macro' | 'mega';

export interface Sponsorship {
  id: string;
  brand: string;
  cpmRate: number;       // € per 1000 followers per month
  startedAt: number;
  expiresAt: number;
}

// ── Market Calls ──

export type CallDirection = 'bullish' | 'bearish' | 'neutral';

export interface MarketCall {
  id: string;
  instrumentId: string;
  instrumentName: string;
  direction: CallDirection;
  targetPrice?: number;
  createdAt: number;
  resolvesAt: number;
  resolved: boolean;
  correct?: boolean;
  priceAtCreation: number;
  priceAtResolution?: number;
}

// ── Verification ──

export interface VerificationRequirements {
  minFollowers: number;
  minCredibility: number;
  minGovernance: number;
  minActivityDays: number;
}

// ── PvP ──

export interface TakeoverBid {
  targetId: string;
  targetName: string;
  bidAmount: number;
  attackPower: number;
  defensePower: number;
  startedAt: number;
  resolvesAt: number;
  resolved: boolean;
  won?: boolean;
}

// ── Politics ──

export type PoliticalTier = 0 | 1 | 2 | 3 | 4;

export interface LobbyingProject {
  id: string;
  name: string;
  description: string;
  cost: number;
  duration: number; // ticks
  progress: number;
  effect: { axis: string; value: number };
}

export interface RegulatoryEvent {
  id: string;
  title: string;
  description: string;
  options: { label: string; effect: Record<string, number> }[];
}

// ── Luxury ──

export interface LuxuryItem {
  id: string;
  name: string;
  category: 'watch' | 'car' | 'yacht' | 'property' | 'art' | 'wine' | 'jewelry';
  price: number;
  monthlyMaintenance: number;
  influenceBonus: number;
  followerBonus: number;
  resaleValue: number;
  description: string;
}

// ── News ──

export interface Bulletin {
  id: string;
  headline: string;
  body: string;
  source: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  category: string;
  publishedAt: number;
  financialTerms?: string[];
}

// ── Random Events ──

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  options: {
    label: string;
    effects: Record<string, number>; // axis/balance effects
    description: string;
  }[];
  cooldownTicks: number;
  minNetWorth?: number;
  requiresStructure?: string;
}

// ── Solo Missions ──

export type MissionContext = 'lab' | 'replay' | 'exchange' | 'global';

export interface Mission {
  id: string;
  title: string;
  description: string;
  context: MissionContext;
  checkFn: string;        // serialized check function name
  target: number;
  reward: {
    xp?: number;
    ap?: number;
    bpXp?: number;
    cash?: number;
  };
}
