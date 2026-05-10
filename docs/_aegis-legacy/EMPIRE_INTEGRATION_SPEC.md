# AEGIS EMPIRE — New App Spec for Antigravity

## CRITICAL DESIGN PRINCIPLE

**Empire is a NEW standalone app at `apps/empire/` in the monorepo.** It does NOT live inside `apps/glass/`. It does NOT modify any Glass files. Glass (Aegis Analysis) stays untouched.

However — and this is the critical part — **Empire must look and feel exactly like Aegis.** Same dark tactical aesthetic, same CARTO Dark Matter map, same Deck.gl rendering, same Zustand patterns, same Tailwind theme, same JetBrains Mono typography, same component conventions. If you put the two apps side by side, they should look like two modes of the same product.

**How to achieve this:**
1. Read every file in `apps/glass/src/` first. Study the architecture, the patterns, the styling.
2. Scaffold `apps/empire/` as a new Vite + React app with the same dependency versions.
3. COPY these files from Glass as your starting foundation (then modify them for Empire):
   - `index.css` — copy verbatim (Tailwind theme, custom utilities, scrollbar styles)
   - `tailwind.config.js` — copy and extend with empire-specific colors
   - `components/layout/Shell.jsx` — copy verbatim (full-screen container)
   - `components/map/MapViewer.jsx` — copy as starting point, then replace analysis layers with empire layers
   - `components/map/HoverIntelCard.jsx` — copy, adapt for empire node hover
   - `components/ai/MavenPanel.jsx` — copy verbatim (Maven works the same in Empire)
4. Build all new empire components following the exact same patterns you see in Glass components.

**Reference files you MUST read before writing any code:**
- `apps/glass/src/App.jsx` — main entry pattern (81 lines)
- `apps/glass/src/store/mssStore.ts` — Zustand store pattern to replicate (180 lines)
- `apps/glass/src/components/map/MapViewer.jsx` — Deck.gl + MapLibre architecture (347 lines)
- `apps/glass/src/components/layout/Shell.jsx` — layout wrapper to copy
- `apps/glass/src/components/rails/LeftRail.jsx` — study Tailwind patterns, panel structure
- `apps/glass/src/components/rails/RightRail.jsx` — study right panel layout
- `apps/glass/src/components/ticker/TelemetryTicker.jsx` — study ticker pattern
- `apps/glass/src/components/ai/MavenPanel.jsx` — copy this for Empire
- `apps/glass/src/index.css` — copy this (Tailwind theme + `glass-panel`, `hud-border`, `ticker-text` utilities)
- `apps/glass/tailwind.config.js` — copy and extend
- `apps/glass/package.json` — use same dependency versions
- `EMPIRE_SYSTEM_COMPREHENSIVE_SPEC.md` — full game mechanics (wallets, axes, structures, crimes, cards)
- `AEGIS_EMPIRE_UI_MVP.html` — approved visual prototype (open in browser to see exact target UI)

---

## APP SCAFFOLD

### Directory Structure

```
apps/empire/
├── index.html                    # Title: "aegis — empire"
├── package.json                  # Same deps as Glass + cmdk
├── vite.config.js                # Copy from Glass
├── tailwind.config.js            # Copy from Glass + empire colors
├── postcss.config.js             # Copy from Glass
├── src/
│   ├── main.jsx                  # React entry point
│   ├── App.jsx                   # Empire main app
│   ├── index.css                 # Copy from Glass verbatim
│   ├── store/
│   │   └── empireStore.ts        # Game state (Zustand)
│   ├── components/
│   │   ├── layout/
│   │   │   └── Shell.jsx         # Copy from Glass verbatim
│   │   ├── map/
│   │   │   ├── MapViewer.jsx     # Fork from Glass — empire layers only
│   │   │   └── HoverNodeCard.jsx # Empire node hover tooltip
│   │   ├── empire/
│   │   │   ├── EmpireLeftRail.jsx    # Floating left panel (wallets, axes, tabs)
│   │   │   ├── EmpireNodeDetail.jsx  # Right panel (node detail, cards, actions)
│   │   │   ├── CommandTerminal.jsx   # cmdk command palette
│   │   │   ├── PackOverlay.jsx       # Gacha pack opening
│   │   │   ├── WalletCard.jsx        # Reusable wallet display
│   │   │   ├── AxisBar.jsx           # Reusable axis progress bar
│   │   │   ├── DeptCard.jsx          # Department project card
│   │   │   ├── AssetCard.jsx         # Owned node list item
│   │   │   └── MarketCard.jsx        # Market node listing
│   │   ├── ai/
│   │   │   └── MavenPanel.jsx    # Copy from Glass verbatim
│   │   └── ticker/
│   │       └── EmpireTicker.jsx  # Empire-specific telemetry ticker
│   └── data/
│       └── seed.ts               # Initial game state (12 nodes, cards, projects, etc.)
```

