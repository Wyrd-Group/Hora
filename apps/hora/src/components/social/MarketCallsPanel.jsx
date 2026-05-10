import React, { useState, useMemo, useCallback } from 'react';
import { useSocialExtStore } from '../../store/socialExtStore';
import AdCardInline from '../ads/AdCardInline';

// ── Constants ────────────────────────────────────────────────────────
const INSTRUMENTS = [
  { id: 'BTC',  name: 'Bitcoin' },
  { id: 'ETH',  name: 'Ethereum' },
  { id: 'AAPL', name: 'Apple' },
  { id: 'TSLA', name: 'Tesla' },
  { id: 'NVDA', name: 'Nvidia' },
  { id: 'MSFT', name: 'Microsoft' },
  { id: 'GOLD', name: 'Gold' },
  { id: 'OIL',  name: 'Crude Oil' },
];

const DIRECTION_META = {
  bullish:  { label: 'BULLISH',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: '\u2191' },
  bearish:  { label: 'BEARISH',  color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    icon: '\u2193' },
  neutral:  { label: 'NEUTRAL',  color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: '\u2194' },
};

const MAX_ACTIVE_CALLS = 3;

// ── Helpers ──────────────────────────────────────────────────────────
function timeRemaining(resolvesAt) {
  const diff = resolvesAt - Date.now();
  if (diff <= 0) return 'Resolving...';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── New Call Form ────────────────────────────────────────────────────
function NewCallForm({ onSubmit, onCancel }) {
  const [instrument, setInstrument] = useState(INSTRUMENTS[0].id);
  const [direction, setDirection] = useState('bullish');
  const [targetPrice, setTargetPrice] = useState('');
  const [resolvesIn, setResolvesIn] = useState('24'); // hours

  const handleSubmit = () => {
    const now = Date.now();
    onSubmit({
      instrumentId: instrument,
      instrumentName: INSTRUMENTS.find((i) => i.id === instrument)?.name || instrument,
      direction,
      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      createdAt: now,
      resolvesAt: now + parseInt(resolvesIn, 10) * 3_600_000,
      priceAtCreation: 0, // caller should set real price
    });
  };

  return (
    <div className="border border-[#00e5ff]/20 bg-[#060a12]/95 rounded-lg p-3 mb-3">
      <div className="text-[9px] font-mono tracking-widest uppercase text-[#00e5ff]/60 mb-3">
        New Market Call
      </div>

      {/* Instrument */}
      <div className="mb-2">
        <label className="text-[8px] font-mono tracking-wider uppercase text-white/30 block mb-1">
          Instrument
        </label>
        <select
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-[11px] font-mono text-tactical-text focus:outline-none focus:border-[#00e5ff]/30"
        >
          {INSTRUMENTS.map((inst) => (
            <option key={inst.id} value={inst.id} className="bg-[#0a0e18]">
              {inst.id} - {inst.name}
            </option>
          ))}
        </select>
      </div>

      {/* Direction */}
      <div className="mb-2">
        <label className="text-[8px] font-mono tracking-wider uppercase text-white/30 block mb-1">
          Direction
        </label>
        <div className="flex gap-1">
          {Object.entries(DIRECTION_META).map(([dir, meta]) => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className={`flex-1 py-1.5 rounded text-[9px] font-mono font-bold tracking-wider border transition-all ${
                direction === dir
                  ? `${meta.bg} ${meta.border} ${meta.color}`
                  : 'bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50'
              }`}
            >
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>
      </div>

      {/* Target price (optional) */}
      <div className="mb-2">
        <label className="text-[8px] font-mono tracking-wider uppercase text-white/30 block mb-1">
          Target Price (optional)
        </label>
        <input
          type="number"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          placeholder="--"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-[11px] font-mono text-tactical-text placeholder:text-white/15 focus:outline-none focus:border-[#00e5ff]/30"
        />
      </div>

      {/* Resolution time */}
      <div className="mb-3">
        <label className="text-[8px] font-mono tracking-wider uppercase text-white/30 block mb-1">
          Resolves In
        </label>
        <select
          value={resolvesIn}
          onChange={(e) => setResolvesIn(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-[11px] font-mono text-tactical-text focus:outline-none focus:border-[#00e5ff]/30"
        >
          <option value="1" className="bg-[#0a0e18]">1 Hour</option>
          <option value="4" className="bg-[#0a0e18]">4 Hours</option>
          <option value="24" className="bg-[#0a0e18]">1 Day</option>
          <option value="168" className="bg-[#0a0e18]">1 Week</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 rounded text-[10px] font-mono text-white/30 border border-white/[0.06] hover:text-white/50 hover:border-white/10 transition-all"
        >
          CANCEL
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 py-1.5 rounded text-[10px] font-mono font-bold text-[#00e5ff] bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/15 transition-all"
        >
          PLACE CALL
        </button>
      </div>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────
export default function MarketCallsPanel() {
  const [showForm, setShowForm] = useState(false);

  const marketCalls = useSocialExtStore((s) => s.marketCalls);
  const credibility = useSocialExtStore((s) => s.credibility);
  const totalCallsMade = useSocialExtStore((s) => s.totalCallsMade);
  const correctCalls = useSocialExtStore((s) => s.correctCalls);
  const followers = useSocialExtStore((s) => s.followers);
  const createMarketCall = useSocialExtStore((s) => s.createMarketCall);

  const activeCalls = useMemo(
    () => marketCalls.filter((c) => !c.resolved),
    [marketCalls],
  );
  const resolvedCalls = useMemo(
    () => marketCalls.filter((c) => c.resolved).slice(-20).reverse(),
    [marketCalls],
  );
  const accuracy = totalCallsMade > 0 ? Math.round((correctCalls / totalCallsMade) * 100) : 0;
  const isMarketMover = followers >= 10_000;

  const handleNewCall = useCallback(
    (call) => {
      createMarketCall(call);
      setShowForm(false);
    },
    [createMarketCall],
  );

  // Credibility color
  const credColor =
    credibility >= 70 ? 'text-emerald-400' : credibility >= 40 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="border border-tactical-border/30 bg-[#0a0e18]/80 rounded-lg p-4 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-[10px] tracking-widest uppercase text-white/50">
            Market Calls
          </h3>
          {isMarketMover && (
            <span className="text-[8px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 tracking-wider">
              MARKET MOVER
            </span>
          )}
        </div>
        <div className={`text-[10px] font-mono font-bold ${credColor} tabular-nums`}>
          {credibility}/100
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="border border-white/[0.06] bg-white/[0.02] rounded-md p-2 text-center">
          <div className="text-xs font-mono font-bold text-tactical-text tabular-nums">
            {totalCallsMade}
          </div>
          <div className="text-[8px] font-mono text-white/30 tracking-wider uppercase mt-0.5">
            Total
          </div>
        </div>
        <div className="border border-white/[0.06] bg-white/[0.02] rounded-md p-2 text-center">
          <div className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
            {accuracy}%
          </div>
          <div className="text-[8px] font-mono text-white/30 tracking-wider uppercase mt-0.5">
            Accuracy
          </div>
        </div>
        <div className="border border-white/[0.06] bg-white/[0.02] rounded-md p-2 text-center">
          <div className="text-xs font-mono font-bold text-amber-400 tabular-nums">
            {activeCalls.length}/{MAX_ACTIVE_CALLS}
          </div>
          <div className="text-[8px] font-mono text-white/30 tracking-wider uppercase mt-0.5">
            Active
          </div>
        </div>
      </div>

      {/* New Call form / button */}
      {showForm ? (
        <NewCallForm onSubmit={handleNewCall} onCancel={() => setShowForm(false)} />
      ) : (
        activeCalls.length < MAX_ACTIVE_CALLS && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-2 mb-3 rounded text-[10px] font-mono font-bold tracking-wider text-[#00e5ff]/60 border border-dashed border-cyan-500/20 hover:border-cyan-500/40 hover:text-[#00e5ff] bg-cyan-500/[0.03] transition-all"
          >
            + NEW MARKET CALL
          </button>
        )
      )}

      {/* Active calls */}
      {activeCalls.length > 0 && (
        <div className="mb-3">
          <div className="text-[8px] font-mono tracking-widest uppercase text-white/30 mb-2">
            Active Calls
          </div>
          <div className="space-y-1">
            {activeCalls.map((call) => {
              const dm = DIRECTION_META[call.direction] || DIRECTION_META.neutral;
              return (
                <div
                  key={call.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-white/[0.02] border border-white/[0.04]"
                >
                  <span className="text-[10px] font-mono font-bold text-tactical-text">
                    {call.instrumentId}
                  </span>
                  <span className={`text-[9px] font-mono font-bold tracking-wider ${dm.color}`}>
                    {dm.icon} {dm.label}
                  </span>
                  <span className="text-[9px] font-mono text-white/25 tabular-nums">
                    {timeRemaining(call.resolvesAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolved calls history */}
      {resolvedCalls.length > 0 && (
        <div>
          <div className="text-[8px] font-mono tracking-widest uppercase text-white/30 mb-2">
            History
          </div>
          <div className="space-y-0.5">
            {resolvedCalls.slice(0, 8).map((call) => {
              const dm = DIRECTION_META[call.direction] || DIRECTION_META.neutral;
              return (
                <div
                  key={call.id}
                  className="flex items-center justify-between py-1 px-2 rounded bg-white/[0.01]"
                >
                  <span className="text-[9px] font-mono text-white/40">
                    {call.instrumentId} {dm.icon}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold ${
                      call.correct ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {call.correct ? 'CORRECT' : 'WRONG'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeCalls.length === 0 && resolvedCalls.length === 0 && (
        <div className="text-center py-4 text-[10px] font-mono text-white/20">
          No calls yet. Place your first market call above.
        </div>
      )}

      <AdCardInline variant="wide" />
    </div>
  );
}
