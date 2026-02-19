import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js'
import type { PriceAlert, ChatSettings, FlightDeal } from '../types/index.js'
import { logger } from '../utils/logger.js'
import { normalizeIata } from '../utils/airports.js'
import { format } from 'date-fns'

interface DbPriceAlert {
  id: string
  chat_id: number
  route_id: string | null
  origin: string | null
  destination: string | null
  max_price: number | null
  min_drop_percent: number
  notify_lowest_ever: boolean
  notify_trend_down: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

interface DbChatSettings {
  chat_id: number
  digest_enabled: boolean
  digest_time: string | null
  timezone: string
  language: string
  created_at: string
  updated_at: string
}

interface DbFlightDeal {
  id: string
  route_id: string | null
  origin: string
  destination: string
  departure_date: string
  return_date: string | null
  price: number
  previous_price: number | null
  drop_percent: number | null
  airline: string | null
  stops: number
  deep_link: string | null
  deal_type: string
  notified_at: string | null
  created_at: string
}

function mapDbToAlert(db: DbPriceAlert): PriceAlert {
  return {
    id: db.id,
    chatId: db.chat_id,
    routeId: db.route_id ?? undefined,
    origin: db.origin ?? undefined,
    destination: db.destination ?? undefined,
    maxPrice: db.max_price ?? undefined,
    minDropPercent: db.min_drop_percent,
    notifyLowestEver: db.notify_lowest_ever,
    notifyTrendDown: db.notify_trend_down,
    isActive: db.is_active,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  }
}

function mapDbToSettings(db: DbChatSettings): ChatSettings {
  return {
    chatId: db.chat_id,
    digestEnabled: db.digest_enabled,
    digestTime: db.digest_time ?? undefined,
    timezone: db.timezone,
    language: db.language,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  }
}

function mapDbToDeal(db: DbFlightDeal): FlightDeal {
  return {
    id: db.id,
    routeId: db.route_id ?? undefined,
    origin: db.origin,
    destination: db.destination,
    departureDate: db.departure_date,
    returnDate: db.return_date ?? undefined,
    price: db.price,
    previousPrice: db.previous_price ?? undefined,
    dropPercent: db.drop_percent ?? undefined,
    airline: db.airline || '',
    stops: db.stops,
    deepLink: db.deep_link ?? undefined,
    dealType: db.deal_type as FlightDeal['dealType'],
    notifiedAt: db.notified_at ? new Date(db.notified_at) : undefined,
    createdAt: new Date(db.created_at),
  }
}

class AlertsDbService {
  enabled(): boolean {
    return isSupabaseConfigured()
  }

  // Price Alerts
  async createAlert(
    chatId: number,
    options: {
      routeId?: string
      origin?: string
      destination?: string
      maxPrice?: number
      minDropPercent?: number
    }
  ): Promise<PriceAlert> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('atlas_price_alerts')
      .insert({
        chat_id: chatId,
        route_id: options.routeId || null,
        origin: options.origin ? normalizeIata(options.origin) : null,
        destination: options.destination ? normalizeIata(options.destination) : null,
        max_price: options.maxPrice || null,
        min_drop_percent: options.minDropPercent ?? 15,
        notify_lowest_ever: true,
        notify_trend_down: true,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar alerta: ${error.message}`)
    }

    return mapDbToAlert(data as DbPriceAlert)
  }

  async getAlertsByChat(chatId: number): Promise<PriceAlert[]> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('atlas_price_alerts')
      .select('*')
      .eq('chat_id', chatId)
      .eq('is_active', true)

    if (error) {
      logger.error(`Erro ao buscar alertas: ${error.message}`)
      return []
    }

    return (data as DbPriceAlert[]).map(mapDbToAlert)
  }

  async getActiveAlerts(): Promise<PriceAlert[]> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('atlas_price_alerts')
      .select('*')
      .eq('is_active', true)

    if (error) {
      logger.error(`Erro ao buscar alertas ativos: ${error.message}`)
      return []
    }

    return (data as DbPriceAlert[]).map(mapDbToAlert)
  }

  async deactivateAlert(alertId: string): Promise<boolean> {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('atlas_price_alerts')
      .update({ is_active: false })
      .eq('id', alertId)

    return !error
  }

  // Chat Settings
  async getChatSettings(chatId: number): Promise<ChatSettings | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('atlas_chat_settings')
      .select('*')
      .eq('chat_id', chatId)
      .single()

    if (error || !data) {
      return null
    }

    return mapDbToSettings(data as DbChatSettings)
  }

  async upsertChatSettings(
    chatId: number,
    settings: Partial<{
      digestEnabled: boolean
      digestTime: string
      timezone: string
    }>
  ): Promise<ChatSettings> {
    const supabase = getSupabaseClient()

    const updateData: Record<string, unknown> = {}
    if (settings.digestEnabled !== undefined) updateData.digest_enabled = settings.digestEnabled
    if (settings.digestTime !== undefined) updateData.digest_time = settings.digestTime
    if (settings.timezone !== undefined) updateData.timezone = settings.timezone

    const { data, error } = await supabase
      .from('atlas_chat_settings')
      .upsert({
        chat_id: chatId,
        ...updateData,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao salvar configuracoes: ${error.message}`)
    }

