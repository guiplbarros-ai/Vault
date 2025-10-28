'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { requireSession, formatSupabaseError } from '@/lib/query-utils'
import { TRANSACTION_TYPE } from '@/lib/constants'

export interface TopExpense {
  id: string
  descricao: string
  valor: number
  data: string
  categoria: {
    id: string
    nome: string
    grupo: string
  } | null
  conta: {
    id: string
    apelido: string
  } | null
}

export function useTopExpenses(limit: number = 5, mes?: Date) {
  const mesRef = mes || new Date()
  const inicio = format(startOfMonth(mesRef), 'yyyy-MM-dd')
  const fim = format(endOfMonth(mesRef), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['top-expenses', limit, inicio, fim],
    queryFn: async () => {
      // Verificar se há sessão ativa
      const session = await requireSession()
      if (!session) {
        return []
      }

      try {
        const { data, error } = await supabase
          .from('transacao')
          .select('id, descricao, valor, data, conta_id')
          .eq('tipo', TRANSACTION_TYPE.DEBITO)
          .lt('valor', 0) // Despesas têm valor negativo
          .gte('data', inicio)
          .lte('data', fim)
          .order('valor', { ascending: true }) // Ordem crescente para pegar os valores mais negativos primeiro
          .limit(limit)

        if (error) {
          console.error('Supabase error in fetch top expenses:', error)
          throw formatSupabaseError(error, 'fetch top expenses')
        }

        if (!data || data.length === 0) {
          return []
        }

        // Buscar contas separadamente
        const contaIds = [...new Set(data.map(t => t.conta_id).filter(Boolean))]
        let contas: Record<string, any> = {}

        if (contaIds.length > 0) {
          const { data: contasData } = await supabase
            .from('conta')
            .select('id, apelido')
            .in('id', contaIds)

          if (contasData) {
            contas = Object.fromEntries(
              contasData.map((conta: any) => [conta.id, conta])
            )
          }
        }

        // Mapear dados (sem categoria por enquanto)
        return data.map((item: any) => ({
          id: item.id,
          descricao: item.descricao,
          valor: item.valor,
          data: item.data,
          categoria: null, // Categoria será implementada futuramente
          conta: item.conta_id ? contas[item.conta_id] : null,
        })) as TopExpense[]
      } catch (err) {
        console.error('Error fetching top expenses:', err)
        return []
      }
    },
    staleTime: 1000 * 60, // 1 minuto
    retry: 1, // Reduzir tentativas para falhar mais rápido
  })
}
