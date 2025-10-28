'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Categoria } from './use-categorias'

interface CreateCategoriaInput {
  nome: string
  grupo: string
  ativa?: boolean
}

interface UpdateCategoriaInput {
  id: string
  nome?: string
  grupo?: string
  ativa?: boolean
}

async function createCategoria(input: CreateCategoriaInput): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categoria')
    .insert({
      nome: input.nome,
      grupo: input.grupo,
      ativa: input.ativa ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data as Categoria
}

async function updateCategoria(input: UpdateCategoriaInput): Promise<Categoria> {
  const { id, ...updates } = input
  const { data, error } = await supabase
    .from('categoria')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Categoria
}

async function deleteCategoria(id: string): Promise<void> {
  const { error } = await supabase
    .from('categoria')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export function useCreateCategoria() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCategoria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
    },
  })
}

export function useUpdateCategoria() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCategoria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
    },
  })
}

export function useDeleteCategoria() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCategoria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
    },
  })
}
