/**
 * deskContent.ts -- Research Desk content ported from MVP deskContent.js
 * Podcasts, daily digests, market briefings, and watchlist templates.
 */

// ── Types ──

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  host: string;
  description: string;
  duration: string;
  topic: string;
  audioUrl?: string;
  dialogue: DialogueLine[];
}

export interface DigestArticle {
  id: string;
  title: string;
  authors: string;
  category: string;
  abstract: string;
  keyFindings: string[];
  implications: string;
  readTime: string;
}

export interface BriefingSection {
  heading: string;
  content: string;
}

export interface MarketBriefing {
  id: string;
  title: string;
  category: string;
  sections: BriefingSection[];
}

export interface WatchlistTemplate {
  name: string;
  description: string;
  instruments: string[];
}

// ── Podcasts ──

export const PODCASTS: PodcastEpisode[] = [
  {
    id: 'pod-1',
    title: 'Why Markets Crash',
    host: 'Alex & Morgan',
    description:
      'Two analysts debate the anatomy of market crashes, from tulip mania to the 2008 financial crisis, and what structural forces turn corrections into full-blown panics.',
    duration: '18 min',
    topic: 'macro',
    dialogue: [
      { speaker: 'Alex', text: "Let's talk about what actually causes a market crash. Most people think it's one big event, but that's rarely how it works." },
      { speaker: 'Morgan', text: "Exactly. Crashes rarely have a single cause. They're usually the result of accumulated fragilities that get exposed all at once. Think of it like a sandpile \u2014 you keep adding grains and it looks stable, until one grain triggers an avalanche." },
      { speaker: 'Alex', text: "That's the Per Bak self-organized criticality model. And it maps surprisingly well onto financial markets. Before 2008, leverage had been building for years. The subprime mortgages were just the trigger, not the cause." },
      { speaker: 'Morgan', text: "Right. The cause was the entire shadow banking system, the CDO structures, the ratings agencies stamping triple-A on junk, and the assumption that housing prices could never decline nationally. Hyman Minsky wrote about this decades earlier." },
      { speaker: 'Alex', text: "Minsky's Financial Instability Hypothesis. The idea that stability itself breeds instability. When times are good, people take on more risk, lenders loosen standards, and the whole system gets more fragile." },
      { speaker: 'Morgan', text: "He described three types of borrowers: hedge borrowers who can cover both principal and interest from income, speculative borrowers who can cover interest but need to roll over principal, and Ponzi borrowers who can't even cover interest and rely entirely on asset appreciation." },
      { speaker: 'Alex', text: "And as the cycle progresses, the mix shifts from hedge borrowers to speculative and Ponzi borrowers. By the time you get to the peak, a huge portion of the credit structure depends on prices going up indefinitely." },
      { speaker: 'Morgan', text: "Now let's connect this to market microstructure. When a crash starts, it's not just about fundamentals anymore. Liquidity evaporates. Market makers widen their spreads. Stop-loss orders cascade. And in the modern era, algorithmic trading can accelerate the move." },
      { speaker: 'Alex', text: "The Flash Crash of 2010 is a perfect example. The Dow dropped nearly 1,000 points in minutes. A large sell order in the E-mini S&P futures triggered a feedback loop with high-frequency trading algorithms. Liquidity just vanished." },
      { speaker: 'Morgan', text: "And that brings up an important distinction between a crash and a correction. A correction is a 10-20% decline that unfolds over weeks or months. A crash is usually faster \u2014 a decline of 20% or more in days or weeks, often driven by forced selling and liquidity failure." },
      { speaker: 'Alex', text: "Forced selling is the key mechanism. Margin calls force leveraged traders to sell. Redemptions force fund managers to sell. Collateral calls force banks to sell. Everyone becomes a forced seller at the same time, and there are no buyers." },
      { speaker: 'Morgan', text: "One final historical perspective: in every major crash, the prevailing narrative was that 'this time is different' \u2014 that the crash represented a permanent structural change. In hindsight, those moments of maximum despair were the best buying opportunities of the decade." },
    ],
  },
  {
    id: 'pod-2',
    title: 'Reading On-Chain Data Like a Pro',
    host: 'Alex & Morgan',
    description:
      'Alex and Morgan walk through the most useful on-chain metrics for Bitcoin and Ethereum, explaining how whale wallets, exchange flows, and MVRV ratios can signal market tops and bottoms.',
    duration: '22 min',
    topic: 'crypto',
    dialogue: [
      { speaker: 'Alex', text: "Today we're diving into on-chain analysis. This is one of the genuine informational edges crypto offers over traditional markets \u2014 the blockchain is a public ledger, so you can actually see what's happening with the money." },
      { speaker: 'Morgan', text: "It's like having a window into the order flow that you'd never get in equities. Let's start with the basics. What are the metrics that actually matter?" },
      { speaker: 'Alex', text: "The first one I always look at is exchange net flows. When large amounts of Bitcoin move from private wallets onto exchanges, it often signals that holders are preparing to sell. The reverse \u2014 coins flowing off exchanges into cold storage \u2014 suggests accumulation." },
      { speaker: 'Morgan', text: "Right. And you can break this down further by looking at whale wallets versus retail. Addresses holding over 1,000 BTC tend to be more sophisticated." },
      { speaker: 'Alex', text: "Then there's MVRV \u2014 Market Value to Realized Value. Realized value prices each coin at the price it last moved on-chain. So MVRV tells you, on aggregate, how much unrealized profit the market is sitting on." },
      { speaker: 'Morgan', text: "Historically, when MVRV goes above 3.5 or so, it indicates the average holder is sitting on 250% profit. That's when long-term holders start distributing. MVRV below 1.0 means the average coin is underwater \u2014 those have been generational buying opportunities." },
      { speaker: 'Alex', text: "Another critical metric is the SOPR \u2014 Spent Output Profit Ratio. It measures whether coins being moved on-chain are being moved at a profit or a loss." },
      { speaker: 'Morgan', text: "The key takeaway: on-chain data doesn't replace technical or fundamental analysis. It's a supplementary lens that's unique to crypto. Use it to confirm or challenge your thesis, not as a standalone trading system." },
    ],
  },
  {
    id: 'pod-3',
    title: 'Does Technical Analysis Actually Work?',
    host: 'Alex & Morgan',
    description:
      'A candid conversation about the statistical evidence for technical analysis, which patterns have backtested edge, and why many popular indicators are misunderstood.',
    duration: '20 min',
    topic: 'technical',
    dialogue: [
      { speaker: 'Alex', text: "Today's topic is controversial: does technical analysis actually work? Because academia says mostly no, and millions of traders say yes. Somebody's wrong." },
      { speaker: 'Morgan', text: "I think the honest answer is nuanced. Some aspects of TA have genuine statistical support. Others are essentially pattern-matching pareidolia." },
      { speaker: 'Alex', text: "Momentum is the most robust finding in quantitative finance. The idea that assets that have gone up tend to keep going up, over medium-term horizons of three to twelve months." },
      { speaker: 'Morgan', text: "Volume is another area with genuine information content. Unusual volume often precedes price moves." },
      { speaker: 'Alex', text: "Chart patterns, head-and-shoulders, cup-and-handle \u2014 the academic evidence here is weak at best." },
      { speaker: 'Morgan', text: "My framework: Tier one, strong evidence: trend-following via moving averages, momentum, and volume analysis. Tier two, moderate evidence: support and resistance, mean reversion at extremes. Tier three, weak evidence: most chart patterns, Fibonacci levels, and Elliott Wave." },
      { speaker: 'Alex', text: "The practical takeaway is: use TA for risk management and trade timing, not for generating trade ideas from scratch." },
      { speaker: 'Morgan', text: "The biggest edge in TA isn't any specific indicator. It's the discipline of having a system, testing it, and following it consistently." },
    ],
  },
  {
    id: 'pod-4',
    title: 'Decoding Earnings Season',
    host: 'Alex & Morgan',
    description:
      'How to read an earnings report, what the market actually cares about beyond headline EPS beats, and why guidance matters more than results.',
    duration: '19 min',
    topic: 'fundamentals',
    dialogue: [
      { speaker: 'Alex', text: "Earnings season is when the market separates the fundamentally-driven traders from the noise traders." },
      { speaker: 'Morgan', text: "The headline \u2014 'Company X beats EPS by 5 cents' \u2014 is nearly useless. The stock often does the opposite of what you'd expect." },
      { speaker: 'Alex', text: "Revenue growth tells you about demand. You can manage earnings through cost-cutting, share buybacks, and accounting choices, but revenue is harder to fake." },
      { speaker: 'Morgan', text: "Guidance. The forward guidance tells you what management expects. An earnings beat with a guidance cut often sends the stock down." },
      { speaker: 'Alex', text: "Post-earnings drift is a well-documented phenomenon. Stocks that beat estimates tend to continue outperforming for the next 60 to 90 days." },
      { speaker: 'Morgan', text: "Cash flow from operations versus reported net income is the ultimate truth test. If earnings are growing but operating cash flow is stagnant, the earnings growth may not be sustainable." },
    ],
  },
  {
    id: 'pod-5',
    title: 'Your Brain vs. The Market',
    host: 'Alex & Morgan',
    description:
      'An exploration of the cognitive biases that sabotage traders, from loss aversion and the disposition effect to overconfidence and recency bias.',
    duration: '21 min',
    topic: 'behavioral',
    dialogue: [
      { speaker: 'Alex', text: "Let's talk about why most traders lose money. It's because their brains are wired to make bad trading decisions." },
      { speaker: 'Morgan', text: "Kahneman and Tversky's Prospect Theory: humans feel the pain of losses about twice as strongly as the pleasure of equivalent gains." },
      { speaker: 'Alex', text: "Loss aversion manifests as the disposition effect \u2014 selling winners too early and holding losers too long." },
      { speaker: 'Morgan', text: "Overconfidence: men traded 45% more than women and earned lower returns. The most active quintile underperformed by 6.5% annually." },
      { speaker: 'Alex', text: "Confirmation bias: once you've taken a position, you start seeking out information that confirms your thesis." },
      { speaker: 'Morgan', text: "The single most effective tool against behavioral biases is a trading journal. Record why you entered, what your thesis was, and how you felt." },
      { speaker: 'Alex', text: "Pre-commitment is powerful. Before you enter a trade, write down your stop loss and profit target." },
      { speaker: 'Morgan', text: "Trading is not primarily an intellectual challenge. It's a psychological one." },
    ],
  },
  {
    id: 'pod-6',
    title: 'Demystifying the Options Greeks',
    host: 'Alex & Morgan',
    description:
      'A thorough walkthrough of Delta, Gamma, Theta, Vega, and Rho \u2014 how each Greek measures a specific risk dimension.',
    duration: '24 min',
    topic: 'derivatives',
    dialogue: [
      { speaker: 'Alex', text: "Options are probably the most misunderstood instrument in retail trading. People buy calls and puts like lottery tickets without understanding the Greeks." },
      { speaker: 'Morgan', text: "You can be correct about direction and still lose money on an option because of time decay, volatility crush, or poor strike selection." },
      { speaker: 'Alex', text: "Delta measures how much the option price changes for a one dollar move in the underlying. At-the-money call: delta around 0.50." },
      { speaker: 'Morgan', text: "Gamma is the rate of change of Delta. Highest for at-the-money options near expiration." },
      { speaker: 'Alex', text: "Theta measures time decay. For an at-the-money option with 30 days to expiration, Theta might be 5 cents per day." },
      { speaker: 'Morgan', text: "Vega measures sensitivity to implied volatility. This is the Greek that explains why you can buy a call, the stock goes up, and you still lose money." },
      { speaker: 'Alex', text: "The classic example is buying calls before earnings. After earnings, even if the stock moves in your direction, implied volatility collapses \u2014 the 'IV crush.'" },
      { speaker: 'Morgan', text: "Options are multidimensional instruments. Direction is just one dimension. Time, volatility, and the rate of change all matter." },
    ],
  },
  {
    id: 'pod-7',
    title: 'Tokenomics: Separating Value from Vapor',
    host: 'Alex & Morgan',
    description:
      'How to evaluate a crypto project by analyzing its token supply mechanics, emission schedules, vesting cliffs, and value accrual mechanisms.',
    duration: '20 min',
    topic: 'crypto',
    dialogue: [
      { speaker: 'Alex', text: "Tokenomics is the single most important and most ignored aspect of crypto analysis." },
      { speaker: 'Morgan', text: "Tokenomics determines the supply and demand dynamics of a token. If the supply schedule dumps millions of new tokens, no narrative can overcome that selling pressure." },
      { speaker: 'Alex', text: "You need to understand three numbers: circulating supply, total supply, and max supply." },
      { speaker: 'Morgan', text: "Vesting schedules are critical. When team or investor tokens unlock, there's a natural incentive to sell." },
      { speaker: 'Alex', text: "Value accrual: how does the token capture value from the protocol? Many governance tokens don't actually give you any claim on revenue." },
      { speaker: 'Morgan', text: "Revenue share models are the gold standard. Some DeFi protocols distribute a portion of protocol revenue to token stakers." },
      { speaker: 'Alex', text: "Before buying any token, answer: How does it capture value? What is the dilution timeline? Who holds the supply? Is there real revenue? What reduces token velocity?" },
    ],
  },
  {
    id: 'pod-8',
    title: 'Building Your Macro Trading Framework',
    host: 'Alex & Morgan',
    description:
      'How to build a top-down macro framework incorporating interest rates, yield curves, dollar strength, credit conditions, and business cycle positioning.',
    duration: '23 min',
    topic: 'macro',
    dialogue: [
      { speaker: 'Alex', text: "Most retail traders are pure bottom-up stock pickers. They analyze individual companies but ignore the macro environment. That's like analyzing the quality of a boat while ignoring the tide." },
      { speaker: 'Morgan', text: "Roughly 30 to 50 percent of a stock's return is driven by macro factors." },
      { speaker: 'Alex', text: "The foundation is the business cycle: expansion, peak, contraction, trough. Each phase favors different sectors and asset classes." },
      { speaker: 'Morgan', text: "The yield curve is the most powerful single macro signal. An inverted yield curve has preceded every US recession since the 1950s." },
      { speaker: 'Alex', text: "Federal Reserve policy: 'Don't fight the Fed.' When the Fed is cutting rates and expanding its balance sheet, risk assets tend to rally." },
      { speaker: 'Morgan', text: "Credit conditions: high-yield spreads tell you how the credit market is pricing risk. Widening spreads signal stress." },
      { speaker: 'Alex', text: "Every week, check: Where are we in the business cycle? What is the Fed likely to do? Is the dollar strengthening? Are credit spreads widening? What is global liquidity doing?" },
      { speaker: 'Morgan', text: "Build a one-page macro dashboard that you update every Sunday night. Over time, you'll develop an intuition for regime shifts." },
    ],
  },
];

