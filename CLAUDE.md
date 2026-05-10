# CLAUDE.md — guidance for Claude Code working on Hora

## What this repo is

A mobile-first finance-themed strategy game. Clash-of-Clans-style. **Not** an educational product.

Bootstrapped from AEGIS Empire (Apr 2026 snapshot) but pivoting in audience, mechanics, and visual identity. Read `HORA.md`, `docs/GAME_DESIGN.md`, and `docs/VISUAL_DIRECTION.md` end-to-end before any code change.

## What Hora is NOT

Do not write code that:

- References ECFL, the curriculum, the academy, or any AEGIS-specific data model. The `apps/empire/src/data/{courseContent,courseContentF456,ecflContent}.{ts,js}` modules are slated for deletion.
- References Substrate Mode, NCOE, the venture pipeline, or any of that R&D. The `apps/empire/src/substrate/` directory is slated for deletion.
- References Athena (AEGIS's advisor). Hora has the Oracle, a separate character with a different voice (chirpy/animated, not reverent).
- Uses AEGIS's visual tokens (`#00e5ff` cyan, `#060a12` navy, JetBrains Mono, Cormorant Garamond, the ritual backdrop, scanlines, film grain, light shafts).
- Reaches for "intelligence platform / CRT" aesthetic. Hora is bright/saturated/juicy — see `docs/VISUAL_DIRECTION.md`.
- Adds AEGIS's onboarding ritual or its mythological copy. Hora's intro is a 15-second mobile-game cinematic.

## What Hora IS

- **Mobile-first.** Portrait orientation. Bottom nav. Thumb-zone optimised. Push notifications. Haptics on every meaningful tap.
- **Tap-to-play.** Sessions are 90–180 seconds. The keyboard appears only at signup and in fund chat.
- **Fun-first.** Animation matters. Reward juice matters. The Oracle is your buddy.
- **No real money in-game.** Hourglass premium currency is non-fungible. No fiat path.
- **No predatory mechanics.** No concealed odds. No fake scarcity. No FOMO timers.

## Carry-overs from AEGIS

These continue as-is unless you have a reason to change them:

- Stack: React 19, Vite 6, Tailwind 3, Zustand, Capacitor 8, Tauri 2, Supabase
- Auth pattern (simplified for Hora — no ToS interstitial for Substrate, no ECFL-band gating)
- GDPR/privacy patterns
- British English (`centre`, `behaviour`, `synchronisation`, `-ise`)
- File structure under `apps/empire/src/` (slated for rename to `apps/hora/`)
- Capacitor + Tauri build configs (Hora keeps mobile + desktop targets)
- The general "atmosphere component is its own file, content is its own component, state is Zustand store" architecture

## The renaming task (open)

`apps/empire/` should become `apps/hora/`. This is a sweeping rename:

- Directory: `apps/empire/` → `apps/hora/`
- `apps/hora/package.json`: name `aegis-empire` → `hora`
- `apps/hora/index.html`: title `AEGIS — EMPIRE` → `Hora`, all `apple-mobile-web-app-title` etc.
- `apps/hora/public/manifest.json`: PWA `name`, `short_name`, `description`
- `apps/hora/capacitor.config.ts`: `appId` (already updated to `com.quadratic.hora`), `appName` (already `Hora`)
- `apps/hora/src-tauri/tauri.conf.json`: `productName`, `identifier`
- Workspace `pnpm-workspace.yaml`: already wildcards `apps/*`, no change needed
- Imports across the codebase: there shouldn't be any cross-module imports referencing `apps/empire` by absolute path (everything is relative within the app), but verify with `grep -r "apps/empire" apps/hora/`

Schedule this as the very first PR after this initial setup. It's mechanical but touches a lot of files.

## Implementation priority

Per `docs/GAME_DESIGN.md` section 12:

1. Visual style guide PR (palette + typography + Hora wordmark + Oracle mascot designs)
2. `apps/empire/` → `apps/hora/` rename PR
3. Strip AEGIS-only modules PR (substrate, ECFL, AEGIS branding components)
4. Treasury home screen PR
5. Tap-to-collect PR (with full reward juice)
6. First upgrade flow PR
7. Bot raids PR (no matchmaker yet)
8. Onboarding intro PR (15-second Oracle cinematic)
9. Push notifications PR
10. TestFlight build PR

Ship each as its own PR. Don't bundle. The visual style guide must merge first because everything visual downstream depends on it.

## Hard rules

- **British English.** No exceptions.
- **No real-money paths.** Ever.
- **No gambling mechanics.** Raids are deterministic given the matchup, not probability-based. Chest contents have visible odds (no concealed loot-box behaviour).
- **No mechanics that gate progression behind ads.** Free-tier players reach max league in ~3 months without ever paying or watching an ad.
- **Vendor-don't-modify** for any code under `apps/hora/vendored/` (currently empty; reserved for upstream patterns we adopt).
- **Mobile-first means actually mobile-first.** If something feels good on desktop and terrible on a 6.1" iPhone in one hand, it's wrong. The smaller form factor wins.
- **Haptics are not optional.** Every meaningful action uses `@capacitor/haptics`. Players who play with sound off (most do) feel the game through haptics.

## Local dev

```bash
cd apps/empire   # will become apps/hora soon
npm install
npm run dev      # vite, port 5173 by default
```

For mobile dev:
```bash
npm run cap:sync     # bundle + sync to iOS/Android shells
npm run ios:run      # opens Xcode with Hora project
npm run android:run  # opens Android Studio
```

For Tauri desktop:
```bash
npm run tauri:dev
```

## When in doubt

If a design choice could go either way:

1. Does this feel like Clash Royale / Coin Master / Royal Match? Lean in.
2. Does this feel like AEGIS or another finance platform? Pull back.
3. Does this make the player wait? Reconsider unless it's a 4-hour upgrade timer with a clear hourglass-skip option.
4. Does this educate? Surface it via the Oracle as an 8-word tooltip, never as a course or lecture.
5. Does this take real money? It must not.

---

*Updates to this file should accompany substantive direction changes. Surface disagreements before implementing.*
