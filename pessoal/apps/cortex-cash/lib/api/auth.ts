import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/db/supabase'

/**
 * Validates the API key from the Authorization header.
 * Accepts VAULT_ONE_API_KEY (dedicated) or SUPABASE_SERVICE_ROLE_KEY (legacy).
 * Returns the token if valid, or a 401 NextResponse if invalid.
 */
export function validateApiKey(request: Request): NextResponse | string {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const validKeys = [
    process.env.VAULT_ONE_API_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].filter(Boolean)

  if (validKeys.length === 0 || !validKeys.includes(token)) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  return token
}

/**
 * Gets the first user ID (single-tenant).
 * Returns the userId or a 404 NextResponse.
 */
export async function getApiUserId(): Promise<NextResponse | string> {
  const supabase = getSupabaseServerClient()
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1)
  const userId = profiles?.[0]?.id

  if (!userId) {
    return NextResponse.json({ error: 'No user found' }, { status: 404 })
  }

  return userId
}
