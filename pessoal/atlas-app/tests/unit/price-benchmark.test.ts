import { describe, it, expect } from 'vitest'
import {
  getBenchmark,
  ratePriceVsBenchmark,
  isPromotion,
} from '../../src/utils/price-benchmark.js'

describe('price-benchmark utils', () => {
  describe('getBenchmark', () => {
    it('should return benchmark for known routes', () => {
      const benchmark = getBenchmark('CNF', 'NRT')
      expect(benchmark).not.toBeUndefined()
      expect(benchmark?.avgPrice).toBeGreaterThan(0)
      expect(benchmark?.goodPrice).toBeGreaterThan(0)
      expect(benchmark?.greatPrice).toBeGreaterThan(0)
    })

    it('should return undefined for unknown routes', () => {
      const benchmark = getBenchmark('XXX', 'YYY')
      expect(benchmark).toBeUndefined()
    })

    it('should be case insensitive', () => {
      const benchmark1 = getBenchmark('cnf', 'nrt')
      const benchmark2 = getBenchmark('CNF', 'NRT')
      expect(benchmark1).toEqual(benchmark2)
    })

    it('should have valid price hierarchy', () => {
      const benchmark = getBenchmark('CNF', 'NRT')
      if (benchmark) {
        // greatPrice < goodPrice < avgPrice
        expect(benchmark.greatPrice).toBeLessThan(benchmark.goodPrice)
        expect(benchmark.goodPrice).toBeLessThan(benchmark.avgPrice)
      }
    })
  })

  describe('ratePriceVsBenchmark', () => {
    // CNF-NRT benchmark (ida+volta): avg=11000, good=9000, great=7000
    it('should rate as "great" when price is below greatPrice', () => {
      const result = ratePriceVsBenchmark('CNF', 'NRT', 6500)
      expect(result.rating).toBe('great')
      expect(result.benchmark).not.toBeUndefined()
    })

    it('should rate as "good" when price is between great and good', () => {
      const result = ratePriceVsBenchmark('CNF', 'NRT', 8000)
      expect(result.rating).toBe('good')
    })

    it('should rate as "normal" when price is between good and avg', () => {
      const result = ratePriceVsBenchmark('CNF', 'NRT', 10000)
      expect(result.rating).toBe('normal')
    })

    it('should rate as "expensive" when price is above avg', () => {
      const result = ratePriceVsBenchmark('CNF', 'NRT', 12000)
      expect(result.rating).toBe('expensive')
    })

    it('should return "normal" for routes without benchmark', () => {
      // Routes without benchmark default to "normal" (cannot evaluate)
      const result = ratePriceVsBenchmark('XXX', 'YYY', 5000)
      expect(result.rating).toBe('normal')
      expect(result.benchmark).toBeUndefined()
    })

    it('should calculate percentVsAvg for known routes', () => {
      const benchmark = getBenchmark('CNF', 'NRT')
      if (benchmark) {
        // Price at 80% of avg should give percentVsAvg of 20
        const result = ratePriceVsBenchmark('CNF', 'NRT', benchmark.avgPrice * 0.8)
        expect(result.percentVsAvg).toBeDefined()
        expect(result.percentVsAvg).toBeCloseTo(20, 0)
      }
    })

    it('should not have percentVsAvg for unknown routes', () => {
      const result = ratePriceVsBenchmark('XXX', 'YYY', 5000)
      expect(result.percentVsAvg).toBeUndefined()
    })
  })

  describe('isPromotion', () => {
    // CNF-NRT benchmark (ida+volta): avg=11000, good=9000, great=7000
    it('should return true for prices at or below goodPrice', () => {
      expect(isPromotion('CNF', 'NRT', 6500)).toBe(true) // great price
      expect(isPromotion('CNF', 'NRT', 7000)).toBe(true) // exactly great price
      expect(isPromotion('CNF', 'NRT', 8000)).toBe(true) // good price
      expect(isPromotion('CNF', 'NRT', 9000)).toBe(true) // exactly good price
    })

    it('should return false for prices above goodPrice', () => {
      expect(isPromotion('CNF', 'NRT', 10000)).toBe(false) // normal
      expect(isPromotion('CNF', 'NRT', 12000)).toBe(false) // expensive
    })

    it('should return false for unknown routes', () => {
      // Unknown routes return 'normal', which is not a promotion
      expect(isPromotion('XXX', 'YYY', 100)).toBe(false)
    })
  })
})
