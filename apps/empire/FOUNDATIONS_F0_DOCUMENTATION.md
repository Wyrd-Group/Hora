# Foundations (F0) — The Financial Literacy Track

The **Foundations** track is a self-contained F0 curriculum that bridges the
"first hour of play" gap between onboarding and the full ECFL certification
ladder (F1 → F6). It is the floor of AEGIS Empire's financial-education ladder,
aligned with the **OECD/INFE Core Competencies Framework on Financial Literacy
for Adults (2016)** so every module maps to a measurable literacy objective
that an NGO or regulator can vouch for.

Every F0 module does three things in one pass:

1. **Teaches** — 3 to 4 short, interactive lessons (4–7 minutes each).
2. **Gates** — passing the final exam unlocks a real slice of gameplay
   (Income Tracker, Savings Vault, Market Access, etc.).
3. **Rewards** — cash, Aegis Points and (at Distinction+) a free Study
   Pack — scaled to the player's exam tier.

Pass all 10 modules and the player earns a certified **F0 — Financial
Literacy** badge, the prerequisite for ECFL's F1 tier.

---

## Module → feature gate table

| #  | Course ID                    | Module                          | Unlocks (Feature)           | In-game location                  |
|----|------------------------------|----------------------------------|------------------------------|-----------------------------------|
| 1  | `f0-money-earning`           | Money & Earning                  | Income Tracker              | Empire › Dashboard › Income       |
| 2  | `f0-spending-budgeting`      | Spending & Budgeting             | Expense Categorizer         | Empire › Finances › Budget        |
| 3  | `f0-saving-emergency`        | Saving & Emergency Funds         | Savings Vault               | Empire › Finances › Vaults        |
| 4  | `f0-debt-credit`             | Debt & Credit                    | Credit Lines & Bonds        | Desk › Fixed Income               |
| 5  | `f0-banking-payments`        | Banking & Payments               | Bank Accounts               | Empire › Banks                    |
| 6  | `f0-markets-investing`       | Markets & Investing Basics       | Market Access (Desk floor)  | Desk › Markets                    |
| 7  | `f0-insurance-risk`          | Insurance & Risk Protection      | Insurance Products          | Empire › Risk › Insurance         |
| 8  | `f0-retirement-longterm`     | Retirement & Long-term Planning  | Retirement Planning         | Empire › Finances › Retirement    |
| 9  | `f0-taxes-govt`              | Taxes & Government Money         | Tax Optimizer               | Office › Tax                      |
| 10 | `f0-scams-protection`        | Scams & Consumer Protection      | Consumer Protection Shield  | Empire › Messages › Shield        |

Source of truth: `src/lib/foundationsUnlocks.ts` → `FOUNDATION_UNLOCKS`.

---

## Reward tiers

Every F0 exam is scored 0–100 and mapped to a tier:

| Tier              | Score ≥ | Cash payout     | Aegis Points | Free pack       |
|-------------------|---------|-----------------|--------------|-----------------|
| Pass              | 70 %    | €2,500          | 120          | —               |
| Merit             | 80 %    | €3,750          | 180          | —               |
| Distinction       | 90 %    | €5,625          | 270          | Study Pack      |
| High Distinction  | 95 %    | €7,500          | 360          | Study Pack      |

- **Failing the exam (< 70 %)** costs nothing and unlocks nothing. Retake freely.
- **Retakes** only pay the **differential** between the previous tier and the new
  one. Clearing Merit first and Distinction later pays €3,750 + (€5,625 − €3,750)
  = €5,625 total — never double-dipped. Feature unlock only fires once.
- **Distinction & HD** additionally grant a free **Study Pack** (3 cards,
  curriculum-earned). Repeating with a higher tier that crosses the pack
  threshold retroactively grants the pack.

Implemented in `src/lib/foundationsUnlocks.ts → rewardForExam()` and
`src/store/foundationsStore.ts → grantExamRewards()`.

---

## Certificates

A passing grade also triggers the shared curriculum certificate flow
(`curriculumStore.recordExamResult`). Each certificate carries:

- `band: 'F0'`
- `grade` — letter grade (A+ / A / A- / B+ / …)
- `distinction` — `Pass` | `Merit` | `Distinction` | `High Distinction`
- `verificationCode` — `ECFL-F0-<courseId-slice>-<timestamp>`
- `score`, `totalQuestions`, `correctAnswers`, `timeTaken`, `timeAllowed`

Passing an F0 exam **also** sets `ecflBand = 'F0'` in the curriculum store,
which is the prerequisite for F1 content.

---

## Architecture

```
┌──────────────────┐       ┌──────────────────────┐
│ ExamFlow.tsx     │──────▶│ curriculumStore      │
│ (UI)             │       │  .recordExamResult() │
└──────────────────┘       └────────┬─────────────┘
                                    │ if (isFoundationCourse)
                                    ▼
                           ┌────────────────────────┐
                           │ foundationsStore       │
                           │  .grantExamRewards()   │
                           └────┬──────────┬────────┘
                                │          │
                     cash + AP  │          │ emits FEATURE_UNLOCKED,
                     payout ↓   │          │ REWARDS_GRANTED on eventBridge
                                ▼          ▼
                    ┌───────────┐    ┌────────────────┐
                    │ empireStore│    │ cardEconomy    │
                    │ personal   │    │ Store (AP +    │
                    │ Balance    │    │ Study Pack)    │
                    └───────────┘    └────────────────┘
```

