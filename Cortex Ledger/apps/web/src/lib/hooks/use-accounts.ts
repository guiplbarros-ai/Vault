import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Account {
  id: string
  apelido: string
  tipo: string
  moeda: string
  ativa: boolean
  saldo: number
}

async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('conta')
    .select('*')
    .eq('ativa', true)

  if (error) throw error

  // Calcular saldo de cada conta
  const accountsWithBalance = await Promise.all(
    (data || []).map(async (conta) => {
      const { data: transactions } = await supabase
        .from('transacao')
        .select('valor')
        .eq('conta_id', conta.id)

      const saldo = transactions?.reduce((sum, t) => sum + parseFloat(t.valor), 0) || 0

      return {
        id: conta.id,
        apelido: conta.apelido || 'Sem nome',
        tipo: conta.tipo || 'corrente',
        moeda: conta.moeda || 'BRL',
        ativa: conta.ativa,
        saldo,
      }
    })
  )

  return accountsWithBalance
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  })
}
