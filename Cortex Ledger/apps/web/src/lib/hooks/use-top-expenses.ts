'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, format } from 'date-fns'

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
      const { data, error } = await supabase
        .from('transacao')
        .select(
          `
          id,
          descricao,
          valor,
          data,
          categoria:categoria_id (id, nome, grupo),
          conta:conta_id (id, apelido)
        `
        )
        .eq('tipo', 'DESPESA')
        .gte('data', inicio)
        .lte('data', fim)
        .order('valor', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching top expenses:', error)
        throw error
      }

      // Supabase retorna relacionamentos como arrays, precisamos mapear
      return (data || []).map((item: any) => ({
        id: item.id,
        descricao: item.descricao,
        valor: item.valor,
        data: item.data,
        categoria: Array.isArray(item.categoria) ? item.categoria[0] : item.categoria,
        conta: Array.isArray(item.conta) ? item.conta[0] : item.conta,
      })) as TopExpense[]
    },
    staleTime: 1000 * 60, // 1 minuto
  })
}
