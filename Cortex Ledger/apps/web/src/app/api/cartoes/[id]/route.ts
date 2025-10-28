import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CartaoService } from '@/lib/services'
import type { CartaoFormInput } from '@/types/cartao'

/**
 * GET /api/cartoes/[id]
 * Busca um cartão específico por ID
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

    const cartaoService = new CartaoService(supabase)
    const cartao = await cartaoService.buscarCartao(params.id)

    if (!cartao) {
      return NextResponse.json(
        { error: 'Cartão não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ cartao }, { status: 200 })
  } catch (error) {
    console.error('Erro ao buscar cartão:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cartão' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/cartoes/[id]
 * Atualiza um cartão existente
 */
export async function PATCH(
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

    const body = await request.json()

    const input: Partial<CartaoFormInput> = {}

    if (body.nome) input.nome = body.nome
    if (body.instituicao) input.instituicao = body.instituicao
    if (body.bandeira) input.bandeira = body.bandeira
    if (body.ultimosDigitos) input.ultimosDigitos = body.ultimosDigitos
    if (body.tipoCartao) input.tipoCartao = body.tipoCartao
    if (body.limiteTotal !== undefined) input.limiteTotal = Number(body.limiteTotal)
    if (body.diaFechamento) input.diaFechamento = Number(body.diaFechamento)
    if (body.diaVencimento) input.diaVencimento = Number(body.diaVencimento)
    if (body.anuidadeValor !== undefined) input.anuidadeValor = Number(body.anuidadeValor)
    if (body.taxaJurosMes !== undefined) input.taxaJurosMes = Number(body.taxaJurosMes)

    const cartaoService = new CartaoService(supabase)
    const cartao = await cartaoService.atualizarCartao(params.id, input)

    return NextResponse.json({ cartao }, { status: 200 })
  } catch (error) {
    console.error('Erro ao atualizar cartão:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar cartão' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/cartoes/[id]
 * Desativa um cartão (soft delete)
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

    const cartaoService = new CartaoService(supabase)
    await cartaoService.desativarCartao(params.id)

    return NextResponse.json(
      { message: 'Cartão desativado com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao desativar cartão:', error)
    return NextResponse.json(
      { error: 'Erro ao desativar cartão' },
      { status: 500 }
    )
  }
}
