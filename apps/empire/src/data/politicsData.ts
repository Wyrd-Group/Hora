/**
 * politicsData.ts — Political influence system data ported from MVP politics.js
 * 4-tier system: Citizen -> Donor -> Bundler -> Lobbyist -> Kingmaker
 */

import type { RegulatoryEvent, PoliticalTier } from '../types/social';

// ── Political Tier Names ──
export const POLITICAL_TIER_NAMES: Record<PoliticalTier, string> = {
  0: 'Citizen',
  1: 'Donor',
  2: 'Bundler',
  3: 'Lobbyist',
  4: 'Kingmaker',
};

// ── Political XP thresholds for tier upgrades ──
export const POLITICAL_TIER_THRESHOLDS: Record<PoliticalTier, number> = {
  0: 0,
  1: 100,
  2: 500,
  3: 2000,
  4: 10000,
};

// ── Regulatory Events (Tier 1+) ──
export const REGULATORY_EVENTS: RegulatoryEvent[] = [
  {
    id: 'crypto-tax',
    title: 'Crypto Tax Proposal',
    description: 'Parliament proposes 5% tax on crypto trading gains.',
    options: [
      {
        label: 'Oppose publicly',
        effect: { power: 2, balance: -5000 },
      },
      {
        label: 'Support (hurt competitors)',
        effect: { power: 1, governance: 1 },
      },
      {
        label: 'Stay neutral',
        effect: {},
      },
    ],
  },
  {
    id: 'data-privacy',
    title: 'New Data Privacy Rules',
    description: 'Tightening privacy requirements for financial platforms.',
    options: [
      {
        label: 'Lobby for exemptions',
        effect: { power: 3, balance: -10000 },
      },
      {
        label: 'Comply early',
        effect: { impact: 5, governance: 3, balance: -5000 },
      },
      {
        label: 'Wait and see',
        effect: {},
      },
    ],
  },
  {
    id: 'esg-mandate',
    title: 'ESG Reporting Mandate',
    description: 'New rules require ESG disclosures for all companies above $1M net worth.',
    options: [
      {
        label: 'Champion ESG',
        effect: { impact: 5, governance: 2, balance: -20000 },
      },
      {
        label: 'Greenwash compliance',
        effect: { impact: 1, governance: -2, balance: -3000 },
      },
      {
        label: 'Oppose regulations',
        effect: { power: 2, balance: -8000 },
      },
    ],
  },
  {
    id: 'market-reform',
    title: 'Market Structure Reform',
    description: 'Regulators propose new rules on trading transparency and order flow.',
    options: [
      {
        label: 'Support transparency',
        effect: { governance: 3, impact: 2 },
      },
      {
        label: 'Lobby against',
        effect: { power: 3, balance: -15000 },
      },
      {
        label: 'Ignore',
        effect: {},
      },
    ],
  },
  {
    id: 'labor-law',
    title: 'New Labor Protection Laws',
    description: 'Government proposes stricter worker protections and minimum benefits.',
    options: [
      {
        label: 'Embrace early',
        effect: { impact: 4, governance: 2, balance: -8000 },
      },
      {
        label: 'Lobby for delay',
        effect: { power: 2, balance: -12000 },
      },
      {
        label: 'Comply minimally',
        effect: { governance: 1, balance: -2000 },
      },
    ],
  },
];

// ── Lobbying Projects (Tier 2+) ──
export interface LobbyingProjectData {
  id: string;
  name: string;
  description: string;
  cost: number;
  duration: number; // ticks to complete (1 tick = 1 game minute)
  successRate: number;
  effect: { axis: string; value: number };
  effectDescription: string;
}

export const LOBBYING_PROJECTS: LobbyingProjectData[] = [
  {
    id: 'tax-reform',
    name: 'Tax Reform Lobby',
    description: 'Push for favorable corporate tax legislation through targeted lobbying campaigns.',
    cost: 100000,
    duration: 259_200,   // ~6 game months
    successRate: 0.55,
    effect: { axis: 'power', value: 8 },
    effectDescription: 'Campus tax rate -3% permanent',
  },
  {
    id: 'deregulation',
    name: 'Deregulation Campaign',
    description: 'Fund a campaign to reduce regulatory burden on financial services.',
    cost: 75000,
    duration: 172_800,   // ~4 game months
    successRate: 0.60,
    effect: { axis: 'power', value: 5 },
    effectDescription: 'Trading fees -20% campus-wide 3mo',
  },
  {
    id: 'standards-board',
    name: 'Industry Standards Board',
    description: 'Establish an industry standards board that aligns regulations with your business model.',
    cost: 50000,
    duration: 129_600,   // ~3 game months
    successRate: 0.65,
    effect: { axis: 'power', value: 4 },
    effectDescription: 'Certification benefits your structure type',
  },
  {
    id: 'zoning',
    name: 'Zoning Amendment',
    description: 'Lobby local government for favorable zoning changes to expand operations.',
    cost: 30000,
    duration: 86_400,    // ~2 game months
    successRate: 0.70,
    effect: { axis: 'power', value: 3 },
    effectDescription: 'Unlock premium venue slot',
  },
];

