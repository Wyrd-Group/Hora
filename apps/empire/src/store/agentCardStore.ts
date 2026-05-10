import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AGENT_RARITY_CONFIG,
  AGENT_PACK_TYPES,
  getAgentById,
  getAgentsByRarity,
  generateMintId,
  computeOverallRating,
  type AgentRarity,
  type AgentCardDef,
  type AgentClass,
  type SpecialCardType,
} from '../data/agentCards';

// ── Blockchain Integration ──────────────────────────────────────
// Lazy dynamic import to avoid circular dependencies — blockchain store
// records every NFT lifecycle event on the AEGIS Chain.
let _blockchainStore: any = null;

// Fire-and-forget loader — first call returns null, subsequent calls are sync
import('./blockchainStore').then(mod => {
  _blockchainStore = mod.useBlockchainStore;
}).catch(() => { /* Blockchain not available (tests, SSR, etc.) */ });

function getBlockchain() {
  if (!_blockchainStore) return null;
  try {
    const store = _blockchainStore.getState();
    if (!store.initialized) store.initChain();
    return store;
  } catch {
    return null;
  }
}

// ── Types ────────────────────────────────────────────────────────

export interface AgentContract {
  totalTicks: number;             // Contract length (e.g., 360 ticks = ~3 hours)
  ticksRemaining: number;         // Decrements each game tick when deployed
  salary: number;                 // Per-tick cost deducted from company balance
  morale: number;                 // 0-100, drops if overworked, boosts performance
  releaseClause: number;          // AP to break contract early
  status: 'active' | 'expiring' | 'expired' | 'negotiating';
}

export interface DevelopmentPlan {
  targetClass: AgentClass | null;                // Retrain toward different class
  focusStats: (keyof MintedAgent['dynamicStatBoosts'])[];  // Which 2-3 stats to prioritize
  intensity: 'light' | 'moderate' | 'intense';  // Growth speed vs morale cost
  startedAt: number;
}

export interface MintedAgent {
  mintId: string;             // Unique NFT-style ID
  cardId: string;             // References AgentCardDef.id
  editionNumber: number;      // #0042 of 500
  level: number;              // 1-12 depending on rarity
  xp: number;                 // XP toward next level
  deployedTo: string | null;  // nodeId or departmentId
  cooldownUntil: number;      // Tick when ability becomes available
  ultimateCooldownUntil: number;
  totalMissions: number;
  successfulMissions: number;
  acquiredAt: number;         // Timestamp
  isLocked: boolean;          // Cannot be sold/traded when true
  // FIFA-style extensions
  currentOverallRating: number;   // Dynamic OVR, changes with level
  potentialRating: number;        // Max achievable OVR
  specialCardType: SpecialCardType | null;
  dynamicStatBoosts: Partial<{
    intelligence: number;
    speed: number;
    stealth: number;
    loyalty: number;
    adaptability: number;
    influence: number;
  }>;
  contract: AgentContract | null;
  developmentPlan: DevelopmentPlan | null;
}

export interface AgentMarketListing {
  id: string;
  mintId: string;
  cardId: string;
  price: number;              // AP
  listedAt: number;
}

interface AgentCardState {
  // Collection
  agents: Record<string, MintedAgent>;     // mintId -> MintedAgent
  editionCounters: Record<string, number>; // cardId -> next edition number

  // Marketplace
  listings: AgentMarketListing[];

  // Stats
  totalMinted: number;
  totalDeployed: number;
  pityCounter: number;   // For guaranteed drops

  // Addiction mechanics
  packStreak: number;            // Consecutive packs opened in session
  lastPackTime: number;          // Timestamp of last pack open
  bestPullEver: AgentRarity;     // Best rarity ever pulled (shown as "can you beat it?")
  nearMissHistory: string[];     // Last 5 "almost got" messages for FOMO
  hotStreakActive: boolean;       // True when on a lucky streak
  hotStreakMultiplier: number;    // Bonus rarity chance during hot streak
  totalPacksOpened: number;      // Lifetime packs opened
  dailyPacksOpened: number;      // Packs opened today
  dailyPackDate: string;         // Date string for daily reset
  comebackBonus: number;         // Hours since last pack (drives "welcome back" bonus)

