# Security & Code Audit Report -- AEGIS Empire App

**Audit Date:** 2026-04-05
**Audited By:** Claude Opus 4.6 (automated audit)
**Scope:** NFT Agent Card System, Card Economy, Empire Store, Netlify Functions, Auth, Cloud Sync, Build Config, Dependencies

---

## Executive Summary

The empire app is a single-player-first gamified financial simulation with optional cloud sync via Supabase. The codebase is architecturally sound for an alpha-stage product, but has several **critical** and **high** severity findings that must be addressed before any public or multiplayer launch. The most serious issues are: (1) all game economy logic runs client-side with no server validation, making every balance, card, and NFT trivially manipulable via browser devtools; (2) the Netlify serverless functions pass unsanitized user input directly to the Anthropic API; (3) XSS vulnerabilities exist in the curriculum reader via `dangerouslySetInnerHTML`; and (4) race conditions exist in the agent card minting/pack-opening paths.

**Finding Summary:**
- Critical: 5
- High: 9
- Medium: 12
- Low: 8
- Info: 4

---

## 1. Security Audit

### FINDING SEC-01: Client-Side Economy -- Total Trust Architecture
- **Severity:** Critical
- **Location:** `src/store/empireStore.ts`, `src/store/agentCardStore.ts`, `src/store/cardEconomyStore.ts` (all stores)
- **Description:** All game economy state (balances, cards, NFTs, Q-Coins) lives in Zustand stores persisted to `localStorage`. There is zero server-side validation of any economic action. A user can open browser devtools and directly call store actions or modify localStorage to give themselves unlimited money, cards, or NFTs.
- **Impact:** Any player can: set `personalBalance` or `companyBalance` to any value, mint unlimited agent cards bypassing supply caps, grant themselves unlimited Q-Coins, manipulate pity counters, forge marketplace listings, and bypass all cooldowns.
- **Recommendation:** For single-player this is acceptable as a design choice (the player only cheats themselves). For any competitive/multiplayer/leaderboard feature, critical economic actions (minting, purchases, trades, balance changes) MUST be validated server-side. At minimum, implement a checksum/signature on the cloud-synced `game_state` to detect tampering.
- **Example:**
```javascript
// In browser console, any player can do:
const store = useEmpireStore.getState();
useEmpireStore.setState({ companyBalance: 999_999_999_999 });
// Or for agent cards:
useAgentCardStore.setState({ pityCounter: 120 }); // Force mythic on next pull
```

### FINDING SEC-02: XSS via dangerouslySetInnerHTML in TextbookReader
- **Severity:** Critical
- **Location:** `src/components/curriculum/TextbookReader.jsx:24,51,126`
- **Description:** The TextbookReader component renders content blocks using `dangerouslySetInnerHTML={{ __html: block.content }}`. If any curriculum content comes from user input or the database (cloud-synced state, future UGC features), this is a direct XSS vector.
- **Impact:** Arbitrary JavaScript execution in the user's browser. Could steal auth tokens, exfiltrate game state, or redirect to malicious sites.
- **Recommendation:** Replace `dangerouslySetInnerHTML` with a sanitization library (DOMPurify) or use React's native text rendering. If HTML formatting is needed, parse the content into safe React elements.
- **Example:**
```jsx
// Current vulnerable pattern:
<p dangerouslySetInnerHTML={{ __html: block.content }} />

// Safe alternative:
import DOMPurify from 'dompurify';
<p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }} />
```

### FINDING SEC-03: No Input Validation on Netlify Function Payloads
- **Severity:** Critical
- **Location:** `netlify/functions/maven-chat.mjs:17-29`, `netlify/functions/maven-brief.mjs:17-29`
- **Description:** Both MAVEN API proxy functions accept arbitrary JSON from the client and forward `body.system` and `body.messages` directly to the Anthropic API with no validation. An attacker can:
  1. Send arbitrarily large payloads (no size limit) to burn API credits.
  2. Override the system prompt to make the AI do anything.
  3. Pass `max_tokens: 999999` to maximize API cost per request (maven-chat only caps at `body.max_tokens || 1024`, but the user controls `body.max_tokens`).
