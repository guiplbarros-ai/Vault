import { supabase } from '@/lib/supabase'

export interface Conta {
  id: string
  nome: string
  tipo: string
  saldo_atual: number
  ativa: boolean
  instituicao_id: string
  cor: string | null
  icone: string | null
}

export async function listContas(): Promise<Conta[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('contas')
    .select('id, nome, tipo, saldo_atual, ativa, instituicao_id, cor, icone')
    .eq('usuario_id', user.id)
    .eq('ativa', true)
    .order('nome')

  if (error) throw error
  return (data ?? []) as Conta[]
}
