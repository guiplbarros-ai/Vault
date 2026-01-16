'use server'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getPricesMap } from '@/lib/db/queries/prices'

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

export async function fetchMaterialPrices(): Promise<Record<string, number>> {
  const companyId = await getCompanyId()
  if (!companyId) {
    return {}
  }

  try {
    return await getPricesMap(companyId)
  } catch (error) {
    console.error('Error fetching prices:', error)
    return {}
  }
}
