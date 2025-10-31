"use client"

import { useState, useEffect, useMemo } from 'react'
import { useSetting, useLocalizationSettings } from '@/app/providers/settings-provider'
import { Card } from "@/components/ui/card"
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts"
import { Loader2 } from 'lucide-react'
import { transacaoService } from '@/lib/services/transacao.service'
import { contaService } from '@/lib/services/conta.service'
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Transacao } from '@/lib/types'

interface ChartData {
  month: string
  income: number
  expenses: number
  investments: number
  result: number // Saving (positivo) ou Queima de caixa (negativo)
}

export function CashFlowChart() {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')
  const { formatCurrency: formatCurrencyWithSettings } = useLocalizationSettings()

  // Detecta se está em dark mode
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  // Compute colors from CSS variables to support light/dark mode
  const colors = useMemo(() => {
    if (typeof window === 'undefined') return {
      income: 'hsl(142 71% 45%)',
      expenses: 'hsl(0 84% 60%)',
      investments: 'hsl(175 73% 39%)',
      result: 'hsl(217 91% 60%)' // Blue for result line
    }

    const style = getComputedStyle(document.documentElement)
    const chart8 = style.getPropertyValue('--chart-8').trim() || '142 71% 45%'
    const destructive = style.getPropertyValue('--destructive').trim() || '0 84% 60%'
    const primary = style.getPropertyValue('--primary').trim() || '175 73% 39%'
    const chart7 = style.getPropertyValue('--chart-7').trim() || '217 91% 60%'

    return {
      income: `hsl(${chart8})`,
      expenses: `hsl(${destructive})`,
      investments: `hsl(${primary})`,
      result: `hsl(${chart7})`,
    }
  }, [])

  useEffect(() => {
    loadChartData()
  }, [])

  const loadChartData = async () => {
    try {
      setLoading(true)

      // Carrega transações e contas (para identificar contas de investimento)
      const [transacoes, contas] = await Promise.all([
        transacaoService.listTransacoes(),
        contaService.listContas(),
      ])

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

        // Calcula receitas, despesas e aportes (como terceira série)
        const income = monthTransactions
          .filter(t => t.tipo === 'receita')
          .reduce((acc, t) => {
            const valor = Number(t.valor) || 0
            return acc + valor
          }, 0)

        const baseExpenses = monthTransactions
          .filter(t => t.tipo === 'despesa')
          .reduce((acc, t) => {
            const valor = Number(t.valor) || 0
            return acc + Math.abs(valor)
          }, 0)

        const investmentAccountIds = new Set(contas.filter(c => c.tipo === 'investimento').map(c => c.id))
        const investTransfersOut = monthTransactions.filter(
          (t) => t.tipo === 'transferencia' && t.conta_destino_id && investmentAccountIds.has(t.conta_destino_id)
        )
        const investments = investTransfersOut.reduce((acc, t) => {
          const valor = Number(t.valor) || 0
          return acc + Math.abs(valor)
        }, 0)
        const expenses = baseExpenses

        // Calcula resultado do mês (saving/queima de caixa)
        const result = income - expenses

        months.push({
          month: format(monthDate, 'MMM', { locale: ptBR }),
          income: Math.round(income),
          expenses: Math.round(expenses),
          investments: Math.round(investments),
          result: Math.round(result),
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
    return formatCurrencyWithSettings(value)
  }

  return (
    <Card className="p-6 shadow-md border overflow-hidden flex flex-col h-full" style={{
      background: isDark
        ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
        : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      backgroundColor: isDark ? '#3B5563' : '#FFFFFF',
      minHeight: '520px'
    }}>
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-white">Fluxo de Caixa</h3>
        <p className="text-sm text-white/80">Receitas vs Despesas vs Investimentos (Últimos 6 meses)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 min-h-[360px]">
          <Loader2 className={isDark ? "h-8 w-8 animate-spin text-white/50" : "h-8 w-8 animate-spin text-primary"} />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center flex-1 min-h-[360px]">
          <p className={isDark ? "text-sm text-white/70" : "text-sm text-muted-foreground"}>Nenhuma transação encontrada</p>
        </div>
      ) : (
        <div className="-mx-2 -mb-6 flex-1 flex items-center min-h-0">
          <ResponsiveContainer width="100%" height="100%" minHeight={350}>
            <ComposedChart data={data} barGap={8} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.income} stopOpacity={1} />
                <stop offset="100%" stopColor={colors.income} stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.expenses} stopOpacity={1} />
                <stop offset="100%" stopColor={colors.expenses} stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="investmentsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.investments} stopOpacity={1} />
                <stop offset="100%" stopColor={colors.investments} stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? 'rgba(255, 255, 255, 0.2)' : 'hsl(var(--border))'}
              vertical={true}
              horizontal={true}
            />
            <XAxis
              dataKey="month"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: isDark ? 'rgba(255, 255, 255, 0.7)' : 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              fontSize={12}
              tickFormatter={formatCurrency}
              tickLine={false}
              axisLine={false}
              tick={{ fill: isDark ? 'rgba(255, 255, 255, 0.7)' : 'hsl(var(--muted-foreground))' }}
            />
            <ReferenceLine
              y={0}
              stroke={isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.75rem',
                color: 'hsl(var(--foreground))',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: number) => formatCurrency(value)}
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '15px',
                color: isDark ? '#FFFFFF' : undefined
              }}
              iconType="circle"
              formatter={(value: string) => (
                <span style={{ color: isDark ? '#FFFFFF' : '#0B2230' }}>{value}</span>
              )}
            />
            <Bar
              dataKey="income"
              fill="url(#incomeGradient)"
              name="Receitas"
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            />
            <Bar
              dataKey="expenses"
              fill="url(#expensesGradient)"
              name="Despesas"
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            />
            <Bar
              dataKey="investments"
              fill="url(#investmentsGradient)"
              name="Investimentos"
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            />
            <Line
              type="monotone"
              dataKey="result"
              stroke={colors.result}
              strokeWidth={3}
              name="Resultado (Saving/Queima)"
              dot={{
                fill: colors.result,
                strokeWidth: 2,
                r: 5,
                stroke: isDark ? '#ffffff' : '#000000',
                strokeOpacity: 0.2
              }}
              activeDot={{
                r: 7,
                fill: colors.result,
                stroke: isDark ? '#ffffff' : '#000000',
                strokeWidth: 2
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
