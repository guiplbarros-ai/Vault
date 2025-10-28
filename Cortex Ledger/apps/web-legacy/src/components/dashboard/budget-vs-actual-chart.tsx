'use client'

import { memo } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { ChartWrapper } from '@/components/charts/chart-wrapper'
import { useBudgetData } from '@/lib/hooks/use-budget-data'
import { Loader2, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cortexEchartsTheme } from '@/lib/chart-theme'
import type { EChartsOption } from 'echarts'

export const BudgetVsActualChart = memo(function BudgetVsActualChart() {
  const { data, isLoading, error } = useBudgetData()

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
          <p className="text-sm text-error-600">Erro ao carregar dados do orçamento</p>
        </CardBody>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-graphite-100">
            Orçado vs. Realizado
          </h3>
        </CardHeader>
        <CardBody className="p-6">
          <p className="text-sm text-slate-600 dark:text-graphite-300">
            Nenhum orçamento configurado para este mês. Configure orçamentos para ver esta
            visualização.
          </p>
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
        const categoria = data?.name || ''
        let tooltip = `<strong>${categoria}</strong><br/>`

        params.forEach((param: any) => {
          const value = param.value || 0
          tooltip += `${param.marker} ${param.seriesName}: ${formatCurrency(value)}<br/>`
        })

        // Adicionar percentual
        const orcado = params.find((p: any) => p.seriesName === 'Orçado')?.value || 0
        const realizado = params.find((p: any) => p.seriesName === 'Realizado')?.value || 0
        const percentual = orcado > 0 ? ((realizado / orcado) * 100).toFixed(1) : '0'

        tooltip += `<br/><strong>Percentual: ${percentual}%</strong>`

        return tooltip
      },
    },
    legend: {
      data: ['Orçado', 'Realizado'],
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
      data: data.map((d) => d.categoria),
      axisLine: cortexEchartsTheme.axisLine,
      axisLabel: {
        color: cortexEchartsTheme.axisLabel.color,
        interval: 0,
        rotate: data.length > 5 ? 45 : 0,
      },
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
        name: 'Orçado',
        type: 'bar',
        data: data.map((d) => d.orcado),
        itemStyle: {
          color: '#B8891A', // insight-600 para orçado (mostarda)
        },
      },
      {
        name: 'Realizado',
        type: 'bar',
        data: data.map((d) => d.realizado),
        itemStyle: {
          color: (params: any) => {
            const item = data[params.dataIndex]
            // error-600 para >100%, warning-600 para >80%, success-600 para <80%
            return item.percentual > 100 ? '#E2555A' : item.percentual > 80 ? '#C26719' : '#16A34A'
          },
        },
      },
    ],
  }

  // Calcular alertas
  const overBudget = data.filter((d) => d.percentual > 100).length
  const nearLimit = data.filter((d) => d.percentual > 80 && d.percentual <= 100).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-graphite-100">
              Orçado vs. Realizado
            </h3>
            <p className="text-sm text-slate-600 dark:text-graphite-300">
              Comparativo por categoria no mês atual
            </p>
          </div>
          {(overBudget > 0 || nearLimit > 0) && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning-600" />
              <div className="text-sm">
                {overBudget > 0 && (
                  <span className="font-medium text-error-600">{overBudget} acima</span>
                )}
                {overBudget > 0 && nearLimit > 0 && <span className="text-slate-600 dark:text-graphite-300"> · </span>}
                {nearLimit > 0 && (
                  <span className="font-medium text-warning-600">{nearLimit} próximo</span>
                )}
              </div>
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
