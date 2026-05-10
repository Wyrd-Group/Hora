import React, { useMemo } from 'react';
import { sma, ema, bollingerBands } from '../../lib/indicators';

/**
 * IndicatorOverlay — SVG overlay for SMA, EMA, and Bollinger Bands
 * on top of the price chart canvas.
 *
 * Props:
 *   priceHistory: number[]       — closing prices
 *   width: number                — chart pixel width
 *   height: number               — chart pixel height
 *   visibleRange: [number, number] — [startIdx, endIdx] of visible data
 *   indicators: { sma: boolean, ema: boolean, bb: boolean }
 *   smaColor?: string
 *   emaColor?: string
 *   bbColor?: string
 */
const IndicatorOverlay = ({
  priceHistory = [],
  width = 600,
  height = 300,
  visibleRange = [0, 0],
  indicators = { sma: false, ema: false, bb: false },
  smaColor = '#facc15',
  emaColor = '#ec4899',
  bbColor = '#6366f1',
}) => {
  const [startIdx, endIdx] = visibleRange;
  const visiblePrices = useMemo(
    () => priceHistory.slice(startIdx, endIdx + 1),
    [priceHistory, startIdx, endIdx],
  );

  // Compute visible min/max for Y-axis scaling
  const { priceMin, priceMax } = useMemo(() => {
    if (visiblePrices.length === 0) return { priceMin: 0, priceMax: 1 };
    let min = Infinity;
    let max = -Infinity;
    for (const p of visiblePrices) {
      if (p < min) min = p;
      if (p > max) max = p;
    }
    const pad = (max - min) * 0.05 || 1;
    return { priceMin: min - pad, priceMax: max + pad };
  }, [visiblePrices]);

  const pad = { top: 8, bottom: 8, left: 0, right: 0 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const toX = (i) => pad.left + (i / Math.max(visiblePrices.length - 1, 1)) * chartW;
  const toY = (v) => pad.top + (1 - (v - priceMin) / (priceMax - priceMin || 1)) * chartH;

  // Compute indicator values on the FULL history, then slice to visible
  const smaValues = useMemo(
    () => (indicators.sma ? sma(priceHistory, 20).slice(startIdx, endIdx + 1) : []),
    [priceHistory, indicators.sma, startIdx, endIdx],
  );

  const emaValues = useMemo(
    () => (indicators.ema ? ema(priceHistory, 12).slice(startIdx, endIdx + 1) : []),
    [priceHistory, indicators.ema, startIdx, endIdx],
  );

  const bbValues = useMemo(
    () => (indicators.bb ? bollingerBands(priceHistory, 20, 2) : null),
    [priceHistory, indicators.bb],
  );

  const bbSliced = useMemo(() => {
    if (!bbValues) return null;
    return {
      upper: bbValues.upper.slice(startIdx, endIdx + 1),
      middle: bbValues.middle.slice(startIdx, endIdx + 1),
      lower: bbValues.lower.slice(startIdx, endIdx + 1),
    };
  }, [bbValues, startIdx, endIdx]);

  // Build SVG path from indicator values
  function buildPath(values) {
    let d = '';
    let started = false;
    values.forEach((v, i) => {
      if (v === null || v === undefined) {
        started = false;
        return;
      }
      const x = toX(i);
      const y = toY(v);
      if (!started) {
        d += `M${x.toFixed(1)},${y.toFixed(1)}`;
        started = true;
      } else {
        d += `L${x.toFixed(1)},${y.toFixed(1)}`;
      }
    });
    return d;
  }

  // Build fill area between upper and lower BB
  function buildBBFill(upper, lower) {
    let upperPath = '';
    let lowerPath = '';
    let startedUpper = false;
    const lowerReverse = [];

    for (let i = 0; i < upper.length; i++) {
      if (upper[i] === null || lower[i] === null) {
        startedUpper = false;
        continue;
      }
      const x = toX(i);
      const yu = toY(upper[i]);
      const yl = toY(lower[i]);

      if (!startedUpper) {
        upperPath += `M${x.toFixed(1)},${yu.toFixed(1)}`;
        startedUpper = true;
      } else {
        upperPath += `L${x.toFixed(1)},${yu.toFixed(1)}`;
      }
      lowerReverse.push(`${x.toFixed(1)},${yl.toFixed(1)}`);
    }

    if (lowerReverse.length === 0) return '';
    const lowerPathStr = lowerReverse.reverse().map((p, i) => (i === 0 ? `L${p}` : `L${p}`)).join('');
    return `${upperPath}${lowerPathStr}Z`;
  }

  if (visiblePrices.length < 2) return null;

  return (
    <svg
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {/* Bollinger Bands fill */}
      {indicators.bb && bbSliced && (
        <path
          d={buildBBFill(bbSliced.upper, bbSliced.lower)}
          fill={bbColor}
          fillOpacity={0.06}
        />
      )}

      {/* Bollinger Bands lines */}
      {indicators.bb && bbSliced && (
        <>
          <path d={buildPath(bbSliced.upper)} stroke={bbColor} strokeWidth={1} fill="none" strokeOpacity={0.5} />
          <path d={buildPath(bbSliced.middle)} stroke={bbColor} strokeWidth={1} fill="none" strokeOpacity={0.7} strokeDasharray="4,3" />
          <path d={buildPath(bbSliced.lower)} stroke={bbColor} strokeWidth={1} fill="none" strokeOpacity={0.5} />
        </>
      )}

      {/* SMA line */}
      {indicators.sma && smaValues.length > 0 && (
        <path d={buildPath(smaValues)} stroke={smaColor} strokeWidth={1.5} fill="none" strokeOpacity={0.9} />
      )}

      {/* EMA line */}
      {indicators.ema && emaValues.length > 0 && (
        <path d={buildPath(emaValues)} stroke={emaColor} strokeWidth={1.5} fill="none" strokeOpacity={0.9} />
      )}
    </svg>
  );
};

export default IndicatorOverlay;
