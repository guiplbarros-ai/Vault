'use client'

import { ChartWrapper } from '@/components/charts/chart-wrapper'
import type { CategoryBreakdown } from '@/lib/hooks/use-report-data'

interface CategoryBreakdownChartProps {
  data: CategoryBreakdown[]
  isLoading?: boolean
}

export function CategoryBreakdownChart({
  data,
  isLoading,
}: CategoryBreakdownChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="h-6 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-4 h-64 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-lg font-semibold">Despesas por Categoria</h3>
        <p className="mt-4 text-center text-neutral-500">
          Nenhuma despesa encontrada no período selecionado
        </p>
      </div>
    )
  }

  const chartData = data.map((item) => ({
    name: item.categoria,
    value: item.total,
    grupo: item.grupo,
    percentual: item.percentual.toFixed(1),
  }))

  const chartConfig = data.reduce(
    (acc, item, index) => {
      const colors = [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
      ]
      acc[item.categoria] = {
        label: item.categoria,
        color: colors[index % colors.length],
      }
      return acc
    },
    {} as Record<string, { label: string; color: string }>
  )

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-4 text-lg font-semibold">Despesas por Categoria</h3>

      <ChartWrapper
        type="pie"
        data={chartData}
        config={chartConfig}
        height={300}
      />

      <div className="mt-6 space-y-2">
        {data.slice(0, 5).map((item, index) => (
          <div
            key={item.categoria}
            className="flex items-center justify-between rounded-lg border border-neutral-100 p-3 dark:border-neutral-800"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: chartConfig[item.categoria]?.color,
                }}
              />
              <div>
                <p className="font-medium">{item.categoria}</p>
                <p className="text-sm text-neutral-500">{item.grupo}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(item.total)}
              </p>
              <p className="text-sm text-neutral-500">{item.percentual.toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
