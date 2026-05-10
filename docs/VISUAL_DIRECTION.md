# Hora — Visual Direction

**Mandate:** Hora must NOT look like AEGIS. AEGIS is a sober intelligence-platform aesthetic targeting business-school students. Hora is a juicy mobile-game targeting Clash Royale players. Different visual languages entirely.

This document defines Hora's visual identity. The current `apps/empire/` codebase still ships AEGIS's design tokens; rebrand follows this spec.

---

## 1. Reference points

Look at, in order of fidelity:

1. **Royal Match** — saturation, juiciness, visual feedback per tap. Hora wants this energy.
2. **Coin Master** — the "tap → reward → animation" loop is the gold standard.
3. **Clash Royale** — UI density done right on mobile. Buttons feel chunky, satisfying.
4. **Subway Surfers** — high-saturation, friendly characters, always-in-motion environments.
5. **Brawl Stars** — character art, vibrant palettes, readability at small sizes.

Look at, but with caution:

- Modern Hades — too dark, too painterly, but the *companion-bubble* pattern is borrowable for the Oracle.
- Idle Tycoon games — the income-collection loop is right, but the UI is usually ugly. Don't copy.

**Reject entirely:** any "premium" finance app aesthetic (Robinhood-clean, Revolut-minimal). Hora is a game, not an account.

---

## 2. Colour palette

Hora's palette is **saturated, warm-leaning, with a single cool accent for "advisor / information"** — opposite of AEGIS's cool-leaning intelligence palette.

### Brand colours

| Role | Token | Hex | Use |
|---|---|---|---|
| **Hora gold** | `--hora-gold` | `#FFB820` | Primary brand colour. The "currency colour." Buttons, accents, the vault orb. |
| **Hora coral** | `--hora-coral` | `#FF5C6E` | Energy / combat / raid. The "attack colour." |
| **Hora teal** | `--hora-teal` | `#1FCDB8` | Income / yield / success. The "growth colour." |
| **Hora violet** | `--hora-violet` | `#7C5CFF` | Premium / hourglass / rare drops. The "magic colour." |
| **Hora sky** | `--hora-sky` | `#4FB8FF` | Oracle / advisor / information. The one cool accent. |

### Surfaces

| Role | Token | Hex |
|---|---|---|
| **Treasury sky** | `--hora-bg-sky` | `#FFE9A8` (warm-cream gradient top) → `#FFAA5C` (peach mid) → `#FF6B96` (rose bottom) |
| **Card surface** | `--hora-surface` | `#FFFFFF` with 4% drop-shadow + 1px hairline at `rgba(0,0,0,0.06)` |
| **Card surface dark mode** | `--hora-surface-dark` | `#2B1B5C` (deep violet, not navy — keeps the playful register at night) |
| **Modal scrim** | `--hora-scrim` | `rgba(60, 30, 90, 0.45)` (purple-tinted, not pure black) |
| **Text primary** | `--hora-text` | `#1A1530` (warm near-black) |
| **Text muted** | `--hora-text-muted` | `#5C5470` |

### Why this palette is right

- **Warm gold + coral** dominate the eye → conveys *currency, energy, action* — the right cues for a finance-themed game without being literal about it.
- **Teal as the "success/income" colour** plays well with gold and stays distinct from coral attack states.
- **Violet for premium** is the universal premium-currency tell across mobile games. Players know what to expect.
- **Sky-blue Oracle accent** lets the advisor feel cool/calm against the warm interface — visual differentiation matters when she's always on-screen.

**NEVER use:** AEGIS cyan `#00e5ff`, AEGIS navy `#060a12`, AEGIS ivory `#E8E0D0`. Those tokens belong to AEGIS. Hora's design system replaces them.

---

## 3. Typography

| Role | Family | Source | Why |
|---|---|---|---|
| **Display / headers** | `Fredoka` (weights 500/600/700) | Google Fonts | Chunky, rounded, mobile-game-friendly. Reads as confident-friendly. |
| **Body** | `Nunito` (weights 400/600/700) | Google Fonts | Pairs with Fredoka, slightly more legible at small sizes. |
| **Numeric / counters** | `Space Grotesk` (weight 600) | Google Fonts | Tabular numerals for currency counters. Counters changing rapidly look terrible in proportional fonts. |
| **Decorative quotes** | Optional, sparingly | — | Not needed in v1. |

