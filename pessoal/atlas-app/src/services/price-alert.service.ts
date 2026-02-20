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

// --- Preferências de alerta por chat (in-memory cache + Supabase) ---
export type AlertLevel = 'all' | 'good_and_great' | 'great_only'

interface ChatAlertPrefs {
  alertLevel: AlertLevel
  silenceUntil?: Date // Silencia alertas até esta data
}

const chatPrefs = new Map<number, ChatAlertPrefs>()
const prefsLoadedFromDb = new Set<number>() // Track which chats we already loaded from DB

export function setChatAlertPrefs(chatId: number, prefs: Partial<ChatAlertPrefs>): void {
  const current = chatPrefs.get(chatId) || { alertLevel: 'good_and_great' as AlertLevel }
  const updated = { ...current, ...prefs }
  chatPrefs.set(chatId, updated)
  prefsLoadedFromDb.add(chatId)

  // Persist to Supabase (fire-and-forget)
  const alertsDb = getAlertsDbService()
  if (alertsDb.enabled()) {
    alertsDb.upsertChatSettings(chatId, {
      alertLevel: updated.alertLevel,
      silenceUntil: updated.silenceUntil ?? null,
    }).catch((err) => logger.warn(`Erro ao persistir prefs chat ${chatId}: ${err}`))
  }
}

export function getChatAlertPrefs(chatId: number): ChatAlertPrefs {
  return chatPrefs.get(chatId) || { alertLevel: 'good_and_great' }
}

// Load prefs from Supabase for a chat (called lazily on first access)
export async function loadChatAlertPrefs(chatId: number): Promise<ChatAlertPrefs> {
  if (prefsLoadedFromDb.has(chatId)) {
    return getChatAlertPrefs(chatId)
  }

  const alertsDb = getAlertsDbService()
  if (alertsDb.enabled()) {
    try {
      const settings = await alertsDb.getChatSettings(chatId)
      if (settings) {
        const prefs: ChatAlertPrefs = {
          alertLevel: (settings.alertLevel as AlertLevel) || 'good_and_great',
          silenceUntil: settings.silenceUntil,
        }
        chatPrefs.set(chatId, prefs)
        prefsLoadedFromDb.add(chatId)
        return prefs
      }
    } catch (err) {
      logger.warn(`Erro ao carregar prefs do chat ${chatId}: ${err}`)
    }
  }

  prefsLoadedFromDb.add(chatId)
  return getChatAlertPrefs(chatId)
}

// Países que exigem visto de trânsito para brasileiros
const VISA_REQUIRED_COUNTRIES = new Set([
  'US', // Estados Unidos
  'CA', // Canadá
  'AU', // Austrália
  'CN', // China (trânsito sem visto só 144h em alguns aeroportos)
  'IN', // Índia
])

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', CA: '🇨🇦', AU: '🇦🇺', CN: '🇨🇳', IN: '🇮🇳',
}

function getVisaFlag(countryCode: string): string {
  return COUNTRY_FLAGS[countryCode] || '⚠️'
}

// Verifica se um voo transita por país que exige visto
function hasVisaRequiredTransit(flight: FlightResult): boolean {
  if (!flight.layovers || flight.layovers.length === 0) return false
  return flight.layovers.some((layover) => {
    const airport = getAirport(layover.airport)
    return airport ? VISA_REQUIRED_COUNTRIES.has(airport.country) : false
  })
}

interface DomesticLeg {
  price: number
  airline: string
  departureTime: string // horário de saída formatado (ex: "14:30")
}

interface DomesticConnection {
  outbound: DomesticLeg | null
  inbound: DomesticLeg | null
  totalPrice: number
}

