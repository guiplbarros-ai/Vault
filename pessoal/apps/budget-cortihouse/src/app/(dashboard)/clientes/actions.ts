'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { customers, users } from '@/lib/db/schema'
import { eq, and, or, ilike, desc } from 'drizzle-orm'
import type { NewCustomer, Customer } from '@/lib/db/schema'

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

// Fetch all customers for a company
export async function fetchCustomers(search?: string): Promise<{
  data: Customer[]
  error: string | null
}> {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { data: [], error: 'Não autenticado' }
  }

  try {
    const query = db.query.customers.findMany({
      where: search
        ? and(
            eq(customers.companyId, companyId),
            or(
              ilike(customers.name, `%${search}%`),
              ilike(customers.phone, `%${search}%`),
              ilike(customers.email, `%${search}%`)
            )
          )
        : eq(customers.companyId, companyId),
      orderBy: [desc(customers.createdAt)],
    })

    const data = await query
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching customers:', error)
    return { data: [], error: 'Erro ao buscar clientes' }
  }
}

// Fetch a single customer by ID
export async function fetchCustomer(id: string): Promise<{
  data: Customer | null
  error: string | null
}> {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { data: null, error: 'Não autenticado' }
  }

  try {
    const customer = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), eq(customers.companyId, companyId)),
    })

    return { data: customer ?? null, error: null }
  } catch (error) {
    console.error('Error fetching customer:', error)
    return { data: null, error: 'Erro ao buscar cliente' }
  }
}

// Create a new customer
export async function createCustomer(
  data: Omit<NewCustomer, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>
): Promise<{
  data: Customer | null
  error: string | null
}> {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { data: null, error: 'Não autenticado' }
  }

  try {
    const result = await db
      .insert(customers)
      .values({
        ...data,
        companyId,
      })
      .returning()

    revalidatePath('/clientes')
    return { data: result[0] ?? null, error: null }
  } catch (error) {
    console.error('Error creating customer:', error)
    return { data: null, error: 'Erro ao criar cliente' }
  }
}

// Update an existing customer
export async function updateCustomer(
  id: string,
  data: Partial<Omit<NewCustomer, 'id' | 'companyId' | 'createdAt'>>
): Promise<{
  data: Customer | null
  error: string | null
}> {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { data: null, error: 'Não autenticado' }
  }

  try {
    const result = await db
      .update(customers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, id), eq(customers.companyId, companyId)))
      .returning()

    revalidatePath('/clientes')
    revalidatePath(`/clientes/${id}`)
    return { data: result[0] ?? null, error: null }
  } catch (error) {
    console.error('Error updating customer:', error)
    return { data: null, error: 'Erro ao atualizar cliente' }
  }
}

// Delete a customer
export async function deleteCustomer(id: string): Promise<{
  success: boolean
  error: string | null
}> {
  const companyId = await getCompanyId()
  if (!companyId) {
    return { success: false, error: 'Não autenticado' }
  }

  try {
    await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.companyId, companyId)))

    revalidatePath('/clientes')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting customer:', error)
    return { success: false, error: 'Erro ao excluir cliente' }
  }
}
