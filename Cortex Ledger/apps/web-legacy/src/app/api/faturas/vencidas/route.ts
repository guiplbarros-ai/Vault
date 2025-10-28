import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FaturaService } from '@/lib/services'

/**
 * GET /api/faturas/vencidas
 * Busca faturas vencidas e não pagas
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

    const faturaService = new FaturaService(supabase)
    const faturas = await faturaService.buscarFaturasVencidas()

    return NextResponse.json({ faturas }, { status: 200 })
  } catch (error) {
    console.error('Erro ao buscar faturas vencidas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar faturas vencidas' },
      { status: 500 }
    )
  }
}
