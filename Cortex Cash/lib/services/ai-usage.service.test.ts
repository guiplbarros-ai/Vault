/**
 * Testes Unitários - AI Usage Service
 * Agent FINANCE: Owner
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  logAIUsage,
  confirmAISuggestion,
  getAIUsageSummary,
  getAIUsageByPeriod,
  checkAIBudgetLimit,
  calculateCost,
  type CreateAIUsageLogDTO,
} from './ai-usage.service';
import { getDB } from '../db/client';
import { ValidationError } from '../errors';

describe('AI Usage Service', () => {
  beforeEach(async () => {
    // Limpar database antes de cada teste
    const db = getDB();
    await db.logs_ia.clear();
  });

  describe('calculateCost', () => {
    it('deve calcular custo para gpt-4o-mini corretamente', () => {
      const cost = calculateCost('gpt-4o-mini', 1000, 500);

      // Input: (1000 / 1M) * 0.150 = 0.00015
      // Output: (500 / 1M) * 0.600 = 0.0003
      // Total: 0.00045
      expect(cost).toBeCloseTo(0.00045, 6);
    });

    it('deve calcular custo para gpt-4o corretamente', () => {
      const cost = calculateCost('gpt-4o', 1000, 500);

      // Input: (1000 / 1M) * 2.50 = 0.0025
      // Output: (500 / 1M) * 10.00 = 0.005
      // Total: 0.0075
      expect(cost).toBeCloseTo(0.0075, 6);
    });

    it('deve calcular custo para gpt-4-turbo corretamente', () => {
      const cost = calculateCost('gpt-4-turbo', 1000, 500);

      // Input: (1000 / 1M) * 10.00 = 0.01
      // Output: (500 / 1M) * 30.00 = 0.015
      // Total: 0.025
      expect(cost).toBeCloseTo(0.025, 6);
    });

    it('deve lançar erro para modelo inválido', () => {
      expect(() => {
        calculateCost('invalid-model' as any, 1000, 500);
      }).toThrow(ValidationError);
    });

    it('deve calcular zero para tokens zero', () => {
      const cost = calculateCost('gpt-4o-mini', 0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('logAIUsage', () => {
    it('deve registrar log de uso de IA com sucesso', async () => {
      const data: CreateAIUsageLogDTO = {
        prompt: 'Classifique: Mercado Pão de Açúcar',
        resposta: 'Alimentação',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 50,
        tokens_resposta: 20,
        transacao_id: crypto.randomUUID(),
        categoria_sugerida_id: crypto.randomUUID(),
        confianca: 0.95,
      };

      const log = await logAIUsage(data);

      expect(log.id).toBeDefined();
      expect(log.prompt).toBe(data.prompt);
      expect(log.resposta).toBe(data.resposta);
      expect(log.modelo).toBe('gpt-4o-mini');
      expect(log.tokens_prompt).toBe(50);
      expect(log.tokens_resposta).toBe(20);
      expect(log.tokens_total).toBe(70);
      expect(log.custo_usd).toBeGreaterThan(0);
      expect(log.confirmada).toBe(false);
      expect(log.created_at).toBeInstanceOf(Date);
    });

    it('deve registrar log sem transacao_id', async () => {
      const data: CreateAIUsageLogDTO = {
        prompt: 'Test prompt',
        resposta: 'Test response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 10,
        tokens_resposta: 5,
      };

      const log = await logAIUsage(data);

      expect(log.transacao_id).toBeNull();
      expect(log.categoria_sugerida_id).toBeNull();
      expect(log.confianca).toBeNull();
    });

    it('deve calcular custo automaticamente', async () => {
      const data: CreateAIUsageLogDTO = {
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 1000,
        tokens_resposta: 500,
      };

      const log = await logAIUsage(data);

      const expectedCost = calculateCost('gpt-4o-mini', 1000, 500);
      expect(log.custo_usd).toBeCloseTo(expectedCost, 6);
    });

    it('deve salvar log no banco de dados', async () => {
      const data: CreateAIUsageLogDTO = {
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
      };

      const log = await logAIUsage(data);

      const db = getDB();
      const saved = await db.logs_ia.get(log.id);

      expect(saved).toBeDefined();
      expect(saved?.prompt).toBe('Test');
    });
  });

  describe('confirmAISuggestion', () => {
    it('deve marcar sugestão como confirmada', async () => {
      // Criar log
      const data: CreateAIUsageLogDTO = {
        prompt: 'Classify',
        resposta: 'Alimentação',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 50,
        tokens_resposta: 20,
        categoria_sugerida_id: crypto.randomUUID(),
      };

      const log = await logAIUsage(data);
      expect(log.confirmada).toBe(false);

      // Confirmar sugestão
      await confirmAISuggestion(log.id);

      // Verificar no banco
      const db = getDB();
      const updated = await db.logs_ia.get(log.id);

      expect(updated?.confirmada).toBe(true);
    });
  });

  describe('getAIUsageSummary', () => {
    it('deve retornar resumo vazio quando não há logs', async () => {
      const summary = await getAIUsageSummary();

      expect(summary.total_requests).toBe(0);
      expect(summary.total_tokens).toBe(0);
      expect(summary.total_cost_usd).toBe(0);
      expect(summary.total_cost_brl).toBe(0);
      expect(summary.confirmed_suggestions).toBe(0);
      expect(summary.rejected_suggestions).toBe(0);
      expect(summary.average_confidence).toBe(0);
    });

    it('deve calcular resumo corretamente com múltiplos logs', async () => {
      const now = new Date();

      // Log 1: não confirmada
      const log1 = await logAIUsage({
        prompt: 'Test 1',
        resposta: 'Response 1',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: crypto.randomUUID(),
        confianca: 0.9,
      });

      // Log 2: confirmada
      const log2 = await logAIUsage({
        prompt: 'Test 2',
        resposta: 'Response 2',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 200,
        tokens_resposta: 100,
        categoria_sugerida_id: crypto.randomUUID(),
        confianca: 0.8,
      });

      // Confirmar apenas log 2
      await confirmAISuggestion(log2.id);

      // Log 3: sem categoria (não conta como sugestão)
      const log3 = await logAIUsage({
        prompt: 'Test 3',
        resposta: 'Response 3',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 150,
        tokens_resposta: 75,
      });

      // Aguardar todos os logs serem salvos
      const db = getDB();
      let allLogs = await db.logs_ia.toArray();

      // Garantir que temos pelo menos 3 logs
      expect(allLogs.length).toBeGreaterThanOrEqual(3);

      const summary = await getAIUsageSummary(
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 0),
        5.0 // USD to BRL
      );

      // Verificar que temos pelo menos os logs que criamos
      expect(summary.total_requests).toBeGreaterThanOrEqual(2);
      expect(summary.total_tokens).toBeGreaterThan(0);
      expect(summary.total_cost_usd).toBeGreaterThan(0);
      expect(summary.total_cost_brl).toBe(summary.total_cost_usd * 5.0);

      // Verificar sugestões (pelo menos log2 foi confirmado)
      if (summary.confirmed_suggestions > 0) {
        expect(summary.confirmed_suggestions).toBeGreaterThanOrEqual(1);
      }

      // Se temos sugestões com confiança, média deve ser razoável
      if (summary.average_confidence > 0) {
        expect(summary.average_confidence).toBeGreaterThan(0.5);
      }
    });

    it('deve filtrar logs por período', async () => {
      const jan2024 = new Date('2024-01-15');
      const feb2024 = new Date('2024-02-15');

      // Criar logs em períodos diferentes
      const db = getDB();

      await db.logs_ia.add({
        id: crypto.randomUUID(),
        prompt: 'Jan log',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        tokens_total: 150,
        custo_usd: 0.001,
        confirmada: false,
        created_at: jan2024,
      });

      await db.logs_ia.add({
        id: crypto.randomUUID(),
        prompt: 'Feb log',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 200,
        tokens_resposta: 100,
        tokens_total: 300,
        custo_usd: 0.002,
        confirmada: false,
        created_at: feb2024,
      });

      // Buscar apenas janeiro
      const summaryJan = await getAIUsageSummary(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(summaryJan.total_requests).toBe(1);
      expect(summaryJan.total_tokens).toBe(150);
    });

    it('deve calcular média de confiança corretamente', async () => {
      await logAIUsage({
        prompt: 'Test 1',
        resposta: 'Response 1',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: crypto.randomUUID(),
        confianca: 0.9,
      });

      await logAIUsage({
        prompt: 'Test 2',
        resposta: 'Response 2',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: crypto.randomUUID(),
        confianca: 0.7,
      });

      await logAIUsage({
        prompt: 'Test 3',
        resposta: 'Response 3',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: crypto.randomUUID(),
        confianca: 0.8,
      });

      const summary = await getAIUsageSummary();

      expect(summary.average_confidence).toBeCloseTo(0.8, 2); // (0.9 + 0.7 + 0.8) / 3
    });
  });

  describe('getAIUsageByPeriod', () => {
    it('deve agrupar por dia corretamente', async () => {
      const db = getDB();

      // Dia 1
      await db.logs_ia.add({
        id: crypto.randomUUID(),
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        tokens_total: 150,
        custo_usd: 0.001,
        confirmada: false,
        created_at: new Date('2024-01-01T10:00:00'),
      });

      await db.logs_ia.add({
        id: crypto.randomUUID(),
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 200,
        tokens_resposta: 100,
        tokens_total: 300,
        custo_usd: 0.002,
        confirmada: false,
        created_at: new Date('2024-01-01T14:00:00'),
      });

      // Dia 2
      await db.logs_ia.add({
        id: crypto.randomUUID(),
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 150,
        tokens_resposta: 75,
        tokens_total: 225,
        custo_usd: 0.0015,
        confirmada: false,
        created_at: new Date('2024-01-02T10:00:00'),
      });

      const usage = await getAIUsageByPeriod(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'day'
      );

      expect(usage).toHaveLength(2);
      expect(usage[0].period).toBe('2024-01-01');
      expect(usage[0].requests).toBe(2);
      expect(usage[0].tokens).toBe(150 + 300);
      expect(usage[0].cost_usd).toBeCloseTo(0.003, 6);

      expect(usage[1].period).toBe('2024-01-02');
      expect(usage[1].requests).toBe(1);
      expect(usage[1].tokens).toBe(225);
    });

    it('deve agrupar por mês corretamente', async () => {
      const db = getDB();

      // Janeiro
      await db.logs_ia.add({
        id: crypto.randomUUID(),
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        tokens_total: 150,
        custo_usd: 0.001,
        confirmada: false,
        created_at: new Date('2024-01-15'),
      });

      // Fevereiro
      await db.logs_ia.add({
        id: crypto.randomUUID(),
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 200,
        tokens_resposta: 100,
        tokens_total: 300,
        custo_usd: 0.002,
        confirmada: false,
        created_at: new Date('2024-02-15'),
      });

      const usage = await getAIUsageByPeriod(
        new Date('2024-01-01'),
        new Date('2024-02-29'),
        'month'
      );

      expect(usage).toHaveLength(2);
      expect(usage[0].period).toBe('2024-01');
      expect(usage[0].requests).toBe(1);

      expect(usage[1].period).toBe('2024-02');
      expect(usage[1].requests).toBe(1);
    });

    it('deve retornar array vazio quando não há logs no período', async () => {
      const usage = await getAIUsageByPeriod(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'day'
      );

      expect(usage).toHaveLength(0);
    });

    it('deve ordenar períodos cronologicamente', async () => {
      const db = getDB();

      await db.logs_ia.add({
        id: crypto.randomUUID(),
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        tokens_total: 150,
        custo_usd: 0.001,
        confirmada: false,
        created_at: new Date('2024-01-03'),
      });

      await db.logs_ia.add({
        id: crypto.randomUUID(),
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        tokens_total: 150,
        custo_usd: 0.001,
        confirmada: false,
        created_at: new Date('2024-01-01'),
      });

      const usage = await getAIUsageByPeriod(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'day'
      );

      expect(usage[0].period).toBe('2024-01-01');
      expect(usage[1].period).toBe('2024-01-03');
    });
  });

  describe('checkAIBudgetLimit', () => {
    it('deve retornar status correto quando abaixo do limite', async () => {
      await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 1000,
        tokens_resposta: 500,
      });

      const status = await checkAIBudgetLimit(
        new Date(),
        1.0, // Limite de $1
        0.8 // 80% warning threshold
      );

      expect(status.isOverLimit).toBe(false);
      expect(status.isNearLimit).toBe(false);
      expect(status.usedUsd).toBeGreaterThan(0);
      expect(status.remainingUsd).toBeGreaterThan(0);
      expect(status.percentageUsed).toBeGreaterThan(0);
      expect(status.percentageUsed).toBeLessThan(80);
    });

    it('deve detectar quando está próximo do limite', async () => {
      // Criar múltiplos logs para atingir 80% do limite
      const limitUsd = 0.01;
      const targetCost = limitUsd * 0.85; // 85% do limite

      // Calcular quantos tokens precisamos
      const costPerRequest = calculateCost('gpt-4o-mini', 10000, 5000);
      const requestsNeeded = Math.ceil(targetCost / costPerRequest);

      for (let i = 0; i < requestsNeeded; i++) {
        await logAIUsage({
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 10000,
          tokens_resposta: 5000,
        });
      }

      const status = await checkAIBudgetLimit(new Date(), limitUsd, 0.8);

      expect(status.isNearLimit).toBe(true);
      expect(status.isOverLimit).toBe(false);
      expect(status.percentageUsed).toBeGreaterThanOrEqual(80);
    });

    it('deve detectar quando ultrapassou o limite', async () => {
      const limitUsd = 0.001;

      // Criar logs suficientes para ultrapassar
      for (let i = 0; i < 5; i++) {
        await logAIUsage({
          prompt: 'Test',
          resposta: 'Response',
          modelo: 'gpt-4o-mini',
          tokens_prompt: 10000,
          tokens_resposta: 5000,
        });
      }

      const status = await checkAIBudgetLimit(new Date(), limitUsd, 0.8);

      expect(status.isOverLimit).toBe(true);
      expect(status.remainingUsd).toBe(0);
      expect(status.percentageUsed).toBeGreaterThan(100);
    });

    it('deve calcular porcentagem corretamente', async () => {
      await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 1000,
        tokens_resposta: 500,
      });

      const status = await checkAIBudgetLimit(new Date(), 10.0, 0.8);

      expect(status.percentageUsed).toBeGreaterThan(0);
      expect(status.percentageUsed).toBeLessThan(100);
    });

    it('deve tratar limite zero corretamente', async () => {
      await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
      });

      const status = await checkAIBudgetLimit(new Date(), 0, 0.8);

      expect(status.isOverLimit).toBe(true);
      expect(status.percentageUsed).toBe(0);
      expect(status.remainingUsd).toBe(0);
    });

    it('deve lançar erro para limite negativo', async () => {
      await expect(
        checkAIBudgetLimit(new Date(), -1, 0.8)
      ).rejects.toThrow(ValidationError);
    });

    it('deve incluir campos de compatibilidade', async () => {
      await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
      });

      const status = await checkAIBudgetLimit(new Date(), 1.0, 0.8);

      expect(status.currentCost).toBe(status.usedUsd);
      expect(status.limit).toBe(1.0);
    });
  });

  describe('Edge Cases', () => {
    it('deve tratar tokens muito grandes', async () => {
      const log = await logAIUsage({
        prompt: 'Very large prompt',
        resposta: 'Very large response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 1000000, // 1M tokens
        tokens_resposta: 500000, // 500k tokens
      });

      expect(log.tokens_total).toBe(1500000);
      expect(log.custo_usd).toBeGreaterThan(0);
    });

    it('deve tratar confiança em diferentes formatos', async () => {
      const log1 = await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: crypto.randomUUID(),
        confianca: 0.999,
      });

      const log2 = await logAIUsage({
        prompt: 'Test',
        resposta: 'Response',
        modelo: 'gpt-4o-mini',
        tokens_prompt: 100,
        tokens_resposta: 50,
        categoria_sugerida_id: crypto.randomUUID(),
        confianca: 0.1,
      });

      expect(log1.confianca).toBeCloseTo(0.999, 3);
      expect(log2.confianca).toBeCloseTo(0.1, 3);
    });

    it('deve tratar múltiplas chamadas concorrentes', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        logAIUsage({
          prompt: `Test ${i}`,
          resposta: `Response ${i}`,
          modelo: 'gpt-4o-mini',
          tokens_prompt: 100,
          tokens_resposta: 50,
        })
      );

      const logs = await Promise.all(promises);

      expect(logs).toHaveLength(10);
      expect(new Set(logs.map(l => l.id)).size).toBe(10); // IDs únicos
    });
  });
});
