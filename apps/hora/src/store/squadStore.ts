import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AgentClass, getAgentById } from '../data/agentCards';
import { useAgentCardStore, type MintedAgent } from './agentCardStore';

// ── Types ────────────────────────────────────────────────────────

export type SquadPosition =
  | 'CEO'          // 1 slot — Orchestrator/Autonomous preferred
  | 'CTO'          // 1 slot — Coder/Specialist preferred
  | 'CFO'          // 1 slot — Trader/Analyst preferred
  | 'CMO'          // 1 slot — Social preferred
  | 'COO'          // 1 slot — Navigator/Orchestrator preferred
  | 'Analyst_1'    // Analyst/Researcher
  | 'Analyst_2'    // Analyst/Researcher
  | 'Operative_1'  // Infiltrator/Specialist
  | 'Operative_2'  // Infiltrator/Specialist
  | 'Wildcard';    // Any class

export type SquadFormation = '5-3-2' | '4-4-2' | '3-5-2' | '4-3-3';

export interface SquadSlot {
  position: SquadPosition;
  mintId: string | null;
  chemistryScore: number;  // 0-10
}

export interface Squad {
  id: string;
  name: string;
  formation: SquadFormation;
  slots: SquadSlot[];
  overallRating: number;
  chemistry: number;     // 0-100
}

// ── Position Preferred Classes ───────────────────────────────────

const ALL_CLASSES: AgentClass[] = [
  'Autonomous', 'Coder', 'Orchestrator', 'Trader', 'Researcher',
  'Infiltrator', 'Navigator', 'Analyst', 'Social', 'Specialist',
  'Scout', 'Jobhunter',
];

export const POSITION_PREFERRED_CLASSES: Record<SquadPosition, AgentClass[]> = {
  CEO:         ['Orchestrator', 'Autonomous'],
  CTO:         ['Coder', 'Specialist'],
  CFO:         ['Trader', 'Analyst'],
  CMO:         ['Social'],
  COO:         ['Navigator', 'Orchestrator'],
  Analyst_1:   ['Analyst', 'Researcher'],
  Analyst_2:   ['Analyst', 'Researcher'],
  Operative_1: ['Infiltrator', 'Specialist'],
  Operative_2: ['Infiltrator', 'Specialist'],
  Wildcard:    ALL_CLASSES,
};

// ── Helpers ──────────────────────────────────────────────────────

const ALL_POSITIONS: SquadPosition[] = [
  'CEO', 'CTO', 'CFO', 'CMO', 'COO',
  'Analyst_1', 'Analyst_2',
  'Operative_1', 'Operative_2',
  'Wildcard',
];

function createEmptySlots(): SquadSlot[] {
  return ALL_POSITIONS.map((position) => ({
    position,
    mintId: null,
    chemistryScore: 0,
  }));
}

