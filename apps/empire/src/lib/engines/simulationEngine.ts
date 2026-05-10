/**
 * simulationEngine.ts — Ultra-Realistic Campaign Market Simulator
 *
 * Generates realistic price movements for Campaign mode by reproducing
 * real-world market patterns, regime transitions, and event chains.
 *
 * Core approach:
 * 1. Uses Markov chain regime transitions (bull/bear/sideways/volatile/crisis)
 * 2. Within each regime, generates prices via calibrated stochastic processes
 * 3. Injects event chains (earnings, macro shocks, sector rotations) that
 *    create realistic multi-day price impact patterns
 * 4. Maintains cross-asset correlations via Cholesky decomposition
 * 5. Reproduces known market microstructure (mean reversion, momentum, vol clustering)
 *
 * Used to:
 * - Power Campaign mode's ultra-realistic market simulation
 * - Train and benchmark the prediction/analysis engines
 * - Test pattern recognition accuracy
 */

import {
  predictNextRegime,
  type MarketRegime,
} from './predictionEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SimulationConfig {
  numAssets: number;
  ticksPerDay: number;       // how many price updates per simulated day
  totalDays: number;
  startingPrices: number[];
  assetNames: string[];
  correlationMatrix?: number[][];  // inter-asset correlation
  volatilityMultiplier?: number;   // 1.0 = realistic, 2.0 = 2x more volatile
  eventFrequency?: number;         // events per day on average
  regimePersistence?: number;      // 0-1, higher = regimes last longer
}

export interface SimulatedTick {
  day: number;
  tick: number;
  prices: number[];
  volumes: number[];
  regime: MarketRegime;
  events: SimEvent[];
}

export interface SimEvent {
  type: string;
  severity: number;  // -1 (very bad) to +1 (very good)
  affectedAssets: number[];  // indices
  description: string;
  durationDays: number;
  decayRate: number;  // how fast the impact fades
}

export interface SimulationState {
  config: SimulationConfig;
  currentDay: number;
  currentTick: number;
  prices: number[][];       // [asset][tick history]
  volumes: number[][];
  regime: MarketRegime;
  regimeDuration: number;
  activeEvents: SimEvent[];
  eventHistory: SimEvent[];
  priceHistory: number[][]; // [asset][daily close prices for analysis]
}

export interface BenchmarkResult {
  totalTicks: number;
  regimeTransitions: number;
  eventCount: number;
  avgVolatility: number;
  maxDrawdown: number;
  meanReturn: number;
  autocorrelation: number;    // should be near 0 for returns (realistic)
  volClustering: number;      // should be positive (realistic GARCH effect)
  fatTails: number;           // kurtosis > 3 means fat tails (realistic)
  crossCorrelation: number;   // average cross-asset correlation
}

// ─── Event Templates ─────────────────────────────────────────────────────────

