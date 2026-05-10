/**
 * marketWireTemplates.ts — Agent journalism article templates.
 *
 * AI journalist agents observe player behavior and generate articles
 * in the style of financial news. Each template has triggers (what
 * player action spawns the article) and market impact (how the article
 * affects instrument prices).
 */

// ── Agent journalist personas ──

export interface JournalistAgent {
  id: string;
  name: string;
  outlet: string;
  beat: string;         // area of coverage
  style: string;        // writing voice
  bias: 'bullish' | 'bearish' | 'neutral' | 'contrarian';
  avatarEmoji: string;
}

export const JOURNALIST_AGENTS: JournalistAgent[] = [
  {
    id: 'j-markets',
    name: 'Elena Voss',
    outlet: 'MarketWire Daily',
    beat: 'markets',
    style: 'Data-driven, precise. Leads with numbers, ends with implications.',
    bias: 'neutral',
    avatarEmoji: '📊',
  },
  {
    id: 'j-tech',
    name: 'Marcus Chen',
    outlet: 'TechPulse Capital',
    beat: 'technology',
    style: 'Fast-paced, buzzword-savvy. Loves growth narratives.',
    bias: 'bullish',
    avatarEmoji: '⚡',
  },
  {
    id: 'j-macro',
    name: 'Diane Ashford',
    outlet: 'The Global Ledger',
    beat: 'macro',
    style: 'Authoritative, historical context. Compares current events to past crises.',
    bias: 'bearish',
    avatarEmoji: '🌍',
  },
  {
    id: 'j-empire',
    name: 'Viktor Raines',
    outlet: 'Empire Watch',
    beat: 'corporate',
    style: 'Investigative, skeptical. Questions every acquisition.',
    bias: 'contrarian',
    avatarEmoji: '🔍',
  },
  {
    id: 'j-crypto',
    name: 'Zara Moon',
    outlet: 'CryptoVault',
    beat: 'crypto',
    style: 'Hype-driven, community-focused. Heavy on sentiment and momentum.',
    bias: 'bullish',
    avatarEmoji: '🪙',
  },
  {
    id: 'j-social',
    name: 'Phil Ortega',
    outlet: 'The Street Sheet',
    beat: 'social',
    style: 'Gossipy, punchy. Names names, tracks influence.',
    bias: 'neutral',
    avatarEmoji: '📰',
  },
];

// ── Behavior triggers that spawn articles ──

export type BehaviorTrigger =
  | 'large_buy'          // bought > €50k in one trade
  | 'large_sell'         // sold > €50k in one trade
  | 'portfolio_milestone'// net worth crossed a threshold
  | 'node_acquired'      // acquired a new node
  | 'node_stolen'        // stole a rival's node
  | 'monopoly_formed'    // owns all nodes in a sector
  | 'agent_deployed'     // deployed an agent
  | 'cyber_strike'       // launched a cyber attack
  | 'pvp_attack'         // attacked another player
  | 'pvp_victory'        // won a PvP confrontation
  | 'loan_taken'         // took a large loan
  | 'structure_changed'  // changed corporate structure
  | 'research_started'   // started R&D
  | 'shadow_op'          // executed a shadow operation
  | 'losing_streak'      // 3+ consecutive losing trades
  | 'winning_streak'     // 3+ consecutive winning trades
  | 'market_call'        // made a public market prediction
  | 'sector_dominance'   // owns 50%+ of sector nodes
  | 'high_heat'          // heat exceeded 80
  | 'bankruptcy_risk';   // balance dropped below €5k

// ── Article template ──

export interface ArticleTemplate {
  id: string;
  trigger: BehaviorTrigger;
  journalist: string;              // journalist agent id
  headlinePattern: string;         // with {placeholders}
  bodyPatterns: string[];          // paragraph patterns with {placeholders}
  sentiment: 'bullish' | 'bearish' | 'neutral';
  category: 'markets' | 'crypto' | 'corporate' | 'empire' | 'social' | 'macro';
  /** Price drift applied to related instruments (0.01 = +1%) */
  marketImpact: {
    affectedSectors?: string[];    // sectors whose instruments get drifted
    affectedSymbols?: string[];    // specific instruments
    drift: number;                 // e.g. 0.02 for +2%, -0.03 for -3%
  };
  /** Minimum cooldown (ms) before this template can fire again */
  cooldownMs: number;
}

// ── Templates ──

