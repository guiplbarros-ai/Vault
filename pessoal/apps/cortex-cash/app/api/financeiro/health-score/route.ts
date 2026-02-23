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

  const [contasRes, receitasRes, despesasRes, investRes, orcamentosRes] = await Promise.all([
    supabase.from('contas').select('saldo_atual').eq('usuario_id', userId).eq('ativa', true),
    supabase.from('transacoes').select('valor').eq('usuario_id', userId).eq('tipo', 'receita').gte('data', startOfMonth).lte('data', endOfMonth),
    supabase.from('transacoes').select('valor').eq('usuario_id', userId).eq('tipo', 'despesa').gte('data', startOfMonth).lte('data', endOfMonth),
    supabase.from('investimentos').select('valor_atual').eq('usuario_id', userId).eq('status', 'ativo'),
    supabase.from('orcamentos').select('valor_planejado, valor_realizado').eq('usuario_id', userId).eq('mes_referencia', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`),
  ])

  const saldoTotal = (contasRes.data || []).reduce((sum, c) => sum + Number(c.saldo_atual), 0)
  const receitas = (receitasRes.data || []).reduce((sum, t) => sum + Number(t.valor), 0)
  const despesas = (despesasRes.data || []).reduce((sum, t) => sum + Math.abs(Number(t.valor)), 0)
  const investimentos = (investRes.data || []).reduce((sum, i) => sum + Number(i.valor_atual), 0)

  // Score components (0-100 each)
  const taxaPoupanca = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0
  const scorePoupanca = Math.min(100, Math.max(0, taxaPoupanca * 2)) // 50% savings = 100

  const scoreSaldo = saldoTotal > 0 ? Math.min(100, 50 + (saldoTotal / 10000) * 50) : Math.max(0, 50 + (saldoTotal / 5000) * 50)

  const scoreInvestimento = investimentos > 0 ? Math.min(100, (investimentos / (saldoTotal + investimentos)) * 200) : 0

  const orcamentos = orcamentosRes.data || []
  const orcamentosAderentes = orcamentos.filter(o => Number(o.valor_realizado) <= Number(o.valor_planejado)).length
  const scoreOrcamento = orcamentos.length > 0 ? (orcamentosAderentes / orcamentos.length) * 100 : 50

  const scoreTotal = Math.round((scorePoupanca * 0.3 + scoreSaldo * 0.25 + scoreInvestimento * 0.25 + scoreOrcamento * 0.2))

  return NextResponse.json({
    score: scoreTotal,
    classificacao: scoreTotal >= 80 ? 'Excelente' : scoreTotal >= 60 ? 'Bom' : scoreTotal >= 40 ? 'Regular' : 'Atenção',
    componentes: {
      poupanca: { score: Math.round(scorePoupanca), peso: '30%', taxa: `${taxaPoupanca.toFixed(1)}%` },
      saldo: { score: Math.round(scoreSaldo), peso: '25%', valor: saldoTotal },
      investimento: { score: Math.round(scoreInvestimento), peso: '25%', valor: investimentos },
      orcamento: { score: Math.round(scoreOrcamento), peso: '20%', aderencia: `${orcamentosAderentes}/${orcamentos.length}` },
    },
    resumo: {
      receitas_mes: receitas,
      despesas_mes: despesas,
      saldo_mes: receitas - despesas,
      patrimonio: saldoTotal + investimentos,
    },
  })
}
