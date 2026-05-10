// ── Social OS Data ───────────────────────────────────────────────────
// Mock NPC profiles, post templates, BizTok content clips

export interface SocialProfile {
  id: string;
  name: string;
  initial: string;
  color: string;
  level: number;
  tier: string;
  verified: boolean;
  bio: string;
  followers: number;
  following: number;
  nw: string;
}

export interface SocialPost {
  id: string;
  authorId: string;
  text: string;
  tags: string[];
  reactions: string[];
  likes: number;
  comments: number;
  timestamp: number; // ms since epoch (game-relative)
  replyTo?: string;
}

export interface BizTokClip {
  id: string;
  authorId: string;
  title: string;
  category: 'tip' | 'explainer' | 'news' | 'strategy' | 'mindset' | 'macro' | 'crypto' | 'options';
  text: string;           // main content paragraph
  keyTakeaway: string;    // bold one-liner
  likes: number;
  shares: number;
  saves: number;
  bgGradient: string;     // tailwind gradient classes
  icon: string;
}

// ── NPC Profiles ─────────────────────────────────────────────────────

export const NPC_PROFILES: Record<string, SocialProfile> = {
  alpha: { id: 'alpha', name: 'AlphaVortex', initial: 'V', color: 'rose', level: 20, tier: 'Diamond', verified: true, bio: 'Macro trader. 8-figure portfolio. Short premium, long vol.', followers: 142050, following: 12, nw: '€22.8M' },
  gekko: { id: 'gekko', name: 'GordonGekko', initial: 'G', color: 'yellow', level: 19, tier: 'Diamond', verified: true, bio: 'Greed is good. Corporate raider. LBO specialist.', followers: 98200, following: 4, nw: '€14.2M' },
  whale: { id: 'whale', name: 'WhaleHunter', initial: 'W', color: 'purple', level: 18, tier: 'Diamond', verified: true, bio: 'VC-backed. Series A secured. Building empires.', followers: 67400, following: 31, nw: '€8.9M' },
  quant: { id: 'quant', name: 'QuantKing', initial: 'Q', color: 'cyan', level: 15, tier: 'Platinum', verified: false, bio: 'Algorithmic trading. Data > emotion.', followers: 34500, following: 89, nw: '€5.1M' },
  ape: { id: 'ape', name: 'ApeLord', initial: 'A', color: 'amber', level: 9, tier: 'Gold', verified: false, bio: 'Degen turned disciplined. Options trader in training.', followers: 12800, following: 156, nw: '€3.2M' },
  neon: { id: 'neon', name: 'NeonTrader', initial: 'N', color: 'emerald', level: 6, tier: 'Silver', verified: false, bio: 'Day trader grinding the ladder. ECFL F2 in progress.', followers: 5200, following: 243, nw: '€2.1M' },
  dark: { id: 'dark', name: 'DarkPool', initial: 'D', color: 'indigo', level: 11, tier: 'Silver', verified: false, bio: 'Institutional flow watcher. Off-exchange volume analyst.', followers: 8900, following: 67, nw: '€1.8M' },
  sigma: { id: 'sigma', name: 'SigmaGrind', initial: 'S', color: 'pink', level: 8, tier: 'Gold', verified: false, bio: 'Compounding every day. No shortcuts.', followers: 4300, following: 112, nw: '€1.4M' },
  zero: { id: 'zero', name: 'ZeroDayExp', initial: 'Z', color: 'red', level: 5, tier: 'Bronze', verified: false, bio: '0DTE options specialist. High risk, high reward.', followers: 2100, following: 301, nw: '€980K' },
  bull: { id: 'bull', name: 'BullishBella', initial: 'B', color: 'emerald', level: 14, tier: 'Platinum', verified: true, bio: 'Long only. Quality growth picks. ECFL F3 certified.', followers: 28700, following: 45, nw: '€6.8M' },
  bear: { id: 'bear', name: 'BearMarketBro', initial: 'B', color: 'red', level: 13, tier: 'Gold', verified: false, bio: 'Contrarian. Shorts overvalued garbage. Put spreads.', followers: 19400, following: 23, nw: '€4.1M' },
  yield: { id: 'yield', name: 'YieldFarmer', initial: 'Y', color: 'amber', level: 16, tier: 'Platinum', verified: true, bio: 'DeFi native. Staking, LPs, real yield. Not your keys, not your coins.', followers: 41200, following: 78, nw: '€7.3M' },
  macro: { id: 'macro', name: 'MacroAthena', initial: 'M', color: 'purple', level: 17, tier: 'Platinum', verified: true, bio: 'Global macro strategist. Rates, FX, commodities. Central bank watcher.', followers: 52300, following: 34, nw: '€9.2M' },
  realty: { id: 'realty', name: 'RealtyKing', initial: 'R', color: 'amber', level: 12, tier: 'Gold', verified: true, bio: 'Commercial real estate mogul. REITs, cap rates, and cash flow analysis.', followers: 23100, following: 56, nw: '€5.5M' },
  esg: { id: 'esg', name: 'GreenAlpha', initial: 'G', color: 'emerald', level: 10, tier: 'Gold', verified: false, bio: 'ESG investing advocate. Sustainable returns. Impact over extraction.', followers: 15800, following: 128, nw: '€3.8M' },
  bond: { id: 'bond', name: 'BondVillain', initial: 'B', color: 'indigo', level: 16, tier: 'Platinum', verified: true, bio: 'Fixed income specialist. Duration, convexity, credit spreads.', followers: 38900, following: 19, nw: '€7.1M' },
  tax: { id: 'tax', name: 'TaxHavens', initial: 'T', color: 'red', level: 7, tier: 'Silver', verified: false, bio: 'Tax optimization enthusiast. Jurisdictions, structures, offshore strategy.', followers: 8400, following: 198, nw: '€2.4M' },
  whale2: { id: 'whale2', name: 'DeepValue', initial: 'D', color: 'cyan', level: 19, tier: 'Diamond', verified: true, bio: 'Deep value investor. Buying what nobody wants. Patience is the edge.', followers: 89600, following: 8, nw: '€18.5M' },
  momentum: { id: 'momentum', name: 'MomoTrader', initial: 'M', color: 'pink', level: 11, tier: 'Gold', verified: false, bio: 'Momentum is everything. Trend following. Price action only.', followers: 16200, following: 145, nw: '€4.2M' },
  retail: { id: 'retail', name: 'RetailRevolt', initial: 'R', color: 'yellow', level: 4, tier: 'Bronze', verified: false, bio: 'Small account, big dreams. Learning options. Diamond hands.', followers: 1800, following: 412, nw: '€450K' },
};

