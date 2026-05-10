import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  INITIAL_NODES, INITIAL_PROJECTS,
  INITIAL_CRIMES, INITIAL_TICKER,
  INITIAL_RD_PROJECTS, TRADE_CORRIDORS,
} from '../data/seed';
import { computeTransfer, COMPANY_JURISDICTIONS } from '../data/taxData';
import { FUNDS } from '../data/fundsData';
import { SHADOW_OPS } from '../data/shadowData';
import { SPORTS_FRANCHISES } from '../data/sportsData';
import { SHOPPING_ASSETS } from '../data/shoppingData';
import { PERKS } from '../data/perksData';
import { INITIAL_VC_DEALS, INITIAL_PE_TARGETS, INITIAL_HF_STRATEGIES, INITIAL_IB_DEALS, INITIAL_MEDIA_OUTLETS, INITIAL_AUCTION_ITEMS, VCDeal, PETarget, HedgeFundStrategy, IBDeal, MediaOutlet, AuctionItem } from '../data/divisionsData';
import { getWaveNodes as _getWaveNodes } from '../data/expandedNodes';
import { useWorldSimStore } from './worldSimStore';
import { useMatchStore } from './matchStore';
import { useAgentCardStore } from './agentCardStore';
import { getAgentById } from '../data/agentCards';
import { eventBridge, EVENTS } from '../lib/eventBridge';

// ── Match Activity Broadcast ─────────────────────────────────────
// Fires a deferred activity entry to the match feed when a match is active.
const broadcastMatchActivity = (action: string, detail: string) => {
  setTimeout(() => {
    const match = useMatchStore.getState();
    if (!match.active) return;
    const me = match.leaderboard.find(p => !p.isBot);
    match.pushActivity({
      playerName: me?.displayName || 'Player',
      playerId: me?.playerId || 'me',
      action: action as any,
      detail,
    });
  }, 0);
};

// ── Types ─────────────────────────────────────────────────────────
export type NodeOwner = 'player' | 'market' | 'rival';
export type NodeStatus = 'operational' | 'building' | 'disabled';
export type SectorType = 'finance' | 'tech' | 'oil_gas' | 'manufacturing' | 'energy' | 'pharma' | 'venue' | 'healthcare' | 'education' | 'cultural' | 'hospitality' | 'defense' | 'retail' | 'airport' | 'port' | 'esg';
export type CardTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Icon';
export type CorporateStructure =
  | 'Sole Trader'
  | 'Partnership'
  | 'Privately Held (LLC)'
  | 'Public Company'
  | 'Social Enterprise'
  | 'NGO Watchdog';

export interface EmpireNode {
  id: string;
  name: string;
  type: SectorType;
  owner: NodeOwner;
  lat: number;
  lon: number;
  level: number;     // 1-5
  income: number;    // monthly €
  status: NodeStatus;
  endsIn?: string;   // construction timer display
  capex?: number;    // market nodes: purchase price
  opex?: number;     // market nodes: monthly cost
  imageUrl?: string;   // real-world photo
  intelDecrypted?: boolean; // rival nodes: intel unlock
  canBeRenamed?: boolean;   // if public/non-profit
  namingRightsCost?: number;
  renameEffect?: string;
  originalName?: string;
  worldNodeId?: string;     // links to world_nodes.id for Living World ventures
  buildStartTick?: number;  // gameTick when construction started
  buildDuration?: number;   // ticks until construction completes (default 3)
}

export interface EmployeeCard {
  id: string;
  name: string;
  role: string;
  tier: CardTier;
  multiplier: number;
  stat: string;
  assignedNodeId?: string;
}

export interface DeptProject {
  id: string;
  dept: string;       // HR | Trading | Marketing | R&D | Finance | Legal
  name: string;
  cost: number;
  focusSessions: number;
  successRate: number; // 0-100
  effect: string;
  active: boolean;
}

export interface CrimeOperation {
  id: string;
  name: string;
  detectionPct: number;
  penaltyMultiplier: string; // e.g. "2x", "3x"
  axisHit: string;           // e.g. "Gov -15", "Gov -10, Power +5"
  heatGain: number;
}

export interface TickerEvent {
  id: string;
  text: string;
  type: 'fx' | 'crypto' | 'commodity' | 'intel' | 'alert' | 'crime' | 'board' | 'trade' | 'info' | 'system';
  timestamp: number;
}

export interface TradeRoute {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: 'sea' | 'rail' | 'air' | 'truck';
  active: boolean;
  // Enhanced route fields
  corridorId?: string;        // Links to a trade corridor
  level?: number;             // 1-5 upgrade level
  acquisition?: 'built' | 'bought' | 'subcontracted' | 'stolen';
  monthlyRevenue?: number;    // Base revenue from this route
  capacity?: number;          // Cargo capacity (tons)
  speed?: number;             // Delivery speed rating 1-10
  security?: number;          // Security rating 1-10
  upgrades?: RouteUpgrade[];
  fromLat?: number;
  fromLon?: number;
  toLat?: number;
  toLon?: number;
}

export interface RouteUpgrade {
  id: string;
  name: string;
  applied: boolean;
}

export interface TradeCorridor {
  id: string;
  name: string;
  from: string;   // region name
  to: string;     // region name
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  distance: number; // km
  risk: 'low' | 'medium' | 'high';
  availableTypes: Array<'sea' | 'rail' | 'air' | 'truck'>;
}

export type TransportType = 'airline' | 'shipping' | 'rail';

export interface TransportCompany {
  id: string;
  name: string;
  type: TransportType;
  founded: number;          // game tick when founded
  level: number;            // 1-5 company tier
  fleet: number;            // number of vehicles
  routes: TransportRoute[]; // operated routes
  monthlyRevenue: number;   // total revenue from routes + fees
  monthlyCost: number;      // fleet maintenance + staff
  reputation: number;       // 0-100, affects pricing power
  hubNodeIds: string[];     // owned airport/port/station node IDs (home hubs)
}

export interface TransportRoute {
  id: string;
  fromNodeId: string;       // airport/port/station node
  toNodeId: string;
  fromName: string;
  toName: string;
  fromCoords: [number, number]; // [lng, lat]
  toCoords: [number, number];
  type: TransportType;
  frequency: number;        // flights/voyages per tick
  ticketRevenue: number;    // revenue per tick from passengers/cargo
  fuelCost: number;         // cost per tick
  landingFee: number;       // fee paid TO the airport/port owner per use
  active: boolean;
}

export interface InfraFee {
  nodeId: string;
  nodeName: string;
  feePerUse: number;        // € charged per landing/docking
  ownerIsPlayer: boolean;   // if player owns, they collect; otherwise they pay
  usesPerTick: number;      // how many times per tick vehicles use this
}

export interface RDProject {
  id: string;
  name: string;
  category: 'production' | 'transport' | 'market' | 'security' | 'green';
  cost: number;
  duration: number;  // ticks to complete
  progress: number;  // 0-100
  status: 'available' | 'researching' | 'completed';
  effect: string;
  description: string;
}

export interface GameNotification {
  id: string;
  type: 'construction' | 'research' | 'trade' | 'alert' | 'info';
  title: string;
  message: string;
  timestamp: number;
  dismissed: boolean;
  navigateTo?: { app?: string; tab?: string; nodeId?: string; flyTo?: { lat: number; lon: number } };
}

export interface BaseAsset {
  id: string;
  name: string;
  value: number;
  owned: boolean;
}

export interface ShoppingAsset extends BaseAsset {
  tier: 'Poor' | 'Medium' | 'High' | 'Ultra';
  category: string;
  description: string;
  imageUrl?: string;
  yieldMultiplier: number;
}

export interface SportsFranchiseStaff {
  id: string;
  name: string;
  position: string;
  overall: number;
  age: number;
  salary: number;
  marketValue: number;
  morale: number;
  form: string;
}

export interface SportsFranchise extends BaseAsset {
  league: string;
  location: string;
  championships: number;
  monthlyRevenue: number;
  facilities?: Record<string, number>;  // facility key → upgrade level (0-3)
  staff?: SportsFranchiseStaff[];       // persisted roster
  ticketPreset?: string;                // saved pricing strategy
}

export interface Perk extends BaseAsset {
  type: 'Lifestyle' | 'Political' | 'Corporate';
  description: string;
  effect: string; // e.g. "Tax -5%", "Heat -10%"
  imageUrl?: string;
}

export interface Loan {
  id: string;
  type: 'business' | 'expansion' | 'emergency' | 'megadeal';
  principal: number;
  interestRate: number;       // Annual rate (e.g., 0.08 = 8%)
  monthlyPayment: number;
  remainingBalance: number;
  termMonths: number;
  monthsRemaining: number;
  startedAt: number;
  status: 'active' | 'defaulted' | 'paid_off';
}

export interface Fund extends BaseAsset {
  type: string;
  aum: number;
  strategy: string;
  historicalReturns: string;
  minimumBuyIn: number;
  managementFee: string;
  description: string;
  stakedAmount?: number; // How much user has allocated
  edge: number; // Probability of win vs loss
  targetYield: number; // The target yield percentage per tick
}

export interface ShadowOp extends BaseAsset {
  type: 'Cyber' | 'Physical' | 'Financial';
  targetEntity: string;
  successRate: number;
  heatGain: number;
  reward: number;
  description: string;
}

export interface BoardMember {
  id: string;
  name: string;
  role: 'Chairman' | 'Investor' | 'Independent' | 'Founder';
  focus: 'growth' | 'governance' | 'profit' | 'esg';  // what they care about most
  patience: number;   // 0-100, drops when their focus underperforms
  portrait: string;   // emoji
}

export interface BoardGoal {
  id: string;
  description: string;
  metric: 'netWorth' | 'growth' | 'governance' | 'monthlyIncome' | 'followers' | 'heat' | 'esgScore';
  target: number;
  direction: 'above' | 'below';  // above = must exceed, below = must stay under
  deadline: number;    // tick by which this must be met
  met: boolean;
  reward: string;      // description of reward
  penalty: string;     // description of penalty
}

export interface CareerEntry {
  companyName: string;
  structure: CorporateStructure;
  startTick: number;
  endTick: number;
  endReason: 'sacked' | 'resigned' | 'active';
  peakNetWorth: number;
  finalSatisfaction: number;
}

export interface CEOContract {
  salary: number;          // per tick
  bonusTarget: number;     // net worth threshold for bonus
  bonusPayout: number;     // bonus amount
  termLength: number;      // ticks
  startTick: number;
  performanceClause: number; // board satisfaction below this = breach
}

// ── Equity / Cap Table ────────────────────────────────────────────
export interface ShareClass {
  id: string;
  name: string;           // 'Founder', 'Series A', 'Series B', 'Public', etc.
  shares: number;         // number of shares in this class
  holder: string;         // 'player', 'vc-meridian', 'pe-blackridge', 'public', etc.
  holderName: string;     // display name
  acquiredTick: number;
  pricePerShare: number;  // price paid per share
  vestingTicks?: number;  // optional vesting period
}

export interface DilutionEvent {
  tick: number;
  investor: string;
  shares: number;
  pct: number;
  price: number;
}

export interface EquityState {
  totalShares: number;          // total outstanding shares (starts at 1,000,000)
  founderShares: number;        // player's shares (starts at 1,000,000 = 100%)
  shareClasses: ShareClass[];   // cap table entries
  isPublic: boolean;            // has IPO'd
  ipoPrice: number;             // IPO price per share (0 if not public)
  ipoTick: number;              // tick when IPO'd
  currentSharePrice: number;    // current market price (updates each tick if public)
  publicFloat: number;          // shares available on market
  sharesOwnedByPlayer: number;  // player's total shares across all classes
  dilutionEvents: DilutionEvent[];
}

// ── State Interface ───────────────────────────────────────────────
interface EmpireState {
  // Wallets
  personalBalance: number;
  companyBalance: number;
  monthlyIncome: number;
  netWorth: number;
  agentPayroll: number;  // total agent salary cost per tick (stored for accounting UI)

  // Four axes (0-100)
  growth: number;
  governance: number;
  impact: number;
  power: number;

  // Corporate
  companyName: string;
  structure: CorporateStructure;
  taxRate: number;
  heat: number;
  followers: number;
  ceoApproval: number;
  activeBanks: string[]; // bank IDs player has accounts with
  bankDeposits: Record<string, number>; // bankId -> deposited amount

  // Pack pity counter — guarantees Diamond at ≥ 50 packs without one
  packsSinceDiamond: number;

  // Tax jurisdiction (null = not yet registered)
  companyCountry: string | null;
  residencyCountry: string | null;

  // Entities
  nodes: Record<string, EmpireNode>;
  cards: Record<string, EmployeeCard>;
  projects: DeptProject[];
  crimes: CrimeOperation[];
  routes: TradeRoute[];
  ticker: TickerEvent[];

  // Loans / Banking
  loans: Loan[];
  maxCreditLine: number;

  // Custom Economy Modules
  funds: Fund[];
  shadowOps: ShadowOp[];
  perks: Perk[];
  shoppingAssets: ShoppingAsset[];
  sportsFranchises: SportsFranchise[];

  // Divisions
  vcDeals: VCDeal[];
  peTargets: PETarget[];
  hfStrategies: HedgeFundStrategy[];
  ibDeals: IBDeal[];
  mediaOutlets: MediaOutlet[];
  auctionItems: AuctionItem[];

  // R&D
  rdProjects: RDProject[];

  // Transport Empire (airlines, shipping lines, rail companies)
  transportCompanies: TransportCompany[];
  infraFees: InfraFee[];  // cached per-tick fee schedule for owned/used infrastructure

  // ECFL Academy & FLOU (Financial Literacy of Understanding)
  ecflScore: number;
  completedLessons: string[];
  passedExams: string[];
  flouLevel: number; // 0-10, derived from ecflScore + completedLessons

  // Cooldowns (timestamps — 0 means no cooldown active)
  structureChangedAt: number;    // last time structure was changed
  residencyChangedAt: number;    // last time residency was changed
  jurisdictionChangedAt: number; // last time company jurisdiction was changed
  cooldownQuarterTicks: number;  // how many ticks = 1 quarter (default 90)
  gameTick: number;              // global tick counter (1 tick = 1 game month)
  gameSpeed: 0 | 1 | 2 | 5;     // 0 = paused, 1 = normal, 2 = fast, 5 = turbo
  gameDate: { day: number; month: number; year: number };  // derived from gameTick
  notifications: GameNotification[];  // in-game notification queue

  // Compliance penalties
  complianceFines: number;       // accumulated unpaid fines
  assetsFrozen: boolean;         // true when heat > 80, blocks purchases
  governanceWarnings: number;    // count of consecutive low-gov ticks

  // Board of Directors
  difficulty: 'easy' | 'normal' | 'hard' | 'legendary';
  boardMembers: BoardMember[];
  boardGoals: BoardGoal[];
  boardSatisfaction: number;     // 0-100
  boardPatience: number;         // ticks remaining before review
  boardReviewInterval: number;   // ticks between reviews (quarterly)
  sacked: boolean;
  sackedAt: number;              // tick when sacked

  // Career Mode
  ceoExperience: number;         // accumulated XP across careers
  careerHistory: CareerEntry[];  // past CEO stints
  currentContract: CEOContract | null;

  // UI state
  selectedNodeId: string | null;
  pendingFlyTo: { latitude: number; longitude: number; zoom: number; nodeId?: string } | null;
  activeTab: 'office' | 'overview' | 'departments' | 'funds' | 'market' | 'defcon' | 'assets' | 'shadow' | 'perks' | 'shopping' | 'sports' | 'routes' | 'transport' | 'esg' | 'rnd' | 'divisions' | 'equity';
  terminalOpen: boolean;
  athenaOpen: boolean;
  packOpen: boolean;
  leftRailOpen: boolean;
  showRoutes: boolean;
  trafficEnabled: boolean;
  sportsEnabled: boolean;
  sectorFilter: SectorType | 'all';

  // Athena macro signal (derived from backend telemetry)
  athenaRegime: string;   // 'risk-on' | 'neutral' | 'risk-off' | 'unknown'
  athenaScore: number;    // 0–100 geopolitical risk score
  athenaStale: boolean;   // true until first successful fetch

  // Social
  socialReputation: number;
  socialFollowing: string[];    // NPC profile ids the player follows
  socialLikedPosts: string[];   // post ids the player liked
  socialSavedClips: string[];   // biztok clip ids saved
  socialPosts: { id: string; text: string; timestamp: number; likes: number; comments: number; views: number }[];
  socialChallengeProgress: number;
  socialClipsWatched: number;

