'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { TRANSACTION_TYPE } from '@/lib/constants'

export interface BudgetAlert {
  id: string
  categoria_nome: string
  categoria_grupo: string
  valor_planejado: number
  valor_realizado: number
  percentual: number
  tipo_alerta: '80' | '100' | 'excedido'
  mes: string
}

async function fetchBudgetAlerts(mesRef?: Date): Promise<BudgetAlert[]> {
  const mes = mesRef || new Date()
  const inicio = format(startOfMonth(mes), 'yyyy-MM-dd')
  const fim = format(endOfMonth(mes), 'yyyy-MM-dd')
  const mesFormatted = format(startOfMonth(mes), 'yyyy-MM-dd')

  // TEMPORARY: Buscar orçamentos sem relacionamento categoria até migration
  const { data: orcamentos, error: errorOrcamentos } = await supabase
    .from('orcamento')
    .select('*')
    .eq('mes', mesFormatted)

  if (errorOrcamentos) {
    console.error('Error fetching budgets:', errorOrcamentos)
    return []
  }

  if (!orcamentos || orcamentos.length === 0) {
    return []
  }

  // Buscar categorias separadamente
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

  // TEMPORARY: Como categoria_id não existe em transacao, retornar array vazio
  // Após migration, descomentar o código abaixo para calcular alertas
  console.warn('⚠️ Budget alerts disabled until categoria_id migration is applied to transacao table')
  return []

  /* UNCOMMENT AFTER MIGRATION:
  const alerts: BudgetAlert[] = []

  for (const orcamento of orcamentos) {
    const { data: transacoes, error: errorTransacoes } = await supabase
      .from('transacao')
      .select('valor')
      .eq('categoria_id', orcamento.categoria_id)
      .eq('tipo', TRANSACTION_TYPE.DEBITO)
      .lt('valor', 0)
      .gte('data', inicio)
      .lte('data', fim)

    if (errorTransacoes) {
      console.error('Error fetching transactions:', errorTransacoes)
      continue
    }

    const valorRealizado = (transacoes || [])
      .reduce((acc, t) => acc + Math.abs(t.valor), 0)

    const percentual = (valorRealizado / orcamento.valor_planejado) * 100

    let tipoAlerta: '80' | '100' | 'excedido' | null = null

    if (percentual >= 100) {
      tipoAlerta = 'excedido'
    } else if (percentual >= 80) {
      tipoAlerta = '80'
    }

    if (tipoAlerta) {
      const categoria = categorias[orcamento.categoria_id]

      alerts.push({
        id: orcamento.id,
        categoria_nome: categoria?.nome || 'Sem nome',
        categoria_grupo: categoria?.grupo || 'Sem grupo',
        valor_planejado: orcamento.valor_alvo,
        valor_realizado: valorRealizado,
        percentual,
        tipo_alerta: tipoAlerta,
        mes: orcamento.mes,
      })
    }
  }

  return alerts
  */
}

export function useBudgetAlerts(mesRef?: Date) {
  return useQuery({
    queryKey: ['budget-alerts', mesRef ? format(mesRef, 'yyyy-MM') : format(new Date(), 'yyyy-MM')],
    queryFn: () => fetchBudgetAlerts(mesRef),
    staleTime: 1000 * 60, // 1 minuto
    refetchInterval: 1000 * 60 * 5, // Refetch a cada 5 minutos
  })
}
