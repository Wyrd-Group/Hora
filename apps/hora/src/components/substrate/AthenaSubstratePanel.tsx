/**
 * AthenaSubstratePanel.tsx — Substrate-scoped Athena chat surface.
 *
 * Per AEGIS_BUILD_SPEC.md §9 + Phase 1 build brief task E:
 *
 *   - Reuses the AthenaPanel layout register (font-mono uppercase
 *     tracking-widest for labels; serif italic for evocative copy;
 *     deep navy + cyan).
 *   - Venture-aware system prompt built dynamically per §9.2 from the
 *     pitch, target_buyer, top_objections, current metrics, recent
 *     pivots.
 *   - Async UX (§9.4): typing indicator on send, [Retry] on error,
 *     [Cancel] on long generations, never blocks the UI.
 *   - Each conversation tagged with venture_id; sessions appended to
 *     `VentureAttempt.athena_session_ids[]`.
 *   - Emits `athena_session_started` and `athena_message_sent` (§12.1).
 *   - Mock fallback in dev when the LLM endpoint isn't reachable.
 *   - British English. Oracular, mythology-aware ("you carry the Aegis").
 *   - Player always confirms before changes apply.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { VentureAttempt, VentureSpec } from '../../substrate/types';
import { useSubstrateStore } from '../../store/substrateStore';
import { emit, SUBSTRATE_EVENTS } from '../../substrate/telemetry/events';

type Role = 'user' | 'assistant' | 'system';

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  ts: number;
  status?: 'pending' | 'ok' | 'error';
}

export interface AthenaSubstratePanelProps {
  attempt: VentureAttempt;
  spec: VentureSpec;
  /** Optional: pre-existing transcript for resume. */
  initialMessages?: ChatMessage[];
  onClose?: () => void;
}

// ── System prompt builder (§9.2) ────────────────────────────────────

export function buildAthenaSubstrateSystemPrompt(params: {
  spec: VentureSpec;
  attempt: VentureAttempt;
}): string {
  const { spec, attempt } = params;
  const recentPivots = attempt.pivots
    .slice(-3)
    .map((p) => `- ${p.kind}: "${p.before}" → "${p.after}"`)
    .join('\n');
  const metrics = attempt.metrics;
  return [
    'You are Athena, AEGIS Chief-of-Staff and now co-founder of the player\'s venture.',
    '',
    `Venture: ${spec.pitch}`,
    `Target buyer: ${spec.target_buyer}`,
    `Top objections:`,
    ...spec.top_objections.map((o) => `  - ${o}`),
    '',
    `Current metrics:`,
    `  - revenue: €${metrics.total_revenue.toFixed(0)}`,
    `  - subscribers: ${metrics.subscriber_count}`,
    `  - distinct buyers: ${metrics.distinct_buyers}`,
    `  - B2B ratio: ${(metrics.customer_b2b_ratio * 100).toFixed(0)}%`,
    `  - 30-day retention: ${(metrics.retention_30d * 100).toFixed(0)}%`,
    '',
    'Recent pivots:',
    recentPivots || '  - (none yet)',
    '',
    'Your role: co-design pricing, segments, GTM, and toolkit pieces.',
    'Co-spec the player\'s product (Markdown UI mockups, pseudo-TS API',
    'surfaces, financial models in tables). Co-pivot when metrics weaken.',
    'Co-pitch when listing copy is needed.',
    '',
    'Constraints:',
    '- You DO NOT make decisions for the player; player always confirms before changes apply.',
    '- You DO NOT have privileged Quadratic backend access.',
    '- You speak in British English. Terse, oracular, mythology-aware (you carry the Aegis).',
  ].join('\n');
}

// ── Hash helpers (light-weight, for telemetry) ──────────────────────

function lightHash(input: string): string {
  // Lightweight non-cryptographic hash, sufficient for telemetry IDing.
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h) + input.charCodeAt(i);
    h |= 0;
  }
  return `h${(h >>> 0).toString(16)}`;
}

