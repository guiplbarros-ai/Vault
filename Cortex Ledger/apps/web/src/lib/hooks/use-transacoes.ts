import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Transaction {
  id: string
  conta_id: string
  data: string
  descricao: string
  valor: number
  tipo: string | null
  categoria_id: string | null
  saldo_apos: number | null
  parcela_n: number | null
  parcelas_total: number | null
  // Campos adicionais para multi-moeda e tracking
  valorOriginal?: number | null
  moedaOriginal?: string | null
  idExterno?: string | null
  link_original_id?: string | null
  hash_dedupe?: string
  // Joined data
  conta?: {
    apelido: string
    tipo: string
  }
  categoria?: {
    nome: string
    grupo: string
  }
}

export interface TransactionFilters {
  search?: string
  contaId?: string
  categoriaId?: string
  tipo?: string
  dataInicio?: string
  dataFim?: string
}

export interface TransactionsParams {
  page?: number
  limit?: number
  filters?: TransactionFilters
}

async function fetchTransactions({
  page = 1,
  limit = 50,
  filters = {},
}: TransactionsParams): Promise<{ data: Transaction[]; total: number }> {
  const offset = (page - 1) * limit

  // Build query
  let query = supabase
    .from('transacao')
    .select('*, conta(apelido, tipo), categoria(nome, grupo)', { count: 'exact' })
    .order('data', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply filters
  if (filters.search) {
    query = query.ilike('descricao', `%${filters.search}%`)
  }

  if (filters.contaId) {
    query = query.eq('conta_id', filters.contaId)
  }

  if (filters.categoriaId) {
    query = query.eq('categoria_id', filters.categoriaId)
  }

  if (filters.tipo) {
    query = query.eq('tipo', filters.tipo)
  }

  if (filters.dataInicio) {
    query = query.gte('data', filters.dataInicio)
  }

  if (filters.dataFim) {
    query = query.lte('data', filters.dataFim)
  }

  const { data, error, count } = await query

  if (error) throw error

  return {
    data: (data || []) as Transaction[],
    total: count || 0,
  }
}

export function useTransactions(params: TransactionsParams = {}) {
  return useQuery({
    queryKey: ['transactions', params.page, params.limit, params.filters],
    queryFn: () => fetchTransactions(params),
    staleTime: 60000, // 1 minuto
  })
}

// Hook para buscar transação individual
async function fetchTransaction(id: string): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from('transacao')
    .select('*, conta(apelido, tipo), categoria(nome, grupo)')
    .eq('id', id)
    .single()

  if (error) throw error

  return data as Transaction
}

export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => fetchTransaction(id!),
    enabled: !!id,
  })
}
