# QUANTICO COMPLETE FEATURE LIST
## Exhaustive Feature & Mechanic Specification
### For AI Architecture Work

---

## TABLE OF CONTENTS
1. CORE LOOP
2. MARKET & TRADING
3. EMPIRE BUILDING
4. ECONOMY
5. PROGRESSION
6. EDUCATION
7. SOCIAL & COMPETITIVE
8. MONETIZATION
9. CRIME & POLITICS
10. ENGAGEMENT & RETENTION
11. SANDBOX & PRACTICE
12. VISUAL & UI
13. INFRASTRUCTURE

---

## 1. CORE LOOP

### **Focus Timer**
What it is: A 25-minute Pomodoro timer that generates revenue and runs business operations passively.
How it works: Player starts timer → €3/minute accumulates to company balance → at 25 minutes, €75 earned + notifications fire for passive department income + loot drops trigger. Timer can be paused/resumed. Multiple simultaneous timers possible. Offline detection: if app closes during session, restarts credit player time elapsed.
Connections: Triggers departmental income, loot drops, mystery boxes, engagement notifications, project progress, XP awards.
Current state: Built and working.

### **Daily Login Bonus**
What it is: Streak-based bonus progression for returning each day.
How it works: Day 1: €150, Day 2: €300, Day 3: €600, Day 4: €1,000, Day 5: €1,500, Day 6: €2,000, Day 7: €3,000. Streaks reset on missed day. Tracked by date string 'YYYY-MM-DD'. Award goes to company balance (sandbox.balance). Claim via button in Empire or Dashboard.
Connections: Engagement engine, gamification, notifications.
Current state: Built.

### **Loot Drops**
What it is: Random rewards triggered during focus sessions.
How it works: Small random chance during session (tracked in code). Awards €75–€750 to company balance. Immediately granted. Visual celebration popup.
Connections: Focus timer, engagement engine, notifications.
Current state: Built.

### **Mystery Boxes**
What it is: 30% chance instead of loot drop.
How it works: Replaces loot drop. Grants €150–€1,000 + 50 XP to personal XP pool. Stored as pending notification. Opens via claim action.
Connections: Loot system, XP/leveling, engagement.
Current state: Built.

### **Trading (Live Market)**
What it is: Primary income activity. Player executes buy/sell orders on real asset prices.
How it works: Player selects asset (stocks or crypto), enters quantity, clicks buy/sell. Order executes at current price. Cost basis tracked per asset. Holdings updated. Portfolio value recalculated. Tax implications queued for next tax month. Commissions: 0.5% of volume. Profit/loss recorded in history. XP awarded based on P&L magnitude.
Mechanics: Leverage up to 3× (derivatives). Options trading available. Stop-loss + take-profit orders supported. Slippage simulated: ±2% variance on execution. Short selling available (requires derivatives unlock).
Connections: Portfolio, dashboard, desk, indicators, charts, price history, tax system, crime (insider trading), PvP (trading-based attacks).
Current state: Built, fully functional.

### **Portfolio Tracking**
What it is: Real-time view of all holdings and performance.
How it works: Dashboard displays: total balance, portfolio value, net worth, 24h return %, monthly return %, annual return %. Breakdown by asset, by segment (stocks/crypto/commodities/forex/bonds/real estate/art). Cost basis tracking. Unrealized gains/losses. Sharpe ratio calculation from daily snapshots.
Connections: All trading, price system, dashboard, desk.
Current state: Built.

---

## 2. MARKET & TRADING

### **Live Price Feed**
What it is: Real-time asset prices from external APIs (Yahoo Finance for stocks, CoinGecko for crypto).
How it works: Refresh every 5 seconds (configurable). Price stored in state.prices. History appended to state.priceHistory (max 600 ticks = ~50 hours). Per-session variation: ±12% for stocks, ±15% for crypto (random multiplier fixed per session, varies across price refresh windows). News shock mechanic: major drifts trigger ±20–30% shocks at 45% probability; medium drifts ±5–12% at 35%; minor ±2–6% at 25%.
Connections: Charts, indicators, portfolio, trading, price ticks.
Current state: Built, real-time feed active.

### **8 Technical Indicators**
What it is: Charting tools for price analysis.
Indicators:
- **SMA (Simple Moving Average)**: 20, 50, 200-period. Calculated from price history.
- **EMA (Exponential Moving Average)**: 12, 26-period. Weighted toward recent prices.
- **MACD**: 12-26-9 (signal line). Momentum indicator. Histogram shows divergence.
- **RSI (Relative Strength Index)**: 14-period. Overbought >70, oversold <30.
- **Bollinger Bands**: 20-period, ±2 SD. Upper/lower bands + middle band.
- **ATR (Average True Range)**: 14-period. Volatility measure.
- **Stochastic Oscillator**: %K and %D lines. Momentum in range [0,100].
- **Volume Profile**: Cumulative volume at price levels (if volume data available).
How it works: Toggle each indicator on/off. Displayed as overlays on candle chart. Calculated in real-time from price history. Values cached to avoid recalc every tick.
Connections: Charts, trading decisions, MarketLab, replay scenarios.
Current state: Built, all 8 functional.

### **Candlestick & Line Charts**
What it is: Multiple chart types for price visualization.
How it works: Candlestick (OHLC), Line (close prices), Bar (typical price). Timeframes: 1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M. Chart renders last N candles (configurable, default 100). Zoom: ±10% view range. Pan: scroll left/right through history. Crosshair: hover shows price/time. Tooltip: OHLC values + volume (if available). Y-axis: price range auto-scaled. X-axis: time labels.
Connections: Indicators, trading, analysis.
Current state: Built, fully functional.

### **Watchlists (Custom)**
What it is: User-created asset collections for quick access.
How it works: Create watchlist (name + description). Add/remove assets. Watchlists stored in state.desk.customWatchlists. Each has: id, name, assets (symbol array), createdAt, notes. Display: card grid showing asset, price, 24h change %. Click to expand details or trade. Export as CSV.
Connections: Desk, research, trading.
Current state: Built.

### **Market Segments (6 Total)**
What it is: Asset class divisions.
Segments:
1. **Stocks** (35 assets): AAPL, MSFT, GOOGL, AMZN, etc. Real tickers. Yahoo Finance pricing.
2. **Crypto** (15 assets): BTC, ETH, SOL, ADA, XRP, etc. CoinGecko pricing. ±15% volatility.
3. **Commodities** (5 assets): WTI (crude oil), gold, silver, copper, natural gas. Yahoo Finance. ±10% volatility. Unlock: NW ≥ €50K + Macro course.
4. **Forex** (4 pairs): EUR/USD, GBP/USD, USD/JPY, AUD/USD. ExchangeRate API (TODO). ±3% volatility. Unlock: NW ≥ €50K + Macro course.
5. **Bonds** (3 assets): US 10Y (US10Y), German 10Y (DE10Y), Corporate Bond ETF (LQD). FRED/ECB data (TODO). Price = inverse yield. ±5% volatility. Unlock: NW ≥ €50K + Macro course.
6. **Real Estate** (5 assets): Residential apartments (RES_APT), commercial offices (COM_OFF), industrial (IND), retail (RETAIL), mixed-use (MIXED). Simulated prices. ±8% volatility. Unlock: NW ≥ €250K + Tangible Assets course.

Unlock mechanics: Hidden until both NW threshold AND course completion met. Unlock event fires pub/sub 'marketUnlocked' → curriculum re-renders to show new courses.

### **Alt Investments (PE/VC/HF/M&A)**
What it is: Four alternative asset classes with longer timelines and different mechanics than spot trading.
How it works:

**Private Equity (LBO) Deals:**
- Pool of available target companies (refreshed each fiscal month)
- Buy into deal: €50K–€500K investment
- Hold period: 12–36 months (simulated time)
- Multiple (exit): 2–5× invested capital
- Risk: 15–30% of deals fail (total loss)
- Management fee: 2% annually
- Carry: 20% of upside above hurdle rate (8%)
- State: state.tycoon.peDeals (pool), state.tycoon.peOwned (acquired)

**Venture Capital (VC) Deals:**
- Early-stage startups
- Investment: €25K–€250K per round
- Dilution: each round 20–30% founder dilution
- Timeline: seed → Series A → B → C → exit
- Outcomes: 90% fail (€0), 9% moderate exit (3–10×), 1% unicorn (50–100×)
- No management fee, no carry
- State: state.tycoon.vcDeals (available), state.altInvestments.vcPortfolio (owned)

**Hedge Fund (HF) Allocations:**
- Allocate capital to 4 strategies: Long/Short, Global Macro, Arbitrage, Event-Driven
- Monthly returns: strategy-dependent (±2–8% per month)
- Redemption: 30-day notice, 1% redemption fee
- High-water mark: no fees until new peak NAV reached
- State: state.tycoon.hfStrategies.allocations

**Mergers & Acquisitions (M&A):**
- Target acquisition opportunities
- Bidding: compete against NPC bidders in auction
- Premium: 20–50% above target book value
- Post-acquisition: integrate, optimize, exit or hold
- Synergies: realized over 6–12 months
- State: state.altInvestments.maTargets, state.altInvestments.ownedCompanies

**Fiscal Month Ticker:**
- Advances every 8 price ticks (real-time)
- PE/VC/HF/M&A progress tracked at fiscal month granularity
- Deal refreshes, returns posted, timeline advances

Unlock: Alt Investments market unlock requires NW ≥ €1M + Public Company structure.

### **Derivatives & Leverage**
What it is: Advanced trading tools.
How it works:
- **Leverage**: 2× or 3× on spot holdings. Margin call at 150% of position value. Liquidation at 120%. Daily financing fee: 0.05% on leveraged portion.
- **Options**: Call/put contracts on stocks/crypto. Strike prices: ±10–20% OTM. Expiry: 1w/1M/3M/6M. Greeks calculated: Delta, Gamma, Vega, Theta. Pricing via Black-Scholes approximation. Exercise: automatic at profit or let expire. Profit/loss on exercise goes to portfolio.
- **Futures**: 4× leverage. Contracts: BTC/USD, ETH/USD, WTI/USD, AU/USD (gold). Daily settlement. Mark-to-market losses deducted immediately. Position limits: max 10 contracts per symbol.

Mechanics: Separate from spot holdings. Stored in state.sandbox.derivatives. Tracking: cost basis, P&L, Greeks, time decay. Unlock: Derivatives course required.

Current state: Built, all three mechanics active.

### **Market Indicators & Briefings**
What it is: News/analysis content to inform trading.
How it works: Bulletin board pulls real news from NewsAPI (or mock if unavailable). Articles tagged by asset/segment. Sentiment analysis (bullish/bearish/neutral). Briefing feature: AI generates daily market summary (3–5 key moves, opportunities, risks). Research tab: deep dives on sectors, technical analysis, valuation models. Saved notes shareable to social hub.
Connections: Desk, research, social.
Current state: Built.

### **Market Simulation (Simulated Assets)**
What it is: Secondary price engine for assets not available in live APIs.
How it works: Commodities, forex, bonds, real estate, art all use simulated pricing. Each asset: base price + random walk. News events affect clusters (e.g., interest rate rise → all bonds down 4%). Event pool: 8 event types, fire every 8 ticks. Effects decay linearly. Seeded for reproducibility.
State: state.tycoon.simPrices, state.tycoon.simPriceHistory.
Connections: Commodities/forex/bonds/real estate/art trading, charts.
Current state: Built, fully functional.

---

## 3. EMPIRE BUILDING

### **Dual-Wallet System**
What it is: Separation between personal and company finances.
How it works:
- **Company Wallet (Sandbox Balance)**: All business income (focus timer, dept income, venue income, trading profits). Starts at €0 (changed from €10K). Used for: corporate expenses, structure fees, department builds, venue purchases, lobbying costs.
- **Personal Wallet**: Personal savings. Starts at €50,000. Used for: luxury items, living expenses, personal loans, direct investments (if desired). Earns sponsorship income from followers.
- **Sole Traders/Partnerships**: Can freely transfer between wallets (no tax penalty).
- **LLC+**: Must use formal compensation methods (salary, dividends, bonuses, stock options, expense account) to move money from company → personal. Each method has different tax rates.

State: state.personal.balance, state.sandbox.balance.
Connections: All business activities, compensation, personal expenses, luxury, taxes.
Current state: Built (dual-wallet implemented).

### **Corporate Structures (6 Types)**
What it is: Business entity classes with different mechanics, tax rates, and capabilities.
How it works:

**Sole Trader (Default)**
- Cost: €0 (free)
- Tax: 25%
- Axis gates: None (default)
- Abilities: Full control. Trade immediately. Speed bonus on execution (executes 10% faster). No departments possible.
- Liability: Unlimited (bankruptcy wipes personal + company balance)
- Playstyle: Pure trader. High risk, high reward.
- Unlock: Always available.

**Partnership**
- Cost: €2,000 to establish
- Tax: 22%
- Axis gates: Growth ≥ 15, Governance ≥ 10, Impact ≥ 5
- Abilities: NPC partner contributes €5K capital + 20% of trading focus income. Partner management mini-game (loyalty 0–100, affects capital/income).
- Special: Can build 1 department (HR).
- Liability: Limited to capital contribution (partner shares losses up to their contribution).
- Playstyle: Cooperative. Shared decision-making.
- Unlock: Axes requirement met.

