# Hora — Game Design Document

**Version:** 0.1 — initial brief, post-pivot from AEGIS
**Status:** Pre-implementation. This document IS the spec.

---

## 1. The core loop, in detail

```
   ┌─ Open app ─────────────────────────────────────────────┐
   │                                                        │
   ▼                                                        │
   Splash (2s) → Home (Treasury view)                       │
   │                                                        │
   │  ┌─ Tap treasury orb ───┐                              │
   │  │  Collect accrued     │                              │
   │  │  income (gold + xp)  │                              │
   │  │  Animation: coins    │                              │
   │  │  pour, particle burst │                              │
   │  └──────────────────────┘                              │
   │                                                        │
   │  ┌─ Tap "Upgrade" ──────┐                              │
   │  │  Pick next available  │                              │
   │  │  upgrade (auto-       │                              │
   │  │  highlighted)         │                              │
   │  │  Confirm w/ haptic    │                              │
   │  └──────────────────────┘                              │
   │                                                        │
   │  ┌─ Tap "Raid" ─────────┐                              │
   │  │  Matchmaker finds     │                              │
   │  │  offline opponent     │                              │
   │  │  (matched by league   │                              │
   │  │  rank ± 100)          │                              │
   │  │  30s timer            │                              │
   │  │  Auto-resolve with    │                              │
   │  │  one mid-raid "double │                              │
   │  │  down" tap option     │                              │
   │  │  Chest unlocks at end │                              │
   │  └──────────────────────┘                              │
   │                                                        │
   └─ Close app ────────────────────────────────────────────┘
   Push notification fires in 2 hours: "Treasury is full."
```

Total session: **90–180 seconds**. Played 3–8 times per day per active user.

---

## 2. Currencies

| Currency | Sourced from | Spent on | Notes |
|---|---|---|---|
| **Gold** | Treasury income (passive) + raids + missions | Upgrades, operator hires, defensive structures | Primary in-game currency. Soft cap to prevent hoarding. |
| **Hourglass** | Premium IAP + rare drops + season pass | Skipping cooldowns, cosmetics, premium operators | Premium currency. **No fiat path back out.** Hourglass purchased with real money cannot be sold, traded, or refunded into currency. |
| **Trophies** | Won/lost in raids + funded-fund battles | League ranking only — no spend mechanic | Glory metric. Reset every season (8 weeks). |
| **Insights** | Missions + daily login + ECFL-lite quizzes (more on this in §7) | Unlock advisor's tip-of-the-day, operator skill trees | Bridges the "fun" with a *touch* of education. |

**Currency design rule:** every drop should feel rewarding. Animation matters. A 12-gold reward gets a "ping" and a tiny coin sprite. A 1,200-gold reward gets a screen shake, a coin shower, and a haptic burst. The juice IS the reward.

---

## 3. The five buildings

The treasury starts with one building (the **Vault**, your home base). Buildings unlock at league rank thresholds.

| Building | Unlocks at | Generates | Defends with | Max level |
|---|---|---|---|---|
| **Vault** | L0 (default) | Gold (base income) | Cash reserves | 50 |
| **Trading Floor** | League: Bronze | Gold (yield × volatility) | Counter-trades vs. raiders | 40 |
| **Research Desk** | League: Silver | Insights | Decoy signals | 30 |
| **Compliance Office** | League: Gold | Defensive bonus + raid-attempt logs | Auto-blocks 20% of raids | 25 |
| **Reserve Bank** | League: Platinum | Hourglass drips (very slow, free path) | Total raid immunity 30min/day | 20 |

Building upgrades take real time: **10 minutes** at L1, scaling to **48 hours** at max. Hourglass skips. Free, patient players reach max in ~3 months.

---

## 4. Operators (the "troops")

Operators are deployable on raids. Five archetypes, each with progression:

| Operator | Stat profile | Role | Card rarity tiers |
|---|---|---|---|
| **Analyst** | High intelligence, low damage | Reveals opponent's defensive structure pre-raid | Bronze → Silver → Gold → Platinum → Mythic |
| **Trader** | Balanced | Standard raid offensive | same |
| **Broker** | Speed-focused | Steals gold even from defended vaults | same |
| **Market-Maker** | Tank | Soaks counter-trade damage | same |
| **Quant** | High burst | Critical-hits the highest-yield building | same |

Each operator has 3 skills that unlock at levels 5/10/15. Cosmetic skins are pure IAP — no stat impact, ever.

---

## 5. Raids

The thing that makes Hora *Hora* and not Idle Tycoon.

### How a raid works

