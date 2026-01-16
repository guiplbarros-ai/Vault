import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { quotes, companies, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { QuotePDF } from '@/lib/pdf/quote-pdf'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get user's company
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Get quote with details
    const quote = await db.query.quotes.findFirst({
      where: and(eq(quotes.id, id), eq(quotes.companyId, dbUser.companyId)),
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
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 })
    }

    // Get company info
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, dbUser.companyId),
    })

    // Transform quote data to match expected type
    const quoteData = {
      ...quote,
      customer: {
        id: quote.customer.id,
        name: quote.customer.name,
        phone: quote.customer.phone,
        email: quote.customer.email,
        address: quote.customer.address,
      },
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <QuotePDF
        quote={quoteData}
        company={company ? {
          name: company.name,
          tradeName: company.tradeName,
          cnpj: company.cnpj,
          phone: company.phone,
          email: company.email,
          address: company.address,
        } : undefined}
      />
    )

    // Return PDF with proper headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.quoteNumber.replace(/\//g, '-')}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar PDF' },
      { status: 500 }
    )
  }
}