  // Actions
  mintAgent: (cardId: string) => MintedAgent | null;
  openAgentPack: (packTypeId: string, ap: number) => { minted: MintedAgent[]; cost: number } | null;
  deployAgent: (mintId: string, targetId: string) => boolean;
  recallAgent: (mintId: string) => boolean;
  reassignAgent: (mintId: string, newTargetId: string) => boolean;
  useAbility: (mintId: string, currentTick: number) => boolean;
  useUltimate: (mintId: string, currentTick: number) => boolean;
  addXP: (mintId: string, amount: number) => void;
  levelUp: (mintId: string) => boolean;
  lockAgent: (mintId: string) => void;
  unlockAgent: (mintId: string) => void;
  listAgent: (mintId: string, price: number) => void;
  buyAgent: (listingId: string) => MintedAgent | null;
  delistAgent: (listingId: string) => void;
  quickSellAgent: (mintId: string) => number;
  getDeployedAgents: (targetId: string) => MintedAgent[];
  getAgentDef: (mintId: string) => AgentCardDef | undefined;
  getSynergyBonus: (targetId: string) => number;
  // FIFA-style actions
  applySpecialCard: (mintId: string, type: SpecialCardType) => void;
  setContract: (mintId: string, contract: AgentContract) => void;
  tickContracts: () => void;
  setDevelopmentPlan: (mintId: string, plan: DevelopmentPlan | null) => void;
  applyStatBoost: (mintId: string, stat: string, value: number) => void;
  clearStatBoosts: (mintId: string) => void;
}

// ── RNG ──────────────────────────────────────────────────────────

const RARITY_ORDER: AgentRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

// Near-miss messages — shown when you ALMOST got a higher rarity (drives FOMO)
function generateNearMiss(rolled: AgentRarity): string | null {
  const idx = RARITY_ORDER.indexOf(rolled);
  if (idx >= RARITY_ORDER.length - 1) return null;
  const nextUp = RARITY_ORDER[idx + 1];
  const messages = [
    `So close to ${nextUp}! One more pull...`,
    `A ${nextUp} was right there! Try again?`,
    `${nextUp} card was next in the deck!`,
    `You were 0.3% away from a ${nextUp}!`,
    `The ${nextUp} glow flickered... almost!`,
  ];
  // Only trigger near-miss 30% of the time (intermittent reinforcement)
  if (Math.random() < 0.30) {
    return messages[Math.floor(Math.random() * messages.length)];
  }
  return null;
}

function rollAgentRarity(pityCounter: number, hotStreakMultiplier = 0, comebackBonus = 0): AgentRarity {
  if (pityCounter >= 120) return 'Mythic';
  if (pityCounter >= 80) return 'Legendary';

  const weights: Record<AgentRarity, number> = {} as any;
  for (const [r, cfg] of Object.entries(AGENT_RARITY_CONFIG)) {
    weights[r as AgentRarity] = cfg.weight;
  }

  // Soft pity after 50 packs: +1.5% Legendary per pack
  if (pityCounter > 50) {
    weights.Legendary += (pityCounter - 50) * 1.5;
    weights.Mythic += (pityCounter - 50) * 0.5;
  }

  // Hot streak: boost rare+ chances when player is on a roll
  if (hotStreakMultiplier > 0) {
    weights.Rare += weights.Rare * hotStreakMultiplier;
    weights.Epic += weights.Epic * hotStreakMultiplier * 0.5;
    weights.Legendary += weights.Legendary * hotStreakMultiplier * 0.3;
  }

  // Comeback bonus: returning players get better odds (up to +20% rare chance)
  // Peaks at 24h away, slowly increases up to 72h
  if (comebackBonus > 0) {
    const bonus = Math.min(comebackBonus / 72, 1) * 0.20;
    weights.Rare += weights.Rare * bonus;
    weights.Epic += weights.Epic * bonus * 0.7;
    weights.Legendary += weights.Legendary * bonus * 0.3;
  }

  // "New player luck" — first 5 packs get +50% rare chance (hook them early)
  // This is handled by the caller checking totalPacksOpened

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const rarity of RARITY_ORDER) {
    roll -= weights[rarity];
    if (roll <= 0) return rarity;
  }
  return 'Common';
}

