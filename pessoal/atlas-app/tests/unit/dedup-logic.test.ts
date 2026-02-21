import { describe, it, expect } from 'vitest'

// Test the 2% dedup threshold logic used in price-alert.service.ts
function shouldDedup(previousPrice: number, newPrice: number, threshold: number = 0.02): boolean {
  const priceDiff = Math.abs(newPrice - previousPrice) / previousPrice
  return priceDiff < threshold
}

describe('Dedup threshold logic (2%)', () => {
  it('deduplicates when price is within 2%', () => {
    // R$5000 → R$5050 = 1% diff
    expect(shouldDedup(5000, 5050)).toBe(true)
  })

  it('does NOT dedup when price drops more than 2%', () => {
    // R$5000 → R$4800 = 4% diff
    expect(shouldDedup(5000, 4800)).toBe(false)
  })

  it('is symmetric (works both directions)', () => {
    expect(shouldDedup(5000, 5050)).toBe(true)
    expect(shouldDedup(5050, 5000)).toBe(true)
  })

  it('exact same price is deduped', () => {
    expect(shouldDedup(5000, 5000)).toBe(true)
  })

  it('edge case: exactly 2% is NOT deduped', () => {
    // R$5000 → R$5100 = 2% exactly
    expect(shouldDedup(5000, 5100)).toBe(false)
  })

  it('large price difference is not deduped', () => {
    expect(shouldDedup(10000, 8000)).toBe(false)
  })
})
