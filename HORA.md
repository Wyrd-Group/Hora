# Hora

A simplified Clash-of-Clans-style finance game.

## What this repo is

A clean bootstrap from AEGIS Empire (Apr 2026 snapshot). All the AEGIS infrastructure carries over:

- React 19 + Vite + Tailwind frontend (`apps/empire/`)
- Capacitor mobile shell (iOS + Android)
- Tauri desktop shell (macOS + Windows + Linux)
- Supabase backend (auth, DB, edge functions)
- Netlify deploys
- The onboarding ritual + atmospheric design system
- Existing engines, feeds, vendored Athena-Standalone code

What's intentionally NOT carried over (yet): the AEGIS brand surface, the ECFL curriculum, Substrate Mode, and the Quadratic-Group monorepo wrappers. Those stay on the AEGIS side. Hora forks the *platform*, not the *product*.

## The product brief

Clash of Clans is a base-building / resource-extracting / army-deploying / clan-warring loop. The financial version:

| Clash of Clans | Hora |
|---|---|
| Town hall | Treasury |
| Resource buildings (gold, elixir, dark elixir) | Income streams (rent, dividends, royalties, fees) |
| Troops (barracks → archers, giants, dragons) | Operators (analysts, brokers, traders, market-makers, quants) |
| Walls + traps | Defensive positions (cash reserves, hedges, insurance) |
| Attacks on other bases | Raids — extract real-time alpha from another player's portfolio when they're offline |
| Clan wars | Fund battles — coordinated multi-player engagements over shared market events |
| Trophy ladder | League rank by alpha generation |
| Builders queue | Position queue — operators take real time to deploy |
| Upgrades cost time + resources | Operator levels cost in-game capital + cooldowns |
| Shield after defeat | Drawdown protection |
| Gems (paid currency) | Hourglass (premium currency, optional, no fiat path) |

The point: turn the "wait → defend → attack → upgrade" loop into a financial-literacy framing without the predatory monetisation.

## Audience

Same three tiers AEGIS targets, in a different priority order:

1. **General consumer freemium** — younger, mobile-first, expects a tap-to-play loop. Hora's primary audience.
2. **Students** — secondary, but the educational framing is lighter than AEGIS's ECFL standard
3. **Educators / parents** — tertiary, gated by the absence of gambling-adjacent mechanics

## Non-negotiables (carried from AEGIS)

- **No real money in-game.** All currency virtual; Hourglass is non-fungible game state. No fiat path.
- **No gambling-adjacent mechanics.** Raids must teach risk, not feel like a slot machine.
- **Educational simulation.** Nothing in Hora is financial advice.
- **GDPR by design.** Same Supabase + pseudonymous-telemetry pattern as AEGIS.
- **British English.** Consistent with the AEGIS register: `centre`, `behaviour`, `synchronisation`.

## Status

- ✅ Bootstrapped from AEGIS Empire snapshot (this commit)
- ⏳ Strip AEGIS-specific surfaces (Substrate Mode, ECFL, AEGIS branding)
- ⏳ Define Hora's core loop in code
- ⏳ Rebrand the design system (palette, sigil, tagline)
- ⏳ First playable prototype

## Stack

Unchanged from AEGIS:
- Frontend: React 19, Vite 6, Tailwind 3, Zustand, motion, Cormorant Garamond + JetBrains Mono + Inter
- Mobile: Capacitor 8 (iOS + Android)
- Desktop: Tauri 2 (mac + win + linux)
- Backend: Supabase
- Deploy: Netlify

See `apps/empire/README.md` and the various `*.md` audit docs at the root for the inherited architecture.

## Next steps

1. Decide whether to flatten the monorepo (Hora as a single-app repo) or keep the `apps/empire/` structure and rename it to `apps/hora/`.
2. Strip AEGIS-only modules: ECFL curriculum (`apps/empire/src/data/courseContent.ts`, `courseContentF456.ts`, `ecflContent.js`), Substrate Mode (`apps/empire/src/substrate/`, `apps/empire/vendored/`), and AEGIS-specific UI (the ritual onboarding stays; the wordmark goes).
3. Rebrand: new wordmark, new tagline, new palette anchor (Hora deserves its own colour story — not just AEGIS cyan).
4. Define the Hora data model: bases, operators, income streams, raids, leagues.
5. Build the first playable loop: tap-to-build, tap-to-collect, tap-to-deploy-operator, simulated-attack on a stub opponent base.

---

*Bootstrapped from [AEGIS Empire](https://github.com/Alecbdc/Aegis-empire) on 2026-04-29.*
