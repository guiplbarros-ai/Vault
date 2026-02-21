import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all provider modules before importing searchFlights
vi.mock('../../src/services/serpapi.service.js', () => ({
  searchFlightsSerpApi: vi.fn(),
  isSerpApiConfigured: vi.fn(() => true),
  BudgetExceededError: class BudgetExceededError extends Error {
    used: number
    limit: number
    constructor(used: number, limit: number) {
      super(`Budget exceeded: ${used}/${limit}`)
      this.used = used
      this.limit = limit
    }
  },
}))

vi.mock('../../src/services/skyscanner.service.js', () => ({
  searchFlightsSkyscanner: vi.fn(),
  isSkyscannerConfigured: vi.fn(() => true),
}))

vi.mock('../../src/services/kiwi.service.js', () => ({
  searchFlightsKiwi: vi.fn(),
  isKiwiConfigured: vi.fn(() => true),
  searchFlexibleDatesKiwi: vi.fn(),
}))

vi.mock('../../src/services/amadeus.service.js', () => ({
  searchFlightsAmadeus: vi.fn(),
  isAmadeusConfigured: vi.fn(() => true),
}))

vi.mock('../../src/services/usage-db.service.js', () => ({
  getUsageDbService: vi.fn(() => ({
    checkBudget: vi.fn(async () => ({ ok: true })),
    formatBudgetAlert: vi.fn(() => ''),
  })),
}))

vi.mock('../../src/services/health.service.js', () => ({
  getHealthService: vi.fn(() => ({
    isHealthy: vi.fn(() => true),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(async () => {}),
  })),
}))

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    flightSearch: vi.fn(),
  },
}))

import { searchFlights, clearSearchCache } from '../../src/services/flight-search.service.js'
import { searchFlightsSerpApi, BudgetExceededError } from '../../src/services/serpapi.service.js'
import { searchFlightsSkyscanner } from '../../src/services/skyscanner.service.js'
import { searchFlightsKiwi } from '../../src/services/kiwi.service.js'
import { searchFlightsAmadeus } from '../../src/services/amadeus.service.js'

const mockFlight = (provider: string, price: number) => ({
  id: `${provider}-1`,
  origin: 'GRU',
  destination: 'NRT',
  departureDate: '2026-11-01',
  price,
  currency: 'BRL',
  airline: 'Test',
  stops: 1,
  duration: 1440,
  provider,
  fetchedAt: new Date(),
})

const searchParams = {
  origin: 'GRU',
  destination: 'NRT',
  departureDate: new Date('2026-11-01'),
}

describe('Provider Fallback Chain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSearchCache()
  })

  it('usa SerpAPI como primeiro provedor', async () => {
    vi.mocked(searchFlightsSerpApi).mockResolvedValue([mockFlight('serpapi', 5000)])

    const result = await searchFlights(searchParams)

    expect(searchFlightsSerpApi).toHaveBeenCalled()
    expect(result.providers).toContain('serpapi')
    expect(result.results[0].price).toBe(5000)
    // Skyscanner NÃO deve ser chamado (SerpAPI retornou resultados)
    expect(searchFlightsSkyscanner).not.toHaveBeenCalled()
  })

  it('cai para Skyscanner quando SerpAPI falha', async () => {
    vi.mocked(searchFlightsSerpApi).mockRejectedValue(new Error('API Error'))
    vi.mocked(searchFlightsSkyscanner).mockResolvedValue([mockFlight('skyscanner', 5500)])

    const result = await searchFlights(searchParams)

    expect(searchFlightsSerpApi).toHaveBeenCalled()
    expect(searchFlightsSkyscanner).toHaveBeenCalled()
    expect(result.providers).toContain('skyscanner')
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('SerpAPI')]))
  })

  it('cai para Kiwi quando SerpAPI e Skyscanner falham', async () => {
    vi.mocked(searchFlightsSerpApi).mockRejectedValue(new Error('SerpAPI down'))
    vi.mocked(searchFlightsSkyscanner).mockRejectedValue(new Error('Skyscanner 429'))
    vi.mocked(searchFlightsKiwi).mockResolvedValue([mockFlight('kiwi', 6000)])

    const result = await searchFlights(searchParams)

    expect(searchFlightsKiwi).toHaveBeenCalled()
    expect(result.providers).toContain('kiwi')
    expect(result.results[0].price).toBe(6000)
  })

  it('cai para Amadeus quando todos acima falham', async () => {
    vi.mocked(searchFlightsSerpApi).mockRejectedValue(new Error('fail'))
    vi.mocked(searchFlightsSkyscanner).mockRejectedValue(new Error('fail'))
    vi.mocked(searchFlightsKiwi).mockRejectedValue(new Error('fail'))
    vi.mocked(searchFlightsAmadeus).mockResolvedValue([mockFlight('amadeus', 7000)])

    const result = await searchFlights(searchParams)

    expect(searchFlightsAmadeus).toHaveBeenCalled()
    expect(result.providers).toContain('amadeus')
  })

  it('Kiwi ativado quando SerpAPI atinge budget (mesmo com resultados)', async () => {
    const budgetErr = new BudgetExceededError(100, 100)
    vi.mocked(searchFlightsSerpApi).mockRejectedValue(budgetErr)
    vi.mocked(searchFlightsSkyscanner).mockResolvedValue([mockFlight('skyscanner', 5000)])
    vi.mocked(searchFlightsKiwi).mockResolvedValue([mockFlight('kiwi', 5200)])

    const result = await searchFlights(searchParams)

    // Skyscanner retornou resultados, mas Kiwi também é chamado por causa do budget exceeded
    expect(searchFlightsKiwi).toHaveBeenCalled()
    expect(result.providers).toContain('skyscanner')
    expect(result.providers).toContain('kiwi')
  })

  it('retorna erros de todos os provedores quando todos falham', async () => {
    vi.mocked(searchFlightsSerpApi).mockRejectedValue(new Error('serpapi err'))
    vi.mocked(searchFlightsSkyscanner).mockRejectedValue(new Error('sky err'))
    vi.mocked(searchFlightsKiwi).mockRejectedValue(new Error('kiwi err'))
    vi.mocked(searchFlightsAmadeus).mockRejectedValue(new Error('amadeus err'))

    const result = await searchFlights(searchParams)

    expect(result.results).toHaveLength(0)
    expect(result.errors).toHaveLength(4)
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('SerpAPI'),
      expect.stringContaining('Skyscanner'),
      expect.stringContaining('Kiwi'),
      expect.stringContaining('Amadeus'),
    ]))
  })

  it('resultados são ordenados por preço ascendente', async () => {
    vi.mocked(searchFlightsSerpApi).mockResolvedValue([
      mockFlight('serpapi', 8000),
      mockFlight('serpapi', 3000),
      mockFlight('serpapi', 5500),
    ])

    const result = await searchFlights(searchParams)

    expect(result.results[0].price).toBe(3000)
    expect(result.results[1].price).toBe(5500)
    expect(result.results[2].price).toBe(8000)
    expect(result.lowestPrice?.price).toBe(3000)
  })
})
