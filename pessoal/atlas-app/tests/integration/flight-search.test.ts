import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

// Mock SerpAPI response
const mockSerpApiResponse = {
  search_metadata: { status: 'Success', total_time_taken: 1.5 },
  best_flights: [
    {
      flights: [
        {
          departure_airport: { name: 'GRU', id: 'GRU', time: '2026-03-15T10:00:00' },
          arrival_airport: { name: 'LIS', id: 'LIS', time: '2026-03-15T22:00:00' },
          duration: 600,
          airline: 'TAP',
          flight_number: 'TP92',
        },
      ],
      total_duration: 600,
      price: 2590,
    },
    {
      flights: [
        {
          departure_airport: { name: 'GRU', id: 'GRU', time: '2026-03-15T14:00:00' },
          arrival_airport: { name: 'LIS', id: 'LIS', time: '2026-03-16T04:00:00' },
          duration: 660,
          airline: 'LATAM',
          flight_number: 'LA8084',
        },
      ],
      total_duration: 660,
      price: 2855,
    },
  ],
}

// MSW server setup
const server = setupServer(
  // SerpAPI mock
  http.get('https://serpapi.com/search', ({ request }) => {
    const url = new URL(request.url)
    const apiKey = url.searchParams.get('api_key')

    if (!apiKey) {
      return HttpResponse.json({ error: 'Missing API key' }, { status: 401 })
    }

    return HttpResponse.json(mockSerpApiResponse)
  })
)

describe('Flight Search Integration', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' })
  })

  afterAll(() => {
    server.close()
  })

  describe('searchFlights', () => {
    it('should return results sorted by price ascending', async () => {
      const { searchFlights, isConfigured } = await import('../../src/services/flight-search.service.js')

      // Only run if configured
      if (!isConfigured()) {
        console.log('Skipping - no providers configured')
        return
      }

      const result = await searchFlights({
        origin: 'GRU',
        destination: 'LIS',
        departureDate: new Date('2026-03-15'),
      })

      // If we got results, they should be sorted
      if (result.results.length > 1) {
        for (let i = 1; i < result.results.length; i++) {
          expect(result.results[i].price).toBeGreaterThanOrEqual(result.results[i - 1].price)
        }
      }
    })

    it('should return SearchResult structure', async () => {
      const { searchFlights, isConfigured } = await import('../../src/services/flight-search.service.js')

      if (!isConfigured()) {
        console.log('Skipping - no providers configured')
        return
      }

      const result = await searchFlights({
        origin: 'GRU',
        destination: 'LIS',
        departureDate: new Date('2026-03-15'),
      })

      // Verify structure
      expect(result).toHaveProperty('results')
      expect(result).toHaveProperty('providers')
      expect(result).toHaveProperty('errors')
      expect(Array.isArray(result.results)).toBe(true)
      expect(Array.isArray(result.providers)).toBe(true)
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('isConfigured', () => {
    it('should return a boolean', async () => {
      const { isConfigured } = await import('../../src/services/flight-search.service.js')
      expect(typeof isConfigured()).toBe('boolean')
    })
  })

  describe('formatSearchSummary', () => {
    it('should format results correctly', async () => {
      const { formatSearchSummary } = await import('../../src/services/flight-search.service.js')

      const mockResult = {
        results: [
          {
            id: '1',
            origin: 'GRU',
            destination: 'LIS',
            departureDate: '2026-03-15',
            price: 2590,
            currency: 'BRL',
            airline: 'TAP',
            stops: 0,
            duration: 600,
            provider: 'serpapi',
            fetchedAt: new Date(),
          },
        ],
        providers: ['serpapi'],
        lowestPrice: {
          id: '1',
          origin: 'GRU',
          destination: 'LIS',
          departureDate: '2026-03-15',
          price: 2590,
          currency: 'BRL',
          airline: 'TAP',
          stops: 0,
          duration: 600,
          provider: 'serpapi',
          fetchedAt: new Date(),
        },
        errors: [],
      }

      const summary = formatSearchSummary(mockResult)
      expect(summary).toContain('GRU')
      expect(summary).toContain('LIS')
      expect(summary).toContain('2590')
    })

    it('should handle empty results', async () => {
      const { formatSearchSummary } = await import('../../src/services/flight-search.service.js')

      const emptyResult = {
        results: [],
        providers: [],
        lowestPrice: undefined,
        errors: [],
      }

      const summary = formatSearchSummary(emptyResult)
      expect(summary).toContain('Nenhum voo encontrado')
    })
  })
})
