/**
 * Supabase Mock Helper for Vitest
 *
 * Provides a chainable mock Supabase client for unit testing services.
 * Usage:
 *   const { mockSupabase, mockResponse, mockAuth } = createMockSupabase()
 *   vi.mock('@/lib/db/supabase', () => ({ getSupabase: () => mockSupabase, ... }))
 */

import { vi } from 'vitest'

interface MockQueryResult {
  data: any
  error: any
  count?: number
}

/**
 * Creates a chainable mock query builder that mimics Supabase PostgREST.
 * All chain methods return `this` except terminal methods which return { data, error }.
 */
export function createMockQueryBuilder(result: MockQueryResult = { data: null, error: null }) {
  const builder: any = {
    _result: result,

    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),

    // Terminal: resolve the chain by returning the mock result
    then(resolve: (value: MockQueryResult) => void, reject?: (error: any) => void) {
      return Promise.resolve(builder._result).then(resolve, reject)
    },
  }

  return builder
}

/**
 * Creates a full mock Supabase client with `from()`, `auth`, and `rpc()`.
 */
export function createMockSupabase() {
  const queryBuilders = new Map<string, ReturnType<typeof createMockQueryBuilder>>()

  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (!queryBuilders.has(table)) {
        queryBuilders.set(table, createMockQueryBuilder())
      }
      return queryBuilders.get(table)!
    }),

    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' }, session: {} },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },

    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  /**
   * Set the mock response for a specific table query.
   */
  function mockResponse(table: string, data: any, error: any = null) {
    const qb = createMockQueryBuilder({ data, error })
    queryBuilders.set(table, qb)
    return qb
  }

  /**
   * Set the mock auth user.
   */
  function mockAuth(userId: string = 'test-user-id') {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    })
  }

  /**
   * Reset all mocks to clean state.
   */
  function resetMocks() {
    queryBuilders.clear()
    mockSupabase.from.mockClear()
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
  }

  return { mockSupabase, mockResponse, mockAuth, resetMocks, queryBuilders }
}

/**
 * Helper to create a vi.mock factory for the Supabase module.
 * Use in your test file:
 *   const mock = createMockSupabase()
 *   vi.mock('@/lib/db/supabase', () => createSupabaseMockFactory(mock.mockSupabase))
 */
export function createSupabaseMockFactory(mockSupabase: any) {
  return {
    getSupabase: vi.fn(() => mockSupabase),
    getSupabaseBrowserClient: vi.fn(() => mockSupabase),
    getSupabaseServerClient: vi.fn(() => mockSupabase),
    getSupabaseAuthClient: vi.fn(() => mockSupabase),
  }
}
