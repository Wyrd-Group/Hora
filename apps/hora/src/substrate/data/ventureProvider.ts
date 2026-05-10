/**
 * substrate/data/ventureProvider.ts — pluggable VentureSpec source.
 *
 * Per AEGIS_BUILD_SPEC.md §5.2 and the Phase 1 brief, ventures arrive
 * via a "weekly drop" pattern. In Phase 1 we mock the drop with the
 * static library at `mockVentures.ts`; later phases swap this for a
 * real call into Quadratic's NCOE backend.
 *
 * The wrapper is the swap point — consumers never touch
 * `MOCK_VENTURES` directly. This file is the only place a real
 * fetch needs to be wired.
 *
 * Decision lock per build brief §15 default 2: weekly drop cadence.
 *
 * Firewall reminder (§4.1): nothing here joins academy_*. British
 * English in any new copy.
 */

import { MOCK_VENTURES, type MockVentureRecord } from './mockVentures';

/**
 * Pull this week's venture drop. In Phase 1 returns the mock library.
 *
 * TODO Phase 2/3: swap for a real fetch like
 *   `await apiFetch('/api/substrate/ventures/weekly')` and parse the
 *   payload through the canonical contract validator from
 *   `vendored/ncoe-contracts/venture_spec.ts`. Until then, the static
 *   list is the spec drop.
 */
export async function pullWeeklyVentures(): Promise<ReadonlyArray<MockVentureRecord>> {
  // Phase 1: deterministic mock. We still return a Promise so the
  // consumer never relies on synchronous availability — when the real
  // fetch lands the call site stays unchanged.
  return MOCK_VENTURES;
}

/**
 * Look up a single venture by its stable id. Used by the Athena
 * Substrate panel to hydrate the system prompt without re-fetching the
 * whole drop.
 */
export async function getVentureById(
  ventureId: string,
): Promise<MockVentureRecord | undefined> {
  const all = await pullWeeklyVentures();
  return all.find((v) => v.spec.venture_id === ventureId);
}
