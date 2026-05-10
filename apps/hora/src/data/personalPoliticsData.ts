/**
 * personalPoliticsData.ts — Personal political career progression.
 * Career ladder: Citizen → City Council → Mayor → Senator → Governor → Cabinet Minister → President
 * Each rank has requirements, campaign costs, and unlocks.
 * Time: 1 tick = 1 game minute. 43,200 ticks ≈ 1 game month.
 */

// ── Political Career Ranks ──
export interface PoliticalRank {
  id: string;
  rank: number; // 0-6
  title: string;
  description: string;
  requirements: {
    minApproval: number;     // 0-100 approval rating needed
    minFunds: number;        // personal balance needed to run
    minFollowers: number;    // social followers needed
    minPower: number;        // empire power axis needed
    campaignCost: number;    // cost to run the campaign
    campaignDuration: number; // ticks the campaign takes
  };
  perks: string[];           // what this rank unlocks
  salary: number;            // monthly income from political office
  termLength: number;        // ticks for one term in office
  reelectionAllowed: boolean;
}

export const POLITICAL_RANKS: PoliticalRank[] = [
  {
    id: 'citizen', rank: 0, title: 'Private Citizen',
    description: 'No political office. Focus on building influence and reputation.',
    requirements: { minApproval: 0, minFunds: 0, minFollowers: 0, minPower: 0, campaignCost: 0, campaignDuration: 0 },
    perks: ['Vote in elections', 'Attend town halls'],
    salary: 0, termLength: 0, reelectionAllowed: false,
  },
  {
    id: 'city-council', rank: 1, title: 'City Council Member',
    description: 'Local politics. Influence zoning, small business regulations, and community development.',
    requirements: { minApproval: 20, minFunds: 50_000, minFollowers: 500, minPower: 5, campaignCost: 100_000, campaignDuration: 86_400 },
    perks: ['Influence local zoning', 'Small business tax breaks', 'Community project sponsorship'],
    salary: 5_000, termLength: 525_600, reelectionAllowed: true,
  },
  {
    id: 'mayor', rank: 2, title: 'Mayor',
    description: 'Run the city. Control local regulations, infrastructure spending, and public services.',
    requirements: { minApproval: 35, minFunds: 500_000, minFollowers: 5_000, minPower: 15, campaignCost: 750_000, campaignDuration: 172_800 },
    perks: ['Set local tax rates', 'Approve construction permits', 'Emergency powers', 'City contract allocation'],
    salary: 15_000, termLength: 1_051_200, reelectionAllowed: true,
  },
  {
    id: 'senator', rank: 3, title: 'Senator',
    description: 'National legislature. Shape laws, investigate rivals, and build a national platform.',
    requirements: { minApproval: 45, minFunds: 2_000_000, minFollowers: 25_000, minPower: 30, campaignCost: 5_000_000, campaignDuration: 259_200 },
    perks: ['Draft legislation', 'Committee chairmanship', 'Subpoena power', 'National media platform', 'Diplomatic immunity'],
    salary: 50_000, termLength: 1_576_800, reelectionAllowed: true,
  },
  {
    id: 'governor', rank: 4, title: 'Governor',
    description: 'Lead a state/region. Control regional regulation, National Guard, and state budget.',
    requirements: { minApproval: 55, minFunds: 10_000_000, minFollowers: 100_000, minPower: 50, campaignCost: 20_000_000, campaignDuration: 345_600 },
    perks: ['State emergency powers', 'Pardon authority', 'National Guard command', 'State budget control', 'Regulatory override'],
    salary: 120_000, termLength: 1_051_200, reelectionAllowed: true,
  },
  {
    id: 'cabinet', rank: 5, title: 'Cabinet Minister',
    description: 'Appointed to the national cabinet. Direct a government ministry with vast resources.',
    requirements: { minApproval: 60, minFunds: 25_000_000, minFollowers: 250_000, minPower: 70, campaignCost: 50_000_000, campaignDuration: 129_600 },
    perks: ['Ministry budget control', 'International diplomacy', 'Intelligence briefings', 'Policy directives', 'Government contracts'],
    salary: 250_000, termLength: 1_051_200, reelectionAllowed: false,
  },
  {
    id: 'president', rank: 6, title: 'President',
    description: 'Leader of the nation. Ultimate political power. Shape the world order.',
    requirements: { minApproval: 70, minFunds: 100_000_000, minFollowers: 1_000_000, minPower: 90, campaignCost: 200_000_000, campaignDuration: 525_600 },
    perks: ['Executive orders', 'Military command', 'Treaty authority', 'Veto power', 'State of emergency', 'Nuclear codes'],
    salary: 500_000, termLength: 2_102_400, reelectionAllowed: true,
  },
];

