export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES]

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TRANSACTION_TYPES.INCOME]: 'Receita',
  [TRANSACTION_TYPES.EXPENSE]: 'Despesa',
}

export const TRANSACTION_TYPE_OPTIONS = Object.entries(TRANSACTION_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)
