'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { patrimonioService } from '@/lib/services/patrimonio.service'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { useSettings } from '@/app/providers/settings-provider'
import { getChartColors } from '@/lib/constants/colors'
import type { PatrimonioPorTipo } from '@/lib/types'

const TIPO_LABELS: Record<string, string> = {
  renda_fixa: 'Renda Fixa',
  renda_variavel: 'Renda Variável',
  fundo_investimento: 'Fundos',
  previdencia: 'Previdência',
  criptomoeda: 'Criptomoedas',
  outro: 'Outros',
}

export function PatrimonioByTypeChart() {
  const [data, setData] = useState<PatrimonioPorTipo[]>([])
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
    async function loadData() {
      try {
        setLoading(true)
        const result = await patrimonioService.getPatrimonioPorTipo()
        setData(result)
      } catch (error) {
        console.error('Erro ao carregar patrimônio por tipo:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: TIPO_LABELS[item.tipo] || item.tipo,
      value: item.valor_atual,
      percentual: item.rentabilidade_percentual,
    }))
  }, [data])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CHART_COLORS = useMemo(() => getChartColors(), [])

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
  }: any) => {
    const RADIAN = Math.PI / 180
    const percentValue = percent * 100

    // Oculta labels muito pequenas
    if (percentValue < 3) return null

    // Tamanho de fonte progressivo
    let fontSize = 10
    if (percentValue >= 20) fontSize = 13
    else if (percentValue >= 10) fontSize = 12
    else if (percentValue >= 5) fontSize = 11

    // Distância otimizada
    let radiusOffset = 25
    if (percentValue < 5) radiusOffset = 30
    else if (percentValue < 10) radiusOffset = 28
    else if (percentValue >= 20) radiusOffset = 22

    const radius = outerRadius + radiusOffset
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    const textAnchor = x > cx ? 'start' : 'end'

    return (
      <text
        x={x}
        y={y}
        fill="#FFFFFF"
        textAnchor={textAnchor}
        dominantBaseline="central"
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          pointerEvents: 'none',
          textShadow: '0px 1px 3px rgba(0, 0, 0, 0.8), 0px 0px 8px rgba(0, 0, 0, 0.6)',
        }}
      >
        {`${name}: ${percentValue.toFixed(1)}%`}
      </text>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: 'rgba(18, 50, 44, 0.99)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '2px solid hsl(var(--border))',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
          }}
        >
          <p style={{ marginBottom: '8px', fontWeight: 600, color: 'hsl(var(--fg-primary))', fontSize: '12px' }}>
            {payload[0].name}
          </p>
          <p style={{ fontSize: '11px', color: payload[0].payload.fill, marginBottom: '2px' }}>
            Valor: {formatCurrency(payload[0].value)}
          </p>
          <p style={{ fontSize: '11px', color: '#6CCB8C' }}>
            Rentabilidade: {payload[0].payload.percentual >= 0 ? '+' : ''}
            {payload[0].payload.percentual.toFixed(2)}%
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">
            Patrimônio por Tipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">
            Patrimônio por Tipo
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Distribuição dos seus investimentos por categoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground">
              Nenhum investimento cadastrado
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">
            Patrimônio por Tipo
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Distribuição dos seus investimentos por categoria
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={{
                stroke: "#FFFFFF",
                strokeWidth: 2,
                strokeOpacity: 0.8,
              }}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
