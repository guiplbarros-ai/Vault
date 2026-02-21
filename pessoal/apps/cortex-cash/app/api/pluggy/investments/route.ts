import { getPluggyClient } from '@/lib/pluggy/client'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const itemId = request.nextUrl.searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId query parameter' },
        { status: 400 }
      )
    }

    const client = getPluggyClient()
    const investments = await client.fetchInvestments(itemId)

    return NextResponse.json(investments)
  } catch (error: any) {
    console.error('Error fetching Pluggy investments:', error)
    const message = error?.response?.body?.message || error?.message || String(error)
    return NextResponse.json(
      { error: 'Failed to fetch investments', message },
      { status: error?.response?.statusCode || 500 }
    )
  }
}
