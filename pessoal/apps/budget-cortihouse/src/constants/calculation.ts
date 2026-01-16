/**
 * Constantes de cálculo para o sistema de orçamentos
 *
 * NOTA: Os valores de PREÇO agora são gerenciados no banco de dados
 * através da tabela material_prices. Acesse /precos para atualizá-los.
 *
 * Valores confirmados (constantes de negócio):
 * - Fator de franzido hospitalar: 1.65
 * - Taxa de retorno: R$ 100,00
 * - Desconto à vista: 3%
 */

// Constantes de cálculo hospitalares
export const HOSPITALAR = {
  /** Fator de franzido: 65% a mais que a largura do vão */
  FATOR_FRANZIDO: 1.65,

  /** Altura fixa do vinil em metros */
  ALTURA_VINIL: 2.0,

  /** Altura da tela colméia pequena (pé direito <= 2.60m) */
  ALTURA_TELA_PEQUENA: 0.6,

  /** Altura da tela colméia grande (pé direito > 2.60m) */
  ALTURA_TELA_GRANDE: 0.9,

  /** Limite de pé direito para usar tela pequena */
  LIMITE_PE_DIREITO_TELA: 2.6,

  /** Limite de pé direito para necessitar rebaixamento */
  LIMITE_PE_DIREITO_REBAIXAMENTO: 3.1,

  /** Espaçamento entre ganchos em metros (15cm) */
  ESPACAMENTO_GANCHO: 0.15,
} as const

// Constantes de cálculo residenciais
export const RESIDENCIAL = {
  /** Fatores de franzido por tipo de cortina */
  FATORES_FRANZIDO: {
    trilho: 2.0, // PENDENTE: confirmar
    wave: 2.5, // PENDENTE: confirmar
    blackout: 2.0, // PENDENTE: confirmar
    voil: 2.5, // PENDENTE: confirmar
    painel: 1.0, // Sem franzido
  },

  /** Margem lateral do trilho em metros (15cm de cada lado) */
  MARGEM_LATERAL_TRILHO: 0.15,

  /** Margem de altura para barras em metros */
  MARGEM_ALTURA: 0.2,

  /** Largura padrão do rolo de tecido em metros */
  LARGURA_ROLO_PADRAO: 2.8,
} as const

// Constantes de fornecedores
export const FORNECEDORES = {
  /** Markup sobre produtos da Kazza (%) */
  MARKUP_KAZZA: 30,

  /** Markup sobre produtos da Liber (%) */
  MARKUP_LIBER: 30,
} as const

// Constantes gerais
export const GERAL = {
  /** Desconto padrão para pagamento à vista (%) */
  DESCONTO_AVISTA: 3,

  /** Validade padrão do orçamento em dias */
  VALIDADE_PADRAO: 15,

  /** Prazo de entrega padrão em dias úteis */
  PRAZO_ENTREGA_PADRAO: 15,

  /** Taxa de retorno quando instalador não é atendido */
  TAXA_RETORNO: 100.0,
} as const

/**
 * PREÇOS UNITÁRIOS
 *
 * Os preços agora são gerenciados no banco de dados através da
 * tabela material_prices. Acesse /precos no sistema para atualizá-los.
 *
 * Veja src/lib/db/queries/prices.ts para as funções de consulta.
 */

// Tipos para tipagem
export type TipoCortina = keyof typeof RESIDENCIAL.FATORES_FRANZIDO
