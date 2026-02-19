import cron from 'node-cron'
import { getRoutesDbService } from './routes-db.service.js'
import { getAlertsDbService } from './alerts-db.service.js'
import { getPriceAlertService } from './price-alert.service.js'
import { getTelegramService } from './telegram.service.js'
import { getPricesDbService } from './prices-db.service.js'
import { logger } from '../utils/logger.js'
import { loadEnv } from '../utils/env.js'
import { formatRouteFull } from '../utils/airports.js'
import { getBenchmark, getAllBenchmarks, setBenchmark, saveBenchmarkToSupabase, loadBenchmarksFromSupabase, seedBenchmarksToSupabase } from '../utils/price-benchmark.js'
import { getPromoMonitorService } from './promo-monitor.service.js'
import { addDays, format } from 'date-fns'

loadEnv()

const TIMEZONE = process.env.ATLAS_TIMEZONE || 'America/Sao_Paulo'
// Default: 2x por dia (8h e 20h) - ajuste conforme budget
const SEARCH_CRONS = (process.env.ATLAS_SEARCH_CRONS || '0 8 * * *,0 20 * * *').split(',')
// Digest semanal: sexta-feira às 20:30
const DIGEST_CRON = process.env.ATLAS_DIGEST_CRON || '30 20 * * 5'
// Monitor de promoções RSS: a cada 30 minutos
const PROMO_CRON = process.env.ATLAS_PROMO_CRON || '*/30 * * * *'
// Recalibração de benchmarks: domingo às 23:00
const BENCHMARK_CRON = process.env.ATLAS_BENCHMARK_CRON || '0 23 * * 0'
// Limpeza de preços antigos: domingo às 04:00
const CLEANUP_CRON = process.env.ATLAS_CLEANUP_CRON || '0 4 * * 0'
const CLEANUP_DAYS = Number(process.env.ATLAS_CLEANUP_DAYS) || 90
const MIN_SAMPLES_RECALIBRATE = 30

class DailyDigestService {
  private routesDb = getRoutesDbService()
  private alertsDb = getAlertsDbService()
  private pricesDb = getPricesDbService()
  private priceAlertService = getPriceAlertService()
  private telegram = getTelegramService()
  private scheduledTasks: cron.ScheduledTask[] = []

  // Inicia os crons de monitoramento
  startCrons(): void {
    // Carrega benchmarks do Supabase (sobrescreve hardcoded com dados persistidos)
    loadBenchmarksFromSupabase()
      .then(() => seedBenchmarksToSupabase())
      .catch((e) => logger.warn(`[Cron] Erro ao carregar benchmarks: ${e}`))

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

    // Cron de monitor de promoções (RSS)
    const promoTask = cron.schedule(
      PROMO_CRON,
      () => {
        getPromoMonitorService().checkFeeds().catch((e) =>
          logger.error(`[Cron] Erro no monitor de promos: ${e}`)
        )
      },
      { timezone: TIMEZONE }
    )
    this.scheduledTasks.push(promoTask)
    logger.info(`[Cron] Monitor de promoções agendado: ${PROMO_CRON}`)

    // Cron de recalibração de benchmarks (semanal)
    const benchmarkTask = cron.schedule(
      BENCHMARK_CRON,
      () => {
        logger.info(`[Cron] Recalibrando benchmarks`)
        this.recalibrateBenchmarks().catch((e) =>
          logger.error(`[Cron] Erro na recalibração: ${e}`)
        )
      },
      { timezone: TIMEZONE }
    )
    this.scheduledTasks.push(benchmarkTask)
    logger.info(`[Cron] Recalibração de benchmarks agendada: ${BENCHMARK_CRON}`)

    // Cron de limpeza de preços antigos (semanal)
    const cleanupTask = cron.schedule(
      CLEANUP_CRON,
      () => {
        logger.info(`[Cron] Limpando preços com mais de ${CLEANUP_DAYS} dias`)
        this.pricesDb.cleanOldPrices(CLEANUP_DAYS).catch((e) =>
          logger.error(`[Cron] Erro na limpeza: ${e}`)
        )
      },
      { timezone: TIMEZONE }
    )
    this.scheduledTasks.push(cleanupTask)
    logger.info(`[Cron] Limpeza de preços agendada: ${CLEANUP_CRON} (>${CLEANUP_DAYS}d)`)
  }

