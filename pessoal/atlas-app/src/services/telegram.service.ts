import TelegramBot from 'node-telegram-bot-api'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { searchFlights, formatSearchSummary } from './flight-search.service.js'
import { getRoutesDbService } from './routes-db.service.js'
import { getAlertsDbService } from './alerts-db.service.js'
import { getPricesDbService } from './prices-db.service.js'
import { getPriceAlertService, getChatAlertPrefs, setChatAlertPrefs, loadChatAlertPrefs } from './price-alert.service.js'
import type { AlertLevel } from './price-alert.service.js'
import { getUsageDbService } from './usage-db.service.js'
import { getPromoMonitorService } from './promo-monitor.service.js'
import { getHealthService } from './health.service.js'
import { getCacheStats } from './flight-search.service.js'
import { formatRoute, isValidIata, normalizeIata, formatAirportFull } from '../utils/airports.js'
import { getBenchmark } from '../utils/price-benchmark.js'
import { generateAsciiChart } from '../utils/ascii-chart.js'
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
          `/rota CNF NRT - Detalhes da rota\n` +
          `/rota update CNF NRT alvo 6000 - Preço-alvo\n` +
          `/rota update CNF NRT estadia 19 - Dias de estadia\n` +
          `/rotas - Listar rotas monitoradas\n` +
          `/buscar GRU LIS 15/03 - Busca manual\n` +
          `/historico CNF NRT - Histórico de preços 30d\n` +
          `/config - Configurar alertas\n` +
          `/budget - Ver uso de API (custos)\n` +
          `/health - Status dos providers\n` +
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

    // /rota update ORIGIN DEST alvo PRECO
    this.bot.onText(/\/rota update ([A-Za-z]{3}) ([A-Za-z]{3}) alvo (\d+)/, async (msg, match) => {
      if (!isAuthorized(msg.from?.id || 0)) return
      if (!match) return

      const origin = normalizeIata(match[1])
      const dest = normalizeIata(match[2])
      const targetPrice = Number(match[3])

      try {
        const ok = await this.routesDb.updateTargetPrice(msg.chat.id, origin, dest, targetPrice)
        if (ok) {
          this.sendMessage(msg.chat.id, `🎯 Preço-alvo de ${formatRoute(origin, dest)} atualizado para R$ ${targetPrice.toLocaleString('pt-BR')}`)
        } else {
          this.sendMessage(msg.chat.id, `❌ Rota ${formatRoute(origin, dest)} não encontrada.`)
        }
      } catch (error) {
        this.sendMessage(msg.chat.id, `Erro ao atualizar preço-alvo: ${error}`)
      }
    })

    // /rota update ORIGIN DEST estadia DIAS
    this.bot.onText(/\/rota update ([A-Za-z]{3}) ([A-Za-z]{3}) estadia (\d+)/, async (msg, match) => {
      if (!isAuthorized(msg.from?.id || 0)) return
      if (!match) return

      const origin = normalizeIata(match[1])
      const dest = normalizeIata(match[2])
      const stayDays = Number(match[3])

      try {
        const ok = await this.routesDb.updateStayDays(msg.chat.id, origin, dest, stayDays)
        if (ok) {
          this.sendMessage(msg.chat.id, `📅 Estadia de ${formatRoute(origin, dest)} atualizada para ${stayDays} dias`)
        } else {
          this.sendMessage(msg.chat.id, `❌ Rota ${formatRoute(origin, dest)} não encontrada.`)
        }
      } catch (error) {
        this.sendMessage(msg.chat.id, `Erro ao atualizar estadia: ${error}`)
      }
    })

    // /rota ORIGIN DEST - Detalhes da rota
    this.bot.onText(/\/rota ([A-Za-z]{3}) ([A-Za-z]{3})$/, async (msg, match) => {
      if (!isAuthorized(msg.from?.id || 0)) return
      if (!match) return

      const origin = normalizeIata(match[1])
      const dest = normalizeIata(match[2])

      try {
        const route = await this.routesDb.getRoute(msg.chat.id, origin, dest)
        if (!route) {
          return this.sendMessage(msg.chat.id, `Rota ${formatRoute(origin, dest)} não encontrada.\nUse /rota add ${origin} ${dest} para adicionar.`)
        }

        const benchmark = getBenchmark(origin, dest)
        const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

        let message = `✈️ *${formatRoute(origin, dest)}*\n\n`
        message += `Status: ${route.isActive ? '✅ Ativa' : '⏸ Inativa'}\n`
        if (route.targetPrice) message += `🎯 Preço-alvo: R$ ${fmt(route.targetPrice)}\n`
        if (route.minStayDays) message += `📅 Estadia: ${route.minStayDays} dias\n`
        if (route.isRoundTrip) message += `🔄 Ida e volta\n`

        if (benchmark) {
          message += `\n📊 *Benchmark:*\n`
          message += `  Média: R$ ${fmt(benchmark.avgPrice)}\n`
          message += `  Bom: ≤ R$ ${fmt(benchmark.goodPrice)}\n`
          message += `  Excelente: ≤ R$ ${fmt(benchmark.greatPrice)}\n`
        }

        message += `\n*Atualizar:*\n`
        message += `/rota update ${origin} ${dest} alvo 6000\n`
        message += `/rota update ${origin} ${dest} estadia 19`

        this.sendMessage(msg.chat.id, message)
      } catch (error) {
        this.sendMessage(msg.chat.id, `Erro ao buscar rota: ${error}`)
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
          const details: string[] = []
          if (route.targetPrice) details.push(`alvo: R$${route.targetPrice}`)
          if (route.minStayDays) details.push(`${route.minStayDays}d`)
          if (details.length > 0) message += ` (${details.join(' | ')})`
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

    // /config - Ver e alterar preferências de alertas
    this.bot.onText(/\/config$/, async (msg) => {
      if (!isAuthorized(msg.from?.id || 0)) return

      const prefs = await loadChatAlertPrefs(msg.chat.id)
      const levelLabel: Record<string, string> = {
        all: '📢 Todos (good + great + target)',
        good_and_great: '✅ Bom e Excelente (padrão)',
        great_only: '🔥 Apenas Excelente',
      }

      let message = `⚙️ *Configurações de Alerta*\n\n`
      message += `Nível: ${levelLabel[prefs.alertLevel] || prefs.alertLevel}\n`
      if (prefs.silenceUntil) {
        message += `🔇 Silenciado até: ${prefs.silenceUntil.toLocaleDateString('pt-BR')}\n`
      }
      message += `\n*Alterar:*\n`
      message += `/config great - Só promoções excelentes\n`
      message += `/config good - Bom + Excelente\n`
      message += `/config all - Todos os alertas\n`
      message += `/config silence 30/03 - Silenciar até data\n`
      message += `/config resume - Reativar alertas`

      this.sendMessage(msg.chat.id, message)
    })

    // /config <level>
    this.bot.onText(/\/config (great|good|all)/, (msg, match) => {
      if (!isAuthorized(msg.from?.id || 0)) return
      if (!match) return

      const levelMap: Record<string, AlertLevel> = {
        great: 'great_only',
        good: 'good_and_great',
        all: 'all',
      }
      const level = levelMap[match[1]]
      setChatAlertPrefs(msg.chat.id, { alertLevel: level })

      const labels: Record<string, string> = {
        great_only: '🔥 Apenas Excelente',
        good_and_great: '✅ Bom + Excelente',
        all: '📢 Todos os alertas',
      }
      this.sendMessage(msg.chat.id, `Configuração atualizada: ${labels[level]}`)
    })

    // /config silence DD/MM
    this.bot.onText(/\/config silence (\d{1,2})\/(\d{1,2})/, (msg, match) => {
      if (!isAuthorized(msg.from?.id || 0)) return
      if (!match) return

      const day = Number(match[1])
      const month = Number(match[2])
      const year = new Date().getFullYear()
      const silenceDate = new Date(year, month - 1, day, 23, 59, 59)

      if (silenceDate <= new Date()) {
        silenceDate.setFullYear(year + 1)
      }

      setChatAlertPrefs(msg.chat.id, { silenceUntil: silenceDate })
      this.sendMessage(msg.chat.id, `🔇 Alertas silenciados até ${silenceDate.toLocaleDateString('pt-BR')}`)
    })

    // /config resume
    this.bot.onText(/\/config resume/, (msg) => {
      if (!isAuthorized(msg.from?.id || 0)) return
      setChatAlertPrefs(msg.chat.id, { silenceUntil: undefined })
      this.sendMessage(msg.chat.id, `🔔 Alertas reativados!`)
    })

    // /health - Status dos providers e cache
    this.bot.onText(/\/health/, (msg) => {
      if (!isAuthorized(msg.from?.id || 0)) return

      const healthMsg = getHealthService().getStatusMessage()
      const cache = getCacheStats()
      const cacheSection = `\n\n📦 *Cache de buscas:* ${cache.size} entradas`

      this.sendMessage(msg.chat.id, healthMsg + cacheSection)
    })

    // /historico CNF NRT - Histórico de preços dos últimos 30 dias + gráfico
    this.bot.onText(/\/historico ([A-Za-z]{3}) ([A-Za-z]{3})/, async (msg, match) => {
      if (!isAuthorized(msg.from?.id || 0)) return
      if (!match) return

      const origin = normalizeIata(match[1])
      const dest = normalizeIata(match[2])

      try {
        const pricesDb = getPricesDbService()
        if (!pricesDb.enabled()) {
          this.sendMessage(msg.chat.id, '⚠️ Supabase não configurado.')
          return
        }

        const [avg7d, trend, recentPrices30d, lowest] = await Promise.all([
          pricesDb.getAvgPrice7Days(origin, dest),
          pricesDb.getTrend(origin, dest),
          pricesDb.getRecentPrices(origin, dest, 30),
          pricesDb.getLowestHistoricalPrice(origin, dest),
        ])

        const benchmark = getBenchmark(origin, dest)
        const routeLabel = `${formatAirportFull(origin)} → ${formatAirportFull(dest)}`

        let message = `📈 *Histórico de Preços*\n`
        message += `${routeLabel}\n\n`

        if (!recentPrices30d || recentPrices30d.length === 0) {
          message += `Sem dados de preço para esta rota.`
          this.sendMessage(msg.chat.id, message)
          return
        }

        // Gráfico ASCII (agrupa por dia, pega menor preço de cada dia)
        const byDay = new Map<string, number>()
        for (const p of recentPrices30d) {
          const d = new Date(p.fetchedAt)
          const dayKey = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
          const existing = byDay.get(dayKey)
          if (!existing || p.price < existing) {
            byDay.set(dayKey, p.price)
          }
        }
        const chartPoints = Array.from(byDay.entries())
          .reverse() // cronológico
          .map(([label, value]) => ({ label, value }))

        if (chartPoints.length >= 2) {
          message += generateAsciiChart(chartPoints, { title: '📊 *Gráfico 30 dias (menor/dia):*' })
          message += '\n\n'
        }

        // Tendência
        const trendArrow = trend === 'down' ? '↘️' : trend === 'up' ? '↗️' : '➡️'
        const trendLabel = trend === 'down' ? 'Caindo' : trend === 'up' ? 'Subindo' : 'Estável'
        message += `${trendArrow} *Tendência:* ${trendLabel}\n\n`

        // Estatísticas 7 dias
        const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        if (avg7d && avg7d.sampleCount > 0) {
          message += `📊 *Últimos 7 dias:*\n`
          message += `  Média: R$ ${fmt(avg7d.avgPrice)}\n`
          message += `  Mínimo: R$ ${fmt(avg7d.minPrice)}\n`
          message += `  Máximo: R$ ${fmt(avg7d.maxPrice)}\n`
          message += `  Amostras: ${avg7d.sampleCount}\n\n`
        }

        // Benchmark
        if (benchmark) {
          message += `🎯 *Benchmark:*\n`
          message += `  Média mercado: R$ ${fmt(benchmark.avgPrice)}\n`
          message += `  Bom: ≤ R$ ${fmt(benchmark.goodPrice)}\n`
          message += `  Excelente: ≤ R$ ${fmt(benchmark.greatPrice)}\n\n`
        }

        // Menor histórico
        if (lowest) {
          const lowestDate = new Date(lowest.departureDate)
          const formattedDate = `${String(lowestDate.getDate()).padStart(2, '0')}/${String(lowestDate.getMonth() + 1).padStart(2, '0')}`
          message += `🏆 *Menor histórico:* R$ ${fmt(lowest.lowestPrice)}`
          if (lowest.airline) message += ` (${lowest.airline})`
          message += ` em ${formattedDate}\n\n`
        }

        // Últimas 5 cotações
        const last5 = recentPrices30d.slice(0, 5)
        if (last5.length > 0) {
          message += `🕐 *Últimas cotações:*\n`
          for (const p of last5) {
            const fetchDate = new Date(p.fetchedAt)
            const dateStr = `${String(fetchDate.getDate()).padStart(2, '0')}/${String(fetchDate.getMonth() + 1).padStart(2, '0')} ${String(fetchDate.getHours()).padStart(2, '0')}:${String(fetchDate.getMinutes()).padStart(2, '0')}`
            message += `  ${dateStr} — R$ ${fmt(p.price)}\n`
          }
        }

        this.sendMessage(msg.chat.id, message)
      } catch (error) {
        logger.error(`Erro no /historico: ${error}`)
        this.sendMessage(msg.chat.id, `❌ Erro ao buscar histórico: ${error}`)
      }
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
