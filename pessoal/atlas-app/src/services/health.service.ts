import { logger } from '../utils/logger.js'
import { getTelegramService } from './telegram.service.js'
import { loadEnv } from '../utils/env.js'

loadEnv()

const ADMIN_CHAT_ID = Number(process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_AUTHORIZED_USERS?.split(',')[0] || 0)
const FAILURE_THRESHOLD = 3

interface ProviderHealth {
  consecutiveFailures: number
  lastFailure?: Date
  lastSuccess?: Date
  totalFailures: number
  totalSuccesses: number
  alertSent: boolean // Evita spam — só alerta 1x por sequência de falhas
}

class HealthService {
  private providers = new Map<string, ProviderHealth>()

  private getOrCreate(provider: string): ProviderHealth {
    if (!this.providers.has(provider)) {
      this.providers.set(provider, {
        consecutiveFailures: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        alertSent: false,
      })
    }
    return this.providers.get(provider)!
  }

  // Registra sucesso de um provider
  recordSuccess(provider: string): void {
    const health = this.getOrCreate(provider)
    health.consecutiveFailures = 0
    health.lastSuccess = new Date()
    health.totalSuccesses++
    health.alertSent = false // Reset para poder alertar na próxima sequência
  }

  // Registra falha de um provider
  async recordFailure(provider: string, error: string): Promise<void> {
    const health = this.getOrCreate(provider)
    health.consecutiveFailures++
    health.lastFailure = new Date()
    health.totalFailures++

    logger.warn(`[Health] ${provider} falha #${health.consecutiveFailures}: ${error}`)

    // Alerta admin se atingir threshold e ainda não alertou nesta sequência
    if (health.consecutiveFailures >= FAILURE_THRESHOLD && !health.alertSent) {
      health.alertSent = true
      await this.sendFailureAlert(provider, health)
    }
  }

  private async sendFailureAlert(provider: string, health: ProviderHealth): Promise<void> {
    if (!ADMIN_CHAT_ID) {
      logger.warn('[Health] ADMIN_CHAT_ID não configurado — alerta não enviado')
      return
    }

    const telegram = getTelegramService()
    if (!telegram.enabled()) return

    const message =
      `🚨 *ALERTA: ${provider.toUpperCase()} com falhas*\n\n` +
      `${health.consecutiveFailures} falhas consecutivas\n` +
      `Última falha: ${health.lastFailure?.toLocaleString('pt-BR') || 'N/A'}\n` +
      `Último sucesso: ${health.lastSuccess?.toLocaleString('pt-BR') || 'nunca'}\n\n` +
      `_Total: ${health.totalSuccesses} ok / ${health.totalFailures} erros_`

    try {
      await telegram.sendMessage(ADMIN_CHAT_ID, message)
      logger.info(`[Health] Alerta de falha enviado para admin (${provider})`)
    } catch (err) {
      logger.error(`[Health] Erro ao enviar alerta: ${err}`)
    }
  }

  // Circuit breaker: retorna false se provider atingiu threshold de falhas
  isHealthy(provider: string): boolean {
    const health = this.providers.get(provider)
    if (!health) return true
    return health.consecutiveFailures < FAILURE_THRESHOLD
  }

  // Retorna status formatado para /health command
  getStatusMessage(): string {
    let message = '🏥 *Atlas Health Check*\n\n'

    if (this.providers.size === 0) {
      message += '_Nenhum provider registrado ainda._\n'
      message += '_Aguarde a primeira busca de preços._'
      return message
    }

    for (const [name, health] of this.providers) {
      const status = health.consecutiveFailures === 0
        ? '✅'
        : health.consecutiveFailures >= FAILURE_THRESHOLD
          ? '🔴'
          : '🟡'

      message += `${status} *${name.toUpperCase()}*\n`
      message += `  Falhas consecutivas: ${health.consecutiveFailures}\n`
      message += `  Sucesso/Falha: ${health.totalSuccesses}/${health.totalFailures}\n`

      if (health.lastSuccess) {
        message += `  Último OK: ${health.lastSuccess.toLocaleString('pt-BR')}\n`
      }
      if (health.lastFailure) {
        message += `  Última falha: ${health.lastFailure.toLocaleString('pt-BR')}\n`
      }
      message += '\n'
    }

    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const mins = Math.floor((uptime % 3600) / 60)
    message += `⏱ Uptime: ${hours}h${mins}min`

    return message
  }
}

let instance: HealthService | null = null

export function getHealthService(): HealthService {
  if (!instance) {
    instance = new HealthService()
  }
  return instance
}
