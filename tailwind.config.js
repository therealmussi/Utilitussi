/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#0b1220',
          900: '#0f172a',
          850: '#131c30',
          800: '#18233b',
          700: '#233150',
          600: '#33456e',
        },
        accent: {
          DEFAULT: '#2dd4bf',
          strong: '#14b8a6',
          soft: 'rgba(45, 212, 191, 0.12)',
        },
        positive: { DEFAULT: '#34d399', soft: 'rgba(52, 211, 153, 0.12)' },
        negative: { DEFAULT: '#f87171', soft: 'rgba(248, 113, 113, 0.12)' },
        warning: { DEFAULT: '#fbbf24', soft: 'rgba(251, 191, 36, 0.12)' },
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(148,163,184,0.08), 0 8px 24px -12px rgba(0,0,0,0.45)',
      },
    },
  },
  plugins: [],
}
