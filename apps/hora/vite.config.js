/**
 * Hora — vite config.
 *
 * Stripped of AEGIS's Athena + Stripe dev-proxy plugins. Hora has no
 * server-side AI proxy yet, and no IAP wiring until TestFlight. When
 * those land they get their own plugins in their own commits.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    // Let Vite auto-chunk; Hora is small enough that manual chunks are
    // premature. Add when bundle profiling tells us we need to.
    target: 'es2020',
  },
});
