import { describe, it, expect } from 'vitest'
import { sanitizeApiError } from '../../src/utils/sanitize.js'

describe('sanitizeApiError', () => {
  it('strips api_key parameter', () => {
    const input = 'Error: https://api.example.com?api_key=abcdef1234567890abcdef1234567890ab&q=test'
    const result = sanitizeApiError(input)
    expect(result).not.toContain('abcdef1234567890')
    expect(result).toContain('[REDACTED]')
  })

  it('strips Bearer token', () => {
    const input = 'Authorization failed: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature'
    const result = sanitizeApiError(input)
    expect(result).not.toContain('eyJhbGci')
    expect(result).toContain('[REDACTED]')
  })

  it('strips Perplexity pplx- key', () => {
    const input = 'Invalid key: pplx-abcdef1234567890abcdef1234567890ab'
    const result = sanitizeApiError(input)
    expect(result).not.toContain('pplx-')
    expect(result).toContain('[REDACTED]')
  })

  it('strips long hex strings (40+ chars)', () => {
    const hexKey = 'a'.repeat(40)
    const input = `Error with key: ${hexKey}`
    const result = sanitizeApiError(input)
    expect(result).not.toContain(hexKey)
    expect(result).toContain('[REDACTED]')
  })

  it('truncates long messages to 300 chars', () => {
    const input = 'x'.repeat(500)
    const result = sanitizeApiError(input)
    expect(result.length).toBeLessThanOrEqual(315) // 300 + '...[truncated]'
    expect(result).toContain('...[truncated]')
  })

  it('passes through safe messages unchanged', () => {
    const input = 'Connection timeout after 5000ms'
    expect(sanitizeApiError(input)).toBe(input)
  })

  it('strips multiple keys in same message', () => {
    const input = 'api_key=abcdef1234567890abcdef1234567890ab and Bearer token123456789abcdef'
    const result = sanitizeApiError(input)
    expect(result).not.toContain('abcdef1234567890')
  })
})
