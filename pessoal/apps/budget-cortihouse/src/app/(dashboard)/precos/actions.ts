'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  getAllPrices,
  updatePrices as updatePricesQuery,
  seedPrices,
} from '@/lib/db/queries/prices'

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

export async function fetchPrices() {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { error: 'Não autenticado', data: [] }
  }

  try {
    // First, ensure prices exist (seed if needed)
    await seedPrices(companyId)
    const prices = await getAllPrices(companyId)
    return { error: null, data: prices }
  } catch (error) {
    console.error('Error fetching prices:', error)
    return { error: 'Erro ao buscar preços', data: [] }
  }
}

export async function savePrices(updates: Array<{ id: string; price: number }>) {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { error: 'Não autenticado', success: false }
  }

  try {
    await updatePricesQuery(companyId, updates)
    revalidatePath('/precos')
    return { error: null, success: true }
  } catch (error) {
    console.error('Error saving prices:', error)
    return { error: 'Erro ao salvar preços', success: false }
  }
}
