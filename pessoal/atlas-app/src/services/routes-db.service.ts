import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js'
import type { MonitoredRoute } from '../types/index.js'
import { logger } from '../utils/logger.js'
import { normalizeIata } from '../utils/airports.js'

interface DbRoute {
  id: string
  chat_id: number
  origin: string
  destination: string
  is_round_trip: boolean
  min_stay_days: number | null
  max_stay_days: number | null
  target_price: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

function mapDbToRoute(db: DbRoute): MonitoredRoute {
  return {
    id: db.id,
    chatId: db.chat_id,
    origin: db.origin,
    destination: db.destination,
    isRoundTrip: db.is_round_trip,
    minStayDays: db.min_stay_days ?? undefined,
    maxStayDays: db.max_stay_days ?? undefined,
    targetPrice: db.target_price ?? undefined,
    isActive: db.is_active,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  }
}

class RoutesDbService {
  enabled(): boolean {
    return isSupabaseConfigured()
  }

  async addRoute(
    chatId: number,
    origin: string,
    destination: string,
    options?: {
      isRoundTrip?: boolean
      minStayDays?: number
      maxStayDays?: number
      targetPrice?: number
    }
  ): Promise<MonitoredRoute> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('atlas_monitored_routes')
      .upsert(
        {
          chat_id: chatId,
          origin: normalizeIata(origin),
          destination: normalizeIata(destination),
          is_round_trip: options?.isRoundTrip ?? true,
          min_stay_days: options?.minStayDays,
          max_stay_days: options?.maxStayDays,
          target_price: options?.targetPrice,
          is_active: true,
        },
        { onConflict: 'chat_id,origin,destination' }
      )
      .select()
      .single()

    if (error) {
      logger.error(`Erro ao adicionar rota: ${error.message}`)
      throw new Error(`Erro ao adicionar rota: ${error.message}`)
    }

    return mapDbToRoute(data as DbRoute)
  }

  async removeRoute(chatId: number, origin: string, destination: string): Promise<boolean> {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('atlas_monitored_routes')
      .update({ is_active: false })
      .eq('chat_id', chatId)
      .eq('origin', normalizeIata(origin))
      .eq('destination', normalizeIata(destination))

    if (error) {
      logger.error(`Erro ao remover rota: ${error.message}`)
      return false
    }

    return true
  }

  async getRoutesByChat(chatId: number): Promise<MonitoredRoute[]> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('atlas_monitored_routes')
      .select('*')
      .eq('chat_id', chatId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error(`Erro ao buscar rotas: ${error.message}`)
      return []
    }

    return (data as DbRoute[]).map(mapDbToRoute)
  }

  async getAllActiveRoutes(): Promise<MonitoredRoute[]> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('atlas_monitored_routes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error(`Erro ao buscar todas as rotas: ${error.message}`)
      return []
    }

    return (data as DbRoute[]).map(mapDbToRoute)
  }

  async getRoute(chatId: number, origin: string, destination: string): Promise<MonitoredRoute | null> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('atlas_monitored_routes')
      .select('*')
      .eq('chat_id', chatId)
      .eq('origin', normalizeIata(origin))
      .eq('destination', normalizeIata(destination))
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }

    return mapDbToRoute(data as DbRoute)
  }

  async updateTargetPrice(
    chatId: number,
    origin: string,
    destination: string,
    targetPrice: number | null
  ): Promise<boolean> {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('atlas_monitored_routes')
      .update({ target_price: targetPrice })
      .eq('chat_id', chatId)
      .eq('origin', normalizeIata(origin))
      .eq('destination', normalizeIata(destination))

    if (error) {
      logger.error(`Erro ao atualizar preco alvo: ${error.message}`)
      return false
    }

    return true
  }

  async updateStayDays(
    chatId: number,
    origin: string,
    destination: string,
    stayDays: number
  ): Promise<boolean> {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('atlas_monitored_routes')
      .update({ min_stay_days: stayDays })
      .eq('chat_id', chatId)
      .eq('origin', normalizeIata(origin))
      .eq('destination', normalizeIata(destination))

    if (error) {
      logger.error(`Erro ao atualizar estadia: ${error.message}`)
      return false
    }

    return true
  }
}

let instance: RoutesDbService | null = null

export function getRoutesDbService(): RoutesDbService {
  if (!instance) {
    instance = new RoutesDbService()
  }
  return instance
}