interface TrendInfo {
  trend: 'up' | 'down' | 'stable'
  avg7d: number
  min7d: number
  sampleCount: number
}

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
  surcharge?: number // Custo real do trecho doméstico (buscado via Kiwi)
  homeOrigin?: string // Aeroporto base do usuário (ex: CNF)
  domesticConnection?: DomesticConnection // Detalhes dos voos domésticos
  trendInfo?: TrendInfo // Tendência de preços dos últimos 7 dias
  alternativeFlights?: FlightResult[] // Top 2-3 opções extras (diferentes do principal)
}

class PriceAlertService {
  private pricesDb = getPricesDbService()
  private alertsDb = getAlertsDbService()
  private routesDb = getRoutesDbService()

  // Dedup: evita re-notificar mesma rota+data se preço similar (dentro de 2%)
  private notifiedDeals = new Map<string, { price: number; timestamp: number }>()

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

  // Envia notificação de deal via Telegram (com dedup)
  private async sendDealNotification(deal: DetectedDeal): Promise<void> {
    const telegram = this.getTelegram()

    if (!telegram.enabled()) {
      logger.warn('Telegram não configurado - notificação não enviada')
      return
    }

    const chatId = deal.route.chatId
    if (!chatId || chatId === 0) {
      logger.warn(`Chat ID não configurado para rota ${deal.route.origin}->${deal.route.destination}`)
      return
    }

    // Verifica preferências de alerta do chat (carrega do DB se necessário)
    const prefs = await loadChatAlertPrefs(chatId)

    // Silenciado?
    if (prefs.silenceUntil && new Date() < prefs.silenceUntil) {
      logger.info(`🔇 Chat ${chatId} silenciado até ${prefs.silenceUntil.toLocaleDateString('pt-BR')}`)
      return
    }

    // Filtro de nível
    if (prefs.alertLevel === 'great_only' && deal.type !== 'great_price' && deal.type !== 'target_reached') {
      logger.info(`🔇 Chat ${chatId} quer só great_price, ignorando ${deal.type}`)
      return
    }
    if (prefs.alertLevel === 'good_and_great' && !['good_price', 'great_price', 'target_reached'].includes(deal.type)) {
      logger.info(`🔇 Chat ${chatId} quer good+great, ignorando ${deal.type}`)
      return
    }

    // Dedup: verifica se já notificamos preço similar para esta rota+data
    const effectivePrice = deal.flight.price + (deal.surcharge || 0)
    const depDate = String(deal.flight.departureDate).split(/[T ]/)[0]
    const dedupKey = `${deal.flight.origin}-${deal.flight.destination}-${depDate}-${chatId}`

    // 1. Check in-memory (fast, mesma instância)
    const memPrevious = this.notifiedDeals.get(dedupKey)
    if (memPrevious) {
      const priceDiff = Math.abs(effectivePrice - memPrevious.price) / memPrevious.price
      if (priceDiff < 0.02) {
        logger.info(`🔇 Dedup (mem): ${dedupKey} R$${effectivePrice} (~R$${memPrevious.price}, diff ${(priceDiff * 100).toFixed(1)}%) — pulando`)
        return
      }
    }

    // 2. Check Supabase (persistente, sobrevive a deploys)
    if (this.alertsDb.enabled()) {
      try {
        const dbPrevious = await this.alertsDb.findRecentNotification(
          deal.flight.origin, deal.flight.destination, depDate
        )
        if (dbPrevious) {
          const priceDiff = Math.abs(effectivePrice - dbPrevious.price) / dbPrevious.price
          if (priceDiff < 0.02) {
            logger.info(`🔇 Dedup (db): ${dedupKey} R$${effectivePrice} (~R$${dbPrevious.price}, diff ${(priceDiff * 100).toFixed(1)}%) — pulando`)
            this.notifiedDeals.set(dedupKey, { price: dbPrevious.price, timestamp: Date.now() })
            return
          }
        }
      } catch (error) {
        logger.warn(`Erro ao checar dedup no Supabase: ${error}`)
      }
    }

    const notification = this.formatNotification(deal)

    try {
      await telegram.sendAlert(chatId, notification)
      // Registra no dedup (memória + Supabase)
      this.notifiedDeals.set(dedupKey, { price: effectivePrice, timestamp: Date.now() })

      // Salva deal no Supabase com notified_at
      if (this.alertsDb.enabled()) {
        try {
          await this.alertsDb.saveDeal({
            routeId: deal.route.id,
            origin: deal.flight.origin,
            destination: deal.flight.destination,
            departureDate: deal.flight.departureDate,
            price: effectivePrice,
            airline: deal.flight.airline,
            stops: deal.flight.stops,
            deepLink: deal.flight.deepLink,
            dealType: deal.type,
            notifiedAt: new Date(),
          })
        } catch (err) {
          logger.warn(`Erro ao salvar deal no Supabase: ${err}`)
        }
      }

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
      NRT: ['HND', 'KIX'],
      HND: ['NRT', 'KIX'],
      KIX: ['NRT', 'HND'],
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

  // Busca voos domésticos reais (CNF→GRU ida + GRU→CNF volta)
  // Usa searchFlights (SerpAPI/Kiwi/Amadeus) — qualquer provider disponível
  // Filtra outbound: deve chegar no hub 4h antes do voo internacional
  private async findDomesticConnection(
    homeOrigin: string,
    hubAirport: string,
    internationalDeparture: string,
    stayDays: number,
  ): Promise<DomesticConnection | null> {
    const MIN_BUFFER_HOURS = 4

    try {
      // Parse horário do voo internacional
      const intlDepStr = String(internationalDeparture).replace(' ', 'T')
      const intlDepTime = new Date(intlDepStr)
      const latestArrival = new Date(intlDepTime.getTime() - MIN_BUFFER_HOURS * 3600000)

      // Data do voo (meia-noite)
      const outboundDate = new Date(intlDepTime)
      outboundDate.setHours(0, 0, 0, 0)

      // 1. Outbound: homeOrigin → hub (one-way, mesmo dia)
      logger.info(`🏠 Buscando doméstico ida: ${homeOrigin}→${hubAirport}`)
      const outboundSearch = await searchFlights({
        origin: homeOrigin,
        destination: hubAirport,
        departureDate: outboundDate,
      })

      // Filtra por horário: deve chegar antes do buffer
      const validOutbound = outboundSearch.results.filter((f) => {
        const dep = new Date(String(f.departureDate).replace(' ', 'T'))
        const arrival = new Date(dep.getTime() + f.duration * 60000)
        return arrival <= latestArrival
      })

      const bestOutbound = validOutbound[0] || null // já ordenado por preço

      // 2. Inbound: hub → homeOrigin (one-way, dia da volta)
      const returnDate = new Date(outboundDate)
      returnDate.setDate(returnDate.getDate() + stayDays)

      logger.info(`🏠 Buscando doméstico volta: ${hubAirport}→${homeOrigin}`)
      const inboundSearch = await searchFlights({
        origin: hubAirport,
        destination: homeOrigin,
        departureDate: returnDate,
      })

      const bestInbound = inboundSearch.results[0] || null

      const outPrice = bestOutbound?.price || 0
      const inPrice = bestInbound?.price || 0
      const totalPrice = outPrice + inPrice

      if (totalPrice === 0) return null

      // Formata horário de saída (ex: "14:30")
      const formatTime = (dateStr: string): string => {
        const timePart = dateStr.replace('T', ' ').split(' ')[1] || ''
        return timePart.slice(0, 5) // "HH:MM"
      }

      logger.info(
        `🏠 Trecho doméstico ${homeOrigin}↔${hubAirport}: R$${totalPrice} (ida R$${outPrice} + volta R$${inPrice})`
      )

      return {
        outbound: bestOutbound
          ? { price: bestOutbound.price, airline: bestOutbound.airline, departureTime: formatTime(String(bestOutbound.departureDate)) }
          : null,
        inbound: bestInbound
          ? { price: bestInbound.price, airline: bestInbound.airline, departureTime: formatTime(String(bestInbound.departureDate)) }
          : null,
        totalPrice,
      }
    } catch (error) {
      logger.warn(`Erro ao buscar trecho doméstico ${homeOrigin}↔${hubAirport}: ${error}`)
      return null
    }
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
    const isAlternativeOrigin = extra.surcharge > 0

    // Para origens alternativas: pre-filtra com estimativa, depois busca preço real
    let surcharge = extra.surcharge
    let domesticConnection: DomesticConnection | undefined

    if (isAlternativeOrigin) {
      // Pre-filtra com estimativa conservadora (R$300 mínimo doméstico i/v)
      const conservativeTotal = bestFlight.price + 300
      const preCheck = ratePriceVsBenchmark(extra.homeOrigin, route.destination, conservativeTotal)

      if (preCheck.rating === 'good' || preCheck.rating === 'great') {
        // Promissor! Busca preço real do trecho doméstico via Kiwi (grátis)
        const domestic = await this.findDomesticConnection(
          extra.homeOrigin,
          route.origin,
          String(bestFlight.departureDate),
          route.minStayDays || 19,
        )
        if (domestic) {
          surcharge = domestic.totalPrice
          domesticConnection = domestic
        }
      } else {
        // Nem com R$300 de doméstico é deal — pula
        logger.info(
          `📊 Preço ${preCheck.rating}: ${route.origin}->${route.destination} R$${conservativeTotal} estimado (avg: R$${preCheck.benchmark?.avgPrice})`
        )
        return deals
      }
    }

    // Preço efetivo = preço do voo + custo real do trecho doméstico
    const effectivePrice = bestFlight.price + surcharge

    // 1. PRINCIPAL: Verifica contra o BENCHMARK da origem BASE (ex: CNF, não GRU)
    const { rating, benchmark, percentVsAvg } = ratePriceVsBenchmark(
      extra.homeOrigin,
      route.destination,
      effectivePrice
    )

    // Busca tendência de preços (últimos 7 dias) do Supabase
    let trendInfo: TrendInfo | undefined
    if (this.pricesDb.enabled()) {
      try {
        const [avg7d, trend] = await Promise.all([
          this.pricesDb.getAvgPrice7Days(extra.homeOrigin, route.destination),
          this.pricesDb.getTrend(extra.homeOrigin, route.destination),
        ])
        if (avg7d && avg7d.sampleCount >= 3) {
          trendInfo = {
            trend,
            avg7d: avg7d.avgPrice,
            min7d: avg7d.minPrice,
            sampleCount: avg7d.sampleCount,
          }
        }
      } catch (error) {
        logger.warn(`Erro ao buscar tendência: ${error}`)
      }
    }

    // Seleciona até 2 voos alternativos (cia diferente ou sem EUA)
    const alternatives = this.pickAlternativeFlights(bestFlight, flights, 2)

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
          surcharge: surcharge || undefined,
          homeOrigin: isAlternativeOrigin ? extra.homeOrigin : undefined,
          domesticConnection,
          trendInfo,
          alternativeFlights: alternatives,
        })
        logger.info(
          `🔥 PROMOÇÃO EXCELENTE: ${route.origin}->${route.destination} R$${effectivePrice}${surcharge ? ` (voo R$${bestFlight.price} + doméstico R$${surcharge})` : ''} (benchmark great: R$${benchmark.greatPrice})`
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
          surcharge: surcharge || undefined,
          homeOrigin: isAlternativeOrigin ? extra.homeOrigin : undefined,
          domesticConnection,
          trendInfo,
          alternativeFlights: alternatives,
        })
        logger.info(
          `✅ Preço bom: ${route.origin}->${route.destination} R$${effectivePrice}${surcharge ? ` (voo R$${bestFlight.price} + doméstico R$${surcharge})` : ''} (benchmark good: R$${benchmark.goodPrice})`
        )
      } else {
        // Preço normal ou caro - apenas loga, não notifica
        logger.info(
          `📊 Preço ${rating}: ${route.origin}->${route.destination} R$${effectivePrice}${surcharge ? ` (voo R$${bestFlight.price} + doméstico R$${surcharge})` : ''} (avg: R$${benchmark.avgPrice})`
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

    // 3. Deal types secundários (só disparam se não houve good/great/target acima)
    //    Filtrados por alertLevel='all' no sendDealNotification
    const hasPrimaryDeal = deals.length > 0
    if (!hasPrimaryDeal && this.pricesDb.enabled()) {
      try {
        // 3a. LOWEST EVER — menor preço histórico de toda a base
        const lowest = await this.pricesDb.getLowestHistoricalPrice(extra.homeOrigin, route.destination)
        if (lowest && effectivePrice < lowest.lowestPrice) {
          deals.push({
            flight: bestFlight,
            route,
            type: 'lowest_ever',
            lowestPrice: lowest.lowestPrice,
            benchmarkAvg: benchmark?.avgPrice,
            benchmarkGood: benchmark?.goodPrice,
            benchmarkGreat: benchmark?.greatPrice,
            priceRating: rating,
            surcharge: surcharge || undefined,
            homeOrigin: isAlternativeOrigin ? extra.homeOrigin : undefined,
            domesticConnection,
            trendInfo,
            alternativeFlights: alternatives,
          })
          logger.info(
            `🏆 MENOR PREÇO HISTÓRICO: ${extra.homeOrigin}->${route.destination} R$${effectivePrice} (anterior: R$${lowest.lowestPrice})`
          )
        }

        // 3b. PRICE DROP — queda significativa vs média 7 dias
        if (deals.length === 0 && trendInfo && trendInfo.sampleCount >= 5) {
          const dropPercent = ((trendInfo.avg7d - effectivePrice) / trendInfo.avg7d) * 100
          if (dropPercent >= DEFAULT_DROP_PERCENT) {
            deals.push({
              flight: bestFlight,
              route,
              type: 'price_drop',
              previousPrice: trendInfo.avg7d,
              dropPercent,
              benchmarkAvg: benchmark?.avgPrice,
              benchmarkGood: benchmark?.goodPrice,
              benchmarkGreat: benchmark?.greatPrice,
              priceRating: rating,
              surcharge: surcharge || undefined,
              homeOrigin: isAlternativeOrigin ? extra.homeOrigin : undefined,
              domesticConnection,
              trendInfo,
              alternativeFlights: alternatives,
            })
            logger.info(
              `📉 QUEDA DE ${dropPercent.toFixed(0)}%: ${extra.homeOrigin}->${route.destination} R$${effectivePrice} (avg 7d: R$${trendInfo.avg7d})`
            )
          }
        }

        // 3c. TREND DOWN — tendência de queda consistente (3+ amostras caindo)
        if (deals.length === 0 && trendInfo && trendInfo.trend === 'down' && trendInfo.sampleCount >= 3) {
          deals.push({
            flight: bestFlight,
            route,
            type: 'trend_down',
            benchmarkAvg: benchmark?.avgPrice,
            benchmarkGood: benchmark?.goodPrice,
            benchmarkGreat: benchmark?.greatPrice,
            priceRating: rating,
            surcharge: surcharge || undefined,
            homeOrigin: isAlternativeOrigin ? extra.homeOrigin : undefined,
            domesticConnection,
            trendInfo,
            alternativeFlights: alternatives,
          })
          logger.info(
            `📊 TENDÊNCIA DE QUEDA: ${extra.homeOrigin}->${route.destination} R$${effectivePrice} (avg 7d: R$${trendInfo.avg7d})`
          )
        }
      } catch (error) {
        logger.warn(`Erro ao verificar deal types secundários: ${error}`)
      }
    }

    return deals
  }

  // Seleciona voos alternativos que agreguem valor (cia diferente, sem EUA, etc)
  private pickAlternativeFlights(best: FlightResult, all: FlightResult[], max: number): FlightResult[] {
    const bestUsTransit = hasVisaRequiredTransit(best)
    const alternatives: FlightResult[] = []
    const seenAirlines = new Set([best.airline])

    for (const f of all) {
      if (f.id === best.id) continue
      if (alternatives.length >= max) break

      // Prioriza: cia diferente OU sem trânsito EUA (quando o melhor passa pelos EUA)
      const isDiffAirline = !seenAirlines.has(f.airline)
      const isNoUs = bestUsTransit && !hasVisaRequiredTransit(f)

      if (isDiffAirline || isNoUs) {
        alternatives.push(f)
        seenAirlines.add(f.airline)
      }
    }

    return alternatives
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
    // costPerPoint: quanto custa comprar 1 ponto no mercado (R$)
    // typicalRedemption: quantos pontos tipicamente se gasta para emitir ida+volta Japan
    const POINTS_PROGRAMS = [
      { name: 'Smiles', costPerPoint: 0.019, typicalRedemption: 100000, transferBonus: 0 },
      { name: 'LATAM Pass', costPerPoint: 0.022, typicalRedemption: 110000, transferBonus: 0 },
      { name: 'Livelo', costPerPoint: 0.020, typicalRedemption: 120000, transferBonus: 0 },
    ] as const
    // Valor do ponto quando redimido: quanto cada ponto "vale" em R$ no resgate
    // Se preço_cash / pontos_necessários > custo_compra_ponto → vale comprar com dinheiro
    // Se preço_cash / pontos_necessários < custo_compra_ponto → vale usar pontos

    // Custo do trecho doméstico (se origem alternativa)
    const surcharge = deal.surcharge || 0
    const effectivePrice = price + surcharge
    const domestic = deal.domesticConnection

    // Monta mensagem
    let message = `${emoji} *${header}*\n`
    if (surcharge > 0) {
      message += `*R$ ${this.formatPrice(effectivePrice)}* por pessoa (custo total)\n\n`
      message += `✈️ *Voo internacional:* R$ ${this.formatPrice(price)}\n`
      if (domestic) {
        message += `🏠 *Trecho doméstico ${deal.homeOrigin || 'CNF'}↔${flight.origin}:* R$ ${this.formatPrice(domestic.totalPrice)}\n`
        if (domestic.outbound) {
          message += `  Ida: R$ ${this.formatPrice(domestic.outbound.price)} — ${domestic.outbound.airline} às ${domestic.outbound.departureTime}\n`
        }
        if (domestic.inbound) {
          message += `  Volta: R$ ${this.formatPrice(domestic.inbound.price)} — ${domestic.inbound.airline} às ${domestic.inbound.departureTime}\n`
        }
      } else {
        message += `🏠 *Trecho ${deal.homeOrigin || 'CNF'}→${flight.origin}:* ~R$ ${this.formatPrice(surcharge)} (estimativa)\n`
      }
      message += '\n'
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
    const visaTransit = hasVisaRequiredTransit(flight)
    if (flight.layovers && flight.layovers.length > 0) {
      message += `\n📍 *Conexões:*${visaTransit ? ' _requer visto de trânsito_' : ''}\n`
      for (const layover of flight.layovers) {
        const layoverAirport = getAirport(layover.airport)
        const needsVisa = layoverAirport && VISA_REQUIRED_COUNTRIES.has(layoverAirport.country)
        const flag = needsVisa ? ` ${getVisaFlag(layoverAirport!.country)}` : ''
        const layoverLabel = layoverAirport
          ? `${layoverAirport.city} (${layover.airport})`
          : layover.city || layover.airport
        const layoverHours = Math.floor(layover.duration / 60)
        const layoverMins = layover.duration % 60
        const layoverDur = layoverMins > 0 ? `${layoverHours}h${layoverMins}min` : `${layoverHours}h`
        message += `  • ${layoverLabel}${flag} — ${layoverDur}\n`
      }
    }
    message += '\n'

    // Comparação com benchmark (se disponível)
    if (deal.benchmarkAvg) {
      const diffPercent = ((deal.benchmarkAvg - effectivePrice) / deal.benchmarkAvg * 100).toFixed(0)
      message += `📊 *vs mercado:* ${diffPercent}% abaixo da média (R$ ${this.formatPrice(deal.benchmarkAvg)})\n`
    }

    // Tendência de preços (últimos 7 dias do Supabase)
    if (deal.trendInfo) {
      const trendArrow = deal.trendInfo.trend === 'down' ? '↘️' : deal.trendInfo.trend === 'up' ? '↗️' : '➡️'
      const trendLabel = deal.trendInfo.trend === 'down' ? 'caindo' : deal.trendInfo.trend === 'up' ? 'subindo' : 'estável'
      message += `${trendArrow} *Tendência 7d:* ${trendLabel} | mín R$ ${this.formatPrice(deal.trendInfo.min7d)} | média R$ ${this.formatPrice(deal.trendInfo.avg7d)} (${deal.trendInfo.sampleCount} amostras)\n`
    }
    message += '\n'

    // Preços por pessoa (custo total)
    message += `💰 *Custo total ida e volta, econômica:*\n`
    message += `  1p: *R$ ${this.formatPrice(effectivePrice)}*\n`
    message += `  2p: R$ ${this.formatPrice(effectivePrice * 2)}\n`
    message += `  4p: R$ ${this.formatPrice(effectivePrice * 4)}\n\n`

    // Equivalente em pontos por programa + análise "vale a pena?"
    message += `🎁 *Em pontos (1 pessoa):*\n`
    for (const prog of POINTS_PROGRAMS) {
      const pointsNeeded = Math.round(effectivePrice / prog.costPerPoint)
      // Valor do ponto no resgate = preço cash / pontos típicos para emitir
      const redemptionValue = effectivePrice / prog.typicalRedemption
      const verdict = redemptionValue > prog.costPerPoint ? '💰 _pontos valem mais_' : '💵 _dinheiro melhor_'
      message += `  ${prog.name}: ~${this.formatPoints(prog.typicalRedemption)} pts | ${verdict}\n`
      message += `    _(pt vale R$${redemptionValue.toFixed(3)} vs compra R$${prog.costPerPoint.toFixed(3)})_\n`
    }
    message += '\n'

    // Outras opções (top 3)
    if (deal.alternativeFlights && deal.alternativeFlights.length > 0) {
      message += `✈️ *Outras opções:*\n`
      for (const alt of deal.alternativeFlights) {
        const altHours = Math.floor(alt.duration / 60)
        const altMins = alt.duration % 60
        const altDur = altMins > 0 ? `${altHours}h${altMins}` : `${altHours}h`
        const altStops = alt.stops === 0 ? 'direto' : `${alt.stops}p`
        const altVisaCountries = alt.layovers?.map(l => getAirport(l.airport)).filter(a => a && VISA_REQUIRED_COUNTRIES.has(a.country))
        const altVisaFlag = altVisaCountries?.length ? ` ${getVisaFlag(altVisaCountries[0]!.country)}` : ''
        const altPrice = alt.price + surcharge
        message += `  • R$ ${this.formatPrice(altPrice)} — ${alt.airline} | ${altDur} | ${altStops}${altVisaFlag}\n`
      }
      message += '\n'
    }

    // Open-jaw: sugere combinação NRT/KIX quando aplicável
    const OPEN_JAW_PAIRS: Record<string, { alt: string; transport: string }> = {
      NRT: { alt: 'KIX', transport: 'shinkansen Tóquio→Osaka (~2h30)' },
      HND: { alt: 'KIX', transport: 'shinkansen Tóquio→Osaka (~2h30)' },
      KIX: { alt: 'NRT', transport: 'shinkansen Osaka→Tóquio (~2h30)' },
    }
    const ojPair = OPEN_JAW_PAIRS[flight.destination]
    if (ojPair && depParts) {
      const retDate = new Date(Number(depParts[0]), Number(depParts[1]) - 1, Number(depParts[2]))
      retDate.setDate(retDate.getDate() + 19)
      const retIso = `${retDate.getFullYear()}-${String(retDate.getMonth() + 1).padStart(2, '0')}-${String(retDate.getDate()).padStart(2, '0')}`
      const depIso = `${depParts[0]}-${depParts[1]}-${depParts[2]}`
      const ojOrigin = surcharge > 0 ? (deal.homeOrigin || flight.origin) : flight.origin
      const ojUrl = `https://www.google.com/travel/flights?q=Flights+from+${ojOrigin}+to+${flight.destination}+on+${depIso}+then+from+${ojPair.alt}+to+${ojOrigin}+on+${retIso}&curr=BRL&hl=pt-BR`
      message += `🔄 *Open-jaw:* Ida ${flight.destination}, volta ${ojPair.alt} (${ojPair.transport})\n`
      message += `  [Buscar multi-cidade no Google Flights](${ojUrl})\n\n`
    }

    // Janela de compra
    message += this.getPurchaseWindowAdvice(flight.departureDate)
    message += '\n\n'

    // Link direto para Google Flights
    if (flight.deepLink) {
      message += `🔗 [Ver no Google Flights](${flight.deepLink})`
    } else if (depParts) {
      // Gera link de busca no Google Flights como fallback
      const retDate = new Date(Number(depParts[0]), Number(depParts[1]) - 1, Number(depParts[2]))
      retDate.setDate(retDate.getDate() + 19)
      const retIso = `${retDate.getFullYear()}-${String(retDate.getMonth() + 1).padStart(2, '0')}-${String(retDate.getDate()).padStart(2, '0')}`
      const depIso = `${depParts[0]}-${depParts[1]}-${depParts[2]}`
      const gfUrl = `https://www.google.com/travel/flights?q=Flights+from+${flight.origin}+to+${flight.destination}+on+${depIso}+returning+${retIso}&curr=BRL&hl=pt-BR`
      message += `🔗 [Buscar no Google Flights](${gfUrl})`
    }

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

  // Retorna datas de busca alvo (configurável via ATLAS_DEPARTURE_DATES)
  // Formato: DD/MM ou DD/MM/YYYY separado por vírgula
  // Ex: ATLAS_DEPARTURE_DATES=28/11,29/11,30/11
  // Se data já passou no ano atual, usa o próximo ano
  private getSearchDates(): Date[] {
    const raw = process.env.ATLAS_DEPARTURE_DATES || '28/11,29/11,30/11'
    const now = new Date()
    const currentYear = now.getFullYear()

    const dates: Date[] = []
    for (const part of raw.split(',')) {
      const trimmed = part.trim()
      if (!trimmed) continue

      const segments = trimmed.split('/')
      if (segments.length < 2) continue

      const day = Number(segments[0])
      const month = Number(segments[1]) - 1 // JS months are 0-indexed
      const year = segments.length >= 3 ? Number(segments[2]) : currentYear

      if (isNaN(day) || isNaN(month) || isNaN(year)) continue

      let date = new Date(year, month, day)

      // Se a data já passou e o ano não foi explicitamente definido, usa o próximo ano
      if (date <= now && segments.length < 3) {
        date = new Date(currentYear + 1, month, day)
      }

      if (date > now) {
        dates.push(date)
      }
    }

    return dates
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
