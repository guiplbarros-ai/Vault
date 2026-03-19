import { listCategories } from '@/services/category.service'
import { useQuery } from '@tanstack/react-query'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: Infinity, // Categories rarely change
  })
}
