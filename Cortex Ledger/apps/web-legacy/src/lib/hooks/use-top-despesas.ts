import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export interface TopDespesa {
  id: string
  descricao: string
  valor: number
  data: string
  categoria?: {
    nome: string
    grupo: string
  }
  conta?: {
    apelido: string
  }
}

async function fetchTopDespesas(mes?: Date, limit: number = 5): Promise<TopDespesa[]> {
  const targetDate = mes || new Date()
  const startDate = format(startOfMonth(targetDate), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(targetDate), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('transacao')
    .select('id, descricao, valor, data, categoria(nome, grupo), conta(apelido)')
    .lt('valor', 0) // Apenas despesas (valores negativos)
    .gte('data', startDate)
    .lte('data', endDate)
    .order('valor', { ascending: true }) // Menor valor primeiro (mais negativo)
    .limit(limit)

  if (error) {
    console.error('Error fetching top despesas:', error)
    throw error
  }

  // Supabase retorna relacionamentos como arrays, precisamos mapear
  return (data || []).map((item: any) => ({
    id: item.id,
    descricao: item.descricao,
    valor: item.valor,
    data: item.data,
    categoria: Array.isArray(item.categoria) ? item.categoria[0] : item.categoria,
    conta: Array.isArray(item.conta) ? item.conta[0] : item.conta,
  })) as TopDespesa[]
}

export function useTopDespesas(mes?: Date, limit: number = 5) {
  return useQuery({
    queryKey: ['top-despesas', format(mes || new Date(), 'yyyy-MM'), limit],
    queryFn: () => fetchTopDespesas(mes, limit),
    staleTime: 60000, // 1 minuto
  })
}
