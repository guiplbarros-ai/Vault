export const ACCOUNT_TYPES = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CREDIT: 'credit',
  INVESTMENT: 'investment',
  CASH: 'cash',
} as const

export type AccountType = typeof ACCOUNT_TYPES[keyof typeof ACCOUNT_TYPES]

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [ACCOUNT_TYPES.CHECKING]: 'Conta Corrente',
  [ACCOUNT_TYPES.SAVINGS]: 'Poupança',
  [ACCOUNT_TYPES.CREDIT]: 'Cartão de Crédito',
  [ACCOUNT_TYPES.INVESTMENT]: 'Investimento',
  [ACCOUNT_TYPES.CASH]: 'Dinheiro',
}

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  [ACCOUNT_TYPES.CHECKING]: 'building-2',
  [ACCOUNT_TYPES.SAVINGS]: 'piggy-bank',
  [ACCOUNT_TYPES.CREDIT]: 'credit-card',
  [ACCOUNT_TYPES.INVESTMENT]: 'trending-up',
  [ACCOUNT_TYPES.CASH]: 'wallet',
}

export const ACCOUNT_TYPE_OPTIONS = Object.entries(ACCOUNT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label, icon: ACCOUNT_TYPE_ICONS[value as AccountType] })
)
