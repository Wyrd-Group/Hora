/**
 * Persisted-store migration helpers.
 *
 * Why: the Zustand persist middleware will silently drop or mis-merge fields
 * when a store's shape changes across releases. These helpers centralise the
 * "version + migrate" pattern so every persisted store gets rename-safe
 * upgrades rather than wiping user saves.
 *
 * Usage inside a persisted store:
 *
 *   import { buildMigrator } from './migrations';
 *
 *   const migrate = buildMigrator({
 *     1: (s) => ({ ...s, newField: 0 }),
 *     2: (s) => ({ ...s, newField: (s.newField ?? 0) + 10 }),
 *   });
 *
 *   persist(..., { version: 2, migrate })
 */

import { createLogger } from '../lib/logger';

const log = createLogger('store:migrate');

export type Migration<T = unknown> = (state: T) => T;
export type MigrationMap = Record<number, Migration>;

/**
 * Build a migrate function compatible with Zustand persist.
 * Iterates each registered version in order, applying only those > `from`.
 */
export function buildMigrator(map: MigrationMap) {
  const versions = Object.keys(map)
    .map((n) => parseInt(n, 10))
    .sort((a, b) => a - b);

  return (state: unknown, from: number) => {
    let out = state;
    for (const v of versions) {
      if (v > from) {
        try {
          out = map[v]!(out);
          log.info(`migrated to v${v}`, { from, to: v });
        } catch (e) {
          log.error(e as Error, { migratingTo: v, from });
          // Re-throw: persist will fall back to the default state, which is
          // safer than partial-migration corruption.
          throw e;
        }
      }
    }
    return out;
  };
}