// ── Daily Digests (Research Papers) ──

export const DAILY_DIGESTS: DigestArticle[] = [
  {
    id: 'research-1',
    title: 'The Efficient Market Hypothesis Revisited',
    authors: 'Based on Fama (1970)',
    category: 'academic',
    abstract: 'Eugene Fama proposed three forms of market efficiency: weak, semi-strong, and strong. Decades of research have challenged and refined each form.',
    keyFindings: [
      'Weak-form efficiency is broadly supported \u2014 simple technical rules do not consistently produce excess returns after costs.',
      'Semi-strong efficiency faces challenges from value premium, momentum effect, and post-earnings announcement drift.',
      'Strong-form efficiency is clearly rejected \u2014 insider trading studies show insiders earn abnormal returns.',
    ],
    implications: 'For retail traders, consistently beating the market through publicly available information is extremely difficult but not impossible. Focus on areas where behavioral biases create persistent mispricings.',
    readTime: '5 min',
  },
  {
    id: 'research-2',
    title: 'Momentum: Evidence and Explanations',
    authors: 'Based on Jegadeesh & Titman (1993)',
    category: 'academic',
    abstract: 'The momentum effect \u2014 past winners continue outperforming over 3-12 month horizons \u2014 is one of the most robust anomalies in financial economics.',
    keyFindings: [
      'Top decile momentum produced ~12% annual returns from 1965-1989, persisting out-of-sample.',
      'Momentum exists across virtually all equity markets globally, currencies, commodities, and fixed income.',
      'Momentum strategies experience occasional severe drawdowns during market reversals.',
    ],
    implications: 'Momentum is real and exploitable, but requires risk management for crash periods. Combining momentum with value factors can smooth returns.',
    readTime: '6 min',
  },
  {
    id: 'research-3',
    title: 'The Volatility Risk Premium',
    authors: 'Based on Bakshi & Kapadia (2003)',
    category: 'academic',
    abstract: 'Implied volatility consistently overestimates realized volatility. This gap, the Volatility Risk Premium, represents compensation for bearing uncertainty.',
    keyFindings: [
      'The VIX exceeds subsequent 30-day realized volatility approximately 85% of the time.',
      'The VRP tends to be larger during elevated anxiety and smaller during complacent markets.',
      'The jump risk component drives most of the premium.',
    ],
    implications: 'Option selling strategies produce steady income most of the time but face occasional large losses during volatility spikes. Sizing positions to survive worst-case is essential.',
    readTime: '5 min',
  },
  {
    id: 'research-4',
    title: 'Behavioral Biases in Financial Decision Making',
    authors: 'Based on Kahneman & Tversky (1979)',
    category: 'behavioral',
    abstract: 'Prospect Theory demonstrated that humans evaluate outcomes relative to a reference point, are loss-averse, and systematically distort probabilities.',
    keyFindings: [
      'Losses are felt ~2-2.5x as intensely as equivalent gains.',
      'People overweight low-probability events and underweight moderate-to-high probability events.',
      'The disposition effect: investors sell winners too quickly and hold losers too long.',
    ],
    implications: 'Use pre-commitment strategies: set stop losses before entering trades, define position sizes based on maximum acceptable loss, and automate exits where possible.',
    readTime: '6 min',
  },
  {
    id: 'research-5',
    title: 'Factor Investing: Beyond Market Beta',
    authors: 'Based on Fama & French (1993, 2015)',
    category: 'academic',
    abstract: 'The Fama-French factor models identified systematic risk factors beyond market beta: size, value, profitability, and investment patterns.',
    keyFindings: [
      'Small-cap stocks historically outperform large-caps, though the premium has weakened since discovery.',
      'High book-to-market stocks outperform growth over long horizons, with cyclical performance.',
      'High profitability and conservative investment firms tend to outperform.',
    ],
    implications: 'Factor returns are cyclical. A multi-factor approach with exposure to several factors simultaneously tends to produce more consistent results.',
    readTime: '7 min',
  },
  {
    id: 'research-6',
    title: 'Market Microstructure: How Prices Are Formed',
    authors: 'Based on Kyle (1985) and Glosten & Milgrom (1985)',
    category: 'academic',
    abstract: 'Foundational models explaining how informed and uninformed traders interact with market makers, and why bid-ask spreads exist.',
    keyFindings: [
      'Market makers set spreads to protect against informed traders with superior information.',
      'Strategic informed traders camouflage orders by trading gradually.',
      'Price impact is proportional to the square root of order size.',
    ],
    implications: 'Use limit orders rather than market orders. Break large orders into smaller pieces. Understand that your order flow may be informative to other participants.',
    readTime: '6 min',
  },
  {
    id: 'research-7',
    title: 'Cryptocurrency Market Structure and Price Discovery',
    authors: 'Based on Makarov & Schoar (2020)',
    category: 'crypto',
    abstract: 'Research reveals persistent inefficiencies in crypto: cross-exchange arbitrage, significant price dislocations, and unique microstructure features.',
    keyFindings: [
      'Cross-exchange Bitcoin price deviations averaged 1-2%, occasionally exceeding 5% during stress.',
      'The 24/7 market leads to higher volatility during low-liquidity periods.',
      'Stablecoin stability has systemic implications for the entire crypto market.',
    ],
    implications: 'Monitor prices across multiple exchanges. Understand that liquidity varies dramatically by exchange and time of day.',
    readTime: '5 min',
  },
  {
    id: 'research-8',
    title: 'The Limits of Arbitrage',
    authors: 'Based on Shleifer & Vishny (1997)',
    category: 'academic',
    abstract: 'Why mispricings persist: arbitrage is not riskless. Real-world constraints prevent arbitrageurs from fully correcting prices.',
    keyFindings: [
      'When mispricings are largest (during crises), arbitrageurs face the most redemptions, forcing them to close positions at the worst time.',
      'Mispricings can widen before they converge, potentially forcing liquidation before profit.',
      'Short-selling constraints create asymmetric limits \u2014 overpricing is harder to correct.',
    ],
    implications: 'Being right about valuation is not enough. Position sizing must account for the possibility that mispricings widen before correcting.',
    readTime: '5 min',
  },
  {
    id: 'research-9',
    title: 'The Cross-Section of Expected Cryptocurrency Returns',
    authors: 'Based on Liu, Tsyvinski & Wu (2022)',
    category: 'crypto',
    abstract: 'Applying factor model methodologies to crypto reveals both similarities and significant differences from equity markets.',
    keyFindings: [
      'A crypto-specific three-factor model captures market, size, and momentum effects.',
      '1-week momentum is particularly powerful in crypto, suggesting faster information incorporation.',
      'Network fundamentals (active addresses, transaction volume) have predictive power beyond price-based factors.',
    ],
    implications: 'Factor-based approaches can systematize what is often purely narrative-driven crypto investing.',
    readTime: '6 min',
  },
  {
    id: 'research-10',
    title: 'Tail Risk and Asset Prices',
    authors: 'Based on Kelly & Jiang (2014)',
    category: 'academic',
    abstract: 'Tail risk is a priced factor in financial markets. Assets with greater exposure to market tail risk command higher expected returns.',
    keyFindings: [
      'High tail beta stocks earn ~5.4% more annually than low tail beta stocks.',
      'Tail risk pricing explains part of the value premium and low-volatility anomaly.',
      'Many yield-enhancing strategies are implicitly short tail risk.',
    ],
    implications: 'Understanding your portfolio\'s tail risk exposure helps explain expected returns and guides hedging decisions.',
    readTime: '5 min',
  },
  {
    id: 'research-11',
    title: 'Attention, Information Processing, and Market Quality',
    authors: 'Based on Da, Engelberg & Gao (2011)',
    category: 'behavioral',
    abstract: 'Investor attention is scarce. Shifts in attention predict short-term price movements, trading volume, and price discovery speed.',
    keyFindings: [
      'Google search volume increases predict higher prices and volume over the next two weeks.',
      'The attention effect is asymmetric: attention-driven buying is more pronounced than selling.',
      'High pre-announcement attention is associated with faster price adjustment.',
    ],
    implications: 'Monitor retail attention metrics as contrarian indicators at extremes. Stocks trending on social media with universal bullish sentiment are often near short-term tops.',
    readTime: '5 min',
  },
  {
    id: 'research-12',
    title: 'The Term Structure of Equity Returns',
    authors: 'Based on van Binsbergen, Brandt & Koijen (2012)',
    category: 'academic',
    abstract: 'The relationship between risk and investment horizon is complex. Short-horizon dividend claims have higher Sharpe ratios than long-horizon claims.',
    keyFindings: [
      'Short-horizon dividend strips have higher Sharpe ratios, contradicting standard models.',
      'The equity risk premium varies counter-cyclically: highest during recessions.',
      'Stocks can deliver negative real returns over 10-20 year horizons in certain periods.',
    ],
    implications: 'The "stocks for the long run" narrative is oversimplified. Consider adjusting equity allocation based on valuation levels rather than maintaining a static allocation.',
    readTime: '7 min',
  },
];

