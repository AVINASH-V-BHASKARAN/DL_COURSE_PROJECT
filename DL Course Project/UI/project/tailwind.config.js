/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#080A08',
          800: '#0B0E0B',
          700: '#111511',
          600: '#161B16',
          500: '#1E251E',
        },
        lime: {
          DEFAULT: '#C6FF4D',
          bright: '#8DFF6A',
          deep: '#9FE03A',
          dim: '#7AAE2E',
        },
        fog: {
          DEFAULT: '#F5F7F2',
          muted: '#969D94',
          faint: '#5C6359',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      spacing: {
        '4.5': '1.125rem',
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      animation: {
        'spin-slow': 'spin 24s linear infinite',
        'spin-slower': 'spin 48s linear infinite',
        'float': 'float 7s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3.5s ease-in-out infinite',
        'drift': 'drift 18s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.06)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(20px,-20px,0)' },
        },
      },
    },
  },
  plugins: [],
};
