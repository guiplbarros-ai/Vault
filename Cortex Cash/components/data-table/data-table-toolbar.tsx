'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DataTableFilter {
  id: string
  label: string
  options?: Array<{ label: string; value: string }>
  type?: 'select' | 'text'
}

export interface DataTableToolbarProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: DataTableFilter[]
  filterValues?: Record<string, string>
  onFilterChange?: (filterId: string, value: string) => void
  onClearFilters?: () => void
  actions?: React.ReactNode
  className?: string
}

export function DataTableToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters = [],
  filterValues = {},
  onFilterChange,
  onClearFilters,
  actions,
  className,
}: DataTableToolbarProps) {
  const hasActiveFilters = Object.values(filterValues).some((value) => value !== '')

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <div className="flex flex-1 items-center gap-2">
        {onSearchChange && (
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-[150px] lg:w-[250px]"
          />
        )}

        {filters.map((filter) => {
          const value = filterValues[filter.id] || ''

          if (filter.type === 'text') {
            return (
              <Input
                key={filter.id}
                placeholder={filter.label}
                value={value}
                onChange={(e) => onFilterChange?.(filter.id, e.target.value)}
                className="h-9 w-[150px]"
              />
            )
          }

          if (filter.options) {
            return (
              <Select
                key={filter.id}
                value={value || '_all'}
                onValueChange={(val) => onFilterChange?.(filter.id, val === '_all' ? '' : val)}
              >
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos</SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }

          return null
        })}

        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 px-2 lg:px-3"
          >
            Limpar
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
