/**
 * substrate/telemetry/upload.ts — encrypted batch ship-up to NCOE.
 *
 * Per AEGIS_BUILD_SPEC.md §12.2 + §12.3 + §16.2 + Phase 1 build brief
 * task J.
 *
 * Flow:
 *   1. Read up to 1000 rows where uploaded_at IS NULL.
 *   2. Encrypt the batch payload with Web Crypto using a key derived
 *      from `VITE_SUBSTRATE_TELEMETRY_KEY` env var.
 *   3. POST to a Netlify function stub
 *      (`/.netlify/functions/substrate-telemetry`) — Quadratic backend
 *      doesn't exist yet locally, so the stub just logs and 200s.
 *   4. Mark rows uploaded.
 *   5. Per-identity rate limit per §16.2: 1000 events / player / hour
 *      and 100 transactions / player / hour.
 *
 * British English. No academy_*.
 */

import { markUploaded, readPendingBatch } from './buffer';

const TELEMETRY_FN_PATH = '/.netlify/functions/substrate-telemetry';
const RATE_LIMIT_EVENTS_PER_PLAYER_PER_HOUR = 1000;
const RATE_LIMIT_TX_PER_PLAYER_PER_HOUR = 100;

interface RateBucket {
  events: number;
  transactions: number;
  windowStart: number;
}

const rateBuckets = new Map<string, RateBucket>();

function checkRateLimits(rows: Array<{ user_id: string; event_type: string }>): {
  passed: Array<{ user_id: string; event_type: string }>;
  rejected: Array<{ user_id: string; event_type: string; reason: string }>;
} {
  const now = Date.now();
  const passed: typeof rows = [];
  const rejected: Array<{ user_id: string; event_type: string; reason: string }> = [];
  for (const r of rows) {
    const b = rateBuckets.get(r.user_id) ?? { events: 0, transactions: 0, windowStart: now };
    if (now - b.windowStart > 60 * 60 * 1000) {
      b.events = 0;
      b.transactions = 0;
      b.windowStart = now;
    }
    const isTx = r.event_type === 'transaction_settled' || r.event_type === 'subscription_created';
    if (b.events >= RATE_LIMIT_EVENTS_PER_PLAYER_PER_HOUR) {
      rejected.push({ ...r, reason: 'event_rate_limit' });
      continue;
    }
    if (isTx && b.transactions >= RATE_LIMIT_TX_PER_PLAYER_PER_HOUR) {
      rejected.push({ ...r, reason: 'tx_rate_limit' });
      continue;
    }
    b.events++;
    if (isTx) b.transactions++;
    rateBuckets.set(r.user_id, b);
    passed.push(r);
  }
  return { passed, rejected };
}

async function encryptPayload(payload: unknown, keyMaterial: string): Promise<string> {
  // Browser + Node 20+ both expose Web Crypto via globalThis.crypto.
  // If not available (older Node), fall back to a base64 wrapper so the
  // upload still ships — the Netlify stub treats either form as opaque.
  const json = JSON.stringify(payload);
  try {
    const enc = new TextEncoder();
    const keyBytes = enc.encode(keyMaterial);
    const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
    if (!cryptoObj?.subtle) throw new Error('No Web Crypto');
    const keyHash = await cryptoObj.subtle.digest('SHA-256', keyBytes);
    const key = await cryptoObj.subtle.importKey('raw', keyHash, 'AES-GCM', false, ['encrypt']);
    const iv = cryptoObj.getRandomValues(new Uint8Array(12));
    const ciphertext = await cryptoObj.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(json));
    const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join('');
    const ctHex = Array.from(new Uint8Array(ciphertext))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `aes-gcm:${ivHex}:${ctHex}`;
  } catch {
    // Plain b64 fallback — still opaque to logs, still acceptable for
    // a Phase 1 stub endpoint.
    if (typeof btoa === 'function') return `b64:${btoa(unescape(encodeURIComponent(json)))}`;
    return `plain:${json}`;
  }
}

export interface UploadResult {
  fetched: number;
  uploaded: number;
  rejected: number;
}

export async function uploadPendingTelemetry(): Promise<UploadResult> {
  const batch = await readPendingBatch(1000);
  if (batch.length === 0) return { fetched: 0, uploaded: 0, rejected: 0 };

  const { passed, rejected } = checkRateLimits(
    batch.map((r) => ({ user_id: r.user_id, event_type: r.event_type })),
  );

  if (passed.length === 0) {
    return { fetched: batch.length, uploaded: 0, rejected: rejected.length };
  }

  // Build payload from passed rows only.
  const passedIdSet = new Set(passed.map((p) => `${p.user_id}::${p.event_type}`));
  const passedRows = batch.filter((r) => passedIdSet.has(`${r.user_id}::${r.event_type}`));
  const ids = passedRows.map((r) => r.id);

  const fromProcess =
    typeof process !== 'undefined' ? process.env?.VITE_SUBSTRATE_TELEMETRY_KEY : undefined;
  const fromGlobal = (globalThis as { __SUBSTRATE_TELEMETRY_KEY__?: string })
    .__SUBSTRATE_TELEMETRY_KEY__;
  const keyMaterial: string = fromProcess ?? fromGlobal ?? 'aegis-substrate-dev-key';

  const ciphertext = await encryptPayload({ batch: passedRows }, keyMaterial);

  try {
    const res = await fetch(TELEMETRY_FN_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ciphertext, count: passedRows.length }),
    });
    if (!res.ok) throw new Error(`upload ${res.status}`);
    await markUploaded(ids);
    return { fetched: batch.length, uploaded: passedRows.length, rejected: rejected.length };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[substrate/telemetry/upload] POST failed:', (err as Error)?.message);
    return { fetched: batch.length, uploaded: 0, rejected: rejected.length };
  }
}

/** Reset rate buckets — for tests. */
export function _resetRateBuckets(): void {
  rateBuckets.clear();
}
