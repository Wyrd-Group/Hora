/**
 * Athena Tool Definitions
 * Every game action available to Athena as an AI-callable tool.
 * Used by Blackbox AI (or fallback provider) for structured tool-calling.
 */

/* ── Types ─────────────────────────────────────────────────────────── */

export type ToolCategory =
  | 'trading'
  | 'empire'
  | 'pvp'
  | 'agents'
  | 'intel'
  | 'finance'
  | 'social'
  | 'corporate'
  | 'shadow'
  | 'navigation'
  | 'info'
  | 'expansion';

export interface ToolParam {
  type: 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface AthenaTool {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: Record<string, ToolParam>;
  handler: string;          // key for executor lookup
  matchOnly?: boolean;      // greyed out when no match active
  readOnly?: boolean;       // doesn't mutate state, just returns info
}

/* ── Tool Catalog ──────────────────────────────────────────────────── */

export const ATHENA_TOOLS: AthenaTool[] = [

  /* ─── Trading ──────────────────────────────────────────────────── */
  {
    name: 'buy_instrument',
    description: 'Buy shares of a stock, crypto, forex, commodity, or bond at market price',
    category: 'trading',
    parameters: {
      symbol: { type: 'string', description: 'Ticker symbol (e.g. AAPL, BTC, EURUSD)', required: true },
      quantity: { type: 'number', description: 'Number of units to buy (default 1)', required: false },
    },
    handler: 'buyInstrument',
  },
  {
    name: 'sell_instrument',
    description: 'Sell shares of a held position',
    category: 'trading',
    parameters: {
      symbol: { type: 'string', description: 'Ticker symbol to sell', required: true },
      quantity: { type: 'number', description: 'Number of units to sell (default: all)', required: false },
    },
    handler: 'sellInstrument',
  },
  {
    name: 'check_portfolio',
    description: 'Get current portfolio holdings with quantities, avg cost, and P&L',
    category: 'trading',
    parameters: {},
    handler: 'checkPortfolio',
    readOnly: true,
  },
  {
    name: 'check_price',
    description: 'Get current price and details of any instrument',
    category: 'trading',
    parameters: {
      symbol: { type: 'string', description: 'Ticker symbol to look up', required: true },
    },
    handler: 'checkPrice',
    readOnly: true,
  },

  /* ─── Empire ───────────────────────────────────────────────────── */
  {
    name: 'acquire_node',
    description: 'Purchase an available market node (business/infrastructure). Pass "cheapest" to buy the cheapest one.',
    category: 'empire',
    parameters: {
      nodeId: { type: 'string', description: 'Node ID to acquire, or "cheapest"', required: false },
      method: { type: 'string', description: 'Acquisition method', required: false, enum: ['build', 'buy'] },
    },
    handler: 'acquireNode',
  },
  {
    name: 'upgrade_node',
    description: 'Upgrade an owned node to increase income/capabilities',
    category: 'empire',
    parameters: {
      nodeId: { type: 'string', description: 'Node ID to upgrade, or "first" for first owned node', required: false },
    },
    handler: 'upgradeNode',
  },
  {
    name: 'steal_node',
    description: 'Attempt hostile takeover of a rival node. Costs money and may fail.',
    category: 'empire',
    parameters: {
      nodeId: { type: 'string', description: 'Rival node ID to steal, or "random" for a random rival', required: false },
    },
    handler: 'stealNode',
  },
  {
    name: 'list_nodes',
    description: 'List nodes by ownership: owned, rival, or market (available for purchase)',
    category: 'empire',
    parameters: {
      filter: { type: 'string', description: 'Filter: "owned", "rival", "market", or "all"', required: false, enum: ['owned', 'rival', 'market', 'all'] },
    },
    handler: 'listNodes',
    readOnly: true,
  },
  {
    name: 'build_route',
    description: 'Establish a trade route between two owned nodes',
    category: 'empire',
    parameters: {
      fromNodeId: { type: 'string', description: 'Source node ID', required: true },
      toNodeId: { type: 'string', description: 'Destination node ID', required: true },
      type: { type: 'string', description: 'Route type', required: false, enum: ['land', 'sea', 'air', 'digital'] },
    },
    handler: 'buildRoute',
  },
  {
    name: 'upgrade_route',
    description: 'Upgrade an existing trade route with enhancements',
    category: 'empire',
    parameters: {
      routeId: { type: 'string', description: 'Route ID to upgrade', required: true },
      upgradeName: { type: 'string', description: 'Name of the upgrade to apply', required: true },
    },
    handler: 'upgradeRoute',
  },
  {
    name: 'rename_node',
    description: 'Purchase naming rights for an owned node',
    category: 'empire',
    parameters: {
      nodeId: { type: 'string', description: 'Node ID to rename', required: true },
      newName: { type: 'string', description: 'New name for the node', required: true },
    },
    handler: 'renameNode',
  },

  /* ─── Corporate ────────────────────────────────────────────────── */
  {
    name: 'set_structure',
    description: 'Change corporate structure (sole_prop, llc, partnership, corporation, public_co, conglomerate)',
    category: 'corporate',
    parameters: {
      structure: { type: 'string', description: 'Target structure', required: true, enum: ['sole_prop', 'llc', 'partnership', 'corporation', 'public_co', 'conglomerate'] },
    },
    handler: 'setStructure',
  },
  {
    name: 'start_research',
    description: 'Launch an R&D project',
    category: 'corporate',
    parameters: {
      projectId: { type: 'string', description: 'R&D project ID to start', required: true },
    },
    handler: 'startResearch',
  },
  {
    name: 'start_project',
    description: 'Start a department project (HR, Trading, R&D, Marketing)',
    category: 'corporate',
    parameters: {
      projectId: { type: 'string', description: 'Department project ID', required: true },
    },
    handler: 'startProject',
  },
  {
    name: 'set_difficulty',
    description: 'Change game difficulty level',
    category: 'corporate',
    parameters: {
      difficulty: { type: 'string', description: 'Difficulty level', required: true, enum: ['easy', 'normal', 'hard', 'legendary'] },
    },
    handler: 'setDifficulty',
  },

  /* ─── Finance ──────────────────────────────────────────────────── */
  {
    name: 'take_loan',
    description: 'Borrow funds for expansion',
    category: 'finance',
    parameters: {
      type: { type: 'string', description: 'Loan type (e.g. business, emergency)', required: true },
      amount: { type: 'number', description: 'Amount to borrow', required: true },
    },
    handler: 'takeLoan',
  },
  {
    name: 'repay_loan',
    description: 'Make a payment on an outstanding loan',
    category: 'finance',
    parameters: {
      loanId: { type: 'string', description: 'Loan ID to repay', required: true },
      amount: { type: 'number', description: 'Payment amount (omit to pay minimum)', required: false },
    },
    handler: 'repayLoan',
  },
  {
    name: 'transfer_funds',
    description: 'Transfer money between personal and company accounts',
    category: 'finance',
    parameters: {
      direction: { type: 'string', description: '"to_personal" or "to_company"', required: true, enum: ['to_personal', 'to_company'] },
      amount: { type: 'number', description: 'Amount to transfer', required: true },
    },
    handler: 'transferFunds',
  },
  {
    name: 'invest_vc',
    description: 'Invest in a venture capital deal',
    category: 'finance',
    parameters: {
      dealId: { type: 'string', description: 'VC deal ID', required: true },
    },
    handler: 'investVC',
  },
  {
    name: 'acquire_pe',
    description: 'Private equity acquisition of a company',
    category: 'finance',
    parameters: {
      targetId: { type: 'string', description: 'PE target ID', required: true },
    },
    handler: 'acquirePE',
  },
  {
    name: 'allocate_hedge',
    description: 'Allocate capital to a hedge fund strategy',
    category: 'finance',
    parameters: {
      strategyId: { type: 'string', description: 'Hedge fund strategy ID', required: true },
      amount: { type: 'number', description: 'Amount to allocate', required: true },
    },
    handler: 'allocateHedge',
  },
  {
    name: 'start_ib_deal',
    description: 'Start an investment banking deal (M&A, IPO, debt)',
    category: 'finance',
    parameters: {
      dealId: { type: 'string', description: 'IB deal ID', required: true },
    },
    handler: 'startIBDeal',
  },
  {
    name: 'acquire_media',
    description: 'Acquire a media outlet',
    category: 'finance',
    parameters: {
      outletId: { type: 'string', description: 'Media outlet ID', required: true },
    },
    handler: 'acquireMedia',
  },
  {
    name: 'place_bid',
    description: 'Place a bid at an auction (art, cars, diamonds, real estate)',
    category: 'finance',
    parameters: {
      auctionId: { type: 'string', description: 'Auction ID', required: true },
      bidAmount: { type: 'number', description: 'Bid amount in euros', required: true },
    },
    handler: 'placeBid',
  },
  {
    name: 'buy_asset',
    description: 'Purchase a luxury asset, fund, shadow op, perk, or sports franchise',
    category: 'finance',
    parameters: {
      assetType: { type: 'string', description: 'Asset category', required: true, enum: ['funds', 'shadowOps', 'perks', 'shoppingAssets', 'sportsFranchises'] },
      assetId: { type: 'string', description: 'Specific asset ID', required: true },
    },
    handler: 'buyAsset',
  },

  /* ─── Agents ───────────────────────────────────────────────────── */
  {
    name: 'deploy_agent',
    description: 'Deploy an agent to a node or department',
    category: 'agents',
    parameters: {
      mintId: { type: 'string', description: 'Agent mint ID (or "best" for highest-OVR available)', required: true },
      targetId: { type: 'string', description: 'Node/department ID to deploy to', required: true },
    },
    handler: 'deployAgent',
  },
  {
    name: 'recall_agent',
    description: 'Recall a deployed agent back to bench',
    category: 'agents',
    parameters: {
      mintId: { type: 'string', description: 'Agent mint ID to recall', required: true },
    },
    handler: 'recallAgent',
  },
  {
    name: 'list_agents',
    description: 'List all owned agents with stats, deployment status, and OVR',
    category: 'agents',
    parameters: {
      filter: { type: 'string', description: '"all", "deployed", "bench", or a class name', required: false },
    },
    handler: 'listAgents',
    readOnly: true,
  },
  {
    name: 'use_ability',
    description: 'Activate an agent\'s special ability',
    category: 'agents',
    parameters: {
      mintId: { type: 'string', description: 'Agent mint ID', required: true },
    },
    handler: 'useAbility',
  },
  {
    name: 'use_ultimate',
    description: 'Activate an agent\'s ultimate ability',
    category: 'agents',
    parameters: {
      mintId: { type: 'string', description: 'Agent mint ID', required: true },
    },
    handler: 'useUltimate',
  },
  {
    name: 'quick_sell_agent',
    description: 'Quick-sell an agent for instant Q-Coins',
    category: 'agents',
    parameters: {
      mintId: { type: 'string', description: 'Agent mint ID to sell', required: true },
    },
    handler: 'quickSellAgent',
  },

  /* ─── Intel ────────────────────────────────────────────────────── */
  {
    name: 'decrypt_intel',
    description: 'Decrypt intelligence on a rival node to reveal its stats',
    category: 'intel',
    parameters: {
      nodeId: { type: 'string', description: 'Rival node ID (or "next" for next undecrypted)', required: false },
    },
    handler: 'decryptIntel',
  },
  {
    name: 'cyber_strike',
    description: 'Launch a cyber strike against a rival node, damaging its operations',
    category: 'intel',
    parameters: {
      nodeId: { type: 'string', description: 'Rival node ID to target (or "random")', required: false },
    },
    handler: 'cyberStrike',
  },

  /* ─── Shadow ───────────────────────────────────────────────────── */
  {
    name: 'execute_crime',
    description: 'Execute a criminal operation (increases heat)',
    category: 'shadow',
    parameters: {
      crimeId: { type: 'string', description: 'Crime operation ID', required: true },
    },
    handler: 'executeCrime',
  },
  {
    name: 'execute_shadow_op',
    description: 'Execute a shadow operation for profit and intel',
    category: 'shadow',
    parameters: {
      opId: { type: 'string', description: 'Shadow operation ID', required: true },
    },
    handler: 'executeShadowOp',
  },

  /* ─── PvP ──────────────────────────────────────────────────────── */
  {
    name: 'pvp_attack',
    description: 'Launch a PvP confrontation against an opponent in the current match',
    category: 'pvp',
    parameters: {
      targetName: { type: 'string', description: 'Opponent name or "leader" for top-ranked player', required: false },
    },
    handler: 'pvpAttack',
    matchOnly: true,
  },
  {
    name: 'poach_agent',
    description: 'Attempt to poach an agent from a rival or opponent',
    category: 'pvp',
    parameters: {
      agentMintId: { type: 'string', description: 'Target agent mint ID', required: false },
      ownerName: { type: 'string', description: 'Owner name', required: false },
    },
    handler: 'poachAgent',
  },

  /* ─── Social ───────────────────────────────────────────────────── */
  {
    name: 'create_post',
    description: 'Post on the match social media to influence markets',
    category: 'social',
    parameters: {
      content: { type: 'string', description: 'Post text content', required: true },
      sentiment: { type: 'string', description: 'Sentiment tag', required: true, enum: ['bullish', 'bearish', 'info', 'hype'] },
      targetAsset: { type: 'string', description: 'Ticker symbol to tag (e.g. $AAPL)', required: false },
    },
    handler: 'createPost',
    matchOnly: true,
  },
  {
    name: 'make_market_call',
    description: 'Publicly predict bull or bear on a ticker (affects influence score)',
    category: 'social',
    parameters: {
      asset: { type: 'string', description: 'Ticker symbol', required: true },
      direction: { type: 'string', description: 'Prediction direction', required: true, enum: ['bullish', 'bearish'] },
    },
    handler: 'makeMarketCall',
    matchOnly: true,
  },

  /* ─── Navigation ───────────────────────────────────────────────── */
  {
    name: 'open_tab',
    description: 'Navigate to a main game tab (overview, globe, office, exchange, battlepass)',
    category: 'navigation',
    parameters: {
      tab: { type: 'string', description: 'Tab name', required: true, enum: ['overview', 'globe', 'office', 'exchange', 'battlepass'] },
    },
    handler: 'openTab',
  },
  {
    name: 'open_empire_tab',
    description: 'Open a specific panel inside the Globe/Empire view',
    category: 'navigation',
    parameters: {
      tab: { type: 'string', description: 'Empire panel name', required: true, enum: [
        'overview', 'market', 'assets', 'departments', 'office', 'routes', 'esg',
        'rnd', 'funds', 'defcon', 'shadow', 'perks', 'shopping', 'sports',
        'divisions', 'pvp', 'politics', 'luxury', 'news', 'ticker',
      ] },
    },
    handler: 'openEmpireTab',
  },
  {
    name: 'go_to_hub',
    description: 'Return to the onboarding hub / mode selection screen',
    category: 'navigation',
    parameters: {},
    handler: 'goToHub',
  },

  /* ─── Info / Read-only ─────────────────────────────────────────── */
  {
    name: 'get_balance',
    description: 'Get current company balance, personal balance, and net worth',
    category: 'info',
    parameters: {},
    handler: 'getBalance',
    readOnly: true,
  },
  {
    name: 'get_company_stats',
    description: 'Get full company stats: heat, growth, governance, impact, power, monthly income',
    category: 'info',
    parameters: {},
    handler: 'getCompanyStats',
    readOnly: true,
  },
  {
    name: 'get_leaderboard',
    description: 'Get current match leaderboard with rankings and scores',
    category: 'info',
    parameters: {},
    handler: 'getLeaderboard',
    readOnly: true,
    matchOnly: true,
  },
  {
    name: 'get_news',
    description: 'Get latest news bulletins with sentiment analysis',
    category: 'info',
    parameters: {
      category: { type: 'string', description: 'Filter by category', required: false, enum: ['markets', 'crypto', 'macro'] },
    },
    handler: 'getNews',
    readOnly: true,
  },
  {
    name: 'get_ticker',
    description: 'Get recent ticker events (latest activity log)',
    category: 'info',
    parameters: {
      count: { type: 'number', description: 'Number of events to return (default 10)', required: false },
    },
    handler: 'getTicker',
    readOnly: true,
  },
  {
    name: 'analyze_sector',
    description: 'Analyze sector allocation, income breakdown, and concentration risk',
    category: 'info',
    parameters: {},
    handler: 'analyzeSector',
    readOnly: true,
  },
  {
    name: 'refresh_news',
    description: 'Fetch a fresh batch of news bulletins',
    category: 'info',
    parameters: {
      category: { type: 'string', description: 'Category to refresh', required: false, enum: ['markets', 'crypto', 'macro'] },
    },
    handler: 'refreshNews',
  },

  /* ─── Proposals (Consultative Approval Flow) ──────────────────── */
  {
    name: 'submit_proposal',
    description: 'Submit a structured proposal for the player to approve or reject. ALWAYS use this before executing any costly or irreversible action. Include 2-3 tiered options (budget/standard/premium) with costs based on comparable in-game items.',
    category: 'info',
    parameters: {
      title: { type: 'string', description: 'Proposal title — what will be built/done', required: true },
      analysis: { type: 'string', description: 'Your analysis of the request: what exists, what\'s needed, market context, risks', required: true },
      option1_label: { type: 'string', description: 'Option 1 label (e.g. "Budget", "Minimal")', required: true },
      option1_desc: { type: 'string', description: 'What this option delivers', required: true },
      option1_cost: { type: 'number', description: 'Estimated cost in euros', required: true },
      option1_comparables: { type: 'string', description: 'Comma-separated list of comparable in-game items that justify the cost', required: true },
      option1_requirements: { type: 'string', description: 'Comma-separated prerequisites', required: false },
      option1_risks: { type: 'string', description: 'Comma-separated risks', required: false },
      option1_tools: { type: 'string', description: 'JSON array of tool calls to execute if approved: [{"name":"spawn_node","args":{"name":"X","type":"Y","country":"Z","capex":1000}}]. If omitted, cost is deducted but you must manually build after.', required: false },
      option1_tier: { type: 'string', description: 'Tier level', required: true, enum: ['budget', 'standard', 'premium', 'custom'] },
      option1_build_type: { type: 'string', description: 'What to build: node, instrument, event, mission. Used to auto-construct tool calls if option1_tools is omitted.', required: false },
      option1_build_name: { type: 'string', description: 'Name of the thing to build (e.g. "Angola Oil Platform")', required: false },
      option1_build_country: { type: 'string', description: 'Country for nodes (e.g. "Angola")', required: false },
      option1_build_sector: { type: 'string', description: 'Sector/type (e.g. "oil_gas", "tech", "finance")', required: false },
      option2_label: { type: 'string', description: 'Option 2 label', required: true },
      option2_desc: { type: 'string', description: 'What this option delivers', required: true },
      option2_cost: { type: 'number', description: 'Estimated cost in euros', required: true },
      option2_comparables: { type: 'string', description: 'Comma-separated comparables', required: true },
      option2_requirements: { type: 'string', description: 'Comma-separated prerequisites', required: false },
      option2_risks: { type: 'string', description: 'Comma-separated risks', required: false },
      option2_tools: { type: 'string', description: 'JSON array of tool calls if approved. Optional — use build params instead.', required: false },
      option2_tier: { type: 'string', description: 'Tier level', required: true, enum: ['budget', 'standard', 'premium', 'custom'] },
      option2_build_type: { type: 'string', description: 'What to build: node, instrument, event, mission', required: false },
      option2_build_name: { type: 'string', description: 'Name of the thing to build', required: false },
      option2_build_country: { type: 'string', description: 'Country for nodes', required: false },
      option2_build_sector: { type: 'string', description: 'Sector/type', required: false },
      option3_label: { type: 'string', description: 'Option 3 label (optional premium tier)', required: false },
      option3_desc: { type: 'string', description: 'What this option delivers', required: false },
      option3_cost: { type: 'number', description: 'Estimated cost', required: false },
      option3_comparables: { type: 'string', description: 'Comma-separated comparables', required: false },
      option3_requirements: { type: 'string', description: 'Comma-separated prerequisites', required: false },
      option3_risks: { type: 'string', description: 'Comma-separated risks', required: false },
      option3_tools: { type: 'string', description: 'JSON array of tool calls if approved. Optional.', required: false },
      option3_tier: { type: 'string', description: 'Tier level', required: false, enum: ['budget', 'standard', 'premium', 'custom'] },
      option3_build_type: { type: 'string', description: 'What to build: node, instrument, event, mission', required: false },
      option3_build_name: { type: 'string', description: 'Name of the thing to build', required: false },
      option3_build_country: { type: 'string', description: 'Country for nodes', required: false },
      option3_build_sector: { type: 'string', description: 'Sector/type', required: false },
    },
    handler: 'submitProposal',
  },
  {
    name: 'analyze_comparables',
    description: 'Analyze existing in-game items to find comparable pricing. Use this BEFORE submit_proposal to research costs. Returns nodes by sector/price, instruments by type/price, recent expansions, and financial benchmarks.',
    category: 'info',
    parameters: {
      category: { type: 'string', description: 'What to analyze', required: true, enum: ['nodes', 'instruments', 'events', 'missions', 'all'] },
      sector: { type: 'string', description: 'Filter by sector (optional)', required: false },
      priceRange: { type: 'string', description: 'Price range filter: "under_50k", "50k_200k", "200k_1m", "over_1m"', required: false },
    },
    handler: 'analyzeComparables',
    readOnly: true,
  },

  /* ─── Expansion (Real-Time Game Generation) ───────────────────── */
  {
    name: 'spawn_instrument',
    description: 'Create a brand new tradable instrument (stock, crypto, etc.) with custom price, sector, and lore. The instrument becomes immediately tradeable.',
    category: 'expansion',
    parameters: {
      symbol: { type: 'string', description: 'Ticker symbol (2-6 chars, e.g. QNTC)', required: true },
      name: { type: 'string', description: 'Full company/asset name', required: true },
      type: { type: 'string', description: 'Instrument type', required: true, enum: ['stock', 'crypto', 'forex', 'commodity', 'bond'] },
      price: { type: 'number', description: 'Starting price in euros', required: true },
      sector: { type: 'string', description: 'Sector (e.g. Technology, Energy, Healthcare)', required: false },
      description: { type: 'string', description: 'Brief description of the instrument', required: false },
      backstory: { type: 'string', description: 'Lore/narrative for why this instrument appeared', required: false },
      volatility: { type: 'string', description: 'Price volatility level', required: false, enum: ['low', 'medium', 'high', 'extreme'] },
      marketCapB: { type: 'number', description: 'Market cap in billions (for display)', required: false },
    },
    handler: 'spawnInstrument',
  },
  {
    name: 'create_event',
    description: 'Create a dynamic game event with player-choosable options that affect game state (balance, governance, power, impact, growth axes)',
    category: 'expansion',
    parameters: {
      title: { type: 'string', description: 'Event title', required: true },
      description: { type: 'string', description: 'Event narrative description', required: true },
      option1_label: { type: 'string', description: 'Label for choice 1', required: true },
      option1_desc: { type: 'string', description: 'Description of choice 1 outcome', required: true },
      option1_balance: { type: 'number', description: 'Balance multiplier for choice 1 (1.0 = no change, 0.9 = -10%)', required: false },
      option1_growth: { type: 'number', description: 'Growth axis change for choice 1', required: false },
      option2_label: { type: 'string', description: 'Label for choice 2', required: true },
      option2_desc: { type: 'string', description: 'Description of choice 2 outcome', required: true },
      option2_balance: { type: 'number', description: 'Balance multiplier for choice 2', required: false },
      option2_growth: { type: 'number', description: 'Growth axis change for choice 2', required: false },
      option3_label: { type: 'string', description: 'Label for choice 3 (optional)', required: false },
      option3_desc: { type: 'string', description: 'Description of choice 3 outcome', required: false },
      option3_balance: { type: 'number', description: 'Balance multiplier for choice 3', required: false },
      option3_growth: { type: 'number', description: 'Growth axis change for choice 3', required: false },
      minNetWorth: { type: 'number', description: 'Minimum net worth to trigger this event', required: false },
    },
    handler: 'createEvent',
  },
  {
    name: 'spawn_node',
    description: 'Create a new acquirable business node on the map with custom location, sector, and economics',
    category: 'expansion',
    parameters: {
      name: { type: 'string', description: 'Node/business name', required: true },
      type: { type: 'string', description: 'Sector type (e.g. tech, energy, finance, pharma)', required: true },
      lat: { type: 'number', description: 'Latitude coordinate', required: true },
      lng: { type: 'number', description: 'Longitude coordinate', required: true },
      country: { type: 'string', description: 'Country name', required: true },
      capex: { type: 'number', description: 'Capital expenditure to acquire (euros)', required: true },
      description: { type: 'string', description: 'Description of the business', required: false },
    },
    handler: 'spawnNode',
  },
  {
    name: 'create_mission',
    description: 'Create a dynamic mission/challenge for the player with objectives and rewards',
    category: 'expansion',
    parameters: {
      title: { type: 'string', description: 'Mission title', required: true },
      description: { type: 'string', description: 'Mission narrative', required: true },
      objective: { type: 'string', description: 'What the player must achieve', required: true },
      checkType: { type: 'string', description: 'How progress is measured', required: true, enum: ['balance', 'net_worth', 'nodes', 'portfolio_value', 'trade_count', 'heat', 'custom'] },
      targetValue: { type: 'number', description: 'Goal threshold to complete', required: true },
      rewardCash: { type: 'number', description: 'Cash reward in euros', required: false },
      rewardXp: { type: 'number', description: 'XP reward', required: false },
      rewardAp: { type: 'number', description: 'AP reward', required: false },
      deadlineMinutes: { type: 'number', description: 'Minutes until mission expires (0 = no deadline)', required: false },
    },
    handler: 'createMission',
  },
  {
    name: 'shift_market_regime',
    description: 'Shift the global market regime (bull/bear/crash/bubble/etc), affecting all instrument prices and volatility',
    category: 'expansion',
    parameters: {
      regime: { type: 'string', description: 'Target market regime', required: true, enum: ['bull', 'bear', 'volatile', 'crash', 'recovery', 'bubble', 'stable'] },
      reason: { type: 'string', description: 'Narrative reason for the regime shift', required: true },
      durationMinutes: { type: 'number', description: 'How long the regime lasts (default 5 min)', required: false },
    },
    handler: 'shiftRegime',
  },
  {
    name: 'inject_news',
    description: 'Inject a custom news article into the MarketWire feed',
    category: 'expansion',
    parameters: {
      headline: { type: 'string', description: 'News headline', required: true },
      body: { type: 'string', description: 'Full article body text', required: true },
      sentiment: { type: 'string', description: 'Market sentiment', required: true, enum: ['bullish', 'bearish', 'neutral'] },
      source: { type: 'string', description: 'News source name (default: ATHENA INTELLIGENCE)', required: false },
      category: { type: 'string', description: 'News category', required: false, enum: ['markets', 'crypto', 'macro', 'corporate', 'social'] },
    },
    handler: 'injectNews',
  },
  {
    name: 'get_expansion_status',
    description: 'Get current expansion status: dynamic instruments, active events, missions, market regime',
    category: 'expansion',
    parameters: {},
    handler: 'getExpansionStatus',
    readOnly: true,
  },
  {
    name: 'list_dynamic_instruments',
    description: 'List all dynamically spawned instruments with current prices',
    category: 'expansion',
    parameters: {},
    handler: 'listDynamicInstruments',
    readOnly: true,
  },

  /* ─── Code Generation ─────────────────────────────────────────── */
  {
    name: 'generate_code',
    description: 'Generate code for trading strategies, analysis scripts, automation bots, or financial models. Returns formatted code with explanation.',
    category: 'intel',
    parameters: {
      request: { type: 'string', description: 'What code to generate (e.g. "moving average crossover strategy", "portfolio risk calculator", "RSI divergence scanner")', required: true },
      language: { type: 'string', description: 'Programming language', required: false, enum: ['javascript', 'typescript', 'python', 'pseudocode'] },
    },
    handler: 'generateCode',
    readOnly: true,
  },

  /* ─── Infinite Game Engine — Feature Creation ────────────────── */
  {
    name: 'create_feature',
    description: 'Create a new game feature by generating JavaScript code. The code runs in a sandboxed environment with access to game.state, game.actions (spawnInstrument, createEvent, spawnNode, createMission, shiftRegime, injectNews, addMoney, deductMoney), and game.utils (random, uid, formatMoney, log). Auto-tests in sandbox before deployment.',
    category: 'expansion',
    parameters: {
      name: { type: 'string', description: 'Feature name (e.g. "Casino Minigame", "Oil Futures Market")', required: true },
      description: { type: 'string', description: 'What the feature does for the player', required: true },
      code: { type: 'string', description: 'JavaScript code using the game SDK (game.state, game.actions, game.utils)', required: true },
      trigger_description: { type: 'string', description: 'What this tool does when called (becomes the tool description)', required: true },
    },
    handler: 'createFeature',
  },
  {
    name: 'test_feature',
    description: 'Re-test an existing feature in the sandbox',
    category: 'expansion',
    parameters: {
      feature_id: { type: 'string', description: 'Feature ID to test', required: true },
    },
    handler: 'testFeature',
    readOnly: true,
  },
  {
    name: 'deploy_feature',
    description: 'Deploy a tested feature — registers it as a callable Athena tool',
    category: 'expansion',
    parameters: {
      feature_id: { type: 'string', description: 'Feature ID to deploy', required: true },
    },
    handler: 'deployFeature',
  },
  {
    name: 'publish_feature',
    description: 'Publish a deployed feature to the community marketplace for other players to install',
    category: 'social',
    parameters: {
      feature_id: { type: 'string', description: 'Feature ID to publish', required: true },
      category: { type: 'string', description: 'Category', required: false, enum: ['minigame', 'market', 'system', 'social', 'strategy', 'cosmetic'] },
    },
    handler: 'publishFeature',
  },
  {
    name: 'browse_features',
    description: 'Browse community-created features available for installation',
    category: 'info',
    parameters: {
      category: { type: 'string', description: 'Filter by category', required: false },
      sort: { type: 'string', description: 'Sort order', required: false, enum: ['popular', 'recent', 'rating'] },
    },
    handler: 'browseFeatures',
    readOnly: true,
  },
];

/* ── Helpers ───────────────────────────────────────────────────────── */

/** Convert tool definitions to the OpenAI-compatible tool schema format used by Blackbox AI */
/* ── Dynamic Tool Registry ─────────────────────────────────────────── */
// Tools installed at runtime by Athena when she can't find a built-in one.
// Persisted in athenaStore so they survive across messages.

let _dynamicTools: AthenaTool[] = [];

export function registerDynamicTool(tool: AthenaTool) {
  if (_dynamicTools.some(t => t.name === tool.name) || ATHENA_TOOLS.some(t => t.name === tool.name)) return;
  _dynamicTools.push(tool);
}

export function getDynamicTools(): AthenaTool[] { return _dynamicTools; }

export function setDynamicTools(tools: AthenaTool[]) { _dynamicTools = tools; }

export function getAllTools(): AthenaTool[] {
  return [...ATHENA_TOOLS, ..._dynamicTools];
}

export function toAPIToolSchemas() {
  return getAllTools().map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(tool.parameters).map(([key, param]) => [
            key,
            {
              type: param.type,
              description: param.description,
              ...(param.enum ? { enum: param.enum } : {}),
            },
          ])
        ),
        required: Object.entries(tool.parameters)
          .filter(([_, p]) => p.required)
          .map(([k]) => k),
      },
    },
  }));
}

