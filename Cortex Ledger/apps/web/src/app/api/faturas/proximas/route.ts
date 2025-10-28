import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FaturaService } from '@/lib/services'

/**
 * GET /api/faturas/proximas?dias=7
 * Busca faturas próximas do vencimento (próximos N dias)
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
    const dias = parseInt(searchParams.get('dias') || '7')

    const faturaService = new FaturaService(supabase)
    const faturas = await faturaService.buscarFaturasProximasVencimento(dias)

    return NextResponse.json({ faturas }, { status: 200 })
  } catch (error) {
    console.error('Erro ao buscar faturas próximas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar faturas próximas' },
      { status: 500 }
    )
  }
}
