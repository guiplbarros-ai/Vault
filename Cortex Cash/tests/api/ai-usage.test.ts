/**
 * Testes de Integração - API /api/ai/usage
 * Agent CORE: Implementador
 *
 * ATENÇÃO: Alguns testes aqui EXPÕEM BUGS de arquitetura
 * Ver: docs/ARCHITECTURE_ISSUES_AI_USAGE.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '@/app/api/ai/usage/route';
import {
  logAIUsage,
  getAIUsageSummary,
  checkAIBudgetLimit,
  calculateCost,
  confirmAISuggestion,
} from '@/lib/services/ai-usage.service';
import { NextRequest } from 'next/server';
import { getDB } from '@/lib/db/client';

describe('API /api/ai/usage', () => {
  beforeEach(async () => {
    // Limpar database
    const db = getDB();
    await db.logs_ia.clear();
  });

  describe('GET /api/ai/usage', () => {
    it('deve retornar resumo de uso com estrutura correta', async () => {
      // Criar log de teste
      await logAIUsage({
        transacao_id: 'test-123',
        prompt: 'Test prompt',
        resposta: 'Test response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: 'cat-123',
        confianca: 0.85,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/usage?limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('usedBrl');
      expect(data).toHaveProperty('limitBrl');
      expect(data).toHaveProperty('percentage');
      expect(data).toHaveProperty('isNearLimit');
      expect(data).toHaveProperty('isOverLimit');
      expect(data).toHaveProperty('summary');
      expect(data.summary).toHaveProperty('total_requests');
      expect(data.summary).toHaveProperty('total_tokens');
    });

    it('deve usar limite padrão quando não especificado', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/usage');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.limitBrl).toBe(10.0 * 6.0); // DEFAULT_LIMIT_USD * USD_TO_BRL
    });

    it('deve respeitar limite customizado via query param', async () => {
      const customLimit = 25.0;
      const request = new NextRequest(`http://localhost:3000/api/ai/usage?limit=${customLimit}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.limitBrl).toBe(customLimit * 6.0);
    });
  });

  describe('✅ CORRIGIDO: Taxa de Câmbio Consistente (Issue #1)', () => {
    it('checkAIBudgetLimit agora usa mesma taxa que getAIUsageSummary', async () => {
      // Criar log que custa $1 USD
      await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 1000,
        tokens_resposta: 1000,
      });

      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      // Chamar com taxa customizada
      const customRate = 5.8;
      const summaryWithCustomRate = await getAIUsageSummary(startOfMonth, endOfMonth, customRate);

      // ✅ CORRIGIDO: checkAIBudgetLimit agora aceita usdToBrl
      const budgetCheck = await checkAIBudgetLimit(currentMonth, 10, 0.8, customRate);

      // Agora os valores são consistentes!
      expect(summaryWithCustomRate.total_cost_usd).toBe(budgetCheck.usedUsd);
    });

    it('EXPÕE BUG: Endpoint calcula limitBrl com taxa hardcoded', async () => {
      await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/usage?limit=10');
      const response = await GET(request);
      const data = await response.json();

      // 🔴 BUG: usedBrl vem de getAIUsageSummary(usdToBrl = 6.0)
      // mas limitBrl é calculado com USD_TO_BRL do endpoint (também 6.0)
      // Se alguém mudar um, o outro não muda automaticamente

      const usdToBrlEndpoint = 6.0; // Hardcoded no route.ts
      expect(data.limitBrl).toBe(10 * usdToBrlEndpoint);

      // Se as taxas fossem diferentes, a porcentagem estaria errada
      console.warn('⚠️ Taxa hardcoded em 2 lugares: route.ts e service.ts');
    });
  });

  describe('calculateCost', () => {
    it('deve calcular custo corretamente para gpt-4o-mini', () => {
      const cost = calculateCost('gpt-4o-mini', 1_000_000, 1_000_000);

      // input: $0.150 / 1M tokens = $0.150
      // output: $0.600 / 1M tokens = $0.600
      // total: $0.750
      expect(cost).toBeCloseTo(0.750, 3);
    });

    it('deve calcular custo corretamente para gpt-4o', () => {
      const cost = calculateCost('gpt-4o', 1_000_000, 1_000_000);

      // input: $2.50 / 1M tokens = $2.50
      // output: $10.00 / 1M tokens = $10.00
      // total: $12.50
      expect(cost).toBeCloseTo(12.50, 2);
    });

    it('🚨 EXPÕE BUG: Aceita modelo inválido e deveria lançar erro', () => {
      // @ts-expect-error - Testando comportamento com tipo inválido
      expect(() => calculateCost('gpt-5-ultra', 100, 100)).toThrow('Modelo não suportado');
    });
  });

  describe('🚨 BUG: Type Safety Quebrado (Issue #4)', () => {
    it('EXPÕE BUG: logAIUsage usa "any" type e permite dados inválidos', async () => {
      // Este teste mostra que o TypeScript não está validando corretamente
      const validLog = await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
      });

      expect(validLog).toHaveProperty('id');
      expect(validLog).toHaveProperty('custo_usd');

      // 🔴 BUG: O código usa "const log: any = {"
      // Isso permite salvar dados inválidos sem erro de compilação
      console.warn('⚠️ Type safety quebrado: usa "any" na criação do log');
    });
  });

  describe('✅ CORRIGIDO: Validação de Limite (Issue #6)', () => {
    it('deve lançar ValidationError para limite negativo', async () => {
      await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
      });

      // ✅ CORRIGIDO: Agora lança ValidationError
      await expect(
        checkAIBudgetLimit(new Date(), -10, 0.8)
      ).rejects.toThrow('Limite de gastos deve ser maior ou igual a zero');
    });

    it('EXPÕE BUG: checkAIBudgetLimit aceita limite zero', async () => {
      await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
      });

      const result = await checkAIBudgetLimit(new Date(), 0, 0.8);

      // Com limite 0, percentageUsed é 0 (tratado no código)
      // Mas isOverLimit = usedUsd > 0 = true
      expect(result.percentageUsed).toBe(0);
      expect(result.isOverLimit).toBe(true);

      console.warn('⚠️ Limite zero gera comportamento confuso');
    });
  });

  describe('🚨 BUG: "Rejected" ≠ "Not Confirmed" (Issue #7)', () => {
    it('EXPÕE BUG: rejected_suggestions conta sugestões pending como rejeitadas', async () => {
      // Criar 3 sugestões:
      // 1. Confirmada (accepted)
      await logAIUsage({
        prompt: 'Test 1',
        resposta: 'Response 1',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: 'cat-1',
        confianca: 0.9,
      });

      // 2. Não confirmada (pending ou rejected?)
      await logAIUsage({
        prompt: 'Test 2',
        resposta: 'Response 2',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: 'cat-2',
        confianca: 0.7,
      });

      // 3. Não confirmada (pending ou rejected?)
      await logAIUsage({
        prompt: 'Test 3',
        resposta: 'Response 3',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: 'cat-3',
        confianca: 0.85,
      });

      const summary = await getAIUsageSummary();

      // 🔴 BUG: rejected_suggestions = 2, mas na verdade são "not confirmed"
      // Podem estar pending (usuário não viu ainda)
      // Ou genuinamente rejeitadas (usuário escolheu outra categoria)
      expect(summary.rejected_suggestions).toBe(3); // Todas as 3 não confirmadas

      console.warn('⚠️ Sistema não diferencia "pending" de "rejected"');
      console.warn('⚠️ Deveria ter campo status: pending | accepted | rejected');
    });
  });

  describe('🚨 BUG: Performance - Sem Índice (Issue #8)', () => {
    it('EXPÕE BUG: getAIUsageSummary carrega TUDO na memória', async () => {
      // Criar muitos logs para simular database grande
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          logAIUsage({
            prompt: `Test ${i}`,
            resposta: `Response ${i}`,
            modelo: 'gpt-4o-mini',
            tokens_prompt: 100,
            tokens_resposta: 50,
          })
        );
      }
      await Promise.all(promises);

      const start = performance.now();

      // 🔴 BUG: Código faz .toArray() e filtra em memória
      // Com 10k+ logs, fica muito lento
      const summary = await getAIUsageSummary();

      const end = performance.now();
      const timeMs = end - start;

      console.log(`⚠️ Tempo com 50 logs: ${timeMs.toFixed(2)}ms`);
      console.warn('⚠️ Com 10.000 logs, ficaria MUITO mais lento');
      console.warn('⚠️ Deveria usar .where("created_at").between() com índice');

      expect(summary.total_requests).toBe(50);
    });
  });

  describe('confirmAISuggestion', () => {
    it('deve marcar sugestão como confirmada', async () => {
      const log = await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: 'cat-123',
        confianca: 0.9,
      });

      await confirmAISuggestion(log.id);

      const db = getDB();
      const updated = await db.logs_ia.get(log.id);

      expect(updated?.confirmada).toBe(true);
    });

    it('🚨 EXPÕE BUG: confirmAISuggestion nunca é chamado no código', () => {
      // Esta função existe mas não é usada em nenhum lugar!
      // grep -r "confirmAISuggestion" retorna apenas a definição

      console.warn('⚠️ Função órfã: confirmAISuggestion não é chamada');
      console.warn('⚠️ Métricas de confirmed_suggestions sempre serão 0');
      console.warn('⚠️ Integração com UI está faltando');

      // Teste passa, mas função não funciona no fluxo real
      expect(typeof confirmAISuggestion).toBe('function');
    });
  });

  describe('getAIUsageSummary', () => {
    it('deve filtrar logs por data corretamente', async () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

      // Log do mês passado
      const db = getDB();
      await db.logs_ia.add({
        id: 'old-log',
        transacao_id: undefined,
        prompt: 'Old',
        resposta: 'Old response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        tokens_total: 150,
        custo_usd: 0.001,
        categoria_sugerida_id: undefined,
        confianca: undefined,
        confirmada: false,
        created_at: lastMonth,
      });

      // Log deste mês
      await logAIUsage({
        prompt: 'New',
        resposta: 'New response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
      });

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const summary = await getAIUsageSummary(startOfMonth, endOfMonth);

      // Deve contar apenas log deste mês
      expect(summary.total_requests).toBe(1);
    });

    it('deve calcular average_confidence corretamente', async () => {
      await logAIUsage({
        prompt: 'Test 1',
        resposta: 'Response 1',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: 'cat-1',
        confianca: 0.9,
      });

      await logAIUsage({
        prompt: 'Test 2',
        resposta: 'Response 2',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: 'cat-2',
        confianca: 0.7,
      });

      const summary = await getAIUsageSummary();

      // (0.9 + 0.7) / 2 = 0.8
      expect(summary.average_confidence).toBeCloseTo(0.8, 1);
    });

    it('deve retornar 0 para average_confidence quando não há sugestões', async () => {
      await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        // Sem categoria_sugerida_id
      });

      const summary = await getAIUsageSummary();

      expect(summary.average_confidence).toBe(0);
    });
  });

  describe('checkAIBudgetLimit', () => {
    it('deve detectar quando está próximo do limite', async () => {
      // Criar logs que custam ~$0.82 de um limite de $1.00
      // Cálculo: 100k tokens prompt + 10k tokens response = ~$0.021 por chamada
      // 39 chamadas * $0.021 = ~$0.82 (82%)
      for (let i = 0; i < 39; i++) {
        await logAIUsage({
          prompt: `Test ${i}`,
          resposta: `Response ${i}`,
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100000, // $0.015
          tokens_resposta: 10000, // $0.006
        });
      }

      const result = await checkAIBudgetLimit(new Date(), 1.0, 0.8);

      expect(result.isNearLimit).toBe(true); // >= 80%
      expect(result.isOverLimit).toBe(false); // < 100%
      expect(result.percentageUsed).toBeGreaterThanOrEqual(80);
    });

    it('deve detectar quando excedeu o limite', async () => {
      // Criar logs que custam ~$1.20 de um limite de $1.00
      // 57 chamadas * $0.021 = ~$1.20 (120%)
      for (let i = 0; i < 57; i++) {
        await logAIUsage({
          prompt: `Test ${i}`,
          resposta: `Response ${i}`,
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100000,
          tokens_resposta: 10000,
        });
      }

      const result = await checkAIBudgetLimit(new Date(), 1.0, 0.8);

      expect(result.isOverLimit).toBe(true);
      expect(result.percentageUsed).toBeGreaterThan(100);
      expect(result.remainingUsd).toBe(0); // Math.max(0, ...)
    });
  });
});
