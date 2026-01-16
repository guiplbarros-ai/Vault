import { getDayMonthShortPtBR, getDaysInCurrentMonth } from './date.js'

export type FinanceDirection = 'higher_is_better' | 'lower_is_better'
export type PaymentMethod = 'pix' | 'boleto' | 'cartao'

export interface Recebivel {
  amount: number | string
  /**
   * Data esperada de pagamento pelo cliente (YYYY-MM-DD).
   * A data de crédito em conta será calculada aplicando o prazo do método.
   */
  expectedPaymentDate: string // YYYY-MM-DD
  method: PaymentMethod
}

export interface RecebimentosProjectionInput {
  /**
   * Data de referência (hoje).
   */
  asOf?: string // YYYY-MM-DD
  /**
   * Valor já creditado no mês até a data.
   */
  receivedToDate: number | string
  /**
   * Itens a receber (por fatura) com data esperada de pagamento e método.
   */
  pending: Recebivel[]
}

export interface RecebimentosProjectionResult {
  asOf: Date
  monthStart: Date
  monthEnd: Date
  receivedToDate: number
  projectedRemainingInMonth: number
  projectedTotalInMonth: number
  projectedAfterMonth: number
}

export function getMethodLagDays(method: PaymentMethod): number {
  // Regras fornecidas:
  // - PIX: compensação máxima D+1
  // - Boleto: máximo D+5
  // - Cartão: D+30 sempre
  switch (method) {
    case 'pix':
      return 1
    case 'boleto':
      return 5
    case 'cartao':
      return 30
    default: {
      const _exhaustive: never = method
      return _exhaustive
    }
  }
}

export interface FinanceItemInput {
  indicador: string
  metaMes: number | string
  realizado: number | string | null
  /**
   * Como interpretar o indicador para status (opcional).
   * - higher_is_better: receita, caixa, geração de caixa etc.
   * - lower_is_better: inadimplência, despesas etc.
   */
  direction?: FinanceDirection
  /**
   * Opcional: força a projeção final (ex: quando você já tem "Previsão de Recebimento").
   * Se não informado, a projeção é calculada por run-rate linear.
   */
  projecaoFinal?: number | string | null
}

export interface FinanceTableInput {
  /**
   * Data de referência do realizado. Se omitida, usa "agora".
   */
  asOf?: string // YYYY-MM-DD (recomendado)
  items: FinanceItemInput[]
}

