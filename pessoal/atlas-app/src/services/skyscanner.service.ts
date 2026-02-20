import { format } from 'date-fns'
import type { FlightResult, FlightSearchParams, Layover } from '../types/index.js'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'

loadEnv()

const BASE_URL = 'https://sky-scrapper.p.rapidapi.com/api/v1/flights'
const TIMEOUT_MS = 20000

// Cache de IATA → entityId (evita gastar calls do free tier)
const entityIdCache = new Map<string, { skyId: string; entityId: string }>()

interface AirportSearchResult {
  data?: Array<{
    skyId: string
    entityId: string
    presentation?: {
      title?: string
      subtitle?: string
    }
    navigation?: {
      entityType?: string
    }
  }>
}

interface SkyscannerResponse {
  status?: boolean
  data?: {
    context?: {
      status?: string
      totalResults?: number
    }
    itineraries?: Array<{
      id: string
      price: {
        raw: number
        formatted: string
      }
      legs: Array<{
        id: string
        origin: {
          id: string
          name: string
          city: string
        }
        destination: {
          id: string
          name: string
          city: string
        }
        durationInMinutes: number
        stopCount: number
        departure: string
        arrival: string
        carriers: {
          marketing: Array<{
            id: number
            name: string
            logoUrl?: string
          }>
        }
        segments: Array<{
          origin: { flightPlaceId: string; name: string }
          destination: { flightPlaceId: string; name: string }
          departure: string
          arrival: string
          durationInMinutes: number
          marketingCarrier: { name: string }
          flightNumber: string
        }>
      }>
    }>
  }
}

function getRapidApiKey(): string | null {
  return (process.env.RAPIDAPI_KEY || '').trim() || null
}

export function isSkyscannerConfigured(): boolean {
  return getRapidApiKey() !== null
}

async function getEntityId(iata: string): Promise<{ skyId: string; entityId: string } | null> {
  const key = iata.toUpperCase()
  if (entityIdCache.has(key)) return entityIdCache.get(key)!

  const apiKey = getRapidApiKey()
  if (!apiKey) return null

  const url = `${BASE_URL}/searchAirport?query=${key}&locale=pt-BR`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Skyscanner searchAirport: ${response.status}`)
    }

    const data = (await response.json()) as AirportSearchResult

    if (!data.data || data.data.length === 0) {
      logger.warn(`Skyscanner: aeroporto ${key} nao encontrado`)
      return null
    }

    // Filtra pelo aeroporto exato (AIRPORT com skyId === IATA), senão usa o primeiro
    const exact = data.data.find(
      (d) => d.navigation?.entityType === 'AIRPORT' && d.skyId.toUpperCase() === key
    )
    const best = exact || data.data[0]
    const result = { skyId: best.skyId, entityId: best.entityId }
    entityIdCache.set(key, result)
    logger.info(`Skyscanner: cache entityId ${key} → ${result.entityId}`)
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Skyscanner searchAirport timeout')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function searchFlightsSkyscanner(params: FlightSearchParams): Promise<FlightResult[]> {
  const apiKey = getRapidApiKey()
  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY nao configurada')
  }

  // Resolve entityIds (usa cache quando possível)
  const [originEntity, destEntity] = await Promise.all([
    getEntityId(params.origin),
    getEntityId(params.destination),
  ])

  if (!originEntity || !destEntity) {
    throw new Error(`Skyscanner: aeroporto nao encontrado (${params.origin} ou ${params.destination})`)
  }

  const outboundDate = format(params.departureDate, 'yyyy-MM-dd')
  const returnDate = params.returnDate ? format(params.returnDate, 'yyyy-MM-dd') : undefined

  const queryParams = new URLSearchParams({
    originSkyId: originEntity.skyId,
    destinationSkyId: destEntity.skyId,
    originEntityId: originEntity.entityId,
    destinationEntityId: destEntity.entityId,
    date: outboundDate,
    adults: String(params.adults || 1),
    currency: 'BRL',
    market: 'BR',
    locale: 'pt-BR',
    cabinClass: params.cabinClass || 'economy',
  })

  if (returnDate) {
    queryParams.set('returnDate', returnDate)
  }

  const url = `${BASE_URL}/searchFlights?${queryParams.toString()}`
  logger.apiCall('skyscanner', 'searchFlights')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Skyscanner error: ${response.status} - ${text.slice(0, 200)}`)
    }

    const data = (await response.json()) as SkyscannerResponse

    if (data.data?.context?.status === 'failure') {
      throw new Error('Skyscanner: busca retornou failure (rate limit do free tier)')
    }

    if (!data.data?.itineraries || data.data.itineraries.length === 0) {
      return []
    }

    return data.data.itineraries.map((itinerary) => mapSkyscannerToResult(itinerary, params))
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Skyscanner searchFlights timeout')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function mapSkyscannerToResult(
  itinerary: NonNullable<NonNullable<SkyscannerResponse['data']>['itineraries']>[0],
  params: FlightSearchParams
): FlightResult {
  const firstLeg = itinerary.legs[0]
  const airlines = firstLeg.carriers.marketing.map((c) => c.name)
  const airline = [...new Set(airlines)].join(', ') || 'Unknown'

  // Layovers: entre segmentos do primeiro leg
  const layovers: Layover[] = []
  if (firstLeg.segments.length > 1) {
    for (let i = 0; i < firstLeg.segments.length - 1; i++) {
      const arriving = firstLeg.segments[i]
      const departing = firstLeg.segments[i + 1]

      const arrTime = new Date(arriving.arrival).getTime()
      const depTime = new Date(departing.departure).getTime()
      const layoverMinutes = Math.round((depTime - arrTime) / 60000)

      layovers.push({
        airport: arriving.destination.flightPlaceId,
        city: arriving.destination.name,
        duration: layoverMinutes > 0 ? layoverMinutes : 0,
      })
    }
  }

  return {
    id: `skyscanner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    departureDate: firstLeg.departure || format(params.departureDate, 'yyyy-MM-dd'),
    price: itinerary.price.raw,
    currency: 'BRL',
    airline,
    stops: firstLeg.stopCount,
    duration: firstLeg.durationInMinutes,
    layovers: layovers.length > 0 ? layovers : undefined,
    provider: 'skyscanner',
    fetchedAt: new Date(),
  }
}
