import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tribal: {
          50:  '#fdf8ee',
          100: '#f9eccc',
          200: '#f2d590',
          300: '#e9b84c',
          400: '#e39d24',
          500: '#d47f14',
          600: '#b85f0e',
          700: '#924310',
          800: '#783515',
          900: '#642c14',
          950: '#3a1507',
        },
        torch: {
          DEFAULT: '#e05c1b',
          dark:    '#b84210',
          light:   '#f57c3b',
        },
        jungle: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        dark: {
          DEFAULT: '#0f0e0d',
          card:    '#1a1814',
          border:  '#2d2820',
          muted:   '#3d3830',
        },
      },
      fontFamily: {
        tribal: ['Georgia', 'serif'],
      },
      backgroundImage: {
        'gradient-tribal': 'linear-gradient(135deg, #1a1814 0%, #0f0e0d 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 2s ease-in-out infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
}
export default config
