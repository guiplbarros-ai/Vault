/**
 * Tema para gráficos Recharts baseado em docs/features/TEMA.md
 * "Tema — Orientação de UI (Dark, sólido)"
 */

export const CHART_THEME = {
  // Card styles (superfície sólida, sem gradientes)
  card: {
    backgroundColor: '#18322C',    // --bg-card
    borderColor: '#2A4942',        // --border
    borderWidth: '1px',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-1)',
  },

  // Typography
  title: {
    color: '#F2F7F5',             // --fg-primary
    fontSize: '1.125rem',
    fontWeight: 700,
    letterSpacing: '-0.2px',
  },

  subtitle: {
    color: '#B2BDB9',             // --fg-secondary
    fontSize: '0.875rem',
  },

  // Grid e eixos
  grid: {
    stroke: '#1A3530',            // splitLine do TEMA.md
    strokeDasharray: '3 3',
  },

  axis: {
    tick: {
      fill: '#B2BDB9',            // --fg-secondary
      fontSize: 12,
    },
    line: false,
    tickLine: false,
  },

  // Tooltip
  tooltip: {
    contentStyle: {
      backgroundColor: '#142A25',  // --bg-card-2
      border: '1px solid #2A4942', // --border
      borderRadius: 'var(--radius-md)',
      color: '#F2F7F5',           // --fg-primary
      boxShadow: 'var(--shadow-2)',
      padding: '8px 12px',
    },
    labelStyle: {
      color: '#F2F7F5',           // --fg-primary
      fontWeight: 600,
      marginBottom: '4px',
    },
    cursor: {
      fill: '#1D3A34',            // --hover
      opacity: 0.3,
    },
  },

  // Legend
  legend: {
    wrapperStyle: {
      paddingTop: '15px',
      color: '#F2F7F5',           // --fg-primary
    },
    iconType: 'circle' as const,
  },

  // Loading skeleton
  skeleton: {
    color: '#8CA39C',             // --fg-muted
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