  stopCrons(): void {
    for (const task of this.scheduledTasks) {
      task.stop()
    }
    this.scheduledTasks = []
    logger.info('[Cron] Todos os crons parados')
  }

  // Executa busca de precos em todas as rotas e envia alertas
  // Nota: checkAllRoutes() já envia notificações via sendDealNotification() internamente
  async runPriceSearch(): Promise<void> {
    try {
      const deals = await this.priceAlertService.checkAllRoutes()
      logger.info(`Busca concluída: ${deals.length} deal(s) detectado(s)`)
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

  // Recalibra benchmarks com dados reais do Supabase (últimos 30 dias)
  async recalibrateBenchmarks(): Promise<void> {
    if (!this.pricesDb.enabled()) {
      logger.warn('[Benchmark] Supabase não configurado — pulando recalibração')
      return
    }

    const benchmarks = getAllBenchmarks()
    let updated = 0

    for (const bm of benchmarks) {
      const [origin, dest] = bm.route.split('-')
      if (!origin || !dest) continue

      try {
        const prices = await this.pricesDb.getRecentPrices(origin, dest, 30)
        if (prices.length < MIN_SAMPLES_RECALIBRATE) {
          logger.info(`[Benchmark] ${bm.route}: ${prices.length} amostras (< ${MIN_SAMPLES_RECALIBRATE}) — mantendo atual`)
          continue
        }

        // Ordena preços do menor para o maior
        const sorted = prices.map(p => p.price).sort((a, b) => a - b)

        // Calcula percentis
        const percentile = (arr: number[], p: number) => {
          const idx = Math.floor(arr.length * p / 100)
          return arr[Math.min(idx, arr.length - 1)]
        }

        const median = percentile(sorted, 50)
        const p25 = percentile(sorted, 25)
        const p10 = percentile(sorted, 10)

        // Arredonda para centenas
        const round100 = (n: number) => Math.round(n / 100) * 100

        const newAvg = round100(median)
        const newGood = round100(p25)
        const newGreat = round100(p10)

        // Só atualiza se mudou significativamente (>3%)
        const avgDiff = Math.abs(newAvg - bm.avgPrice) / bm.avgPrice
        if (avgDiff < 0.03) {
          logger.info(`[Benchmark] ${bm.route}: sem mudança significativa (avg ${bm.avgPrice} → ${newAvg}, diff ${(avgDiff * 100).toFixed(1)}%)`)
          continue
        }

        logger.info(
          `[Benchmark] ${bm.route}: recalibrando (${sorted.length} amostras)\n` +
          `  avg: ${bm.avgPrice} → ${newAvg}\n` +
          `  good: ${bm.goodPrice} → ${newGood}\n` +
          `  great: ${bm.greatPrice} → ${newGreat}`
        )

        const newBenchmark = {
          route: bm.route,
          avgPrice: newAvg,
          goodPrice: newGood,
          greatPrice: newGreat,
          lastUpdated: format(new Date(), 'yyyy-MM'),
          notes: `Auto-recalibrado (${sorted.length} amostras, 30d). Anterior: avg=${bm.avgPrice}/good=${bm.goodPrice}/great=${bm.greatPrice}`,
        }
        setBenchmark(newBenchmark)
        await saveBenchmarkToSupabase(newBenchmark)
        updated++
      } catch (error) {
        logger.warn(`[Benchmark] Erro ao recalibrar ${bm.route}: ${error}`)
      }
    }

    logger.info(`[Benchmark] Recalibração concluída: ${updated} rotas atualizadas`)
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
