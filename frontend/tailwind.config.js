/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F766E',
          hover: '#0D9488',
          light: '#CCFBF1',
        },
        redis: '#DC382D',
        surface: '#FFFFFF',
        background: '#F8FAFC',
        ink: '#172033',
        muted: '#64748B',
        border: '#E2E8F0',
        dark: {
          background: '#0F172A',
          surface: '#1E293B',
          border: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
