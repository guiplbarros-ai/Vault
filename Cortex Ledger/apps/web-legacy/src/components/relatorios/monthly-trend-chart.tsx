'use client'

import { ChartWrapper } from '@/components/charts/chart-wrapper'
import type { MonthlyTrend } from '@/lib/hooks/use-report-data'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { EChartsOption } from 'echarts'

interface MonthlyTrendChartProps {
  data: MonthlyTrend[]
  isLoading?: boolean
}

export function MonthlyTrendChart({ data, isLoading }: MonthlyTrendChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-100 dark:bg-graphite-700" />
        <div className="mt-4 h-80 animate-pulse rounded bg-slate-100 dark:bg-graphite-700" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-graphite-100">Evolução Mensal</h3>
        <p className="mt-4 text-center text-slate-600 dark:text-graphite-300">
          Nenhum dado encontrado no período selecionado
        </p>
      </div>
    )
  }

  const months = data.map((item) => {
    const date = parse(item.mes, 'yyyy-MM', new Date())
    return format(date, 'MMM/yy', { locale: ptBR })
  })

  const receitasData = data.map((item) => item.receitas)
  const despesasData = data.map((item) => item.despesas)
  const saldoData = data.map((item) => item.saldo)

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      data: ['Receitas', 'Despesas', 'Saldo'],
    },
    xAxis: {
      type: 'category',
      data: months,
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: 'Receitas',
        type: 'bar',
        data: receitasData,
        itemStyle: {
          color: 'hsl(var(--chart-1))',
        },
      },
      {
        name: 'Despesas',
        type: 'bar',
        data: despesasData,
        itemStyle: {
          color: 'hsl(var(--chart-2))',
        },
      },
      {
        name: 'Saldo',
        type: 'line',
        data: saldoData,
        itemStyle: {
          color: 'hsl(var(--chart-3))',
        },
      },
    ],
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-graphite-100">Evolução Mensal</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[hsl(var(--chart-1))]" />
            <span className="text-slate-900 dark:text-graphite-100">Receitas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[hsl(var(--chart-2))]" />
            <span className="text-slate-900 dark:text-graphite-100">Despesas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[hsl(var(--chart-3))]" />
            <span className="text-slate-900 dark:text-graphite-100">Saldo</span>
          </div>
        </div>
      </div>

      <ChartWrapper option={option} height="350px" />
    </div>
  )
}
