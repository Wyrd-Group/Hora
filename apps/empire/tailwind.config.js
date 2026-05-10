/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tactical: {
          bg: 'var(--tw-tactical-bg, #0A0C10)',
          panel: 'var(--tw-tactical-panel, rgba(10, 12, 16, 0.85))',
          border: 'var(--tw-tactical-border, #1E2532)',
          text: 'var(--tw-tactical-text, #C0CAF5)',
          accent: 'var(--tw-tactical-accent, #00F0FF)',
          alert: 'var(--tw-tactical-alert, #FF3366)',
          warning: 'var(--tw-tactical-warning, #FFCC00)',
          success: 'var(--tw-tactical-success, #00FF66)',
          // OS component palette — used by AcademyOS, ECFLOS, SoloModesOS etc.
          cyan:   'var(--tw-tactical-cyan, #00e5ff)',
          green:  '#10b981',
          amber:  '#f59e0b',
          red:    '#ef4444',
          muted:  'var(--tw-tactical-muted, #6b7280)',
          bright: '#e2e8f0',
        },
        empire: {
          player: '#10b981',
          market: '#ef4444',
          rival: '#f59e0b',
          finance: '#00e5ff',
          tech: '#7c3aed',
          oil: '#f59e0b',
          mfg: '#6366f1',
          energy: '#10b981',
          pharma: '#ec4899',
          venue: '#a78bfa',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      keyframes: {
        'ticker-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'card-reveal': {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'ticker-scroll': 'ticker-scroll 60s linear infinite',
        'fade-in': 'fade-in 0.3s ease both',
        'card-reveal': 'card-reveal 0.5s ease both',
      }
    },
  },
  plugins: [],
  // Safelist dynamic classes used in SoloModesOS and other OS components
  safelist: [
    { pattern: /^text-tactical-(cyan|green|amber|red|muted|bright)$/ },
    { pattern: /^border-tactical-(cyan|green|amber|red|muted|bright)(\/\d+)?$/ },
    { pattern: /^bg-tactical-(cyan|green|amber|red|muted|bright)(\/\d+)?$/ },
  ],
}
