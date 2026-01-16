/**
 * Generic API response type
 */
export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Pagination parameters
 */
export type PaginationParams = {
  page: number
  limit: number
}

/**
 * Paginated response
 */
export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * Extract the resolved type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T
