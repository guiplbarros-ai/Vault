'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { useCategorias } from '@/lib/hooks/use-categorias'
import { useAccounts } from '@/lib/hooks/use-contas'

export interface ReportFilters {
  categoriaId?: string
  contaId?: string
  tipo?: string
  dataInicio?: string
  dataFim?: string
  periodo?: 'mes-atual' | 'mes-anterior' | '3-meses' | '6-meses' | '12-meses' | 'personalizado'
}

interface ReportFiltersProps {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
}

export function ReportFiltersComponent({ filters, onFiltersChange }: ReportFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const { data: categories } = useCategorias()
  const { data: accounts } = useAccounts()

  const handlePeriodoChange = (periodo: string) => {
    const now = new Date()
    let dataInicio: string
    let dataFim: string

    switch (periodo) {
      case 'mes-atual':
        dataInicio = format(startOfMonth(now), 'yyyy-MM-dd')
        dataFim = format(endOfMonth(now), 'yyyy-MM-dd')
        break
      case 'mes-anterior':
        const lastMonth = subMonths(now, 1)
        dataInicio = format(startOfMonth(lastMonth), 'yyyy-MM-dd')
        dataFim = format(endOfMonth(lastMonth), 'yyyy-MM-dd')
        break
      case '3-meses':
        dataInicio = format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd')
        dataFim = format(endOfMonth(now), 'yyyy-MM-dd')
        break
      case '6-meses':
        dataInicio = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd')
        dataFim = format(endOfMonth(now), 'yyyy-MM-dd')
        break
      case '12-meses':
        dataInicio = format(startOfMonth(subMonths(now, 11)), 'yyyy-MM-dd')
        dataFim = format(endOfMonth(now), 'yyyy-MM-dd')
        break
      case 'personalizado':
        // Keep current dates or use defaults
        dataInicio = filters.dataInicio || format(startOfMonth(now), 'yyyy-MM-dd')
        dataFim = filters.dataFim || format(endOfMonth(now), 'yyyy-MM-dd')
        break
      default:
        dataInicio = format(startOfMonth(now), 'yyyy-MM-dd')
        dataFim = format(endOfMonth(now), 'yyyy-MM-dd')
    }

    onFiltersChange({
      ...filters,
      periodo: periodo as ReportFilters['periodo'],
      dataInicio,
      dataFim,
    })
  }

  const handleClearFilters = () => {
    const now = new Date()
    onFiltersChange({
      periodo: 'mes-atual',
      dataInicio: format(startOfMonth(now), 'yyyy-MM-dd'),
      dataFim: format(endOfMonth(now), 'yyyy-MM-dd'),
    })
  }

  const activeFiltersCount = [
    filters.categoriaId,
    filters.contaId,
    filters.tipo,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-xs text-brand-contrast">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" onClick={handleClearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="grid gap-4 rounded-2xl border border-line/25 bg-surface p-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Período */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text">Período</label>
            <Select
              value={filters.periodo || 'mes-atual'}
              onValueChange={handlePeriodoChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes-atual">Mês Atual</SelectItem>
                <SelectItem value="mes-anterior">Mês Anterior</SelectItem>
                <SelectItem value="3-meses">Últimos 3 Meses</SelectItem>
                <SelectItem value="6-meses">Últimos 6 Meses</SelectItem>
                <SelectItem value="12-meses">Últimos 12 Meses</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Início */}
          {filters.periodo === 'personalizado' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Data Início</label>
              <Input
                type="date"
                value={filters.dataInicio || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, dataInicio: e.target.value })
                }
              />
            </div>
          )}

          {/* Data Fim */}
          {filters.periodo === 'personalizado' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Data Fim</label>
              <Input
                type="date"
                value={filters.dataFim || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, dataFim: e.target.value })
                }
              />
            </div>
          )}

          {/* Categoria */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text">Categoria</label>
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
            <label className="text-sm font-medium text-text">Conta</label>
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
            <label className="text-sm font-medium text-text">Tipo</label>
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
