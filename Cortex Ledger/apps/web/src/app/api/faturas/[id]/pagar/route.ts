import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FaturaService } from '@/lib/services'
import type { FaturaPagamentoInput } from '@/types/cartao'

/**
 * POST /api/faturas/[id]/pagar
 * Registra pagamento de uma fatura
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

    const body = await request.json()

    // Validar dados obrigatórios
    if (!body.contaOrigemId || !body.valor || !body.dataPagamento) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    const input: FaturaPagamentoInput = {
      faturaId: params.id,
      contaOrigemId: body.contaOrigemId,
      valor: Number(body.valor),
      dataPagamento: new Date(body.dataPagamento),
      observacoes: body.observacoes,
    }

    const faturaService = new FaturaService(supabase)
    await faturaService.registrarPagamento(input)

    return NextResponse.json(
      { message: 'Pagamento registrado com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error)

    if (
      error instanceof Error &&
      (error.message === 'Fatura não encontrada' ||
        error.message === 'Cartão não encontrado')
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Erro ao registrar pagamento' },
      { status: 500 }
    )
  }
}
