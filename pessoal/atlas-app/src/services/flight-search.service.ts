import type { FlightResult, FlightSearchParams } from '../types/index.js'
import { searchFlightsKiwi, isKiwiConfigured, searchFlexibleDatesKiwi } from './kiwi.service.js'
import { searchFlightsSerpApi, isSerpApiConfigured, BudgetExceededError } from './serpapi.service.js'
import { searchFlightsAmadeus, isAmadeusConfigured } from './amadeus.service.js'
import { getUsageDbService } from './usage-db.service.js'
import { logger } from '../utils/logger.js'
import { formatRoute } from '../utils/airports.js'
import { formatDate } from '../utils/date.js'

export interface SearchResult {
  results: FlightResult[]
  providers: string[]
  lowestPrice?: FlightResult
  errors: string[]
  budgetWarning?: string
}

export async function searchFlights(params: FlightSearchParams): Promise<SearchResult> {
  const errors: string[] = []
  const results: FlightResult[] = []
  const providers: string[] = []
  let budgetWarning: string | undefined
  let serpApiBudgetExceeded = false

  logger.flightSearch(
    params.origin,
    params.destination,
    formatDate(params.departureDate)
  )

  // 1. SerpAPI (principal - preços reais via Google Flights)
  // Custa $0.01/call mas tem dados precisos de mercado
  // BLOQUEADO automaticamente se limite mensal atingido
  if (isSerpApiConfigured()) {
    try {
      const serpResults = await searchFlightsSerpApi(params)
      results.push(...serpResults)
      providers.push('serpapi')
      logger.info(`SerpAPI: ${serpResults.length} resultados`)

      // Check for budget warnings after successful call
      const usageDb = getUsageDbService()
      const budgetCheck = await usageDb.checkBudget('serpapi')
      if (budgetCheck.warning) {
        budgetWarning = usageDb.formatBudgetAlert(budgetCheck, 'serpapi')
      }
    } catch (error) {
      if (error instanceof BudgetExceededError) {
        // Budget exceeded - log and fall back to Kiwi
        serpApiBudgetExceeded = true
        const usageDb = getUsageDbService()
        const budgetCheck = await usageDb.checkBudget('serpapi')
        budgetWarning = usageDb.formatBudgetAlert(budgetCheck, 'serpapi')
        logger.warn(`SerpAPI BLOQUEADO: ${error.used}/${error.limit} calls - usando fallback`)
        errors.push(`SerpAPI: Limite mensal atingido (${error.used}/${error.limit})`)
      } else {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push(`SerpAPI: ${msg}`)
        logger.warn(`Erro SerpAPI: ${msg}`)
      }
    }
  }

  // 2. Kiwi (secundário - GRÁTIS ilimitado, dados razoáveis)
  // Usado como fallback quando SerpAPI está bloqueado ou sem resultados
  if (isKiwiConfigured() && (results.length === 0 || serpApiBudgetExceeded)) {
    try {
      const kiwiResults = await searchFlightsKiwi(params)
      results.push(...kiwiResults)
      providers.push('kiwi')
      logger.info(`Kiwi: ${kiwiResults.length} resultados`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Kiwi: ${msg}`)
      logger.warn(`Erro Kiwi: ${msg}`)
    }
  }

  // 3. Amadeus (último recurso - API de TESTE com dados não confiáveis)
  // ATENÇÃO: test.api.amadeus.com retorna preços inflados/falsos
  // Só usar se não houver outra opção
  if (isAmadeusConfigured() && results.length === 0) {
    try {
      const amadeusResults = await searchFlightsAmadeus(params)
      results.push(...amadeusResults)
      providers.push('amadeus')
      logger.info(`Amadeus (TEST API): ${amadeusResults.length} resultados`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Amadeus: ${msg}`)
      logger.warn(`Erro Amadeus: ${msg}`)
    }
  }

  // Ordena por preco
  results.sort((a, b) => a.price - b.price)

  const lowestPrice = results.length > 0 ? results[0] : undefined

  return {
    results,
    providers,
    lowestPrice,
    errors,
    budgetWarning,
  }
}

