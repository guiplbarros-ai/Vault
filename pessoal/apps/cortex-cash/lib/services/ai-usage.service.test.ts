/**
 * Testes Unitários - AI Usage Service
 * Agent FINANCE: Owner
 * Migrado de Dexie mocks para Supabase mocks
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSupabase, mockResponse, resetMocks, mockFrom } = vi.hoisted(() => {
  const queryBuilders = new Map<string, any>()

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
      then(resolve: any, reject?: any) {
        return Promise.resolve(builder._result).then(resolve, reject)
      },
    }
    return builder
  }

  const mockFrom = vi.fn((table: string) => {
    if (!queryBuilders.has(table)) {
      queryBuilders.set(table, createMockQueryBuilder())
    }
    return queryBuilders.get(table)!
  })

  const mockSupabase = {
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      }),
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
    mockFrom.mockClear()
    mockFrom.mockImplementation((table: string) => {
      if (!queryBuilders.has(table)) {
        queryBuilders.set(table, createMockQueryBuilder())
      }
      return queryBuilders.get(table)!
    })
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
  }

  return { mockSupabase, mockResponse, resetMocks, mockFrom }
})

vi.mock('@/lib/db/supabase', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  getSupabaseBrowserClient: vi.fn(() => mockSupabase),
  getSupabaseServerClient: vi.fn(() => mockSupabase),
  getSupabaseAuthClient: vi.fn(() => mockSupabase),
}))

import { ValidationError } from '../errors'
import {
  type CreateAIUsageLogDTO,
  calculateCost,
  checkAIBudgetLimit,
  confirmAISuggestion,
  getAIUsageByPeriod,
  getAIUsageSummary,
  logAIUsage,
} from './ai-usage.service'

describe('AI Usage Service', () => {
  beforeEach(() => {
    resetMocks()
  })

  describe('calculateCost', () => {
    it('deve calcular custo para gpt-4o-mini corretamente', () => {
      const cost = calculateCost('gpt-4o-mini', 1000, 500)

      // Input: (1000 / 1M) * 0.150 = 0.00015
      // Output: (500 / 1M) * 0.600 = 0.0003
      // Total: 0.00045
      expect(cost).toBeCloseTo(0.00045, 6)
    })

    it('deve calcular custo para gpt-4o corretamente', () => {
      const cost = calculateCost('gpt-4o', 1000, 500)

      // Input: (1000 / 1M) * 2.50 = 0.0025
      // Output: (500 / 1M) * 10.00 = 0.005
      // Total: 0.0075
      expect(cost).toBeCloseTo(0.0075, 6)
    })

    it('deve calcular custo para gpt-4-turbo corretamente', () => {
      const cost = calculateCost('gpt-4-turbo', 1000, 500)

      // Input: (1000 / 1M) * 10.00 = 0.01
      // Output: (500 / 1M) * 30.00 = 0.015
      // Total: 0.025
      expect(cost).toBeCloseTo(0.025, 6)
    })

    it('deve lançar erro para modelo inválido', () => {
      expect(() => {
        calculateCost('invalid-model' as any, 1000, 500)
      }).toThrow(ValidationError)
    })

    it('deve calcular zero para tokens zero', () => {
      const cost = calculateCost('gpt-4o-mini', 0, 0)
      expect(cost).toBe(0)
    })
  })

  describe('logAIUsage', () => {
    it('deve registrar log de uso de IA com sucesso', async () => {
      const transacaoId = 'tx-test-id'
      const categoriaSugeridaId = 'cat-sug-id'
      const expectedCost = calculateCost('gpt-4o-mini', 50, 20)

      mockResponse('logs_ia', [
        {
          id: 'new-log-id',
          transacao_id: transacaoId,
          prompt: 'Classifique: Mercado Pão de Açúcar',
          resposta: 'Alimentação',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 50,
          tokens_resposta: 20,
          tokens_total: 70,
          custo_usd: expectedCost,
          categoria_sugerida_id: categoriaSugeridaId,
          confianca: 0.95,
          confirmada: false,
          created_at: new Date().toISOString(),
        },
      ])

      const data: CreateAIUsageLogDTO = {
        prompt: 'Classifique: Mercado Pão de Açúcar',
        resposta: 'Alimentação',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 50,
        tokens_resposta: 20,
        transacao_id: transacaoId,
        categoria_sugerida_id: categoriaSugeridaId,
        confianca: 0.95,
      }

      const log = await logAIUsage(data)

      expect(log.id).toBeDefined()
      expect(log.prompt).toBe(data.prompt)
      expect(log.resposta).toBe(data.resposta)
      expect(log.modelo).toBe('gpt-4o-mini')
      expect(log.tokens_prompt).toBe(50)
      expect(log.tokens_resposta).toBe(20)
      expect(log.tokens_total).toBe(70)
      expect(log.custo_usd).toBeGreaterThan(0)
      expect(log.confirmada).toBe(false)
      expect(log.created_at).toBeInstanceOf(Date)
      expect(mockSupabase.from).toHaveBeenCalledWith('logs_ia')
    })

    it('deve registrar log sem transacao_id', async () => {
      mockResponse('logs_ia', [
        {
          id: 'log-no-tx-id',
          transacao_id: null,
          prompt: 'Test prompt',
          resposta: 'Test response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 10,
          tokens_resposta: 5,
          tokens_total: 15,
          custo_usd: calculateCost('gpt-4o-mini', 10, 5),
          categoria_sugerida_id: null,
          confianca: null,
          confirmada: false,
          created_at: new Date().toISOString(),
        },
      ])

      const data: CreateAIUsageLogDTO = {
        prompt: 'Test prompt',
        resposta: 'Test response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 10,
        tokens_resposta: 5,
      }

      const log = await logAIUsage(data)

      expect(log.transacao_id).toBeNull()
      expect(log.categoria_sugerida_id).toBeNull()
      expect(log.confianca).toBeNull()
    })

    it('deve calcular custo automaticamente', async () => {
      const expectedCost = calculateCost('gpt-4o-mini', 1000, 500)

      mockResponse('logs_ia', [
        {
          id: 'log-cost-id',
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 1000,
          tokens_resposta: 500,
          tokens_total: 1500,
          custo_usd: expectedCost,
          confirmada: false,
          created_at: new Date().toISOString(),
        },
      ])

      const data: CreateAIUsageLogDTO = {
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 1000,
        tokens_resposta: 500,
      }

      const log = await logAIUsage(data)

      expect(log.custo_usd).toBeCloseTo(expectedCost, 6)
    })

    it('deve salvar log no banco de dados', async () => {
      mockResponse('logs_ia', [
        {
          id: 'log-saved-id',
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
          tokens_total: 150,
          custo_usd: calculateCost('gpt-4o-mini', 100, 50),
          confirmada: false,
          created_at: new Date().toISOString(),
        },
      ])

      const data: CreateAIUsageLogDTO = {
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
      }

      const log = await logAIUsage(data)

      expect(log).toBeDefined()
      expect(log.prompt).toBe('Test')
      expect(mockSupabase.from).toHaveBeenCalledWith('logs_ia')
    })
  })

  describe('confirmAISuggestion', () => {
    it('deve marcar sugestão como confirmada', async () => {
      mockResponse('logs_ia', [
        {
          id: 'log-confirm-id',
          confirmada: true,
        },
      ])

      await confirmAISuggestion('log-confirm-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('logs_ia')
    })
  })

  describe('getAIUsageSummary', () => {
    it('deve retornar resumo vazio quando não há logs', async () => {
      mockResponse('logs_ia', [])

      const summary = await getAIUsageSummary()

      expect(summary.total_requests).toBe(0)
      expect(summary.total_tokens).toBe(0)
      expect(summary.total_cost_usd).toBe(0)
      expect(summary.total_cost_brl).toBe(0)
      expect(summary.confirmed_suggestions).toBe(0)
      expect(summary.rejected_suggestions).toBe(0)
      expect(summary.average_confidence).toBe(0)
    })

    it('deve calcular resumo corretamente com múltiplos logs', async () => {
      const cost1 = calculateCost('gpt-4o-mini', 100, 50)
      const cost2 = calculateCost('gpt-4o-mini', 200, 100)
      const cost3 = calculateCost('gpt-4o-mini', 150, 75)

      mockResponse('logs_ia', [
        {
          id: 'log-1',
          prompt: 'Test 1',
          resposta: 'Response 1',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
          tokens_total: 150,
          custo_usd: cost1,
          categoria_sugerida_id: 'cat-1',
          confianca: 0.9,
          confirmada: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 'log-2',
          prompt: 'Test 2',
          resposta: 'Response 2',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 200,
          tokens_resposta: 100,
          tokens_total: 300,
          custo_usd: cost2,
          categoria_sugerida_id: 'cat-2',
          confianca: 0.8,
          confirmada: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'log-3',
          prompt: 'Test 3',
          resposta: 'Response 3',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 150,
          tokens_resposta: 75,
          tokens_total: 225,
          custo_usd: cost3,
          confirmada: false,
          created_at: new Date().toISOString(),
        },
      ])

      const summary = await getAIUsageSummary(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        5.0
      )

      expect(summary.total_requests).toBeGreaterThanOrEqual(2)
      expect(summary.total_tokens).toBeGreaterThan(0)
      expect(summary.total_cost_usd).toBeGreaterThan(0)
      expect(summary.total_cost_brl).toBe(summary.total_cost_usd * 5.0)

      if (summary.confirmed_suggestions > 0) {
        expect(summary.confirmed_suggestions).toBeGreaterThanOrEqual(1)
      }

      if (summary.average_confidence > 0) {
        expect(summary.average_confidence).toBeGreaterThan(0.5)
      }
    })

    it('deve filtrar logs por período', async () => {
      mockResponse('logs_ia', [
        {
          id: 'log-jan',
          prompt: 'Jan log',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
          tokens_total: 150,
          custo_usd: 0.001,
          confirmada: false,
          created_at: '2024-01-15T00:00:00.000Z',
        },
      ])

      const summaryJan = await getAIUsageSummary(new Date('2024-01-01'), new Date('2024-01-31'))

      expect(summaryJan.total_requests).toBe(1)
      expect(summaryJan.total_tokens).toBe(150)
    })

    it('deve calcular média de confiança corretamente', async () => {
      mockResponse('logs_ia', [
        {
          id: 'log-c1',
          prompt: 'Test 1',
          resposta: 'Response 1',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: 'cat-1',
          confianca: 0.9,
          confirmada: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 'log-c2',
          prompt: 'Test 2',
          resposta: 'Response 2',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: 'cat-2',
          confianca: 0.7,
          confirmada: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 'log-c3',
          prompt: 'Test 3',
          resposta: 'Response 3',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: 'cat-3',
          confianca: 0.8,
          confirmada: false,
          created_at: new Date().toISOString(),
        },
      ])

      const summary = await getAIUsageSummary()

      expect(summary.average_confidence).toBeCloseTo(0.8, 2)
    })
  })

  describe('getAIUsageByPeriod', () => {
    it('deve agrupar por dia corretamente', async () => {
      mockResponse('logs_ia', [
        {
          id: 'log-d1',
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
          tokens_total: 150,
          custo_usd: 0.001,
          confirmada: false,
          created_at: '2024-01-01T10:00:00.000Z',
        },
        {
          id: 'log-d2',
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 200,
          tokens_resposta: 100,
          tokens_total: 300,
          custo_usd: 0.002,
          confirmada: false,
          created_at: '2024-01-01T14:00:00.000Z',
        },
        {
          id: 'log-d3',
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 150,
          tokens_resposta: 75,
          tokens_total: 225,
          custo_usd: 0.0015,
          confirmada: false,
          created_at: '2024-01-02T10:00:00.000Z',
        },
      ])

      const usage = await getAIUsageByPeriod(new Date('2024-01-01'), new Date('2024-01-31'), 'day')

      expect(usage).toHaveLength(2)
      expect(usage[0].period).toBe('2024-01-01')
      expect(usage[0].requests).toBe(2)
      expect(usage[0].tokens).toBe(150 + 300)
      expect(usage[0].cost_usd).toBeCloseTo(0.003, 6)

      expect(usage[1].period).toBe('2024-01-02')
      expect(usage[1].requests).toBe(1)
      expect(usage[1].tokens).toBe(225)
    })

    it('deve agrupar por mês corretamente', async () => {
      mockResponse('logs_ia', [
        {
          id: 'log-m1',
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
          tokens_total: 150,
          custo_usd: 0.001,
          confirmada: false,
          created_at: '2024-01-15T00:00:00.000Z',
        },
        {
          id: 'log-m2',
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 200,
          tokens_resposta: 100,
          tokens_total: 300,
          custo_usd: 0.002,
          confirmada: false,
          created_at: '2024-02-15T00:00:00.000Z',
        },
      ])

      const usage = await getAIUsageByPeriod(
        new Date('2024-01-01'),
        new Date('2024-02-29'),
        'month'
      )

      expect(usage).toHaveLength(2)
      expect(usage[0].period).toBe('2024-01')
      expect(usage[0].requests).toBe(1)

      expect(usage[1].period).toBe('2024-02')
      expect(usage[1].requests).toBe(1)
    })

    it('deve retornar array vazio quando não há logs no período', async () => {
      mockResponse('logs_ia', [])

      const usage = await getAIUsageByPeriod(new Date('2024-01-01'), new Date('2024-01-31'), 'day')

      expect(usage).toHaveLength(0)
    })

    it('deve ordenar períodos cronologicamente', async () => {
      mockResponse('logs_ia', [
        {
          id: 'log-o1',
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
          tokens_total: 150,
          custo_usd: 0.001,
          confirmada: false,
          created_at: '2024-01-03T00:00:00.000Z',
        },
        {
          id: 'log-o2',
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
          tokens_total: 150,
          custo_usd: 0.001,
          confirmada: false,
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ])

      const usage = await getAIUsageByPeriod(new Date('2024-01-01'), new Date('2024-01-31'), 'day')

      expect(usage[0].period).toBe('2024-01-01')
      expect(usage[1].period).toBe('2024-01-03')
    })
  })

  describe('checkAIBudgetLimit', () => {
    it('deve retornar status correto quando abaixo do limite', async () => {
      const cost = calculateCost('gpt-4o-mini', 1000, 500)

      mockResponse('logs_ia', [
        {
          id: 'log-budget',
          tokens_total: 1500,
          custo_usd: cost,
          created_at: new Date().toISOString(),
        },
      ])

      const status = await checkAIBudgetLimit(new Date(), 1.0, 0.8)

      expect(status.isOverLimit).toBe(false)
      expect(status.isNearLimit).toBe(false)
      expect(status.usedUsd).toBeGreaterThan(0)
      expect(status.remainingUsd).toBeGreaterThan(0)
      expect(status.percentageUsed).toBeGreaterThan(0)
      expect(status.percentageUsed).toBeLessThan(80)
    })

    it('deve detectar quando está próximo do limite', async () => {
      const limitUsd = 0.01
      const usedCost = limitUsd * 0.85

      mockResponse('logs_ia', [
        {
          id: 'log-near',
          tokens_total: 50000,
          custo_usd: usedCost,
          created_at: new Date().toISOString(),
        },
      ])

      const status = await checkAIBudgetLimit(new Date(), limitUsd, 0.8)

      expect(status.isNearLimit).toBe(true)
      expect(status.isOverLimit).toBe(false)
      expect(status.percentageUsed).toBeGreaterThanOrEqual(80)
    })

    it('deve detectar quando ultrapassou o limite', async () => {
      const limitUsd = 0.001

      mockResponse('logs_ia', [
        {
          id: 'log-over-1',
          tokens_total: 50000,
          custo_usd: 0.005,
          created_at: new Date().toISOString(),
        },
      ])

      const status = await checkAIBudgetLimit(new Date(), limitUsd, 0.8)

      expect(status.isOverLimit).toBe(true)
      expect(status.remainingUsd).toBe(0)
      expect(status.percentageUsed).toBeGreaterThan(100)
    })

    it('deve calcular porcentagem corretamente', async () => {
      const cost = calculateCost('gpt-4o-mini', 1000, 500)

      mockResponse('logs_ia', [
        {
          id: 'log-pct',
          tokens_total: 1500,
          custo_usd: cost,
          created_at: new Date().toISOString(),
        },
      ])

      const status = await checkAIBudgetLimit(new Date(), 10.0, 0.8)

      expect(status.percentageUsed).toBeGreaterThan(0)
      expect(status.percentageUsed).toBeLessThan(100)
    })

    it('deve tratar limite zero corretamente', async () => {
      mockResponse('logs_ia', [
        {
          id: 'log-zero',
          tokens_total: 150,
          custo_usd: 0.001,
          created_at: new Date().toISOString(),
        },
      ])

      const status = await checkAIBudgetLimit(new Date(), 0, 0.8)

      expect(status.isOverLimit).toBe(true)
      expect(status.percentageUsed).toBe(0)
      expect(status.remainingUsd).toBe(0)
    })

    it('deve lançar erro para limite negativo', async () => {
      await expect(checkAIBudgetLimit(new Date(), -1, 0.8)).rejects.toThrow(ValidationError)
    })

    it('deve incluir campos de compatibilidade', async () => {
      const cost = calculateCost('gpt-4o-mini', 100, 50)

      mockResponse('logs_ia', [
        {
          id: 'log-compat',
          tokens_total: 150,
          custo_usd: cost,
          created_at: new Date().toISOString(),
        },
      ])

      const status = await checkAIBudgetLimit(new Date(), 1.0, 0.8)

      expect(status.currentCost).toBe(status.usedUsd)
      expect(status.limit).toBe(1.0)
    })
  })

  describe('Edge Cases', () => {
    it('deve tratar tokens muito grandes', async () => {
      const expectedCost = calculateCost('gpt-4o-mini', 1000000, 500000)

      mockResponse('logs_ia', [
        {
          id: 'log-large',
          prompt: 'Very large prompt',
          resposta: 'Very large response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 1000000,
          tokens_resposta: 500000,
          tokens_total: 1500000,
          custo_usd: expectedCost,
          confirmada: false,
          created_at: new Date().toISOString(),
        },
      ])

      const log = await logAIUsage({
        prompt: 'Very large prompt',
        resposta: 'Very large response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 1000000,
        tokens_resposta: 500000,
      })

      expect(log.tokens_total).toBe(1500000)
      expect(log.custo_usd).toBeGreaterThan(0)
    })

    it('deve tratar confiança em diferentes formatos', async () => {
      mockResponse('logs_ia', [
        {
          id: 'log-conf-1',
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: 'cat-1',
          confianca: 0.999,
          confirmada: false,
          created_at: new Date().toISOString(),
        },
      ])

      const log1 = await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: 'cat-1',
        confianca: 0.999,
      })

      expect(log1.confianca).toBeCloseTo(0.999, 3)

      resetMocks()
      mockResponse('logs_ia', [
        {
          id: 'log-conf-2',
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
          tokens_total: 150,
          custo_usd: 0.001,
          categoria_sugerida_id: 'cat-2',
          confianca: 0.1,
          confirmada: false,
          created_at: new Date().toISOString(),
        },
      ])

      const log2 = await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: 'cat-2',
        confianca: 0.1,
      })

      expect(log2.confianca).toBeCloseTo(0.1, 3)
    })

    it('deve tratar múltiplas chamadas concorrentes', async () => {
      // Each concurrent call resolves with a unique log
      const logs = Array.from({ length: 10 }, (_, i) => ({
        id: `log-concurrent-${i}`,
        prompt: `Test ${i}`,
        resposta: `Response ${i}`,
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        tokens_total: 150,
        custo_usd: 0.001,
        confirmada: false,
        created_at: new Date().toISOString(),
      }))

      mockResponse('logs_ia', logs)

      const promises = Array.from({ length: 10 }, (_, i) =>
        logAIUsage({
          prompt: `Test ${i}`,
          resposta: `Response ${i}`,
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
        })
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      expect(mockSupabase.from).toHaveBeenCalledWith('logs_ia')
    })
  })
})