    return mapDbToSettings(data as DbChatSettings)
  }

  async getChatsWithDigestEnabled(): Promise<ChatSettings[]> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('atlas_chat_settings')
      .select('*')
      .eq('digest_enabled', true)

    if (error) {
      logger.error(`Erro ao buscar chats com digest: ${error.message}`)
      return []
    }

    return (data as DbChatSettings[]).map(mapDbToSettings)
  }

  // Flight Deals
  async saveDeal(deal: Omit<FlightDeal, 'id' | 'createdAt'>): Promise<FlightDeal> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('atlas_flight_deals')
      .insert({
        route_id: deal.routeId || null,
        origin: normalizeIata(deal.origin),
        destination: normalizeIata(deal.destination),
        departure_date: deal.departureDate,
        return_date: deal.returnDate || null,
        price: deal.price,
        previous_price: deal.previousPrice || null,
        drop_percent: deal.dropPercent || null,
        airline: deal.airline || null,
        stops: deal.stops,
        deep_link: deal.deepLink || null,
        deal_type: deal.dealType,
        notified_at: deal.notifiedAt ? deal.notifiedAt.toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao salvar deal: ${error.message}`)
    }

    return mapDbToDeal(data as DbFlightDeal)
  }

  async markDealNotified(dealId: string): Promise<void> {
    const supabase = getSupabaseClient()

    await supabase
      .from('atlas_flight_deals')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', dealId)
  }

  // Dedup: busca deal notificado recentemente para mesma rota+data
  async findRecentNotification(
    origin: string,
    destination: string,
    departureDate: string,
    maxAgeHours: number = 12,
  ): Promise<FlightDeal | null> {
    const supabase = getSupabaseClient()
    const since = new Date(Date.now() - maxAgeHours * 3600000).toISOString()
    const depDate = departureDate.split(/[T ]/)[0] // YYYY-MM-DD only

    const { data, error } = await supabase
      .from('atlas_flight_deals')
      .select('*')
      .eq('origin', normalizeIata(origin))
      .eq('destination', normalizeIata(destination))
      .eq('departure_date', depDate)
      .not('notified_at', 'is', null)
      .gte('notified_at', since)
      .order('notified_at', { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) return null
    return mapDbToDeal(data[0] as DbFlightDeal)
  }

  async getRecentDeals(hours: number = 24): Promise<FlightDeal[]> {
    const supabase = getSupabaseClient()
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('atlas_flight_deals')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error(`Erro ao buscar deals recentes: ${error.message}`)
      return []
    }

    return (data as DbFlightDeal[]).map(mapDbToDeal)
  }
}

let instance: AlertsDbService | null = null

export function getAlertsDbService(): AlertsDbService {
  if (!instance) {
    instance = new AlertsDbService()
  }
  return instance
}
