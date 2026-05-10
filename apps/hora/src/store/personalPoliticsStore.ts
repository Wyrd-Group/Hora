/**
 * personalPoliticsStore.ts — Zustand store for the player's personal political career.
 * Career ladder: Citizen → City Council → Mayor → Senator → Governor → Cabinet → President
 */

import { createPersistedStore } from './createPersistedStore';
import { useEmpireStore } from './empireStore';
import { eventBridge } from '../lib/eventBridge';
import {
  POLITICAL_RANKS,
  CAMPAIGN_ACTIVITIES,
  POLITICAL_POLICIES,
  SCANDAL_TYPES,
} from '../data/personalPoliticsData';

// ── Types ──

interface ActiveCampaign {
  targetRank: number;
  startTick: number;
  duration: number;
  fundsSpent: number;
  approvalAtStart: number;
}

interface ActivePolicy {
  id: string;
  name: string;
  enactedTick: number;
  duration: number;        // 0 = permanent
  gameEffects: Record<string, number>;
}

interface ActiveScandal {
  id: string;
  name: string;
  startTick: number;
  recoveryTicks: number;
  approvalHit: number;
  canBeSpunPositive: boolean;
  spinCost: number;
  resolved: boolean;
}

interface ActivityCooldown {
  activityId: string;
  availableAtTick: number;
}

interface PersonalPoliticsState {
  currentRank: number;       // 0-6
  approval: number;          // 0-100
  politicalXp: number;
  campaignFund: number;      // dedicated political war chest
  activeCampaign: ActiveCampaign | null;
  activePolicies: ActivePolicy[];
  activeScandal: ActiveScandal | null;
  activityCooldowns: ActivityCooldown[];
  termsServed: number;
  totalDonationsReceived: number;
  electionHistory: { rank: number; won: boolean; tick: number }[];

  // Actions
  depositToCampaignFund: (amount: number) => boolean;
  launchCampaign: (targetRank: number, currentTick: number) => { success: boolean; message: string };
  resolveCampaign: (currentTick: number) => { won: boolean; message: string } | null;
  performActivity: (activityId: string, currentTick: number) => { success: boolean; message: string };
  enactPolicy: (policyId: string, currentTick: number) => { success: boolean; message: string };
  spinScandal: () => { success: boolean; message: string };
  triggerRandomScandal: (currentTick: number) => void;
  tickPolicies: (currentTick: number) => void;
  resign: () => void;
  reset: () => void;
}

const INITIAL_STATE = {
  currentRank: 0,
  approval: 50,
  politicalXp: 0,
  campaignFund: 0,
  activeCampaign: null as ActiveCampaign | null,
  activePolicies: [] as ActivePolicy[],
  activeScandal: null as ActiveScandal | null,
  activityCooldowns: [] as ActivityCooldown[],
  termsServed: 0,
  totalDonationsReceived: 0,
  electionHistory: [] as { rank: number; won: boolean; tick: number }[],
};