/** Get tools filtered by match availability */
export function getAvailableTools(matchActive: boolean): AthenaTool[] {
  const all = getAllTools();
  if (matchActive) return all;
  return all.filter(t => !t.matchOnly);
}

/** Get tools grouped by category */
export function getToolsByCategory(matchActive: boolean): Record<ToolCategory, AthenaTool[]> {
  const available = getAvailableTools(matchActive);
  const grouped = {} as Record<ToolCategory, AthenaTool[]>;
  for (const tool of available) {
    if (!grouped[tool.category]) grouped[tool.category] = [];
    grouped[tool.category].push(tool);
  }
  return grouped;
}

/** Category display config */
export const CATEGORY_META: Record<ToolCategory, { label: string; icon: string }> = {
  trading:    { label: 'TRADING',    icon: '↗' },
  empire:     { label: 'EMPIRE',     icon: '⊕' },
  corporate:  { label: 'CORPORATE',  icon: '◈' },
  finance:    { label: 'FINANCE',    icon: '₿' },
  agents:     { label: 'AGENTS',     icon: '◇' },
  intel:      { label: 'INTEL',      icon: '🔓' },
  shadow:     { label: 'SHADOW',     icon: '⚡' },
  pvp:        { label: 'PvP',        icon: '⚔' },
  social:     { label: 'SOCIAL',     icon: '💬' },
  navigation: { label: 'NAVIGATE',   icon: '⊞' },
  info:       { label: 'INFO',       icon: '📊' },
  expansion:  { label: 'EXPANSION',  icon: '🔮' },
};