export function parsePtBRNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null

  const s0 = value.trim()
  if (!s0) return null

  // Mantém apenas dígitos, separadores e sinal
  const s = s0.replace(/[^\d.,-]/g, '')
  if (!s || s === '-' || s === ',' || s === '.') return null

  // Heurística pt-BR:
  // - Se tem "." e ",": "." milhar e "," decimal
  // - Se tem só ",": "," decimal
  // - Se tem só ".": pode ser milhar (ex: 990.702) ou decimal; assumimos milhar quando há 3 dígitos após o último "."
  if (s.includes('.') && s.includes(',')) {
    const normalized = s.replace(/\./g, '').replace(',', '.')
    const n = Number(normalized)
    return Number.isFinite(n) ? n : null
  }

  if (s.includes(',') && !s.includes('.')) {
    const n = Number(s.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  if (s.includes('.') && !s.includes(',')) {
    const lastDot = s.lastIndexOf('.')
    const digitsAfter = s.length - lastDot - 1
    const normalized = digitsAfter === 3 ? s.replace(/\./g, '') : s
    const n = Number(normalized)
    return Number.isFinite(n) ? n : null
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function formatNumberPtBR(n: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n)
}

export function formatPercentPtBR(ratio: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(ratio)
}

export function calcPercentMeta(realizado: number | null, metaMes: number): number | null {
  if (realizado === null) return null
  if (!Number.isFinite(metaMes) || metaMes === 0) return null
  return realizado / metaMes
}

export function calcProjecaoFinal(realizado: number | null, asOf: Date): number | null {
  if (realizado === null) return null
  const dia = asOf.getDate()
  const diasNoMes = getDaysInCurrentMonth(asOf)
  if (dia <= 0 || diasNoMes <= 0) return null
  return (realizado / dia) * diasNoMes
}

export function projectRecebimentos(
  input: RecebimentosProjectionInput
): RecebimentosProjectionResult {
  const asOf = input.asOf ? new Date(`${input.asOf}T12:00:00`) : new Date()
  const receivedToDate = parsePtBRNumber(input.receivedToDate) ?? 0

  const monthStart = new Date(asOf)
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const monthEnd = new Date(asOf)
  monthEnd.setMonth(monthEnd.getMonth() + 1, 0) // último dia do mês
  monthEnd.setHours(23, 59, 59, 999)

  let projectedRemainingInMonth = 0
  let projectedAfterMonth = 0

  for (const item of input.pending) {
    const amount = parsePtBRNumber(item.amount) ?? 0
    const lag = getMethodLagDays(item.method)
    const payDate = new Date(`${item.expectedPaymentDate}T12:00:00`)
    const creditDate = new Date(payDate)
    creditDate.setDate(creditDate.getDate() + lag)

    // Considera apenas créditos a partir de amanhã (evita "pendente" de hoje virar duplicado do "receivedToDate")
    const tomorrow = new Date(asOf)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    if (creditDate < tomorrow) continue

    if (creditDate >= monthStart && creditDate <= monthEnd) {
      projectedRemainingInMonth += amount
    } else if (creditDate > monthEnd) {
      projectedAfterMonth += amount
    }
  }

  return {
    asOf,
    monthStart,
    monthEnd,
    receivedToDate,
    projectedRemainingInMonth,
    projectedTotalInMonth: receivedToDate + projectedRemainingInMonth,
    projectedAfterMonth,
  }
}

export function calcStatusEmoji(
  percentMeta: number | null,
  direction: FinanceDirection = 'higher_is_better'
): string {
  if (percentMeta === null) return '🟡'

  // Para lower_is_better, inverte: quanto menor, melhor.
  const score = direction === 'lower_is_better' ? 1 - percentMeta : percentMeta

  if (score >= 1) return '🟢'
  if (score >= 0.8) return '🟡'
  return '🔴'
}

export function buildFinancasMarkdownTable(input: FinanceTableInput): string {
  const asOf = input.asOf ? new Date(`${input.asOf}T12:00:00`) : new Date()
  const asOfLabel = getDayMonthShortPtBR(asOf)

  const rows = input.items.map((it) => {
    const metaMes = parsePtBRNumber(it.metaMes) ?? 0
    const realizado = parsePtBRNumber(it.realizado)
    const percentMeta = calcPercentMeta(realizado, metaMes)
    const projOverride =
      it.projecaoFinal === undefined ? undefined : parsePtBRNumber(it.projecaoFinal)
    const proj = projOverride ?? calcProjecaoFinal(realizado, asOf)
    const status = calcStatusEmoji(percentMeta, it.direction ?? 'higher_is_better')

    return {
      indicador: it.indicador,
      metaMes,
      realizado,
      percentMeta,
      proj,
      status,
    }
  })

  const header = `| Indicador | Meta Mês | Realizado (até ${asOfLabel}) | % Meta | Projeção Final | Status |\n|---|---:|---:|---:|---:|:---:|`

  const lines = rows.map((r) => {
    const metaStr = formatNumberPtBR(r.metaMes, 0)
    const realStr = r.realizado === null ? '-' : formatNumberPtBR(r.realizado, 0)
    const pctStr = r.percentMeta === null ? '-' : formatPercentPtBR(r.percentMeta, 2)
    const projStr = r.proj === null ? '-' : formatNumberPtBR(r.proj, 0)
    return `| ${r.indicador} | ${metaStr} | ${realStr} | ${pctStr} | ${projStr} | ${r.status} |`
  })

  return [header, ...lines].join('\n')
}
