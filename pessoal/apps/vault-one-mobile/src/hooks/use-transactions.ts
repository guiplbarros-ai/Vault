import { getMonthSummary, listTransactions } from '@/services/transaction.service'
import { useQuery } from '@tanstack/react-query'

export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: ['transactions', 'recent', limit],
    queryFn: () => listTransactions({ limit }),
  })
}

export function useMonthSummary(year?: number, month?: number) {
  const now = new Date()
  const y = year ?? now.getFullYear()
  const m = month ?? now.getMonth() + 1

  return useQuery({
    queryKey: ['month-summary', y, m],
    queryFn: () => getMonthSummary(y, m),
  })
}
