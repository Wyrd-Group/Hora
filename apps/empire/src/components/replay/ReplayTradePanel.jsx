/**
 * ReplayTradePanel.jsx -- Trade panel during replay sessions.
 * Buy/Sell any of the 500 instruments, limit orders, options, leveraged positions,
 * holdings display, transaction log.
 */

import { useState, useCallback, useMemo } from 'react';
import { useReplayStore } from '../../store/replayStore';
import { getScenarioById } from '../../data/replayScenarios';
import { ALL_INSTRUMENTS } from '../../data/instruments';
import { getCachedReplayPrices } from '../../lib/replayPriceGenerator';
import { useTranslation } from '../../lib/i18n';

// ── Helpers ────────────────────────────────────────────────────────

function fmt(n, decimals = 2) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPrice(n) {
  if (n >= 10000) return fmt(n, 0);
  if (n >= 100) return fmt(n, 1);
  if (n >= 1) return fmt(n, 2);
  if (n >= 0.01) return n.toFixed(4);
  return n.toFixed(8);
}

// ── Sub-tabs ──────────────────────────────────────────────────────

const TAB_IDS = [
  { id: 'trade', tKey: 'exchange.trade' },
  { id: 'limit', tKey: 'exchange.limit' },
  { id: 'options', tKey: 'exchange.options' },
  { id: 'leverage', tKey: 'exchange.leverage' },
  { id: 'holdings', tKey: 'exchange.holdings' },
  { id: 'history', tKey: 'exchange.log' },
];

