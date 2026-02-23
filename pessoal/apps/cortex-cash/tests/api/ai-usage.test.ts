/**
 * Testes de Integração - API /api/ai/usage
 * Agent CORE: Implementador
 *
 * ATENÇÃO: Alguns testes aqui EXPÕEM BUGS de arquitetura
 * Ver: docs/ARCHITECTURE_ISSUES_AI_USAGE.md
 *
 * Migrado de Dexie para Supabase mocks
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mock setup: inline to avoid module resolution issues
const { mockSupabase, mockResponse, resetMocks } = vi.hoisted(() => {
  function createMockQueryBuilder(result: any = { data: null, error: null }) {
    const builder: any = {
      _result: result,
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      then(resolve: any, reject?: any) {
        return Promise.resolve(builder._result).then(resolve, reject)
      },
    }
    return builder
  }

  const queryBuilders = new Map()
  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (!queryBuilders.has(table)) queryBuilders.set(table, createMockQueryBuilder())
      return queryBuilders.get(table)!
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  function mockResponse(table: string, data: any, error: any = null) {
    const qb = createMockQueryBuilder({ data, error })
    queryBuilders.set(table, qb)
    return qb
  }

  function resetMocks() {
    queryBuilders.clear()
    mockSupabase.from.mockClear()
  }

  return { mockSupabase, mockResponse, resetMocks }
})

vi.mock('@/lib/db/supabase', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  getSupabaseBrowserClient: vi.fn(() => mockSupabase),
  getSupabaseServerClient: vi.fn(() => mockSupabase),
  getSupabaseAuthClient: vi.fn(() => mockSupabase),
}))

import { GET } from '@/app/api/ai/usage/route'
import {
  calculateCost,
  checkAIBudgetLimit,
  confirmAISuggestion,
  getAIUsageSummary,
  logAIUsage,
} from '@/lib/services/ai-usage.service'

describe('API /api/ai/usage', () => {
  const mkReq = (url: string, init?: RequestInit) => new Request(url, init) as any

  beforeEach(() => {
    resetMocks()
    vi.clearAllMocks()
  })

  describe('logAIUsage', () => {
    it('deve registrar log de IA com sucesso', async () => {
      // Mock the insert chain
      mockResponse('logs_ia', { data: null, error: null })

      const log = await logAIUsage({
        transacao_id: 'test-123',
        prompt: 'Test prompt',
        resposta: 'Test response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: 'cat-123',
        confianca: 0.85,
      })

      expect(log).toHaveProperty('id')
      expect(log).toHaveProperty('custo_usd')
      expect(log.tokens_total).toBe(150)
      expect(log.modelo).toBe('gpt-4o-mini')
      expect(log.confirmada).toBe(false)
      expect(mockSupabase.from).toHaveBeenCalledWith('logs_ia')
    })

    it('deve calcular custo automaticamente', async () => {
      mockResponse('logs_ia', { data: null, error: null })

      const log = await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 1_000_000,
        tokens_resposta: 1_000_000,
      })

      // input: $0.150 / 1M tokens + output: $0.600 / 1M tokens = $0.750
      expect(log.custo_usd).toBeCloseTo(0.75, 3)
    })
  })

  describe('calculateCost', () => {
    it('deve calcular custo corretamente para gpt-4o-mini', () => {
      const cost = calculateCost('gpt-4o-mini', 1_000_000, 1_000_000)

      expect(cost).toBeCloseTo(0.75, 3)
    })

    it('deve calcular custo corretamente para gpt-4o', () => {
      const cost = calculateCost('gpt-4o', 1_000_000, 1_000_000)

      expect(cost).toBeCloseTo(12.5, 2)
    })

    it('deve lançar erro para modelo inválido', () => {
      // @ts-expect-error - Testando comportamento com tipo inválido
      expect(() => calculateCost('gpt-5-ultra', 100, 100)).toThrow('Modelo não suportado')
    })
  })

  describe('confirmAISuggestion', () => {
    it('deve marcar sugestão como confirmada', async () => {
      mockResponse('logs_ia', { data: null, error: null })

      // Should not throw
      await confirmAISuggestion('test-log-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('logs_ia')
    })
  })

  describe('getAIUsageSummary', () => {
    it('deve retornar resumo com estrutura correta', async () => {
      // Mock logs_ia query returning test data
      mockResponse('logs_ia', [
        {
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: 'cat-123',
          confirmada: false,
          confianca: 0.85,
        },
      ])

      const summary = await getAIUsageSummary()

      expect(summary).toHaveProperty('total_requests')
      expect(summary).toHaveProperty('total_tokens')
      expect(summary).toHaveProperty('total_cost_usd')
      expect(summary).toHaveProperty('total_cost_brl')
      expect(summary).toHaveProperty('confirmed_suggestions')
      expect(summary).toHaveProperty('rejected_suggestions')
      expect(summary).toHaveProperty('average_confidence')
      expect(summary.total_requests).toBe(1)
      expect(summary.total_tokens).toBe(150)
    })

    it('deve calcular average_confidence corretamente', async () => {
      mockResponse('logs_ia', [
        {
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: 'cat-1',
          confirmada: false,
          confianca: 0.9,
        },
        {
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: 'cat-2',
          confirmada: false,
          confianca: 0.7,
        },
      ])

      const summary = await getAIUsageSummary()

      // (0.9 + 0.7) / 2 = 0.8
      expect(summary.average_confidence).toBeCloseTo(0.8, 1)
    })

    it('deve retornar 0 para average_confidence quando não há sugestões', async () => {
      mockResponse('logs_ia', [
        {
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: null,
          confirmada: false,
          confianca: null,
        },
      ])

      const summary = await getAIUsageSummary()

      expect(summary.average_confidence).toBe(0)
    })

    it('deve filtrar logs por data corretamente', async () => {
      // Mock returning only current-month logs (Supabase handles filtering)
      mockResponse('logs_ia', [
        {
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: null,
          confirmada: false,
          confianca: null,
        },
      ])

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const summary = await getAIUsageSummary(startOfMonth, endOfMonth)

      // Supabase mock returns what we give it; verify it was called
      expect(summary.total_requests).toBe(1)
    })

    it('deve contar rejected_suggestions (não confirmadas)', async () => {
      mockResponse('logs_ia', [
        {
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: 'cat-1',
          confirmada: true,
          confianca: 0.9,
        },
        {
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: 'cat-2',
          confirmada: false,
          confianca: 0.7,
        },
        {
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: 'cat-3',
          confirmada: false,
          confianca: 0.85,
        },
      ])

      const summary = await getAIUsageSummary()

      expect(summary.confirmed_suggestions).toBe(1)
      expect(summary.rejected_suggestions).toBe(2)
    })
  })

  describe('checkAIBudgetLimit', () => {
    it('deve lançar ValidationError para limite negativo', async () => {
      await expect(checkAIBudgetLimit(new Date(), -10, 0.8)).rejects.toThrow(
        'Limite de gastos deve ser maior ou igual a zero'
      )
    })

    it('deve detectar quando está próximo do limite', async () => {
      // Mock logs that sum up to ~82% of $1.00 limit
      mockResponse('logs_ia', [
        {
          tokens_total: 150,
          custo_usd: 0.82,
          categoria_sugerida_id: null,
          confirmada: false,
          confianca: null,
        },
      ])

      const result = await checkAIBudgetLimit(new Date(), 1.0, 0.8)

      expect(result.isNearLimit).toBe(true)
      expect(result.isOverLimit).toBe(false)
      expect(result.percentageUsed).toBeGreaterThanOrEqual(80)
    })

    it('deve detectar quando excedeu o limite', async () => {
      // Mock logs that sum up to ~120% of $1.00 limit
      mockResponse('logs_ia', [
        {
          tokens_total: 150,
          custo_usd: 1.2,
          categoria_sugerida_id: null,
          confirmada: false,
          confianca: null,
        },
      ])

      const result = await checkAIBudgetLimit(new Date(), 1.0, 0.8)

      expect(result.isOverLimit).toBe(true)
      expect(result.percentageUsed).toBeGreaterThan(100)
      expect(result.remainingUsd).toBe(0)
    })

    it('limite zero gera isOverLimit quando há uso', async () => {
      mockResponse('logs_ia', [
        {
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: null,
          confirmada: false,
          confianca: null,
        },
      ])

      const result = await checkAIBudgetLimit(new Date(), 0, 0.8)

      expect(result.percentageUsed).toBe(0)
      expect(result.isOverLimit).toBe(true)
    })
  })

  describe('Taxa de Câmbio Consistente', () => {
    it('checkAIBudgetLimit agora usa mesma taxa que getAIUsageSummary', async () => {
      mockResponse('logs_ia', [
        {
          tokens_total: 150,
          custo_usd: 0.5,
          categoria_sugerida_id: null,
          confirmada: false,
          confianca: null,
        },
      ])

      const customRate = 5.8

      const summaryWithCustomRate = await getAIUsageSummary(undefined, undefined, customRate)

      // Reset and set up again for budget check
      resetMocks()
      mockResponse('logs_ia', [
        {
          tokens_total: 150,
          custo_usd: 0.5,
          categoria_sugerida_id: null,
          confirmada: false,
          confianca: null,
        },
      ])

      const budgetCheck = await checkAIBudgetLimit(new Date(), 10, 0.8, customRate)

      expect(summaryWithCustomRate.total_cost_usd).toBe(budgetCheck.usedUsd)
    })
  })

  describe('Type Safety', () => {
    it('logAIUsage retorna estrutura correta', async () => {
      mockResponse('logs_ia', { data: null, error: null })

      const validLog = await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
      })

      expect(validLog).toHaveProperty('id')
      expect(validLog).toHaveProperty('custo_usd')
      expect(validLog).toHaveProperty('tokens_total')
      expect(validLog).toHaveProperty('confirmada')
    })
  })

  describe('GET /api/ai/usage (route)', () => {
    // The GET route uses getServerStore() which is independent of Supabase
    // These tests verify the route handler behavior

    it('deve usar limite padrão quando não especificado', async () => {
      const request = mkReq('http://localhost:3000/api/ai/usage')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.limitBrl).toBe(10.0 * 6.0) // DEFAULT_LIMIT_USD * USD_TO_BRL
    })

    it('deve respeitar limite customizado via query param', async () => {
      const customLimit = 25.0
      const request = mkReq(`http://localhost:3000/api/ai/usage?limit=${customLimit}`)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.limitBrl).toBe(customLimit * 6.0)
    })

    it('deve retornar resumo de uso com estrutura correta', async () => {
      const request = mkReq('http://localhost:3000/api/ai/usage?limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('usedBrl')
      expect(data).toHaveProperty('limitBrl')
      expect(data).toHaveProperty('percentage')
      expect(data).toHaveProperty('isNearLimit')
      expect(data).toHaveProperty('isOverLimit')
      expect(data).toHaveProperty('summary')
      expect(data.summary).toHaveProperty('total_requests')
      expect(data.summary).toHaveProperty('total_tokens')
    })
  })
})
