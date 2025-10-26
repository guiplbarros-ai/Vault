'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { addDays, format, startOfToday } from 'date-fns'

export interface UpcomingTransaction {
  id: string
  descricao: string
  valor_estimado: number
  proximo_vencimento: string
  periodicidade: string
  tipo: 'RECORRENTE' | 'PARCELADA'
  categoria: {
    id: string
    nome: string
    grupo: string
  } | null
}

export function useUpcomingTransactions(dias: number = 30) {
  const hoje = format(startOfToday(), 'yyyy-MM-dd')
  const limite = format(addDays(new Date(), dias), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['upcoming-transactions', dias],
    queryFn: async () => {
      // Buscar recorrências futuras
      const { data: recorrencias, error: errorRec } = await supabase
        .from('recorrencia')
        .select(
          `
          id,
          descricao,
          valor_estimado,
          proximo_vencimento,
          periodicidade,
          categoria:categoria_id (id, nome, grupo)
        `
        )
        .gte('proximo_vencimento', hoje)
        .lte('proximo_vencimento', limite)
        .order('proximo_vencimento')

      if (errorRec) {
        console.error('Error fetching recorrencias:', errorRec)
        throw errorRec
      }

      // Transformar em formato UpcomingTransaction
      const upcoming: UpcomingTransaction[] = (recorrencias || []).map((rec: any) => ({
        id: rec.id,
        descricao: rec.descricao,
        valor_estimado: rec.valor_estimado,
        proximo_vencimento: rec.proximo_vencimento,
        periodicidade: rec.periodicidade,
        tipo: 'RECORRENTE' as const,
        categoria: Array.isArray(rec.categoria) ? rec.categoria[0] : rec.categoria,
      }))

      // TODO: Adicionar parceladas futuras quando implementadas
      // Por enquanto, retornar apenas recorrências

      return upcoming
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}