// ── Campaign Activities ──
// Actions available during a campaign to boost approval
export interface CampaignActivity {
  id: string;
  name: string;
  description: string;
  cost: number;
  approvalBoost: number;  // approval points gained
  followerBoost: number;
  xpGain: number;
  cooldownTicks: number;
  riskChance: number;     // 0-1, chance of scandal
  scandalCost: number;    // approval points lost on scandal
  minRank: number;        // minimum rank to unlock
}

export const CAMPAIGN_ACTIVITIES: CampaignActivity[] = [
  { id: 'town-hall', name: 'Town Hall Meeting', description: 'Host a public town hall to connect with voters.', cost: 5_000, approvalBoost: 3, followerBoost: 50, xpGain: 10, cooldownTicks: 14_400, riskChance: 0.05, scandalCost: 5, minRank: 0 },
  { id: 'rally', name: 'Campaign Rally', description: 'Organize a large public rally with speeches and entertainment.', cost: 50_000, approvalBoost: 5, followerBoost: 200, xpGain: 25, cooldownTicks: 43_200, riskChance: 0.08, scandalCost: 8, minRank: 1 },
  { id: 'tv-debate', name: 'TV Debate Appearance', description: 'Appear on a televised political debate to showcase your platform.', cost: 100_000, approvalBoost: 8, followerBoost: 500, xpGain: 40, cooldownTicks: 86_400, riskChance: 0.15, scandalCost: 12, minRank: 2 },
  { id: 'charity-gala', name: 'Charity Gala', description: 'Host an exclusive charity event to build elite connections.', cost: 250_000, approvalBoost: 4, followerBoost: 100, xpGain: 30, cooldownTicks: 43_200, riskChance: 0.03, scandalCost: 3, minRank: 1 },
  { id: 'media-blitz', name: 'Media Blitz', description: 'Launch a coordinated media campaign across all channels.', cost: 500_000, approvalBoost: 10, followerBoost: 1000, xpGain: 50, cooldownTicks: 129_600, riskChance: 0.1, scandalCost: 15, minRank: 3 },
  { id: 'grassroots', name: 'Grassroots Organizing', description: 'Fund door-to-door canvassing and community outreach.', cost: 75_000, approvalBoost: 6, followerBoost: 300, xpGain: 35, cooldownTicks: 43_200, riskChance: 0.02, scandalCost: 2, minRank: 0 },
  { id: 'endorsement-deal', name: 'Celebrity Endorsement', description: 'Secure a high-profile celebrity endorsement for your campaign.', cost: 1_000_000, approvalBoost: 12, followerBoost: 2000, xpGain: 60, cooldownTicks: 172_800, riskChance: 0.12, scandalCost: 20, minRank: 3 },
  { id: 'foreign-trip', name: 'Diplomatic Foreign Trip', description: 'Visit foreign leaders to demonstrate statesmanship.', cost: 2_000_000, approvalBoost: 7, followerBoost: 500, xpGain: 45, cooldownTicks: 259_200, riskChance: 0.08, scandalCost: 10, minRank: 4 },
  { id: 'policy-paper', name: 'Publish Policy Paper', description: 'Release a detailed policy paper to establish intellectual credibility.', cost: 25_000, approvalBoost: 4, followerBoost: 100, xpGain: 20, cooldownTicks: 86_400, riskChance: 0.01, scandalCost: 1, minRank: 2 },
  { id: 'smear-opponent', name: 'Smear Opponent', description: 'Launch negative attack ads against your political opponent.', cost: 750_000, approvalBoost: 8, followerBoost: -200, xpGain: 15, cooldownTicks: 86_400, riskChance: 0.25, scandalCost: 25, minRank: 2 },
];

// ── Political Policies ──
// Policies a player can enact once in office (rank-gated)
export interface PoliticalPolicy {
  id: string;
  name: string;
  description: string;
  effect: string;          // human-readable effect
  gameEffects: Record<string, number>; // actual numeric effects
  approvalChange: number;  // how it affects approval rating
  minRank: number;
  cost: number;            // political capital / implementation cost
  duration: number;        // ticks the policy lasts (0 = permanent)
}

