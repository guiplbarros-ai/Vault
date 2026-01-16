'use server'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { quotes, customers, users, materialPrices } from '@/lib/db/schema'
import { eq, and, gte, sql, desc } from 'drizzle-orm'

async function getCompanyId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  })

  return dbUser?.companyId ?? null
}

export interface DashboardStats {
  quotesThisMonth: number
  totalCustomers: number
  totalProducts: number
  revenueThisMonth: number
}

export interface RecentQuote {
  id: string
  quoteNumber: string
  customerName: string
  total: string
  status: string
  createdAt: Date
}

export async function fetchDashboardStats(): Promise<{
  data: DashboardStats | null
  error: string | null
}> {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { data: null, error: 'Não autenticado' }
  }

  try {
    // Get first day of current month
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Count quotes this month
    const quotesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(quotes)
      .where(
        and(
          eq(quotes.companyId, companyId),
          gte(quotes.createdAt, firstDayOfMonth)
        )
      )

    // Count total customers
    const customersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.companyId, companyId))

    // Count material prices (as products)
    const productsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(materialPrices)
      .where(eq(materialPrices.companyId, companyId))

    // Sum revenue from approved quotes this month
    const revenueResult = await db
      .select({ total: sql<string>`COALESCE(SUM(CAST(total AS DECIMAL)), 0)` })
      .from(quotes)
      .where(
        and(
          eq(quotes.companyId, companyId),
          gte(quotes.createdAt, firstDayOfMonth),
          sql`status IN ('approved', 'production', 'completed')`
        )
      )

    return {
      data: {
        quotesThisMonth: Number(quotesResult[0]?.count ?? 0),
        totalCustomers: Number(customersResult[0]?.count ?? 0),
        totalProducts: Number(productsResult[0]?.count ?? 0),
        revenueThisMonth: Number(revenueResult[0]?.total ?? 0),
      },
      error: null,
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return { data: null, error: 'Erro ao buscar estatísticas' }
  }
}

export async function fetchRecentQuotes(): Promise<{
  data: RecentQuote[]
  error: string | null
}> {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { data: [], error: 'Não autenticado' }
  }

  try {
    const result = await db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        customerName: customers.name,
        total: quotes.total,
        status: quotes.status,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .innerJoin(customers, eq(quotes.customerId, customers.id))
      .where(eq(quotes.companyId, companyId))
      .orderBy(desc(quotes.createdAt))
      .limit(5)

    return {
      data: result.map((r) => ({
        id: r.id,
        quoteNumber: r.quoteNumber,
        customerName: r.customerName,
        total: r.total,
        status: r.status,
        createdAt: r.createdAt,
      })),
      error: null,
    }
  } catch (error) {
    console.error('Error fetching recent quotes:', error)
    return { data: [], error: 'Erro ao buscar orçamentos recentes' }
  }
}
