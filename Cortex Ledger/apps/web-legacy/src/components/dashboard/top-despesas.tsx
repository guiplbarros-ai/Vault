'use client'

import { TrendingDown, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useTopDespesas } from '@/lib/hooks/use-top-despesas'

export function TopDespesas() {
  const { data: despesas, isLoading, error } = useTopDespesas(undefined, 5)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-error-500" />
            Top 5 Despesas
          </CardTitle>
          <CardDescription>Maiores gastos do mês</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-error-500" />
            Top 5 Despesas
          </CardTitle>
          <CardDescription>Maiores gastos do mês</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-error-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            Erro ao carregar despesas
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!despesas || despesas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-error-500" />
            Top 5 Despesas
          </CardTitle>
          <CardDescription>Maiores gastos do mês</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-neutral-500">
            <p className="text-sm">Nenhuma despesa registrada neste mês</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-error-500" />
          Top 5 Despesas
        </CardTitle>
        <CardDescription>Maiores gastos do mês</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {despesas.map((despesa, index) => (
            <div
              key={despesa.id}
              className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
            >
              {/* Left: Rank + Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Rank Badge */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0
                      ? 'bg-error-500 text-white'
                      : index === 1
                      ? 'bg-warning-500 text-white'
                      : index === 2
                      ? 'bg-insight-500 text-white'
                      : 'bg-neutral-300 text-neutral-700'
                  }`}
                >
                  {index + 1}
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-900 truncate">
                    {despesa.descricao}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-neutral-500">
                      {formatDate(despesa.data)}
                    </span>
                    {despesa.conta && (
                      <span className="text-xs text-neutral-400">•</span>
                    )}
                    {despesa.conta && (
                      <span className="text-xs text-neutral-500">
                        {despesa.conta.apelido}
                      </span>
                    )}
                  </div>
                  {despesa.categoria && (
                    <div className="mt-1.5">
                      <Badge variant="primary" className="text-xs">
                        {despesa.categoria.nome}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Valor */}
              <div className="flex-shrink-0 ml-4">
                <div className="text-lg font-bold text-error-600 text-right">
                  {formatCurrency(Math.abs(despesa.valor))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total das Top 5 */}
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">
              Total Top 5
            </span>
            <span className="text-lg font-bold text-error-600">
              {formatCurrency(
                Math.abs(despesas.reduce((sum, d) => sum + d.valor, 0))
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
