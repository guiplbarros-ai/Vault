import type { FlightResult, FlightDeal, AlertNotification, MonitoredRoute } from '../types/index.js'
import { getRoutesDbService } from './routes-db.service.js'
import { getPricesDbService } from './prices-db.service.js'
import { getAlertsDbService } from './alerts-db.service.js'
import { getUsageDbService } from './usage-db.service.js'
import { getTelegramService } from './telegram.service.js'
import { searchFlights } from './flight-search.service.js'
import { logger } from '../utils/logger.js'
import { formatRoute, formatRouteFull, getAirport } from '../utils/airports.js'
import { ratePriceVsBenchmark, getBenchmark, type PriceRating } from '../utils/price-benchmark.js'
import { loadEnv } from '../utils/env.js'

loadEnv()

const DEFAULT_DROP_PERCENT = Number(process.env.ATLAS_ALERT_DROP_PERCENT) || 15

interface DetectedDeal {
  flight: FlightResult
  route: MonitoredRoute
  type: 'price_drop' | 'lowest_ever' | 'trend_down' | 'target_reached' | 'good_price' | 'great_price'
  previousPrice?: number
  dropPercent?: number
  lowestPrice?: number
  benchmarkAvg?: number
  benchmarkGood?: number
  benchmarkGreat?: number
  priceRating?: PriceRating
  surcharge?: number // Custo extra do trecho doméstico (ex: BH→SP)
  homeOrigin?: string // Aeroporto base do usuário (ex: CNF)
}

class PriceAlertService {
  private pricesDb = getPricesDbService()
  private alertsDb = getAlertsDbService()
  private routesDb = getRoutesDbService()

  // Lazy loading para evitar dependencia circular
  private getTelegram() {
    return getTelegramService()
  }

  // Executa busca em todas as rotas ativas e detecta deals
  async checkAllRoutes(): Promise<DetectedDeal[]> {
    const routes = await this.routesDb.getAllActiveRoutes()
    logger.info(`Verificando ${routes.length} rotas monitoradas`)

    const allDeals: DetectedDeal[] = []

    for (const route of routes) {
      try {
        const deals = await this.checkRoute(route)

        // Envia notificações para cada deal
        for (const deal of deals) {
          await this.sendDealNotification(deal)
        }

        allDeals.push(...deals)
      } catch (error) {
        logger.error(`Erro ao verificar rota ${route.origin}->${route.destination}: ${error}`)
      }
    }

    logger.info(`Detectados ${allDeals.length} deals`)
    return allDeals
  }

  // Envia notificação de deal via Telegram
  private async sendDealNotification(deal: DetectedDeal): Promise<void> {
    const telegram = this.getTelegram()

    if (!telegram.enabled()) {
      logger.warn('Telegram não configurado - notificação não enviada')
      return
    }

    const notification = this.formatNotification(deal)
    const chatId = deal.route.chatId

    if (!chatId || chatId === 0) {
      logger.warn(`Chat ID não configurado para rota ${deal.route.origin}->${deal.route.destination}`)
      return
    }

    try {
      await telegram.sendAlert(chatId, notification)
      logger.info(`Notificação enviada para chat ${chatId}`)
    } catch (error) {
      logger.error(`Erro ao enviar notificação: ${error}`)
    }
  }

