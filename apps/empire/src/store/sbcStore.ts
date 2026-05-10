// ── SBC (Squad Building Challenges) + Pack Challenges ──────────────────
// FUT-style: submit agents that meet requirements to earn rewards.
// Challenges rotate daily/weekly with escalating difficulty and pack rewards.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AgentRarity, getAgentById } from '../data/agentCards';
import { useAgentCardStore, type MintedAgent } from './agentCardStore';

// ── Types ────────────────────────────────────────────────────────

export interface SBCRequirement {
  type: 'min_rarity' | 'exact_rarity' | 'min_class_count' | 'exact_class'
    | 'min_level' | 'min_total_stats' | 'unique_classes' | 'max_duplicates'
    | 'specific_agent' | 'min_agents' | 'synergy_tag';
  value: string | number;
  label: string;            // Human-readable requirement
}

export interface SBCReward {
  type: 'pack' | 'ap' | 'xp' | 'agent' | 'title';
  packType?: string;         // Pack type ID for pack rewards
  amount?: number;           // AP or XP amount
  agentId?: string;          // Specific agent reward
  title?: string;            // Trophy/title reward
  label: string;
}

export interface SBCChallenge {
  id: string;
  name: string;
  description: string;
  category: 'daily' | 'weekly' | 'milestone' | 'legendary' | 'event';
  difficulty: 1 | 2 | 3 | 4 | 5;        // Star rating
  requirements: SBCRequirement[];
  requiredSlots: number;                  // How many agents must be submitted
  rewards: SBCReward[];
  repeatable: boolean;                    // Can be completed multiple times
  expiresAt?: number;                     // Unix timestamp for timed challenges
  unlockCondition?: string;               // What unlocks this SBC
  consumesAgents: boolean;                // If true, submitted agents are consumed (like FUT SBCs)
  backgroundGradient: [string, string];   // Visual styling
  icon: string;
}

export interface SBCSubmission {
  challengeId: string;
  agentMintIds: string[];    // Agents submitted
  completedAt: number;
  rewardsClaimed: boolean;
}

export interface PackChallenge {
  id: string;
  name: string;
  description: string;
  objective: string;         // What to achieve
  progress: number;          // Current progress
  target: number;            // Target to complete
  reward: SBCReward;
  category: 'daily' | 'weekly' | 'lifetime';
  expiresAt?: number;
  completed: boolean;
}

interface SBCState {
  // SBC Challenges
  availableSBCs: SBCChallenge[];
  completedSBCs: SBCSubmission[];
  activeSBCSlots: Record<string, string[]>; // challengeId -> array of mintIds in slots

  // Pack Challenges (objectives like "open 5 packs today")
  packChallenges: PackChallenge[];

  // Actions
  loadDailyChallenges: () => void;
  loadWeeklyChallenges: () => void;
  setSBCSlot: (challengeId: string, slotIndex: number, mintId: string) => void;
  clearSBCSlot: (challengeId: string, slotIndex: number) => void;
  validateSBC: (challengeId: string) => { valid: boolean; errors: string[] };
  submitSBC: (challengeId: string) => SBCReward[] | null;
  updatePackChallengeProgress: (type: string, amount: number) => void;
  claimPackChallengeReward: (challengeId: string) => SBCReward | null;
}

// ── Challenge Templates ──────────────────────────────────────────