function pickRandomAgent(rarity: AgentRarity): AgentCardDef | null {
  const pool = getAgentsByRarity(rarity);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── XP Requirements ─────────────────────────────────────────────

function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// ── Store ────────────────────────────────────────────────────────

export const useAgentCardStore = create<AgentCardState>()(
  persist(
    (set, get) => ({
      agents: {},
      editionCounters: {},
      listings: [],
      totalMinted: 0,
      totalDeployed: 0,
      pityCounter: 0,
      packStreak: 0,
      lastPackTime: 0,
      bestPullEver: 'Common' as AgentRarity,
      nearMissHistory: [],
      hotStreakActive: false,
      hotStreakMultiplier: 0,
      totalPacksOpened: 0,
      dailyPacksOpened: 0,
      dailyPackDate: '',
      comebackBonus: 0,

      mintAgent: (cardId: string) => {
        const def = getAgentById(cardId);
        if (!def) return null;

        const state = get();
        const currentEdition = state.editionCounters[cardId] ?? 0;
        if (currentEdition >= def.maxSupply) return null; // Sold out

        const editionNumber = currentEdition + 1;
        const mintId = generateMintId(cardId, editionNumber);

        const baseOVR = computeOverallRating(def.stats, def.class);
        // Potential = base OVR + random bonus based on rarity
        const rarityPotentialBonus: Record<AgentRarity, [number, number]> = {
          Common: [2, 8], Uncommon: [3, 12], Rare: [5, 15],
          Epic: [5, 18], Legendary: [3, 10], Mythic: [1, 5],
        };
        const [minBonus, maxBonus] = rarityPotentialBonus[def.rarity];
        const potentialBonus = minBonus + Math.floor(Math.random() * (maxBonus - minBonus + 1));

        const minted: MintedAgent = {
          mintId,
          cardId,
          editionNumber,
          level: 1,
          xp: 0,
          deployedTo: null,
          cooldownUntil: 0,
          ultimateCooldownUntil: 0,
          totalMissions: 0,
          successfulMissions: 0,
          acquiredAt: Date.now(),
          isLocked: false,
          currentOverallRating: baseOVR,
          potentialRating: Math.min(99, baseOVR + potentialBonus),
          specialCardType: null,
          dynamicStatBoosts: {},
          contract: null,
          developmentPlan: null,
        };

        set(s => ({
          agents: { ...s.agents, [mintId]: minted },
          editionCounters: { ...s.editionCounters, [cardId]: editionNumber },
          totalMinted: s.totalMinted + 1,
        }));

        // Record on AEGIS Chain
        getBlockchain()?.recordMint(mintId, cardId, {
          edition: editionNumber,
          rarity: def.rarity,
          class: def.class,
          ovr: baseOVR,
        });

        return minted;
      },

      openAgentPack: (packTypeId, ap) => {
        const pack = AGENT_PACK_TYPES[packTypeId];
        if (!pack || ap < pack.cost) return null;

        const state = get();
        const now = Date.now();
        const today = new Date().toISOString().slice(0, 10);

        // Calculate comeback bonus (hours since last pack)
        const hoursSinceLastPack = state.lastPackTime > 0
          ? (now - state.lastPackTime) / 3600000
          : 0;

        // Reset daily counter if new day
        const dailyPacks = state.dailyPackDate === today ? state.dailyPacksOpened : 0;

        // New player luck: first 5 packs get boosted odds
        const newPlayerBonus = state.totalPacksOpened < 5 ? 0.50 : 0;

        // Streak bonus: consecutive packs within 5 min get increasing luck
        const timeSinceLast = now - state.lastPackTime;
        const isStreaking = timeSinceLast < 300000 && state.lastPackTime > 0; // 5 min window
        const newStreak = isStreaking ? state.packStreak + 1 : 1;

        // Hot streak activates after 3 consecutive packs
        const isHotStreak = newStreak >= 3;
        // Hot streak multiplier: 10% at 3 packs, +5% per additional, cap at 30%
        const hotMult = isHotStreak ? Math.min(0.10 + (newStreak - 3) * 0.05, 0.30) : 0;

        const minted: MintedAgent[] = [];
        let newPity = state.pityCounter + 1;
        const nearMisses: string[] = [...state.nearMissHistory];
        let bestRarityThisPack: AgentRarity = 'Common';

        // Guaranteed slots first
        const guaranteed = pack.guaranteedSlots ?? [];
        let guaranteedCount = 0;
        for (const slot of guaranteed) {
          for (let i = 0; i < slot.count; i++) {
            const agent = pickRandomAgent(slot.rarity);
            if (agent) {
              const m = get().mintAgent(agent.id);
              if (m) { minted.push(m); guaranteedCount++; }
            }
          }
        }

        // Single guaranteed rarity
        if (pack.guaranteedRarity && guaranteedCount === 0) {
          const agent = pickRandomAgent(pack.guaranteedRarity);
          if (agent) {
            const m = get().mintAgent(agent.id);
            if (m) { minted.push(m); guaranteedCount++; }
          }
        }

        // Fill remaining with RNG (enhanced with addiction mechanics)
        const remaining = pack.cardCount - minted.length;
        for (let i = 0; i < remaining; i++) {
          const effectiveHotMult = hotMult + newPlayerBonus;
          const rarity = rollAgentRarity(newPity, effectiveHotMult, hoursSinceLastPack);
          const agent = pickRandomAgent(rarity);
          if (agent) {
            const m = get().mintAgent(agent.id);
            if (m) {
              minted.push(m);
              // Track best pull
              if (RARITY_ORDER.indexOf(rarity) > RARITY_ORDER.indexOf(bestRarityThisPack)) {
                bestRarityThisPack = rarity;
              }
              // Generate near-miss for FOMO
              const miss = generateNearMiss(rarity);
              if (miss) nearMisses.unshift(miss);
              // Reset pity on Legendary+
              if (rarity === 'Legendary' || rarity === 'Mythic') newPity = 0;
            }
          }
        }

        // Update best pull ever
        const bestEver = RARITY_ORDER.indexOf(bestRarityThisPack) > RARITY_ORDER.indexOf(state.bestPullEver)
          ? bestRarityThisPack
          : state.bestPullEver;

        set({
          pityCounter: newPity,
          packStreak: newStreak,
          lastPackTime: now,
          bestPullEver: bestEver,
          nearMissHistory: nearMisses.slice(0, 5),
          hotStreakActive: isHotStreak,
          hotStreakMultiplier: hotMult,
          totalPacksOpened: state.totalPacksOpened + 1,
          dailyPacksOpened: dailyPacks + 1,
          dailyPackDate: today,
          comebackBonus: hoursSinceLastPack,
        });
        return { minted, cost: pack.cost };
      },

      deployAgent: (mintId, targetId) => {
        const state = get();
        const agent = state.agents[mintId];
        if (!agent || agent.deployedTo) return false;

        set(s => ({
          agents: {
            ...s.agents,
            [mintId]: { ...agent, deployedTo: targetId },
          },
          totalDeployed: s.totalDeployed + 1,
        }));
        getBlockchain()?.recordDeploy(mintId, agent.cardId, targetId);
        return true;
      },

      recallAgent: (mintId) => {
        const state = get();
        const agent = state.agents[mintId];
        if (!agent || !agent.deployedTo) return false;

        set(s => ({
          agents: {
            ...s.agents,
            [mintId]: { ...agent, deployedTo: null },
          },
          totalDeployed: Math.max(0, s.totalDeployed - 1),
        }));
        getBlockchain()?.recordRecall(mintId, agent.cardId);
        return true;
      },

      reassignAgent: (mintId, newTargetId) => {
        const state = get();
        const agent = state.agents[mintId];
        if (!agent) return false;
        set(s => ({
          agents: {
            ...s.agents,
            [mintId]: { ...agent, deployedTo: newTargetId },
          },
        }));
        return true;
      },

      useAbility: (mintId, currentTick) => {
        const agent = get().agents[mintId];
        if (!agent || !agent.deployedTo) return false;
        if (currentTick < agent.cooldownUntil) return false;

        const def = getAgentById(agent.cardId);
        if (!def) return false;

        set(s => ({
          agents: {
            ...s.agents,
            [mintId]: {
              ...agent,
              cooldownUntil: currentTick + def.ability.cooldownTicks,
              totalMissions: agent.totalMissions + 1,
              successfulMissions: agent.successfulMissions + 1,
            },
          },
        }));
        getBlockchain()?.recordAbilityUse(mintId, agent.cardId, def.ability.name);
        return true;
      },

      useUltimate: (mintId, currentTick) => {
        const agent = get().agents[mintId];
        if (!agent || !agent.deployedTo || agent.level < 5) return false;
        if (currentTick < agent.ultimateCooldownUntil) return false;

        const def = getAgentById(agent.cardId);
        if (!def?.ultimate) return false;

        set(s => ({
          agents: {
            ...s.agents,
            [mintId]: {
              ...agent,
              ultimateCooldownUntil: currentTick + def.ultimate!.cooldownTicks,
              totalMissions: agent.totalMissions + 1,
              successfulMissions: agent.successfulMissions + 1,
            },
          },
        }));
        return true;
      },

      addXP: (mintId, amount) => {
        const agent = get().agents[mintId];
        if (!agent) return;

        const def = getAgentById(agent.cardId);
        if (!def) return;
        const maxLevel = AGENT_RARITY_CONFIG[def.rarity].maxLevel;
        if (agent.level >= maxLevel) return;

        const newXP = agent.xp + amount;
        const needed = xpForLevel(agent.level);

        if (newXP >= needed && agent.level < maxLevel) {
          set(s => ({
            agents: {
              ...s.agents,
              [mintId]: { ...agent, xp: newXP - needed, level: agent.level + 1 },
            },
          }));
        } else {
          set(s => ({
            agents: {
              ...s.agents,
              [mintId]: { ...agent, xp: newXP },
            },
          }));
        }
      },

      levelUp: (mintId) => {
        const agent = get().agents[mintId];
        if (!agent) return false;
        const def = getAgentById(agent.cardId);
        if (!def) return false;
        const maxLevel = AGENT_RARITY_CONFIG[def.rarity].maxLevel;
        if (agent.level >= maxLevel) return false;
        const needed = xpForLevel(agent.level);
        if (agent.xp < needed) return false;

        // Stat growth on level up: +1-3 per weighted stat, capped by potential
        const newLevel = agent.level + 1;
        const growthPerLevel = 1 + Math.floor(Math.random() * 3); // 1-3
        const boostedStats = { ...agent.dynamicStatBoosts };
        const statKeys = ['intelligence', 'speed', 'stealth', 'loyalty', 'adaptability', 'influence'] as const;
        // Pick 2-3 random stats to boost
        const numStats = 2 + (Math.random() > 0.5 ? 1 : 0);
        const shuffled = [...statKeys].sort(() => Math.random() - 0.5).slice(0, numStats);
        for (const stat of shuffled) {
          boostedStats[stat] = (boostedStats[stat] ?? 0) + growthPerLevel;
        }

        // Recalculate OVR with boosted stats
        const effectiveStats = { ...def.stats };
        for (const [k, v] of Object.entries(boostedStats)) {
          effectiveStats[k as keyof typeof effectiveStats] = Math.min(99,
            (effectiveStats[k as keyof typeof effectiveStats] ?? 0) + (v ?? 0));
        }
        const newOVR = Math.min(agent.potentialRating, computeOverallRating(effectiveStats, def.class));

        set(s => ({
          agents: {
            ...s.agents,
            [mintId]: {
              ...agent,
              xp: agent.xp - needed,
              level: newLevel,
              dynamicStatBoosts: boostedStats,
              currentOverallRating: newOVR,
            },
          },
        }));
        getBlockchain()?.recordLevelUp(mintId, agent.cardId, newLevel);
        return true;
      },

      lockAgent: (mintId) => {
        const agent = get().agents[mintId];
        if (!agent) return;
        set(s => ({
          agents: { ...s.agents, [mintId]: { ...agent, isLocked: true } },
        }));
      },

      unlockAgent: (mintId) => {
        const agent = get().agents[mintId];
        if (!agent) return;
        set(s => ({
          agents: { ...s.agents, [mintId]: { ...agent, isLocked: false } },
        }));
      },

      listAgent: (mintId, price) => {
        const agent = get().agents[mintId];
        if (!agent || agent.isLocked || agent.deployedTo) return;

        const listing: AgentMarketListing = {
          id: `lst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          mintId,
          cardId: agent.cardId,
          price,
          listedAt: Date.now(),
        };

        set(s => ({
          listings: [...s.listings, listing],
          agents: { ...s.agents, [mintId]: { ...agent, isLocked: true } },
        }));
        getBlockchain()?.recordList(mintId, agent.cardId, price);
      },

      buyAgent: (listingId) => {
        const state = get();
        const listing = state.listings.find(l => l.id === listingId);
        if (!listing) return null;

        const agent = state.agents[listing.mintId];
        if (!agent) return null;

        // Transfer ownership (in multiplayer, would change user_id)
        set(s => ({
          listings: s.listings.filter(l => l.id !== listingId),
          agents: {
            ...s.agents,
            [listing.mintId]: { ...agent, isLocked: false },
          },
        }));
        getBlockchain()?.recordTransfer(listing.mintId, listing.cardId, 'MARKET', 'PLAYER', {
          price: listing.price,
          listingId,
        });

        return agent;
      },

      delistAgent: (listingId) => {
        const state = get();
        const listing = state.listings.find(l => l.id === listingId);
        if (!listing) return;

        const agent = state.agents[listing.mintId];
        set(s => ({
          listings: s.listings.filter(l => l.id !== listingId),
          agents: agent
            ? { ...s.agents, [listing.mintId]: { ...agent, isLocked: false } }
            : s.agents,
        }));
        getBlockchain()?.recordDelist(listing.mintId, listing.cardId);
      },

      quickSellAgent: (mintId) => {
        const state = get();
        const agent = state.agents[mintId];
        if (!agent || agent.isLocked || agent.deployedTo) return 0;

        const def = getAgentById(agent.cardId);
        if (!def) return 0;

        const value = AGENT_RARITY_CONFIG[def.rarity].quickSellValue *
          (1 + (agent.level - 1) * 0.2); // +20% per level above 1

        const newAgents = { ...state.agents };
        delete newAgents[mintId];

        set({ agents: newAgents });
        getBlockchain()?.recordBurn(mintId, agent.cardId, {
          apReceived: Math.floor(value),
          rarity: def.rarity,
          level: agent.level,
        });
        return Math.floor(value);
      },

      getDeployedAgents: (targetId) => {
        const state = get();
        return Object.values(state.agents).filter(a => a.deployedTo === targetId);
      },

      getAgentDef: (mintId) => {
        const agent = get().agents[mintId];
        if (!agent) return undefined;
        return getAgentById(agent.cardId);
      },

      // ── FIFA-style actions ─────────────────────────────────────
      applySpecialCard: (mintId, type) => {
        const agent = get().agents[mintId];
        if (!agent) return;
        const def = getAgentById(agent.cardId);
        if (!def) return;
        // Special cards boost stats temporarily
        const boostMap: Record<SpecialCardType, number> = {
          TOTW: 3, TOTS: 5, Icon: 8, Prospect: 2, Inform: 4, Flashback: 6,
        };
        const boost = boostMap[type] ?? 0;
        const boosted = { ...agent.dynamicStatBoosts };
        for (const stat of ['intelligence', 'speed', 'stealth', 'loyalty', 'adaptability', 'influence'] as const) {
          boosted[stat] = (boosted[stat] ?? 0) + boost;
        }
        const effectiveStats = { ...def.stats };
        for (const [k, v] of Object.entries(boosted)) {
          effectiveStats[k as keyof typeof effectiveStats] = Math.min(99,
            (effectiveStats[k as keyof typeof effectiveStats] ?? 0) + (v ?? 0));
        }
        const newOVR = computeOverallRating(effectiveStats, def.class);
        set(s => ({
          agents: { ...s.agents, [mintId]: { ...agent, specialCardType: type, dynamicStatBoosts: boosted, currentOverallRating: newOVR } },
        }));
        getBlockchain()?.recordSpecialCard(mintId, agent.cardId, type);
      },

      setContract: (mintId, contract) => {
        const agent = get().agents[mintId];
        if (!agent) return;
        set(s => ({
          agents: { ...s.agents, [mintId]: { ...agent, contract } },
        }));
        getBlockchain()?.recordContractSign(mintId, agent.cardId, contract.salary, contract.totalTicks);
      },

      tickContracts: () => {
        const agents = get().agents;
        const updated: Record<string, MintedAgent> = {};
        let changed = false;
        for (const [id, agent] of Object.entries(agents)) {
          if (agent.contract && agent.deployedTo && agent.contract.status === 'active') {
            const remaining = agent.contract.ticksRemaining - 1;
            const status = remaining <= 0 ? 'expired' as const
              : remaining <= 10 ? 'expiring' as const
              : 'active' as const;
            updated[id] = {
              ...agent,
              contract: { ...agent.contract, ticksRemaining: Math.max(0, remaining), status },
            };
            changed = true;
          } else {
            updated[id] = agent;
          }
        }
        if (changed) set({ agents: updated });
      },

      setDevelopmentPlan: (mintId, plan) => {
        const agent = get().agents[mintId];
        if (!agent) return;
        set(s => ({
          agents: { ...s.agents, [mintId]: { ...agent, developmentPlan: plan } },
        }));
      },

      applyStatBoost: (mintId, stat, value) => {
        const agent = get().agents[mintId];
        if (!agent) return;
        const def = getAgentById(agent.cardId);
        if (!def) return;
        const boosted = { ...agent.dynamicStatBoosts, [stat]: (agent.dynamicStatBoosts[stat as keyof typeof agent.dynamicStatBoosts] ?? 0) + value };
        const effectiveStats = { ...def.stats };
        for (const [k, v] of Object.entries(boosted)) {
          effectiveStats[k as keyof typeof effectiveStats] = Math.min(99,
            (effectiveStats[k as keyof typeof effectiveStats] ?? 0) + (v ?? 0));
        }
        const newOVR = Math.min(agent.potentialRating, computeOverallRating(effectiveStats, def.class));
        set(s => ({
          agents: { ...s.agents, [mintId]: { ...agent, dynamicStatBoosts: boosted, currentOverallRating: newOVR } },
        }));
        getBlockchain()?.recordBoost(mintId, agent.cardId, stat, value);
      },

      clearStatBoosts: (mintId) => {
        const agent = get().agents[mintId];
        if (!agent) return;
        const def = getAgentById(agent.cardId);
        if (!def) return;
        const baseOVR = computeOverallRating(def.stats, def.class);
        set(s => ({
          agents: { ...s.agents, [mintId]: { ...agent, dynamicStatBoosts: {}, currentOverallRating: baseOVR, specialCardType: null } },
        }));
      },

      getSynergyBonus: (targetId) => {
        const state = get();
        const deployed = Object.values(state.agents).filter(a => a.deployedTo === targetId);
        if (deployed.length < 2) return 0;

        // Collect all synergy tags from deployed agents
        const allTags: string[] = [];
        for (const agent of deployed) {
          const def = getAgentById(agent.cardId);
          if (def) allTags.push(...def.synergyTags);
        }

        // Count tag overlaps (shared tags between different agents)
        const tagCounts: Record<string, number> = {};
        for (const tag of allTags) {
          tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
        }

        // Synergy bonus: +5% per shared tag between agents
        let bonus = 0;
        for (const count of Object.values(tagCounts)) {
          if (count >= 2) bonus += 0.05 * (count - 1);
        }

        return Math.min(bonus, 0.50); // Cap at 50%
      },
    }),
    {
      name: 'aegis-agent-cards-v2',
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 2 && persisted?.agents) {
          // Migrate v1 agents: add FIFA-style fields
          for (const [_id, agent] of Object.entries(persisted.agents as Record<string, any>)) {
            if (agent.currentOverallRating === undefined) {
              const def = getAgentById(agent.cardId);
              if (def) {
                agent.currentOverallRating = computeOverallRating(def.stats, def.class);
                agent.potentialRating = Math.min(99, agent.currentOverallRating + 5 + Math.floor(Math.random() * 10));
              } else {
                agent.currentOverallRating = 50;
                agent.potentialRating = 60;
              }
              agent.specialCardType = null;
              agent.dynamicStatBoosts = {};
              agent.contract = null;
              agent.developmentPlan = null;
            }
          }
        }
        return persisted;
      },
      partialize: (state) => ({
        agents: state.agents,
        editionCounters: state.editionCounters,
        listings: state.listings,
        totalMinted: state.totalMinted,
        totalDeployed: state.totalDeployed,
        pityCounter: state.pityCounter,
        packStreak: state.packStreak,
        lastPackTime: state.lastPackTime,
        bestPullEver: state.bestPullEver,
        nearMissHistory: state.nearMissHistory,
        hotStreakActive: state.hotStreakActive,
        hotStreakMultiplier: state.hotStreakMultiplier,
        totalPacksOpened: state.totalPacksOpened,
        dailyPacksOpened: state.dailyPacksOpened,
        dailyPackDate: state.dailyPackDate,
        comebackBonus: state.comebackBonus,
      }),
    }
  )
);