export default function ReplayTradePanel({ selectedInstrument, onSelectInstrument }) {
  const { t } = useTranslation();
  const activeScenarioId = useReplayStore(s => s.activeScenarioId);
  const currentTick = useReplayStore(s => s.currentTick);
  const replayBalance = useReplayStore(s => s.replayBalance);
  const replayHoldings = useReplayStore(s => s.replayHoldings);
  const tradeHistory = useReplayStore(s => s.tradeHistory);
  const executeTrade = useReplayStore(s => s.executeTrade);
  const limitOrders = useReplayStore(s => s.limitOrders);
  const placeLimitOrder = useReplayStore(s => s.placeLimitOrder);
  const cancelLimitOrder = useReplayStore(s => s.cancelLimitOrder);
  const optionPositions = useReplayStore(s => s.optionPositions);
  const buyOption = useReplayStore(s => s.buyOption);
  const exerciseOption = useReplayStore(s => s.exerciseOption);
  const leveragedPositions = useReplayStore(s => s.leveragedPositions);
  const openLeveraged = useReplayStore(s => s.openLeveraged);
  const closeLeveraged = useReplayStore(s => s.closeLeveraged);

  const scenario = activeScenarioId ? getScenarioById(activeScenarioId) : null;

  const [qty, setQty] = useState('1');
  const [activeTab, setActiveTab] = useState('trade');

  // Limit order state
  const [limitSide, setLimitSide] = useState('buy');
  const [limitCondition, setLimitCondition] = useState('below');
  const [limitPrice, setLimitPrice] = useState('');
  const [limitQty, setLimitQty] = useState('1');

  // Option state
  const [optType, setOptType] = useState('call');
  const [optStrike, setOptStrike] = useState('');
  const [optQty, setOptQty] = useState('1');
  const [optExpiry, setOptExpiry] = useState('50');

  // Leveraged state
  const [levSide, setLevSide] = useState('long');
  const [levMultiplier, setLevMultiplier] = useState(2);
  const [levQty, setLevQty] = useState('1');

  // Get current price for selected instrument
  const allPrices = useMemo(() => {
    if (!scenario) return {};
    return getCachedReplayPrices(scenario);
  }, [scenario]);

  const currentPrice = useMemo(() => {
    if (!selectedInstrument || !allPrices[selectedInstrument]) return 0;
    const prices = allPrices[selectedInstrument];
    return prices[Math.min(currentTick, prices.length - 1)];
  }, [allPrices, selectedInstrument, currentTick]);

  const instrumentInfo = useMemo(() => {
    return ALL_INSTRUMENTS.find(i => i.id === selectedInstrument);
  }, [selectedInstrument]);

  const parsedQty = Math.max(0, parseFloat(qty) || 0);
  const orderTotal = parsedQty * currentPrice;

  const canBuy = parsedQty > 0 && orderTotal <= replayBalance && orderTotal > 0;
  const holding = replayHoldings[selectedInstrument];
  const canSell = parsedQty > 0 && holding && holding.qty >= parsedQty;

  const handleBuy = useCallback(() => {
    if (!canBuy) return;
    executeTrade(selectedInstrument, parsedQty, currentPrice, 'buy');
  }, [canBuy, executeTrade, selectedInstrument, parsedQty, currentPrice]);

  const handleSell = useCallback(() => {
    if (!canSell) return;
    executeTrade(selectedInstrument, parsedQty, currentPrice, 'sell');
  }, [canSell, executeTrade, selectedInstrument, parsedQty, currentPrice]);

  // Quick qty buttons
  const quickQty = useCallback((fraction) => {
    if (currentPrice <= 0) return;
    const maxQty = Math.floor((replayBalance * fraction) / currentPrice);
    setQty(String(Math.max(1, maxQty)));
  }, [replayBalance, currentPrice]);

  // Limit order handlers
  const handlePlaceLimit = useCallback(() => {
    const lq = parseFloat(limitQty);
    const lp = parseFloat(limitPrice);
    if (!lq || !lp || lq <= 0 || lp <= 0) return;
    placeLimitOrder({
      instrumentId: selectedInstrument,
      side: limitSide,
      qty: lq,
      triggerPrice: lp,
      condition: limitCondition,
    });
    setLimitPrice('');
  }, [limitQty, limitPrice, limitSide, limitCondition, selectedInstrument, placeLimitOrder]);

  // Option handler
  const handleBuyOption = useCallback(() => {
    const oq = parseInt(optQty);
    const os = parseFloat(optStrike) || currentPrice;
    const oe = parseInt(optExpiry) || 50;
    if (!oq || oq <= 0) return;
    buyOption(selectedInstrument, optType, os, oq, oe);
  }, [optQty, optStrike, optType, optExpiry, selectedInstrument, currentPrice, buyOption]);

  // Leveraged handler
  const handleOpenLeveraged = useCallback(() => {
    const lq = parseFloat(levQty);
    if (!lq || lq <= 0) return;
    openLeveraged(selectedInstrument, levSide, levMultiplier, lq);
  }, [levQty, levSide, levMultiplier, selectedInstrument, openLeveraged]);

  // Holdings summary with current prices
  const holdingsEntries = useMemo(() => {
    return Object.entries(replayHoldings).map(([id, h]) => {
      const prices = allPrices[id];
      const price = prices ? prices[Math.min(currentTick, prices.length - 1)] : 0;
      const value = h.qty * price;
      const cost = h.qty * h.avgCost;
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      const inst = ALL_INSTRUMENTS.find(i => i.id === id);
      return { id, ...h, price, value, pnl, pnlPct, symbol: inst?.symbol ?? id.toUpperCase() };
    }).sort((a, b) => b.value - a.value);
  }, [replayHoldings, allPrices, currentTick]);

  // Recent trades (reversed, last 30)
  const recentTrades = useMemo(() => {
    return [...tradeHistory].reverse().slice(0, 30);
  }, [tradeHistory]);

  // Portfolio value
  const portfolioValue = useMemo(() => {
    let total = replayBalance;
    for (const h of holdingsEntries) total += h.value;
    // Add open option intrinsic value
    for (const opt of optionPositions) {
      if (opt.status !== 'open') continue;
      const prices = allPrices[opt.instrumentId];
      if (!prices) continue;
      const cp = prices[Math.min(currentTick, prices.length - 1)];
      if (opt.type === 'call' && cp > opt.strikePrice) total += (cp - opt.strikePrice) * opt.qty * 100;
      else if (opt.type === 'put' && cp < opt.strikePrice) total += (opt.strikePrice - cp) * opt.qty * 100;
    }
    // Add open leveraged P&L
    for (const pos of leveragedPositions) {
      if (pos.status !== 'open') continue;
      const prices = allPrices[pos.instrumentId];
      if (!prices) continue;
      const cp = prices[Math.min(currentTick, prices.length - 1)];
      const delta = pos.side === 'long' ? cp - pos.entryPrice : pos.entryPrice - cp;
      total += Math.max(0, pos.margin + delta * pos.qty * pos.leverage);
    }
    return total;
  }, [replayBalance, holdingsEntries, optionPositions, leveragedPositions, allPrices, currentTick]);

  // Active counts for tab badges
  const activeOrderCount = limitOrders.filter(o => o.status === 'active').length;
  const openOptionCount = optionPositions.filter(o => o.status === 'open').length;
  const openLevCount = leveragedPositions.filter(p => p.status === 'open').length;

  if (!scenario) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Portfolio summary */}
      <div className="px-3 py-2 border-b border-tactical-border/20 bg-[#060a12]/60">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] font-mono uppercase tracking-widest text-tactical-text/25">{t('exchange.portfolio')}</span>
          <span className="text-[11px] font-mono text-tactical-text font-semibold tabular-nums">${fmt(portfolioValue, 0)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-tactical-text/20">{t('exchange.cash')}</span>
          <span className="text-[9px] font-mono text-tactical-text/50 tabular-nums">${fmt(replayBalance, 0)}</span>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex border-b border-tactical-border/20 overflow-x-auto">
        {TAB_IDS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 text-[7px] font-mono uppercase tracking-[0.15em] px-2 py-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-[#00e5ff] border-b border-[#00e5ff]/40'
                : 'text-tactical-text/25 hover:text-tactical-text/40'
            }`}
          >
            {t(tab.tKey)}
            {tab.id === 'limit' && activeOrderCount > 0 && (
              <span className="ml-0.5 text-amber-400/50">({activeOrderCount})</span>
            )}
            {tab.id === 'options' && openOptionCount > 0 && (
              <span className="ml-0.5 text-purple-400/50">({openOptionCount})</span>
            )}
            {tab.id === 'leverage' && openLevCount > 0 && (
              <span className="ml-0.5 text-rose-400/50">({openLevCount})</span>
            )}
            {tab.id === 'holdings' && holdingsEntries.length > 0 && (
              <span className="ml-0.5 text-tactical-text/15">({holdingsEntries.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Market Trade Tab ── */}
      {activeTab === 'trade' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Selected instrument */}
          <div className="bg-[#0a0f1a]/60 border border-tactical-border/20 rounded p-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#00e5ff] font-semibold">
                  {instrumentInfo?.symbol ?? selectedInstrument?.toUpperCase()}
                </span>
                <span className="text-[7px] font-mono text-tactical-text/20 ml-2">
                  {instrumentInfo?.type?.toUpperCase()}
                </span>
              </div>
              <span className="text-[12px] font-mono text-tactical-text font-semibold tabular-nums">
                ${formatPrice(currentPrice)}
              </span>
            </div>
            {holding && (
              <div className="mt-1 text-[8px] font-mono text-tactical-text/30">
                Holding: <span className="text-tactical-text/50">{holding.qty}</span> @ <span className="text-tactical-text/40">${formatPrice(holding.avgCost)}</span>
              </div>
            )}
          </div>

          {/* Qty input */}
          <div>
            <label className="text-[8px] font-mono text-tactical-text/30 uppercase tracking-widest block mb-1">{t('exchange.quantity')}</label>
            <input
              type="number" min="0" step="any" value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full bg-[#0a0f1a]/60 border border-tactical-border/30 rounded px-2 py-1.5 text-[11px] font-mono text-tactical-text tabular-nums focus:outline-none focus:border-[#00e5ff]/30"
            />
            <div className="flex gap-1 mt-1">
              {[0.1, 0.25, 0.5, 1].map(frac => (
                <button key={frac} onClick={() => quickQty(frac)}
                  className="flex-1 text-[7px] font-mono text-tactical-text/25 hover:text-tactical-text/40 border border-tactical-border/15 rounded py-0.5 transition-colors">
                  {frac === 1 ? t('exchange.maxShares') : `${frac * 100}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Order total */}
          <div className="text-[9px] font-mono text-tactical-text/30">
            {t('exchange.total')}: <span className="text-tactical-text/60 tabular-nums">${fmt(orderTotal, orderTotal >= 100 ? 0 : 2)}</span>
          </div>

          {/* Buy / Sell */}
          <div className="flex gap-2">
            <button onClick={handleBuy} disabled={!canBuy}
              className={`flex-1 text-[9px] font-mono uppercase tracking-widest py-2 rounded border transition-colors ${
                canBuy ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-tactical-border/10 text-tactical-text/15 cursor-not-allowed'
              }`}>{t('exchange.buy')}</button>
            <button onClick={handleSell} disabled={!canSell}
              className={`flex-1 text-[9px] font-mono uppercase tracking-widest py-2 rounded border transition-colors ${
                canSell ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10' : 'border-tactical-border/10 text-tactical-text/15 cursor-not-allowed'
              }`}>{t('exchange.sell')}</button>
          </div>
        </div>
      )}

      {/* ── Limit Orders Tab ── */}
      {activeTab === 'limit' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="text-[8px] font-mono text-tactical-text/30 mb-1">
            Auto-execute when {instrumentInfo?.symbol ?? selectedInstrument?.toUpperCase()} crosses threshold
          </div>

          {/* Side */}
          <div className="flex gap-1">
            {['buy', 'sell'].map(s => (
              <button key={s} onClick={() => setLimitSide(s)}
                className={`flex-1 text-[8px] font-mono uppercase py-1 rounded border transition-colors ${
                  limitSide === s
                    ? (s === 'buy' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-rose-500/30 text-rose-400 bg-rose-500/5')
                    : 'border-tactical-border/15 text-tactical-text/25'
                }`}>{s}</button>
            ))}
          </div>

          {/* Condition */}
          <div className="flex gap-1">
            {[{ id: 'below', label: 'Price drops to' }, { id: 'above', label: 'Price rises to' }].map(c => (
              <button key={c.id} onClick={() => setLimitCondition(c.id)}
                className={`flex-1 text-[7px] font-mono py-1 rounded border transition-colors ${
                  limitCondition === c.id ? 'border-[#00e5ff]/30 text-[#00e5ff]/70 bg-[#00e5ff]/5' : 'border-tactical-border/15 text-tactical-text/25'
                }`}>{c.label}</button>
            ))}
          </div>

          {/* Trigger price */}
          <div>
            <label className="text-[7px] font-mono text-tactical-text/25 uppercase tracking-widest block mb-0.5">Trigger Price</label>
            <input type="number" step="any" value={limitPrice} onChange={e => setLimitPrice(e.target.value)}
              placeholder={formatPrice(currentPrice)}
              className="w-full bg-[#0a0f1a]/60 border border-tactical-border/30 rounded px-2 py-1 text-[10px] font-mono text-tactical-text tabular-nums focus:outline-none focus:border-[#00e5ff]/30" />
          </div>

          {/* Qty */}
          <div>
            <label className="text-[7px] font-mono text-tactical-text/25 uppercase tracking-widest block mb-0.5">Quantity</label>
            <input type="number" min="0" step="any" value={limitQty} onChange={e => setLimitQty(e.target.value)}
              className="w-full bg-[#0a0f1a]/60 border border-tactical-border/30 rounded px-2 py-1 text-[10px] font-mono text-tactical-text tabular-nums focus:outline-none focus:border-[#00e5ff]/30" />
          </div>

          <button onClick={handlePlaceLimit}
            className="w-full text-[9px] font-mono uppercase tracking-widest py-2 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors">
            Place Limit Order
          </button>

          {/* Active orders list */}
          {limitOrders.filter(o => o.status === 'active').length > 0 && (
            <div className="border-t border-tactical-border/10 pt-2 mt-2 space-y-1">
              <span className="text-[7px] font-mono text-tactical-text/20 uppercase tracking-widest">Active Orders</span>
              {limitOrders.filter(o => o.status === 'active').map(o => {
                const inst = ALL_INSTRUMENTS.find(i => i.id === o.instrumentId);
                return (
                  <div key={o.id} className="flex items-center justify-between bg-[#0a0f1a]/40 border border-tactical-border/10 rounded px-2 py-1">
                    <div className="text-[8px] font-mono">
                      <span className={o.side === 'buy' ? 'text-emerald-400/60' : 'text-rose-400/60'}>{o.side.toUpperCase()}</span>
                      <span className="text-tactical-text/40 ml-1">{inst?.symbol ?? o.instrumentId}</span>
                      <span className="text-tactical-text/25 ml-1">x{o.qty}</span>
                      <span className="text-tactical-text/25 ml-1">@ ${formatPrice(o.triggerPrice)}</span>
                      <span className="text-tactical-text/15 ml-1">({o.condition})</span>
                    </div>
                    <button onClick={() => cancelLimitOrder(o.id)} className="text-[7px] font-mono text-rose-400/40 hover:text-rose-400 transition-colors">x</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filled/cancelled history */}
          {limitOrders.filter(o => o.status !== 'active').length > 0 && (
            <div className="border-t border-tactical-border/10 pt-2 space-y-0.5">
              <span className="text-[7px] font-mono text-tactical-text/15 uppercase tracking-widest">History</span>
              {limitOrders.filter(o => o.status !== 'active').slice(-5).reverse().map(o => {
                const inst = ALL_INSTRUMENTS.find(i => i.id === o.instrumentId);
                return (
                  <div key={o.id} className="text-[7px] font-mono text-tactical-text/20">
                    <span className={o.status === 'filled' ? 'text-emerald-400/40' : 'text-rose-400/30'}>{o.status}</span>
                    <span className="ml-1">{o.side} {inst?.symbol} x{o.qty} @ ${formatPrice(o.triggerPrice)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Options Tab ── */}
      {activeTab === 'options' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="text-[8px] font-mono text-tactical-text/30 mb-1">
            Options on {instrumentInfo?.symbol ?? selectedInstrument?.toUpperCase()} (1 contract = 100 units)
          </div>

          {/* Call / Put */}
          <div className="flex gap-1">
            {['call', 'put'].map(t => (
              <button key={t} onClick={() => setOptType(t)}
                className={`flex-1 text-[8px] font-mono uppercase py-1 rounded border transition-colors ${
                  optType === t
                    ? (t === 'call' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-rose-500/30 text-rose-400 bg-rose-500/5')
                    : 'border-tactical-border/15 text-tactical-text/25'
                }`}>{t}</button>
            ))}
          </div>

          {/* Strike */}
          <div>
            <label className="text-[7px] font-mono text-tactical-text/25 uppercase tracking-widest block mb-0.5">Strike Price</label>
            <input type="number" step="any" value={optStrike} onChange={e => setOptStrike(e.target.value)}
              placeholder={formatPrice(currentPrice)}
              className="w-full bg-[#0a0f1a]/60 border border-tactical-border/30 rounded px-2 py-1 text-[10px] font-mono text-tactical-text tabular-nums focus:outline-none focus:border-[#00e5ff]/30" />
            <div className="flex gap-1 mt-1">
              {[0.9, 0.95, 1, 1.05, 1.1].map(m => (
                <button key={m} onClick={() => setOptStrike((currentPrice * m).toFixed(2))}
                  className="flex-1 text-[6px] font-mono text-tactical-text/20 hover:text-tactical-text/40 border border-tactical-border/10 rounded py-0.5">
                  {m === 1 ? 'ATM' : m < 1 ? `${((1-m)*100).toFixed(0)}%↓` : `${((m-1)*100).toFixed(0)}%↑`}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="text-[7px] font-mono text-tactical-text/25 uppercase tracking-widest block mb-0.5">Expiry (ticks)</label>
            <div className="flex gap-1">
              {[25, 50, 100, 200].map(t => (
                <button key={t} onClick={() => setOptExpiry(String(t))}
                  className={`flex-1 text-[7px] font-mono py-1 rounded border transition-colors ${
                    optExpiry === String(t) ? 'border-[#00e5ff]/30 text-[#00e5ff]/70 bg-[#00e5ff]/5' : 'border-tactical-border/15 text-tactical-text/25'
                  }`}>{t}t</button>
              ))}
            </div>
          </div>

          {/* Contracts */}
          <div>
            <label className="text-[7px] font-mono text-tactical-text/25 uppercase tracking-widest block mb-0.5">Contracts</label>
            <input type="number" min="1" value={optQty} onChange={e => setOptQty(e.target.value)}
              className="w-full bg-[#0a0f1a]/60 border border-tactical-border/30 rounded px-2 py-1 text-[10px] font-mono text-tactical-text tabular-nums focus:outline-none focus:border-[#00e5ff]/30" />
          </div>

          {/* Premium estimate */}
          {(() => {
            const strike = parseFloat(optStrike) || currentPrice;
            const expiry = parseInt(optExpiry) || 50;
            const timeYears = expiry / 250;
            const intrinsic = optType === 'call' ? Math.max(0, currentPrice - strike) : Math.max(0, strike - currentPrice);
            const timeValue = currentPrice * 0.3 * Math.sqrt(Math.max(0.001, timeYears)) * 0.4;
            const premium = Math.max(0.01, intrinsic + timeValue);
            const contracts = parseInt(optQty) || 1;
            const totalCost = premium * contracts * 100;
            return (
              <div className="text-[8px] font-mono text-tactical-text/30 bg-[#0a0f1a]/40 rounded p-2 space-y-0.5">
                <div className="flex justify-between"><span>Premium/unit:</span><span className="text-tactical-text/50">${formatPrice(premium)}</span></div>
                <div className="flex justify-between"><span>Total cost:</span><span className="text-tactical-text/50 font-semibold">${fmt(totalCost, 2)}</span></div>
                <div className="flex justify-between"><span>Break-even:</span>
                  <span className="text-tactical-text/40">
                    ${formatPrice(optType === 'call' ? strike + premium : strike - premium)}
                  </span>
                </div>
              </div>
            );
          })()}

          <button onClick={handleBuyOption}
            className={`w-full text-[9px] font-mono uppercase tracking-widest py-2 rounded border transition-colors ${
              optType === 'call' ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
            }`}>
            Buy {optType.toUpperCase()}
          </button>

          {/* Open positions */}
          {optionPositions.filter(o => o.status === 'open').length > 0 && (
            <div className="border-t border-tactical-border/10 pt-2 space-y-1">
              <span className="text-[7px] font-mono text-tactical-text/20 uppercase tracking-widest">Open Positions</span>
              {optionPositions.filter(o => o.status === 'open').map(o => {
                const inst = ALL_INSTRUMENTS.find(i => i.id === o.instrumentId);
                const prices = allPrices[o.instrumentId];
                const cp = prices ? prices[Math.min(currentTick, prices.length - 1)] : 0;
                const intrinsic = o.type === 'call' ? Math.max(0, cp - o.strikePrice) : Math.max(0, o.strikePrice - cp);
                const pnl = (intrinsic - o.premium) * o.qty * 100;
                const ticksLeft = o.expiryTick - currentTick;
                return (
                  <div key={o.id} className="bg-[#0a0f1a]/40 border border-tactical-border/10 rounded px-2 py-1.5">
                    <div className="flex items-center justify-between text-[8px] font-mono">
                      <div>
                        <span className={o.type === 'call' ? 'text-emerald-400/60' : 'text-rose-400/60'}>{o.type.toUpperCase()}</span>
                        <span className="text-tactical-text/40 ml-1">{inst?.symbol}</span>
                        <span className="text-tactical-text/25 ml-1">x{o.qty}</span>
                      </div>
                      <span className={`tabular-nums ${pnl >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
                        {pnl >= 0 ? '+' : ''}{fmt(pnl, 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[7px] font-mono text-tactical-text/20 mt-0.5">
                      <span>Strike ${formatPrice(o.strikePrice)} | {ticksLeft}t left</span>
                      <button onClick={() => exerciseOption(o.id)}
                        className={`px-1.5 py-0.5 rounded border text-[7px] transition-colors ${
                          intrinsic > 0 ? 'border-emerald-500/30 text-emerald-400/60 hover:bg-emerald-500/10' : 'border-tactical-border/10 text-tactical-text/15'
                        }`}>
                        Exercise
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Expired/exercised history */}
          {optionPositions.filter(o => o.status !== 'open').length > 0 && (
            <div className="border-t border-tactical-border/10 pt-2 space-y-0.5">
              <span className="text-[7px] font-mono text-tactical-text/15 uppercase tracking-widest">Closed</span>
              {optionPositions.filter(o => o.status !== 'open').slice(-5).reverse().map(o => {
                const inst = ALL_INSTRUMENTS.find(i => i.id === o.instrumentId);
                return (
                  <div key={o.id} className="text-[7px] font-mono text-tactical-text/20">
                    <span className={o.status === 'exercised' ? 'text-emerald-400/40' : 'text-tactical-text/15'}>{o.status}</span>
                    <span className="ml-1">{o.type} {inst?.symbol} x{o.qty} @ ${formatPrice(o.strikePrice)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Leverage Tab ── */}
      {activeTab === 'leverage' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="text-[8px] font-mono text-tactical-text/30 mb-1">
            Leveraged position on {instrumentInfo?.symbol ?? selectedInstrument?.toUpperCase()}
          </div>

          {/* Long / Short */}
          <div className="flex gap-1">
            {['long', 'short'].map(s => (
              <button key={s} onClick={() => setLevSide(s)}
                className={`flex-1 text-[8px] font-mono uppercase py-1 rounded border transition-colors ${
                  levSide === s
                    ? (s === 'long' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-rose-500/30 text-rose-400 bg-rose-500/5')
                    : 'border-tactical-border/15 text-tactical-text/25'
                }`}>{s}</button>
            ))}
          </div>

          {/* Leverage */}
          <div>
            <label className="text-[7px] font-mono text-tactical-text/25 uppercase tracking-widest block mb-0.5">Leverage</label>
            <div className="flex gap-1">
              {[2, 5, 10].map(l => (
                <button key={l} onClick={() => setLevMultiplier(l)}
                  className={`flex-1 text-[9px] font-mono font-semibold py-1.5 rounded border transition-colors ${
                    levMultiplier === l
                      ? 'border-[#00e5ff]/30 text-[#00e5ff] bg-[#00e5ff]/5'
                      : 'border-tactical-border/15 text-tactical-text/25 hover:text-tactical-text/40'
                  }`}>{l}x</button>
              ))}
            </div>
          </div>

          {/* Qty */}
          <div>
            <label className="text-[7px] font-mono text-tactical-text/25 uppercase tracking-widest block mb-0.5">Quantity</label>
            <input type="number" min="0" step="any" value={levQty} onChange={e => setLevQty(e.target.value)}
              className="w-full bg-[#0a0f1a]/60 border border-tactical-border/30 rounded px-2 py-1 text-[10px] font-mono text-tactical-text tabular-nums focus:outline-none focus:border-[#00e5ff]/30" />
          </div>

          {/* Position details */}
          {(() => {
            const lq = parseFloat(levQty) || 1;
            const notional = currentPrice * lq;
            const margin = notional / levMultiplier;
            const liqPrice = levSide === 'long'
              ? currentPrice * (1 - 1 / levMultiplier)
              : currentPrice * (1 + 1 / levMultiplier);
            return (
              <div className="text-[8px] font-mono text-tactical-text/30 bg-[#0a0f1a]/40 rounded p-2 space-y-0.5">
                <div className="flex justify-between"><span>Entry:</span><span className="text-tactical-text/50">${formatPrice(currentPrice)}</span></div>
                <div className="flex justify-between"><span>Notional:</span><span className="text-tactical-text/50">${fmt(notional, 0)}</span></div>
                <div className="flex justify-between"><span>Margin (collateral):</span><span className="text-tactical-text/50 font-semibold">${fmt(margin, 2)}</span></div>
                <div className="flex justify-between"><span>Liquidation:</span><span className="text-rose-400/50">${formatPrice(liqPrice)}</span></div>
              </div>
            );
          })()}

          <button onClick={handleOpenLeveraged}
            className={`w-full text-[9px] font-mono uppercase tracking-widest py-2 rounded border transition-colors ${
              levSide === 'long' ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
            }`}>
            Open {levMultiplier}x {levSide.toUpperCase()}
          </button>

          {/* Open leveraged positions */}
          {leveragedPositions.filter(p => p.status === 'open').length > 0 && (
            <div className="border-t border-tactical-border/10 pt-2 space-y-1">
              <span className="text-[7px] font-mono text-tactical-text/20 uppercase tracking-widest">Open Positions</span>
              {leveragedPositions.filter(p => p.status === 'open').map(p => {
                const inst = ALL_INSTRUMENTS.find(i => i.id === p.instrumentId);
                const prices = allPrices[p.instrumentId];
                const cp = prices ? prices[Math.min(currentTick, prices.length - 1)] : 0;
                const delta = p.side === 'long' ? cp - p.entryPrice : p.entryPrice - cp;
                const pnl = delta * p.qty * p.leverage;
                const pnlPct = p.margin > 0 ? (pnl / p.margin) * 100 : 0;
                return (
                  <div key={p.id} className="bg-[#0a0f1a]/40 border border-tactical-border/10 rounded px-2 py-1.5">
                    <div className="flex items-center justify-between text-[8px] font-mono">
                      <div>
                        <span className={p.side === 'long' ? 'text-emerald-400/60' : 'text-rose-400/60'}>{p.leverage}x {p.side.toUpperCase()}</span>
                        <span className="text-tactical-text/40 ml-1">{inst?.symbol}</span>
                        <span className="text-tactical-text/25 ml-1">x{p.qty}</span>
                      </div>
                      <span className={`tabular-nums font-semibold ${pnl >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                        {pnl >= 0 ? '+' : ''}{fmt(pnl, 0)} ({pnlPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[7px] font-mono text-tactical-text/20 mt-0.5">
                      <span>Entry ${formatPrice(p.entryPrice)} | Liq ${formatPrice(p.liquidationPrice)}</span>
                      <button onClick={() => closeLeveraged(p.id)}
                        className="px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400/60 hover:bg-amber-500/10 text-[7px] transition-colors">
                        Close
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Closed/liquidated history */}
          {leveragedPositions.filter(p => p.status !== 'open').length > 0 && (
            <div className="border-t border-tactical-border/10 pt-2 space-y-0.5">
              <span className="text-[7px] font-mono text-tactical-text/15 uppercase tracking-widest">Closed</span>
              {leveragedPositions.filter(p => p.status !== 'open').slice(-5).reverse().map(p => {
                const inst = ALL_INSTRUMENTS.find(i => i.id === p.instrumentId);
                return (
                  <div key={p.id} className="text-[7px] font-mono text-tactical-text/20">
                    <span className={p.status === 'liquidated' ? 'text-rose-400/40' : 'text-emerald-400/40'}>{p.status}</span>
                    <span className="ml-1">{p.leverage}x {p.side} {inst?.symbol} x{p.qty} @ ${formatPrice(p.entryPrice)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Holdings Tab ── */}
      {activeTab === 'holdings' && (
        <div className="flex-1 overflow-y-auto p-3">
          {holdingsEntries.length === 0 ? (
            <p className="text-[9px] font-mono text-tactical-text/20 text-center mt-8">No holdings yet</p>
          ) : (
            <div className="space-y-1">
              {holdingsEntries.map(h => (
                <button key={h.id} onClick={() => onSelectInstrument(h.id)}
                  className={`w-full text-left flex items-center justify-between bg-[#0a0f1a]/40 border rounded px-2 py-1.5 transition-colors ${
                    h.id === selectedInstrument ? 'border-[#00e5ff]/20' : 'border-tactical-border/10 hover:border-tactical-border/20'
                  }`}>
                  <div>
                    <span className="text-[9px] font-mono text-tactical-text/60 uppercase">{h.symbol}</span>
                    <span className="text-[8px] font-mono text-tactical-text/25 ml-2">x{h.qty}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono text-tactical-text/50 tabular-nums">${fmt(h.value, 0)}</span>
                    <span className={`text-[8px] font-mono ml-2 tabular-nums ${h.pnl >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
                      {h.pnl >= 0 ? '+' : ''}{fmt(h.pnl, 0)} ({h.pnlPct.toFixed(1)}%)
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── History Tab ── */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-3">
          {recentTrades.length === 0 ? (
            <p className="text-[9px] font-mono text-tactical-text/20 text-center mt-8">No trades yet</p>
          ) : (
            <div className="space-y-1">
              {recentTrades.map((t, i) => {
                const inst = ALL_INSTRUMENTS.find(ins => ins.id === t.instrumentId);
                return (
                  <div key={i} className="flex items-center justify-between text-[8px] font-mono border-b border-tactical-border/5 pb-1">
                    <div className="flex items-center gap-2">
                      <span className={t.side === 'buy' ? 'text-emerald-400/60' : 'text-rose-400/60'}>
                        {t.side.toUpperCase()}
                      </span>
                      <span className="text-tactical-text/40 uppercase">{inst?.symbol ?? t.instrumentId}</span>
                      <span className="text-tactical-text/25">x{t.qty}</span>
                      {t.orderType === 'derivative' && (
                        <span className="text-[6px] text-purple-400/40 border border-purple-400/20 px-0.5 rounded">DRV</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-tactical-text/30 tabular-nums">
                      <span>@${formatPrice(t.price)}</span>
                      <span className="text-tactical-text/15">t{t.tick}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
