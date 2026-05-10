// ============================================================================
// RegulatoryReviewDashboard — admin-only page for approving fact changes
// ============================================================================
// Lists pending review_queue rows; one-click approve/reject. Calls Supabase
// RPC functions approve_review / reject_review which handle the atomic
// update + audit logging.
//
// Mount this component behind an admin guard. It is NOT meant for end users.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { COUNTRY_META } from '../../types/regulatory';

const RISK_COLORS = {
  low: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50',
  medium: 'bg-amber-900/30 text-amber-300 border-amber-700/50',
  high: 'bg-rose-900/30 text-rose-300 border-rose-700/50',
};

const CHANGE_TYPE_LABELS = {
  new_fact: 'New fact',
  value_change: 'Value change',
  structural_change: 'Structural change',
  deprecation: 'Deprecation',
};

function flagOf(country) {
  return COUNTRY_META[country]?.flag ?? '🏳️';
}

function fmtValue(value) {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  const parts = [];
  if (value.amount != null) {
    parts.push(`${value.currency ?? ''}${value.amount.toLocaleString()}`.trim());
  }
  if (value.rate != null) parts.push(`${(value.rate * 100).toFixed(2).replace(/\.?0+$/, '')}%`);
  if (value.unit) parts.push(`(${value.unit})`);
  if (value.threshold_low != null || value.threshold_high != null) {
    parts.push(`[${value.threshold_low ?? '…'} – ${value.threshold_high ?? '…'}]`);
  }
  if (parts.length === 0) return JSON.stringify(value);
  return parts.join(' ');
}

function deltaBadge(delta) {
  if (delta == null) return null;
  const sign = delta > 0 ? '+' : '';
  const color = Math.abs(delta) < 5 ? 'text-stone-300' : Math.abs(delta) < 25 ? 'text-amber-300' : 'text-rose-300';
  return <span className={`text-xs font-mono ${color}`}>{sign}{delta.toFixed(2)}%</span>;
}

