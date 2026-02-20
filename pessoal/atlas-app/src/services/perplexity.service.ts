import { format } from 'date-fns'
import type { FlightResult, FlightSearchParams } from '../types/index.js'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { getUsageDbService } from './usage-db.service.js'

loadEnv()

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions'
const TIMEOUT_MS = 30000

interface PerplexityResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
  }
}

interface PerplexityFlightData {
  flights: Array<{
    price_brl: number
    airline: string
    stops: number
    duration_minutes?: number
    departure_date?: string
  }>
}

function getPerplexityKey(): string | null {
  return (process.env.PERPLEXITY_API_KEY || '').trim() || null
}

export function isPerplexityConfigured(): boolean {
  return getPerplexityKey() !== null
}

export async function searchFlightsPerplexity(params: FlightSearchParams): Promise<FlightResult[]> {
  const apiKey = getPerplexityKey()
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY nao configurada')
  }

  // Check budget before calling
  const usageDb = getUsageDbService()
  const budgetCheck = await usageDb.checkBudget('perplexity')
  if (!budgetCheck.allowed) {
    logger.warn(`Perplexity BLOQUEADO: ${budgetCheck.used}/${budgetCheck.limit} calls`)
    throw new Error(`Perplexity: limite mensal atingido (${budgetCheck.used}/${budgetCheck.limit})`)
  }

  const outboundDate = format(params.departureDate, 'yyyy-MM-dd')
  const returnDate = params.returnDate ? format(params.returnDate, 'yyyy-MM-dd') : null

  const tripType = returnDate ? `round-trip departing ${outboundDate} returning ${returnDate}` : `one-way departing ${outboundDate}`

  const prompt = `Find the 5 cheapest ${tripType} flights from ${params.origin} to ${params.destination}. Prices must be in BRL (Brazilian Reais). For each flight include: price in BRL, airline name, number of stops, and total duration in minutes if available.`

  const schema = {
    type: 'object' as const,
    properties: {
      flights: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            price_brl: { type: 'number' as const },
            airline: { type: 'string' as const },
            stops: { type: 'integer' as const },
            duration_minutes: { type: 'integer' as const },
            departure_date: { type: 'string' as const },
          },
          required: ['price_brl', 'airline', 'stops'],
          additionalProperties: false,
        },
      },
    },
    required: ['flights'],
    additionalProperties: false,
  }

  logger.apiCall('perplexity', 'sonar')

  // Track usage
  await usageDb.trackCall('perplexity', 'sonar', {
    origin: params.origin,
    destination: params.destination,
    date: outboundDate,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a flight search assistant. Return only structured JSON data about real flight prices. All prices must be in BRL (Brazilian Reais). Be precise with airline names and stop counts.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'flight_search',
            schema,
            strict: true,
          },
        },
        search_domain_filter: ['google.com/travel', 'skyscanner.com', 'kayak.com.br'],
        search_recency_filter: 'day',
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Perplexity error: ${response.status} - ${text.slice(0, 200)}`)
    }

    const data = (await response.json()) as PerplexityResponse

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      logger.warn('Perplexity: resposta vazia')
      return []
    }

    const parsed = JSON.parse(content) as PerplexityFlightData

    if (!parsed.flights || !Array.isArray(parsed.flights)) {
      logger.warn('Perplexity: formato invalido')
      return []
    }

    return parsed.flights
      .filter((f) => f.price_brl > 0 && f.airline)
      .map((f) => ({
        id: `perplexity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        origin: params.origin.toUpperCase(),
        destination: params.destination.toUpperCase(),
        departureDate: f.departure_date || outboundDate,
        price: f.price_brl,
        currency: 'BRL',
        airline: f.airline,
        stops: f.stops || 0,
        duration: f.duration_minutes || 0,
        provider: 'perplexity' as const,
        fetchedAt: new Date(),
      }))
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Perplexity timeout')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