1. **Find target** — matchmaker shows 3 cards: opponent's name, trophy count, vault contents (rough estimate). 30 seconds to pick one. Free re-rolls 1×/hour; hourglass skip for unlimited.
2. **Deploy** — pick 4 operators from your roster. Drag onto the battlefield.
3. **30-second timer** — operators auto-attack. You have one optional intervention: a "double down" tap that doubles damage for the next 5s, costing 1 random operator. Risk/reward.
4. **Result** — chest opens with: gold stolen (capped at 20% of opponent's vault), trophy delta, occasional operator-card drop.

### Anti-griefing

- Each player can be raided **at most twice per 24h**
- A defended raid gives the defender a **revenge token** (free retaliation within 48h)
- Shield (immunity) is granted after losing a raid: 4h free, longer with hourglass

### What raids are NOT

- **Not real-time PvP.** The opponent is offline; the simulator runs their defence based on stored config.
- **Not random.** Outcome is deterministic given the matchup. Skill is in roster selection + double-down timing.
- **Not gambling.** No real money. No concealed odds. The chest contents are visible probability ranges *before* you raid.

---

## 6. Funds (clans)

50-member cooperative groups. Real-time chat, shared missions, weekly fund-vs-fund battles. Coordinated raid windows: when one fund "declares" against another, members get +25% raid damage against that opponent for 24h.

Fund creation requires League: Silver. Joining is free. Funds have prestige levels (1–10), unlocked by collective gold contribution.

Mostly off-MVP — ship the solo loop first.

---

## 7. Mission system

Daily, weekly, season missions. Examples:

- **Daily — "Wake the Floor":** collect Trading Floor income 3× today. Reward: 200 gold + 1 insight.
- **Weekly — "Hostile Takeover":** win 8 raids against opponents in Silver+. Reward: 1 Silver operator card.
- **Season — "Architect":** upgrade any building to L10. Reward: cosmetic Vault skin.

Missions provide direction without forcing it. Skippable. Completable in any order.

---

## 8. The Oracle (advisor character)

Hora's equivalent of AEGIS's Athena. Pitched **completely different**:

- **Voice:** chirpy, animated, brief. Think the assistant in Hades, or Navi from Zelda, but less annoying. Short bubbles, not paragraphs.
- **Role:** points at the next sensible upgrade, surfaces a tip-of-the-day, narrates raid outcomes ("That broker stole 84 gold from their vault, nice grab!")
- **Visual:** a small animated companion in the bottom-left corner, never blocking gameplay. Animates between idle / cheering / smug / surprised.
- **No mythology.** No "I have carried this shield before." The Oracle is your buddy, not your goddess.
- **Optional.** A toggle in settings disables her entirely for players who want a quieter game.

The Oracle's "tips" are where the *touch* of financial literacy lands: "Your Trading Floor's yield is 12% — that's higher than most real-world equity funds!" Players learn what a yield is without ever sitting through a lecture.

---

## 9. Monetisation

Three IAP layers:

1. **Hourglass packs** — 100 / 500 / 2000 / 5000 / 12000 hourglass, €1.99 → €99.99. Standard pricing. Best value scales sub-linearly.
2. **Battle Pass season** — €4.99 per 8-week season. 50 tiers of rewards. Free track gives ~30% of premium rewards.
3. **Cosmetic bundles** — €0.99 → €9.99. Skins for buildings, operators, vault. **Cosmetic only. Never affects stats.**

Ad-supported free tier:
- Rewarded video for double-collect (optional, never forced)
- Interstitial between raids (capped at 1/hour)
- Banner removed by any IAP purchase

**No mechanics that gate progression behind ads.** Players who never see an ad and never pay must be able to reach max league within a 6-month grind.

---

## 10. Anti-patterns (explicit non-features)

- ❌ Energy systems (Subway Surfers / Candy Crush "out of lives, wait or pay")
- ❌ Loot boxes with concealed odds
- ❌ Pay-to-win advantages
- ❌ Real-money trading of any in-game asset
- ❌ Predatory whales-as-feature (no "spend €500 to win the season")
- ❌ Forced multi-day timers in early game (first 10 levels = max 5-minute upgrades)
- ❌ Ads disguised as content
- ❌ Push notifications more than 1× per day default (player can tune up if they want)
- ❌ FOMO timers ("Last 6 hours!" — never)
- ❌ Direct combat between online players (raids are async by design)

---

## 11. First-playable scope (the MVP)

To call Hora "playable" we need:

1. ✅ Auth + onboarding (port simplified from AEGIS — 15-second cinematic, not 90-second ritual)
2. ✅ Treasury home screen (vault orb, gold counter, 2 buildings visible)
3. ✅ Tap-to-collect with full juice
4. ✅ Upgrade flow (cost, confirm, timer, completion)
5. ✅ Solo raid loop (matchmaker against scripted bot opponents until enough real players exist)
6. ✅ Operator roster + deploy UI
7. ✅ Chest reward flow with animation
8. ✅ Mission system (daily + weekly only — season comes later)
9. ✅ Push notifications via Capacitor
10. ✅ Settings + privacy + data export

Funds, season pass, real PvP matchmaker, cosmetic shop = post-MVP.

---

## 12. What to build first

In this order:

1. **Visual style guide** (see `docs/VISUAL_DIRECTION.md`) — palette + typography + the home-screen layout
2. **Rename `apps/hora/` → `apps/hora/`** and strip AEGIS-only modules
3. **The home screen** (treasury orb + 2 buildings + gold counter + Oracle bubble)
4. **Tap-to-collect** with the full reward juice
5. **First upgrade flow** with timer + skip-with-hourglass
6. **Bot raids** (no matchmaker yet — fixed opponents)
7. **Onboarding intro** — 15 seconds, narrated by the Oracle
8. **Push notifications**
9. **TestFlight build**

After TestFlight survives 50 testers: real raids, funds, monetisation.

---

*Decisions captured here are not final. Surface disagreements before implementing.*
