import { supabase } from '@/lib/supabase'

export interface Transacao {
  id: string
  conta_id: string
  categoria_id: string | null
  data: string
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa' | 'transferencia'
  tags: unknown
  created_at: string
}

interface ListOptions {
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  tipo?: string
  search?: string
}

export async function listTransactions(options: ListOptions = {}): Promise<Transacao[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('transacoes')
    .select('id, conta_id, categoria_id, data, descricao, valor, tipo, tags, created_at')
    .eq('usuario_id', user.id)
    .order('data', { ascending: false })
    .limit(options.limit ?? 50)

  if (options.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)
  if (options.startDate) query = query.gte('data', options.startDate)
  if (options.endDate) query = query.lte('data', options.endDate)
  if (options.tipo) query = query.eq('tipo', options.tipo)
  if (options.search) query = query.ilike('descricao', `%${options.search}%`)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Transacao[]
}

export async function createTransaction(tx: {
  conta_id: string
  categoria_id?: string
  data: string
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa'
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('transacoes')
    .insert({ ...tx, usuario_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMonthSummary(year: number, month: number) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('transacoes')
    .select('tipo, valor')
    .eq('usuario_id', user.id)
    .gte('data', startDate)
    .lte('data', `${endDate}T23:59:59`)

  if (error) throw error

  let income = 0
  let expense = 0
  for (const tx of data ?? []) {
    if (tx.tipo === 'receita') income += Number(tx.valor)
    else if (tx.tipo === 'despesa') expense += Number(tx.valor)
  }

  return { income, expense, result: income - expense }
}