**No direct cross-store calls in UI code** — all wiring flows through
`curriculumStore → foundationsStore → (empireStore + cardEconomyStore)` via a
single entry point. The UI simply asks `useFoundationsStore.isUnlocked(flag)` to
decide whether to render a feature or a teaser.

---

## UI entry points

- **FOUNDATIONS tab** in the curriculum shell: F0 course grid with unlock
  roadmap, progress stats (unlocked/total, %, cash earned, AP earned), and a
  per-course status badge (`REWARDED`, pass/fail result, distinction tier).
- **ECFL EXAMS tab** shows F0 alongside F1–F6 in the band progression tracker.
- **CERTIFICATES tab** automatically displays the F0 certificate once earned.

Implementation: `src/components/curriculum/CurriculumShell.jsx` → `FoundationsTab`.

---

## Interactive lesson blocks

F0 lessons use short-attention-span content blocks **on top of** the existing
textbook format. Six interactive types exist, each rendered by
`src/components/curriculum/TextbookReader.jsx`:

| Block       | Purpose                                                                 |
|-------------|-------------------------------------------------------------------------|
| `microcard` | Swipeable 30–60 sec concept cards (deck of 2–5 flip cards).             |
| `flashcard` | Single spaced-repetition style term/definition flip.                    |
| `scenario`  | Branching A/B/C decision card with per-choice outcome copy.             |
| `calculator`| Live financial widget (compound, 50/30/20, loan, bond price, DCF, …).  |
| `datasight` | Chart/statement excerpt + multiple-choice reading check.                |
| `casetree`  | Multi-step branching case study with scored path and graded verdict.    |

Every F0 lesson has at least one interactive block. Block definitions live in
`src/types/curriculum.ts` → `ContentBlock`. Per-lesson content lives in
`src/data/foundationsContent.ts` (`Record<lessonId, ContentBlock[]>`).

Content lookup is a fall-through chain in
`CurriculumShell.jsx → resolveLessonSections()`:

```
foundationsContent[id]   →  (F0 lessons)
COURSE_CONTENT[id]       →  (ECFL sections format)
courseContent[id]        →  (legacy block arrays)
```

---

## Feature-flag gating

Any gameplay module that depends on an F0 unlock should read the flag at render
time:

```tsx
import { useFoundationsStore } from '../../store/foundationsStore';

function SavingsVaultPanel() {
  const unlocked = useFoundationsStore(s => s.isUnlocked('savingsVault'));
  if (!unlocked) return <FeatureTeaser feature="savingsVault" />;
  return <FullVaultUI />;
}
```

The `FeatureTeaser` component should link players back to the Foundations tab.

To bypass the gate in dev/testing: `useFoundationsStore.getState().forceUnlock('savingsVault')`.

---

## Testing

Covered by `src/__tests__/foundations.test.ts` (49 cases):

- **foundationsUnlocks** shape invariants (10 unique courses, 10 unique
  features, orders 1–10 contiguous, ALL_FEATURES = unlocks).
- `scoreToTier` boundary table (100, 95, 94, 90, 89, 80, 79, 70, 69, 0).
- `rewardForExam` pass/fail, per-tier payout, monotonic scaling.
- `prereqsForCourse` chain (0 for first course, 9 for last, all valid F0s).
- `grantExamRewards` — first-time pass, failed exams, non-F0 courses, emitted
  events (FEATURE_UNLOCKED, REWARDS_GRANTED).
- Retake semantics — same score pays nothing, lower score pays nothing,
  higher-tier retake pays the differential, Merit→Distinction unlocks a pack,
  feature unlock is idempotent.
- `unlockProgress` — 0/10 start, 5/10 at 50 %, `forceUnlock` works and is
  idempotent, `resetFoundations` wipes state.
- End-to-end: `curriculumStore.recordExamResult` triggers the full
  foundations pipeline on F0 course IDs only, and writes a banded certificate.

Run: `npm run test` (or `npx vitest run src/__tests__/foundations.test.ts`).

---

## Extending — adding an 11th F0 module

1. Add a new `Course` with `band: 'F0'` to `src/data/courses.ts`, including
   lessons and a final `exam`.
2. Append a `FoundationUnlock` to `FOUNDATION_UNLOCKS` in
   `src/lib/foundationsUnlocks.ts` with the next `order` number.
3. Extend the `FeatureFlag` union with the new feature id.
4. Add per-lesson content to `src/data/foundationsContent.ts`.
5. Gate the relevant in-game panel behind
   `useFoundationsStore.isUnlocked('<newFeature>')`.
6. Extend `foundations.test.ts` — shape invariants should still pass if the
   total of `FOUNDATION_UNLOCKS.length` is updated.

That's the whole loop. Everything else (XP, AP, certificates, band hierarchy)
is already wired and will pick up the new module automatically.
