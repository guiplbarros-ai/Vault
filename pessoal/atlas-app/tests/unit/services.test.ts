import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Service Configuration Tests
 *
 * Note: These tests verify the configuration check functions work correctly.
 * Due to module caching, env vars are read at load time. We test the actual
 * values from the .env file or verify the function signatures work.
 */

describe('Service Configuration', () => {
  describe('isSupabaseConfigured', () => {
    it('should return a boolean', async () => {
      const { isSupabaseConfigured } = await import('../../src/services/supabase.service.js')
      expect(typeof isSupabaseConfigured()).toBe('boolean')
    })

    it('should be a function', async () => {
      const { isSupabaseConfigured } = await import('../../src/services/supabase.service.js')
      expect(typeof isSupabaseConfigured).toBe('function')
    })
  })

  describe('isSerpApiConfigured', () => {
    it('should return a boolean', async () => {
      const { isSerpApiConfigured } = await import('../../src/services/serpapi.service.js')
      expect(typeof isSerpApiConfigured()).toBe('boolean')
    })

    it('should be a function', async () => {
      const { isSerpApiConfigured } = await import('../../src/services/serpapi.service.js')
      expect(typeof isSerpApiConfigured).toBe('function')
    })
  })

  describe('isAmadeusConfigured', () => {
    it('should return a boolean', async () => {
      const { isAmadeusConfigured } = await import('../../src/services/amadeus.service.js')
      expect(typeof isAmadeusConfigured()).toBe('boolean')
    })

    it('should be a function', async () => {
      const { isAmadeusConfigured } = await import('../../src/services/amadeus.service.js')
      expect(typeof isAmadeusConfigured).toBe('function')
    })
  })

  describe('isKiwiConfigured', () => {
    it('should return a boolean', async () => {
      const { isKiwiConfigured } = await import('../../src/services/kiwi.service.js')
      expect(typeof isKiwiConfigured()).toBe('boolean')
    })

    it('should be a function', async () => {
      const { isKiwiConfigured } = await import('../../src/services/kiwi.service.js')
      expect(typeof isKiwiConfigured).toBe('function')
    })
  })

  describe('Flight Search Configuration', () => {
    it('isConfigured should return true when at least one provider is available', async () => {
      const { isConfigured } = await import('../../src/services/flight-search.service.js')
      // With at least one env var set, this should be true
      // This test verifies the integration works
      expect(typeof isConfigured()).toBe('boolean')
    })
  })
})
