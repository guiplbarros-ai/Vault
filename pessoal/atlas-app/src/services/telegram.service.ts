import TelegramBot from 'node-telegram-bot-api'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { searchFlights, formatSearchSummary } from './flight-search.service.js'
import { getRoutesDbService } from './routes-db.service.js'
import { getAlertsDbService } from './alerts-db.service.js'
import { getPriceAlertService } from './price-alert.service.js'
import { getUsageDbService } from './usage-db.service.js'
import { getPromoMonitorService } from './promo-monitor.service.js'
import { formatRoute, isValidIata, normalizeIata } from '../utils/airports.js'
import { parseDateInput } from '../utils/date.js'
import type { AlertNotification } from '../types/index.js'

loadEnv()

const AUTHORIZED_USERS = (process.env.TELEGRAM_AUTHORIZED_USERS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
  .map(Number)

function isAuthorized(userId: number): boolean {
  if (AUTHORIZED_USERS.length === 0) return true
  return AUTHORIZED_USERS.includes(userId)
}

class TelegramService {
  private bot: TelegramBot | null = null
  private routesDb = getRoutesDbService()
  private alertsDb = getAlertsDbService()
  private priceAlertService = getPriceAlertService()

  constructor() {
    const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
    if (!token) {
      logger.warn('TELEGRAM_BOT_TOKEN nao configurado')
      return
    }

    // Modo polling para desenvolvimento
    this.bot = new TelegramBot(token, { polling: false })
    this.setupCommands()
  }

  enabled(): boolean {
    return this.bot !== null
  }

  private setupCommands(): void {
    if (!this.bot) return

    // Debug: log todas as mensagens recebidas
    this.bot.on('message', (msg) => {
      logger.info(`[TG] Mensagem recebida de ${msg.chat.id}: ${msg.text}`)
    })

    // /start
    this.bot.onText(/\/start/, (msg) => {
      if (!isAuthorized(msg.from?.id || 0)) return
      this.sendMessage(
        msg.chat.id,
        `Ola! Sou o Atlas, seu monitor de passagens aereas.\n\n` +
          `Comandos disponiveis:\n` +
          `/rota add GRU LIS - Monitorar rota\n` +
          `/rota remove GRU LIS - Parar de monitorar\n` +
          `/rotas - Listar rotas monitoradas\n` +
          `/buscar GRU LIS 15/03 - Busca manual\n` +
          `/budget - Ver uso de API (custos)\n` +
          `/promos - Status do monitor Livelo\n` +
          `/digest - Ver configuracao de digest\n` +
          `/id - Ver seu chat ID`
      )
    })

    // /id
    this.bot.onText(/\/id/, (msg) => {
      this.sendMessage(msg.chat.id, `Seu chat ID: ${msg.chat.id}`)
    })

    // /budget - Ver uso de API
    this.bot.onText(/\/budget/, async (msg) => {
      if (!isAuthorized(msg.from?.id || 0)) return

      try {
        const usageDb = getUsageDbService()
        const budgets = await usageDb.getBudgetStatus()

        let message = '📊 *Status de Uso de APIs*\n\n'

        for (const budget of budgets) {
          if (budget.limit >= 999999) continue // Skip unlimited

          const costPerCall = budget.provider === 'serpapi' ? 0.01 : 0
          const spent = (budget.used * costPerCall).toFixed(2)
          const maxCost = (budget.limit * costPerCall).toFixed(2)

          let status = '✅'
          if (budget.percentUsed >= 100) status = '⛔'
          else if (budget.percentUsed >= 80) status = '⚠️'
          else if (budget.percentUsed >= 50) status = '🟡'

          message += `${status} *${budget.provider.toUpperCase()}*\n`
          message += `   Calls: ${budget.used}/${budget.limit} (${budget.percentUsed.toFixed(0)}%)\n`
          if (costPerCall > 0) {
            message += `   Custo: $${spent}/$${maxCost}\n`
          }
          message += `   Restante: ${budget.remaining} calls\n\n`
        }

        message += `\n_Limite de SerpAPI: ${usageDb.getMonthlyLimit('serpapi')} calls/mês_`
        message += `\n_Configure ATLAS_SERPAPI_MONTHLY_LIMIT para alterar_`

        this.sendMessage(msg.chat.id, message)
      } catch (error) {
        this.sendMessage(msg.chat.id, `Erro ao buscar status: ${error}`)
      }
    })

    // /rota add ORIGIN DEST
    this.bot.onText(/\/rota add ([A-Za-z]{3}) ([A-Za-z]{3})/, async (msg, match) => {
      if (!isAuthorized(msg.from?.id || 0)) return
      if (!match) return

      const origin = normalizeIata(match[1])
      const dest = normalizeIata(match[2])

      if (!isValidIata(origin) || !isValidIata(dest)) {
        return this.sendMessage(msg.chat.id, 'Codigo IATA invalido. Use 3 letras (ex: GRU, LIS)')
      }

      try {
        const route = await this.routesDb.addRoute(msg.chat.id, origin, dest)
        const formatted = formatRoute(origin, dest)
        this.sendMessage(msg.chat.id, `Rota adicionada: ${formatted}`)
      } catch (error) {
        this.sendMessage(msg.chat.id, `Erro ao adicionar rota: ${error}`)
      }
    })

    // /rota remove ORIGIN DEST
    this.bot.onText(/\/rota remove ([A-Za-z]{3}) ([A-Za-z]{3})/, async (msg, match) => {
      if (!isAuthorized(msg.from?.id || 0)) return
      if (!match) return

      const origin = normalizeIata(match[1])
      const dest = normalizeIata(match[2])

      try {
        await this.routesDb.removeRoute(msg.chat.id, origin, dest)
        const formatted = formatRoute(origin, dest)
        this.sendMessage(msg.chat.id, `Rota removida: ${formatted}`)
      } catch (error) {
        this.sendMessage(msg.chat.id, `Erro ao remover rota: ${error}`)
      }
    })

    // /rotas
    this.bot.onText(/\/rotas/, async (msg) => {
      if (!isAuthorized(msg.from?.id || 0)) return

      try {
        const routes = await this.routesDb.getRoutesByChat(msg.chat.id)

        if (routes.length === 0) {
          return this.sendMessage(
            msg.chat.id,
            'Nenhuma rota monitorada.\n\nUse /rota add GRU LIS para adicionar.'
          )
        }

        let message = `Rotas monitoradas (${routes.length}):\n\n`
        for (const route of routes) {
          const formatted = formatRoute(route.origin, route.destination)
          message += `- ${formatted}`
          if (route.targetPrice) {
            message += ` (alvo: R$${route.targetPrice})`
          }
          message += '\n'
        }

        this.sendMessage(msg.chat.id, message)
      } catch (error) {
        this.sendMessage(msg.chat.id, `Erro ao listar rotas: ${error}`)
      }
    })

    // /buscar ORIGIN DEST DATA
    this.bot.onText(/\/buscar ([A-Za-z]{3}) ([A-Za-z]{3}) (.+)/, async (msg, match) => {
      if (!isAuthorized(msg.from?.id || 0)) return
      if (!match) return

      const origin = normalizeIata(match[1])
      const dest = normalizeIata(match[2])
      const dateInput = match[3]

      if (!isValidIata(origin) || !isValidIata(dest)) {
        return this.sendMessage(msg.chat.id, 'Codigo IATA invalido. Use 3 letras (ex: GRU, LIS)')
      }

      const date = parseDateInput(dateInput)
      if (!date) {
        return this.sendMessage(msg.chat.id, 'Data invalida. Use formato dd/mm ou dd/mm/yyyy')
      }

      this.sendMessage(msg.chat.id, `Buscando voos ${formatRoute(origin, dest)}...`)

      try {
        const result = await searchFlights({
          origin,
          destination: dest,
          departureDate: date,
        })

        const summary = formatSearchSummary(result)
        this.sendMessage(msg.chat.id, summary)
      } catch (error) {
        this.sendMessage(msg.chat.id, `Erro na busca: ${error}`)
      }
    })

    // /digest
    this.bot.onText(/\/digest/, async (msg) => {
      if (!isAuthorized(msg.from?.id || 0)) return

      try {
        const settings = await this.alertsDb.getChatSettings(msg.chat.id)

        if (!settings) {
          return this.sendMessage(
            msg.chat.id,
            `Digest nao configurado.\n\nUse /digest on para ativar.`
          )
        }

        const status = settings.digestEnabled ? 'Ativado' : 'Desativado'
        const time = settings.digestTime || '08:30'

        this.sendMessage(
          msg.chat.id,
          `Digest: ${status}\n` +
            `Horario: ${time}\n` +
            `Timezone: ${settings.timezone}\n\n` +
            `Use /digest on ou /digest off para alterar.`
        )
      } catch (error) {
        this.sendMessage(msg.chat.id, `Erro: ${error}`)
      }
    })

    // /digest on/off
    this.bot.onText(/\/digest (on|off)/, async (msg, match) => {
      if (!isAuthorized(msg.from?.id || 0)) return
      if (!match) return

      const enabled = match[1] === 'on'

      try {
        await this.alertsDb.upsertChatSettings(msg.chat.id, { digestEnabled: enabled })
        this.sendMessage(msg.chat.id, `Digest ${enabled ? 'ativado' : 'desativado'}!`)
      } catch (error) {
        this.sendMessage(msg.chat.id, `Erro: ${error}`)
      }
    })

    // /promos
    this.bot.onText(/\/promos/, async (msg) => {
      if (!isAuthorized(msg.from?.id || 0)) return

      const promo = getPromoMonitorService()
      const last = promo.getLastArticle()
      const seen = promo.getSeenCount()

      let message = `🎁 *Monitor de Promoções Livelo*\n\n`
      message += `Status: Ativo (a cada 30min)\n`
      message += `Fonte: Melhores Destinos\n`
      message += `Artigos processados: ${seen}\n\n`

      if (last) {
        message += `Última promoção encontrada:\n`
        message += `${last.title}\n`
        message += `🔗 ${last.link}`
      } else {
        message += `Nenhuma promoção Livelo recente.`
      }

      this.sendMessage(msg.chat.id, message)
    })
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    if (!this.bot) return

    try {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
    } catch (error) {
      // Tenta sem Markdown se falhar
      try {
        await this.bot.sendMessage(chatId, text)
      } catch (e) {
        logger.error(`Erro ao enviar mensagem para ${chatId}: ${e}`)
      }
    }
  }

  async sendAlert(chatId: number, notification: AlertNotification): Promise<void> {
    let message = ''

    switch (notification.type) {
      case 'price_drop':
        message = `🔥 *ALERTA DE PRECO*\n\n`
        break
      case 'lowest_ever':
        message = `⭐ *MENOR PRECO HISTORICO*\n\n`
        break
      case 'trend_down':
        message = `📉 *TENDENCIA DE QUEDA*\n\n`
        break
      case 'target_reached':
        message = `🎯 *PRECO ALVO ATINGIDO*\n\n`
        break
    }

    message += notification.message

    if (notification.deepLink) {
      message += `\n\n[Reservar agora](${notification.deepLink})`
    }

    await this.sendMessage(chatId, message)
  }

  // Processa webhook (para modo server)
  processUpdate(update: TelegramBot.Update): void {
    if (!this.bot) return
    this.bot.processUpdate(update)
  }

  // Inicia polling (para desenvolvimento)
  startPolling(): void {
    if (!this.bot) return
    this.bot.startPolling()
    logger.info('Telegram bot iniciado em modo polling')
  }

  stopPolling(): void {
    if (!this.bot) return
    this.bot.stopPolling()
  }
}

let instance: TelegramService | null = null

export function getTelegramService(): TelegramService {
  if (!instance) {
    instance = new TelegramService()
  }
  return instance
}

export function getTelegramWebhookBot(): TelegramService {
  return getTelegramService()
}
