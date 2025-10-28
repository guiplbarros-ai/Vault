import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export interface SaudeFinanceiraData {
  poupancaPercentual: number // Poupança/Receita (%)
  burnRate: number // Despesas médias mensais
  runway: number // Meses de reserva (saldo / burn rate)
  indiceDividas: number // Dívidas/Receitas (%)
  receitaMedia: number // Receita média mensal (últimos 3 meses)
  despesaMedia: number // Despesa média mensal (últimos 3 meses)
  saldoTotal: number // Saldo total de todas as contas
}

async function fetchSaudeFinanceira(): Promise<SaudeFinanceiraData> {
  const now = new Date()

  // Calcular saldo total de todas as contas
  const { data: contas } = await supabase.from('conta').select('*').eq('ativa', true)

  let saldoTotal = 0

  if (contas) {
    for (const conta of contas) {
      const { data: transactions } = await supabase
        .from('transacao')
        .select('valor')
        .eq('conta_id', conta.id)

      const saldo = transactions?.reduce((sum, t) => sum + parseFloat(t.valor), 0) || 0
      saldoTotal += saldo
    }
  }

  // Calcular receitas e despesas dos últimos 3 meses
  const monthsToAnalyze = 3
  let totalReceitas = 0
  let totalDespesas = 0

  for (let i = 0; i < monthsToAnalyze; i++) {
    const date = subMonths(now, i)
    const startDate = format(startOfMonth(date), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(date), 'yyyy-MM-dd')

    const { data: transactions } = await supabase
      .from('transacao')
      .select('valor')
      .gte('data', startDate)
      .lte('data', endDate)

    if (transactions) {
      const receitas = transactions
        .filter((t) => parseFloat(t.valor) > 0)
        .reduce((sum, t) => sum + parseFloat(t.valor), 0)

      const despesas = Math.abs(
        transactions
          .filter((t) => parseFloat(t.valor) < 0)
          .reduce((sum, t) => sum + parseFloat(t.valor), 0)
      )

      totalReceitas += receitas
      totalDespesas += despesas
    }
  }

  const receitaMedia = totalReceitas / monthsToAnalyze
  const despesaMedia = totalDespesas / monthsToAnalyze
  const burnRate = despesaMedia

  // Poupança = Receita - Despesa (média mensal)
  const poupancaMensal = receitaMedia - despesaMedia
  const poupancaPercentual = receitaMedia > 0 ? (poupancaMensal / receitaMedia) * 100 : 0

  // Runway = Saldo Total / Burn Rate (quantos meses pode sobreviver com saldo atual)
  const runway = burnRate > 0 ? saldoTotal / burnRate : 0

  // Índice de dívidas = Despesas / Receitas (%)
  const indiceDividas = receitaMedia > 0 ? (despesaMedia / receitaMedia) * 100 : 0

  return {
    poupancaPercentual,
    burnRate,
    runway,
    indiceDividas,
    receitaMedia,
    despesaMedia,
    saldoTotal,
  }
}

export function useSaudeFinanceira() {
  return useQuery({
    queryKey: ['saude-financeira'],
    queryFn: fetchSaudeFinanceira,
    staleTime: 120000, // 2 minutos
  })
}