export const usePersonalPoliticsStore = createPersistedStore<PersonalPoliticsState>(
  'personal-politics',
  (set, get) => ({
    ...INITIAL_STATE,

    depositToCampaignFund: (amount: number) => {
      const empireState = useEmpireStore.getState();
      if (empireState.personalBalance < amount) return false;
      useEmpireStore.setState({ personalBalance: empireState.personalBalance - amount });
      set({ campaignFund: get().campaignFund + amount });
      return true;
    },

    launchCampaign: (targetRank: number, currentTick: number) => {
      const state = get();
      if (state.activeCampaign) return { success: false, message: 'Campaign already in progress.' };
      if (targetRank !== state.currentRank + 1) return { success: false, message: 'Can only run for the next rank.' };

      const rankData = POLITICAL_RANKS[targetRank];
      if (!rankData) return { success: false, message: 'Invalid rank.' };

      const reqs = rankData.requirements;
      const empireState = useEmpireStore.getState();

      if (state.approval < reqs.minApproval) return { success: false, message: `Need ${reqs.minApproval}% approval (have ${state.approval}%).` };
      if (empireState.followers < reqs.minFollowers) return { success: false, message: `Need ${reqs.minFollowers.toLocaleString()} followers.` };
      if (empireState.power < reqs.minPower) return { success: false, message: `Need ${reqs.minPower} power.` };
      if (state.campaignFund < reqs.campaignCost) return { success: false, message: `Need €${reqs.campaignCost.toLocaleString()} in campaign fund.` };

      set({
        activeCampaign: {
          targetRank,
          startTick: currentTick,
          duration: reqs.campaignDuration,
          fundsSpent: reqs.campaignCost,
          approvalAtStart: state.approval,
        },
        campaignFund: state.campaignFund - reqs.campaignCost,
      });

      eventBridge.emit('personalPolitics:campaignLaunched', { rank: targetRank, title: rankData.title });
      return { success: true, message: `Campaign for ${rankData.title} launched!` };
    },

    resolveCampaign: (currentTick: number) => {
      const state = get();
      if (!state.activeCampaign) return null;

      const { targetRank, startTick, duration, approvalAtStart: _approvalAtStart } = state.activeCampaign;
      if (currentTick - startTick < duration) return null; // Not done yet

      // Win chance based on current approval vs. requirement
      const rankData = POLITICAL_RANKS[targetRank];
      const approvalRatio = state.approval / Math.max(1, rankData.requirements.minApproval);
      const baseChance = Math.min(0.9, 0.4 + approvalRatio * 0.3);
      const won = Math.random() < baseChance;

      const entry = { rank: targetRank, won, tick: currentTick };

      if (won) {
        set({
          currentRank: targetRank,
          activeCampaign: null,
          termsServed: state.termsServed + 1,
          electionHistory: [...state.electionHistory, entry],
          politicalXp: state.politicalXp + targetRank * 100,
        });
        eventBridge.emit('personalPolitics:elected', { rank: targetRank, title: rankData.title });
        return { won: true, message: `Elected as ${rankData.title}!` };
      } else {
        set({
          activeCampaign: null,
          approval: Math.max(0, state.approval - 10),
          electionHistory: [...state.electionHistory, entry],
        });
        eventBridge.emit('personalPolitics:electionLost', { rank: targetRank, title: rankData.title });
        return { won: false, message: `Lost the election for ${rankData.title}. Approval dropped.` };
      }
    },

    performActivity: (activityId: string, currentTick: number) => {
      const state = get();
      const activity = CAMPAIGN_ACTIVITIES.find(a => a.id === activityId);
      if (!activity) return { success: false, message: 'Unknown activity.' };
      if (state.currentRank < activity.minRank) return { success: false, message: `Requires rank ${activity.minRank}+.` };

      // Check cooldown
      const cd = state.activityCooldowns.find(c => c.activityId === activityId);
      if (cd && currentTick < cd.availableAtTick) return { success: false, message: 'On cooldown.' };

      // Check funds (use campaign fund first, then personal balance)
      if (state.campaignFund < activity.cost) {
        const empireState = useEmpireStore.getState();
        if (empireState.personalBalance < activity.cost) return { success: false, message: 'Insufficient funds.' };
        useEmpireStore.setState({ personalBalance: empireState.personalBalance - activity.cost });
      } else {
        set({ campaignFund: state.campaignFund - activity.cost });
      }

      // Risk check
      const scandalRoll = Math.random();
      let scandalMessage = '';
      if (scandalRoll < activity.riskChance) {
        const newApproval = Math.max(0, state.approval + activity.approvalBoost - activity.scandalCost);
        set({
          approval: newApproval,
          politicalXp: state.politicalXp + activity.xpGain,
          activityCooldowns: [
            ...state.activityCooldowns.filter(c => c.activityId !== activityId),
            { activityId, availableAtTick: currentTick + activity.cooldownTicks },
          ],
        });
        scandalMessage = ' Minor scandal reduces impact!';
      } else {
        const newApproval = Math.min(100, state.approval + activity.approvalBoost);
        set({
          approval: newApproval,
          politicalXp: state.politicalXp + activity.xpGain,
          activityCooldowns: [
            ...state.activityCooldowns.filter(c => c.activityId !== activityId),
            { activityId, availableAtTick: currentTick + activity.cooldownTicks },
          ],
        });
      }

      // Update followers in empire store
      if (activity.followerBoost !== 0) {
        const empireState = useEmpireStore.getState();
        useEmpireStore.setState({ followers: Math.max(0, (empireState.followers ?? 0) + activity.followerBoost) });
      }

      return { success: true, message: `${activity.name} complete! +${activity.approvalBoost} approval.${scandalMessage}` };
    },

    enactPolicy: (policyId: string, currentTick: number) => {
      const state = get();
      const policy = POLITICAL_POLICIES.find(p => p.id === policyId);
      if (!policy) return { success: false, message: 'Unknown policy.' };
      if (state.currentRank < policy.minRank) return { success: false, message: `Requires rank ${policy.minRank}+.` };
      if (state.activePolicies.some(p => p.id === policyId)) return { success: false, message: 'Policy already active.' };

      // Pay cost from campaign fund or company balance
      const empireState = useEmpireStore.getState();
      if (empireState.companyBalance < policy.cost) return { success: false, message: 'Insufficient company funds.' };
      useEmpireStore.setState({ companyBalance: empireState.companyBalance - policy.cost });

      const newApproval = Math.max(0, Math.min(100, state.approval + policy.approvalChange));
      set({
        approval: newApproval,
        activePolicies: [...state.activePolicies, {
          id: policy.id,
          name: policy.name,
          enactedTick: currentTick,
          duration: policy.duration,
          gameEffects: policy.gameEffects,
        }],
        politicalXp: state.politicalXp + 50,
      });

      eventBridge.emit('personalPolitics:policyEnacted', { id: policy.id, name: policy.name });
      return { success: true, message: `${policy.name} enacted! Approval ${policy.approvalChange >= 0 ? '+' : ''}${policy.approvalChange}.` };
    },

    spinScandal: () => {
      const state = get();
      if (!state.activeScandal || !state.activeScandal.canBeSpunPositive) return { success: false, message: 'Cannot spin this scandal.' };

      const empireState = useEmpireStore.getState();
      if (empireState.personalBalance < state.activeScandal.spinCost) return { success: false, message: 'Insufficient funds to spin.' };

      useEmpireStore.setState({ personalBalance: empireState.personalBalance - state.activeScandal.spinCost });
      set({
        activeScandal: { ...state.activeScandal, resolved: true },
        approval: Math.min(100, state.approval + Math.floor(state.activeScandal.approvalHit * 0.5)),
      });
      return { success: true, message: 'Scandal spun successfully! Partial approval recovered.' };
    },

    triggerRandomScandal: (currentTick: number) => {
      const state = get();
      if (state.activeScandal && !state.activeScandal.resolved) return;
      if (state.currentRank === 0) return;

      const scandal = SCANDAL_TYPES[Math.floor(Math.random() * SCANDAL_TYPES.length)];
      set({
        activeScandal: {
          id: scandal.id,
          name: scandal.name,
          startTick: currentTick,
          recoveryTicks: scandal.recoveryTicks,
          approvalHit: scandal.approvalHit,
          canBeSpunPositive: scandal.canBeSpunPositive,
          spinCost: scandal.spinCost,
          resolved: false,
        },
        approval: Math.max(0, state.approval - scandal.approvalHit),
      });

      const empireState = useEmpireStore.getState();
      useEmpireStore.setState({ heat: Math.min(100, (empireState.heat ?? 0) + scandal.heatGain) });

      eventBridge.emit('personalPolitics:scandal', { id: scandal.id, name: scandal.name });
    },

    tickPolicies: (currentTick: number) => {
      const state = get();
      const still: ActivePolicy[] = [];
      for (const p of state.activePolicies) {
        if (p.duration === 0) { still.push(p); continue; } // permanent
        if (currentTick - p.enactedTick < p.duration) { still.push(p); continue; }
        // Expired
        eventBridge.emit('personalPolitics:policyExpired', { id: p.id, name: p.name });
      }
      if (still.length !== state.activePolicies.length) {
        set({ activePolicies: still });
      }

      // Check scandal recovery
      if (state.activeScandal && !state.activeScandal.resolved) {
        if (currentTick - state.activeScandal.startTick >= state.activeScandal.recoveryTicks) {
          set({ activeScandal: { ...state.activeScandal, resolved: true } });
        }
      }
    },

    resign: () => {
      const state = get();
      set({
        currentRank: 0,
        approval: Math.max(20, state.approval - 20),
        activePolicies: [],
        activeCampaign: null,
      });
      eventBridge.emit('personalPolitics:resigned', {});
    },

    reset: () => set(INITIAL_STATE),
  }),
);
