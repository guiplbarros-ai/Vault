import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CartaoService } from '@/lib/services'

/**
 * GET /api/cartoes/resumo
 * Busca resumo consolidado de todos os cartões
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
    const resumo = await cartaoService.buscarResumo()

    return NextResponse.json({ resumo }, { status: 200 })
  } catch (error) {
    console.error('Erro ao buscar resumo:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar resumo' },
      { status: 500 }
    )
  }
}
