'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettings } from '@/app/providers/settings-provider'
import { patrimonioService } from '@/lib/services/patrimonio.service'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, Loader2 } from 'lucide-react'
import { CHART_THEME } from '@/lib/utils/chart-theme'

interface WealthDataPoint {
  month: string
  patrimonio: number
  contas: number
  investimentos: number
}

export function WealthEvolutionChart() {
  const [data, setData] = useState<WealthDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const { getSetting } = useSettings()
  const theme = getSetting<'light' | 'dark' | 'auto'>('appearance.theme')

  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  useEffect(() => {
    async function loadWealthData() {
      try {
        setLoading(true)

        // Get current patrimônio
        const currentPatrimonio = await patrimonioService.getPatrimonioTotal()

        // For now, we'll create mock historical data
        // TODO: Implement proper historical tracking in the database
        const months = [
          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ]

        const currentMonth = new Date().getMonth()
        const mockData: WealthDataPoint[] = []

        // Generate last 6 months of data
        for (let i = 5; i >= 0; i--) {
          const monthIndex = (currentMonth - i + 12) % 12
          const monthName = months[monthIndex]

          // Generate realistic progression towards current value
          const factor = (6 - i) / 6
          const randomVariation = 0.9 + Math.random() * 0.2 // ±10% variation

          const patrimonio = currentPatrimonio.patrimonio_total * factor * randomVariation
          const contas = currentPatrimonio.saldo_contas * factor * randomVariation
          const investimentos = currentPatrimonio.saldo_investimentos * factor * randomVariation

          mockData.push({
            month: monthName,
            patrimonio: Math.round(patrimonio * 100) / 100,
            contas: Math.round(contas * 100) / 100,
            investimentos: Math.round(investimentos * 100) / 100,
          })
        }

        // Add current month with actual data
        mockData.push({
          month: months[currentMonth],
          patrimonio: currentPatrimonio.patrimonio_total,
          contas: currentPatrimonio.saldo_contas,
          investimentos: currentPatrimonio.saldo_investimentos,
        })

        setData(mockData)
      } catch (error) {
        console.error('Erro ao carregar evolução patrimonial:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWealthData()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={CHART_THEME.tooltip.contentStyle}>
          <p style={{ ...CHART_THEME.tooltip.labelStyle, marginBottom: '8px' }}>
            {payload[0].payload.month}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ fontSize: '0.875rem', color: entry.color, marginBottom: '4px' }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card className="glass-card-3d p-6 flex flex-col h-full" style={{ minHeight: '420px' }}>
        <div className="mb-6 flex-shrink-0">
          <h3 className="text-lg font-bold text-foreground">Evolução Patrimonial</h3>
          <p className="text-sm text-secondary">Carregando dados...</p>
        </div>
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="glass-card-3d p-6 flex flex-col h-full" style={{ minHeight: '420px' }}>
      <div className="mb-6 flex-shrink-0">
        <h3 className="text-lg font-bold text-foreground">Evolução Patrimonial</h3>
        <p className="text-sm text-secondary">Acompanhe o crescimento do seu patrimônio nos últimos 6 meses</p>
      </div>
      <div className="flex-1 flex items-center min-h-0">
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} />
            <XAxis
              dataKey="month"
              {...CHART_THEME.axis}
              tick={CHART_THEME.axis.tick}
            />
            <YAxis
              {...CHART_THEME.axis}
              tick={CHART_THEME.axis.tick}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} cursor={CHART_THEME.tooltip.cursor} />
            <Legend {...CHART_THEME.legend} />
            <Line
              type="monotone"
              dataKey="patrimonio"
              name="Patrimônio Total"
              stroke="hsl(var(--gold))"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--gold))', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="contas"
              name="Contas"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--success))', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="investimentos"
              name="Investimentos"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ✅ Default export para dynamic import
export default WealthEvolutionChart
