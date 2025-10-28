import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FaturaService } from '@/lib/services'

/**
 * POST /api/faturas/[id]/fechar
 * Fecha uma fatura (muda status de aberta para fechada)
 */
export async function POST(
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
    await faturaService.fecharFatura(params.id)

    return NextResponse.json(
      { message: 'Fatura fechada com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao fechar fatura:', error)
    return NextResponse.json(
      { error: 'Erro ao fechar fatura' },
      { status: 500 }
    )
  }
}