  // Verifica uma rota especifica
  async checkRoute(route: MonitoredRoute): Promise<DetectedDeal[]> {
    const deals: DetectedDeal[] = []

    // Busca voos para os proximos 30-90 dias (periodo de busca)
    const searchDates = this.getSearchDates()

    // Estadia padrão: 19 dias (ou configurado na rota)
    const stayDays = route.minStayDays || 19

    // Aeroportos alternativos de destino (ex: NRT e HND = Tóquio)
    const ALTERNATIVE_DESTINATIONS: Record<string, string[]> = {
      NRT: ['HND'],
      HND: ['NRT'],
    }

    // Aeroportos alternativos de origem com custo estimado do trecho doméstico (ida+volta)
    // Ex: saindo de GRU em vez de CNF, soma ~R$500 do trecho BH→SP
    const ALTERNATIVE_ORIGINS: Record<string, { airport: string; surcharge: number }[]> = {
      CNF: [{ airport: 'GRU', surcharge: 500 }],
    }

    const origins: { airport: string; surcharge: number; homeOrigin: string }[] = [
      { airport: route.origin, surcharge: 0, homeOrigin: route.origin },
      ...(ALTERNATIVE_ORIGINS[route.origin] || []).map((alt) => ({
        ...alt,
        homeOrigin: route.origin,
      })),
    ]
    const destinations = [route.destination, ...(ALTERNATIVE_DESTINATIONS[route.destination] || [])]

    for (const date of searchDates) {
      for (const orig of origins) {
        for (const dest of destinations) {
          try {
            // Calcula data de volta (ida + estadia)
            const returnDate = new Date(date)
            returnDate.setDate(returnDate.getDate() + stayDays)

            const result = await searchFlights({
              origin: orig.airport,
              destination: dest,
              departureDate: date,
              returnDate: returnDate,
            })

            if (result.results.length === 0) continue

            // Salva os precos no historico
            await this.pricesDb.savePrices(result.results, route.id)

            // Verifica deals — compara preço efetivo (voo + trecho doméstico) contra benchmark da origem base
            const routeDeals = await this.detectDeals(
              { ...route, origin: orig.airport },
              result.results,
              { surcharge: orig.surcharge, homeOrigin: orig.homeOrigin }
            )
            deals.push(...routeDeals)
          } catch (error) {
            logger.warn(`Erro ao buscar ${orig.airport}->${dest} para ${date}: ${error}`)
          }
        }
      }
    }

    return deals
  }

  // Detecta deals com base no BENCHMARK de mercado (fonte principal)
  private async detectDeals(
    route: MonitoredRoute,
    flights: FlightResult[],
    extra: { surcharge: number; homeOrigin: string } = { surcharge: 0, homeOrigin: route.origin }
  ): Promise<DetectedDeal[]> {
    const deals: DetectedDeal[] = []

    if (flights.length === 0) return deals

    const bestFlight = flights[0] // Já ordenado por preço (menor primeiro)

    // Preço efetivo = preço do voo + custo do trecho doméstico
    const effectivePrice = bestFlight.price + extra.surcharge

    // 1. PRINCIPAL: Verifica contra o BENCHMARK da origem BASE (ex: CNF, não GRU)
    // Isso garante comparação justa: voo GRU R$7.000 + R$500 trecho = R$7.500 vs benchmark CNF
    const { rating, benchmark, percentVsAvg } = ratePriceVsBenchmark(
      extra.homeOrigin,
      route.destination,
      effectivePrice
    )

    if (benchmark) {
      // Notifica se for preço BOM ou EXCELENTE
      if (rating === 'great') {
        deals.push({
          flight: bestFlight,
          route,
          type: 'great_price',
          benchmarkAvg: benchmark.avgPrice,
          benchmarkGood: benchmark.goodPrice,
          benchmarkGreat: benchmark.greatPrice,
          dropPercent: percentVsAvg,
          priceRating: rating,
          surcharge: extra.surcharge || undefined,
          homeOrigin: extra.surcharge ? extra.homeOrigin : undefined,
        })
        logger.info(
          `🔥 PROMOÇÃO EXCELENTE: ${route.origin}->${route.destination} R$${effectivePrice}${extra.surcharge ? ` (voo R$${bestFlight.price} + trecho R$${extra.surcharge})` : ''} (benchmark great: R$${benchmark.greatPrice})`
        )
      } else if (rating === 'good') {
        deals.push({
          flight: bestFlight,
          route,
          type: 'good_price',
          benchmarkAvg: benchmark.avgPrice,
          benchmarkGood: benchmark.goodPrice,
          benchmarkGreat: benchmark.greatPrice,
          dropPercent: percentVsAvg,
          priceRating: rating,
          surcharge: extra.surcharge || undefined,
          homeOrigin: extra.surcharge ? extra.homeOrigin : undefined,
        })
        logger.info(
          `✅ Preço bom: ${route.origin}->${route.destination} R$${effectivePrice}${extra.surcharge ? ` (voo R$${bestFlight.price} + trecho R$${extra.surcharge})` : ''} (benchmark good: R$${benchmark.goodPrice})`
        )
      } else {
        // Preço normal ou caro - apenas loga, não notifica
        logger.info(
          `📊 Preço ${rating}: ${route.origin}->${route.destination} R$${effectivePrice}${extra.surcharge ? ` (voo R$${bestFlight.price} + trecho R$${extra.surcharge})` : ''} (avg: R$${benchmark.avgPrice})`
        )
      }
    } else {
      // Sem benchmark - loga aviso
      logger.warn(
        `⚠️ Sem benchmark para ${route.origin}->${route.destination}. Preço: R$${bestFlight.price}`
      )
    }

    // 2. Verifica preço alvo do usuário (sempre verifica, independente do benchmark)
    if (route.targetPrice && bestFlight.price <= route.targetPrice) {
      const alreadyDetected = deals.some((d) => d.flight.id === bestFlight.id)
      if (!alreadyDetected) {
        deals.push({
          flight: bestFlight,
          route,
          type: 'target_reached',
          benchmarkAvg: benchmark?.avgPrice,
          benchmarkGood: benchmark?.goodPrice,
          benchmarkGreat: benchmark?.greatPrice,
          priceRating: rating,
        })
        logger.info(
          `🎯 Preço alvo atingido: ${route.origin}->${route.destination} R$${bestFlight.price} <= R$${route.targetPrice}`
        )
      }
    }

    // Salva preços no histórico (para referência futura, mas não usamos para alertas ainda)
    // Quando tivermos dados suficientes (30+ dias), podemos usar para complementar o benchmark

    return deals
  }