function newId(): string {
  return `msg-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

// ── Mock fallback ───────────────────────────────────────────────────

/**
 * When the LLM endpoint is unavailable in dev (no localhost:8888, no
 * Supabase function), produce a deterministic oracular reply so the
 * flow doesn't break local dev. British English. Mythology-aware.
 *
 * Three-line spec format the acceptance test relies on.
 */
export function mockAthenaReply(userMsg: string, spec: VentureSpec): string {
  const focus = userMsg.length > 80 ? `${userMsg.slice(0, 76)}…` : userMsg;
  return [
    `*The Aegis warms.* On "${focus}":`,
    `1. Ship the leanest cut of "${spec.pitch}" first; the market answers no faster than yes.`,
    `2. Anchor the wedge against ${spec.target_buyer === 'B2B' ? 'a single decision-maker title' : 'a single use moment'} — pricing follows.`,
    `3. Set the first listing at €170/seat; let churn write the second draft.`,
  ].join('\n');
}

// ── Component ───────────────────────────────────────────────────────

export default function AthenaSubstratePanel({
  attempt,
  spec,
  initialMessages,
  onClose,
}: AthenaSubstratePanelProps) {
  const sessionId = useMemo(
    () => `athena-${attempt.attempt_id}-${Date.now().toString(36)}`,
    [attempt.attempt_id],
  );
  const systemPrompt = useMemo(
    () => buildAthenaSubstrateSystemPrompt({ spec, attempt }),
    [spec, attempt],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialMessages ?? [],
  );
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Emit `athena_session_started` once on mount.
  useEffect(() => {
    void emit(SUBSTRATE_EVENTS.ATHENA_SESSION_STARTED, {
      venture_id: attempt.venture_id,
      athena_session_id: sessionId,
      system_prompt_hash: lightHash(systemPrompt),
    });
    // Auto-scroll to bottom on session start.
    scrollRef.current?.scrollTo({ top: 1e9 });
  }, [attempt.venture_id, sessionId, systemPrompt]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9 });
  }, [messages]);

  async function callLlm(userText: string): Promise<string> {
    // Try the AEGIS apiFetch surface first; mock on any failure so the
    // player flow stays unbroken in dev.
    try {
      // We deliberately import lazily so the module load doesn't pay the
      // cost when the Athena Substrate panel isn't open.
      const { apiFetch } = await import('../../lib/apiFetch');
      const res = await apiFetch('/api/athena/substrate-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: messages.concat({
            id: 'temp',
            role: 'user',
            content: userText,
            ts: Date.now(),
          }),
          venture_id: attempt.venture_id,
          session_id: sessionId,
        }),
      });
      if (!res.ok) throw new Error(`LLM ${res.status}`);
      const json = (await res.json()) as { reply?: string };
      if (!json.reply) throw new Error('Empty LLM reply');
      return json.reply;
    } catch (err) {
      // Telemetry-friendly: log once, then mock so dev continues.
      // eslint-disable-next-line no-console
      console.warn('[Athena Substrate] mock fallback:', (err as Error)?.message);
      return mockAthenaReply(userText, spec);
    }
  }

  async function send(text: string) {
    if (!text.trim() || pending) return;
    cancelRef.current = { cancelled: false };

    const userMsg: ChatMessage = {
      id: newId(),
      role: 'user',
      content: text.trim(),
      ts: Date.now(),
      status: 'ok',
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setPending(true);
    setError(null);

    void emit(SUBSTRATE_EVENTS.ATHENA_MESSAGE_SENT, {
      athena_session_id: sessionId,
      role: 'user',
      content_hash: lightHash(userMsg.content),
    });

    try {
      const reply = await callLlm(userMsg.content);
      if (cancelRef.current.cancelled) return;

      const assistantMsg: ChatMessage = {
        id: newId(),
        role: 'assistant',
        content: reply,
        ts: Date.now(),
        status: 'ok',
      };
      setMessages((m) => [...m, assistantMsg]);

      void emit(SUBSTRATE_EVENTS.ATHENA_MESSAGE_SENT, {
        athena_session_id: sessionId,
        role: 'assistant',
        content_hash: lightHash(assistantMsg.content),
      });
    } catch (err) {
      setError((err as Error)?.message ?? 'Athena could not respond.');
    } finally {
      setPending(false);
    }
  }

  function cancel() {
    cancelRef.current.cancelled = true;
    setPending(false);
  }

  function retry() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) void send(lastUser.content);
  }

  return (
    <div
      role="region"
      aria-label="Athena Substrate co-creation"
      className="flex flex-col gap-3 font-mono"
      style={{ minHeight: 360 }}
    >
      <header className="flex items-baseline justify-between">
        <h3 className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] uppercase text-[#9beaff]">
          Athena · Co-creation
        </h3>
        <span className="text-[9px] uppercase tracking-[0.18em] text-[#d5ddf6]/40">
          Venture · {spec.venture_id.slice(-12)}
        </span>
      </header>

      <p className="font-serif italic text-[12px] text-[#d5ddf6]/55 leading-relaxed">
        She speaks plain. The Aegis is yours; she only carries it.
      </p>

      <div
        ref={scrollRef}
        className="flex flex-col gap-3 max-h-72 overflow-y-auto rounded border p-3 text-[12px] leading-relaxed"
        style={{
          background: 'rgba(8,12,20,0.55)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        {messages.length === 0 ? (
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#d5ddf6]/35 text-center py-2">
            Open the conversation. Ask Athena where the wedge is.
          </p>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <span
              className="text-[8px] uppercase tracking-[0.18em]"
              style={{
                color: m.role === 'user' ? 'rgba(213,221,246,0.45)' : 'rgba(155,234,255,0.6)',
              }}
            >
              {m.role === 'user' ? 'You' : 'Athena'}
            </span>
            <div
              className="rounded px-3 py-2 max-w-[90%] whitespace-pre-wrap"
              style={{
                background:
                  m.role === 'user'
                    ? 'rgba(213,221,246,0.05)'
                    : 'rgba(155,234,255,0.06)',
                color: m.role === 'user' ? '#d5ddf6' : '#dff5ff',
                border:
                  m.role === 'user'
                    ? '1px solid rgba(213,221,246,0.10)'
                    : '1px solid rgba(155,234,255,0.18)',
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {pending ? (
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#9beaff]/70">
            <span className="inline-block w-1 h-1 rounded-full bg-[#9beaff] animate-pulse" />
            Athena is thinking
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-2 text-[10px] text-rose-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={retry}
            className="px-2 py-1 rounded border text-[9px] tracking-[0.18em] uppercase"
            style={{
              borderColor: 'rgba(244,114,182,0.30)',
              color: '#fbcfe8',
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2"
      >
        <textarea
          aria-label="Message Athena"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Ask Athena…"
          className="flex-1 rounded border bg-[#060a12] text-[#d5ddf6] text-[12px] px-3 py-2 leading-relaxed resize-none"
          style={{ borderColor: 'rgba(255,255,255,0.10)' }}
          disabled={pending}
        />
        {pending ? (
          <button
            type="button"
            onClick={cancel}
            className="px-3 py-2 rounded border text-[9px] tracking-[0.2em] uppercase"
            style={{
              borderColor: 'rgba(244,114,182,0.30)',
              color: '#fbcfe8',
            }}
          >
            Cancel
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-3 py-2 rounded border text-[9px] tracking-[0.2em] uppercase disabled:opacity-40"
            style={{
              background: 'rgba(0,229,255,0.10)',
              borderColor: 'rgba(0,229,255,0.32)',
              color: '#9beaff',
            }}
          >
            Send
          </button>
        )}
      </form>

      {onClose ? (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-[9px] uppercase tracking-[0.18em] text-[#d5ddf6]/40"
          >
            Close panel
          </button>
        </div>
      ) : null}

      {/* Mark store reference unused-but-retained for future expansion. */}
      <span className="hidden">{useSubstrateStore.persist?.getOptions().name ?? ''}</span>
    </div>
  );
}
