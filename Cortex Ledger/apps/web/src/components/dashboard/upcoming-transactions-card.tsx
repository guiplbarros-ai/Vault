'use client'

import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { useUpcomingTransactions } from '@/lib/hooks/use-upcoming-transactions'
import { Loader2, Calendar, Repeat, CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

export function UpcomingTransactionsCard() {
  const { data: upcoming, isLoading, error } = useUpcomingTransactions(30)

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
          <p className="text-sm text-error-600">Erro ao carregar próximos lançamentos</p>
        </CardBody>
      </Card>
    )
  }

  if (!upcoming || upcoming.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Próximos Lançamentos
            </h3>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Recorrências e parcelas nos próximos 30 dias
          </p>
        </CardHeader>
        <CardBody className="p-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Nenhum lançamento previsto para os próximos 30 dias.
          </p>
        </CardBody>
      </Card>
    )
  }

  const getDaysUntil = (date: string) => {
    return differenceInDays(new Date(date), new Date())
  }

  const getUrgencyColor = (days: number) => {
    if (days <= 3) return 'error'
    if (days <= 7) return 'warning'
    return 'neutral'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-500" />
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Próximos Lançamentos
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {upcoming.length} {upcoming.length === 1 ? 'lançamento previsto' : 'lançamentos previstos'}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
          {upcoming.map((item) => {
            const daysUntil = getDaysUntil(item.proximo_vencimento)
            const urgency = getUrgencyColor(daysUntil)

            return (
              <div
                key={item.id}
                className="flex items-center justify-between border-b border-neutral-200 pb-3 last:border-0 dark:border-neutral-700"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                      item.tipo === 'RECORRENTE'
                        ? 'bg-primary-100 dark:bg-primary-900'
                        : 'bg-warning-100 dark:bg-warning-900'
                    }`}
                  >
                    {item.tipo === 'RECORRENTE' ? (
                      <Repeat className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    ) : (
                      <CreditCard className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-50">
                      {item.descricao}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {item.categoria && (
                        <Badge variant="neutral" className="text-xs">
                          {item.categoria.nome}
                        </Badge>
                      )}
                      <span>{format(new Date(item.proximo_vencimento), "d 'de' MMMM", { locale: ptBR })}</span>
                      {item.periodicidade && (
                        <span className="text-neutral-400">• {item.periodicidade}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                    {formatCurrency(item.valor_estimado)}
                  </div>
                  <Badge variant={urgency} className="text-xs">
                    {daysUntil === 0 && 'Hoje'}
                    {daysUntil === 1 && 'Amanhã'}
                    {daysUntil > 1 && `Em ${daysUntil} dias`}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}