**NEVER use:** JetBrains Mono (that's AEGIS's display face), Cormorant Garamond italic (that's AEGIS's serif accent), Inter as display (Inter is body; Hora has its own pair).

### Type scale (mobile-first)

| Use | Size | Family | Weight |
|---|---|---|---|
| H1 (rare — splash, headers) | 32px / 40px | Fredoka | 700 |
| H2 (screen titles) | 24px / 32px | Fredoka | 600 |
| H3 (card titles) | 18px / 24px | Fredoka | 600 |
| Body | 16px / 24px | Nunito | 400 |
| Body emphasis | 16px / 24px | Nunito | 700 |
| Small / labels | 13px / 18px | Nunito | 600 |
| Numeric (counters) | varies | Space Grotesk | 600, tabular-nums |
| Button label | 16px / 20px | Fredoka | 600 |

---

## 4. Iconography

Mobile games don't use Heroicons or Lucide. Hora needs **chunky filled icons** with a slight drop shadow, in the palette colours, with consistent corner radius (6px).

Option A: commission a custom icon set (best — but expensive)
Option B: use `Tabler Icons` filled variant (free, MIT, the closest to "game-friendly" of free icon sets)
Option C: use `Iconify` with the `solar:bold-duotone` collection (free, the most playful free set)

**Recommendation:** start with Solar Bold Duotone (free), commission custom icons for the 12 most-used (currency, building types, operator types, raid, chest, fund, league) once the design is locked.

