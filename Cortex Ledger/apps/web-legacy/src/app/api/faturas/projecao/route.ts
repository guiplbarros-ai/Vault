import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FaturaService } from '@/lib/services'

/**
 * GET /api/faturas/projecao?cartao_id=xxx&meses=3
 * Projeta faturas futuras baseado em parceladas e recorrências
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const cartaoId = searchParams.get('cartao_id')
    const meses = parseInt(searchParams.get('meses') || '3')

    if (!cartaoId) {
      return NextResponse.json(
        { error: 'cartao_id é obrigatório' },
        { status: 400 }
      )
    }

    const faturaService = new FaturaService(supabase)
    const projecoes = await faturaService.projetarFaturasFuturas(cartaoId, meses)

    return NextResponse.json({ projecoes }, { status: 200 })
  } catch (error) {
    console.error('Erro ao projetar faturas futuras:', error)
    return NextResponse.json(
      { error: 'Erro ao projetar faturas futuras' },
      { status: 500 }
    )
  }
}
