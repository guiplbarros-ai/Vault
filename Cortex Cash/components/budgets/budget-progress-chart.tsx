'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { OrcamentoComProgresso } from '@/lib/services/orcamento.service'

interface BudgetProgressChartProps {
  orcamentos: OrcamentoComProgresso[]
}

export function BudgetProgressChart({ orcamentos }: BudgetProgressChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getStatusColor = (percentual: number) => {
    if (percentual >= 100) return '#EF4444' // red-400
    if (percentual >= 80) return '#F59E0B' // amber-400
    return '#10B981' // green-400
  }

  // Preparar dados para o gráfico
  const chartData = orcamentos
    .slice(0, 8) // Limitar a 8 orçamentos para não poluir
    .map((orc) => ({
      nome: orc.nome.length > 20 ? orc.nome.substring(0, 18) + '...' : orc.nome,
      realizado: orc.valor_realizado,
      planejado: orc.valor_planejado,
      percentual: orc.percentual_usado,
      icone: orc.categoria_icone || '💰',
    }))

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
            {data.icone} {data.nome}
          </p>
          <p className="text-sm text-green-400">
            Realizado: {formatCurrency(data.realizado)}
          </p>
          <p className="text-sm text-white/70">
            Planejado: {formatCurrency(data.planejado)}
          </p>
          <p className="text-sm text-amber-400 mt-1">
            {data.percentual.toFixed(1)}% usado
          </p>
        </div>
      )
    }
    return null
  }

  if (orcamentos.length === 0) {
    return null
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
          <TrendingUp className="h-5 w-5" />
          Progresso dos Orçamentos
        </CardTitle>
        <CardDescription className="text-white/70">
          Comparação entre valores realizados e planejados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis
              type="number"
              stroke="rgba(255, 255, 255, 0.5)"
              tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <YAxis
              type="category"
              dataKey="nome"
              stroke="rgba(255, 255, 255, 0.5)"
              tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
              width={150}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Bar dataKey="planejado" fill="rgba(255, 255, 255, 0.2)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="realizado" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getStatusColor(entry.percentual)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: '#10B981' }}></div>
            <span className="text-white/70">Dentro do limite</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
            <span className="text-white/70">Atenção (80%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: '#EF4444' }}></div>
            <span className="text-white/70">Excedido (100%+)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