const SBC_TEMPLATES: SBCChallenge[] = [
  // ── Daily Challenges (rotate every 24h) ──
  {
    id: 'sbc-daily-commons',
    name: 'Common Ground',
    description: 'Submit 3 Common agents. Sometimes quantity beats quality.',
    category: 'daily',
    difficulty: 1,
    requirements: [
      { type: 'exact_rarity', value: 'Common', label: 'All agents must be Common rarity' },
      { type: 'min_agents', value: 3, label: 'Submit 3 agents' },
    ],
    requiredSlots: 3,
    rewards: [
      { type: 'pack', packType: 'basic', label: 'Basic Agent Pack' },
      { type: 'ap', amount: 100, label: '100 AP' },
    ],
    repeatable: false,
    consumesAgents: true,
    backgroundGradient: ['#1a1a2e', '#16213e'],
    icon: '📦',
  },
  {
    id: 'sbc-daily-mixed',
    name: 'Diverse Squad',
    description: 'Submit agents from 3 different classes.',
    category: 'daily',
    difficulty: 2,
    requirements: [
      { type: 'unique_classes', value: 3, label: 'At least 3 different classes' },
      { type: 'min_agents', value: 3, label: 'Submit 3 agents' },
    ],
    requiredSlots: 3,
    rewards: [
      { type: 'pack', packType: 'premium', label: 'Premium Agent Pack' },
      { type: 'ap', amount: 200, label: '200 AP' },
    ],
    repeatable: false,
    consumesAgents: true,
    backgroundGradient: ['#1a2e1a', '#213e16'],
    icon: '🎭',
  },
  {
    id: 'sbc-daily-leveled',
    name: 'Veterans Only',
    description: 'Submit 2 agents that are level 3 or higher.',
    category: 'daily',
    difficulty: 3,
    requirements: [
      { type: 'min_level', value: 3, label: 'All agents must be level 3+' },
      { type: 'min_agents', value: 2, label: 'Submit 2 agents' },
    ],
    requiredSlots: 2,
    rewards: [
      { type: 'pack', packType: 'elite', label: 'Elite Agent Pack' },
      { type: 'xp', amount: 500, label: '500 XP' },
    ],
    repeatable: false,
    consumesAgents: true,
    backgroundGradient: ['#2e1a2e', '#3e1621'],
    icon: '⭐',
  },

  // ── Weekly Challenges (rotate every 7 days) ──
  {
    id: 'sbc-weekly-class-master',
    name: 'Class Master',
    description: 'Submit a full squad of 5 agents from the same class.',
    category: 'weekly',
    difficulty: 4,
    requirements: [
      { type: 'min_class_count', value: 5, label: 'All 5 agents from same class' },
      { type: 'min_agents', value: 5, label: 'Submit 5 agents' },
    ],
    requiredSlots: 5,
    rewards: [
      { type: 'pack', packType: 'elite', label: 'Elite Agent Pack x2' },
      { type: 'ap', amount: 1000, label: '1,000 AP' },
      { type: 'title', title: 'Class Master', label: 'Title: Class Master' },
    ],
    repeatable: false,
    consumesAgents: true,
    backgroundGradient: ['#1a1a3e', '#21163e'],
    icon: '🏆',
  },
  {
    id: 'sbc-weekly-rare-sacrifice',
    name: 'Rare Sacrifice',
    description: 'Trade in 3 Rare+ agents for a shot at something greater.',
    category: 'weekly',
    difficulty: 3,
    requirements: [
      { type: 'min_rarity', value: 'Rare', label: 'All agents must be Rare or higher' },
      { type: 'min_agents', value: 3, label: 'Submit 3 agents' },
    ],
    requiredSlots: 3,
    rewards: [
      { type: 'pack', packType: 'legendary', label: 'Legendary Agent Pack' },
      { type: 'ap', amount: 500, label: '500 AP' },
    ],
    repeatable: false,
    consumesAgents: true,
    backgroundGradient: ['#3e2e1a', '#3e3516'],
    icon: '🔥',
  },
  {
    id: 'sbc-weekly-synergy',
    name: 'Synergy Squad',
    description: 'Submit 4 agents that share at least 2 synergy tags.',
    category: 'weekly',
    difficulty: 4,
    requirements: [
      { type: 'synergy_tag', value: 2, label: 'At least 2 shared synergy tags across squad' },
      { type: 'min_agents', value: 4, label: 'Submit 4 agents' },
    ],
    requiredSlots: 4,
    rewards: [
      { type: 'pack', packType: 'elite', label: 'Elite Agent Pack' },
      { type: 'xp', amount: 1000, label: '1,000 XP' },
      { type: 'ap', amount: 750, label: '750 AP' },
    ],
    repeatable: false,
    consumesAgents: true,
    backgroundGradient: ['#1a3e2e', '#163e35'],
    icon: '🔗',
  },

  // ── Milestone Challenges (permanent, one-time) ──
  {
    id: 'sbc-milestone-first-epic',
    name: 'Epic Achievement',
    description: 'Submit your first Epic agent to prove your dedication.',
    category: 'milestone',
    difficulty: 3,
    requirements: [
      { type: 'exact_rarity', value: 'Epic', label: 'Submit 1 Epic rarity agent' },
      { type: 'min_agents', value: 1, label: 'Submit 1 agent' },
    ],
    requiredSlots: 1,
    rewards: [
      { type: 'pack', packType: 'premium', label: 'Premium Agent Pack x3' },
      { type: 'ap', amount: 2000, label: '2,000 AP' },
      { type: 'title', title: 'Epic Collector', label: 'Title: Epic Collector' },
    ],
    repeatable: false,
    consumesAgents: true,
    backgroundGradient: ['#2e1a3e', '#3e1635'],
    icon: '💎',
  },
  {
    id: 'sbc-milestone-stat-beast',
    name: 'Stat Beast',
    description: 'Submit a squad with combined stats over 1500.',
    category: 'milestone',
    difficulty: 4,
    requirements: [
      { type: 'min_total_stats', value: 1500, label: 'Combined squad stats must exceed 1,500' },
      { type: 'min_agents', value: 4, label: 'Submit 4 agents' },
    ],
    requiredSlots: 4,
    rewards: [
      { type: 'pack', packType: 'legendary', label: 'Legendary Agent Pack' },
      { type: 'ap', amount: 3000, label: '3,000 AP' },
    ],
    repeatable: false,
    consumesAgents: true,
    backgroundGradient: ['#3e1a1a', '#3e1616'],
    icon: '💪',
  },

  // ── Legendary Challenges (hardest, best rewards) ──
  {
    id: 'sbc-legendary-ultimate',
    name: 'The Ultimate Sacrifice',
    description: 'Trade 2 Legendary agents for a guaranteed Mythic.',
    category: 'legendary',
    difficulty: 5,
    requirements: [
      { type: 'exact_rarity', value: 'Legendary', label: 'Both agents must be Legendary' },
      { type: 'min_agents', value: 2, label: 'Submit 2 agents' },
      { type: 'min_level', value: 5, label: 'Both agents must be level 5+' },
    ],
    requiredSlots: 2,
    rewards: [
      { type: 'agent', agentId: '__mythic_random__', label: 'Guaranteed Mythic Agent' },
      { type: 'ap', amount: 10000, label: '10,000 AP' },
      { type: 'title', title: 'Mythic Alchemist', label: 'Title: Mythic Alchemist' },
    ],
    repeatable: true,
    consumesAgents: true,
    backgroundGradient: ['#3e0a0a', '#3e1a00'],
    icon: '🌟',
  },
  {
    id: 'sbc-legendary-full-class',
    name: 'Master of All',
    description: 'Submit one agent from every class (10 unique classes).',
    category: 'legendary',
    difficulty: 5,
    requirements: [
      { type: 'unique_classes', value: 10, label: 'All 10 agent classes represented' },
      { type: 'min_rarity', value: 'Uncommon', label: 'All agents must be Uncommon+' },
      { type: 'min_agents', value: 10, label: 'Submit 10 agents' },
    ],
    requiredSlots: 10,
    rewards: [
      { type: 'pack', packType: 'legendary', label: 'Legendary Pack x3' },
      { type: 'ap', amount: 15000, label: '15,000 AP' },
      { type: 'title', title: 'Grandmaster', label: 'Title: Grandmaster' },
    ],
    repeatable: false,
    consumesAgents: true,
    backgroundGradient: ['#0a0a3e', '#1a003e'],
    icon: '👑',
  },
];