export const ARTICLE_TEMPLATES: ArticleTemplate[] = [
  // ── Large Trade Articles ──
  {
    id: 'art-large-buy',
    trigger: 'large_buy',
    journalist: 'j-markets',
    headlinePattern: '{company} Sees Major Institutional Interest as {symbol} Surges',
    bodyPatterns: [
      'A significant buy order worth €{amount} was placed on {symbol} ({name}) today, signaling renewed confidence in the {sector} sector.',
      'Market analysts at MarketWire Daily note the transaction as one of the largest single-day moves this quarter. The move pushed {symbol} up {changePercent}% in intraday trading.',
      '"This is a clear signal of conviction," said one institutional trader. "Someone has done their homework on {name} and is putting serious capital behind it."',
    ],
    sentiment: 'bullish',
    category: 'markets',
    marketImpact: { drift: 0.015 },
    cooldownMs: 60_000,
  },
  {
    id: 'art-large-sell',
    trigger: 'large_sell',
    journalist: 'j-markets',
    headlinePattern: '{symbol} Under Pressure as Major Position Unwound',
    bodyPatterns: [
      'A substantial sell-off in {symbol} ({name}) worth approximately €{amount} sent shockwaves through the {sector} sector today.',
      'The liquidation has raised questions about the near-term outlook for {name}. Other {sector} stocks also dipped in sympathy trading.',
      'MarketWire analysts remain cautious. "Profit-taking is natural after a run-up, but this volume suggests someone is repositioning significantly," notes Elena Voss.',
    ],
    sentiment: 'bearish',
    category: 'markets',
    marketImpact: { drift: -0.012 },
    cooldownMs: 60_000,
  },

  // ── Empire / Corporate Articles ──
  {
    id: 'art-node-acquired',
    trigger: 'node_acquired',
    journalist: 'j-empire',
    headlinePattern: 'BREAKING: {playerName} Expands Empire with {nodeName} Acquisition',
    bodyPatterns: [
      '{playerName}\'s holding company has acquired {nodeName} for an undisclosed sum, marking another aggressive expansion move.',
      'The acquisition brings the total node count to {totalNodes}, further consolidating the company\'s presence in the {nodeRegion} region.',
      'Empire Watch will continue monitoring this developing corporate strategy. Competitors should be watching closely.',
    ],
    sentiment: 'bullish',
    category: 'empire',
    marketImpact: { drift: 0.008 },
    cooldownMs: 30_000,
  },
  {
    id: 'art-node-stolen',
    trigger: 'node_stolen',
    journalist: 'j-empire',
    headlinePattern: 'Hostile Takeover: {playerName} Seizes {nodeName} from Rival',
    bodyPatterns: [
      'In a bold corporate raid, {playerName} has successfully wrested control of {nodeName} from its previous owner.',
      'The hostile takeover is estimated to have cost €{cost} in total, including defense-breaking expenses. Heat levels have risen to {heat}/100.',
      '"This kind of aggressive play changes the board entirely," observed Viktor Raines. "Every node owner in the region should be reinforcing their defenses."',
    ],
    sentiment: 'neutral',
    category: 'empire',
    marketImpact: { drift: -0.005 },
    cooldownMs: 45_000,
  },
  {
    id: 'art-monopoly',
    trigger: 'monopoly_formed',
    journalist: 'j-empire',
    headlinePattern: 'MONOPOLY ALERT: {playerName} Now Controls All {sector} Nodes',
    bodyPatterns: [
      'A significant power shift has occurred: {playerName} now holds monopoly control over the entire {sector} sector with {nodeCount} nodes.',
      'Monopoly holders enjoy a 1.5x income multiplier on all controlled nodes, dramatically increasing revenue generation.',
      'Competitors may attempt to break the monopoly via hostile takeovers. Empire Watch rates this development as market-moving.',
    ],
    sentiment: 'bullish',
    category: 'corporate',
    marketImpact: { affectedSectors: ['{sector}'], drift: 0.025 },
    cooldownMs: 120_000,
  },

  // ── PvP / Combat Articles ──
  {
    id: 'art-pvp-attack',
    trigger: 'pvp_attack',
    journalist: 'j-social',
    headlinePattern: '{playerName} Launches Offensive Against {targetName}',
    bodyPatterns: [
      'Tensions escalated in today\'s match as {playerName} launched a direct PvP attack against {targetName}.',
      'The confrontation is expected to have significant implications for the leaderboard standings. Both players have been jockeying for position.',
      'The Street Sheet has learned that {playerName} committed {attackPower} AP to the strike. We will report the outcome as it develops.',
    ],
    sentiment: 'neutral',
    category: 'social',
    marketImpact: { drift: -0.003 },
    cooldownMs: 20_000,
  },
  {
    id: 'art-pvp-victory',
    trigger: 'pvp_victory',
    journalist: 'j-social',
    headlinePattern: 'VICTORY: {playerName} Dominates {targetName} in PvP Showdown',
    bodyPatterns: [
      '{playerName} emerged victorious in a decisive PvP battle against {targetName}, solidifying their position on the leaderboard.',
      'The win netted an estimated €{reward} in plundered assets. {playerName}\'s net worth now stands at €{netWorth}.',
      '"Absolutely clinical execution," reported Phil Ortega from the trading floor. "This is what separates the contenders from the pretenders."',
    ],
    sentiment: 'bullish',
    category: 'social',
    marketImpact: { drift: 0.005 },
    cooldownMs: 30_000,
  },

  // ── Crypto Articles ──
  {
    id: 'art-crypto-buy',
    trigger: 'large_buy',
    journalist: 'j-crypto',
    headlinePattern: 'Whale Alert: Massive {symbol} Accumulation Detected',
    bodyPatterns: [
      'CryptoVault has detected a major accumulation event in {symbol}, with approximately €{amount} flowing in over a short period.',
      'On-chain sentiment for {name} has shifted decisively bullish. Social mentions are up 340% in the last hour.',
      '"This is the kind of buy pressure that precedes major moves," writes Zara Moon. "The smart money is loading up."',
    ],
    sentiment: 'bullish',
    category: 'crypto',
    marketImpact: { drift: 0.02 },
    cooldownMs: 60_000,
  },

  // ── Financial Articles ──
  {
    id: 'art-loan-taken',
    trigger: 'loan_taken',
    journalist: 'j-macro',
    headlinePattern: '{playerName} Takes on Significant Debt — Leveraged Play or Desperation?',
    bodyPatterns: [
      '{playerName}\'s company has taken on €{amount} in new debt, raising the total outstanding obligations and increasing financial leverage.',
      'The Global Ledger notes that leverage cuts both ways. In 2008, overleveraged firms were the first to collapse when liquidity dried up.',
      '"The question is whether this debt fuels productive expansion or merely papers over a cash flow crisis," observed Diane Ashford.',
    ],
    sentiment: 'bearish',
    category: 'macro',
    marketImpact: { drift: -0.008 },
    cooldownMs: 90_000,
  },

  // ── Strategic Articles ──
  {
    id: 'art-structure-change',
    trigger: 'structure_changed',
    journalist: 'j-empire',
    headlinePattern: '{playerName} Restructures to {structureName} — Strategic Pivot',
    bodyPatterns: [
      'In a significant corporate governance change, {playerName} has reorganized under a {structureName} structure.',
      'The restructuring is expected to unlock new capabilities and change the company\'s operational dynamics.',
      'Empire Watch will be analyzing the implications of this move in a follow-up report. The market is pricing in modest optimism.',
    ],
    sentiment: 'neutral',
    category: 'corporate',
    marketImpact: { drift: 0.005 },
    cooldownMs: 120_000,
  },
  {
    id: 'art-research',
    trigger: 'research_started',
    journalist: 'j-tech',
    headlinePattern: '{playerName} Bets Big on R&D: {projectName} Enters Development',
    bodyPatterns: [
      '{playerName} has committed resources to a new research initiative: {projectName}. The project aims to deliver competitive advantages in {sector}.',
      'TechPulse Capital rates R&D investment as a leading indicator of future growth. Companies that invest in downturns tend to outperform in recoveries.',
      '"Innovation is the only durable moat," writes Marcus Chen. "This is exactly the kind of forward-thinking move we like to see."',
    ],
    sentiment: 'bullish',
    category: 'corporate',
    marketImpact: { drift: 0.01 },
    cooldownMs: 90_000,
  },

  // ── Risk / Warning Articles ──
  {
    id: 'art-high-heat',
    trigger: 'high_heat',
    journalist: 'j-macro',
    headlinePattern: 'REGULATORY WARNING: {playerName} Under Scrutiny — Heat at {heat}/100',
    bodyPatterns: [
      'Regulatory bodies are reportedly increasing scrutiny of {playerName}\'s operations as the company\'s heat index reaches {heat}/100.',
      'High heat levels historically precede enforcement actions, fines, and operational restrictions. The Global Ledger recommends caution.',
      '"When regulators start circling, it rarely ends well for aggressive operators," warns Diane Ashford. "History is littered with empires that burned too hot."',
    ],
    sentiment: 'bearish',
    category: 'macro',
    marketImpact: { drift: -0.015 },
    cooldownMs: 180_000,
  },
  {
    id: 'art-bankruptcy-risk',
    trigger: 'bankruptcy_risk',
    journalist: 'j-macro',
    headlinePattern: 'CRISIS: {playerName}\'s Balance Sheet in Free Fall — Default Risk Rising',
    bodyPatterns: [
      'Alarm bells are ringing for {playerName} as the company\'s cash reserves have dwindled to dangerously low levels (€{balance}).',
      'Credit rating agencies are expected to downgrade the company imminently. Bond spreads on {playerName} debt have widened dramatically.',
      'The Global Ledger classifies this as a "Code Red" financial emergency. Without an immediate capital injection or asset sale, default is a growing possibility.',
    ],
    sentiment: 'bearish',
    category: 'macro',
    marketImpact: { drift: -0.025 },
    cooldownMs: 300_000,
  },

  // ── Streak Articles ──
  {
    id: 'art-winning-streak',
    trigger: 'winning_streak',
    journalist: 'j-markets',
    headlinePattern: '{playerName} on a Hot Streak — {streakCount} Consecutive Profitable Trades',
    bodyPatterns: [
      '{playerName} has recorded {streakCount} consecutive profitable trades, demonstrating exceptional market timing and analysis.',
      'Total realized gains from the streak now stand at approximately €{totalGains}. Portfolio performance is well above benchmark.',
      '"Sustained alpha like this is rare," notes Elena Voss. "Either this is genuine skill or a bull market that lifts all boats. Time will tell."',
    ],
    sentiment: 'bullish',
    category: 'markets',
    marketImpact: { drift: 0.005 },
    cooldownMs: 120_000,
  },
  {
    id: 'art-losing-streak',
    trigger: 'losing_streak',
    journalist: 'j-markets',
    headlinePattern: '{playerName} Bleeds Red — {streakCount} Straight Losses Raise Concerns',
    bodyPatterns: [
      'Concerns are mounting after {playerName} recorded {streakCount} consecutive losing trades, eroding portfolio value significantly.',
      'Total realized losses from the streak have reached approximately €{totalLosses}. Market observers are questioning the trading strategy.',
      '"Everyone goes through drawdowns, but this pattern suggests a systematic problem," warns Elena Voss. "Risk management is paramount."',
    ],
    sentiment: 'bearish',
    category: 'markets',
    marketImpact: { drift: -0.005 },
    cooldownMs: 120_000,
  },

  // ── Agent Articles ──
  {
    id: 'art-agent-deployed',
    trigger: 'agent_deployed',
    journalist: 'j-social',
    headlinePattern: '{playerName} Deploys {agentName} to {nodeName} — Operational Expansion',
    bodyPatterns: [
      '{playerName} has deployed agent {agentName} (OVR {agentOvr}) to {nodeName}, enhancing operational capabilities at the node.',
      'Agent deployments are a key indicator of strategic intent. This placement suggests {playerName} is prioritizing defense or production in this region.',
      'The Street Sheet\'s agent deployment tracker now shows {totalDeployed} active agents under {playerName}\'s command.',
    ],
    sentiment: 'neutral',
    category: 'social',
    marketImpact: { drift: 0.003 },
    cooldownMs: 45_000,
  },

  // ── Shadow / Cyber Articles ──
  {
    id: 'art-cyber-strike',
    trigger: 'cyber_strike',
    journalist: 'j-empire',
    headlinePattern: 'CYBER ALERT: Digital Infrastructure Under Attack — {targetNode} Breached',
    bodyPatterns: [
      'A sophisticated cyber operation has been detected targeting {targetNode}. The attack compromised defenses and disrupted operations.',
      'Security analysts estimate the strike cost the target approximately €{damage} in immediate losses and recovery expenses.',
      '"Cyber operations are the new frontier of corporate warfare," reports Viktor Raines. "No node is truly safe without proper digital hardening."',
    ],
    sentiment: 'bearish',
    category: 'empire',
    marketImpact: { drift: -0.01 },
    cooldownMs: 60_000,
  },
  {
    id: 'art-shadow-op',
    trigger: 'shadow_op',
    journalist: 'j-empire',
    headlinePattern: 'Covert Operations Detected — {playerName} Playing in the Shadows',
    bodyPatterns: [
      'Empire Watch has received intelligence suggesting {playerName} executed a covert operation. Details remain classified.',
      'Shadow operations carry high risk but can deliver outsized strategic advantages. Heat levels are reportedly elevated.',
      '"The fact that we know about it means it wasn\'t entirely clean," observes Viktor Raines. "But the question is whether the payoff justified the exposure."',
    ],
    sentiment: 'neutral',
    category: 'empire',
    marketImpact: { drift: -0.005 },
    cooldownMs: 90_000,
  },

  // ── Portfolio Milestone ──
  {
    id: 'art-milestone',
    trigger: 'portfolio_milestone',
    journalist: 'j-markets',
    headlinePattern: '{playerName} Crosses €{milestone} Net Worth — A New Tier of Wealth',
    bodyPatterns: [
      '{playerName}\'s empire has crossed the €{milestone} net worth threshold, a significant psychological and strategic milestone.',
      'At this level of wealth, new asset classes, instruments, and strategic options become available. The competitive landscape shifts.',
      '"Crossing these thresholds isn\'t just symbolic," writes Elena Voss. "It unlocks capabilities that were previously out of reach."',
    ],
    sentiment: 'bullish',
    category: 'markets',
    marketImpact: { drift: 0.01 },
    cooldownMs: 300_000,
  },

  // ── Sector Dominance ──
  {
    id: 'art-sector-dominance',
    trigger: 'sector_dominance',
    journalist: 'j-empire',
    headlinePattern: '{playerName} Consolidates Power in {sector} — Over 50% Market Share',
    bodyPatterns: [
      '{playerName} now controls more than half of all {sector} nodes, establishing dominant market position in the region.',
      'Sector dominance confers significant pricing power and strategic leverage. Competitors face an increasingly uphill battle.',
      '"This is the kind of consolidation that regulators typically watch very closely," notes Viktor Raines. "But for now, the market rewards the bold."',
    ],
    sentiment: 'bullish',
    category: 'corporate',
    marketImpact: { affectedSectors: ['{sector}'], drift: 0.018 },
    cooldownMs: 180_000,
  },

  // ── Market Call ──
  {
    id: 'art-market-call',
    trigger: 'market_call',
    journalist: 'j-social',
    headlinePattern: '{playerName} Goes {direction} on {symbol} — Bold Market Prediction',
    bodyPatterns: [
      '{playerName} has publicly declared a {direction} position on {symbol}, putting their reputation and credibility on the line.',
      'Market calls are graded on accuracy and can build or destroy an investor\'s public credibility score.',
      '"Public predictions are high-stakes," observes Phil Ortega. "Get it right and you\'re a genius. Get it wrong and the market remembers."',
    ],
    sentiment: 'neutral',
    category: 'social',
    marketImpact: { drift: 0.003 },
    cooldownMs: 60_000,
  },
];

