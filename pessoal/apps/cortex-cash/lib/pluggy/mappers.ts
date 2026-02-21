/**
 * Pluggy → Cortex Cash Data Mappers
 *
 * Pure transformation functions from Pluggy SDK types to Cortex Cash entities.
 * No side effects — these just convert data shapes.
 */

import type { Account as PluggyAccount, Transaction as PluggyTransaction, Investment as PluggyInvestment } from 'pluggy-sdk'
import type {
  Conta,
  CartaoConfig,
  Instituicao,
  Investimento,
  Transacao,
  TipoConta,
  TipoInvestimento,
  TipoTransacao,
  Bandeira,
  StatusInvestimento,
} from '../types'

// ============================================================================
// Account Mapping
// ============================================================================

const ACCOUNT_SUBTYPE_MAP: Record<string, TipoConta> = {
  CHECKING_ACCOUNT: 'corrente',
  SAVINGS_ACCOUNT: 'poupanca',
  CREDIT_CARD: 'corrente', // Credit card accounts are tracked separately as CartaoConfig
}

export function mapPluggyAccountToConta(
  pluggyAccount: PluggyAccount,
  instituicaoId: string,
  usuarioId?: string
): Omit<Conta, 'id' | 'created_at' | 'updated_at'> {
  const tipo = ACCOUNT_SUBTYPE_MAP[pluggyAccount.subtype] || 'corrente'
  const now = new Date()

  return {
    instituicao_id: instituicaoId,
    nome: pluggyAccount.name || pluggyAccount.marketingName || 'Conta',
    tipo,
    numero: pluggyAccount.number || undefined,
    saldo_referencia: pluggyAccount.balance,
    data_referencia: now,
    saldo_atual: pluggyAccount.balance,
    ativa: true,
    pluggy_id: pluggyAccount.id,
    usuario_id: usuarioId,
  }
}

// ============================================================================
// Institution Mapping
// ============================================================================

export function mapConnectorToInstituicao(
  connectorName: string,
  connectorImageUrl?: string,
  connectorColor?: string
): Omit<Instituicao, 'id' | 'created_at' | 'updated_at'> {
  return {
    nome: connectorName,
    logo_url: connectorImageUrl,
    cor: connectorColor ? `#${connectorColor}` : undefined,
  }
}

// ============================================================================
// Transaction Mapping
// ============================================================================

export function mapPluggyTransactionToTransacao(
  pluggyTx: PluggyTransaction,
  contaId: string,
  usuarioId?: string
): Omit<Transacao, 'id' | 'created_at' | 'updated_at'> {
  const tipo = deriveTransactionType(pluggyTx.type, pluggyTx.amount)
  const valor = Math.abs(pluggyTx.amount)

  return {
    conta_id: contaId,
    data: new Date(pluggyTx.date),
    descricao: pluggyTx.description || pluggyTx.descriptionRaw || 'Sem descricao',
    valor,
    tipo,
    hash: `pluggy:${pluggyTx.id}`,
    origem_arquivo: 'pluggy',
    observacoes: pluggyTx.descriptionRaw && pluggyTx.descriptionRaw !== pluggyTx.description
      ? pluggyTx.descriptionRaw
      : undefined,
    parcelado: pluggyTx.creditCardMetadata?.totalInstallments
      ? pluggyTx.creditCardMetadata.totalInstallments > 1
      : false,
    parcela_numero: pluggyTx.creditCardMetadata?.installmentNumber,
    parcela_total: pluggyTx.creditCardMetadata?.totalInstallments,
    usuario_id: usuarioId,
  }
}

function deriveTransactionType(pluggyType: string, amount: number): TipoTransacao {
  // Pluggy: DEBIT = money going out, CREDIT = money coming in
  if (pluggyType === 'DEBIT') return 'despesa'
  if (pluggyType === 'CREDIT') return 'receita'
  // Fallback based on sign
  return amount < 0 ? 'despesa' : 'receita'
}

// ============================================================================
// Credit Card Mapping
// ============================================================================

const BRAND_MAP: Record<string, Bandeira> = {
  visa: 'visa',
  mastercard: 'mastercard',
  elo: 'elo',
  amex: 'amex',
  'american express': 'amex',
}

