'use client'

/**
 * Gráfico de Evolução Mensal de Categoria
 * Mostra os últimos 12 meses de gastos de uma categoria ou subcategoria
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { THEME_COLORS } from '@/lib/constants/colors'
import { transacaoService } from '@/lib/services/transacao.service'
import { CHART_COLORS, CHART_THEME } from '@/lib/utils/chart-theme'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
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

interface CategoryTrendChartProps {
  categoriaId: string
  categoriaNome: string
  categoriaIcone?: string
}

interface MonthlyData {
  mes: string
  mesLabel: string
  total: number
}

export function CategoryTrendChart({
  categoriaId,
  categoriaNome,
  categoriaIcone,
}: CategoryTrendChartProps) {
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [stats, setStats] = useState({
    media: 0,
    maiorGasto: 0,
    menorGasto: 0,
    tendencia: 0, // Percentual de variação últimos 3 meses vs anteriores
  })

  useEffect(() => {
    loadMonthlyData()
  }, [categoriaId])

  const loadMonthlyData = async () => {
    try {
      setLoading(true)

      // Buscar últimos 12 meses
      const hoje = new Date()
      const mesesData: MonthlyData[] = []

      for (let i = 11; i >= 0; i--) {
        const mes = subMonths(hoje, i)
        const inicio = startOfMonth(mes)
        const fim = endOfMonth(mes)

        // Buscar transações do mês para a categoria
        const transacoes = await transacaoService.listTransacoes({
          dataInicio: inicio,
          dataFim: fim,
          categoriaId: categoriaId,
          tipo: 'despesa', // Analisando apenas despesas
        })

        const total = transacoes.reduce((sum, t) => sum + Math.abs(t.valor), 0)

        mesesData.push({
          mes: format(mes, 'yyyy-MM'),
          mesLabel: format(mes, 'MMM/yy', { locale: ptBR }),
          total,
        })
      }

      setMonthlyData(mesesData)

      // Calcular estatísticas
      const valores = mesesData.map((m) => m.total)
      const soma = valores.reduce((a, b) => a + b, 0)
      const media = soma / valores.length
      const maiorGasto = Math.max(...valores)
      const menorGasto = Math.min(...valores)

      // Tendência: comparar últimos 3 meses com 3 anteriores
      const ultimos3 = valores.slice(-3).reduce((a, b) => a + b, 0) / 3
      const anteriores3 = valores.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
      const tendencia = anteriores3 > 0 ? ((ultimos3 - anteriores3) / anteriores3) * 100 : 0

      setStats({
        media,
        maiorGasto,
        menorGasto,
        tendencia,
      })
    } catch (error) {
      console.error('Erro ao carregar evolução mensal:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (loading) {
    return (
      <Card
        style={{
          backgroundColor: THEME_COLORS.bgCard,
          borderColor: THEME_COLORS.border,
        }}
      >
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  const tendenciaIcon =
    stats.tendencia > 5 ? (
      <TrendingUp className="w-5 h-5 text-red-500" />
    ) : stats.tendencia < -5 ? (
      <TrendingDown className="w-5 h-5 text-green-500" />
    ) : (
      <Minus className="w-5 h-5 text-gray-400" />
    )

  const tendenciaColor =
    stats.tendencia > 5 ? 'text-red-500' : stats.tendencia < -5 ? 'text-green-500' : 'text-gray-400'

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <Card
        style={{
          backgroundColor: THEME_COLORS.bgCard,
          borderColor: THEME_COLORS.border,
        }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {categoriaIcone && <span className="text-3xl">{categoriaIcone}</span>}
              <div>
                <CardTitle className="text-white">{categoriaNome}</CardTitle>
                <CardDescription style={{ color: THEME_COLORS.fgSecondary }}>
                  Evolução dos últimos 12 meses
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {tendenciaIcon}
              <div className="text-right">
                <p className={`text-lg font-semibold ${tendenciaColor}`}>
                  {stats.tendencia > 0 && '+'}
                  {stats.tendencia.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">últimos 3 meses</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Gráfico de Evolução */}
      <Card
        style={{
          backgroundColor: THEME_COLORS.bgCard,
          borderColor: THEME_COLORS.border,
        }}
      >
        <CardHeader>
          <CardTitle className="text-white text-lg">Evolução Mensal</CardTitle>
          <CardDescription style={{ color: THEME_COLORS.fgSecondary }}>
            Total gasto por mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray={CHART_THEME.grid.strokeDasharray} stroke={CHART_THEME.grid.stroke} />
              <XAxis
                dataKey="mesLabel"
                tick={{ fill: CHART_THEME.axis.tick.fill, fontSize: CHART_THEME.axis.tick.fontSize }}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fill: CHART_THEME.axis.tick.fill, fontSize: CHART_THEME.axis.tick.fontSize }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                labelFormatter={(label) => `Mês: ${label}`}
                contentStyle={CHART_THEME.tooltip.contentStyle}
                labelStyle={CHART_THEME.tooltip.labelStyle}
              />
              <Legend wrapperStyle={CHART_THEME.legend.wrapperStyle} />
              <Line
                type="monotone"
                dataKey="total"
                name="Gasto Total"
                stroke={CHART_COLORS.primary}
                strokeWidth={3}
                dot={{ fill: CHART_COLORS.primary, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Estatísticas Resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          style={{
            backgroundColor: 'rgb(15, 23, 42)',
            borderColor: 'rgb(30, 41, 59)',
          }}
        >
          <CardHeader className="pb-3">
            <CardDescription style={{ color: THEME_COLORS.fgSecondary }}>Média Mensal</CardDescription>
            <CardTitle className="text-2xl text-white">{formatCurrency(stats.media)}</CardTitle>
          </CardHeader>
        </Card>

        <Card
          style={{
            backgroundColor: 'rgb(15, 23, 42)',
            borderColor: 'rgb(30, 41, 59)',
          }}
        >
          <CardHeader className="pb-3">
            <CardDescription style={{ color: THEME_COLORS.fgSecondary }}>Maior Gasto</CardDescription>
            <CardTitle className="text-2xl text-red-400">
              {formatCurrency(stats.maiorGasto)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card
          style={{
            backgroundColor: 'rgb(15, 23, 42)',
            borderColor: 'rgb(30, 41, 59)',
          }}
        >
          <CardHeader className="pb-3">
            <CardDescription style={{ color: THEME_COLORS.fgSecondary }}>Menor Gasto</CardDescription>
            <CardTitle className="text-2xl text-green-400">
              {formatCurrency(stats.menorGasto)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