- **Impact:** API credit exhaustion, prompt injection, potential data exfiltration if the AI is instructed to include sensitive context.
- **Recommendation:**
  1. Validate and cap `max_tokens` server-side (e.g., max 2048).
  2. Hardcode or whitelist the `system` prompt on the server -- never accept it from the client.
  3. Validate `messages` array structure (must be `{role: 'user'|'assistant', content: string}`).
  4. Add rate limiting per IP or per session.
  5. Add request body size limits.
- **Example:**
```javascript
// Current: trusts client completely
body: JSON.stringify({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: body.max_tokens || 1024,  // attacker sends 100000
  system: body.system,                   // attacker overrides system prompt
  messages: body.messages,               // no structure validation
}),
```

### FINDING SEC-04: Supabase Anon Key Exposed in Client Bundle
- **Severity:** Medium
- **Location:** `src/lib/supabase.ts:4-5`, `.env.example:3`
- **Description:** The Supabase anon key (`VITE_SUPABASE_ANON_KEY`) is embedded in the client JavaScript bundle. This is standard Supabase architecture (the anon key is designed to be public), but it means RLS policies are the ONLY barrier to unauthorized data access. The `.env.example` also mentions `VITE_ANTHROPIC_API_KEY` which would be catastrophic if actually exposed client-side (this appears to be a documentation error -- the actual key is loaded server-side in `vite.config.js`).
- **Impact:** If RLS policies have gaps, any user can read/write data belonging to other users. The anon key itself is not a vulnerability -- the RLS policies are the real security boundary.
- **Recommendation:** Remove `VITE_ANTHROPIC_API_KEY` from `.env.example` to avoid confusion. Audit RLS policies regularly (see SEC-05). Confirm that `ANTHROPIC_API_KEY` is never prefixed with `VITE_` in production.

### FINDING SEC-05: SECURITY DEFINER Functions Without User Validation
- **Severity:** High
- **Location:** `supabase/migrations/20260405060001_living_world_foundation.sql:135-147,150-159`
- **Description:** The `purchase_world_node` and `boost_route_traffic` RPC functions use `SECURITY DEFINER`, bypassing RLS. `purchase_world_node` accepts `p_user_id` as a parameter -- an attacker can call this function with any `p_user_id` to impersonate another user's investment action. `boost_route_traffic` has no user validation at all.
- **Impact:** Users can forge investment records under other users' IDs. Route traffic scores can be inflated without limits.
- **Recommendation:**
  1. In `purchase_world_node`, replace `p_user_id` parameter with `auth.uid()` inside the function body.
  2. In `boost_route_traffic`, add validation: check that `auth.uid()` is not null, and optionally limit boost frequency.
  3. Add rate limiting at the application level.
- **Example:**
```sql
-- Vulnerable: accepts user_id from client
CREATE OR REPLACE FUNCTION purchase_world_node(p_node_id UUID, p_user_id UUID)
-- Fix: use auth.uid() instead
CREATE OR REPLACE FUNCTION purchase_world_node(p_node_id UUID)
...
  INSERT INTO player_actions (user_id, ...) VALUES (auth.uid(), ...);
```

### FINDING SEC-06: No Rate Limiting on Netlify Functions
- **Severity:** High
- **Location:** `netlify/functions/maven-chat.mjs`, `netlify/functions/maven-brief.mjs`
- **Description:** The MAVEN AI proxy functions have no rate limiting, authentication, or session validation. Any client (not just authenticated app users) can call these endpoints repeatedly.
- **Impact:** API credit exhaustion. An attacker could script thousands of requests and rack up significant Anthropic API bills.
- **Recommendation:** Add authentication (check Supabase JWT), add per-user rate limiting (e.g., via Netlify Edge Functions or a Redis-backed counter), and add per-request cost tracking.

### FINDING SEC-07: Vite Dev Server Reads .env From Parent Directory
- **Severity:** Medium
- **Location:** `vite.config.js:8-18`
- **Description:** The Vite config reads `../../.env` to find `ANTHROPIC_API_KEY`. This is a dev-only path, but if the project is deployed with a `.env` file at a parent path, secrets could be exposed. The error is silently caught.
- **Impact:** Low in production (Netlify uses env vars, not files). Risk is limited to development environments.
- **Recommendation:** Document this behavior. Ensure the `.env` file at `../../` is in `.gitignore` at the monorepo root.