export function mapPluggyAccountToCartao(
  pluggyAccount: PluggyAccount,
  instituicaoId: string,
  usuarioId?: string
): Omit<CartaoConfig, 'id' | 'created_at' | 'updated_at'> | null {
  if (pluggyAccount.type !== 'CREDIT' || !pluggyAccount.creditData) {
    return null
  }

  const credit = pluggyAccount.creditData
  const brandKey = (credit.brand || '').toLowerCase()
  const bandeira = BRAND_MAP[brandKey] || undefined

  // Extract closing/due day from dates
  const diaFechamento = credit.balanceCloseDate
    ? new Date(credit.balanceCloseDate).getDate()
    : 1
  const diaVencimento = credit.balanceDueDate
    ? new Date(credit.balanceDueDate).getDate()
    : 10

  return {
    instituicao_id: instituicaoId,
    nome: pluggyAccount.name || 'Cartao de Credito',
    bandeira,
    limite_total: credit.creditLimit || 0,
    dia_fechamento: diaFechamento,
    dia_vencimento: diaVencimento,
    ativo: true,
    pluggy_id: pluggyAccount.id,
    usuario_id: usuarioId,
  }
}

// ============================================================================
// Investment Mapping
// ============================================================================

const INVESTMENT_TYPE_MAP: Record<string, TipoInvestimento> = {
  // Fixed income
  TREASURY: 'renda_fixa',
  LCI: 'renda_fixa',
  LCA: 'renda_fixa',
  CDB: 'renda_fixa',
  CRI: 'renda_fixa',
  CRA: 'renda_fixa',
  CORPORATE_DEBT: 'renda_fixa',
  LC: 'renda_fixa',
  DEBENTURES: 'renda_fixa',
  // Equity
  STOCK: 'renda_variavel',
  ETF: 'renda_variavel',
  REAL_ESTATE_FUND: 'renda_variavel',
  BDR: 'renda_variavel',
  DERIVATIVES: 'renda_variavel',
  OPTION: 'renda_variavel',
  // Funds
  INVESTMENT_FUND: 'fundo_investimento',
  MULTIMARKET_FUND: 'fundo_investimento',
  FIXED_INCOME_FUND: 'fundo_investimento',
  STOCK_FUND: 'fundo_investimento',
  ETF_FUND: 'fundo_investimento',
  OFFSHORE_FUND: 'fundo_investimento',
  FIP_FUND: 'fundo_investimento',
  EXCHANGE_FUND: 'fundo_investimento',
  FI_INFRA: 'fundo_investimento',
  FI_AGRO: 'fundo_investimento',
  // Retirement
  RETIREMENT: 'previdencia',
  // Structured note
  STRUCTURED_NOTE: 'outro',
}

const INVESTMENT_STATUS_MAP: Record<string, StatusInvestimento> = {
  ACTIVE: 'ativo',
  PENDING: 'ativo',
  TOTAL_WITHDRAWAL: 'resgatado',
}

export function mapPluggyInvestmentToInvestimento(
  pluggyInv: PluggyInvestment,
  instituicaoId: string,
  usuarioId?: string
): Omit<Investimento, 'id' | 'created_at' | 'updated_at'> {
  const tipo = INVESTMENT_TYPE_MAP[pluggyInv.subtype || ''] || INVESTMENT_TYPE_MAP[pluggyInv.type] || 'outro'
  const status = INVESTMENT_STATUS_MAP[pluggyInv.status || ''] || 'ativo'

  return {
    instituicao_id: instituicaoId,
    nome: pluggyInv.name,
    tipo,
    ticker: pluggyInv.code || undefined,
    valor_aplicado: pluggyInv.amountOriginal || pluggyInv.amount || 0,
    valor_atual: pluggyInv.balance,
    quantidade: pluggyInv.quantity || undefined,
    data_aplicacao: pluggyInv.purchaseDate ? new Date(pluggyInv.purchaseDate) : new Date(),
    data_vencimento: pluggyInv.dueDate ? new Date(pluggyInv.dueDate) : undefined,
    taxa_juros: pluggyInv.fixedAnnualRate || undefined,
    rentabilidade_contratada: pluggyInv.rate || undefined,
    indexador: pluggyInv.rateType || undefined,
    status,
    pluggy_id: pluggyInv.id,
    usuario_id: usuarioId,
  }
}

// ============================================================================
// Helpers
// ============================================================================

export function isCreditCardAccount(account: PluggyAccount): boolean {
  return account.type === 'CREDIT' && account.subtype === 'CREDIT_CARD'
}
