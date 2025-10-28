import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { requireSession, formatSupabaseError } from '@/lib/query-utils'

export interface BudgetVsActualData {
  categoria: string
  orcado: number
  realizado: number
  percentual: number
}

async function fetchBudgetData(month: Date = new Date()): Promise<BudgetVsActualData[]> {
  // Verificar sessão
  const session = await requireSession()
  if (!session) {
    return []
  }

  const mesFormatado = format(startOfMonth(month), 'yyyy-MM-dd')
  const startDate = format(startOfMonth(month), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(month), 'yyyy-MM-dd')

  // TEMPORARY: Buscar orçamentos sem relacionamento
  const { data: orcamentos, error: orcamentoError } = await supabase
    .from('orcamento')
    .select('*')
    .eq('mes', mesFormatado)

  if (orcamentoError) {
    formatSupabaseError(orcamentoError, 'fetch budgets')
    return []
  }

  if (!orcamentos || orcamentos.length === 0) {
    return []
  }

  // Buscar categorias
  const categoriaIds = [...new Set(orcamentos.map((o: any) => o.categoria_id).filter(Boolean))]
  let categorias: Record<string, any> = {}

  if (categoriaIds.length > 0) {
    const { data: categoriasData } = await supabase
      .from('categoria')
      .select('id, nome, grupo')
      .in('id', categoriaIds)

    if (categoriasData) {
      categorias = Object.fromEntries(
        categoriasData.map((cat: any) => [cat.id, cat])
      )
    }
  }

  // Buscar valores realizados
  const result: BudgetVsActualData[] = await Promise.all(
    orcamentos.map(async (orc: any) => {
      const categoriaId = orc.categoria_id
      const categoria = categorias[categoriaId]

      // Buscar transações da categoria no período
      const { data: transacoes } = await supabase
        .from('transacao')
        .select('valor')
        .eq('categoria_id', categoriaId)
        .gte('data', startDate)
        .lte('data', endDate)
        .lt('valor', 0) // Apenas despesas (valores negativos)

      const realizado = Math.abs(
        (transacoes || []).reduce((sum, t) => sum + parseFloat(t.valor), 0)
      )

      const orcado = parseFloat(orc.valor_alvo || orc.valor_planejado || '0')
      const percentual = orcado > 0 ? (realizado / orcado) * 100 : 0

      return {
        categoria: categoria?.nome || 'Sem categoria',
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
