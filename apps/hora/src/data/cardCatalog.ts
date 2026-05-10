// ── Card Catalog ─────────────────────────────────────────────────
// Static data for the AP card economy: 30+ collectible cards,
// pack types, and rarity configuration.

export type CardCategory = 'Building' | 'Manager' | 'Analyst' | 'Specialist' | 'Wildcard';
export type CardRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface CatalogCard {
  id: string;
  name: string;
  category: CardCategory;
  rarity: CardRarity;
  buff: { type: string; value: number };
  description: string;
}

// ── Rarity Config ────────────────────────────────────────────────

export const RARITY_CONFIG: Record<CardRarity, {
  weight: number;
  color: string;
  glow: string;
  quickSellValue: number;
}> = {
  Common:    { weight: 60, color: '#9CA3AF', glow: '#9CA3AF22', quickSellValue: 10 },
  Uncommon:  { weight: 25, color: '#34D399', glow: '#34D39922', quickSellValue: 30 },
  Rare:      { weight: 10, color: '#60A5FA', glow: '#60A5FA22', quickSellValue: 100 },
  Epic:      { weight: 4,  color: '#A78BFA', glow: '#A78BFA22', quickSellValue: 400 },
  Legendary: { weight: 1,  color: '#FBBF24', glow: '#FBBF2444', quickSellValue: 2000 },
};

// ── Pack Types ───────────────────────────────────────────────────

export interface PackType {
  id: string;
  name: string;
  cost: number;
  cardCount: number;
  guaranteedRarity?: CardRarity;
  guaranteedSlots?: { rarity: CardRarity; count: number }[];
  description: string;
}

export const PACK_TYPES: Record<string, PackType> = {
  STANDARD: {
    id: 'STANDARD',
    name: 'Standard Pack',
    cost: 500,
    cardCount: 5,
    guaranteedRarity: 'Rare',
    description: '5 cards, guaranteed 1 Rare',
  },
  PREMIUM: {
    id: 'PREMIUM',
    name: 'Premium Pack',
    cost: 1500,
    cardCount: 6,
    guaranteedSlots: [
      { rarity: 'Rare', count: 2 },
      { rarity: 'Epic', count: 1 },
    ],
    description: '6 cards, guaranteed 2 Rare + 1 Epic',
  },
  ELITE: {
    id: 'ELITE',
    name: 'Elite Pack',
    cost: 5000,
    cardCount: 7,
    guaranteedSlots: [
      { rarity: 'Epic', count: 2 },
      { rarity: 'Legendary', count: 1 },
    ],
    description: '7 cards, guaranteed 2 Epic + 1 Legendary',
  },
  STUDY: {
    id: 'STUDY',
    name: 'Study Pack',
    cost: 0,
    cardCount: 3,
    description: '3 cards -- earned by completing modules',
  },
};

// ── Card Catalog (30+ cards) ─────────────────────────────────────

