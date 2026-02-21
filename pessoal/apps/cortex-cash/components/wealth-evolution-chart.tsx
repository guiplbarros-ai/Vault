'use client'

import { useSetting } from '@/app/providers/settings-provider'
import { Card } from '@/components/ui/card'
import { THEME_COLORS } from '@/lib/constants/colors'
import { CHART_COLORS } from '@/lib/utils/chart-theme'
import { patrimonioService } from '@/lib/services/patrimonio.service'
import { Loader2 } from 'lucide-react'
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

interface WealthDataPoint {
  month: string
  patrimonio: number
  contas: number
  investimentos: number
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function WealthEvolutionChart() {
  const [data, setData] = useState<WealthDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')

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

        // Ensure current month has a snapshot + generate retroactive if needed
        await patrimonioService.generateRetroactiveSnapshots()
        await patrimonioService.saveCurrentSnapshot()

        const snapshots = await patrimonioService.getSnapshots()

        if (snapshots.length === 0) {
          // Fallback: show single current point
          const current = await patrimonioService.getPatrimonioTotal()
          const currentMonth = new Date().getMonth()
          setData([{
            month: MONTH_LABELS[currentMonth]!,
            patrimonio: current.patrimonio_total,
            contas: current.saldo_contas,
            investimentos: current.saldo_investimentos,
          }])
          return
        }

        // Convert snapshots to chart data
        const chartData: WealthDataPoint[] = snapshots.map((s) => {
          const parts = s.mes.split('-')
          const monthIndex = (Number(parts[1]) || 1) - 1
          const year = parts[0] || ''
          const shortYear = year.slice(2)
          return {
            month: `${MONTH_LABELS[monthIndex]}/${shortYear}`,
            patrimonio: s.patrimonio_total,
            contas: s.saldo_contas,
            investimentos: s.saldo_investimentos,
          }
        })

        setData(chartData)
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
          <p
            style={{
              color: THEME_COLORS.fgPrimary,
              fontWeight: 600,
              marginBottom: '10px',
              fontSize: '0.875rem',
            }}
          >
            {payload[0].payload.month}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              style={{ fontSize: '0.875rem', color: entry.color, marginBottom: '4px' }}
            >
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

  const subtitle = data.length > 1
    ? `${data.length} meses de histórico`
    : 'Posição atual — histórico disponível após 2+ meses de uso'

  return (
    <Card className="glass-card-3d p-6 flex flex-col h-full" style={{ minHeight: '420px' }}>
      <div className="mb-6 flex-shrink-0">
        <h3 className="text-lg font-bold text-foreground">Evolução Patrimonial</h3>
        <p className="text-sm text-secondary">{subtitle}</p>
      </div>
      <div className="flex-1 flex items-center">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={THEME_COLORS.border}
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
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: THEME_COLORS.hover, opacity: 0.3 }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '15px',
                color: THEME_COLORS.fgPrimary,
              }}
              iconType="line"
              formatter={(value: string) => (
                <span style={{ color: THEME_COLORS.fgPrimary }}>{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="patrimonio"
              name="Patrimônio Total"
              stroke={CHART_COLORS.gold}
              strokeWidth={3}
              dot={{ fill: CHART_COLORS.gold, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="contas"
              name="Contas"
              stroke={CHART_COLORS.income}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.income, r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="investimentos"
              name="Investimentos"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.primary, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// Default export for dynamic import
export default WealthEvolutionChart
