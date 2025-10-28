'use client'

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, format } from 'date-fns'
import { requireSession, formatSupabaseError } from '@/lib/query-utils'

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

  console.log('Creating budget with:', {
    categoria_id: input.categoria_id,
    mes: mesFormatted,
    valor_alvo: input.valor_planejado,
  })

  const { data, error } = await supabase
    .from('orcamento')
    .insert({
      categoria_id: input.categoria_id,
      mes: mesFormatted,
      valor_alvo: input.valor_planejado,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating budget:', error)
    throw error
  }

  console.log('Budget created successfully:', data)
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

  const updateData: any = {}

  if (rest.categoria_id) updateData.categoria_id = rest.categoria_id
  if (rest.valor_planejado) updateData.valor_alvo = rest.valor_planejado

  if (mes_ref) {
    updateData.mes = format(startOfMonth(mes_ref), 'yyyy-MM-dd')
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
  mes: string
  valor_alvo: number
  categoria?: {
    id: string
    nome: string
    grupo: string
  }
}

async function fetchBudgets(mesRef?: Date): Promise<Budget[]> {
  // Verificar se há sessão ativa
  const session = await requireSession()
  if (!session) {
    return []
  }

  // TEMPORARY: Query without categoria relationship until migration is applied
  let query = supabase
    .from('orcamento')
    .select('*')
    .order('mes', { ascending: false })

  if (mesRef) {
    const mesFormatted = format(startOfMonth(mesRef), 'yyyy-MM-dd')
    query = query.eq('mes', mesFormatted)
  }

  const { data, error } = await query

  if (error) {
    throw formatSupabaseError(error, 'fetch budgets')
  }

  // Buscar categorias separadamente
  const categoriaIds = [...new Set((data || []).map((item: any) => item.categoria_id).filter(Boolean))]

  let categorias: Record<string, any> = {}
  if (categoriaIds.length > 0) {
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('categoria')
      .select('id, nome, grupo')
      .in('id', categoriaIds)

    if (!categoriasError && categoriasData) {
      categorias = Object.fromEntries(
        categoriasData.map((cat: any) => [cat.id, cat])
      )
    }
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    categoria_id: item.categoria_id,
    mes: item.mes,
    valor_alvo: item.valor_alvo,
    categoria: categorias[item.categoria_id] || null,
  })) as Budget[]
}

export function useBudgets(mesRef?: Date) {
  return useQuery({
    queryKey: ['budgets', mesRef ? format(mesRef, 'yyyy-MM') : 'all'],
    queryFn: () => fetchBudgets(mesRef),
    staleTime: 1000 * 60, // 1 minuto
  })
}
