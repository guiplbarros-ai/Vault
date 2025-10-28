'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { requireSession, formatSupabaseError } from '@/lib/query-utils'

export interface Installment {
  id: string
  descricao: string
  cartao_id: string
  cartao_nome: string
  valor_total: number
  valor_parcela: number
  parcelas: number
  parcelas_pagas: number
  parcelas_restantes: number
  data_compra: string
  proxima_parcela: string
  status: 'ativo' | 'concluido' | 'cancelado'
}

async function fetchInstallments(): Promise<Installment[]> {
  // Verificar sessão
  const session = await requireSession()
  if (!session) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('parcelamento')
      .select(`
        id,
        descricao,
        cartao_credito_id,
        valor_total,
        numero_parcelas,
        data_compra,
        status
      `)
      .in('status', ['ativo', 'em_andamento'])
      .order('data_compra', { ascending: false })

    if (error) {
      // Se a tabela não existe, retornar array vazio silenciosamente
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('⚠️  parcelamento table not yet created. Please run the migration.')
        return []
      }
      console.error('Supabase error in fetch installments:', error)
      throw formatSupabaseError(error, 'fetch installments')
    }

    if (!data || data.length === 0) {
      return []
    }

    // Buscar cartões separadamente
    const cartaoIds = [...new Set(data.map(p => p.cartao_credito_id).filter(Boolean))]
    let cartoes: Record<string, any> = {}

    if (cartaoIds.length > 0) {
      const { data: cartoesData } = await supabase
        .from('cartao_credito')
        .select('id, nome')
        .in('id', cartaoIds)

      if (cartoesData) {
        cartoes = Object.fromEntries(
          cartoesData.map((cartao: any) => [cartao.id, cartao])
        )
      }
    }

    // Processar parcelamentos
    const installmentsWithDetails = await Promise.all(
      data.map(async (parc: any) => {
        const cartao = cartoes[parc.cartao_credito_id]
        const numeroParcelas = parc.numero_parcelas || 1
        const valorTotal = parseFloat(parc.valor_total) || 0
        const valorParcela = valorTotal / numeroParcelas

        // Contar parcelas pagas
        const { count: parcelasPagas } = await supabase
          .from('transacao')
          .select('*', { count: 'exact', head: true })
          .eq('parcelamento_id', parc.id)
          .not('data_pagamento', 'is', null)

        const numParcelasPagas = parcelasPagas || 0
        const parcelasRestantes = numeroParcelas - numParcelasPagas

        // Calcular data da próxima parcela
        const dataCompra = new Date(parc.data_compra)
        const proximaParcela = new Date(dataCompra)
        proximaParcela.setMonth(proximaParcela.getMonth() + numParcelasPagas + 1)

        return {
          id: parc.id,
          descricao: parc.descricao || 'Compra parcelada',
          cartao_id: parc.cartao_credito_id,
          cartao_nome: cartao?.nome || 'Cartão',
          valor_total: valorTotal,
          valor_parcela: valorParcela,
          parcelas: numeroParcelas,
          parcelas_pagas: numParcelasPagas,
          parcelas_restantes: parcelasRestantes,
          data_compra: parc.data_compra,
          proxima_parcela: proximaParcela.toISOString().split('T')[0],
          status: numParcelasPagas >= numeroParcelas ? 'concluido' : 'ativo',
        }
      })
    )

    // Filtrar apenas parcelamentos ativos
    return installmentsWithDetails.filter(p => p.status === 'ativo')
  } catch (err) {
    console.error('Error fetching installments:', err)
    return []
  }
}

export function useInstallments() {
  return useQuery({
    queryKey: ['installments'],
    queryFn: fetchInstallments,
    staleTime: 1000 * 60, // 1 minuto
  })
}