### FINDING SEC-08: No CORS Headers on Netlify Functions
- **Severity:** Medium
- **Location:** `netlify/functions/maven-chat.mjs`, `netlify/functions/maven-brief.mjs`
- **Description:** The Netlify functions do not set CORS headers. Netlify adds default CORS headers, but explicit configuration would be more secure.
- **Impact:** Without explicit CORS, the functions may be callable from any origin. Combined with no auth (SEC-06), this means any website can proxy through your AI functions.
- **Recommendation:** Add explicit CORS headers restricting to your domain, or add Netlify CORS configuration.

### FINDING SEC-09: No Authentication Check on World Functions
- **Severity:** High
- **Location:** `netlify/functions/world-tick.mjs`, `netlify/functions/generate-world-events.mjs`, `netlify/functions/world-trending.mjs`
- **Description:** These functions use `SUPABASE_SERVICE_ROLE_KEY` (full admin access). They are scheduled functions and should only run on the cron schedule, but if the endpoints are accessible via HTTP, anyone could trigger them.
- **Impact:** Unauthorized triggering could: decay all route traffic, archive events prematurely, purge player actions, or generate fake world events.
- **Recommendation:** Netlify scheduled functions are typically not HTTP-accessible, but verify this configuration. Add an auth check (e.g., secret header) as defense-in-depth.

---

## 2. Economy Audit

### FINDING ECON-01: Balance Manipulation via Client-Side State
- **Severity:** Critical (see SEC-01)
- **Location:** `src/store/empireStore.ts`, all balance-modifying actions
- **Description:** Covered in SEC-01. All balance checks are client-side only. The `loadCloudState` action at line 770 will merge ANY object keys into the store state, effectively allowing cloud state injection to overwrite balances.
- **Impact:** Infinite money, bypassed purchase requirements, forged net worth.

### FINDING ECON-02: Pity System Logic Error -- Ordering Bug
- **Severity:** High
- **Location:** `src/store/agentCardStore.ts:77-79`
- **Description:** The pity checks are in the wrong order. Line 78 checks `pityCounter >= 80` and returns `'Legendary'`, but line 79 checks `pityCounter >= 120` for `'Mythic'`. Since 120 >= 80 is true, the Mythic check on line 79 is UNREACHABLE -- the function always returns `'Legendary'` at pity 80+, and NEVER returns `'Mythic'` via hard pity.
- **Impact:** The Mythic hard pity guarantee at 120 packs is broken. Players can never receive a guaranteed Mythic through the pity system. Mythic cards can only be obtained through the weighted RNG (3% base weight + soft pity bonus).
- **Recommendation:** Swap the order of checks so `>= 120` (Mythic) is checked BEFORE `>= 80` (Legendary).
- **Example:**
```typescript
// Current (broken):
if (pityCounter >= 80) return 'Legendary';   // always triggers first
if (pityCounter >= 120) return 'Mythic';      // UNREACHABLE

// Fixed:
if (pityCounter >= 120) return 'Mythic';      // check higher threshold first
if (pityCounter >= 80) return 'Legendary';
```

### FINDING ECON-03: Pack Opening Does Not Deduct Q-Coins in agentCardStore
- **Severity:** High
- **Location:** `src/store/agentCardStore.ts:160-207`
- **Description:** The `openAgentPack` function checks `qCoins < pack.cost` but does NOT deduct Q-Coins from any balance. It returns `{ minted, cost: pack.cost }` but the actual Q-Coin deduction must happen in the calling code. If the caller forgets to deduct, packs are free.
- **Impact:** Depends on the UI code that calls this function. If the UI does not separately call `cardEconomyStore.spendQCoins(cost)`, players get free packs.
- **Recommendation:** Either deduct Q-Coins within the `openAgentPack` function itself, or clearly document the contract that the caller must deduct. Better yet, integrate with `cardEconomyStore` directly.

### FINDING ECON-04: Q-Coins Bonus RNG Could Be Exploited
- **Severity:** Low
- **Location:** `src/store/cardEconomyStore.ts:112-126`
- **Description:** The `awardQCoins` function has a random multiplier (15% chance 2x, 5% chance 4x). Since this is client-side, a player could call `awardQCoins(1000000, 'exploit')` and retry until they get the 4x multiplier.
- **Impact:** Only relevant in single-player context. The multiplier mechanic is a fun gacha-style feature. In multiplayer, this becomes an exploit vector.