### package.json

Same dependencies as `apps/glass/package.json`, identical versions. Add one new dep:

```json
{
  "name": "aegis-empire",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@deck.gl/aggregation-layers": "^9.2.11",
    "@deck.gl/core": "^9.2.11",
    "@deck.gl/geo-layers": "^9.2.11",
    "@deck.gl/layers": "^9.2.11",
    "@deck.gl/mesh-layers": "^9.2.11",
    "@deck.gl/react": "^9.2.11",
    "cmdk": "^1.0.0",
    "clsx": "^2.1.1",
    "h3-js": "^4.4.0",
    "lucide-react": "^1.7.0",
    "maplibre-gl": "^5.21.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-map-gl": "^8.1.0",
    "tailwind-merge": "^3.5.0",
    "zustand": "^5.0.12"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.5.2",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.4",
    "tailwindcss": "^3.4.17",
    "vite": "^6.3.5"
  }
}
```

Note: `@react-sigma/core`, `graphology`, `sigma` are NOT needed — those are for the Analysis network graph. Empire doesn't use them.

### Monorepo root `package.json`

Add a new script alongside existing ones:

```json
"scripts": {
  "dev:api": "cd services/api && uvicorn app.main:app --reload --port 8000",
  "dev:empire": "cd apps/empire && npm run dev",
  "seed": "cd services/api && python -m scripts.seed"
}
```

---

## FILE SPECIFICATIONS

### 1. `src/store/empireStore.ts`

Zustand store. Follow the EXACT same pattern as `apps/glass/src/store/mssStore.ts`:
- `create` from zustand
- Typed interface with state + actions + selectors
- Immutable updates via set()
- Selectors use get()

