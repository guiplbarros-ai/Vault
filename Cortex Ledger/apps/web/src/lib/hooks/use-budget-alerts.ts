'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export interface BudgetAlert {
  id: string
  categoria_nome: string
  categoria_grupo: string
  valor_planejado: number
  valor_realizado: number
  percentual: number
  tipo_alerta: '80' | '100' | 'excedido'
  mes_ref: string
}

async function fetchBudgetAlerts(mesRef?: Date): Promise<BudgetAlert[]> {
  const mes = mesRef || new Date()
  const inicio = format(startOfMonth(mes), 'yyyy-MM-dd')
  const fim = format(endOfMonth(mes), 'yyyy-MM-dd')
  const mesFormatted = format(startOfMonth(mes), 'yyyy-MM-dd')

  // Buscar orçamentos do mês
  const { data: orcamentos, error: errorOrcamentos } = await supabase
    .from('orcamento')
    .select('*, categoria:categoria_id (id, nome, grupo)')
    .eq('mes_ref', mesFormatted)

  if (errorOrcamentos) throw errorOrcamentos

  if (!orcamentos || orcamentos.length === 0) {
    return []
  }

  // Buscar transações do mês para cada categoria
  const alerts: BudgetAlert[] = []

  for (const orcamento of orcamentos) {
    const { data: transacoes, error: errorTransacoes } = await supabase
      .from('transacao')
      .select('valor')
      .eq('categoria_id', orcamento.categoria_id)
      .eq('tipo', 'DESPESA')
      .gte('data', inicio)
      .lte('data', fim)

    if (errorTransacoes) {
      console.error('Error fetching transactions:', errorTransacoes)
      continue
    }

    const valorRealizado = (transacoes || [])
      .reduce((acc, t) => acc + Math.abs(t.valor), 0)

    const percentual = (valorRealizado / orcamento.valor_planejado) * 100

    // Determinar tipo de alerta
    let tipoAlerta: '80' | '100' | 'excedido' | null = null

    if (percentual >= 100) {
      tipoAlerta = 'excedido'
    } else if (percentual >= 80) {
      tipoAlerta = '80'
    }

    // Só adiciona se houver alerta
    if (tipoAlerta) {
      const categoria = Array.isArray(orcamento.categoria)
        ? orcamento.categoria[0]
        : orcamento.categoria

      alerts.push({
        id: orcamento.id,
        categoria_nome: categoria?.nome || 'Sem nome',
        categoria_grupo: categoria?.grupo || 'Sem grupo',
        valor_planejado: orcamento.valor_planejado,
        valor_realizado: valorRealizado,
        percentual,
        tipo_alerta: tipoAlerta,
        mes_ref: orcamento.mes_ref,
      })
    }
  }

  return alerts
}

export function useBudgetAlerts(mesRef?: Date) {
  return useQuery({
    queryKey: ['budget-alerts', mesRef ? format(mesRef, 'yyyy-MM') : format(new Date(), 'yyyy-MM')],
    queryFn: () => fetchBudgetAlerts(mesRef),
    staleTime: 1000 * 60, // 1 minuto
    refetchInterval: 1000 * 60 * 5, // Refetch a cada 5 minutos
  })
}