// ── Market Briefings ──

export const MARKET_BRIEFINGS: MarketBriefing[] = [
  {
    id: 'briefing-1',
    title: 'Morning Bell: Global Markets Overview',
    category: 'daily',
    sections: [
      { heading: 'Asia-Pacific Session', content: 'The Asian trading session sets the tone for the global day. Key indices: Nikkei 225, Hang Seng, Shanghai Composite, ASX 200, KOSPI. Monitor USD/JPY and USD/CNH for risk appetite shifts. BOJ policy decisions and Chinese data releases frequently move global markets.' },
      { heading: 'European Opens', content: 'European markets open at 3:00 AM Eastern: FTSE 100, DAX 40, CAC 40, STOXX 600. Watch euro-dollar, Bund yields, and peripheral sovereign spreads (Italy-Germany) for stress signals.' },
      { heading: 'Key Economic Data', content: 'Tier-1 data: Non-Farm Payrolls (first Friday monthly), CPI/PPI (mid-month), FOMC decisions (8x/year), GDP (quarterly), ISM Manufacturing/Services. The market reacts more to deviation from consensus than the absolute number.' },
      { heading: 'Pre-Market Movers', content: 'Scan pre-market futures and extended-hours trading. Earnings announcements, analyst upgrades/downgrades, and overnight news create gap openings. Pre-market volume above 2x the 20-day average signals institutional interest.' },
    ],
  },
  {
    id: 'briefing-2',
    title: 'Crypto 24-Hour Pulse',
    category: 'daily',
    sections: [
      { heading: 'Bitcoin & Ethereum Snapshot', content: 'Review 24h price action for BTC and ETH. Check BTC dominance ratio, ETH/BTC ratio, perpetual futures funding rates, and basis between spot and futures prices.' },
      { heading: 'DeFi & On-Chain Activity', content: 'Track total DeFi TVL across chains. Monitor whale movements via on-chain alerts. Check stablecoin market cap trends as a leading indicator. DEX vs CEX volume ratios signal market structure shifts.' },
      { heading: 'Regulatory & Ecosystem News', content: 'Scan for SEC actions, legislation updates, protocol upgrades, network milestones, and institutional adoption signals: ETF flows, corporate treasury purchases, custody announcements.' },
      { heading: 'Derivatives & Sentiment', content: 'Review open interest in BTC/ETH futures. Liquidation data reveals positioning. Options put/call ratios and large block trades indicate institutional positioning. Track max pain for upcoming expiries.' },
    ],
  },
  {
    id: 'briefing-3',
    title: 'Weekly Sector Rotation Report',
    category: 'daily',
    sections: [
      { heading: 'Sector Performance Rankings', content: 'Rank the 11 GICS sectors by weekly and monthly performance. Classic rotation: consumer discretionary/tech (early cycle) to energy/materials (late cycle) to utilities/healthcare (recession).' },
      { heading: 'Relative Strength Analysis', content: 'Calculate relative strength of each sector vs S&P 500. Sectors with rising RS deserve overweight. Watch for RS breakouts signaling regime changes.' },
      { heading: 'Fund Flow Data', content: 'ETF flows provide real-time positioning data. Large sector ETF inflows (XLK, XLE, XLF) indicate active allocation decisions. Divergences between price and flows can signal pending reversals.' },
      { heading: 'Cross-Sector Signals', content: 'Rising copper supports industrials. Rising yields benefit financials, hurt utilities. Rising oil benefits energy, hurts airlines. Semiconductor sector (SMH) often leads broader tech by 4-6 weeks.' },
    ],
  },
  {
    id: 'briefing-4',
    title: 'Fixed Income & Rates Dashboard',
    category: 'daily',
    sections: [
      { heading: 'Treasury Yield Curve', content: 'Plot the current curve from 1-month to 30-year. Key spreads: 2s10s (recession indicator), 3m10y (Fed preferred), 5s30s (term premium proxy). An inverted curve signals the bond market expects rate cuts.' },
      { heading: 'Federal Reserve Watch', content: 'CME FedWatch for rate change probabilities. Track Fed speaker commentary. Watch Core PCE and labor market indicators as policy drivers.' },
      { heading: 'Credit Markets', content: 'Monitor high-yield credit spreads as a risk barometer. Track new issuance volume for demand signals. Watch rating agency actions for clusters of downgrades.' },
      { heading: 'Real Rates & Inflation', content: 'Monitor TIPS breakeven rates for market-implied inflation expectations. Real yields are more important than nominal for asset allocation \u2014 rising real yields tighten financial conditions.' },
    ],
  },
  {
    id: 'briefing-5',
    title: 'Volatility & Sentiment Dashboard',
    category: 'daily',
    sections: [
      { heading: 'Volatility Surface', content: 'VIX term structure: backwardation signals acute fear, normal contango indicates complacency. Check VVIX for expected VIX moves. Sector volatility indices provide asset-specific context.' },
      { heading: 'Options Market Signals', content: 'Equity put/call ratio above 0.85 = elevated fear, below 0.55 = complacency. Track SKEW index for tail risk pricing. Unusual options activity often precedes significant moves.' },
      { heading: 'Positioning & Sentiment', content: 'AAII Sentiment Survey: extreme readings are reliable contrarian indicators. NAAIM Exposure Index shows institutional allocation. COT data reveals commercial vs speculative positioning.' },
      { heading: 'Correlation & Dispersion', content: 'High implied correlation = stocks moving in lockstep (macro-driven). Low correlation = stock-specific factors dominant (better for stock picking). High dispersion with low correlation is ideal for fundamental analysis.' },
    ],
  },
  {
    id: 'briefing-6',
    title: 'Earnings Season Command Center',
    category: 'daily',
    sections: [
      { heading: "This Week's Key Reports", content: 'Identify market-moving reports. Mega-cap reports (AAPL, MSFT, AMZN, GOOGL, META, NVDA) can swing the entire market. Note consensus EPS, whisper number, implied move from options, and key metrics.' },
      { heading: 'Earnings Season Scorecard', content: 'Track running beat rate (~70-75% normal). Monitor magnitude of beats/misses and YoY growth. Revenue beat rate (~60-65%) is more meaningful since revenue is harder to engineer.' },
      { heading: 'Guidance Trends', content: 'Aggregate forward guidance revisions. The guidance revision ratio (raisers/cutters) is a top real-time indicator. Track mentions of AI spending, tariff impacts, consumer confidence.' },
      { heading: 'Post-Earnings Reactions', content: 'A beat followed by a decline means the market expected more. A rise on a miss means bad news was priced in. These reaction patterns calibrate expectations for upcoming reports.' },
    ],
  },
];

