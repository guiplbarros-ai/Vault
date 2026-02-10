import { describe, it, expect } from 'vitest'

/**
 * Smoke Tests - E2E
 *
 * These tests verify that the main flows work correctly end-to-end.
 * They test the core utilities and service interfaces.
 */

describe('E2E: Smoke Tests', () => {
  describe('Full Search Flow', () => {
    it('should validate and normalize IATA codes', async () => {
      const { isValidIata, normalizeIata } = await import('../../src/utils/airports.js')

      // 1. Validate inputs
      const origin = 'cnf'
      const destination = 'nrt'

      expect(isValidIata(origin)).toBe(true)
      expect(isValidIata(destination)).toBe(true)

      // 2. Normalize inputs
      const normalizedOrigin = normalizeIata(origin)
      const normalizedDest = normalizeIata(destination)

      expect(normalizedOrigin).toBe('CNF')
      expect(normalizedDest).toBe('NRT')
    })

    it('should parse dates correctly', async () => {
      const { parseDateInput } = await import('../../src/utils/date.js')

      const date = parseDateInput('15/09')
      expect(date).not.toBeNull()
      expect(date!.getDate()).toBe(15)
      expect(date!.getMonth()).toBe(8) // September = 8
    })

    it('should have search service available', async () => {
      const { searchFlights, isConfigured } = await import('../../src/services/flight-search.service.js')

      expect(typeof searchFlights).toBe('function')
      expect(typeof isConfigured).toBe('function')
      expect(typeof isConfigured()).toBe('boolean')
    })
  })

  describe('Price Benchmark Flow', () => {
    it('should correctly evaluate prices against benchmarks', async () => {
      const { getBenchmark, ratePriceVsBenchmark, isPromotion } = await import(
        '../../src/utils/price-benchmark.js'
      )

      // 1. Get benchmark (ida+volta)
      const benchmark = getBenchmark('CNF', 'NRT')
      expect(benchmark).not.toBeUndefined()
      expect(benchmark?.avgPrice).toBe(11000)
      expect(benchmark?.goodPrice).toBe(9000)
      expect(benchmark?.greatPrice).toBe(7000)

      // 2. Rate different prices (ida+volta)
      const greatPrice = ratePriceVsBenchmark('CNF', 'NRT', 6500)
      const goodPrice = ratePriceVsBenchmark('CNF', 'NRT', 8000)
      const normalPrice = ratePriceVsBenchmark('CNF', 'NRT', 10000)
      const expensivePrice = ratePriceVsBenchmark('CNF', 'NRT', 12000)

      expect(greatPrice.rating).toBe('great')
      expect(goodPrice.rating).toBe('good')
      expect(normalPrice.rating).toBe('normal')
      expect(expensivePrice.rating).toBe('expensive')

      // 3. Check promotion detection
      expect(isPromotion('CNF', 'NRT', 6500)).toBe(true)
      expect(isPromotion('CNF', 'NRT', 12000)).toBe(false)
    })
  })

  describe('Airport Data', () => {
    it('should have airport data available', async () => {
      const { getAirport, formatAirportFull, formatRouteFull } = await import('../../src/utils/airports.js')

      // Known airports
      const gru = getAirport('GRU')
      expect(gru).not.toBeUndefined()
      expect(gru?.city).toBe('Sao Paulo')

      const nrt = getAirport('NRT')
      expect(nrt).not.toBeUndefined()
      expect(nrt?.city).toBe('Tóquio')

      // Formatting
      const formatted = formatAirportFull('NRT')
      expect(formatted).toContain('Tóquio')
      expect(formatted).toContain('Japão')

      const route = formatRouteFull('CNF', 'NRT')
      expect(route).toContain('Belo Horizonte')
      expect(route).toContain('Tóquio')
    })
  })
})

describe('E2E: Service Interfaces', () => {
  it('should have all required services', async () => {
    // Import all services to verify they export correctly
    const { isSupabaseConfigured } = await import('../../src/services/supabase.service.js')
    const { getTelegramService } = await import('../../src/services/telegram.service.js')
    const { isSerpApiConfigured } = await import('../../src/services/serpapi.service.js')
    const { isAmadeusConfigured } = await import('../../src/services/amadeus.service.js')
    const { isKiwiConfigured } = await import('../../src/services/kiwi.service.js')

    expect(typeof isSupabaseConfigured).toBe('function')
    expect(typeof getTelegramService).toBe('function')
    expect(typeof isSerpApiConfigured).toBe('function')
    expect(typeof isAmadeusConfigured).toBe('function')
    expect(typeof isKiwiConfigured).toBe('function')
  })

  it('should have singleton telegram service', async () => {
    const { getTelegramService } = await import('../../src/services/telegram.service.js')

    const telegram1 = getTelegramService()
    const telegram2 = getTelegramService()

    expect(telegram1).toBe(telegram2)
    expect(typeof telegram1.enabled).toBe('function')
  })
})

describe('E2E: Error Handling', () => {
  it('should handle invalid IATA codes', async () => {
    const { isValidIata } = await import('../../src/utils/airports.js')

    expect(isValidIata('')).toBe(false)
    expect(isValidIata('INVALID')).toBe(false)
    expect(isValidIata('12')).toBe(false)
    expect(isValidIata('ABC123')).toBe(false)
  })

  it('should handle invalid dates', async () => {
    const { parseDateInput } = await import('../../src/utils/date.js')

    expect(parseDateInput('')).toBeNull()
    expect(parseDateInput('invalid')).toBeNull()
    expect(parseDateInput('32/13')).toBeNull()
  })

  it('should handle unknown airports gracefully', async () => {
    const { getAirport, formatAirportFull } = await import('../../src/utils/airports.js')

    expect(getAirport('XXX')).toBeUndefined()

    // formatAirportFull should still work for unknown airports
    const formatted = formatAirportFull('XXX')
    expect(formatted).toContain('XXX')
  })
})
