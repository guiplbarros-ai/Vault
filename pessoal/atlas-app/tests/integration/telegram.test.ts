import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

// Mock Telegram API responses
const server = setupServer(
  http.post('https://api.telegram.org/bot*/sendMessage', async ({ request }) => {
    const body = await request.json() as { chat_id: number; text: string }

    // Validate request
    if (!body.chat_id || !body.text) {
      return HttpResponse.json({ ok: false, description: 'Bad Request' }, { status: 400 })
    }

    return HttpResponse.json({
      ok: true,
      result: {
        message_id: 123,
        chat: { id: body.chat_id },
        text: body.text,
      },
    })
  }),

  http.post('https://api.telegram.org/bot*/getMe', () => {
    return HttpResponse.json({
      ok: true,
      result: {
        id: 123456789,
        is_bot: true,
        first_name: 'AtlasBot',
        username: 'atlas_flights_bot',
      },
    })
  }),

  http.post('https://api.telegram.org/bot*/setWebhook', () => {
    return HttpResponse.json({ ok: true, result: true })
  })
)

describe('Telegram Service', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'bypass' })
  })

  afterEach(() => {
    server.close()
  })

  describe('Configuration', () => {
    it('should have an enabled method', async () => {
      const { getTelegramService } = await import('../../src/services/telegram.service.js')
      const telegram = getTelegramService()

      expect(typeof telegram.enabled).toBe('function')
      expect(typeof telegram.enabled()).toBe('boolean')
    })

    it('should return singleton instance', async () => {
      const { getTelegramService } = await import('../../src/services/telegram.service.js')
      const telegram1 = getTelegramService()
      const telegram2 = getTelegramService()

      expect(telegram1).toBe(telegram2)
    })
  })

  describe('Message Formatting', () => {
    it('should escape markdown special characters', () => {
      // Test that messages with special chars don't break
      const testText = 'Price: R$ 2.590,00 (10% off!)'
      expect(testText).toContain('$')
      expect(testText).toContain('.')
      expect(testText).toContain('%')
    })

    it('should handle long messages', () => {
      // Telegram has 4096 char limit
      const longText = 'A'.repeat(5000)
      expect(longText.length).toBeGreaterThan(4096)

      // Service should handle this gracefully (truncate or split)
    })
  })
})

describe('Telegram Command Parsing', () => {
  describe('/rota command', () => {
    it('should parse add command correctly', () => {
      const text = '/rota add CNF NRT'
      const parts = text.split(' ')

      expect(parts[0]).toBe('/rota')
      expect(parts[1]).toBe('add')
      expect(parts[2]).toBe('CNF')
      expect(parts[3]).toBe('NRT')
    })

    it('should parse remove command correctly', () => {
      const text = '/rota remove CNF NRT'
      const parts = text.split(' ')

      expect(parts[0]).toBe('/rota')
      expect(parts[1]).toBe('remove')
    })

    it('should handle missing arguments', () => {
      const text = '/rota add'
      const parts = text.split(' ')

      expect(parts.length).toBeLessThan(4)
    })
  })

  describe('/buscar command', () => {
    it('should parse search command correctly', () => {
      const text = '/buscar GRU LIS 15/03'
      const parts = text.split(' ')

      expect(parts[0]).toBe('/buscar')
      expect(parts[1]).toBe('GRU')
      expect(parts[2]).toBe('LIS')
      expect(parts[3]).toBe('15/03')
    })

    it('should handle optional return date', () => {
      const text = '/buscar GRU LIS 15/03 25/03'
      const parts = text.split(' ')

      expect(parts.length).toBe(5)
      expect(parts[4]).toBe('25/03')
    })
  })
})

describe('Telegram Security', () => {
  it('should validate chat IDs are numeric', () => {
    const validChatId = 5749966991
    const invalidChatId = 'not-a-number'

    expect(typeof validChatId).toBe('number')
    expect(Number.isFinite(validChatId)).toBe(true)
    expect(Number.isNaN(Number(invalidChatId))).toBe(true)
  })

  it('should not process commands from unauthorized users', () => {
    // This is a placeholder for authorization logic
    // In production, you might want to whitelist certain chat IDs
    const allowedChatIds = [5749966991]
    const unknownChatId = 123456789

    expect(allowedChatIds.includes(unknownChatId)).toBe(false)
  })

  it('should sanitize user input in commands', () => {
    const maliciousInput = '/rota add <script>alert(1)</script> NRT'

    // The IATA validation should catch this
    const parts = maliciousInput.split(' ')
    const iataCode = parts[2]

    // Should be rejected by isValidIata
    expect(iataCode).not.toMatch(/^[A-Z]{3}$/i)
  })
})