export const CARD_CATALOG: CatalogCard[] = [
  // ── Buildings (8) ──────────────────────────────────────────────
  {
    id: 'bld-trading-floor',
    name: 'Trading Floor',
    category: 'Building',
    rarity: 'Common',
    buff: { type: 'income_boost', value: 0.05 },
    description: 'Open-plan floor buzzing with terminals. +5% income to assigned node.',
  },
  {
    id: 'bld-data-center',
    name: 'Data Center',
    category: 'Building',
    rarity: 'Common',
    buff: { type: 'processing_speed', value: 0.08 },
    description: 'Racks of humming servers crunching market data. +8% processing speed.',
  },
  {
    id: 'bld-research-lab',
    name: 'Research Lab',
    category: 'Building',
    rarity: 'Uncommon',
    buff: { type: 'research_speed', value: 0.10 },
    description: 'White-walled think tank with Bloomberg terminals. +10% research speed.',
  },
  {
    id: 'bld-quant-tower',
    name: 'Quant Tower',
    category: 'Building',
    rarity: 'Rare',
    buff: { type: 'algo_efficiency', value: 0.15 },
    description: 'Glass skyscraper housing PhD quants. +15% algorithmic efficiency.',
  },
  {
    id: 'bld-global-hq',
    name: 'Global HQ',
    category: 'Building',
    rarity: 'Epic',
    buff: { type: 'all_income', value: 0.12 },
    description: 'Flagship headquarters with helipad. +12% income empire-wide.',
  },
  {
    id: 'bld-compliance-office',
    name: 'Compliance Office',
    category: 'Building',
    rarity: 'Common',
    buff: { type: 'fine_reduction', value: 0.20 },
    description: 'Regulatory shield staffed by lawyers. -20% regulatory fines.',
  },
  {
    id: 'bld-risk-desk',
    name: 'Risk Desk',
    category: 'Building',
    rarity: 'Uncommon',
    buff: { type: 'loss_reduction', value: 0.10 },
    description: 'Real-time risk monitoring station. -10% downside on trades.',
  },
  {
    id: 'bld-algo-engine-room',
    name: 'Algo Engine Room',
    category: 'Building',
    rarity: 'Legendary',
    buff: { type: 'trade_speed', value: 0.25 },
    description: 'Sub-millisecond execution cluster with liquid cooling. +25% trade speed.',
  },

  // ── Managers (8) ───────────────────────────────────────────────
  {
    id: 'mgr-junior-analyst',
    name: 'Junior Analyst',
    category: 'Manager',
    rarity: 'Common',
    buff: { type: 'research_speed', value: 0.03 },
    description: 'Fresh from the CFA program. +3% research speed.',
  },
  {
    id: 'mgr-senior-trader',
    name: 'Senior Trader',
    category: 'Manager',
    rarity: 'Uncommon',
    buff: { type: 'trade_profit', value: 0.08 },
    description: '15 years on the desk, nerves of steel. +8% trade profit.',
  },
  {
    id: 'mgr-portfolio-manager',
    name: 'Portfolio Manager',
    category: 'Manager',
    rarity: 'Rare',
    buff: { type: 'portfolio_return', value: 0.12 },
    description: 'Manages a $2B book with 0.9 Sharpe. +12% portfolio returns.',
  },
  {
    id: 'mgr-chief-risk-officer',
    name: 'Chief Risk Officer',
    category: 'Manager',
    rarity: 'Epic',
    buff: { type: 'risk_mitigation', value: 0.18 },
    description: 'Former regulator turned guardian. -18% portfolio drawdown.',
  },
  {
    id: 'mgr-market-strategist',
    name: 'Market Strategist',
    category: 'Manager',
    rarity: 'Uncommon',
    buff: { type: 'forecast_accuracy', value: 0.10 },
    description: 'CNBC regular with uncanny macro calls. +10% forecast accuracy.',
  },
  {
    id: 'mgr-head-of-quant',
    name: 'Head of Quant',
    category: 'Manager',
    rarity: 'Rare',
    buff: { type: 'algo_efficiency', value: 0.15 },
    description: 'MIT PhD who built the alpha engine. +15% algo efficiency.',
  },
  {
    id: 'mgr-vp-compliance',
    name: 'VP Compliance',
    category: 'Manager',
    rarity: 'Common',
    buff: { type: 'fine_reduction', value: 0.12 },
    description: 'Keeps the SEC at bay. -12% regulatory fines.',
  },
  {
    id: 'mgr-ceo',
    name: 'CEO',
    category: 'Manager',
    rarity: 'Legendary',
    buff: { type: 'all_income', value: 0.20 },
    description: 'Visionary leader. Fortune 500 alumni. +20% income empire-wide.',
  },

  // ── Analysts (8) ───────────────────────────────────────────────
  {
    id: 'anl-equity-analyst',
    name: 'Equity Analyst',
    category: 'Analyst',
    rarity: 'Common',
    buff: { type: 'equity_insight', value: 0.05 },
    description: 'Dissects 10-Ks for breakfast. +5% equity trade edge.',
  },
  {
    id: 'anl-crypto-researcher',
    name: 'Crypto Researcher',
    category: 'Analyst',
    rarity: 'Common',
    buff: { type: 'crypto_insight', value: 0.06 },
    description: 'On-chain detective. Reads Ethereum like a novel. +6% crypto edge.',
  },
  {
    id: 'anl-macro-economist',
    name: 'Macro Economist',
    category: 'Analyst',
    rarity: 'Uncommon',
    buff: { type: 'macro_forecast', value: 0.10 },
    description: 'Former Fed researcher. Predicts rate moves. +10% macro forecast.',
  },
  {
    id: 'anl-derivatives-expert',
    name: 'Derivatives Expert',
    category: 'Analyst',
    rarity: 'Rare',
    buff: { type: 'options_profit', value: 0.14 },
    description: 'Greeks whisperer. Structures exotic payoffs. +14% options profit.',
  },
  {
    id: 'anl-esg-specialist',
    name: 'ESG Specialist',
    category: 'Analyst',
    rarity: 'Uncommon',
    buff: { type: 'esg_score', value: 0.08 },
    description: 'Sustainability scorer. Unlocks green investment bonuses. +8% ESG score.',
  },
  {
    id: 'anl-sentiment-analyst',
    name: 'Sentiment Analyst',
    category: 'Analyst',
    rarity: 'Rare',
    buff: { type: 'sentiment_edge', value: 0.12 },
    description: 'NLP pipeline scraping social feeds. +12% sentiment-driven edge.',
  },
  {
    id: 'anl-ai-data-scientist',
    name: 'AI Data Scientist',
    category: 'Analyst',
    rarity: 'Epic',
    buff: { type: 'ml_alpha', value: 0.18 },
    description: 'Trains transformer models on tick data. +18% ML-generated alpha.',
  },
  {
    id: 'anl-quant-modeler',
    name: 'Quant Modeler',
    category: 'Analyst',
    rarity: 'Epic',
    buff: { type: 'model_accuracy', value: 0.16 },
    description: 'Stochastic calculus virtuoso. +16% model accuracy.',
  },

  // ── Specialists (4) ────────────────────────────────────────────
  {
    id: 'spc-dark-pool-access',
    name: 'Dark Pool Access',
    category: 'Specialist',
    rarity: 'Rare',
    buff: { type: 'hidden_liquidity', value: 0.15 },
    description: 'Routes orders through dark pools. +15% hidden liquidity access.',
  },
  {
    id: 'spc-insider-network',
    name: 'Insider Network',
    category: 'Specialist',
    rarity: 'Epic',
    buff: { type: 'intel_speed', value: 0.20 },
    description: 'Well-connected lobbyist. +20% intel acquisition speed.',
  },
  {
    id: 'spc-regulatory-shield',
    name: 'Regulatory Shield',
    category: 'Specialist',
    rarity: 'Uncommon',
    buff: { type: 'audit_protection', value: 0.25 },
    description: 'Former SEC commissioner on retainer. -25% audit risk.',
  },
  {
    id: 'spc-market-maker',
    name: 'Market Maker',
    category: 'Specialist',
    rarity: 'Rare',
    buff: { type: 'spread_capture', value: 0.12 },
    description: 'Provides liquidity for a cut. +12% spread capture.',
  },

  // ── Wildcards (2) ──────────────────────────────────────────────
  {
    id: 'wld-black-swan',
    name: 'Black Swan',
    category: 'Wildcard',
    rarity: 'Legendary',
    buff: { type: 'crisis_profit', value: 0.30 },
    description: 'Tail-risk hedge fund legend. +30% profit during market crashes.',
  },
  {
    id: 'wld-golden-bull',
    name: 'Golden Bull',
    category: 'Wildcard',
    rarity: 'Legendary',
    buff: { type: 'bull_market_boost', value: 0.25 },
    description: 'Eternal optimist with a Midas touch. +25% gains in bull markets.',
  },
];

// ── Helpers ──────────────────────────────────────────────────────

export function getCardById(id: string): CatalogCard | undefined {
  return CARD_CATALOG.find(c => c.id === id);
}

export function getCardsByRarity(rarity: CardRarity): CatalogCard[] {
  return CARD_CATALOG.filter(c => c.rarity === rarity);
}

export function getCardsByCategory(category: CardCategory): CatalogCard[] {
  return CARD_CATALOG.filter(c => c.category === category);
}
