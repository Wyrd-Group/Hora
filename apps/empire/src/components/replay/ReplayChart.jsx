/**
 * ReplayChart.jsx -- Tick-by-tick price chart for active replay scenario.
 * SVG line + candlestick chart with all 500 instruments, asset type tabs,
 * search, annotations, and technical indicators (SMA, EMA, BB, RSI, MACD).
 */

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useReplayStore } from '../../store/replayStore';
import { getScenarioById } from '../../data/replayScenarios';
import { ALL_INSTRUMENTS } from '../../data/instruments';
import { getCachedReplayPrices } from '../../lib/replayPriceGenerator';
import { sma, ema, bollingerBands, rsi, macd } from '../../lib/indicators';
import AthenaMiniWidget from '../exchange/AthenaMiniWidget';
import { useTranslation } from '../../lib/i18n';

// ── Constants ──────────────────────────────────────────────────────

const CHART_PADDING = { top: 24, right: 16, bottom: 32, left: 64 };

const ASSET_TYPES = [
  { id: 'all', label: 'ALL' },
  { id: 'stock', label: 'STOCKS' },
  { id: 'crypto', label: 'CRYPTO' },
  { id: 'forex', label: 'FOREX' },
  { id: 'commodity', label: 'CMDTY' },
  { id: 'bond', label: 'BONDS' },
];

const INDICATOR_LIST = [
  { id: 'vol', label: 'Volume', color: '#64748b', panel: true },
  { id: 'sma10', label: 'SMA 10', color: '#fbbf24' },
  { id: 'sma20', label: 'SMA 20', color: '#f97316' },
  { id: 'ema12', label: 'EMA 12', color: '#818cf8' },
  { id: 'ema26', label: 'EMA 26', color: '#c084fc' },
  { id: 'bb', label: 'Bollinger', color: '#38bdf8' },
  { id: 'rsi', label: 'RSI 14', color: '#a78bfa', panel: true },
  { id: 'macd', label: 'MACD', color: '#f472b6', panel: true },
];

// ── Helpers ────────────────────────────────────────────────────────

function formatPrice(n) {
  if (n >= 10000) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (n >= 100) return n.toFixed(1);
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(4);
  return n.toFixed(8);
}

// Generate synthetic volume from price movement (larger moves = higher volume)
function generateVolume(prices, seed = 42) {
  if (prices.length < 2) return [];
  const volumes = [0];
  let s = seed;
  const lcg = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s >>> 0) / 4294967296; };
  for (let i = 1; i < prices.length; i++) {
    const move = Math.abs(prices[i] - prices[i - 1]) / prices[i - 1];
    const base = 500000 + move * 20000000; // base volume scales with price move
    const noise = 0.5 + lcg(); // random multiplier 0.5-1.5
    volumes.push(Math.round(base * noise));
  }
  return volumes;
}

// Generate OHLC candles from tick prices (group every N ticks into one candle)
function buildCandles(prices, groupSize = 5) {
  const candles = [];
  for (let i = 0; i < prices.length; i += groupSize) {
    const slice = prices.slice(i, i + groupSize);
    if (slice.length === 0) continue;
    candles.push({
      tick: i,
      open: slice[0],
      high: Math.max(...slice),
      low: Math.min(...slice),
      close: slice[slice.length - 1],
    });
  }
  return candles;
}

// ── Instrument Picker (left panel inside chart area) ──────────────