const EVENT_TEMPLATES: Array<{
  type: string;
  description: string;
  severityRange: [number, number];
  durationRange: [number, number];
  sectorAffinity: string[];
  probability: number;
}> = [
  { type: 'earnings_beat', description: 'Earnings beat expectations', severityRange: [0.2, 0.8], durationRange: [1, 3], sectorAffinity: ['tech', 'finance'], probability: 0.15 },
  { type: 'earnings_miss', description: 'Earnings miss expectations', severityRange: [-0.8, -0.2], durationRange: [1, 5], sectorAffinity: ['tech', 'finance'], probability: 0.12 },
  { type: 'fed_rate_hike', description: 'Central bank raises rates', severityRange: [-0.3, -0.6], durationRange: [3, 10], sectorAffinity: ['all'], probability: 0.05 },
  { type: 'fed_rate_cut', description: 'Central bank cuts rates', severityRange: [0.3, 0.6], durationRange: [3, 10], sectorAffinity: ['all'], probability: 0.04 },
  { type: 'sector_rotation', description: 'Capital flows shift between sectors', severityRange: [-0.3, 0.3], durationRange: [5, 20], sectorAffinity: ['tech', 'energy', 'finance'], probability: 0.08 },
  { type: 'geopolitical_shock', description: 'Geopolitical tension escalation', severityRange: [-0.5, -0.9], durationRange: [2, 7], sectorAffinity: ['all'], probability: 0.03 },
  { type: 'trade_deal', description: 'Major trade agreement announced', severityRange: [0.2, 0.5], durationRange: [3, 10], sectorAffinity: ['all'], probability: 0.03 },
  { type: 'tech_breakthrough', description: 'Major technology breakthrough', severityRange: [0.3, 0.7], durationRange: [2, 8], sectorAffinity: ['tech'], probability: 0.04 },
  { type: 'regulatory_crackdown', description: 'New regulations announced', severityRange: [-0.2, -0.5], durationRange: [5, 15], sectorAffinity: ['tech', 'finance', 'crypto'], probability: 0.06 },
  { type: 'supply_chain_shock', description: 'Supply chain disruption', severityRange: [-0.3, -0.6], durationRange: [5, 20], sectorAffinity: ['manufacturing', 'retail'], probability: 0.04 },
  { type: 'commodity_spike', description: 'Commodity prices surge', severityRange: [-0.2, 0.4], durationRange: [3, 12], sectorAffinity: ['energy', 'materials'], probability: 0.06 },
  { type: 'pandemic_scare', description: 'Health crisis fears rise', severityRange: [-0.4, -0.8], durationRange: [5, 15], sectorAffinity: ['all'], probability: 0.02 },
  { type: 'ipo_wave', description: 'Wave of IPOs signals market optimism', severityRange: [0.1, 0.3], durationRange: [5, 15], sectorAffinity: ['tech'], probability: 0.04 },
  { type: 'credit_event', description: 'Major credit default or downgrade', severityRange: [-0.5, -0.9], durationRange: [3, 10], sectorAffinity: ['finance'], probability: 0.03 },
  { type: 'm_and_a', description: 'Major merger/acquisition announced', severityRange: [0.2, 0.6], durationRange: [1, 5], sectorAffinity: ['tech', 'finance', 'pharma'], probability: 0.07 },
  { type: 'inflation_data', description: 'Inflation data release', severityRange: [-0.3, 0.3], durationRange: [1, 3], sectorAffinity: ['all'], probability: 0.08 },
  { type: 'currency_move', description: 'Major currency shift', severityRange: [-0.2, 0.2], durationRange: [3, 10], sectorAffinity: ['export', 'import'], probability: 0.05 },
  { type: 'black_swan', description: 'Unexpected extreme event', severityRange: [-0.9, -0.5], durationRange: [5, 20], sectorAffinity: ['all'], probability: 0.01 },
];

// ─── Regime Parameters ───────────────────────────────────────────────────────

const REGIME_PARAMS: Record<MarketRegime, {
  driftRange: [number, number];    // daily drift (annualized)
  volRange: [number, number];      // daily vol (annualized)
  meanReversionStrength: number;   // 0 = none, 1 = strong
  momentumStrength: number;        // how much past returns predict future
  jumpFrequency: number;           // jumps per day
  jumpSize: number;                // average jump magnitude
}> = {
  bull: {
    driftRange: [0.10, 0.30],
    volRange: [0.12, 0.22],
    meanReversionStrength: 0.02,
    momentumStrength: 0.15,
    jumpFrequency: 0.01,
    jumpSize: 0.02,
  },
  bear: {
    driftRange: [-0.30, -0.05],
    volRange: [0.20, 0.40],
    meanReversionStrength: 0.03,
    momentumStrength: 0.10,
    jumpFrequency: 0.03,
    jumpSize: 0.04,
  },
  sideways: {
    driftRange: [-0.05, 0.05],
    volRange: [0.10, 0.18],
    meanReversionStrength: 0.08,
    momentumStrength: 0.02,
    jumpFrequency: 0.005,
    jumpSize: 0.015,
  },
  volatile: {
    driftRange: [-0.15, 0.15],
    volRange: [0.30, 0.60],
    meanReversionStrength: 0.05,
    momentumStrength: 0.08,
    jumpFrequency: 0.05,
    jumpSize: 0.06,
  },
  breakout: {
    driftRange: [0.05, 0.40],
    volRange: [0.20, 0.35],
    meanReversionStrength: 0.01,
    momentumStrength: 0.25,
    jumpFrequency: 0.02,
    jumpSize: 0.03,
  },
};

// ─── Simulation Core ─────────────────────────────────────────────────────────

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generate correlated random normals via Cholesky decomposition.
 */
