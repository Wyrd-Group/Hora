/**
 * AgentEngine — Autonomous decision-making for deployed agent cards.
 *
 * Each tick, deployed agents:
 * 1. Apply passive buffs to their assigned node/department
 * 2. Evaluate whether to trigger their active ability
 * 3. Gain XP from their deployment
 * 4. Generate agent-specific events/alerts
 *
 * The engine reads from empireStore, livingWorldStore, and worldSimStore
 * to make decisions, then applies effects back to the game state.
 */

import { useAgentCardStore, type MintedAgent } from '../store/agentCardStore';
import {
  getAgentById,
  type AgentCardDef,
  type AgentAbility,
} from '../data/agentCards';

// ── Types ────────────────────────────────────────────────────────

export interface AgentEffect {
  agentMintId: string;
  agentName: string;
  targetId: string;
  effectType: string;
  value: number;
  expiresAtTick: number;
  source: 'passive' | 'ability' | 'ultimate' | 'synergy';
}

export interface AgentDecision {
  agentMintId: string;
  action: 'idle' | 'use_ability' | 'use_ultimate';
  reason: string;
  confidence: number; // 0-1
}

// ── Active Effects Tracker ──────────────────────────────────────

let activeEffects: AgentEffect[] = [];

export function getActiveEffects(): AgentEffect[] {
  return activeEffects;
}

export function getEffectsForTarget(targetId: string): AgentEffect[] {
  return activeEffects.filter(e => e.targetId === targetId);
}

export function getIncomeModifier(targetId: string): number {
  let mod = 0;
  for (const e of activeEffects) {
    if (e.targetId !== targetId && e.targetId !== 'empire') continue;
    if (e.effectType === 'income_boost' || e.effectType === 'venture_boost' ||
        e.effectType === 'trade_edge') {
      mod += e.value;
    }
  }
  return mod;
}

export function getCostModifier(targetId: string): number {
  let mod = 0;
  for (const e of activeEffects) {
    if (e.targetId !== targetId && e.targetId !== 'empire') continue;
    if (e.effectType === 'cost_reduction') {
      mod += e.value;
    }
  }
  return mod;
}

export function getDetectionModifier(targetId: string): number {
  let mod = 0;
  for (const e of activeEffects) {
    if (e.targetId !== targetId && e.targetId !== 'empire') continue;
    if (e.effectType === 'detection_reduction') {
      mod += e.value;
    }
  }
  return mod;
}

export function getResearchModifier(targetId: string): number {
  let mod = 0;
  for (const e of activeEffects) {
    if (e.targetId !== targetId && e.targetId !== 'empire') continue;
    if (e.effectType === 'research_speed' || e.effectType === 'innovation_speed') {
      mod += e.value;
    }
  }
  return mod;
}

// ── Decision Engine ─────────────────────────────────────────────

/**
 * Evaluate whether an agent should use their ability this tick.
 * Uses the agent's stats (intelligence, adaptability) to determine
 * decision quality and timing.
 */
function shouldUseAbility(
  agent: MintedAgent,
  def: AgentCardDef,
  currentTick: number,
): AgentDecision {
  // Can't use if on cooldown
  if (currentTick < agent.cooldownUntil) {
    return { agentMintId: agent.mintId, action: 'idle', reason: 'On cooldown', confidence: 1 };
  }

  // Intelligence determines decision quality (higher = smarter timing)
  const intel = def.stats.intelligence / 100;
  const adaptability = def.stats.adaptability / 100;

  // Base probability: higher level = more frequent ability use
  const levelBonus = agent.level * 0.02;  // +2% per level
  const baseProbability = 0.15 + levelBonus; // 15-39% base chance per tick

  // Intelligence modulates — smart agents wait for better moments
  // We simulate "good timing" with a random roll weighted by intelligence
  const roll = Math.random();
  const threshold = baseProbability * (0.5 + intel * 0.5);

  // Check for ultimate first (level 5+)
  if (def.ultimate && agent.level >= 5 && currentTick >= agent.ultimateCooldownUntil) {
    // Ultimates are used more rarely — only when conditions are "critical"
    const ultThreshold = threshold * 0.3; // 30% of normal rate
    if (roll < ultThreshold) {
      return {
        agentMintId: agent.mintId,
        action: 'use_ultimate',
        reason: `${def.name} activates ultimate: ${def.ultimate.name}`,
        confidence: intel,
      };
    }
  }

  // Normal ability
  if (roll < threshold) {
    return {
      agentMintId: agent.mintId,
      action: 'use_ability',
      reason: `${def.name} uses ${def.ability.name}`,
      confidence: intel * adaptability,
    };
  }

  return { agentMintId: agent.mintId, action: 'idle', reason: 'Waiting for optimal conditions', confidence: 0.5 };
}

// ── Apply Ability Effects ───────────────────────────────────────

function applyAbilityEffects(
  agent: MintedAgent,
  def: AgentCardDef,
  ability: AgentAbility,
  currentTick: number,
  source: 'ability' | 'ultimate',
) {
  const levelScale = 1 + (agent.level - 1) * 0.08; // +8% per level
  const scaledValue = ability.effect.value * levelScale;

  const targetId = ability.effect.target === 'empire'
    ? 'empire'
    : ability.effect.target === 'self' || ability.effect.target === 'node'
      ? agent.deployedTo ?? 'empire'
      : agent.deployedTo ?? 'empire';

  activeEffects.push({
    agentMintId: agent.mintId,
    agentName: def.name,
    targetId,
    effectType: ability.effect.type,
    value: scaledValue,
    expiresAtTick: currentTick + ability.effect.duration,
    source,
  });
}