// ── Pack Challenge Templates ─────────────────────────────────────

function generateDailyPackChallenges(): PackChallenge[] {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return [
    {
      id: `pc-daily-open3-${new Date().toISOString().slice(0, 10)}`,
      name: 'Daily Opener',
      description: 'Open 3 packs today',
      objective: 'Open 3 agent packs',
      progress: 0,
      target: 3,
      reward: { type: 'ap', amount: 150, label: '150 AP' },
      category: 'daily',
      expiresAt: endOfDay.getTime(),
      completed: false,
    },
    {
      id: `pc-daily-rare-${new Date().toISOString().slice(0, 10)}`,
      name: 'Rare Hunter',
      description: 'Pull a Rare or better agent from a pack',
      objective: 'Pull 1 Rare+ agent',
      progress: 0,
      target: 1,
      reward: { type: 'pack', packType: 'basic', label: 'Free Basic Pack' },
      category: 'daily',
      expiresAt: endOfDay.getTime(),
      completed: false,
    },
    {
      id: `pc-daily-deploy-${new Date().toISOString().slice(0, 10)}`,
      name: 'Field Agent',
      description: 'Deploy 2 agents to nodes',
      objective: 'Deploy 2 agents',
      progress: 0,
      target: 2,
      reward: { type: 'ap', amount: 100, label: '100 AP' },
      category: 'daily',
      expiresAt: endOfDay.getTime(),
      completed: false,
    },
    {
      id: `pc-daily-level-${new Date().toISOString().slice(0, 10)}`,
      name: 'Level Up',
      description: 'Level up any agent once',
      objective: 'Level up 1 agent',
      progress: 0,
      target: 1,
      reward: { type: 'xp', amount: 200, label: '200 XP' },
      category: 'daily',
      expiresAt: endOfDay.getTime(),
      completed: false,
    },
  ];
}