// ── Post Templates (NPC-generated content) ──────────────────────────
// These get shuffled and served as the "feed". Timestamps are relative offsets in minutes.

export const POST_TEMPLATES: Omit<SocialPost, 'id' | 'timestamp'>[] = [
  { authorId: 'alpha', text: 'Macro thesis: The Fed pivot is priced in but the earnings revision cycle hasn\'t started. Short $SPY puts, long $TLT calls. This is the generational setup.', tags: ['SPY', 'TLT'], reactions: ['fire', 'chart', 'money'], likes: 312, comments: 87 },
  { authorId: 'alpha', text: 'Closed my $AAPL short at the 168 support for +€340k profit. Portfolio diversity score now 94%. The hedging module in the curriculum is underrated -- go study it.', tags: ['AAPL'], reactions: ['fire', 'money', 'chart'], likes: 156, comments: 44 },
  { authorId: 'gekko', text: 'Remember: the market can stay irrational longer than you can stay solvent. Size your positions accordingly. I\'ve been burned by overleveraging in 2022 — never again.', tags: [], reactions: ['fire', 'rocket'], likes: 201, comments: 56 },
  { authorId: 'gekko', text: 'Just completed a hostile takeover of a mid-cap pharma company. Stripped the underperforming divisions, sold the IP. Pure value extraction. This is the way.', tags: [], reactions: ['money', 'fire'], likes: 178, comments: 63 },
  { authorId: 'whale', text: 'Just secured my Series A for the new R&D lab structure. The leverage capacity is insane. #IPOTrack', tags: [], reactions: ['fire', 'rocket'], likes: 47, comments: 12 },
  { authorId: 'whale', text: 'Pro tip for aspiring empire builders: your first three acquisitions should be cash-flow positive. Growth burns capital faster than you think.', tags: [], reactions: ['fire', 'chart'], likes: 94, comments: 28 },
  { authorId: 'quant', text: '$NVDA breaking out of the ascending triangle on the 4H. Price target ~€1,420. Already loaded calls at 1350 strike. This is the setup.', tags: ['NVDA'], reactions: ['chart', 'fire'], likes: 83, comments: 31 },
  { authorId: 'quant', text: 'Backtested my mean-reversion strategy over 10 years of data. Sharpe ratio 2.4. Deploying next week in MarketLab first.', tags: [], reactions: ['chart', 'rocket'], likes: 67, comments: 19 },
  { authorId: 'ape', text: 'Just hit Level 9 and unlocked Derivatives trading. First options play: bought $TSLA 280c weeklies. Wish me luck.', tags: ['TSLA'], reactions: ['rocket'], likes: 29, comments: 8 },
  { authorId: 'ape', text: 'Down 40% on my first options trade. Lesson learned: don\'t buy OTM weeklies on a Friday. Back to the Lab.', tags: ['TSLA'], reactions: ['fire'], likes: 52, comments: 24 },
  { authorId: 'neon', text: '7-day win streak! Every single day trade in profit. The Market Lab practice mode actually works if you put in the hours. Currently grinding toward Gold tier.', tags: [], reactions: ['fire'], likes: 64, comments: 19 },
  { authorId: 'neon', text: 'Just finished the ECFL F1 certification — passed all 4 exams on the first try. The curriculum is actually legit. Now grinding F2 modules.', tags: [], reactions: ['rocket', 'fire'], likes: 89, comments: 23 },
  { authorId: 'bull', text: 'My thesis on $MSFT hasn\'t changed in 3 years. Quality compounders with pricing power in an inflationary regime. Simple but effective.', tags: ['MSFT'], reactions: ['chart', 'money'], likes: 134, comments: 41 },
  { authorId: 'bull', text: 'Portfolio review: 12 positions, all profitable. Average holding period 8 months. Patience is the edge.', tags: [], reactions: ['fire', 'money'], likes: 112, comments: 33 },
  { authorId: 'bear', text: 'Shorted $MEME at the top. Position already +€120k. Overvalued garbage always reverts. Do the fundamental analysis.', tags: ['MEME'], reactions: ['chart', 'fire'], likes: 97, comments: 38 },
  { authorId: 'bear', text: 'Everyone\'s a genius in a bull market. The real test comes when the tide goes out. Are you hedged?', tags: [], reactions: ['fire'], likes: 145, comments: 52 },
  { authorId: 'yield', text: 'New LP position yielding 28% APR on the ETH/USDC pool. Real yield, no token inflation. DeFi is evolving.', tags: ['ETH'], reactions: ['money', 'rocket'], likes: 76, comments: 21 },
  { authorId: 'yield', text: 'Staking rewards hitting €4.2k/month now. Passive income is the ultimate flex. Build the machine, let it compound.', tags: [], reactions: ['money', 'fire'], likes: 108, comments: 35 },
  { authorId: 'dark', text: 'Unusual options activity detected on $AMD — 50k contracts at the 180 strike, 2 weeks out. Someone knows something.', tags: ['AMD'], reactions: ['chart', 'fire'], likes: 89, comments: 27 },
  { authorId: 'sigma', text: 'Day 247 of compounding. Small consistent gains beat home runs. €200/day = €73k/year. Math is undefeated.', tags: [], reactions: ['fire', 'chart'], likes: 71, comments: 18 },
  { authorId: 'zero', text: 'Turned €500 into €12k on 0DTE $SPX calls. Don\'t try this at home. Actually, try it in the Lab first.', tags: ['SPX'], reactions: ['rocket', 'fire', 'money'], likes: 203, comments: 67 },
  { authorId: 'macro', text: 'The ECB is trapped. Cut rates and inflation spikes. Hold rates and Southern Europe implodes. This is the trade of the decade — short EUR/CHF.', tags: ['EUR', 'CHF'], reactions: ['chart', 'fire'], likes: 189, comments: 54 },
  { authorId: 'macro', text: 'Central banks don\'t control markets. They ARE the market. Every allocation decision you make is a bet on monetary policy. Study the dot plot.', tags: [], reactions: ['fire'], likes: 234, comments: 71 },
  { authorId: 'realty', text: 'Cap rate compression in logistics real estate is insane. Warehouses near major ports trading at 3.5% caps. We\'re in a bubble but the music hasn\'t stopped.', tags: [], reactions: ['chart', 'money'], likes: 87, comments: 23 },
  { authorId: 'realty', text: 'My rule: never buy real estate with a cash-on-cash return below 8%. Appreciation is gravy. Cash flow is king.', tags: [], reactions: ['fire', 'money'], likes: 145, comments: 41 },
  { authorId: 'esg', text: 'ESG isn\'t charity — it\'s risk management. Companies with strong ESG scores outperform during drawdowns. The data is clear.', tags: [], reactions: ['chart', 'fire'], likes: 112, comments: 33 },
  { authorId: 'esg', text: 'Just divested from all fossil fuel positions. Portfolio Sharpe ratio actually improved. Sustainable investing works.', tags: [], reactions: ['rocket', 'fire'], likes: 78, comments: 29 },
  { authorId: 'bond', text: 'Investment grade credit spreads at 90bps. Not enough compensation for the risk. Staying short duration until spreads widen to 150+.', tags: [], reactions: ['chart'], likes: 167, comments: 48 },
  { authorId: 'bond', text: 'The 10-year just broke 4.5%. This is the generational bond buying opportunity everyone\'s been waiting for. Loading TLT calls.', tags: ['TLT'], reactions: ['fire', 'money', 'chart'], likes: 298, comments: 89 },
  { authorId: 'tax', text: 'Moved my holding company to a jurisdiction with 0% capital gains tax. Legal, optimized, and saving €340k/year. Structure matters more than returns.', tags: [], reactions: ['money', 'fire'], likes: 203, comments: 67 },
  { authorId: 'tax', text: 'Transfer pricing is the most underrated skill in finance. If you\'re not optimizing your inter-entity flows, you\'re leaving money on the table.', tags: [], reactions: ['money'], likes: 94, comments: 28 },
  { authorId: 'whale2', text: 'Bought a steel manufacturer at 0.4x book value today. Everyone hates cyclicals at the bottom. That\'s exactly when you buy.', tags: [], reactions: ['chart', 'money'], likes: 312, comments: 92 },
  { authorId: 'whale2', text: 'Buffett\'s biggest edge isn\'t stock picking — it\'s temperament. The ability to do nothing for years until the perfect pitch comes.', tags: [], reactions: ['fire'], likes: 456, comments: 134 },
  { authorId: 'momentum', text: 'Price action doesn\'t lie. $NVDA breaking out of a 3-month base on volume. This is a textbook momentum entry.', tags: ['NVDA'], reactions: ['chart', 'rocket'], likes: 134, comments: 37 },
  { authorId: 'momentum', text: 'Trend is your friend until it ends. 50 MA crossed above 200 MA on the weekly. Golden cross confirmed. Full position.', tags: [], reactions: ['chart', 'fire'], likes: 98, comments: 26 },
  { authorId: 'retail', text: 'Day 47 of my trading journey. Turned my €5,000 account into €4,200. Learning expensive lessons but not giving up.', tags: [], reactions: ['fire'], likes: 342, comments: 156 },
  { authorId: 'retail', text: 'Just passed ECFL F1 Module 2! Understanding risk management changed everything. My win rate went from 30% to 55%.', tags: [], reactions: ['rocket', 'fire'], likes: 189, comments: 67 },
  { authorId: 'alpha', text: 'Volatility surface is mispriced. The skew on 3-month $SPX puts is too steep relative to realized vol. Selling put spreads here.', tags: ['SPX'], reactions: ['chart', 'money'], likes: 178, comments: 52 },
  { authorId: 'gekko', text: 'The difference between a trader and a gambler? A trader has a written plan before entering every single position. No exceptions.', tags: [], reactions: ['fire'], likes: 267, comments: 78 },
  { authorId: 'dark', text: 'Block trade alert: someone just moved 2M shares of $AMZN in a single dark pool transaction. Institutional repositioning underway.', tags: ['AMZN'], reactions: ['chart', 'fire'], likes: 156, comments: 43 },
  { authorId: 'sigma', text: 'Month 9 of the compound journal. Total return: +34.2%. Not from one big trade — from 200 small disciplined ones.', tags: [], reactions: ['fire', 'money'], likes: 198, comments: 54 },
  { authorId: 'yield', text: 'New restaking protocol just launched. Stacking ETH staking yield + restaking yield + points = 18% real yield. DeFi innovation is alive.', tags: ['ETH'], reactions: ['money', 'rocket'], likes: 167, comments: 45 },
  { authorId: 'bear', text: 'Commercial real estate is the next shoe to drop. Office vacancy rates at 20%+. Regional banks loaded with CRE loans. Short XLF.', tags: ['XLF'], reactions: ['chart', 'fire'], likes: 223, comments: 71 },
  { authorId: 'quant', text: 'Feature importance analysis on my ML model: order flow imbalance explains 38% of short-term price movement. Fundamentals? 4%.', tags: [], reactions: ['chart'], likes: 145, comments: 39 },
  { authorId: 'bull', text: 'Added $COST to my forever portfolio. 97% membership renewal rate. Pricing power in any economy. This is compounding personified.', tags: ['COST'], reactions: ['money', 'chart'], likes: 189, comments: 52 },
];

