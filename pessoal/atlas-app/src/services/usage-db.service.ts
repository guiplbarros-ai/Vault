import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js'
import { logger } from '../utils/logger.js'
import { startOfMonth, endOfMonth, format } from 'date-fns'

interface UsageStats {
  provider: string
  totalCalls: number
  totalCost: number
  period: string
}

interface MonthlyBudget {
  provider: string
  limit: number
  used: number
  remaining: number
  percentUsed: number
}

export interface BudgetCheckResult {
  allowed: boolean
  remaining: number
  limit: number
  used: number
  warning?: string
  blocked?: boolean
}

// Custo estimado por provider (USD)
const COST_PER_CALL: Record<string, number> = {
  amadeus: 0,    // Free tier
  serpapi: 0.01, // ~$0.01 per call
  kiwi: 0,       // Free (unlimited)
}

// Limite mensal de calls por provider
// Amadeus: 500 calls/mês (free tier)
// SerpAPI: 100 calls/mês (safe limit ~$1/mês)
// Para aumentar, configure ATLAS_SERPAPI_MONTHLY_LIMIT no .env
const MONTHLY_LIMITS: Record<string, number> = {
  amadeus: Number(process.env.ATLAS_AMADEUS_MONTHLY_LIMIT) || 500, // Free tier
  serpapi: Number(process.env.ATLAS_SERPAPI_MONTHLY_LIMIT) || 100, // Safe limit (~$1/mês)
  kiwi: 999999, // Unlimited
}

// Cache para evitar múltiplas notificações
const alertsSent: Record<string, { threshold: number; timestamp: number }> = {}

class UsageDbService {
  enabled(): boolean {
    return isSupabaseConfigured()
  }

  async trackCall(provider: string, endpoint?: string, metadata?: Record<string, unknown>): Promise<void> {
    if (!this.enabled()) return

    const supabase = getSupabaseClient()
    const cost = COST_PER_CALL[provider] || 0

    const { error } = await supabase.from('atlas_usage_events').insert({
      provider,
      endpoint,
      request_count: 1,
      cost,
      metadata,
    })

    if (error) {
      logger.warn(`Erro ao registrar uso: ${error.message}`)
    }
  }

  async getMonthlyUsage(provider?: string): Promise<UsageStats[]> {
    const supabase = getSupabaseClient()
    const start = startOfMonth(new Date()).toISOString()
    const end = endOfMonth(new Date()).toISOString()
    const period = format(new Date(), 'yyyy-MM')

    let query = supabase
      .from('atlas_usage_events')
      .select('provider, request_count, cost')
      .gte('created_at', start)
      .lte('created_at', end)

    if (provider) {
      query = query.eq('provider', provider)
    }

    const { data, error } = await query

    if (error) {
      logger.error(`Erro ao buscar uso: ${error.message}`)
      return []
    }

    // Agrupa por provider
    const grouped = (data || []).reduce((acc, row) => {
      const p = row.provider
      if (!acc[p]) {
        acc[p] = { totalCalls: 0, totalCost: 0 }
      }
      acc[p].totalCalls += row.request_count || 1
      acc[p].totalCost += row.cost || 0
      return acc
    }, {} as Record<string, { totalCalls: number; totalCost: number }>)

    return Object.entries(grouped).map(([provider, stats]) => ({
      provider,
      totalCalls: stats.totalCalls,
      totalCost: stats.totalCost,
      period,
    }))
  }

  async getBudgetStatus(): Promise<MonthlyBudget[]> {
    const usage = await this.getMonthlyUsage()
    const budgets: MonthlyBudget[] = []

    for (const [provider, limit] of Object.entries(MONTHLY_LIMITS)) {
      const stats = usage.find((u) => u.provider === provider)
      const used = stats?.totalCalls || 0
      const remaining = Math.max(0, limit - used)
      const percentUsed = limit > 0 ? (used / limit) * 100 : 0

      budgets.push({
        provider,
        limit,
        used,
        remaining,
        percentUsed,
      })
    }

    return budgets
  }

  async checkBudget(provider: string): Promise<BudgetCheckResult> {
    const limit = MONTHLY_LIMITS[provider] || 999999
    const usage = await this.getMonthlyUsage(provider)
    const used = usage[0]?.totalCalls || 0
    const remaining = limit - used
    const percentUsed = limit > 0 ? (used / limit) * 100 : 0

    // BLOQUEADO: Limite atingido
    if (remaining <= 0) {
      return {
        allowed: false,
        blocked: true,
        remaining: 0,
        limit,
        used,
        warning: `⛔ BLOQUEADO: Limite mensal de ${provider} atingido (${used}/${limit} calls). Usando fallback gratuito.`,
      }
    }

    // ALERTA CRÍTICO: < 10% restante
    if (remaining <= limit * 0.1) {
      return {
        allowed: true,
        remaining,
        limit,
        used,
        warning: `⚠️ CRÍTICO: Apenas ${remaining} calls restantes de ${provider} (${percentUsed.toFixed(0)}% usado)`,
      }
    }

    // ALERTA: < 20% restante
    if (remaining <= limit * 0.2) {
      return {
        allowed: true,
        remaining,
        limit,
        used,
        warning: `⚠️ Atenção: ${remaining} calls restantes de ${provider} (${percentUsed.toFixed(0)}% usado)`,
      }
    }

    return { allowed: true, remaining, limit, used }
  }

  // Verifica se deve enviar alerta (evita spam)
  shouldSendAlert(provider: string, threshold: number): boolean {
    const key = `${provider}-${threshold}`
    const now = Date.now()
    const lastAlert = alertsSent[key]

    // Envia apenas 1 alerta por threshold por dia
    const oneDay = 24 * 60 * 60 * 1000
    if (lastAlert && now - lastAlert.timestamp < oneDay) {
      return false
    }

    alertsSent[key] = { threshold, timestamp: now }
    return true
  }

  // Formata mensagem de status do budget para Telegram
  formatBudgetAlert(result: BudgetCheckResult, provider: string): string {
    const costPerCall = COST_PER_CALL[provider] || 0
    const totalSpent = (result.used * costPerCall).toFixed(2)
    const totalBudget = (result.limit * costPerCall).toFixed(2)

    let message = result.warning || ''
    message += `\n\n📊 Status ${provider.toUpperCase()}:`
    message += `\n• Usado: ${result.used}/${result.limit} calls`
    message += `\n• Custo: $${totalSpent}/$${totalBudget}`
    message += `\n• Restante: ${result.remaining} calls`

    if (result.blocked) {
      message += `\n\n💡 Usando Kiwi (gratuito) como fallback.`
      message += `\nPara aumentar limite, configure ATLAS_SERPAPI_MONTHLY_LIMIT`
    }

    return message
  }

  setMonthlyLimit(provider: string, limit: number): void {
    MONTHLY_LIMITS[provider] = limit
  }

  getMonthlyLimit(provider: string): number {
    return MONTHLY_LIMITS[provider] || 999999
  }
}

let instance: UsageDbService | null = null

export function getUsageDbService(): UsageDbService {
  if (!instance) {
    instance = new UsageDbService()
  }
  return instance
}
