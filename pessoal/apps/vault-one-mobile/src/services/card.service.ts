import { supabase } from '@/lib/supabase'

export interface CartaoConfig {
  id: string
  nome: string
  ultimos_digitos: string | null
  bandeira: string | null
  limite_total: number
  dia_fechamento: number
  dia_vencimento: number
  ativo: boolean
  cor: string | null
  instituicao_id: string
}

export interface Fatura {
  id: string
  cartao_id: string
  mes_referencia: string
  valor_total: number
  valor_pago: number
  status: string
  data_vencimento: string
}

export async function listCartoes(): Promise<CartaoConfig[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('cartoes_config')
    .select('*')
    .eq('usuario_id', user.id)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return (data ?? []) as CartaoConfig[]
}

export async function listFaturas(cartaoId: string, limit = 3): Promise<Fatura[]> {
  const { data, error } = await supabase
    .from('faturas')
    .select('id, cartao_id, mes_referencia, valor_total, valor_pago, status, data_vencimento')
    .eq('cartao_id', cartaoId)
    .order('mes_referencia', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Fatura[]
}
