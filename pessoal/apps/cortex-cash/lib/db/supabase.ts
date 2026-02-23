import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// ── Types ───────────────────────────────────────────────────
// NOTE: Database generic removed because manually generated types
// cause `never` inference in Supabase SDK's select/filter chains.
// Service files use their own row mapping types (Record<string, unknown>).
// TODO: Re-enable when using `supabase gen types` with proper CLI access.

export type SupabaseClient = ReturnType<typeof createBrowserClient>

// ── Environment ─────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ── Browser Client (for client components) ──────────────────

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient

  browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'cortex_cash' },
  })

  return browserClient
}

// ── Server Client (for API routes & server components) ──────

export function getSupabaseServerClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server operations')
  }

  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: 'cortex_cash' },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// ── Authenticated Server Client (for SSR with user context) ─

export function getSupabaseAuthClient(accessToken?: string) {
  const key = accessToken || SUPABASE_ANON_KEY

  return createSupabaseClient(SUPABASE_URL, key, {
    db: { schema: 'cortex_cash' },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  })
}

// ── Convenience: get the right client based on context ──────

export function getSupabase() {
  if (typeof window !== 'undefined') {
    return getSupabaseBrowserClient()
  }
  return getSupabaseServerClient()
}