// ── Main Tick Processor ─────────────────────────────────────────

export interface AgentTickResult {
  decisions: AgentDecision[];
  newEffects: AgentEffect[];
  expiredEffects: number;
  totalPassiveIncome: number;
  totalXPAwarded: number;
}

/**
 * Process one tick of agent behavior.
 * Call this from the main game tick loop (e.g., in useWorldEngineTicker or empireStore.processTick).
 */
export function processAgentTick(currentTick: number): AgentTickResult {
  const store = useAgentCardStore.getState();
  const agents = store.agents;
  const decisions: AgentDecision[] = [];
  const newEffects: AgentEffect[] = [];
  let totalPassiveIncome = 0;
  let totalXPAwarded = 0;

  // 1. Expire old effects
  const prevCount = activeEffects.length;
  activeEffects = activeEffects.filter(e => e.expiresAtTick > currentTick);
  const expiredEffects = prevCount - activeEffects.length;

  // 2. Process each deployed agent
  const deployed = Object.values(agents).filter(a => a.deployedTo);

  for (const agent of deployed) {
    const def = getAgentById(agent.cardId);
    if (!def) continue;

    // 2a. Apply passive buff (always active while deployed)
    const levelScale = 1 + (agent.level - 1) * 0.05;
    const passiveValue = def.passive.value * levelScale;
    totalPassiveIncome += passiveValue;

    // Ensure passive effect exists (refresh every tick)
    const existingPassive = activeEffects.find(
      e => e.agentMintId === agent.mintId && e.source === 'passive'
    );
    if (!existingPassive) {
      const passiveEffect: AgentEffect = {
        agentMintId: agent.mintId,
        agentName: def.name,
        targetId: agent.deployedTo!,
        effectType: def.passive.type,
        value: passiveValue,
        expiresAtTick: currentTick + 2, // Refresh every tick (1 tick buffer)
        source: 'passive',
      };
      activeEffects.push(passiveEffect);
      newEffects.push(passiveEffect);
    } else {
      // Refresh expiry
      existingPassive.expiresAtTick = currentTick + 2;
      existingPassive.value = passiveValue; // Update in case of level up
    }

    // 2b. Make ability decision
    const decision = shouldUseAbility(agent, def, currentTick);
    decisions.push(decision);

    if (decision.action === 'use_ability') {
      store.useAbility(agent.mintId, currentTick);
      applyAbilityEffects(agent, def, def.ability, currentTick, 'ability');
      newEffects.push(activeEffects[activeEffects.length - 1]);
    } else if (decision.action === 'use_ultimate' && def.ultimate) {
      store.useUltimate(agent.mintId, currentTick);
      applyAbilityEffects(agent, def, def.ultimate, currentTick, 'ultimate');
      newEffects.push(activeEffects[activeEffects.length - 1]);
    }

    // 2c. Award XP for being deployed
    const xpGain = 5 + agent.level; // 6-17 XP per tick based on level
    store.addXP(agent.mintId, xpGain);
    totalXPAwarded += xpGain;
  }

  // 3. Calculate synergy bonuses for targets with 2+ agents
  const targetCounts: Record<string, string[]> = {};
  for (const agent of deployed) {
    const target = agent.deployedTo!;
    if (!targetCounts[target]) targetCounts[target] = [];
    targetCounts[target].push(agent.mintId);
  }

  for (const [targetId, mintIds] of Object.entries(targetCounts)) {
    if (mintIds.length < 2) continue;
    const synergyBonus = store.getSynergyBonus(targetId);
    if (synergyBonus > 0) {
      const existingSynergy = activeEffects.find(
        e => e.targetId === targetId && e.source === 'synergy'
      );
      if (!existingSynergy) {
        const synergyEffect: AgentEffect = {
          agentMintId: 'synergy',
          agentName: 'Team Synergy',
          targetId,
          effectType: 'income_boost',
          value: synergyBonus,
          expiresAtTick: currentTick + 2,
          source: 'synergy',
        };
        activeEffects.push(synergyEffect);
        newEffects.push(synergyEffect);
      } else {
        existingSynergy.expiresAtTick = currentTick + 2;
        existingSynergy.value = synergyBonus;
      }
    }
  }

  return {
    decisions,
    newEffects,
    expiredEffects,
    totalPassiveIncome,
    totalXPAwarded,
  };
}

/**
 * Get a summary of all deployed agents and their current effects.
 * Useful for the UI dashboard.
 */
export function getAgentSummary(): {
  totalDeployed: number;
  activeAbilities: number;
  totalPassiveBoost: number;
  synergyBonuses: number;
} {
  const store = useAgentCardStore.getState();
  const deployed = Object.values(store.agents).filter(a => a.deployedTo);

  let totalPassiveBoost = 0;
  for (const agent of deployed) {
    const def = getAgentById(agent.cardId);
    if (def) {
      const levelScale = 1 + (agent.level - 1) * 0.05;
      totalPassiveBoost += def.passive.value * levelScale;
    }
  }

  const abilityEffects = activeEffects.filter(e => e.source === 'ability' || e.source === 'ultimate');
  const synergyEffects = activeEffects.filter(e => e.source === 'synergy');

  return {
    totalDeployed: deployed.length,
    activeAbilities: abilityEffects.length,
    totalPassiveBoost,
    synergyBonuses: synergyEffects.reduce((sum, e) => sum + e.value, 0),
  };
}
