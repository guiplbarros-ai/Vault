import { getPluggyClient } from '@/lib/pluggy/client'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId')
    const from = request.nextUrl.searchParams.get('from') ?? undefined
    const to = request.nextUrl.searchParams.get('to') ?? undefined
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '500')

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId query parameter' },
        { status: 400 }
      )
    }

    const client = getPluggyClient()
    const transactions = await client.fetchTransactions(accountId, {
      from,
      to,
      page,
      pageSize,
    })

    return NextResponse.json(transactions)
  } catch (error: any) {
    console.error('Error fetching Pluggy transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions', message: 'Erro ao buscar transações' },
      { status: error?.response?.statusCode || 500 }
    )
  }
}