// Mini sparkline SVG for instrument picker rows
function MiniSparkline({ prices, width = 40, height = 14 }) {
  if (!prices || prices.length < 2) return null;
  // Take last 20 ticks (or fewer if not enough data)
  const slice = prices.slice(-20);
  const lo = Math.min(...slice);
  const hi = Math.max(...slice);
  const range = hi - lo || 1;
  const isUp = slice[slice.length - 1] >= slice[0];
  const color = isUp ? '#10b981' : '#f43f5e';

  const pts = slice.map((p, i) => {
    const x = (i / (slice.length - 1)) * width;
    const y = height - 1 - ((p - lo) / range) * (height - 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

function InstrumentPicker({ selectedId, onSelect, scenario, allPrices, currentTick }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let items = ALL_INSTRUMENTS;
    if (typeFilter !== 'all') items = items.filter(i => i.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.symbol.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.id.includes(q)
      );
    }
    const native = new Set(scenario?.instruments ?? []);
    return items.sort((a, b) => {
      const aN = native.has(a.id) ? 0 : 1;
      const bN = native.has(b.id) ? 0 : 1;
      if (aN !== bN) return aN - bN;
      return 0;
    });
  }, [typeFilter, search, scenario]);

  return (
    <div className="w-72 flex-shrink-0 border-r border-tactical-border/10 flex flex-col overflow-hidden bg-[#060a12]/60">
      {/* Search */}
      <div className="p-2 border-b border-tactical-border/10">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#0a0f1a]/80 border border-tactical-border/20 rounded px-2 py-1 text-[10px] font-mono text-tactical-text placeholder-tactical-text/20 focus:outline-none focus:border-[#00e5ff]/30"
        />
      </div>

      {/* Asset type tabs */}
      <div className="flex flex-wrap gap-0.5 p-1.5 border-b border-tactical-border/10">
        {ASSET_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setTypeFilter(t.id)}
            className={`text-[7px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded transition-colors ${
              typeFilter === t.id
                ? 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20'
                : 'text-tactical-text/25 hover:text-tactical-text/40 border border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Instrument list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(inst => {
          const isNative = scenario?.instruments.includes(inst.id);
          const instPrices = allPrices?.[inst.id];
          const priceSlice = instPrices ? instPrices.slice(0, currentTick + 1) : [];
          const curPrice = priceSlice.length > 0 ? priceSlice[priceSlice.length - 1] : null;
          const startP = instPrices?.[0] ?? 0;
          const chg = startP > 0 && curPrice !== null ? ((curPrice - startP) / startP) * 100 : 0;
          const isUp = chg >= 0;

          return (
            <button
              key={inst.id}
              onClick={() => onSelect(inst.id)}
              className={`w-full text-left px-2 py-1.5 border-b border-tactical-border/5 transition-colors flex items-center gap-1.5 ${
                selectedId === inst.id
                  ? 'bg-[#00e5ff]/8 border-l-2 border-l-[#00e5ff]/40'
                  : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
              }`}
            >
              {/* Symbol + name */}
              <div className="min-w-0 w-16 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] font-mono font-semibold truncate ${
                    selectedId === inst.id ? 'text-[#00e5ff]' : 'text-tactical-text/60'
                  }`}>
                    {inst.symbol}
                  </span>
                  {isNative && (
                    <span className="text-[5px] font-mono text-amber-400/60 bg-amber-400/10 px-0.5 rounded">S</span>
                  )}
                </div>
              </div>

              {/* Mini sparkline */}
              <MiniSparkline prices={priceSlice} width={38} height={14} />

              {/* Price + change */}
              <div className="flex-1 text-right min-w-0">
                {curPrice !== null ? (
                  <>
                    <div className="text-[8px] font-mono text-tactical-text/50 tabular-nums truncate">
                      ${formatPrice(curPrice)}
                    </div>
                    <div className={`text-[7px] font-mono tabular-nums ${isUp ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
                      {isUp ? '+' : ''}{chg.toFixed(1)}%
                    </div>
                  </>
                ) : (
                  <span className="text-[7px] font-mono text-tactical-text/15">--</span>
                )}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-[9px] font-mono text-tactical-text/15 text-center py-4">
            No instruments found
          </p>
        )}
      </div>
    </div>
  );
}

// ── Indicator Overlay Lines (rendered on price SVG) ───────────────

function IndicatorOverlays({ priceSlice, xScale, yScale, activeIndicators }) {
  const sma10Data = useMemo(() => activeIndicators.has('sma10') ? sma(priceSlice, 10) : [], [priceSlice, activeIndicators]);
  const sma20Data = useMemo(() => activeIndicators.has('sma20') ? sma(priceSlice, 20) : [], [priceSlice, activeIndicators]);
  const ema12Data = useMemo(() => activeIndicators.has('ema12') ? ema(priceSlice, 12) : [], [priceSlice, activeIndicators]);
  const ema26Data = useMemo(() => activeIndicators.has('ema26') ? ema(priceSlice, 26) : [], [priceSlice, activeIndicators]);
  const bbData = useMemo(() => activeIndicators.has('bb') ? bollingerBands(priceSlice, 20, 2) : null, [priceSlice, activeIndicators]);

  const buildPolyline = useCallback((data, color) => {
    if (!data || data.length === 0) return null;
    const pts = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== null) pts.push(`${xScale(i)},${yScale(data[i])}`);
    }
    if (pts.length < 2) return null;
    return <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1} opacity={0.7} strokeDasharray="none" />;
  }, [xScale, yScale]);

  return (
    <g className="indicator-overlays">
      {buildPolyline(sma10Data, '#fbbf24')}
      {buildPolyline(sma20Data, '#f97316')}
      {buildPolyline(ema12Data, '#818cf8')}
      {buildPolyline(ema26Data, '#c084fc')}
      {bbData && (
        <>
          {buildPolyline(bbData.upper, '#38bdf8')}
          {buildPolyline(bbData.middle, 'rgba(56,189,248,0.4)')}
          {buildPolyline(bbData.lower, '#38bdf8')}
          {/* BB fill between upper and lower */}
          {(() => {
            const pts = [];
            const ptsLower = [];
            for (let i = 0; i < bbData.upper.length; i++) {
              if (bbData.upper[i] !== null && bbData.lower[i] !== null) {
                pts.push(`${xScale(i)},${yScale(bbData.upper[i])}`);
                ptsLower.unshift(`${xScale(i)},${yScale(bbData.lower[i])}`);
              }
            }
            if (pts.length < 2) return null;
            return <polygon points={[...pts, ...ptsLower].join(' ')} fill="rgba(56,189,248,0.04)" />;
          })()}
        </>
      )}
    </g>
  );
}

// ── RSI Sub-panel ─────────────────────────────────────────────────

function RSIPanel({ priceSlice, width, xScale }) {
  const RSI_H = 60;
  const rsiData = useMemo(() => rsi(priceSlice, 14), [priceSlice]);

  const pts = useMemo(() => {
    const result = [];
    for (let i = 0; i < rsiData.length; i++) {
      if (rsiData[i] !== null) {
        const x = xScale(i);
        const y = 4 + (1 - rsiData[i] / 100) * (RSI_H - 8);
        result.push(`${x},${y}`);
      }
    }
    return result.join(' ');
  }, [rsiData, xScale]);

  const currentRSI = rsiData.filter(v => v !== null).pop();

  return (
    <div className="border-t border-tactical-border/10">
      <div className="flex items-center justify-between px-2 py-0.5">
        <span className="text-[7px] font-mono text-tactical-text/25 uppercase tracking-widest">RSI 14</span>
        {currentRSI != null && (
          <span className={`text-[8px] font-mono tabular-nums ${
            currentRSI > 70 ? 'text-rose-400/70' : currentRSI < 30 ? 'text-emerald-400/70' : 'text-tactical-text/40'
          }`}>
            {currentRSI.toFixed(1)}
          </span>
        )}
      </div>
      <svg width={width} height={RSI_H} className="block">
        {/* Overbought/oversold zones */}
        <rect x={CHART_PADDING.left} y={4 + (1 - 70/100) * (RSI_H - 8)} width={width - CHART_PADDING.left - CHART_PADDING.right} height={(40/100) * (RSI_H - 8)} fill="rgba(255,255,255,0.02)" />
        {/* 70 line */}
        <line x1={CHART_PADDING.left} y1={4 + (1 - 70/100) * (RSI_H - 8)} x2={width - CHART_PADDING.right} y2={4 + (1 - 70/100) * (RSI_H - 8)} stroke="rgba(244,63,94,0.15)" strokeWidth={0.5} strokeDasharray="3,3" />
        {/* 30 line */}
        <line x1={CHART_PADDING.left} y1={4 + (1 - 30/100) * (RSI_H - 8)} x2={width - CHART_PADDING.right} y2={4 + (1 - 30/100) * (RSI_H - 8)} stroke="rgba(16,185,129,0.15)" strokeWidth={0.5} strokeDasharray="3,3" />
        {/* 50 line */}
        <line x1={CHART_PADDING.left} y1={4 + (1 - 50/100) * (RSI_H - 8)} x2={width - CHART_PADDING.right} y2={4 + (1 - 50/100) * (RSI_H - 8)} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
        {/* Labels */}
        <text x={CHART_PADDING.left - 8} y={4 + (1 - 70/100) * (RSI_H - 8) + 3} textAnchor="end" fill="rgba(244,63,94,0.3)" fontSize={7}>70</text>
        <text x={CHART_PADDING.left - 8} y={4 + (1 - 30/100) * (RSI_H - 8) + 3} textAnchor="end" fill="rgba(16,185,129,0.3)" fontSize={7}>30</text>
        {/* RSI line */}
        {pts.length > 0 && (
          <polyline points={pts} fill="none" stroke="#a78bfa" strokeWidth={1.2} />
        )}
      </svg>
    </div>
  );
}

// ── MACD Sub-panel ────────────────────────────────────────────────

function MACDPanel({ priceSlice, width, xScale }) {
  const MACD_H = 60;
  const macdData = useMemo(() => macd(priceSlice, 12, 26, 9), [priceSlice]);

  // Find range for scaling
  const { minV, maxV } = useMemo(() => {
    let lo = 0, hi = 0;
    for (let i = 0; i < priceSlice.length; i++) {
      const m = macdData.macd[i];
      const s = macdData.signal[i];
      const h = macdData.histogram[i];
      if (m !== null) { lo = Math.min(lo, m); hi = Math.max(hi, m); }
      if (s !== null) { lo = Math.min(lo, s); hi = Math.max(hi, s); }
      if (h !== null) { lo = Math.min(lo, h); hi = Math.max(hi, h); }
    }
    const pad = (hi - lo) * 0.1 || 0.01;
    return { minV: lo - pad, maxV: hi + pad };
  }, [macdData, priceSlice.length]);

  const yM = (v) => 4 + (1 - (v - minV) / (maxV - minV)) * (MACD_H - 8);

  const macdPts = useMemo(() => {
    const pts = [];
    for (let i = 0; i < macdData.macd.length; i++) {
      if (macdData.macd[i] !== null) pts.push(`${xScale(i)},${yM(macdData.macd[i])}`);
    }
    return pts.join(' ');
  }, [macdData, xScale, minV, maxV]);

  const sigPts = useMemo(() => {
    const pts = [];
    for (let i = 0; i < macdData.signal.length; i++) {
      if (macdData.signal[i] !== null) pts.push(`${xScale(i)},${yM(macdData.signal[i])}`);
    }
    return pts.join(' ');
  }, [macdData, xScale, minV, maxV]);

  const zeroY = yM(0);
  const chartLeft = CHART_PADDING.left;
  const chartRight = width - CHART_PADDING.right;

  return (
    <div className="border-t border-tactical-border/10">
      <div className="flex items-center justify-between px-2 py-0.5">
        <span className="text-[7px] font-mono text-tactical-text/25 uppercase tracking-widest">MACD 12,26,9</span>
      </div>
      <svg width={width} height={MACD_H} className="block">
        {/* Zero line */}
        <line x1={chartLeft} y1={zeroY} x2={chartRight} y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
        {/* Histogram bars */}
        {macdData.histogram.map((h, i) => {
          if (h === null) return null;
          const x = xScale(i);
          const barH = Math.abs(yM(h) - zeroY);
          return (
            <rect
              key={i}
              x={x - 1}
              y={h >= 0 ? yM(h) : zeroY}
              width={2}
              height={Math.max(0.5, barH)}
              fill={h >= 0 ? 'rgba(16,185,129,0.4)' : 'rgba(244,63,94,0.4)'}
            />
          );
        })}
        {/* MACD line */}
        {macdPts.length > 0 && (
          <polyline points={macdPts} fill="none" stroke="#f472b6" strokeWidth={1.2} />
        )}
        {/* Signal line */}
        {sigPts.length > 0 && (
          <polyline points={sigPts} fill="none" stroke="#818cf8" strokeWidth={1} opacity={0.7} />
        )}
      </svg>
    </div>
  );
}

// ── Volume Sub-panel ──────────────────────────────────────────────

function VolumePanel({ priceSlice, width, xScale }) {
  const VOL_H = 50;
  const volumes = useMemo(() => generateVolume(priceSlice), [priceSlice]);
  const maxVol = useMemo(() => Math.max(1, ...volumes), [volumes]);

  const chartLeft = CHART_PADDING.left;
  const chartRight = width - CHART_PADDING.right;

  return (
    <div className="border-t border-tactical-border/10">
      <div className="flex items-center justify-between px-2 py-0.5">
        <span className="text-[7px] font-mono text-tactical-text/25 uppercase tracking-widest">Volume</span>
        {volumes.length > 0 && (
          <span className="text-[8px] font-mono text-tactical-text/30 tabular-nums">
            {(volumes[volumes.length - 1] / 1000).toFixed(0)}K
          </span>
        )}
      </div>
      <svg width={width} height={VOL_H} className="block">
        {volumes.map((v, i) => {
          if (i === 0) return null;
          const x = xScale(i);
          const barH = (v / maxVol) * (VOL_H - 8);
          const isUp = priceSlice[i] >= priceSlice[i - 1];
          return (
            <rect
              key={i}
              x={x - 0.5}
              y={VOL_H - 4 - barH}
              width={Math.max(1, (chartRight - chartLeft) / priceSlice.length * 0.6)}
              height={Math.max(0.5, barH)}
              fill={isUp ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ── Main Chart Component ──────────────────────────────────────────

export default function ReplayChart({ selectedInstrument, onSelectInstrument, onToggleReport }) {
  const { t } = useTranslation();
  const activeScenarioId = useReplayStore(s => s.activeScenarioId);
  const currentTick = useReplayStore(s => s.currentTick);
  const scenario = activeScenarioId ? getScenarioById(activeScenarioId) : null;

  const containerRef = useRef(null);
  const [dims, setDims] = useState({ width: 800, height: 400 });
  const [showPicker, setShowPicker] = useState(false);
  const [chartMode, setChartMode] = useState('line'); // 'line' | 'candle'
  const [activeIndicators, setActiveIndicators] = useState(new Set());
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);

  // ── Zoom & Pan state ──────────────────────────────────────────
  const DEFAULT_WINDOW = 150; // default visible ticks
  const MIN_WINDOW = 20;
  const [viewWindow, setViewWindow] = useState(DEFAULT_WINDOW); // how many ticks visible
  const [viewEnd, setViewEnd] = useState(null); // null = auto-follow currentTick
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef(null);
  const [crosshair, setCrosshair] = useState(null); // { x, y, tick, price }

  // Auto-follow: keep latest tick in view
  const effectiveEnd = viewEnd !== null ? viewEnd : currentTick;
  const viewStart = Math.max(0, effectiveEnd - viewWindow + 1);
  const visibleEnd = Math.min(effectiveEnd, currentTick);

  // Reset view when instrument changes
  useEffect(() => {
    setViewEnd(null);
    setViewWindow(DEFAULT_WINDOW);
  }, [selectedInstrument]);

  // Auto-follow when playing (viewEnd is null)
  const autoFollow = viewEnd === null;

  const toggleIndicator = useCallback((id) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Resize observer — observe both wrapper (for height) and container (for width).
  // Height comes from the wrapper which is constrained by flex layout, avoiding
  // the feedback loop where SVG height → container grows → observer fires → bigger SVG.
  const wrapperRef = useRef(null);
  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(() => {
      const wRect = wrapperRef.current?.getBoundingClientRect();
      const cRect = containerRef.current?.getBoundingClientRect();
      if (wRect && cRect) {
        setDims({ width: Math.max(200, cRect.width), height: Math.max(150, wRect.height) });
      }
    });
    obs.observe(wrapperRef.current);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // All generated prices for this scenario (extends on-demand for live market)
  const allPrices = useMemo(() => {
    if (!scenario) return {};
    return getCachedReplayPrices(scenario, currentTick + 2);
  }, [scenario, currentTick]);

  // Full price data up to current tick
  const fullPriceSlice = useMemo(() => {
    if (!scenario || !selectedInstrument) return [];
    const full = allPrices[selectedInstrument] ?? [];
    return full.slice(0, currentTick + 1);
  }, [allPrices, selectedInstrument, currentTick, scenario]);

  // Visible window price slice (for rendering + indicators)
  const priceSlice = useMemo(() => {
    return fullPriceSlice.slice(viewStart, visibleEnd + 1);
  }, [fullPriceSlice, viewStart, visibleEnd]);

  // Candle data (from visible window only)
  const CANDLE_GROUP = 5;
  const candles = useMemo(() => {
    if (chartMode !== 'candle' || priceSlice.length < 2) return [];
    return buildCandles(priceSlice, CANDLE_GROUP);
  }, [priceSlice, chartMode]);

  // Determine sub-panels
  const showRSI = activeIndicators.has('rsi');
  const showMACD = activeIndicators.has('macd');
  const showVol = activeIndicators.has('vol');
  const subPanelHeight = (showVol ? 54 : 0) + (showRSI ? 64 : 0) + (showMACD ? 64 : 0);

  // Chart dimensions
  const chartW = dims.width - CHART_PADDING.left - CHART_PADDING.right;
  const chartH = dims.height - CHART_PADDING.top - CHART_PADDING.bottom - subPanelHeight;

  // Price range from visible window
  const { minP, maxP } = useMemo(() => {
    if (priceSlice.length === 0) return { minP: 0, maxP: 100 };
    let lo = Infinity, hi = -Infinity;
    if (chartMode === 'candle' && candles.length > 0) {
      for (const c of candles) {
        if (c.low < lo) lo = c.low;
        if (c.high > hi) hi = c.high;
      }
    } else {
      for (const p of priceSlice) {
        if (p < lo) lo = p;
        if (p > hi) hi = p;
      }
    }
    const pad = (hi - lo) * 0.08 || hi * 0.05;
    return { minP: lo - pad, maxP: hi + pad };
  }, [priceSlice, candles, chartMode]);

  // Map tick/price to SVG coords — now relative to visible window
  const visibleTicks = Math.max(2, priceSlice.length);
  const xScale = useCallback((tick) => CHART_PADDING.left + (tick / (visibleTicks - 1)) * chartW, [visibleTicks, chartW]);
  const yScale = useCallback((price) => CHART_PADDING.top + (1 - (price - minP) / (maxP - minP)) * Math.max(1, chartH), [minP, maxP, chartH]);

  // Build polyline points (for line mode)
  const polyline = useMemo(() => {
    if (chartMode !== 'line') return '';
    return priceSlice.map((p, i) => `${xScale(i)},${yScale(p)}`).join(' ');
  }, [priceSlice, chartMode, xScale, yScale]);

  // Candlestick width — sized for visible window
  const candleWidth = useMemo(() => {
    if (candles.length < 2) return 4;
    return Math.max(1, Math.min(12, (chartW / candles.length) * 0.6));
  }, [candles.length, chartW]);

  // Visible annotations (within visible window)
  const annotations = useMemo(() => {
    if (!scenario) return [];
    return scenario.annotations.filter(a => a.tick >= viewStart && a.tick <= visibleEnd);
  }, [scenario, viewStart, visibleEnd]);

  // Current price info
  const currentPrice = fullPriceSlice.length > 0 ? fullPriceSlice[fullPriceSlice.length - 1] : null;
  const startPrice = allPrices[selectedInstrument]?.[0] ?? 0;
  const changePct = startPrice > 0 && currentPrice !== null
    ? ((currentPrice - startPrice) / startPrice) * 100
    : 0;

  // Y-axis labels
  const yLabels = useMemo(() => {
    const count = 5;
    const labels = [];
    for (let i = 0; i <= count; i++) {
      const price = minP + ((maxP - minP) * i) / count;
      labels.push({ price, y: yScale(price) });
    }
    return labels;
  }, [minP, maxP, yScale]);

  // Get instrument metadata
  const instrumentInfo = useMemo(() => {
    return ALL_INSTRUMENTS.find(i => i.id === selectedInstrument);
  }, [selectedInstrument]);

  // ── Mouse handlers for zoom/pan/crosshair ─────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.15 : 0.85;
    setViewWindow(prev => {
      const next = Math.round(Math.max(MIN_WINDOW, Math.min(currentTick + 1, prev * zoomFactor)));
      return next;
    });
    // When zooming, pin to current position
    if (autoFollow) return;
    setViewEnd(prev => prev ?? currentTick);
  }, [currentTick, autoFollow]);

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, viewEnd: effectiveEnd };
  }, [effectiveEnd]);

  const handleMouseMove = useCallback((e) => {
    const svgRect = containerRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    // Crosshair
    const mx = e.clientX - svgRect.left;
    const my = e.clientY - svgRect.top;
    if (mx >= CHART_PADDING.left && mx <= dims.width - CHART_PADDING.right && my >= CHART_PADDING.top && my <= dims.height - subPanelHeight - CHART_PADDING.bottom) {
      const tickFrac = (mx - CHART_PADDING.left) / chartW;
      const tickIdx = Math.round(tickFrac * (visibleTicks - 1));
      const price = priceSlice[tickIdx];
      if (price !== undefined) {
        setCrosshair({ x: xScale(tickIdx), y: yScale(price), tick: viewStart + tickIdx, price });
      }
    } else {
      setCrosshair(null);
    }

    // Drag pan
    if (isDragging && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const ticksPerPx = viewWindow / chartW;
      const tickDelta = Math.round(-dx * ticksPerPx);
      const newEnd = Math.max(viewWindow - 1, Math.min(currentTick, dragStartRef.current.viewEnd + tickDelta));
      setViewEnd(newEnd);
    }
  }, [isDragging, dims, chartW, visibleTicks, priceSlice, xScale, yScale, viewStart, viewWindow, currentTick, subPanelHeight]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCrosshair(null);
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Double-click to reset view (auto-follow + default zoom)
  const handleDoubleClick = useCallback(() => {
    setViewEnd(null);
    setViewWindow(DEFAULT_WINDOW);
  }, []);

  if (!scenario) return null;

  const svgHeight = dims.height - subPanelHeight;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top bar: instrument info + chart controls + price */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-tactical-border/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="text-[8px] font-mono text-tactical-text/30 hover:text-[#00e5ff] transition-colors"
            title={showPicker ? 'Hide instruments' : 'Show instruments'}
          >
            {showPicker ? '[hide]' : '[instruments]'}
          </button>
          {instrumentInfo && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#00e5ff] font-semibold">
                {instrumentInfo.symbol}
              </span>
              <span className="text-[9px] font-mono text-tactical-text/30 hidden sm:inline">
                {instrumentInfo.name}
              </span>
              <span className={`text-[7px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                instrumentInfo.type === 'stock' ? 'border-blue-400/20 text-blue-400/50' :
                instrumentInfo.type === 'crypto' ? 'border-purple-400/20 text-purple-400/50' :
                instrumentInfo.type === 'forex' ? 'border-green-400/20 text-green-400/50' :
                instrumentInfo.type === 'commodity' ? 'border-amber-400/20 text-amber-400/50' :
                'border-cyan-400/20 text-cyan-400/50'
              }`}>
                {instrumentInfo.type}
              </span>
            </div>
          )}
        </div>

        {/* Chart controls */}
        <div className="flex items-center gap-2">
          {/* Chart mode toggle */}
          <div className="flex border border-tactical-border/20 rounded overflow-hidden">
            <button
              onClick={() => setChartMode('line')}
              className={`text-[7px] font-mono uppercase tracking-wider px-2 py-0.5 transition-colors ${
                chartMode === 'line' ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : 'text-tactical-text/25 hover:text-tactical-text/40'
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setChartMode('candle')}
              className={`text-[7px] font-mono uppercase tracking-wider px-2 py-0.5 transition-colors border-l border-tactical-border/20 ${
                chartMode === 'candle' ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : 'text-tactical-text/25 hover:text-tactical-text/40'
              }`}
            >
              Candle
            </button>
          </div>

          {/* Indicators dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
              className={`text-[7px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border transition-colors ${
                activeIndicators.size > 0
                  ? 'border-[#00e5ff]/30 text-[#00e5ff]/70 bg-[#00e5ff]/5'
                  : 'border-tactical-border/20 text-tactical-text/25 hover:text-tactical-text/40'
              }`}
            >
              Indicators{activeIndicators.size > 0 ? ` (${activeIndicators.size})` : ''}
            </button>
            {showIndicatorMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-[#0a0f1a] border border-tactical-border/30 rounded shadow-xl min-w-[140px]">
                {INDICATOR_LIST.map(ind => (
                  <button
                    key={ind.id}
                    onClick={() => toggleIndicator(ind.id)}
                    className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/[0.03] transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: activeIndicators.has(ind.id) ? ind.color : 'transparent', border: `1px solid ${ind.color}40` }}
                    />
                    <span className={`text-[8px] font-mono ${activeIndicators.has(ind.id) ? 'text-tactical-text/70' : 'text-tactical-text/30'}`}>
                      {ind.label}
                    </span>
                    {ind.panel && (
                      <span className="text-[6px] font-mono text-tactical-text/15 ml-auto">panel</span>
                    )}
                  </button>
                ))}
                <div className="border-t border-tactical-border/10 px-2.5 py-1">
                  <button
                    onClick={() => { setActiveIndicators(new Set()); setShowIndicatorMenu(false); }}
                    className="text-[7px] font-mono text-tactical-text/20 hover:text-rose-400/60 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Price display + Athena mini prediction */}
          {currentPrice !== null && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-[13px] font-mono text-tactical-text font-semibold tabular-nums">
                ${formatPrice(currentPrice)}
              </span>
              <span className={`text-[10px] font-mono tabular-nums ${changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
              </span>
              <AthenaMiniWidget
                symbol={selectedInstrument}
                prices={fullPriceSlice}
                onExpand={() => onToggleReport?.()}
              />
            </div>
          )}
        </div>
      </div>

      {/* Active indicator tags */}
      {activeIndicators.size > 0 && (
        <div className="flex items-center gap-1 px-4 py-1 border-b border-tactical-border/5 bg-[#060a12]/40">
          {INDICATOR_LIST.filter(i => activeIndicators.has(i.id)).map(ind => (
            <button
              key={ind.id}
              onClick={() => toggleIndicator(ind.id)}
              className="flex items-center gap-1 text-[7px] font-mono px-1.5 py-0.5 rounded border border-tactical-border/15 hover:border-rose-400/30 transition-colors group"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ind.color }} />
              <span className="text-tactical-text/40 group-hover:text-rose-400/60">{ind.label}</span>
              <span className="text-tactical-text/15 group-hover:text-rose-400/40 ml-0.5">x</span>
            </button>
          ))}
        </div>
      )}

      {/* Zoom controls bar */}
      <div className="flex items-center gap-2 px-4 py-0.5 border-b border-tactical-border/5 bg-[#060a12]/30">
        <span className="text-[7px] font-mono text-tactical-text/20 uppercase tracking-widest">{t('exchange.ticks')} {viewStart}–{visibleEnd}</span>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setViewWindow(prev => Math.max(MIN_WINDOW, Math.round(prev * 0.7)))}
            className="text-[9px] font-mono text-tactical-text/30 hover:text-[#00e5ff] transition-colors px-1.5 py-0.5 border border-tactical-border/15 rounded">+</button>
          <button onClick={() => setViewWindow(prev => Math.min(currentTick + 1, Math.round(prev * 1.4)))}
            className="text-[9px] font-mono text-tactical-text/30 hover:text-[#00e5ff] transition-colors px-1.5 py-0.5 border border-tactical-border/15 rounded">−</button>
          <button onClick={() => { setViewEnd(null); setViewWindow(DEFAULT_WINDOW); }}
            className={`text-[7px] font-mono uppercase tracking-widest px-1.5 py-0.5 border rounded transition-colors ${
              autoFollow ? 'border-emerald-400/20 text-emerald-400/50' : 'border-tactical-border/15 text-tactical-text/25 hover:text-[#00e5ff]'
            }`}>{autoFollow ? '● LIVE' : 'RESET'}</button>
        </div>
      </div>

      {/* Chart area with optional picker */}
      <div ref={wrapperRef} className="flex-1 flex min-h-0 overflow-hidden">
        {/* Instrument picker sidebar */}
        {showPicker && (
          <InstrumentPicker
            selectedId={selectedInstrument}
            onSelect={onSelectInstrument}
            scenario={scenario}
            allPrices={allPrices}
            currentTick={currentTick}
          />
        )}

        {/* SVG chart + sub-panels */}
        <div ref={containerRef} className="flex-1 min-w-0 relative flex flex-col overflow-y-auto overflow-x-hidden"
          style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}>
          <svg
            width={dims.width}
            height={Math.max(80, svgHeight)}
            className="flex-shrink-0 select-none"
            style={{ fontFamily: 'ui-monospace, monospace' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onDoubleClick={handleDoubleClick}
          >
            {/* Grid lines */}
            {yLabels.map((l, i) => (
              <g key={i}>
                <line
                  x1={CHART_PADDING.left} y1={l.y}
                  x2={dims.width - CHART_PADDING.right} y2={l.y}
                  stroke="rgba(255,255,255,0.04)" strokeWidth={0.5}
                />
                <text
                  x={CHART_PADDING.left - 8} y={l.y + 3}
                  textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={8}
                >
                  {formatPrice(l.price)}
                </text>
              </g>
            ))}

            {/* Indicator overlays */}
            {activeIndicators.size > 0 && (
              <IndicatorOverlays
                priceSlice={priceSlice}
                xScale={xScale}
                yScale={yScale}
                activeIndicators={activeIndicators}
              />
            )}

            {/* Candlestick mode */}
            {chartMode === 'candle' && candles.length > 0 && candles.map((c, i) => {
              const isGreen = c.close >= c.open;
              const color = isGreen ? '#10b981' : '#f43f5e';
              const bodyTop = yScale(Math.max(c.open, c.close));
              const bodyBot = yScale(Math.min(c.open, c.close));
              const bodyH = Math.max(0.5, bodyBot - bodyTop);
              const cx = xScale(c.tick + CANDLE_GROUP / 2);
              return (
                <g key={i}>
                  {/* Wick */}
                  <line
                    x1={cx} y1={yScale(c.high)}
                    x2={cx} y2={yScale(c.low)}
                    stroke={color} strokeWidth={0.8}
                  />
                  {/* Body */}
                  <rect
                    x={cx - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyH}
                    fill={color}
                    stroke={color}
                    strokeWidth={0.5}
                    fillOpacity={isGreen ? 0.3 : 0.8}
                  />
                </g>
              );
            })}

            {/* Line mode */}
            {chartMode === 'line' && priceSlice.length > 1 && (
              <>
                <polygon
                  points={`${xScale(0)},${yScale(minP)} ${polyline} ${xScale(priceSlice.length - 1)},${yScale(minP)}`}
                  fill={changePct >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)'}
                />
                <polyline
                  points={polyline} fill="none"
                  stroke={changePct >= 0 ? '#10b981' : '#f43f5e'}
                  strokeWidth={1.5} strokeLinejoin="round"
                />
                <circle
                  cx={xScale(priceSlice.length - 1)} cy={yScale(priceSlice[priceSlice.length - 1])}
                  r={3} fill={changePct >= 0 ? '#10b981' : '#f43f5e'}
                />
              </>
            )}

            {/* Annotation markers (relative to visible window) */}
            {annotations.map((a, i) => {
              const price = allPrices[selectedInstrument]?.[a.tick];
              if (price === undefined) return null;
              const localIdx = a.tick - viewStart;
              const cx = xScale(localIdx);
              const cy = yScale(price);
              return (
                <g key={i}>
                  <line
                    x1={cx} y1={CHART_PADDING.top}
                    x2={cx} y2={svgHeight - CHART_PADDING.bottom}
                    stroke={a.type === 'event' ? 'rgba(0,229,255,0.15)' : 'rgba(251,191,36,0.12)'}
                    strokeWidth={0.5} strokeDasharray="2,3"
                  />
                  <circle
                    cx={cx} cy={cy} r={4} fill="none"
                    stroke={a.type === 'event' ? '#00e5ff' : '#fbbf24'}
                    strokeWidth={1} opacity={0.6}
                  />
                </g>
              );
            })}

            {/* Current tick line (if visible) */}
            {currentTick >= viewStart && currentTick <= visibleEnd && (
              <line
                x1={xScale(currentTick - viewStart)} y1={CHART_PADDING.top}
                x2={xScale(currentTick - viewStart)} y2={svgHeight - CHART_PADDING.bottom}
                stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}
              />
            )}

            {/* Tick labels (visible range) */}
            {(() => {
              const ticks = [];
              const step = Math.max(1, Math.floor(viewWindow / 5));
              for (let i = 0; i < priceSlice.length; i += step) {
                ticks.push(i);
              }
              if (ticks[ticks.length - 1] !== priceSlice.length - 1 && priceSlice.length > 1) {
                ticks.push(priceSlice.length - 1);
              }
              return ticks.map(t => (
                <text
                  key={t} x={xScale(t)} y={svgHeight - CHART_PADDING.bottom + 14}
                  textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize={8}
                >
                  {viewStart + t}
                </text>
              ));
            })()}

            {/* Crosshair */}
            {crosshair && !isDragging && (
              <g>
                <line x1={crosshair.x} y1={CHART_PADDING.top} x2={crosshair.x} y2={svgHeight - CHART_PADDING.bottom}
                  stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} strokeDasharray="2,2" />
                <line x1={CHART_PADDING.left} y1={crosshair.y} x2={dims.width - CHART_PADDING.right} y2={crosshair.y}
                  stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} strokeDasharray="2,2" />
                <circle cx={crosshair.x} cy={crosshair.y} r={3} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
                {/* Price label */}
                <rect x={dims.width - CHART_PADDING.right + 2} y={crosshair.y - 8} width={55} height={16} rx={2} fill="#0a0f1a" stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} />
                <text x={dims.width - CHART_PADDING.right + 6} y={crosshair.y + 3} fill="rgba(255,255,255,0.7)" fontSize={8}>${formatPrice(crosshair.price)}</text>
                {/* Tick label */}
                <rect x={crosshair.x - 14} y={svgHeight - CHART_PADDING.bottom + 2} width={28} height={14} rx={2} fill="#0a0f1a" stroke="rgba(255,255,255,0.2)" strokeWidth={0.5} />
                <text x={crosshair.x} y={svgHeight - CHART_PADDING.bottom + 12} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={7}>{crosshair.tick}</text>
              </g>
            )}
          </svg>

          {/* Volume sub-panel */}
          {showVol && priceSlice.length > 2 && (
            <VolumePanel priceSlice={priceSlice} width={dims.width} xScale={xScale} />
          )}

          {/* RSI sub-panel */}
          {showRSI && priceSlice.length > 15 && (
            <RSIPanel priceSlice={priceSlice} width={dims.width} xScale={xScale} />
          )}

          {/* MACD sub-panel */}
          {showMACD && priceSlice.length > 27 && (
            <MACDPanel priceSlice={priceSlice} width={dims.width} xScale={xScale} />
          )}

          {/* Latest annotation tooltip */}
          {annotations.length > 0 && (
            <div className="absolute bottom-10 left-4 right-4 pointer-events-none" style={{ bottom: subPanelHeight + 40 }}>
              <div className="max-w-md bg-[#0a0f1a]/90 border border-tactical-border/30 rounded px-3 py-2">
                <p className={`text-[9px] font-mono leading-relaxed ${
                  annotations[annotations.length - 1].type === 'event'
                    ? 'text-[#00e5ff]/70' : 'text-amber-400/70'
                }`}>
                  {annotations[annotations.length - 1].text}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close indicator menu on outside click */}
      {showIndicatorMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowIndicatorMenu(false)} />
      )}
    </div>
  );
}
