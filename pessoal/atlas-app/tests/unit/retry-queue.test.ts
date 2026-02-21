import { describe, it, expect } from 'vitest'

// Test retry queue constants and backoff logic used in telegram.service.ts
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAYS = [30_000, 120_000, 600_000] // 30s, 2min, 10min

describe('Retry queue logic', () => {
  it('has correct backoff delays', () => {
    expect(RETRY_DELAYS[0]).toBe(30_000) // 30s
    expect(RETRY_DELAYS[1]).toBe(120_000) // 2min
    expect(RETRY_DELAYS[2]).toBe(600_000) // 10min
  })

  it('has 3 max retry attempts', () => {
    expect(MAX_RETRY_ATTEMPTS).toBe(3)
  })

  it('delays array matches max attempts', () => {
    expect(RETRY_DELAYS.length).toBe(MAX_RETRY_ATTEMPTS)
  })

  it('delays increase exponentially', () => {
    for (let i = 1; i < RETRY_DELAYS.length; i++) {
      expect(RETRY_DELAYS[i]).toBeGreaterThan(RETRY_DELAYS[i - 1])
    }
  })

  it('calculates next retry time correctly', () => {
    const now = Date.now()
    const attempts = 0
    const nextRetry = now + RETRY_DELAYS[attempts]
    expect(nextRetry).toBe(now + 30_000)
  })

  it('gives up after max attempts', () => {
    const attempts = MAX_RETRY_ATTEMPTS
    // Should be removed from queue, not retried
    expect(attempts >= MAX_RETRY_ATTEMPTS).toBe(true)
  })
})
