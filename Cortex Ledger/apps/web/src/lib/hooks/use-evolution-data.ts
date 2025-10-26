'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface EvolutionData {
  mes: string
  receitas: number
  despesas: number
  saldo: number
  variacao: number // Percentual de variação M/M
}

export function useEvolutionData(meses: number = 6) {
  return useQuery({
    queryKey: ['evolution-data', meses],
    queryFn: async () => {
      const now = new Date()
      const promises = []

      // Buscar dados dos últimos N meses
      for (let i = meses - 1; i >= 0; i--) {
        const mesRef = subMonths(now, i)
        const inicio = format(startOfMonth(mesRef), 'yyyy-MM-dd')
        const fim = format(endOfMonth(mesRef), 'yyyy-MM-dd')

        const promise = supabase
          .from('transacao')
          .select('valor, tipo')
          .gte('data', inicio)
          .lte('data', fim)
          .then(({ data, error }) => {
            if (error) throw error

            const receitas = (data || [])
              .filter((t) => t.tipo === 'RECEITA')
              .reduce((acc, t) => acc + t.valor, 0)

            const despesas = Math.abs(
              (data || [])
                .filter((t) => t.tipo === 'DESPESA')
                .reduce((acc, t) => acc + t.valor, 0)
            )

            const saldo = receitas - despesas

            return {
              mes: format(mesRef, 'MMM/yy', { locale: ptBR }),
              receitas,
              despesas,
              saldo,
              variacao: 0, // Will calculate below
            }
          })

        promises.push(promise)
      }

      const results = await Promise.all(promises)

      // Calcular variação M/M
      const evolutionData: EvolutionData[] = results.map((current, index) => {
        let variacao = 0
        if (index > 0) {
          const previous = results[index - 1]
          if (previous.saldo !== 0) {
            variacao = ((current.saldo - previous.saldo) / Math.abs(previous.saldo)) * 100
          }
        }

        return {
          ...current,
          variacao,
        }
      })

      return evolutionData
    },
    staleTime: 1000 * 60, // 1 minuto
  })
}