### FINDING ECON-05: No Maximum Price Validation on Market Listings
- **Severity:** Medium
- **Location:** `src/store/agentCardStore.ts:347-363`, `src/store/cardEconomyStore.ts:217-236`
- **Description:** Both `listAgent` and `listOnMarketplace` accept any `price` value. A player can list a Common card for 999,999,999 Q-Coins. In a multiplayer marketplace, this could be used for money laundering between accounts, or to manipulate market price history.
- **Impact:** Market price manipulation, potential money laundering between accounts.
- **Recommendation:** Add min/max price bounds relative to the card's rarity quick-sell value. For example, listing price must be between 50% and 500% of the rarity's `quickSellValue`.

### FINDING ECON-06: Quick Sell Value Exploit via Level Grinding
- **Severity:** Low
- **Location:** `src/store/agentCardStore.ts:399-415`
- **Description:** Quick sell value scales with level: `quickSellValue * (1 + (level - 1) * 0.2)`. A Mythic card at level 12 would sell for `5000 * (1 + 11 * 0.2) = 5000 * 3.2 = 16,000 Q-Coins`. Combined with passive XP gain from deployment (5+level per tick), agents level up automatically and increase in sell value. This is likely intentional game design but creates an inflation vector.
- **Impact:** Mild Q-Coin inflation over time. Acceptable for single-player.

### FINDING ECON-07: Fund Yield Can Create Negative Staked Amounts
- **Severity:** Medium
- **Location:** `src/store/empireStore.ts:1414-1427`
- **Description:** Fund yields can be negative: `-fund.stakedAmount * (fund.targetYield / 100) * 0.5`. If losses accumulate, `stakedAmount` could go negative. There is no floor check.
- **Impact:** Negative staked amounts would produce negative yields, which then become positive (double negative), creating free money.
- **Recommendation:** Add `Math.max(0, fund.stakedAmount + yieldAmt)` to prevent negative staked amounts.
- **Example:**
```typescript
// Current:
return { ...fund, stakedAmount: fund.stakedAmount + yieldAmt };
// Fix:
return { ...fund, stakedAmount: Math.max(0, fund.stakedAmount + yieldAmt) };
```

### FINDING ECON-08: Supply Cap Only Enforced Client-Side
- **Severity:** High
- **Location:** `src/store/agentCardStore.ts:130-131`
- **Description:** The `maxSupply` check (`if (currentEdition >= def.maxSupply) return null`) only runs client-side. In a multiplayer context, two players could mint the "last" edition simultaneously, exceeding the supply cap.
- **Impact:** In single-player, not an issue. In multiplayer, supply cap can be violated.

---

## 3. NFT Integrity Audit

### FINDING NFT-01: Token ID Not Globally Unique
- **Severity:** Medium
- **Location:** `src/data/agentCards.ts:1935-1939`
- **Description:** `generateMintId` uses `Date.now().toString(36)` plus 4 random chars. In theory, two mints in the same millisecond with the same random suffix could collide. The probability is very low (~1 in 1.7M per same-ms collision), but not zero.
- **Impact:** Duplicate mintIds would cause one agent to overwrite another in the `agents` record.
- **Recommendation:** Use `crypto.randomUUID()` for guaranteed uniqueness, or add a counter component.
- **Example:**
```typescript
// Current:
export function generateMintId(agentId: string, edition: number): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${agentId}-${edition.toString().padStart(4, '0')}-${ts}${rand}`;
}

