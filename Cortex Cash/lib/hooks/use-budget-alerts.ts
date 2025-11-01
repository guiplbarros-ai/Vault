'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { orcamentoService } from '@/lib/services/orcamento.service'
import { format } from 'date-fns'

interface BudgetAlert {
  orcamentoId: string
  orcamentoNome: string
  percentual: number
  valorPlanejado: number
  valorRealizado: number
  valorRestante: number
  categoriaNome?: string
  categoriaIcone?: string
}

interface UseBudgetAlertsOptions {
  /** Habilitar alertas (padrão: true) */
  enabled?: boolean
  /** Threshold para alerta amarelo (padrão: 80) */
  warningThreshold?: number
  /** Threshold para alerta vermelho (padrão: 100) */
  dangerThreshold?: number
  /** Intervalo de verificação em ms (padrão: 300000 = 5 minutos) */
  checkInterval?: number
  /** Evitar alertas duplicados dentro de X ms (padrão: 7200000 = 2 horas) */
  alertCooldown?: number
  /** Mês de referência a monitorar (padrão: mês atual em formato YYYY-MM) */
  mesReferencia?: string
}

/**
 * Hook para monitorar orçamentos e exibir alertas automáticos
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useBudgetAlerts({
 *     warningThreshold: 80,
 *     dangerThreshold: 100,
 *     mesReferencia: '2025-11', // Opcional
 *   })
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useBudgetAlerts(options: UseBudgetAlertsOptions = {}) {
  const {
    enabled = true,
    warningThreshold = 80,
    dangerThreshold = 100,
    checkInterval = 300000, // 5 minutos
    alertCooldown = 7200000, // 2 horas
    mesReferencia = format(new Date(), 'yyyy-MM'),
  } = options

  // Armazenar últimos alertas para evitar duplicações
  const lastAlertsRef = useRef<Map<string, { timestamp: number; level: 'warning' | 'danger' }>>(
    new Map()
  )

  useEffect(() => {
    if (!enabled) return

    const checkBudgets = async () => {
      try {
        // Buscar orçamentos do mês com progresso
        const orcamentos = await orcamentoService.listOrcamentosComProgresso({
          mesReferencia,
        })

        if (orcamentos.length === 0) return

        const alerts: BudgetAlert[] = []

        // Verificar cada orçamento
        for (const orc of orcamentos) {
          // Verificar se atingiu algum threshold
          if (orc.percentual_usado >= dangerThreshold) {
            alerts.push({
              orcamentoId: orc.id,
              orcamentoNome: orc.nome,
              percentual: orc.percentual_usado,
              valorPlanejado: orc.valor_planejado,
              valorRealizado: orc.valor_realizado,
              valorRestante: orc.valor_restante,
              categoriaNome: orc.categoria_nome,
              categoriaIcone: orc.categoria_icone,
            })
          } else if (orc.percentual_usado >= warningThreshold) {
            alerts.push({
              orcamentoId: orc.id,
              orcamentoNome: orc.nome,
              percentual: orc.percentual_usado,
              valorPlanejado: orc.valor_planejado,
              valorRealizado: orc.valor_realizado,
              valorRestante: orc.valor_restante,
              categoriaNome: orc.categoria_nome,
              categoriaIcone: orc.categoria_icone,
            })
          }
        }

        // Exibir alertas
        const now = Date.now()

        for (const alert of alerts) {
          const isDanger = alert.percentual >= dangerThreshold
          const level = isDanger ? 'danger' : 'warning'
          const lastAlert = lastAlertsRef.current.get(alert.orcamentoId)

          // Verificar cooldown
          const shouldAlert =
            !lastAlert ||
            lastAlert.level !== level ||
            now - lastAlert.timestamp > alertCooldown

          if (shouldAlert) {
            // Formatar valores
            const formatCurrency = (value: number) =>
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(value)

            const percentualFormatado = alert.percentual.toFixed(1)
            const icone = alert.categoriaIcone || '💰'
            const nome = alert.categoriaNome || alert.orcamentoNome

            if (isDanger) {
              toast.error(`🚨 Orçamento Excedido: ${icone} ${nome}`, {
                description: `${percentualFormatado}% gasto (${formatCurrency(alert.valorRealizado)} de ${formatCurrency(alert.valorPlanejado)}). ${
                  alert.valorRestante < 0
                    ? `Excedeu em ${formatCurrency(Math.abs(alert.valorRestante))}`
                    : `Restante: ${formatCurrency(alert.valorRestante)}`
                }`,
                duration: 10000, // 10 segundos
              })
            } else {
              toast.warning(`⚠️ Alerta de Orçamento: ${icone} ${nome}`, {
                description: `${percentualFormatado}% gasto (${formatCurrency(alert.valorRealizado)} de ${formatCurrency(alert.valorPlanejado)}). Restante: ${formatCurrency(alert.valorRestante)}`,
                duration: 7000, // 7 segundos
              })
            }

            // Atualizar timestamp do último alerta
            lastAlertsRef.current.set(alert.orcamentoId, { timestamp: now, level })
          }
        }
      } catch (error) {
        console.error('Erro ao verificar orçamentos:', error)
      }
    }

    // Verificar imediatamente
    checkBudgets()

    // Configurar intervalo de verificação
    const intervalId = setInterval(checkBudgets, checkInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [enabled, warningThreshold, dangerThreshold, checkInterval, alertCooldown, mesReferencia])
}
