import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import { loadEnv } from '../utils/env.js'

loadEnv()

export interface SupabaseConfig {
  url: string
  serviceRoleKey: string
}

function decodeBase64Url(s: string): string {
  // JWT uses base64url without padding
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(b64, 'base64').toString('utf-8')
}

export function decodeSupabaseJwtUnsafe(jwt: string): {
  header?: any
  payload?: any
  error?: string
} {
  try {
    const parts = (jwt || '').split('.')
    if (parts.length < 2) return { error: 'not-a-jwt' }
    const header = JSON.parse(decodeBase64Url(parts[0]))
    const payload = JSON.parse(decodeBase64Url(parts[1]))
    return { header, payload }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export function getSupabaseDiagnostics(): {
  configured: boolean
  urlHost?: string
  urlRef?: string
  keyLen?: number
  jwtRole?: string
  jwtIssuer?: string
  jwtRef?: string
  mismatch?: boolean
  note?: string
} {
  const cfg = getSupabaseConfig()
  if (!cfg) return { configured: false }
  const urlHost = (() => {
    try {
      return new URL(cfg.url).host
    } catch {
      return cfg.url
    }
  })()
  const urlRef = urlHost.split('.')[0] || undefined
  const keyLen = cfg.serviceRoleKey.length
  const decoded = decodeSupabaseJwtUnsafe(cfg.serviceRoleKey)
  const jwtRole = decoded.payload?.role ? String(decoded.payload.role) : undefined
  const jwtIssuer = decoded.payload?.iss ? String(decoded.payload.iss) : undefined
  // Supabase JWTs include `ref` with the project ref (subdomain).
  const jwtRef = decoded.payload?.ref ? String(decoded.payload.ref) : undefined
  const mismatch = !!(urlRef && jwtRef && urlRef !== jwtRef)
  const note =
    jwtRole && jwtRole !== 'service_role'
      ? `A key parece ser role="${jwtRole}" (esperado: service_role).`
      : mismatch
        ? `A key parece ser de outro projeto (urlRef="${urlRef}" vs jwtRef="${jwtRef}").`
        : undefined
  return { configured: true, urlHost, urlRef, keyLen, jwtRole, jwtIssuer, jwtRef, mismatch, note }
}

function getSupabaseConfig(): SupabaseConfig | null {
  const url = (process.env.SUPABASE_URL || '').trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !serviceRoleKey) return null
  return { url, serviceRoleKey }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null
}

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (client) return client
  const cfg = getSupabaseConfig()
  if (!cfg) {
    throw new Error('Supabase não configurado (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)')
  }
  client = createClient(cfg.url, cfg.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return client
}
