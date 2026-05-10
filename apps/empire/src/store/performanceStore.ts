import { create } from 'zustand';

/* ── Performance Presets ─────────────────────────────────────────────
   Users can pick a preset or tweak individual settings.
   Stored in localStorage so it persists across sessions.
   ──────────────────────────────────────────────────────────────────── */

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';
export type MapMode = '3d' | '2d';

export interface PerformanceSettings {
  /* Graphics */
  graphicsQuality: GraphicsQuality;
  mapMode: MapMode;              // '3d' = deck.gl WebGL globe, '2d' = flat static map
  particleEffects: boolean;      // glow, particles, backdrop-blur
  animationsEnabled: boolean;    // framer-motion, CSS transitions
  backdropBlur: boolean;         // backdrop-blur-* (expensive on mobile)

  /* Simulation */
  monteCarloIterations: number;  // paths for MC prediction (100–2000)
  tickRate: number;              // campaign tick interval ms (1000–10000)

  /* Data */
  maxChartCandles: number;       // OHLC candles rendered (50–500)
  trafficSimulation: boolean;    // vehicle animations on world map
}

const PRESETS: Record<string, PerformanceSettings> = {
  low: {
    graphicsQuality: 'low',
    mapMode: '2d',
    particleEffects: false,
    animationsEnabled: false,
    backdropBlur: false,
    monteCarloIterations: 200,
    tickRate: 10000,
    maxChartCandles: 50,
    trafficSimulation: false,
  },
  medium: {
    graphicsQuality: 'medium',
    mapMode: '3d',
    particleEffects: false,
    animationsEnabled: true,
    backdropBlur: false,
    monteCarloIterations: 500,
    tickRate: 5000,
    maxChartCandles: 150,
    trafficSimulation: true,
  },
  high: {
    graphicsQuality: 'high',
    mapMode: '3d',
    particleEffects: true,
    animationsEnabled: true,
    backdropBlur: true,
    monteCarloIterations: 1000,
    tickRate: 5000,
    maxChartCandles: 300,
    trafficSimulation: true,
  },
  ultra: {
    graphicsQuality: 'ultra',
    mapMode: '3d',
    particleEffects: true,
    animationsEnabled: true,
    backdropBlur: true,
    monteCarloIterations: 2000,
    tickRate: 5000,
    maxChartCandles: 500,
    trafficSimulation: true,
  },
};

/* Detect device capability */
function detectDefaultPreset(): string {
  if (typeof window === 'undefined') return 'high';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 2;
  const memory = (navigator as any).deviceMemory || 4; // GB, Chrome-only

  if (isMobile && (cores <= 4 || memory <= 3)) return 'low';
  if (isMobile) return 'medium';
  if (cores >= 8 && memory >= 8) return 'ultra';
  return 'high';
}

function loadPersistedSettings(): PerformanceSettings | null {
  try {
    const raw = localStorage.getItem('aegis-performance');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function getInitialSettings(): PerformanceSettings {
  const persisted = loadPersistedSettings();
  if (persisted) return persisted;
  const preset = detectDefaultPreset();
  return { ...PRESETS[preset] };
}

interface PerformanceStore extends PerformanceSettings {
  activePreset: string | null; // null = custom
  applyPreset: (preset: string) => void;
  setSetting: <K extends keyof PerformanceSettings>(key: K, value: PerformanceSettings[K]) => void;
}

export const usePerformanceStore = create<PerformanceStore>((set, get) => ({
  ...getInitialSettings(),
  activePreset: null,

  applyPreset: (preset: string) => {
    const settings = PRESETS[preset];
    if (!settings) return;
    set({ ...settings, activePreset: preset });
    localStorage.setItem('aegis-performance', JSON.stringify(settings));
  },

  setSetting: (key, value) => {
    set({ [key]: value, activePreset: null } as any);
    const state = get();
    const { applyPreset, setSetting, activePreset, ...settings } = state;
    localStorage.setItem('aegis-performance', JSON.stringify(settings));
  },
}));

export { PRESETS };
export const selectMapMode = (s: PerformanceStore) => s.mapMode;
export const selectMonteCarloIterations = (s: PerformanceStore) => s.monteCarloIterations;
export const selectTrafficSimulation = (s: PerformanceStore) => s.trafficSimulation;
export const selectBackdropBlur = (s: PerformanceStore) => s.backdropBlur;
export const selectParticleEffects = (s: PerformanceStore) => s.particleEffects;
export const selectAnimationsEnabled = (s: PerformanceStore) => s.animationsEnabled;
export const selectGraphicsQuality = (s: PerformanceStore) => s.graphicsQuality;