// ── Market indices (in-game) ──

export interface MarketIndex {
  id: string;
  name: string;
  symbol: string;
  description: string;
  sectors: string[];           // which sectors contribute
  instrumentTypes: string[];   // which instrument types
}

export const MARKET_INDICES: MarketIndex[] = [
  { id: 'qx-500', name: 'QX 500', symbol: 'QX500', description: 'Broad market composite of all traded instruments', sectors: [], instrumentTypes: ['stock'] },
  { id: 'qx-tech', name: 'QX Tech', symbol: 'QXTECH', description: 'Technology sector index', sectors: ['Technology', 'Semiconductors', 'Cybersecurity'], instrumentTypes: ['stock'] },
  { id: 'qx-finance', name: 'QX Finance', symbol: 'QXFIN', description: 'Financial services index', sectors: ['Financials', 'Fintech'], instrumentTypes: ['stock'] },
  { id: 'qx-crypto', name: 'QX Crypto', symbol: 'QXCRYPTO', description: 'Cryptocurrency composite', sectors: [], instrumentTypes: ['crypto'] },
  { id: 'qx-defense', name: 'QX Defense', symbol: 'QXDEF', description: 'Aerospace and defense index', sectors: ['Defense', 'Aerospace'], instrumentTypes: ['stock'] },
  { id: 'qx-energy', name: 'QX Energy', symbol: 'QXNRG', description: 'Energy and commodities index', sectors: ['Energy'], instrumentTypes: ['stock', 'commodity'] },
];

// ── Sector color mapping ──

export const SECTOR_COLORS: Record<string, string> = {
  Technology: '#3b82f6',
  Semiconductors: '#8b5cf6',
  Financials: '#10b981',
  Fintech: '#14b8a6',
  Healthcare: '#f43f5e',
  Energy: '#f59e0b',
  Consumer: '#ec4899',
  Defense: '#6b7280',
  Aerospace: '#64748b',
  Industrials: '#d97706',
  'Real Estate': '#84cc16',
  Utilities: '#06b6d4',
  Telecom: '#a855f7',
  Crypto: '#f97316',
  Entertainment: '#e879f9',
  Transport: '#22d3ee',
  Gaming: '#a3e635',
  'E-commerce': '#fb923c',
  Shipping: '#94a3b8',
  Automotive: '#ef4444',
};
