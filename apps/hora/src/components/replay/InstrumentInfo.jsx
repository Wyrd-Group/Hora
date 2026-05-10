/**
 * InstrumentInfo.jsx -- Rich info panel for the selected instrument below the chart.
 * Shows identity, description, price stats, technicals, volatility, and derived metrics.
 */

import { useMemo } from 'react';
import { ALL_INSTRUMENTS } from '../../data/instruments';
import { useReplayStore } from '../../store/replayStore';
import { getScenarioById } from '../../data/replayScenarios';
import { getCachedReplayPrices } from '../../lib/replayPriceGenerator';
import { useTranslation } from '../../lib/i18n';

function fmt(n, decimals = 2) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPrice(n) {
  if (n >= 10000) return '$' + fmt(n, 0);
  if (n >= 100) return '$' + fmt(n, 1);
  if (n >= 1) return '$' + fmt(n, 2);
  if (n >= 0.01) return '$' + n.toFixed(4);
  return '$' + n.toFixed(8);
}

// Seeded PRNG for deterministic derived data
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Generate deterministic but realistic-looking derived metrics per instrument
function getDerivedMetrics(instrument, seed) {
  const h = hashId(instrument.id) + seed;
  const r = (offset) => seededRandom(h + offset);

  const type = instrument.type;

  if (type === 'stock') {
    const pe = 8 + r(1) * 80;
    const eps = instrument.price / pe;
    const divYield = r(2) < 0.6 ? (0.2 + r(3) * 4.5) : 0;
    const beta = 0.4 + r(4) * 1.8;
    const avgVol = Math.floor(1e6 + r(5) * 50e6);
    const shortInt = 1 + r(6) * 20;
    const analystTarget = instrument.price * (0.85 + r(7) * 0.4);
    const roe = 5 + r(8) * 35;
    const debtEquity = r(9) * 3;
    const revenueGrowth = -10 + r(10) * 50;
    const marginNet = 2 + r(11) * 30;

    return {
      pe: pe.toFixed(1),
      eps: eps.toFixed(2),
      divYield: divYield > 0 ? divYield.toFixed(2) + '%' : '—',
      beta: beta.toFixed(2),
      avgVolume: avgVol > 1e6 ? (avgVol / 1e6).toFixed(1) + 'M' : (avgVol / 1e3).toFixed(0) + 'K',
      shortInterest: shortInt.toFixed(1) + '%',
      analystTarget: formatPrice(analystTarget),
      roe: roe.toFixed(1) + '%',
      debtEquity: debtEquity.toFixed(2),
      revenueGrowth: (revenueGrowth >= 0 ? '+' : '') + revenueGrowth.toFixed(1) + '%',
      netMargin: marginNet.toFixed(1) + '%',
    };
  }

  if (type === 'crypto') {
    const circulatingPct = 30 + r(1) * 70;
    const tvl = r(2) * 20;
    const stakingYield = r(3) < 0.7 ? (2 + r(4) * 15) : 0;
    const txPerDay = Math.floor(10000 + r(5) * 2e6);
    const activeAddresses = Math.floor(1000 + r(6) * 500000);
    const fdvRatio = 1 + r(7) * 4;

    return {
      circulatingSupply: circulatingPct.toFixed(0) + '%',
      tvl: tvl > 1 ? '$' + tvl.toFixed(1) + 'B' : '$' + (tvl * 1000).toFixed(0) + 'M',
      stakingYield: stakingYield > 0 ? stakingYield.toFixed(1) + '% APY' : '—',
      dailyTx: txPerDay > 1e6 ? (txPerDay / 1e6).toFixed(1) + 'M' : (txPerDay / 1e3).toFixed(0) + 'K',
      activeAddresses: activeAddresses > 100000 ? (activeAddresses / 1e6).toFixed(2) + 'M' : (activeAddresses / 1e3).toFixed(1) + 'K',
      fdvRatio: fdvRatio.toFixed(1) + 'x',
      consensus: ['PoW', 'PoS', 'DPoS', 'DAG', 'aBFT'][Math.floor(r(8) * 5)],
    };
  }

  if (type === 'forex') {
    const spread = 0.1 + r(1) * 5;
    const swapLong = -5 + r(2) * 10;
    const swapShort = -5 + r(3) * 10;
    const dailyRange = 0.3 + r(4) * 2;
    const correlation = ['EUR/USD', 'Gold', 'Oil', 'S&P 500'][Math.floor(r(5) * 4)];
    const session = ['London', 'New York', 'Tokyo', 'Sydney'][Math.floor(r(6) * 4)];

    return {
      spread: spread.toFixed(1) + ' pips',
      swapLong: (swapLong >= 0 ? '+' : '') + swapLong.toFixed(2),
      swapShort: (swapShort >= 0 ? '+' : '') + swapShort.toFixed(2),
      avgDailyRange: dailyRange.toFixed(1) + '%',
      topCorrelation: correlation,
      peakSession: session,
    };
  }

  if (type === 'commodity') {
    const contractSize = [100, 1000, 5000, 10000][Math.floor(r(1) * 4)];
    const seasonality = ['Q1 Strong', 'Q2 Weak', 'Q3 Peak', 'Q4 Seasonal'][Math.floor(r(2) * 4)];
    const inventoryChange = -8 + r(3) * 16;
    const contango = -2 + r(4) * 4;
    const topProducer = ['USA', 'Russia', 'China', 'Saudi Arabia', 'Brazil', 'Australia'][Math.floor(r(5) * 6)];

    return {
      contractSize: contractSize.toLocaleString(),
      seasonality,
      inventoryChg: (inventoryChange >= 0 ? '+' : '') + inventoryChange.toFixed(1) + '%',
      curvature: contango >= 0 ? 'Contango ' + contango.toFixed(1) + '%' : 'Backwardation ' + Math.abs(contango).toFixed(1) + '%',
      topProducer,
    };
  }

  // bond
  return {
    duration: (2 + r(1) * 12).toFixed(1) + ' yrs',
    yield: (1 + r(2) * 7).toFixed(2) + '%',
    coupon: (0.5 + r(3) * 6).toFixed(2) + '%',
    creditRating: ['AAA', 'AA+', 'AA', 'A+', 'A', 'BBB+', 'BBB', 'BB+'][Math.floor(r(4) * 8)],
    convexity: (0.1 + r(5) * 2).toFixed(2),
  };
}