  // Creator Economy
  creatorXp: number;
  creatorEarnings: number;       // total € earned from content
  creatorTotalViews: number;
  creatorTotalLikes: number;

  // Trading portfolio (instruments bought with company balance)
  portfolio: Record<string, {
    symbol: string;
    name: string;
    instrumentType: string;
    quantity: number;
    avgCost: number;
  }>;

  // Equity / Cap Table
  totalShares: number;
  founderShares: number;
  shareClasses: ShareClass[];
  isPublic: boolean;
  ipoPrice: number;
  ipoTick: number;
  currentSharePrice: number;
  publicFloat: number;
  sharesOwnedByPlayer: number;
  dilutionEvents: DilutionEvent[];

  // Actions
  selectNode: (id: string | null) => void;
  flyToNode: (latitude: number, longitude: number, zoom?: number, nodeId?: string) => void;
  consumeFlyTo: () => void;
  setActiveTab: (tab: EmpireState['activeTab']) => void;
  setCompanyBalance: (balance: number) => void;
  setStructure: (structure: CorporateStructure) => void;
  setTerminalOpen: (open: boolean) => void;
  setAthenaOpen: (open: boolean) => void;
  setPackOpen: (open: boolean) => void;
  setLeftRailOpen: (open: boolean) => void;
  setShowRoutes: (show: boolean) => void;
  setTrafficEnabled: (v: boolean) => void;
  setSportsEnabled: (v: boolean) => void;
  setSectorFilter: (filter: SectorType | 'all') => void;
  pushTickerEvent: (text: string, type: TickerEvent['type']) => void;
  setAthenaSignal: (regime: string, score: number, stale: boolean) => void;

  // Jurisdiction setters
  setCompanyCountry: (code: string) => void;
  setResidencyCountry: (code: string) => void;
  transferToPersonal: (amount: number) => void;
  transferToCompany: (amount: number) => void;

  // Game actions
  purchaseNode: (nodeId: string, method: 'build' | 'buy') => void;
  purchaseNamingRights: (nodeId: string, newName: string) => void;
  upgradeNode: (nodeId: string) => void;
  stealNode: (nodeId: string) => { success: boolean; cost: number };
  poachAgent: (agentMintId: string, ownerName: string) => { success: boolean; cost: number };
  startProject: (projectId: string) => void;
  executeCrime: (crimeId: string) => void;
  decryptIntel: (nodeId: string) => void;
  executeCyberStrike: (nodeId: string) => void;
  openPack: () => EmployeeCard[];
  setGameSpeed: (speed: 0 | 1 | 2 | 5) => void;
  pushNotification: (notif: Omit<GameNotification, 'id' | 'timestamp' | 'dismissed'>) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  processTick: () => void;

  // Trading actions
  buyInstrument: (id: string, symbol: string, name: string, instrumentType: string, price: number, quantity: number) => void;
  sellInstrument: (id: string, price: number, quantity: number) => void;

  // Loan / Banking Actions
  takeLoan: (type: string, amount: number) => boolean;
  makePayment: (loanId: string, amount?: number) => boolean;
  openBankAccount: (bankId: string) => void;
  closeBankAccount: (bankId: string) => void;
  depositToBank: (bankId: string, amount: number) => void;
  withdrawFromBank: (bankId: string, amount: number) => void;

  // Custom Economy Actions
  buyAsset: (assetType: 'funds' | 'shadowOps' | 'perks' | 'shoppingAssets' | 'sportsFranchises', id: string, cost: number) => void;
  allocateToFund: (id: string, amount: number) => void;
  executeShadowOp: (id: string) => { success: boolean, reward: number, heatGain: number } | null;

  // Sports Franchise Management
  upgradeFranchiseFacility: (franchiseId: string, facilityKey: string, cost: number) => void;
  setFranchiseStaff: (franchiseId: string, staff: SportsFranchiseStaff[]) => void;
  setFranchiseTicketPreset: (franchiseId: string, preset: string) => void;
  hireStaff: (franchiseId: string, player: SportsFranchiseStaff) => void;
  fireStaff: (franchiseId: string, staffId: string) => void;

  // ECFL Actions
  markLessonComplete: (lessonId: string) => void;
  passExam: (examId: string, points: number) => void;

  // Equity Actions
  sellEquity: (investorId: string, investorName: string, equityPct: number, investmentAmount: number, className: string) => void;
  executeIPO: (pricePerShare: number, floatPct: number) => void;
  sellShares: (numShares: number, pricePerShare: number, buyerName: string) => void;

  // Division Actions
  investVC: (dealId: string) => void;
  acquirePE: (targetId: string) => void;
  allocateHF: (strategyId: string, amount: number) => void;
  startIBDeal: (dealId: string) => void;
  acquireMedia: (outletId: string) => void;
  placeBid: (auctionId: string, bidAmount: number) => void;

  // Transport Empire Actions
  foundTransportCompany: (name: string, type: TransportType, hubNodeId: string) => boolean;
  openTransportRoute: (companyId: string, fromNodeId: string, toNodeId: string) => boolean;
  upgradeTransportCompany: (companyId: string) => boolean;
  setInfraFee: (nodeId: string, feePerUse: number) => void;

  // Cooldown-aware setters
  setStructureCooldown: (structure: CorporateStructure) => boolean;  // returns false if on cooldown
  setResidencyCooldown: (code: string) => boolean;
  setJurisdictionCooldown: (code: string) => boolean;
  getCooldownRemaining: (type: 'structure' | 'residency' | 'jurisdiction') => number; // ticks remaining
  payFine: (amount: number) => void;
  setDifficulty: (d: 'easy' | 'normal' | 'hard' | 'legendary') => void;
  acceptPosition: (opportunity: { company: string; structure: string; salary: number; bonus: number; netWorth: number; difficulty: string }) => void;

  // Social actions
  socialLikePost: (postId: string) => void;
  socialFollow: (profileId: string) => void;
  socialUnfollow: (profileId: string) => void;
  socialSaveClip: (clipId: string) => void;
  socialUnsaveClip: (clipId: string) => void;
  socialPublishPost: (text: string) => void;
  socialWatchClip: () => void;

  // Route management
  buildRoute: (fromNodeId: string, toNodeId: string, type: TradeRoute['type'], corridorId?: string, acquisition?: TradeRoute['acquisition']) => void;
  toggleRoute: (routeId: string) => void;
  upgradeRoute: (routeId: string, upgradeName: string, cost: number) => void;

  // R&D management
  startResearch: (projectId: string) => void;
  tickResearch: () => void;

  // Acceleration (pay to finish faster)
  accelerateConstruction: (nodeId: string) => { success: boolean; cost: number; message: string };
  accelerateResearch: (projectId: string) => { success: boolean; cost: number; message: string };

  // Cloud sync
  loadCloudState: (cloudState: Record<string, any>) => void;
  resetToFresh: () => void;

  // Selectors
  getOwnedNodes: () => EmpireNode[];
  getMarketNodes: () => EmpireNode[];
  getRivalNodes: () => EmpireNode[];
  getNodeById: (id: string) => EmpireNode | null;
}

// ── Pure helpers (defined outside create to avoid closure bloat) ──

const buildNodeMap = (nodes: EmpireNode[]): Record<string, EmpireNode> =>
  Object.fromEntries(nodes.map(n => [n.id, n]));

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

const fmt_simple = (n: number): string =>
  n >= 1e9 ? `€${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n/1e3).toFixed(0)}K` : `€${n}`;

const nextId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ── openPack constants ────────────────────────────────────────────

const PACK_COST = 5_000;
const CARDS_PER_PACK = 3;
const DIAMOND_PITY_THRESHOLD = 50; // guaranteed Diamond after N packs without one

/** Cumulative upper bound for each tier (roll < threshold → that tier). */
const TIER_THRESHOLDS: ReadonlyArray<{ tier: CardTier; threshold: number }> = [
  { tier: 'Bronze',  threshold: 50  },
  { tier: 'Silver',  threshold: 80  },
  { tier: 'Gold',    threshold: 95  },
  { tier: 'Diamond', threshold: 99  },
  { tier: 'Icon',    threshold: 100 },
] as const;

/** Multiplier [min, max] range per tier. */
const TIER_MULT_RANGE: Record<CardTier, readonly [number, number]> = {
  Bronze:  [0.80, 1.05],
  Silver:  [1.05, 1.20],
  Gold:    [1.20, 1.35],
  Diamond: [1.35, 1.60],
  Icon:    [1.60, 2.00],
} as const;

const CARD_POOL: ReadonlyArray<{ role: string; stat: string; sector?: SectorType }> = [
  { role: 'Supply Chain Manager',   stat: '+35% logistics throughput',   sector: 'manufacturing' },
  { role: 'Quantitative Analyst',   stat: '+45% trading algorithm yield', sector: 'finance'       },
  { role: 'Security Specialist',    stat: '-20% crime detection rate',    sector: undefined       },
  { role: 'Operations Director',    stat: '+30% venue throughput',        sector: 'venue'         },
  { role: 'Risk Analyst',           stat: '-15% audit detection',         sector: undefined       },
  { role: 'Logistics Expert',       stat: '+40% route efficiency',        sector: 'manufacturing' },
  { role: 'Energy Trader',          stat: '+25% oil_gas income',          sector: 'oil_gas'       },
  { role: 'Biotech Director',       stat: '+30% pharma income',           sector: 'pharma'        },
  { role: 'Venture Partner',        stat: '+20% tech income',             sector: 'tech'          },
  { role: 'Grid Engineer',          stat: '+25% energy throughput',       sector: 'energy'        },
  { role: 'Chief Compliance Officer', stat: '-25% tax rate exposure',     sector: undefined       },
  { role: 'Head of Growth',         stat: '+5 Growth per tick',           sector: undefined       },
  { role: 'Government Liaison',     stat: '+8 Power axis',                sector: undefined       },
  { role: 'ESG Director',           stat: '+6 Impact per completed project', sector: undefined    },
];

const FIRST_NAMES = [
  'Elena', 'James', 'Amara', 'Marcus', 'Yuki', 'Fatima', 'Lucas', 'Priya',
  'Sofia', 'Dmitri', 'Ingrid', 'Omar', 'Celine', 'Kwame', 'Riya', 'Tariq',
];
const LAST_NAMES = [
  'Voss', 'Chen', 'Osei', 'Webb', 'Tanaka', 'Al-Rashid', 'Ferreira', 'Sharma',
  'Reyes', 'Petrov', 'Larsson', 'Hassan', 'Dupont', 'Asante', 'Kapoor', 'Mbeki',
];

function randomName(): string {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
}

function drawTier(pityCount: number): CardTier {
  // Guarantee Diamond when pity threshold reached
  if (pityCount >= DIAMOND_PITY_THRESHOLD) return 'Diamond';
  const roll = Math.random() * 100;
  for (const { tier, threshold } of TIER_THRESHOLDS) {
    if (roll < threshold) return tier;
  }
  return 'Bronze';
}

function generateCard(tier: CardTier): EmployeeCard {
  const entry = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
  const [lo, hi] = TIER_MULT_RANGE[tier];
  const multiplier = parseFloat((lo + Math.random() * (hi - lo)).toFixed(2));
  return {
    id: nextId('card'),
    name: randomName(),
    role: entry.role,
    tier,
    multiplier,
    stat: entry.stat,
  };
}

// ── Effect parser for startProject ───────────────────────────────

type AxisKey = 'growth' | 'governance' | 'impact' | 'power';

type EffectOp =
  | { kind: 'axis';           key: AxisKey; delta: number }
  | { kind: 'taxRate';        delta: number }          // fraction, e.g. -0.03
  | { kind: 'followers';      delta: number }
  | { kind: 'monthlyIncome';  pct: number }            // fraction, e.g. 0.15
  | { kind: 'crimeDetect';    pct: number }            // fraction reduction
  | { kind: 'narrative' };                              // flavour-only, no state change

const AXIS_LABELS: Record<string, AxisKey> = {
  growth: 'growth', governance: 'governance', gov: 'governance',
  impact: 'impact', power: 'power',
};

function parseEffects(effect: string): EffectOp[] {
  const ops: EffectOp[] = [];
  const parts = effect.split(',').map(s => s.trim());

  for (const part of parts) {
    // "+N Growth" / "-N Governance" / "+N Power" / "+N Impact"
    const axisM = part.match(/([+-]?\d+(?:\.\d+)?)\s+(growth|governance|gov|impact|power)\b/i);
    if (axisM) {
      const key = AXIS_LABELS[axisM[2].toLowerCase()];
      if (key) { ops.push({ kind: 'axis', key, delta: parseFloat(axisM[1]) }); continue; }
    }

    // "-3% effective tax rate"
    const taxM = part.match(/([+-]?\d+(?:\.\d+)?)%\s+effective\s+tax\s+rate/i);
    if (taxM) { ops.push({ kind: 'taxRate', delta: parseFloat(taxM[1]) / 100 }); continue; }

    // "+500 followers"
    const follM = part.match(/([+-]?\d+)\s+followers/i);
    if (follM) { ops.push({ kind: 'followers', delta: parseInt(follM[1]) }); continue; }

    // "+15% trading income" / "+10% dept efficiency" / "+25% throughput" / "+20% regional sentiment"
    const incM = part.match(/\+(\d+(?:\.\d+)?)%\s+(?:trading\s+income|dept\s+efficiency|throughput|route\s+efficiency|regional\s+sentiment|venue\s+throughput|(?:\w+\s+)?income)/i);
    if (incM) { ops.push({ kind: 'monthlyIncome', pct: parseFloat(incM[1]) / 100 }); continue; }

    // "-15% crime detection"
    const crimeM = part.match(/([+-]?\d+(?:\.\d+)?)%\s+crime\s+detection/i);
    if (crimeM) { ops.push({ kind: 'crimeDetect', pct: Math.abs(parseFloat(crimeM[1])) / 100 }); continue; }

    // Anything unmatched (flavour text: "Unlock...", "Reveal...", "IP protection...")
    ops.push({ kind: 'narrative' });
  }

  return ops;
}

function applyEffectOps(state: EmpireState, ops: EffectOp[]): Partial<EmpireState> {
  const patch: Partial<EmpireState> = {};

  for (const op of ops) {
    switch (op.kind) {
      case 'axis':
        patch[op.key] = clamp((patch[op.key] as number ?? state[op.key]) + op.delta, 0, 100);
        break;
      case 'taxRate':
        patch.taxRate = clamp((patch.taxRate ?? state.taxRate) + op.delta, 0, 0.60);
        break;
      case 'followers':
        patch.followers = Math.max(0, (patch.followers ?? state.followers) + op.delta);
        break;
      case 'monthlyIncome':
        patch.monthlyIncome = Math.round((patch.monthlyIncome ?? state.monthlyIncome) * (1 + op.pct));
        break;
      case 'crimeDetect':
        patch.crimes = (patch.crimes ?? state.crimes).map(c => ({
          ...c,
          detectionPct: clamp(c.detectionPct * (1 - op.pct), 0, 100),
        }));
        break;
      case 'narrative':
        break;
    }
  }

  return patch;
}

// ── axisHit parser for executeCrime ──────────────────────────────

function applyAxisHit(state: EmpireState, axisHit: string): Partial<EmpireState> {
  const patch: Partial<EmpireState> = {};
  // Format: "Gov -15" | "Gov -10, Power +5" | "Gov -20"
  const tokens = axisHit.matchAll(/\b(growth|gov(?:ernance)?|impact|power)\s+([+-]?\d+)/gi);
  for (const m of tokens) {
    const key = AXIS_LABELS[m[1].toLowerCase()];
    if (key) {
      patch[key] = clamp((patch[key] as number ?? state[key]) + parseInt(m[2]), 0, 100);
    }
  }
  return patch;
}