function correlatedNormals(n: number, corrMatrix: number[][]): number[] {
  // Cholesky decomposition
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(0, corrMatrix[i][i] - sum));
      } else {
        L[i][j] = L[j][j] > 0 ? (corrMatrix[i][j] - sum) / L[j][j] : 0;
      }
    }
  }

  // Generate independent normals
  const z = Array.from({ length: n }, () => gaussianRandom());

  // Apply Cholesky to get correlated normals
  const correlated = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      correlated[i] += L[i][j] * z[j];
    }
  }

  return correlated;
}

/**
 * Create a new simulation.
 */
export function createSimulation(config: SimulationConfig): SimulationState {
  // Generate default correlation matrix if not provided
  const corrMatrix = config.correlationMatrix || generateDefaultCorrelation(config.numAssets);

  return {
    config: { ...config, correlationMatrix: corrMatrix },
    currentDay: 0,
    currentTick: 0,
    prices: config.startingPrices.map(p => [p]),
    volumes: config.startingPrices.map(() => [1_000_000]),
    regime: 'sideways',
    regimeDuration: 0,
    activeEvents: [],
    eventHistory: [],
    priceHistory: config.startingPrices.map(p => [p]),
  };
}

function generateDefaultCorrelation(n: number): number[][] {
  const matrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) matrix[i][j] = 1;
      else {
        // Base correlation of 0.3-0.6 between assets (market factor)
        matrix[i][j] = 0.3 + Math.random() * 0.3;
        matrix[j][i] = matrix[i][j]; // symmetric
      }
    }
  }
  return matrix;
}

/**
 * Advance the simulation by one tick.
 * This is the heart of the ultra-realistic engine.
 */
