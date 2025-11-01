'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { cartaoService } from '@/lib/services/cartao.service'
import type { CartaoConfig } from '@/lib/types'

interface LimitAlert {
  cartaoId: string
  cartaoNome: string
  percentual: number
  limiteTotal: number
  limiteUsado: number
  limiteDisponivel: number
}

interface UseCartaoLimitAlertsOptions {
  /** Habilitar alertas (padrão: true) */
  enabled?: boolean
  /** Threshold para alerta amarelo (padrão: 70) */
  warningThreshold?: number
  /** Threshold para alerta vermelho (padrão: 90) */
  dangerThreshold?: number
  /** Intervalo de verificação em ms (padrão: 60000 = 1 minuto) */
  checkInterval?: number
  /** Evitar alertas duplicados dentro de X ms (padrão: 3600000 = 1 hora) */
  alertCooldown?: number
}

/**
 * Hook para monitorar limites de cartões e exibir alertas automáticos
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useCartaoLimitAlerts({
 *     warningThreshold: 70,
 *     dangerThreshold: 90,
 *   })
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useCartaoLimitAlerts(options: UseCartaoLimitAlertsOptions = {}) {
  const {
    enabled = true,
    warningThreshold = 70,
    dangerThreshold = 90,
    checkInterval = 60000, // 1 minuto
    alertCooldown = 3600000, // 1 hora
  } = options

  // Armazenar últimos alertas para evitar duplicações
  const lastAlertsRef = useRef<Map<string, { timestamp: number; level: 'warning' | 'danger' }>>(
    new Map()
  )

  useEffect(() => {
    if (!enabled) return

    const checkLimits = async () => {
      try {
        // Buscar todos os cartões ativos
        const cartoes = await cartaoService.listCartoes({
          incluirInativos: false,
        })

        if (cartoes.length === 0) return

        const alerts: LimitAlert[] = []

        // Verificar limite de cada cartão
        for (const cartao of cartoes) {
          try {
            const limite = await cartaoService.getLimiteDisponivel(cartao.id)

            // Verificar se atingiu algum threshold
            if (limite.percentual_usado >= dangerThreshold) {
              alerts.push({
                cartaoId: cartao.id,
                cartaoNome: cartao.nome,
                percentual: limite.percentual_usado,
                limiteTotal: limite.limite_total,
                limiteUsado: limite.limite_usado,
                limiteDisponivel: limite.limite_disponivel,
              })
            } else if (limite.percentual_usado >= warningThreshold) {
              alerts.push({
                cartaoId: cartao.id,
                cartaoNome: cartao.nome,
                percentual: limite.percentual_usado,
                limiteTotal: limite.limite_total,
                limiteUsado: limite.limite_usado,
                limiteDisponivel: limite.limite_disponivel,
              })
            }
          } catch (error) {
            console.error(`Erro ao verificar limite do cartão ${cartao.id}:`, error)
          }
        }

        // Exibir alertas
        const now = Date.now()

        for (const alert of alerts) {
          const isDanger = alert.percentual >= dangerThreshold
          const level = isDanger ? 'danger' : 'warning'
          const lastAlert = lastAlertsRef.current.get(alert.cartaoId)

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

            if (isDanger) {
              toast.error(`⚠️ Limite Crítico: ${alert.cartaoNome}`, {
                description: `${percentualFormatado}% do limite usado (${formatCurrency(alert.limiteUsado)} de ${formatCurrency(alert.limiteTotal)}). Disponível: ${formatCurrency(alert.limiteDisponivel)}`,
                duration: 10000, // 10 segundos
              })
            } else {
              toast.warning(`⚡ Alerta de Limite: ${alert.cartaoNome}`, {
                description: `${percentualFormatado}% do limite usado (${formatCurrency(alert.limiteUsado)} de ${formatCurrency(alert.limiteTotal)}). Disponível: ${formatCurrency(alert.limiteDisponivel)}`,
                duration: 7000, // 7 segundos
              })
            }

            // Atualizar timestamp do último alerta
            lastAlertsRef.current.set(alert.cartaoId, { timestamp: now, level })
          }
        }
      } catch (error) {
        console.error('Erro ao verificar limites de cartões:', error)
      }
    }

    // Verificar imediatamente
    checkLimits()

    // Configurar intervalo de verificação
    const intervalId = setInterval(checkLimits, checkInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [enabled, warningThreshold, dangerThreshold, checkInterval, alertCooldown])
}
