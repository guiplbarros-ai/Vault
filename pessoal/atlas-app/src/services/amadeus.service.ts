import { format } from 'date-fns'
import type { FlightResult, FlightSearchParams } from '../types/index.js'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { getUsageDbService } from './usage-db.service.js'

loadEnv()

const AMADEUS_AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token'
const AMADEUS_SEARCH_URL = 'https://test.api.amadeus.com/v2/shopping/flight-offers'
const TIMEOUT_MS = 20000

interface AmadeusTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface AmadeusSearchResponse {
  data: AmadeusFlightOffer[]
  dictionaries?: {
    carriers?: Record<string, string>
  }
}

interface AmadeusFlightOffer {
  id: string
  price: {
    total: string
    currency: string
  }
  itineraries: AmadeusItinerary[]
  validatingAirlineCodes: string[]
}

interface AmadeusItinerary {
  duration: string
  segments: AmadeusSegment[]
}

interface AmadeusSegment {
  departure: { iataCode: string; at: string }
  arrival: { iataCode: string; at: string }
  carrierCode: string
  number: string
  duration: string
}

// Cache do token
let cachedToken: { token: string; expiresAt: number } | null = null

function getAmadeusConfig(): { apiKey: string; apiSecret: string } | null {
  const apiKey = (process.env.AMADEUS_API_KEY || '').trim()
  const apiSecret = (process.env.AMADEUS_API_SECRET || '').trim()
  if (!apiKey || !apiSecret) return null
  return { apiKey, apiSecret }
}

export function isAmadeusConfigured(): boolean {
  return getAmadeusConfig() !== null
}

async function getAccessToken(): Promise<string> {
  // Verifica cache
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }

  const config = getAmadeusConfig()
  if (!config) {
    throw new Error('Amadeus não configurado')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(AMADEUS_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.apiKey,
        client_secret: config.apiSecret,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Amadeus auth error: ${response.status} - ${text.slice(0, 200)}`)
    }

    const data = (await response.json()) as AmadeusTokenResponse

    // Cache o token (expira 5 min antes do tempo real)
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    }

    return data.access_token
  } finally {
    clearTimeout(timeout)
  }
}

export async function searchFlightsAmadeus(params: FlightSearchParams): Promise<FlightResult[]> {
  const token = await getAccessToken()
  const departureDate = format(params.departureDate, 'yyyy-MM-dd')

  const queryParams = new URLSearchParams({
    originLocationCode: params.origin.toUpperCase(),
    destinationLocationCode: params.destination.toUpperCase(),
    departureDate: departureDate,
    adults: String(params.adults || 1),
    travelClass: 'ECONOMY', // Apenas classe econômica
    currencyCode: 'BRL',
    max: '20',
  })

  if (params.returnDate) {
    queryParams.set('returnDate', format(params.returnDate, 'yyyy-MM-dd'))
  }

  if (params.directOnly) {
    queryParams.set('nonStop', 'true')
  }

  const url = `${AMADEUS_SEARCH_URL}?${queryParams.toString()}`
  logger.apiCall('amadeus', '/flight-offers')

  // Track usage
  const usageDb = getUsageDbService()
  await usageDb.trackCall('amadeus', '/flight-offers', {
    origin: params.origin,
    destination: params.destination,
    date: departureDate,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Amadeus API error: ${response.status} - ${text.slice(0, 200)}`)
    }

    const data = (await response.json()) as AmadeusSearchResponse
    const carriers = data.dictionaries?.carriers || {}

    return data.data.map((offer) => mapAmadeusOfferToResult(offer, params, carriers))
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Amadeus API timeout')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function mapAmadeusOfferToResult(
  offer: AmadeusFlightOffer,
  params: FlightSearchParams,
  carriers: Record<string, string>
): FlightResult {
  const firstItinerary = offer.itineraries[0]
  const segments = firstItinerary?.segments || []
  const firstSegment = segments[0]

  const carrierCode = offer.validatingAirlineCodes[0] || firstSegment?.carrierCode || 'Unknown'
  const airline = carriers[carrierCode] || carrierCode

  // Calcula stops
  const stops = segments.length - 1

  // Parse duration (PT10H30M -> minutos)
  const durationStr = firstItinerary?.duration || 'PT0H0M'
  const duration = parseDuration(durationStr)

  return {
    id: `amadeus-${offer.id}`,
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    departureDate: firstSegment?.departure.at || format(params.departureDate, 'yyyy-MM-dd'),
    price: parseFloat(offer.price.total),
    currency: offer.price.currency,
    airline: airline,
    stops: stops,
    duration: duration,
    provider: 'amadeus',
    fetchedAt: new Date(),
  }
}

function parseDuration(duration: string): number {
  // PT10H30M -> 630 minutos
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  return hours * 60 + minutes
}
