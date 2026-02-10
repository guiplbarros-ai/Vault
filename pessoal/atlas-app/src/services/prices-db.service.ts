import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js'
import type { PriceHistory, FlightResult } from '../types/index.js'
import { logger } from '../utils/logger.js'
import { normalizeIata } from '../utils/airports.js'
import { format, subDays } from 'date-fns'

interface DbPriceHistory {
  id: string
  route_id: string | null
  origin: string
  destination: string
  departure_date: string
  return_date: string | null
  price: number
  currency: string
  airline: string | null
  stops: number
  duration: number | null
  provider: string
  deep_link: string | null
  fetched_at: string
}

interface AvgPrices {
  origin: string
  destination: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  sampleCount: number
}

interface LowestPrice {
  origin: string
  destination: string
  lowestPrice: number
  airline: string | null
  departureDate: string
  fetchedAt: Date
}

function mapDbToPriceHistory(db: DbPriceHistory): PriceHistory {
  return {
    id: db.id,
    routeId: db.route_id || '',
    origin: db.origin,
    destination: db.destination,
    date: db.departure_date,
    price: db.price,
    currency: db.currency,
    provider: db.provider,
    fetchedAt: new Date(db.fetched_at),
  }
}

class PricesDbService {
  enabled(): boolean {
    return isSupabaseConfigured()
  }

  async savePrices(results: FlightResult[], routeId?: string): Promise<void> {
    if (results.length === 0) return

    const supabase = getSupabaseClient()

    // Filtra resultados com preço inválido (null, undefined, NaN, 0)
    const validResults = results.filter((r) => r.price != null && !isNaN(r.price) && r.price > 0)
    if (validResults.length === 0) {
      logger.warn(`Todos os ${results.length} resultados tinham preço inválido - nada salvo`)
      return
    }
    if (validResults.length < results.length) {
      logger.warn(`Filtrados ${results.length - validResults.length} resultados com preço inválido`)
    }

    const records = validResults.map((r) => ({
      route_id: routeId || null,
      origin: normalizeIata(r.origin),
      destination: normalizeIata(r.destination),
      departure_date: format(new Date(r.departureDate), 'yyyy-MM-dd'),
      price: r.price,
      currency: r.currency,
      airline: r.airline,
      stops: r.stops,
      duration: r.duration,
      provider: r.provider,
      deep_link: r.deepLink || null,
    }))

    const { error } = await supabase.from('atlas_price_history').insert(records)

    if (error) {
      logger.error(`Erro ao salvar precos: ${error.message}`)
      throw new Error(`Erro ao salvar precos: ${error.message}`)
    }

    logger.info(`Salvos ${records.length} precos no historico`)
  }

  async getRecentPrices(
    origin: string,
    destination: string,
    days: number = 7
  ): Promise<PriceHistory[]> {
    const supabase = getSupabaseClient()
    const since = subDays(new Date(), days).toISOString()

    const { data, error } = await supabase
      .from('atlas_price_history')
      .select('*')
      .eq('origin', normalizeIata(origin))
      .eq('destination', normalizeIata(destination))
      .gte('fetched_at', since)
      .order('fetched_at', { ascending: false })

    if (error) {
      logger.error(`Erro ao buscar historico de precos: ${error.message}`)
      return []
    }

    return (data as DbPriceHistory[]).map(mapDbToPriceHistory)
  }

  async getAvgPrice7Days(origin: string, destination: string): Promise<AvgPrices | null> {
    const supabase = getSupabaseClient()

    // Usar a view v_avg_prices_7d
    const { data, error } = await supabase
      .from('atlas_v_avg_prices_7d')
      .select('*')
      .eq('origin', normalizeIata(origin))
      .eq('destination', normalizeIata(destination))
      .single()

    if (error || !data) {
      return null
    }

    return {
      origin: data.origin,
      destination: data.destination,
      avgPrice: data.avg_price,
      minPrice: data.min_price,
      maxPrice: data.max_price,
      sampleCount: data.sample_count,
    }
  }

  async getLowestHistoricalPrice(origin: string, destination: string): Promise<LowestPrice | null> {
    const supabase = getSupabaseClient()

    // Usar a view v_lowest_prices
    const { data, error } = await supabase
      .from('atlas_v_lowest_prices')
      .select('*')
      .eq('origin', normalizeIata(origin))
      .eq('destination', normalizeIata(destination))
      .single()

    if (error || !data) {
      return null
    }

    return {
      origin: data.origin,
      destination: data.destination,
      lowestPrice: data.lowest_price,
      airline: data.airline,
      departureDate: data.departure_date,
      fetchedAt: new Date(data.fetched_at),
    }
  }

