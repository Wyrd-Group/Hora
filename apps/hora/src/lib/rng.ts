/**
 * Seeded pseudo-random number generator (xorshift32).
 *
 * Why: AEGIS Empire had 231 raw Math.random() calls across 55 files, making
 * replays, PvP desync detection, and test determinism all impossible. This
 * module provides a deterministic alternative that accepts an explicit seed.
 *
 * API mirrors a subset of Math: next() / int(min,max) / pick(arr) / chance(p).
 *
 * When to use: any gameplay code where the outcome should be reproducible
 * (match simulations, card pulls, AI decisions, exam-bonus rolls, replays).
 * When NOT to use: cryptographic randomness (use crypto.getRandomValues).
 */

export type RNG = {
  /** Returns a float in [0, 1). */
  next: () => number;
  /** Returns an integer in [min, max] inclusive. */
  int: (min: number, max: number) => number;
  /** Picks a uniformly random element from a non-empty array. */
  pick: <T>(arr: readonly T[]) => T;
  /** Returns true with probability `p` (0..1). */
  chance: (p: number) => boolean;
  /** Shuffles a copy of the array (Fisher–Yates). */
  shuffle: <T>(arr: readonly T[]) => T[];
  /** Returns a Gaussian-distributed number with given mean and stddev. */
  normal: (mean?: number, stddev?: number) => number;
  /** Current internal state — useful for persisting/restoring mid-match. */
  getState: () => number;
  /** Reseed in place (keeps the same RNG identity). */
  setState: (seed: number) => void;
};

// xorshift32 — fast, deterministic, 32-bit period ≈ 2³² − 1.
// Adequate for gameplay; NOT crypto-secure.
function xorshift32(seed: number): number {
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x | 0;
}

/**
 * Create an RNG from a seed. A seed of 0 is remapped to a non-zero value
 * because xorshift collapses to 0 from a zero state.
 */
export function createRNG(seed: number | string = Date.now()): RNG {
  let state = typeof seed === 'string' ? hashString(seed) : (seed | 0);
  if (state === 0) state = 2463534242 | 0;

  const next = (): number => {
    state = xorshift32(state);
    // Map 32-bit signed int to [0, 1).
    return (state >>> 0) / 0x100000000;
  };

  const int = (min: number, max: number): number => {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return lo + Math.floor(next() * (hi - lo + 1));
  };

  const pick = <T>(arr: readonly T[]): T => {
    if (!arr.length) throw new Error('pick() requires a non-empty array');
    return arr[int(0, arr.length - 1)]!;
  };

  const chance = (p: number): boolean => next() < p;

  const shuffle = <T>(arr: readonly T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  };

  // Box–Muller transform for Gaussian.
  const normal = (mean = 0, stddev = 1): number => {
    const u = Math.max(next(), Number.EPSILON);
    const v = next();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + z * stddev;
  };

  return {
    next,
    int,
    pick,
    chance,
    shuffle,
    normal,
    getState: () => state,
    setState: (s: number) => {
      state = s | 0;
      if (state === 0) state = 2463534242 | 0;
    },
  };
}

/** FNV-1a hash — maps a string seed to a 32-bit integer. */
export function hashString(str: string): number {
  let h = 2166136261 | 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

/**
 * Global "unseeded" RNG — uses Math.random under the hood so callers that
 * don't care about determinism can still use this module's API uniformly.
 */
export const globalRNG: RNG = {
  next: () => Math.random(),
  int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  pick: (arr) => {
    if (!arr.length) throw new Error('pick() requires a non-empty array');
    return arr[Math.floor(Math.random() * arr.length)]!;
  },
  chance: (p) => Math.random() < p,
  shuffle: (arr) => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  },
  normal: (mean = 0, stddev = 1) => {
    const u = Math.max(Math.random(), Number.EPSILON);
    const v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + z * stddev;
  },
  getState: () => 0,
  setState: () => {},
};
