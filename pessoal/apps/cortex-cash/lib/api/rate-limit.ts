/**
 * Simple IP-based rate limiter for API routes.
 * In-memory store — adequate for single-instance deployments (Fly.io).
 * Edge-runtime compatible (no setInterval).
 */

const store = new Map<string, { count: number; resetTime: number }>()
let lastCleanup = 0

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [key, value] of store) {
    if (now > value.resetTime) {
      store.delete(key)
    }
  }
}

export function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanup()

  const now = Date.now()
  const record = store.get(ip)

  if (record && now > record.resetTime) {
    store.delete(ip)
  }

  const current = store.get(ip)
  if (!current) {
    store.set(ip, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 }
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: current.resetTime - now }
  }

  current.count++
  return { allowed: true, remaining: limit - current.count, retryAfterMs: 0 }
}
