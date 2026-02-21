'use client'

import { useSetting } from '@/app/providers/settings-provider'
import { useLocalizationSettings } from '@/app/providers/settings-provider'
import { Card } from '@/components/ui/card'
import { getChartColors } from '@/lib/constants/colors'
import { CHART_COLORS, CHART_THEME } from '@/lib/utils/chart-theme'
import { transacaoService } from '@/lib/services/transacao.service'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface ProjectionData {
  mes: string
  realizado: number
  projetado: number
}

interface BudgetProjectionChartProps {
  mesReferencia: string
}

export function BudgetProjectionChart({ mesReferencia }: BudgetProjectionChartProps) {
  const [data, setData] = useState<ProjectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [tema] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')
  const { formatCurrency } = useLocalizationSettings()

  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (tema === 'dark') return true
    if (tema === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [tema])

  const COLORS = useMemo(() => getChartColors(), [isDark, tema])

  useEffect(() => {
    loadProjectionData()
  }, [mesReferencia])

  const loadProjectionData = async () => {
    try {
      setLoading(true)

      // Pega transações dos últimos 4 meses (incluindo o atual)
      const now = new Date()
      const [ano, mes] = mesReferencia.split('-').map(Number) as [number, number]
      const mesAtual = new Date(ano, mes - 1)

      const meses = [3, 2, 1, 0].map((offset) => subMonths(mesAtual, offset))

      // Calcula gasto realizado de cada mês
      const transacoes = await transacaoService.listTransacoes()

      const gastosPorMes: Record<string, number> = {}

      meses.forEach((monthDate) => {
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthDate)
        const monthKey = format(monthDate, 'yyyy-MM')
        const monthLabel = format(monthDate, 'MMM', { locale: ptBR })

        const mesGasto = transacoes
          .filter((t) => {
            const transDate = t.data instanceof Date ? t.data : new Date(t.data)
            return t.tipo === 'despesa' && transDate >= monthStart && transDate <= monthEnd
          })
          .reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0)

        gastosPorMes[monthLabel] = mesGasto
      })

      // Calcula média dos 3 meses anteriores para projetar o mês atual
      const valores = Object.values(gastosPorMes)
      const media = valores.slice(0, -1).reduce((a, b) => a + b, 0) / 3

      // Monta dados para o gráfico
      const entries = Object.entries(gastosPorMes)
      const chartData = entries.map(([mes, realizado], index) => {
        const isCurrentMonth = index === entries.length - 1
        return {
          mes,
          realizado: isCurrentMonth ? realizado : realizado,
          projetado: isCurrentMonth ? media : null,
        } as unknown as ProjectionData
      })

      setData(chartData)
    } catch (error) {
      console.error('Erro ao carregar projeção de orçamento:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 h-[350px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Projeção de Orçamento</h3>
        <p className="text-sm text-muted-foreground">Média dos últimos 3 meses vs realizado</p>
      </div>

      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">Sem dados para projeção</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray={CHART_THEME.grid.strokeDasharray} stroke={CHART_THEME.grid.stroke} />
              <XAxis
                dataKey="mes"
                tick={CHART_THEME.axis.tick}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={CHART_THEME.axis.tick}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value) => (value ? formatCurrency(value as number) : '-')}
                contentStyle={CHART_THEME.tooltip.contentStyle}
                labelStyle={CHART_THEME.tooltip.labelStyle}
              />
              <Legend wrapperStyle={CHART_THEME.legend.wrapperStyle} />
              <Line
                type="monotone"
                dataKey="realizado"
                stroke={CHART_COLORS.expense}
                strokeWidth={2}
                name="Realizado"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="projetado"
                stroke={CHART_COLORS.investment}
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Projetado"
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-4 p-3 bg-muted rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              A projeção é calculada com base na <strong>média dos últimos 3 meses</strong>. Ajuste
              seus hábitos se a tendência for crescente.
            </p>
          </div>
        </>
      )}
    </Card>
  )
}

export default BudgetProjectionChart
