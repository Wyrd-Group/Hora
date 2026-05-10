/**
 * ThemeEngine — Injects CSS custom properties from themeStore into :root.
 * Also overrides Tailwind tactical-* colors dynamically via CSS variables.
 * Renders the preview banner when a preview theme is active.
 *
 * Uses Zustand subscribe for immediate DOM updates on any theme change.
 */

import { useEffect, useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeConfig } from '../../store/themeStore';

function applyThemeToDOM(theme: ThemeConfig) {
  const root = document.documentElement;
  const c = theme.colors;

  // Core color variables (used by index.css and body styles)
  root.style.setProperty('--color-bg-tactical', c.bg);
  root.style.setProperty('--color-panel-bg', c.panel);
  root.style.setProperty('--color-border', c.border);
  root.style.setProperty('--color-text-main', c.text);
  root.style.setProperty('--color-accent', c.accent);
  root.style.setProperty('--color-alert', c.alert);
  root.style.setProperty('--color-warn', c.warning);
  root.style.setProperty('--color-success', c.success);
  root.style.setProperty('--color-muted', c.muted);

  // Tailwind overrides via CSS vars — these override the static Tailwind colors
  root.style.setProperty('--tw-tactical-bg', c.bg);
  root.style.setProperty('--tw-tactical-panel', c.panel);
  root.style.setProperty('--tw-tactical-border', c.border);
  root.style.setProperty('--tw-tactical-text', c.text);
  root.style.setProperty('--tw-tactical-accent', c.accent);
  root.style.setProperty('--tw-tactical-alert', c.alert);
  root.style.setProperty('--tw-tactical-warning', c.warning);
  root.style.setProperty('--tw-tactical-success', c.success);
  root.style.setProperty('--tw-tactical-muted', c.muted);
  root.style.setProperty('--tw-tactical-cyan', c.accent);

  // Theme properties
  root.style.setProperty('--theme-radius', theme.borderRadius);
  root.style.setProperty('--theme-blur', theme.panelBlur);
  root.style.setProperty('--theme-glow', String(theme.glowIntensity));

  // Body background
  document.body.style.backgroundColor = c.bg;
  document.body.style.color = c.text;

  // Scanline toggle
  if (theme.scanlines) {
    document.body.classList.add('scanlines-on');
  } else {
    document.body.classList.remove('scanlines-on');
  }
}

export default function ThemeEngine() {
  const [previewTheme, setLocalPreview] = useState<ThemeConfig | null>(null);

  // Subscribe directly to the store for immediate DOM updates
  useEffect(() => {
    // Apply on mount
    const state = useThemeStore.getState();
    const initial = state.previewTheme ?? state.activeTheme;
    applyThemeToDOM(initial);
    setLocalPreview(state.previewTheme);

    // Subscribe to all changes
    const unsub = useThemeStore.subscribe((s) => {
      const effective = s.previewTheme ?? s.activeTheme;
      applyThemeToDOM(effective);
      setLocalPreview(s.previewTheme);
    });

    return unsub;
  }, []);

  const applyPreview = useThemeStore(s => s.applyPreview);
  const cancelPreview = useThemeStore(s => s.cancelPreview);

  if (!previewTheme) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-4 py-2 px-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', borderBottom: '1px solid rgba(0,240,255,0.3)' }}>
      <span style={{ color: '#00F0FF', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
        className="animate-pulse">
        ● PREVIEW MODE
      </span>
      <span style={{ color: 'rgba(192,202,245,0.6)', fontFamily: 'monospace', fontSize: '10px' }}>
        {previewTheme.name}
      </span>
      <button
        onClick={applyPreview}
        style={{
          padding: '4px 16px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          background: 'rgba(0,255,102,0.2)', color: '#00FF66', border: '1px solid rgba(0,255,102,0.4)',
        }}
      >
        Apply
      </button>
      <button
        onClick={cancelPreview}
        style={{
          padding: '4px 16px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          background: 'rgba(255,51,102,0.2)', color: '#FF3366', border: '1px solid rgba(255,51,102,0.4)',
        }}
      >
        Cancel
      </button>
    </div>
  );
}
