import { getPluggyClient } from '@/lib/pluggy/client'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/pluggy/sync
 *
 * Fetches all data from Pluggy for a given Item and returns it in a single response.
 * The client-side sync service handles mapping and persistence to IndexedDB.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const itemId = body.itemId as string | undefined

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId in request body' },
        { status: 400 }
      )
    }

    const client = getPluggyClient()

    // 1. Fetch item info (connector name, status)
    const item = await client.fetchItem(itemId)

    // 2. Fetch all accounts
    const accountsResponse = await client.fetchAccounts(itemId)
    const accounts = accountsResponse.results

    // 3. Fetch all transactions for each account (handles pagination)
    const transactionsByAccount: Record<string, any[]> = {}
    for (const account of accounts) {
      try {
        const allTransactions = await client.fetchAllTransactions(account.id)
        transactionsByAccount[account.id] = allTransactions
      } catch (err) {
        console.error(`Error fetching transactions for account ${account.id}:`, err)
        transactionsByAccount[account.id] = []
      }
    }

    // 4. Fetch investments
    let investments: any[] = []
    try {
      const investmentsResponse = await client.fetchInvestments(itemId)
      investments = investmentsResponse.results
    } catch (err) {
      console.error('Error fetching investments:', err)
    }

    // 5. Fetch identity (optional, may not be available)
    let identity = null
    try {
      identity = await client.fetchIdentityByItemId(itemId)
    } catch {
      // Identity may not be available for all connectors
    }

    return NextResponse.json({
      item,
      accounts,
      transactionsByAccount,
      investments,
      identity,
      syncedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error syncing Pluggy data:', error)
    const statusCode = error?.response?.statusCode || error?.status || 500

    // Detect auth/trial expiration errors
    const isAuthError = statusCode === 401 || statusCode === 403
    return NextResponse.json(
      {
        error: isAuthError ? 'PLUGGY_AUTH_ERROR' : 'Failed to sync',
        message: isAuthError
          ? 'Erro de autenticação com Pluggy'
          : 'Erro ao sincronizar dados',
      },
      { status: statusCode }
    )
  }
}
