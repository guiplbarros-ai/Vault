'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { requireSession, formatSupabaseError } from '@/lib/query-utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface Invoice {
  id: string
  cartao_id: string
  cartao_nome: string
  mes: string
  mes_referencia: string
  valor: number
  vencimento: string
  status: 'aberta' | 'fechada' | 'paga' | 'vencida'
  transacoes: number
  data_pagamento?: string
}

async function fetchInvoices(): Promise<Invoice[]> {
  // Verificar sessão
  const session = await requireSession()
  if (!session) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('fatura_cartao')
      .select(`
        id,
        cartao_credito_id,
        mes_referencia,
        valor_total,
        data_vencimento,
        status,
        data_pagamento
      `)
      .order('mes_referencia', { ascending: false })
      .limit(12) // Últimos 12 meses

    if (error) {
      // Se a tabela não existe, retornar array vazio silenciosamente
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('⚠️  fatura_cartao table not yet created. Please run the migration.')
        return []
      }
      console.error('Supabase error in fetch invoices:', error)
      throw formatSupabaseError(error, 'fetch invoices')
    }

    if (!data || data.length === 0) {
      return []
    }

    // Buscar cartões separadamente
    const cartaoIds = [...new Set(data.map(f => f.cartao_credito_id).filter(Boolean))]
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

    // Processar faturas e contar transações
    const invoicesWithDetails = await Promise.all(
      data.map(async (fatura: any) => {
        // Contar transações da fatura
        const { count } = await supabase
          .from('transacao')
          .select('*', { count: 'exact', head: true })
          .eq('cartao_credito_id', fatura.cartao_credito_id)
          .gte('data', `${fatura.mes_referencia}-01`)
          .lt('data', getNextMonth(fatura.mes_referencia))

        const cartao = cartoes[fatura.cartao_credito_id]

        // Determinar status baseado na data de vencimento e pagamento
        let status = fatura.status
        if (fatura.data_pagamento) {
          status = 'paga'
        } else if (fatura.data_vencimento && new Date(fatura.data_vencimento) < new Date()) {
          status = 'vencida'
        }

        return {
          id: fatura.id,
          cartao_id: fatura.cartao_credito_id,
          cartao_nome: cartao?.nome || 'Cartão',
          mes: format(parseISO(`${fatura.mes_referencia}-01`), 'MMM/yyyy', { locale: ptBR }),
          mes_referencia: fatura.mes_referencia,
          valor: parseFloat(fatura.valor_total) || 0,
          vencimento: fatura.data_vencimento,
          status,
          transacoes: count || 0,
          data_pagamento: fatura.data_pagamento,
        }
      })
    )

    return invoicesWithDetails
  } catch (err) {
    console.error('Error fetching invoices:', err)
    return []
  }
}

function getNextMonth(mesReferencia: string): string {
  const [year, month] = mesReferencia.split('-').map(Number)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
}

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices,
    staleTime: 1000 * 60, // 1 minuto
  })
}