  // Salva um deal detectado no banco
  async saveDeal(deal: DetectedDeal): Promise<FlightDeal> {
    const savedDeal = await this.alertsDb.saveDeal({
      routeId: deal.route.id,
      origin: deal.flight.origin,
      destination: deal.flight.destination,
      departureDate: deal.flight.departureDate,
      price: deal.flight.price,
      previousPrice: deal.previousPrice,
      dropPercent: deal.dropPercent,
      airline: deal.flight.airline,
      stops: deal.flight.stops,
      deepLink: deal.flight.deepLink,
      dealType: deal.type,
    })

    return savedDeal
  }

  // Formata notificacao para enviar via Telegram
  formatNotification(deal: DetectedDeal): AlertNotification {
    const routeShort = formatRoute(deal.flight.origin, deal.flight.destination)
    const routeFull = formatRouteFull(deal.flight.origin, deal.flight.destination)
    const flight = deal.flight
    const price = flight.price

    // Emoji e header baseado no tipo
    let emoji = '✈️'
    let header = ''

    switch (deal.type) {
      case 'great_price':
        emoji = '🔥🔥🔥'
        header = 'PROMOÇÃO EXCELENTE!'
        break
      case 'good_price':
        emoji = '✅'
        header = 'PREÇO BOM!'
        break
      case 'target_reached':
        emoji = '🎯'
        header = 'PREÇO ALVO ATINGIDO!'
        break
      case 'price_drop':
        emoji = '📉'
        header = `QUEDA DE ${deal.dropPercent?.toFixed(0)}%!`
        break
      case 'lowest_ever':
        emoji = '🏆'
        header = 'MENOR PREÇO HISTÓRICO!'
        break
      case 'trend_down':
        emoji = '📊'
        header = 'TENDÊNCIA DE QUEDA!'
        break
    }

    // Extrai apenas a parte da data (YYYY-MM-DD), ignorando horário
    // SerpAPI manda "2026-11-30 10:30", Kiwi manda "2026-11-30T10:30:00.000Z"
    const depDateStr = String(flight.departureDate)
    const dateOnly = depDateStr.split(/[T ]/)[0] // separa em T ou espaço
    const depParts = dateOnly.includes('-') ? dateOnly.split('-') : null

    // Formata data do voo (YYYY-MM-DD -> DD/MM/YYYY)
    const departureDate = depParts
      ? `${depParts[2]}/${depParts[1]}/${depParts[0]}`
      : depDateStr

    // Calcula data de volta (ida + 19 dias de estadia)
    let returnDateStr = ''
    if (depParts) {
      const depDate = new Date(Number(depParts[0]), Number(depParts[1]) - 1, Number(depParts[2]))
      depDate.setDate(depDate.getDate() + 19)
      returnDateStr = `${String(depDate.getDate()).padStart(2, '0')}/${String(depDate.getMonth() + 1).padStart(2, '0')}/${depDate.getFullYear()}`
    }

    // Formata duração
    const hours = Math.floor(flight.duration / 60)
    const mins = flight.duration % 60
    const durationStr = mins > 0 ? `${hours}h${mins}min` : `${hours}h`

    // Paradas
    const stopsStr = flight.stops === 0 ? 'Direto' : `${flight.stops} parada${flight.stops > 1 ? 's' : ''}`

    // Pontos — tabela de custo por ponto por programa
    const POINTS_PROGRAMS = [
      { name: 'Smiles', costPerPoint: 0.019 },
      { name: 'LATAM Pass', costPerPoint: 0.022 },
      { name: 'Livelo', costPerPoint: 0.020 },
    ] as const

    // Custo do trecho doméstico (se origem alternativa)
    const surcharge = deal.surcharge || 0
    const effectivePrice = price + surcharge

    // Monta mensagem
    let message = `${emoji} *${header}*\n`
    if (surcharge > 0) {
      message += `*R$ ${this.formatPrice(effectivePrice)}* por pessoa (custo total estimado)\n`
      message += `  ✈️ Voo internacional: R$ ${this.formatPrice(price)}\n`
      message += `  🚌 Trecho ${deal.homeOrigin || 'CNF'}→${flight.origin}: ~R$ ${this.formatPrice(surcharge)}\n\n`
    } else {
      message += `*R$ ${this.formatPrice(price)}* por pessoa\n\n`
    }

    // Rota com aeroportos explícitos
    const originAirport = getAirport(flight.origin)
    const destAirport = getAirport(flight.destination)
    const originLabel = originAirport
      ? `${originAirport.city} (${originAirport.iata})`
      : flight.origin
    const destLabel = destAirport
      ? `${destAirport.city} (${destAirport.iata})`
      : flight.destination

    message += `🛫 *Origem:* ${originLabel}\n`
    message += `🛬 *Destino:* ${destLabel}\n`
    message += `📅 ${departureDate}${returnDateStr ? ` → ${returnDateStr}` : ''} (19 dias)\n`
    message += `✈️ ${flight.airline} | ${durationStr} | ${stopsStr}\n`

    // Detalhes das paradas (onde e quanto tempo)
    if (flight.layovers && flight.layovers.length > 0) {
      message += `\n📍 *Conexões:*\n`
      for (const layover of flight.layovers) {
        const layoverAirport = getAirport(layover.airport)
        const layoverLabel = layoverAirport
          ? `${layoverAirport.city} (${layover.airport})`
          : layover.city || layover.airport
        const layoverHours = Math.floor(layover.duration / 60)
        const layoverMins = layover.duration % 60
        const layoverDur = layoverMins > 0 ? `${layoverHours}h${layoverMins}min` : `${layoverHours}h`
        message += `  • ${layoverLabel} — ${layoverDur}\n`
      }
    }
    message += '\n'

    // Comparação com benchmark (se disponível)
    if (deal.benchmarkAvg) {
      const diffPercent = ((deal.benchmarkAvg - effectivePrice) / deal.benchmarkAvg * 100).toFixed(0)
      message += `📊 *vs mercado:* ${diffPercent}% abaixo da média (R$ ${this.formatPrice(deal.benchmarkAvg)})\n\n`
    }

    // Preços por pessoa (custo total)
    message += `💰 *Custo total ida e volta, econômica:*\n`
    message += `  1p: *R$ ${this.formatPrice(effectivePrice)}*\n`
    message += `  2p: R$ ${this.formatPrice(effectivePrice * 2)}\n`
    message += `  4p: R$ ${this.formatPrice(effectivePrice * 4)}\n\n`

    // Equivalente em pontos por programa (baseado no custo total)
    message += `🎁 *Em pontos (1 pessoa):*\n`
    for (const prog of POINTS_PROGRAMS) {
      const points = Math.round(effectivePrice / prog.costPerPoint)
      message += `  ${prog.name}: ~${this.formatPoints(points)} pts (R$${prog.costPerPoint.toFixed(3)}/pt)\n`
    }
    message += '\n'

    // Janela de compra
    message += this.getPurchaseWindowAdvice(flight.departureDate)

    return {
      type: deal.type,
      route: routeShort,
      currentPrice: price,
      previousPrice: deal.previousPrice,
      dropPercent: deal.dropPercent,
      lowestPrice: deal.lowestPrice,
      message,
      deepLink: flight.deepLink,
    }
  }

