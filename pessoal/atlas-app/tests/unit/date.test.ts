import { describe, it, expect } from 'vitest'
import { parseDateInput, formatDate } from '../../src/utils/date.js'

describe('date utils', () => {
  describe('parseDateInput', () => {
    it('should parse dd/mm format', () => {
      const result = parseDateInput('15/03')
      expect(result).not.toBeNull()
      expect(result!.getDate()).toBe(15)
      expect(result!.getMonth()).toBe(2) // March = 2
    })

    it('should parse dd/mm/yyyy format', () => {
      const result = parseDateInput('15/03/2026')
      expect(result).not.toBeNull()
      expect(result!.getDate()).toBe(15)
      expect(result!.getMonth()).toBe(2)
      expect(result!.getFullYear()).toBe(2026)
    })

    it('should return null for invalid dates', () => {
      expect(parseDateInput('invalid')).toBeNull()
      expect(parseDateInput('32/13')).toBeNull()
      expect(parseDateInput('')).toBeNull()
    })

    it('should handle edge cases', () => {
      // Last day of month
      const result = parseDateInput('31/12/2026')
      expect(result).not.toBeNull()
      expect(result!.getDate()).toBe(31)
      expect(result!.getMonth()).toBe(11) // December = 11
    })
  })

  describe('formatDate', () => {
    it('should return a string in dd/mm/yyyy format', () => {
      const date = new Date(2026, 2, 15) // March 15, 2026
      const result = formatDate(date)

      // Verify format pattern (dd/mm/yyyy)
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)

      // Should contain the year
      expect(result).toContain('2026')

      // Should contain month 03 (March)
      expect(result).toContain('/03/')
    })

    it('should pad single digit days and months', () => {
      const date = new Date(2026, 0, 5) // January 5, 2026
      const result = formatDate(date)

      // Verify format pattern
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)

      // Month should be 01 (January)
      expect(result).toContain('/01/')

      // Year should be 2026
      expect(result).toContain('2026')
    })
  })
})
