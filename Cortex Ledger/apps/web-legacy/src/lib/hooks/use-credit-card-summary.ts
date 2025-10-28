'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { requireSession, formatSupabaseError } from '@/lib/query-utils'

export interface CreditCardSummary {
  total_aberto: number
  proximo_vencimento: {
    data: string
    valor: number
    cartao: string
  } | null
  limite_disponivel: number
  utilizacao_media: number
  parcelamentos_ativos: number
  alertas_pendentes: number
}

async function fetchCreditCardSummary(): Promise<CreditCardSummary> {
  // Verificar sessão
  const session = await requireSession()
  if (!session) {
    return {
      total_aberto: 0,
      proximo_vencimento: null,
      limite_disponivel: 0,
      utilizacao_media: 0,
      parcelamentos_ativos: 0,
      alertas_pendentes: 0,
    }
  }

  try {
    const hoje = new Date()
    const mesAtual = hoje.toISOString().slice(0, 7) // YYYY-MM

    // Buscar todas as faturas abertas
    const { data: faturasAbertas, error: faturasError } = await supabase
      .from('fatura_cartao')
      .select(`
        id,
        valor_total,
        data_vencimento,
        cartao_credito_id
      `)
      .eq('status', 'aberta')
      .gte('mes_referencia', mesAtual)

    if (faturasError) {
      // Se a tabela não existe, retornar silenciosamente valores padrão
      if (faturasError.message?.includes('does not exist') || faturasError.code === '42P01') {
        console.warn('⚠️  Credit card tables not yet created. Please run the migration.')
        return {
          total_aberto: 0,
          proximo_vencimento: null,
          limite_disponivel: 0,
          utilizacao_media: 0,
          parcelamentos_ativos: 0,
          alertas_pendentes: 0,
        }
      }
      console.error('Supabase error in fetch open invoices:', faturasError)
      throw formatSupabaseError(faturasError, 'fetch open invoices')
    }

    // Calcular total aberto
    const totalAberto = (faturasAbertas || []).reduce(
      (sum, f) => sum + (parseFloat(f.valor_total) || 0),
      0
    )

    // Buscar cartões para as faturas abertas
    let proximoVencimento = null
    if (faturasAbertas && faturasAbertas.length > 0) {
      const faturaOrdenada = [...faturasAbertas]
        .filter(f => f.data_vencimento)
        .sort((a, b) => new Date(a.data_vencimento!).getTime() - new Date(b.data_vencimento!).getTime())

      if (faturaOrdenada.length > 0) {
        const proxima = faturaOrdenada[0]

        // Buscar nome do cartão
        const { data: cartaoData } = await supabase
          .from('cartao_credito')
          .select('nome')
          .eq('id', proxima.cartao_credito_id)
          .single()

        proximoVencimento = {
          data: proxima.data_vencimento!,
          valor: parseFloat(proxima.valor_total) || 0,
          cartao: cartaoData?.nome || 'Cartão',
        }
      }
    }

    // Buscar todos os cartões ativos
    const { data: cartoes, error: cartoesError } = await supabase
      .from('cartao_credito')
      .select('id, limite_total')
      .eq('ativo', true)

    if (cartoesError) {
      // Se a tabela não existe, retornar valores padrão
      if (cartoesError.message?.includes('does not exist') || cartoesError.code === '42P01') {
        return {
          total_aberto: totalAberto,
          proximo_vencimento: proximoVencimento,
          limite_disponivel: 0,
          utilizacao_media: 0,
          parcelamentos_ativos: 0,
          alertas_pendentes: 0,
        }
      }
      console.error('Supabase error in fetch credit cards:', cartoesError)
      throw formatSupabaseError(cartoesError, 'fetch credit cards')
    }

    // Calcular limite disponível total e utilização média
    let limiteTotal = 0
    let limiteUtilizado = 0

    for (const cartao of cartoes || []) {
      const limite = parseFloat(cartao.limite_total) || 0
      limiteTotal += limite

      // Buscar fatura atual do cartão
      const { data: faturaAtual } = await supabase
        .from('fatura_cartao')
        .select('valor_total')
        .eq('cartao_credito_id', cartao.id)
        .eq('mes_referencia', mesAtual)
        .single()

      if (faturaAtual) {
        limiteUtilizado += parseFloat(faturaAtual.valor_total) || 0
      }
    }

    const limiteDisponivel = limiteTotal - limiteUtilizado
    const utilizacaoMedia = limiteTotal > 0 ? Math.round((limiteUtilizado / limiteTotal) * 100) : 0

    // Contar parcelamentos ativos
    const { count: parcelamentosAtivos } = await supabase
      .from('parcelamento')
      .select('*', { count: 'exact', head: true })
      .in('status', ['ativo', 'em_andamento'])

    // TODO: Implementar sistema de alertas
    const alertasPendentes = 0

    return {
      total_aberto: totalAberto,
      proximo_vencimento: proximoVencimento,
      limite_disponivel: limiteDisponivel,
      utilizacao_media: utilizacaoMedia,
      parcelamentos_ativos: parcelamentosAtivos || 0,
      alertas_pendentes: alertasPendentes,
    }
  } catch (err) {
    console.error('Error fetching credit card summary:', err)
    return {
      total_aberto: 0,
      proximo_vencimento: null,
      limite_disponivel: 0,
      utilizacao_media: 0,
      parcelamentos_ativos: 0,
      alertas_pendentes: 0,
    }
  }
}

export function useCreditCardSummary() {
  return useQuery({
    queryKey: ['credit-card-summary'],
    queryFn: fetchCreditCardSummary,
    staleTime: 1000 * 60, // 1 minuto
  })
}
