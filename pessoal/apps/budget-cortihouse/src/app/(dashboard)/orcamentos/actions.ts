'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { quotes, quoteRooms, quoteItems, users, customers } from '@/lib/db/schema'
import { eq, and, ilike, desc, } from 'drizzle-orm'
import type { Quote, QuoteRoom, QuoteItem } from '@/lib/db/schema'

// Import status types from constants
import type { QuoteStatus } from '@/lib/constants/quote-status'
export type { QuoteStatus } from '@/lib/constants/quote-status'

export interface QuoteWithCustomer extends Quote {
  customer: {
    id: string
    name: string
    phone: string | null
  }
}

export interface QuoteWithDetails extends Quote {
  customer: {
    id: string
    name: string
    phone: string | null
    email: string | null
    address: string | null
  }
  rooms: (QuoteRoom & {
    items: QuoteItem[]
  })[]
}

async function getCompanyIdAndUserId(): Promise<{ companyId: string; userId: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  })

  if (!dbUser) return null

  return { companyId: dbUser.companyId, userId: dbUser.id }
}

// Generate quote number
async function generateQuoteNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `ORC-${year}-`

  // Get the last quote number for this year
  const lastQuote = await db.query.quotes.findFirst({
    where: and(
      eq(quotes.companyId, companyId),
      ilike(quotes.quoteNumber, `${prefix}%`)
    ),
    orderBy: [desc(quotes.createdAt)],
  })

  let nextNumber = 1
  if (lastQuote) {
    const lastNumber = Number.parseInt(lastQuote.quoteNumber.replace(prefix, ''), 10)
    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`
}

// Fetch all quotes for a company
export async function fetchQuotes(options?: {
  search?: string
  status?: QuoteStatus
}): Promise<{
  data: QuoteWithCustomer[]
  error: string | null
}> {
  const auth = await getCompanyIdAndUserId()
  if (!auth) {
    return { data: [], error: 'Não autenticado' }
  }

  try {
    // Build where conditions
    const conditions = [eq(quotes.companyId, auth.companyId)]

    if (options?.status) {
      conditions.push(eq(quotes.status, options.status))
    }

    // Get quotes with customer info using join
    const result = await db
      .select({
        quote: quotes,
        customer: {
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
        },
      })
      .from(quotes)
      .innerJoin(customers, eq(quotes.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(quotes.createdAt))

    // Filter by search if provided
    let data = result.map((r) => ({
      ...r.quote,
      customer: r.customer,
    }))

    if (options?.search) {
      const search = options.search.toLowerCase()
      data = data.filter(
        (q) =>
          q.quoteNumber.toLowerCase().includes(search) ||
          q.customer.name.toLowerCase().includes(search)
      )
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return { data: [], error: 'Erro ao buscar orçamentos' }
  }
}

// Fetch a single quote with all details
export async function fetchQuote(id: string): Promise<{
  data: QuoteWithDetails | null
  error: string | null
}> {
  const auth = await getCompanyIdAndUserId()
  if (!auth) {
    return { data: null, error: 'Não autenticado' }
  }

  try {
    const quote = await db.query.quotes.findFirst({
      where: and(eq(quotes.id, id), eq(quotes.companyId, auth.companyId)),
      with: {
        customer: true,
        rooms: {
          with: {
            items: true,
          },
          orderBy: (rooms, { asc }) => [asc(rooms.sortOrder)],
        },
      },
    })

    if (!quote) {
      return { data: null, error: 'Orçamento não encontrado' }
    }

    return {
      data: {
        ...quote,
        customer: {
          id: quote.customer.id,
          name: quote.customer.name,
          phone: quote.customer.phone,
          email: quote.customer.email,
          address: quote.customer.address,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('Error fetching quote:', error)
    return { data: null, error: 'Erro ao buscar orçamento' }
  }
}

// Create a new quote
export async function createQuote(data: {
  customerId: string
  installationAddress?: string
  rooms: {
    name: string
    items: {
      description: string
      quantity: number
      unit: 'un' | 'm' | 'm2' | 'par' | 'kit'
      unitPrice: number
      total: number
      width?: number
      height?: number
      ceilingHeight?: number
      includesRail?: boolean
      includesInstallation?: boolean
      curves?: number
      calculationDetails?: object
    }[]
  }[]
  subtotal: number
  discountType?: 'percentage' | 'fixed'
  discountValue?: number
  discountAmount: number
  total: number
  notes?: string
  validityDays: number
  deliveryDays: number
}): Promise<{
  data: Quote | null
  error: string | null
}> {
  const auth = await getCompanyIdAndUserId()
  if (!auth) {
    return { data: null, error: 'Não autenticado' }
  }

  try {
    const quoteNumber = await generateQuoteNumber(auth.companyId)
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + data.validityDays)

    // Create quote
    const [newQuote] = await db
      .insert(quotes)
      .values({
        companyId: auth.companyId,
        userId: auth.userId,
        customerId: data.customerId,
        quoteNumber,
        status: 'draft',
        installationAddress: data.installationAddress,
        subtotal: data.subtotal.toString(),
        discountType: data.discountType,
        discountValue: data.discountValue?.toString(),
        discountAmount: data.discountAmount.toString(),
        total: data.total.toString(),
        validUntil,
        deliveryDays: data.deliveryDays,
        notes: data.notes,
      })
      .returning()

    if (!newQuote) {
      return { data: null, error: 'Erro ao criar orçamento' }
    }

    // Create rooms and items
    for (let roomIndex = 0; roomIndex < data.rooms.length; roomIndex++) {
      const room = data.rooms[roomIndex]
      if (!room) continue

      const [newRoom] = await db
        .insert(quoteRooms)
        .values({
          quoteId: newQuote.id,
          name: room.name,
          sortOrder: roomIndex,
        })
        .returning()

      if (newRoom && room.items.length > 0) {
        await db.insert(quoteItems).values(
          room.items.map((item, itemIndex) => ({
            quoteId: newQuote.id,
            roomId: newRoom.id,
            description: item.description,
            quantity: item.quantity.toString(),
            unit: item.unit,
            unitPrice: item.unitPrice.toString(),
            total: item.total.toString(),
            width: item.width?.toString(),
            height: item.height?.toString(),
            ceilingHeight: item.ceilingHeight?.toString(),
            includesRail: item.includesRail,
            includesInstallation: item.includesInstallation,
            curves: item.curves,
            calculationDetails: item.calculationDetails,
            sortOrder: itemIndex,
          }))
        )
      }
    }

    revalidatePath('/orcamentos')
    return { data: newQuote, error: null }
  } catch (error) {
    console.error('Error creating quote:', error)
    return { data: null, error: 'Erro ao criar orçamento' }
  }
}

// Update quote status
export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus
): Promise<{
  success: boolean
  error: string | null
}> {
  const auth = await getCompanyIdAndUserId()
  if (!auth) {
    return { success: false, error: 'Não autenticado' }
  }

  try {
    const updateData: Partial<Quote> = {
      status,
      updatedAt: new Date(),
    }

    // Set timestamps based on status
    if (status === 'pending') {
      updateData.sentAt = new Date()
    } else if (status === 'approved') {
      updateData.approvedAt = new Date()
    }

    await db
      .update(quotes)
      .set(updateData)
      .where(and(eq(quotes.id, id), eq(quotes.companyId, auth.companyId)))

    revalidatePath('/orcamentos')
    revalidatePath(`/orcamentos/${id}`)
    return { success: true, error: null }
  } catch (error) {
    console.error('Error updating quote status:', error)
    return { success: false, error: 'Erro ao atualizar status' }
  }
}

// Duplicate a quote
export async function duplicateQuote(id: string): Promise<{
  data: Quote | null
  error: string | null
}> {
  const auth = await getCompanyIdAndUserId()
  if (!auth) {
    return { data: null, error: 'Não autenticado' }
  }

  try {
    // Fetch original quote with all details
    const original = await db.query.quotes.findFirst({
      where: and(eq(quotes.id, id), eq(quotes.companyId, auth.companyId)),
      with: {
        rooms: {
          with: {
            items: true,
          },
        },
      },
    })

    if (!original) {
      return { data: null, error: 'Orçamento não encontrado' }
    }

    // Generate new quote number
    const quoteNumber = await generateQuoteNumber(auth.companyId)
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + (original.deliveryDays ?? 15))

    // Create new quote
    const [newQuote] = await db
      .insert(quotes)
      .values({
        companyId: auth.companyId,
        userId: auth.userId,
        customerId: original.customerId,
        quoteNumber,
        status: 'draft',
        installationAddress: original.installationAddress,
        subtotal: original.subtotal,
        discountType: original.discountType,
        discountValue: original.discountValue,
        discountAmount: original.discountAmount,
        total: original.total,
        validUntil,
        deliveryDays: original.deliveryDays,
        notes: original.notes,
      })
      .returning()

    if (!newQuote) {
      return { data: null, error: 'Erro ao duplicar orçamento' }
    }

    // Duplicate rooms and items
    for (const room of original.rooms) {
      const [newRoom] = await db
        .insert(quoteRooms)
        .values({
          quoteId: newQuote.id,
          name: room.name,
          sortOrder: room.sortOrder,
        })
        .returning()

      if (newRoom) {
        const items = room.items
        if (items.length > 0) {
          await db.insert(quoteItems).values(
            items.map((item) => ({
              quoteId: newQuote.id,
              roomId: newRoom.id,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              total: item.total,
              width: item.width,
              height: item.height,
              ceilingHeight: item.ceilingHeight,
              includesRail: item.includesRail,
              includesInstallation: item.includesInstallation,
              curves: item.curves,
              calculationDetails: item.calculationDetails,
              sortOrder: item.sortOrder,
            }))
          )
        }
      }
    }

    revalidatePath('/orcamentos')
    return { data: newQuote, error: null }
  } catch (error) {
    console.error('Error duplicating quote:', error)
    return { data: null, error: 'Erro ao duplicar orçamento' }
  }
}

// Delete a quote
export async function deleteQuote(id: string): Promise<{
  success: boolean
  error: string | null
}> {
  const auth = await getCompanyIdAndUserId()
  if (!auth) {
    return { success: false, error: 'Não autenticado' }
  }

  try {
    // Items and rooms will be deleted by CASCADE
    await db
      .delete(quotes)
      .where(and(eq(quotes.id, id), eq(quotes.companyId, auth.companyId)))

    revalidatePath('/orcamentos')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting quote:', error)
    return { success: false, error: 'Erro ao excluir orçamento' }
  }
}