function generateSquadId(): string {
  return `sq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Get a prefix from cardId for "same academy" matching (e.g. "openai-" from "openai-gpt4"). */
function getAcademyPrefix(cardId: string): string {
  const dashIdx = cardId.indexOf('-');
  return dashIdx > 0 ? cardId.slice(0, dashIdx) : cardId;
}

// ── Store ────────────────────────────────────────────────────────

interface SquadState {
  squads: Record<string, Squad>;
  activeSquadId: string | null;

  // Actions
  createSquad: (name: string, formation: SquadFormation) => Squad;
  deleteSquad: (squadId: string) => void;
  assignAgent: (squadId: string, position: SquadPosition, mintId: string) => void;
  removeAgent: (squadId: string, position: SquadPosition) => void;
  setFormation: (squadId: string, formation: SquadFormation) => void;
  calculateChemistry: (squadId: string) => number;
  getSquadOVR: (squadId: string) => number;
}

export const useSquadStore = create<SquadState>()(
  persist(
    (set, get) => ({
      squads: {},
      activeSquadId: null,

      createSquad: (name, formation) => {
        const id = generateSquadId();
        const squad: Squad = {
          id,
          name,
          formation,
          slots: createEmptySlots(),
          overallRating: 0,
          chemistry: 0,
        };

        set((s) => ({
          squads: { ...s.squads, [id]: squad },
          activeSquadId: s.activeSquadId ?? id,
        }));

        return squad;
      },

      deleteSquad: (squadId) => {
        set((s) => {
          const { [squadId]: _, ...rest } = s.squads;
          return {
            squads: rest,
            activeSquadId: s.activeSquadId === squadId
              ? Object.keys(rest)[0] ?? null
              : s.activeSquadId,
          };
        });
      },

      assignAgent: (squadId, position, mintId) => {
        const state = get();
        const squad = state.squads[squadId];
        if (!squad) return;

        const newSlots = squad.slots.map((slot) =>
          slot.position === position
            ? { ...slot, mintId }
            : slot
        );

        set((s) => ({
          squads: {
            ...s.squads,
            [squadId]: { ...squad, slots: newSlots },
          },
        }));

        // Recalculate chemistry and OVR after assignment
        const chemistry = get().calculateChemistry(squadId);
        const ovr = get().getSquadOVR(squadId);
        set((s) => ({
          squads: {
            ...s.squads,
            [squadId]: {
              ...s.squads[squadId],
              chemistry,
              overallRating: ovr,
            },
          },
        }));
      },

      removeAgent: (squadId, position) => {
        const state = get();
        const squad = state.squads[squadId];
        if (!squad) return;

        const newSlots = squad.slots.map((slot) =>
          slot.position === position
            ? { ...slot, mintId: null, chemistryScore: 0 }
            : slot
        );

        set((s) => ({
          squads: {
            ...s.squads,
            [squadId]: { ...squad, slots: newSlots },
          },
        }));

        // Recalculate
        const chemistry = get().calculateChemistry(squadId);
        const ovr = get().getSquadOVR(squadId);
        set((s) => ({
          squads: {
            ...s.squads,
            [squadId]: {
              ...s.squads[squadId],
              chemistry,
              overallRating: ovr,
            },
          },
        }));
      },

      setFormation: (squadId, formation) => {
        const state = get();
        const squad = state.squads[squadId];
        if (!squad) return;

        set((s) => ({
          squads: {
            ...s.squads,
            [squadId]: { ...squad, formation },
          },
        }));
      },

      calculateChemistry: (squadId) => {
        const state = get();
        const squad = state.squads[squadId];
        if (!squad) return 0;

        const agentCardState = useAgentCardStore.getState();

        // Resolve all minted agents in slots
        const resolvedSlots: {
          slot: SquadSlot;
          agent: MintedAgent | null;
          def: ReturnType<typeof getAgentById> | null;
        }[] = squad.slots.map((slot) => {
          if (!slot.mintId) return { slot, agent: null, def: null };
          const agent = agentCardState.agents[slot.mintId] ?? null;
          const def = agent ? getAgentById(agent.cardId) ?? null : null;
          return { slot, agent, def };
        });

        const filledSlots = resolvedSlots.filter((r) => r.agent && r.def);
        if (filledSlots.length === 0) {
          // Reset all chemistry scores to 0
          const resetSlots = squad.slots.map((s) => ({ ...s, chemistryScore: 0 }));
          set((st) => ({
            squads: {
              ...st.squads,
              [squadId]: { ...st.squads[squadId], slots: resetSlots, chemistry: 0 },
            },
          }));
          return 0;
        }

        // Calculate per-slot chemistry scores
        const updatedSlots = resolvedSlots.map((resolved, idx) => {
          if (!resolved.agent || !resolved.def) {
            return { ...resolved.slot, chemistryScore: 0 };
          }

          let score = 0;

          // 1. Class matches preferred position: +3
          const preferred = POSITION_PREFERRED_CLASSES[resolved.slot.position];
          if (preferred.includes(resolved.def.class)) {
            score += 3;
          }

          // 2. Synergy tags match adjacent slots' agents: +2 per match
          //    Adjacent = previous and next slot in the lineup
          const adjacentIndices = [idx - 1, idx + 1].filter(
            (i) => i >= 0 && i < resolvedSlots.length
          );
          for (const adjIdx of adjacentIndices) {
            const adj = resolvedSlots[adjIdx];
            if (adj.agent && adj.def) {
              const myTags = new Set(resolved.def.synergyTags ?? []);
              const adjTags = adj.def.synergyTags ?? [];
              for (const tag of adjTags) {
                if (myTags.has(tag)) {
                  score += 2;
                  break; // +2 per adjacent match, not per tag
                }
              }
            }
          }

          // 3. Same academy origin (cardId prefix): +2
          for (const other of filledSlots) {
            if (other.agent!.mintId === resolved.agent.mintId) continue;
            if (getAcademyPrefix(other.agent!.cardId) === getAcademyPrefix(resolved.agent.cardId)) {
              score += 2;
              break; // Only count once
            }
          }

          // 4. Same specialCardType: +1
          if (resolved.agent.specialCardType) {
            for (const other of filledSlots) {
              if (other.agent!.mintId === resolved.agent.mintId) continue;
              if (other.agent!.specialCardType === resolved.agent.specialCardType) {
                score += 1;
                break;
              }
            }
          }

          // Cap at 10
          return { ...resolved.slot, chemistryScore: Math.min(10, score) };
        });

        // Average all slot scores, multiply by 10 for 0-100 scale
        const totalScore = updatedSlots.reduce((sum, s) => sum + s.chemistryScore, 0);
        const avgScore = totalScore / updatedSlots.length;
        const chemistry = Math.min(100, Math.round(avgScore * 10));

        set((s) => ({
          squads: {
            ...s.squads,
            [squadId]: { ...s.squads[squadId], slots: updatedSlots, chemistry },
          },
        }));

        return chemistry;
      },

      getSquadOVR: (squadId) => {
        const state = get();
        const squad = state.squads[squadId];
        if (!squad) return 0;

        const agentCardState = useAgentCardStore.getState();
        const ratings: number[] = [];

        for (const slot of squad.slots) {
          if (!slot.mintId) continue;
          const agent = agentCardState.agents[slot.mintId];
          if (agent) {
            ratings.push(agent.currentOverallRating);
          }
        }

        if (ratings.length === 0) return 0;
        return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
      },
    }),
    {
      name: 'aegis-squads-v1',
      partialize: (state) => ({
        squads: state.squads,
        activeSquadId: state.activeSquadId,
      }),
    }
  )
);
