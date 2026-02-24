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

  const { searchParams } = new URL(request.url)
  const since = searchParams.get('since')
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 200)

  if (!since) {
    return NextResponse.json(
      { error: 'Missing required param: since (ISO 8601 timestamp)' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('transacoes')
    .select('id, data, descricao, valor, tipo, conta_id, created_at, contas:conta_id (nome)')
    .eq('usuario_id', userId)
    .gt('created_at', since)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    total: data?.length || 0,
    since,
    transacoes: (data || []).map((t: Record<string, unknown>) => ({
      id: t.id,
      data: t.data,
      descricao: t.descricao,
      valor: Number(t.valor),
      tipo: t.tipo,
      conta_nome: (t.contas as Record<string, unknown>)?.nome || 'Desconhecida',
      created_at: t.created_at,
    })),
  })
}
