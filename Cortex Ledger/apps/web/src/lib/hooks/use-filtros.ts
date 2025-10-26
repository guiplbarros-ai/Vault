import { useState, useCallback } from 'react'

export interface Filtros {
  search: string
  contaId: string
  categoriaId: string
  tipo: string
  dataInicio: string
  dataFim: string
}

const initialFilters: Filtros = {
  search: '',
  contaId: '',
  categoriaId: '',
  tipo: '',
  dataInicio: '',
  dataFim: '',
}

export function useFiltros() {
  const [filtros, setFiltros] = useState<Filtros>(initialFilters)

  const updateFiltro = useCallback((key: keyof Filtros, value: string) => {
    setFiltros((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetFiltros = useCallback(() => {
    setFiltros(initialFilters)
  }, [])

  const hasActiveFilters = useCallback(() => {
    return Object.entries(filtros).some(([key, value]) => {
      if (key === 'search') return false // Search não conta como filtro ativo
      return value !== ''
    })
  }, [filtros])

  // Convert to API-compatible format
  const apiFilters = useCallback(() => {
    const filters: Record<string, string> = {}

    if (filtros.search) filters.search = filtros.search
    if (filtros.contaId) filters.contaId = filtros.contaId
    if (filtros.categoriaId) filters.categoriaId = filtros.categoriaId
    if (filtros.tipo) filters.tipo = filtros.tipo
    if (filtros.dataInicio) filters.dataInicio = filtros.dataInicio
    if (filtros.dataFim) filters.dataFim = filtros.dataFim

    return filters
  }, [filtros])

  return {
    filtros,
    updateFiltro,
    resetFiltros,
    hasActiveFilters: hasActiveFilters(),
    apiFilters: apiFilters(),
  }
}