// ── Watchlist Templates ──

export const WATCHLIST_TEMPLATES: WatchlistTemplate[] = [
  {
    name: 'Tech Giants',
    description: 'Dominant technology mega-caps plus leading semiconductor companies. Monitor cloud growth rates, AI capex, digital ad spend, and semiconductor cycle indicators.',
    instruments: ['AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN', 'NVDA', 'TSM', 'AMD', 'AVGO', 'CRM'],
  },
  {
    name: 'Crypto & Blockchain Equities',
    description: 'Publicly traded companies with significant crypto/blockchain exposure: exchanges, Bitcoin treasury companies, miners, and fintech platforms.',
    instruments: ['COIN', 'MSTR', 'MARA', 'RIOT', 'CLSK', 'HUT', 'SQ', 'HOOD', 'PYPL'],
  },
  {
    name: 'Macro Bellwethers',
    description: 'Key assets reflecting macro conditions: large-cap equity, Treasuries, credit, precious metals, oil, dollar, and emerging markets.',
    instruments: ['SPY', 'QQQ', 'IWM', 'TLT', 'HYG', 'GLD', 'SLV', 'USO', 'UUP', 'EEM', 'FXI'],
  },
  {
    name: 'Dividend Aristocrats Core',
    description: 'S&P 500 Dividend Aristocrats with 25+ consecutive years of dividend increases. Relative stability and growing income streams.',
    instruments: ['JNJ', 'PG', 'KO', 'PEP', 'MMM', 'ABT', 'XOM', 'CVX', 'MCD', 'WMT', 'ITW', 'ADP'],
  },
];
