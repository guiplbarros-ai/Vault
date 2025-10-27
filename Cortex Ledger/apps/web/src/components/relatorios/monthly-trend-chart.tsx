'use client'

import { ChartWrapper } from '@/components/charts/chart-wrapper'
import type { MonthlyTrend } from '@/lib/hooks/use-report-data'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MonthlyTrendChartProps {
  data: MonthlyTrend[]
  isLoading?: boolean
}

export function MonthlyTrendChart({ data, isLoading }: MonthlyTrendChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-line/25 bg-surface p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-elev" />
        <div className="mt-4 h-80 animate-pulse rounded bg-elev" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-line/25 bg-surface p-6">
        <h3 className="text-lg font-semibold text-text">Evolução Mensal</h3>
        <p className="mt-4 text-center text-muted">
          Nenhum dado encontrado no período selecionado
        </p>
      </div>
    )
  }

  const chartData = data.map((item) => {
    const date = parse(item.mes, 'yyyy-MM', new Date())
    return {
      month: format(date, 'MMM/yy', { locale: ptBR }),
      receitas: item.receitas,
      despesas: item.despesas,
      saldo: item.saldo,
    }
  })

  const chartConfig = {
    receitas: {
      label: 'Receitas',
      color: 'hsl(var(--chart-1))',
    },
    despesas: {
      label: 'Despesas',
      color: 'hsl(var(--chart-2))',
    },
    saldo: {
      label: 'Saldo',
      color: 'hsl(var(--chart-3))',
    },
  }

  return (
    <div className="rounded-2xl border border-line/25 bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">Evolução Mensal</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[hsl(var(--chart-1))]" />
            <span className="text-text">Receitas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[hsl(var(--chart-2))]" />
            <span className="text-text">Despesas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[hsl(var(--chart-3))]" />
            <span className="text-text">Saldo</span>
          </div>
        </div>
      </div>

      <ChartWrapper
        type="bar"
        data={chartData}
        config={chartConfig}
        xAxisKey="month"
        height={350}
      />
    </div>
  )
}
