import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export interface BudgetVsActualData {
  categoria: string
  orcado: number
  realizado: number
  percentual: number
}

async function fetchBudgetData(month: Date = new Date()): Promise<BudgetVsActualData[]> {
  const mesFormatado = format(month, 'yyyy-MM-dd')
  const startDate = format(startOfMonth(month), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(month), 'yyyy-MM-dd')

  // Buscar orçamentos do mês
  const { data: orcamentos, error: orcamentoError } = await supabase
    .from('orcamento')
    .select(`
      valor_alvo,
      categoria:categoria_id (
        id,
        nome
      )
    `)
    .eq('mes', mesFormatado)

  if (orcamentoError) {
    console.error('Error fetching budgets:', orcamentoError)
    return []
  }

  // Processar dados
  const result: BudgetVsActualData[] = await Promise.all(
    (orcamentos || []).map(async (orc: any) => {
      const categoriaId = orc.categoria?.id
      const categoriaNome = orc.categoria?.nome || 'Sem categoria'

      // Buscar gastos reais da categoria no mês
      const { data: transacoes } = await supabase
        .from('transacao')
        .select('valor')
        .eq('categoria_id', categoriaId)
        .gte('data', startDate)
        .lte('data', endDate)
        .lt('valor', 0) // Apenas saídas

      const realizado = Math.abs(
        (transacoes || []).reduce((sum, t) => sum + parseFloat(t.valor), 0)
      )

      const orcado = parseFloat(orc.valor_alvo || '0')
      const percentual = orcado > 0 ? (realizado / orcado) * 100 : 0

      return {
        categoria: categoriaNome,
        orcado,
        realizado,
        percentual,
      }
    })
  )

  return result.sort((a, b) => b.realizado - a.realizado)
}

export function useBudgetData(month?: Date) {
  return useQuery({
    queryKey: ['budget', month?.toISOString()],
    queryFn: () => fetchBudgetData(month),
  })
}
