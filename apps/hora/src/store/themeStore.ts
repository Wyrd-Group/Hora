/**
 * themeStore.ts — Player UI personalization system.
 *
 * Manages dynamic theme configs that override CSS custom properties at runtime.
 * Supports preview mode (try before apply) and Athena-generated themes.
 * Persists to localStorage so themes survive across sessions.
 */

import { create } from 'zustand';

// ── Theme Config ──

export interface ThemeColors {
  bg: string;
  panel: string;
  border: string;
  text: string;
  accent: string;
  alert: string;
  warning: string;
  success: string;
  muted: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  colors: ThemeColors;
  fontFamily: string;       // 'mono' | 'sans' | 'serif' or full CSS font stack
  borderRadius: string;     // e.g. '8px', '12px', '0px'
  glowIntensity: number;    // 0-1, controls glow effects
  panelBlur: string;        // e.g. '14px', '20px', '0px'
  scanlines: boolean;       // CRT scanline effect
}

// ── Default Theme (matches current tactical palette) ──

export const DEFAULT_THEME: ThemeConfig = {
  id: 'default',
  name: 'Tactical Dark',
  colors: {
    bg: '#0A0C10',
    panel: 'rgba(10, 12, 16, 0.85)',
    border: '#1E2532',
    text: '#C0CAF5',
    accent: '#00F0FF',
    alert: '#FF3366',
    warning: '#FFCC00',
    success: '#00FF66',
    muted: '#6b7280',
  },
  fontFamily: 'mono',
  borderRadius: '8px',
  glowIntensity: 0.5,
  panelBlur: '14px',
  scanlines: true,
};

// ── Built-in Presets ──

export const THEME_PRESETS: ThemeConfig[] = [
  DEFAULT_THEME,
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    colors: {
      bg: '#0D0221',
      panel: 'rgba(13, 2, 33, 0.88)',
      border: '#FF00FF40',
      text: '#F0E6FF',
      accent: '#FF00FF',
      alert: '#FF0044',
      warning: '#FFD700',
      success: '#00FF88',
      muted: '#8866AA',
    },
    fontFamily: 'mono',
    borderRadius: '4px',
    glowIntensity: 0.9,
    panelBlur: '20px',
    scanlines: true,
  },
  {
    id: 'arctic',
    name: 'Arctic Command',
    colors: {
      bg: '#0B1628',
      panel: 'rgba(11, 22, 40, 0.90)',
      border: '#1E3A5F',
      text: '#D4E4F7',
      accent: '#4FC3F7',
      alert: '#FF5252',
      warning: '#FFB74D',
      success: '#69F0AE',
      muted: '#607D8B',
    },
    fontFamily: 'sans',
    borderRadius: '12px',
    glowIntensity: 0.3,
    panelBlur: '16px',
    scanlines: false,
  },
  {
    id: 'military',
    name: 'Military Ops',
    colors: {
      bg: '#0A0F08',
      panel: 'rgba(10, 15, 8, 0.90)',
      border: '#2D3B1E',
      text: '#C8D4A8',
      accent: '#8BC34A',
      alert: '#FF6B35',
      warning: '#FFC107',
      success: '#4CAF50',
      muted: '#6B7B5A',
    },
    fontFamily: 'mono',
    borderRadius: '2px',
    glowIntensity: 0.2,
    panelBlur: '8px',
    scanlines: true,
  },
  {
    id: 'gold',
    name: 'Black & Gold',
    colors: {
      bg: '#0A0A08',
      panel: 'rgba(10, 10, 8, 0.90)',
      border: '#3D3520',
      text: '#E8E0D0',
      accent: '#FFD700',
      alert: '#FF4444',
      warning: '#FF8C00',
      success: '#32CD32',
      muted: '#9C8E7E',
    },
    fontFamily: 'sans',
    borderRadius: '8px',
    glowIntensity: 0.6,
    panelBlur: '14px',
    scanlines: false,
  },
  {
    id: 'sunset',
    name: 'Sunset Empire',
    colors: {
      bg: '#120808',
      panel: 'rgba(18, 8, 8, 0.88)',
      border: '#4A2020',
      text: '#FFDDD2',
      accent: '#FF6B6B',
      alert: '#FF1744',
      warning: '#FF9800',
      success: '#76FF03',
      muted: '#8D6E63',
    },
    fontFamily: 'sans',
    borderRadius: '10px',
    glowIntensity: 0.7,
    panelBlur: '16px',
    scanlines: false,
  },
  {
    id: 'matrix',
    name: 'Matrix',
    colors: {
      bg: '#000000',
      panel: 'rgba(0, 5, 0, 0.92)',
      border: '#0D3B0D',
      text: '#00FF41',
      accent: '#00FF41',
      alert: '#FF0000',
      warning: '#ADFF2F',
      success: '#00FF00',
      muted: '#006B1A',
    },
    fontFamily: 'mono',
    borderRadius: '0px',
    glowIntensity: 0.8,
    panelBlur: '10px',
    scanlines: true,
  },
];

// ── Store ──

interface ThemeState {
  activeTheme: ThemeConfig;
  previewTheme: ThemeConfig | null;
  customThemes: ThemeConfig[];

  // Actions
  applyTheme: (theme: ThemeConfig) => void;
  setPreview: (theme: ThemeConfig | null) => void;
  applyPreview: () => void;
  cancelPreview: () => void;
  saveCustomTheme: (theme: ThemeConfig) => void;
  deleteCustomTheme: (id: string) => void;
  resetToDefault: () => void;

  // Computed
  effectiveTheme: () => ThemeConfig;
}

const STORAGE_KEY = 'aegis-theme-v1';
const CUSTOM_THEMES_KEY = 'aegis-custom-themes-v1';

function loadSavedTheme(): ThemeConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { console.warn('[Theme] Failed to load saved theme:', e); }
  return DEFAULT_THEME;
}

function loadCustomThemes(): ThemeConfig[] {
  try {
    const saved = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { console.warn('[Theme] Failed to load custom themes:', e); }
  return [];
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  activeTheme: loadSavedTheme(),
  previewTheme: null,
  customThemes: loadCustomThemes(),

  applyTheme: (theme) => {
    set({ activeTheme: theme, previewTheme: null });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  },

  setPreview: (theme) => {
    set({ previewTheme: theme });
  },

  applyPreview: () => {
    const { previewTheme } = get();
    if (previewTheme) {
      set({ activeTheme: previewTheme, previewTheme: null });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(previewTheme));
    }
  },

  cancelPreview: () => {
    set({ previewTheme: null });
  },

  saveCustomTheme: (theme) => {
    const { customThemes } = get();
    const filtered = customThemes.filter(t => t.id !== theme.id);
    const next = [...filtered, theme];
    set({ customThemes: next });
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(next));
  },

  deleteCustomTheme: (id) => {
    const { customThemes, activeTheme } = get();
    const next = customThemes.filter(t => t.id !== id);
    set({ customThemes: next });
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(next));
    if (activeTheme.id === id) {
      set({ activeTheme: DEFAULT_THEME });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_THEME));
    }
  },

  resetToDefault: () => {
    set({ activeTheme: DEFAULT_THEME, previewTheme: null });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_THEME));
  },

  effectiveTheme: () => {
    const { previewTheme, activeTheme } = get();
    return previewTheme ?? activeTheme;
  },
}));