  // Formata preço com separador de milhar
  private formatPrice(price: number): string {
    return price.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  // Formata pontos com separador de milhar
  private formatPoints(points: number): string {
    return points.toLocaleString('pt-BR')
  }

  // Retorna datas de busca alvo
  // Ida: 28/11 a 30/11, volta: 17/12 a 19/12 (19 dias de estadia)
  private getSearchDates(): Date[] {
    const currentYear = new Date().getFullYear()
    const targetYear = currentYear

    const dates: Date[] = [
      new Date(targetYear, 10, 28),  // 28/11 -> volta 17/12
      new Date(targetYear, 10, 29),  // 29/11 -> volta 18/12
      new Date(targetYear, 10, 30),  // 30/11 -> volta 19/12
    ]

    // Filtra datas que já passaram
    const now = new Date()
    return dates.filter(d => d > now)
  }

  // Avalia janela de compra com base na antecedência até o voo
  private getPurchaseWindowAdvice(departureDate: Date | string): string {
    const dep = typeof departureDate === 'string' ? new Date(departureDate) : departureDate
    const now = new Date()
    const daysUntilFlight = Math.round((dep.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilFlight > 180) {
      return '🟢 _Janela antecipada (6+ meses) — bom momento para monitorar, preços podem cair mais_'
    }
    if (daysUntilFlight > 120) {
      return '🟢 _Janela ideal de compra (4-6 meses) — melhor momento para garantir bom preço_'
    }
    if (daysUntilFlight > 60) {
      return '🟡 _Janela intermediária (2-4 meses) — preços razoáveis, mas compre logo se o preço estiver bom_'
    }
    if (daysUntilFlight > 30) {
      return '🟠 _Janela curta (1-2 meses) — preços tendem a subir, compre se estiver bom_'
    }
    return '🔴 _Última hora (<30 dias) — preços altos, compre só se for urgente_'
  }

  // Verifica budget antes de executar buscas
  async checkBudgetBeforeSearch(): Promise<{ canProceed: boolean; message?: string }> {
    const usageDb = getUsageDbService()
    const budget = await usageDb.checkBudget('serpapi')

    if (!budget.allowed) {
      return { canProceed: false, message: budget.warning }
    }

    if (budget.warning) {
      logger.warn(budget.warning)
    }

    return { canProceed: true, message: budget.warning }
  }
}

let instance: PriceAlertService | null = null

export function getPriceAlertService(): PriceAlertService {
  if (!instance) {
    instance = new PriceAlertService()
  }
  return instance
}
