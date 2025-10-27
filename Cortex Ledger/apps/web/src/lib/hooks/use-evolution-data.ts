'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TRANSACTION_TYPE } from '@/lib/constants'

export interface EvolutionData {
  mes: string
  receitas: number
  despesas: number
  saldo: number
  variacao: number // Percentual de variação M/M
}

export function useEvolutionData(meses: number = 3) {
  return useQuery({
    queryKey: ['evolution-data', meses],
    queryFn: async () => {
      const now = new Date()
      const oldestMonth = subMonths(now, meses - 1)
      const inicio = format(startOfMonth(oldestMonth), 'yyyy-MM-dd')
      const fim = format(endOfMonth(now), 'yyyy-MM-dd')

      // Buscar todas as transações de uma vez
      const { data: allTransactions, error } = await supabase
        .from('transacao')
        .select('valor, tipo, data')
        .gte('data', inicio)
        .lte('data', fim)

      if (error) throw error

      // Agrupar por mês
      const monthlyData: Record<string, { receitas: number; despesas: number }> = {}

      for (let i = meses - 1; i >= 0; i--) {
        const mesRef = subMonths(now, i)
        const key = format(mesRef, 'yyyy-MM')
        monthlyData[key] = { receitas: 0, despesas: 0 }
      }

      // Processar todas as transações
      (allTransactions || []).forEach((t) => {
        const monthKey = t.data.substring(0, 7) // 'yyyy-MM'
        if (!monthlyData[monthKey]) return

        if (t.tipo === TRANSACTION_TYPE.CREDITO && t.valor > 0) {
          monthlyData[monthKey].receitas += t.valor
        } else if (t.tipo === TRANSACTION_TYPE.DEBITO && t.valor < 0) {
          monthlyData[monthKey].despesas += Math.abs(t.valor)
        }
      })

      // Criar array de resultados
      const results = []
      for (let i = meses - 1; i >= 0; i--) {
        const mesRef = subMonths(now, i)
        const key = format(mesRef, 'yyyy-MM')
        const { receitas, despesas } = monthlyData[key]

        results.push({
          mes: format(mesRef, 'MMM/yy', { locale: ptBR }),
          receitas,
          despesas,
          saldo: receitas - despesas,
          variacao: 0, // Will calculate below
        })
      }

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