function generateWeeklyPackChallenges(): PackChallenge[] {
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  return [
    {
      id: `pc-weekly-open15-${new Date().toISOString().slice(0, 10)}`,
      name: 'Pack Addict',
      description: 'Open 15 packs this week',
      objective: 'Open 15 packs',
      progress: 0,
      target: 15,
      reward: { type: 'pack', packType: 'elite', label: 'Free Elite Pack' },
      category: 'weekly',
      expiresAt: endOfWeek.getTime(),
      completed: false,
    },
    {
      id: `pc-weekly-epic-${new Date().toISOString().slice(0, 10)}`,
      name: 'Epic Quest',
      description: 'Pull an Epic or better agent',
      objective: 'Pull 1 Epic+ agent',
      progress: 0,
      target: 1,
      reward: { type: 'ap', amount: 500, label: '500 AP' },
      category: 'weekly',
      expiresAt: endOfWeek.getTime(),
      completed: false,
    },
    {
      id: `pc-weekly-sbc-${new Date().toISOString().slice(0, 10)}`,
      name: 'Challenge Champion',
      description: 'Complete 3 SBC challenges',
      objective: 'Complete 3 SBCs',
      progress: 0,
      target: 3,
      reward: { type: 'pack', packType: 'premium', label: 'Premium Pack x2' },
      category: 'weekly',
      expiresAt: endOfWeek.getTime(),
      completed: false,
    },
  ];
}

const LIFETIME_CHALLENGES: PackChallenge[] = [
  {
    id: 'pc-life-100packs',
    name: 'Centurion',
    description: 'Open 100 packs total',
    objective: 'Open 100 packs',
    progress: 0,
    target: 100,
    reward: { type: 'pack', packType: 'legendary', label: 'Legendary Pack' },
    category: 'lifetime',
    completed: false,
  },
  {
    id: 'pc-life-all-classes',
    name: 'Gotta Catch Em All',
    description: 'Own at least 1 agent from every class',
    objective: 'Collect all 10 classes',
    progress: 0,
    target: 10,
    reward: { type: 'ap', amount: 5000, label: '5,000 AP' },
    category: 'lifetime',
    completed: false,
  },
  {
    id: 'pc-life-legendary',
    name: 'Legend',
    description: 'Pull your first Legendary agent',
    objective: 'Pull 1 Legendary agent',
    progress: 0,
    target: 1,
    reward: { type: 'title', title: 'Legend', label: 'Title: Legend' },
    category: 'lifetime',
    completed: false,
  },
  {
    id: 'pc-life-10sbc',
    name: 'SBC Veteran',
    description: 'Complete 10 SBC challenges',
    objective: 'Complete 10 SBCs',
    progress: 0,
    target: 10,
    reward: { type: 'pack', packType: 'elite', label: 'Elite Pack x5' },
    category: 'lifetime',
    completed: false,
  },
];

// ── Validation Helpers ───────────────────────────────────────────

const RARITY_ORDER: AgentRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

function meetsRarityMin(agentRarity: AgentRarity, minRarity: string): boolean {
  return RARITY_ORDER.indexOf(agentRarity) >= RARITY_ORDER.indexOf(minRarity as AgentRarity);
}

function getAgentTotalStats(cardId: string): number {
  const def = getAgentById(cardId);
  if (!def) return 0;
  const s = def.stats;
  return s.intelligence + s.speed + s.stealth + s.loyalty + s.adaptability + s.influence;
}

