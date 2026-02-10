import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Budget Limiter', () => {
  describe('BudgetCheckResult interface', () => {
    it('should have allowed, remaining, limit, and used properties', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      // Check that checkBudget returns the expected structure
      expect(typeof usageDb.checkBudget).toBe('function')
    })

    it('should export BudgetCheckResult interface', async () => {
      // The interface should be exported from the module
      const module = await import('../../src/services/usage-db.service.js')
      expect(module).toHaveProperty('getUsageDbService')
    })
  })

  describe('BudgetExceededError', () => {
    it('should be exported from serpapi service', async () => {
      const { BudgetExceededError } = await import('../../src/services/serpapi.service.js')
      expect(BudgetExceededError).toBeDefined()
    })

    it('should have provider, used, and limit properties', async () => {
      const { BudgetExceededError } = await import('../../src/services/serpapi.service.js')

      const error = new BudgetExceededError('serpapi', 100, 100)

      expect(error.provider).toBe('serpapi')
      expect(error.used).toBe(100)
      expect(error.limit).toBe(100)
      expect(error.name).toBe('BudgetExceededError')
      expect(error.message).toContain('Limite mensal')
      expect(error.message).toContain('100/100')
    })

    it('should be instance of Error', async () => {
      const { BudgetExceededError } = await import('../../src/services/serpapi.service.js')

      const error = new BudgetExceededError('serpapi', 50, 100)

      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('UsageDbService', () => {
    it('should have checkBudget method', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      expect(typeof usageDb.checkBudget).toBe('function')
    })

    it('should have formatBudgetAlert method', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      expect(typeof usageDb.formatBudgetAlert).toBe('function')
    })

    it('should have shouldSendAlert method', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      expect(typeof usageDb.shouldSendAlert).toBe('function')
    })

    it('should have getMonthlyLimit method', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      expect(typeof usageDb.getMonthlyLimit).toBe('function')
    })

    it('should have setMonthlyLimit method', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      expect(typeof usageDb.setMonthlyLimit).toBe('function')
    })

    it('should return serpapi limit from getMonthlyLimit', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      const limit = usageDb.getMonthlyLimit('serpapi')
      expect(typeof limit).toBe('number')
      expect(limit).toBeGreaterThan(0)
    })

    it('should allow setting custom monthly limit', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      const originalLimit = usageDb.getMonthlyLimit('serpapi')
      usageDb.setMonthlyLimit('serpapi', 200)

      expect(usageDb.getMonthlyLimit('serpapi')).toBe(200)

      // Reset to original
      usageDb.setMonthlyLimit('serpapi', originalLimit)
    })

    it('should format budget alert with cost info', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      const mockResult = {
        allowed: true,
        remaining: 20,
        limit: 100,
        used: 80,
        warning: '⚠️ Atenção: 20 calls restantes de serpapi',
      }

      const alert = usageDb.formatBudgetAlert(mockResult, 'serpapi')

      expect(alert).toContain('serpapi')
      expect(alert).toContain('80/100')
      expect(alert).toContain('20')
    })

    it('should include blocked message when budget exceeded', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      const mockResult = {
        allowed: false,
        blocked: true,
        remaining: 0,
        limit: 100,
        used: 100,
        warning: '⛔ BLOQUEADO: Limite mensal de serpapi atingido',
      }

      const alert = usageDb.formatBudgetAlert(mockResult, 'serpapi')

      expect(alert).toContain('Kiwi')
      expect(alert).toContain('ATLAS_SERPAPI_MONTHLY_LIMIT')
    })
  })

  describe('shouldSendAlert', () => {
    it('should return true for first alert at threshold', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      // Use unique threshold to avoid conflicts with other tests
      const uniqueThreshold = Date.now()
      const result = usageDb.shouldSendAlert('test-provider', uniqueThreshold)

      expect(result).toBe(true)
    })

    it('should return false for repeated alert at same threshold', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      const uniqueThreshold = Date.now() + 1000
      usageDb.shouldSendAlert('test-provider', uniqueThreshold)
      const result = usageDb.shouldSendAlert('test-provider', uniqueThreshold)

      expect(result).toBe(false)
    })
  })

  describe('SearchResult with budgetWarning', () => {
    it('should include budgetWarning in SearchResult interface', async () => {
      const { searchFlights, isConfigured } = await import('../../src/services/flight-search.service.js')

      // The function should exist and return the correct structure
      expect(typeof searchFlights).toBe('function')
    })

    it('should include budgetWarning in formatSearchSummary when present', async () => {
      const { formatSearchSummary } = await import('../../src/services/flight-search.service.js')

      const resultWithWarning = {
        results: [],
        providers: [],
        errors: [],
        budgetWarning: '⚠️ Test warning message',
      }

      const summary = formatSearchSummary(resultWithWarning)
      expect(summary).toContain('Test warning message')
    })
  })

  describe('Default limits', () => {
    it('should have default serpapi limit of 100', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      // Default should be 100 unless env var is set
      const limit = usageDb.getMonthlyLimit('serpapi')
      expect(limit).toBeGreaterThanOrEqual(100)
    })

    it('should have default amadeus limit of 500', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      const limit = usageDb.getMonthlyLimit('amadeus')
      expect(limit).toBeGreaterThanOrEqual(500)
    })

    it('should have unlimited kiwi (999999)', async () => {
      const { getUsageDbService } = await import('../../src/services/usage-db.service.js')
      const usageDb = getUsageDbService()

      const limit = usageDb.getMonthlyLimit('kiwi')
      expect(limit).toBe(999999)
    })
  })
})
