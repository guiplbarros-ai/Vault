'use client'

import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DataTableColumn<T> {
  id: string
  header: string
  accessorKey?: keyof T
  cell?: (row: T) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
  width?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  loading?: boolean
  pageSize?: number
  searchable?: boolean
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  className?: string
  isDark?: boolean
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  pageSize: initialPageSize = 10,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  onRowClick,
  emptyMessage = 'Nenhum resultado encontrado.',
  className,
  isDark = false,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(initialPageSize)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc' | null>(null)

  // Filter data based on search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery) return data

    return data.filter((row) => {
      return columns.some((column) => {
        if (!column.filterable && !column.accessorKey) return false
        const value = column.accessorKey ? row[column.accessorKey] : null
        return value && String(value).toLowerCase().includes(searchQuery.toLowerCase())
      })
    })
  }, [data, searchQuery, columns])

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData

    const column = columns.find((col) => col.id === sortColumn)
    if (!column?.accessorKey) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[column.accessorKey!]
      const bValue = b[column.accessorKey!]

      if (aValue === bValue) return 0

      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (
        typeof aValue === 'object' &&
        aValue !== null &&
        'getTime' in aValue &&
        typeof (aValue as any).getTime === 'function' &&
        typeof bValue === 'object' &&
        bValue !== null &&
        'getTime' in bValue &&
        typeof (bValue as any).getTime === 'function'
      ) {
        comparison = (aValue as any).getTime() - (bValue as any).getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortColumn, sortDirection, columns])

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, sortedData.length)
  const paginatedData = sortedData.slice(startIndex, endIndex)

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortedData.length])

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      setSortColumn(columnId)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    )
  }

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      {searchable && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden shadow-md border" style={{
        background: isDark
          ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
          : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        backgroundColor: isDark ? '#3B5563' : '#FFFFFF'
      }}>
        <Table>
          <TableHeader>
            <TableRow className={isDark ? "bg-zinc-800/30" : "bg-zinc-50/80"}>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  style={{ width: column.width }}
                  className={cn(
                    column.sortable && 'cursor-pointer select-none',
                    isDark ? 'text-white' : ''
                  )}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && getSortIcon(column.id)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className={cn(
                  "h-24 text-center",
                  isDark ? "text-white/70" : ""
                )}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    onRowClick && 'cursor-pointer',
                    isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-zinc-50/80'
                  )}
                >
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      {column.cell
                        ? column.cell(row)
                        : column.accessorKey
                        ? String(row[column.accessorKey] ?? '')
                        : ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm",
              isDark ? "text-white/70" : "text-muted-foreground"
            )}>
              Exibindo {startIndex + 1} a {endIndex} de {sortedData.length} resultados
            </p>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className={cn(
                "w-[100px]",
                isDark
                  ? "!bg-gray-800 !border-gray-600 !text-white hover:!bg-gray-700"
                  : "!bg-white !border-gray-300 hover:!bg-gray-50"
              )}
              style={isDark ? {
                backgroundColor: '#1f2937',
                borderColor: '#4b5563',
                color: '#ffffff'
              } : {
                color: '#111827'
              }}>
                <SelectValue
                  className={isDark ? "!text-white" : ""}
                  style={isDark ? { color: '#ffffff' } : { color: '#111827' }}
                />
              </SelectTrigger>
              <SelectContent
                className={cn(
                  isDark
                    ? "!bg-gray-800 !border-gray-700"
                    : "!bg-white !border-gray-200"
                )}
                style={isDark ? {
                  backgroundColor: '#1f2937',
                  borderColor: '#374151'
                } : undefined}
              >
                <SelectItem
                  value="5"
                  className={cn(
                    "text-sm font-medium cursor-pointer",
                    isDark
                      ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700 data-[state=checked]:!bg-gray-700"
                      : ""
                  )}
                  style={isDark ? { color: '#ffffff' } : { color: '#111827' }}
                >
                  5
                </SelectItem>
                <SelectItem
                  value="10"
                  className={cn(
                    "text-sm font-medium cursor-pointer",
                    isDark
                      ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700 data-[state=checked]:!bg-gray-700"
                      : ""
                  )}
                  style={isDark ? { color: '#ffffff' } : { color: '#111827' }}
                >
                  10
                </SelectItem>
                <SelectItem
                  value="20"
                  className={cn(
                    "text-sm font-medium cursor-pointer",
                    isDark
                      ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700 data-[state=checked]:!bg-gray-700"
                      : ""
                  )}
                  style={isDark ? { color: '#ffffff' } : { color: '#111827' }}
                >
                  20
                </SelectItem>
                <SelectItem
                  value="50"
                  className={cn(
                    "text-sm font-medium cursor-pointer",
                    isDark
                      ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700 data-[state=checked]:!bg-gray-700"
                      : ""
                  )}
                  style={isDark ? { color: '#ffffff' } : { color: '#111827' }}
                >
                  50
                </SelectItem>
                <SelectItem
                  value="100"
                  className={cn(
                    "text-sm font-medium cursor-pointer",
                    isDark
                      ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700 data-[state=checked]:!bg-gray-700"
                      : ""
                  )}
                  style={isDark ? { color: '#ffffff' } : { color: '#111827' }}
                >
                  100
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className={cn(
              "text-sm",
              isDark ? "text-white" : ""
            )}>
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
