import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns'

export interface DFCData {
  mes: string
  entradas: number
  saidas: number
  saldo: number
}

async function fetchDFCData(months: number = 6): Promise<DFCData[]> {
  const result: DFCData[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i)
    const startDate = format(startOfMonth(date), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(date), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('transacao')
      .select('valor')
      .gte('data', startDate)
      .lte('data', endDate)

    if (error) {
      console.error('Error fetching DFC data:', error)
      continue
    }

    const transactions = data || []
    const entradas = transactions
      .filter((t) => parseFloat(t.valor) > 0)
      .reduce((sum, t) => sum + parseFloat(t.valor), 0)

    const saidas = Math.abs(
      transactions
        .filter((t) => parseFloat(t.valor) < 0)
        .reduce((sum, t) => sum + parseFloat(t.valor), 0)
    )

    const saldo = entradas - saidas

    result.push({
      mes: format(date, 'MMM/yy'),
      entradas,
      saidas,
      saldo,
    })
  }

  return result
}

export function useDFCData(months: number = 6) {
  return useQuery({
    queryKey: ['dfc', months],
    queryFn: () => fetchDFCData(months),
  })
}
