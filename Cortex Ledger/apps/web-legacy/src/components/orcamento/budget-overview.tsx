'use client'

import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { useBudgetData } from '@/lib/hooks/use-budget-data'
import { formatCurrency } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface BudgetOverviewProps {
  mesRef?: Date
}

export function BudgetOverview({ mesRef }: BudgetOverviewProps) {
  const { data, isLoading, error } = useBudgetData(mesRef)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardBody className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </CardBody>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  // Calcular totais
  const totalOrcado = data.reduce((sum, item) => sum + item.orcado, 0)
  const totalRealizado = data.reduce((sum, item) => sum + item.realizado, 0)
  const totalDisponivel = totalOrcado - totalRealizado
  const percentualGeral = totalOrcado > 0 ? (totalRealizado / totalOrcado) * 100 : 0

  // Contar alertas
  const categoriasExcedidas = data.filter((d) => d.percentual > 100).length
  const categoriasProximoLimite = data.filter((d) => d.percentual > 80 && d.percentual <= 100).length

  const stats = [
    {
      label: 'Total Orçado',
      value: totalOrcado,
      icon: DollarSign,
      color: 'text-slate-900 dark:text-graphite-100',
      bgColor: 'bg-slate-100 dark:bg-graphite-700',
    },
    {
      label: 'Total Realizado',
      value: totalRealizado,
      icon: TrendingUp,
      color:
        percentualGeral > 100
          ? 'text-error-600'
          : percentualGeral > 80
          ? 'text-warning'
          : 'text-success',
      bgColor:
        percentualGeral > 100
          ? 'bg-slate-100 dark:bg-graphite-700'
          : percentualGeral > 80
          ? 'bg-slate-100 dark:bg-graphite-700'
          : 'bg-slate-100 dark:bg-graphite-700',
      badge: `${percentualGeral.toFixed(1)}%`,
    },
    {
      label: 'Disponível',
      value: totalDisponivel,
      icon: TrendingDown,
      color:
        totalDisponivel < 0
          ? 'text-error-600'
          : 'text-success',
      bgColor:
        totalDisponivel < 0
          ? 'bg-slate-100 dark:bg-graphite-700'
          : 'bg-slate-100 dark:bg-graphite-700',
    },
    {
      label: 'Categorias com Alerta',
      value: categoriasExcedidas + categoriasProximoLimite,
      icon: AlertCircle,
      color:
        categoriasExcedidas > 0
          ? 'text-error-600'
          : categoriasProximoLimite > 0
          ? 'text-warning'
          : 'text-slate-600 dark:text-graphite-300',
      bgColor:
        categoriasExcedidas > 0
          ? 'bg-slate-100 dark:bg-graphite-700'
          : categoriasProximoLimite > 0
          ? 'bg-slate-100 dark:bg-graphite-700'
          : 'bg-slate-100 dark:bg-graphite-700',
      subtitle:
        categoriasExcedidas > 0
          ? `${categoriasExcedidas} excedida${categoriasExcedidas > 1 ? 's' : ''}`
          : categoriasProximoLimite > 0
          ? `${categoriasProximoLimite} próxima${categoriasProximoLimite > 1 ? 's' : ''} do limite`
          : 'Tudo OK',
      isCount: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardBody className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-600 dark:text-graphite-300">
                    {stat.label}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-slate-900 dark:text-graphite-100">
                      {stat.isCount ? stat.value : formatCurrency(stat.value)}
                    </p>
                    {stat.badge && (
                      <Badge
                        variant={
                          percentualGeral > 100
                            ? 'error'
                            : percentualGeral > 80
                            ? 'warning'
                            : 'success'
                        }
                        className="text-xs"
                      >
                        {stat.badge}
                      </Badge>
                    )}
                  </div>
                  {stat.subtitle && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-graphite-300">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
                <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
