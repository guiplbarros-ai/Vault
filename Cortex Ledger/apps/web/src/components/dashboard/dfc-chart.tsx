'use client'

import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { ChartWrapper } from '@/components/charts/chart-wrapper'
import { useDFCData } from '@/lib/hooks/use-dfc-data'
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { EChartsOption } from 'echarts'

export function DFCChart() {
  const { data, isLoading, error } = useDFCData(6)

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </CardBody>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardBody className="p-6">
          <p className="text-sm text-error-600">Erro ao carregar dados do DFC</p>
        </CardBody>
      </Card>
    )
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const data = params[0]
        const monthData = data?.name ? data.name : ''
        let tooltip = `<strong>${monthData}</strong><br/>`

        params.forEach((param: any) => {
          const value = param.value || 0
          tooltip += `${param.marker} ${param.seriesName}: ${formatCurrency(value)}<br/>`
        })

        return tooltip
      },
    },
    legend: {
      data: ['Entradas', 'Saídas', 'Saldo'],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.mes),
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => {
          if (value >= 1000) {
            return `R$ ${(value / 1000).toFixed(1)}k`
          }
          return `R$ ${value}`
        },
      },
    },
    series: [
      {
        name: 'Entradas',
        type: 'bar',
        data: data.map((d) => d.entradas),
        itemStyle: {
          color: '#4CAF50',
        },
      },
      {
        name: 'Saídas',
        type: 'bar',
        data: data.map((d) => d.saidas),
        itemStyle: {
          color: '#E53935',
        },
      },
      {
        name: 'Saldo',
        type: 'line',
        data: data.map((d) => d.saldo),
        itemStyle: {
          color: '#339686',
        },
        lineStyle: {
          width: 3,
        },
      },
    ],
  }

  // Calculate summary from last month
  const lastMonth = data[data.length - 1]
  const variation = lastMonth ? lastMonth.saldo : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              DFC Simplificado
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Entradas - Saídas (últimos 6 meses)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {variation >= 0 ? (
              <TrendingUp className="h-5 w-5 text-success-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-error-500" />
            )}
            <span
              className={`text-sm font-medium ${
                variation >= 0 ? 'text-success-600' : 'text-error-600'
              }`}
            >
              {formatCurrency(Math.abs(variation))}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <ChartWrapper option={option} height="350px" />
      </CardBody>
    </Card>
  )
}
