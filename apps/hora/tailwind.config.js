/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hora: {
          gold: '#FFB820',
          coral: '#FF5C6E',
          teal: '#1FCDB8',
          violet: '#7C5CFF',
          sky: '#4FB8FF',
          'bg-top': '#FFE9A8',
          'bg-mid': '#FFAA5C',
          'bg-bot': '#FF6B96',
          surface: '#FFFFFF',
          'surface-dark': '#2B1B5C',
          text: '#1A1530',
          'text-muted': '#5C5470',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'SF Pro Rounded', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Space Grotesk"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        juicy: '0 6px 14px rgba(0, 0, 0, 0.18), inset 0 2px 0 rgba(255, 255, 255, 0.35), inset 0 -2px 0 rgba(0, 0, 0, 0.15)',
        'juicy-lg': '0 12px 28px rgba(0, 0, 0, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.35), inset 0 -2px 0 rgba(0, 0, 0, 0.15)',
      },
      keyframes: {
        'coin-pour': { '0%': { transform: 'translateY(-100%)', opacity: '0' }, '50%': { opacity: '1' }, '100%': { transform: 'translateY(100%)', opacity: '0' } },
        'pop-in': { '0%': { transform: 'scale(0.6)', opacity: '0' }, '70%': { transform: 'scale(1.08)', opacity: '1' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        wiggle: { '0%, 100%': { transform: 'rotate(-2deg)' }, '50%': { transform: 'rotate(2deg)' } },
      },
      animation: {
        'coin-pour': 'coin-pour 0.8s ease-in-out',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        wiggle: 'wiggle 0.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