// ── Fresh State (new accounts start here) ────────────────────────
export function getFreshState() {
  return {
    personalBalance: 100_000,
    companyBalance:  0,
    monthlyIncome:   0,
    netWorth:        100_000,
    agentPayroll:    0,

    growth:     0,
    governance: 0,
    impact:     0,
    power:      0,

    companyName: 'My Empire',
    structure:   'Sole Trader' as CorporateStructure,
    taxRate:     0.20,
    heat:        0,
    followers:   0,
    ceoApproval: 50,
    activeBanks: ['b1'] as string[],
    bankDeposits: {} as Record<string, number>,

    packsSinceDiamond: 0,

    companyCountry:  null as string | null,
    residencyCountry: null as string | null,

    nodes:    buildNodeMap(INITIAL_NODES),
    cards:    {} as Record<string, EmployeeCard>,
    projects: [...INITIAL_PROJECTS].map(p => ({ ...p, active: false })),
    crimes:   [...INITIAL_CRIMES],
    routes:   [] as any[],
    ticker:   [...INITIAL_TICKER],

    loans: [] as Loan[],
    maxCreditLine: 0,

    funds: [...FUNDS],
    shadowOps: [...SHADOW_OPS],
    perks: [...PERKS],
    shoppingAssets: [...SHOPPING_ASSETS],
    sportsFranchises: [...SPORTS_FRANCHISES],

    vcDeals: INITIAL_VC_DEALS,
    peTargets: INITIAL_PE_TARGETS,
    hfStrategies: INITIAL_HF_STRATEGIES,
    ibDeals: INITIAL_IB_DEALS,
    mediaOutlets: INITIAL_MEDIA_OUTLETS,
    auctionItems: INITIAL_AUCTION_ITEMS,

    rdProjects: [...INITIAL_RD_PROJECTS],

    transportCompanies: [] as TransportCompany[],
    infraFees: [] as InfraFee[],

    ecflScore: 0,
    completedLessons: [] as string[],
    passedExams: [] as string[],
    flouLevel: 0,

    socialReputation: 0,
    socialFollowing: [] as string[],
    socialLikedPosts: [] as string[],
    socialSavedClips: [] as string[],
    socialPosts: [] as any[],
    socialChallengeProgress: 0,
    socialClipsWatched: 0,

    creatorXp: 0,
    creatorEarnings: 0,
    creatorTotalViews: 0,
    creatorTotalLikes: 0,

    structureChangedAt: 0,
    residencyChangedAt: 0,
    jurisdictionChangedAt: 0,
    cooldownQuarterTicks: 129_600, // 1 game quarter = ~90 game days × 1440 min/day
    gameTick: 0,
    gameSpeed: 1 as 0 | 1 | 2 | 5,
    gameDate: { day: 1, month: 1, year: 2026 },
    notifications: [] as GameNotification[],

    complianceFines: 0,
    assetsFrozen: false,
    governanceWarnings: 0,

    difficulty: 'normal' as const,
    boardMembers: [
      { id: 'bm1', name: 'Victoria Ashworth', role: 'Chairman', focus: 'profit', patience: 80, portrait: '\u{1F469}\u200D\u{1F4BC}' },
      { id: 'bm2', name: 'Heinrich Voss', role: 'Investor', focus: 'growth', patience: 70, portrait: '\u{1F9D1}\u200D\u{1F4BC}' },
      { id: 'bm3', name: 'Amara Okafor', role: 'Independent', focus: 'esg', patience: 85, portrait: '\u{1F469}\u200D\u2696\uFE0F' },
      { id: 'bm4', name: 'Chen Wei', role: 'Founder', focus: 'governance', patience: 75, portrait: '\u{1F468}\u200D\u{1F4BB}' },
    ] as BoardMember[],
    boardGoals: [
      { id: 'bg1', description: 'Reach \u20AC500K net worth', metric: 'netWorth', target: 500_000, direction: 'above', deadline: 1080, met: false, reward: '+10 Board Satisfaction', penalty: '-15 Board Satisfaction' },
      { id: 'bg2', description: 'Maintain governance above 40', metric: 'governance', target: 40, direction: 'above', deadline: 540, met: false, reward: '+5 Board Satisfaction', penalty: '-10 Board Satisfaction, compliance review' },
      { id: 'bg3', description: 'Keep heat below 50', metric: 'heat', target: 50, direction: 'below', deadline: 540, met: false, reward: '+5 Board Satisfaction', penalty: '-20 Board Satisfaction, asset freeze' },
    ] as BoardGoal[],
    boardSatisfaction: 65,
    boardPatience: 86_400,       // ~2 game months (60 days × 1440 min)
    boardReviewInterval: 86_400, // board reviews every ~2 game months
    sacked: false,
    sackedAt: 0,

    ceoExperience: 0,
    careerHistory: [] as CareerEntry[],
    currentContract: {
      salary: 5_000,
      bonusTarget: 1_000_000,
      bonusPayout: 50_000,
      termLength: 788_400, // ~18 game months default term
      startTick: 0,
      performanceClause: 25,
    } as CEOContract,

    selectedNodeId: null as string | null,
    pendingFlyTo: null as { latitude: number; longitude: number; zoom: number; nodeId?: string } | null,
    activeTab:      'overview' as const,
    terminalOpen:   false,
    athenaOpen:      false,
    packOpen:       false,
    leftRailOpen:   true,
    showRoutes:     false,
    trafficEnabled: false,
    sportsEnabled:  true,
    sectorFilter:   'all' as const,

    athenaRegime: 'unknown',
    athenaScore:  50,
    athenaStale:  true,

    portfolio: {} as Record<string, any>,

    // Equity / Cap Table
    totalShares: 1_000_000,
    founderShares: 1_000_000,
    shareClasses: [{ id: 'founder', name: 'Founder Shares', shares: 1_000_000, holder: 'player', holderName: 'You (Founder)', acquiredTick: 0, pricePerShare: 0.10 }] as ShareClass[],
    isPublic: false,
    ipoPrice: 0,
    ipoTick: 0,
    currentSharePrice: 0.10,
    publicFloat: 0,
    sharesOwnedByPlayer: 1_000_000,
    dilutionEvents: [] as DilutionEvent[],
  };
}

// ── Store ─────────────────────────────────────────────────────────

const _fresh = getFreshState();

