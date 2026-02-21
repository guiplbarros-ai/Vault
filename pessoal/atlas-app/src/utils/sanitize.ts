const API_KEY_PATTERNS = [
  /api_key=[a-f0-9]{32,}/gi,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /apikey[=:]\s*[A-Za-z0-9\-._]{16,}/gi,
  /x-rapidapi-key[=:]\s*[A-Za-z0-9]{16,}/gi,
  /[a-f0-9]{40,}/gi,
  /pplx-[A-Za-z0-9]{32,}/gi,
]

export function sanitizeApiError(text: string): string {
  let sanitized = text
  for (const pattern of API_KEY_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]')
  }
  return sanitized.length > 300
    ? sanitized.slice(0, 300) + '...[truncated]'
    : sanitized
}
