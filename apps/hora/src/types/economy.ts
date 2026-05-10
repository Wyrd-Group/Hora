// ── Card Economy ──

export type CardRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface GameCard {
  id: string;
  name: string;
  rarity: CardRarity;
  category: 'Building' | 'Manager' | 'Analyst' | 'Specialist' | 'Wildcard';
  description: string;
  buff: {
    type: 'income' | 'xp' | 'fee_discount' | 'signal_accuracy' | 'cooldown_reduction';
    value: number; // multiplier or percentage
  };
  imageUrl?: string;
}

export interface OwnedCard extends GameCard {
  count: number;
  level: number; // 1 = base, upgradeable via duplicates
}

export interface PackType {
  id: string;
  name: string;
  cost: number;        // AP
  cardCount: number;   // cards per pack
  guaranteedRarity?: CardRarity;
  description: string;
}

export interface MarketplaceListing {
  id: string;
  cardId: string;
  sellerId: string;
  price: number; // AP
  listedAt: number;
}

// ── Battle Pass ──

export interface BattlePassReward {
  tier: number;
  freeReward: { type: 'ap' | 'card' | 'xp' | 'cosmetic' | 'title'; value: number | string; label: string };
  premiumReward: { type: 'ap' | 'card' | 'xp' | 'cosmetic' | 'title'; value: number | string; label: string };
}

export interface BattlePassState {
  currentTier: number;
  bpXp: number;
  xpPerTier: number;
  isPremium: boolean;
  seasonStart: number;
  seasonEnd: number;
  claimedFree: number[];
  claimedPremium: number[];
}

// ── Focus Timer ──

export interface FocusSession {
  duration: number;  // minutes selected
  startedAt: number;
  completedAt?: number;
  apEarned: number;
}

// ── AP Award Sources ──

export type APSource =
  | 'lesson'
  | 'quiz'
  | 'exam'
  | 'trade'
  | 'focus'
  | 'mission'
  | 'daily_login'
  | 'level_up'
  | 'replay'
  | 'pack_open';