// Busca apenas com SerpAPI (para validacao de deals)
export async function searchFlightsWithSerpApi(params: FlightSearchParams): Promise<SearchResult> {
  const errors: string[] = []
  const results: FlightResult[] = []

  if (!isSerpApiConfigured()) {
    return { results: [], providers: [], errors: ['SerpAPI não configurado'] }
  }

  try {
    const serpResults = await searchFlightsSerpApi(params)
    results.push(...serpResults)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    errors.push(`SerpAPI: ${msg}`)
  }

  results.sort((a, b) => a.price - b.price)

  return {
    results,
    providers: ['serpapi'],
    lowestPrice: results[0],
    errors,
  }
}

export async function searchFlexibleDates(
  origin: string,
  destination: string,
  startDate: Date,
  endDate: Date,
  options?: {
    minStayDays?: number
    maxStayDays?: number
  }
): Promise<SearchResult> {
  const errors: string[] = []
  const results: FlightResult[] = []
  const providers: string[] = []

  const route = formatRoute(origin, destination)
  logger.info(`Busca flexivel: ${route} de ${formatDate(startDate)} a ${formatDate(endDate)}`)

  if (isKiwiConfigured()) {
    try {
      const returnDays = options?.minStayDays && options?.maxStayDays
        ? { min: options.minStayDays, max: options.maxStayDays }
        : undefined

      const kiwiResults = await searchFlexibleDatesKiwi(
        origin,
        destination,
        startDate,
        endDate,
        returnDays
      )
      results.push(...kiwiResults)
      providers.push('kiwi')
      logger.info(`Kiwi (flex): ${kiwiResults.length} resultados`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Kiwi: ${msg}`)
      logger.warn(`Erro Kiwi (flex): ${msg}`)
    }
  }

  // Ordena por preco
  results.sort((a, b) => a.price - b.price)

  const lowestPrice = results.length > 0 ? results[0] : undefined

  return {
    results,
    providers,
    lowestPrice,
    errors,
  }
}

export function formatFlightResult(flight: FlightResult): string {
  const route = formatRoute(flight.origin, flight.destination)
  const stops = flight.stops === 0 ? 'direto' : `${flight.stops} parada${flight.stops > 1 ? 's' : ''}`
  const duration = formatDuration(flight.duration)

  return `${route}
Preco: R$ ${flight.price.toFixed(2)}
Cia: ${flight.airline}
Duracao: ${duration} (${stops})
${flight.deepLink ? `Link: ${flight.deepLink}` : ''}`
}

export function formatSearchSummary(result: SearchResult): string {
  if (result.results.length === 0) {
    let msg = 'Nenhum voo encontrado.'
    if (result.budgetWarning) {
      msg += `\n\n${result.budgetWarning}`
    }
    return msg
  }

  const lowest = result.lowestPrice!
  const route = formatRoute(lowest.origin, lowest.destination)

  let summary = `${route}\n\n`
  summary += `Menor preco: R$ ${lowest.price.toFixed(2)}\n`
  summary += `Cia: ${lowest.airline}\n`

  if (lowest.stops === 0) {
    summary += `Voo direto`
  } else {
    summary += `${lowest.stops} parada${lowest.stops > 1 ? 's' : ''}`
  }

  summary += ` - ${formatDuration(lowest.duration)}\n`

  if (result.results.length > 1) {
    const prices = result.results.slice(0, 5).map((r) => `R$${r.price.toFixed(0)}`)
    summary += `\nTop 5 precos: ${prices.join(', ')}`
  }

  // Show provider info
  if (result.providers.length > 0) {
    summary += `\n\nFonte: ${result.providers.join(', ')}`
  }

  if (result.errors.length > 0) {
    summary += `\n\nAvisos: ${result.errors.join(', ')}`
  }

  // Show budget warning if present
  if (result.budgetWarning) {
    summary += `\n\n${result.budgetWarning}`
  }

  if (lowest.deepLink) {
    summary += `\n\nReservar: ${lowest.deepLink}`
  }

  return summary
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}h`
  return `${hours}h${mins}min`
}

export function isConfigured(): boolean {
  return isAmadeusConfigured() || isKiwiConfigured() || isSerpApiConfigured()
}
