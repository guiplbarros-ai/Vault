import { useState, useMemo } from 'react'

export interface UsePaginationProps {
  totalItems: number
  itemsPerPage?: number
  initialPage?: number
}

export interface UsePaginationReturn {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  startIndex: number
  endIndex: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
  setItemsPerPage: (items: number) => void
}

/**
 * Hook for managing pagination state
 * @param totalItems - Total number of items
 * @param itemsPerPage - Number of items per page (default: 10)
 * @param initialPage - Initial page number (default: 1)
 * @returns Pagination state and controls
 */
export function usePagination({
  totalItems,
  itemsPerPage: initialItemsPerPage = 10,
  initialPage = 1,
}: UsePaginationProps): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)

  const totalPages = useMemo(
    () => Math.ceil(totalItems / itemsPerPage) || 1,
    [totalItems, itemsPerPage]
  )

  const startIndex = useMemo(
    () => (currentPage - 1) * itemsPerPage,
    [currentPage, itemsPerPage]
  )

  const endIndex = useMemo(
    () => Math.min(startIndex + itemsPerPage, totalItems),
    [startIndex, itemsPerPage, totalItems]
  )

  const hasNextPage = currentPage < totalPages
  const hasPreviousPage = currentPage > 1

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(pageNumber)
  }

  const nextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1)
    }
  }

  const previousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToFirstPage = () => {
    setCurrentPage(1)
  }

  const goToLastPage = () => {
    setCurrentPage(totalPages)
  }

  const handleSetItemsPerPage = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    setItemsPerPage: handleSetItemsPerPage,
  }
}