// ── Super PAC Goals (Tier 3+) ──
export interface SuperPacGoal {
  id: string;
  label: string;
  target: number; // funding target
  effectDescription: string;
  axes: Record<string, number>;
}

export const SUPER_PAC_SETUP_COST = 500000;

export const SUPER_PAC_GOALS: SuperPacGoal[] = [
  {
    id: 'lower-tax',
    label: 'Lower Corporate Tax',
    target: 500000,
    effectDescription: 'Campus tax -2% permanent',
    axes: { power: 15 },
  },
  {
    id: 'education-fund',
    label: 'Subsidise Education',
    target: 200000,
    effectDescription: 'Campus 2x XP for 2 months',
    axes: { power: 8, impact: 15 },
  },
  {
    id: 'protectionism',
    label: 'Restrict Competition',
    target: 300000,
    effectDescription: 'AI competitors weaker 3mo (trading vol -10%)',
    axes: { power: 10 },
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure Bill',
    target: 400000,
    effectDescription: 'All venue incomes +10% campus permanent',
    axes: { power: 12 },
  },
];

// ── Regulatory Capture Actions (Tier 4) ──
export interface CaptureAction {
  id: string;
  label: string;
  cost: number;
  durationDays: number;
  effectDescription: string;
  axes: Record<string, number>;
}

export const CAPTURE_ACTIONS: CaptureAction[] = [
  {
    id: 'industry-advisor',
    label: 'Appoint Industry Advisor',
    cost: 1000000,
    durationDays: 180,
    effectDescription: 'Pre-screen all regulations for 6 months',
    axes: { power: 15 },
  },
  {
    id: 'exclusive-license',
    label: 'Exclusive License',
    cost: 2000000,
    durationDays: 90,
    effectDescription: 'First access to new asset/venue 3 months',
    axes: { power: 12 },
  },
  {
    id: 'bailout-insurance',
    label: 'Bailout Insurance',
    cost: 500000,
    durationDays: 365,
    effectDescription: 'Government rescue if bankruptcy (moral hazard)',
    axes: { power: 8 },
  },
];

// ── Campaign Donations (all tiers) ──
export interface CampaignDonation {
  id: string;
  name: string;
  party: string;
  position: string; // e.g. "Senator", "Governor", "EU Commissioner"
  donationTiers: { amount: number; reward: string; xp: number }[];
  alignment: 'business-friendly' | 'populist' | 'centrist';
}

export const CAMPAIGN_DONATIONS: CampaignDonation[] = [
  {
    id: 'senator-hartwell',
    name: 'Sen. Victoria Hartwell',
    party: 'Business Alliance',
    position: 'Senator (Finance Committee)',
    alignment: 'business-friendly',
    donationTiers: [
      { amount: 25_000, reward: 'Tax audit immunity 6 months', xp: 25 },
      { amount: 100_000, reward: 'Favorable regulatory interpretation', xp: 80 },
      { amount: 500_000, reward: 'Legislation shaped to your sector', xp: 250 },
    ],
  },
  {
    id: 'gov-marchetti',
    name: 'Gov. Eduardo Marchetti',
    party: 'Reform Coalition',
    position: 'Governor',
    alignment: 'centrist',
    donationTiers: [
      { amount: 50_000, reward: 'State contracts priority', xp: 40 },
      { amount: 200_000, reward: 'Infrastructure spending in your region', xp: 120 },
      { amount: 750_000, reward: 'Gubernatorial endorsement of your brand', xp: 300 },
    ],
  },
  {
    id: 'mp-okafor',
    name: 'MP Aisha Okafor',
    party: 'Progressive Front',
    position: 'Parliament (Trade Committee)',
    alignment: 'populist',
    donationTiers: [
      { amount: 10_000, reward: 'Public image boost (+5 followers)', xp: 15 },
      { amount: 75_000, reward: 'Trade barrier relaxation', xp: 60 },
      { amount: 300_000, reward: 'Import/export tax exemption 1 year', xp: 200 },
    ],
  },
  {
    id: 'comm-dubois',
    name: 'Cmsr. Henri Dubois',
    party: 'European Democratic Union',
    position: 'EU Commissioner (Competition)',
    alignment: 'business-friendly',
    donationTiers: [
      { amount: 100_000, reward: 'Merger approval fast-track', xp: 70 },
      { amount: 500_000, reward: 'Antitrust investigation deflection', xp: 200 },
      { amount: 2_000_000, reward: 'Market monopoly protection 2 years', xp: 500 },
    ],
  },
];

// ── Media Operations ──
export interface MediaOperation {
  id: string;
  name: string;
  description: string;
  cost: number;
  duration: number; // ticks (1 tick = 1 game minute)
  cooldown: number; // ticks before can be used again
  effects: { followers?: number; power?: number; heat?: number; governance?: number };
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  minTier: PoliticalTier;
}

