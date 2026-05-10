import { describe, it, expect } from 'vitest';
import { createRNG, hashString, globalRNG } from '../lib/rng';

describe('createRNG — deterministic seeded RNG', () => {
  it('same numeric seed → identical sequence', () => {
    const a = createRNG(42);
    const b = createRNG(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('different seeds → different sequences', () => {
    const a = createRNG(1);
    const b = createRNG(2);
    const samplesA = Array.from({ length: 50 }, () => a.next());
    const samplesB = Array.from({ length: 50 }, () => b.next());
    expect(samplesA).not.toEqual(samplesB);
  });

  it('string seeds are hashed deterministically', () => {
    const a = createRNG('match-2026-04-20');
    const b = createRNG('match-2026-04-20');
    expect(a.next()).toBe(b.next());
    expect(a.next()).toBe(b.next());
  });

  it('seed 0 is remapped so xorshift does not collapse', () => {
    const rng = createRNG(0);
    const n = rng.next();
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(1);
    expect(rng.next()).not.toBe(n); // sequence advances
  });

  it('next() stays in [0, 1)', () => {
    const rng = createRNG(123);
    for (let i = 0; i < 1000; i++) {
      const n = rng.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('int(min, max) respects inclusive bounds', () => {
    const rng = createRNG(7);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 500; i++) {
      const n = rng.int(3, 10);
      expect(Number.isInteger(n)).toBe(true);
      if (n < min) min = n;
      if (n > max) max = n;
    }
    expect(min).toBe(3);
    expect(max).toBe(10);
  });

  it('pick() returns only elements from the array', () => {
    const rng = createRNG(9);
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 200; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it('pick() throws on empty array', () => {
    const rng = createRNG(9);
    expect(() => rng.pick([])).toThrow(/non-empty/);
  });

  it('chance(0) is never true, chance(1) is always true', () => {
    const rng = createRNG(1);
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('chance(0.5) is roughly balanced over a large sample', () => {
    const rng = createRNG(11);
    let hits = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) if (rng.chance(0.5)) hits++;
    // Allow ±5% slack around 0.5 — tight enough to catch stuck PRNGs.
    expect(hits / N).toBeGreaterThan(0.45);
    expect(hits / N).toBeLessThan(0.55);
  });

  it('shuffle() preserves length, elements, and does not mutate source', () => {
    const rng = createRNG(4);
    const src = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = rng.shuffle(src);
    expect(out).toHaveLength(src.length);
    expect([...out].sort((a, b) => a - b)).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // source untouched
  });

  it('normal() mean ≈ requested mean, stddev ≈ requested stddev', () => {
    const rng = createRNG(99);
    const samples = Array.from({ length: 4000 }, () => rng.normal(10, 2));
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance =
      samples.reduce((a, b) => a + (b - mean) * (b - mean), 0) / samples.length;
    const stddev = Math.sqrt(variance);
    expect(Math.abs(mean - 10)).toBeLessThan(0.2);
    expect(Math.abs(stddev - 2)).toBeLessThan(0.2);
  });

  it('getState / setState round-trips exactly', () => {
    const rng = createRNG(55);
    for (let i = 0; i < 10; i++) rng.next();
    const checkpoint = rng.getState();
    const afterA = [rng.next(), rng.next(), rng.next()];
    rng.setState(checkpoint);
    const afterB = [rng.next(), rng.next(), rng.next()];
    expect(afterB).toEqual(afterA);
  });

  it('setState(0) is remapped so RNG never locks', () => {
    const rng = createRNG(1);
    rng.setState(0);
    const n = rng.next();
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(1);
  });
});

describe('hashString', () => {
  it('is deterministic', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
  });

  it('different inputs → different outputs', () => {
    expect(hashString('hello')).not.toBe(hashString('world'));
  });

  it('returns a 32-bit integer', () => {
    const h = hashString('some-seed-string');
    expect(Number.isInteger(h)).toBe(true);
    expect(Math.abs(h)).toBeLessThan(2 ** 32);
  });
});

describe('globalRNG', () => {
  it('returns numbers in [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const n = globalRNG.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('int respects inclusive bounds', () => {
    for (let i = 0; i < 100; i++) {
      const n = globalRNG.int(5, 8);
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(8);
    }
  });

  it('shuffle preserves content', () => {
    const src = [1, 2, 3, 4, 5];
    const out = globalRNG.shuffle(src);
    expect([...out].sort()).toEqual(src);
  });
});
