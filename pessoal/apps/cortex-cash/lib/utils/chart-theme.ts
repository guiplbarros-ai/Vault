/**
 * Tema para gráficos Recharts baseado em docs/features/TEMA.md
 * "Tema — Orientação de UI (Dark, sólido)"
 */

export const CHART_COLORS = {
  income: '#6CCB8C',     // success green
  expense: '#F07167',    // destructive red
  investment: '#7AA6BF', // info blue
  result: '#E0B257',     // warning yellow
  gold: '#D4AF37',       // gold
  primary: '#3A8F6E',    // primary green
  neutral: '#9AA4AD',    // neutral gray
} as const

export const CHART_THEME = {
  // Card styles (superfície sólida, sem gradientes)
  card: {
    backgroundColor: '#2f3734', // --bg-card
    borderColor: '#4e5653', // --border
    borderWidth: '1px',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-1)',
  },

  // Typography
  title: {
    color: '#eaedeb', // --fg-primary
    fontSize: '1.125rem',
    fontWeight: 700,
    letterSpacing: '-0.2px',
  },

  subtitle: {
    color: '#939f9a', // --fg-secondary
    fontSize: '0.875rem',
  },

  // Grid e eixos
  grid: {
    stroke: '#333b38', // grid line
    strokeDasharray: '3 3',
  },

  axis: {
    tick: {
      fill: '#939f9a', // --fg-secondary
      fontSize: 12,
    },
    line: false,
    tickLine: false,
  },

  // Tooltip
  tooltip: {
    contentStyle: {
      backgroundColor: '#202725', // --bg-card-2 (muted)
      border: '1px solid #4e5653', // --border
      borderRadius: 'var(--radius-md)',
      color: '#eaedeb', // --fg-primary
      boxShadow: 'var(--shadow-2)',
      padding: '8px 12px',
    },
    labelStyle: {
      color: '#eaedeb', // --fg-primary
      fontWeight: 600,
      marginBottom: '4px',
    },
    cursor: {
      fill: '#3e4744', // --hover (accent)
      opacity: 0.3,
    },
  },

  // Legend
  legend: {
    wrapperStyle: {
      paddingTop: '15px',
      color: '#eaedeb', // --fg-primary
    },
    iconType: 'circle' as const,
  },

  // Loading skeleton
  skeleton: {
    color: '#7d8884', // --fg-muted
  },
} as const

/**
 * Retorna props prontas para um Card de gráfico
 */
export function getChartCardProps(minHeight = '420px') {
  return {
    className: 'p-6 overflow-hidden flex flex-col h-full',
    style: {
      minHeight,
      ...CHART_THEME.card,
    },
  }
}

/**
 * Retorna props prontas para o título de um gráfico
 */
export function getChartTitleProps() {
  return {
    className: 'text-lg font-bold tracking-tight',
    style: CHART_THEME.title,
  }
}

/**
 * Retorna props prontas para o subtítulo de um gráfico
 */
export function getChartSubtitleProps() {
  return {
    className: 'text-sm',
    style: CHART_THEME.subtitle,
  }
}
