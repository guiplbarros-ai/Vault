import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FaturaService } from '@/lib/services'

/**
 * GET /api/faturas/[id]/detalhes
 * Busca detalhes completos de uma fatura (com transações e cartão)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const faturaService = new FaturaService(supabase)
    const detalhes = await faturaService.buscarDetalhes(params.id)

    return NextResponse.json(detalhes, { status: 200 })
  } catch (error) {
    console.error('Erro ao buscar detalhes da fatura:', error)

    if (error instanceof Error && error.message === 'Fatura não encontrada') {
      return NextResponse.json(
        { error: 'Fatura não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao buscar detalhes da fatura' },
      { status: 500 }
    )
  }
}