export const POLITICAL_POLICIES: PoliticalPolicy[] = [
  { id: 'business-tax-cut', name: 'Business Tax Cut', description: 'Reduce corporate tax rates to stimulate business growth.', effect: 'All company income +15% for 6 months', gameEffects: { incomeMultiplier: 0.15 }, approvalChange: -5, minRank: 2, cost: 500_000, duration: 259_200 },
  { id: 'infrastructure-bill', name: 'Infrastructure Spending', description: 'Increase public infrastructure investment.', effect: 'Construction costs -20% for 1 year', gameEffects: { constructionDiscount: 0.20 }, approvalChange: 8, minRank: 2, cost: 2_000_000, duration: 525_600 },
  { id: 'deregulation-act', name: 'Deregulation Act', description: 'Remove burdensome regulations on financial services.', effect: 'Heat generation -30%, governance cost -25%', gameEffects: { heatReduction: 0.30, governanceCostReduction: 0.25 }, approvalChange: -10, minRank: 3, cost: 5_000_000, duration: 525_600 },
  { id: 'trade-deal', name: 'Bilateral Trade Deal', description: 'Negotiate favorable trade terms with a foreign nation.', effect: 'Trade route income +25% for 1 year', gameEffects: { tradeIncomeBonus: 0.25 }, approvalChange: 3, minRank: 4, cost: 10_000_000, duration: 525_600 },
  { id: 'anti-corruption', name: 'Anti-Corruption Drive', description: 'Launch a public anti-corruption campaign (targeting your rivals).', effect: 'Rival power -20%, your governance +15', gameEffects: { rivalPowerReduction: 0.20, governance: 15 }, approvalChange: 12, minRank: 3, cost: 3_000_000, duration: 259_200 },
  { id: 'media-regulation', name: 'Media Freedom Act', description: 'Either protect or restrict media — your choice shapes perception.', effect: 'Followers +500, media ops cost -30%', gameEffects: { followers: 500, mediaDiscount: 0.30 }, approvalChange: 5, minRank: 4, cost: 1_000_000, duration: 525_600 },
  { id: 'emergency-powers', name: 'Emergency Powers', description: 'Declare a state of emergency to bypass normal governance.', effect: 'Bypass all cooldowns for 3 months. Heat +30.', gameEffects: { bypassCooldowns: 1, heat: 30 }, approvalChange: -20, minRank: 5, cost: 25_000_000, duration: 129_600 },
  { id: 'executive-order', name: 'Executive Order', description: 'Issue a unilateral executive order reshaping industry regulation.', effect: 'Your sector immune to regulation 1 year', gameEffects: { regulationImmunity: 1 }, approvalChange: -8, minRank: 6, cost: 50_000_000, duration: 525_600 },
];

// ── Scandal Types ──
// Random scandals that can hit a politician player
export interface ScandalType {
  id: string;
  name: string;
  description: string;
  approvalHit: number;
  heatGain: number;
  recoveryTicks: number;
  canBeSpunPositive: boolean; // if player can pay to spin it
  spinCost: number;
}

export const SCANDAL_TYPES: ScandalType[] = [
  { id: 'expense-report', name: 'Expense Report Scandal', description: 'Leaked expense reports reveal lavish spending on company funds.', approvalHit: 8, heatGain: 10, recoveryTicks: 86_400, canBeSpunPositive: true, spinCost: 100_000 },
  { id: 'offshore-accounts', name: 'Offshore Account Revealed', description: 'Investigative journalists expose offshore tax havens.', approvalHit: 15, heatGain: 20, recoveryTicks: 172_800, canBeSpunPositive: true, spinCost: 500_000 },
  { id: 'insider-trading', name: 'Insider Trading Allegations', description: 'Suspicious trades before major announcements raise red flags.', approvalHit: 20, heatGain: 30, recoveryTicks: 259_200, canBeSpunPositive: false, spinCost: 0 },
  { id: 'corruption-probe', name: 'Corruption Investigation', description: 'Federal investigators launch a probe into your political dealings.', approvalHit: 25, heatGain: 40, recoveryTicks: 345_600, canBeSpunPositive: false, spinCost: 0 },
  { id: 'photo-op-gone-wrong', name: 'PR Disaster', description: 'An ill-advised photo opportunity goes viral for all the wrong reasons.', approvalHit: 5, heatGain: 5, recoveryTicks: 43_200, canBeSpunPositive: true, spinCost: 50_000 },
  { id: 'leaked-emails', name: 'Leaked Private Emails', description: 'Confidential emails reveal questionable business-political relationships.', approvalHit: 12, heatGain: 15, recoveryTicks: 129_600, canBeSpunPositive: true, spinCost: 250_000 },
];
