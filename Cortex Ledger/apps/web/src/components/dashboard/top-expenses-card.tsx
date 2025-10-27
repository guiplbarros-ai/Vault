'use client'

import { memo } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { useTopExpenses } from '@/lib/hooks/use-top-expenses'
import { Loader2, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

export const TopExpensesCard = memo(function TopExpensesCard() {
  const { data: expenses, isLoading, error } = useTopExpenses(5)

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardBody className="p-6">
          <p className="text-sm text-danger">Erro ao carregar despesas</p>
        </CardBody>
      </Card>
    )
  }

  if (!expenses || expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text">
            Top 5 Despesas
          </h3>
          <p className="text-sm text-muted">
            Maiores gastos do mês atual
          </p>
        </CardHeader>
        <CardBody className="p-6">
          <p className="text-sm text-muted">
            Nenhuma despesa encontrada neste mês.
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">
              Top 5 Despesas
            </h3>
            <p className="text-sm text-muted">
              Maiores gastos do mês atual
            </p>
          </div>
          <TrendingDown className="h-5 w-5 text-danger" />
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {expenses.map((expense, index) => (
            <div
              key={expense.id}
              className="flex items-center justify-between border-b border-line/20 pb-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-danger text-sm font-semibold text-brand-contrast">
                  #{index + 1}
                </div>
                <div>
                  <div className="font-medium text-text">
                    {expense.descricao}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {expense.categoria && (
                      <Badge variant="neutral" className="text-xs">
                        {expense.categoria.nome}
                      </Badge>
                    )}
                    <span>
                      {format(new Date(expense.data), "d 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-danger">
                  {formatCurrency(Math.abs(expense.valor))}
                </div>
                {expense.conta && (
                  <div className="text-xs text-muted">
                    {expense.conta.apelido}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
})