**LLC (Privately Held)**
- Cost: €25,000 setup fee
- Tax: 15%
- Axis gates: Growth ≥ 40, Governance ≥ 30, Impact ≥ 10
- Abilities: Limited liability. All 6 departments unlocked. Venue L5 upgrades available. Lobbying Tier 1 access. Quarterly compliance reports (small income reduction ~1% per quarter).
- Special: Can switch to any corporate structure.
- Liability: Limited (personal assets protected, only company assets at risk).
- Playstyle: Balanced builder. Most popular choice.
- Unlock: Axes requirements met.

**Public Company (IPO)**
- Cost: €5,000,000 setup + prerequisites
- Tax: 5% (lowest)
- Axis gates: Growth ≥ 80, Governance ≥ 70, Impact ≥ 20
- Prerequisites: NW ≥ €10M, Monthly recurring revenue ≥ €200K, ≥4 managed departments, Legal + Finance depts built, ≥500 trades lifetime, ≥5 courses completed, ≥3 consecutive profitable months.
- Abilities: Capital markets access. Hostile takeover mechanics (can attack AND defend). Shareholder votes on major decisions. Full political influence (Tier 4). IPO share price published. Stock buyback program. Dividend policy setting.
- Special: Most complex. Most powerful. Can acquire other players (PvP). Subject to quarterly earnings pressure.
- Mechanics: If miss quarterly MRR target → stock price drops 10% → net worth drops. Shareholder votes: can override player decisions (rare, high threshold).
- Liability: Limited.
- Playstyle: Empire builder. Maximum complexity.
- Unlock: All prerequisites met.

**Social Enterprise**
- Cost: €10,000 setup fee
- Tax: 3% (very low)
- Axis gates: Growth ≥ 20, Governance ≥ 30, Impact ≥ 50
- Abilities: Profit cap: can only retain 70% of revenue, rest to social fund (visible as Impact contribution). 20% venue discounts. Eligible for grant events (random free €10K–€50K cash). Public trust meter (affects follower growth). Social Impact Fund generates 1 Impact point per €1K retained.
- Special: Mission-focused. Trade profit for purpose.
- Liability: Limited.
- Playstyle: Ethical player. Different endgame (build 3 institutions instead of IPO).
- Unlock: Axes requirements met.

**NGO / Non-Profit**
- Cost: €5,000 setup fee
- Tax: 0% (zero tax)
- Axis gates: Growth ≥ 10, Governance ≥ 25, Impact ≥ 70
- Abilities: Government grants (random events). Highest public trust. Institution-building 30% discount. Watchdog ability vs corporate players (can see their crime activity, expose via social hub). Zero profit distribution (all income reinvested). No PvP (cannot be attacked, cannot attack).
- Special: Completely different endgame. Build 3 institutions as victory condition instead of IPO.
- Liability: Limited.
- Playstyle: Philanthropy-focused.
- Unlock: Axes requirements met.

**Structure Switching:**
- Cost: Target structure fee × 1.5 (e.g., LLC → Public Co = €5M × 1.5 = €7.5M)
- Penalty: −10% on all axis scores
- Cooldown: 1 month
- Requirements: Must meet target axis thresholds

State: state.tycoon.corporateStructure.
Current state: Built with all 6 structures functional.

### **Departments (6 Types, Project System)**
What it is: Business units that generate passive income and execute strategic projects.
How it works:

Each department has:
- Build cost (one-time)
- Manager cost (monthly recurring)
- Base income (no manager)
- Managed income (with hired manager)
- 1 project slot (2 if upgraded)
- Manager skill 0–100 (affects project success rate)
- Upgrade track (L1–L5, each level multiplies income 1×, 1.5×, 2.2×, 3×, 4×)

**HR Department**
- Build: €15,000
- Manager: €80,000/month
- Income (no manager): €800/month
- Income (managed): €3,000/month
- Unlock: NW ≥ €30K (WEEK 1 TARGET)
- Projects:
  - Recruitment Drive (€3K, 2 sessions): Next manager hire −20% cost
  - Employee Training (€10K, 5 sessions): All dept income +10% for 1 month
  - Culture Initiative (€8K, 4 sessions): Impact +5, staff turnover events −50%
  - Org Restructuring (€5K, 3 sessions): Governance +3, dept efficiency +5%

**Trading Floor**
- Build: €50,000
- Manager: €120,000/month
- Income (no manager): €2,000/month
- Income (managed): €8,000/month
- Unlock: NW ≥ €75K, ≥30 trades
- Projects:
  - Market Analysis (€5K, 3 sessions): Trading accuracy +5% for 1 week
  - Algorithm Backtest (€15K, 5 sessions): Unlock new indicator
  - Proprietary Strategy (€50K, 10 sessions): Passive €2K/month for 3 months, Growth +5
  - Execution Optimization (€8K, 4 sessions): Commissions −10% for 2 months

**Marketing Department**
- Build: €35,000
- Manager: €100,000/month
- Income (no manager): €1,500/month
- Income (managed): €6,000/month
- Unlock: NW ≥ €60K, ≥1 venue owned
- Projects:
  - Brand Campaign (€10K, 3 sessions): Venue income +15% for 2 weeks, Growth +3
  - Influencer Partnership (€25K, 5 sessions): Referral bonus 2× for 1 month, Impact +3, followers +500
  - Market Research (€5K, 2 sessions): Reveals hidden opportunities, Governance +1
  - Social Media Growth (€12K, 4 sessions): Followers +1K, follower decay −1%/day for 1 month

**R&D Laboratory**
- Build: €100,000
- Manager: €150,000/month
- Income (no manager): €4,000/month
- Income (managed): €15,000/month
- Unlock: NW ≥ €200K, LLC+, ≥3 courses
- Projects:
  - Product Innovation (€30K, 8 sessions): Unlock new asset class, Growth +4
  - Patent Filing (€20K, 5 sessions): Royalty income €3K/month, Governance +3
  - Industry Report (€15K, 4 sessions): Trading profits +5% for 1 month, Growth +2
  - Blue Ocean Strategy (€40K, 8 sessions): Create new market segment, Growth +8, Power +3

**Finance Office**
- Build: €75,000
- Manager: €300,000/month (most expensive)
- Income (no manager): €3,000/month
- Income (managed): €12,000/month
- Unlock: NW ≥ €300K, LLC+, ≥2 departments
- Projects:
  - Tax Optimisation (€20K, 5 sessions): Effective tax −2% for 3 months, Governance +4
  - IPO Readiness Assessment (€50K, 10 sessions): Governance +10 (toward IPO), Growth +5
  - Quarterly Audit (€10K, 3 sessions): Governance +5, blocks bad events for 1 month
  - Capital Raise (€100K, 12 sessions): Can raise €500K at 0% interest over 12 months

**Legal Department**
- Build: €60,000
- Manager: €250,000/month
- Income (no manager): €2,500/month
- Income (managed): €10,000/month
- Unlock: NW ≥ €500K, ≥3 departments
- Projects:
  - IP Protection (€15K, 4 sessions): PvP takeover vulnerability −30%, Governance +3
  - Compliance Review (€10K, 3 sessions): Governance +6, audit risk −15%
  - Contract Negotiation (€20K, 5 sessions): Next venue purchase −15%, Growth +2
  - Government Relations (€40K, 8 sessions): Power +5, unlocks Tier 1 lobbying

**Project Mechanics:**
- Cost deducted from company balance (or fails if insufficient funds)
- Duration = number of focus sessions required
- Success rate = base 60% + (manager skill × 0.4%)
- Failed project: money lost, no benefit, possible negative axis impact
- Bonus: complete project early (in fewer sessions) → +25% success rate
- Stacking: can run 1–2 projects simultaneously (upgrades allow 2 per dept)

State: state.tycoon.departments, state.tycoon.projectsInProgress.
Connections: Focus timer, income calculation, axes, unlocks.
Current state: Built, all 6 departments with full project systems.

### **Venues (12 Types, 5-Level Upgrades)**
What it is: Income-generating real estate properties.
How it works:

Each venue:
- Purchase cost (one-time)
- Base monthly income
- Upgrade levels: L1–L5 (multipliers: 1×, 1.5×, 2.2×, 3×, 4×)
- Upgrade cost per level: basePrice × [0, 0.5, 0.75, 1.0, 1.5]
- Total cost to L5 = sum of all upgrades
- Monthly income passive (no manager needed, unlike departments)
- Social Enterprise discount: 20% off purchase price

**Venue List:**
| # | Venue | Type | Purchase | L5 Total Cost | Income (L1) | Income (L5) | Unlock |
|---|-------|------|----------|---------------|------------|-----------|--------|
| 1 | The Brass Tap | Bar | €20,000 | €55,000 | €1,000 | €4,000 | NW ≥ €30K |
| 2 | Copper & Rye | Bar | €40,000 | €110,000 | €2,000 | €8,000 | NW ≥ €60K |
| 3 | The Observatory | Bar | €75,000 | €205,000 | €3,500 | €14,000 | NW ≥ €100K |
| 4 | Golden Fork | Restaurant | €50,000 | €137,000 | €2,500 | €10,000 | NW ≥ €75K |
| 5 | Ember & Oak | Restaurant | €100,000 | €275,000 | €5,000 | €20,000 | NW ≥ €150K |
| 6 | Azure Bistro | Fine Dining | €250,000 | €687,000 | €12,000 | €48,000 | NW ≥ €400K, LLC+ |
| 7 | Club Neon | Nightclub | €80,000 | €220,000 | €4,000 | €16,000 | NW ≥ €120K |
| 8 | Velvet Room | Nightclub | €200,000 | €550,000 | €10,000 | €40,000 | NW ≥ €300K |
| 9 | Pulse Lounge | Superclub | €500,000 | €1,375,000 | €25,000 | €100,000 | NW ≥ €750K, LLC+ |
| 10 | Harbor View | Hotel | €1,000,000 | €2,750,000 | €40,000 | €160,000 | NW ≥ €1.5M, LLC+ |
| 11 | Skyline Grand | Hotel | €3,000,000 | €8,250,000 | €100,000 | €400,000 | NW ≥ €5M, 4+ depts |
| 12 | Royal Palace | Luxury Hotel | €10,000,000 | €27,500,000 | €300,000 | €1,200,000 | NW ≥ €15M, Public, 5+ managed depts |

**Mechanics:**
- Income passive (no manager required)
- All income flows to company wallet
- Upgrade is optional (can own L1 forever)
- Can own multiple of same type
- Offline: income accumulates while away
- Social Enterprise: 20% purchase discount (not upgrade)
- Icons/colors in 3D city visual

State: state.tycoon.city3d.venues (map of owned venues, levels).
Connections: 3D city, company balance, net worth.
Current state: Built, all 12 venues active.

### **Institutions (Philanthropic Endgame, 3 Total)**
What it is: One-time large donations that unlock end-game and generate Impact.
How it works:

| Institution | Donation Cost | XP Bonus | Impact Gained | Unlock Requirements |
|-------------|---------------|----------|---------------|---------------------|
| City Museum | €2,000,000 | 500 | +15 Impact | NW ≥ €5M, ≥8 courses |
| General Hospital | €5,000,000 | 750 | +20 Impact | NW ≥ €10M, ≥3 L5 venues |
| City University | €10,000,000 | 1,000 | +25 Impact | NW ≥ €20M, all courses or Public Co |

**Mechanics:**
- One-time donation per institution (cannot donate twice)
- Cost deducted from company wallet
- Immediate XP + Impact award
- Visual monument in 3D city
- Can donate to all 3 (total €17M, +60 Impact, +2,250 XP)
- NGO players: 30% discount (€1.4M + €3.5M + €7M)
- Social Enterprise: 15% discount (€1.7M + €4.25M + €8.5M)
- NGO endgame: Build all 3 as victory condition instead of IPO

State: state.tycoon.city3d.institutions (map, { donated: boolean, cost, impact }).
Connections: 3D city, company wallet, Impact axis, net worth.
Current state: Built.

### **3D City Renderer**
What it is: Procedural 3D city visualization showing all buildings, venues, and institutions.
How it works:
- Three.js engine (WebGL)
- Grid-based city (expandable from 5×5 to larger)
- Procedural building generation: height, width vary by cost/type
- Camera: top-down isometric view. Pan/zoom/rotate.
- Performance monitoring: auto-downgrade to mobile quality if FPS <30
- Buildings color-coded: residential (gray), commercial (blue), luxury (gold), institution (red)
- Icons float above buildings (office, store, bank, etc.)
- Click to interact: show details panel, manage, upgrade
- GLB model import (custom 3D assets, e.g., office building)
- Responsive: scales to mobile/tablet

Rendering: Each frame, update materials based on state. Animate camera transitions. Handle clicks/hovers.
Performance: Max 50 buildings rendered simultaneously. Instances culled off-screen.

