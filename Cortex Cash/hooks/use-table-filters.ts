import { useState, useMemo } from 'react'

export type SortDirection = 'asc' | 'desc' | null
export type FilterValue = string | number | boolean | Date | null | undefined

export interface TableFilter {
  [key: string]: FilterValue
}

export interface TableSort {
  column: string | null
  direction: SortDirection
}

export interface UseTableFiltersProps<T> {
  data: T[]
  initialFilters?: TableFilter
  initialSort?: TableSort
}

export interface UseTableFiltersReturn<T> {
  filteredData: T[]
  filters: TableFilter
  sort: TableSort
  setFilter: (key: string, value: FilterValue) => void
  clearFilter: (key: string) => void
  clearAllFilters: () => void
  setSort: (column: string) => void
  clearSort: () => void
  hasActiveFilters: boolean
}

/**
 * Hook for managing table filters and sorting
 * @param data - The data array to filter and sort
 * @param initialFilters - Initial filter values
 * @param initialSort - Initial sort configuration
 * @returns Filtered data and filter/sort controls
 */
export function useTableFilters<T extends Record<string, any>>({
  data,
  initialFilters = {},
  initialSort = { column: null, direction: null },
}: UseTableFiltersProps<T>): UseTableFiltersReturn<T> {
  const [filters, setFilters] = useState<TableFilter>(initialFilters)
  const [sort, setSort] = useState<TableSort>(initialSort)

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => value !== null && value !== undefined && value !== ''),
    [filters]
  )

  const filteredData = useMemo(() => {
    let result = [...data]

    // Apply filters
    if (hasActiveFilters) {
      result = result.filter((item) => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === null || value === undefined || value === '') return true

          const itemValue = item[key]

          // Handle different types of filtering
          if (typeof value === 'string') {
            return String(itemValue).toLowerCase().includes(value.toLowerCase())
          }

          if (typeof value === 'number') {
            return itemValue === value
          }

          if (typeof value === 'boolean') {
            return itemValue === value
          }

          if (value instanceof Date) {
            return itemValue instanceof Date && itemValue.getTime() === value.getTime()
          }

          return true
        })
      })
    }

    // Apply sorting
    if (sort.column && sort.direction) {
      result.sort((a, b) => {
        const aValue = a[sort.column!]
        const bValue = b[sort.column!]

        if (aValue === bValue) return 0

        let comparison = 0

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue)
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue
        } else if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime()
        } else {
          comparison = String(aValue).localeCompare(String(bValue))
        }

        return sort.direction === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [data, filters, sort, hasActiveFilters])

  const setFilter = (key: string, value: FilterValue) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilter = (key: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }

  const clearAllFilters = () => {
    setFilters({})
  }

  const handleSetSort = (column: string) => {
    setSort((prev) => {
      if (prev.column === column) {
        // Cycle through: asc -> desc -> null
        if (prev.direction === 'asc') {
          return { column, direction: 'desc' }
        } else if (prev.direction === 'desc') {
          return { column: null, direction: null }
        }
      }
      return { column, direction: 'asc' }
    })
  }

  const clearSort = () => {
    setSort({ column: null, direction: null })
  }

  return {
    filteredData,
    filters,
    sort,
    setFilter,
    clearFilter,
    clearAllFilters,
    setSort: handleSetSort,
    clearSort,
    hasActiveFilters,
  }
}
