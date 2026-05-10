import { defineConfig } from 'tsup';

export default defineConfig([
  // Node / CommonJS + ESM library entry
  {
    entry:   ['src/index.ts'],
    format:  ['cjs', 'esm'],
    dts:     true,
    clean:   true,
    external: ['@xmldom/xmldom'],
  },
  // Browser Web Worker bundle (IIFE — no external imports allowed in workers)
  {
    entry:   ['src/worker.ts'],
    format:  ['iife'],
    outDir:  'dist',
    platform: 'browser',
    bundle:  true,
    // xmldom is bundled into the worker so it's self-contained
  },
]);
