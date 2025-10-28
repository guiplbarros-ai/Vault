'use client'

import { memo } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { ChartWrapper } from '@/components/charts/chart-wrapper'
import { useDFCData } from '@/lib/hooks/use-dfc-data'
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cortexEchartsTheme } from '@/lib/chart-theme'
import type { EChartsOption } from 'echarts'

export const DFCChart = memo(function DFCChart() {
  const { data, isLoading, error } = useDFCData(3)

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
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
    color: cortexEchartsTheme.color,
    textStyle: cortexEchartsTheme.textStyle,
    tooltip: {
      backgroundColor: cortexEchartsTheme.tooltip.backgroundColor,
      borderColor: cortexEchartsTheme.tooltip.borderColor,
      textStyle: cortexEchartsTheme.tooltip.textStyle,
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
      textStyle: cortexEchartsTheme.textStyle,
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
      axisLine: cortexEchartsTheme.axisLine,
      axisLabel: cortexEchartsTheme.axisLabel,
      splitLine: cortexEchartsTheme.splitLine,
    },
    yAxis: {
      type: 'value',
      axisLine: cortexEchartsTheme.axisLine,
      axisLabel: {
        color: cortexEchartsTheme.axisLabel.color,
        formatter: (value: number) => {
          if (value >= 1000) {
            return `R$ ${(value / 1000).toFixed(1)}k`
          }
          return `R$ ${value}`
        },
      },
      splitLine: cortexEchartsTheme.splitLine,
    },
    series: [
      {
        name: 'Entradas',
        type: 'bar',
        data: data.map((d) => d.entradas),
        itemStyle: {
          color: '#12B5A2', // brand-600 para receitas/entradas
        },
      },
      {
        name: 'Saídas',
        type: 'bar',
        data: data.map((d) => d.saidas),
        itemStyle: {
          color: '#E2555A', // error-600 para despesas/saídas
        },
      },
      {
        name: 'Saldo',
        type: 'line',
        data: data.map((d) => d.saldo),
        itemStyle: {
          color: '#12B5A2', // brand-600 para saldo
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
            <h3 className="text-lg font-semibold text-slate-900 dark:text-graphite-100">
              DFC Simplificado
            </h3>
            <p className="text-sm text-slate-600 dark:text-graphite-300">
              Entradas - Saídas (últimos 3 meses)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {variation >= 0 ? (
              <TrendingUp className="h-5 w-5 text-success-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-error-600" />
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
})
