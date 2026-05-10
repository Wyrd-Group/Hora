import { describe, it, expect } from 'vitest';
import { buildMigrator } from '../store/migrations';

describe('buildMigrator', () => {
  it('runs only migrations above the current version', () => {
    const migrate = buildMigrator({
      1: (s: any) => ({ ...s, a: 1 }),
      2: (s: any) => ({ ...s, b: 2 }),
      3: (s: any) => ({ ...s, c: 3 }),
    });
    const out = migrate({}, 1) as any;
    expect(out).toEqual({ b: 2, c: 3 });
  });

  it('runs all migrations when from is 0', () => {
    const migrate = buildMigrator({
      1: (s: any) => ({ ...s, a: 1 }),
      2: (s: any) => ({ ...s, b: 2 }),
    });
    const out = migrate({}, 0) as any;
    expect(out).toEqual({ a: 1, b: 2 });
  });

  it('is a no-op when already at latest version', () => {
    const migrate = buildMigrator({ 1: (s: any) => ({ ...s, a: 1 }) });
    const prev = { existing: true };
    expect(migrate(prev, 1)).toEqual(prev);
  });

  it('runs migrations in numeric order, not insertion order', () => {
    const migrate = buildMigrator({
      3: (s: any) => ({ ...s, order: [...(s.order ?? []), 3] }),
      1: (s: any) => ({ ...s, order: [...(s.order ?? []), 1] }),
      2: (s: any) => ({ ...s, order: [...(s.order ?? []), 2] }),
    });
    const out = migrate({}, 0) as any;
    expect(out.order).toEqual([1, 2, 3]);
  });

  it('rethrows if a migration step throws', () => {
    const migrate = buildMigrator({
      1: () => {
        throw new Error('broken step');
      },
    });
    expect(() => migrate({}, 0)).toThrow(/broken step/);
  });
});
