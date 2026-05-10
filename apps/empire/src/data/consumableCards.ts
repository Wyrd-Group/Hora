// ── Consumable Cards (FIFA-style) ───────────────────────────────
// Attribute boosts, contract extensions, chemistry styles, training,
// scouting reports, healing, and position changes.

import type { AgentClass } from './agentCards';

export type ConsumableType =
  | 'attribute_boost'      // +5 to a specific stat for X ticks
  | 'contract_extension'   // +50/100/200 ticks to contract
  | 'position_change'      // Change agent class temporarily
  | 'chemistry_style'      // Redistribute stat weights for synergy
  | 'healing'              // Restore morale to 100
  | 'training'             // Instant XP boost
  | 'scouting_report';     // Reveal hidden potential of a student

export type ConsumableRarity = 'Bronze' | 'Silver' | 'Gold';

export interface ConsumableDef {
  id: string;
  name: string;
  type: ConsumableType;
  rarity: ConsumableRarity;
  description: string;
  icon: string;
  cost: number;               // AP to buy directly
  // Effect details
  stat?: string;              // Which stat (for attribute_boost)
  value: number;              // Boost amount / ticks / XP
  duration?: number;          // Ticks the effect lasts (0 = permanent until removed)
  targetClass?: AgentClass;   // For position_change
  color: string;              // Card border color
}

// ── Attribute Boost Cards ───────────────────────────────────────

const STAT_NAMES = ['intelligence', 'speed', 'stealth', 'loyalty', 'adaptability', 'influence'] as const;
const STAT_ICONS: Record<string, string> = {
  intelligence: '🧠', speed: '⚡', stealth: '👁️',
  loyalty: '🛡️', adaptability: '🔄', influence: '📢',
};

const attributeBoosts: ConsumableDef[] = STAT_NAMES.flatMap(stat => [
  {
    id: `cons-boost-${stat}-bronze`,
    name: `${stat.charAt(0).toUpperCase() + stat.slice(1)} Boost I`,
    type: 'attribute_boost' as const,
    rarity: 'Bronze' as const,
    description: `+3 ${stat} for 30 ticks`,
    icon: STAT_ICONS[stat],
    cost: 200,
    stat,
    value: 3,
    duration: 30,
    color: '#CD7F32',
  },
  {
    id: `cons-boost-${stat}-silver`,
    name: `${stat.charAt(0).toUpperCase() + stat.slice(1)} Boost II`,
    type: 'attribute_boost' as const,
    rarity: 'Silver' as const,
    description: `+5 ${stat} for 50 ticks`,
    icon: STAT_ICONS[stat],
    cost: 500,
    stat,
    value: 5,
    duration: 50,
    color: '#C0C0C0',
  },
  {
    id: `cons-boost-${stat}-gold`,
    name: `${stat.charAt(0).toUpperCase() + stat.slice(1)} Boost III`,
    type: 'attribute_boost' as const,
    rarity: 'Gold' as const,
    description: `+8 ${stat} for 80 ticks`,
    icon: STAT_ICONS[stat],
    cost: 1200,
    stat,
    value: 8,
    duration: 80,
    color: '#FFD700',
  },
]);

// ── Contract Extension Cards ────────────────────────────────────

const contractExtensions: ConsumableDef[] = [
  {
    id: 'cons-contract-bronze',
    name: 'Contract Renewal I',
    type: 'contract_extension',
    rarity: 'Bronze',
    description: '+50 ticks to agent contract',
    icon: '📄',
    cost: 300,
    value: 50,
    color: '#CD7F32',
  },
  {
    id: 'cons-contract-silver',
    name: 'Contract Renewal II',
    type: 'contract_extension',
    rarity: 'Silver',
    description: '+100 ticks to agent contract',
    icon: '📋',
    cost: 700,
    value: 100,
    color: '#C0C0C0',
  },
  {
    id: 'cons-contract-gold',
    name: 'Contract Renewal III',
    type: 'contract_extension',
    rarity: 'Gold',
    description: '+200 ticks to agent contract',
    icon: '📜',
    cost: 1500,
    value: 200,
    color: '#FFD700',
  },
];

// ── Chemistry Style Cards ───────────────────────────────────────

const chemistryStyles: ConsumableDef[] = [
  {
    id: 'cons-chem-shadow',
    name: 'Shadow',
    type: 'chemistry_style',
    rarity: 'Gold',
    description: 'Boosts speed & stealth. Ideal for Infiltrators.',
    icon: '🌑',
    cost: 800,
    value: 5, // +5 to speed & stealth
    color: '#1F2937',
  },
  {
    id: 'cons-chem-engine',
    name: 'Engine',
    type: 'chemistry_style',
    rarity: 'Gold',
    description: 'Boosts speed & adaptability. All-rounder style.',
    icon: '🔥',
    cost: 800,
    value: 5,
    color: '#EF4444',
  },
  {
    id: 'cons-chem-architect',
    name: 'Architect',
    type: 'chemistry_style',
    rarity: 'Gold',
    description: 'Boosts intelligence & influence. Command style.',
    icon: '🏛️',
    cost: 800,
    value: 5,
    color: '#3B82F6',
  },
  {
    id: 'cons-chem-sentinel',
    name: 'Sentinel',
    type: 'chemistry_style',
    rarity: 'Gold',
    description: 'Boosts loyalty & stealth. Defensive style.',
    icon: '🛡️',
    cost: 800,
    value: 5,
    color: '#10B981',
  },
  {
    id: 'cons-chem-maestro',
    name: 'Maestro',
    type: 'chemistry_style',
    rarity: 'Gold',
    description: 'Boosts intelligence & adaptability. Orchestrator style.',
    icon: '🎼',
    cost: 800,
    value: 5,
    color: '#A78BFA',
  },
];

