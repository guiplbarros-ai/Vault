/**
 * Testes de Integração - API /api/ai/classify
 * Agent CORE: Implementador
 *
 * Testa endpoints de classificação de transações com IA (Supabase mocks)
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mock setup: inline to avoid module resolution issues
const { mockSupabase, resetMocks } = vi.hoisted(() => {
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

  function resetMocks() {
    queryBuilders.clear()
    mockSupabase.from.mockClear()
  }

  return { mockSupabase, resetMocks }
})

vi.mock('@/lib/db/supabase', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  getSupabaseBrowserClient: vi.fn(() => mockSupabase),
  getSupabaseServerClient: vi.fn(() => mockSupabase),
  getSupabaseAuthClient: vi.fn(() => mockSupabase),
}))

// Mock OpenAI
vi.mock('openai', () => {
  const MockOpenAI = class {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  categoria_id: 'mock-categoria-id',
                  confianca: 0.85,
                  reasoning: 'Teste de classificação',
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        }),
      },
    }
  }

  return {
    default: MockOpenAI,
  }
})

// Mock AI Usage Service
vi.mock('@/lib/services/ai-usage.service', () => ({
  logAIUsage: vi.fn().mockResolvedValue(undefined),
  checkAIBudgetLimit: vi.fn().mockResolvedValue({
    isOverLimit: false,
    currentCost: 0,
    limit: 10,
  }),
  calculateCost: vi.fn((model: string, prompt: number, completion: number) => {
    return ((prompt + completion) / 1000) * 0.001
  }),
}))

// Mock AI Usage Store
vi.mock('@/lib/services/ai-usage.store', () => ({
  getServerStore: vi.fn(() => ({
    logUsage: vi.fn().mockResolvedValue(undefined),
  })),
  checkAIBudgetLimitSafe: vi.fn().mockResolvedValue({
    isOverLimit: false,
    isNearLimit: false,
    usedUsd: 0,
    remainingUsd: 10,
    percentageUsed: 0,
  }),
}))

// Mock Prompt Cache (sempre retorna cache miss por padrão)
vi.mock('@/lib/finance/classification/prompt-cache', () => ({
  getCachedClassification: vi.fn().mockReturnValue(null),
  setCachedClassification: vi.fn(),
}))

import { POST as batchClassifyPOST } from '@/app/api/ai/classify/batch/route'
import { POST as classifyPOST } from '@/app/api/ai/classify/route'

describe('API /api/ai/classify', () => {
  beforeAll(() => {
    // Route handlers check for OPENAI_API_KEY and return 500 if missing
    process.env.OPENAI_API_KEY = 'test-key-for-mocked-openai'
  })

  // Helper para criar NextRequest em ambiente de teste
  const mkReq = (url: string, init?: RequestInit) => new Request(url, init) as any
  // Categorias de teste (passadas no body ao invés de Dexie)
  const categoriasDespesa = [
    { id: 'mock-categoria-id', nome: 'Alimentação' },
    { id: 'cat-transporte', nome: 'Transporte' },
    { id: 'cat-saude', nome: 'Saúde' },
  ]

  const categoriasReceita = [
    { id: 'cat-salario', nome: 'Salário' },
    { id: 'cat-freelance', nome: 'Freelance' },
  ]

  const categoriaId = categoriasDespesa[0]!.id

  beforeEach(() => {
    resetMocks()
    vi.clearAllMocks()
  })

  describe('POST /api/ai/classify', () => {
    it('deve classificar transação com dados válidos', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'IFOOD RESTAURANTE',
          valor: 45.5,
          tipo: 'despesa',
          categorias: categoriasDespesa,
        }),
      })

      const response = await classifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('categoria_sugerida_id')
      expect(data).toHaveProperty('categoria_nome')
      expect(data).toHaveProperty('confianca')
      expect(data).toHaveProperty('reasoning')
      expect(data.confianca).toBeGreaterThanOrEqual(0)
      expect(data.confianca).toBeLessThanOrEqual(1)
    })

    it('deve retornar erro 400 quando faltar campo descricao', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          valor: 45.5,
          tipo: 'despesa',
          categorias: categoriasDespesa,
        }),
      })

      const response = await classifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('Missing required fields')
    })

    it('deve retornar erro 400 quando faltar campo valor', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'TESTE',
          tipo: 'despesa',
        }),
      })

      const response = await classifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('deve retornar erro 400 quando faltar campo tipo', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'TESTE',
          valor: 45.5,
        }),
      })

      const response = await classifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('deve aceitar transação com valor zero (R$ 0,00)', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'Ajuste de saldo',
          valor: 0,
          tipo: 'despesa',
          categorias: categoriasDespesa,
        }),
      })

      const response = await classifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('categoria_sugerida_id')
      expect(data).toHaveProperty('confianca')
    })

    it('deve retornar erro 400 quando não há categorias disponíveis', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'TESTE',
          valor: 45.5,
          tipo: 'despesa',
          categorias: [],
        }),
      })

      const response = await classifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing categories')
    })

    it('deve retornar erro 429 quando budget limit é excedido', async () => {
      const { checkAIBudgetLimitSafe } = await import('@/lib/services/ai-usage.store')
      vi.mocked(checkAIBudgetLimitSafe).mockResolvedValueOnce({
        isOverLimit: true,
        isNearLimit: true,
        usedUsd: 15,
        remainingUsd: -5,
        percentageUsed: 150,
      })

      const request = mkReq('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'TESTE',
          valor: 45.5,
          tipo: 'despesa',
          categorias: categoriasDespesa,
        }),
      })

      const response = await classifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('AI budget limit exceeded')
    })

    it('deve retornar resposta em cache quando disponível', async () => {
      const { getCachedClassification } = await import(
        '@/lib/finance/classification/prompt-cache'
      )
      vi.mocked(getCachedClassification).mockReturnValueOnce({
        descricao: 'IFOOD RESTAURANTE',
        tipo: 'despesa',
        categoria_id: categoriaId,
        categoria_nome: 'Alimentação',
        confianca: 0.9,
        reasoning: 'Cached result',
        timestamp: new Date(),
      })

      const request = mkReq('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'IFOOD RESTAURANTE',
          valor: 45.5,
          tipo: 'despesa',
        }),
      })

      const response = await classifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.cached).toBe(true)
      expect(data.categoria_sugerida_id).toBe(categoriaId)
      expect(data.categoria_nome).toBe('Alimentação')
      expect(data.reasoning).toContain('cache')
    })

    it('deve incluir transacao_id quando fornecido', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'TESTE',
          valor: 45.5,
          tipo: 'despesa',
          transacao_id: 'test-trans-id',
          categorias: categoriasDespesa,
        }),
      })

      const response = await classifyPOST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/ai/classify/batch', () => {
    it('deve classificar múltiplas transações em batch', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              id: 'item-1',
              descricao: 'IFOOD RESTAURANTE',
              valor: 45.5,
              tipo: 'despesa',
            },
            {
              id: 'item-2',
              descricao: 'UBER EATS',
              valor: 30.0,
              tipo: 'despesa',
            },
          ],
          categorias: {
            despesa: categoriasDespesa,
            receita: categoriasReceita,
          },
        }),
      })

      const response = await batchClassifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('results')
      expect(data).toHaveProperty('summary')
      expect(data.results).toHaveLength(2)
      expect(data.summary.total).toBe(2)
      expect(data.summary).toHaveProperty('successful')
      expect(data.summary).toHaveProperty('failed')
      expect(data.summary).toHaveProperty('cached')
      expect(data.summary).toHaveProperty('api_calls')
    })

    it('deve retornar erro 400 quando items está vazio', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: [],
        }),
      })

      const response = await batchClassifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing or invalid items array')
    })

    it('deve retornar erro 400 quando items não é array', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: 'not-an-array',
        }),
      })

      const response = await batchClassifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing or invalid items array')
    })

    it('deve retornar erro 400 quando batch excede 100 itens', async () => {
      const items = Array(101)
        .fill(null)
        .map((_, i) => ({
          id: `item-${i}`,
          descricao: `TESTE ${i}`,
          valor: 10,
          tipo: 'despesa',
        }))

      const request = mkReq('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({ items }),
      })

      const response = await batchClassifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Batch size exceeds maximum')
    })

    it('deve respeitar configuração de concurrency', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { id: 'item-1', descricao: 'TESTE 1', valor: 10, tipo: 'despesa' },
            { id: 'item-2', descricao: 'TESTE 2', valor: 20, tipo: 'despesa' },
            { id: 'item-3', descricao: 'TESTE 3', valor: 30, tipo: 'despesa' },
          ],
          config: {
            concurrency: 2,
          },
          categorias: {
            despesa: categoriasDespesa,
            receita: categoriasReceita,
          },
        }),
      })

      const response = await batchClassifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(3)
    })

    it('deve retornar erro 429 quando budget limit é excedido', async () => {
      const { checkAIBudgetLimitSafe } = await import('@/lib/services/ai-usage.store')
      vi.mocked(checkAIBudgetLimitSafe).mockResolvedValueOnce({
        isOverLimit: true,
        isNearLimit: true,
        usedUsd: 15,
        remainingUsd: -5,
        percentageUsed: 150,
      })

      const request = mkReq('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ id: 'item-1', descricao: 'TESTE', valor: 10, tipo: 'despesa' }],
          categorias: {
            despesa: categoriasDespesa,
            receita: categoriasReceita,
          },
        }),
      })

      const response = await batchClassifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('AI budget limit exceeded')
    })

    it('deve usar cache quando disponível em batch', async () => {
      const { getCachedClassification } = await import(
        '@/lib/finance/classification/prompt-cache'
      )

      vi.mocked(getCachedClassification)
        .mockReturnValueOnce({
          descricao: 'IFOOD',
          tipo: 'despesa',
          categoria_id: categoriaId,
          categoria_nome: 'Alimentação',
          confianca: 0.9,
          reasoning: 'Cached',
          timestamp: new Date(),
        })
        .mockReturnValueOnce(null)

      const request = mkReq('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { id: 'item-1', descricao: 'IFOOD', valor: 45, tipo: 'despesa' },
            { id: 'item-2', descricao: 'TESTE', valor: 30, tipo: 'despesa' },
          ],
          categorias: {
            despesa: categoriasDespesa,
            receita: categoriasReceita,
          },
        }),
      })

      const response = await batchClassifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary.cached).toBe(1)
      expect(data.results[0].cached).toBe(true)
    })

    it('deve retornar summary com métricas corretas', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { id: 'item-1', descricao: 'TESTE 1', valor: 10, tipo: 'despesa' },
            { id: 'item-2', descricao: 'TESTE 2', valor: 20, tipo: 'despesa' },
          ],
          categorias: {
            despesa: categoriasDespesa,
            receita: categoriasReceita,
          },
        }),
      })

      const response = await batchClassifyPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary).toHaveProperty('total')
      expect(data.summary).toHaveProperty('successful')
      expect(data.summary).toHaveProperty('failed')
      expect(data.summary).toHaveProperty('cached')
      expect(data.summary).toHaveProperty('api_calls')
      expect(data.summary.total).toBe(2)
    })
  })
})
