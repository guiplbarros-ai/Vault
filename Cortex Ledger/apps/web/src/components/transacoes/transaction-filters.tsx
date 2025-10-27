'use client'

import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAccounts } from '@/lib/hooks/use-accounts'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface TransactionFiltersProps {
  search: string
  contaId: string
  categoriaId: string
  tipo: string
  dataInicio: string
  dataFim: string
  onSearchChange: (value: string) => void
  onContaChange: (value: string) => void
  onCategoriaChange: (value: string) => void
  onTipoChange: (value: string) => void
  onDataInicioChange: (value: string) => void
  onDataFimChange: (value: string) => void
  onReset: () => void
  hasActiveFilters: boolean
}

export function TransactionFilters({
  search,
  contaId,
  categoriaId,
  tipo,
  dataInicio,
  dataFim,
  onSearchChange,
  onContaChange,
  onCategoriaChange,
  onTipoChange,
  onDataInicioChange,
  onDataFimChange,
  onReset,
  hasActiveFilters,
}: TransactionFiltersProps) {
  const { data: accounts } = useAccounts()

  // Fetch categorias
  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categoria')
        .select('*')
        .eq('ativa', true)
        .order('grupo')
        .order('nome')

      if (error) throw error
      return data
    },
  })

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted" />
          <Input
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Conta */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text">
              Conta
            </label>
            <Select value={contaId} onChange={(e) => onContaChange(e.target.value)}>
              <option value="">Todas</option>
              {accounts?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.apelido}
                </option>
              ))}
            </Select>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text">
              Categoria
            </label>
            <Select
              value={categoriaId}
              onChange={(e) => onCategoriaChange(e.target.value)}
            >
              <option value="">Todas</option>
              {categorias?.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.grupo ? `${categoria.grupo} > ` : ''}
                  {categoria.nome}
                </option>
              ))}
            </Select>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text">
              Tipo
            </label>
            <Select value={tipo} onChange={(e) => onTipoChange(e.target.value)}>
              <option value="">Todos</option>
              <option value="RECEITA">Receita</option>
              <option value="DESPESA">Despesa</option>
              <option value="TRANSFERENCIA">Transferência</option>
            </Select>
          </div>

          {/* Data Início */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text">
              Data Início
            </label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => onDataInicioChange(e.target.value)}
            />
          </div>

          {/* Data Fim */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text">
              Data Fim
            </label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => onDataFimChange(e.target.value)}
            />
          </div>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onReset}>
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
