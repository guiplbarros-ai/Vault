import cron from 'node-cron'
import { getRoutesDbService } from './routes-db.service.js'
import { getAlertsDbService } from './alerts-db.service.js'
import { getPriceAlertService } from './price-alert.service.js'
import { getTelegramService } from './telegram.service.js'
import { getPricesDbService } from './prices-db.service.js'
import { searchFlights } from './flight-search.service.js'
import { logger } from '../utils/logger.js'
import { loadEnv } from '../utils/env.js'
import { formatRoute, formatRouteFull } from '../utils/airports.js'
import { formatDate } from '../utils/date.js'
import { getBenchmark, ratePriceVsBenchmark } from '../utils/price-benchmark.js'
import { addDays, format } from 'date-fns'

loadEnv()

const TIMEZONE = process.env.ATLAS_TIMEZONE || 'America/Sao_Paulo'
// Default: 2x por dia (8h e 20h) - ajuste conforme budget
const SEARCH_CRONS = (process.env.ATLAS_SEARCH_CRONS || '0 8 * * *,0 20 * * *').split(',')
// Digest semanal: sexta-feira às 20:30
const DIGEST_CRON = process.env.ATLAS_DIGEST_CRON || '30 20 * * 5'

class DailyDigestService {
  private routesDb = getRoutesDbService()
  private alertsDb = getAlertsDbService()
  private pricesDb = getPricesDbService()
  private priceAlertService = getPriceAlertService()
  private telegram = getTelegramService()
  private scheduledTasks: cron.ScheduledTask[] = []

  // Inicia os crons de monitoramento
  startCrons(): void {
    // Cron de busca de precos (2x ao dia por padrao)
    for (const cronExpr of SEARCH_CRONS) {
      const task = cron.schedule(
        cronExpr.trim(),
        () => {
          logger.info(`[Cron] Iniciando busca de precos`)
          this.runPriceSearch().catch((e) =>
            logger.error(`[Cron] Erro na busca de precos: ${e}`)
          )
        },
        { timezone: TIMEZONE }
      )
      this.scheduledTasks.push(task)
      logger.info(`[Cron] Busca de precos agendada: ${cronExpr.trim()}`)
    }

    // Cron de digest semanal (sexta-feira)
    const digestTask = cron.schedule(
      DIGEST_CRON,
      () => {
        logger.info(`[Cron] Enviando resumo semanal`)
        this.sendWeeklyDigests().catch((e) =>
          logger.error(`[Cron] Erro no digest: ${e}`)
        )
      },
      { timezone: TIMEZONE }
    )
    this.scheduledTasks.push(digestTask)
    logger.info(`[Cron] Resumo semanal agendado: ${DIGEST_CRON}`)
  }

  stopCrons(): void {
    for (const task of this.scheduledTasks) {
      task.stop()
    }
    this.scheduledTasks = []
    logger.info('[Cron] Todos os crons parados')
  }

  // Executa busca de precos em todas as rotas e envia alertas
  async runPriceSearch(): Promise<void> {
    try {
      const deals = await this.priceAlertService.checkAllRoutes()

      if (deals.length === 0) {
        logger.info('Nenhum deal detectado')
        return
      }

      // Agrupa deals por chatId
      const dealsByChat = new Map<number, typeof deals>()
      for (const deal of deals) {
        const chatId = deal.route.chatId
        if (!dealsByChat.has(chatId)) {
          dealsByChat.set(chatId, [])
        }
        dealsByChat.get(chatId)!.push(deal)
      }

      // Envia alertas para cada chat
      for (const [chatId, chatDeals] of dealsByChat) {
        for (const deal of chatDeals) {
          try {
            // Salva o deal no banco
            await this.priceAlertService.saveDeal(deal)

            // Formata e envia notificacao
            const notification = this.priceAlertService.formatNotification(deal)
            await this.telegram.sendAlert(chatId, notification)

            logger.info(`Alerta enviado para chat ${chatId}: ${deal.type}`)
          } catch (error) {
            logger.error(`Erro ao enviar alerta para chat ${chatId}: ${error}`)
          }
        }
      }
    } catch (error) {
      logger.error(`Erro no price search: ${error}`)
    }
  }

