import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface DFCData {
  mes: string
  entradas: number
  saidas: number
  saldo: number
}

async function fetchDFCData(months: number = 3): Promise<DFCData[]> {
  const now = new Date()
  const oldestMonth = subMonths(now, months - 1)
  const startDate = format(startOfMonth(oldestMonth), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd')

  // Buscar todas as transações de uma vez
  const { data: allTransactions, error } = await supabase
    .from('transacao')
    .select('valor, data')
    .gte('data', startDate)
    .lte('data', endDate)

  if (error) {
    console.error('Error fetching DFC data:', error)
    throw error
  }

  // Agrupar por mês
  const monthlyData: Record<string, { entradas: number; saidas: number }> = {}

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i)
    const key = format(date, 'yyyy-MM')
    monthlyData[key] = { entradas: 0, saidas: 0 }
  }

  // Processar todas as transações
  (allTransactions || []).forEach((t) => {
    const monthKey = t.data.substring(0, 7) // 'yyyy-MM'
    if (!monthlyData[monthKey]) return

    const valor = parseFloat(t.valor)
    if (valor > 0) {
      monthlyData[monthKey].entradas += valor
    } else {
      monthlyData[monthKey].saidas += Math.abs(valor)
    }
  })

  // Criar array de resultados
  const result: DFCData[] = []
  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i)
    const key = format(date, 'yyyy-MM')
    const { entradas, saidas } = monthlyData[key]

    result.push({
      mes: format(date, 'MMM/yy', { locale: ptBR }),
      entradas,
      saidas,
      saldo: entradas - saidas,
    })
  }

  return result
}

export function useDFCData(months: number = 3) {
  return useQuery({
    queryKey: ['dfc', months],
    queryFn: () => fetchDFCData(months),
    staleTime: 1000 * 60, // 1 minuto
  })
}
