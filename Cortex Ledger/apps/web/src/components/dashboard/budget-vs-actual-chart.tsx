'use client'

import { memo } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { ChartWrapper } from '@/components/charts/chart-wrapper'
import { useBudgetData } from '@/lib/hooks/use-budget-data'
import { Loader2, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { EChartsOption } from 'echarts'

export const BudgetVsActualChart = memo(function BudgetVsActualChart() {
  const { data, isLoading, error } = useBudgetData()

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
          <p className="text-sm text-danger">Erro ao carregar dados do orçamento</p>
        </CardBody>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text">
            Orçado vs. Realizado
          </h3>
        </CardHeader>
        <CardBody className="p-6">
          <p className="text-sm text-muted">
            Nenhum orçamento configurado para este mês. Configure orçamentos para ver esta
            visualização.
          </p>
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
      axisLabel: {
        interval: 0,
        rotate: data.length > 5 ? 45 : 0,
      },
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
        name: 'Orçado',
        type: 'bar',
        data: data.map((d) => d.orcado),
        itemStyle: {
          color: '#339686',
        },
      },
      {
        name: 'Realizado',
        type: 'bar',
        data: data.map((d) => d.realizado),
        itemStyle: {
          color: (params: any) => {
            const item = data[params.dataIndex]
            return item.percentual > 100 ? '#E53935' : item.percentual > 80 ? '#FF7733' : '#4CAF50'
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
            <h3 className="text-lg font-semibold text-text">
              Orçado vs. Realizado
            </h3>
            <p className="text-sm text-muted">
              Comparativo por categoria no mês atual
            </p>
          </div>
          {(overBudget > 0 || nearLimit > 0) && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <div className="text-sm">
                {overBudget > 0 && (
                  <span className="font-medium text-danger">{overBudget} acima</span>
                )}
                {overBudget > 0 && nearLimit > 0 && <span className="text-muted"> · </span>}
                {nearLimit > 0 && (
                  <span className="font-medium text-warning">{nearLimit} próximo</span>
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