// Recommended:
export function generateMintId(agentId: string, edition: number): string {
  return `${agentId}-${edition.toString().padStart(4, '0')}-${crypto.randomUUID()}`;
}
```

### FINDING NFT-02: Edition Counter Not Atomic (Race Condition)
- **Severity:** High
- **Location:** `src/store/agentCardStore.ts:125-157`
- **Description:** The `mintAgent` function reads the current edition counter via `get()`, then increments it in a separate `set()` call. In a multi-tab or concurrent scenario, two calls to `mintAgent` for the same cardId could read the SAME edition number before either write completes, producing two agents with the same edition number.
- **Impact:** Duplicate edition numbers, violating NFT uniqueness invariant.
- **Recommendation:** Use Zustand's `set(state => ...)` callback pattern to read-and-write atomically. Currently the function uses `get()` to read and `set(s => ...)` to write, creating a TOCTOU gap.

### FINDING NFT-03: Metadata is Mutable Post-Mint
- **Severity:** Medium
- **Location:** `src/store/agentCardStore.ts:283-309`
- **Description:** Agent metadata (level, XP, missions, deployment status) is freely mutable after minting. While this is expected for game progression, there is no audit trail or versioning. The `isLocked` flag prevents selling but not stat modification.
- **Impact:** In a multiplayer context, players could manipulate agent stats. For single-player, this is by design.

### FINDING NFT-04: buyAgent Does Not Transfer Ownership or Deduct Balance
- **Severity:** High
- **Location:** `src/store/agentCardStore.ts:365-383`
- **Description:** The `buyAgent` function removes the listing and unlocks the agent, but does NOT: (a) deduct Q-Coins from the buyer, or (b) credit Q-Coins to the seller. The comment says "in multiplayer, would change user_id" -- this means the marketplace is non-functional for actual trading. Calling `buyAgent` gives you an agent for free.
- **Impact:** Free agents from the marketplace. The marketplace is essentially decorative.
- **Recommendation:** Integrate Q-Coin deduction via `cardEconomyStore.spendQCoins(listing.price)` within `buyAgent`, and credit the seller.

### FINDING NFT-05: Cross-Store Inconsistency Between agentCardStore and cardEconomyStore
- **Severity:** Medium
- **Location:** `src/store/agentCardStore.ts`, `src/store/cardEconomyStore.ts`
- **Description:** There are two separate card/NFT systems: `agentCardStore` (NFT-style agent cards with mint IDs, editions, deployment) and `cardEconomyStore` (simpler count-based employee cards with Q-Coins economy). They operate independently with different persistence keys (`aegis-agent-cards-v1` vs `empire-card-economy`). The Q-Coins in `cardEconomyStore` are separate from any currency in `agentCardStore`.
- **Impact:** Confusing dual-economy. Agent packs check Q-Coins but don't deduct them (ECON-03). The two systems could diverge or conflict.
- **Recommendation:** Unify the Q-Coin economy. Either have `agentCardStore` reference `cardEconomyStore` for Q-Coin operations, or merge the stores.

---

## 4. Code Quality Audit

### FINDING CQ-01: Module-Level Mutable State in agentEngine.ts
- **Severity:** Medium
- **Location:** `src/lib/agentEngine.ts:43`
- **Description:** `let activeEffects: AgentEffect[] = []` is module-level mutable state outside of any store. This state is not persisted, not synced to cloud, and will be lost on page refresh. It also cannot be used by React components for reactivity (no subscription mechanism).
- **Impact:** Active ability effects disappear on page refresh. UI components cannot reactively display current effects without polling.
- **Recommendation:** Move `activeEffects` into a Zustand store, or into the existing `agentCardStore`.

### FINDING CQ-02: Memory Leak in Telemetry Event Listeners
- **Severity:** Medium
- **Location:** `src/lib/telemetry.ts:73-76`
- **Description:** `initTelemetry` adds `window.addEventListener('online'/'offline'/'beforeunload', ...)` but never removes them. If `initTelemetry` is called multiple times (e.g., on re-login), listeners accumulate.
- **Impact:** Multiple flush handlers, potential double-flushing, minor memory leak.
- **Recommendation:** Store listener references and remove them in `endTelemetry`, or guard against double initialization.

### FINDING CQ-03: Memory Leak in livingWorldSync Subscriptions
- **Severity:** Medium
- **Location:** `src/lib/livingWorldSync.ts:191-264`
- **Description:** Supabase Realtime channels (`nodesChannel`, `eventsChannel`, `routesChannel`) are created on first subscription and only cleaned up when ALL listeners are removed. If a component subscribes, unsubscribes, and a different component is still subscribed, the channels persist. This is correct behavior, but the `listeners` array itself grows if `subscribeToWorld` is called without the cleanup function being invoked (e.g., in a useEffect without return).
- **Impact:** Potential memory leak if React components don't properly clean up subscriptions.

### FINDING CQ-04: TypeScript Type Safety Gaps
- **Severity:** Low
- **Location:** Multiple files
- **Description:**
  1. `src/store/empireStore.ts:670` uses `[] as any[]` for routes initialization.
  2. `src/store/empireStore.ts:758` uses `{} as Record<string, any>` for portfolio.
  3. `src/store/agentCardStore.ts:81` uses `{} as any` for weights record.
  4. `src/store/empireStore.ts:902` uses `'system' as const` but the TickerEvent type doesn't include `'system'` -- it allows `'fx' | 'crypto' | 'commodity' | 'intel' | 'alert' | 'crime' | 'board' | 'trade'`.
- **Impact:** Type errors suppressed, potential runtime bugs from type mismatches.

### FINDING CQ-05: Hardcoded Telemetry Endpoint
- **Severity:** Low
- **Location:** `src/store/empireStore.ts:1766-1769`
- **Description:** `buyAsset` makes a fire-and-forget fetch to `http://localhost:8081/api/v1/telemetry/ingest`. This is a hardcoded localhost URL that will fail silently in production.
- **Impact:** Dead code in production. Could leak action data in development if another service runs on port 8081.
- **Recommendation:** Remove or make configurable via environment variable.