function ReviewRow({ entry, onApprove, onReject, isPending }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  const riskClass = RISK_COLORS[entry.risk_score] ?? RISK_COLORS.medium;

  return (
    <article
      className="card-glass rounded-lg p-4 border border-stone-700/50"
      aria-label={`Review ${entry.fact_key} for ${entry.country_code}`}
    >
      <header className="flex flex-wrap items-center gap-3 mb-3">
        <span className="text-2xl" aria-hidden>{flagOf(entry.country_code)}</span>
        <div className="flex-1 min-w-0">
          <div className="text-stone-100 font-semibold truncate">
            {COUNTRY_META[entry.country_code]?.name ?? entry.country_code} · <code className="text-amber-200">{entry.fact_key}</code>
          </div>
          <div className="text-xs text-stone-400">
            {CHANGE_TYPE_LABELS[entry.change_type] ?? entry.change_type} · Queued {new Date(entry.created_at).toLocaleString()}
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${riskClass}`}>
          Risk: {entry.risk_score}
        </span>
        {deltaBadge(entry.delta_percent)}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
        <div className="bg-stone-900/60 rounded p-3 border border-stone-700/50">
          <div className="text-xs text-stone-400 uppercase tracking-wide mb-1">Current approved</div>
          <div className="text-stone-200 font-mono text-sm break-words">{fmtValue(entry.old_value)}</div>
        </div>
        <div className="bg-stone-900/60 rounded p-3 border border-amber-700/50">
          <div className="text-xs text-amber-400 uppercase tracking-wide mb-1">Proposed</div>
          <div className="text-amber-100 font-mono text-sm break-words">{fmtValue(entry.new_value)}</div>
        </div>
      </div>

      {entry.risk_reasoning && (
        <div className="text-xs text-stone-300 italic mb-3 border-l-2 border-stone-600 pl-2">
          {entry.risk_reasoning}
        </div>
      )}

      {entry.source_url && (
        <div className="text-xs mb-3">
          <a
            href={entry.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-300 hover:text-emerald-200 underline"
          >
            Open source →
          </a>
          {entry.source_excerpt && (
            <blockquote className="mt-2 text-stone-300 italic border-l-2 border-emerald-700/50 pl-3">
              "{entry.source_excerpt}"
            </blockquote>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onApprove(entry)}
          className="px-3 py-1.5 text-sm rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium"
        >
          {isPending ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setRejectOpen((v) => !v)}
          className="px-3 py-1.5 text-sm rounded bg-stone-700 hover:bg-stone-600 text-stone-100 disabled:opacity-50"
        >
          Reject
        </button>
      </div>

      {rejectOpen && (
        <div className="mt-3 pt-3 border-t border-stone-700/50">
          <label className="block text-xs text-stone-400 mb-1">Rejection reason (required)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-sm text-stone-100"
            placeholder="e.g. Extractor misread currency as EUR instead of USD"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              disabled={isPending || reason.trim().length < 3}
              onClick={() => {
                onReject(entry, reason.trim());
                setRejectOpen(false);
                setReason('');
              }}
              className="px-3 py-1 text-sm rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white"
            >
              Confirm reject
            </button>
            <button
              type="button"
              onClick={() => { setRejectOpen(false); setReason(''); }}
              className="px-3 py-1 text-sm rounded bg-stone-800 text-stone-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function RegulatoryReviewDashboard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [filter, setFilter] = useState({ risk: 'all', country: 'all' });
  const [runStatus, setRunStatus] = useState(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('review_queue')
      .select(`
        *,
        new_fact:new_fact_id (source_url, source_excerpt, confidence)
      `)
      .eq('status', 'pending')
      .order('risk_score', { ascending: false })
      .order('created_at', { ascending: true });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const flattened = (data ?? []).map((row) => ({
      ...row,
      source_url: row.new_fact?.source_url,
      source_excerpt: row.new_fact?.source_excerpt,
      confidence: row.new_fact?.confidence,
    }));
    setQueue(flattened);
    setLoading(false);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const handleApprove = useCallback(async (entry) => {
    setPendingIds((s) => new Set(s).add(entry.id));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not signed in');
      const { error: err } = await supabase.rpc('approve_review', {
        p_review_id: entry.id,
        p_actor_id: user.id,
        p_notes: null,
      });
      if (err) throw err;
      setQueue((q) => q.filter((r) => r.id !== entry.id));
    } catch (err) {
      setError(`Approve failed: ${err.message}`);
    } finally {
      setPendingIds((s) => { const n = new Set(s); n.delete(entry.id); return n; });
    }
  }, []);

  const handleReject = useCallback(async (entry, reason) => {
    setPendingIds((s) => new Set(s).add(entry.id));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not signed in');
      const { error: err } = await supabase.rpc('reject_review', {
        p_review_id: entry.id,
        p_actor_id: user.id,
        p_reason: reason,
      });
      if (err) throw err;
      setQueue((q) => q.filter((r) => r.id !== entry.id));
    } catch (err) {
      setError(`Reject failed: ${err.message}`);
    } finally {
      setPendingIds((s) => { const n = new Set(s); n.delete(entry.id); return n; });
    }
  }, []);

  const handleRunResearcher = useCallback(async () => {
    setRunStatus({ state: 'running', message: 'Running researcher agent…' });
    try {
      const { data, error: err } = await supabase.functions.invoke('researcher-agent', { body: {} });
      if (err) throw err;
      setRunStatus({ state: 'done', message: `Researcher done. ${data?.summary?.facts_extracted ?? 0} facts extracted.` });
      // Now run updater
      const { data: updData, error: updErr } = await supabase.functions.invoke('updater-agent', { body: {} });
      if (updErr) throw updErr;
      setRunStatus({
        state: 'done',
        message: `Sweep complete. ${data?.summary?.facts_extracted ?? 0} facts extracted, ${updData?.summary?.auto_approved ?? 0} auto-approved, ${(updData?.summary?.queued_low ?? 0) + (updData?.summary?.queued_medium ?? 0) + (updData?.summary?.queued_high ?? 0)} queued for review.`,
      });
      await loadQueue();
    } catch (err) {
      setRunStatus({ state: 'error', message: `Run failed: ${err.message}` });
    }
  }, [loadQueue]);

  const filtered = useMemo(() => {
    return queue.filter((e) => {
      if (filter.risk !== 'all' && e.risk_score !== filter.risk) return false;
      if (filter.country !== 'all' && e.country_code !== filter.country) return false;
      return true;
    });
  }, [queue, filter]);

  const counts = useMemo(() => {
    return queue.reduce(
      (acc, e) => {
        acc.total += 1;
        acc[e.risk_score] = (acc[e.risk_score] ?? 0) + 1;
        return acc;
      },
      { total: 0 },
    );
  }, [queue]);

  const availableCountries = useMemo(() => {
    return Array.from(new Set(queue.map((e) => e.country_code))).sort();
  }, [queue]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-stone-100 mb-1">Regulatory Review Queue</h1>
        <p className="text-sm text-stone-400">
          Approve or reject fact changes proposed by the research agents. Approved
          values go live immediately across all lessons and PDFs.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          type="button"
          onClick={loadQueue}
          className="px-3 py-1.5 text-sm rounded bg-stone-800 hover:bg-stone-700 text-stone-200"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={handleRunResearcher}
          disabled={runStatus?.state === 'running'}
          className="px-3 py-1.5 text-sm rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white font-medium"
        >
          {runStatus?.state === 'running' ? 'Running…' : 'Run full sweep now'}
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span>{counts.total} pending</span>
          {counts.high > 0 && <span className="text-rose-300">· {counts.high} high</span>}
          {counts.medium > 0 && <span className="text-amber-300">· {counts.medium} medium</span>}
          {counts.low > 0 && <span className="text-emerald-300">· {counts.low} low</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-stone-400">Risk:</span>
          <select
            value={filter.risk}
            onChange={(e) => setFilter((f) => ({ ...f, risk: e.target.value }))}
            className="bg-stone-900 border border-stone-700 rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-stone-400">Country:</span>
          <select
            value={filter.country}
            onChange={(e) => setFilter((f) => ({ ...f, country: e.target.value }))}
            className="bg-stone-900 border border-stone-700 rounded px-2 py-1"
          >
            <option value="all">All</option>
            {availableCountries.map((c) => (
              <option key={c} value={c}>{flagOf(c)} {COUNTRY_META[c]?.name ?? c}</option>
            ))}
          </select>
        </label>
      </div>

      {runStatus && (
        <div
          className={`mb-4 p-3 rounded border text-sm ${
            runStatus.state === 'error'
              ? 'bg-rose-900/30 border-rose-700/50 text-rose-200'
              : runStatus.state === 'done'
                ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-200'
                : 'bg-amber-900/30 border-amber-700/50 text-amber-200'
          }`}
        >
          {runStatus.message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded border bg-rose-900/30 border-rose-700/50 text-rose-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-stone-400 text-center py-12">Loading review queue…</div>
      ) : filtered.length === 0 ? (
        <div className="text-stone-400 text-center py-12">
          {queue.length === 0
            ? 'Nothing to review. Agents will queue new items on their next sweep.'
            : 'No items match the current filter.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <ReviewRow
              key={entry.id}
              entry={entry}
              onApprove={handleApprove}
              onReject={handleReject}
              isPending={pendingIds.has(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
