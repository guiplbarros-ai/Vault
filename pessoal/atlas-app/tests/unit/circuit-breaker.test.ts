import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock telegram before importing health service
vi.mock('../../src/services/telegram.service.js', () => ({
  getTelegramService: () => ({ enabled: () => false, sendMessage: vi.fn() }),
}))

import { getHealthService } from '../../src/services/health.service.js'

describe('Circuit Breaker (HealthService)', () => {
  // Use a fresh provider name per test to avoid cross-test state
  let providerIdx = 0
  function freshProvider() {
    return `test-provider-${++providerIdx}`
  }

  it('unknown provider is healthy', () => {
    const health = getHealthService()
    expect(health.isHealthy(freshProvider())).toBe(true)
  })

  it('provider stays healthy after recording success', () => {
    const health = getHealthService()
    const p = freshProvider()
    health.recordSuccess(p)
    expect(health.isHealthy(p)).toBe(true)
  })

  it('provider stays healthy with < 3 failures', async () => {
    const health = getHealthService()
    const p = freshProvider()
    await health.recordFailure(p, 'error 1')
    await health.recordFailure(p, 'error 2')
    expect(health.isHealthy(p)).toBe(true)
  })

  it('provider becomes unhealthy at 3 consecutive failures', async () => {
    const health = getHealthService()
    const p = freshProvider()
    await health.recordFailure(p, 'error 1')
    await health.recordFailure(p, 'error 2')
    await health.recordFailure(p, 'error 3')
    expect(health.isHealthy(p)).toBe(false)
  })

  it('success resets consecutive failures', async () => {
    const health = getHealthService()
    const p = freshProvider()
    await health.recordFailure(p, 'error 1')
    await health.recordFailure(p, 'error 2')
    health.recordSuccess(p)
    await health.recordFailure(p, 'error 3')
    // Only 1 consecutive failure now
    expect(health.isHealthy(p)).toBe(true)
  })
})
