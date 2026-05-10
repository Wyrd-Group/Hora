/**
 * sandboxWorker.js — Isolated Web Worker for executing AI-generated game features.
 *
 * Receives code + game state snapshot, runs code in a frozen sandbox,
 * and returns queued actions + logs. No DOM, network, or storage access.
 */

/* ── Lock down the Worker global ────────────────────────────────── */
const BLOCKED = [
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource',
  'importScripts', 'eval',
  'indexedDB', 'caches', 'navigator',
];
for (const name of BLOCKED) {
  try { self[name] = undefined; } catch { /* frozen */ }
}

/* ── Message handler ────────────────────────────────────────────── */
self.onmessage = function (e) {
  const { code, gameState } = e.data;
  if (!code) return self.postMessage({ type: 'error', message: 'No code provided' });

  const actions = [];
  const logs = [];
  const uiRegistrations = [];

  // Build the frozen Game SDK
  const game = Object.freeze({
    state: Object.freeze(JSON.parse(JSON.stringify(gameState || {}))),

    actions: Object.freeze({
      spawnInstrument: (params) => actions.push({ type: 'spawnInstrument', params }),
      createEvent:     (params) => actions.push({ type: 'createEvent', params }),
      spawnNode:       (params) => actions.push({ type: 'spawnNode', params }),
      createMission:   (params) => actions.push({ type: 'createMission', params }),
      shiftRegime:     (params) => actions.push({ type: 'shiftRegime', params }),
      injectNews:      (params) => actions.push({ type: 'injectNews', params }),
      addMoney:        (amount) => actions.push({ type: 'addMoney', params: { amount } }),
      deductMoney:     (amount) => actions.push({ type: 'deductMoney', params: { amount } }),
      emitEvent:       (name, data) => actions.push({ type: 'emitEvent', params: { name, data } }),
    }),

    ui: Object.freeze({
      registerPanel:  (def) => uiRegistrations.push({ type: 'panel', ...def }),
      registerAction: (def) => uiRegistrations.push({ type: 'action', ...def }),
      registerTicker: (def) => uiRegistrations.push({ type: 'ticker', ...def }),
    }),

    utils: Object.freeze({
      random: (min, max) => min + Math.random() * (max - min),
      uid: (prefix) => `${prefix || 'f'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      formatMoney: (n) => n >= 1e9 ? `€${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n / 1e3).toFixed(1)}K` : `€${Math.round(n)}`,
      now: () => Date.now(),
      log: (...args) => logs.push(args.map(String).join(' ')),
    }),
  });

  try {
    // Execute the code with only the game SDK available
    const fn = new Function('game', `"use strict";\n${code}`);
    const returnValue = fn(game);

    self.postMessage({
      type: 'result',
      success: true,
      actions,
      uiRegistrations,
      logs,
      returnValue: typeof returnValue === 'object' ? JSON.parse(JSON.stringify(returnValue)) : returnValue,
    });
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err.message || String(err),
      actions,
      logs,
    });
  }
};
