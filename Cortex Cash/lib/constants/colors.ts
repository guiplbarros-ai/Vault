export const CATEGORY_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
] as const

export const BRAND_NAVY = '#0B2230'
export const brandNavyAlpha = (alpha: number) => `rgba(11, 34, 48, ${alpha})`

// Mapeamento de cores para nomes em português
export const COLOR_NAMES: Record<string, string> = {
  // Cores de categorias
  '#ef4444': 'Vermelho',
  '#f97316': 'Laranja',
  '#f59e0b': 'Âmbar',
  '#eab308': 'Amarelo',
  '#84cc16': 'Lima',
  '#22c55e': 'Verde',
  '#10b981': 'Esmeralda',
  '#14b8a6': 'Turquesa',
  '#06b6d4': 'Ciano',
  '#0ea5e9': 'Azul Celeste',
  '#3b82f6': 'Azul',
  '#6366f1': 'Índigo',
  '#8b5cf6': 'Violeta',
  '#a855f7': 'Roxo',
  '#d946ef': 'Fúcsia',
  '#ec4899': 'Rosa',
  '#f43f5e': 'Rosa Avermelhado',

  // Cores específicas de cartões
  '#1a1a1a': 'Preto',
  '#374151': 'Grafite',
  '#64748b': 'Prata',
  '#94a3b8': 'Prata Claro',
  '#cbd5e1': 'Platina',
  '#fbbf24': 'Dourado',
  '#d97706': 'Bronze',
  '#b45309': 'Cobre',
  '#14532d': 'Verde Escuro',
  '#065f46': 'Verde Esmeralda',
  '#0f766e': 'Verde Turquesa',
  '#0e7490': 'Azul Petróleo',
  '#0369a1': 'Azul Oceano',
  '#1d4ed8': 'Azul Royal',
  '#7c3aed': 'Roxo Nubank',
  '#be185d': 'Rosa Escuro',
  '#db2777': 'Rosa Pink',
  '#dc2626': 'Vermelho',
  '#b91c1c': 'Vermelho Escuro',
}

// Função helper para obter nome da cor
export function getColorName(hex: string): string {
  return COLOR_NAMES[hex.toLowerCase()] || hex
}

// Cores específicas para cartões de crédito (tons metálicos e premium)
export const CARD_COLORS = [
  '#1a1a1a', // Preto (Black/Infinite)
  '#374151', // Grafite
  '#64748b', // Prata/Cinza
  '#94a3b8', // Prata Claro
  '#cbd5e1', // Platina
  '#fbbf24', // Dourado
  '#f59e0b', // Ouro Escuro
  '#d97706', // Bronze
  '#b45309', // Cobre
  '#14532d', // Verde Escuro (Premium)
  '#065f46', // Verde Esmeralda
  '#0f766e', // Verde Turquesa
  '#0e7490', // Azul Petróleo
  '#0369a1', // Azul Oceano
  '#1d4ed8', // Azul Royal
  '#3b82f6', // Azul
  '#6366f1', // Índigo
  '#7c3aed', // Roxo (Nubank)
  '#8b5cf6', // Violeta
  '#a855f7', // Roxo Claro
  '#be185d', // Rosa Escuro
  '#db2777', // Rosa Pink
  '#dc2626', // Vermelho
  '#b91c1c', // Vermelho Escuro
] as const

export const ACCOUNT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
] as const

export type CategoryColor = typeof CATEGORY_COLORS[number]
export type AccountColor = typeof ACCOUNT_COLORS[number]
export type CardColor = typeof CARD_COLORS[number]

export const COLOR_OPTIONS = CATEGORY_COLORS.map((color) => ({
  value: color,
  label: color,
}))

// Cores para gráficos usando o novo sistema de cores
export const getChartColors = (): string[] => {
  return [
    '#6CCB8C', // text-success (verde)
    '#9AA4AD', // Cinza
    '#C49A6C', // Marrom
    '#7AA6BF', // Azul claro
    '#3A8F6E', // text-primary (verde escuro)
    '#E0B257', // text-warning (amarelo)
    '#F07167', // text-destructive (vermelho)
    '#D4AF37', // text-gold (dourado)
  ]
}

// Cores CSS do tema (para uso em inline styles quando necessário)
// Baseado em docs/features/TEMA.md - "Tema — Orientação de UI (Dark, sólido)"
export const THEME_COLORS = {
  // Base (Backgrounds e superfícies sólidas - sem translucência)
  bgApp: '#132421',        // --bg-app: Fundo principal
  bgCard: '#18322C',       // --bg-card: Superfície
  bgCard2: '#142A25',      // --bg-card-2: Superfície aninhada
  border: '#2A4942',       // --border: Contorno 1px
  divider: '#213A34',      // --divider: Linhas internas
  hover: '#1D3A34',        // --hover: Hover de linhas/itens
  focus: '#3A8F6E',        // --focus: Anel de foco

  // Texto
  fgPrimary: '#F2F7F5',    // --fg-primary
  fgSecondary: '#B2BDB9',  // --fg-secondary
  fgMuted: '#8CA39C',      // --fg-muted

  // Ação / Marca
  accent: '#3A8F6E',       // --accent: Primário (adição/confirmar)
  accentEmph: '#2E7D6B',   // --accent-emph: Ativo/pressed
  link: '#8FCDBD',         // --link: Ação sutil
  money: '#D4AF37',        // --money: Destaques monetários

  // Status
  success: '#6CCB8C',      // --success
  warning: '#E0B257',      // --warning
  error: '#F07167',        // --error

  // Compatibilidade com código existente (aliases)
  background: '#132421',
  card: '#18322C',
  muted: '#1D3A34',
  foreground: '#F2F7F5',
  secondary: '#8FCDBD',
  primary: '#3A8F6E',
  gold: '#D4AF37',
  destructive: '#F07167',
} as const
