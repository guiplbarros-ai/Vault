'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import type { OrcamentoComProgresso } from '@/lib/services/orcamento.service'

interface BudgetDistributionChartProps {
  orcamentos: OrcamentoComProgresso[]
}

const COLORS = [
  '#18B0A4', // Primary
  '#10B981', // green-400
  '#3B82F6', // blue-500
  '#F59E0B', // amber-400
  '#8B5CF6', // violet-500
  '#EF4444', // red-400
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
]

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
          className="rounded-lg p-3 shadow-lg border"
          style={{
            backgroundColor: '#1f2937',
            borderColor: '#374151',
          }}
        >
          <p className="font-semibold text-white mb-1">
            {data.icone} {data.name}
          </p>
          <p className="text-sm text-green-400">
            Realizado: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-amber-400">
            {data.percentual.toFixed(1)}% do total
          </p>
        </div>
      )
    }
    return null
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
            <span className="text-xs text-white/70 truncate">
              {entry.payload.icone} {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card
        style={{
          background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
          backgroundColor: '#3B5563',
        }}
      >
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Distribuição de Gastos
          </CardTitle>
          <CardDescription className="text-white/70">
            Proporção de gastos por orçamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <p className="text-white/50 text-sm">
              Nenhum gasto registrado ainda
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      style={{
        background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
        backgroundColor: '#3B5563',
      }}
    >
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Distribuição de Gastos
        </CardTitle>
        <CardDescription className="text-white/70">
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
              labelLine={false}
              label={(entry: any) => `${entry.percentual.toFixed(0)}%`}
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
          <p className="text-sm text-white/70">Total Gasto no Mês</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalRealizado)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
