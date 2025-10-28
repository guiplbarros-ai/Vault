export const DATE_RANGES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  THIS_WEEK: 'this_week',
  LAST_WEEK: 'last_week',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_QUARTER: 'this_quarter',
  LAST_QUARTER: 'last_quarter',
  THIS_YEAR: 'this_year',
  LAST_YEAR: 'last_year',
  CUSTOM: 'custom',
} as const

export type DateRange = typeof DATE_RANGES[keyof typeof DATE_RANGES]

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  [DATE_RANGES.TODAY]: 'Hoje',
  [DATE_RANGES.YESTERDAY]: 'Ontem',
  [DATE_RANGES.THIS_WEEK]: 'Esta Semana',
  [DATE_RANGES.LAST_WEEK]: 'Semana Passada',
  [DATE_RANGES.THIS_MONTH]: 'Este Mês',
  [DATE_RANGES.LAST_MONTH]: 'Mês Passado',
  [DATE_RANGES.THIS_QUARTER]: 'Este Trimestre',
  [DATE_RANGES.LAST_QUARTER]: 'Trimestre Passado',
  [DATE_RANGES.THIS_YEAR]: 'Este Ano',
  [DATE_RANGES.LAST_YEAR]: 'Ano Passado',
  [DATE_RANGES.CUSTOM]: 'Personalizado',
}

export const DATE_RANGE_OPTIONS = Object.entries(DATE_RANGE_LABELS).map(
  ([value, label]) => ({ value, label })
)

export interface DateRangePeriod {
  startDate: Date
  endDate: Date
}

export function getDateRangePeriod(range: DateRange, customStart?: Date, customEnd?: Date): DateRangePeriod {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (range) {
    case DATE_RANGES.TODAY:
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      }

    case DATE_RANGES.YESTERDAY:
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return {
        startDate: yesterday,
        endDate: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1),
      }

    case DATE_RANGES.THIS_WEEK:
      const startOfWeek = new Date(today)
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      return {
        startDate: startOfWeek,
        endDate: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1),
      }

    case DATE_RANGES.LAST_WEEK:
      const lastWeekStart = new Date(today)
      lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 7)
      return {
        startDate: lastWeekStart,
        endDate: new Date(lastWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1),
      }

    case DATE_RANGES.THIS_MONTH:
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return { startDate: startOfMonth, endDate: endOfMonth }

    case DATE_RANGES.LAST_MONTH:
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { startDate: lastMonthStart, endDate: lastMonthEnd }

    case DATE_RANGES.THIS_QUARTER:
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
      const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1)
      const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999)
      return { startDate: quarterStart, endDate: quarterEnd }

    case DATE_RANGES.LAST_QUARTER:
      const lastQuarterStartMonth = Math.floor(now.getMonth() / 3) * 3 - 3
      const lastQuarterStart = new Date(now.getFullYear(), lastQuarterStartMonth, 1)
      const lastQuarterEnd = new Date(now.getFullYear(), lastQuarterStartMonth + 3, 0, 23, 59, 59, 999)
      return { startDate: lastQuarterStart, endDate: lastQuarterEnd }

    case DATE_RANGES.THIS_YEAR:
      const yearStart = new Date(now.getFullYear(), 0, 1)
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      return { startDate: yearStart, endDate: yearEnd }

    case DATE_RANGES.LAST_YEAR:
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      return { startDate: lastYearStart, endDate: lastYearEnd }

    case DATE_RANGES.CUSTOM:
      return {
        startDate: customStart || today,
        endDate: customEnd || today,
      }

    default:
      return { startDate: today, endDate: today }
  }
}
