/**
 * useBackendSync — Phase 2 backend telemetry hooks
 *
 * useEventStream     : subscribe to /ws/events and map to empireStore.pushTickerEvent
 * useMacroTelemetry  : poll /api/v1/macro/fx + /crypto + /dashboard every 90s
 *                      → injects FX/crypto ticker events and derives ATHENA macro regime
 *
 * Security notes:
 *  - All WS payloads are parsed in try/catch; malformed JSON is silently discarded
 *  - Text fields are validated as strings and truncated to 200 chars
 *  - Ticker type is checked against an explicit allowlist; defaults to 'intel'
 *  - API URL is read from VITE_API_URL env var with a localhost fallback
 *  - WS reconnects use capped exponential backoff (1s → 30s max) to avoid hammering
 *  - Both hooks clean up sockets and timers strictly on unmount
 */

import { useEffect, useRef } from 'react';
import { useEmpireStore } from '../store/empireStore';
import type { TickerEvent } from '../store/empireStore';

// ── Config ────────────────────────────────────────────────────────────────────
// Use relative paths so all requests go through the Vite dev proxy (/api, /ws).
// In production, set VITE_API_BASE to an absolute origin if the API lives elsewhere.

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

function wsUrl(path: string): string {
  // Derive ws/wss from the current page protocol so proxy passthrough works.
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const base  = (import.meta.env.VITE_API_BASE as string | undefined);
  if (base) return base.replace(/^http/, 'ws') + path;
  return `${proto}//${window.location.host}${path}`;
}

const ALLOWED_TYPES = new Set<TickerEvent['type']>([
  'fx', 'crypto', 'commodity', 'intel', 'alert', 'crime', 'board',
]);

const POLL_MS      = 90_000;
const FX_PAIRS     = ['EUR', 'GBP', 'JPY', 'CHF', 'CAD'] as const;
const CRYPTO_IDS   = { bitcoin: 'BTC/USD', ethereum: 'ETH/USD' } as const;

// ── Internal helpers ──────────────────────────────────────────────────────────

function sanitizeText(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw.trim().slice(0, 200);
}

function resolveType(raw: unknown): TickerEvent['type'] {
  return (typeof raw === 'string' && ALLOWED_TYPES.has(raw as TickerEvent['type']))
    ? (raw as TickerEvent['type'])
    : 'intel';
}

// ── useEventStream ────────────────────────────────────────────────────────────
/**
 * Opens a WebSocket to /ws/events. Incoming messages are parsed as JSON and
 * mapped to pushTickerEvent. Reconnects with exponential backoff on close/error.
 */
