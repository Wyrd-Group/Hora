/**
 * indicators.ts — Pure technical indicator functions
 *
 * Ported from MVP indicators.js. All functions are pure:
 * accept arrays of closing prices, return arrays of same length
 * with null-padding at the start where insufficient data exists.
 */

/**
 * Simple Moving Average.
 * Returns null for indices where fewer than `period` data points are available.
 */
export function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result[i] = sum / period;
  }
  return result;
}

/**
 * Exponential Moving Average.
 * Seeded with the SMA of the first `period` values, then applies
 * the standard EMA multiplier k = 2 / (period + 1).
 */
export function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return result;

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result[period - 1] = sum / period;

  const k = 2 / (period + 1);
  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + (result[i - 1] as number) * (1 - k);
  }
  return result;
}

/**
 * Bollinger Bands (middle = SMA, upper/lower = middle +/- stdDev * multiplier).
 * Default period=20, stdDev multiplier=2.
 */
export function bollingerBands(
  data: number[],
  period: number = 20,
  stdDev: number = 2,
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const mid = sma(data, period);
  const upper: (number | null)[] = new Array(data.length).fill(null);
  const lower: (number | null)[] = new Array(data.length).fill(null);

  for (let i = period - 1; i < data.length; i++) {
    let sqSum = 0;
    const m = mid[i] as number;
    for (let j = i - period + 1; j <= i; j++) {
      sqSum += (data[j] - m) ** 2;
    }
    const std = Math.sqrt(sqSum / period);
    upper[i] = m + stdDev * std;
    lower[i] = m - stdDev * std;
  }
  return { upper, middle: mid, lower };
}

/**
 * Relative Strength Index.
 * Uses Wilder's smoothed moving average (period default=14).
 */
export function rsi(data: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = data[i] - data[i - 1];
    if (delta > 0) avgGain += delta;
    else avgLoss -= delta;
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < data.length; i++) {
    const delta = data[i] - data[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

/**
 * MACD (Moving Average Convergence Divergence).
 * Returns MACD line (fast EMA - slow EMA), signal line (EMA of MACD), and histogram.
 * Default: fast=12, slow=26, signal=9.
 */
export function macd(
  data: number[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9,
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const emaFast = ema(data, fast);
  const emaSlow = ema(data, slow);
  const macdLine: (number | null)[] = new Array(data.length).fill(null);

  for (let i = 0; i < data.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) {
      macdLine[i] = (emaFast[i] as number) - (emaSlow[i] as number);
    }
  }

  // Signal line = EMA of the non-null MACD values
  const validMacd: number[] = [];
  const validIdx: number[] = [];
  macdLine.forEach((v, i) => {
    if (v !== null) {
      validMacd.push(v);
      validIdx.push(i);
    }
  });

  const sigEma = ema(validMacd, signal);
  const signalLine: (number | null)[] = new Array(data.length).fill(null);
  const histogram: (number | null)[] = new Array(data.length).fill(null);

  sigEma.forEach((v, j) => {
    if (v !== null) {
      const idx = validIdx[j];
      signalLine[idx] = v;
      histogram[idx] = (macdLine[idx] as number) - (v as number);
    }
  });

  return { macd: macdLine, signal: signalLine, histogram };
}
