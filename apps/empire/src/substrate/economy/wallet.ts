/**
 * substrate/economy/wallet.ts — Substrate-only wallet operations.
 *
 * Per AEGIS_BUILD_SPEC.md §4.2 + §11.2 + Phase 1 build brief task I:
 *
 *   - All currency here is Substrate-only. NEVER touches Campaign
 *     wallets (`empireStore.companyBalance`, `personalBalance`,
 *     etc.). Cross-mode liquidity is forbidden in v1 (§11.4).
 *
 *   - Two wallet kinds per spec §11.2: 'personal' (B2C) and
 *     'company' (B2B). NPCs hold both; players hold both.
 *
 *   - Every credit/debit emits a telemetry event through the
 *     economy/sinks recorder so the inflation guard can observe
 *     the rolling currency velocity.
 *
 *   - British English in any new copy.
 */

import { recordEconomySink } from './sinks';

export type WalletKind = 'personal' | 'company';

/**
 * In-memory wallet ledger keyed by `${userId}::${walletKind}`. Phase 1
 * persistence is via the Zustand store (`substrateStore`); this module
 * is the audit trail layer the store calls into. Tests can also drive
 * this directly without spinning up the store.
 */
const ledger = new Map<string, number>();

function key(userId: string, walletKind: WalletKind): string {
  return `${userId}::${walletKind}`;
}

export function getBalance(userId: string, walletKind: WalletKind = 'personal'): number {
  return ledger.get(key(userId, walletKind)) ?? 0;
}

export interface WalletMutation {
  newBalance: number;
  amount: number;
  reason: string;
  walletKind: WalletKind;
  ts: number;
}

/**
 * Credit a Substrate wallet. Emits an economy_sink_event tagged
 * 'inflation_guard' (the benign credit-side marker) so the inflation
 * guard sees the move.
 */
export function credit(
  userId: string,
  amount: number,
  reason: string,
  walletKind: WalletKind = 'personal',
): WalletMutation {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { newBalance: getBalance(userId, walletKind), amount: 0, reason, walletKind, ts: Date.now() };
  }
  const current = getBalance(userId, walletKind);
  const next = current + amount;
  ledger.set(key(userId, walletKind), next);
  recordEconomySink({
    kind: 'inflation_guard',
    amount,
    party_id: userId,
    context: { reason, direction: 'credit', wallet: walletKind },
  });
  return { newBalance: next, amount, reason, walletKind, ts: Date.now() };
}

/**
 * Debit a Substrate wallet. Returns the resulting balance even if it
 * goes negative — the caller decides whether to allow that. Emits a
 * 'fee' kind sink event (debit-side default).
 */
export function debit(
  userId: string,
  amount: number,
  reason: string,
  walletKind: WalletKind = 'personal',
): WalletMutation {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { newBalance: getBalance(userId, walletKind), amount: 0, reason, walletKind, ts: Date.now() };
  }
  const current = getBalance(userId, walletKind);
  const next = current - amount;
  ledger.set(key(userId, walletKind), next);
  recordEconomySink({
    kind: 'fee',
    amount,
    party_id: userId,
    context: { reason, direction: 'debit', wallet: walletKind },
  });
  return { newBalance: next, amount, reason, walletKind, ts: Date.now() };
}

/**
 * Reset the in-memory ledger. Used by tests so per-test state stays
 * isolated. Production never calls this.
 */
export function _resetLedger(): void {
  ledger.clear();
}
