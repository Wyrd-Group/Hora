# AEGIS EMPIRE — Alpha Tester Manual

**Version:** Alpha 0.1
**Build:** main@2385d7e
**Live at:** https://aegis-empire.netlify.app

---

## Welcome, Tester

AEGIS Empire is a gamified financial education platform where you build a corporate empire, collect AI agent cards, trade on simulated markets, compete in PvP arenas, and climb the global leaderboard. This manual covers every feature available in the current alpha build.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Game Modes](#2-game-modes)
3. [Top Navigation](#3-top-navigation)
4. [Overview Dashboard](#4-overview-dashboard)
5. [Globe Map](#5-globe-map)
6. [Exchange Terminal](#6-exchange-terminal)
7. [Office Floor](#7-office-floor)
8. [Agent Card System](#8-agent-card-system)
9. [Youth Academy (Societies)](#9-youth-academy-societies)
10. [PvP Arena](#10-pvp-arena)
11. [Squad Builder](#11-squad-builder)
12. [Social Platform (BizTok)](#12-social-platform-biztok)
13. [Athena AI](#13-athena-ai)
14. [Battle Pass](#14-battle-pass)
15. [Dev Panel](#15-dev-panel)
16. [Known Issues](#16-known-issues)
17. [Reporting Bugs](#17-reporting-bugs)

---

## 1. Getting Started

### Creating an Account
- Visit https://aegis-empire.netlify.app
- Sign up with email or continue as Guest
- Guest mode works fully offline with localStorage — your progress saves locally but won't sync across devices

### First Login
On first launch you'll see the **Onboarding Hub** — a mode selection screen. Pick a game mode to begin.

---

## 2. Game Modes

The Onboarding Hub offers 8 modes:

| Mode | Description |
|------|-------------|
| **Campaign** | Full multiplayer experience with real markets and real players |
| **Offline** | Solo practice — no internet required |
| **Quick Match** | 10-player PvP arena with configurable duration |
| **Private Server** | Custom lobbies with friends and custom rules |
| **Academy** | Educational hub with Athena AI tutor and ECFL certification |
| **Social** | Community features — BizTok feed, market calls, forums |
| **Lab** | Risk-free simulation trading for practice |
| **Athena** | AI Chief of Staff — issue directives and deploy agents to real tasks |

You can switch modes anytime from the Hub.

---

## 3. Top Navigation

The main navigation bar shows 5 tabs:

- **Overview** — Company dashboard and metrics
- **Globe** — Interactive world map
- **Exchange** — Live market trading terminal
- **Office** — Agent deployment and management floor
- **Pass** — Battle Pass progression

Additional panels are accessible via HUD buttons on the left sidebar.

---

## 4. Overview Dashboard

Your corporate command center showing:

- **Company Balance** — Your current funds
- **CEO Level & XP** — Your progression
- **ECFL Score** — Education/certification metric
- **Net Worth** — Total empire valuation
- **Department Performance** — Status of active departments
- **Active Agents** — Deployed agent summary
- **Income/Expenses** — Per-tick financial breakdown

### Departments
Your company has operational departments that generate income and bonuses:
- Each department can have agents deployed for bonus effects
- Department performance scales with agent quality (OVR rating)

---

## 5. Globe Map

An interactive 3D world map showing:

- **Your empire nodes** — Locations you own across the globe
- **Market opportunities** — Regions with active ventures
- **Government layers** — Political influence zones
- **Trending ventures** — Hot investment opportunities
- **Intel feed** — Real-time world events affecting markets

Click on regions to explore investment opportunities or view geopolitical events.

---

## 6. Exchange Terminal

A full-featured simulated market trading terminal:

### Left Panel — Chart
- Real-time candlestick price chart
- Technical indicators overlay
- Instrument selector (switch between stocks, crypto, commodities)
- Live/Paused status indicator

### Right Panel — Trading
- **Market Orders** — Buy/sell at current price
- **Limit Orders** — Set price targets
- **Options Trading** — Calls and puts
- **Leverage** — 2x, 5x, 10x positions
- **Holdings** — View open positions with P&L
- **Trade History** — Past transactions

### How Trading Works
- Markets tick automatically (every 3-30 seconds depending on game speed)
- Buy low, sell high to grow your balance
- Leveraged positions amplify both gains and losses
- Your trading balance is your company's operating funds

---

## 7. Office Floor

A visual corporate headquarters where you manage your AI agents.

### Rooms (6 total)
| Room | Purpose |
|------|---------|
| **CEO Suite** | Executive operations — best for Orchestrator/Autonomous agents |
| **Trading Floor** | Market operations — best for Trader/Analyst agents |
| **R&D Lab** | Research — best for Researcher/Coder agents |
| **Ops Center** | Operations — best for Navigator/Specialist agents |
| **Intel Room** | Intelligence — best for Infiltrator/Scout agents |
| **Main Floor** | Undeployed agents wait here |

### Deploying Agents
1. **Drag** an agent from Main Floor (or any room)
2. **Drop** them into a target room
3. The room glows when you hover over it with an agent
4. A toast notification confirms deployment
5. To **recall** an agent, drag them back to Main Floor

### Agent Seniority
Agents get workspace types based on seniority score:

| Tier | Score | Workspace |
|------|-------|-----------|
| Executive | 30+ | Private office with nameplate |
| Senior | 20-29 | Large cubicle |
| Mid | 12-19 | Standard cubicle |
| Junior | <12 | Open desk on trading floor |

**Seniority = (Level x 2) + (Rarity Rank x 3) + (OVR / 10)**

---

## 8. Agent Card System

### Overview
Collect 76 unique AI agent cards. Each agent has a class, rarity, stats, abilities, and an ultimate skill.

### Agent Classes (12)

| Class | Specialty |
|-------|-----------|
| Autonomous | Self-directed operations, CEO-tier |
| Coder | Software development, technical tasks |
| Orchestrator | Team coordination, management |
| Trader | Market operations, financial analysis |
| Researcher | Data analysis, R&D |
| Infiltrator | Covert operations, intelligence |
| Navigator | Logistics, route optimization |
| Analyst | Data interpretation, forecasting |
| Social | Community management, PR |
| Specialist | Domain expertise, niche operations |
| Scout | Talent discovery at colleges |
| Jobhunter | Free agent market recruitment |

### Rarity Tiers

| Rarity | Drop Rate | Card Border |
|--------|-----------|-------------|
| Common | ~40% | Gray |
| Uncommon | ~30% | Green |
| Rare | ~18% | Blue |
| Epic | ~8% | Purple |
| Legendary | ~3% | Gold |
| Mythic | ~1% | Red/Animated |

### Stats (6 attributes, 0-100)
- **Intelligence** — Problem solving, analysis quality
- **Speed** — Task completion rate
- **Stealth** — Covert operation success
- **Loyalty** — Reliability, morale resistance
- **Adaptability** — Versatility across roles
- **Influence** — Social impact, negotiation power

### Overall Rating (OVR)
Each agent has an OVR (0-99) calculated from weighted stats based on class:
- A Coder weights Intelligence (30%) and Speed (25%) heavily
- A Trader weights Speed (25%), Intelligence (20%), Adaptability (20%)
- Higher OVR = better performance in deployed roles

### Packs & Minting
- Open packs to mint new agents
- **Pity system**: Soft pity at 50 packs (+1.5% Legendary chance per pack), hard pity guarantees Legendary by pack 80
- **New player luck**: +50% rare chance on your first 5 packs
- **Comeback bonus**: Up to +20% rare chance if you haven't played recently

### Agent Contracts
- Agents require **contracts** to be deployed
- Contracts have: duration (ticks), salary (per-tick cost), morale, release clause
- Expired agents can't be deployed until renewed
- Contract extension cards can be applied from consumables

### Leveling & Development
- Agents earn XP from deployment and tasks
- Level range: 1-12
- Each level-up recalculates OVR (+1-3 stats based on class weights)
- **Development Plans**: Retrain an agent toward a different class, choose focus stats, set training intensity

### Special Card Types
- **TOTW** — Team of the Week (boosted stats)
- **TOTS** — Team of the Season
- **Icon** — Legendary historical variant
- **Prospect** — High-potential young agent
- **Inform** — Performance-based upgrade
- **Flashback** — Throwback version with altered stats

### Agent Actions
- **Deploy** — Assign to office room or real-world task
- **Recall** — Return to bench
- **Lock/Unlock** — Prevent accidental selling
- **Quick Sell** — Sell for instant currency
- **Marketplace** — List for sale to other players
- **Use Ability** — Activate agent's special skill (has cooldown)
- **Use Ultimate** — Activate powerful skill (unlocks at level 5)

---

## 9. Youth Academy (Societies)

Open student societies at European colleges to discover and nurture future agents.

### How It Works
1. **Open a society** at a college (costs Q-Coins based on prestige)
2. Students enroll automatically over time
3. **Assign work** to accelerate student growth
4. **Take as intern** for 2x individual stat growth
5. When students **graduate**, choose to **Recruit** (mint as agent) or **Pass** (release to free agent pool)

### Colleges (16 across Europe)

| College | Country | Prestige | Specializations | Potential Range |
|---------|---------|----------|-----------------|-----------------|
| Oxford | UK | 5 stars | Researcher, Analyst | 75-95 |
| ETH Zurich | Switzerland | 5 stars | Coder, Orchestrator | 75-95 |
| Sorbonne | France | 4 stars | Social, Analyst | 70-90 |
| Bocconi | Italy | 4 stars | Trader, Orchestrator | 70-88 |
| TU Munich | Germany | 4 stars | Coder, Researcher | 68-88 |
| KTH Stockholm | Sweden | 3 stars | Coder, Navigator | 62-82 |
| ESADE Barcelona | Spain | 3 stars | Trader, Social | 60-80 |
| Trinity Dublin | Ireland | 3 stars | Researcher, Analyst | 60-80 |
| TU Delft | Netherlands | 3 stars | Specialist, Coder | 60-82 |
| Politecnico Milan | Italy | 3 stars | Coder, Specialist | 62-80 |
| Aalto Helsinki | Finland | 3 stars | Navigator, Coder | 60-78 |
| Copenhagen BS | Denmark | 3 stars | Trader, Orchestrator | 62-80 |
| Warsaw University | Poland | 2 stars | Infiltrator, Coder | 55-72 |
| Carlos III Madrid | Spain | 2 stars | Analyst, Trader | 55-72 |
| Corvinus Budapest | Hungary | 2 stars | Trader, Social | 52-70 |
| Jagiellonian Krakow | Poland | 2 stars | Researcher, Analyst | 50-68 |

### Scout Agents
Deploy Scout-class agents to societies to:
- Increase new student discovery rate
- Improve the quality of discovered students
- Higher Scout intelligence = better talent pool

### Jobhunter Agents
Deploy Jobhunter-class agents to the open market to:
- Find ready-to-recruit professional agents
- Quality scales with Jobhunter's influence stat

---

## 10. PvP Arena

### Quick Match
Competitive 10-player matches with 4 game modes:

| Mode | Win Condition |
|------|--------------|
| **Free For All (FFA)** | Highest net worth wins |
| **Trading Blitz** | Most profitable trades wins |
| **Empire Rush** | Most nodes owned wins |
| **Agent Wars** | Best agent deployment wins |

### Match Durations
Choose from: 10min, 20min, 30min, 45min, 60min, 3h, 6h, 12h, 24h, 72h, or 1 week

- Short matches (under 3h) run at 10x speed (3-second ticks)
- Long matches run at normal speed (30-second ticks)

### Matchmaking Flow
1. Select game mode and duration
2. Click "Search for Match" — radar animation shows players joining
3. Once 10 players are found, lobby appears showing all opponents with ratings/tiers
4. 5-second countdown, then match begins

### ELO Rating Tiers

| Tier | Rating Range |
|------|-------------|
| Bronze | 0 - 799 |
| Silver | 800 - 1,199 |
| Gold | 1,200 - 1,599 |
| Platinum | 1,600 - 1,999 |
| Diamond | 2,000 - 2,399 |
| Champion | 2,400+ |

### Rewards (1st Place)
- 3.5M - 5M currency
- 4,000 - 5,000 XP
- 40 - 50 ECFL points
- 1,500 - 2,000 AEGIS Points
- Special agent pack
- Unique title (e.g., "Arena Champion", "Trading Ace")

---

## 11. Squad Builder

Before entering PvP, build a **lineup** from your agent collection (similar to FUT squad building).

### Squad Positions (10 slots)

| Position | Preferred Classes |
|----------|------------------|
| CEO (1) | Orchestrator, Autonomous |
| CTO (1) | Coder, Specialist |
| CFO (1) | Trader, Analyst |
| CMO (1) | Social |
| COO (1) | Navigator, Orchestrator |
| Analyst (2) | Analyst, Researcher |
| Operative (2) | Infiltrator, Specialist |
| Wildcard (1) | Any class |

### Chemistry System
- Agents in their **preferred position**: +3 chemistry
- **Matching synergy tags** with adjacent slots: +2 per link
- **Same college/society** graduates: +2
- **Same special card type**: +1
- Max 10 per slot, 100 total team chemistry
- Chemistry affects PvP performance — 100 chem = full stats, below 50 = stat penalties

### Consumable Cards
Apply boost cards to agents before matches:
- **Attribute Boost** — +5 to a specific stat for X ticks
- **Contract Extension** — +50/100/200 ticks to contract
- **Position Change** — Temporarily change agent class
- **Chemistry Style** — Redistribute stat weights for synergy
- **Healing** — Restore morale to 100
- **Training** — Instant XP boost
- **Scouting Report** — Reveal hidden potential of a student

---

## 12. Social Platform (BizTok)

A social feed for the AEGIS community:

### Features
- **Post** text updates with $TICKER tags (e.g., "$AAPL bullish")
- **Like** and **comment** on other players' posts
- **Follow** other players to see their activity
- **Leaderboard** — Global rankings by net worth, level, and reputation
- **Real-time updates** — New posts appear instantly via Supabase realtime

### Leaderboard
Rankings pull from all Supabase accounts and display:
- Player name and tier
- Net worth
- Level
- Win rate
- Social reputation score

---

## 13. Athena AI

Your AI Chief Operating Officer. Athena manages your agents and helps with strategy.

### Chat Mode
- Ask Athena questions about your empire, market strategy, or game mechanics
- Athena has context about your company state, balance, and agents

### Directives Mode
- Give high-level orders: "Research competitors in fintech" or "Build a marketing campaign"
- Athena breaks down directives into sub-tasks
- Assigns the best available agent to each sub-task based on class and OVR
- Reports back with status updates

### Agent Capability Tiers
| OVR Range | Capability |
|-----------|-----------|
| Below 50 | Basic tasks, slow, may fail |
| 50-70 | Intermediate, reliable |
| 70-85 | Advanced, fast, high quality |
| 85+ | Expert-level, complex multi-step work |

---

## 14. Battle Pass

Seasonal progression system with rewards:
- Earn XP from matches, trades, and daily activities
- Unlock rewards at each tier
- Free and premium tracks available

---

## 15. Dev Panel

**Press F2** to open the developer panel (available to alpha testers).

Features include:
- God mode toggle
- Add money cheat
- Set level
- Market lock bypass
- Building placement tools
- State inspection

Use this to test features quickly without grinding.

---

## 16. Known Issues

- **Social tables**: Posts, comments, likes, and follows may show console errors if the Supabase migration hasn't been applied yet. The leaderboard works.
- **Large repo warning**: The GitHub repo has a 71MB zip file that triggers a warning on push. This doesn't affect the app.
- **Office drag-and-drop**: On some mobile browsers, drag-and-drop may not work as expected. Desktop Chrome is recommended.
- **Exchange auto-play**: The market terminal auto-starts on load. If you see a blank chart, wait a few seconds for data to populate.

---

## 17. Reporting Bugs

When you find a bug, please include:
1. **What you did** — Steps to reproduce
2. **What you expected** — The correct behavior
3. **What happened** — The actual behavior
4. **Screenshot** — If visual
5. **Browser & device** — Chrome/Safari/Firefox, desktop/mobile
6. **Console errors** — Open DevTools (F12) > Console tab, screenshot any red errors

Report bugs via the in-game Bug Report panel or directly to the development team.

---

**Thank you for testing AEGIS Empire. Your feedback shapes the game.**
