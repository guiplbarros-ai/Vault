'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import type { OrcamentoComProgresso } from '@/lib/services/orcamento.service'
import { getChartColors, THEME_COLORS } from '@/lib/constants/colors'

interface BudgetDistributionChartProps {
  orcamentos: OrcamentoComProgresso[]
}

const COLORS = getChartColors()

export function BudgetDistributionChart({ orcamentos }: BudgetDistributionChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Calcular total realizado
  const totalRealizado = orcamentos.reduce((sum, orc) => sum + orc.valor_realizado, 0)

  // Preparar dados para o gráfico (apenas orçamentos com valor realizado > 0)
  const chartData = orcamentos
    .filter((orc) => orc.valor_realizado > 0)
    .map((orc) => ({
      name: orc.nome,
      value: orc.valor_realizado,
      percentual: totalRealizado > 0 ? (orc.valor_realizado / totalRealizado) * 100 : 0,
      icone: orc.categoria_icone || '💰',
    }))
    .sort((a, b) => b.value - a.value) // Ordenar por valor decrescente

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
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
          <p style={{ fontWeight: 600, color: 'hsl(var(--fg-primary))', marginBottom: '6px', fontSize: '12px' }}>
            {data.icone} {data.name}
          </p>
          <p style={{ fontSize: '11px', color: '#6CCB8C', marginBottom: '2px' }}>
            Realizado: {formatCurrency(data.value)}
          </p>
          <p style={{ fontSize: '11px', color: '#D4AF37' }}>
            {data.percentual.toFixed(1)}% do total
          </p>
        </div>
      )
    }
    return null
  }

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
        {`${percentValue.toFixed(0)}%`}
      </text>
    )
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="grid grid-cols-2 gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-xs text-foreground font-medium truncate">
              {entry.payload.icone} {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="border-border bg-gradient-to-br from-card to-background">
        <CardHeader>
          <CardTitle className="text-foreground text-lg flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Distribuição de Gastos
          </CardTitle>
          <CardDescription className="text-secondary">
            Proporção de gastos por orçamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">
              Nenhum gasto registrado ainda
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-gradient-to-br from-card to-background">
      <CardHeader>
        <CardTitle className="text-foreground text-lg flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Distribuição de Gastos
        </CardTitle>
        <CardDescription className="text-secondary">
          Proporção de gastos por orçamento no mês
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
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
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-6 text-center">
          <p className="text-sm text-secondary">Total Gasto no Mês</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRealizado)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
