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
import { THEME_COLORS } from '@/lib/constants/colors'

interface ChartData {
  month: string
  income: number
  expenses: number
  investments: number
  result: number // Saving (positivo) ou Queima de caixa (negativo)
}

// ✅ Named export
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

  // ✅ Compute colors from new color scheme
  const colors = useMemo(() => ({
    income: '#6CCB8C',      // Verde (Receitas)
    expenses: '#F07167',    // Vermelho (Despesas)
    investments: '#4A90E2', // Azul (Investimentos)
    result: '#E0B257',      // Amarelo (Resultado)
  }), [])

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: 'rgba(18, 50, 44, 0.99)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `2px solid ${THEME_COLORS.border}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
          }}
        >
          <p style={{ color: THEME_COLORS.fgPrimary, fontWeight: 600, marginBottom: '10px', fontSize: '13px' }}>
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ fontSize: '12px', color: entry.color, marginBottom: '4px', fontWeight: 500 }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card
      className="glass-card-3d p-6 overflow-hidden flex flex-col h-full"
      style={{
        minHeight: '520px',
      }}
    >
      <div className="mb-6 flex-shrink-0">
        <h3 className="text-lg font-bold text-foreground">Fluxo de Caixa</h3>
        <p className="text-sm text-secondary">Receitas vs Despesas vs Investimentos (Últimos 6 meses)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 min-h-[360px]">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center flex-1 min-h-[360px]">
          <p className="text-sm text-secondary">Nenhuma transação encontrada</p>
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
              stroke="#1A3530"
              vertical={true}
              horizontal={true}
            />
            <XAxis
              dataKey="month"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: THEME_COLORS.fgSecondary }}
            />
            <YAxis
              fontSize={12}
              tickFormatter={formatCurrency}
              tickLine={false}
              axisLine={false}
              tick={{ fill: THEME_COLORS.fgSecondary }}
            />
            <ReferenceLine
              y={0}
              stroke={THEME_COLORS.border}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: THEME_COLORS.hover, opacity: 0.3 }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '15px',
                color: THEME_COLORS.fgPrimary
              }}
              iconType="circle"
              formatter={(value: string) => (
                <span style={{ color: THEME_COLORS.fgPrimary }}>{value}</span>
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
                stroke: THEME_COLORS.foreground,
                strokeOpacity: 0.2
              }}
              activeDot={{
                r: 7,
                fill: colors.result,
                stroke: THEME_COLORS.foreground,
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

// ✅ Default export para dynamic import
export default CashFlowChart
