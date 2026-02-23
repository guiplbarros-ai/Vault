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

  const [contasRes, investimentosRes, snapshotsRes] = await Promise.all([
    supabase.from('contas').select('saldo_atual, tipo').eq('usuario_id', userId).eq('ativa', true),
    supabase.from('investimentos').select('nome, tipo, valor_atual, valor_aplicado, status').eq('usuario_id', userId).eq('status', 'ativo'),
    supabase.from('patrimonio_snapshots').select('mes, saldo_contas, saldo_investimentos, patrimonio_total').eq('usuario_id', userId).order('mes', { ascending: false }).limit(12),
  ])

  const saldoContas = (contasRes.data || []).reduce((sum, c) => sum + Number(c.saldo_atual), 0)
  const totalInvestido = (investimentosRes.data || []).reduce((sum, i) => sum + Number(i.valor_atual), 0)

  return NextResponse.json({
    patrimonio_total: saldoContas + totalInvestido,
    saldo_contas: saldoContas,
    saldo_investimentos: totalInvestido,
    investimentos: (investimentosRes.data || []).map(i => ({
      nome: i.nome,
      tipo: i.tipo,
      valor_atual: Number(i.valor_atual),
      valor_aplicado: Number(i.valor_aplicado),
      rentabilidade: Number(i.valor_aplicado) > 0
        ? ((Number(i.valor_atual) - Number(i.valor_aplicado)) / Number(i.valor_aplicado) * 100).toFixed(2)
        : '0.00',
    })),
    evolucao: (snapshotsRes.data || []).reverse().map(s => ({
      mes: s.mes,
      contas: Number(s.saldo_contas),
      investimentos: Number(s.saldo_investimentos),
      total: Number(s.patrimonio_total),
    })),
  })
}
