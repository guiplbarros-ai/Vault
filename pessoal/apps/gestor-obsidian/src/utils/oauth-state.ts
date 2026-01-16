import { hmacSha256Hex, timingSafeEqualHex } from './crypto.js'

export interface OAuthStatePayload {
  chatId: number
  workspaceId: string
  ts: number
}

export function createOAuthState(payload: OAuthStatePayload, secret: string): string {
  const raw = JSON.stringify(payload)
  const b64 = Buffer.from(raw, 'utf-8').toString('base64url')
  const sig = hmacSha256Hex(secret, b64)
  return `${b64}.${sig}`
}

export function verifyOAuthState(
  state: string,
  secret: string,
  ttlMs: number = 15 * 60_000
): OAuthStatePayload {
  const [b64, sig] = state.split('.', 2)
  if (!b64 || !sig) throw new Error('state inválido')
  const expected = hmacSha256Hex(secret, b64)
  if (!timingSafeEqualHex(sig, expected)) throw new Error('state inválido (assinatura)')
  const raw = Buffer.from(b64, 'base64url').toString('utf-8')
  const parsed = JSON.parse(raw) as OAuthStatePayload
  if (!parsed?.chatId || !parsed?.workspaceId || !parsed?.ts)
    throw new Error('state inválido (payload)')
  if (Date.now() - parsed.ts > ttlMs) throw new Error('state expirado')
  return parsed
}
