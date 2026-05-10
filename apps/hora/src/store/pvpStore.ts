import { createPersistedStore } from './createPersistedStore';
import type { TakeoverBid } from '../types/social';

// ── NPC Targets ──

export interface NPCTarget {
  id: string;
  name: string;
  defensePower: number;
  netWorth: number;
  campus: string;
  level: number;
  isAI: true;
}

export const NPC_TARGETS: NPCTarget[] = [
  { id: 'ai-001', name: 'Apex Capital Corp',      defensePower: 62, netWorth: 1_200_000, campus: 'London',    level: 8,  isAI: true },
  { id: 'ai-002', name: 'Meridian Holdings',       defensePower: 71, netWorth: 1_800_000, campus: 'Berlin',    level: 12, isAI: true },
  { id: 'ai-003', name: 'Sterling Ventures',       defensePower: 48, netWorth:   980_000, campus: 'Madrid',    level: 6,  isAI: true },
  { id: 'ai-004', name: 'Zenith Industries',       defensePower: 85, netWorth: 2_400_000, campus: 'Paris',     level: 15, isAI: true },
  { id: 'ai-005', name: 'Horizon Group Ltd',       defensePower: 55, netWorth: 1_100_000, campus: 'Turin',     level: 9,  isAI: true },
  { id: 'ai-006', name: 'Vanguard Enterprises',    defensePower: 73, netWorth: 2_100_000, campus: 'New York',  level: 14, isAI: true },
  { id: 'ai-007', name: 'Obsidian Global',         defensePower: 40, netWorth:   750_000, campus: 'Tokyo',     level: 5,  isAI: true },
  { id: 'ai-008', name: 'Atlas Financial Group',   defensePower: 78, netWorth: 3_000_000, campus: 'Zurich',    level: 16, isAI: true },
  { id: 'ai-009', name: 'Drake & Wolfe Partners',  defensePower: 58, netWorth: 1_350_000, campus: 'Singapore', level: 10, isAI: true },
  { id: 'ai-010', name: 'Nova Capital Management', defensePower: 65, netWorth: 1_600_000, campus: 'Dubai',     level: 11, isAI: true },
  { id: 'ai-011', name: 'Ironclad Holdings',       defensePower: 90, netWorth: 4_500_000, campus: 'Geneva',    level: 18, isAI: true },
  { id: 'ai-012', name: 'Cipher Dynamics',         defensePower: 35, netWorth:   600_000, campus: 'Lisbon',    level: 4,  isAI: true },
];

// ── Battle history entry ──

export interface BattleRecord {
  opponentName: string;
  won: boolean;
  eloChange: number;
  date: number;
}

// ── ELO rank helpers ──

export function getEloRank(elo: number): string {
  if (elo >= 2000) return 'Grandmaster';
  if (elo >= 1600) return 'Master';
  if (elo >= 1300) return 'Expert';
  if (elo >= 1000) return 'Intermediate';
  if (elo >= 700)  return 'Novice';
  return 'Unranked';
}

// ── Store ──

interface PvPState {
  eloRating: number;
  activeBid: TakeoverBid | null;
  defenseRating: number;
  battleHistory: BattleRecord[];
  wins: number;
  losses: number;
  poisonPillActive: boolean;

  // Actions
  launchTakeover: (
    target: { id: string; name: string; defensePower: number },
    bidAmount: number,
    deductBalance: (amount: number) => boolean,
  ) => boolean;
  resolveTakeover: (addBalance: (amount: number) => void) => void;
  calculateAttackPower: (netWorth: number, followers: number, politicalTier: number) => number;
  updateDefense: (amount: number, deductBalance: (amount: number) => boolean) => boolean;
  activatePoisonPill: (deductBalance: (amount: number) => boolean) => boolean;
  getWinRate: () => number;
}

export const usePvPStore = createPersistedStore<PvPState>(
  'pvp',
  (set, get) => ({
    eloRating: 1000,
    activeBid: null,
    defenseRating: 50,
    battleHistory: [],
    wins: 0,
    losses: 0,
    poisonPillActive: false,

    launchTakeover(target, bidAmount, deductBalance) {
      const state = get();
      if (state.activeBid && !state.activeBid.resolved) return false;

      if (!deductBalance(bidAmount)) return false;

      const attackPower = state.calculateAttackPower(0, 0, 0); // caller should use real values
      const bid: TakeoverBid = {
        targetId: target.id,
        targetName: target.name,
        bidAmount,
        attackPower: attackPower + Math.floor(Math.random() * 30),
        defensePower: target.defensePower + Math.floor(Math.random() * 20),
        startedAt: Date.now(),
        resolvesAt: Date.now() + 10_000, // resolves in 10 seconds for game feel
        resolved: false,
      };

      set({ activeBid: bid });
      return true;
    },

    resolveTakeover(addBalance) {
      const state = get();
      if (!state.activeBid || state.activeBid.resolved) return;

      const bid = state.activeBid;
      const won = bid.attackPower > bid.defensePower;
      const eloK = 32;
      const expectedScore = 1 / (1 + Math.pow(10, (bid.defensePower - bid.attackPower) / 400));
      const actualScore = won ? 1 : 0;
      const eloChange = Math.round(eloK * (actualScore - expectedScore));

      if (won) {
        // Return escrow + 20% premium
        const premium = Math.round(bid.bidAmount * 0.2);
        addBalance(bid.bidAmount + premium);
      }
      // If lost, escrow is already deducted

      const record: BattleRecord = {
        opponentName: bid.targetName,
        won,
        eloChange,
        date: Date.now(),
      };

      set({
        activeBid: { ...bid, resolved: true, won },
        eloRating: Math.max(0, state.eloRating + eloChange),
        battleHistory: [record, ...state.battleHistory].slice(0, 50),
        wins: state.wins + (won ? 1 : 0),
        losses: state.losses + (won ? 0 : 1),
      });
    },

    calculateAttackPower(netWorth, followers, politicalTier) {
      // Base power from net worth (0-50 scale)
      const nwPower = Math.min(50, Math.floor(netWorth / 100_000));
      // Follower bonus (0-20)
      const followerPower = Math.min(20, Math.floor(followers / 500));
      // Political tier bonus (0-20)
      const politicalPower = politicalTier * 5;
      // ELO bonus (0-10)
      const eloPower = Math.min(10, Math.floor((get().eloRating - 800) / 100));
      return Math.max(10, nwPower + followerPower + politicalPower + eloPower);
    },

    updateDefense(amount, deductBalance) {
      if (!deductBalance(amount)) return false;
      const bonus = Math.min(20, Math.floor(amount / 10_000));
      set(s => ({
        defenseRating: Math.min(100, s.defenseRating + bonus),
      }));
      return true;
    },

    activatePoisonPill(deductBalance) {
      const cost = 50_000;
      if (!deductBalance(cost)) return false;
      set({ poisonPillActive: true });
      return true;
    },

    getWinRate() {
      const state = get();
      const total = state.wins + state.losses;
      if (total === 0) return 0;
      return Math.round((state.wins / total) * 100);
    },
  }),
);
