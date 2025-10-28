/**
 * Tema ECharts para Cortex Ledger
 * Conforme UI-FRONTEND-GUIDE.md seção 8
 *
 * Uso:
 * ```ts
 * import { cortexEchartsTheme } from '@/lib/charts/theme';
 *
 * const option = {
 *   ...cortexEchartsTheme,
 *   // suas opções de gráfico
 * };
 * ```
 */

export const cortexEchartsTheme = {
  color: [
    '#12B5A2', // Receita / série positiva (brand-600)
    '#E2555A', // Despesa (error-600)
    '#B8891A', // Orçado (insight-600)
    '#3B4552', // Realizado (graphite-500)
    '#63E0D1', // Variação brand (brand-400)
    '#C26719', // Alertas (warning-600)
  ],
  textStyle: {
    color: 'var(--text)',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  title: {
    textStyle: {
      color: 'var(--text)',
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontWeight: 600,
    }
  },
  axisLine: {
    lineStyle: {
      color: 'var(--border)'
    }
  },
  axisLabel: {
    color: 'var(--text-muted)',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  splitLine: {
    lineStyle: {
      color: 'var(--border)'
    }
  },
  tooltip: {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
    textStyle: {
      color: 'var(--text)',
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }
  },
};

/**
 * Mapeamento recomendado de séries:
 *
 * - Série "Entradas/Receitas" → color[0] (#12B5A2 - brand)
 * - Série "Saídas/Despesas" → color[1] (#E2555A - vermelho)
 * - "Orçado" → color[2] (#B8891A - mostarda)
 * - "Realizado" → color[3] (#3B4552 - grafite 500)
 * - "Variação" → color[4] (#63E0D1 - brand-400)
 * - "Alertas" → color[5] (#C26719 - warning)
 */
