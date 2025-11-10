'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { OrcamentoComProgresso } from '@/lib/services/orcamento.service'
import { THEME_COLORS } from '@/lib/constants/colors'

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
    if (percentual >= 100) return THEME_COLORS.destructive
    if (percentual >= 80) return THEME_COLORS.warning
    return THEME_COLORS.success
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
          className="rounded-lg p-3 shadow-lg border bg-card border-border"
        >
          <p className="font-semibold text-foreground mb-1">
            {data.icone} {data.nome}
          </p>
          <p className="text-sm text-success">
            Realizado: {formatCurrency(data.realizado)}
          </p>
          <p className="text-sm text-secondary">
            Planejado: {formatCurrency(data.planejado)}
          </p>
          <p className="text-sm text-gold mt-1">
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
    <Card className="border-border bg-gradient-to-br from-card to-background">
      <CardHeader>
        <CardTitle className="text-foreground text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gold" />
          Progresso dos Orçamentos
        </CardTitle>
        <CardDescription className="text-secondary">
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
            <CartesianGrid strokeDasharray="3 3" stroke={THEME_COLORS.border} />
            <XAxis
              type="number"
              stroke={THEME_COLORS.secondary}
              tick={{ fill: THEME_COLORS.secondary, fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <YAxis
              type="category"
              dataKey="nome"
              stroke={THEME_COLORS.secondary}
              tick={{ fill: THEME_COLORS.foreground, fontSize: 12 }}
              width={150}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: THEME_COLORS.muted, opacity: 0.5 }} />
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
            <div className="h-3 w-3 rounded bg-success"></div>
            <span className="text-secondary">Dentro do limite</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-warning"></div>
            <span className="text-secondary">Atenção (80%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-destructive"></div>
            <span className="text-secondary">Excedido (100%+)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
