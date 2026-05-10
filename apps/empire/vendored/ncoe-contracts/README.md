# Contracts — NCOE ↔ AEGIS data interface

This directory holds the data contract between **NCOE** (Quadratic's
multi-agent startup-idea generator) and **AEGIS Empire** (the gamified
financial-literacy platform that hosts Substrate Mode + the Venture Board).

The contract has two halves:

| Direction | Payload | What it does |
|---|---|---|
| NCOE → AEGIS | `VentureSpec` | "Here's a startup idea — render it as a Venture Board card" |
| AEGIS → Quadratic | `VentureAttempt` | "Here's what player X did with venture Y" |

## Files

| File | Role |
|---|---|
| [`venture_spec.ts`](venture_spec.ts) | TypeScript types — primary AEGIS consumer |
| [`venture_spec.py`](venture_spec.py) | Python dataclasses — NCOE side, with validators |
| [`example_drone_insurance.json`](example_drone_insurance.json) | Worked example anchoring the contract |

## Spec version

Current: **1.0**

When updating the schema, **bump `spec_version` and update both files in
lockstep**. AEGIS may need to handle multiple `spec_version` values during
rollouts; treat it like a normal API version.

## Academy stays pristine — hard firewall

This contract is **scoped to Substrate Mode only**. Academy is a separate
AEGIS in-game mode with its own data model, its own curriculum pipeline,
and its own ECFL certification path. Substrate and Academy are parallel,
not connected.

```
Academy (separate in-game mode)
   ├── Quadratic-authored curriculum
   ├── ECFL certification credit
   └── governed independently

       ⛔ NO BRIDGE ⛔   (no field, no flag, no review pipeline
                          in this contract crosses this line)

Substrate Mode (this contract)
   ├── NCOE-generated ventures
   ├── Player + Athena co-creation
   ├── Substrate Briefings (educational content scoped here)
   └── Player-to-player B2B/B2C economy
```

Substrate Briefings are educational content **for Substrate Mode**.
They have a lifecycle (`draft → published → featured → archived`) within
Substrate Mode. They do not, and will never, feed into Academy via this
contract. If a future product decision says "let's promote great Substrate
content to Academy," that becomes a separate cross-system process owned
by Academy's governance — not a field on this schema.

**Why so strict?** ECFL's value is its rigor. Any contamination path
between player-generated content and ECFL-eligible material erodes the
credential. Architecturally firewalling them now prevents future
shortcuts. If you find yourself wanting to add an Academy-related field
to this schema — stop, you are in the wrong data model.

## Spinout / equity flow (also matters)

The schema includes a `SpinoutPolicy` block that captures whether and how
a venture's contributors get equity in a real-world spinout. Important
constraints:

1. **No equity is offered or promised during gameplay.** The `contributor_equity_pool`
   field captures the *intent* (10% reserved); actual grants only happen
   when Quadratic decides to spin a venture out as a real company and
   formally invites top contributors via standard stock-option paperwork.
2. **Default jurisdiction is `"PT"`** (Portugal) per the founder's
   incorporation choice. Change per-venture if needed.
3. **AEGIS UI must NOT display equity percentages without legal review.**
   The spec carries the data; the player-facing copy should be reviewed
   by a Lisbon-based fintech lawyer before shipping.

## Toolkit categories

The `ToolkitKind` enum lists the implementation primitives a player can
build for any venture:

| Kind | What it is |
|---|---|
| `business_automation` | A workflow agent (e.g. fleet routing optimizer) |
| `ai_agent` | An Athena variant tuned to a domain |
| `data_feed` | A curated/processed in-game data stream |
| `financial_product` | An in-game contract: insurance, derivative, structured product |
| `ui_panel` | A custom panel/UI other players see |
| `substrate_briefing` | A short practical educational module (NOT ECFL-eligible) |
| `trading_algorithm` | Automated trading logic |

Each `VentureSpec` lists which of these are required vs. optional. The
"compile best from each player's variant" step (downstream Quadratic
process) operates **per piece** — i.e. across all 50 players' variants of
the same venture, find the best `premium_calculator`, the best
`risk_engine`, etc. Then merge.

## Validation

Python side (`venture_spec.py`) enforces:

- `ContributionScoring` weights sum to 1.0 (±1e-6)
- `SpinoutPolicy.contributor_equity_pool` ∈ [0, 1)
- `VentureSpec.difficulty` ∈ {1, 2, 3, 4, 5}
- `VentureSpec.starting_capital` ≥ 0
- `VentureSpec.target_eta_mvp_days` ≥ 1
- At least one required toolkit piece

AEGIS should mirror these checks before accepting a `VentureSpec` payload
from NCOE, so a malformed spec fails loud at the integration boundary.

## Updating the schema

1. Edit both `venture_spec.ts` and `venture_spec.py` in lockstep
2. Bump `spec_version`
3. Update `example_drone_insurance.json` if relevant
4. Run the example-construction script (in this README's Build section)
   to verify validators still pass
5. Update AEGIS's import to handle the new `spec_version`

## Build / verify

The simplest verification is just running the example construction:

```bash
cd ncoe
python3 -c "
import sys; sys.path.insert(0, 'contracts')
from venture_spec import VentureSpec
import json
with open('contracts/example_drone_insurance.json') as f:
    raw = json.load(f)
print('parsed OK:', raw['venture_id'], 'spec_version', raw['spec_version'])
"
```

For a full re-generation of the example, see the construction snippet
in this commit's history (`example_drone_insurance.json` was generated
from a Python script invoking the dataclasses directly).

## Where this lives long-term

For now this contract lives inside the `ncoe/` repo because that's where
the canonical Python implementation runs. When AEGIS engineering picks
this up, the cleanest move is to extract `contracts/` into its own
package (`@quadratic/venture-spec` on npm + `quadratic-venture-spec` on
PyPI, or just a shared git submodule). Keep the version pinned and bump
both consumers in lockstep.
