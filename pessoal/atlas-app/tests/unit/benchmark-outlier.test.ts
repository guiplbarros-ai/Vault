import { describe, it, expect } from 'vitest'
import { filterPriceOutliers } from '../../src/utils/price-benchmark.js'

describe('filterPriceOutliers (IQR)', () => {
  it('removes outliers on both ends', () => {
    // Preços normais: 3000-6000, outlier low: 100, outlier high: 50000
    const sorted = [100, 3000, 3500, 4000, 4200, 4500, 5000, 5500, 6000, 50000]
    const filtered = filterPriceOutliers(sorted)
    expect(filtered).not.toContain(100)
    expect(filtered).not.toContain(50000)
    expect(filtered).toContain(3000)
    expect(filtered).toContain(6000)
  })

  it('keeps all values when no outliers exist', () => {
    const sorted = [3000, 3200, 3500, 3800, 4000, 4100, 4300, 4500]
    const filtered = filterPriceOutliers(sorted)
    expect(filtered).toEqual(sorted)
  })

  it('returns original array when < 5 values', () => {
    const sorted = [100, 5000, 50000]
    expect(filterPriceOutliers(sorted)).toEqual(sorted)
  })

  it('handles uniform prices', () => {
    const sorted = [5000, 5000, 5000, 5000, 5000, 5000]
    const filtered = filterPriceOutliers(sorted)
    expect(filtered).toEqual(sorted)
  })

  it('removes only low outlier', () => {
    const sorted = [50, 4000, 4200, 4500, 4800, 5000, 5200, 5500]
    const filtered = filterPriceOutliers(sorted)
    expect(filtered).not.toContain(50)
    expect(filtered).toContain(4000)
  })

  it('handles empty array', () => {
    expect(filterPriceOutliers([])).toEqual([])
  })
})
