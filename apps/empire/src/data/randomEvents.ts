/**
 * randomEvents.ts — Realpolitiks-style random events ported from MVP events.js
 * Each event presents choices with tradeoffs affecting axes/balance.
 */

import type { GameEvent } from '../types/social';

export const RANDOM_EVENTS: GameEvent[] = [
  {
    id: 'regulatory-audit',
    title: 'Regulatory Audit',
    description: 'Compliance officers found irregularities in your Trading Floor records.',
    cooldownTicks: 50,
    minNetWorth: 50000,
    requiresStructure: 'trading-floor',
    options: [
      {
        label: 'Pay fine & cooperate',
        effects: { balance: -5000, governance: 3 },
        description: 'Costly but builds trust with regulators.',
      },
      {
        label: 'Ignore it',
        effects: { governance: -5 },
        description: 'Risky. May escalate to investigation.',
      },
      {
        label: 'Hire lawyers to fight',
        effects: { balance: -15000, governance: 1, power: 1 },
        description: 'Expensive but assertive.',
      },
    ],
  },
  {
    id: 'data-privacy',
    title: 'New Data Privacy Rules',
    description: 'The government is tightening data privacy requirements for financial platforms.',
    cooldownTicks: 60,
    minNetWorth: 100000,
    options: [
      {
        label: 'Lobby for exemptions',
        effects: { balance: -10000, power: 3 },
        description: 'Political play. Builds influence.',
      },
      {
        label: 'Comply early',
        effects: { balance: -5000, impact: 5, governance: 3 },
        description: 'Builds public trust and governance.',
      },
      {
        label: 'Wait and see',
        effects: {},
        description: 'No cost, no benefit.',
      },
    ],
  },
  {
    id: 'partner-dispute',
    title: 'Partner Dispute',
    description: 'Your NPC partner disagrees with your strategy and threatens to leave.',
    cooldownTicks: 40,
    requiresStructure: 'Partnership',
    options: [
      {
        label: 'Negotiate (bonus)',
        effects: { balance: -2000, governance: 2 },
        description: 'Keep the peace.',
      },
      {
        label: 'Let them leave',
        effects: { growth: 2, governance: -2 },
        description: 'Freedom, but instability.',
      },
      {
        label: 'Buy them out',
        effects: { balance: -10000, growth: 3 },
        description: 'Sole control, but expensive.',
      },
    ],
  },
  {
    id: 'market-crash',
    title: 'Market Volatility Spike',
    description: 'A flash crash hit global markets. Your portfolio dropped 8% in an hour.',
    cooldownTicks: 70,
    minNetWorth: 30000,
    options: [
      {
        label: 'Buy the dip',
        effects: { growth: 2 },
        description: 'If you have the nerve and the cash...',
      },
      {
        label: 'Sell everything',
        effects: { governance: 1 },
        description: 'Preserve capital. Live to fight another day.',
      },
      {
        label: 'Hold and wait',
        effects: {},
        description: 'Patience is a strategy too.',
      },
    ],
  },
  {
    id: 'whistleblower',
    title: 'Employee Complaint',
    description: 'An employee filed a formal complaint about working conditions in your company.',
    cooldownTicks: 45,
    requiresStructure: 'hr-dept',
    options: [
      {
        label: 'Investigate & fix',
        effects: { balance: -8000, governance: 4, impact: 2 },
        description: 'Right thing to do. Builds trust.',
      },
      {
        label: 'Settle quietly',
        effects: { balance: -3000, governance: -1 },
        description: 'Sweep it under the rug.',
      },
      {
        label: 'Ignore',
        effects: { governance: -5, impact: -3 },
        description: 'Risky for reputation. May leak.',
      },
    ],
  },
  {
    id: 'crypto-regulation',
    title: 'Crypto Tax Proposal',
    description: 'Parliament debates a new 5% tax on all crypto trading gains.',
    cooldownTicks: 55,
    minNetWorth: 75000,
    options: [
      {
        label: 'Oppose publicly',
        effects: { balance: -5000, power: 2 },
        description: 'Take a stand. May block it.',
      },
      {
        label: 'Support (hurt crypto traders)',
        effects: { power: 1, governance: 1 },
        description: 'Align with regulation.',
      },
      {
        label: 'Stay neutral',
        effects: {},
        description: 'No political capital spent.',
      },
    ],
  },
  {
    id: 'esg-pressure',
    title: 'ESG Investor Pressure',
    description: 'Investors and the public are pushing for sustainable business practices.',
    cooldownTicks: 60,
    minNetWorth: 200000,
    options: [
      {
        label: 'Go green',
        effects: { balance: -20000, impact: 5, governance: 2 },
        description: 'Expensive but builds Impact score.',
      },
      {
        label: 'Greenwash (cheap PR)',
        effects: { balance: -3000, impact: 1, governance: -2 },
        description: 'Risk of backlash if exposed.',
      },
      {
        label: 'Ignore ESG',
        effects: { impact: -3 },
        description: 'Saves money, costs reputation.',
      },
    ],
  },
  {
    id: 'talent-poaching',
    title: 'Competitor Poaching Your Manager',
    description: 'A rival company is offering your best manager double their salary.',
    cooldownTicks: 35,
    options: [
      {
        label: 'Counter-offer',
        effects: { balance: -30000, governance: 2 },
        description: 'Keep your talent.',
      },
      {
        label: 'Let them go',
        effects: { governance: -3 },
        description: 'Lose the manager, save cash.',
      },
      {
        label: 'Non-compete clause',
        effects: { balance: -10000, governance: 1, power: 1 },
        description: 'Legal muscle.',
      },
    ],
  },
  {
    id: 'press-scandal',
    title: 'Negative Press Coverage',
    description: 'A financial journalist is writing an expose about your business practices.',
    cooldownTicks: 50,
    minNetWorth: 150000,
    options: [
      {
        label: 'Transparency (invite them in)',
        effects: { governance: 3, impact: 2 },
        description: 'Risky but builds trust if clean.',
      },
      {
        label: 'PR crisis team',
        effects: { balance: -15000, governance: 1 },
        description: 'Control the narrative.',
      },
      {
        label: 'Threaten legal action',
        effects: { balance: -5000, power: 2, impact: -3 },
        description: 'Aggressive. May backfire.',
      },
    ],
  },
  {
    id: 'tech-disruption',
    title: 'AI Trading Bot Competition',
    description: 'A new AI trading algorithm is outperforming human traders on your campus.',
    cooldownTicks: 55,
    requiresStructure: 'trading-floor',
    options: [
      {
        label: 'Invest in R&D',
        effects: { balance: -25000, growth: 3, governance: 1 },
        description: 'Build your own edge.',
      },
      {
        label: 'Hire the developers',
        effects: { balance: -40000, growth: 4 },
        description: "If you can't beat them...",
      },
      {
        label: 'Ignore — humans will adapt',
        effects: {},
        description: 'Maybe. Or maybe not.',
      },
    ],
  },
  {
    id: 'charity-gala',
    title: 'Charity Gala Invitation',
    description: "You're invited to a prestigious charity fundraiser. How much do you contribute?",
    cooldownTicks: 40,
    minNetWorth: 100000,
    options: [
      {
        label: 'Major donation',
        effects: { balance: -50000, impact: 8, power: 2 },
        description: 'Makes headlines. Big Impact boost.',
      },
      {
        label: 'Modest contribution',
        effects: { balance: -5000, impact: 2 },
        description: 'Respectable. Low-key.',
      },
      {
        label: "Attend but don't donate",
        effects: { impact: -1 },
        description: 'Networking only. Looks stingy.',
      },
    ],
  },
  {
    id: 'interest-rate-change',
    title: 'Central Bank Rate Decision',
    description: 'The ECB is expected to change interest rates. Markets are nervous.',
    cooldownTicks: 65,
    options: [
      {
        label: 'Go long bonds',
        effects: { growth: 1 },
        description: 'Bet on rate cuts.',
      },
      {
        label: 'Short bonds',
        effects: { growth: 1 },
        description: 'Bet on rate hikes.',
      },
      {
        label: 'Stay cash',
        effects: { governance: 1 },
        description: 'Preserve capital. Boring but safe.',
      },
    ],
  },

  // ── New Events ──────────────────────────────────────────────────

  {
    id: 'hostile-takeover-attempt',
    title: 'Hostile Takeover Attempt',
    description: 'A rival conglomerate has launched a surprise bid to acquire your company.',
    cooldownTicks: 80,
    minNetWorth: 500000,
    options: [
      { label: 'Poison pill defense', effects: { balance: -50000, governance: 2, power: 3 }, description: 'Expensive defense, but preserves independence.' },
      { label: 'Negotiate a merger', effects: { balance: 100000, growth: -2, power: -3 }, description: 'Cash out partially. Lose autonomy.' },
      { label: 'White knight search', effects: { balance: -20000, power: 1, governance: 1 }, description: 'Find a friendly acquirer instead.' },
    ],
  },
  {
    id: 'currency-crisis',
    title: 'Currency Crisis',
    description: 'The local currency plunged 15% overnight. Your international holdings are affected.',
    cooldownTicks: 70,
    minNetWorth: 200000,
    options: [
      { label: 'Hedge with forex', effects: { balance: -15000, growth: 2 }, description: 'Protect against further losses.' },
      { label: 'Buy local assets cheap', effects: { balance: -30000, growth: 4 }, description: 'Opportunistic. High risk, high reward.' },
      { label: 'Repatriate funds', effects: { balance: -5000, governance: 1 }, description: 'Safe but miss the opportunity.' },
    ],
  },
  {
    id: 'supply-chain-disruption',
    title: 'Supply Chain Disruption',
    description: 'A major port strike is disrupting logistics across your trade routes.',
    cooldownTicks: 45,
    minNetWorth: 100000,
    options: [
      { label: 'Reroute shipments', effects: { balance: -20000, growth: 1 }, description: 'Costly but keeps business moving.' },
      { label: 'Stockpile inventory', effects: { balance: -35000, governance: 1 }, description: 'Prepare for extended disruption.' },
      { label: 'Wait it out', effects: { growth: -2 }, description: 'Hope the strike ends soon.' },
    ],
  },
  {
    id: 'insider-leak',
    title: 'Insider Information Leaked',
    description: 'Confidential merger details were leaked to the press. Regulators are watching.',
    cooldownTicks: 55,
    minNetWorth: 300000,
    options: [
      { label: 'Internal investigation', effects: { balance: -25000, governance: 5 }, description: 'Find the leak. Show regulators you care.' },
      { label: 'Deny everything', effects: { governance: -4, power: 1 }, description: 'Stonewalling. Risky if evidence surfaces.' },
      { label: 'Cooperate with regulators', effects: { balance: -10000, governance: 3, power: -1 }, description: 'Transparent but may expose other issues.' },
    ],
  },
  {
    id: 'real-estate-boom',
    title: 'Real Estate Boom',
    description: 'Property values in your operating region are surging 20% year-over-year.',
    cooldownTicks: 50,
    minNetWorth: 150000,
    options: [
      { label: 'Buy property', effects: { balance: -100000, growth: 3, power: 1 }, description: 'Ride the wave. Asset appreciation.' },
      { label: 'Develop existing land', effects: { balance: -40000, growth: 2 }, description: 'Improve what you have.' },
      { label: 'Sell holdings at peak', effects: { balance: 60000, growth: -1 }, description: 'Take profits. Risk missing further gains.' },
    ],
  },
  {
    id: 'sanctions-risk',
    title: 'International Sanctions',
    description: 'New sanctions target a country where you have business operations.',
    cooldownTicks: 60,
    minNetWorth: 250000,
    options: [
      { label: 'Comply immediately', effects: { balance: -30000, governance: 4 }, description: 'Clean exit. Costly but compliant.' },
      { label: 'Restructure through subsidiaries', effects: { balance: -15000, governance: -3, power: 2 }, description: 'Grey area. Regulators may scrutinize.' },
      { label: 'Lobby for exemption', effects: { balance: -20000, power: 3 }, description: 'Use political influence to get a carve-out.' },
    ],
  },
  {
    id: 'pandemic-wave',
    title: 'Pandemic Wave',
    description: 'A new disease variant is spreading. Markets are jittery, remote work surging.',
    cooldownTicks: 90,
    options: [
      { label: 'Invest in remote infrastructure', effects: { balance: -25000, growth: 2, governance: 2 }, description: 'Future-proof your operations.' },
      { label: 'Acquire distressed assets', effects: { balance: -50000, growth: 4 }, description: 'Buy when others are fearful.' },
      { label: 'Conserve cash', effects: { governance: 1 }, description: 'Ride it out. Stability over growth.' },
    ],
  },
  {
    id: 'energy-crisis',
    title: 'Energy Price Shock',
    description: 'Energy costs have tripled. Your operating expenses are surging.',
    cooldownTicks: 55,
    minNetWorth: 100000,
    options: [
      { label: 'Invest in solar/green', effects: { balance: -40000, impact: 5, governance: 2 }, description: 'Long-term hedge against energy costs.' },
      { label: 'Pass costs to customers', effects: { growth: -2, power: 1 }, description: 'Protect margins but risk losing clients.' },
      { label: 'Negotiate bulk energy deals', effects: { balance: -15000, governance: 1 }, description: 'Short-term fix.' },
    ],
  },
  {
    id: 'talent-war',
    title: 'Talent War',
    description: 'Tech companies are offering insane salaries. Your best people are getting poached.',
    cooldownTicks: 40,
    minNetWorth: 200000,
    options: [
      { label: 'Match offers across the board', effects: { balance: -80000, governance: 3 }, description: 'Expensive but retains key talent.' },
      { label: 'Offer equity instead', effects: { governance: 2, growth: 1 }, description: 'Align incentives. Less cash outflow.' },
      { label: 'Let them go, hire juniors', effects: { balance: -10000, governance: -2 }, description: 'Cheaper but risky quality drop.' },
    ],
  },
  {
    id: 'antitrust-investigation',
    title: 'Antitrust Investigation',
    description: 'Regulators opened an antitrust investigation into your market dominance.',
    cooldownTicks: 75,
    minNetWorth: 1000000,
    options: [
      { label: 'Cooperate fully', effects: { balance: -50000, governance: 5, power: -2 }, description: 'Transparent. May result in divestitures.' },
      { label: 'Fight in court', effects: { balance: -100000, power: 3 }, description: 'Aggressive. Could take years.' },
      { label: 'Voluntary split', effects: { balance: -20000, governance: 3, growth: -3 }, description: 'Proactive. Reduces regulatory pressure.' },
    ],
  },
  {
    id: 'natural-disaster',
    title: 'Natural Disaster',
    description: 'A major earthquake damaged infrastructure in a key operating region.',
    cooldownTicks: 80,
    options: [
      { label: 'Rebuild and donate', effects: { balance: -60000, impact: 8, governance: 2 }, description: 'Community leader. Huge PR boost.' },
      { label: 'Claim insurance', effects: { balance: 10000, governance: -1 }, description: 'Recoup losses. Looks cold.' },
      { label: 'Relocate operations', effects: { balance: -30000, growth: 1 }, description: 'Strategic retreat to safer ground.' },
    ],
  },
  {
    id: 'celebrity-endorsement',
    title: 'Celebrity Endorsement Offer',
    description: 'A famous athlete wants to partner with your brand. Their agent is calling.',
    cooldownTicks: 35,
    minNetWorth: 75000,
    options: [
      { label: 'Sign the deal', effects: { balance: -40000, power: 3, growth: 2 }, description: 'Massive brand visibility.' },
      { label: 'Negotiate lower fee', effects: { balance: -15000, power: 1 }, description: 'Smaller splash, less cost.' },
      { label: 'Decline', effects: {}, description: 'Save the budget for other channels.' },
    ],
  },
  {
    id: 'cyberattack',
    title: 'Cyberattack',
    description: 'Hackers breached your network. Customer data may be compromised.',
    cooldownTicks: 60,
    minNetWorth: 100000,
    options: [
      { label: 'Full disclosure + fix', effects: { balance: -35000, governance: 5, impact: 2 }, description: 'Transparent. Costly but builds trust.' },
      { label: 'Quietly patch it', effects: { balance: -10000, governance: -4 }, description: 'Hope no one notices. Risky.' },
      { label: 'Hire cybersecurity firm', effects: { balance: -50000, governance: 3 }, description: 'Premium protection going forward.' },
    ],
  },
  {
    id: 'union-formation',
    title: 'Workers Unionizing',
    description: 'Your employees are organizing a union. The media is watching.',
    cooldownTicks: 50,
    options: [
      { label: 'Recognize the union', effects: { balance: -20000, governance: 4, impact: 3 }, description: 'Progressive. Higher costs but stable workforce.' },
      { label: 'Offer concessions without union', effects: { balance: -30000, governance: 2 }, description: 'Try to satisfy demands without formal union.' },
      { label: 'Oppose formation', effects: { governance: -5, impact: -4, power: 2 }, description: 'Legal but unpopular. PR nightmare risk.' },
    ],
  },
  {
    id: 'acquisition-opportunity',
    title: 'Acquisition Opportunity',
    description: 'A struggling competitor is available for pennies on the dollar.',
    cooldownTicks: 45,
    minNetWorth: 300000,
    options: [
      { label: 'Acquire them', effects: { balance: -150000, growth: 5, power: 2 }, description: 'Double your market share overnight.' },
      { label: 'Acquire key assets only', effects: { balance: -60000, growth: 2 }, description: 'Cherry-pick the valuable parts.' },
      { label: 'Pass', effects: {}, description: 'Too risky. Let someone else take the gamble.' },
    ],
  },
  {
    id: 'ipo-window',
    title: 'IPO Window Opening',
    description: 'Market conditions are ideal for an IPO. Your bankers are pushing hard.',
    cooldownTicks: 100,
    minNetWorth: 2000000,
    options: [
      { label: 'Go public', effects: { balance: 500000, governance: -3, power: 3 }, description: 'Massive capital raise. Regulatory burden increases.' },
      { label: 'Direct listing', effects: { balance: 200000, governance: -1, power: 1 }, description: 'Less dilution, less hype.' },
      { label: 'Stay private', effects: { governance: 2 }, description: 'Keep control. Miss the window.' },
    ],
  },
  {
    id: 'tax-haven-crackdown',
    title: 'Offshore Tax Crackdown',
    description: 'OECD announces a global minimum tax. Your offshore structures are under scrutiny.',
    cooldownTicks: 70,
    minNetWorth: 500000,
    options: [
      { label: 'Restructure onshore', effects: { balance: -40000, governance: 5 }, description: 'Compliant. Higher taxes but clean.' },
      { label: 'Hire tax advisors', effects: { balance: -25000, governance: 1 }, description: 'Find legal loopholes.' },
      { label: 'Ignore for now', effects: { governance: -4 }, description: 'Gamble that enforcement is slow.' },
    ],
  },
  {
    id: 'brand-viral-moment',
    title: 'Viral Brand Moment',
    description: 'Your company went viral on social media. Millions are talking about you.',
    cooldownTicks: 30,
    options: [
      { label: 'Capitalize with marketing blitz', effects: { balance: -20000, growth: 4, power: 2 }, description: 'Strike while the iron is hot.' },
      { label: 'Engage community organically', effects: { growth: 2, impact: 2 }, description: 'Authentic response. Slower but sustainable.' },
      { label: 'Stay quiet', effects: { growth: 1 }, description: 'Let it play out. Low effort, low reward.' },
    ],
  },
  {
    id: 'geopolitical-tension',
    title: 'Geopolitical Tensions Rising',
    description: 'Military tensions between major powers are rattling global markets.',
    cooldownTicks: 65,
    minNetWorth: 150000,
    options: [
      { label: 'Shift to defense stocks', effects: { growth: 2, impact: -2 }, description: 'Profit from conflict. Ethical questions.' },
      { label: 'Diversify internationally', effects: { balance: -20000, governance: 2 }, description: 'Spread risk across regions.' },
      { label: 'Go to cash', effects: { governance: 1 }, description: 'Safety first. Wait for clarity.' },
    ],
  },
  {
    id: 'innovation-breakthrough',
    title: 'R&D Breakthrough',
    description: 'Your research team achieved a major breakthrough. Competitors will want to license it.',
    cooldownTicks: 50,
    options: [
      { label: 'Patent and license', effects: { balance: 50000, growth: 2, power: 2 }, description: 'Revenue stream + competitive moat.' },
      { label: 'Open source it', effects: { impact: 6, power: -1, governance: 2 }, description: 'Massive goodwill. No direct revenue.' },
      { label: 'Keep it proprietary', effects: { growth: 4 }, description: 'Exclusive advantage. May attract lawsuits.' },
    ],
  },
  {
    id: 'corruption-scandal',
    title: 'Corruption Scandal',
    description: 'A senior executive was caught in a bribery scheme. The board wants answers.',
    cooldownTicks: 70,
    minNetWorth: 500000,
    options: [
      { label: 'Fire and prosecute', effects: { balance: -30000, governance: 6, impact: 3 }, description: 'Zero tolerance. Strong signal.' },
      { label: 'Quiet resignation', effects: { balance: -10000, governance: -2 }, description: 'Limit public damage.' },
      { label: 'Internal review only', effects: { governance: -4, power: 1 }, description: 'Cover-up risk. May leak later.' },
    ],
  },
];