### FINDING CQ-06: XP Level-Up Only Processes One Level at a Time
- **Severity:** Low
- **Location:** `src/store/agentCardStore.ts:283-309`
- **Description:** The `addXP` function checks if the new XP exceeds the threshold for the current level and levels up once. If a large XP award exceeds multiple level thresholds, only one level-up occurs per call. The excess XP carries over, but the agent won't reach the correct level until `addXP` is called again.
- **Impact:** Delayed leveling if large XP amounts are awarded. Minor gameplay impact since XP is awarded incrementally per tick.

### FINDING CQ-07: processAgentTick Mutates Existing Effect Objects
- **Severity:** Medium
- **Location:** `src/lib/agentEngine.ts:241-243`
- **Description:** The code mutates existing objects in the `activeEffects` array directly: `existingPassive.expiresAtTick = currentTick + 2; existingPassive.value = passiveValue;`. This is technically fine since `activeEffects` is module-level mutable state, but it violates immutability patterns used elsewhere in the codebase.
- **Impact:** Could cause subtle bugs if effects are referenced elsewhere and assumed immutable.

### FINDING CQ-08: Dead Code -- `setBuildings` Referenced But Not Defined
- **Severity:** Info
- **Location:** `src/lib/cloudSync.ts:92`
- **Description:** `stripNonSerializable` lists `'setBuildings'` in skip keys, but there is no `setBuildings` action in the empire store. This appears to be a remnant from earlier code.
- **Impact:** None -- it's just a string in a skip list. Harmless dead reference.

---

## 5. Data Integrity Audit

### FINDING DI-01: localStorage Size Limits
- **Severity:** Medium
- **Location:** `src/store/empireStore.ts` (persist middleware), `src/store/agentCardStore.ts` (persist middleware), `src/store/cardEconomyStore.ts` (persist middleware)
- **Description:** Three separate Zustand stores persist to localStorage with keys `quantico-empire-storage-v8`, `aegis-agent-cards-v1`, and `empire-card-economy`. The empire store is very large (full node map, all projects, funds, routes, ticker history, etc.). localStorage has a ~5-10MB limit per origin. As the game progresses, especially with many agent cards and social posts, the combined state could approach this limit.
- **Impact:** Silent data loss when localStorage quota is exceeded. Zustand's persist middleware catches the error but the state is not saved.
- **Recommendation:** Implement size monitoring and pruning (e.g., limit ticker history, archive old social posts, compress state before persisting).

### FINDING DI-02: No State Migration Strategy
- **Severity:** Medium
- **Location:** `src/store/empireStore.ts` (persist config), `src/store/agentCardStore.ts` (persist config)
- **Description:** The empire store uses persistence key `quantico-empire-storage-v8` (implying 8 prior versions) but has no Zustand `migrate` function defined. The `cardEconomyStore` has `version: 1` but also no `migrate` function. If the state schema changes in a future update, existing localStorage data will either break or be silently ignored.
- **Impact:** Schema changes could corrupt player saves or reset progress.
- **Recommendation:** Implement Zustand's `migrate` function for each persisted store to handle schema evolution gracefully.

