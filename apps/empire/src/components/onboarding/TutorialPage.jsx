import React, { useState } from 'react';
import RitualBackdrop from '../shared/RitualBackdrop';

// ── TUTORIAL CATEGORIES ──────────────────────────────────────
// Order: 1) Essential (general + dynamics), 2) Game Modes, 3) Feature deep-dives

const TUTORIAL_CATEGORIES = [
  { key: 'essential', label: 'ESSENTIAL', color: '#00e5ff' },
  { key: 'modes', label: 'GAME MODES', color: '#a78bfa' },
  { key: 'features', label: 'DEEP DIVES', color: '#f59e0b' },
];

const TUTORIAL_SECTIONS = [
  // ════════════════════════════════════════════════════════════
  // ESSENTIAL — new player must-reads
  // ════════════════════════════════════════════════════════════
  {
    id: 'welcome',
    category: 'essential',
    title: 'Welcome to AEGIS',
    subtitle: 'What the game is and how it works',
    icon: '🎓',
    color: '#00e5ff',
    gradient: 'linear-gradient(135deg, rgba(0,229,255,0.35), rgba(8,18,30,0.85))',
    summary: 'A complete introduction for new players — every pillar of the game explained.',
    steps: [
      {
        heading: 'What is AEGIS?',
        body: 'AEGIS is a gamified financial education platform disguised as a global empire-building game. You start as a CEO with €100K and grow your net worth by acquiring real-world infrastructure nodes, trading financial instruments, managing corporate departments, and competing against other players. Everything you do teaches you real finance — from portfolio management to corporate governance to macroeconomics.',
        tip: 'AEGIS stands for your command operations system. Think of it as your corporate war room.',
        mockup: 'welcome',
      },
      {
        heading: 'Active vs Passive Learning',
        body: 'AEGIS uses two learning modes. ACTIVE LEARNING happens when you make decisions — buying a stock, acquiring a node, setting a corporate structure, responding to compliance warnings. Every action has real financial consequences that teach cause-and-effect. PASSIVE LEARNING happens through observation — watching your portfolio react to market ticks, seeing how tax rates affect your income, noticing how heat impacts your operations. The game teaches you by making you live through financial scenarios, not just read about them.',
        tip: 'The Academy mode offers structured passive learning through courses. Campaign mode is pure active learning.',
        mockup: 'learning',
      },
      {
        heading: 'The 7 Pillars',
        body: 'AEGIS is built on 7 pillars: (1) EMPIRE — acquire and manage income-generating nodes across the globe. (2) TRADING — buy and sell stocks, crypto, forex, commodities, bonds, real estate, and art. (3) CORPORATE — manage departments, R&D, corporate structure, and governance. (4) FINANCE — loans, funds, VC, private equity, hedge funds, and investment banking. (5) INTELLIGENCE — deploy agents, decrypt rival intel, and execute shadow operations. (6) SOCIAL — build your public persona through market calls and social engagement. (7) COMPETITION — quick matches, private servers, and leaderboard rankings.',
        tip: 'You don\'t need to master all 7 pillars at once. Start with Empire and Trading, then expand.',
        mockup: 'pillars',
      },
      {
        heading: 'The Single Economy',
        body: 'There is ONE money pool. Your Company Balance funds everything — node acquisitions, trading, department upgrades, route construction, and research. This creates real tension: spending on a new node means less capital for trading. Buying stocks means less cash for R&D. Every decision has an opportunity cost, just like real business.',
        tip: 'Personal Balance is separate — it funds luxury purchases, sports franchises, and personal lifestyle items.',
        mockup: 'economy',
      },
      {
        heading: 'Time & Progression',
        body: 'Game time flows in monthly ticks (every 30 seconds real-time). Each tick: your nodes generate income, prices change, research progresses, fines are assessed, and your board evaluates performance. You earn CEO XP for every action — trading, acquiring, researching. XP determines your ECFL level (F1 → F3), which unlocks better AI responses, trading tools, and Academy content.',
        tip: 'Check the date display in the top bar to track how much time has passed.',
        mockup: 'time',
      },
      {
        heading: 'Your First 5 Minutes',
        body: '1. Pick CAMPAIGN from the mode selection. 2. Open the GLOBE and look at nearby finance/tech nodes — these are your first acquisition targets. 3. Click a red (market) node and BUY it to start generating monthly income. 4. Open ATHENA (bottom bar) and ask: "What should I do next?" 5. Watch your HEAT gauge — keep it below 60 to avoid income penalties and compliance fines.',
        tip: 'Don\'t overthink your first purchase. Any income-positive node is better than sitting on cash.',
        mockup: 'first-5',
      },
    ],
  },
  {
    id: 'dynamics',
    category: 'essential',
    title: 'Game Dynamics',
    subtitle: 'How systems interact and affect each other',
    icon: '⚙',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.30), rgba(8,16,24,0.85))',
    summary: 'Every cause has an effect — understand the interconnected systems driving your empire.',
    steps: [
      {
        heading: 'Income & Expenses',
        body: 'Your empire has two money flows. INCOME comes from: owned nodes (monthly), trade route throughput, trading profits, fund yields, and department revenue. EXPENSES come from: department costs, loan repayments, compliance fines, CEO salary, and operational costs. Net income appears each tick. If expenses exceed income, your balance drains — potentially triggering bankruptcy.',
        tip: 'The monthly income indicator (+€X/mo) in the top left shows your net cash flow per tick.',
        mockup: 'income',
      },
      {
        heading: 'Heat & Compliance',
        body: 'HEAT measures regulatory attention (0-100). Aggressive actions increase heat: hostile takeovers, shadow ops, tax avoidance. Heat above 60 = 10% income penalty. Heat above 80 = asset freeze (can\'t buy anything) + 28% income penalty. Heat decays slowly each tick. GOVERNANCE below 25 triggers automatic fines. The compliance system forces you to balance aggression with legitimacy.',
        tip: 'Complete Legal department projects to boost governance. Keep heat under 60 for clean operations.',
        mockup: 'heat',
      },
      {
        heading: 'Board of Directors',
        body: 'Your board has 5 members, each focused on a metric: growth, profit, governance, ESG, or expansion. Board satisfaction affects CEO approval. Low approval → reduced income multiplier. Critical low approval → you get SACKED (game over for that contract). The board evaluates you every tick based on their focus area.',
        tip: 'Read the board member profiles in the OFFICE tab — each one tells you exactly what they want.',
        mockup: 'board',
      },
      {
        heading: 'Tax & Corporate Structure',
        body: 'Your corporate structure determines your tax rate (17-45%). Sole Trader = high taxes, low governance requirements. Public Company = low taxes, strict governance. LLC = balanced middle ground. Changing structure has a cooldown and may trigger compliance events. Tax is deducted from gross income each tick.',
        tip: 'Switch to LLC once you have stable governance above 30 — it\'s the sweet spot for most players.',
        mockup: 'tax',
      },
      {
        heading: 'Monopoly & Sector Bonuses',
        body: 'Owning 3+ nodes of the same sector type (e.g., 3 finance nodes) triggers a 1.5x monopoly income bonus on ALL nodes of that type. This stacks with employee card multipliers and world event modifiers. Sector dominance is one of the fastest paths to high income.',
        tip: 'Focus on one sector early to hit the monopoly threshold, then diversify for stability.',
        mockup: 'monopoly',
      },
      {
        heading: 'Employee Cards & Multipliers',
        body: 'Employee cards have multipliers (1.1x to 3x+) that boost specific sectors. When a card\'s stat matches a node\'s sector, that node\'s income is multiplied. Cards come in 5 tiers: Bronze, Silver, Gold, Diamond, and Icon. Higher tiers have bigger multipliers. Assign your best cards to your highest-income nodes for maximum impact.',
        tip: 'Icon-tier cards are rare but transformative — a 3x multiplier on a €100K node = €300K income.',
        mockup: 'cards-multipliers',
      },
      {
        heading: 'World Events & Living World',
        body: 'The world is alive. Random events — booms, busts, disruptions, crises, and opportunities — affect regions and sectors. A tech boom in Asia boosts tech node income there. An oil crisis reduces energy output globally. Events create temporary modifiers on affected nodes. Smart players anticipate events and position their portfolio accordingly.',
        tip: 'Check the MarketWire for event coverage — it tells you which sectors and regions are affected.',
        mockup: 'events',
      },
      {
        heading: 'Bankruptcy & Recovery',
        body: 'If your Company Balance hits zero and you have no income-positive nodes, bankruptcy triggers. You lose all nodes, your credit rating drops, and you restart with reduced capital. The board will also sack you if satisfaction drops to zero. To avoid this: always maintain positive net income, keep emergency cash reserves, and don\'t over-leverage with loans.',
        tip: 'Loans can prevent bankruptcy temporarily but add interest expenses — use them carefully.',
        mockup: 'bankruptcy',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // GAME MODES — one tutorial per mode
  // ════════════════════════════════════════════════════════════
  {
    id: 'mode-campaign',
    category: 'modes',
    title: 'Campaign Mode',
    subtitle: 'Persistent empire progression',
    icon: '◉',
    color: '#00e5ff',
    gradient: 'linear-gradient(135deg, rgba(0,229,255,0.28), rgba(8,18,30,0.80))',
    summary: 'Your main game mode — build a persistent empire that saves and grows over time.',
    steps: [
      {
        heading: 'Getting Started',
        body: 'Campaign is the core AEGIS experience. You start with €100K and a blank globe. Your progress saves automatically (cloud sync if logged in, localStorage if offline). Every acquisition, trade, and decision persists across sessions. This is where you build your long-term financial empire.',
        tip: 'Log in with an account to enable cloud saves — your empire syncs across devices.',
        mockup: 'campaign-start',
      },
      {
        heading: 'The Game Loop',
        body: 'The campaign loop is: (1) Acquire income-generating nodes → (2) Use income to trade instruments → (3) Reinvest profits into more nodes and R&D → (4) Upgrade departments to reduce costs → (5) Expand into new sectors and regions → (6) Compete on the leaderboard. Each tick advances the economy, so the game progresses even while you\'re making decisions.',
        tip: 'The key metric is net income per tick. Maximize this and everything else follows.',
        mockup: 'campaign-loop',
      },
      {
        heading: 'Persistent Shared World',
        body: 'Campaign now runs on a persistent shared server — all players see the same stock market, the same game clock, and the same world events. Your progress continues even when you\'re offline. Max 100 players per server instance. This shared environment creates a controlled micro-economics laboratory where every player\'s actions impact the same economy.',
        tip: 'The server runs 24/7 — your node income keeps accruing even when you\'re not playing.',
        mockup: 'campaign-shared',
      },
      {
        heading: 'Milestones & Unlocks',
        body: 'As your net worth grows, new features unlock: €50K opens Commodities/Forex/Bonds trading. €250K opens Real Estate. €500K opens the Art Market. Higher ECFL scores unlock better Athena AI responses. Completing Academy courses unlocks specialized tools and strategies.',
        tip: 'Check the Asset class badges in the Exchange to see what you\'ve unlocked.',
        mockup: 'campaign-milestones',
      },
    ],
  },
  {
    id: 'mode-offline',
    category: 'modes',
    title: 'Offline Mode',
    subtitle: 'Practice without connectivity',
    icon: '⊘',
    color: '#9CA3AF',
    gradient: 'linear-gradient(135deg, rgba(156,163,175,0.22), rgba(10,14,22,0.80))',
    summary: 'Same as Campaign but runs entirely locally — no cloud sync, no online features.',
    steps: [
      {
        heading: 'When to Use Offline',
        body: 'Offline mode is identical to Campaign except: no cloud sync, no leaderboard, no multiplayer features. Use it when you don\'t have internet or want to experiment without affecting your main save. State saves to localStorage only.',
        tip: 'Great for testing risky strategies before trying them in your real Campaign.',
        mockup: 'offline',
      },
      {
        heading: 'Limitations',
        body: 'Athena AI requires an internet connection for full chat capabilities. In offline mode, Athena falls back to local Ollama if installed, or shows limited functionality. MarketWire article generation also requires connectivity.',
        tip: 'Install Ollama locally for full Athena AI support even in offline mode.',
        mockup: 'offline-limits',
      },
    ],
  },
  {
    id: 'mode-quickmatch',
    category: 'modes',
    title: 'Quick Match',
    subtitle: '10-min competitive PvP arena',
    icon: '⚔',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.30), rgba(14,10,20,0.80))',
    summary: 'Fast-paced 10-minute matches against other players at 10x game speed.',
    steps: [
      {
        heading: 'Match Format',
        body: 'Quick Match drops 10 players into a shared economy with equal starting capital. Game speed is 10x (1 tick every 3 seconds instead of 30). The match lasts 10 minutes. Highest net worth at the end wins. Aggressive play is rewarded — steal nodes, sabotage rivals, and trade fast.',
        tip: 'Acquire cheap finance nodes immediately — the income compound effect is crucial at 10x speed.',
        mockup: 'qm-format',
      },
      {
        heading: 'PvP Actions',
        body: 'During matches, you can: steal rival nodes (costs 2x, adds heat), launch cyber strikes (disrupts enemy operations), deploy infiltrator agents (reveals enemy finances), poach employees (steal their card multipliers), and make public market calls on the match social feed.',
        tip: 'Cyber strikes on a rival\'s highest-income node can swing the match in your favour.',
        mockup: 'qm-pvp',
      },
      {
        heading: 'Match Leaderboard',
        body: 'A live leaderboard shows all player net worths updating in real-time. The match social feed generates bot activity and tracks player actions for everyone to see. Intel agents reveal other players\' details on the leaderboard.',
        tip: 'Watch the leaderboard to decide when to attack — strike when the leader overextends.',
        mockup: 'qm-leaderboard',
      },
    ],
  },
  {
    id: 'mode-private',
    category: 'modes',
    title: 'Private Server',
    subtitle: 'Custom games with friends',
    icon: '⬡',
    color: '#a78bfa',
    gradient: 'linear-gradient(135deg, rgba(167,139,250,0.28), rgba(10,12,24,0.80))',
    summary: 'Create custom lobbies with your own rules, duration, and player list.',
    steps: [
      {
        heading: 'Creating a Server',
        body: 'From the Private Server panel, choose between Campaign (persistent shared world) or Private Server (custom room). For private servers, set game duration (5-20 min or unlimited), starting capital (100K-5M), time multiplier (5x/10x/20x), max players, event frequency, and whether agents are allowed. Share the room code with friends to join.',
        tip: 'Unlimited duration servers are perfect for teaching friends the game at a relaxed pace.',
        mockup: 'ps-create',
      },
      {
        heading: 'Custom Rules',
        body: 'Private servers support all the same PvP actions as Quick Match plus: node stealing, agent poaching, fast heat decay, and custom starting conditions. The host controls all game parameters before launch.',
        tip: 'Try a "no-PvP" private server for cooperative play — focus on who can grow fastest peacefully.',
        mockup: 'ps-rules',
      },
    ],
  },
  {
    id: 'mode-academy',
    category: 'modes',
    title: 'Academy Mode',
    subtitle: 'Structured financial education',
    icon: '◈',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(10,16,22,0.80))',
    summary: 'Learn real finance through interactive courses, quizzes, and ECFL certification.',
    steps: [
      {
        heading: 'Course Library',
        body: 'The Academy is a digital library with courses across ECFL bands: F1 (Foundation), F2 (Intermediate), and F3 (Advanced). Courses cover: markets, trading, corporate finance, risk management, macroeconomics, and more. Each course has textbook-style lessons with interactive content blocks.',
        tip: 'F1 courses are free — start with "Introduction to Financial Markets".',
        mockup: 'academy-courses',
      },
      {
        heading: 'Exams & Certification',
        body: 'Each course has lesson quizzes and a final exam. Pass with 70%+ to earn the course badge and XP reward. Complete all courses in a band to earn your ECFL certification for that level. Your ECFL score appears in the top bar.',
        tip: 'Retakes are unlimited — no penalty for failing. Use failures as passive learning opportunities.',
        mockup: 'academy-exams',
      },
      {
        heading: 'Athena AI Tutor',
        body: 'In Academy mode, Athena acts as a personal tutor. Ask her to explain concepts, quiz you on topics, or recommend which course to take next based on your current ECFL level and knowledge gaps.',
        tip: 'Ask Athena "explain options trading like I\'m 5" for simplified explanations of complex topics.',
        mockup: 'academy-athena',
      },
    ],
  },
  {
    id: 'mode-social',
    category: 'modes',
    title: 'Social Mode',
    subtitle: 'BizTok and community',
    icon: '◎',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(14,12,16,0.80))',
    summary: 'Post market predictions, build followers, and interact with the community feed.',
    steps: [
      {
        heading: 'BizTok Feed',
        body: 'Social mode opens a social media feed (BizTok) where you post text updates, make market predictions (bull/bear calls), and interact with other players. Correct predictions earn XP and followers. Your follower count reflects your reputation.',
        tip: 'Consistent correct market calls build your follower count fastest.',
        mockup: 'social-feed',
      },
      {
        heading: 'Market Calls',
        body: 'Make public predictions on instruments: BULL (price will rise) or BEAR (price will fall). When the market ticks, your prediction is graded. Correct calls earn reputation, followers, and bonus XP. Wrong calls have no penalty but affect your accuracy score.',
        tip: 'Look at the Exchange charts before making calls — technical analysis works in AEGIS.',
        mockup: 'social-calls',
      },
    ],
  },
  {
    id: 'mode-lab',
    category: 'modes',
    title: 'Lab Mode',
    subtitle: 'Risk-free simulation trading',
    icon: '⚗',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.28), rgba(14,12,18,0.80))',
    summary: 'Practice trading with simulated money — no risk to your real portfolio.',
    steps: [
      {
        heading: 'Simulation Environment',
        body: 'Lab mode gives you a separate simulated portfolio with virtual cash. Trade any instrument without affecting your Campaign balance. Prices use the same market engine but your positions are isolated.',
        tip: 'Use Lab to test high-risk strategies (leverage, concentrated bets) before deploying real capital.',
        mockup: 'lab-sim',
      },
      {
        heading: 'Speed Controls',
        body: 'Lab mode has speed controls (1x, 2x, 5x) so you can fast-forward through market ticks and see how your strategy plays out over time. This is the best way to learn how price patterns work.',
        tip: '5x speed lets you see months of market data in minutes — great for pattern recognition.',
        mockup: 'lab-speed',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // FEATURE DEEP-DIVES — specific game systems
  // ════════════════════════════════════════════════════════════
  {
    id: 'globe',
    category: 'features',
    title: 'Globe Command View',
    subtitle: 'Your strategic headquarters',
    icon: '🌐',
    color: '#00e5ff',
    gradient: 'linear-gradient(135deg, rgba(0,229,255,0.30), rgba(8,18,30,0.80))',
    summary: 'Navigate the 3D globe, acquire nodes, and manage territorial overlays.',
    steps: [
      {
        heading: 'Navigate the Globe',
        body: 'Click and drag to pan. Scroll to zoom. Right-click drag to rotate and tilt the 3D view. The map shows all available nodes — green (yours), red (market), orange (rivals).',
        tip: 'Zoom in past level 8 to see 3D building extrusions and sector-specific shapes.',
        mockup: 'globe-nav',
      },
      {
        heading: 'Node Types & Sectors',
        body: 'Nodes are income-generating assets across 13 sectors: Finance, Tech, Energy, Oil & Gas, Manufacturing, Pharma, Healthcare, Education, Cultural, Hospitality, Defense, Retail, and Venue.',
        tip: 'Owning 3+ nodes of the same type triggers a 1.5x monopoly income bonus.',
        mockup: 'sectors',
      },
      {
        heading: 'Layers & Filters',
        body: 'Use the right-side panel to switch between overlay modes: Corporate (ownership), Routes (trade corridors), Threats (risk heat), Sentiment (market mood), and ESG (sustainability).',
        tip: 'The Threats layer highlights nodes with >70% risk exposure in red.',
        mockup: 'layers',
      },
      {
        heading: 'Acquiring Nodes',
        body: 'Click any red (market) node to open its detail panel. Choose BUILD (60% cost, takes 3 months) or BUY (full cost, instant). Building nodes can be rushed from the Task Manager.',
        tip: 'Start with Finance and Tech nodes — best income-to-cost ratio early game.',
        mockup: 'acquire',
      },
    ],
  },
  {
    id: 'trading',
    category: 'features',
    title: 'Exchange & Trading',
    subtitle: 'Markets, instruments, and portfolio',
    icon: '📈',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.28), rgba(12,14,20,0.80))',
    summary: 'Trade 57 stocks, crypto, forex, commodities, bonds, real estate, and art.',
    steps: [
      {
        heading: 'The Exchange',
        body: 'Open EXCHANGE from the top nav. Browse instruments with live prices, daily change, market cap, and candlestick charts. Asset classes unlock at net worth thresholds: €50K → Commodities/Forex/Bonds, €250K → Real Estate, €500K → Art.',
        tip: 'Use the Watchlist to track instruments you\'re interested in without buying.',
        mockup: 'exchange',
      },
      {
        heading: 'Buying & Selling',
        body: 'Select an instrument, enter a quantity, and click BUY or SELL. Cost basis, P&L, and portfolio allocation update in real time. Prices tick every game month.',
        tip: 'Diversify across sectors to reduce portfolio volatility.',
        mockup: 'trading',
      },
    ],
  },
  {
    id: 'routes',
    category: 'features',
    title: 'Trade Routes',
    subtitle: 'Global supply chain logistics',
    icon: '🚢',
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, rgba(14,165,233,0.28), rgba(8,14,26,0.80))',
    summary: 'Build sea, rail, air, and truck corridors between your nodes for bonus income.',
    steps: [
      {
        heading: 'Creating Routes',
        body: 'Open the ROUTES tab and select two owned nodes. Choose a type: Sea (cheapest), Rail (medium), Air (expensive, fast), or Truck (short-range). Each route generates monthly throughput income.',
        tip: 'Sea routes between continents give the highest base income.',
        mockup: 'routes-create',
      },
      {
        heading: 'Route Upgrades & Corridors',
        body: 'Upgrade routes with cargo capacity, speed, and security improvements. Pre-defined high-value corridors (Suez Canal, Silk Road) give bonus multipliers when your routes align.',
        tip: 'Check the ROUTES layer on the globe to see corridor paths highlighted.',
        mockup: 'routes-upgrade',
      },
    ],
  },
  {
    id: 'rnd',
    category: 'features',
    title: 'Research & Development',
    subtitle: 'Unlock competitive advantages',
    icon: '🔬',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.28), rgba(10,12,22,0.80))',
    summary: 'Research projects that boost income, reduce costs, and unlock new capabilities.',
    steps: [
      {
        heading: 'Starting Research',
        body: 'Open the R&D tab. Projects span Efficiency, Revenue, Defense, and Expansion categories. Each has a cost, duration, success rate, and effect. Higher R&D department levels unlock better projects.',
        tip: 'You can rush research from the Task Manager for 75% of the project cost.',
        mockup: 'rnd-start',
      },
      {
        heading: 'Applying Results',
        body: 'Completed research auto-applies: income multipliers, cost reductions, new node types, or governance boosts. Failed research gives partial XP. Stack efficiency projects for compounding bonuses.',
        tip: 'Prioritize revenue research early — the income compounds over many ticks.',
        mockup: 'rnd-results',
      },
    ],
  },
  {
    id: 'athena',
    category: 'features',
    title: 'Athena Intelligence',
    subtitle: 'Your AI Chief of Staff',
    icon: '⚡',
    color: '#a78bfa',
    gradient: 'linear-gradient(135deg, rgba(124,58,237,0.32), rgba(11,15,26,0.80))',
    summary: 'Natural language commands, strategic proposals, daily briefings, and auto-execution.',
    steps: [
      {
        heading: 'Chat with Athena',
        body: 'Type natural language commands: "buy 10 shares of AAPL", "what should I invest in?", "acquire the cheapest tech node near London". Athena has access to all your game data and can execute actions directly.',
        tip: 'Athena can chain actions: "Research competitors then acquire the weakest node."',
        mockup: 'athena-chat',
      },
      {
        heading: 'Proposals & R&D',
        body: 'Complex requests generate multi-option proposals with cost estimates, risk analysis, and expected returns. If Athena lacks a tool, she runs an R&D cycle to figure it out.',
        tip: 'Quick actions (⚡ button) skip AI parsing and execute instantly.',
        mockup: 'athena-proposals',
      },
      {
        heading: 'Daily Briefings',
        body: 'The BRIEF tab gives a daily executive summary: top movers, portfolio performance, risk alerts, and recommended next actions generated from your current game state.',
        tip: 'Check the brief after every few ticks to catch compliance warnings early.',
        mockup: 'athena-brief',
      },
    ],
  },
  {
    id: 'politics',
    category: 'features',
    title: 'Politics & Government',
    subtitle: 'Influence, lobby, and govern',
    icon: '\u2696',
    color: '#a78bfa',
    gradient: 'linear-gradient(135deg, rgba(167,139,250,0.28), rgba(10,12,22,0.80))',
    summary: 'Form governments, lobby for regulations, build your political career, and attempt coups.',
    steps: [
      {
        heading: 'Corporate Politics',
        body: 'The Politics tab in Empire Overview shows all 36+ countries with their government type, approval rating, GDP, and status. Click any country to see its regulations (corporate tax, income tax, labor laws, environmental rules) and available political actions.',
        tip: 'Countries with low stability are easier to influence — check the stability percentage before investing.',
        mockup: 'politics-overview',
      },
      {
        heading: 'Political Career',
        body: 'The Career tab tracks your personal political progression. Start as a Private Citizen and build political XP and campaign funds. Deposit to your campaign fund (\u20AC100K, \u20AC1M, or \u20AC10M) to increase your political influence and unlock higher political ranks.',
        tip: 'Political rank affects your lobbying effectiveness and government formation success rate.',
        mockup: 'politics-career',
      },
      {
        heading: 'Government & Lobbying',
        body: 'Form a government in any country by choosing a type: Democracy (stable), Autocracy (fast), Council (resilient), or Corporate State (max tax efficiency). Once formed, lobby for regulatory changes — support or oppose active campaigns to shift tax rates and business laws in your favour.',
        tip: 'Corporate State government type gives the best tax efficiency but draws more heat.',
        mockup: 'politics-lobby',
      },
    ],
  },
  {
    id: 'agents',
    category: 'features',
    title: 'Agent Operations',
    subtitle: 'Deploy, manage, and trade NFT agents',
    icon: '\uD83D\uDD75',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.28), rgba(14,10,20,0.80))',
    summary: 'Recruit agents from universities, assign them to departments, complete SBC contracts, and trade on the marketplace.',
    steps: [
      {
        heading: 'Agent Office',
        body: 'The Agency panel shows your agent office with department floors: Executive, Trading, R&D, Operations, Intelligence, and Main Floor. Each floor has a productivity score based on assigned agents. Reassign agents between departments using the dropdown selector on each agent card.',
        tip: 'Match agent classes to their floor — Traders on Trading Floor, Coders on R&D Floor for best productivity.',
        mockup: 'agents-office',
      },
      {
        heading: 'Recruitment',
        body: 'Scout new agents from university partnerships. Each society specializes in different agent classes: Finance Society (Traders/Analysts), Computer Science Society (Coders/Autonomous), Intelligence Club (Infiltrators/Researchers). Better universities cost more but yield higher rarity agents.',
        tip: 'Rare and Epic agents have significantly higher stat multipliers — worth the extra cost.',
        mockup: 'agents-recruit',
      },
      {
        heading: 'Squad Builder Contracts',
        body: 'SBC contracts are client briefs requiring specific agent compositions. Fill each slot with a matching agent (class and minimum OVR rating), then submit to earn the payout. Agents used in SBCs are transferred to the client permanently.',
        tip: 'Start with Starter SBCs (\u20AC25K) — they require lower-rated agents you can easily recruit.',
        mockup: 'agents-sbc',
      },
    ],
  },
  {
    id: 'wire',
    category: 'features',
    title: 'MarketWire',
    subtitle: 'News, intel, and market signals',
    icon: '📰',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.28), rgba(14,12,18,0.80))',
    summary: 'AI-generated news articles, agent reports, and market bulletins.',
    steps: [
      {
        heading: 'News & Agent Reports',
        body: 'MarketWire generates dynamic articles based on your actions. Deployed agents file reports about rival activity and market opportunities. Higher-tier agents produce more detailed intel.',
        tip: 'News sentiment affects your public reputation and follower count.',
        mockup: 'wire-news',
      },
      {
        heading: 'Market Bulletins',
        body: 'Automated bulletins track sector performance, top movers, and macro trends. Use these to inform trading decisions and node acquisition strategy. Bulletins update each tick.',
        tip: 'Read bulletins before making large purchases — they reveal sector momentum.',
        mockup: 'wire-bulletins',
      },
    ],
  },
];

