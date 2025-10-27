// Database transaction types (as stored in database)
export const TRANSACTION_TYPE = {
  DEBITO: 'debito',
  CREDITO: 'credito',
} as const

// UI-friendly labels
export const TRANSACTION_TYPE_LABEL = {
  [TRANSACTION_TYPE.DEBITO]: 'Despesa',
  [TRANSACTION_TYPE.CREDITO]: 'Receita',
} as const

// Helper functions
export function isExpense(tipo: string): boolean {
  return tipo === TRANSACTION_TYPE.DEBITO
}

export function isIncome(tipo: string): boolean {
  return tipo === TRANSACTION_TYPE.CREDITO
}

export function getTransactionTypeLabel(tipo: string): string {
  return TRANSACTION_TYPE_LABEL[tipo as keyof typeof TRANSACTION_TYPE_LABEL] || tipo
}
