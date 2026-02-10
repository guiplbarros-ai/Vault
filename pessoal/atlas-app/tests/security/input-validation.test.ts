import { describe, it, expect } from 'vitest'
import { isValidIata, normalizeIata } from '../../src/utils/airports.js'
import { parseDateInput } from '../../src/utils/date.js'

describe('Security: Input Validation', () => {
  describe('IATA Code Validation', () => {
    it('should reject SQL injection attempts', () => {
      expect(isValidIata("'; DROP TABLE users;--")).toBe(false)
      expect(isValidIata("1' OR '1'='1")).toBe(false)
      expect(isValidIata("GRU'; DELETE FROM")).toBe(false)
    })

    it('should reject XSS attempts', () => {
      expect(isValidIata('<script>alert(1)</script>')).toBe(false)
      expect(isValidIata('GRU<img src=x onerror=alert(1)>')).toBe(false)
      expect(isValidIata('javascript:alert(1)')).toBe(false)
    })

    it('should reject path traversal attempts', () => {
      expect(isValidIata('../../../etc/passwd')).toBe(false)
      expect(isValidIata('..\\..\\..\\windows\\system32')).toBe(false)
    })

    it('should reject command injection attempts', () => {
      expect(isValidIata('GRU; rm -rf /')).toBe(false)
      expect(isValidIata('GRU | cat /etc/passwd')).toBe(false)
      expect(isValidIata('GRU && whoami')).toBe(false)
      expect(isValidIata('$(whoami)')).toBe(false)
      expect(isValidIata('`whoami`')).toBe(false)
    })

    it('should reject null bytes', () => {
      expect(isValidIata('GRU\x00')).toBe(false)
      expect(isValidIata('\x00GRU')).toBe(false)
    })

    it('should reject unicode tricks', () => {
      expect(isValidIata('GRU\u0000')).toBe(false)
      expect(isValidIata('GRU\uFEFF')).toBe(false) // BOM
    })

    it('should only accept 3 uppercase letters', () => {
      expect(isValidIata('GRU')).toBe(true)
      expect(isValidIata('gru')).toBe(true) // lowercase is converted
      expect(isValidIata('Gru')).toBe(true) // mixed case is converted
    })
  })

  describe('IATA Normalization', () => {
    it('should sanitize input safely', () => {
      // Should strip any non-alphabetic characters
      const result = normalizeIata('  gru  ')
      expect(result).toBe('GRU')
      expect(result.length).toBe(3)
    })
  })

  describe('Date Input Validation', () => {
    it('should reject invalid date formats', () => {
      expect(parseDateInput('not-a-date')).toBeNull()
      // 2026-03-15 -> day=2026, which fails day > 31 check
      expect(parseDateInput('2026-03-15')).toBeNull()
    })

    it('should handle malformed input gracefully', () => {
      // These return null because they can't be parsed as valid dates
      expect(parseDateInput('')).toBeNull()
      expect(parseDateInput('abc')).toBeNull()
      expect(parseDateInput('/')).toBeNull()
    })

    it('should reject out-of-range dates', () => {
      expect(parseDateInput('32/13/2026')).toBeNull() // invalid day/month
      expect(parseDateInput('00/00/2026')).toBeNull() // zero values
    })

    it('should accept valid dates only', () => {
      const result = parseDateInput('15/03/2026')
      expect(result).not.toBeNull()
      expect(result instanceof Date).toBe(true)
    })

    it('should accept dd-mm format with dashes', () => {
      const result = parseDateInput('15-03')
      expect(result).not.toBeNull()
    })
  })
})
