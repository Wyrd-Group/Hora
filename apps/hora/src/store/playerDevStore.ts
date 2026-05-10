/**
 * playerDevStore.ts — Bug reports, innovation tracking, and rewards.
 *
 * Manages the Player-Dev Program:
 * - Bug reports via Athena (severity classification, reward tiers)
 * - Innovation paths (Athena-created gameplay paths)
 * - Innovation detection (auto-detected player innovations)
 * - Reward calculations based on severity/quality/impact
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ── Types ──

export type ReportType = 'bug_report' | 'innovation' | 'feature_request';
export type Severity = 'cosmetic' | 'minor' | 'major' | 'critical';
export type ReportStatus = 'submitted' | 'verified' | 'in_progress' | 'resolved' | 'rewarded' | 'rejected';
export type InnovationType = 'new_sector_hub' | 'trade_route_pioneer' | 'government_type' | 'market_strategy' | 'gameplay_path' | 'regulation_change' | 'political_move';
export type RewardTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface DevReport {
  id: string;
  reporter_id: string;
  type: ReportType;
  title: string;
  description: string | null;
  steps_to_reproduce: string | null;
  athena_analysis: Record<string, any>;
  severity: Severity | null;
  status: ReportStatus;
  reward_xp: number;
  reward_ap: number;
  reward_money: number;
  reward_trophies: string[];
  quality_score: number;
  created_at: string;
  resolved_at: string | null;
}

export interface InnovationPath {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  trigger_conditions: Record<string, any>;
  actions: Record<string, any>[];
  outcomes: Record<string, any>;
  success_probability: number;
  category: string;
  legality: 'legal' | 'gray_area' | 'illegal';
  times_used: number;
  success_rate: number;
  status: 'proposed' | 'approved' | 'active' | 'deprecated';
  created_at: string;
}

export interface PlayerInnovation {
  id: string;
  creator_id: string;
  innovation_type: InnovationType;
  description: string | null;
  impact_score: number;
  follower_count: number;
  reward_tier: RewardTier | null;
  status: 'detected' | 'verified' | 'rewarded';
  created_at: string;
}

// ── Reward Tables ──

export const BUG_REWARDS: Record<Severity, { xp: number; ap: number; money: number; trophy: string | null }> = {
  cosmetic: { xp: 50, ap: 25, money: 10_000, trophy: null },
  minor:    { xp: 200, ap: 100, money: 50_000, trophy: 'Bug Spotter' },
  major:    { xp: 500, ap: 300, money: 200_000, trophy: 'Debug Hero' },
  critical: { xp: 1500, ap: 1000, money: 500_000, trophy: 'System Savior' },
};

export const INNOVATION_REWARDS: Record<RewardTier, { xp: number; ap: number; money: number; trophy: string; minFollowers: number }> = {
  bronze:   { xp: 300, ap: 150, money: 100_000, trophy: 'Trailblazer', minFollowers: 70_000 },
  silver:   { xp: 1000, ap: 500, money: 500_000, trophy: 'Innovator', minFollowers: 200_000 },
  gold:     { xp: 3000, ap: 2000, money: 2_000_000, trophy: 'Visionary', minFollowers: 700_000 },
  platinum: { xp: 10000, ap: 5000, money: 10_000_000, trophy: 'Legend', minFollowers: 2_000_000 },
  diamond:  { xp: 25000, ap: 10000, money: 50_000_000, trophy: 'Immortal', minFollowers: 5_000_000 },
};

// ── Store ──

interface PlayerDevState {
  reports: DevReport[];
  innovations: PlayerInnovation[];
  paths: InnovationPath[];
  totalRewards: { xp: number; ap: number; money: number; trophies: string[] };
  isLoading: boolean;

  loadMyReports: () => Promise<void>;
  loadMyInnovations: () => Promise<void>;
  loadActivePaths: () => Promise<void>;
  submitBugReport: (report: {
    title: string;
    description: string;
    steps_to_reproduce?: string;
    severity: Severity;
  }) => Promise<{ success: boolean; error?: string }>;
  submitInnovation: (innovation: {
    name: string;
    description: string;
    category: string;
    trigger_conditions: Record<string, any>;
    actions: Record<string, any>[];
    outcomes: Record<string, any>;
  }) => Promise<{ success: boolean; error?: string }>;

  // Computed
  getRewardTier: (followerCount: number) => RewardTier | null;
  calculateBugReward: (severity: Severity, qualityScore: number) => { xp: number; ap: number; money: number };
}

export const usePlayerDevStore = create<PlayerDevState>()((set, get) => ({
  reports: [],
  innovations: [],
  paths: [],
  totalRewards: { xp: 0, ap: 0, money: 0, trophies: [] },
  isLoading: false,

  loadMyReports: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    set({ isLoading: true });
    const { data } = await supabase
      .from('player_dev_reports')
      .select('*')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false });
    if (data) {
      const reports = data as DevReport[];
      const totalRewards = reports.reduce(
        (acc, r) => ({
          xp: acc.xp + r.reward_xp,
          ap: acc.ap + r.reward_ap,
          money: acc.money + r.reward_money,
          trophies: [...acc.trophies, ...r.reward_trophies],
        }),
        { xp: 0, ap: 0, money: 0, trophies: [] as string[] },
      );
      set({ reports, totalRewards });
    }
    set({ isLoading: false });
  },

  loadMyInnovations: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('player_innovations')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });
    if (data) set({ innovations: data as PlayerInnovation[] });
  },

  loadActivePaths: async () => {
    const { data } = await supabase
      .from('innovation_paths')
      .select('*')
      .eq('status', 'active')
      .order('times_used', { ascending: false })
      .limit(50);
    if (data) set({ paths: data as InnovationPath[] });
  },

  submitBugReport: async (report) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('player_dev_reports').insert({
      reporter_id: user.id,
      type: 'bug_report',
      title: report.title,
      description: report.description,
      steps_to_reproduce: report.steps_to_reproduce,
      severity: report.severity,
    });

    if (error) return { success: false, error: error.message };
    await get().loadMyReports();
    return { success: true };
  },

  submitInnovation: async (innovation) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('innovation_paths').insert({
      creator_id: user.id,
      name: innovation.name,
      description: innovation.description,
      category: innovation.category,
      trigger_conditions: innovation.trigger_conditions,
      actions: innovation.actions,
      outcomes: innovation.outcomes,
    });

    if (error) return { success: false, error: error.message };
    await get().loadActivePaths();
    return { success: true };
  },

  getRewardTier: (followerCount: number): RewardTier | null => {
    if (followerCount >= 5_000_000) return 'diamond';
    if (followerCount >= 2_000_000) return 'platinum';
    if (followerCount >= 700_000) return 'gold';
    if (followerCount >= 200_000) return 'silver';
    if (followerCount >= 70_000) return 'bronze';
    return null;
  },

  calculateBugReward: (severity: Severity, qualityScore: number) => {
    const base = BUG_REWARDS[severity];
    // Quality multiplier: 0.5x (vague) → 1.0x (clear) → 2.0x (includes fix)
    const multiplier = 0.5 + qualityScore * 1.5;
    return {
      xp: Math.round(base.xp * multiplier),
      ap: Math.round(base.ap * multiplier),
      money: Math.round(base.money * multiplier),
    };
  },
}));