```typescript
import { create } from 'zustand';

// ── Types ─────────────────────────────────────────────────────────
export type NodeOwner = 'player' | 'market' | 'rival';
export type NodeStatus = 'operational' | 'building' | 'disabled';
export type SectorType = 'finance' | 'tech' | 'oil_gas' | 'manufacturing' | 'energy' | 'pharma' | 'venue';
export type CardTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Icon';
export type CorporateStructure = 'Sole Trader' | 'Partnership' | 'Privately Held (LLC)' | 'Public Company' | 'Social Enterprise' | 'NGO Watchdog';

export interface EmpireNode {
  id: string;
  name: string;
  type: SectorType;
  owner: NodeOwner;
  lat: number;
  lon: number;
  level: number;           // 1-5
  income: number;          // monthly €
  status: NodeStatus;
  endsIn?: string;         // construction timer display
  capex?: number;          // market nodes: purchase price
  opex?: number;           // market nodes: monthly cost
}

export interface EmployeeCard {
  id: string;
  name: string;
  role: string;
  tier: CardTier;
  multiplier: number;
  stat: string;
  assignedNodeId?: string;
}

export interface DeptProject {
  id: string;
  dept: string;            // HR | Trading | Marketing | R&D | Finance | Legal
  name: string;
  cost: number;
  focusSessions: number;
  successRate: number;      // 0-100
  effect: string;
  active: boolean;
}

export interface CrimeOperation {
  id: string;
  name: string;
  detectionPct: number;
  penaltyMultiplier: string;
  axisHit: string;
  heatGain: number;
}

export interface TickerEvent {
  id: string;
  text: string;
  type: 'fx' | 'crypto' | 'commodity' | 'intel' | 'alert' | 'crime' | 'board';
  timestamp: number;
}

export interface TradeRoute {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: 'sea' | 'rail' | 'air' | 'truck';
  active: boolean;
}

// ── State Interface ───────────────────────────────────────────────
interface EmpireState {
  // Wallets
  personalBalance: number;
  companyBalance: number;
  monthlyIncome: number;
  netWorth: number;

  // Four axes (0-100)
  growth: number;
  governance: number;
  impact: number;
  power: number;

  // Corporate
  structure: CorporateStructure;
  taxRate: number;
  heat: number;
  followers: number;
  ceoApproval: number;

  // Entities
  nodes: Record<string, EmpireNode>;
  cards: Record<string, EmployeeCard>;
  projects: DeptProject[];
  crimes: CrimeOperation[];
  routes: TradeRoute[];
  ticker: TickerEvent[];

  // UI state
  selectedNodeId: string | null;
  activeTab: 'overview' | 'departments' | 'marketplace' | 'crime';
  terminalOpen: boolean;
  mavenOpen: boolean;
  packOpen: boolean;
  leftRailOpen: boolean;
  showRoutes: boolean;

  // Actions
  selectNode: (id: string | null) => void;
  setActiveTab: (tab: EmpireState['activeTab']) => void;
  setTerminalOpen: (open: boolean) => void;
  setMavenOpen: (open: boolean) => void;
  setPackOpen: (open: boolean) => void;
  setLeftRailOpen: (open: boolean) => void;
  setShowRoutes: (show: boolean) => void;

  // Game actions (local-first, backend integration later)
  purchaseNode: (nodeId: string, method: 'build' | 'buy') => void;
  upgradeNode: (nodeId: string) => void;
  startProject: (projectId: string) => void;
  executeCrime: (crimeId: string) => void;
  openPack: () => EmployeeCard[];

  // Selectors
  getOwnedNodes: () => EmpireNode[];
  getMarketNodes: () => EmpireNode[];
  getRivalNodes: () => EmpireNode[];
  getNodeById: (id: string) => EmpireNode | null;
  getDeckGlEmpireNodes: () => Array<EmpireNode & { position: [number, number] }>;
}
```

**Implementation notes:**
- Seed initial state from `data/seed.ts` (the 12 nodes, 13 dept projects, 4 crimes, 3 banks, cards, ticker events — all from the HTML prototype).
- `getDeckGlEmpireNodes()` returns `{ ...node, position: [lon, lat] }` — same pattern as Glass's `getDeckGlTargets()`.
- All game actions mutate state directly for now. Backend integration (Celery workers) comes later.
- `netWorth` and `monthlyIncome` should be recomputed whenever nodes/cards/wallets change.

---

### 2. `src/data/seed.ts`

Export all mock data from the HTML prototype as typed constants:
- `INITIAL_NODES`: 12 EmpireNode objects (6 player, 4 market, 2 rival)
- `INITIAL_CARDS`: 3 EmployeeCard objects
- `INITIAL_PROJECTS`: 13 DeptProject objects
- `INITIAL_CRIMES`: 4 CrimeOperation objects
- `INITIAL_ROUTES`: 4 TradeRoute objects
- `INITIAL_TICKER`: 12 TickerEvent objects
- `BANKS`: 3 bank objects with audit modifiers
- `CMD_ITEMS`: 10 command terminal entries

Copy the exact data from `AEGIS_EMPIRE_UI_MVP.html` — same names, same values, same coordinates.

---

### 3. `src/components/map/MapViewer.jsx`

**Fork from `apps/glass/src/components/map/MapViewer.jsx`** but strip out all analysis layers and replace with empire layers.

**Keep from Glass:**
- DeckGL + Map (react-map-gl/maplibre) setup
- CARTO Dark Matter basemap (`MAP_STYLE`)
- Controller settings
- Layer toggle button row at top

**Remove from Glass:**
- All analysis layers (heatmap, clusters, threats, vessels, OSINT, macro, space weather)
- All analysis-specific state (entities, threats, anomalies, densityGrid)
- `useMssStore` import
- HoverIntelCard (replace with HoverNodeCard)

