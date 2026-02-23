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

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const [contasRes, receitasRes, despesasRes, investimentosRes] = await Promise.all([
    supabase.from('contas').select('nome, saldo_atual, tipo').eq('usuario_id', userId).eq('ativa', true),
    supabase.from('transacoes').select('valor').eq('usuario_id', userId).eq('tipo', 'receita').gte('data', startOfMonth).lte('data', endOfMonth),
    supabase.from('transacoes').select('valor').eq('usuario_id', userId).eq('tipo', 'despesa').gte('data', startOfMonth).lte('data', endOfMonth),
    supabase.from('investimentos').select('valor_atual').eq('usuario_id', userId).eq('status', 'ativo'),
  ])

  const saldoTotal = (contasRes.data || []).reduce((sum, c) => sum + Number(c.saldo_atual), 0)
  const receitasMes = (receitasRes.data || []).reduce((sum, t) => sum + Number(t.valor), 0)
  const despesasMes = (despesasRes.data || []).reduce((sum, t) => sum + Math.abs(Number(t.valor)), 0)
  const investimentosTotal = (investimentosRes.data || []).reduce((sum, i) => sum + Number(i.valor_atual), 0)

  return NextResponse.json({
    periodo: `${now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`,
    saldo_total: saldoTotal,
    receitas_mes: receitasMes,
    despesas_mes: despesasMes,
    saldo_mes: receitasMes - despesasMes,
    investimentos_total: investimentosTotal,
    patrimonio_total: saldoTotal + investimentosTotal,
    contas: (contasRes.data || []).map(c => ({
      nome: c.nome,
      saldo: Number(c.saldo_atual),
      tipo: c.tipo,
    })),
  })
}
