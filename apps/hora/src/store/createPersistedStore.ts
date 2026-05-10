import { create, StateCreator } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import { buildMigrator, MigrationMap } from './migrations';

/**
 * Factory for creating persisted Zustand stores with consistent config.
 * Each feature store gets its own localStorage key prefixed with 'empire-'.
 *
 * Pass `migrations` to declare a typed upgrade path. When the on-disk `version`
 * is older than the latest migration key, each v > persisted.version is applied
 * in numeric order before the store hydrates. See `./migrations.ts`.
 */
export function createPersistedStore<T extends object>(
  name: string,
  initializer: StateCreator<T, [], [['zustand/persist', T]]>,
  options?: Partial<PersistOptions<T>> & { migrations?: MigrationMap },
) {
  const { migrations, ...persistOptions } = options ?? {};
  const latestVersion = migrations
    ? Math.max(
        persistOptions.version ?? 1,
        ...Object.keys(migrations).map((n) => parseInt(n, 10)),
      )
    : persistOptions.version ?? 1;

  return create<T>()(
    persist(initializer, {
      name: `empire-${name}`,
      version: latestVersion,
      migrate: migrations
        ? (buildMigrator(migrations) as unknown as PersistOptions<T>['migrate'])
        : (persisted) => persisted as T,
      ...persistOptions,
    }),
  );
}
