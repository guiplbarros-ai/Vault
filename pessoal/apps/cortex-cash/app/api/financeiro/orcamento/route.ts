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
  const now = new Date()
  const mes = searchParams.get('mes') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('orcamentos')
    .select('id, nome, tipo, valor_planejado, valor_realizado, categoria_id')
    .eq('usuario_id', userId)
    .eq('mes_referencia', mes)
    .order('nome')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const totalPlanejado = (data || []).reduce((sum, o) => sum + Number(o.valor_planejado), 0)
  const totalRealizado = (data || []).reduce((sum, o) => sum + Number(o.valor_realizado), 0)

  return NextResponse.json({
    mes,
    total_planejado: totalPlanejado,
    total_realizado: totalRealizado,
    percentual_utilizado: totalPlanejado > 0 ? ((totalRealizado / totalPlanejado) * 100).toFixed(1) : '0.0',
    orcamentos: (data || []).map(o => ({
      nome: o.nome,
      planejado: Number(o.valor_planejado),
      realizado: Number(o.valor_realizado),
      percentual: Number(o.valor_planejado) > 0
        ? ((Number(o.valor_realizado) / Number(o.valor_planejado)) * 100).toFixed(1)
        : '0.0',
    })),
  })
}