export const MEDIA_OPERATIONS: MediaOperation[] = [
  {
    id: 'press-release',
    name: 'Corporate Press Release',
    description: 'Issue a carefully crafted press release to shape public narrative.',
    cost: 5_000,
    duration: 4_320,
    cooldown: 21_600,
    effects: { followers: 50, power: 1 },
    riskLevel: 'low',
    minTier: 0,
  },
  {
    id: 'sponsored-content',
    name: 'Sponsored News Content',
    description: 'Pay major outlets to publish favorable articles about your company.',
    cost: 50_000,
    duration: 14_400,
    cooldown: 43_200,
    effects: { followers: 200, power: 3 },
    riskLevel: 'low',
    minTier: 1,
  },
  {
    id: 'astroturf-campaign',
    name: 'Astroturf Campaign',
    description: 'Create fake grassroots support for your corporate agenda on social media.',
    cost: 150_000,
    duration: 43_200,
    cooldown: 86_400,
    effects: { followers: 500, power: 5, heat: 5 },
    riskLevel: 'medium',
    minTier: 2,
  },
  {
    id: 'suppress-story',
    name: 'Kill a Story',
    description: 'Use media contacts to suppress an unfavorable news story before publication.',
    cost: 250_000,
    duration: 2_880,
    cooldown: 43_200,
    effects: { heat: -10, governance: -2 },
    riskLevel: 'high',
    minTier: 2,
  },
  {
    id: 'opposition-research',
    name: 'Opposition Research',
    description: 'Dig up and leak damaging information about a business rival to the press.',
    cost: 400_000,
    duration: 86_400,
    cooldown: 129_600,
    effects: { power: 8, heat: 10 },
    riskLevel: 'high',
    minTier: 3,
  },
  {
    id: 'media-acquisition',
    name: 'Media Outlet Acquisition',
    description: 'Acquire a controlling stake in a media outlet for permanent narrative control.',
    cost: 5_000_000,
    duration: 259_200,
    cooldown: 525_600,
    effects: { followers: 2000, power: 15 },
    riskLevel: 'medium',
    minTier: 3,
  },
  {
    id: 'deepfake-scandal',
    name: 'Deepfake Scandal',
    description: 'Deploy AI-generated media to discredit a political opponent or competitor.',
    cost: 1_000_000,
    duration: 14_400,
    cooldown: 259_200,
    effects: { power: 12, heat: 25, governance: -5 },
    riskLevel: 'extreme',
    minTier: 4,
  },
  {
    id: 'election-disinfo',
    name: 'Election Disinformation',
    description: 'Flood social media with targeted disinformation to influence an election outcome.',
    cost: 3_000_000,
    duration: 129_600,
    cooldown: 525_600,
    effects: { power: 20, heat: 30, governance: -10 },
    riskLevel: 'extreme',
    minTier: 4,
  },
];

// ── Election Actions (Tier 2+) ──
export interface ElectionAction {
  id: string;
  name: string;
  description: string;
  cost: number;
  successRate: number;
  effects: { power?: number; heat?: number; governance?: number };
  consequence: string; // what happens on failure
  minTier: PoliticalTier;
}

export const ELECTION_ACTIONS: ElectionAction[] = [
  {
    id: 'fundraiser-gala',
    name: 'Host Political Fundraiser',
    description: 'Throw a lavish fundraiser gala for a key political figure.',
    cost: 200_000,
    successRate: 0.9,
    effects: { power: 5 },
    consequence: 'Minor media scrutiny (+3 heat)',
    minTier: 2,
  },
  {
    id: 'super-pac-attack-ad',
    name: 'Super PAC Attack Ads',
    description: 'Fund attack advertisements against politicians who oppose your interests.',
    cost: 500_000,
    successRate: 0.7,
    effects: { power: 10, heat: 5 },
    consequence: 'Ad backfires — public backlash (+15 heat)',
    minTier: 3,
  },
  {
    id: 'ballot-initiative',
    name: 'Fund Ballot Initiative',
    description: 'Finance a ballot initiative that benefits your business operations.',
    cost: 1_000_000,
    successRate: 0.55,
    effects: { power: 15, governance: -3 },
    consequence: 'Initiative fails — funds lost, rivals emboldened',
    minTier: 3,
  },
  {
    id: 'install-candidate',
    name: 'Install Puppet Candidate',
    description: 'Secretly fund and manage a political candidate loyal to your interests.',
    cost: 5_000_000,
    successRate: 0.35,
    effects: { power: 30, heat: 15, governance: -5 },
    consequence: 'Candidate exposed — major scandal (+40 heat, -10 governance)',
    minTier: 4,
  },
  {
    id: 'vote-manipulation',
    name: 'Electoral Manipulation',
    description: 'Use dark money and influence networks to manipulate election outcomes.',
    cost: 10_000_000,
    successRate: 0.25,
    effects: { power: 50, heat: 20, governance: -15 },
    consequence: 'Investigation launched — asset freeze risk (+50 heat, -20 governance)',
    minTier: 4,
  },
];
