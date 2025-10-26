'use client'

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, format } from 'date-fns'

export interface BudgetInput {
  categoria_id: string
  mes_ref: Date
  valor_planejado: number
  valor_alerta_80?: number
  valor_alerta_100?: number
}

export interface BudgetUpdate extends Partial<BudgetInput> {
  id: string
}

// Create Budget
async function createBudget(input: BudgetInput) {
  const mesFormatted = format(startOfMonth(input.mes_ref), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('orcamento')
    .insert({
      categoria_id: input.categoria_id,
      mes_ref: mesFormatted,
      valor_planejado: input.valor_planejado,
      valor_alerta_80: input.valor_alerta_80 || input.valor_planejado * 0.8,
      valor_alerta_100: input.valor_alerta_100 || input.valor_planejado,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export function useCreateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      // Invalidate budget queries to refetch
      queryClient.invalidateQueries({ queryKey: ['budget-data'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

// Update Budget
async function updateBudget(input: BudgetUpdate) {
  const { id, mes_ref, ...rest } = input

  const updateData: any = { ...rest }

  if (mes_ref) {
    updateData.mes_ref = format(startOfMonth(mes_ref), 'yyyy-MM-dd')
  }

  const { data, error } = await supabase
    .from('orcamento')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-data'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

// Delete Budget
async function deleteBudget(id: string) {
  const { error } = await supabase
    .from('orcamento')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { id }
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-data'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

// Get all budgets (for management page)
export interface Budget {
  id: string
  categoria_id: string
  mes_ref: string
  valor_planejado: number
  valor_alerta_80: number
  valor_alerta_100: number
  categoria?: {
    id: string
    nome: string
    grupo: string
  }
}

async function fetchBudgets(mesRef?: Date): Promise<Budget[]> {
  let query = supabase
    .from('orcamento')
    .select('*, categoria:categoria_id (id, nome, grupo)')
    .order('mes_ref', { ascending: false })

  if (mesRef) {
    const mesFormatted = format(startOfMonth(mesRef), 'yyyy-MM-dd')
    query = query.eq('mes_ref', mesFormatted)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).map((item: any) => ({
    id: item.id,
    categoria_id: item.categoria_id,
    mes_ref: item.mes_ref,
    valor_planejado: item.valor_planejado,
    valor_alerta_80: item.valor_alerta_80,
    valor_alerta_100: item.valor_alerta_100,
    categoria: Array.isArray(item.categoria) ? item.categoria[0] : item.categoria,
  })) as Budget[]
}

export function useBudgets(mesRef?: Date) {
  return useQuery({
    queryKey: ['budgets', mesRef ? format(mesRef, 'yyyy-MM') : 'all'],
    queryFn: () => fetchBudgets(mesRef),
    staleTime: 1000 * 60, // 1 minuto
  })
}
