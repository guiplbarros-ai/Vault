"use client"

import { useState, useEffect } from 'react'
import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Loader2 } from 'lucide-react'
import { transacaoService } from '@/lib/services/transacao.service'
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Transacao } from '@/lib/types'

interface ChartData {
  month: string
  income: number
  expenses: number
}

export function CashFlowChart() {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChartData()
  }, [])

  const loadChartData = async () => {
    try {
      setLoading(true)

      // Carrega todas as transações
      const transacoes = await transacaoService.listTransacoes()

      // Cria array dos últimos 6 meses
      const months: ChartData[] = []
      const now = new Date()

      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i)
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthDate)

        // Filtra transações do mês
        const monthTransactions = transacoes.filter(t => {
          const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
          return transactionDate >= monthStart && transactionDate <= monthEnd
        })

        // Calcula receitas e despesas
        const income = monthTransactions
          .filter(t => t.tipo === 'receita')
          .reduce((acc, t) => acc + t.valor, 0)

        const expenses = monthTransactions
          .filter(t => t.tipo === 'despesa')
          .reduce((acc, t) => acc + Math.abs(t.valor), 0)

        months.push({
          month: format(monthDate, 'MMM', { locale: ptBR }),
          income: Math.round(income),
          expenses: Math.round(expenses),
        })
      }

      setData(months)
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Fluxo de Caixa</h3>
        <p className="text-sm text-muted-foreground">Receitas vs Despesas (Últimos 6 meses)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={formatCurrency} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Bar dataKey="income" fill="hsl(var(--accent))" name="Receitas" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="hsl(var(--chart-2))" name="Despesas" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