  async getTrend(origin: string, destination: string, days: number = 3): Promise<'up' | 'down' | 'stable'> {
    const prices = await this.getRecentPrices(origin, destination, days)

    if (prices.length < 3) return 'stable'

    // Pega as 3 mais recentes
    const recent = prices.slice(0, 3)
    const priceValues = recent.map((p) => p.price)

    // Verifica se esta caindo (cada preco maior que o anterior = tendencia de queda)
    const isDownTrend = priceValues.every((p, i) => {
      if (i === 0) return true
      return p > priceValues[i - 1] // preco anterior maior que atual
    })

    // Verifica se esta subindo
    const isUpTrend = priceValues.every((p, i) => {
      if (i === 0) return true
      return p < priceValues[i - 1] // preco anterior menor que atual
    })

    if (isDownTrend) return 'down'
    if (isUpTrend) return 'up'
    return 'stable'
  }

  // Retorna os melhores preços das últimas 24h para cada data de partida
  async getBestPricesLast24h(
    origin: string,
    destination: string
  ): Promise<Array<{
    departureDate: string
    price: number
    airline: string
    stops: number
    duration: number
    provider: string
  }>> {
    const supabase = getSupabaseClient()
    const since = subDays(new Date(), 1).toISOString()

    const { data, error } = await supabase
      .from('atlas_price_history')
      .select('departure_date, price, airline, stops, duration, provider')
      .eq('origin', normalizeIata(origin))
      .eq('destination', normalizeIata(destination))
      .gte('fetched_at', since)
      .order('price', { ascending: true })

    if (error) {
      logger.error(`Erro ao buscar melhores precos: ${error.message}`)
      return []
    }

    if (!data || data.length === 0) return []

    // Agrupa por data de partida e pega o menor preço de cada
    const bestByDate = new Map<string, typeof data[0]>()
    for (const row of data) {
      const date = row.departure_date
      if (!bestByDate.has(date) || row.price < bestByDate.get(date)!.price) {
        bestByDate.set(date, row)
      }
    }

    return Array.from(bestByDate.values()).map((row) => ({
      departureDate: row.departure_date,
      price: row.price,
      airline: row.airline || 'N/A',
      stops: row.stops,
      duration: row.duration || 0,
      provider: row.provider,
    }))
  }

  // Retorna os melhores preços da última semana para cada data de partida
  async getBestPricesLastWeek(
    origin: string,
    destination: string
  ): Promise<Array<{
    departureDate: string
    price: number
    airline: string
    stops: number
    duration: number
    provider: string
  }>> {
    const supabase = getSupabaseClient()
    const since = subDays(new Date(), 7).toISOString()

    const { data, error } = await supabase
      .from('atlas_price_history')
      .select('departure_date, price, airline, stops, duration, provider')
      .eq('origin', normalizeIata(origin))
      .eq('destination', normalizeIata(destination))
      .gte('fetched_at', since)
      .order('price', { ascending: true })

    if (error) {
      logger.error(`Erro ao buscar melhores precos da semana: ${error.message}`)
      return []
    }

    if (!data || data.length === 0) return []

    // Agrupa por data de partida e pega o menor preço de cada
    const bestByDate = new Map<string, typeof data[0]>()
    for (const row of data) {
      const date = row.departure_date
      if (!bestByDate.has(date) || row.price < bestByDate.get(date)!.price) {
        bestByDate.set(date, row)
      }
    }

    return Array.from(bestByDate.values()).map((row) => ({
      departureDate: row.departure_date,
      price: row.price,
      airline: row.airline || 'N/A',
      stops: row.stops,
      duration: row.duration || 0,
      provider: row.provider,
    }))
  }

  async cleanOldPrices(olderThanDays: number = 90): Promise<number> {
    const supabase = getSupabaseClient()
    const cutoff = subDays(new Date(), olderThanDays).toISOString()

    const { data, error } = await supabase
      .from('atlas_price_history')
      .delete()
      .lt('fetched_at', cutoff)
      .select('id')

    if (error) {
      logger.error(`Erro ao limpar precos antigos: ${error.message}`)
      return 0
    }

    const count = data?.length || 0
    if (count > 0) {
      logger.info(`Removidos ${count} registros de preco antigos`)
    }

    return count
  }
}

let instance: PricesDbService | null = null

export function getPricesDbService(): PricesDbService {
  if (!instance) {
    instance = new PricesDbService()
  }
  return instance
}