  // Envia resumo semanal para todos os chats configurados
  async sendWeeklyDigests(): Promise<void> {
    try {
      const chatsWithDigest = await this.alertsDb.getChatsWithDigestEnabled()

      for (const settings of chatsWithDigest) {
        try {
          const digest = await this.generateWeeklyDigest(settings.chatId)
          await this.telegram.sendMessage(settings.chatId, digest)
          logger.info(`Resumo semanal enviado para chat ${settings.chatId}`)
        } catch (error) {
          logger.error(`Erro ao enviar resumo para chat ${settings.chatId}: ${error}`)
        }
      }
    } catch (error) {
      logger.error(`Erro ao enviar resumos: ${error}`)
    }
  }

  // Mantém compatibilidade
  async sendDailyDigests(): Promise<void> {
    return this.sendWeeklyDigests()
  }

  // Gera resumo semanal neutro (apenas dados, sem fanfarra)
  async generateWeeklyDigest(chatId: number): Promise<string> {
    const routes = await this.routesDb.getRoutesByChat(chatId)

    if (routes.length === 0) {
      return `📊 *Atlas - Resumo Semanal*\n\nNenhuma rota monitorada.\nUse /rota add CNF NRT para começar.`
    }

    const today = new Date()
    let digest = `📊 *ATLAS - RESUMO SEMANAL*\n`
    digest += `📅 Semana de ${format(addDays(today, -7), 'dd/MM')} a ${format(today, 'dd/MM/yyyy')}\n`
    digest += `${'─'.repeat(25)}\n\n`

    for (const route of routes) {
      const routeFull = formatRouteFull(route.origin, route.destination)
      const benchmark = getBenchmark(route.origin, route.destination)

      digest += `✈️ *${routeFull}*\n`

      // Busca os melhores preços da semana
      try {
        const weekPrices = await this.pricesDb.getBestPricesLastWeek(route.origin, route.destination)

        if (weekPrices.length > 0) {
          // Agrupa por mês
          const byMonth = new Map<string, typeof weekPrices>()
          for (const p of weekPrices) {
            const dateStr = String(p.departureDate)
            const month = dateStr.substring(5, 7)
            const monthNames: Record<string, string> = {
              '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
              '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
              '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
            }
            const monthName = monthNames[month] || `M${month}`

            if (!byMonth.has(monthName)) {
              byMonth.set(monthName, [])
            }
            byMonth.get(monthName)!.push(p)
          }

          for (const [monthName, prices] of byMonth) {
            const best = prices.reduce((min, p) => p.price < min.price ? p : min, prices[0])
            const dateFormatted = String(best.departureDate).split('T')[0].split('-').reverse().join('/')

            digest += `\n*${monthName}:* R$ ${this.formatPrice(best.price)}\n`
            digest += `  ${best.airline} | ${dateFormatted}\n`
            digest += `  ${best.stops === 0 ? 'Direto' : `${best.stops} parada(s)`}\n`
            digest += `  2p: R$ ${this.formatPrice(best.price * 2)} | 4p: R$ ${this.formatPrice(best.price * 4)}\n`

            // Referência silenciosa
            if (benchmark) {
              const diff = ((best.price - benchmark.avgPrice) / benchmark.avgPrice * 100).toFixed(0)
              const sign = Number(diff) > 0 ? '+' : ''
              digest += `  _vs média: ${sign}${diff}%_\n`
            }
          }
        } else {
          digest += `\n_Sem dados esta semana_\n`
        }

        // Tendência
        const trend = await this.pricesDb.getTrend(route.origin, route.destination)
        if (trend === 'down') {
          digest += `📉 tendência de queda\n`
        } else if (trend === 'up') {
          digest += `📈 tendência de alta\n`
        }

      } catch (error) {
        digest += `\n_Erro ao buscar dados_\n`
      }

      digest += `${'─'.repeat(25)}\n`
    }

    digest += `\n_Ida e volta (19 dias) | Econômica_`

    return digest
  }

  // Mantém compatibilidade com código antigo
  async generateDigest(chatId: number): Promise<string> {
    return this.generateWeeklyDigest(chatId)
  }

  // Formata preço com separador de milhar
  private formatPrice(price: number): string {
    return price.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  // Executa busca manual (chamado via comando)
  async runManualSearch(): Promise<string> {
    try {
      const deals = await this.priceAlertService.checkAllRoutes()
      return `Busca concluida. ${deals.length} deal(s) detectado(s).`
    } catch (error) {
      return `Erro na busca: ${error}`
    }
  }
}

let instance: DailyDigestService | null = null

export function getDailyDigestService(): DailyDigestService {
  if (!instance) {
    instance = new DailyDigestService()
  }
  return instance
}
