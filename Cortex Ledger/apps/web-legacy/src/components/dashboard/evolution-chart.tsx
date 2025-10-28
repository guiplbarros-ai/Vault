'use client'

import { memo, useEffect, useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { ChartWrapper } from '@/components/charts/chart-wrapper'
import { useEvolutionData } from '@/lib/hooks/use-evolution-data'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cortexEchartsTheme, chartTheme } from '@/lib/chart-theme'
import type { EChartsOption } from 'echarts'

export const EvolutionChart = memo(function EvolutionChart() {
  const { data, isLoading, error } = useEvolutionData(3)
  const [theme, setTheme] = useState(chartTheme.light)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? chartTheme.dark : chartTheme.light)

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? chartTheme.dark : chartTheme.light)
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

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
          <p className="text-sm text-error-600">Erro ao carregar dados de evolução</p>
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
      boundaryGap: false,
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
        name: 'Receitas',
        type: 'line',
        data: data.map((d) => d.receitas),
        smooth: true,
        itemStyle: {
          color: '#12B5A2', // brand-600 para receitas
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
                color: 'rgba(18, 181, 162, 0.3)',
              },
              {
                offset: 1,
                color: 'rgba(18, 181, 162, 0.05)',
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
          color: '#E2555A', // error-600 para despesas
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
                color: 'rgba(226, 85, 90, 0.3)',
              },
              {
                offset: 1,
                color: 'rgba(226, 85, 90, 0.05)',
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
          color: '#3B4552', // graphite-500 para saldo
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
            <h3 className="text-lg font-semibold text-slate-900 dark:text-graphite-100">
              Evolução M/M
            </h3>
            <p className="text-sm text-slate-600 dark:text-graphite-300">
              Receitas e despesas (últimos 3 meses)
            </p>
          </div>
          {variacao !== 0 && (
            <div className="flex items-center gap-2">
              {variacao >= 0 ? (
                <TrendingUp className="h-5 w-5 text-success-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-error-600" />
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
})
