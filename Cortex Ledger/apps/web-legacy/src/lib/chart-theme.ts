import type { EChartsOption } from 'echarts'

/**
 * Tema de cores para gráficos (Recharts)
 * Paleta Creme & Bordeaux Olive
 */

export const chartTheme = {
  // Grid & Eixos - Light Mode
  light: {
    grid: "rgba(40, 31, 32, 0.12)",
    axis: "rgba(40, 31, 32, 0.7)",
    tooltip: {
      bg: "#FBE2B9",
      border: "rgba(40, 31, 32, 0.25)",
      text: "#281F20",
    },
    series: {
      primary: "#281F20",
      secondary: "#C6C39A",
    },
    area: {
      fill: "rgba(40, 31, 32, 0.16)",
      stroke: "#281F20",
    },
  },

  // Grid & Eixos - Dark Mode
  dark: {
    grid: "rgba(198, 195, 154, 0.18)",
    axis: "rgba(252, 246, 210, 0.85)",
    tooltip: {
      bg: "#362A2C",
      border: "rgba(198, 195, 154, 0.3)",
      text: "#FCF6D2",
    },
    series: {
      primary: "#FBE2B9",
      secondary: "#C6C39A",
    },
    area: {
      fill: "rgba(251, 226, 185, 0.20)",
      stroke: "#FBE2B9",
    },
  },

  // Cores semânticas (consistentes em ambos os modos)
  semantic: {
    income: "#3A8E6E",    // success - oliva + verde
    expense: "#A54148",   // danger - bordeaux avermelhado
    transfer: "#74745C",  // info - oliva neutra
    budget: "#C4963C",    // warning - oliva quente
  },
};

/**
 * Tema ECharts — Cortex Ledger v1
 * Segue as diretrizes do UI-FRONTEND-GUIDE.md seção 8
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
    fontFamily: 'Inter, sans-serif',
  },
  title: {
    textStyle: {
      color: 'var(--text)',
      fontWeight: 600,
    },
  },
  axisLine: {
    lineStyle: {
      color: 'var(--border)',
    },
  },
  axisLabel: {
    color: 'var(--text-muted)',
  },
  splitLine: {
    lineStyle: {
      color: 'var(--border)',
    },
  },
  tooltip: {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
    textStyle: {
      color: 'var(--text)',
    },
  },
};

/**
 * Hook para obter tema atual baseado no modo dark/light
 */
export function useChartTheme() {
  if (typeof window === "undefined") {
    return chartTheme.light;
  }

  const isDark = document.documentElement.classList.contains("dark");
  return isDark ? chartTheme.dark : chartTheme.light;
}

/**
 * Função utilitária para obter cor semântica
 */
export function getSemanticColor(type: "income" | "expense" | "transfer" | "budget") {
  return chartTheme.semantic[type];
}