Specific banned icon styles:
- Outline/line icons (too sober for Hora — those are AEGIS's vibe)
- Material symbols (too utilitarian)
- SF Symbols copies (too iOS-specific, doesn't read well on Android)
- Unicode glyphs as icons (◉ ◈ ⬡ — those are AEGIS's signature; Hora needs its own visual vocabulary)

---

## 5. Mascot / branding

### Hora wordmark

Hora's wordmark is **NOT** the AEGIS uppercase-mono-tracked-widely treatment. Hora's wordmark is:

- **Word:** `Hora`
- **Treatment:** Fredoka 700, mixed case ("Hora" not "HORA"), slight downward tilt (-2°) for energy, **gold-to-coral gradient** fill, soft drop shadow (4px y-offset, 6px blur, `rgba(0,0,0,0.15)`)
- **Sigil:** an hourglass with coins falling through, in gold + teal + violet. The hourglass IS the brand mark — it appears as the app icon, as the load spinner, as the splash logo.

### App icon (mandatory)

- 1024×1024 source, exported to all platform sizes
- Background: gold-to-coral radial gradient
- Foreground: the hourglass sigil in white/teal
- No text in the icon (App Store best practice)

### The Oracle (mascot)

The advisor character. Visual identity:

- A small chibi-style character — friendly, round-headed, slightly floating
- Holds a tiny crystal ball / hourglass
- Animated idle, cheering, surprised, smug, sleeping
- Colour: violet base outfit, sky-blue hair, gold accents
- Appears in the bottom-left corner on most screens. Tap her → tip-of-the-day modal.

**Hora has a mascot. AEGIS does not.** This is a deliberate audience signal: mobile gamers expect a companion character. Hora gives them one.

---

## 6. Animation language

### What Hora must animate

Every meaningful tap gets visible feedback. Specifically:

- **Collect income** — coins rain from the top of the screen into the gold counter, counter rolls up rapidly, screen has a +0.3s gold tint flash, haptic medium impact
- **Upgrade complete** — building scales up briefly (1.0 → 1.1 → 1.0 over 0.4s), particles burst around it, success chord plays
- **Raid won** — chest flies onto screen, lid opens with sparkle particles, rewards appear one by one with chiming sounds
- **Raid lost** — chest closes with a dim "thud," brief screen-shake, sympathetic Oracle bubble pops
- **Mission complete** — gold tick mark scales in, plus reward animation
- **Level-up** — full-screen takeover with confetti, your new level number scales in, badge pops in below

### Motion principles

- **Snappy, not smooth.** 200–400ms durations. Anything longer feels slow on mobile.
- **Overshoot easing for positive events.** Cubic-bezier(0.34, 1.56, 0.64, 1) — gives the "bounce" that makes things feel alive.
- **Quick decay for negative events.** Cubic-bezier(0.4, 0, 1, 1) — accelerated exit, no lingering.
- **Particles everywhere.** Pre-build a few particle systems (gold coin burst, sparkle, confetti, smoke) and reuse aggressively.
- **Haptics on every meaningful event.** Use `@capacitor/haptics` (already in deps). Light impact for taps, medium for transactions, heavy for level-ups, success/warning/error for raid outcomes.

### What Hora must NOT animate

- Slow ambient atmosphere (drifting embers, scanlines, film grain — those belong to AEGIS, kill them on Hora screens)
- Mood-y filmic effects (heavy vignette, light shafts)
- Loading sequences longer than 1.5 seconds (if it takes longer, prefetch in the background)

---

## 7. Layout primitives

### Mobile-first grid

Hora is portrait-first. Tablets get a centred portrait column (max-width 480px) — no separate iPad layout in v1.

### Bottom navigation

Five-tab bottom nav, thumb-zone optimised:

```
[ 🏰 Base ]  [ ⚔ Raid ]  [ 👥 Funds ]  [ 🏆 League ]  [ 👤 Profile ]
```

Each tab is 56×56 tap target with icon + label. Active tab gets the gold-to-coral gradient + slight scale-up.

### Top bar

Persistent across all screens: gold counter, hourglass counter, trophy counter, settings cog. All three currencies tappable for "where do I get more?" modals.

### FAB / primary action

When the primary action is "collect" (treasury full) or "raid" (cooldown over), a floating action button appears, pulsing gently. Never more than one FAB at a time.

---

## 8. Sound design

| Event | Sound |
|---|---|
| Tap (any button) | Soft click (`tap_01.mp3`) |
| Collect income | Coin pour (`coins_pour.mp3`) + ascending arpeggio |
| Upgrade complete | Triumphant chord (`upgrade_done.mp3`) |
| Raid won | Victory fanfare (`raid_win.mp3`) |
| Raid lost | Sad trombone — light, not deflating (`raid_lose.mp3`) |
| Chest opening | Sparkle + reveal whoosh (`chest_open.mp3`) |
| Mission complete | Tick + chime (`mission_done.mp3`) |
| Push notification | (defer to OS sounds) |

All sound effects ≤ 1 second. All optional — settings toggle to mute. **Always-on background music: NO.** Music is fatiguing in a game played in 2-minute bursts.

---

## 9. Dark mode

Optional v1.5 — defer. Hora's bright warm palette IS the brand; a dark mode would undermine it. If we ship dark mode, it inverts the surfaces (deep violet `#2B1B5C` background) but keeps the brand colours and the warm character intact. Never a "pro dark" Robinhood-style minimal grey.

---

## 10. Accessibility

Mobile-first does not mean accessibility-second.

- All text meets WCAG AA contrast against its background (verify against the gold-on-cream pairings particularly — gold on cream can fail)
- All interactive elements ≥ 44×44 px (we're aiming for 56)
- Haptics + sound + visual feedback are all independent confirmations
- `prefers-reduced-motion` halves animation durations and skips screen shake
- The Oracle has a "subtitle mode" — her bubbles always render in text, never voice-only
- Colour-blind safe: gold/teal/coral/violet are all distinguishable in red-green and blue-yellow simulations, but we never encode meaning by colour alone (an "income" indicator is also labeled `+ Gold`, not just teal-green)

---

## 11. What this means for the codebase

The existing `apps/empire/` ships AEGIS's design tokens. The rebrand pass:

1. Add fonts to `index.html`:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700&family=Space+Grotesk:wght@600&display=swap" rel="stylesheet">
   ```
2. Update `tailwind.config.js` `fontFamily` and `colors` extensions per the tables above
3. Delete: `apps/empire/src/styles/ritual.css` (AEGIS-only)
4. Delete: `apps/empire/src/components/shared/RitualBackdrop.tsx`, `AegisShield.tsx`, `RitualButton.tsx`
5. Replace with: `apps/hora/src/components/shared/HoraOrb.tsx`, `OracleBubble.tsx`, `JuicyButton.tsx`, `CoinBurst.tsx`
6. Strip the onboarding ritual; replace with `apps/hora/src/components/onboarding/OracleIntro.tsx` (15-second cinematic introducing the Oracle and the treasury)

---

*Decisions captured here are not final. If something feels too saturated or too playful or not playful enough, iterate before locking.*
