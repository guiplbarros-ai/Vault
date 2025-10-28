'use client'

import { useEffect, useState } from 'react'
import { useBudgetAlerts } from '@/lib/hooks/use-budget-alerts'
import { formatCurrency } from '@/lib/utils'
import { AlertCircle, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function BudgetAlerts() {
  const { data: alerts } = useBudgetAlerts()
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [showAlerts, setShowAlerts] = useState(false)

  useEffect(() => {
    if (alerts && alerts.length > 0) {
      setShowAlerts(true)
    }
  }, [alerts])

  const handleDismiss = (id: string) => {
    setDismissedAlerts((prev) => new Set([...prev, id]))
  }

  const activeAlerts = alerts?.filter((alert) => !dismissedAlerts.has(alert.id)) || []

  if (activeAlerts.length === 0 || !showAlerts) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 space-y-2">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-lg border p-4 shadow-lg ${
            alert.tipo_alerta === 'excedido'
              ? 'border-error-300 bg-error-50 dark:border-error-700 dark:bg-error-900/20'
              : alert.tipo_alerta === '100'
              ? 'border-error-300 bg-error-50 dark:border-error-700 dark:bg-error-900/20'
              : 'border-warning-300 bg-warning-50 dark:border-warning-700 dark:bg-warning-900/20'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle
                className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                  alert.tipo_alerta === 'excedido' || alert.tipo_alerta === '100'
                    ? 'text-error-600 dark:text-error-400'
                    : 'text-warning-600 dark:text-warning-400'
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4
                    className={`font-semibold ${
                      alert.tipo_alerta === 'excedido' || alert.tipo_alerta === '100'
                        ? 'text-error-900 dark:text-error-100'
                        : 'text-warning-900 dark:text-warning-100'
                    }`}
                  >
                    {alert.tipo_alerta === 'excedido'
                      ? 'Orçamento Excedido!'
                      : alert.tipo_alerta === '100'
                      ? 'Orçamento Atingido!'
                      : 'Atenção: 80% do Orçamento'}
                  </h4>
                  <Badge
                    variant={
                      alert.tipo_alerta === 'excedido' || alert.tipo_alerta === '100'
                        ? 'error'
                        : 'warning'
                    }
                    className="text-xs"
                  >
                    {alert.percentual.toFixed(1)}%
                  </Badge>
                </div>
                <p
                  className={`mt-1 text-sm ${
                    alert.tipo_alerta === 'excedido' || alert.tipo_alerta === '100'
                      ? 'text-error-700 dark:text-error-300'
                      : 'text-warning-700 dark:text-warning-300'
                  }`}
                >
                  <strong>{alert.categoria_nome}</strong> ({alert.categoria_grupo})
                </p>
                <div className="mt-2 flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-neutral-600 dark:text-neutral-400">Realizado:</span>
                    <strong className="ml-1 text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(alert.valor_realizado)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-600 dark:text-neutral-400">Planejado:</span>
                    <strong className="ml-1 text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(alert.valor_planejado)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDismiss(alert.id)}
              className="ml-2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
