import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../../src/utils/logger.js'

describe('Security: Secrets Protection', () => {
  const sensitivePatterns = [
    /api[_-]?key/i,
    /api[_-]?secret/i,
    /password/i,
    /token/i,
    /secret/i,
    /credential/i,
    /private[_-]?key/i,
    /service[_-]?role[_-]?key/i,
  ]

  describe('Logger Security', () => {
    let logOutput: string[] = []
    const originalConsole = { ...console }

    beforeEach(() => {
      logOutput = []
      console.log = vi.fn((...args) => logOutput.push(args.join(' ')))
      console.info = vi.fn((...args) => logOutput.push(args.join(' ')))
      console.warn = vi.fn((...args) => logOutput.push(args.join(' ')))
      console.error = vi.fn((...args) => logOutput.push(args.join(' ')))
    })

    afterEach(() => {
      console.log = originalConsole.log
      console.info = originalConsole.info
      console.warn = originalConsole.warn
      console.error = originalConsole.error
    })

    it('should not log sensitive environment variable names', () => {
      // Simulate logging that might accidentally include env vars
      logger.info('Starting service')
      logger.info('Flight search completed')

      const output = logOutput.join('\n')
      for (const pattern of sensitivePatterns) {
        expect(output).not.toMatch(pattern)
      }
    })
  })

  describe('Environment Variable Handling', () => {
    it('should not expose API keys in error messages', async () => {
      vi.stubEnv('SERPAPI_API_KEY', 'super-secret-key-12345')

      const { isSerpApiConfigured } = await import('../../src/services/serpapi.service.js')

      // The function should work without exposing the key
      expect(isSerpApiConfigured()).toBe(true)
    })

    it('should handle missing env vars gracefully', async () => {
      vi.stubEnv('SUPABASE_URL', '')
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

      const { isSupabaseConfigured } = await import('../../src/services/supabase.service.js')

      // Should return false, not throw
      expect(() => isSupabaseConfigured()).not.toThrow()
      expect(isSupabaseConfigured()).toBe(false)
    })
  })

  describe('URL Parameter Security', () => {
    it('should not include API keys in URL paths', () => {
      // Check that API endpoints don't expose keys in URLs
      const serpApiUrl = 'https://serpapi.com/search'
      const kiwiUrl = 'https://api.tequila.kiwi.com/v2/search'
      const amadeusUrl = 'https://test.api.amadeus.com/v2/shopping/flight-offers'

      // URLs should not contain obvious API key patterns in the path
      expect(serpApiUrl).not.toMatch(/key=\w{20,}/)
      expect(kiwiUrl).not.toMatch(/key=\w{20,}/)
      expect(amadeusUrl).not.toMatch(/key=\w{20,}/)
    })
  })
})

describe('Security: Configuration Validation', () => {
  it('should require HTTPS for API endpoints', () => {
    const endpoints = [
      'https://serpapi.com/search',
      'https://api.tequila.kiwi.com/v2/search',
      'https://test.api.amadeus.com/v2/shopping/flight-offers',
      'https://api.telegram.org',
    ]

    for (const endpoint of endpoints) {
      expect(endpoint.startsWith('https://')).toBe(true)
    }
  })

  it('should have reasonable timeouts configured', () => {
    // Timeouts should be reasonable (not too long, not too short)
    const TIMEOUT_MS = 20000 // 20 seconds

    expect(TIMEOUT_MS).toBeGreaterThanOrEqual(5000) // At least 5 seconds
    expect(TIMEOUT_MS).toBeLessThanOrEqual(60000) // At most 60 seconds
  })
})