// ── Stat Cell ──
function Stat({ label, value, color }) {
  return (
    <div>
      <span className="text-[7px] font-mono uppercase tracking-widest text-tactical-text/20 block mb-0.5">{label}</span>
      <span className={`text-[10px] font-mono tabular-nums ${color || 'text-tactical-text/50'}`}>{value}</span>
    </div>
  );
}

export default function InstrumentInfo({ instrumentId }) {
  const { t } = useTranslation();
  const currentTick = useReplayStore(s => s.currentTick);
  const activeScenarioId = useReplayStore(s => s.activeScenarioId);
  const scenario = activeScenarioId ? getScenarioById(activeScenarioId) : null;

  const instrument = useMemo(() => {
    return ALL_INSTRUMENTS.find(i => i.id === instrumentId);
  }, [instrumentId]);

  const stats = useMemo(() => {
    if (!scenario || !instrumentId) return null;
    const allPrices = getCachedReplayPrices(scenario);
    const prices = allPrices[instrumentId];
    if (!prices || prices.length === 0) return null;

    const tickIdx = Math.min(currentTick, prices.length - 1);
    const current = prices[tickIdx];
    const start = prices[0];
    const changePct = start > 0 ? ((current - start) / start) * 100 : 0;

    // High/Low up to current tick
    let high = -Infinity, low = Infinity;
    for (let t = 0; t <= tickIdx; t++) {
      if (prices[t] > high) high = prices[t];
      if (prices[t] < low) low = prices[t];
    }

    // Volatility (std dev of returns over last 20 ticks)
    const lookback = Math.min(20, tickIdx);
    let sumRet = 0, sumRetSq = 0, retCount = 0;
    for (let t = Math.max(1, tickIdx - lookback); t <= tickIdx; t++) {
      const ret = (prices[t] - prices[t - 1]) / prices[t - 1];
      sumRet += ret;
      sumRetSq += ret * ret;
      retCount++;
    }
    const avgRet = retCount > 0 ? sumRet / retCount : 0;
    const variance = retCount > 1 ? (sumRetSq - retCount * avgRet * avgRet) / (retCount - 1) : 0;
    const volatility = Math.sqrt(variance) * 100;

    // Simple Moving Averages
    const sma10 = tickIdx >= 9 ? prices.slice(tickIdx - 9, tickIdx + 1).reduce((a, b) => a + b, 0) / 10 : null;
    const sma20 = tickIdx >= 19 ? prices.slice(tickIdx - 19, tickIdx + 1).reduce((a, b) => a + b, 0) / 20 : null;

    // RSI (14-period)
    let rsi = null;
    if (tickIdx >= 14) {
      let gains = 0, losses = 0;
      for (let t = tickIdx - 13; t <= tickIdx; t++) {
        const diff = prices[t] - prices[t - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
      }
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }

    // Momentum (price change over last 10 ticks)
    const momTicks = Math.min(10, tickIdx);
    const momentum = momTicks > 0
      ? ((current - prices[tickIdx - momTicks]) / prices[tickIdx - momTicks]) * 100
      : 0;

    // Distance from high
    const drawdown = high > 0 ? ((current - high) / high) * 100 : 0;

    // Range position (where current sits between high and low)
    const range = high - low;
    const rangePosition = range > 0 ? ((current - low) / range) * 100 : 50;

    return {
      current, start, changePct, high, low,
      volatility, sma10, sma20, rsi, momentum, drawdown, rangePosition,
    };
  }, [scenario, instrumentId, currentTick]);

  const derived = useMemo(() => {
    if (!instrument || !scenario) return null;
    return getDerivedMetrics(instrument, hashId(scenario.id));
  }, [instrument, scenario]);

  if (!instrument || !stats) return null;

  const isNative = scenario?.instruments.includes(instrumentId);
  const type = instrument.type;

  // RSI signal
  const rsiSignal = stats.rsi !== null
    ? stats.rsi > 70 ? { text: 'Overbought', color: 'text-rose-400' }
    : stats.rsi < 30 ? { text: 'Oversold', color: 'text-emerald-400' }
    : { text: 'Neutral', color: 'text-tactical-text/30' }
    : null;

  // Trend signal from SMAs
  const trendSignal = stats.sma10 && stats.sma20
    ? stats.sma10 > stats.sma20 ? { text: 'Bullish (SMA10 > SMA20)', color: 'text-emerald-400/60' }
    : { text: 'Bearish (SMA10 < SMA20)', color: 'text-rose-400/60' }
    : null;

  return (
    <div className="border-t border-tactical-border/10 bg-[#060a12]/80 px-4 py-3">
      {/* Row 1: Identity */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <h3 className="text-[11px] font-mono font-semibold text-tactical-text">
          {instrument.name}
        </h3>
        <span className={`text-[7px] font-mono uppercase px-1.5 py-0.5 rounded border ${
          type === 'stock' ? 'border-blue-400/20 text-blue-400/50' :
          type === 'crypto' ? 'border-purple-400/20 text-purple-400/50' :
          type === 'forex' ? 'border-green-400/20 text-green-400/50' :
          type === 'commodity' ? 'border-amber-400/20 text-amber-400/50' :
          'border-cyan-400/20 text-cyan-400/50'
        }`}>
          {type}
        </span>
        {instrument.sector && (
          <span className="text-[7px] font-mono text-tactical-text/20">{instrument.sector}</span>
        )}
        {isNative && (
          <span className="text-[7px] font-mono text-amber-400/60 bg-amber-400/10 px-1.5 py-0.5 rounded">{t('exchange.scenarioAsset')}</span>
        )}
        {instrument.marketCapB && (
          <span className="text-[7px] font-mono text-tactical-text/20">{t('exchange.mktCap')}: ${instrument.marketCapB}B</span>
        )}
      </div>

      {/* Row 2: Description */}
      <p className="text-[9px] font-mono text-tactical-text/35 leading-relaxed mb-3">
        {instrument.description}
      </p>

      {/* Row 3: Price stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-2 mb-3 pb-3 border-b border-tactical-border/5">
        <Stat label={t('exchange.open')} value={formatPrice(stats.start)} />
        <Stat label={t('exchange.current')} value={formatPrice(stats.current)} color="text-tactical-text font-semibold" />
        <Stat label={t('exchange.change')} value={`${stats.changePct >= 0 ? '+' : ''}${stats.changePct.toFixed(2)}%`}
          color={stats.changePct >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'} />
        <Stat label={t('exchange.high')} value={formatPrice(stats.high)} color="text-emerald-400/50" />
        <Stat label={t('exchange.low')} value={formatPrice(stats.low)} color="text-rose-400/50" />
        <Stat label={t('exchange.drawdown')} value={`${stats.drawdown.toFixed(2)}%`}
          color={stats.drawdown < -5 ? 'text-rose-400' : 'text-tactical-text/40'} />
      </div>

      {/* Row 4: Technical indicators */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-2 mb-3 pb-3 border-b border-tactical-border/5">
        <Stat label="Volatility" value={stats.volatility.toFixed(2) + '%'}
          color={stats.volatility > 3 ? 'text-amber-400/70' : 'text-tactical-text/40'} />
        <Stat label="Momentum (10t)" value={`${stats.momentum >= 0 ? '+' : ''}${stats.momentum.toFixed(2)}%`}
          color={stats.momentum >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'} />
        {stats.rsi !== null && (
          <div>
            <span className="text-[7px] font-mono uppercase tracking-widest text-tactical-text/20 block mb-0.5">RSI (14)</span>
            <span className={`text-[10px] font-mono tabular-nums ${rsiSignal?.color}`}>
              {stats.rsi.toFixed(1)} <span className="text-[7px]">{rsiSignal?.text}</span>
            </span>
          </div>
        )}
        {stats.sma10 && <Stat label="SMA 10" value={formatPrice(stats.sma10)} />}
        {stats.sma20 && <Stat label="SMA 20" value={formatPrice(stats.sma20)} />}
        <div>
          <span className="text-[7px] font-mono uppercase tracking-widest text-tactical-text/20 block mb-0.5">Range Pos</span>
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 bg-tactical-border/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#00e5ff]/40 rounded-full" style={{ width: `${stats.rangePosition}%` }} />
            </div>
            <span className="text-[8px] font-mono text-tactical-text/30 tabular-nums">{stats.rangePosition.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Row 5: Trend signal */}
      {trendSignal && (
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-tactical-border/5">
          <span className="text-[7px] font-mono uppercase tracking-widest text-tactical-text/20">Trend</span>
          <span className={`text-[9px] font-mono ${trendSignal.color}`}>{trendSignal.text}</span>
        </div>
      )}

      {/* Row 6: Asset-type-specific derived metrics */}
      {derived && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-2">
          {type === 'stock' && (
            <>
              <Stat label="P/E Ratio" value={derived.pe} />
              <Stat label="EPS" value={'$' + derived.eps} />
              <Stat label="Div Yield" value={derived.divYield} />
              <Stat label="Beta" value={derived.beta}
                color={parseFloat(derived.beta) > 1.5 ? 'text-amber-400/60' : 'text-tactical-text/40'} />
              <Stat label="ROE" value={derived.roe} />
              <Stat label="Net Margin" value={derived.netMargin} />
              <Stat label="Avg Volume" value={derived.avgVolume} />
              <Stat label="Short Int." value={derived.shortInterest} />
              <Stat label="PT Consensus" value={derived.analystTarget} />
              <Stat label="D/E Ratio" value={derived.debtEquity} />
              <Stat label="Rev Growth" value={derived.revenueGrowth}
                color={derived.revenueGrowth.startsWith('+') ? 'text-emerald-400/60' : 'text-rose-400/60'} />
            </>
          )}
          {type === 'crypto' && (
            <>
              <Stat label="Circulating" value={derived.circulatingSupply} />
              <Stat label="TVL" value={derived.tvl} />
              <Stat label="Staking" value={derived.stakingYield} />
              <Stat label="Daily Tx" value={derived.dailyTx} />
              <Stat label="Active Addr" value={derived.activeAddresses} />
              <Stat label="FDV/MCap" value={derived.fdvRatio} />
              <Stat label="Consensus" value={derived.consensus} />
            </>
          )}
          {type === 'forex' && (
            <>
              <Stat label="Spread" value={derived.spread} />
              <Stat label="Swap Long" value={derived.swapLong} />
              <Stat label="Swap Short" value={derived.swapShort} />
              <Stat label="Avg Range" value={derived.avgDailyRange} />
              <Stat label="Correlated" value={derived.topCorrelation} />
              <Stat label="Peak Session" value={derived.peakSession} />
            </>
          )}
          {type === 'commodity' && (
            <>
              <Stat label="Contract" value={derived.contractSize} />
              <Stat label="Seasonality" value={derived.seasonality} />
              <Stat label="Inventory" value={derived.inventoryChg} />
              <Stat label="Curve" value={derived.curvature} />
              <Stat label="Top Producer" value={derived.topProducer} />
            </>
          )}
          {type === 'bond' && (
            <>
              <Stat label="Duration" value={derived.duration} />
              <Stat label="Yield" value={derived.yield} />
              <Stat label="Coupon" value={derived.coupon} />
              <Stat label="Rating" value={derived.creditRating} />
              <Stat label="Convexity" value={derived.convexity} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
