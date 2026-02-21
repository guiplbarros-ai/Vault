import { getPluggyClient } from '@/lib/pluggy/client'
import { NextResponse } from 'next/server'

/**
 * POST /api/pluggy/connect-token
 *
 * Creates a short-lived connect token for the Pluggy Connect widget.
 * The token is valid for ~30 minutes and allows the frontend to open
 * the widget without exposing API credentials.
 */
export async function POST() {
  try {
    const client = getPluggyClient()
    const { accessToken } = await client.createConnectToken()

    return NextResponse.json({ accessToken })
  } catch (error: any) {
    console.error('Error creating Pluggy connect token:', error)
    const statusCode = error?.response?.statusCode || error?.status || 500
    const message = error?.response?.body?.message || error?.message || String(error)

    const isAuthError = statusCode === 401 || statusCode === 403
    return NextResponse.json(
      {
        error: isAuthError ? 'PLUGGY_AUTH_ERROR' : 'Failed to create connect token',
        message,
      },
      { status: statusCode }
    )
  }
}
