import { format } from 'date-fns'
import type { FlightResult, FlightSearchParams } from '../types/index.js'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { sanitizeApiError } from '../utils/sanitize.js'
import { getUsageDbService } from './usage-db.service.js'

loadEnv()

const SERPAPI_BASE_URL = 'https://serpapi.com/search'
const TIMEOUT_MS = 20000

interface SerpApiResponse {
  search_metadata: {
    status: string
    total_time_taken: number
  }
  best_flights?: SerpApiFlight[]
  other_flights?: SerpApiFlight[]
  price_insights?: {
    lowest_price: number
    typical_price_range: number[]
  }
  error?: string
}

interface SerpApiFlight {
  flights: SerpApiSegment[]
  total_duration: number
  price: number
  airline_logo?: string
  departure_token?: string
  type?: string
}

interface SerpApiSegment {
  departure_airport: { name: string; id: string; time: string }
  arrival_airport: { name: string; id: string; time: string }
  duration: number
  airplane: string
  airline: string
  airline_logo: string
  flight_number: string
  legroom?: string
  extensions?: string[]
}

function getSerpApiKey(): string | null {
  return (process.env.SERPAPI_API_KEY || '').trim() || null
}

export function isSerpApiConfigured(): boolean {
  return getSerpApiKey() !== null
}

// Custom error for budget exceeded
export class BudgetExceededError extends Error {
  constructor(
    public provider: string,
    public used: number,
    public limit: number
  ) {
    super(`Limite mensal de ${provider} atingido (${used}/${limit} calls)`)
    this.name = 'BudgetExceededError'
  }
}

export async function searchFlightsSerpApi(params: FlightSearchParams): Promise<FlightResult[]> {
  const apiKey = getSerpApiKey()
  if (!apiKey) {
    throw new Error('SERPAPI_API_KEY nao configurada')
  }

  // CHECK BUDGET BEFORE MAKING CALL
  const usageDb = getUsageDbService()
  const budgetCheck = await usageDb.checkBudget('serpapi')

  if (!budgetCheck.allowed) {
    logger.warn(`SerpAPI BLOQUEADO: ${budgetCheck.used}/${budgetCheck.limit} calls usados`)
    throw new BudgetExceededError('serpapi', budgetCheck.used, budgetCheck.limit)
  }

  // Log warning if approaching limit
  if (budgetCheck.warning) {
    logger.warn(budgetCheck.warning)
  }

  const outboundDate = format(params.departureDate, 'yyyy-MM-dd')
  const returnDate = params.returnDate ? format(params.returnDate, 'yyyy-MM-dd') : undefined

  const queryParams = new URLSearchParams({
    engine: 'google_flights',
    api_key: apiKey,
    departure_id: params.origin.toUpperCase(),
    arrival_id: params.destination.toUpperCase(),
    outbound_date: outboundDate,
    currency: 'BRL',
    hl: 'pt',
    gl: 'br',
    adults: String(params.adults || 1),
  })

  if (returnDate) {
    queryParams.set('return_date', returnDate)
    queryParams.set('type', '1') // Round trip
  } else {
    queryParams.set('type', '2') // One way
  }

  if (params.directOnly) {
    queryParams.set('stops', '0')
  } else if (params.maxStops !== undefined) {
    queryParams.set('stops', String(params.maxStops))
  }

  const url = `${SERPAPI_BASE_URL}?${queryParams.toString()}`
  logger.apiCall('serpapi', 'google_flights')

  // Track usage AFTER budget check passes
  await usageDb.trackCall('serpapi', 'google_flights', {
    origin: params.origin,
    destination: params.destination,
    date: outboundDate,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`SerpAPI error: ${response.status} - ${sanitizeApiError(text)}`)
    }

    const data = (await response.json()) as SerpApiResponse

    if (data.error) {
      throw new Error(`SerpAPI error: ${sanitizeApiError(String(data.error))}`)
    }

    const results: FlightResult[] = []

    // Best flights
    if (data.best_flights) {
      for (const flight of data.best_flights) {
        results.push(mapSerpApiFlightToResult(flight, params))
      }
    }

    // Other flights
    if (data.other_flights) {
      for (const flight of data.other_flights) {
        results.push(mapSerpApiFlightToResult(flight, params))
      }
    }

    return results
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('SerpAPI timeout')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function mapSerpApiFlightToResult(flight: SerpApiFlight, params: FlightSearchParams): FlightResult {
  const firstSegment = flight.flights[0]
  const lastSegment = flight.flights[flight.flights.length - 1]

  const stops = flight.flights.length - 1
  const airlines = [...new Set(flight.flights.map(s => s.airline).filter(Boolean))]
  const airline = airlines.join(', ') || 'Unknown'

  // Extrai detalhes das paradas (layovers entre segmentos)
  const layovers: import('../types/index.js').Layover[] = []
  for (let i = 0; i < flight.flights.length - 1; i++) {
    const arriving = flight.flights[i]
    const departing = flight.flights[i + 1]

    // Calcula duração da conexão a partir dos horários
    const arrivalTime = new Date(arriving.arrival_airport.time).getTime()
    const departureTime = new Date(departing.departure_airport.time).getTime()
    const layoverMinutes = Math.round((departureTime - arrivalTime) / 60000)

    layovers.push({
      airport: arriving.arrival_airport.id,
      city: arriving.arrival_airport.name,
      duration: layoverMinutes > 0 ? layoverMinutes : 0,
    })
  }

  // Deep link direto para o Google Flights (via departure_token)
  const deepLink = flight.departure_token
    ? `https://www.google.com/travel/flights/booking?tfs=${encodeURIComponent(flight.departure_token)}&curr=BRL&hl=pt-BR`
    : undefined

  return {
    id: `serpapi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    departureDate: firstSegment?.departure_airport.time || format(params.departureDate, 'yyyy-MM-dd'),
    price: flight.price,
    currency: 'BRL',
    airline: airline,
    stops: stops,
    duration: flight.total_duration,
    layovers: layovers.length > 0 ? layovers : undefined,
    deepLink,
    provider: 'serpapi',
    fetchedAt: new Date(),
  }
}

// Funcao para validar deal importante (usa SerpAPI para confirmar preco)
export async function validateDeal(
  origin: string,
  destination: string,
  date: Date,
  expectedPrice: number
): Promise<{ valid: boolean; actualPrice?: number; difference?: number }> {
  if (!isSerpApiConfigured()) {
    return { valid: true } // Se nao configurado, assume valido
  }

  try {
    const results = await searchFlightsSerpApi({
      origin,
      destination,
      departureDate: date,
    })

    if (results.length === 0) {
      return { valid: true } // Nao encontrou, assume valido
    }

    const lowestPrice = Math.min(...results.map((r) => r.price))
    const difference = Math.abs(lowestPrice - expectedPrice)
    const percentDiff = (difference / expectedPrice) * 100

    // Considera valido se diferenca for menor que 20%
    return {
      valid: percentDiff < 20,
      actualPrice: lowestPrice,
      difference: percentDiff,
    }
  } catch (error) {
    logger.warn(`Erro ao validar deal via SerpAPI: ${error}`)
    return { valid: true } // Em caso de erro, assume valido
  }
}
