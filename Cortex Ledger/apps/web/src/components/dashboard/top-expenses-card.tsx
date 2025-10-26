'use client'

import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { useTopExpenses } from '@/lib/hooks/use-top-expenses'
import { Loader2, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

export function TopExpensesCard() {
  const { data: expenses, isLoading, error } = useTopExpenses(5)

  if (isLoading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardBody className="p-6">
          <p className="text-sm text-error-600">Erro ao carregar despesas</p>
        </CardBody>
      </Card>
    )
  }

  if (!expenses || expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Top 5 Despesas
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Maiores gastos do mês atual
          </p>
        </CardHeader>
        <CardBody className="p-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
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
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Top 5 Despesas
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Maiores gastos do mês atual
            </p>
          </div>
          <TrendingDown className="h-5 w-5 text-error-500" />
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {expenses.map((expense, index) => (
            <div
              key={expense.id}
              className="flex items-center justify-between border-b border-neutral-200 pb-3 last:border-0 dark:border-neutral-700"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-error-100 text-sm font-semibold text-error-700 dark:bg-error-900 dark:text-error-300">
                  #{index + 1}
                </div>
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-50">
                    {expense.descricao}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
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
                <div className="text-lg font-semibold text-error-600 dark:text-error-400">
                  {formatCurrency(Math.abs(expense.valor))}
                </div>
                {expense.conta && (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
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
}
