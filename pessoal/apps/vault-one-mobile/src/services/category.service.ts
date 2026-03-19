import { supabase } from '@/lib/supabase'

export interface Categoria {
  id: string
  nome: string
  tipo: 'receita' | 'despesa' | 'transferencia'
  icone: string | null
  cor: string | null
  pai_id: string | null
  is_sistema: boolean
}

export async function listCategories(): Promise<Categoria[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('categorias')
    .select('id, nome, tipo, icone, cor, pai_id, is_sistema')
    .or(`usuario_id.eq.${user.id},is_sistema.eq.true`)
    .eq('ativa', true)
    .order('ordem')

  if (error) throw error
  return (data ?? []) as Categoria[]
}