State: state.tycoon.city.buildings (array), state.tycoon.city3d.*.
Connections: Empire, focus, dashboard.
Current state: Built, fully functional.

---

## 4. ECONOMY

### **Axes (4-Axis Alignment System)**
What it is: Four independent 0–100 scores that track player style and gate content.
How it works:

**GROWTH (0–100)** — Business expansion speed & scale
| Action | Points |
|--------|--------|
| €10K trading volume executed | +1 |
| Venue purchased | +3 |
| Department built | +2 |
| PE/VC deal completed | +4 |
| PvP takeover won | +5 |
| Monthly revenue growth >20% | +1–3 |
| First 100 trades | +5 |

Unlocks: Partnership ≥15, LLC ≥40, Public ≥80.

**GOVERNANCE (0–100)** — Operational quality & compliance
| Action | Points |
|--------|--------|
| Course completed | +3 |
| Exam passed | +5 |
| Manager hired | +3 |
| Compliance event resolved correctly | +4 |
| Finance dept audit passed | +5 |
| Scenario completed | +2 |
| Crime detected | −10 to −30 |

Unlocks: Partnership ≥10, LLC ≥30, Public ≥70.

**IMPACT (0–100)** — Social/community contribution
| Action | Points |
|--------|--------|
| Institution donation | +5 per €1M |
| Social Hub post shared | +1 |
| Referral completed | +3 |
| Correct Market Call | +2 |
| Campus engagement event attended | +2 |
| NGO Watchdog action | +4 |

Unlocks: Social Enterprise ≥50, NGO ≥70.

**POWER (0–100)** — Political & regulatory influence
| Action | Points |
|--------|--------|
| Lobbying project completed | +3 to +8 |
| Super PAC funded | +5 to +15 |
| Campaign donation made | +3 |
| Lobbyist employed | +1/month (passive) |
| Top 10 campus leaderboard | +3 |
| Own 5+ venues | +2 |
| Government Relations project | +5 |

Unlocks: Tier 1 ≥15, Tier 2 ≥35, Tier 3 ≥55, Tier 4 ≥80 (political tiers).

**Mechanics:**
- Axes are additive and independent (not a slider)
- Multiple paths to each axis (no single "correct" playstyle)
- Capped at 100 (cannot exceed)
- Display: spider chart, progress bars
- Events: Random events trigger choices that shift axes (Realpolitiks-style)
  - Example: "Audit detects compliance gap" → Pay fine (−€5K, +3 Gov) OR Ignore (−5 Gov, risk penalty)

State: state.axes (growth, governance, impact, power).
Connections: Structure unlocks, political tiers, event system, gamification.
Current state: Built (axes.js module).

### **Compensation System (LLC+ Only)**
What it is: 5 methods to transfer money from company → personal wallet.
How it works:

**1. Salary**
- Tax rate: Progressive (0% <€10K/mo, 20% €10–30K, 30% €30–75K, 40% €75–150K, 45% >€150K)
- Set monthly amount (e.g., €5K/month)
- Paid automatically at month-end
- Governance +0.5 per month (shows responsible compensation)
- Example: Set €15K/month salary → pay €3K tax → receive €12K personal

**2. Dividends**
- Tax rate: Flat 27.5%
- Paid only from company retained earnings (must be profitable)
- Pay in Q1, Q2, Q3, Q4 (quarterly)
- Can declare dividend amount (e.g., "distribute 50% of profit")
- Example: Company earns €30K profit → declare 50% dividend → {{€7.5K taxed, personal receives €11.25K}}

**3. Bonus (Performance-Based)**
- Tax rate: Same as salary progressive rates
- Tied to KPI target (set KPI: "€100K revenue", "5 courses", etc.)
- If KPI hit: bonus triggered, taxed, paid to personal
- If KPI missed: no bonus
- If not attached to KPI: +15% audit risk (crime detection)

**4. Stock Options (Public Company Only)**
- Tax rate: 20% on gain at exercise
- Grant amount: vested over 3–6 months
- Strike price: set at grant time
- Exercise: convert to cash at current stock price (if profit)
- Tax only on gain (difference between strike and exercise price)

**5. Expense Account (Risky)**
- Tax rate: 0% if not caught
- Reimburse personal from company (meals, travel, etc.)
- Random audit trigger (20% per use)
- If caught: Expense Fraud crime, full amount + 1.5× back-taxes owed, Governance −5
- Governance benefit: none (risky)

State: state.personal.compensationHistory (record of all transfers).
Connections: Personal balance, company balance, taxes, crime.
Current state: Built (compensation.js).

### **Banking System (6 Banks)**
What it is: Financial institution choice affecting interest rates, audit risk, and crime.
How it works:

| Bank | Country | Deposit Rate | Loan Rate | Privacy | Scrutiny | Audit Modifier | Special |
|------|---------|-------------|-----------|---------|----------|----------------|---------|
| Deutsche Finanz | Germany | 1.5% | 5% | Low | High | 1.3× | Most transparent. +1 Governance/month |
| Banque Suisse | Switzerland | 0.5% | 4% | Very High | Low | 0.6× | Best crime cover. −40% audit risk. |
| Banco Cayman | Cayman Islands | 0% | 6% | Maximum | Very Low | 0.4× | Crime penalties 3× if caught. Zero deposit interest. |
| Anglo Commerce | UK | 2% | 5.5% | Medium | Medium | 1.0× | Balanced default. No special effects. |
| Nordik Trust | Estonia | 1% | 4.5% | Med-High | Medium | 0.85× | Digital-first. Fast txn. −15% transfer time. |
| Banca Mediterraneo | Cyprus | 1.5% | 7% | High | Low | 0.7× | Tax treaty: −2% effective tax rate. Highest loan rate. |

**Mechanics:**
- Choose primary bank at LLC formation (or earlier if desired)
- Affects: audit probability, loan availability, deposit interest, crime detection rates
- Switching: €5K cost + 1-week cooldown
- Loans: up to 3× monthly revenue, repaid over 6–12 months, miss payment → Governance −5, +5% interest for next month
- Deposit interest: earned monthly on company balance (automatic)

State: state.banking.currentBank, state.banking.loans.
Connections: Crime, taxes, company balance, loans.
Current state: Built (banking.js).

### **Crime System (6 Types, Heat Mechanic)**
What it is: Risky financial tactics with detection probability and penalties.
How it works:

| Crime | Base Detection | Penalty | Axis Impact | Notes |
|-------|---------------|---------|-------------|-------|
| Tax Evasion | ~15% per quarter | 2× evaded amount | Gov −15, Power −10 | Underreport income |
| Insider Trading | ~8% per trade | 3× profits + 30-day trading ban | Gov −20 | Trade before news |
| Money Laundering | ~3% per transaction | 2.5× laundered + venue seizure | Gov −25, Power −15 | Requires offshore bank |
| Accounting Fraud | ~12% per quarter | 1.5× + IPO revoked | Gov −30 | Inflate revenue in reports |
| Bribery | ~6% per attempt | 2× bribe amount + political ban | Power −20, Gov −10 | Used in political actions |
| Expense Fraud | ~20% per claim | 1.5× + back-taxes | Gov −5 | From Expense Account method |

**Heat Mechanic:**
- Total crime activity raises overall "heat" (0–100)
- Heat increases audit probability: +1% audit chance per heat point
- Heat decays −5 points per week if no new crimes
- Repeat offense detection: +5% detection per prior offense of same type
- Example: First tax evasion 15% detected, second 20%, third 25%, etc.

**Detection & Consequences:**
- Detected → public scandal event in social hub (visible to all players)
- All followers see notification, −30% followers immediate
- Assets may be seized (venue, luxury items)
- Governance penalty enforced
- Political access revoked (if applicable)
- Can appeal (requires Legal department + €50K) for 50% chance penalty reduction

**Crime Selection:**
- All crimes = risk/reward choice
- No guaranteed path
- Encourages ethical playstyle
- Mechanic teaches real-world compliance challenges

State: state.crime.offenses, state.crime.heat, state.crime.auditRiskBonus.
Connections: Axes, politics, followers, social, banking.
Current state: Built (crime.js).

### **Tax System**
What it is: Automatic tax collection based on structure and income.
How it works:
- **Monthly tax cycle**: Triggers at start of each in-game month (tracked via ticks)
- **Calculation**: company balance × structure tax rate
- **Deduction**: automatic from company balance
- **Tax-free windows**: Quarterly events (3–7 days) where taxes = 0%. Rare random trigger. Bonus to encourage trading activity.
- **Quarterly reports**: LLC+ required to file. Small penalty (−€1K) if not filed on time
- **Historical tracking**: state.tycoon.taxesPaid, tax notifications

State: Managed by taxes.js module (not fully shown, but referenced).
Connections: Company balance, corporate structure, crime, compensation.
Current state: Built.

### **Inflation & Economic Events**
What it is: Dynamic economic changes that affect all players globally.
How it works:
- Random events fire every 7–14 days
- Examples:
  - "Interest rate hike" → All loan rates +1%
  - "Market crash" → All crypto prices −15–25%
  - "Tech sector boom" → Tech stocks +10–20% for 1 month
  - "Recession begins" → All trading volumes −20% campus-wide
  - "Stimulus announced" → All player balances +€1K free cash

Events: Broadcast to all players, affect in-game economy globally.
Connections: Prices, engagement, events.
Current state: Designed (events.js), needs full build.

---

## 5. PROGRESSION

### **XP & Leveling**
What it is: Player level progression tied to activities.
How it works:
- XP pool: shared across all activities
- Per-activity XP:
  - Quiz passed (≥70%): 50 XP + 100 XP if ≥100%
  - Course completed: 200 XP
  - Exam passed: 500 XP + 500 XP if distinction
  - Focus session (25 min): 25 XP
  - Trade executed (profit >10%): 15–50 XP based on % gain
  - Scenario completed: 100–500 XP based on difficulty
  - Referral bonus: 100 XP
  - Institution donation: 250 XP

- **Level thresholds**: cumulative
  - L1: 0 XP (start)
  - L2: 100 XP
  - L3: 250 XP
  - L4: 500 XP
  - L5: 1,000 XP
  - L10: 5,000 XP
  - L20: 25,000 XP
  - L50: 250,000 XP

- **Tier system**: Bronze (L1–10), Silver (L11–25), Gold (L26–40), Platinum (L41–50), Diamond (L51+)
- **Level display**: In profile, nav bar, dashboard, leaderboard

State: state.gamification.xp, state.gamification.level, state.gamification.tier.
Connections: Dashboard, gamification, rewards, badges, leaderboard.
Current state: Built.

### **Streaks (Daily Engagement)**
What it is: Consecutive-day activity tracking with bonus rewards.
How it works:
- Tracks days user logs in and completes at least 1 activity (trade, focus, quiz, etc.)
- Streak counter: incremented if activity today, reset if missed day
- Longest streak: recorded historically
- Streak bonus: +10% XP for each day in current streak (e.g., 10-day streak = +100% XP)
- Notification: daily reminder to maintain streak

State: state.gamification.streak, state.gamification.longestStreak.
Connections: Engagement, notifications, gamification.
Current state: Built.

### **Badges & Achievements (50+ Total)**
What it is: Meta-achievements for reaching milestones.
Examples:
- "First Trade": Execute 1 buy/sell → +50 XP
- "Bullish Trader": 100 winning trades → +200 XP
- "Portfolio Master": Net worth €1M → +500 XP, badge icon in profile
- "Course Completer": Finish all 11 courses → +1K XP
- "Influencer": 100K followers → +250 XP
- "Philanthropist": Donate to 3 institutions → +500 XP
- "Ethical Player": Never commit a crime (play 30 days without detection) → +1K XP
- "Speed Trader": Execute 10 trades in 1 day → +100 XP
- "Market Master": Correct 10 Market Calls in a row → +300 XP
- "CEO": IPO achieved → +2K XP
- etc.

Mechanics:
- Auto-check after each activity
- Grant XP + badge icon (usable as profile decoration)
- Display in profile, on leaderboard
- Some badges locked until other conditions met

State: state.gamification.badges (array of earned badge IDs).
Connections: All activity systems, profile, leaderboard.
Current state: Built (50+ badges defined, auto-grant logic).

### **Certification Track (ECFL Exam System)**
What it is: Three-tier certification program.
How it works:

**Level 1 Certification (Foundations)**
- 11 courses, 38 lessons, 180 quiz questions
- Exam: 40 multiple-choice questions, 70% passing threshold
- Topics: All course content
- Reward: Certificate with date, score, badge "ECFL Certified L1"
- Personal wallet: +€500 bonus
- Governance: +5
- Unlock: Can take any Level 1 exam after starting course

**Level 2 Certification (Intermediate)**
- Prerequisites: L1 passed + 3 additional advanced courses + €5K exam fee
- Exam: 60 questions, 75% threshold
- Reward: L2 Certificate, badge, +€2K bonus, +10 Governance
- Unlock: More advanced trading features

**Level 3 Certification (Advanced)**
- Prerequisites: L2 passed + all 11 courses completed + €15K fee
- Exam: 80 questions, 80% threshold
- Reward: L3 Certificate, badge, +€10K bonus, +20 Governance, Mastery status in profile
- Special: Can teach (share notes with other players, earn referral bonus)

