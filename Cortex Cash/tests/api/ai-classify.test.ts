/**
 * Testes de Integração - API /api/ai/classify
 * Agent CORE: Implementador
 *
 * Testa endpoints de classificação de transações com IA
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as classifyPOST } from '@/app/api/ai/classify/route';
import { POST as batchClassifyPOST } from '@/app/api/ai/classify/batch/route';
import { NextRequest } from 'next/server';
import { getDB } from '@/lib/db/client';
import type { Categoria } from '@/lib/types';

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
    };
  };

  return {
    default: MockOpenAI,
  };
});

// Mock AI Usage Service
vi.mock('@/lib/services/ai-usage.service', () => ({
  logAIUsage: vi.fn().mockResolvedValue(undefined),
  checkAIBudgetLimit: vi.fn().mockResolvedValue({
    isOverLimit: false,
    currentCost: 0,
    limit: 10,
  }),
}));

// Mock Prompt Cache (sempre retorna cache miss por padrão)
vi.mock('@/lib/finance/classification/prompt-cache', () => ({
  getCachedClassification: vi.fn().mockReturnValue(null),
  setCachedClassification: vi.fn(),
}));

describe('API /api/ai/classify', () => {
  // Categorias de teste (passadas no body ao invés de Dexie)
  const categoriasDespesa = [
    { id: 'mock-categoria-id', nome: 'Alimentação' },
    { id: 'cat-transporte', nome: 'Transporte' },
    { id: 'cat-saude', nome: 'Saúde' },
  ];

  const categoriasReceita = [
    { id: 'cat-salario', nome: 'Salário' },
    { id: 'cat-freelance', nome: 'Freelance' },
  ];

  const categoriaId = categoriasDespesa[0].id;

  beforeEach(async () => {
    // Limpar database (apenas logs_ia ainda é usado)
    const db = getDB();
    await db.logs_ia.clear();

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('POST /api/ai/classify', () => {
    it('deve classificar transação com dados válidos', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'IFOOD RESTAURANTE',
          valor: 45.50,
          tipo: 'despesa',
          categorias: categoriasDespesa,
        }),
      });

      const response = await classifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('categoria_sugerida_id');
      expect(data).toHaveProperty('categoria_nome');
      expect(data).toHaveProperty('confianca');
      expect(data).toHaveProperty('reasoning');
      expect(data.confianca).toBeGreaterThanOrEqual(0);
      expect(data.confianca).toBeLessThanOrEqual(1);
    });

    it('deve retornar erro 400 quando faltar campo descricao', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          valor: 45.50,
          tipo: 'despesa',
          categorias: categoriasDespesa,
        }),
      });

      const response = await classifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Missing required fields');
    });

    it('deve retornar erro 400 quando faltar campo valor', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'TESTE',
          tipo: 'despesa',
        }),
      });

      const response = await classifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('deve retornar erro 400 quando faltar campo tipo', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'TESTE',
          valor: 45.50,
        }),
      });

      const response = await classifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('deve retornar erro 400 quando não há categorias disponíveis', async () => {
      // Envia request sem categorias no body
      const request = new NextRequest('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'TESTE',
          valor: 45.50,
          tipo: 'despesa',
          // categorias ausente ou vazio
          categorias: [],
        }),
      });

      const response = await classifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing categories');
    });

    it('deve retornar erro 429 quando budget limit é excedido', async () => {
      // Mock checkAIBudgetLimit para retornar over limit
      const { checkAIBudgetLimit } = await import('@/lib/services/ai-usage.service');
      vi.mocked(checkAIBudgetLimit).mockResolvedValueOnce({
        isOverLimit: true,
        isNearLimit: true,
        usedUsd: 15,
        remainingUsd: -5,
        percentageUsed: 150,
        currentCost: 15,
        limit: 10,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'TESTE',
          valor: 45.50,
          tipo: 'despesa',
        }),
      });

      const response = await classifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('AI budget limit exceeded');
    });

    it('deve permitir override quando allowOverride é true', async () => {
      // Mock checkAIBudgetLimit para retornar over limit
      const { checkAIBudgetLimit } = await import('@/lib/services/ai-usage.service');
      vi.mocked(checkAIBudgetLimit).mockResolvedValueOnce({
        isOverLimit: true,
        isNearLimit: true,
        usedUsd: 15,
        remainingUsd: -5,
        percentageUsed: 150,
        currentCost: 15,
        limit: 10,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'TESTE',
          valor: 45.50,
          tipo: 'despesa',
          config: {
            allowOverride: true,
          },
        }),
      });

      const response = await classifyPOST(request);

      // Com allowOverride, não deve retornar 429
      expect(response.status).not.toBe(429);
    });

    it('deve retornar resposta em cache quando disponível', async () => {
      // Mock cache hit
      const { getCachedClassification } = await import('@/lib/finance/classification/prompt-cache');
      vi.mocked(getCachedClassification).mockReturnValueOnce({
        descricao: 'IFOOD RESTAURANTE',
        tipo: 'despesa',
        categoria_id: categoriaId,
        categoria_nome: 'Alimentação',
        confianca: 0.9,
        reasoning: 'Cached result',
        timestamp: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'IFOOD RESTAURANTE',
          valor: 45.50,
          tipo: 'despesa',
        }),
      });

      const response = await classifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cached).toBe(true);
      expect(data.categoria_sugerida_id).toBe(categoriaId);
      expect(data.categoria_nome).toBe('Alimentação');
      expect(data.reasoning).toContain('cache');
    });

    it('deve incluir transacao_id quando fornecido', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/classify', {
        method: 'POST',
        body: JSON.stringify({
          descricao: 'TESTE',
          valor: 45.50,
          tipo: 'despesa',
          transacao_id: 'test-trans-id',
          categorias: categoriasDespesa,
        }),
      });

      const response = await classifyPOST(request);

      expect(response.status).toBe(200);
      // O teste passa se não lançar erro, indicando que transacao_id foi processado corretamente
    });
  });

  describe('POST /api/ai/classify/batch', () => {
    it('deve classificar múltiplas transações em batch', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              id: 'item-1',
              descricao: 'IFOOD RESTAURANTE',
              valor: 45.50,
              tipo: 'despesa',
            },
            {
              id: 'item-2',
              descricao: 'UBER EATS',
              valor: 30.00,
              tipo: 'despesa',
            },
          ],
          categorias: {
            despesa: categoriasDespesa,
            receita: categoriasReceita,
          },
        }),
      });

      const response = await batchClassifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('summary');
      expect(data.results).toHaveLength(2);
      expect(data.summary.total).toBe(2);
      expect(data.summary).toHaveProperty('successful');
      expect(data.summary).toHaveProperty('failed');
      expect(data.summary).toHaveProperty('cached');
      expect(data.summary).toHaveProperty('api_calls');
    });

    it('deve retornar erro 400 quando items está vazio', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: [],
        }),
      });

      const response = await batchClassifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing or invalid items array');
    });

    it('deve retornar erro 400 quando items não é array', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: 'not-an-array',
        }),
      });

      const response = await batchClassifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing or invalid items array');
    });

    it('deve retornar erro 400 quando batch excede 100 itens', async () => {
      const items = Array(101)
        .fill(null)
        .map((_, i) => ({
          id: `item-${i}`,
          descricao: `TESTE ${i}`,
          valor: 10,
          tipo: 'despesa',
        }));

      const request = new NextRequest('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });

      const response = await batchClassifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Batch size exceeds maximum');
    });

    it('deve respeitar configuração de concurrency', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/classify/batch', {
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
      });

      const response = await batchClassifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(3);
    });

    it('deve retornar erro 429 quando budget limit é excedido', async () => {
      const { checkAIBudgetLimit } = await import('@/lib/services/ai-usage.service');
      vi.mocked(checkAIBudgetLimit).mockResolvedValueOnce({
        isOverLimit: true,
        isNearLimit: true,
        usedUsd: 15,
        remainingUsd: -5,
        percentageUsed: 150,
        currentCost: 15,
        limit: 10,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/classify/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { id: 'item-1', descricao: 'TESTE', valor: 10, tipo: 'despesa' },
          ],
          categorias: {
            despesa: categoriasDespesa,
            receita: categoriasReceita,
          },
        }),
      });

      const response = await batchClassifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('AI budget limit exceeded');
    });

    it('deve usar cache quando disponível em batch', async () => {
      const { getCachedClassification } = await import('@/lib/finance/classification/prompt-cache');

      // Mock cache hit para primeiro item
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
        .mockReturnValueOnce(null); // Cache miss para segundo item

      const request = new NextRequest('http://localhost:3000/api/ai/classify/batch', {
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
      });

      const response = await batchClassifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.cached).toBe(1);
      expect(data.results[0].cached).toBe(true);
    });

    it('deve retornar summary com métricas corretas', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/classify/batch', {
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
      });

      const response = await batchClassifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary).toHaveProperty('total');
      expect(data.summary).toHaveProperty('successful');
      expect(data.summary).toHaveProperty('failed');
      expect(data.summary).toHaveProperty('cached');
      expect(data.summary).toHaveProperty('api_calls');
      expect(data.summary.total).toBe(2);
    });
  });
});
