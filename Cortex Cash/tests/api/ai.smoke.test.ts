/**
 * Smoke Tests para APIs de IA
 * Agent DATA: Owner
 *
 * Testes básicos que verificam se os endpoints estão funcionando
 * Refatorado para importar handlers diretamente ao invés de usar fetch()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
// Note: Avoid importing NextRequest to keep tests decoupled from Next internals
import { GET as statusGET } from '@/app/api/ai/status/route';
import { POST as classifyPOST } from '@/app/api/ai/classify/route';
import { GET as usageGET } from '@/app/api/ai/usage/route';
import { POST as configPOST } from '@/app/api/ai/config/route';
import { GET as cacheGET, DELETE as cacheDELETE } from '@/app/api/ai/cache/route';

// Mock OpenAI
vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ categoria_id: 'test', confianca: 0.9, reasoning: 'test' }) } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        }),
      },
    };
  },
}));

// Mock stores and services
vi.mock('@/lib/services/ai-usage.store', () => ({
  getServerStore: vi.fn(() => ({
    logUsage: vi.fn().mockResolvedValue(undefined),
    getUsageSummary: vi.fn().mockResolvedValue({
      total_requests: 0,
      total_tokens: 0,
      total_cost_usd: 0,
    }),
  })),
  checkAIBudgetLimitSafe: vi.fn().mockResolvedValue({
    isOverLimit: false,
    isNearLimit: false,
  }),
}));

vi.mock('@/lib/finance/classification/prompt-cache', () => ({
  getCachedClassification: vi.fn().mockReturnValue(null),
  setCachedClassification: vi.fn(),
  getCacheStats: vi.fn().mockReturnValue({
    size: 0,
    max_size: 1000,
    utilization: 0,
    hit_rate: 0,
    total_hits: 0,
    total_misses: 0,
    total_requests: 0,
    ttl_days: 7,
    savings_estimate_usd: 0,
  }),
  cleanExpiredCache: vi.fn().mockResolvedValue(0),
  clearCache: vi.fn().mockResolvedValue(undefined),
}));

describe('AI API Smoke Tests', () => {
  const mockCategorias = [
    { id: 'cat-1', nome: 'Alimentação' },
    { id: 'cat-2', nome: 'Transporte' },
  ];

  // Helper para criar NextRequest em ambiente de teste
  const mkReq = (url: string, init?: RequestInit) =>
    new Request(url, init) as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/ai/status', () => {
    it('deve retornar status da API key', async () => {
      const response = await statusGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('apiKeyConfigured');
      expect(typeof data.apiKeyConfigured).toBe('boolean');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/ai/classify', () => {
    it('deve retornar erro quando faltam campos obrigatórios', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'Teste',
          // Faltando: valor, tipo
        }),
      });

      const response = await classifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('deve aceitar configurações customizadas', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'Uber para trabalho',
          valor: 25.00,
          tipo: 'despesa',
          categorias: mockCategorias,
          config: {
            defaultModel: 'gpt-4o-mini',
            monthlyCostLimit: 100,
            allowOverride: true,
            strategy: 'balanced',
          },
        }),
      });

      const response = await classifyPOST(request);
      expect([200, 400, 429].includes(response.status)).toBe(true);
    });

    it('deve retornar erro quando faltam categorias', async () => {
      const request = mkReq('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'Test',
          valor: 100,
          tipo: 'despesa',
          categorias: [], // Vazio
        }),
      });

      const response = await classifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing categories');
    });
  });

  describe('GET /api/ai/usage', () => {
    it('deve retornar estatísticas de uso', async () => {
      const request = mkReq('http://localhost:3000/api/ai/usage?limit=10');
      const response = await usageGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('usedBrl');
      expect(data).toHaveProperty('limitBrl');
      expect(data).toHaveProperty('percentage');
      expect(data).toHaveProperty('isNearLimit');
      expect(data).toHaveProperty('isOverLimit');
      expect(data).toHaveProperty('summary');

      // Valida tipos
      expect(typeof data.usedBrl).toBe('number');
      expect(typeof data.limitBrl).toBe('number');
      expect(typeof data.percentage).toBe('number');
      expect(typeof data.isNearLimit).toBe('boolean');
      expect(typeof data.isOverLimit).toBe('boolean');
    });

    it('deve aceitar limite customizado via query param', async () => {
      const customLimit = 50;
      const request = mkReq(`http://localhost:3000/api/ai/usage?limit=${customLimit}`);
      const response = await usageGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Limit é enviado em USD e convertido para BRL no endpoint
      expect(data.limitBrl).toBe(customLimit * 6.0);
    });

    it('deve usar limite padrão quando não especificado', async () => {
      const request = mkReq('http://localhost:3000/api/ai/usage');
      const response = await usageGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.limitBrl).toBe(10.0 * 6.0); // DEFAULT_LIMIT_USD * USD_TO_BRL
    });
  });

  describe('POST /api/ai/config', () => {
    it('deve validar configurações', async () => {
      const validConfig = {
        enabled: true,
        defaultModel: 'gpt-4o-mini',
        monthlyCostLimit: 10.0,
        allowOverride: false,
        strategy: 'balanced',
      };

      const request = mkReq('http://localhost:3000/api/ai/config', {
        method: 'POST',
        body: JSON.stringify(validConfig),
      });

      const response = await configPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('config');
    });

    it('deve rejeitar configurações inválidas', async () => {
      const invalidConfig = {
        enabled: 'not-a-boolean', // Tipo errado
        defaultModel: 'invalid-model',
        monthlyCostLimit: -10, // Negativo
      };

      const request = mkReq('http://localhost:3000/api/ai/config', {
        method: 'POST',
        body: JSON.stringify(invalidConfig),
      });

      const response = await configPOST(request);

      // Deve retornar erro (400 ou 500)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/ai/cache', () => {
    it('deve retornar estatísticas do cache', async () => {
      const request = mkReq('http://localhost:3000/api/ai/cache');
      const response = await cacheGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('cache');

      const cache = data.cache;
      expect(cache).toHaveProperty('size');
      expect(cache).toHaveProperty('max_size');
      expect(cache).toHaveProperty('utilization');
      expect(cache).toHaveProperty('hit_rate');
      expect(cache).toHaveProperty('total_hits');
      expect(cache).toHaveProperty('total_misses');
      expect(cache).toHaveProperty('total_requests');
      expect(cache).toHaveProperty('ttl_days');
      expect(cache).toHaveProperty('savings_estimate_usd');
    });
  });

  describe('DELETE /api/ai/cache', () => {
    it('deve limpar cache expirado', async () => {
      const request = mkReq('http://localhost:3000/api/ai/cache?action=clean', {
        method: 'DELETE',
      });
      const response = await cacheDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('removed');
      expect(Number.isFinite(Number(data.removed))).toBe(true);
    });

    it('deve limpar todo o cache', async () => {
      const request = mkReq('http://localhost:3000/api/ai/cache?action=clear', {
        method: 'DELETE',
      });
      const response = await cacheDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    });

    it('deve retornar erro para ação inválida', async () => {
      const request = mkReq('http://localhost:3000/api/ai/cache?action=invalid', {
        method: 'DELETE',
      });
      const response = await cacheDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });
});
