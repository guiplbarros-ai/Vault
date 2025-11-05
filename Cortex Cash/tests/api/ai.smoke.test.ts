/**
 * Smoke Tests para APIs de IA
 * Agent DATA: Owner
 *
 * Testes básicos que verificam se os endpoints estão funcionando
 * Não são testes unitários completos, apenas validação de contratos
 */

import { describe, it, expect } from '@jest/globals';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

describe('AI API Smoke Tests', () => {
  describe('GET /api/ai/status', () => {
    it('deve retornar status da API key', async () => {
      const response = await fetch(`${BASE_URL}/api/ai/status`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('apiKeyConfigured');
      expect(typeof data.apiKeyConfigured).toBe('boolean');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/ai/classify', () => {
    it('deve retornar erro quando falta API key', async () => {
      // Pula se API key está configurada
      const statusRes = await fetch(`${BASE_URL}/api/ai/status`);
      const statusData = await statusRes.json();

      if (statusData.apiKeyConfigured) {
        console.log('⏭️  Pulando teste (API key configurada)');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/ai/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: 'Almoço no restaurante',
          valor: 45.50,
          tipo: 'despesa',
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('API key');
    });

    it('deve retornar erro quando faltam campos obrigatórios', async () => {
      const response = await fetch(`${BASE_URL}/api/ai/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: 'Teste',
          // Faltando: valor, tipo
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('deve aceitar configurações customizadas', async () => {
      // Pula se API key não está configurada
      const statusRes = await fetch(`${BASE_URL}/api/ai/status`);
      const statusData = await statusRes.json();

      if (!statusData.apiKeyConfigured) {
        console.log('⏭️  Pulando teste (API key não configurada)');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/ai/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: 'Uber para trabalho',
          valor: 25.00,
          tipo: 'despesa',
          config: {
            defaultModel: 'gpt-4o-mini',
            monthlyCostLimit: 100,
            allowOverride: true,
            strategy: 'balanced',
          },
        }),
      });

      // Deve retornar 200 ou 400 (sem categorias), mas não 500
      expect([200, 400].includes(response.status)).toBe(true);
    });
  });

  describe('GET /api/ai/usage', () => {
    it('deve retornar estatísticas de uso', async () => {
      const response = await fetch(`${BASE_URL}/api/ai/usage?limit=10`);
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
      const response = await fetch(`${BASE_URL}/api/ai/usage?limit=${customLimit}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Limite deve ser convertido para BRL (aproximadamente 50 USD * 6 BRL = 300 BRL)
      expect(data.limitBrl).toBeGreaterThan(250);
      expect(data.limitBrl).toBeLessThan(400);
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

      const response = await fetch(`${BASE_URL}/api/ai/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validConfig),
      });

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

      const response = await fetch(`${BASE_URL}/api/ai/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidConfig),
      });

      // Deve retornar erro (400 ou 500)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/ai/cache', () => {
    it('deve retornar estatísticas do cache', async () => {
      const response = await fetch(`${BASE_URL}/api/ai/cache`);
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
      const response = await fetch(`${BASE_URL}/api/ai/cache?action=clean`, {
        method: 'DELETE',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('removed');
      expect(typeof data.removed).toBe('number');
    });

    it('deve limpar todo o cache', async () => {
      const response = await fetch(`${BASE_URL}/api/ai/cache?action=clear`, {
        method: 'DELETE',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
    });

    it('deve retornar erro para ação inválida', async () => {
      const response = await fetch(`${BASE_URL}/api/ai/cache?action=invalid`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });
});
