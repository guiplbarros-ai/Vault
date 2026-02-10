import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import { loadEnv } from '../utils/env.js'

loadEnv()

export interface SupabaseConfig {
  url: string
  serviceRoleKey: string
}

function getSupabaseConfig(): SupabaseConfig | null {
  const url = (process.env.SUPABASE_URL || '').trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !serviceRoleKey) return null
  return { url, serviceRoleKey }
}

export function isSupabaseConfigured(): boolean {
  const url = (process.env.SUPABASE_URL || '').trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  return !!(url && serviceRoleKey)
}

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const url = (process.env.SUPABASE_URL || '').trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase nao configurado (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)')
  }

  client = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return client
}

export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('atlas_chat_settings').select('chat_id').limit(1)
    return !error
  } catch {
    return false
  }
}