### FINDING DI-03: Cloud Sync Has No Conflict Resolution
- **Severity:** High
- **Location:** `src/lib/cloudSync.ts:42-62`
- **Description:** The `saveGameState` function does a simple `UPDATE` to Supabase with the full game state. The `loadGameState` does a simple `SELECT`. There is no version counter, last-modified timestamp comparison, or conflict resolution. If a player plays on two devices:
  1. Device A saves state at T1
  2. Device B (which loaded state before T1) saves state at T2
  3. Device A's progress between T0 and T1 is permanently lost
- **Impact:** Data loss in multi-device scenarios.
- **Recommendation:** Add a `version` counter or `updated_at` timestamp. On save, compare versions. On conflict, either pick the newer state, merge, or prompt the user.

### FINDING DI-04: No Backup or Recovery Mechanism
- **Severity:** Low
- **Location:** General architecture
- **Description:** There is no way to export, import, or roll back game state. If localStorage is cleared or cloud state is corrupted, all progress is lost.
- **Recommendation:** Add an export/import JSON feature. Consider periodic cloud snapshots.

---

## 6. Dependency Audit

### FINDING DEP-01: Dependency Review
- **Severity:** Info
- **Location:** `package.json`
- **Description:** Notable dependencies:
  - `bad-words@4.0.0` -- Used for profanity filtering in venture names. Good.
  - `@supabase/supabase-js@^2.101.1` -- Recent version, well-maintained.
  - `zustand@^5.0.12` -- Recent version, well-maintained.
  - `react@^19.2.4` -- Very recent React 19, stable.
  - `typescript@^6.0.2` -- TypeScript 6.x (recent).
  - `googlethis@^1.8.0` -- Web scraping library. Unusual dependency for a game app. Could be a security/legal concern if used to scrape content.
  - `@capacitor/*` -- Mobile app framework. Standard.
  - `sharp@^0.34.5` -- Image processing (dev dependency). Standard.
- **Impact:** No known critical vulnerabilities in the listed versions as of this audit date. Run `npm audit` for the latest advisory check.

### FINDING DEP-02: `googlethis` Dependency
- **Severity:** Low
- **Location:** `package.json:33`
- **Description:** The `googlethis` library is a Google scraping tool. It's unclear where this is used in the app. If it's used to fetch real-world data for the game, it could violate Google's ToS and may break unpredictably.
- **Recommendation:** Audit usage. If unused, remove. If used, consider a proper API alternative.

---

## 7. Additional Findings

### FINDING ADD-01: processTick Salary Double-Counted
- **Severity:** Medium
- **Location:** `src/store/empireStore.ts:1613,1668`
- **Description:** Line 1613 adds `salaryPaid` to `finalBalance` (company balance). Line 1668 ALSO adds `salaryPaid` to `personalBalance`. This means the CEO salary is paid FROM the company AND also gifted TO the personal account -- the money is created from nothing. The company balance should be DEDUCTED by `salaryPaid`, not increased.
- **Impact:** Free money generation each tick. Players get salary credited to personal balance without it being deducted from company balance.
- **Recommendation:** Change line 1613 to: `const finalBalance = newBalance + Math.round(fundYieldTotal) - fineDeduction - salaryPaid;` (subtract, not add).
- **Example:**
```typescript
// Current (line 1613):
const finalBalance = newBalance + Math.round(fundYieldTotal) - fineDeduction + salaryPaid;
// Should be:
const finalBalance = newBalance + Math.round(fundYieldTotal) - fineDeduction - salaryPaid;
```

### FINDING ADD-02: No Input Sanitization on purchaseNamingRights
- **Severity:** Medium
- **Location:** `src/store/empireStore.ts:1132`
- **Description:** `purchaseNamingRights(nodeId, newName)` accepts any string as `newName` with no length validation, profanity filter, or XSS sanitization. This name gets stored in state and rendered in the UI.
- **Impact:** Potential XSS if rendered unsafely, inappropriate content in shared/multiplayer context.
- **Recommendation:** Add length limits, profanity filtering (reuse the `bad-words` library already in the project), and sanitization.

