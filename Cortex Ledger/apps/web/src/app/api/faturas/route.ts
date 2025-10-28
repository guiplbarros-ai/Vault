import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FaturaService } from '@/lib/services'

/**
 * GET /api/faturas?cartao_id=xxx&limit=12
 * Lista faturas de um cartão específico
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
    const limit = parseInt(searchParams.get('limit') || '12')

    if (!cartaoId) {
      return NextResponse.json(
        { error: 'cartao_id é obrigatório' },
        { status: 400 }
      )
    }

    const faturaService = new FaturaService(supabase)
    const faturas = await faturaService.listarFaturas(cartaoId, limit)

    return NextResponse.json({ faturas }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar faturas:', error)
    return NextResponse.json(
      { error: 'Erro ao listar faturas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/faturas
 * Cria uma nova fatura
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()

    // Validar dados obrigatórios
    if (
      !body.cartaoId ||
      !body.mesReferencia ||
      !body.dataFechamento ||
      !body.dataVencimento
    ) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    const faturaService = new FaturaService(supabase)
    const fatura = await faturaService.criarFatura(
      body.cartaoId,
      body.mesReferencia,
      new Date(body.dataFechamento),
      new Date(body.dataVencimento)
    )

    return NextResponse.json({ fatura }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar fatura:', error)
    return NextResponse.json(
      { error: 'Erro ao criar fatura' },
      { status: 500 }
    )
  }
}
