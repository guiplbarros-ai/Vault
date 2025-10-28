'use client'

import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategorias } from '@/lib/hooks/use-categorias'
import { useAccounts } from '@/lib/hooks/use-contas'
import { useState } from 'react'

export interface AdditionalFiltersData {
  categoriaId?: string
  contaId?: string
  tipo?: string
}

interface AdditionalFiltersProps {
  filters: AdditionalFiltersData
  onFiltersChange: (filters: AdditionalFiltersData) => void
}

export function AdditionalFilters({ filters, onFiltersChange }: AdditionalFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const { data: categories } = useCategorias()
  const { data: accounts } = useAccounts()

  const handleClearFilters = () => {
    onFiltersChange({})
  }

  const activeFiltersCount = [
    filters.categoriaId,
    filters.contaId,
    filters.tipo,
  ].filter(Boolean).length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros Adicionais
          {activeFiltersCount > 0 && (
            <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-xs text-brand-contrast">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="grid gap-3 rounded-2xl border border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 p-4 md:grid-cols-3">
          {/* Categoria */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-graphite-100">Categoria</label>
            <Select
              value={filters.categoriaId || 'todas'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  categoriaId: value === 'todas' ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nome} ({cat.grupo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conta */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-graphite-100">Conta</label>
            <Select
              value={filters.contaId || 'todas'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  contaId: value === 'todas' ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as contas</SelectItem>
                {accounts?.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.apelido} ({acc.tipo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-graphite-100">Tipo</label>
            <Select
              value={filters.tipo || 'todos'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  tipo: value === 'todos' ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="RECEITA">Receita</SelectItem>
                <SelectItem value="DESPESA">Despesa</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