Mechanics:
- Exam can be retaken (€1K fee per retry)
- Exam history tracked: state.ecflExams (array of attempts with dates, scores)
- Canvas PDF certificate generated on pass (shareable on LinkedIn)
- Certificate icons in 3D city (monument for L3 master)

State: state.progress (completion %, attempts), state.ecflExams (exam records).
Connections: Curriculum, XP, badges, profile, social.
Current state: Built (curriculum.js handles exam flow, certificates.js generates PDF).

---

## 6. EDUCATION

### **11-Course Curriculum**
What it is: Progressive financial education path.
Courses:
1. **Foundations of Trading** (5 lessons, 15 questions)
   - Topic: Order types, bid/ask spread, commission impact
   - Lesson 1: What is a stock? Market caps.
   - Lesson 2: How to place a buy order. Limit vs market.
   - Lesson 3: Reading a quote. P/E ratios.
   - Lesson 4: Commissions & fees. Hidden costs.
   - Lesson 5: Your first profitable trade walkthrough.
   - Quiz: 15 questions, ≥70% = pass
   - Reward: 50 XP, +1% trading accuracy, +1 Growth axis
   - Unlock: Always available

2. **Technical Analysis** (5 lessons)
   - Topic: Chart patterns, candles, indicators
   - Lesson 1: Candlestick anatomy (open, high, low, close)
   - Lesson 2: Support & resistance lines
   - Lesson 3: Moving averages and trends
   - Lesson 4: RSI & momentum oscillators
   - Lesson 5: Reading real charts (walkthrough)
   - Quiz: 15 questions
   - Reward: 50 XP, Unlock all 8 indicators
   - Unlock: NW ≥ €1,000

3. **Blockchain & Crypto** (4 lessons)
   - Topic: Wallets, DeFi, gas fees, security
   - Lesson 1: What is Bitcoin? Decentralization.
   - Lesson 2: Wallet types & custody models
   - Lesson 3: Smart contracts & Ethereum
   - Lesson 4: DeFi, staking, yield farming
   - Quiz: 12 questions
   - Reward: 40 XP, Crypto unlocked fully
   - Unlock: NW ≥ €5,000

4. **Risk Management** (4 lessons)
   - Topic: Position sizing, stop-loss, portfolio heat
   - Lesson 1: Kelly criterion (bankroll mgmt)
   - Lesson 2: Value-at-risk (VaR) calculations
   - Lesson 3: Diversification & correlation
   - Lesson 4: Drawdown limits & trading plan
   - Quiz: 15 questions
   - Reward: 50 XP, Portfolio limits enforced (max leverage 2×)
   - Unlock: ≥10 trades or NW ≥€10K

5. **Regulation & Ethics** (4 lessons)
   - Topic: Compliance, KYC, regulatory bodies
   - Lesson 1: SEC, FCA, FINRA: who regulates?
   - Lesson 2: Inside information & market manipulation
   - Lesson 3: AML & KYC procedures
   - Lesson 4: Corporate governance & Sarbanes-Oxley
   - Quiz: 15 questions
   - Reward: 50 XP, +5 Governance, +1 Impact
   - Unlock: Voluntary (no gate)

6. **Derivatives & Leverage** (4 lessons)
   - Topic: Options, futures, margin
   - Lesson 1: Call & put options anatomy
   - Lesson 2: Futures contracts & margin calls
   - Lesson 3: Option Greeks (delta, gamma, theta)
   - Lesson 4: Leverage risks & margin blowups
   - Quiz: 15 questions
   - Reward: 50 XP, Derivatives unlocked
   - Unlock: NW ≥ €25K + ≥20 trades

7. **Macro Analysis** (4 lessons)
   - Topic: Economic indicators, sector rotation, news
   - Lesson 1: GDP, unemployment, inflation
   - Lesson 2: Fed policy & interest rates
   - Lesson 3: Economic cycles & business quarters
   - Lesson 4: Sector rotation & commodity trends
   - Quiz: 15 questions
   - Reward: 50 XP, Commodities/forex/bonds unlocked
   - Unlock: NW ≥ €50K

8. **Behavioral Finance** (4 lessons)
   - Topic: Cognitive biases, emotional trading, journaling
   - Lesson 1: Overconfidence, anchoring, recency bias
   - Lesson 2: Loss aversion & sunk cost fallacy
   - Lesson 3: Herding & FOMO
   - Lesson 4: Trading journal review & decision audit
   - Quiz: 15 questions
   - Reward: 50 XP, Unlock trading journal tool
   - Unlock: ≥30 trades + NW ≥ €50K

9. **Portfolio Theory** (4 lessons)
   - Topic: Asset allocation, rebalancing, correlation
   - Lesson 1: Efficient frontier & Sharpe ratio
   - Lesson 2: Asset classes & diversification benefits
   - Lesson 3: Correlation matrices
   - Lesson 4: Rebalancing frequency & tax-loss harvesting
   - Quiz: 15 questions
   - Reward: 50 XP, Portfolio analyzer unlocked
   - Unlock: NW ≥ €100K + Technical Analysis completed

10. **Fundamental Analysis** (4 lessons)
    - Topic: DCF, ratio analysis, earnings
    - Lesson 1: Income statement, balance sheet, cash flow
    - Lesson 2: P/E, PB, dividend yield ratios
    - Lesson 3: DCF valuation walkthrough
    - Lesson 4: Earnings surprises & guidance misses
    - Quiz: 15 questions
    - Reward: 50 XP, Valuation calculator unlocked
    - Unlock: NW ≥ €100K

11. **Corporate Finance** (5 lessons)
    - Topic: IPO, M&A, capital structure, dividends
    - Lesson 1: IPO process & underwriting
    - Lesson 2: M&A strategy & hostile takeovers
    - Lesson 3: Capital structure (debt vs equity)
    - Lesson 4: Dividend policy & share buybacks
    - Lesson 5: IPO readiness checklist
    - Quiz: 15 questions
    - Reward: 100 XP, +10 Governance, alt investments unlocked
    - Unlock: NW ≥ €200K

**Lesson Structure:**
- 5 sections per lesson
- Each section: 1–2 paragraphs + image/diagram
- Inline notebook: take notes per section
- Text-to-speech: available (male/female voice, 0.5–2.0× speed)
- Completion tracking: per-section checkmarks
- Quiz at lesson-end: 1–3 questions

State: state.progress (course completion %), state.textbook (lesson navigation), state.notebook (user notes).
Connections: Curriculum UI, XP awards, unlocks, axes.
Current state: Built, all 11 courses with 38+ lessons and 180+ questions.

### **Applied Finance Playbook (11 Chapters)**
What it is: Advanced meta-course teaching real-world decision-making.
How it works:
- One chapter per main course
- Each chapter: 5 parts + 50 XP reward + decision scenario
- Structure: What Unlocked → How It Works → How Actions Affect Your Life → First Move → Pro Tip