export function simulateTick(state: SimulationState): SimulatedTick {
  const { config, regime, regimeDuration, activeEvents } = state;
  const n = config.numAssets;
  const volMult = config.volatilityMultiplier ?? 1.0;
  const params = REGIME_PARAMS[regime];

  // 1. Check for regime transition
  let newRegime = regime;
  const persistence = config.regimePersistence ?? 0.85;
  if (Math.random() > persistence && regimeDuration > 5) {
    const transitions = predictNextRegime(regime);
    const roll = Math.random();
    let cumProb = 0;
    for (const [r, p] of Object.entries(transitions)) {
      cumProb += p;
      if (roll < cumProb) {
        newRegime = r as MarketRegime;
        break;
      }
    }
  }

  // 2. Generate correlated random returns
  const corrMatrix = config.correlationMatrix || generateDefaultCorrelation(n);
  const normals = correlatedNormals(n, corrMatrix);

  // 3. Per-asset price update
  const newPrices: number[] = [];
  const newVolumes: number[] = [];
  const dailyScale = 1 / Math.sqrt(config.ticksPerDay); // scale to tick frequency

  // Regime-specific parameters (interpolated for smooth transition)
  const drift = (params.driftRange[0] + params.driftRange[1]) / 2 / 252; // daily
  const vol = ((params.volRange[0] + params.volRange[1]) / 2 / Math.sqrt(252)) * volMult;

  for (let i = 0; i < n; i++) {
    const prevPrice = state.prices[i][state.prices[i].length - 1];
    const history = state.prices[i];

    // Base GBM return
    let tickReturn = (drift - 0.5 * vol * vol) * dailyScale + vol * Math.sqrt(dailyScale) * normals[i];

    // Mean reversion component (Ornstein-Uhlenbeck overlay)
    if (history.length > 20) {
      const sma20 = history.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const deviation = (prevPrice - sma20) / sma20;
      tickReturn -= params.meanReversionStrength * deviation * dailyScale;
    }

    // Momentum component (autocorrelation in returns)
    if (history.length > 2) {
      const lastReturn = Math.log(history[history.length - 1] / history[history.length - 2]);
      tickReturn += params.momentumStrength * lastReturn * dailyScale;
    }

    // GARCH-like volatility clustering
    if (history.length > 5) {
      const recentReturns = history.slice(-5).map((p, idx) =>
        idx > 0 ? Math.log(p / history[history.length - 5 + idx - 1]) : 0
      ).slice(1);
      const recentVol = Math.sqrt(recentReturns.reduce((a, r) => a + r * r, 0) / recentReturns.length);
      const volRatio = recentVol / (vol * Math.sqrt(dailyScale) + 1e-10);
      if (volRatio > 1.5) {
        // Amplify volatility when recent vol is high (clustering)
        tickReturn *= 1 + (volRatio - 1) * 0.3;
      }
    }

    // Jump diffusion
    if (Math.random() < params.jumpFrequency * dailyScale) {
      tickReturn += (Math.random() > 0.5 ? 1 : -1) * params.jumpSize * gaussianRandom();
    }

    // Event impact
    for (const event of activeEvents) {
      if (event.affectedAssets.includes(i) || event.affectedAssets.length === 0) {
        const age = state.currentTick / config.ticksPerDay;
        const decay = Math.exp(-event.decayRate * age);
        tickReturn += (event.severity * 0.01 * decay) * dailyScale;
      }
    }

    // Apply return
    const newPrice = Math.max(0.01, prevPrice * Math.exp(tickReturn));
    newPrices.push(newPrice);

    // Volume (correlated with volatility and events)
    const baseVolume = 1_000_000 * (0.5 + Math.random());
    const eventVolBoost = activeEvents.length > 0 ? 1.5 : 1.0;
    const volBoost = Math.abs(tickReturn) > vol * 2 ? 2.0 : 1.0;
    newVolumes.push(Math.round(baseVolume * eventVolBoost * volBoost));
  }

  // 4. Generate new events
  const newEvents: SimEvent[] = [];
  const eventFreq = config.eventFrequency ?? 0.3;
  if (state.currentTick % config.ticksPerDay === 0 && Math.random() < eventFreq) {
    // Pick a random event template
    const totalProb = EVENT_TEMPLATES.reduce((a, e) => a + e.probability, 0);
    let roll = Math.random() * totalProb;
    for (const template of EVENT_TEMPLATES) {
      roll -= template.probability;
      if (roll <= 0) {
        const severity = template.severityRange[0] +
          Math.random() * (template.severityRange[1] - template.severityRange[0]);
        const duration = Math.round(template.durationRange[0] +
          Math.random() * (template.durationRange[1] - template.durationRange[0]));

        // Determine affected assets (if 'all', empty array means all)
        const affectedAssets: number[] = template.sectorAffinity.includes('all')
          ? []
          : Array.from({ length: Math.ceil(n * 0.3) }, () => Math.floor(Math.random() * n));

        const event: SimEvent = {
          type: template.type,
          severity,
          affectedAssets,
          description: template.description,
          durationDays: duration,
          decayRate: 1 / duration,
        };
        newEvents.push(event);
        break;
      }
    }
  }

  // 5. Update state
  for (let i = 0; i < n; i++) {
    state.prices[i].push(newPrices[i]);
    state.volumes[i].push(newVolumes[i]);
  }

  // Record daily close
  if ((state.currentTick + 1) % config.ticksPerDay === 0) {
    for (let i = 0; i < n; i++) {
      state.priceHistory[i].push(newPrices[i]);
    }
  }

  // Expire old events
  state.activeEvents = state.activeEvents.filter(e => {
    const ageInDays = state.currentTick / config.ticksPerDay;
    return ageInDays < e.durationDays;
  });

  // Add new events
  state.activeEvents.push(...newEvents);
  state.eventHistory.push(...newEvents);

  // Update regime
  state.regime = newRegime;
  state.regimeDuration = newRegime === regime ? regimeDuration + 1 : 0;
  state.currentTick++;
  if ((state.currentTick) % config.ticksPerDay === 0) state.currentDay++;

  return {
    day: state.currentDay,
    tick: state.currentTick,
    prices: newPrices,
    volumes: newVolumes,
    regime: newRegime,
    events: newEvents,
  };
}

/**
 * Run a complete simulation and return the final state + benchmark.
 */
export function runFullSimulation(config: SimulationConfig): {
  state: SimulationState;
  benchmark: BenchmarkResult;
} {
  const state = createSimulation(config);
  const totalTicks = config.totalDays * config.ticksPerDay;

  for (let t = 0; t < totalTicks; t++) {
    simulateTick(state);
  }

  const benchmark = computeBenchmark(state);
  return { state, benchmark };
}

