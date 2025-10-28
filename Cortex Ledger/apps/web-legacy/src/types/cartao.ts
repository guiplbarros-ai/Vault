// Types for Credit Card Management
// Generated: 2025-10-27

export type Bandeira = 'visa' | 'master' | 'amex' | 'elo' | 'outro'
export type TipoCartao = 'nacional' | 'internacional'
export type StatusCartao = 'ativo' | 'bloqueado' | 'cancelado'

export type StatusFatura =
  | 'aberta' // Ainda não fechou
  | 'fechada' // Fechou mas não paga
  | 'paga' // Totalmente paga
  | 'atrasada' // Vencida e não paga
  | 'parcial' // Paga parcialmente

export type TipoAlerta =
  | 'vencimento'
  | 'limite'
  | 'transacao_incomum'
  | 'anuidade'
  | 'parceladas_acumuladas'

// ============================================================================
// DATABASE TYPES (matches Supabase schema)
// ============================================================================

export interface CartaoCreditoDB {
  id: string
  conta_id: string
  nome: string
  instituicao: string
  bandeira: Bandeira
  ultimos_digitos: string
  tipo_cartao: TipoCartao
  limite_total: number
  limite_disponivel: number
  dia_fechamento: number
  dia_vencimento: number
  melhor_dia_compra: number | null
  anuidade_valor: number | null
  anuidade_proximo_venc: string | null // ISO date
  taxa_juros_mes: number | null
  status: StatusCartao
  user_id: string
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface FaturaDB {
  id: string
  cartao_id: string
  mes_referencia: string // YYYY-MM
  data_fechamento: string // ISO date
  data_vencimento: string // ISO date
  valor_total: number
  valor_pago: number
  valor_minimo: number | null
  status: StatusFatura
  data_pagamento: string | null // ISO date
  transacao_pagamento_id: string | null
  user_id: string
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface AlertaCartaoDB {
  id: string
  user_id: string
  cartao_id: string | null // null = alerta global
  tipo: TipoAlerta
  limiar: number | null
  dias_antecedencia: number | null
  ativo: boolean
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

// ============================================================================
// APPLICATION TYPES (camelCase, computed fields)
// ============================================================================

export interface CartaoCredito {
  id: string
  contaId: string
  nome: string
  instituicao: string
  bandeira: Bandeira
  ultimosDigitos: string
  tipoCartao: TipoCartao
  limiteTotal: number
  limiteDisponivel: number
  diaFechamento: number
  diaVencimento: number
  melhorDiaCompra: number | null
  anuidadeValor: number | null
  anuidadeProximoVenc: Date | null
  taxaJurosMes: number | null
  status: StatusCartao
  userId: string
  createdAt: Date
  updatedAt: Date
  // Computed
  utilizacao: number // %
  faturaAtual?: FaturaResumida
}

export interface Fatura {
  id: string
  cartaoId: string
  mesReferencia: string // YYYY-MM
  dataFechamento: Date
  dataVencimento: Date
  valorTotal: number
  valorPago: number
  valorMinimo: number | null
  status: StatusFatura
  dataPagamento: Date | null
  transacaoPagamentoId: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
  // Computed
  saldoDevedor: number
  diasParaVencimento: number
  vencida: boolean
  vencimentoProximo: boolean // ≤7 dias
  transacoes?: TransacaoFatura[]
}

export interface AlertaCartao {
  id: string
  userId: string
  cartaoId: string | null
  tipo: TipoAlerta
  limiar: number | null
  diasAntecedencia: number | null
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// SUMMARY / AGGREGATED TYPES
// ============================================================================

export interface ResumoCartoes {
  totalAberto: number // Soma de todas as faturas não pagas
  proximoVencimento: {
    data: Date
    valor: number
    cartao: string
  } | null
  limiteDisponivel: number // Soma dos limites disponíveis
  utilizacaoMedia: number // % média de utilização
}

export interface FaturaResumida {
  id: string
  valor: number
  vencimento: Date
  status: StatusFatura
  diasParaVencimento: number
}

export interface TransacaoFatura {
  id: string
  data: Date
  descricao: string
  categoria?: string
  valor: number
  parcelaAtual?: number
  parcelasTotal?: number
  compraInternacional: boolean
  moedaOriginal?: string
  taxaConversao?: number
  iof?: number
}

// ============================================================================
// FORM / INPUT TYPES
// ============================================================================

export interface CartaoFormInput {
  nome: string
  instituicao: string
  bandeira: Bandeira
  ultimosDigitos: string
  tipoCartao: TipoCartao
  limiteTotal: number
  diaFechamento: number
  diaVencimento: number
  anuidadeValor?: number
  taxaJurosMes?: number
}

export interface FaturaPagamentoInput {
  faturaId: string
  contaOrigemId: string // Conta bancária de onde sairá o pagamento
  valor: number // Valor a pagar (total, mínimo ou parcial)
  dataPagamento: Date
  observacoes?: string
}

export interface AlertaCartaoInput {
  cartaoId?: string // Omit for global alert
  tipo: TipoAlerta
  limiar?: number
  diasAntecedencia?: number
  ativo: boolean
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface CartoesResponse {
  cartoes: CartaoCredito[]
  resumo: ResumoCartoes
}

export interface FaturaDetalhesResponse {
  fatura: Fatura
  transacoes: TransacaoFatura[]
  cartao: {
    nome: string
    bandeira: Bandeira
    ultimosDigitos: string
  }
}

export interface HistoricoFaturasResponse {
  faturas: Fatura[]
  pagination: {
    page: number
    perPage: number
    total: number
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface CalculoLimiteDisponivel {
  limiteTotal: number
  faturaAberta: number
  lancamentosFuturos: number
  limiteDisponivel: number
}

export interface CalculoMelhorDiaCompra {
  diaFechamento: number
  diaVencimento: number
  melhorDia: number
  prazoMaximo: number // dias entre compra e vencimento
}

export interface ProjecaoFaturaFutura {
  mesReferencia: string // YYYY-MM
  valorEstimado: number
  parcelasInclusas: number
  recorrenciasInclusas: number
  dataVencimentoPrevista: Date
}

// ============================================================================
// FILTER / QUERY TYPES
// ============================================================================

export interface FiltrosCartoes {
  status?: StatusCartao[]
  bandeira?: Bandeira[]
  tipoCartao?: TipoCartao[]
  utilizacaoMin?: number // %
  utilizacaoMax?: number // %
}

export interface FiltrosFaturas {
  cartaoId?: string
  status?: StatusFatura[]
  mesReferenciaInicio?: string // YYYY-MM
  mesReferenciaFim?: string // YYYY-MM
  valorMin?: number
  valorMax?: number
}

// ============================================================================
// HELPER FUNCTIONS (Type Guards)
// ============================================================================

export function isCartaoAtivo(cartao: CartaoCredito): boolean {
  return cartao.status === 'ativo'
}

export function isFaturaPaga(fatura: Fatura): boolean {
  return fatura.status === 'paga'
}

export function isFaturaVencida(fatura: Fatura): boolean {
  return fatura.diasParaVencimento < 0 && fatura.status !== 'paga'
}

export function isFaturaVencimentoProximo(fatura: Fatura): boolean {
  return fatura.diasParaVencimento <= 7 && fatura.diasParaVencimento > 0
}

export function isUtilizacaoCritica(cartao: CartaoCredito): boolean {
  return cartao.utilizacao > 80
}

export function isUtilizacaoAlerta(cartao: CartaoCredito): boolean {
  return cartao.utilizacao > 50 && cartao.utilizacao <= 80
}

export function isUtilizacaoSaudavel(cartao: CartaoCredito): boolean {
  return cartao.utilizacao <= 50
}

// ============================================================================
// CONVERTERS (DB -> App)
// ============================================================================

export function convertCartaoFromDB(db: CartaoCreditoDB): CartaoCredito {
  const limiteUsado = db.limite_total - db.limite_disponivel
  const utilizacao = db.limite_total > 0 ? (limiteUsado / db.limite_total) * 100 : 0

  return {
    id: db.id,
    contaId: db.conta_id,
    nome: db.nome,
    instituicao: db.instituicao,
    bandeira: db.bandeira,
    ultimosDigitos: db.ultimos_digitos,
    tipoCartao: db.tipo_cartao,
    limiteTotal: db.limite_total,
    limiteDisponivel: db.limite_disponivel,
    diaFechamento: db.dia_fechamento,
    diaVencimento: db.dia_vencimento,
    melhorDiaCompra: db.melhor_dia_compra,
    anuidadeValor: db.anuidade_valor,
    anuidadeProximoVenc: db.anuidade_proximo_venc ? new Date(db.anuidade_proximo_venc) : null,
    taxaJurosMes: db.taxa_juros_mes,
    status: db.status,
    userId: db.user_id,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
    utilizacao: Math.round(utilizacao * 100) / 100, // 2 decimais
  }
}

export function convertFaturaFromDB(db: FaturaDB): Fatura {
  const saldoDevedor = db.valor_total - db.valor_pago
  const now = new Date()
  const vencimento = new Date(db.data_vencimento)
  const diasParaVencimento = Math.ceil((vencimento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    id: db.id,
    cartaoId: db.cartao_id,
    mesReferencia: db.mes_referencia,
    dataFechamento: new Date(db.data_fechamento),
    dataVencimento: vencimento,
    valorTotal: db.valor_total,
    valorPago: db.valor_pago,
    valorMinimo: db.valor_minimo,
    status: db.status,
    dataPagamento: db.data_pagamento ? new Date(db.data_pagamento) : null,
    transacaoPagamentoId: db.transacao_pagamento_id,
    userId: db.user_id,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
    saldoDevedor,
    diasParaVencimento,
    vencida: diasParaVencimento < 0 && db.status !== 'paga',
    vencimentoProximo: diasParaVencimento <= 7 && diasParaVencimento > 0,
  }
}

export function convertAlertaFromDB(db: AlertaCartaoDB): AlertaCartao {
  return {
    id: db.id,
    userId: db.user_id,
    cartaoId: db.cartao_id,
    tipo: db.tipo,
    limiar: db.limiar,
    diasAntecedencia: db.dias_antecedencia,
    ativo: db.ativo,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  }
}
