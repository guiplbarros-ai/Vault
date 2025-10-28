/**
 * Design Tokens - Cortex Ledger
 *
 * Baseado no PRD v1 (Seção 8: UX/UI)
 * - Base: Grafite/Preto + Verde-acqua (confiança, dinheiro)
 * - Destaques: Laranja queimado (alertas), Amarelo mostarda (insights),
 *   Vermelho suave (erros), Verde discreto (positivos)
 * - Tipografia: Inter (semibold para títulos, regular para corpo)
 * - Motion: 150-200ms transitions
 */

export const colors = {
  // Base colors (Grafite/Preto + Verde-acqua)
  primary: {
    50: '#E6F5F3',
    100: '#CCE8E4',
    200: '#99D1C9',
    300: '#66BAAE', // Verde-acqua principal
    400: '#4DA89A',
    500: '#339686',
    600: '#2A7B6E',
    700: '#206055',
    800: '#17453D',
    900: '#0D2A24',
  },

  // Grafite/Preto (neutros)
  neutral: {
    50: '#F8F9FA',
    100: '#F1F3F5',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#868E96',
    700: '#495057', // Grafite médio
    800: '#343A40',
    900: '#212529', // Preto
    950: '#0D0F11',
  },

  // Alertas (Laranja queimado)
  warning: {
    50: '#FFF4ED',
    100: '#FFE7D6',
    200: '#FFCEAD',
    300: '#FFB084',
    400: '#FF9966',
    500: '#FF7733', // Laranja queimado principal
    600: '#E65C1F',
    700: '#CC4214',
    800: '#B32B0C',
    900: '#991707',
  },

  // Insights (Amarelo mostarda)
  insight: {
    50: '#FFF9E6',
    100: '#FFF2CC',
    200: '#FFE599',
    300: '#FFD966',
    400: '#FFCC33',
    500: '#E6B800', // Amarelo mostarda principal
    600: '#CC9F00',
    700: '#B38600',
    800: '#996D00',
    900: '#805400',
  },

  // Erros (Vermelho suave)
  error: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#E53935', // Vermelho suave principal
    600: '#D32F2F',
    700: '#C62828',
    800: '#B71C1C',
    900: '#8B0000',
  },

  // Sucessos (Verde discreto)
  success: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50', // Verde discreto principal
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },
}

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    mono: ['Geist Mono', 'monospace'],
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },

  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
}

export const spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px (base grid)
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
  32: '8rem',    // 128px
}

export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  base: '0.5rem',  // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  full: '9999px',
}

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
}

export const transitions = {
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
  },
  timing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
}

// Utility function para criar classes com variantes
export const cn = (...classes: (string | boolean | undefined | null)[]) => {
  return classes.filter(Boolean).join(' ')
}