// ── Store ────────────────────────────────────────────────────────

export const useSBCStore = create<SBCState>()(
  persist(
    (set, get) => ({
      availableSBCs: SBC_TEMPLATES,
      completedSBCs: [],
      activeSBCSlots: {},
      packChallenges: [...generateDailyPackChallenges(), ...generateWeeklyPackChallenges(), ...LIFETIME_CHALLENGES],

      loadDailyChallenges: () => {
        set(s => ({
          packChallenges: [
            ...s.packChallenges.filter(c => c.category !== 'daily'),
            ...generateDailyPackChallenges(),
          ],
        }));
      },

      loadWeeklyChallenges: () => {
        set(s => ({
          packChallenges: [
            ...s.packChallenges.filter(c => c.category !== 'weekly'),
            ...generateWeeklyPackChallenges(),
          ],
        }));
      },

      setSBCSlot: (challengeId, slotIndex, mintId) => {
        set(s => {
          const current = s.activeSBCSlots[challengeId] ?? [];
          const updated = [...current];
          updated[slotIndex] = mintId;
          return { activeSBCSlots: { ...s.activeSBCSlots, [challengeId]: updated } };
        });
      },

      clearSBCSlot: (challengeId, slotIndex) => {
        set(s => {
          const current = s.activeSBCSlots[challengeId] ?? [];
          const updated = [...current];
          updated[slotIndex] = '';
          return { activeSBCSlots: { ...s.activeSBCSlots, [challengeId]: updated } };
        });
      },

      validateSBC: (challengeId) => {
        const state = get();
        const challenge = state.availableSBCs.find(c => c.id === challengeId);
        if (!challenge) return { valid: false, errors: ['Challenge not found'] };

        const slots = state.activeSBCSlots[challengeId] ?? [];
        const filledSlots = slots.filter(s => s && s.length > 0);
        const errors: string[] = [];

        // Check slot count
        if (filledSlots.length < challenge.requiredSlots) {
          errors.push(`Need ${challenge.requiredSlots} agents, have ${filledSlots.length}`);
        }

        // Get agent data
        const agentStore = useAgentCardStore.getState();
        const agents: { minted: MintedAgent; def: ReturnType<typeof getAgentById> }[] = [];
        for (const mintId of filledSlots) {
          const minted = agentStore.agents[mintId];
          if (!minted) { errors.push(`Agent ${mintId} not found`); continue; }
          if (minted.isLocked) { errors.push(`Agent ${mintId} is locked`); continue; }
          if (minted.deployedTo) { errors.push(`Agent is currently deployed — recall first`); continue; }
          const def = getAgentById(minted.cardId);
          if (def) agents.push({ minted, def });
        }

        // Validate each requirement
        for (const req of challenge.requirements) {
          switch (req.type) {
            case 'min_rarity':
              for (const a of agents) {
                if (!meetsRarityMin(a.def!.rarity, req.value as string)) {
                  errors.push(`${a.def!.name} doesn't meet minimum rarity: ${req.value}`);
                }
              }
              break;
            case 'exact_rarity':
              for (const a of agents) {
                if (a.def!.rarity !== req.value) {
                  errors.push(`${a.def!.name} must be ${req.value} rarity`);
                }
              }
              break;
            case 'min_class_count': {
              const classCounts: Record<string, number> = {};
              for (const a of agents) {
                classCounts[a.def!.class] = (classCounts[a.def!.class] ?? 0) + 1;
              }
              const maxCount = Math.max(0, ...Object.values(classCounts));
              if (maxCount < (req.value as number)) {
                errors.push(`Need ${req.value} agents from same class, max is ${maxCount}`);
              }
              break;
            }
            case 'exact_class':
              for (const a of agents) {
                if (a.def!.class !== req.value) {
                  errors.push(`${a.def!.name} must be ${req.value} class`);
                }
              }
              break;
            case 'min_level':
              for (const a of agents) {
                if (a.minted.level < (req.value as number)) {
                  errors.push(`${a.def!.name} must be level ${req.value}+ (currently ${a.minted.level})`);
                }
              }
              break;
            case 'min_total_stats': {
              const totalStats = agents.reduce((sum, a) => sum + getAgentTotalStats(a.minted.cardId), 0);
              if (totalStats < (req.value as number)) {
                errors.push(`Combined stats ${totalStats} < required ${req.value}`);
              }
              break;
            }
            case 'unique_classes': {
              const uniqueClasses = new Set(agents.map(a => a.def!.class));
              if (uniqueClasses.size < (req.value as number)) {
                errors.push(`Need ${req.value} unique classes, have ${uniqueClasses.size}`);
              }
              break;
            }
            case 'min_agents':
              if (agents.length < (req.value as number)) {
                errors.push(`Need ${req.value} agents, have ${agents.length}`);
              }
              break;
            case 'synergy_tag': {
              const tagCounts: Record<string, number> = {};
              for (const a of agents) {
                for (const tag of a.def!.synergyTags) {
                  tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
                }
              }
              const sharedTags = Object.values(tagCounts).filter(c => c >= 2).length;
              if (sharedTags < (req.value as number)) {
                errors.push(`Need ${req.value} shared synergy tags, have ${sharedTags}`);
              }
              break;
            }
          }
        }

        return { valid: errors.length === 0, errors };
      },

      submitSBC: (challengeId) => {
        const state = get();
        const challenge = state.availableSBCs.find(c => c.id === challengeId);
        if (!challenge) return null;

        // Check if already completed (non-repeatable)
        if (!challenge.repeatable && state.completedSBCs.some(s => s.challengeId === challengeId)) {
          return null;
        }

        const validation = get().validateSBC(challengeId);
        if (!validation.valid) return null;

        const slots = state.activeSBCSlots[challengeId] ?? [];
        const filledSlots = slots.filter(s => s && s.length > 0);

        // Consume agents if required (like FUT SBCs)
        if (challenge.consumesAgents) {
          const agentStore = useAgentCardStore.getState();
          const updatedAgents = { ...agentStore.agents };
          for (const mintId of filledSlots) {
            delete updatedAgents[mintId];
          }
          useAgentCardStore.setState({ agents: updatedAgents });
        }

        // Record completion
        const submission: SBCSubmission = {
          challengeId,
          agentMintIds: filledSlots,
          completedAt: Date.now(),
          rewardsClaimed: true,
        };

        set(s => ({
          completedSBCs: [...s.completedSBCs, submission],
          activeSBCSlots: { ...s.activeSBCSlots, [challengeId]: [] },
        }));

        // Update SBC completion pack challenge
        get().updatePackChallengeProgress('sbc_complete', 1);

        return challenge.rewards;
      },

      updatePackChallengeProgress: (type, amount) => {
        set(s => ({
          packChallenges: s.packChallenges.map(c => {
            if (c.completed) return c;
            // Match challenge type to progress
            let shouldUpdate = false;
            if (type === 'pack_opened' && (c.id.includes('open') || c.id.includes('100pack'))) shouldUpdate = true;
            if (type === 'rare_pulled' && c.id.includes('rare')) shouldUpdate = true;
            if (type === 'epic_pulled' && c.id.includes('epic')) shouldUpdate = true;
            if (type === 'legendary_pulled' && c.id.includes('legendary')) shouldUpdate = true;
            if (type === 'agent_deployed' && c.id.includes('deploy')) shouldUpdate = true;
            if (type === 'agent_leveled' && c.id.includes('level')) shouldUpdate = true;
            if (type === 'sbc_complete' && c.id.includes('sbc')) shouldUpdate = true;
            if (type === 'class_collected' && c.id.includes('class')) shouldUpdate = true;

            if (!shouldUpdate) return c;
            const newProgress = Math.min(c.progress + amount, c.target);
            return { ...c, progress: newProgress, completed: newProgress >= c.target };
          }),
        }));
      },

      claimPackChallengeReward: (challengeId) => {
        const state = get();
        const challenge = state.packChallenges.find(c => c.id === challengeId);
        if (!challenge || !challenge.completed) return null;

        // Mark as claimed by removing it
        set(s => ({
          packChallenges: s.packChallenges.filter(c => c.id !== challengeId),
        }));

        return challenge.reward;
      },
    }),
    {
      name: 'aegis-sbc-v1',
      partialize: (state) => ({
        completedSBCs: state.completedSBCs,
        activeSBCSlots: state.activeSBCSlots,
        packChallenges: state.packChallenges,
      }),
    }
  )
);
