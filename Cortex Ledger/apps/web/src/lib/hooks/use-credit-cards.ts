'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { requireSession, formatSupabaseError } from '@/lib/query-utils'

export interface CreditCard {
  id: string
  nome: string
  bandeira: string
  ultimos_digitos: string
  limite_total: number
  limite_disponivel: number
  fatura_atual: number
  fechamento_dia: number
  vencimento_dia: number
  utilizacao: number
  status: string
  cor?: string
}

async function fetchCreditCards(): Promise<CreditCard[]> {
  // Verificar sessão
  const session = await requireSession()
  if (!session) {
    return []
  }

  const { data, error } = await supabase
    .from('cartao_credito')
    .select('*')
    .eq('ativo', true)
    .order('nome')

  if (error) {
    // Se a tabela não existe, retornar array vazio silenciosamente
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.warn('⚠️  cartao_credito table not yet created. Please run the migration.')
      return []
    }
    throw formatSupabaseError(error, 'fetch credit cards')
  }

  // Calcular faturas atuais e limites disponíveis para cada cartão
  const cardsWithBalance = await Promise.all(
    (data || []).map(async (cartao) => {
      // Buscar valor da fatura atual (mês atual, não fechada)
      const hoje = new Date()
      const mesAtual = hoje.toISOString().slice(0, 7) // YYYY-MM

      const { data: faturaAtual } = await supabase
        .from('fatura_cartao')
        .select('valor_total')
        .eq('cartao_credito_id', cartao.id)
        .eq('mes_referencia', mesAtual)
        .eq('status', 'aberta')
        .single()

      const faturaValor = faturaAtual?.valor_total || 0
      const limiteTotal = parseFloat(cartao.limite_total) || 0
      const limiteDisponivel = limiteTotal - faturaValor
      const utilizacao = limiteTotal > 0 ? Math.round((faturaValor / limiteTotal) * 100) : 0

      // Definir cor baseada na bandeira
      let cor = 'from-slate-700 to-slate-900'
      if (cartao.bandeira === 'visa') cor = 'from-blue-600 to-blue-800'
      else if (cartao.bandeira === 'mastercard') cor = 'from-orange-600 to-orange-800'
      else if (cartao.bandeira === 'amex') cor = 'from-purple-600 to-purple-800'
      else if (cartao.bandeira === 'elo') cor = 'from-yellow-600 to-yellow-800'

      return {
        id: cartao.id,
        nome: cartao.nome || 'Cartão sem nome',
        bandeira: cartao.bandeira || 'outros',
        ultimos_digitos: cartao.ultimos_digitos || '****',
        limite_total: limiteTotal,
        limite_disponivel: limiteDisponivel,
        fatura_atual: faturaValor,
        fechamento_dia: cartao.dia_fechamento || 1,
        vencimento_dia: cartao.dia_vencimento || 10,
        utilizacao,
        status: cartao.ativo ? 'ativo' : 'inativo',
        cor,
      }
    })
  )

  return cardsWithBalance
}

export function useCreditCards() {
  return useQuery({
    queryKey: ['credit-cards'],
    queryFn: fetchCreditCards,
    staleTime: 1000 * 60, // 1 minuto
  })
}
