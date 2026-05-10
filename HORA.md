# Hora

A mobile-first finance-themed strategy game. Tap, build, raid, repeat.

**Not** a financial education product. **Not** AEGIS Empire with a different skin. Hora's job is to be fun first — financial themes are the *setting*, not the *purpose*.

## What kind of game

Think **Clash of Clans + Coin Master + Idle Tycoon**, with a financial wrapper:

- You run a base (a **treasury**) that generates income while you sleep
- You hire and level up **operators** (analysts, traders, brokers, market-makers, quants — your "troops")
- You raid other players' treasuries to steal alpha (when they're offline — asymmetric attack/defence)
- You join **funds** (clans) and run coordinated raids against rival funds
- You climb a global **league ladder** measured by alpha generation
- You spend **gold** (free) and **hourglass** (premium, optional) on upgrades
- You collect daily login chests, complete missions, ride event seasons

The financial theme is what makes the loop *feel different* from a generic clan-builder. The mechanics are pure mobile-game candy.

## Audience

**Primary:** the Clash Royale / Coin Master / Royal Match / Brawl Stars audience — 18–35, mobile-native, expects 2–5 minute sessions multiple times per day, will tolerate ads, will spend on cosmetics and time-saves.

**Secondary:** students who'd find AEGIS too sober — Hora is the fun-first entry point.

**Tertiary:** finance-curious adults who haven't found a finance game that respects their time.

**Not the audience:** ESCP MBAs looking for an ECFL credential. They have AEGIS for that.

## Non-negotiables

- **Mobile-first.** Portrait orientation, large tap targets (56×56 min), thumb-zone bottom nav, push notifications, haptics on every meaningful interaction.
- **Tap-to-play.** No keyboard required. The keyboard appears only for the call-sign field at signup and for fund chat.
- **2-minute sessions.** Open app → collect income → deploy → raid → close. The whole loop fits in a bus stop.
- **No real money in-game.** All currency virtual. Hourglass (premium) buys time and cosmetics; *never* real-money trading, *never* in-game-currency-to-fiat conversion.
- **No predatory mechanics.** No loot boxes with concealed odds. No countdown timers designed to induce panic. No fake scarcity. No dark patterns.
- **No financial advice.** Disclaimer on first run + persistent footer link.
- **Educational by osmosis, not by curriculum.** Players learn what a P/E ratio is because their analyst's tooltip explains it in 8 words. Not because they took a 90-minute course. Drop the ECFL framing; it belongs to AEGIS.
- **British English.** Inherited from AEGIS, kept.

## The core loop (90 seconds)

1. **Open app** — splash → home screen lands you on your treasury view
2. **Collect** — tap the treasury orb to harvest income that accumulated while you were offline
3. **Upgrade** — one tap to upgrade the next building / operator
4. **Raid** — tap "Raid" → matchmaker finds an offline opponent → 30-second timed raid (auto-resolved with one mid-raid tap for "double down")
5. **Reward** — chest opens with gold / hourglass / operator card / cosmetic
6. **Push notification fires** in 2 hours: "Your treasury is full"

That's the whole game. Everything else (funds, missions, leagues, seasons) layers on top of this loop.

See `docs/GAME_DESIGN.md` for full mechanics and `docs/VISUAL_DIRECTION.md` for the aesthetic direction.

## What we're carrying from AEGIS

- React 19 + Vite 6 + Tailwind 3 + Zustand (state) + Capacitor (mobile) + Tauri (desktop) + Supabase (backend)
- The auth + onboarding patterns (much simplified — Hora's intro is 15 seconds, not 90)
- The mobile/desktop infrastructure
- GDPR compliance

## What we're NOT carrying

- The AEGIS brand — wordmark, sigil, mythology, "Knowledge is the shield." tagline
- The ECFL curriculum — Hora's job is not certification
- Substrate Mode + NCOE pipeline — that's AEGIS-only R&D
- Athena's voice — Hora has a different advisor character (the **Oracle**), more chirpy/animated, less reverent
- The intelligence-platform CRT aesthetic — replaced by a saturated, juicy, cartoon-adjacent mobile-game palette

## Status

- ✅ Repo bootstrapped from AEGIS Empire (commit `a53f665`)
- ✅ AEGIS-era cruft pruned (workspace docs moved to `docs/_aegis-legacy/`, heavy zips deleted)
- ✅ Direction documented (this file + `docs/GAME_DESIGN.md` + `docs/VISUAL_DIRECTION.md` + `CLAUDE.md`)
- ✅ Capacitor configured mobile-first (portrait lock, splash, Hora identifier)
- ⏳ Rename `apps/hora/` → `apps/hora/`
- ⏳ Strip AEGIS-only modules (Substrate, ECFL, AEGIS branding)
- ⏳ Rebrand the design system per `docs/VISUAL_DIRECTION.md`
- ⏳ Replace AEGIS onboarding ritual with the 15-second mobile-game intro
- ⏳ Build the core loop: treasury view → collect → upgrade → raid → reward
- ⏳ First playable prototype

## Next steps

See `CLAUDE.md` for implementation guidance and `docs/GAME_DESIGN.md` for the screen-by-screen breakdown.

---

*Bootstrapped from [AEGIS Empire](https://github.com/Alecbdc/Aegis-empire) on 2026-04-29.*