/** Wireframe mockup placeholder */
function MockupPlaceholder({ gradient, label }) {
  return (
    <div
      className="relative rounded-lg overflow-hidden border"
      style={{
        background: gradient || 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(8,18,30,0.80))',
        borderColor: 'rgba(255,255,255,0.08)',
        height: 180,
      }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute top-3 left-3 right-3 flex gap-2">
        <div className="h-2 rounded-full bg-white/10" style={{ width: '30%' }} />
        <div className="h-2 rounded-full bg-white/10" style={{ width: '20%' }} />
        <div className="h-2 rounded-full bg-white/6" style={{ width: '15%' }} />
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1.5">
        <div className="h-1.5 rounded-full bg-white/8" style={{ width: '70%' }} />
        <div className="h-1.5 rounded-full bg-white/6" style={{ width: '50%' }} />
        <div className="h-1.5 rounded-full bg-white/5" style={{ width: '60%' }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/25">{label || 'Preview'}</span>
      </div>
    </div>
  );
}

/** Detail page for a single tutorial section */
function TutorialDetail({ section, onBack }) {
  const [activeStep, setActiveStep] = useState(0);
  const step = section.steps[activeStep];

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col font-mono overflow-hidden"
      style={{ background: '#050810' }}
    >
      {/* Subtle ritual atmosphere — same world, dialled down so the
          tutorial card content reads cleanly. */}
      <RitualBackdrop density="subtle" />

      {/* Header */}
      <div
        className="relative z-10 flex items-center gap-3 px-5 py-3 border-b shrink-0"
        style={{
          background: 'rgba(8,12,20,0.95)',
          borderColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <button
          onClick={onBack}
          className="text-white/40 hover:text-white/80 text-xs transition-colors px-2 py-1 rounded border border-white/10 hover:border-white/25"
        >
          ← BACK
        </button>
        <span className="text-lg">{section.icon}</span>
        <div>
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: section.color }}>
            {section.title}
          </div>
          <div className="font-serif italic text-[10px] text-white/45 tracking-normal">{section.subtitle}</div>
        </div>
        <div className="ml-auto text-[8px] text-white/20 tracking-wider">
          {activeStep + 1} / {section.steps.length}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-5 py-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Left: step navigation */}
          <div className="space-y-2">
            {section.steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className="w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-all duration-200"
                style={{
                  background: i === activeStep ? 'rgba(255,255,255,0.04)' : 'transparent',
                  borderColor: i === activeStep ? `${section.color}40` : 'rgba(255,255,255,0.04)',
                  boxShadow: i === activeStep ? `0 0 12px ${section.color}10` : 'none',
                }}
              >
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold mt-0.5"
                  style={{
                    background: i === activeStep ? `${section.color}25` : 'rgba(255,255,255,0.05)',
                    color: i === activeStep ? section.color : 'rgba(255,255,255,0.3)',
                    border: `1px solid ${i === activeStep ? `${section.color}50` : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <div
                    className="text-[10px] font-bold tracking-[0.06em]"
                    style={{ color: i === activeStep ? '#E8E0D0' : 'rgba(255,255,255,0.4)' }}
                  >
                    {s.heading}
                  </div>
                  {i === activeStep && (
                    <div className="text-[8px] text-white/30 mt-0.5 leading-relaxed line-clamp-2">
                      {s.body.slice(0, 80)}...
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Right: active step detail */}
          <div className="space-y-4">
            <MockupPlaceholder gradient={section.gradient} label={step.mockup} />

            <div>
              <h3
                className="text-[13px] font-bold tracking-[0.08em] mb-2"
                style={{ color: section.color }}
              >
                {step.heading}
              </h3>
              <p className="text-[10px] text-white/65 leading-[1.7]">
                {step.body}
              </p>
            </div>

            {step.tip && (
              <div
                className="rounded-lg border p-3 flex gap-2"
                style={{
                  background: `${section.color}08`,
                  borderColor: `${section.color}20`,
                }}
              >
                <span className="text-amber-400 text-xs shrink-0">💡</span>
                <p className="text-[9px] leading-relaxed" style={{ color: `${section.color}cc` }}>
                  {step.tip}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="text-[9px] font-mono px-3 py-1.5 rounded border border-white/10 text-white/40 hover:text-white/80 hover:border-white/25 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                ← PREV
              </button>
              {activeStep < section.steps.length - 1 ? (
                <button
                  onClick={() => setActiveStep(activeStep + 1)}
                  className="text-[9px] font-mono px-3 py-1.5 rounded border transition-all"
                  style={{
                    borderColor: `${section.color}40`,
                    color: section.color,
                    background: `${section.color}10`,
                  }}
                >
                  NEXT →
                </button>
              ) : (
                <button
                  onClick={onBack}
                  className="text-[9px] font-mono px-3 py-1.5 rounded border border-emerald-400/40 text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 transition-all"
                >
                  ✓ DONE
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { TUTORIAL_SECTIONS, TUTORIAL_CATEGORIES, TutorialDetail, MockupPlaceholder };
export default TutorialDetail;
