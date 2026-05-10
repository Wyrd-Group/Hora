/**
 * worldPoliticsStore.ts — Living World multiplayer political system.
 *
 * Manages:
 * - Country data with real-world regulations
 * - Player-formed governments
 * - Lobbying campaigns (competitive)
 * - Elections and referendums
 * - Coup/takeover mechanics
 *
 * Separate from politicsStore.ts (single-player political XP tier system).
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ── Types ──

export interface CountryRegulations {
  corporate_tax_rate: number;
  income_tax_rate: number;
  vat_rate: number;
  sector_regulations: Record<string, 'strict' | 'moderate' | 'light'>;
  labor_laws: 'strict' | 'moderate' | 'light';
  environmental_rules: 'strict' | 'moderate' | 'light';
  trade_agreements: string[];
  sanctions: string[];
  custom_regulations: Array<{ name: string; effect: string; created_by: string }>;
}

export interface Country {
  id: string;
  name: string;
  leader_id: string | null;
  government_type: string;
  territory_h3: string[];
  regulations: CountryRegulations;
  treasury: number;
  approval_rating: number;
  military_strength: number;
  stability: number;
  gdp: number;
  population: number;
  status: 'sovereign' | 'puppet' | 'contested' | 'failed_state';
  puppet_master_id: string | null;
}

export interface WorldGovernment {
  id: string;
  country_id: string;
  leader_id: string;
  type: 'democracy' | 'autocracy' | 'council' | 'corporation';
  cabinet: Array<{ user_id: string; position: string }>;
  treasury: number;
  status: 'active' | 'toppled' | 'dissolved';
  created_at: string;
}

export interface LobbyCampaign {
  id: string;
  country_id: string;
  regulation_key: string;
  proposed_value: any;
  proposer_id: string;
  for_spending: number;
  against_spending: number;
  public_opinion: number;
  ticks_remaining: number;
  status: 'active' | 'passed' | 'failed' | 'expired';
}

export interface Election {
  id: string;
  country_id: string;
  candidates: Array<{ user_id: string; platform: string; spending: number; votes: number }>;
  ticks_remaining: number;
  status: 'campaigning' | 'voting' | 'completed';
  winner_id: string | null;
}

export interface Referendum {
  id: string;
  country_id: string | null;
  title: string;
  description: string | null;
  proposer_id: string;
  signatures: number;
  signatures_required: number;
  votes_for: number;
  votes_against: number;
  status: 'gathering_signatures' | 'voting' | 'passed' | 'failed' | 'expired';
}

// ── Store ──

interface WorldPoliticsState {
  countries: Record<string, Country>;
  governments: Record<string, WorldGovernment>;
  lobbyCampaigns: LobbyCampaign[];
  elections: Election[];
  referendums: Referendum[];
  selectedCountryId: string | null;
  isLoading: boolean;

  loadCountries: () => Promise<void>;
  loadGovernments: () => Promise<void>;
  loadActiveCampaigns: (countryId: string) => Promise<void>;
  loadElections: (countryId: string) => Promise<void>;
  loadReferendums: () => Promise<void>;
  selectCountry: (id: string | null) => void;
  formGovernment: (countryId: string, type: WorldGovernment['type']) => Promise<{ success: boolean; error?: string }>;
  attemptCoup: (countryId: string, militaryStrength: number) => Promise<{ success: boolean; roll?: number; error?: string }>;
  lobbyFor: (campaignId: string, amount: number, side: 'for' | 'against') => Promise<{ success: boolean; error?: string }>;
  proposeLobbying: (countryId: string, regulationKey: string, proposedValue: any) => Promise<{ success: boolean; error?: string }>;
  proposeReferendum: (countryId: string | null, title: string, description: string) => Promise<{ success: boolean; error?: string }>;
  signReferendum: (referendumId: string) => Promise<{ success: boolean; error?: string }>;
  voteReferendum: (referendumId: string, vote: 'for' | 'against') => Promise<{ success: boolean; error?: string }>;
  getCountry: (id: string) => Country | null;
  getCountryGovernment: (countryId: string) => WorldGovernment | null;
  getTaxRate: (countryId: string) => number;
}

export const useWorldPoliticsStore = create<WorldPoliticsState>()((set, get) => ({
  countries: {},
  governments: {},
  lobbyCampaigns: [],
  elections: [],
  referendums: [],
  selectedCountryId: null,
  isLoading: false,

  loadCountries: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase.from('countries').select('*');
    if (!error && data) {
      const map: Record<string, Country> = {};
      for (const row of data) map[row.id] = row as Country;
      set({ countries: map });
    }
    set({ isLoading: false });
  },

  loadGovernments: async () => {
    const { data } = await supabase
      .from('world_governments')
      .select('*')
      .eq('status', 'active');
    if (data) {
      const map: Record<string, WorldGovernment> = {};
      for (const row of data) map[row.id] = row as WorldGovernment;
      set({ governments: map });
    }
  },

  loadActiveCampaigns: async (countryId) => {
    const { data } = await supabase
      .from('lobbying_campaigns')
      .select('*')
      .eq('country_id', countryId)
      .eq('status', 'active');
    if (data) set({ lobbyCampaigns: data as LobbyCampaign[] });
  },

  loadElections: async (countryId) => {
    const { data } = await supabase
      .from('elections')
      .select('*')
      .eq('country_id', countryId)
      .neq('status', 'completed')
      .order('created_at', { ascending: false });
    if (data) set({ elections: data as Election[] });
  },

  loadReferendums: async () => {
    const { data } = await supabase
      .from('referendums')
      .select('*')
      .in('status', ['gathering_signatures', 'voting'])
      .order('created_at', { ascending: false });
    if (data) set({ referendums: data as Referendum[] });
  },

  selectCountry: (id) => set({ selectedCountryId: id }),

  formGovernment: async (countryId, type) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('world_governments')
      .insert({ country_id: countryId, leader_id: user.id, type, cabinet: [{ user_id: user.id, position: 'Leader' }] })
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    set(s => ({ governments: { ...s.governments, [data.id]: data as WorldGovernment } }));
    return { success: true };
  },

  attemptCoup: async (countryId, militaryStrength) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    const { data, error } = await supabase.rpc('attempt_coup', {
      p_actor_id: user.id,
      p_country_id: countryId,
      p_military_strength: militaryStrength,
    });
    if (error) return { success: false, error: error.message };
    if (data?.success) await get().loadCountries();
    return { success: data?.success || false, roll: data?.roll };
  },

  lobbyFor: async (campaignId, amount, side) => {
    const { error } = await supabase.rpc('lobby_for', {
      p_campaign_id: campaignId,
      p_amount: amount,
      p_side: side,
    });
    if (error) return { success: false, error: error.message };
    const campaign = get().lobbyCampaigns.find(c => c.id === campaignId);
    if (campaign) await get().loadActiveCampaigns(campaign.country_id);
    return { success: true };
  },

  proposeLobbying: async (countryId, regulationKey, proposedValue) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    const { error } = await supabase.from('lobbying_campaigns').insert({
      country_id: countryId,
      regulation_key: regulationKey,
      proposed_value: proposedValue,
      proposer_id: user.id,
    });
    if (error) return { success: false, error: error.message };
    await get().loadActiveCampaigns(countryId);
    return { success: true };
  },

  proposeReferendum: async (countryId, title, description) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    const { error } = await supabase.from('referendums').insert({
      country_id: countryId,
      title,
      description,
      proposer_id: user.id,
    });
    if (error) return { success: false, error: error.message };
    await get().loadReferendums();
    return { success: true };
  },

  signReferendum: async (referendumId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    const { error } = await supabase.rpc('sign_referendum', {
      p_referendum_id: referendumId,
      p_user_id: user.id,
    });
    if (error) return { success: false, error: error.message };
    await get().loadReferendums();
    return { success: true };
  },

  voteReferendum: async (referendumId, vote) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    const { error } = await supabase.rpc('vote_referendum', {
      p_referendum_id: referendumId,
      p_user_id: user.id,
      p_vote: vote,
    });
    if (error) return { success: false, error: error.message };
    await get().loadReferendums();
    return { success: true };
  },

  getCountry: (id) => get().countries[id] || null,

  getCountryGovernment: (countryId) =>
    Object.values(get().governments).find(g => g.country_id === countryId && g.status === 'active') || null,

  getTaxRate: (countryId) => {
    const country = get().countries[countryId];
    return country?.regulations?.corporate_tax_rate ?? 0.25;
  },
}));
