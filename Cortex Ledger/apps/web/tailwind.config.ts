import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Nova paleta do guia UI-FRONTEND-GUIDE.md
        brand: {
          100: '#E9FCFA',
          200: '#C6F7F3',
          300: '#95EDE5',
          400: '#63E0D1',
          500: '#18C7B3',
          600: '#12B5A2',
          700: '#0EA08F',
        },
        graphite: {
          100: '#E6EBF2',
          200: '#C2CBD8',
          300: '#8A98AB',
          400: '#5B6676',
          500: '#3B4552',
          600: '#2A313B',
          700: '#1E242C',
          800: '#171C22',
          900: '#12161B',
          950: '#0B0F12',
        },
        slate: {
          50: '#F8FAFC',
          100: '#F2F5F8',
          200: '#E8EDF3',
          300: '#DBE2EA',
          400: '#C6D0DB',
          500: '#9AA6B2',
          600: '#6B7785',
          700: '#47515C',
          800: '#2F3740',
          900: '#1C232B',
        },
        success: {
          100: '#EAF7EF',
          600: '#16A34A',
        },
        warning: {
          100: '#FFF3E6',
          600: '#C26719',
        },
        error: {
          100: '#FFECEC',
          600: '#E2555A',
        },
        info: {
          100: '#E9F0FF',
          600: '#2463EB',
        },
        insight: {
          100: '#FFF6D8',
          600: '#B8891A',
        },

        // Cores semânticas via CSS vars (mantido para compatibilidade)
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elev: 'rgb(var(--elev) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '16px',
        xl2: '1.25rem', // 20px - conforme guia
        '2xl': '20px',
        card: 'var(--radius-card)',
        input: 'var(--radius-input)',
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.25' }],
        sm: ['0.875rem', { lineHeight: '1.5' }],
        base: ['1rem', { lineHeight: '1.5' }],
        lg: ['1.125rem', { lineHeight: '1.75' }],
        xl: ['1.25rem', { lineHeight: '1.75' }],
        '2xl': ['1.5rem', { lineHeight: '1.25' }],
        '3xl': ['1.875rem', { lineHeight: '1.25' }],
        '4xl': ['2.25rem', { lineHeight: '1.25' }],
        '5xl': ['3rem', { lineHeight: '1.25' }],
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        card: '0 8px 24px rgba(0,0,0,0.08)', // conforme guia
        cardDark: '0 8px 24px rgba(0,0,0,0.35)', // conforme guia
        'card-hover': 'var(--shadow-lg)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: 'var(--shadow-lg)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },
      transitionDuration: {
        fast: '150ms',
        DEFAULT: '200ms',
        slow: '300ms',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
}

export default config
