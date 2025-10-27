'use client'

import { memo, useEffect, useState } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { ChartWrapper } from '@/components/charts/chart-wrapper'
import { useEvolutionData } from '@/lib/hooks/use-evolution-data'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { chartTheme } from '@/lib/chart-theme'
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
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </CardBody>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardBody className="p-6">
          <p className="text-sm text-danger">Erro ao carregar dados de evolução</p>
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
          color: chartTheme.semantic.income,
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
                color: `${chartTheme.semantic.income}4D`,
              },
              {
                offset: 1,
                color: `${chartTheme.semantic.income}0D`,
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
          color: chartTheme.semantic.expense,
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
                color: `${chartTheme.semantic.expense}4D`,
              },
              {
                offset: 1,
                color: `${chartTheme.semantic.expense}0D`,
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
          color: theme.series.primary,
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
            <h3 className="text-lg font-semibold text-text">
              Evolução M/M
            </h3>
            <p className="text-sm text-muted">
              Receitas e despesas (últimos 3 meses)
            </p>
          </div>
          {variacao !== 0 && (
            <div className="flex items-center gap-2">
              {variacao >= 0 ? (
                <TrendingUp className="h-5 w-5 status-success" />
              ) : (
                <TrendingDown className="h-5 w-5 status-danger" />
              )}
              <span
                className={`text-sm font-medium ${
                  variacao >= 0 ? 'status-success' : 'status-danger'
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
