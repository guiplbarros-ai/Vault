import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/db/supabase'
import { validateApiKey, getApiUserId } from '@/lib/api/auth'

/**
 * POST /api/financeiro/transacoes
 *
 * Insert a transaction (used by Bradesco Sync from vault-zero).
 * Expects: { conta_id, data, descricao, valor, tipo, hash?, origem_arquivo? }
 * Returns: { inserted: true, id } or { duplicate: true } if hash exists.
 */
export async function POST(request: NextRequest) {
  const authResult = validateApiKey(request)
  if (authResult instanceof NextResponse) return authResult

  const userResult = await getApiUserId()
  if (userResult instanceof NextResponse) return userResult
  const userId = userResult
  const supabase = getSupabaseServerClient()

  const body = await request.json()
  const { conta_id, data, descricao, valor, tipo, hash, origem_arquivo } = body

  if (!conta_id || !data || !descricao || valor == null || !tipo) {
    return NextResponse.json(
      { error: 'Missing required fields: conta_id, data, descricao, valor, tipo' },
      { status: 400 }
    )
  }

  // Dedup by hash if provided
  if (hash) {
    const { data: existing } = await supabase
      .from('transacoes')
      .select('id')
      .eq('hash', hash)
      .eq('usuario_id', userId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ duplicate: true, id: existing.id })
    }
  }

  const id = `tx_bradesco_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const now = new Date().toISOString()

  const { error } = await supabase.from('transacoes').insert({
    id,
    usuario_id: userId,
    conta_id,
    data,
    descricao,
    valor: Math.abs(Number(valor)),
    tipo,
    hash: hash || null,
    origem_arquivo: origem_arquivo || 'api',
    classificacao_origem: null,
    classificacao_confirmada: false,
    created_at: now,
    updated_at: now,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ inserted: true, id }, { status: 201 })
}

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