export function useEventStream(): void {
  const pushTickerEvent = useEmpireStore((s) => s.pushTickerEvent);
  const backoffRef      = useRef(1_000);
  const wsRef           = useRef<WebSocket | null>(null);
  const mountedRef      = useRef(true);

  useEffect(() => {
    // Skip WS connection if no backend is configured (Netlify static deploy)
    if (!import.meta.env.VITE_API_BASE) return;

    mountedRef.current = true;

    function connect(): void {
      if (!mountedRef.current) return;

      const ws = new WebSocket(wsUrl('/ws/events'));
      wsRef.current = ws;

      ws.onopen = () => {
        backoffRef.current = 1_000; // reset backoff on successful connect
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as Record<string, unknown>;

          // Accept common field names the backend might use
          const text = sanitizeText(
            msg.text ?? msg.message ?? msg.description ?? msg.summary,
          );
          if (!text) return;

          const type = resolveType(msg.type ?? msg.eventType ?? msg.event_type);
          pushTickerEvent(text, type);
        } catch {
          // Malformed JSON — discard silently
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        const delay = backoffRef.current;
        backoffRef.current = Math.min(delay * 2, 30_000);
        setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close(); // triggers onclose → reconnect cycle
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
    };
  }, [pushTickerEvent]);
}

// ── useMacroTelemetry ─────────────────────────────────────────────────────────
/**
 * Polls three macro endpoints every 90 seconds:
 *   /api/v1/macro/fx      → FX rate tickers (USD/EUR, USD/GBP, etc.)
 *   /api/v1/macro/crypto  → BTC/ETH price tickers
 *   /api/v1/macro/dashboard → GDP growth average → ATHENA regime + score
 *
 * All fetch failures are silent — the previous store state is preserved.
 */
export function useMacroTelemetry(): void {
  const pushTickerEvent = useEmpireStore((s) => s.pushTickerEvent);
  const setAthenaSignal  = useEmpireStore((s) => s.setAthenaSignal);

  useEffect(() => {
    // Skip polling if no backend is configured (Netlify static deploy)
    if (!import.meta.env.VITE_API_BASE) return;

    let cancelled = false;

    // ── FX rates ──────────────────────────────────────────────────────────────
    async function fetchFx(): Promise<void> {
      try {
        const res = await fetch(`${API_BASE}/api/v1/macro/fx?base=USD`);
        if (!res.ok) return;
        const data = await res.json() as Record<string, unknown>;

        const rates = data.rates;
        if (typeof rates !== 'object' || rates === null) return;

        for (const ccy of FX_PAIRS) {
          const rate = (rates as Record<string, unknown>)[ccy];
          if (typeof rate !== 'number') continue;
          pushTickerEvent(`USD/${ccy} ${rate.toFixed(4)}`, 'fx');
        }
      } catch { /* network failure — silent */ }
    }

    // ── Crypto prices ─────────────────────────────────────────────────────────
    async function fetchCrypto(): Promise<void> {
      try {
        const res = await fetch(`${API_BASE}/api/v1/macro/crypto`);
        if (!res.ok) return;
        const data = await res.json() as Record<string, unknown>;

        const prices = data.prices;
        if (typeof prices !== 'object' || prices === null) return;

        for (const [coinId, label] of Object.entries(CRYPTO_IDS)) {
          const coin = (prices as Record<string, unknown>)[coinId];
          if (typeof coin !== 'object' || coin === null) continue;
          const c = coin as Record<string, unknown>;

          const usd = c.usd;
          const chg = c.usd_24h_change;
          if (typeof usd !== 'number') continue;

          const chgStr = typeof chg === 'number'
            ? ` (${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%)`
            : '';
          pushTickerEvent(`${label} $${usd.toLocaleString()}${chgStr}`, 'crypto');
        }
      } catch { /* network failure — silent */ }
    }

    // ── ATHENA macro regime signal ─────────────────────────────────────────────
    // Derives a simple regime from IMF GDP growth average across key countries.
    // risk-on: avg ≥ 3% | neutral: 1–3% | risk-off: < 1%
    // score: 0–100 inverse of growth (higher score = more geopolitical risk)
    async function fetchMacroSignal(): Promise<void> {
      try {
        const res = await fetch(`${API_BASE}/api/v1/macro/dashboard`);
        if (!res.ok) {
          setAthenaSignal('unknown', 50, true);
          return;
        }
        const data = await res.json() as Record<string, unknown>;

        const gdpGrowth = data.gdpGrowth;
        if (!Array.isArray(gdpGrowth) || gdpGrowth.length === 0) {
          setAthenaSignal('unknown', 50, true);
          return;
        }

        let sum = 0; let count = 0;
        for (const entry of gdpGrowth as Array<Record<string, unknown>>) {
          if (typeof entry.value === 'number') { sum += entry.value; count++; }
        }
        if (count === 0) { setAthenaSignal('unknown', 50, true); return; }

        const avg    = sum / count;
        const regime = avg >= 3 ? 'risk-on' : avg >= 1 ? 'neutral' : 'risk-off';
        const score  = Math.round(Math.max(0, Math.min(100, 50 - avg * 5)));

        setAthenaSignal(regime, score, false);
        pushTickerEvent(
          `MACRO: ${regime.toUpperCase()} — global avg GDP ${avg.toFixed(2)}% · risk score ${score}`,
          'intel',
        );
      } catch {
        setAthenaSignal('unknown', 50, true);
      }
    }

    async function poll(): Promise<void> {
      if (cancelled) return;
      await Promise.allSettled([fetchFx(), fetchCrypto(), fetchMacroSignal()]);
    }

    poll();
    const timer = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pushTickerEvent, setAthenaSignal]);
}
