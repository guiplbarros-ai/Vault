'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Account {
  id: string
  apelido: string
  tipo: string
  instituicao?: string
  saldo_atual?: number
  ativo: boolean
}

async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('conta')
    .select('*')
    .eq('ativo', true)
    .order('apelido')

  if (error) throw error

  return (data || []) as Account[]
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    staleTime: 60000, // 1 minuto
  })
}
