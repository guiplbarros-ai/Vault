'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { companies, settings, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Company, Settings } from '@/lib/db/schema'

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

export interface CompanyData {
  name: string
  tradeName: string | null
  cnpj: string | null
  ie: string | null
  address: string | null
  phone: string | null
  phone2: string | null
  email: string | null
  website: string | null
}

export interface SettingsData {
  defaultValidityDays: number
  defaultDeliveryDays: number
  defaultDiscountCash: number
  hospitalCurvePrice: number
}

// Fetch company info
export async function fetchCompanyInfo(): Promise<{
  data: Company | null
  error: string | null
}> {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { data: null, error: 'Não autenticado' }
  }

  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    })

    return { data: company ?? null, error: null }
  } catch (error) {
    console.error('Error fetching company:', error)
    return { data: null, error: 'Erro ao buscar dados da empresa' }
  }
}

// Update company info
export async function updateCompanyInfo(data: CompanyData): Promise<{
  success: boolean
  error: string | null
}> {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { success: false, error: 'Não autenticado' }
  }

  try {
    await db
      .update(companies)
      .set({
        name: data.name,
        tradeName: data.tradeName,
        cnpj: data.cnpj,
        ie: data.ie,
        address: data.address,
        phone: data.phone,
        phone2: data.phone2,
        email: data.email,
        website: data.website,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))

    revalidatePath('/configuracoes')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error updating company:', error)
    return { success: false, error: 'Erro ao atualizar dados da empresa' }
  }
}

// Fetch settings
export async function fetchSettings(): Promise<{
  data: Settings | null
  error: string | null
}> {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { data: null, error: 'Não autenticado' }
  }

  try {
    let existingSettings = await db.query.settings.findFirst({
      where: eq(settings.companyId, companyId),
    })

    // Create default settings if not exists
    if (!existingSettings) {
      const [newSettings] = await db
        .insert(settings)
        .values({
          companyId,
        })
        .returning()
      existingSettings = newSettings
    }

    return { data: existingSettings ?? null, error: null }
  } catch (error) {
    console.error('Error fetching settings:', error)
    return { data: null, error: 'Erro ao buscar configurações' }
  }
}

// Update settings
export async function updateSettings(data: SettingsData): Promise<{
  success: boolean
  error: string | null
}> {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { success: false, error: 'Não autenticado' }
  }

  try {
    // Check if settings exist
    const existingSettings = await db.query.settings.findFirst({
      where: eq(settings.companyId, companyId),
    })

    if (existingSettings) {
      await db
        .update(settings)
        .set({
          defaultValidityDays: data.defaultValidityDays,
          defaultDeliveryDays: data.defaultDeliveryDays,
          defaultDiscountCash: data.defaultDiscountCash.toString(),
          hospitalCurvePrice: data.hospitalCurvePrice.toString(),
          updatedAt: new Date(),
        })
        .where(eq(settings.companyId, companyId))
    } else {
      await db.insert(settings).values({
        companyId,
        defaultValidityDays: data.defaultValidityDays,
        defaultDeliveryDays: data.defaultDeliveryDays,
        defaultDiscountCash: data.defaultDiscountCash.toString(),
        hospitalCurvePrice: data.hospitalCurvePrice.toString(),
      })
    }

    revalidatePath('/configuracoes')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error updating settings:', error)
    return { success: false, error: 'Erro ao atualizar configurações' }
  }
}
