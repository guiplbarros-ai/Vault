import { describe, it, expect } from 'vitest'
import {
  isValidIata,
  normalizeIata,
  formatRoute,
  formatAirportFull,
  formatRouteFull,
  getAirport,
} from '../../src/utils/airports.js'

describe('airports utils', () => {
  describe('isValidIata', () => {
    it('should return true for valid 3-letter IATA codes', () => {
      expect(isValidIata('GRU')).toBe(true)
      expect(isValidIata('LIS')).toBe(true)
      expect(isValidIata('NRT')).toBe(true)
      expect(isValidIata('CNF')).toBe(true)
    })

    it('should return false for invalid codes', () => {
      expect(isValidIata('GR')).toBe(false)
      expect(isValidIata('GRUA')).toBe(false)
      expect(isValidIata('123')).toBe(false)
      expect(isValidIata('')).toBe(false)
      expect(isValidIata('gr1')).toBe(false)
    })

    it('should handle lowercase input', () => {
      expect(isValidIata('gru')).toBe(true)
      expect(isValidIata('lis')).toBe(true)
    })
  })

  describe('normalizeIata', () => {
    it('should convert to uppercase', () => {
      expect(normalizeIata('gru')).toBe('GRU')
      expect(normalizeIata('lis')).toBe('LIS')
      expect(normalizeIata('Nrt')).toBe('NRT')
    })

    it('should trim whitespace', () => {
      expect(normalizeIata(' GRU ')).toBe('GRU')
      expect(normalizeIata('  lis  ')).toBe('LIS')
    })
  })

  describe('formatRoute', () => {
    it('should format route with airport names', () => {
      const route = formatRoute('GRU', 'LIS')
      expect(route).toContain('GRU')
      expect(route).toContain('LIS')
      expect(route).toContain('→')
    })

    it('should handle unknown airports', () => {
      const route = formatRoute('XXX', 'YYY')
      expect(route).toContain('XXX')
      expect(route).toContain('YYY')
    })
  })

  describe('getAirport', () => {
    it('should return airport object for known airports', () => {
      const gru = getAirport('GRU')
      expect(gru).not.toBeUndefined()
      expect(gru?.city).toBe('Sao Paulo')

      const nrt = getAirport('NRT')
      expect(nrt).not.toBeUndefined()
      expect(nrt?.city).toBe('Tóquio')
    })

    it('should return undefined for unknown airports', () => {
      expect(getAirport('XXX')).toBeUndefined()
    })

    it('should be case insensitive', () => {
      const gru1 = getAirport('gru')
      const gru2 = getAirport('GRU')
      expect(gru1).toEqual(gru2)
    })
  })

  describe('formatAirportFull', () => {
    it('should format with city, country and IATA', () => {
      const result = formatAirportFull('NRT')
      expect(result).toContain('Tóquio')
      expect(result).toContain('Japão')
      expect(result).toContain('NRT')
    })

    it('should handle unknown airports', () => {
      const result = formatAirportFull('XXX')
      expect(result).toContain('XXX')
    })
  })

  describe('formatRouteFull', () => {
    it('should format complete route info', () => {
      const result = formatRouteFull('CNF', 'NRT')
      expect(result).toContain('Belo Horizonte')
      expect(result).toContain('Tóquio')
    })
  })
})