**Replace with empire layers:**

```jsx
import { useEmpireStore } from '../../store/empireStore';
import { ScatterplotLayer } from '@deck.gl/layers';
import { ArcLayer } from '@deck.gl/layers';

// INITIAL_VIEW_STATE — world view, not Gulf AOI
const INITIAL_VIEW_STATE = {
  longitude: 20,
  latitude: 30,
  zoom: 2.2,
  pitch: 15,
  bearing: 0,
};
```

**Empire layers:**

1. **ScatterplotLayer** for empire nodes — color by owner (player=green, market=red, rival=amber), radius by level for player nodes
2. **ArcLayer** for trade routes — color by type (sea=blue, rail=purple, air=pink, truck=yellow), `greatCircle: true`
3. **TextLayer** for node labels — player-owned nodes show last word of name

**Empire toggles:**
```
CORPORATE (always on, green) | ROUTES (toggle, blue) | THREATS (future) | SENTIMENT (future) | ESG (future)
```

**Click handler:** `useEmpireStore.getState().selectNode(info.object.id)` — then `flyTo` the node.

---

### 4. `src/App.jsx`

Main entry point. Pattern mirrors Glass's App.jsx but for Empire.

```jsx
import React from 'react';
import Shell from './components/layout/Shell';
import MapViewer from './components/map/MapViewer';
import EmpireLeftRail from './components/empire/EmpireLeftRail';
import EmpireNodeDetail from './components/empire/EmpireNodeDetail';
import EmpireTicker from './components/empire/EmpireTicker';
import CommandTerminal from './components/empire/CommandTerminal';
import PackOverlay from './components/empire/PackOverlay';
import MavenPanel from './components/ai/MavenPanel';
import { useEmpireStore } from './store/empireStore';

function App() {
  const selectedNodeId = useEmpireStore((s) => s.selectedNodeId);
  const terminalOpen = useEmpireStore((s) => s.terminalOpen);
  const mavenOpen = useEmpireStore((s) => s.mavenOpen);
  const packOpen = useEmpireStore((s) => s.packOpen);

  return (
    <Shell>
      {/* Background Map (z-0) */}
      <MapViewer />

      {/* HUD Layers (z-10+) */}
      <EmpireLeftRail />
      {selectedNodeId && <EmpireNodeDetail />}
      <EmpireTicker />

      {/* Overlays (z-50) */}
      {terminalOpen && <CommandTerminal />}
      {packOpen && <PackOverlay />}
      {mavenOpen && <MavenPanel onClose={() => useEmpireStore.getState().setMavenOpen(false)} />}

      {/* HUD Buttons — above ticker */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        <button
          onClick={() => useEmpireStore.getState().setMavenOpen(true)}
          className="px-4 py-1.5 border border-purple-500/30 bg-purple-500/10
            text-purple-400/70 rounded-full font-mono text-[9px] tracking-widest
            hover:border-purple-400 hover:text-purple-400 transition-all backdrop-blur">
          MAVEN AI
        </button>
        <button
          onClick={() => useEmpireStore.getState().setPackOpen(true)}
          className="px-4 py-1.5 border border-amber-400/30 bg-amber-400/10
            text-amber-400/70 rounded-full font-mono text-[9px] tracking-widest
            hover:border-amber-400 hover:text-amber-400 transition-all backdrop-blur">
          OPEN PACK
        </button>
        <button
          className="px-4 py-1.5 border border-amber-500/30 bg-amber-500/10
            text-amber-500/70 rounded-full font-mono text-[9px] tracking-widest
            hover:border-amber-500 hover:text-amber-500 transition-all backdrop-blur">
          INTEL HUB
        </button>
      </div>

      {/* Command shortcut label in top bar */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-tactical-bg/90 border-b
        border-tactical-border/50 z-30 flex items-center justify-between px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] text-tactical-accent font-bold tracking-[0.15em]">AEGIS</span>
          <span className="text-tactical-border">|</span>
          <span className="font-mono text-[9px] text-tactical-text/60 tracking-wide">EMPIRE COMMAND</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Layer toggles rendered by MapViewer, or here */}
          <button
            onClick={() => useEmpireStore.getState().setTerminalOpen(true)}
            className="px-3 py-1 font-mono text-[9px] border border-tactical-border
              bg-tactical-bg text-tactical-text/50 rounded cursor-pointer flex items-center gap-1.5
              hover:border-tactical-accent/50 hover:text-tactical-accent/80 transition-all">
            <span className="text-tactical-accent">▶</span> COMMAND
            <span className="text-tactical-text/30 text-[8px]">⌘K</span>
          </button>
        </div>
      </div>
    </Shell>
  );
}

export default App;
```

