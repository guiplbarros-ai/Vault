import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FaturaService } from '@/lib/services'

/**
 * GET /api/faturas/[id]
 * Busca uma fatura específica por ID
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
    const fatura = await faturaService.buscarFatura(params.id)

    if (!fatura) {
      return NextResponse.json(
        { error: 'Fatura não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ fatura }, { status: 200 })
  } catch (error) {
    console.error('Erro ao buscar fatura:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar fatura' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/faturas/[id]
 * Deleta uma fatura permanentemente
 */
export async function DELETE(
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
    await faturaService.deletarFatura(params.id)

    return NextResponse.json(
      { message: 'Fatura deletada com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao deletar fatura:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar fatura' },
      { status: 500 }
    )
  }
}
