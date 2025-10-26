'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Categoria {
  id: string
  nome: string
  grupo: string
  ativa: boolean
}

async function fetchCategorias(apenasAtivas: boolean = true): Promise<Categoria[]> {
  let query = supabase
    .from('categoria')
    .select('*')
    .order('grupo')
    .order('nome')

  if (apenasAtivas) {
    query = query.eq('ativa', true)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []) as Categoria[]
}

export function useCategorias(apenasAtivas: boolean = true) {
  return useQuery({
    queryKey: ['categorias', apenasAtivas],
    queryFn: () => fetchCategorias(apenasAtivas),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

// Get categorias agrupadas por grupo
export function useCategoriasAgrupadas(apenasAtivas: boolean = true) {
  const { data, ...rest } = useCategorias(apenasAtivas)

  const categoriasPorGrupo = React.useMemo(() => {
    if (!data) return {}

    return data.reduce((acc, cat) => {
      if (!acc[cat.grupo]) {
        acc[cat.grupo] = []
      }
      acc[cat.grupo].push(cat)
      return acc
    }, {} as Record<string, Categoria[]>)
  }, [data])

  return {
    ...rest,
    data: categoriasPorGrupo,
  }
}
