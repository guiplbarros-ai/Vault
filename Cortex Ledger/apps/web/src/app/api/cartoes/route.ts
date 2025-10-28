import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CartaoService } from '@/lib/services'
import type { CartaoFormInput } from '@/types/cartao'

/**
 * GET /api/cartoes
 * Lista todos os cartões do usuário autenticado
 */
export async function GET() {
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

    const cartaoService = new CartaoService(supabase)
    const cartoes = await cartaoService.listarCartoes()

    return NextResponse.json({ cartoes }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar cartões:', error)
    return NextResponse.json(
      { error: 'Erro ao listar cartões' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cartoes
 * Cria um novo cartão de crédito
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
      !body.nome ||
      !body.instituicao ||
      !body.bandeira ||
      !body.ultimosDigitos ||
      !body.limiteTotal ||
      !body.diaFechamento ||
      !body.diaVencimento
    ) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    const input: CartaoFormInput = {
      nome: body.nome,
      instituicao: body.instituicao,
      bandeira: body.bandeira,
      ultimosDigitos: body.ultimosDigitos,
      tipoCartao: body.tipoCartao || 'nacional',
      limiteTotal: Number(body.limiteTotal),
      diaFechamento: Number(body.diaFechamento),
      diaVencimento: Number(body.diaVencimento),
      anuidadeValor: body.anuidadeValor ? Number(body.anuidadeValor) : undefined,
      taxaJurosMes: body.taxaJurosMes ? Number(body.taxaJurosMes) : undefined,
    }

    const cartaoService = new CartaoService(supabase)
    const cartao = await cartaoService.criarCartao(input)

    return NextResponse.json({ cartao }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar cartão:', error)
    return NextResponse.json(
      { error: 'Erro ao criar cartão' },
      { status: 500 }
    )
  }
}