// ── BizTok Clips ─────────────────────────────────────────────────────
// Vertical short-form educational business content

export const BIZTOK_CLIPS: Omit<BizTokClip, 'id'>[] = [
  // Tips
  { authorId: 'alpha', category: 'tip', title: 'The 2% Rule', text: 'Never risk more than 2% of your portfolio on a single trade. If your account is €100k, your max loss per trade should be €2k. This isn\'t conservative — it\'s how professionals survive long enough to compound.', keyTakeaway: 'Risk 2% max per trade. Survival > home runs.', likes: 4821, shares: 1203, saves: 892, bgGradient: 'from-rose-900/40 via-[#0a0f1a] to-rose-900/20', icon: '🎯' },
  { authorId: 'gekko', category: 'tip', title: 'The Power of Compound Interest', text: 'Einstein called it the 8th wonder of the world. €10,000 compounding at 15% annually becomes €40,455 in 10 years and €163,665 in 20 years. Start early, stay consistent, let math do the heavy lifting.', keyTakeaway: '15% annual returns = 16x in 20 years.', likes: 6234, shares: 2456, saves: 1834, bgGradient: 'from-yellow-900/40 via-[#0a0f1a] to-yellow-900/20', icon: '📈' },
  { authorId: 'bull', category: 'tip', title: 'Dollar-Cost Averaging', text: 'DCA means investing a fixed amount at regular intervals regardless of price. You buy more shares when prices are low and fewer when high. Over time, this reduces your average cost basis and removes emotion from the equation.', keyTakeaway: 'Automate your entries. Remove emotion.', likes: 3567, shares: 987, saves: 1456, bgGradient: 'from-emerald-900/40 via-[#0a0f1a] to-emerald-900/20', icon: '🔄' },

  // Explainers
  { authorId: 'quant', category: 'explainer', title: 'What Are Options?', text: 'Options give you the RIGHT (not obligation) to buy or sell at a specific price before a specific date. Calls = bullish bets, Puts = bearish bets. The premium is the price you pay for this right. Think of it like insurance for your portfolio.', keyTakeaway: 'Calls = right to buy. Puts = right to sell.', likes: 8912, shares: 3201, saves: 4567, bgGradient: 'from-cyan-900/40 via-[#0a0f1a] to-cyan-900/20', icon: '📊' },
  { authorId: 'dark', category: 'explainer', title: 'How Short Selling Works', text: 'You borrow shares, sell them immediately, then buy them back later (hopefully cheaper). Your profit = sell price - buy price. Risk: unlimited losses if the stock goes up. Short selling is the hedge fund\'s favorite tool.', keyTakeaway: 'Sell high, buy low. Unlimited risk if wrong.', likes: 5678, shares: 1890, saves: 2345, bgGradient: 'from-indigo-900/40 via-[#0a0f1a] to-indigo-900/20', icon: '📉' },
  { authorId: 'whale', category: 'explainer', title: 'P/E Ratio Decoded', text: 'Price-to-Earnings ratio = Stock Price / Earnings Per Share. A P/E of 20 means you\'re paying €20 for every €1 of earnings. High P/E = growth expectations. Low P/E = value play or declining business. Always compare within the same sector.', keyTakeaway: 'P/E tells you what the market expects.', likes: 7234, shares: 2678, saves: 3456, bgGradient: 'from-purple-900/40 via-[#0a0f1a] to-purple-900/20', icon: '🔍' },
  { authorId: 'yield', category: 'explainer', title: 'What is DeFi?', text: 'Decentralized Finance replaces banks with smart contracts. Lending, borrowing, trading — all without intermediaries. Yield farming = providing liquidity for returns. Higher yields = higher risk. Always check if the yield is sustainable or just token emissions.', keyTakeaway: 'DeFi = finance without banks. DYOR always.', likes: 4123, shares: 1567, saves: 2089, bgGradient: 'from-amber-900/40 via-[#0a0f1a] to-amber-900/20', icon: '🌐' },

  // Strategy
  { authorId: 'alpha', category: 'strategy', title: 'The Barbell Strategy', text: 'Put 90% in ultra-safe assets (bonds, index funds) and 10% in high-risk/high-reward bets (options, crypto, startups). You cap your downside while keeping unlimited upside. Nassim Taleb\'s favorite approach.', keyTakeaway: '90% safe + 10% moonshots = antifragile.', likes: 5432, shares: 1876, saves: 2901, bgGradient: 'from-rose-900/40 via-[#0a0f1a] to-rose-900/20', icon: '⚖️' },
  { authorId: 'bear', category: 'strategy', title: 'Sector Rotation', text: 'Different sectors outperform at different points in the economic cycle. Early recovery: tech & consumer discretionary. Late cycle: energy & utilities. Recession: healthcare & consumer staples. Follow the cycle, not the hype.', keyTakeaway: 'Rotate sectors with the economic cycle.', likes: 3890, shares: 1234, saves: 1678, bgGradient: 'from-red-900/40 via-[#0a0f1a] to-red-900/20', icon: '🔀' },
  { authorId: 'quant', category: 'strategy', title: 'Mean Reversion Trading', text: 'When a stock moves too far from its average, it tends to snap back. Use Bollinger Bands or RSI to spot extremes. Buy when RSI < 30, sell when RSI > 70. Works best in range-bound markets, fails in strong trends.', keyTakeaway: 'Extremes revert. RSI < 30 = oversold.', likes: 4567, shares: 1345, saves: 2123, bgGradient: 'from-cyan-900/40 via-[#0a0f1a] to-cyan-900/20', icon: '🎯' },

  // Macro
  { authorId: 'gekko', category: 'macro', title: 'Interest Rates & Stocks', text: 'When rates go up, borrowing costs increase, earnings compress, and stock valuations fall. When rates go down, it\'s the opposite — cheap money fuels asset prices. The Fed is the most powerful force in markets. Don\'t fight the Fed.', keyTakeaway: 'Rates up = stocks down. Don\'t fight the Fed.', likes: 7890, shares: 3456, saves: 4123, bgGradient: 'from-yellow-900/40 via-[#0a0f1a] to-yellow-900/20', icon: '🏛️' },
  { authorId: 'bull', category: 'macro', title: 'Inflation 101', text: 'Inflation erodes purchasing power. €100 today is worth €85 in 5 years at 3% inflation. Stocks historically beat inflation. Real estate hedges inflation. Cash is the worst asset in inflationary periods. Protect your purchasing power.', keyTakeaway: 'Cash loses value. Assets hedge inflation.', likes: 5678, shares: 2345, saves: 3012, bgGradient: 'from-emerald-900/40 via-[#0a0f1a] to-emerald-900/20', icon: '💰' },
  { authorId: 'dark', category: 'macro', title: 'The Yield Curve', text: 'When short-term bonds yield MORE than long-term bonds, the yield curve inverts. This has predicted every US recession since 1970. Inversion → recession usually within 12-18 months. Watch the 2Y/10Y spread like a hawk.', keyTakeaway: 'Inverted yield curve = recession warning.', likes: 6543, shares: 2890, saves: 3456, bgGradient: 'from-indigo-900/40 via-[#0a0f1a] to-indigo-900/20', icon: '📊' },

  // Mindset
  { authorId: 'sigma', category: 'mindset', title: 'The Journaling Edge', text: 'Top traders journal every trade — entry reason, exit reason, emotions, lessons. After 100 trades, patterns emerge: you\'ll see when you\'re disciplined and when you\'re emotional. Self-awareness is the ultimate alpha.', keyTakeaway: 'Journal every trade. Patterns reveal alpha.', likes: 3456, shares: 890, saves: 1567, bgGradient: 'from-pink-900/40 via-[#0a0f1a] to-pink-900/20', icon: '📝' },
  { authorId: 'neon', category: 'mindset', title: 'Loss Aversion Trap', text: 'Losing €100 hurts 2x more than gaining €100 feels good. This causes traders to hold losers too long and sell winners too early. Set stop-losses BEFORE entering. Let winners run. Cut losers fast.', keyTakeaway: 'Cut losers fast. Let winners run.', likes: 4890, shares: 1678, saves: 2345, bgGradient: 'from-emerald-900/40 via-[#0a0f1a] to-emerald-900/20', icon: '🧠' },
  { authorId: 'alpha', category: 'mindset', title: 'Process Over Outcome', text: 'A good trade can lose money. A bad trade can make money. Judge your decisions by the PROCESS, not the result. If you followed your system and lost, that\'s fine. If you gambled and won, that\'s dangerous.', keyTakeaway: 'Good process > lucky outcomes.', likes: 6789, shares: 2345, saves: 3678, bgGradient: 'from-rose-900/40 via-[#0a0f1a] to-rose-900/20', icon: '⚙️' },

  // Crypto
  { authorId: 'yield', category: 'crypto', title: 'Bitcoin Halving Cycle', text: 'Every ~4 years, Bitcoin\'s mining reward halves. Less supply + same/more demand = price increase. Historically: 2012, 2016, 2020 halvings preceded massive bull runs. The next halving is a known catalyst — position accordingly.', keyTakeaway: 'Halvings reduce supply. Historically bullish.', likes: 8234, shares: 3456, saves: 4567, bgGradient: 'from-amber-900/40 via-[#0a0f1a] to-amber-900/20', icon: '₿' },
  { authorId: 'zero', category: 'crypto', title: 'Not Your Keys, Not Your Coins', text: 'FTX, Mt. Gox, Celsius — all collapsed with customer funds. If your crypto is on an exchange, it\'s not really yours. Use hardware wallets for long-term holdings. Only keep trading amounts on exchanges.', keyTakeaway: 'Self-custody your crypto. Exchanges fail.', likes: 7123, shares: 2890, saves: 3901, bgGradient: 'from-red-900/40 via-[#0a0f1a] to-red-900/20', icon: '🔑' },

  // Options
  { authorId: 'quant', category: 'options', title: 'Theta Decay', text: 'Options lose value every day just from time passing — this is theta decay. It accelerates in the last 30 days. Option BUYERS fight theta. Option SELLERS collect theta. The house always wins? Be the house.', keyTakeaway: 'Time decay accelerates. Sell premium.', likes: 5432, shares: 1890, saves: 2678, bgGradient: 'from-cyan-900/40 via-[#0a0f1a] to-cyan-900/20', icon: '⏳' },
  { authorId: 'bear', category: 'options', title: 'Protective Puts', text: 'Own 100 shares of $AAPL? Buy a put option below current price. If the stock crashes, your put gains offset the stock loss. It\'s like insurance — you pay a small premium to sleep at night. Portfolio protection 101.', keyTakeaway: 'Buy puts to insure your stock positions.', likes: 4123, shares: 1234, saves: 1890, bgGradient: 'from-red-900/40 via-[#0a0f1a] to-red-900/20', icon: '🛡️' },

  // News/current events style
  { authorId: 'alpha', category: 'news', title: 'Earnings Season Playbook', text: 'Don\'t hold options through earnings — IV crush will destroy your premium even if you\'re right on direction. Instead: sell premium before earnings (high IV) or trade the post-earnings move. Let the volatility work FOR you.', keyTakeaway: 'IV crush kills options. Sell before earnings.', likes: 5678, shares: 2012, saves: 2890, bgGradient: 'from-rose-900/40 via-[#0a0f1a] to-rose-900/20', icon: '📅' },
  { authorId: 'whale', category: 'news', title: 'IPO Red Flags', text: 'No profitability path? Red flag. Insiders selling at IPO? Red flag. Revenue growth decelerating? Red flag. 90% of IPOs underperform the S&P 500 in year one. Wait 6 months, let the lockup expire, then evaluate.', keyTakeaway: 'Most IPOs are traps. Wait 6 months.', likes: 4890, shares: 1678, saves: 2345, bgGradient: 'from-purple-900/40 via-[#0a0f1a] to-purple-900/20', icon: '🚩' },
  { authorId: 'bond', category: 'explainer', title: 'Bond Duration Explained', text: 'Duration measures bond price sensitivity to interest rates. A bond with 7-year duration drops ~7% if rates rise 1%. Longer duration = more rate risk. In a rising rate environment, stay short duration.', keyTakeaway: 'Duration = rate sensitivity. Short when rates rise.', likes: 5234, shares: 1890, saves: 2345, bgGradient: 'from-indigo-900/40 via-[#0a0f1a] to-indigo-900/20', icon: '⏱️' },
  { authorId: 'macro', category: 'macro', title: 'The Dollar Milkshake Theory', text: 'When global liquidity tightens, capital flows INTO the US dollar because it\'s the world reserve currency. The dollar "sucks up" global capital like a milkshake. Strong dollar crushes emerging markets and commodities.', keyTakeaway: 'Dollar strength = EM pain. Follow the flows.', likes: 7891, shares: 3456, saves: 4123, bgGradient: 'from-purple-900/40 via-[#0a0f1a] to-purple-900/20', icon: '🥤' },
  { authorId: 'realty', category: 'strategy', title: 'The BRRRR Method', text: 'Buy, Rehab, Rent, Refinance, Repeat. Buy undervalued property, fix it up, rent it out, refinance to pull cash out, use that cash to buy the next one. Infinite scaling with finite capital.', keyTakeaway: 'BRRRR = infinite real estate scaling.', likes: 6543, shares: 2678, saves: 3890, bgGradient: 'from-amber-900/40 via-[#0a0f1a] to-amber-900/20', icon: '🏠' },
  { authorId: 'esg', category: 'tip', title: 'Green Bonds 101', text: 'Green bonds fund environmental projects — renewable energy, clean transport, sustainable buildings. Returns comparable to regular bonds but your capital actively fights climate change. €500B+ issued annually.', keyTakeaway: 'Green bonds = market returns + positive impact.', likes: 3456, shares: 987, saves: 1678, bgGradient: 'from-emerald-900/40 via-[#0a0f1a] to-emerald-900/20', icon: '🌱' },
  { authorId: 'tax', category: 'strategy', title: 'Tax Loss Harvesting', text: 'Sell losing positions to offset capital gains tax. Replace with similar (not identical) assets to maintain exposure. In a €100k gain year, harvesting €30k in losses saves €9k in taxes at 30%. Free money from discipline.', keyTakeaway: 'Harvest losses to offset gains. Legal tax alpha.', likes: 5678, shares: 2012, saves: 3456, bgGradient: 'from-red-900/40 via-[#0a0f1a] to-red-900/20', icon: '📉' },
  { authorId: 'whale2', category: 'mindset', title: 'The Margin of Safety', text: 'Benjamin Graham\'s most important concept: never pay full price. If a stock is worth €100, buy at €70. The 30% discount is your margin of safety — protection against errors in your analysis.', keyTakeaway: 'Buy at a discount. The gap is your protection.', likes: 8234, shares: 3456, saves: 4890, bgGradient: 'from-cyan-900/40 via-[#0a0f1a] to-cyan-900/20', icon: '🛡️' },
  { authorId: 'momentum', category: 'strategy', title: 'Relative Strength Rotation', text: 'Compare sector performance to the broad market. Buy sectors showing increasing relative strength. Sell when RS starts declining. Momentum persists — winners keep winning for months.', keyTakeaway: 'Rotate into strength. Winners keep winning.', likes: 4567, shares: 1345, saves: 2123, bgGradient: 'from-pink-900/40 via-[#0a0f1a] to-pink-900/20', icon: '🔄' },
  { authorId: 'alpha', category: 'options', title: 'The Iron Condor', text: 'Sell an OTM put spread and an OTM call spread simultaneously. You profit if the stock stays in a range. Max profit = premiums collected. Works best in low-volatility, range-bound markets.', keyTakeaway: 'Iron condor = profit from range. Sell both sides.', likes: 5432, shares: 1890, saves: 2678, bgGradient: 'from-rose-900/40 via-[#0a0f1a] to-rose-900/20', icon: '🦅' },
  { authorId: 'gekko', category: 'explainer', title: 'What is a Leveraged Buyout?', text: 'Use borrowed money (debt) to acquire a company. Use the company\'s own cash flow to repay the debt. If it works, you bought a company with other people\'s money. If it fails, the company goes bankrupt.', keyTakeaway: 'LBO = buy companies with borrowed money.', likes: 6789, shares: 2345, saves: 3456, bgGradient: 'from-yellow-900/40 via-[#0a0f1a] to-yellow-900/20', icon: '🏦' },
  { authorId: 'yield', category: 'crypto', title: 'Liquid Staking Explained', text: 'Stake your ETH but get a liquid token (stETH) in return. Use stETH as collateral in DeFi while still earning staking rewards. Capital efficiency maximized. Double-dip your yield.', keyTakeaway: 'Liquid staking = earn yield + stay liquid.', likes: 5678, shares: 2012, saves: 2890, bgGradient: 'from-amber-900/40 via-[#0a0f1a] to-amber-900/20', icon: '💧' },
  { authorId: 'quant', category: 'explainer', title: 'Sharpe Ratio Decoded', text: 'Sharpe Ratio = (Return - Risk-Free Rate) / Standard Deviation. It measures risk-adjusted returns. Above 1.0 = good. Above 2.0 = excellent. Above 3.0 = suspicious. Always compare Sharpe, not raw returns.', keyTakeaway: 'Sharpe > 1 good, > 2 great, > 3 suspicious.', likes: 7234, shares: 2890, saves: 3678, bgGradient: 'from-cyan-900/40 via-[#0a0f1a] to-cyan-900/20', icon: '📐' },
  { authorId: 'bear', category: 'macro', title: 'Debt-to-GDP Ratio', text: 'When a country\'s debt exceeds 100% of GDP, growth slows and crisis risk rises. Japan: 260%. USA: 124%. Italy: 140%. The math doesn\'t lie — sovereign debt crises are mathematical certainties.', keyTakeaway: 'Debt/GDP > 100% = long-term growth killer.', likes: 6543, shares: 2678, saves: 3456, bgGradient: 'from-red-900/40 via-[#0a0f1a] to-red-900/20', icon: '💣' },
  { authorId: 'neon', category: 'tip', title: 'The 3-Bar Play', text: 'Wait for a strong move (bar 1), then a narrow-range pullback (bar 2), then enter when price breaks bar 2\'s high (bar 3). Simple, mechanical, and effective for day trading momentum stocks.', keyTakeaway: '3 bars: move, pullback, breakout. Simple edge.', likes: 3890, shares: 1234, saves: 1678, bgGradient: 'from-emerald-900/40 via-[#0a0f1a] to-emerald-900/20', icon: '📊' },
  { authorId: 'dark', category: 'explainer', title: 'What Are Dark Pools?', text: 'Private exchanges where institutional investors trade large blocks without showing orders publicly. About 40% of US equity volume runs through dark pools. When you see unusual dark pool activity, smart money is positioning.', keyTakeaway: 'Dark pools = hidden institutional trading.', likes: 5678, shares: 2345, saves: 3012, bgGradient: 'from-indigo-900/40 via-[#0a0f1a] to-indigo-900/20', icon: '🌑' },
  { authorId: 'sigma', category: 'mindset', title: 'The Power of Position Sizing', text: 'A 50% win rate strategy can be profitable with proper position sizing. Risk 1% per trade, and even 10 consecutive losses only draw down 10%. Risk 10% per trade, and 3 losses wipe out 27%. Size matters more than win rate.', keyTakeaway: 'Position size > win rate for survival.', likes: 4890, shares: 1678, saves: 2345, bgGradient: 'from-pink-900/40 via-[#0a0f1a] to-pink-900/20', icon: '⚖️' },
  { authorId: 'retail', category: 'mindset', title: 'Beginner\'s Mind Advantage', text: 'New traders have one edge: no bad habits. You haven\'t been conditioned to revenge trade, overtrade, or average down into losers. Protect your beginner\'s mind. Build systems before biases.', keyTakeaway: 'New traders: build systems before bad habits.', likes: 3456, shares: 890, saves: 1567, bgGradient: 'from-yellow-900/40 via-[#0a0f1a] to-yellow-900/20', icon: '🌱' },
  { authorId: 'macro', category: 'news', title: 'BRICS Currency Threat', text: 'BRICS nations are building alternative payment systems to bypass the US dollar. If successful, dollar demand drops, US borrowing costs rise, and the entire global financial architecture shifts. This is the biggest macro story of the decade.', keyTakeaway: 'De-dollarization = macro regime change.', likes: 8912, shares: 3890, saves: 4567, bgGradient: 'from-purple-900/40 via-[#0a0f1a] to-purple-900/20', icon: '🌍' },
  { authorId: 'bond', category: 'tip', title: 'The Bond Ladder Strategy', text: 'Buy bonds maturing at different intervals (1, 3, 5, 7, 10 years). As each matures, reinvest at the long end. You get steady income, reduce rate risk, and always have liquidity. The boring strategy that actually works.', keyTakeaway: 'Ladder your bonds. Steady income, low risk.', likes: 4123, shares: 1234, saves: 1890, bgGradient: 'from-indigo-900/40 via-[#0a0f1a] to-indigo-900/20', icon: '🪜' },
  { authorId: 'whale2', category: 'strategy', title: 'Concentrated vs Diversified', text: 'Buffett: "Diversification is protection against ignorance." If you deeply understand 5 companies, you\'ll outperform owning 50. But be honest — most people should index. Concentration is for conviction, not ego.', keyTakeaway: 'Concentrate if you know. Index if you don\'t.', likes: 7891, shares: 3012, saves: 4123, bgGradient: 'from-cyan-900/40 via-[#0a0f1a] to-cyan-900/20', icon: '🎯' },
  { authorId: 'ape', category: 'tip', title: 'Paper Trading First', text: 'Before risking real money, paper trade for 3 months. Track every entry, exit, and emotion. If you can\'t profit with fake money, you definitely can\'t profit with real money. Ego doesn\'t pay bills.', keyTakeaway: 'Paper trade first. Prove your edge.', likes: 5432, shares: 1890, saves: 2345, bgGradient: 'from-amber-900/40 via-[#0a0f1a] to-amber-900/20', icon: '📝' },
  { authorId: 'zero', category: 'options', title: 'The Gamma Squeeze', text: 'When market makers sell calls, they delta-hedge by buying stock. As the stock rises, they buy MORE stock to stay hedged. This creates a feedback loop — the gamma squeeze. GME 2021 was a textbook example.', keyTakeaway: 'Call buying forces MM hedging = squeeze.', likes: 6789, shares: 2890, saves: 3456, bgGradient: 'from-red-900/40 via-[#0a0f1a] to-red-900/20', icon: '🌊' },
  { authorId: 'bull', category: 'strategy', title: 'Quality at a Reasonable Price', text: 'GARP investing: buy companies with strong moats, growing earnings, and reasonable valuations. PEG ratio < 1.5 is the sweet spot. Not as cheap as deep value, not as risky as pure growth.', keyTakeaway: 'GARP = quality + growth + reasonable price.', likes: 5678, shares: 2012, saves: 2890, bgGradient: 'from-emerald-900/40 via-[#0a0f1a] to-emerald-900/20', icon: '💎' },
  { authorId: 'tax', category: 'explainer', title: 'Holding Period Tax Hack', text: 'In most jurisdictions, assets held over 1 year get taxed at long-term capital gains rates (15-20%) vs short-term (up to 37%). That one extra day of holding can save you 17% in taxes. Patience literally pays.', keyTakeaway: 'Hold 1+ year = half the tax rate.', likes: 4890, shares: 1678, saves: 2345, bgGradient: 'from-red-900/40 via-[#0a0f1a] to-red-900/20', icon: '⏳' },
];

