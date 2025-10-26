'use client'

import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { ChartWrapper } from '@/components/charts/chart-wrapper'
import { useEvolutionData } from '@/lib/hooks/use-evolution-data'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { EChartsOption } from 'echarts'

export function EvolutionChart() {
  const { data, isLoading, error } = useEvolutionData(6)

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
          <p className="text-sm text-error-600">Erro ao carregar dados de evolução</p>
        </CardBody>
      </Card>
    )
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: (params: any) => {
        const monthData = params[0]?.name || ''
        let tooltip = `<strong>${monthData}</strong><br/>`

        params.forEach((param: any) => {
          const value = param.value || 0
          tooltip += `${param.marker} ${param.seriesName}: ${formatCurrency(value)}<br/>`
        })

        return tooltip
      },
    },
    legend: {
      data: ['Receitas', 'Despesas', 'Saldo'],
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
      boundaryGap: false,
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
        name: 'Receitas',
        type: 'line',
        data: data.map((d) => d.receitas),
        smooth: true,
        itemStyle: {
          color: '#4CAF50',
        },
        lineStyle: {
          width: 3,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(76, 175, 80, 0.3)',
              },
              {
                offset: 1,
                color: 'rgba(76, 175, 80, 0.05)',
              },
            ],
          },
        },
      },
      {
        name: 'Despesas',
        type: 'line',
        data: data.map((d) => d.despesas),
        smooth: true,
        itemStyle: {
          color: '#E53935',
        },
        lineStyle: {
          width: 3,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(229, 57, 53, 0.3)',
              },
              {
                offset: 1,
                color: 'rgba(229, 57, 53, 0.05)',
              },
            ],
          },
        },
      },
      {
        name: 'Saldo',
        type: 'line',
        data: data.map((d) => d.saldo),
        smooth: true,
        itemStyle: {
          color: '#339686',
        },
        lineStyle: {
          width: 4,
          type: 'dashed',
        },
      },
    ],
  }

  // Calculate summary from last two months
  const lastMonth = data[data.length - 1]
  const previousMonth = data[data.length - 2]
  const variacao = lastMonth ? lastMonth.variacao : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Evolução M/M
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Receitas e despesas (últimos 6 meses)
            </p>
          </div>
          {variacao !== 0 && (
            <div className="flex items-center gap-2">
              {variacao >= 0 ? (
                <TrendingUp className="h-5 w-5 text-success-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-error-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  variacao >= 0 ? 'text-success-600' : 'text-error-600'
                }`}
              >
                {variacao >= 0 ? '+' : ''}
                {variacao.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardBody>
        <ChartWrapper option={option} height="350px" />
      </CardBody>
    </Card>
  )
}
