import { format } from 'date-fns'
import type { FlightResult, FlightSearchParams } from '../types/index.js'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'

loadEnv()

const KIWI_BASE_URL = 'https://api.tequila.kiwi.com/v2'
const TIMEOUT_MS = 15000

interface KiwiSearchResponse {
  data: KiwiFlight[]
  currency: string
  _results: number
}

interface KiwiFlight {
  id: string
  flyFrom: string
  flyTo: string
  cityFrom: string
  cityTo: string
  price: number
  airlines: string[]
  route: KiwiRoute[]
  deep_link: string
  local_departure: string
  local_arrival: string
  duration: {
    departure: number
    return: number
    total: number
  }
}

interface KiwiRoute {
  flyFrom: string
  flyTo: string
  airline: string
  local_departure: string
  local_arrival: string
}

function getKiwiApiKey(): string | null {
  return (process.env.KIWI_API_KEY || '').trim() || null
}

export function isKiwiConfigured(): boolean {
  return getKiwiApiKey() !== null
}

export async function searchFlightsKiwi(params: FlightSearchParams): Promise<FlightResult[]> {
  const apiKey = getKiwiApiKey()
  if (!apiKey) {
    throw new Error('KIWI_API_KEY nao configurada')
  }

  const dateFrom = format(params.departureDate, 'dd/MM/yyyy')
  const dateTo = dateFrom // Busca em um dia especifico
  const returnFrom = params.returnDate ? format(params.returnDate, 'dd/MM/yyyy') : undefined
  const returnTo = returnFrom

  const queryParams = new URLSearchParams({
    fly_from: params.origin.toUpperCase(),
    fly_to: params.destination.toUpperCase(),
    date_from: dateFrom,
    date_to: dateTo,
    curr: 'BRL',
    locale: 'pt',
    adults: String(params.adults || 1),
    limit: '20',
    sort: 'price',
  })

  if (returnFrom && returnTo) {
    queryParams.set('return_from', returnFrom)
    queryParams.set('return_to', returnTo)
    queryParams.set('flight_type', 'round')
  } else {
    queryParams.set('flight_type', 'oneway')
  }

  if (params.directOnly) {
    queryParams.set('max_stopovers', '0')
  } else if (params.maxStops !== undefined) {
    queryParams.set('max_stopovers', String(params.maxStops))
  }

  if (params.cabinClass === 'business') {
    queryParams.set('selected_cabins', 'C')
  } else if (params.cabinClass === 'first') {
    queryParams.set('selected_cabins', 'F')
  } else {
    queryParams.set('selected_cabins', 'M')
  }

  const url = `${KIWI_BASE_URL}/search?${queryParams.toString()}`
  logger.apiCall('kiwi', '/search')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        apikey: apiKey,
        accept: 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Kiwi API error: ${response.status} - ${text.slice(0, 200)}`)
    }

    const data = (await response.json()) as KiwiSearchResponse

    return data.data.map((flight) => mapKiwiFlightToResult(flight, data.currency))
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Kiwi API timeout')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function mapKiwiFlightToResult(flight: KiwiFlight, currency: string): FlightResult {
  const stops = flight.route.length - 1
  const airline = flight.airlines.length > 0 ? flight.airlines.join(', ') : 'Unknown'

  // Extrai detalhes das paradas (layovers entre segmentos)
  const layovers: import('../types/index.js').Layover[] = []
  for (let i = 0; i < flight.route.length - 1; i++) {
    const arriving = flight.route[i]
    const departing = flight.route[i + 1]

    const arrivalTime = new Date(arriving.local_arrival).getTime()
    const departureTime = new Date(departing.local_departure).getTime()
    const layoverMinutes = Math.round((departureTime - arrivalTime) / 60000)

    layovers.push({
      airport: arriving.flyTo,
      duration: layoverMinutes > 0 ? layoverMinutes : 0,
    })
  }

  return {
    id: flight.id,
    origin: flight.flyFrom,
    destination: flight.flyTo,
    departureDate: flight.local_departure,
    price: flight.price,
    currency: currency,
    airline: airline,
    stops: stops,
    duration: Math.round(flight.duration.total / 60), // segundos para minutos
    layovers: layovers.length > 0 ? layovers : undefined,
    deepLink: flight.deep_link,
    provider: 'kiwi',
    fetchedAt: new Date(),
  }
}

// Busca de multidatas (para encontrar os melhores precos em um periodo)
export async function searchFlexibleDatesKiwi(
  origin: string,
  destination: string,
  startDate: Date,
  endDate: Date,
  returnDays?: { min: number; max: number }
): Promise<FlightResult[]> {
  const apiKey = getKiwiApiKey()
  if (!apiKey) {
    throw new Error('KIWI_API_KEY nao configurada')
  }

  const queryParams = new URLSearchParams({
    fly_from: origin.toUpperCase(),
    fly_to: destination.toUpperCase(),
    date_from: format(startDate, 'dd/MM/yyyy'),
    date_to: format(endDate, 'dd/MM/yyyy'),
    curr: 'BRL',
    locale: 'pt',
    adults: '1',
    limit: '50',
    sort: 'price',
    flight_type: returnDays ? 'round' : 'oneway',
  })

  if (returnDays) {
    queryParams.set('nights_in_dst_from', String(returnDays.min))
    queryParams.set('nights_in_dst_to', String(returnDays.max))
  }

  const url = `${KIWI_BASE_URL}/search?${queryParams.toString()}`
  logger.apiCall('kiwi', '/search (flexible)')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        apikey: apiKey,
        accept: 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Kiwi API error: ${response.status} - ${text.slice(0, 200)}`)
    }

    const data = (await response.json()) as KiwiSearchResponse

    return data.data.map((flight) => mapKiwiFlightToResult(flight, data.currency))
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Kiwi API timeout')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
