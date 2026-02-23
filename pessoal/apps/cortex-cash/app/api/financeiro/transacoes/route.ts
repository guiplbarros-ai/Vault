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
  const limit = Math.min(Number(searchParams.get('limit') || '20'), 100)
  const tipo = searchParams.get('tipo') // receita | despesa | transferencia
  const from = searchParams.get('from') // YYYY-MM-DD
  const to = searchParams.get('to') // YYYY-MM-DD

  const query = supabase
    .from('transacoes')
    .select('id, data, descricao, valor, tipo, categoria_id, conta_id')
    .eq('usuario_id', userId)
    .order('data', { ascending: false })
    .limit(limit)

  if (tipo) query.eq('tipo', tipo)
  if (from) query.gte('data', from)
  if (to) query.lte('data', to)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    total: data?.length || 0,
    transacoes: (data || []).map(t => ({
      id: t.id,
      data: t.data,
      descricao: t.descricao,
      valor: Number(t.valor),
      tipo: t.tipo,
    })),
  })
}