// ── Training Cards ──────────────────────────────────────────────

const trainingCards: ConsumableDef[] = [
  {
    id: 'cons-training-bronze',
    name: 'Training Session I',
    type: 'training',
    rarity: 'Bronze',
    description: '+50 XP instantly',
    icon: '🏋️',
    cost: 150,
    value: 50,
    color: '#CD7F32',
  },
  {
    id: 'cons-training-silver',
    name: 'Training Session II',
    type: 'training',
    rarity: 'Silver',
    description: '+150 XP instantly',
    icon: '🏋️',
    cost: 400,
    value: 150,
    color: '#C0C0C0',
  },
  {
    id: 'cons-training-gold',
    name: 'Training Session III',
    type: 'training',
    rarity: 'Gold',
    description: '+400 XP instantly',
    icon: '🏋️',
    cost: 1000,
    value: 400,
    color: '#FFD700',
  },
];

// ── Healing Cards ───────────────────────────────────────────────

const healingCards: ConsumableDef[] = [
  {
    id: 'cons-heal-bronze',
    name: 'Morale Boost I',
    type: 'healing',
    rarity: 'Bronze',
    description: '+30 morale',
    icon: '💊',
    cost: 200,
    value: 30,
    color: '#CD7F32',
  },
  {
    id: 'cons-heal-silver',
    name: 'Morale Boost II',
    type: 'healing',
    rarity: 'Silver',
    description: '+60 morale',
    icon: '💉',
    cost: 450,
    value: 60,
    color: '#C0C0C0',
  },
  {
    id: 'cons-heal-gold',
    name: 'Full Recovery',
    type: 'healing',
    rarity: 'Gold',
    description: 'Restore morale to 100',
    icon: '❤️‍🩹',
    cost: 900,
    value: 100,
    color: '#FFD700',
  },
];

// ── Scouting Report Cards ───────────────────────────────────────

const scoutingReports: ConsumableDef[] = [
  {
    id: 'cons-scout-report',
    name: 'Scouting Report',
    type: 'scouting_report',
    rarity: 'Silver',
    description: 'Reveals the true potential rating of a student',
    icon: '🔍',
    cost: 600,
    value: 1, // 1 report
    color: '#C0C0C0',
  },
];

// ── Position Change Cards ───────────────────────────────────────

const CHANGEABLE_CLASSES: AgentClass[] = [
  'Autonomous', 'Coder', 'Orchestrator', 'Trader', 'Researcher',
  'Infiltrator', 'Navigator', 'Analyst', 'Social', 'Specialist',
];

const positionChanges: ConsumableDef[] = CHANGEABLE_CLASSES.map(cls => ({
  id: `cons-position-${cls.toLowerCase()}`,
  name: `${cls} Conversion`,
  type: 'position_change' as const,
  rarity: 'Gold' as const,
  description: `Temporarily converts agent class to ${cls} for 100 ticks`,
  icon: '🔀',
  cost: 1500,
  value: 100, // duration in ticks
  duration: 100,
  targetClass: cls,
  color: '#FFD700',
}));

// ── Full Catalog ────────────────────────────────────────────────

export const CONSUMABLE_CATALOG: ConsumableDef[] = [
  ...attributeBoosts,
  ...contractExtensions,
  ...chemistryStyles,
  ...trainingCards,
  ...healingCards,
  ...scoutingReports,
  ...positionChanges,
];

// ── Helpers ─────────────────────────────────────────────────────

export function getConsumableById(id: string): ConsumableDef | undefined {
  return CONSUMABLE_CATALOG.find(c => c.id === id);
}

export function getConsumablesByType(type: ConsumableType): ConsumableDef[] {
  return CONSUMABLE_CATALOG.filter(c => c.type === type);
}

export function getConsumablesByRarity(rarity: ConsumableRarity): ConsumableDef[] {
  return CONSUMABLE_CATALOG.filter(c => c.rarity === rarity);
}

// Chemistry style stat mappings (which 2 stats each style boosts)
export const CHEMISTRY_STYLE_STATS: Record<string, [string, string]> = {
  'cons-chem-shadow': ['speed', 'stealth'],
  'cons-chem-engine': ['speed', 'adaptability'],
  'cons-chem-architect': ['intelligence', 'influence'],
  'cons-chem-sentinel': ['loyalty', 'stealth'],
  'cons-chem-maestro': ['intelligence', 'adaptability'],
};