export const useEmpireStore = create<EmpireState>()(persist((set, get) => ({
  ..._fresh,

  // ── Cloud Sync: bulk-load state from Supabase ──────────────────
  loadCloudState: (cloudState: Record<string, any>) => {
    set((current) => {
      // Merge cloud state over current, preserving actions (functions)
      const merged: Record<string, any> = {};
      for (const [key, value] of Object.entries(cloudState)) {
        if (typeof (current as Record<string, any>)[key] === 'function') continue; // skip actions
        merged[key] = value;
      }
      return merged as Partial<EmpireState>;
    });
  },

  // ── Reset to fresh state (new game) ────────────────────────────
  resetToFresh: () => {
    set(getFreshState() as Partial<EmpireState>);
  },

  // ── Jurisdiction setters ─────────────────────────────────────
  setCompanyCountry: (code) => set(() => {
    const jurisdiction = COMPANY_JURISDICTIONS.find(c => c.code === code);
    return {
      companyCountry: code,
      ...(jurisdiction ? { taxRate: jurisdiction.corporateTax } : {}),
    };
  }),

  setResidencyCountry: (code) => set({ residencyCountry: code }),

  // ── Cooldown-aware setters ──────────────────────────────────
  setStructureCooldown: (structure) => {
    const state = get();
    const elapsed = state.gameTick - state.structureChangedAt;
    if (state.structureChangedAt > 0 && elapsed < state.cooldownQuarterTicks) return false;
    set({ structure, structureChangedAt: state.gameTick });
    return true;
  },

  setResidencyCooldown: (code) => {
    const state = get();
    const elapsed = state.gameTick - state.residencyChangedAt;
    if (state.residencyChangedAt > 0 && elapsed < state.cooldownQuarterTicks) return false;
    set({ residencyCountry: code, residencyChangedAt: state.gameTick });
    return true;
  },

  setJurisdictionCooldown: (code) => {
    const state = get();
    const elapsed = state.gameTick - state.jurisdictionChangedAt;
    if (state.jurisdictionChangedAt > 0 && elapsed < state.cooldownQuarterTicks) return false;
    const jurisdiction = COMPANY_JURISDICTIONS.find(c => c.code === code);
    set({
      companyCountry: code,
      jurisdictionChangedAt: state.gameTick,
      ...(jurisdiction ? { taxRate: jurisdiction.corporateTax } : {}),
    });
    return true;
  },

  getCooldownRemaining: (type) => {
    const state = get();
    const changedAt = type === 'structure' ? state.structureChangedAt
      : type === 'residency' ? state.residencyChangedAt
      : state.jurisdictionChangedAt;
    if (changedAt === 0) return 0;
    const remaining = state.cooldownQuarterTicks - (state.gameTick - changedAt);
    return Math.max(0, remaining);
  },

  payFine: (amount) => set(state => {
    const payment = Math.min(amount, state.companyBalance, state.complianceFines);
    if (payment <= 0) return state;
    return {
      companyBalance: state.companyBalance - payment,
      complianceFines: state.complianceFines - payment,
    };
  }),

  setDifficulty: (d) => set(() => {
    // Difficulty affects board patience multiplier and review strictness
    const reviewIntervals = { easy: 720, normal: 540, hard: 360, legendary: 270 };
    return { difficulty: d, boardReviewInterval: reviewIntervals[d] };
  }),

  acceptPosition: (opp) => set(state => {
    // Save current career to history if we have an active contract
    const history = [...state.careerHistory];
    if (state.currentContract && !state.sacked) {
      history.push({
        companyName: 'Previous Role',
        structure: state.structure,
        startTick: state.currentContract.startTick,
        endTick: state.gameTick,
        endReason: 'resigned',
        peakNetWorth: state.netWorth,
        finalSatisfaction: state.boardSatisfaction,
      });
    }

    // Map difficulty to game difficulty
    const diffMap: Record<string, 'easy' | 'normal' | 'hard' | 'legendary'> = {
      easy: 'easy', normal: 'normal', hard: 'hard', legendary: 'legendary',
    };
    const diff = diffMap[opp.difficulty] || 'normal';
    // Review intervals & term lengths in game ticks (1 tick = 1 game minute).
    // Easy: review every ~3 months, term = 2 years. Legendary: review every ~1 month, term = 9 months.
    // 1 game month ≈ 43,200 ticks. 1 game quarter ≈ 129,600 ticks.
    const reviewIntervals = { easy: 129_600, normal: 86_400, hard: 43_200, legendary: 21_600 };
    const termLengths = { easy: 1_051_200, normal: 788_400, hard: 525_600, legendary: 394_200 };

    // Create new contract
    const newContract: CEOContract = {
      salary: opp.salary,
      bonusTarget: opp.netWorth * 1.5,
      bonusPayout: opp.bonus,
      termLength: termLengths[diff],
      startTick: state.gameTick,
      performanceClause: { easy: 15, normal: 25, hard: 35, legendary: 45 }[diff],
    };

    // XP from previous tenure
    const xpGained = state.sacked ? 0 : Math.floor((state.gameTick - (state.currentContract?.startTick || 0)) * 0.5);

    return {
      currentContract: newContract,
      careerHistory: history,
      sacked: false,
      sackedAt: 0,
      difficulty: diff,
      boardReviewInterval: reviewIntervals[diff],
      boardSatisfaction: 65,
      boardPatience: reviewIntervals[diff],
      ceoExperience: state.ceoExperience + xpGained,
      boardMembers: state.boardMembers.map(bm => ({ ...bm, patience: 70 + Math.round(Math.random() * 15) })),
      boardGoals: state.boardGoals.map(g => ({ ...g, met: false, deadline: g.deadline })),
      ticker: [
        { id: `t-${Date.now()}`, text: `NEW POSITION: Appointed CEO of ${opp.company}. Salary: €${opp.salary.toLocaleString()}/tick. Good luck.`, type: 'system' as const, timestamp: Date.now() },
        ...state.ticker,
      ].slice(0, 50),
    };
  }),

  // ── ECFL & FLOU Setters ──────────────────────────────────────
  markLessonComplete: (lessonId) => set(state => {
    if (state.completedLessons.includes(lessonId)) return {};
    const newLessons = [...state.completedLessons, lessonId];
    return { completedLessons: newLessons, flouLevel: Math.min(10, Math.floor((state.ecflScore + newLessons.length * 5) / 20)) };
  }),

  passExam: (examId, points) => set(state => {
    if (state.passedExams.includes(examId)) return {};
    const newScore = state.ecflScore + points;
    return {
      passedExams: [...state.passedExams, examId],
      ecflScore: newScore,
      flouLevel: Math.min(10, Math.floor((newScore + state.completedLessons.length * 5) / 20)),
    };
  }),

  transferToPersonal: (amount) => set(state => {
    if (!state.companyCountry || !state.residencyCountry) return state;
    if (state.companyBalance < amount || amount <= 0) return state;

    const result = computeTransfer(amount, state.companyCountry, state.residencyCountry);

    const newEvent: TickerEvent = {
      id: nextId('t'),
      text: `TRANSFER: €${amount.toLocaleString()} gross → €${result.netReceived.toLocaleString()} net · ${(result.effectiveRate * 100).toFixed(1)}% effective tax (WHT ${(result.whtRate * 100).toFixed(0)}% + personal ${(result.personalTaxRate * 100).toFixed(0)}%)`,
      type: 'fx',
      timestamp: Date.now(),
    };

    return {
      companyBalance:  state.companyBalance - amount,
      personalBalance: state.personalBalance + result.netReceived,
      ticker: [newEvent, ...state.ticker].slice(0, 50),
    };
  }),

  transferToCompany: (amount) => set(state => {
    if (state.personalBalance < amount || amount <= 0) return {};
    const newEvent: TickerEvent = {
      id: nextId('t'),
      text: `CAPITAL INJECTION: €${amount.toLocaleString()} deposited from personal funds into company account`,
      type: 'fx',
      timestamp: Date.now(),
    };
    return {
      personalBalance: state.personalBalance - amount,
      companyBalance: state.companyBalance + amount,
      ticker: [newEvent, ...state.ticker].slice(0, 50),
    };
  }),

  // ── Social actions ──────────────────────────────────────────
  socialLikePost: (postId) => set(state => {
    if (state.socialLikedPosts.includes(postId)) return {};
    return { socialLikedPosts: [...state.socialLikedPosts, postId], socialReputation: state.socialReputation + 1 };
  }),
  socialFollow: (profileId) => set(state => {
    if (state.socialFollowing.includes(profileId)) return {};
    return { socialFollowing: [...state.socialFollowing, profileId], socialReputation: state.socialReputation + 5, followers: state.followers + Math.floor(Math.random() * 20 + 5) };
  }),
  socialUnfollow: (profileId) => set(state => ({
    socialFollowing: state.socialFollowing.filter(id => id !== profileId),
  })),
  socialSaveClip: (clipId) => set(state => {
    if (state.socialSavedClips.includes(clipId)) return {};
    return { socialSavedClips: [...state.socialSavedClips, clipId], socialReputation: state.socialReputation + 2 };
  }),
  socialUnsaveClip: (clipId) => set(state => ({
    socialSavedClips: state.socialSavedClips.filter(id => id !== clipId),
  })),
  socialPublishPost: (text) => set(state => ({
    socialPosts: [{ id: nextId('sp'), text, timestamp: Date.now(), likes: 0, comments: 0, views: 0 }, ...state.socialPosts].slice(0, 50),
    socialReputation: state.socialReputation + 10,
    followers: state.followers + Math.floor(Math.random() * 30 + 10),
  })),
  socialWatchClip: () => set(state => ({
    socialClipsWatched: state.socialClipsWatched + 1,
    socialReputation: state.socialReputation + 1,
  })),

  // ── Notifications ────────────────────────────────────────────
  pushNotification: (notif) => set(state => ({
    notifications: [
      { ...notif, id: nextId('notif'), timestamp: Date.now(), dismissed: false },
      ...state.notifications,
    ].slice(0, 30),
  })),
  dismissNotification: (id) => set(state => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, dismissed: true } : n),
  })),
  clearNotifications: () => set({ notifications: [] }),

  // ── UI setters ───────────────────────────────────────────────
  selectNode:     (id)   => set({ selectedNodeId: id }),
  flyToNode:      (latitude, longitude, zoom = 6, nodeId) => set({ pendingFlyTo: { latitude, longitude, zoom, nodeId: nodeId || undefined }, selectedNodeId: nodeId || null }),
  consumeFlyTo:   ()     => set({ pendingFlyTo: null }),
  setActiveTab:   (tab)  => set({ activeTab: tab }),
  setCompanyBalance: (balance) => set({ companyBalance: balance }),
  setStructure:   (structure) => set({ structure }),
  setGameSpeed:   (speed) => set({ gameSpeed: speed }),
  setTerminalOpen:(open) => set({ terminalOpen: open }),
  setAthenaOpen:   (open) => set({ athenaOpen: open }),
  setPackOpen:    (open) => set({ packOpen: open }),
  setLeftRailOpen:(open) => set({ leftRailOpen: open }),
  setShowRoutes:  (show) => set({ showRoutes: show }),
  setTrafficEnabled: (v) => set({ trafficEnabled: v }),
  setSportsEnabled:  (v) => set({ sportsEnabled: v }),
  setSectorFilter:(filter) => set({ sectorFilter: filter }),

  pushTickerEvent: (text, type) => set(state => ({
    ticker: [
      { id: nextId('t'), text, type, timestamp: Date.now() },
      ...state.ticker,
    ].slice(0, 50),
  })),

  setAthenaSignal: (regime, score, stale) => set({ athenaRegime: regime, athenaScore: score, athenaStale: stale }),

  // ── Route management ────────────────────────────────────────
  buildRoute: (fromNodeId, toNodeId, type, corridorId, acquisition = 'built') => set(state => {
    const baseCost: Record<string, number> = { sea: 500_000, air: 750_000, rail: 600_000, truck: 300_000 };
    const baseIncome: Record<string, number> = { sea: 25_000, air: 35_000, rail: 20_000, truck: 15_000 };
    const acqMultiplier: Record<string, number> = { built: 1, bought: 1.5, subcontracted: 0.6, stolen: 0.3 };
    const incomeMultiplier: Record<string, number> = { built: 1, bought: 1, subcontracted: 0.5, stolen: 0.8 };

    const cost = Math.round((baseCost[type] || 300_000) * (acqMultiplier[acquisition] || 1));
    if (state.companyBalance < cost) return state;

    const revenue = Math.round((baseIncome[type] || 15_000) * (incomeMultiplier[acquisition] || 1));
    const corridor = corridorId ? TRADE_CORRIDORS.find(c => c.id === corridorId) : null;
    const newRoute: TradeRoute = {
      id: nextId('r'),
      fromNodeId,
      toNodeId,
      type,
      active: true,
      corridorId,
      level: 1,
      acquisition,
      monthlyRevenue: revenue,
      capacity: type === 'sea' ? 500 : type === 'air' ? 100 : type === 'rail' ? 300 : 150,
      speed: type === 'air' ? 9 : type === 'rail' ? 6 : type === 'truck' ? 7 : 4,
      security: acquisition === 'stolen' ? 3 : 5,
      upgrades: [],
      fromLat: corridor?.fromLat,
      fromLon: corridor?.fromLon,
      toLat: corridor?.toLat,
      toLon: corridor?.toLon,
    };
    const heatGain = acquisition === 'stolen' ? 15 : 0;
    return {
      companyBalance: state.companyBalance - cost,
      routes: [...state.routes, newRoute],
      monthlyIncome: state.monthlyIncome + revenue,
      heat: clamp(state.heat + heatGain, 0, 100),
      ticker: [{ id: nextId('t'), text: `ROUTE: ${acquisition.toUpperCase()} ${type} route via ${corridorId || 'custom'} — ${acquisition === 'stolen' ? '⚠ COVERT' : '✓ ESTABLISHED'}`, type: 'intel' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  toggleRoute: (routeId) => set(state => ({
    routes: state.routes.map(r => r.id === routeId ? { ...r, active: !r.active } : r),
  })),

  upgradeRoute: (routeId, upgradeName, cost) => set(state => {
    if (state.companyBalance < cost) return state;
    return {
      companyBalance: state.companyBalance - cost,
      routes: state.routes.map(r => {
        if (r.id !== routeId) return r;
        const newLevel = Math.min((r.level || 1) + 1, 5);
        const bonusIncome = Math.round((r.monthlyRevenue || 15_000) * 0.2);
        return {
          ...r,
          level: newLevel,
          monthlyRevenue: (r.monthlyRevenue || 15_000) + bonusIncome,
          capacity: Math.round((r.capacity || 100) * 1.25),
          speed: Math.min((r.speed || 5) + 1, 10),
          security: Math.min((r.security || 5) + 1, 10),
          upgrades: [...(r.upgrades || []), { id: nextId('u'), name: upgradeName, applied: true }],
        };
      }),
      monthlyIncome: state.monthlyIncome + Math.round(15_000 * 0.2),
      ticker: [{ id: nextId('t'), text: `UPGRADE: ${upgradeName} applied to route`, type: 'intel' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  // ── R&D management ─────────────────────────────────────────
  startResearch: (projectId) => set(state => {
    const project = state.rdProjects.find(p => p.id === projectId);
    if (!project || project.status !== 'available') return state;
    if (state.companyBalance < project.cost) return state;
    return {
      companyBalance: state.companyBalance - project.cost,
      rdProjects: state.rdProjects.map(p =>
        p.id === projectId ? { ...p, status: 'researching' as const, progress: 0 } : p
      ),
      ticker: [{ id: nextId('t'), text: `R&D: Started research — ${project.name}`, type: 'intel' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  tickResearch: () => set(state => {
    let changed = false;
    const newProjects = state.rdProjects.map(p => {
      if (p.status !== 'researching') return p;
      changed = true;
      const newProgress = Math.min(p.progress + (100 / p.duration), 100);
      if (newProgress >= 100) {
        return { ...p, progress: 100, status: 'completed' as const };
      }
      return { ...p, progress: newProgress };
    });
    if (!changed) return {};
    return { rdProjects: newProjects };
  }),

  // ── accelerateConstruction ────────────────────────────────────
  // Rush a building node to completion. Cost = 50% of capex × remaining months.
  accelerateConstruction: (nodeId) => {
    const state = get();
    const node = state.nodes[nodeId];
    if (!node || node.status !== 'building' || node.buildStartTick == null || node.buildDuration == null) {
      return { success: false, cost: 0, message: 'No active construction on this node.' };
    }
    const remaining = Math.max(1, (node.buildStartTick + node.buildDuration) - state.gameTick);
    const rushCost = Math.round((node.capex ?? 50000) * 0.5 * (remaining / node.buildDuration));
    if (state.companyBalance < rushCost) {
      return { success: false, cost: rushCost, message: `Insufficient funds. Need €${rushCost.toLocaleString()}.` };
    }
    set({
      companyBalance: state.companyBalance - rushCost,
      nodes: {
        ...state.nodes,
        [nodeId]: {
          ...node,
          status: 'operational' as NodeStatus,
          income: Math.round((node.opex ?? 10_000) * 2.5),
          buildStartTick: undefined,
          buildDuration: undefined,
          endsIn: undefined,
        },
      },
      ticker: [
        { id: nextId('t'), text: `RUSH ORDER: ${node.name} completed instantly for €${rushCost.toLocaleString()} premium.`, type: 'info' as const, timestamp: Date.now() },
        ...state.ticker,
      ].slice(0, 50),
      notifications: [
        { id: nextId('notif'), type: 'construction' as const, title: 'Rush Complete', message: `${node.name} is now operational (rush fee: €${rushCost.toLocaleString()}).`, timestamp: Date.now(), dismissed: false, navigateTo: { app: 'globe', nodeId, flyTo: { lat: node.lat, lon: node.lon } } },
        ...state.notifications,
      ].slice(0, 30),
    });
    return { success: true, cost: rushCost, message: `Rushed ${node.name} for €${rushCost.toLocaleString()}.` };
  },

  // ── accelerateResearch ───────────────────────────────────────
  // Rush a researching R&D project to completion. Cost = project cost × 0.75 × remaining fraction.
  accelerateResearch: (projectId) => {
    const state = get();
    const project = state.rdProjects.find(p => p.id === projectId);
    if (!project || project.status !== 'researching') {
      return { success: false, cost: 0, message: 'No active research on this project.' };
    }
    const remainingFraction = (100 - project.progress) / 100;
    const rushCost = Math.round(project.cost * 0.75 * remainingFraction);
    if (state.companyBalance < rushCost) {
      return { success: false, cost: rushCost, message: `Insufficient funds. Need €${rushCost.toLocaleString()}.` };
    }
    set({
      companyBalance: state.companyBalance - rushCost,
      rdProjects: state.rdProjects.map(p =>
        p.id === projectId ? { ...p, progress: 100, status: 'completed' as const } : p
      ),
      ticker: [
        { id: nextId('t'), text: `RUSH R&D: ${project.name} completed instantly for €${rushCost.toLocaleString()} premium.`, type: 'intel' as const, timestamp: Date.now() },
        ...state.ticker,
      ].slice(0, 50),
      notifications: [
        { id: nextId('notif'), type: 'research' as const, title: 'R&D Rush Complete', message: `${project.name} — ${project.effect} (rush fee: €${rushCost.toLocaleString()}).`, timestamp: Date.now(), dismissed: false, navigateTo: { app: 'globe', tab: 'rnd' } },
        ...state.notifications,
      ].slice(0, 30),
    });
    return { success: true, cost: rushCost, message: `Rushed ${project.name} for €${rushCost.toLocaleString()}.` };
  },

  // ── purchaseNode ─────────────────────────────────────────────
  purchaseNode: (nodeId, method) => set(state => {
    if (state.assetsFrozen) return state; // asset freeze blocks purchases
    const node = state.nodes[nodeId];
    if (!node || node.owner !== 'market') return state;

    const cost = method === 'build'
      ? (node.capex ?? 0) * 0.6
      : (node.capex ?? 0);

    if (state.companyBalance < cost) return state;

    const acquired: EmpireNode = {
      ...node,
      owner:  'player',
      status: method === 'build' ? 'building' : 'operational',
      income: method === 'build' ? 0 : Math.round((node.opex ?? 10_000) * 2.5),
      ...(method === 'build' ? { buildStartTick: state.gameTick, buildDuration: 788_400 } : {}), // ~18 game months construction (= ~9 real days at 1s/tick)
    };

    // Emit node purchased event for MarketWire
    setTimeout(() => eventBridge.emit(EVENTS.WORLD_NODE_PURCHASED, {
      nodeId, name: node.name, sector: (node as any).sector, region: (node as any).region, cost,
    }), 0);

    broadcastMatchActivity('acquire_node', `${node.name} (${method})`);

    return {
      companyBalance: state.companyBalance - cost,
      nodes: { ...state.nodes, [nodeId]: acquired },
    };
  }),

  // ── purchaseNamingRights ─────────────────────────────────────
  purchaseNamingRights: (nodeId, newName) => set(state => {
    const node = state.nodes[nodeId];
    if (!node || !node.canBeRenamed || !node.namingRightsCost) return state;
    if (state.personalBalance < node.namingRightsCost) return state;

    const ops = node.renameEffect ? parseEffects(node.renameEffect) : [];
    const effectPatch = applyEffectOps(state, ops);

    // Remove the renaming flag so it cannot be bought infinitely
    const acquired: EmpireNode = {
      ...node,
      name: newName,
      originalName: node.name,
      canBeRenamed: false,
    };

    const newEvent: TickerEvent = {
      id: nextId('t'),
      text: `PHILANTHROPY: Donated €${node.namingRightsCost.toLocaleString()} to rename ${node.name} to ${newName}. Impact: ${node.renameEffect}`,
      type: 'board',
      timestamp: Date.now(),
    };

    return {
      personalBalance: Math.max(0, state.personalBalance - node.namingRightsCost),
      nodes: { ...state.nodes, [nodeId]: acquired },
      ticker: [newEvent, ...state.ticker].slice(0, 50),
      ...effectPatch,
    };
  }),

  // ── upgradeNode ──────────────────────────────────────────────
  upgradeNode: (nodeId) => set(state => {
    const node = state.nodes[nodeId];
    if (!node || node.owner !== 'player' || node.status !== 'operational') return state;
    if (node.level >= 5) return state;

    const upgradeCost = node.income * 12; // 1 year of income as capex
    if (state.companyBalance < upgradeCost) return state;

    const upgraded: EmpireNode = {
      ...node,
      level:  node.level + 1,
      income: Math.round(node.income * 1.35), // +35% income per level
    };

    return {
      companyBalance: state.companyBalance - upgradeCost,
      nodes: { ...state.nodes, [nodeId]: upgraded },
    };
  }),

  // ── stealNode (private server PvP: hostile takeover of rival/market node) ──
  stealNode: (nodeId) => {
    const state = get();
    const node = state.nodes[nodeId];
    if (!node || node.owner === 'player') return { success: false, cost: 0 };

    // Cost = 150% of node capex (premium for hostile takeover)
    const cost = Math.round((node.capex ?? 50_000) * 1.5);
    if (state.companyBalance < cost) return { success: false, cost };

    // Success chance: 60% base, +10% per company balance ratio advantage
    const balanceRatio = state.companyBalance / Math.max(cost, 1);
    const successChance = Math.min(0.9, 0.6 + (balanceRatio - 1) * 0.1);
    const success = Math.random() < successChance;

    if (success) {
      const stolen: EmpireNode = {
        ...node,
        owner: 'player',
        status: 'operational',
        income: node.income || Math.round((node.opex ?? 10_000) * 2.5),
      };
      set({
        companyBalance: state.companyBalance - cost,
        heat: Math.min(100, state.heat + 15), // hostile takeovers generate heat
        nodes: { ...state.nodes, [nodeId]: stolen },
        ticker: [{
          id: `t-steal-${Date.now()}`,
          text: `HOSTILE TAKEOVER: Acquired ${node.name} for €${cost.toLocaleString()}`,
          type: 'board' as const,
          timestamp: Date.now(),
        }, ...state.ticker].slice(0, 50),
      });
    } else {
      // Failed attempt: lose half the cost + heat
      const lostCost = Math.round(cost * 0.5);
      set({
        companyBalance: state.companyBalance - lostCost,
        heat: Math.min(100, state.heat + 10),
        ticker: [{
          id: `t-steal-fail-${Date.now()}`,
          text: `TAKEOVER FAILED: Lost €${lostCost.toLocaleString()} attempting to acquire ${node.name}`,
          type: 'alert' as const,
          timestamp: Date.now(),
        }, ...state.ticker].slice(0, 50),
      });
    }

    return { success, cost };
  },

  // ── poachAgent (private server PvP: steal an agent from opponent's pool) ──
  poachAgent: (_agentMintId, ownerName) => {
    const state = get();
    // Cost = €50k base poaching fee
    const cost = 50_000;
    if (state.companyBalance < cost) return { success: false, cost };

    // 50% base success
    const success = Math.random() < 0.5;

    if (success) {
      set({
        companyBalance: state.companyBalance - cost,
        heat: Math.min(100, state.heat + 8),
        ticker: [{
          id: `t-poach-${Date.now()}`,
          text: `AGENT POACHED: Recruited agent from ${ownerName} for €${cost.toLocaleString()}`,
          type: 'board' as const,
          timestamp: Date.now(),
        }, ...state.ticker].slice(0, 50),
      });
    } else {
      const lostCost = Math.round(cost * 0.3);
      set({
        companyBalance: state.companyBalance - lostCost,
        heat: Math.min(100, state.heat + 5),
        ticker: [{
          id: `t-poach-fail-${Date.now()}`,
          text: `POACH FAILED: Lost €${lostCost.toLocaleString()} trying to recruit from ${ownerName}`,
          type: 'alert' as const,
          timestamp: Date.now(),
        }, ...state.ticker].slice(0, 50),
      });
    }

    return { success, cost };
  },

  // ── startProject ─────────────────────────────────────────────
  startProject: (projectId) => set(state => {
    const idx = state.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return state;

    const project = state.projects[idx];
    if (project.active) return state;
    if (state.companyBalance < project.cost) return state;

    const roll = Math.random() * 100;
    const succeeded = roll < project.successRate;

    const ops = succeeded ? parseEffects(project.effect) : [];
    const effectPatch = succeeded ? applyEffectOps(state, ops) : {};

    const tickerText = succeeded
      ? `PROJECT SUCCESS: ${project.name} — ${project.effect}`
      : `PROJECT FAILED: ${project.name} (roll ${roll.toFixed(0)} vs ${project.successRate}% threshold)`;

    const newEvent: TickerEvent = {
      id: nextId('t'),
      text: tickerText,
      type: succeeded ? 'intel' : 'alert',
      timestamp: Date.now(),
    };

    const updatedProjects = state.projects.map((p, i) =>
      i === idx ? { ...p, active: succeeded } : p
    );

    return {
      companyBalance: state.companyBalance - project.cost,
      projects: updatedProjects,
      ticker: [newEvent, ...state.ticker].slice(0, 50),
      ...effectPatch,
    };
  }),

  // ── executeCrime ─────────────────────────────────────────────
  executeCrime: (crimeId) => set(state => {
    const crime = state.crimes.find(c => c.id === crimeId);
    if (!crime) return state;

    const roll = Math.random() * 100;
    const detected = roll < crime.detectionPct;

    if (detected) {
      // Parse penalty multiplier: "2x" → 2, "3x" → 3
      const multiplier = parseFloat(crime.penaltyMultiplier.replace('x', '')) || 2;
      const basePenalty = state.monthlyIncome * 0.5; // 50% of monthly income as base fine
      const fine = Math.round(basePenalty * multiplier);

      const axisPatch = applyAxisHit(state, crime.axisHit);

      const newEvent: TickerEvent = {
        id: nextId('t'),
        text: `CRIME DETECTED: ${crime.name} — €${fine.toLocaleString()} fine · Heat +${crime.heatGain} · ${crime.axisHit}`,
        type: 'crime',
        timestamp: Date.now(),
      };

      return {
        companyBalance: Math.max(0, state.companyBalance - fine),
        heat: clamp(state.heat + crime.heatGain, 0, 100),
        ticker: [newEvent, ...state.ticker].slice(0, 50),
        ...axisPatch,
      };
    } else {
      // Undetected: revenue windfall — 20-40% of monthly income
      const windfall = Math.round(state.monthlyIncome * (0.20 + Math.random() * 0.20));

      const newEvent: TickerEvent = {
        id: nextId('t'),
        text: `CRIME CLEAR: ${crime.name} undetected — +€${windfall.toLocaleString()} unreported revenue`,
        type: 'crime',
        timestamp: Date.now(),
      };

      return {
        companyBalance: state.companyBalance + windfall,
        ticker: [newEvent, ...state.ticker].slice(0, 50),
      };
    }
  }),

  // ── decryptIntel ─────────────────────────────────────────────
  decryptIntel: (nodeId) => set(state => {
    const node = state.nodes[nodeId];
    if (!node || node.owner !== 'rival') return state;
    if (node.intelDecrypted) return state;

    const INTEL_COST = 15_000;
    if (state.companyBalance < INTEL_COST) return state;

    const newEvent: TickerEvent = {
      id: nextId('t'),
      text: `INTEL DECRYPTED: ${node.name} — Sector ${node.type.replace('_', '/')} · Level ${node.level} · €${node.income.toLocaleString()}/mo`,
      type: 'intel',
      timestamp: Date.now(),
    };

    return {
      companyBalance: state.companyBalance - INTEL_COST,
      nodes: { ...state.nodes, [nodeId]: { ...node, intelDecrypted: true } },
      ticker: [newEvent, ...state.ticker].slice(0, 50),
    };
  }),

  // ── executeCyberStrike ───────────────────────────────────────
  executeCyberStrike: (nodeId) => set(state => {
    const node = state.nodes[nodeId];
    if (!node || node.owner !== 'rival') return state;

    const cost = node.income * 24;
    if (state.companyBalance < cost) return state;

    const successPct = 20 + (state.power * 0.5);
    const roll = Math.random() * 100;
    const succeeded = roll < successPct;

    if (succeeded) {
      const acquired: EmpireNode = {
        ...node,
        owner: 'player',
        status: 'operational',
        intelDecrypted: false,
      };
      const newEvent: TickerEvent = {
        id: nextId('t'),
        text: `CYBER-STRIKE SUCCESS: ${node.name} seized — now under player control`,
        type: 'intel',
        timestamp: Date.now(),
      };
      return {
        companyBalance: state.companyBalance - cost,
        nodes: { ...state.nodes, [nodeId]: acquired },
        ticker: [newEvent, ...state.ticker].slice(0, 50),
      };
    } else {
      const newEvent: TickerEvent = {
        id: nextId('t'),
        text: `CYBER-STRIKE FAILED: ${node.name} held — €${cost.toLocaleString()} burned · Heat +25`,
        type: 'alert',
        timestamp: Date.now(),
      };
      return {
        companyBalance: state.companyBalance - cost,
        heat: clamp(state.heat + 25, 0, 100),
        ticker: [newEvent, ...state.ticker].slice(0, 50),
      };
    }
  }),

  // ── openPack ─────────────────────────────────────────────────
  openPack: () => {
    const state = get();
    if (state.companyBalance < PACK_COST) return [];

    let pityCounter = state.packsSinceDiamond + 1;
    const drawn: EmployeeCard[] = [];

    for (let i = 0; i < CARDS_PER_PACK; i++) {
      const tier = drawTier(pityCounter);
      const card = generateCard(tier);
      drawn.push(card);
      if (tier === 'Diamond' || tier === 'Icon') pityCounter = 0;
    }

    const newCards: Record<string, EmployeeCard> = { ...state.cards };
    drawn.forEach(c => { newCards[c.id] = c; });

    const newEvent: TickerEvent = {
      id: nextId('t'),
      text: `PACK OPENED: ${drawn.map(c => `${c.name} (${c.tier})`).join(' · ')}`,
      type: 'board',
      timestamp: Date.now(),
    };

    set({
      companyBalance: state.companyBalance - PACK_COST,
      packsSinceDiamond: pityCounter,
      cards: newCards,
      ticker: [newEvent, ...state.ticker].slice(0, 50),
    });

    return drawn;
  },

  // ── processTick ──────────────────────────────────────────────
  processTick: () => set(state => {
    let incomeDelta = 0;

    const ownedNodes = Object.values(state.nodes).filter(
      n => n.owner === 'player' && n.status === 'operational'
    );

    // Set Bonus Monopoly: count player-owned operational nodes per sector type
    const typeCounts: Record<string, number> = {};
    for (const node of ownedNodes) {
      typeCounts[node.type] = (typeCounts[node.type] ?? 0) + 1;
    }

    for (const node of ownedNodes) {
      let multiplier = 1.0;

      // 1.5x monopoly bonus when player controls >= 3 nodes of the same type
      if ((typeCounts[node.type] ?? 0) >= 3) multiplier *= 1.5;

      for (const card of Object.values(state.cards)) {
        // Match card stat to node sector or throughput bonus
        if (
          card.stat.toLowerCase().includes(node.type) ||
          card.stat.toLowerCase().includes('throughput') ||
          card.stat.toLowerCase().includes('route efficiency')
        ) {
          multiplier *= card.multiplier;
        }
      }

      // Living World Engine: apply world sim modifiers to world-linked nodes
      if (node.worldNodeId) {
        const mod = useWorldSimStore.getState().getNodeModifier(node.worldNodeId);
        multiplier *= mod.income;
      }

      incomeDelta += node.income * multiplier;
    }

    // Process fund yields (with defensive guards for legacy persisted funds missing edge/targetYield)
    let fundYieldTotal = 0;
    const updatedFunds = state.funds.map(fund => {
      if (!fund.stakedAmount || fund.stakedAmount <= 0) return fund;

      const edge = typeof fund.edge === 'number' && isFinite(fund.edge) ? fund.edge : 0.55;
      const targetYield = typeof fund.targetYield === 'number' && isFinite(fund.targetYield) ? fund.targetYield : 0.8;

      const isPositive = Math.random() <= edge;
      let yieldAmt = 0;
      if (isPositive) {
         yieldAmt = fund.stakedAmount * (targetYield / 100);
      } else {
         yieldAmt = -fund.stakedAmount * (targetYield / 100) * 0.5;
      }
      // Safety: never let yield be NaN or Infinity
      if (!isFinite(yieldAmt)) yieldAmt = 0;
      fundYieldTotal += yieldAmt;
      return { ...fund, stakedAmount: fund.stakedAmount + yieldAmt, edge, targetYield };
    });

    // Node income is MONTHLY — applied at month-end alongside expenses
    const netIncome = Math.round(incomeDelta * (1 - state.taxRate));
    // Heat decays 5x faster in private server / PvP matches
    const heatDecayRate = useMatchStore.getState().active ? 1.0 : 0.2;
    const newHeat = Math.max(0, state.heat - heatDecayRate);
    const newBalance = state.companyBalance; // node income added at month-end, not per tick
    const nodeAssetValue = ownedNodes.reduce((s, n) => s + (n.capex ?? 0), 0);
    const sportsAssetValue = state.sportsFranchises.filter(f => f.owned).reduce((s, f) => s + (f.value ?? 0), 0);
    const vcAssetValue = state.vcDeals.filter(d => d.owned).reduce((s, d) => s + (d.valuation * d.equityOffered / 100), 0);
    const peAssetValue = state.peTargets.filter(t => t.owned).reduce((s, t) => s + (t.askingPrice ?? 0), 0);
    const mediaAssetValue = state.mediaOutlets.filter(o => o.owned).reduce((s, o) => s + (o.acquisitionCost ?? 0), 0);
    const auctionAssetValue = state.auctionItems.filter(a => a.owned).reduce((s, a) => s + (a.estimatedValue ?? 0), 0);
    const hfAllocatedCapital = state.hfStrategies.filter(s => s.active).reduce((sum, s) => sum + (s.capitalAllocated ?? 0), 0);
    const portfolioAssetValue = Object.values(state.portfolio).reduce((s, p) => s + (p.quantity * p.avgCost), 0);
    const shoppingAssetValue = (state.shoppingAssets || []).filter(a => a.owned).reduce((s, a) => s + (a.value ?? 0), 0);
    const newNetWorth = newBalance + Math.round(fundYieldTotal) + state.personalBalance + nodeAssetValue + sportsAssetValue + vcAssetValue + peAssetValue + mediaAssetValue + auctionAssetValue + hfAllocatedCapital + portfolioAssetValue + shoppingAssetValue;

    // 20% chance of a live FX ticker event per tick
    let ticker = state.ticker;
    if (Math.random() < 0.2) {
      const pairs = ['EUR/USD', 'GBP/EUR', 'USD/JPY', 'BTC/USD'] as const;
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      const move = ((Math.random() * 1.0) - 0.5).toFixed(2);
      const sign = parseFloat(move) >= 0 ? '+' : '';
      ticker = [
        { id: nextId('t'), text: `${pair} ${sign}${move}%`, type: 'fx' as const, timestamp: Date.now() },
        ...ticker,
      ].slice(0, 50);
    }
    
    // Add ticker events for huge fund yields
    if (Math.abs(fundYieldTotal) > 500000) {
      const sign = fundYieldTotal > 0 ? '+' : '';
      const statusStr = fundYieldTotal > 0 ? 'YIELDED' : 'DRAWDOWN';
       ticker = [
        { id: nextId('t'), text: `INSTITUTIONAL ASSETS ${statusStr}: ${sign}€${(fundYieldTotal / 1_000_000).toFixed(2)}M`, type: 'board' as const, timestamp: Date.now() },
        ...ticker,
      ].slice(0, 50);
    }

    // ── Compliance Penalties ──────────────────────────────────
    const newTick = state.gameTick + 1;
    let complianceFines = state.complianceFines;
    let governanceWarnings = state.governanceWarnings;
    let assetsFrozen = state.assetsFrozen;
    let ceoApproval = state.ceoApproval;

    // Governance penalty: below 25 = fine each tick
    // Skip fines until the player has completed at least one project or has governance > 0 from own actions
    const hasCompletedAnyProject = state.projects.some(p => p.active);
    const hasOwnGovernance = state.governance > 0;
    const isEarlyGame = !hasCompletedAnyProject && !hasOwnGovernance && ownedNodes.length <= 1;
    if (state.governance < 25 && !isEarlyGame) {
      const fine = Math.round(Math.max(500, state.netWorth * 0.001)); // 0.1% of net worth, min €500
      complianceFines += fine;
      governanceWarnings++;
      if (governanceWarnings % 10 === 0) {
        ticker = [
          { id: nextId('t'), text: `COMPLIANCE: €${fine.toLocaleString()} fine — governance below regulatory threshold`, type: 'alert' as const, timestamp: Date.now() },
          ...ticker,
        ].slice(0, 50);
      }
    } else {
      governanceWarnings = Math.max(0, governanceWarnings - 1);
    }

    // Heat penalty: above 80 = asset freeze (can't buy nodes/assets)
    if (state.heat > 80) {
      assetsFrozen = true;
      if (!state.assetsFrozen) {
        ticker = [
          { id: nextId('t'), text: 'REGULATORY ALERT: Assets frozen — heat exceeded 80. Reduce heat to resume operations.', type: 'alert' as const, timestamp: Date.now() },
          ...ticker,
        ].slice(0, 50);
      }
    } else if (state.heat <= 60) {
      // Unfreeze when heat drops below 60 (hysteresis to prevent flapping)
      if (assetsFrozen) {
        assetsFrozen = false;
        ticker = [
          { id: nextId('t'), text: 'REGULATORY: Asset freeze lifted — heat returned to acceptable levels.', type: 'alert' as const, timestamp: Date.now() },
          ...ticker,
        ].slice(0, 50);
      }
    }

    // Heat above 60 = income penalty (10% reduction)
    let incomeMultiplier = 1.0;
    if (state.heat > 60) incomeMultiplier *= 0.90;
    if (state.heat > 80) incomeMultiplier *= 0.80; // stacks: 72% total

    // Auto-deduct fines from company balance (monthly — applied at month-end)
    let fineDeduction = 0;
    if (complianceFines > 0 && newBalance > 0) {
      fineDeduction = Math.min(Math.round(complianceFines * 0.1), newBalance); // pay 10% of outstanding fines per month
    }

    // CEO approval decay from fines/heat
    if (complianceFines > 10000) ceoApproval = Math.max(0, ceoApproval - 1);
    if (state.heat > 60) ceoApproval = Math.max(0, ceoApproval - 0.5);

    // ── Board of Directors ──────────────────────────────────
    let boardSatisfaction = state.boardSatisfaction;
    let boardPatience = state.boardPatience;
    let sacked = state.sacked;
    let sackedAt = state.sackedAt;
    let boardMembers = state.boardMembers;
    let boardGoals = state.boardGoals;
    let ceoExperience = state.ceoExperience;

    // CEO salary from contract — skip for early game to avoid draining new players
    let salaryPaid = 0;
    if (state.currentContract && !sacked && newTick >= 10) {
      salaryPaid = state.currentContract.salary;
    }

    // Board member patience drifts based on their focus area
    boardMembers = boardMembers.map(bm => {
      let delta = 0;
      if (bm.focus === 'growth' && state.growth < 30) delta = -0.5;
      else if (bm.focus === 'growth' && state.growth > 50) delta = 0.2;
      if (bm.focus === 'governance' && state.governance < 30) delta = -0.8;
      else if (bm.focus === 'governance' && state.governance > 50) delta = 0.3;
      if (bm.focus === 'profit' && state.monthlyIncome < 10000) delta = -0.3;
      else if (bm.focus === 'profit' && state.monthlyIncome > 100000) delta = 0.4;
      if (bm.focus === 'esg') {
        const esg = Math.round((state.impact * 0.6 + (100 - state.heat) * 0.4 + state.governance * 0.5) / 2);
        if (esg < 30) delta = -0.5;
        else if (esg > 60) delta = 0.3;
      }
      // Difficulty modifier
      const diffMult = { easy: 0.5, normal: 1.0, hard: 1.5, legendary: 2.0 }[state.difficulty];
      if (delta < 0) delta *= diffMult;
      return { ...bm, patience: clamp(bm.patience + delta, 0, 100) };
    });

    // Board satisfaction = average of member patience
    boardSatisfaction = Math.round(boardMembers.reduce((s, m) => s + m.patience, 0) / boardMembers.length);

    // Board review — check goals at interval
    boardPatience--;
    if (boardPatience <= 0 && !sacked) {
      boardPatience = state.boardReviewInterval;

      // Evaluate goals
      boardGoals = boardGoals.map(goal => {
        let currentValue = 0;
        switch (goal.metric) {
          case 'netWorth': currentValue = newNetWorth; break;
          case 'growth': currentValue = state.growth; break;
          case 'governance': currentValue = state.governance; break;
          case 'monthlyIncome': currentValue = Math.round(incomeDelta); break;
          case 'followers': currentValue = state.followers; break;
          case 'heat': currentValue = state.heat; break;
          case 'esgScore': currentValue = Math.round((state.impact * 0.6 + (100 - state.heat) * 0.4 + state.governance * 0.5 + state.impact * 0.3) / 2); break;
        }
        const met = goal.direction === 'above' ? currentValue >= goal.target : currentValue <= goal.target;
        return { ...goal, met };
      });

      // Apply goal results to satisfaction
      const metCount = boardGoals.filter(g => g.met).length;
      const missedCount = boardGoals.filter(g => !g.met).length;
      boardSatisfaction = clamp(boardSatisfaction + metCount * 5 - missedCount * 10, 0, 100);

      // Generate new goals for next quarter
      const possibleGoals: BoardGoal[] = [
        { id: nextId('bg'), description: `Reach ${fmt_simple(newNetWorth * 1.3)} net worth`, metric: 'netWorth', target: Math.round(newNetWorth * 1.3), direction: 'above', deadline: newTick + state.boardReviewInterval, met: false, reward: '+10 Satisfaction', penalty: '-15 Satisfaction' },
        { id: nextId('bg'), description: `Grow monthly income to ${fmt_simple(Math.round(incomeDelta * 1.5))}`, metric: 'monthlyIncome', target: Math.round(incomeDelta * 1.5), direction: 'above', deadline: newTick + state.boardReviewInterval, met: false, reward: '+8 Satisfaction', penalty: '-10 Satisfaction' },
        { id: nextId('bg'), description: 'Keep heat below 50', metric: 'heat', target: 50, direction: 'below', deadline: newTick + state.boardReviewInterval, met: false, reward: '+5 Satisfaction', penalty: '-20 Satisfaction' },
        { id: nextId('bg'), description: 'Maintain governance above 40', metric: 'governance', target: 40, direction: 'above', deadline: newTick + state.boardReviewInterval, met: false, reward: '+5 Satisfaction', penalty: '-10 Satisfaction' },
        { id: nextId('bg'), description: `Reach ${(state.followers * 1.5).toLocaleString()} followers`, metric: 'followers', target: Math.round(state.followers * 1.5), direction: 'above', deadline: newTick + state.boardReviewInterval, met: false, reward: '+5 Satisfaction', penalty: '-5 Satisfaction' },
      ];
      // Pick 3 random goals
      boardGoals = possibleGoals.sort(() => Math.random() - 0.5).slice(0, 3);

      ticker = [
        { id: nextId('t'), text: `BOARD REVIEW: ${metCount}/${metCount + missedCount} goals met. Satisfaction: ${boardSatisfaction}%.${boardSatisfaction < 30 ? ' ⚠️ WARNING: Performance under scrutiny.' : ''}`, type: 'board' as const, timestamp: Date.now() },
        ...ticker,
      ].slice(0, 50);

      // Sacking check
      const sackThreshold = { easy: 15, normal: 25, hard: 35, legendary: 45 }[state.difficulty];
      if (boardSatisfaction <= sackThreshold) {
        sacked = true;
        sackedAt = newTick;
        ceoExperience += newTick; // accumulate experience
        ticker = [
          { id: nextId('t'), text: `BOARD: CEO SACKED — Board satisfaction dropped to ${boardSatisfaction}%. Your tenure has ended.`, type: 'alert' as const, timestamp: Date.now() },
          ...ticker,
        ].slice(0, 50);
      }
    }

    // ── Agent payroll — only deployed agents cost salary, paid monthly ──
    const agentState = useAgentCardStore.getState();
    const deployedAgents = Object.values(agentState.agents).filter(a => a.deployedTo != null);
    let totalAgentPayroll = 0;
    for (const agent of deployedAgents) {
      const def = getAgentById(agent.cardId);
      if (!def) continue;
      // Monthly salary based on rarity
      const SALARY_TABLE: Record<string, number> = {
        Common: 1_500, Uncommon: 3_600, Rare: 9_000, Epic: 22_500, Legendary: 60_000, Mythic: 150_000,
      };
      const baseSalary = SALARY_TABLE[def.rarity] ?? 1_500;
      // +10% per agent level above 1
      const levelBonus = 1 + (agent.level - 1) * 0.10;
      totalAgentPayroll += Math.round(baseSalary * levelBonus);
    }

    const adjustedIncome = Math.round(incomeDelta * incomeMultiplier);

    // ── Transport Empire revenue & costs ──
    let transportRevenue = 0;
    let transportCosts = 0;
    let infraFeeIncome = 0;
    for (const tc of state.transportCompanies) {
      // Route revenue
      for (const route of tc.routes) {
        if (!route.active) continue;
        transportRevenue += route.ticketRevenue * route.frequency;
        transportCosts += route.fuelCost * route.frequency;
        transportCosts += route.landingFee * route.frequency; // fees paid to other airport/port owners
      }
      // Fleet maintenance
      transportCosts += tc.monthlyCost;
    }
    // Infrastructure fee income (player-owned airports/ports collecting fees from NPC traffic)
    for (const fee of state.infraFees) {
      if (fee.ownerIsPlayer) {
        infraFeeIncome += fee.feePerUse * fee.usesPerTick;
      }
    }

    // ── Sports franchise revenue (monthly) ──
    let sportsRevenue = 0;
    for (const franchise of state.sportsFranchises) {
      if (franchise.owned && franchise.monthlyRevenue) {
        sportsRevenue += franchise.monthlyRevenue;
      }
    }

    // ── Trade route revenue (monthly) ──
    let routeRevenue = 0;
    for (const route of state.routes) {
      if (route.active && route.monthlyRevenue) {
        routeRevenue += route.monthlyRevenue;
      }
    }

    // ── Media outlet revenue (monthly) ──
    let mediaRevenue = 0;
    for (const outlet of state.mediaOutlets) {
      if (outlet.owned && outlet.monthlyRevenue) {
        mediaRevenue += outlet.monthlyRevenue;
      }
    }

    // ── Hedge fund management fees as expense (monthly) ──
    let hfManagementFees = 0;
    for (const strategy of state.hfStrategies) {
      if (strategy.active && strategy.capitalAllocated > 0) {
        hfManagementFees += (strategy.capitalAllocated * strategy.managementFee / 100) / 12;
      }
    }

    // ── IB deal advisory fee revenue (monthly) ──
    let ibAdvisoryRevenue = 0;
    for (const deal of state.ibDeals) {
      if (deal.status === 'in-progress' && deal.dealSize && deal.advisoryFee && deal.duration) {
        ibAdvisoryRevenue += (deal.dealSize * deal.advisoryFee / 100) / deal.duration;
      }
    }

    // Daily settlement: 1 tick = 1 game minute. 1 game day = 1440 ticks (= 24 real min at 1s/tick).
    // Settlement occurs once per game day. All revenue/costs stored as monthly → daily = monthly / 30.
    const TICKS_PER_DAY = 1440; // 24h × 60min
    const isDayEnd = newTick % TICKS_PER_DAY === 0 && newTick > 0;

    let finalBalance = newBalance + Math.round(fundYieldTotal) + transportRevenue - transportCosts + infraFeeIncome;
    if (isDayEnd) {
      const DAILY_FACTOR = 1 / 30;
      finalBalance += Math.round(netIncome * DAILY_FACTOR) + Math.round(sportsRevenue * DAILY_FACTOR) + Math.round(routeRevenue * DAILY_FACTOR);
      finalBalance += Math.round(mediaRevenue * DAILY_FACTOR) + Math.round(ibAdvisoryRevenue * DAILY_FACTOR);
      finalBalance -= Math.round(fineDeduction * DAILY_FACTOR) + Math.round(salaryPaid * DAILY_FACTOR) + Math.round(totalAgentPayroll * DAILY_FACTOR);
      finalBalance -= Math.round(hfManagementFees * DAILY_FACTOR);
      complianceFines -= Math.round(fineDeduction * DAILY_FACTOR);
    }

    // ── Loan payment processing (daily) ──
    let updatedLoans = state.loans;
    const ownedBankNodes = Object.values(state.nodes).filter(
      n => n.owner === 'player' && n.type === 'finance' && n.status === 'operational'
    ).length;
    const newCreditLine = (finalBalance * 0.5) + (ownedBankNodes * 5_000_000) + (newNetWorth * 0.3);

    if (isDayEnd && state.loans.length > 0) {
      const LOAN_DAILY_FACTOR = 1 / 30;
      updatedLoans = state.loans.map(loan => {
        if (loan.status !== 'active') return loan;
        const dailyPayment = Math.round(loan.monthlyPayment * LOAN_DAILY_FACTOR);
        if (finalBalance >= dailyPayment) {
          finalBalance -= dailyPayment;
          const newRemaining = Math.max(0, loan.remainingBalance - dailyPayment);
          const newMonths = Math.max(0, loan.monthsRemaining - LOAN_DAILY_FACTOR);
          const newStatus = newRemaining <= 0 ? 'paid_off' as const : 'active' as const;
          if (newStatus === 'paid_off') {
            ticker = [
              { id: nextId('t'), text: `BANKING: ${loan.type.toUpperCase()} loan fully repaid.`, type: 'board' as const, timestamp: Date.now() },
              ...ticker,
            ].slice(0, 50);
          }
          return { ...loan, remainingBalance: newRemaining, monthsRemaining: newMonths, status: newStatus };
        } else {
          // Can't afford payment — loan defaults
          ticker = [
            { id: nextId('t'), text: `BANKING: DEFAULT on ${loan.type.toUpperCase()} loan — insufficient funds for €${dailyPayment.toLocaleString()} daily payment.`, type: 'alert' as const, timestamp: Date.now() },
            ...ticker,
          ].slice(0, 50);
          return { ...loan, status: 'defaulted' as const };
        }
      });
    }

    // ── Creator economy: organic post growth ──
    // Each tick, user posts gain views/likes organically based on follower count
    let updatedSocialPosts = state.socialPosts;
    let creatorXp = state.creatorXp;
    let creatorEarnings = state.creatorEarnings;
    let creatorTotalViews = state.creatorTotalViews;
    let creatorTotalLikes = state.creatorTotalLikes;
    if (updatedSocialPosts.length > 0) {
      updatedSocialPosts = updatedSocialPosts.map(post => {
        const age = Date.now() - post.timestamp;
        const ageHours = age / 3600000;
        // View growth: decays over time, scales with follower count
        const viewGrowthRate = Math.max(0, (1 - ageHours / 168)) * (state.followers / 500);
        const newViews = Math.floor(viewGrowthRate * (5 + Math.random() * 15));
        // Likes: ~3-8% of new views
        const likeRate = 0.03 + Math.random() * 0.05;
        const newLikes = Math.floor(newViews * likeRate);
        // Comments: ~1-3% of new views
        const newComments = Math.floor(newViews * (0.01 + Math.random() * 0.02));
        if (newViews > 0) {
          creatorTotalViews += newViews;
          creatorTotalLikes += newLikes;
          creatorXp += Math.floor(newViews / 10) + newLikes * 2;
          // Revenue based on creator tier
          const tierRate = creatorXp >= 100000 ? 0.50 : creatorXp >= 25000 ? 0.25 : creatorXp >= 5000 ? 0.12 : creatorXp >= 1000 ? 0.05 : 0.02;
          creatorEarnings += (newViews / 1000) * tierRate;
        }
        return { ...post, views: post.views + newViews, likes: post.likes + newLikes, comments: post.comments + newComments };
      });
    }

    // ── Time-based node spawning (new infrastructure appears over time) ──
    let updatedNodes = state.nodes;
    const WAVE_THRESHOLDS = [0, 1440, 4320, 10080, 20160]; // game minutes: 0, 1 day, 3 days, 1 week, 2 weeks
    for (let w = 1; w <= 4; w++) {
      if (newTick === WAVE_THRESHOLDS[w]) {
        const waveNodes = _getWaveNodes(w);
        if (waveNodes && waveNodes.length > 0) {
          const newMap = { ...updatedNodes };
          for (const node of waveNodes) {
            newMap[node.id] = node;
          }
          updatedNodes = newMap;
          ticker = [
            { id: nextId('t'), text: `INFRASTRUCTURE: ${waveNodes.length} new assets discovered on the global market.`, type: 'info' as const, timestamp: Date.now() },
            ...ticker,
          ].slice(0, 50);
        }
      }
    }

    // ── Construction completion: building nodes that have reached their duration ──
    const newNotifications: GameNotification[] = [];
    const nodeMap = { ...updatedNodes };
    for (const [nid, node] of Object.entries(nodeMap)) {
      if (node.status === 'building' && node.buildStartTick != null && node.buildDuration != null) {
        if (newTick >= node.buildStartTick + node.buildDuration) {
          nodeMap[nid] = {
            ...node,
            status: 'operational',
            income: Math.round((node.opex ?? 10_000) * 2.5),
            buildStartTick: undefined,
            buildDuration: undefined,
            endsIn: undefined,
          };
          newNotifications.push({
            id: nextId('notif'), type: 'construction',
            title: 'Construction Complete',
            message: `${node.name} is now operational and generating income.`,
            timestamp: Date.now(), dismissed: false,
            navigateTo: { app: 'globe', nodeId: nid, flyTo: { lat: node.lat, lon: node.lon } },
          });
          ticker = [
            { id: nextId('t'), text: `CONSTRUCTION: ${node.name} completed — now operational.`, type: 'info' as const, timestamp: Date.now() },
            ...ticker,
          ].slice(0, 50);
        } else {
          // Update endsIn display
          const remainingTicks = (node.buildStartTick + node.buildDuration) - newTick;
          const remainingDays = Math.max(1, Math.ceil(remainingTicks / 1440));
          nodeMap[nid] = { ...node, endsIn: remainingDays <= 7 ? `${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : `${Math.ceil(remainingDays / 7)} week${Math.ceil(remainingDays / 7) !== 1 ? 's' : ''}` };
        }
      }
    }
    updatedNodes = nodeMap;

    // ── R&D progression: advance researching projects each tick ──
    let updatedRD = state.rdProjects;
    let rdChanged = false;
    updatedRD = updatedRD.map(p => {
      if (p.status !== 'researching') return p;
      rdChanged = true;
      const newProgress = Math.min(p.progress + (100 / p.duration), 100);
      if (newProgress >= 100) {
        newNotifications.push({
          id: nextId('notif'), type: 'research',
          title: 'Research Complete',
          message: `${p.name} — ${p.effect}`,
          timestamp: Date.now(), dismissed: false,
          navigateTo: { app: 'globe', tab: 'rnd' },
        });
        ticker = [
          { id: nextId('t'), text: `R&D COMPLETE: ${p.name} — ${p.effect}`, type: 'intel' as const, timestamp: Date.now() },
          ...ticker,
        ].slice(0, 50);
        return { ...p, progress: 100, status: 'completed' as const };
      }
      return { ...p, progress: newProgress };
    });

    // Share price update (public companies — every tick for volatility)
    let updatedSharePrice = state.currentSharePrice;
    if (state.isPublic && state.currentSharePrice > 0) {
      const profitSignal = netIncome > 0 ? 0.0002 : -0.0003;
      const noise = (Math.random() - 0.48) * 0.005; // slight upward bias
      updatedSharePrice = Math.max(0.01, state.currentSharePrice * (1 + profitSignal + noise));
    }

    // Safety: prevent NaN/Infinity from corrupting persisted state
    if (!isFinite(finalBalance)) finalBalance = state.companyBalance;
    if (!isFinite(fundYieldTotal)) fundYieldTotal = 0;
    // During a match, salary stays in company balance (no personal withdrawals)
    const matchActive = useMatchStore.getState().active;
    const salaryToPersonal = matchActive ? 0 : salaryPaid;
    const safePersonal = isFinite(state.personalBalance + salaryToPersonal) ? state.personalBalance + salaryToPersonal : state.personalBalance;
    const safeNetWorth = isFinite(newNetWorth) ? newNetWorth : state.netWorth;

    return {
      companyBalance: finalBalance,
      personalBalance: safePersonal,
      netWorth: safeNetWorth,
      heat: parseFloat(newHeat.toFixed(2)),
      // Store daily income (monthly / 30) for display — underlying data still monthly, conversion for UI
      monthlyIncome: isFinite(adjustedIncome + sportsRevenue + routeRevenue + mediaRevenue + ibAdvisoryRevenue) ? Math.round((adjustedIncome + sportsRevenue + routeRevenue + mediaRevenue + ibAdvisoryRevenue) / 30) : 0,
      agentPayroll: totalAgentPayroll,
      ticker,
      funds: updatedFunds,
      nodes: updatedNodes,
      loans: updatedLoans,
      ...(rdChanged ? { rdProjects: updatedRD } : {}),
      notifications: [...newNotifications, ...state.notifications].slice(0, 30),
      maxCreditLine: Math.round(newCreditLine),
      gameTick: newTick,
      complianceFines,
      governanceWarnings,
      assetsFrozen,
      ceoApproval: Math.round(ceoApproval),
      boardMembers,
      boardGoals,
      boardSatisfaction,
      boardPatience,
      sacked,
      sackedAt,
      ceoExperience,
      socialPosts: updatedSocialPosts,
      creatorXp,
      creatorEarnings: parseFloat(creatorEarnings.toFixed(2)),
      creatorTotalViews,
      creatorTotalLikes,
      currentSharePrice: updatedSharePrice,
      // Advance game date: 1 tick = 1 game minute. 1 real second = 1 game minute.
      // 1 game day = 1440 ticks = 24 real min. 1 game month ≈ 12h real. 1 game year ≈ 6 real days.
      gameDate: (() => {
        const TICKS_PER_DAY = 1440; // 24h × 60min
        const totalDays = Math.floor(newTick / TICKS_PER_DAY);
        const day = (totalDays % 30) + 1;
        const totalMonths = Math.floor(totalDays / 30);
        const month = (totalMonths % 12) + 1;
        const year = 2026 + Math.floor(totalMonths / 12);
        return { day, month, year };
      })(),
    };
  }),

  // ── buyInstrument ─────────────────────────────────────────────
  buyInstrument: (id, symbol, name, instrumentType, price, quantity) => set(state => {
    const cost = price * quantity;
    if (state.companyBalance < cost || quantity <= 0) return state;

    const existing = state.portfolio[id];
    const totalQty = (existing?.quantity ?? 0) + quantity;
    const newAvgCost = existing
      ? (existing.avgCost * existing.quantity + cost) / totalQty
      : price;

    const newEvent: TickerEvent = {
      id: nextId('t'),
      text: `TRADE: BUY ${quantity} × ${symbol} @ €${price.toLocaleString()} = €${cost.toLocaleString()}`,
      type: 'fx',
      timestamp: Date.now(),
    };

    // Emit trade event for MarketWire / telemetry
    setTimeout(() => eventBridge.emit(EVENTS.TRADE_EXECUTED, {
      action: 'buy', symbol, name, instrumentType, quantity, price, cost, sector: instrumentType,
    }), 0);

    broadcastMatchActivity('buy', `${symbol} x${quantity} @ €${price.toLocaleString()}`);

    return {
      companyBalance: state.companyBalance - cost,
      portfolio: {
        ...state.portfolio,
        [id]: { symbol, name, instrumentType, quantity: totalQty, avgCost: newAvgCost },
      },
      ticker: [newEvent, ...state.ticker].slice(0, 50),
    };
  }),

  // ── sellInstrument ─────────────────────────────────────────────
  sellInstrument: (id, price, quantity) => set(state => {
    const pos = state.portfolio[id];
    if (!pos || pos.quantity < quantity || quantity <= 0) return state;

    const proceeds = price * quantity;
    const pnl = (price - pos.avgCost) * quantity;
    const newQty = pos.quantity - quantity;
    const newPortfolio = { ...state.portfolio };
    if (newQty === 0) delete newPortfolio[id];
    else newPortfolio[id] = { ...pos, quantity: newQty };

    const sign = pnl >= 0 ? '+' : '';
    const newEvent: TickerEvent = {
      id: nextId('t'),
      text: `TRADE: SELL ${quantity} × ${pos.symbol} @ €${price.toLocaleString()} — P&L ${sign}€${Math.round(pnl).toLocaleString()}`,
      type: 'fx',
      timestamp: Date.now(),
    };

    // Emit trade event for MarketWire / telemetry
    setTimeout(() => eventBridge.emit(EVENTS.TRADE_EXECUTED, {
      action: 'sell', symbol: pos.symbol, name: pos.name, instrumentType: pos.instrumentType,
      quantity, price, proceeds, pnl, sector: pos.instrumentType,
    }), 0);

    broadcastMatchActivity('sell', `${pos.symbol} x${quantity} — P&L ${sign}€${Math.round(pnl).toLocaleString()}`);

    return {
      companyBalance: state.companyBalance + proceeds,
      portfolio: newPortfolio,
      ticker: [newEvent, ...state.ticker].slice(0, 50),
    };
  }),

  // ── buyAsset ────────────────────────────────────────────────
  buyAsset: (assetType, id, cost) => set((state) => {
    if (state.assetsFrozen) return {}; // asset freeze blocks purchases
    // Determine which balance to deduct from.
    const isCompanyAsset = assetType === 'funds' || assetType === 'shadowOps' || assetType === 'sportsFranchises' || assetType === 'perks';
    const balanceField = isCompanyAsset ? 'companyBalance' : 'personalBalance';

    if (state[balanceField] < cost) return {};

    const targetArray = [...state[assetType]];
    const index = targetArray.findIndex(a => a.id === id);
    if (index !== -1) {
      targetArray[index] = { ...targetArray[index], owned: true };
    }

    const assetName = targetArray[index]?.name || targetArray[index]?.id || id;
    broadcastMatchActivity('fund_invest', `${assetType}: ${assetName}`);

    return {
      [balanceField]: state[balanceField] - cost,
      [assetType]: targetArray
    };
  }),

  // ── Sports Franchise Management ─────────────────────────────
  upgradeFranchiseFacility: (franchiseId, facilityKey, cost) => set((state) => {
    if (state.companyBalance < cost) return {};
    const franchises = state.sportsFranchises.map(f => {
      if (f.id !== franchiseId) return f;
      const currentLevel = f.facilities?.[facilityKey] ?? 0;
      return { ...f, facilities: { ...f.facilities, [facilityKey]: currentLevel + 1 } };
    });
    return {
      companyBalance: state.companyBalance - cost,
      sportsFranchises: franchises,
      ticker: [{ id: `t${Date.now()}`, text: `SPORTS: Facility upgrade — ${facilityKey} improved`, type: 'trade' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  setFranchiseStaff: (franchiseId, staff) => set((state) => ({
    sportsFranchises: state.sportsFranchises.map(f =>
      f.id === franchiseId ? { ...f, staff } : f
    ),
  })),

  setFranchiseTicketPreset: (franchiseId, preset) => set((state) => ({
    sportsFranchises: state.sportsFranchises.map(f =>
      f.id === franchiseId ? { ...f, ticketPreset: preset } : f
    ),
  })),

  hireStaff: (franchiseId, player) => set((state) => {
    if (state.companyBalance < player.marketValue) return {};
    const franchises = state.sportsFranchises.map(f => {
      if (f.id !== franchiseId) return f;
      const currentStaff = f.staff ?? [];
      return { ...f, staff: [...currentStaff, player] };
    });
    return {
      companyBalance: state.companyBalance - player.marketValue,
      sportsFranchises: franchises,
      ticker: [{ id: `t${Date.now()}`, text: `TRANSFER: Signed ${player.name} (${player.position}) for ${player.marketValue >= 1e6 ? `€${(player.marketValue/1e6).toFixed(1)}M` : `€${Math.round(player.marketValue/1e3)}K`}`, type: 'trade' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  fireStaff: (franchiseId, staffId) => set((state) => {
    // Find the player before mapping so TS can narrow the type
    const franchise = state.sportsFranchises.find(f => f.id === franchiseId);
    const currentStaff = franchise?.staff ?? [];
    const player = currentStaff.find(s => s.id === staffId);
    const soldPlayer = player ? { name: player.name, position: player.position, marketValue: player.marketValue } : null;
    const franchises = state.sportsFranchises.map(f => {
      if (f.id !== franchiseId) return f;
      return { ...f, staff: (f.staff ?? []).filter(s => s.id !== staffId) };
    });
    const saleValue = soldPlayer?.marketValue ?? 0;
    return {
      sportsFranchises: franchises,
      companyBalance: state.companyBalance + saleValue,
      ticker: soldPlayer ? [{ id: `t${Date.now()}`, text: `TRANSFER: Sold ${soldPlayer.name} (${soldPlayer.position}) for ${saleValue >= 1e6 ? `€${(saleValue/1e6).toFixed(1)}M` : `€${Math.round(saleValue/1e3)}K`}`, type: 'trade' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50) : state.ticker,
    };
  }),

  // ── allocateToFund ──────────────────────────────────────────
  allocateToFund: (id, amount) => set((state) => {
    if (state.companyBalance < amount) return state;

    const funds = [...state.funds];
    const index = funds.findIndex(f => f.id === id);
    if (index !== -1) {
      funds[index] = { 
        ...funds[index], 
        owned: true,
        stakedAmount: (funds[index].stakedAmount || 0) + amount
      };
    }

    return {
      companyBalance: state.companyBalance - amount,
      funds
    };
  }),

  // ── takeLoan ───────────────────────────────────────────────
  takeLoan: (type, amount) => {
    const state = get();

    const LOAN_CONFIG: Record<string, { rate: number; maxTerm: number; min: number; max: number; requireBanks?: number }> = {
      business:  { rate: 0.06, maxTerm: 36,  min: 100_000,   max: 5_000_000 },
      expansion: { rate: 0.08, maxTerm: 60,  min: 500_000,   max: 20_000_000 },
      emergency: { rate: 0.12, maxTerm: 12,  min: 50_000,    max: 2_000_000 },
      megadeal:  { rate: 0.05, maxTerm: 120, min: 5_000_000, max: 100_000_000, requireBanks: 3 },
    };

    const config = LOAN_CONFIG[type];
    if (!config) return false;

    // Count owned bank nodes
    const ownedBankNodes = Object.values(state.nodes).filter(
      n => n.owner === 'player' && n.type === 'finance' && n.status === 'operational'
    ).length;

    // Megadeal requires 3+ bank nodes
    if (config.requireBanks && ownedBankNodes < config.requireBanks) return false;

    // Validate amount
    if (amount < config.min || amount > config.max) return false;

    // Calculate credit line
    const creditLine = (state.companyBalance * 0.5) + (ownedBankNodes * 5_000_000) + (state.netWorth * 0.3);

    // Total existing debt
    const totalDebt = state.loans
      .filter(l => l.status === 'active')
      .reduce((sum, l) => sum + l.remainingBalance, 0);

    if (totalDebt + amount > creditLine) return false;

    // Calculate monthly payment using standard amortization formula
    const monthlyRate = config.rate / 12;
    const termMonths = config.maxTerm;
    const monthlyPayment = monthlyRate > 0
      ? Math.round(amount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1))
      : Math.round(amount / termMonths);

    const newLoan: Loan = {
      id: nextId('loan'),
      type: type as Loan['type'],
      principal: amount,
      interestRate: config.rate,
      monthlyPayment,
      remainingBalance: Math.round(monthlyPayment * termMonths), // total repayment amount
      termMonths,
      monthsRemaining: termMonths,
      startedAt: state.gameTick,
      status: 'active',
    };

    set({
      loans: [...state.loans, newLoan],
      companyBalance: state.companyBalance + amount,
      maxCreditLine: creditLine,
      ticker: [
        { id: nextId('t'), text: `BANKING: ${type.toUpperCase()} loan approved — €${(amount / 1_000_000).toFixed(2)}M at ${(config.rate * 100).toFixed(1)}% APR`, type: 'board' as const, timestamp: Date.now() },
        ...state.ticker,
      ].slice(0, 50),
    });
    broadcastMatchActivity('take_loan', `${type} €${(amount / 1_000_000).toFixed(2)}M`);
    return true;
  },

  // ── makePayment ────────────────────────────────────────────
  makePayment: (loanId, amount?) => {
    const state = get();
    const loanIndex = state.loans.findIndex(l => l.id === loanId);
    if (loanIndex === -1) return false;

    const loan = state.loans[loanIndex];
    if (loan.status !== 'active') return false;

    const paymentAmount = amount ?? loan.monthlyPayment;
    if (state.companyBalance < paymentAmount) return false;

    const newRemaining = Math.max(0, loan.remainingBalance - paymentAmount);
    const newMonthsRemaining = Math.max(0, loan.monthsRemaining - (amount ? 0 : 1));
    const newStatus = newRemaining <= 0 ? 'paid_off' as const : 'active' as const;

    const updatedLoans = [...state.loans];
    updatedLoans[loanIndex] = {
      ...loan,
      remainingBalance: newRemaining,
      monthsRemaining: newMonthsRemaining,
      status: newStatus,
    };

    const tickerMsg = newStatus === 'paid_off'
      ? `BANKING: Loan PAID OFF — ${loan.type.toUpperCase()} €${(loan.principal / 1_000_000).toFixed(2)}M fully repaid.`
      : `BANKING: Payment of €${paymentAmount.toLocaleString()} applied to ${loan.type} loan.`;

    set({
      loans: updatedLoans,
      companyBalance: state.companyBalance - paymentAmount,
      ticker: [
        { id: nextId('t'), text: tickerMsg, type: 'board' as const, timestamp: Date.now() },
        ...state.ticker,
      ].slice(0, 50),
    });
    return true;
  },

  // ── Bank Account Management ─────────────────────────────────
  openBankAccount: (bankId: string) => {
    const state = get();
    if (state.activeBanks.includes(bankId)) return;
    set({
      activeBanks: [...state.activeBanks, bankId],
      ticker: [
        { id: nextId('t'), text: `BANKING: Opened account at new financial institution.`, type: 'board' as const, timestamp: Date.now() },
        ...state.ticker,
      ].slice(0, 50),
    });
  },

  closeBankAccount: (bankId: string) => {
    const state = get();
    if (!state.activeBanks.includes(bankId)) return;
    const deposited = state.bankDeposits[bankId] ?? 0;
    const newDeposits = { ...state.bankDeposits };
    delete newDeposits[bankId];
    set({
      activeBanks: state.activeBanks.filter(id => id !== bankId),
      bankDeposits: newDeposits,
      companyBalance: state.companyBalance + deposited,
      ticker: [
        { id: nextId('t'), text: `BANKING: Closed account. ${deposited > 0 ? `€${deposited.toLocaleString()} returned to company.` : ''}`, type: 'board' as const, timestamp: Date.now() },
        ...state.ticker,
      ].slice(0, 50),
    });
  },

  depositToBank: (bankId: string, amount: number) => {
    const state = get();
    if (!state.activeBanks.includes(bankId)) return;
    if (amount <= 0 || amount > state.companyBalance) return;
    const current = state.bankDeposits[bankId] ?? 0;
    set({
      companyBalance: state.companyBalance - amount,
      bankDeposits: { ...state.bankDeposits, [bankId]: current + amount },
      ticker: [
        { id: nextId('t'), text: `BANKING: Deposited €${amount.toLocaleString()} into secure account.`, type: 'board' as const, timestamp: Date.now() },
        ...state.ticker,
      ].slice(0, 50),
    });
  },

  withdrawFromBank: (bankId: string, amount: number) => {
    const state = get();
    const current = state.bankDeposits[bankId] ?? 0;
    if (amount <= 0 || amount > current) return;
    set({
      companyBalance: state.companyBalance + amount,
      bankDeposits: { ...state.bankDeposits, [bankId]: current - amount },
      ticker: [
        { id: nextId('t'), text: `BANKING: Withdrew €${amount.toLocaleString()} from account.`, type: 'board' as const, timestamp: Date.now() },
        ...state.ticker,
      ].slice(0, 50),
    });
  },

  // ── executeShadowOp ─────────────────────────────────────────
  executeShadowOp: (id) => {
    let result = null;
    set((state) => {
      const ops = [...state.shadowOps];
      const opIndex = ops.findIndex(o => o.id === id);
      if (opIndex === -1) return state;

      const op = ops[opIndex];
      // RNG Roll (1-100)
      const roll = Math.random() * 100;
      const success = roll <= op.successRate;

      let newCompanyBalance = state.companyBalance;
      let newHeat = state.heat;

      if (success) {
        newCompanyBalance += op.reward;
      }
      
      // Heat applies whether success or fail, but maybe doubled on fail?
      // For now, adhere to the op's defined heatGain
      newHeat = Math.min(100, Math.max(0, state.heat + op.heatGain));

      result = { success, reward: success ? op.reward : 0, heatGain: op.heatGain };

      // Optional: Remove op after execution (one-off)
      ops.splice(opIndex, 1);

      return {
        companyBalance: newCompanyBalance,
        heat: newHeat,
        shadowOps: ops
      };
    });
    return result;
  },

  // ── Division Actions ─────────────────────────────────────────

  investVC: (dealId) => set(state => {
    const deal = state.vcDeals.find(d => d.id === dealId);
    if (!deal || deal.owned || state.companyBalance < deal.askAmount) return {};
    broadcastMatchActivity('fund_invest', `VC: ${deal.name} (${deal.stage})`);
    return {
      companyBalance: state.companyBalance - deal.askAmount,
      vcDeals: state.vcDeals.map(d => d.id === dealId ? { ...d, owned: true } : d),
      ticker: [{ id: nextId('t'), text: `VC: Invested \u20AC${(deal.askAmount/1e6).toFixed(1)}M in ${deal.name} (${deal.stage}) for ${deal.equityOffered}% equity`, type: 'trade' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  acquirePE: (targetId) => set(state => {
    const target = state.peTargets.find(t => t.id === targetId);
    if (!target || target.owned || state.companyBalance < target.askingPrice) return {};
    broadcastMatchActivity('acquire_node', `PE: ${target.name}`);
    return {
      companyBalance: state.companyBalance - target.askingPrice,
      peTargets: state.peTargets.map(t => t.id === targetId ? { ...t, owned: true } : t),
      monthlyIncome: state.monthlyIncome + Math.round(target.ebitda / 12),
      ticker: [{ id: nextId('t'), text: `PE: Acquired ${target.name} for \u20AC${(target.askingPrice/1e6).toFixed(0)}M \u2014 adds \u20AC${(target.ebitda/12/1e3).toFixed(0)}K/mo EBITDA`, type: 'trade' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  allocateHF: (strategyId, amount) => set(state => {
    const strategy = state.hfStrategies.find(s => s.id === strategyId);
    if (!strategy || state.companyBalance < amount || amount < strategy.minCapital) return {};
    return {
      companyBalance: state.companyBalance - amount,
      hfStrategies: state.hfStrategies.map(s => s.id === strategyId ? { ...s, capitalAllocated: s.capitalAllocated + amount, active: true } : s),
      ticker: [{ id: nextId('t'), text: `HEDGE FUND: Allocated \u20AC${(amount/1e6).toFixed(1)}M to ${strategy.name} (${strategy.strategy})`, type: 'trade' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  startIBDeal: (dealId) => set(state => {
    const deal = state.ibDeals.find(d => d.id === dealId);
    if (!deal || deal.status !== 'available') return {};
    const setupCost = Math.round(deal.dealSize * 0.001); // 0.1% setup cost
    if (state.companyBalance < setupCost) return {};
    return {
      companyBalance: state.companyBalance - setupCost,
      ibDeals: state.ibDeals.map(d => d.id === dealId ? { ...d, status: 'in-progress' as const } : d),
      ticker: [{ id: nextId('t'), text: `IB: Engaged on ${deal.name} (${deal.type}) \u2014 \u20AC${(deal.dealSize/1e9).toFixed(1)}B deal, ${deal.advisoryFee}% fee`, type: 'trade' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  acquireMedia: (outletId) => set(state => {
    const outlet = state.mediaOutlets.find(o => o.id === outletId);
    if (!outlet || outlet.owned || state.companyBalance < outlet.acquisitionCost) return {};
    broadcastMatchActivity('acquire_node', `Media: ${outlet.name}`);
    return {
      companyBalance: state.companyBalance - outlet.acquisitionCost,
      mediaOutlets: state.mediaOutlets.map(o => o.id === outletId ? { ...o, owned: true } : o),
      monthlyIncome: state.monthlyIncome + outlet.monthlyRevenue,
      ticker: [{ id: nextId('t'), text: `MEDIA: Acquired ${outlet.name} (${outlet.type}) \u2014 +\u20AC${(outlet.monthlyRevenue/1e6).toFixed(1)}M/mo revenue, ${outlet.reach}M reach`, type: 'trade' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  placeBid: (auctionId, bidAmount) => set(state => {
    const item = state.auctionItems.find(a => a.id === auctionId);
    if (!item || item.owned || state.personalBalance < bidAmount) return {};
    if (bidAmount < item.currentBid + item.bidIncrement) return {};
    // Simplified: if bid >= estimated value, you win
    const won = bidAmount >= item.estimatedValue * 0.85;
    if (won) {
      return {
        personalBalance: state.personalBalance - bidAmount,
        auctionItems: state.auctionItems.map(a => a.id === auctionId ? { ...a, owned: true, currentBid: bidAmount } : a),
        ticker: [{ id: nextId('t'), text: `AUCTION: Won ${item.name} for \u20AC${(bidAmount/1e6).toFixed(1)}M! ${item.rarity} ${item.category}`, type: 'trade' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
      };
    }
    return {
      auctionItems: state.auctionItems.map(a => a.id === auctionId ? { ...a, currentBid: bidAmount } : a),
      ticker: [{ id: nextId('t'), text: `AUCTION: Bid \u20AC${(bidAmount/1e6).toFixed(1)}M on ${item.name} \u2014 outbid! Need higher offer`, type: 'intel' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  // ── Equity Actions ──────────────────────────────────────────

  sellEquity: (investorId, investorName, equityPct, investmentAmount, className) => set(state => {
    const newShares = Math.round((state.totalShares * equityPct) / (100 - equityPct));
    const pricePerShare = investmentAmount / newShares;
    const newTotal = state.totalShares + newShares;
    const playerPct = (state.sharesOwnedByPlayer / newTotal) * 100;

    return {
      totalShares: newTotal,
      companyBalance: state.companyBalance + investmentAmount,
      currentSharePrice: pricePerShare,
      shareClasses: [...state.shareClasses, {
        id: `eq-${Date.now()}`,
        name: className,
        shares: newShares,
        holder: investorId,
        holderName: investorName,
        acquiredTick: state.gameTick,
        pricePerShare,
      }],
      dilutionEvents: [...state.dilutionEvents, {
        tick: state.gameTick,
        investor: investorName,
        shares: newShares,
        pct: equityPct,
        price: pricePerShare,
      }],
      ticker: [{ id: `t${Date.now()}`, text: `EQUITY: ${investorName} invested \u20AC${investmentAmount.toLocaleString()} for ${equityPct}% equity. Your ownership: ${playerPct.toFixed(1)}%`, type: 'board' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  executeIPO: (pricePerShare, floatPct) => set(state => {
    if (state.isPublic) return {};
    const floatShares = Math.round(state.totalShares * floatPct / 100);
    const ipoProceeds = Math.round(floatShares * pricePerShare);
    const newTotal = state.totalShares + floatShares;

    return {
      isPublic: true,
      ipoPrice: pricePerShare,
      ipoTick: state.gameTick,
      currentSharePrice: pricePerShare,
      totalShares: newTotal,
      publicFloat: floatShares,
      companyBalance: state.companyBalance + ipoProceeds,
      shareClasses: [...state.shareClasses, {
        id: `ipo-${Date.now()}`,
        name: 'IPO Float',
        shares: floatShares,
        holder: 'public',
        holderName: 'Public Market',
        acquiredTick: state.gameTick,
        pricePerShare,
      }],
      dilutionEvents: [...state.dilutionEvents, {
        tick: state.gameTick,
        investor: 'Public (IPO)',
        shares: floatShares,
        pct: floatPct,
        price: pricePerShare,
      }],
      ticker: [{ id: `t${Date.now()}`, text: `IPO COMPLETE: ${floatShares.toLocaleString()} shares listed at \u20AC${pricePerShare.toFixed(2)}/share. Raised \u20AC${ipoProceeds.toLocaleString()}!`, type: 'board' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  sellShares: (numShares, pricePerShare, buyerName) => set(state => {
    if (numShares > state.sharesOwnedByPlayer) return {};
    const proceeds = Math.round(numShares * pricePerShare);
    let remaining = numShares;

    const updatedClasses = state.shareClasses.map(sc => {
      if (sc.holder === 'player' && remaining > 0) {
        const sell = Math.min(sc.shares, remaining);
        remaining -= sell;
        return { ...sc, shares: sc.shares - sell };
      }
      return sc;
    }).filter(sc => sc.shares > 0);

    return {
      sharesOwnedByPlayer: state.sharesOwnedByPlayer - numShares,
      personalBalance: state.personalBalance + proceeds,
      shareClasses: [
        ...updatedClasses,
        { id: `sale-${Date.now()}`, name: 'Secondary Sale', shares: numShares, holder: buyerName.toLowerCase().replace(/\s/g, '-'), holderName: buyerName, acquiredTick: state.gameTick, pricePerShare },
      ],
      ticker: [{ id: `t${Date.now()}`, text: `EQUITY: Sold ${numShares.toLocaleString()} shares to ${buyerName} at \u20AC${pricePerShare.toFixed(2)}/share. Proceeds: \u20AC${proceeds.toLocaleString()}`, type: 'board' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    };
  }),

  // ── Transport Empire Actions ─────────────────────────────────

  foundTransportCompany: (name, type, hubNodeId) => {
    const state = get();
    const FOUNDING_COSTS: Record<TransportType, number> = { airline: 500_000, shipping: 350_000, rail: 250_000 };
    const cost = FOUNDING_COSTS[type] || 500_000;
    if (state.companyBalance < cost) return false;
    if (state.assetsFrozen) return false;

    // Hub node must be owned by player and match type
    const hubNode = state.nodes[hubNodeId];
    if (!hubNode || hubNode.owner !== 'player') return false;
    if (type === 'airline' && hubNode.type !== 'airport') return false;
    if (type === 'shipping' && hubNode.type !== 'port') return false;
    // Rail can use any land-adjacent node

    const company: TransportCompany = {
      id: `tc-${Date.now().toString(36)}`,
      name,
      type,
      founded: state.gameTick,
      level: 1,
      fleet: type === 'airline' ? 2 : type === 'shipping' ? 3 : 4,
      routes: [],
      monthlyRevenue: 0,
      monthlyCost: type === 'airline' ? 25_000 : type === 'shipping' ? 18_000 : 12_000,
      reputation: 50,
      hubNodeIds: [hubNodeId],
    };

    set({
      companyBalance: state.companyBalance - cost,
      transportCompanies: [...state.transportCompanies, company],
      ticker: [{ id: `t-${Date.now()}`, text: `TRANSPORT: Founded ${name} (${type}) — Hub: ${hubNode.name}`, type: 'trade' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    });
    return true;
  },

  openTransportRoute: (companyId, fromNodeId, toNodeId) => {
    const state = get();
    const company = state.transportCompanies.find(c => c.id === companyId);
    if (!company) return false;

    const fromNode = state.nodes[fromNodeId];
    const toNode = state.nodes[toNodeId];
    if (!fromNode || !toNode) return false;

    // Route opening cost scales with distance and company level
    const dist = Math.sqrt(Math.pow(fromNode.lat - toNode.lat, 2) + Math.pow((fromNode.lon || 0) - (toNode.lon || 0), 2));
    const routeCost = Math.round(50_000 + dist * 5_000);
    if (state.companyBalance < routeCost) return false;

    // Calculate landing/docking fee: if player owns endpoint, fee is 0; otherwise pay market rate
    const fromFee = fromNode.owner === 'player' ? 0 : Math.round(2_000 + (fromNode.level || 1) * 1_500);
    const toFee = toNode.owner === 'player' ? 0 : Math.round(2_000 + (toNode.level || 1) * 1_500);

    // Revenue based on route distance and company level
    const baseRevenue = Math.round(8_000 + dist * 2_000 + (company.level - 1) * 3_000);
    const fuelCost = Math.round(baseRevenue * 0.35);

    const route: TransportRoute = {
      id: `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      fromNodeId,
      toNodeId,
      fromName: fromNode.name,
      toName: toNode.name,
      fromCoords: [fromNode.lon || 0, fromNode.lat],
      toCoords: [toNode.lon || 0, toNode.lat],
      type: company.type,
      frequency: company.level,
      ticketRevenue: baseRevenue,
      fuelCost,
      landingFee: fromFee + toFee,
      active: true,
    };

    const updatedCompanies = state.transportCompanies.map(c =>
      c.id === companyId
        ? { ...c, routes: [...c.routes, route], monthlyRevenue: c.monthlyRevenue + baseRevenue - fuelCost - fromFee - toFee }
        : c
    );

    set({
      companyBalance: state.companyBalance - routeCost,
      transportCompanies: updatedCompanies,
      ticker: [{ id: `t-${Date.now()}`, text: `ROUTE: ${fromNode.name} ↔ ${toNode.name} opened — €${baseRevenue.toLocaleString()}/tick revenue`, type: 'trade' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    });
    return true;
  },

  upgradeTransportCompany: (companyId) => {
    const state = get();
    const company = state.transportCompanies.find(c => c.id === companyId);
    if (!company || company.level >= 5) return false;

    const cost = 150_000 * company.level;
    if (state.companyBalance < cost) return false;

    const updatedCompanies = state.transportCompanies.map(c =>
      c.id === companyId
        ? {
          ...c,
          level: c.level + 1,
          fleet: c.fleet + (c.type === 'airline' ? 3 : c.type === 'shipping' ? 2 : 3),
          monthlyCost: Math.round(c.monthlyCost * 1.3),
          reputation: Math.min(100, c.reputation + 5),
          // Upgrade all existing routes: more frequency + revenue
          routes: c.routes.map(r => ({
            ...r,
            frequency: r.frequency + 1,
            ticketRevenue: Math.round(r.ticketRevenue * 1.15),
          })),
        }
        : c
    );

    set({
      companyBalance: state.companyBalance - cost,
      transportCompanies: updatedCompanies,
      ticker: [{ id: `t-${Date.now()}`, text: `UPGRADE: ${company.name} → Level ${company.level + 1} — Fleet expanded`, type: 'trade' as const, timestamp: Date.now() }, ...state.ticker].slice(0, 50),
    });
    return true;
  },

  setInfraFee: (nodeId, feePerUse) => set((state) => {
    const node = state.nodes[nodeId];
    if (!node || node.owner !== 'player') return {};
    if (node.type !== 'airport' && node.type !== 'port') return {};

    // Count how many NPC + other routes use this node (simulate traffic)
    const usesPerTick = Math.max(1, Math.floor((node.level || 1) * 3 + Math.random() * 5));

    const existingIdx = state.infraFees.findIndex(f => f.nodeId === nodeId);
    const fee: InfraFee = { nodeId, nodeName: node.name, feePerUse, ownerIsPlayer: true, usesPerTick };

    const infraFees = existingIdx >= 0
      ? state.infraFees.map((f, i) => i === existingIdx ? fee : f)
      : [...state.infraFees, fee];

    return { infraFees };
  }),

  // ── Selectors ────────────────────────────────────────────────
  getOwnedNodes:  () => Object.values(get().nodes).filter(n => n.owner === 'player'),
  getMarketNodes: () => Object.values(get().nodes).filter(n => n.owner === 'market'),
  getRivalNodes:  () => Object.values(get().nodes).filter(n => n.owner === 'rival'),
  getNodeById:    (id) => get().nodes[id] ?? null,
}), {
  name: 'quantico-empire-storage-v8',
  onRehydrateStorage: () => (state) => {
    if (!state) return;
    // Sanitize corrupted numeric fields (NaN/Infinity from old fund bug)
    const safeNum = (v: any, fallback: number) => (typeof v === 'number' && isFinite(v)) ? v : fallback;
    state.companyBalance = safeNum(state.companyBalance, 500_000);
    state.personalBalance = safeNum(state.personalBalance, 0);
    state.netWorth = safeNum(state.netWorth, state.companyBalance);
    state.monthlyIncome = safeNum(state.monthlyIncome, 0);
    state.complianceFines = safeNum(state.complianceFines, 0);
    state.heat = safeNum(state.heat, 0);
    state.ceoApproval = safeNum(state.ceoApproval, 50);
    state.boardSatisfaction = safeNum(state.boardSatisfaction, 60);
    state.agentPayroll = safeNum(state.agentPayroll, 0);
    // Patch legacy funds missing edge/targetYield
    if (state.funds) {
      state.funds = state.funds.map(f => ({
        ...f,
        edge: safeNum(f.edge, 0.55),
        targetYield: safeNum(f.targetYield, 0.8),
        stakedAmount: safeNum(f.stakedAmount, 0),
      }));
    }
  },
}));