Example Chapter (Ch 1 — Trading Foundations):
- Part 1: What Unlocked (you can now trade)
- Part 2: How It Works (mechanical walkthrough of placing an order)
- Part 3: How Actions Affect Your Life (this €100 trade might fund your lunch or lose tuition)
- Part 4: First Move (recommended first 3 trades to make)
- Part 5: Pro Tip (psychological tip: don't check prices every second)
- Decision Scenario: You have €1K. Buy high-conviction stock or diversify? Unlock consequence in sandbox.
- Reward: 50 XP + unlock.

Chapters:
1. Foundations walkthrough
2. Technical Analysis in practice
3. Crypto wallet security
4. Position sizing (risk mgmt)
5. Compliance choices in real scenario
6. Leverage risks (real case study)
7. Macro timing decisions
8. Emotional discipline journal
9. Rebalancing (real portfolio)
10. Valuation scenarios
11. IPO decision (corporate structure choice)

State: state.progress, unlock tracking in curriculum.js.
Connections: Courses, scenarios, trading, business decisions.
Current state: Designed (ready to build in courseContent.js).

### **Glossary**
What it is: Interactive financial term reference.
How it works:
- 200+ terms (all course vocabulary)
- Alphabetical index + search
- Term definition (2–3 sentences)
- Examples (real-world or in-game reference)
- Related terms (hyperlinks)
- Visual icon per term (e.g., "$" for financial, "📈" for technical)
- Tooltip on hover in lessons (underlined terms)

State: Hardcoded in glossary.js (data structure, no state).
Connections: Curriculum, lessons, tooltips.
Current state: Built (glossary.js).

---

## 7. SOCIAL & COMPETITIVE

### **Followers System**
What it is: One-way social connection tracking influencer status.
How it works:
- Unlimited followers (no cap, unlike friends)
- One-way: you follow others, others follow you
- Follower count visible in profile
- Growth triggers:
  - Profitable trade (>10% gain): +10–30 followers
  - Course completed: +20–50 followers
  - Luxury purchase (flex post): +50–500 (scales with price)
  - Correct Market Call: +100–1K (scales with follower count)
  - IPO achieved: +5K followers
  - Exam passed w/ distinction: +30–80 followers
  - Venue purchased: +20–100 followers
  - Institution donation: +500–2K followers
  - Crime detected: −30% follower base immediate

- Decay:
  - −2%/day after 3 days inactive
  - −5%/day after 7 days inactive
  - −30% immediate on scandal (crime detected)

- Target milestones (active player):
  - Month 1: 500–2K
  - Month 3: 5K–15K
  - Month 6: 30K–100K
  - Month 12: 500K–2M (for "Showman" playstyle)

State: state.followers (structure TBD), follower history in social.
Connections: Social hub, profile, market mover, influencer income, verification.
Current state: Built (followers.js).

### **Friends (Mutual Connection)**
What it is: Capped two-way social network.
How it works:
- Mutual connection (both must accept friend request)
- 150-friend cap (Dunbar's number)
- Friends can: see each other's trades, private message, view portfolio (with permission), collaborate on challenges
- Status: online/offline, last active timestamp
- Social Feed: friends' trades visible to each other (if enabled)

State: state.social.friends (array of friend IDs + timestamps).
Connections: Social hub, messages, collaborative features.
Current state: Designed, partial build.

### **Market Calls & Market Mover**
What it is: Public price predictions with follower-based impact on actual prices.
How it works:

**Market Calls:**
- Player makes prediction: pick asset + direction (bull/bear) + timeframe (1h, 4h, 1d, 1w)
- Post publicly to social hub
- Resolution: automatic at timeframe end
  - Correct: credibility +5, followers +100–1K, notification to followers
  - Wrong: credibility −3, no follower gain
- Limit: 3 active calls at once
- Hidden credibility score (0–100): start at 50, +5 per correct, −3 per wrong
- Caps credibility impact: actual impact = table value × (credibility / 100)

**Market Mover (Price Impact):**
| Follower Count | Price Impact Range |
|---------------|-------------------|
| 0–1K | 0% (no impact) |
| 1K–10K | ±0.5–1% |
| 10K–50K | ±1–3% |
| 50K–200K | ±3–5% |
| 200K–500K | ±5–8% |
| 500K–1M | ±8–12% |
| 1M+ | ±12–20% |

When a Market Call resolves:
- Price moves in direction called × impact range (credibility-adjusted)
- Movement broadcasted: "User @ShowMan called BTC bullish, gained +500 followers as BTC +3.2%"
- Creates economy: high-follower players can literally move markets (teaching coordination & influence)

**Validation:** To prevent manipulation, only calls with credibility ≥50 and ≥1K followers affect prices.

State: state.marketCalls (array of active calls with { asset, direction, timeframe, createdAt, credibility }), state.followers.credibility.
Connections: Trading, followers, social, prices, verification.
Current state: Built (marketCalls.js).

### **Influencer Monetization**
What it is: Passive income from follower base.
How it works:

**Sponsorship Tiers (Monthly Recurring):**
| Followers | Monthly Income (Personal) |
|-----------|--------------------------|
| 5K | €500 |
| 20K | €2,000 |
| 50K | €5,000 |
| 100K | €12,000 |
| 250K | €25,000 |
| 500K | €50,000 |
| 1M+ | €100,000 |

**Mechanics:**
- Paid to PERSONAL wallet (your personal brand, not company)
- Earned monthly (auto-deposit)
- Income = lookup follower count in table at month-end
- No action required (passive)
- Can be declined (opt-out for privacy)

**Paid Content (70/30 Split):**
- Create sponsored posts (branded content)
- Platform takes 30%, you get 70%
- Price negotiated with brand (€100–€50K depending on followers + credibility)

**Brand Ambassador (5K+ followers):**
- Quarterly contracts with NPC brands (Nike, Tesla, Apple, Lamborghini, etc.)
- Exclusive sponsorship deal (sole player can have it)
- Higher pay: €5K–€50K per quarter depending on followers + engagement
- Requires: post 2–3 times per month featuring brand
- Break contract: −10 Governance, −1K followers

State: state.influencer (monthly tracking, contract info).
Connections: Followers, personal wallet, social, posts.
Current state: Built (influencer.js).

### **Verification Badge System**
What it is: Blue check mark confirming legitimate influencer status.
How it works:

**Requirements (all must be met):**
- ≥50K followers
- Account age ≥60 days
- Premium subscription active (€6.99/month or €49.99/year)
- Credibility score ≥60
- Governance axis ≥30
- ≥10 posts in last 30 days

**Benefits:**
- Blue check badge on all posts
- 1.5× Market Call impact (price movement multiplier)
- +50% sponsorship income (1.5× multiplier on all tiers)
- +2K follower bonus on verification
- Priority in social feed ranking (show first)

**Maintenance:**
- Monthly check: if any requirement drops below threshold, badge revoked
- Warning: 7-day notice before revocation
- Reapply: €100 fee, re-check all requirements

**Special:** Verified badge can be lost if crime detected (scandal exposure).

State: state.verification (isVerified, verifiedAt, maintenanceCheckDate).
Connections: Followers, credibility, premium, posts, market calls, sponsorship.
Current state: Built (verification.js).

### **Social Hub (Feed, Posts, Messages)**
What it is: Twitter-like social network within game.
How it works:

**Feed:**
- Chronological timeline of posts
- Post types:
  - Trade posts (auto-generated on winning trades)
  - Luxury flex posts (showing new car/watch/yacht purchase)
  - Course completion celebrations
  - Market Calls (predictions)
  - Exam passed announcements
  - Notes shared from curriculum (learning highlights)
  - Custom text posts (max 280 characters)
  - Referral promotions

- Interactions:
  - Like (heart) = +1 engagement
  - Repost (retweet) = share to your followers
  - Reply = thread discussion
  - Bookmark = save for later

- Ranking: algorithm orders by recency + engagement (likes/reposts in last 24h)

**Direct Messages:**
- 1-on-1 or group chats
- Message history persisted
- Read receipts
- Notifications when new message arrives

**NPC Posts:**
- Random NPC events (market news, campus events, scandals)
- Example: "🚨 SCANDAL: User @GreedyTrader caught evading taxes! −30% followers"
- Visible to all players (teaches social pressure)

**Announcements:**
- Admin/moderator messages pinned at top
- Campus-wide notifications (event starting, maintenance, etc.)

**Leaderboard Feed:**
- Top 10 players by net worth
- Top 10 by followers
- Top 10 by trading accuracy
- Updated daily

State: state.social.myPosts, state.social.feed, state.social.messages.
Connections: Followers, posts, profiles, notifications.
Current state: Built (social.js).

### **PvP: Hostile Takeovers**
What it is: Competitive mechanic allowing players to attack and defend each other's companies.
How it works:

**Requirements:**
- Attacker: Public Company structure only
- Defender: Any structure (if <Public, acquisition forced → becomes subsidiary)
- Target net worth: ≥€500K (min viable target)

**Attack Mechanics:**
- Cost: 10% of target net worth (e.g., target NW €10M → cost €1M to attack)
- Duration: 24-hour window to defend
- Resolution:
  - Win condition (attacker): target doesn't respond in 24h OR attacker's offer ≥ 150% of target NW
  - Lose condition (attacker): defender buys poison pill OR raises defense funds ≥120% of attack amount
  - Auto-defense: if target is offline 3+ days, auto-accept acquisition

**Successful Takeover:**
- Attacker gains: target's venues + departments + cash + assets
- Defender loses: company autonomy (becomes subsidiary of attacker)
- Subsidiary benefits: 10% income boost (attacker economies of scale)
- Subsidiary restrictions: cannot attack others, cannot leave (must stay 6 months)
- Notification: social hub post "Company X acquired by Company Y"
- Reputation: Attacker +2, Defender −5

**Defense Mechanics:**
- Poison Pill: cost 5% of NW, prevents 1 takeover attempt (one-time)
- Stock Price Defense: repurchase shares to raise price (dilutes attacker's offer)
- White Knight: ally can invest capital to defend (ally gets 20% equity stake)
- Legal Defense: €100K+ court battle (50% chance wins, 50% loses, winner takes board seat)

State: state.tycoon.pvp (activeAttack, activeDefense, subsidiaries, isSubsidiaryOf, reputation).
Connections: Company structure, net worth, social, notifications.
Current state: Built (pvp.js).

### **Referral System**
What it is: Campus code-based user acquisition.
How it works:
- Each user has unique referral code (e.g., SHOWMAN2026)
- New user enters code during onboarding
- Referrer gets: +€500 bonus, +100 XP, +5 Impact, follower +20
- Referral tracked: state.referral.referrals (array of referred users + status)
- Statuses: pending (not activated), active (played 7 days), complete (played 30 days)
- Reward unlocked at "complete" stage
- Leaderboard: top referrers (by count) shown in social hub

State: state.referral (myCode, usedCode, referrals[], rewardsEarned, referralCount).
Connections: Onboarding, social, XP, axes.
Current state: Built (referral.js).

---

## 8. MONETIZATION

### **In-App Purchases (IAP)**
What it is: Real-money currency packs to accelerate progression.
How it works:

| Pack | Real Price | In-Game € | Sessions Equiv | Notes |
|------|-----------|-----------|----------------|-------|
| Starter | €0.99 | €5,000 | ~3–5 | Impulse buy |
| Growth | €4.99 | €30,000 | ~15–20 | Buys HR dept outright |
| Accelerator | €9.99 | €75,000 | ~40+ | Manager hire or venue |
| Tycoon | €19.99 | €200,000 | ~100+ | Multiple upgrades |
| Mogul | €49.99 | €600,000 | ~300+ | Significant acceleration |

**Mechanics:**
- Credits COMPANY balance only (sandbox.balance)
- CANNOT buy axes, achievements, or skill
- Designed as acceleration, not pay-to-win
- Example: €49.99 spender gets €600K cash, but still needs Growth ≥80 + Governance ≥70 to IPO
- Must trade, complete courses, manage depts to progress

**History Tracking:**
- state.iap.purchases (array of purchase records: amount, date, usdSpent)
- state.iap.totalSpent (cumulative real-money spent)
- Displayed in profile (status shows "Supporter" badge if spent >€50)

State: state.iap.
Connections: Company balance, premium, advertising.
Current state: Built (iap.js).

### **Ad System**
What it is: Multiple ad formats for monetization.
How it works:

**Banner Ads**
- Persistent sidebar or bottom placement
- Google AdSense-like rotating ads
- Non-intrusive
- Shown to free users

**Interstitial Ads**
- Full-screen modal on view transitions (e.g., after completing focus session)
- Frequency cap: max 1 per 30 minutes
- Can close after 5 seconds
- Rewards: none (just ad)

**Rewarded Video Ads**
- Player opts-in to watch 15–30s video
- Reward: €500 + 50 XP
- Daily cap: 20 videos = €10,000/day max passive income
- Unlock: NW ≥ €10K
- State: rewarded video history (daily count)

**Offerwall (Third-Party)**
- Placeholder for third-party offer networks (Offer Rewards, Ironsource, etc.)
- Shows offers: install app, complete survey, watch video
- User completes → earns in-game currency
- Platform takes 30–50%, game gets rest

**Premium Subscription (Ad-Free)**
- €6.99/month or €49.99/year
- Benefits: no ads anywhere, 2× daily bonus, priority projects
- Unlocks verification badge eligibility

State: settings.adsEnabled, adManager tracks impressions/clicks/rewarded video claims.
Connections: Premium, IAP, engagement.
Current state: Scaffolds in place (adManager.js), needs ad provider integration.

### **Battle Pass (Seasonal Progression)**
What it is: Cosmetic & reward track that advances by XP.
How it works:
- **Season duration**: 3 months (90 days)
- **50 tiers per season**
- **100 XP per tier** (5K XP total per season)
- **Free track**: every player gets some rewards (cosmetics, €500, 50 XP boost)
- **Premium track** (€9.99): unlock cosmetics, premium rewards (€2K, cosmetic skins, stat boosters)

**Rewards by tier:**
- T1–10: cosmetics (profile themes, borders, backgrounds)
- T11–20: currency (€100–€500)
- T21–30: XP boosters (2× XP for 7 days)
- T31–40: legendary cosmetics (ultra-rare skins)
- T41–50: exclusive title (e.g., "Season 1 Master"), stat tracker reset button

**Mechanics:**
- Progress: XP earned from any activity (trading, courses, etc.) advances battle pass
- Can buy tier skips: €1 per tier skip
- Rewards claimable once at tier (no expiration within season)
- Season end: reset to tier 0, rewards archived
- Display: progress bar on nav, detailed track in UI

**History:**
- state.battlePass.claimedRewards (array of tier IDs claimed)
- state.battlePass.seasonEndDate (when season 1 ends, triggers season 2 reset)

State: state.battlePass (season, tier, xp, isPremium, claimedRewards).
Connections: XP system, cosmetics, premium.
Current state: Built (battlePass.js).

### **Card Economy (Q-Coins, Packs, Marketplace)**
What it is: Gacha-style card collection with trading.
How it works:

**Q-Coins (Free Currency):**
- Start: 500 Q-Coins
- Earn: +50 per course completed, +25 per quiz passed, +100 per focus session (25 min)
- Monthly stipend: +100 Q-Coins
- Used to: open basic card packs, cosmetic purchases

**Card Packs:**
- Types: Basic (50 Q-Coins), Standard (100 Q-Coins), Premium (€2.99), Legendary (€9.99)
- Basic: 3 cards, 0–1 rare
- Standard: 5 cards, 1–2 rare
- Premium: 8 cards, 2–3 rare
- Legendary: 10 cards, 4–6 rare + guaranteed legendary (1/50 chance, pity at 50)

**Card Rarity:**
- Common: 60%, value €0.50
- Uncommon: 25%, value €1.00
- Rare: 12%, value €5.00
- Epic: 2%, value €25.00
- Legendary: 1%, value €100.00

**Cards (Finance-Themed):**
- 100+ cards in game
- Types: Assets (stocks, crypto), Strategies (trading tactics), People (famous investors), Events (market crashes)
- Mechanics: visual + flavor text + stat bonuses (e.g., "Buffett Card: +5% trading accuracy")

**Marketplace:**
- Players list cards for sale
- Price discovery: offer/bid system
- Seller takes 90%, platform 10%
- Transaction history tracked

**Pity System:**
- Soft pity: at 40 packs, legendary drop rate increases 5%/pack
- Hard pity: guaranteed legendary by pack 50
- Tracks per pack type (separate pity counters)
- Resets after claiming legendary

State: state.cardEconomy (qCoins, inventory, collection, marketplace, pityCounters).
Connections: Premium, rewards, social (trading).
Current state: Built (cardEconomy.js, cardStore.js, marketplace in trading).

### **Premium Subscription**
What it is: Monthly/annual paid service.
How it works:
- **€6.99/month or €49.99/year** (€4.17/mo)
- **Benefits:**
  - Ad-free everywhere
  - 2× daily login bonus (€150→€300, €300→€600, etc.)
  - Priority project execution (projects complete 25% faster)
  - Exclusive cosmetics (profile border, title, background)
  - Early access to new features
  - Verification badge eligibility
  - +10% XP on all activities

**Auto-renewal:**
- Set via app settings
- Can cancel anytime (immediately revokes benefits)
- Renewal date shown

**Trial:**
- 7-day free trial for new users
- Converts to paid if not cancelled

State: state.battlePass.isPremium (or separate premium state), subscription renewal date.
Connections: IAP, ads, benefits, UI.
Current state: Designed, needs full build.

---

## 9. CRIME & POLITICS

### **Crime System (Detailed)**
Previously covered in Economy section (section 4). Expanded here for architecture clarity:

**6 Crime Types:**
1. Tax Evasion (underreport income)
2. Insider Trading (trade before news event)
3. Money Laundering (offshore transfers)
4. Accounting Fraud (inflate financial reports)
5. Bribery (political influence)
6. Expense Fraud (personal reimbursement)

**Detection Probabilities:**
- Base rate varies per crime
- Heat modifier: +1% audit chance per heat point (0–100)
- Repeat offense: +5% per prior offense of same type
- Bank choice: audit modifier 0.4×–1.3×
- Finance dept project: −15% for 1 month
- Legal dept compliance project: −15% for 1 month

**Penalties:**
- Financial: 1.5–3× stolen/fraudulent amount
- Axis impact: −5 to −30 Governance, −10 to −20 Power
- Public scandal: social hub post visible to all, −30% followers immediate
- Asset seizure: venues or luxury items may be seized
- Trading ban: insider trading → 30-day trading suspension
- Political ban: bribery → cannot access political tier 1+ actions for 2 months

**Appeal System:**
- Cost: €50K + requires Legal dept
- Chance: 50% penalty reduction if successful
- Legal dept skill: +5% per manager skill point (max 55% if manager has 100 skill)

**Offshore Banking:**
- Cayman Islands & Banque Suisse: enable money laundering detection reduction
- Tradeoff: if caught, penalties 3× higher (Cayman) or audit modifier 0.6× (Suisse)

State: state.crime.offenses (array), state.crime.heat (0–100), state.crime.auditRiskBonus.
Connections: Axes, banking, law, social scandal, economy.
Current state: Built (crime.js).

### **Political Influence System (4 Tiers)**
What it is: Regulatory access & lobbying mechanics based on Power axis.
How it works:

**Tier 0: No Access (Power 0–14)**
- Default state (Sole Trader / Partnership)
- No political actions available
- Message: "Achieve Power ≥15 to unlock regulatory participation"

**Tier 1: Regulatory Participation (Power ≥15, LLC+)**
- Respond to periodic regulatory events affecting all campus players
- Cost: €5K–€15K per decision
- Examples:
  - "Government proposes 5% crypto tax" → Oppose (€5K, Power +2, 30% chance to block campus-wide) / Support (Power +1) / Ignore
  - "New data privacy rules" → Lobby for exemptions (€10K, Power +3) / Comply early (Impact +5, Gov +3)
  - "Banking regulations tightened" → Fight back (€15K, Power +2) / Accept (Gov +2)
- Voting: if 60%+ players vote to oppose, regulation blocked for all

**Tier 2: Active Lobbying (Power ≥35, LLC+)**
- Launch lobbying projects from Legal dept
- Cost: €30K–€100K per project
- Duration: 5–15 focus sessions
- Examples:
  - Tax Reform Lobby (€100K, 15 sessions): permanent −3% corporate tax
  - Deregulation Campaign (€75K): trading fees −20% campus-wide for 3 months
  - Industry Standards Board (€50K): certification benefits your structure
  - Zoning Amendment (€30K): unlock premium venue slot
- Success rate: 60% base + (Finance manager skill × 0.4%)

**Tier 3: Political Funding (Power ≥55, Public Company)**
- Super PACs (Political Action Committees)
- Setup: €500K one-time
- Monthly funding: €10K–€100K toward specific goals
- Goals: each target €200K–€500K to unlock, affects all campus
  - Lower Corporate Tax: €500K target → permanent −2% tax
  - Subsidise Financial Education: €200K → campus 2× XP for 2 months
  - Restrict Foreign Competition: €300K → AI competitors weaker 3 months
  - Infrastructure Bill: €400K → all venue incomes +10% permanent
- Campaign donations: €10K–€100K to NPC candidates during election events (Power +1–5)

**Tier 4: Regulatory Capture (Power ≥80, Public Co, NW ≥€15M)**
- Write regulations, exclusive licenses
- Cost: €500K–€2M per action
- Actions:
  - Appoint Industry Advisor (€1M): pre-screen regulations 6 months, avoid bad policies
  - Exclusive License (€2M): get first access to new market/asset for 3 months
  - Bailout Insurance (€500K): government rescue if bankruptcy (teaches moral hazard)
  - Regulatory Exemption (€1.5M): avoid audit risk for 6 months

**Risk Mechanics:**
- Heat rises with lobbying activity
- Corruption Investigation event: if heat >75 + active lobbying, random scandal fires
- Effects: Power −20, Governance −15, public fine, social hub post
- Public backlash: other players can vote "No Confidence" to strip benefits
- Diminishing returns: each successive lobby costs more, lower success rate
- NGO counter-power: Watchdog ability exposes corporate lobbying to social hub

**Campus Scope:**
- All political effects campus-scoped (Paris lobby ≠ London lobby)
- Creates jurisdiction-shopping dynamics
- Multiple campuses can have different political landscapes

State: state.politics (tier, activeLobbies, superPACs, donations, regulatoryCapture, scandalCooldown, lastEventCheck).
Connections: Axes (Power), corporate structure, departments (Legal), economy (spending), social (scandal), events.
Current state: Designed, partial build (politics.js).

---

## 10. ENGAGEMENT & RETENTION

### **Engagement Engine**
What it is: Notification and reward system to keep players active.
How it works:

**Loot Drops & Mystery Boxes:**
- Loot: €75–€750 random award during focus session
- Mystery Box: 30% of loot drops replaced, €150–€1K + 50 XP + rare cosmetic
- Frequency: ~5–15% chance per focus minute
- Psychology: intermittent rewards (variable ratio schedule) = addictive

**Daily Bonuses:**
- Streak rewards (Day 1–7): €150→€300→€600→€1K→€1.5K→€2K→€3K
- Resets on missed day
- Bonus button in Empire screen
- Psychology: FOMO, return incentive

**FOMO Alerts (Friend Activity)**
- Notifications when friends:
  - Complete a course
  - Achieve promotion
  - Buy a venue
  - Hit a milestone (€100K net worth, etc.)
- "Your friend Alex just made €5K profit! Can you beat them?"
- Push notification + in-app notification

**Flash Deals (Time-Limited Discounts)**
- Random duration: 1–4 hours
- Targets: manager hire costs, venue prices, dept builds
- Discount: 15–40% off
- Scarcity: creates urgency
- Example: "The Observatory is on sale for 2 more hours! −35% off"

**Tax-Free Windows**
- Rare random events: 3–7 day windows where corporate tax = 0%
- Fires quarterly (announcement 2 days in advance)
- Encourages trading activity ("gotta make money while tax is suspended")
- Bonus to reinforce gameplay

**Weekly Campus Rivalry**
- Leaderboard competition: top 20 players by weekly trading volume
- Rivals assigned (closest net worth players)
- Weekly challenges: beat your rival in total P&L
- Rewards: top 3 get bonus (€1K, +50 XP), top 10 get cosmetic
- Push notifications: "You're trailing your rival Alex by €500!"

**Streaks (Consecutive Days Active)**
- Tracks daily logins + activity (≥1 trade or course lesson)
- Bonus: +10% XP per day in streak
- Notification: daily reminder to maintain streak
- Psychology: don't break the chain (habits)

**Micro-Challenges**
- Short-form tasks: "Execute 3 winning trades", "Complete 1 lesson", "Reach €100K net worth"
- Duration: 24 hours
- Reward: €500 + 50 XP + badge
- Rotates daily
- Visible on dashboard

**Notifications**
- Push (if enabled): completed course, achieved milestone, friend activity, scandal, political event
- In-app: toast notifications, badge counts, red dots
- Frequency: can be tuned in settings (aggressive/moderate/study mode)

State: state.engagement (notifications[], lastMicroChallenge, lastFriendAlert, etc.), state.gamification (streak, lastActiveDate).
Connections: All activity systems, notifications, push SDK.
Current state: Built (engagement.js).

### **Notification System**
What it is: Multi-channel notification delivery.
How it works:
- **In-app:** toast notifications (top-right corner, auto-dismiss after 5s)
- **Browser push:** notifications permission, sent to notification center
- **Email:** optional (if user enables), daily digest or triggered alerts
- **Settings:** user controls frequency (aggressive/moderate/study)
- Types: achievement, activity, social, event, warning (crime alert)

State: settings.notificationMode, engagement.notifications.
Connections: All activities, browser Push API.
Current state: Built (notifications.js / ui.js).

### **Events System (Dynamic)**
What it is: Scripted and random events that affect game state.
How it works:
- **Random events**: every 7–14 days, fire with weighted probabilities
- **Scripted events**: milestone-triggered (IPO achieved, first crime, etc.)
- **Election events**: quarterly, player votes on political candidates
- **Market events**: economic shocks (crash, bull run, recession, stimulus)
- **Social events**: campus competitions, challenges, leaderboard resets

Examples:
- "Market correction": all prices −10%, volume −20% for 1 week
- "Recession begins": trading volumes down but short opportunities
- "Tech boom": tech stocks +20%, bonds −5%
- "Interest rate hike": loan rates +1%, deposit interest +0.5%
- "Campus competition": top 100 players by weekly P&L compete for €100K total prize pool

State: state.tycoon.events (active events, state.engagement.lastMarketEvent, etc.).
Connections: All activity systems, economy, notifications.
Current state: Designed (events.js partially built).

### **Idle Income System**
What it is: Passive income generation while player is offline.
How it works:
- **Dept income**: all 6 departments generate income continuously (with manager)
- **Venue income**: all 12 venues generate income continuously
- **Banking interest**: daily interest on company balance (1–2% annual rate)
- **Sponsorship income**: monthly to personal balance (followers-based)
- **Corporate perks**: passive income from perks (if purchased)

**Offline Detection:**
- Tracks state.tycoon.idle.lastCollectedAt (timestamp)
- On next login, calculate time elapsed
- Income = (daily rate × days away) + (hourly rate × extra hours)
- Cap: max 7 days offline collection (prevents cheating time)
- Notification: "You earned €50K while away"
- History: state.tycoon.idle.accumulatedIncome

State: state.tycoon.idle (lastCollectedAt, accumulatedIncome).
Connections: Departments, venues, banking, sponsorship.
Current state: Built (idle income logic in focus.js, confirmed in code: checkOfflineIncome).

---

## 11. SANDBOX & PRACTICE

### **Market Lab (Secondary Sandbox with Time Control)**
What it is: Risk-free trading environment with 21 simulated assets and multiple market scenarios.
How it works:
- **Separate state**: state.marketLab (independent from main sandbox)
- **Balance reset**: always starts at €10K (configurable)
- **Assets**: 21 simulated (stocks, crypto, commodities, bonds, real estate, art) + 5 real-time markets
- **Speed controls**: 1×, 2×, 5×, 10× speed (time acceleration)
- **Chart**: same as live (OHLC, indicators, 8 indicators available)
- **Trading mechanics**: buy/sell identical to live, but no real impact
- **News events**: same simulated news (oil disruption, rate hike, etc.)
- **Lab Corporation**: Can practice building corp structure + depts in lab (isolated from main game)
- **Lab City**: Practice 3D city building with €10K limit

**Time Index Tracking:**
- state.marketLab.virtualTimeIndex (0–5000, represents 5000 ticks)
- At speed 10×, 5000 ticks play out in ~50 real seconds
- All price history generated on-the-fly using seeded random (deterministic, reproducible)

**Use Cases:**
- New players learn without risk
- Practice chart reading before trading for real
- Test strategies on historical scenarios (Replay)
- Build corp in sandbox before committing real capital

**Progression Integration:**
- Courses can trigger Lab missions
- Lab activities count toward practice badges
- Can transfer learnings to live sandbox (but not money)

State: state.marketLab (complete isolation from main sandbox).
Connections: Scenarios, Replay, courses, missions.
Current state: Built (marketlab.js).

### **Market Scenarios (Guided Mini-Games)**
What it is: Scripted trading scenarios with objectives and stars.
How it works:
- **3 difficulty levels**: Beginner, Intermediate, Advanced
- **9+ scenarios per level**: each with specific setup (price, holdings, news)
- **Objectives**: "Turn €10K into €15K in 5 minutes", "Survive a 30% crash", "Exploit a volatility spike"
- **Time limit**: 1–5 minutes (real-time at 1× or 10× speed)
- **Star rating**: 1–3 stars based on final balance
  - 1 star: reach target (€15K)
  - 2 stars: reach target + 10% bonus (€16.5K)
  - 3 stars: perfect execution + 20% bonus (€18K)
- **Rewards**: €100 per scenario, +200 XP per 3-star, badge at 9/9 stars
- **Validators**: 9 validators check performance (trend following, risk management, news response, leverage, diversification, timing, profit-taking, loss-cutting, psychology)

**Validator Examples:**
- Trend Following: bought in uptrend or sold in downtrend (+1 star)
- Risk Management: position size <50% portfolio (-1 star if violated)
- News Response: reacted to news event within 30 seconds (+1 star)
- Leverage: used 2–3× leverage on 50%+ positions (−1 star, risky)
- Diversification: held 3+ different assets (+1 star)
- Timing: exited in top 20% of trend (−1 star if exit bottom 20%)
- Psychology: no panic selling after 10% loss (+1 star)

**Scenario Progression:**
- Unlock sequentially: Beginner 1–3, then Intermediate 1–3, then Advanced
- Beginner: simple trends (bull run, crash, flat)
- Intermediate: realistic volatility + news events
- Advanced: complex multi-asset scenarios + tail risks

State: state.marketScenario (active scenario, progress, stars earned), state.soloMissions.scenariosCompleted.
Connections: MarketLab, replay, missions, XP, badges.
Current state: Built (scenarios.js, 9+ scenarios, validators implemented).

### **Market Replay (Historical Playback with Hints)**
What it is: Train on realistic historical price action with pattern recognition challenges.
How it works:
- **Real historical data**: use seeded history (deterministic 10-year history per asset)
- **Playback speed**: 1×, 5×, 10×, fast-forward buttons
- **Interactive trading**: pause, analyze, enter orders, resume
- **Goal**: maximize profit on a known timeframe (e.g., "XYZ went from €50 to €75 in 2 months")
- **Hints**: Pattern hints reveal "this is a bull flag", "resistance at €60", "divergence forming"
- **Validators**: same 9 validators as scenarios, score actions
- **Difficulty tiers**:
  - Beginner: clear trend, obvious support/resistance
  - Intermediate: noise, false breakouts, whipsaws
  - Advanced: real-world scenarios (2008 crash, COVID crash, 2021 bubble)

**Replay Specific Features:**
- Annotations: draw trend lines, note key levels
- Chart patterns: AI identifies patterns on-screen
- Scenario text**: "It's March 2020. Markets just crashed 30%. What do you do?"
- Multiple segments: can replay BTC last 5 years segment by segment

State: state.marketReplay (active replay, replay data, annotations, patternHints).
Connections: MarketLab, scenarios, indicators, charts.
Current state: Built (replay.js, 3 difficulties, 9 validators per scenario).

### **Solo Missions**
What it is: Guided challenges combining learning + practice.
How it works:
- **Mission types**:
  - Course missions: "Complete lesson 1 of Technical Analysis"
  - Scenario missions: "Achieve 3-star rating on Intermediate Scenario 5"
  - Trading missions: "Execute 5 profitable trades in live sandbox"
  - Empire missions: "Build 1 venue + hire 1 manager"
  - Social missions: "Earn 100 followers"
  - Achievement missions: "Complete 3 courses and earn ECFL L1 badge"

- **Mission board**: UI showing active + completed missions
- **Progress tracking**: % complete per mission
- **Rewards**: XP, cosmetics, badges upon completion
- **Daily missions**: rotate every 24 hours (3–5 per day)
- **Weekly missions**: longer-term challenges (7 days to complete)

State: state.soloMissions (completed, scenariosCompleted, progress).
Connections: All activity systems, rewards, notifications.
Current state: Built (soloMissions.js).

### **Sandbox Reset & Difficulty Modes**
What it is: Players can reset sandbox or choose difficulty.
How it works:
- **Reset**: clear all holdings, reset balance to €10K (or €50K if premium), keep progress/courses
- **Difficulty modes** (future):
  - Casual: 2× income, −50% losses
  - Normal: 1× (current)
  - Hard: −50% income, 1.5× losses
  - Iron Man: 1 bankruptcy = permanent character loss

State: settings.difficultyMode, sandbox reset button in UI.
Connections: Sandbox, settings, IAP.
Current state: Reset button implemented, difficulty modes designed.

---

## 12. VISUAL & UI

### **Dashboard**
What it is: Game home screen with key stats and quick actions.
How it works:
- **Summary stats**:
  - Net worth (total)
  - Liquid balance (company + personal)
  - Daily P&L (24h return %)
  - Monthly P&L
  - XP / Level / Tier
  - Followers count
  - Current focus (if active)

- **Quick action cards**:
  - "Start focus session"
  - "Claim daily bonus" (if available)
  - "View portfolio"
  - "Visit social hub"
  - "Check missions"

- **Activity feed** (recent):
  - Last 5 trades (price, P&L)
  - Last 3 followers gained
  - Recent courses completed
  - Upcoming events

- **Leaderboard mini**: top 5 players by net worth + your rank

- **Notifications**: badge count for new messages, events, etc.

- **Mobile optimized**: single-column on mobile, multi-column on desktop

State: Computed from state.sandbox, state.personal, state.gamification, state.social, state.tycoon.
Connections: All activity systems, renders on 'dashboard' view.
Current state: Built (dashboard.js).

### **Navigation Tabs**
What it is: Main menu structure.
How it works:
- **Tabs** (in order):
  1. Dashboard (home)
  2. Learn (curriculum, courses, notebook)
  3. Trade (sandbox with live prices)
  4. Empire (tycoon, city, departments, venues)
  5. Desk (research hub, watchlists, briefings, podcasts)
  6. Explore (MarketLab, Scenarios, Replay, SoloMissions)
  7. Social (feed, leaderboard, messages, profile)
  8. Shop (IAP, card store, battle pass, cosmetics)
  9. Settings (profile, preferences, language, etc.)

- **Icon-based**: each tab has icon (home, book, chart, building, briefcase, compass, people, cart, gear)
- **Active indicator**: highlight current tab
- **Responsive**: tabs stack vertically on mobile, horizontal on desktop

State: state.currentView (tracks which tab active).
Connections: All modules render based on currentView.
Current state: Built (nav structure in ui.js).

### **The Desk (Research Hub)**
What it is: Information command center.
How it works:
- **Briefing tab**: daily market summary (AI-generated or curated)
  - Top 3 movers (stocks)
  - Top 3 movers (crypto)
  - Key economic events
  - Sector performance
  - Upcoming earnings/reports

- **Podcasts tab**: audio/video learning
  - 10+ podcasts (interviews, educational)
  - Playback controls (play/pause/speed)
  - Progress tracking
  - Transcript linked

- **Research tab**: deep-dive articles
  - Technical analysis breakdowns
  - Fundamental analysis reports
  - Sector rotation analysis
  - Valuation models
  - Bookmark/save for later

- **Watchlist tab**: custom asset collections
  - Create/edit watchlists
  - Add/remove assets
  - Quick view: price, 24h change, volume
  - Inline trading (click to open trade modal)

State: state.desk (activeTab, activePodcastId, activeWatchlistId, customWatchlists, bookmarkedResearch).
Connections: Curriculum, trading, social (share research).
Current state: Built (desk.js, deskContent.js).

### **3D City & Empire Panel**
What it is: Visual representation of business empire + interactive management.
How it works:
- **3D City rendering**: Three.js WebGL, isometric camera
  - Buildings color-coded by type
  - Click to manage (upgrade, sell, details)
  - Responsive: scales to mobile, touch-friendly on tablet
  - Performance: auto-downgrades if FPS <30

- **Empire panel** (sidebar):
  - List all departments (built, manager, income/mo)
  - List all venues (level, income/mo, upgrade button)
  - Net worth tracker
  - Structure info (current structure, tax rate, unlock progress for next)
  - Quick actions (build dept, hire manager, purchase venue)

- **Interactive elements**:
  - Drag to pan city
  - Scroll to zoom
  - Click building to open details modal
  - Button to add building (zoning/placement)

State: state.tycoon.city, state.tycoon.city3d, state.tycoon.departments, state.tycoon.netWorth.
Connections: Focus timer (passive income triggers re-render), trading (net worth), structures, venues.
Current state: Built (city3d.js for rendering, focus.js for logic).

### **Profile & Settings**
What it is: Player account management and preferences.
How it works:
- **Profile page**:
  - Avatar (generated or uploaded)
  - Username, bio (custom text)
  - Follower/friend counts
  - Badges earned (grid of icons)
  - Certificates (ECFL L1–L3)
  - Recent achievements
  - Tier/level display

- **Settings**:
  - Notification mode (aggressive/moderate/study)
  - Ads enabled toggle
  - City quality (high/medium/low)
  - Language (English/Spanish/French/German/etc.)
  - Theme (light/dark, TBD cosmetics)
  - Privacy (public/friends-only profile)
  - Delete account (irreversible)

- **Preferences**:
  - Email notifications (on/off)
  - Push notifications (on/off)
  - Chart defaults (candlestick/line, timeframe)
  - Currency display (EUR/USD, etc.)

State: state.user (profile fields), state.settings (toggles, preferences), state.ui (theme, etc.).
Connections: Auth, notifications, UI, i18n.
Current state: Built (profile rendering, settings persistence).

---

## 13. INFRASTRUCTURE

### **State Management (Pub/Sub)**
What it is: Centralized game state with event broadcasting.
How it works:
- **State tree**: single root `state` object in state.js
- **Mutations**: always done directly on state + persistCache() call
- **Pub/Sub**: notify(event, payload) fires listeners
- **Subscribers**: any module can subscribe(fn) to listen for events
- **Broadcasts**: e.g., notify('trade-executed', { symbol, qty, price, pnl })
- **Signal integration**: newer code uses typed signals (signal.js) for type safety

Example event flow:
```
1. User clicks "Buy AAPL"
2. sandbox.js calls: state.sandbox.holdings['AAPL'] += qty; persistCache(); notify('trade-executed', {})
3. gamification.js listener hears 'trade-executed', awards XP
4. axes.js listener hears it, updates Growth axis
5. dashboard renders with new values
```

State: state (global object in state.js).
Connections: All modules (dependency).
Current state: Built, fully functional.

### **localStorage Persistence**
What it is: Save game state to browser storage.
How it works:
- **Cache key**: `aether-cache-v3`
- **Format**: JSON serialization
- **Triggers**: persistCache() called after every mutation
- **Size limit**: 5–10 MB (browsers support 5–50 MB, we use ~2 MB)
- **Fields persisted**:
  - progress (course completion %)
  - quizScores
  - sandbox (balance, holdings, history)
  - tycoon (departments, venues, net worth)
  - personal (balance, items, properties)
  - social (friends, messages, posts)
  - gamification (XP, level, badges, streak)
  - axes
  - crime, banking, politics, engagement, etc.
  - (see hydrateCache() for complete list)

**Hydration:**
- On app load, hydrateCache() reads localStorage
- Restores all persisted fields into state
- Non-persisted fields (like prices) use defaults/seeded values

State: localStorage['aether-cache-v3'].
Connections: All persistent systems (core dependency).
Current state: Built, working reliably.

### **Supabase Integration (Optional Overlay)**
What it is: Cloud backend for multi-device sync and server-side features.
How it works:
- **Configured**: supabaseClient initialized in state.js (if credentials provided)
- **Features** (planned, not fully built):
  - Auth: login/signup, email verification, password reset
  - Sync: push state to cloud periodically (auto-save)
  - Leaderboards: fetch top 100 players by net worth (server-computed)
  - Friends: sync friend list across devices
  - Notifications: server-sent push notifications
  - Moderation: flag/report players for cheating/abuse

- **Fallback**: if Supabase not configured, app works offline (localStorage only)
- **Feature toggles**: featureToggles object gates experimental features

State: window.supabase, state.user (auth), state.isSupabaseConfigured.
Connections: Auth, leaderboards, sync.
Current state: Infrastructure in place, auth wired (auth.js), leaderboards via admin panel, full sync TBD.

### **Authentication**
What it is: User login & session management.
How it works:
- **Auth.js module**:
  - Email/password signup/login (Supabase)
  - Demo mode: auto-login as guest (FORCE_DEMO_MODE flag)
  - Session persistence: token stored, auto-refresh
  - Logout: clear session, reset state (option to keep game)

- **Auth flow**:
  1. User enters email/password
  2. Supabase returns token + refresh token
  3. Token stored in sessionStorage
  4. Auto-refresh before expiry (60 min token lifetime)
  5. On logout, clear token + prompt to save game

- **Demo mode**: auto-login, no email required, plays with seeded state

State: state.user ({ id, email, created_at }), sessionStorage auth tokens.
Connections: Supabase, app startup, profile.
Current state: Built (auth.js, demo mode functional, Supabase auth optional).

### **Internationalization (i18n)**
What it is: Multi-language support.
How it works:
- **Supported languages**: English, Spanish, French, German, Portuguese, Japanese, Chinese (Simplified)
- **Translation system**:
  - t(key): lookup translation by key
  - setLocale(lang): switch language
  - getLocale(): current language
  - localStorage['quantico_locale']: persist choice

- **Translation strings**: defined in i18n.js as large objects
  ```javascript
  const translations = {
    en: { 'nav.dashboard': 'Dashboard', 'trading.buy': 'Buy', ... },
    es: { 'nav.dashboard': 'Panel de Control', 'trading.buy': 'Comprar', ... },
    ...
  }
  ```

- **UI integration**: all text wrapped in t() calls
- **Language picker**: settings menu to switch

State: state.settings.language, localStorage['quantico_locale'].
Connections: UI rendering, settings.
Current state: Built (i18n.js, 7 languages, most text translated).

### **Admin Dashboard**
What it is: Moderator tools for monitoring & management.
How it works:
- **Access control**: only users with admin/superadmin role can access
- **Features**:
  - Leaderboards (net worth, followers, trading volume, XP)
  - Player search (find by username, email, user ID)
  - Moderation: flag player, suspend, ban
  - Economy monitoring: total players, total balance, avg net worth
  - Notifications: broadcast message to all players
  - Feature toggles: enable/disable experimental features
  - Event triggering: manually fire random events (testing)

- **UI**: separate 'admin' view, only visible if admin role

State: User role checked via Supabase auth.
Connections: Supabase, moderation, leaderboards.
Current state: Built (admin.js, leaderboards functional, moderation controls in place).

### **Dev Tools**
What it is: Developer utilities for debugging and testing.
How it works:
- **Shortcuts** (in devtools modal):
  - Set balance: input amount, click "Set"
  - Add XP: input amount, click "Award"
  - Unlock features: toggle market locks, structure unlocks
  - Reset state: wipe localStorage (with confirm dialog)
  - Trigger events: fire random event immediately (testing)
  - Console: inline JS eval (dangerous, gated by password)
  - Teleport: jump to any view instantly

- **Keyboard shortcut**: `Ctrl+Shift+D` to open devtools (if enabled)
- **Gate**: requires featureToggles.devToolsEnabled = true in config

State: Dev tools don't persist state (testing only).
Connections: Config.js feature toggles, all systems for test access.
Current state: Built (devtools.js, fully functional).

### **Replay System**
What it is: Record and playback trading sessions for learning.
How it works:
- **Recording**: every trade action stored with timestamp + price + context
- **Playback controls**: play/pause/speed (1×, 5×, 10×), scrubber bar
- **Annotations**: draw on chart, add notes
- **Comparison**: side-by-side with "optimal" trade (for scenarios)
- **Export**: save replay as JSON, share with friends

State: state.marketReplay (recording data, playback state).
Connections: Sandbox, scenarios, social (share).
Current state: Built (replay.js, scenario replay fully functional, trading replay partial).

### **Performance Monitoring**
What it is: Track FPS, memory, network latency for optimization.
How it works:
- **FPS counter**: display in top-left corner (dev mode)
- **Memory usage**: monitor localStorage size, state object size
- **Network**: latency to Supabase (latency.measurement, average ms)
- **Quality auto-adjust**: if FPS <30, downgrade city rendering quality
- **Bottleneck detection**: log slow operations (>100ms)

State: settings.cityQuality (high/medium/low).
Connections: City3D, rendering, performance.
Current state: Built (performance tracking in 3D renderer, auto-quality degradation).

### **PWA & Service Worker**
What it is: Progressive Web App for offline play.
How it works:
- **Service worker**: cache static assets (JS, CSS, images)
- **Manifest**: app metadata (name, icons, theme color)
- **Install**: "Add to Home Screen" prompt
- **Offline support**: game loads from cache, trades execute offline (queue syncs on reconnect)
- **Push notifications**: opt-in for browser push alerts

State: config.js PWA settings (TBD full build).
Connections: Infrastructure, caching, offline.
Current state: Scaffolded (service-worker.js exists), cache strategy TBD.

### **Logging & Error Tracking**
What it is: Capture errors and analytics.
How it works:
- **Console logging**: dev logs (if debug mode on)
- **Error boundaries**: catch uncaught errors, display user-friendly message
- **Error reporting**: (planned) send error stack trace to Sentry
- **Analytics**: track key events (app open, purchase, level up, etc.) via GA or Mixpanel

State: TBD (logging infrastructure in place, full analytics TBD).
Connections: All systems (error boundary dependency).
Current state: Partial (error catching in place, full tracking TBD).

### **Build & Deployment**
What it is: No-build deployment process.
How it works:
- **Zero build step**: vanilla ES6 modules, no transpilation
- **Entry point**: index.html loads app.js (type="module")
- **Dependencies**:
  - Three.js (3D, CDN)
  - Chart.js (charting, CDN)
  - Supabase.js (auth/db, CDN)
  - TailwindCSS (utility classes, CDN)
  - No npm packages (explicit design choice)

- **Deployment**: push to static host (Vercel, GitHub Pages, Netlify, Firebase Hosting)
- **Environment**: config.js stores API keys, feature toggles
- **Version**: versioning in config.js (e.g., 'v2.1.0')

State: config.js centralized config, zero build artifacts.
Connections: All modules (architectural dependency).
Current state: Built, deployable as-is.

---

## FEATURE MATRIX: BUILD STATUS

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| **CORE** |  |  |  |
| Focus Timer | focus.js | Built | ✅ All mechanics |
| Daily Bonus | engagement.js | Built | ✅ Day 1–7 progression |
| Loot Drops | engagement.js | Built | ✅ €75–€750 |
| Mystery Boxes | engagement.js | Built | ✅ 30% chance |
| Trading (Live) | sandbox.js | Built | ✅ All order types |
| Portfolio Tracking | dashboard.js | Built | ✅ Real-time |
| **MARKET** |  |  |  |
| Price Feed | marketSim.js | Built | ✅ Yahoo + CoinGecko |
| 8 Indicators | indicators.js | Built | ✅ All implemented |
| Charts (3 types) | charts.js | Built | ✅ Candlestick, line, bar |
| Watchlists | desk.js | Built | ✅ Custom collections |
| Market Segments (6) | data.js | Built | ✅ All 6 active |
| Alt Investments (PE/VC/HF/M&A) | altInvestments.js | Built | ✅ Full system |
| Derivatives & Leverage | derivatives.js | Built | ✅ Options, futures |
| Market Simulation (Sim Assets) | marketSim.js | Built | ✅ 21 assets |
| **EMPIRE** |  |  |  |
| Dual-Wallet | state.js + all modules | Built | ✅ Personal + company |
| 6 Corporate Structures | office.js | Built | ✅ All 6 with mechanics |
| 6 Departments | focus.js | Built | ✅ All with projects |
| 12 Venues | city3d.js | Built | ✅ All 12 levels |
| 3 Institutions | city3d.js | Built | ✅ Philanthropic endgame |
| 3D City Renderer | city3d.js | Built | ✅ Three.js, procedural |
| **ECONOMY** |  |  |  |
| 4-Axis System | axes.js | Built | ✅ Growth, Gov, Impact, Power |
| Compensation (5 methods) | compensation.js | Built | ✅ Salary, divs, bonus, options, expense |
| 6 Banks | banking.js | Built | ✅ Loan, deposit, audit mods |
| Crime (6 types) | crime.js | Built | ✅ Heat system, detection |
| Tax System | taxes.js | Built | ✅ Progressive, structure-based |
| Inflation & Events | events.js | Designed | ⚠️ Needs full build |
| **PROGRESSION** |  |  |  |
| XP & Leveling | gamification.js | Built | ✅ Levels 1–50+ |
| Streaks | gamification.js | Built | ✅ Consecutive day tracking |
| 50+ Badges | gamification.js | Built | ✅ Auto-grant |
| 3-Tier Cert (ECFL) | curriculum.js | Built | ✅ L1–L3 exams |
| **EDUCATION** |  |  |  |
| 11 Courses (38 lessons) | curriculum.js | Built | ✅ 180+ questions |
| Applied Finance Playbook (11 chapters) | courseContent.js | Designed | ⚠️ Needs chapters 1–11 |
| Glossary (200+ terms) | glossary.js | Built | ✅ Full coverage |
| **SOCIAL** |  |  |  |
| Followers System | followers.js | Built | ✅ Growth triggers, decay |
| Friends (Mutual) | social.js | Built | ✅ 150 cap, status |
| Market Calls | marketCalls.js | Built | ✅ Predictions + mover |
| Influencer Monetization | influencer.js | Built | ✅ Sponsorship tiers, paid content |
| Verification Badge | verification.js | Built | ✅ 6 requirements, maintenance |
| Social Hub (Feed, Posts, Messages) | social.js | Built | ✅ NPC posts, leaderboard |
| PvP: Hostile Takeovers | pvp.js | Built | ✅ Attack/defend, subsidiaries |
| Referral System | referral.js | Built | ✅ Codes, tracking, rewards |
| **MONETIZATION** |  |  |  |
| IAP (5 packs) | iap.js | Built | ✅ €0.99–€49.99 |
| Ad System (4 formats) | adManager.js | Scaffolded | ⚠️ Needs ad provider |
| Battle Pass (50 tiers) | battlePass.js | Built | ✅ Seasonal, free + premium |
| Card Economy (Packs, Marketplace) | cardEconomy.js, cardStore.js | Built | ✅ Pity system, trading |
| Premium Subscription | battlePass.js (TBD) | Designed | ⚠️ Needs full build |
| **CRIME & POLITICS** |  |  |  |
| Crime System (6 types) | crime.js | Built | ✅ Heat, detection, appeal |
| Political Influence (4 tiers) | politics.js | Designed | ⚠️ Partial build |
| **ENGAGEMENT** |  |  |  |
| Engagement Engine | engagement.js | Built | ✅ Loot, FOMO, flash deals |
| Notifications | ui.js + engagement.js | Built | ✅ Push + in-app |
| Events System | events.js | Designed | ⚠️ Partial |
| Idle Income | focus.js | Built | ✅ Offline income collection |
| **SANDBOX & PRACTICE** |  |  |  |
| Market Lab (21 assets) | marketlab.js | Built | ✅ Time control, sim |
| Scenarios (9+) | scenarios.js | Built | ✅ 3 tiers, validators |
| Market Replay | replay.js | Built | ✅ Playback, annotations |
| Solo Missions | soloMissions.js | Built | ✅ Mission board, tracking |
| **VISUAL & UI** |  |  |  |
| Dashboard | dashboard.js | Built | ✅ Stats, feed, leaderboard |
| Navigation Tabs (9) | ui.js | Built | ✅ All screens accessible |
| The Desk (Research Hub) | desk.js, deskContent.js | Built | ✅ Briefing, podcasts, watchlists |
| Empire Panel | focus.js | Built | ✅ Departments, venues, net worth |
| Profile & Settings | ui.js, auth.js | Built | ✅ Profile, preferences |
| **INFRASTRUCTURE** |  |  |  |
| State Management (Pub/Sub) | state.js, signal.js | Built | ✅ Event bus, signals |
| localStorage Persistence | state.js | Built | ✅ Cache key, hydration |
| Supabase Integration | state.js, auth.js | Scaffolded | ⚠️ Auth works, full sync TBD |
| Authentication | auth.js | Built | ✅ Demo + Supabase |
| i18n (7 languages) | i18n.js | Built | ✅ All UI translated |
| Admin Dashboard | admin.js | Built | ✅ Leaderboards, moderation |
| Dev Tools | devtools.js | Built | ✅ Full debug suite |
| Replay System | replay.js | Built | ✅ Record & playback |
| Performance Monitoring | city3d.js | Built | ✅ FPS, auto-quality |
| PWA & Service Worker | (TBD) | Scaffolded | ⚠️ Cache strategy TBD |
| Logging & Error Tracking | (TBD) | Partial | ⚠️ Needs full analytics |
| Build & Deployment | config.js, index.html | Built | ✅ Zero-build, CDN deps |

---

## KEY NUMBERS (Economy Parameters)

### Starting Values
- Personal balance: €50,000
- Company balance: €0 (Sole Trader, starts empty)
- Focus timer rate: €3/minute
- 25-min session: €75 + loot

### Structure Costs & Tax Rates
| Structure | Cost | Tax |
|-----------|------|-----|
| Sole Trader | Free | 25% |
| Partnership | €2,000 | 22% |
| LLC | €25,000 | 15% |
| Public Company | €5,000,000 | 5% |
| Social Enterprise | €10,000 | 3% |
| NGO | €5,000 | 0% |

### Department Income (Managed)
- HR: €3,000/month
- Trading Floor: €8,000/month
- Marketing: €6,000/month
- R&D Lab: €15,000/month
- Finance Office: €12,000/month
- Legal Dept: €10,000/month

### Venue Income (L5 Max)
- The Brass Tap: €4,000/month
- Azure Bistro: €48,000/month
- Skyline Grand: €400,000/month
- Royal Palace: €1,200,000/month

### Institution Donations
- City Museum: €2,000,000 (+15 Impact)
- General Hospital: €5,000,000 (+20 Impact)
- City University: €10,000,000 (+25 Impact)

### IAP Pricing
- Starter: €0.99 → €5,000
- Growth: €4.99 → €30,000
- Accelerator: €9.99 → €75,000
- Tycoon: €19.99 → €200,000
- Mogul: €49.99 → €600,000

### Rewards & Bonuses
- Daily login (Day 7): €3,000
- Loot drop: €75–€750
- Mystery box: €150–€1,000 + 50 XP
- Referral: €500 + 100 XP + 5 Impact + 20 followers
- Institution donation: 500–1,000 XP

### Time Mechanics
- Focus session: 25 minutes
- Market tick: 5 seconds (real-time)
- Daily bonus: resets 24 hours
- Tax month: ~30 in-game days
- Offshore account switch: 1-week cooldown
- Loan repayment: 6–12 months (configurable)
- Partnership duration: unlimited (can dissolve anytime, fee 5% of company balance)

### Thresholds & Gates
- First department unlock: NW ≥ €30K (HR)
- LLC unlock: Growth ≥40, Governance ≥30, Impact ≥10
- Public Company: NW ≥ €10M, MRR ≥ €200K, 4+ managed depts, 500+ trades, 5+ courses, 3 profitable months
- Commodities/Forex/Bonds: NW ≥ €50K + course
- Real Estate: NW ≥ €250K + course
- Alt Investments: NW ≥ €1M + Public Co
- Verification: 50K followers, 60-day age, premium, credibility ≥60, Governance ≥30, 10 posts/month
- Crime heat: 0–100 (0 = safe, 100 = near-certain audit)

---

## END OF FEATURE LIST

This document represents the complete Quantico feature set as of the latest MVP build. All numbers, mechanics, and state structures are referenced from the production codebase and design documents.

For backend architecture work, key integration points:
- State persistence: localStorage (primary), Supabase (overlay)
- Event system: pub/sub via state.js notify() + typed signals
- Economy: dual-wallet, structure-based tax rates, 6-tier banking
- Progression: axes (4), XP (levels 1–50+), 3-tier certification
- Social: followers, market mover, verified badge, Market Calls
- Competition: PvP takeovers, leaderboards, referrals
- Monetization: IAP (5 packs), battle pass, ads (scaffolded), premium sub
- Education: 11 courses, 38 lessons, 11-chapter playbook, glossary

All systems are interconnected via the pub/sub event bus. Mutations to state trigger notify() calls, which broadcast to all listeners, enabling reactive UI updates and cross-system consequences (e.g., trading P&L → XP award → axes update → structure unlock check).
