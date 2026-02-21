/**
 * Transaction Type Reclassification Rules
 *
 * Patterns that identify transactions wrongly classified as receita/despesa
 * by Pluggy's DEBIT/CREDIT logic, but are actually transfers between accounts.
 *
 * These run post-sync to fix transaction types before categorization.
 */

import type { TipoTransacao } from '../types'

export interface TypeReclassRule {
  pattern: string
  newType: TipoTransacao
}

/**
 * Patterns matched via case-insensitive `includes()` against transaction description.
 * Order doesn't matter — first match wins.
 */
export const TYPE_RECLASS_RULES: TypeReclassRule[] = [
  // Credit card payments (already tracked as individual charges)
  { pattern: 'GASTOS CARTAO DE CREDITO', newType: 'transferencia' },
  { pattern: 'PAGAMENTO DE FATURA', newType: 'transferencia' },
  { pattern: 'PAGTO. POR DEB EM C/C', newType: 'transferencia' },
  { pattern: 'PAGAMENTO RECEBIDO', newType: 'transferencia' },

  // Currency exchange (user's own account abroad)
  { pattern: 'CAMBIO FINANCEIRO', newType: 'transferencia' },
  { pattern: 'IMPOSTO S/OPER CAMBIO', newType: 'transferencia' },

  // Investment movements (not real income/expense)
  { pattern: 'RESG/VENCTO CDB', newType: 'transferencia' },
  { pattern: 'APLICACAO CDB', newType: 'transferencia' },
  { pattern: 'APLICACAO POUPANCA', newType: 'transferencia' },
  { pattern: 'APLICACAO EM FUNDOS', newType: 'transferencia' },
  { pattern: 'RESGATE FUNDOS', newType: 'transferencia' },
  { pattern: 'RESGATE POUPANCA', newType: 'transferencia' },

  // Internal transfers
  { pattern: 'TRANSF ENTRE CONTAS', newType: 'transferencia' },

  // PIX between own accounts (user: Guilherme Pereira de Lacerda e Barros)
  { pattern: 'GUILHERME PEREIRA DE', newType: 'transferencia' },

  // Real estate purchase (asset acquisition, not consumption)
  { pattern: 'AUGUSTO SCHER', newType: 'transferencia' },
]

/**
 * Check if a transaction description matches any reclassification rule.
 * Returns the new type if matched, or null if no match.
 */
export function matchTypeReclassRule(description: string): TipoTransacao | null {
  const upper = description.toUpperCase()
  for (const rule of TYPE_RECLASS_RULES) {
    if (upper.includes(rule.pattern)) {
      return rule.newType
    }
  }
  return null
}