### FINDING ADD-03: socialPublishPost No Content Validation
- **Severity:** Low
- **Location:** `src/store/empireStore.ts:979-983`
- **Description:** `socialPublishPost(text)` accepts any string with no length limit, no profanity filter, and no sanitization.
- **Impact:** Same as ADD-02 but for social content.

---

## 8. Recommendations Summary

### Critical (Must Fix Before Launch)

| ID | Finding | Effort |
|----|---------|--------|
| SEC-03 | Validate and sanitize Netlify function inputs | 2-4 hours |
| ECON-02 | Fix pity system ordering bug (Mythic unreachable) | 5 minutes |
| SEC-02 | Sanitize dangerouslySetInnerHTML with DOMPurify | 1-2 hours |
| NFT-04 | Implement actual Q-Coin deduction in buyAgent | 1-2 hours |
| ADD-01 | Fix salary double-counting in processTick | 5 minutes |

### High Priority (Should Fix Soon)

| ID | Finding | Effort |
|----|---------|--------|
| SEC-05 | Fix SECURITY DEFINER functions to use auth.uid() | 1 hour |
| SEC-06 | Add rate limiting to Netlify functions | 2-4 hours |
| SEC-09 | Verify scheduled functions are not HTTP-accessible | 30 minutes |
| ECON-03 | Ensure pack opening deducts Q-Coins properly | 1-2 hours |
| ECON-08 | Server-side supply cap enforcement (for multiplayer) | 4-8 hours |
| NFT-02 | Fix edition counter race condition (use atomic set) | 1 hour |
| DI-03 | Implement cloud sync conflict resolution | 4-8 hours |

### Medium Priority (Next Sprint)

| ID | Finding | Effort |
|----|---------|--------|
| SEC-04 | Remove VITE_ANTHROPIC_API_KEY from .env.example | 5 minutes |
| SEC-07 | Document parent-dir .env reading behavior | 15 minutes |
| SEC-08 | Add explicit CORS headers to Netlify functions | 30 minutes |
| ECON-05 | Add min/max price bounds on marketplace listings | 1 hour |
| ECON-07 | Prevent negative fund staked amounts | 15 minutes |
| NFT-01 | Use crypto.randomUUID() for mint IDs | 15 minutes |
| NFT-05 | Unify agent card and card economy Q-Coin systems | 4-8 hours |
| CQ-01 | Move activeEffects into a Zustand store | 2-3 hours |
| CQ-02 | Fix telemetry event listener leak | 30 minutes |
| CQ-07 | Make effect mutations immutable | 1 hour |
| DI-01 | Add localStorage size monitoring | 2 hours |
| DI-02 | Implement Zustand state migration functions | 2-4 hours |
| ADD-02 | Add input validation on naming rights | 30 minutes |

### Low Priority (Nice to Have)

| ID | Finding | Effort |
|----|---------|--------|
| ECON-04 | Server-validate Q-Coin awards (multiplayer only) | 4 hours |
| ECON-06 | Cap quick-sell value scaling | 15 minutes |
| CQ-04 | Fix TypeScript type safety gaps | 2 hours |
| CQ-05 | Remove hardcoded localhost telemetry URL | 5 minutes |
| CQ-06 | Handle multi-level XP jumps in addXP | 30 minutes |
| DEP-02 | Audit/remove googlethis dependency | 30 minutes |
| DI-04 | Add state export/import feature | 2-4 hours |
| ADD-03 | Add content validation on social posts | 30 minutes |

---

## 9. Architecture Notes

**Positive findings worth preserving:**
1. Good use of Zustand's `persist` middleware for state management.
2. Proper use of Supabase RLS with well-structured policies.
3. Good separation of concerns between stores (empire, agent cards, card economy, auth).
4. Profanity filtering on venture names is a good practice.
5. The `bad-words` library integration in `VentureFounderPanel.jsx` is well-done.
6. Proper auth flow using Supabase auth with session management.
7. Telemetry batching with offline buffer is well-engineered.
8. Database schema has appropriate CHECK constraints and indexes.
9. Cloud sync stripping of functions and transient state is correct.
10. The event bridge pattern for inter-module communication is clean.

---

*End of audit report. Total findings: 38 across 5 categories.*
