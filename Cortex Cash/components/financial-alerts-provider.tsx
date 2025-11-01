'use client'

import { useBudgetAlerts } from '@/lib/hooks/use-budget-alerts'
import { useCartaoLimitAlerts } from '@/lib/hooks/use-cartao-limit-alerts'
import { format } from 'date-fns'

interface FinancialAlertsProviderProps {
  children: React.ReactNode
  enabled?: boolean
}

/**
 * Provider que integra todos os sistemas de alertas financeiros
 * - Alertas de orçamento (80% e 100%)
 * - Alertas de limite de cartão (70% e 90%)
 */
export function FinancialAlertsProvider({
  children,
  enabled = true,
}: FinancialAlertsProviderProps) {
  // Alertas de orçamento do mês atual
  useBudgetAlerts({
    enabled,
    warningThreshold: 80,
    dangerThreshold: 100,
    checkInterval: 300000, // 5 minutos
    alertCooldown: 7200000, // 2 horas
    mesReferencia: format(new Date(), 'yyyy-MM'),
  })

  // Alertas de limite de cartão
  useCartaoLimitAlerts({
    enabled,
    warningThreshold: 70,
    dangerThreshold: 90,
    checkInterval: 60000, // 1 minuto
    alertCooldown: 3600000, // 1 hora
  })

  return <>{children}</>
}