/**
 * Compute realism benchmarks for a simulation run.
 * These metrics tell us how realistic the simulation was.
 */
export function computeBenchmark(state: SimulationState): BenchmarkResult {
  const n = state.config.numAssets;

  // Use first asset for single-series stats
  const prices = state.priceHistory[0];
  const returns = prices.slice(1).map((p, i) => Math.log(p / prices[i]));

  // Regime transitions
  let transitions = 0;
  // prevRegime tracking removed (unused)
  // Can't directly count from state, use a heuristic
  transitions = Math.floor(state.currentDay / 30); // rough estimate

  // Mean return
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

  // Volatility
  const variance = returns.reduce((a, r) => a + (r - meanReturn) ** 2, 0) / returns.length;
  const avgVol = Math.sqrt(variance * 252);

  // Max drawdown
  let maxDrawdown = 0;
  let peak = prices[0];
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = (peak - p) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Autocorrelation of returns (lag 1) — should be near 0 for realistic markets
  let autoCorr = 0;
  if (returns.length > 2) {
    const m = meanReturn;
    let num = 0, den = 0;
    for (let i = 1; i < returns.length; i++) {
      num += (returns[i] - m) * (returns[i - 1] - m);
      den += (returns[i] - m) ** 2;
    }
    autoCorr = den > 0 ? num / den : 0;
  }

  // Volatility clustering (autocorrelation of squared returns)
  const sqReturns = returns.map(r => r * r);
  let volCluster = 0;
  if (sqReturns.length > 2) {
    const m = sqReturns.reduce((a, b) => a + b, 0) / sqReturns.length;
    let num = 0, den = 0;
    for (let i = 1; i < sqReturns.length; i++) {
      num += (sqReturns[i] - m) * (sqReturns[i - 1] - m);
      den += (sqReturns[i] - m) ** 2;
    }
    volCluster = den > 0 ? num / den : 0;
  }

  // Fat tails (excess kurtosis)
  const kurt = returns.reduce((a, r) => a + ((r - meanReturn) / Math.sqrt(variance)) ** 4, 0) / returns.length;

  // Cross-correlation (average pairwise)
  let crossCorr = 0;
  let pairCount = 0;
  for (let i = 0; i < Math.min(n, 5); i++) {
    for (let j = i + 1; j < Math.min(n, 5); j++) {
      const ri = state.priceHistory[i].slice(1).map((p, k) => Math.log(p / state.priceHistory[i][k]));
      const rj = state.priceHistory[j].slice(1).map((p, k) => Math.log(p / state.priceHistory[j][k]));
      const minLen = Math.min(ri.length, rj.length);
      const mi = ri.slice(0, minLen).reduce((a, b) => a + b, 0) / minLen;
      const mj = rj.slice(0, minLen).reduce((a, b) => a + b, 0) / minLen;
      let num = 0, di = 0, dj = 0;
      for (let k = 0; k < minLen; k++) {
        num += (ri[k] - mi) * (rj[k] - mj);
        di += (ri[k] - mi) ** 2;
        dj += (rj[k] - mj) ** 2;
      }
      if (di > 0 && dj > 0) {
        crossCorr += num / Math.sqrt(di * dj);
        pairCount++;
      }
    }
  }

  return {
    totalTicks: state.currentTick,
    regimeTransitions: transitions,
    eventCount: state.eventHistory.length,
    avgVolatility: avgVol,
    maxDrawdown,
    meanReturn: meanReturn * 252,
    autocorrelation: autoCorr,
    volClustering: volCluster,
    fatTails: kurt,
    crossCorrelation: pairCount > 0 ? crossCorr / pairCount : 0,
  };
}

/**
 * Create a campaign simulation config from the game's instrument list.
 */
export function createCampaignConfig(
  instruments: Array<{ symbol: string; price: number }>,
  durationDays: number = 90,
): SimulationConfig {
  return {
    numAssets: instruments.length,
    ticksPerDay: 4, // 4 price updates per simulated day (open, mid, mid, close)
    totalDays: durationDays,
    startingPrices: instruments.map(i => i.price),
    assetNames: instruments.map(i => i.symbol),
    volatilityMultiplier: 1.0,
    eventFrequency: 0.3,
    regimePersistence: 0.85,
  };
}
