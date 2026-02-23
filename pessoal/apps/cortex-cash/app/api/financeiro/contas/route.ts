import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/db/supabase'
import { validateApiKey, getApiUserId } from '@/lib/api/auth'

export async function GET(request: Request) {
  const authResult = validateApiKey(request)
  if (authResult instanceof NextResponse) return authResult

  const userResult = await getApiUserId()
  if (userResult instanceof NextResponse) return userResult
  const userId = userResult
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .from('contas')
    .select('id, nome, tipo, saldo_atual, ativa, instituicao_id')
    .eq('usuario_id', userId)
    .order('nome')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const ativas = (data || []).filter(c => c.ativa)
  const saldoTotal = ativas.reduce((sum, c) => sum + Number(c.saldo_atual), 0)

  return NextResponse.json({
    total: ativas.length,
    saldo_total: saldoTotal,
    contas: ativas.map(c => ({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      saldo: Number(c.saldo_atual),
    })),
  })
}