// ── Comment Templates ────────────────────────────────────────────────

export const COMMENT_TEMPLATES = [
  { authorId: 'neon', text: 'This is exactly what I needed to hear. Saving this.' },
  { authorId: 'ape', text: 'Bro this is fire. How long did it take you to learn this?' },
  { authorId: 'sigma', text: 'The discipline part is what most people miss. Great post.' },
  { authorId: 'quant', text: 'Agree with the thesis but the timing could be off. Watch the 200MA.' },
  { authorId: 'dark', text: 'Institutional flow confirms this. Smart money is positioning.' },
  { authorId: 'zero', text: 'YOLO\'d my whole account on this play. Let\'s go.' },
  { authorId: 'bull', text: 'Quality over quantity. This is the way.' },
  { authorId: 'bear', text: 'Contrarian take: this could reverse hard at these levels.' },
  { authorId: 'yield', text: 'Passive income > active trading. But respect the grind.' },
  { authorId: 'whale', text: 'This is why I keep coming back to the platform. Real alpha.' },
  { authorId: 'alpha', text: 'Good setup. Risk management is the key differentiator here.' },
  { authorId: 'gekko', text: 'Wall Street doesn\'t care about your feelings. Data only.' },
  { authorId: 'macro', text: 'The macro backdrop supports this. Central bank divergence is the key variable.' },
  { authorId: 'realty', text: 'Cap rates tell a different story. Always check the fundamentals.' },
  { authorId: 'esg', text: 'Sustainability and returns aren\'t mutually exclusive. Great take.' },
  { authorId: 'bond', text: 'Duration risk is underpriced here. Be careful with long bonds.' },
  { authorId: 'tax', text: 'Have you considered the tax implications? Structure matters.' },
  { authorId: 'whale2', text: 'This is the kind of deep analysis that separates professionals from gamblers.' },
  { authorId: 'momentum', text: 'Trend confirmation on the daily chart. I\'m in.' },
  { authorId: 'retail', text: 'Just started learning about this. Thanks for breaking it down!' },
];

// ── Daily Challenges ─────────────────────────────────────────────────

export const DAILY_CHALLENGES = [
  { desc: 'Make 3 trades with >2% return today', reward: 150, total: 3 },
  { desc: 'Complete 1 curriculum lesson', reward: 100, total: 1 },
  { desc: 'Like 5 posts on the Campus Feed', reward: 50, total: 5 },
  { desc: 'Watch 10 BizTok clips', reward: 75, total: 10 },
  { desc: 'Post a market analysis to Campus Feed', reward: 120, total: 1 },
  { desc: 'Follow 3 new traders', reward: 60, total: 3 },
  { desc: 'React to 10 posts', reward: 40, total: 10 },
  { desc: 'Save 5 BizTok clips', reward: 50, total: 5 },
  { desc: 'Achieve a 5% portfolio gain in one session', reward: 200, total: 1 },
  { desc: 'Complete 2 department projects', reward: 180, total: 2 },
  { desc: 'Share a post that gets 10+ likes', reward: 120, total: 1 },
  { desc: 'Watch 5 BizTok clips in different categories', reward: 100, total: 5 },
  { desc: 'Execute a profitable options trade', reward: 150, total: 1 },
  { desc: 'Reach a new creator level', reward: 250, total: 1 },
];