---

### 5. `src/components/empire/EmpireLeftRail.jsx`

**Floating panel** — NOT edge-docked like Glass's LeftRail.

```
Position: fixed left-3 top-[52px] bottom-11
Width: w-80 (320px)
Border-radius: rounded-xl (12px)
Background: bg-tactical-bg/[0.92] backdrop-blur-xl
Border: border border-tactical-border
Shadow: shadow-[0_8px_32px_rgba(0,0,0,0.4)]
Overflow: overflow-hidden (clips children to rounded corners)
Transition: transform on open/close
```

**Sections (top to bottom):**

1. **Wallets** — two `WalletCard` side by side (Personal | Company) + Net Worth bar
2. **Structure + Axes** — corporate structure badge, tax rate, 4 `AxisBar` components, Heat + Followers
3. **Tab bar** — OVERVIEW | DEPARTMENTS | MARKET | DEFCON
4. **Tab content** — scrollable area, renders based on `activeTab`

**Each tab renders:**
- `overview`: list of `AssetCard` for owned nodes
- `departments`: list of `DeptCard` for all 13 projects
- `marketplace`: list of `MarketCard` for market nodes
- `crime`: heat gauge, bank selector, crime operations list

All data reads from `useEmpireStore()`.

Collapsible via toggle button (same pattern as Glass LeftRail's collapsed state).

---

### 6. `src/components/empire/EmpireNodeDetail.jsx`

Right panel. Fixed right-0, top-[40px], bottom-8, w-80.

**Three view modes by `node.owner`:**

1. **Player-owned:** Level + Income stats grid, construction progress bar (if building), Card Roster (list of EmployeeCards assigned), Upgrade button
2. **Market:** CAPEX + OPEX stats grid, "BUILD IT" button (60% cost + 14 days), "BUY IT" button (full cost, instant)
3. **Rival:** REDACTED intel box, "Initiate M&A Cyber-Strike" button

Close button calls `empireStore.selectNode(null)`.

---

### 7. `src/components/empire/CommandTerminal.jsx`

Full-screen overlay (z-50). Use the `cmdk` package.

```jsx
import { Command } from 'cmdk';
```

If cmdk gives trouble, fall back to a simple div + input + filtered list (like the HTML prototype does). The behavior is: overlay with search input, filtered list of 10 commands, click executes action via empireStore.

Keyboard: `Ctrl+K` / `Cmd+K` opens. `Escape` closes. Wire via `useEffect` on window keydown in App.jsx or here.

---

### 8. `src/components/empire/PackOverlay.jsx`

Full-screen overlay (z-50). Two states:
- **Sealed:** Gold-bordered card with "Q" logo, "TAP TO REVEAL"
- **Revealed:** 3 cards animate in with staggered fadeIn animation

Card data from `empireStore.openPack()`.

---

### 9. `src/components/ticker/EmpireTicker.jsx`

Same position/styling pattern as Glass's `TelemetryTicker.jsx`:
- `absolute bottom-0 left-0 right-0 h-10 z-10`
- `bg-tactical-bg/95 border-t border-tactical-border/50 backdrop-blur`
- Monospace text, `ticker-text` utility class

But reads from `empireStore.ticker[]` instead of MSS events. Scrolling animation via CSS `@keyframes scroll`.

Color map: fx=cyan, crypto=purple, commodity=amber, intel=green, alert=red, crime=amber, board=purple.

---

### 10. `src/components/ai/MavenPanel.jsx`

**Copy verbatim from `apps/glass/src/components/ai/MavenPanel.jsx`.** The Maven AI panel works the same way in Empire. Only the content of its recommendations changes (which will be dynamic later from LangGraph). For now the static mock recommendations from the HTML prototype are fine.

---

### 11. `src/components/layout/Shell.jsx`

**Copy verbatim from `apps/glass/src/components/layout/Shell.jsx`.** No changes needed.

---

## TAILWIND EXTENSION

In `apps/empire/tailwind.config.js`, start from a copy of Glass's config and add empire colors:

```js
colors: {
  tactical: {
    // Same as Glass
    bg: '#0A0C10',
    panel: 'rgba(10, 12, 16, 0.85)',
    border: '#1E2532',
    text: '#C0CAF5',
    accent: '#00F0FF',
    alert: '#FF3366',
    warning: '#FFCC00',
    success: '#00FF66'
  },
  empire: {
    player: '#10b981',
    market: '#ef4444',
    rival: '#f59e0b',
    finance: '#00e5ff',
    tech: '#7c3aed',
    oil: '#f59e0b',
    mfg: '#6366f1',
    energy: '#10b981',
    pharma: '#ec4899',
    venue: '#a78bfa',
  }
}
```

---

## WHAT NOT TO TOUCH

- `apps/glass/` — do NOT modify ANY file in Glass. Empire is a separate app.
- `services/api/` — no backend changes in this phase
- `packages/` — no shared package changes needed

---

## FILE CREATION ORDER

Execute in this order — each step should compile clean before the next:

1. Scaffold `apps/empire/` directory with `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.jsx`
2. Copy `Shell.jsx`, `MavenPanel.jsx`, `index.css` from Glass
3. Create `src/data/seed.ts` — all mock data
4. Create `src/store/empireStore.ts` — full typed store with seed data
5. Create `src/components/map/MapViewer.jsx` — forked from Glass, empire layers
6. Create `src/components/empire/EmpireLeftRail.jsx` + sub-components (WalletCard, AxisBar, DeptCard, AssetCard, MarketCard)
7. Create `src/components/empire/EmpireNodeDetail.jsx`
8. Create `src/components/ticker/EmpireTicker.jsx`
9. Create `src/components/empire/CommandTerminal.jsx`
10. Create `src/components/empire/PackOverlay.jsx`
11. Create `src/App.jsx` — wire everything together
12. Run `cd apps/empire && npm install && npm run dev`

---

## TESTING

After all files are created:

```bash
cd apps/empire && npm run dev
```

1. App loads with CARTO Dark Matter world map, empire nodes visible as colored dots
2. Left rail floats with rounded corners — wallets, axes, 4 tabs all functional
3. Click a player node → map flies to it, right panel opens with level/income/cards
4. Click a market node → right panel shows CAPEX/OPEX, Build/Buy buttons
5. Click a rival node → right panel shows REDACTED + Cyber-Strike button
6. ✕ button closes right panel
7. Ctrl+K → command terminal overlay, search works, commands trigger actions
8. Click OPEN PACK → pack overlay, tap reveals 3 cards with staggered animation
9. Click MAVEN AI → Maven panel opens with mock recommendations
10. ROUTES toggle → ArcLayer trade routes appear on map
11. Ticker scrolls at bottom with empire events
12. Left rail toggle button collapses/expands the floating panel
13. Escape closes all overlays
14. No console errors

Also verify Glass still works independently:

```bash
cd apps/glass && npm run dev
```

Should be completely unaffected.

---

## VISUAL REFERENCE

The approved prototype is at `AEGIS_EMPIRE_UI_MVP.html` in the repo root. Open it in a browser to see exact:
- Color values for all elements
- Spacing and sizing
- Hover states and transitions
- Animation timing (pack reveal, ticker scroll, glow pulse on nodes)
- Command terminal behavior
- Panel open/close patterns
- Floating left rail appearance (rounded, shadowed, offset from edges)

**Match the prototype visually.** Use Tailwind where possible, inline styles where Tailwind lacks granularity (e.g., hex alpha like `#7c3aed15`).
