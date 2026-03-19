import { listContas } from '@/services/account.service'
import { useQuery } from '@tanstack/react-query'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: listContas,
  })
}

export function useTotalBalance() {
  const { data: accounts } = useAccounts()
  const total = accounts?.reduce((sum, a) => sum + Number(a.saldo_atual), 0) ?? 0
  return total
}
