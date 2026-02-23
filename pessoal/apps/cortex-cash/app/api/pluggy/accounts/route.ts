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
    const accounts = await client.fetchAccounts(itemId)

    return NextResponse.json(accounts)
  } catch (error: any) {
    console.error('Error fetching Pluggy accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts', message: 'Erro ao buscar contas' },
      { status: error?.response?.statusCode || 500 }
    )
  }
}
