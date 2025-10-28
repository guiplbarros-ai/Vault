export const BUDGET_PERIODS = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
} as const

export type BudgetPeriod = typeof BUDGET_PERIODS[keyof typeof BUDGET_PERIODS]

export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  [BUDGET_PERIODS.WEEKLY]: 'Semanal',
  [BUDGET_PERIODS.MONTHLY]: 'Mensal',
  [BUDGET_PERIODS.QUARTERLY]: 'Trimestral',
  [BUDGET_PERIODS.YEARLY]: 'Anual',
}

export const BUDGET_PERIOD_OPTIONS = Object.entries(BUDGET_PERIOD_LABELS).map(
  ([value, label]) => ({ value, label })
)

// Number of days in each period (approximate for calculation purposes)
export const BUDGET_PERIOD_DAYS: Record<BudgetPeriod, number> = {
  [BUDGET_PERIODS.WEEKLY]: 7,
  [BUDGET_PERIODS.MONTHLY]: 30,
  [BUDGET_PERIODS.QUARTERLY]: 90,
  [BUDGET_PERIODS.YEARLY]: 365,
}
