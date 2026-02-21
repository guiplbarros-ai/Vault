/**
 * Pluggy API Client Factory
 *
 * Creates and caches a PluggyClient instance.
 * The SDK handles API key generation and refresh internally.
 * Server-side only — never import this from client components.
 */

import { PluggyClient } from 'pluggy-sdk'

let cachedClient: PluggyClient | null = null

export function getPluggyClient(): PluggyClient {
  if (cachedClient) {
    return cachedClient
  }

  const clientId = process.env.PLUGGY_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET must be set in environment variables')
  }

  cachedClient = new PluggyClient({ clientId, clientSecret })
  return cachedClient
}
