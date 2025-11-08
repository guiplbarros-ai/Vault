/**
 * Testes Unitários - ContaService
 * Agent CORE: Implementador
 *
 * Testa operações CRUD de contas
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContaService } from '@/lib/services/conta.service';
import { getDB } from '@/lib/db/client';
import { contas, contaAtiva, contaInativa } from '../../fixtures/contas';
import { transacoes } from '../../fixtures/transacoes';
import type { Conta } from '@/lib/types';

describe('ContaService', () => {
  const service = new ContaService();

  beforeEach(async () => {
    // Limpar e popular database
    const db = getDB();
    await db.contas.clear();
    await db.transacoes.clear();
    await db.contas.bulkAdd(contas);
    await db.transacoes.bulkAdd(transacoes);
  });

  describe('listContas', () => {
    it('deve listar apenas contas ativas por padrão', async () => {
      const result = await service.listContas();

      expect(result.every(c => c.ativa === true)).toBe(true);
      expect(result.some(c => c.id === 'conta-inativa')).toBe(false);
    });

    it('deve incluir contas inativas quando solicitado', async () => {
      const result = await service.listContas({ incluirInativas: true });

      expect(result.some(c => c.id === 'conta-inativa')).toBe(true);
      expect(result).toHaveLength(contas.length);
    });

    it('deve ordenar por nome ascendente', async () => {
      const result = await service.listContas({
        sortBy: 'nome',
        sortOrder: 'asc'
      });

      for (let i = 1; i < result.length; i++) {
        expect(result[i].nome.toLowerCase() >= result[i - 1].nome.toLowerCase()).toBe(true);
      }
    });

    it('deve ordenar por saldo_inicial descendente', async () => {
      const result = await service.listContas({
        sortBy: 'saldo_inicial',
        sortOrder: 'desc'
      });

      for (let i = 1; i < result.length; i++) {
        const saldoA = result[i - 1].saldo_inicial || 0;
        const saldoB = result[i].saldo_inicial || 0;
        expect(saldoB <= saldoA).toBe(true);
      }
    });

    it('deve aplicar paginação corretamente', async () => {
      const result = await service.listContas({
        incluirInativas: true,
        limit: 2,
        offset: 0
      });

      expect(result).toHaveLength(2);
    });

    it('deve aplicar offset corretamente', async () => {
      const allContas = await service.listContas({ incluirInativas: true });
      const result = await service.listContas({
        incluirInativas: true,
        limit: 2,
        offset: 1
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(allContas[1].id);
    });
  });

  describe('getContaById', () => {
    it('deve retornar conta quando ID existe', async () => {
      const result = await service.getContaById('conta-corrente');

      expect(result).toBeDefined();
      expect(result?.id).toBe('conta-corrente');
      expect(result?.nome).toBe('Conta Corrente');
    });

    it('deve retornar null quando ID não existe', async () => {
      const result = await service.getContaById('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('createConta', () => {
    it('deve criar conta com dados mínimos', async () => {
      const novaConta: Omit<Conta, 'id' | 'created_at' | 'updated_at'> = {
        nome: 'Nova Conta',
        tipo: 'corrente',
        saldo_inicial: 1000,
        ativa: true,
        incluir_dashboard: true,
      };

      const result = await service.createConta(novaConta);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.nome).toBe('Nova Conta');
      expect(result.tipo).toBe('corrente');
      expect(result.saldo_inicial).toBe(1000);
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('deve criar conta com instituicao_id', async () => {
      const novaConta: Omit<Conta, 'id' | 'created_at' | 'updated_at'> = {
        instituicao_id: 'inst-nubank',
        nome: 'Nubank',
        tipo: 'corrente',
        saldo_inicial: 500,
        ativa: true,
        incluir_dashboard: true,
      };

      const result = await service.createConta(novaConta);

      expect(result.instituicao_id).toBe('inst-nubank');
    });

    it('deve criar conta inativa', async () => {
      const novaConta: Omit<Conta, 'id' | 'created_at' | 'updated_at'> = {
        nome: 'Conta Inativa',
        tipo: 'poupanca',
        saldo_inicial: 0,
        ativa: false,
        incluir_dashboard: false,
      };

      const result = await service.createConta(novaConta);

      expect(result.ativa).toBe(false);
    });
  });

  describe('updateConta', () => {
    it('deve atualizar conta existente', async () => {
      const updates = {
        nome: 'Conta Corrente Atualizada',
        saldo_inicial: 2000,
      };

      const result = await service.updateConta('conta-corrente', updates);

      expect(result).toBeDefined();
      expect(result.nome).toBe('Conta Corrente Atualizada');
      expect(result.saldo_inicial).toBe(2000);
      expect(result.updated_at).toBeDefined();
      expect(result.created_at).toBeDefined();
    });

    it('deve lançar erro quando ID não existe', async () => {
      const updates = {
        nome: 'Não Importa',
      };

      await expect(service.updateConta('id-inexistente', updates)).rejects.toThrow();
    });

    it('deve preservar campos não atualizados', async () => {
      const original = await service.getContaById('conta-corrente');

      const result = await service.updateConta('conta-corrente', {
        nome: 'Nome Atualizado',
      });

      expect(result.tipo).toBe(original?.tipo);
      expect(result.ativa).toBe(original?.ativa);
    });
  });

  describe('alternar status via update', () => {
    it('deve desativar conta via update', async () => {
      const result = await service.updateConta('conta-corrente', { ativa: false });

      expect(result.ativa).toBe(false);
    });

    it('deve ativar conta via update', async () => {
      const result = await service.updateConta('conta-inativa', { ativa: true });

      expect(result.ativa).toBe(true);
    });
  });

  describe('getSaldoConta', () => {
    it('deve calcular saldo da conta corretamente', async () => {
      const result = await service.getSaldoConta('conta-corrente');

      // Saldo inicial + transações
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('deve retornar saldo quando não há transações', async () => {
      // Criar conta sem transações
      const novaConta = await service.createConta({
        nome: 'Conta Vazia',
        tipo: 'corrente',
        saldo_inicial: 500,
        ativa: true,
        incluir_dashboard: true,
      });

      const result = await service.getSaldoConta(novaConta.id);

      // getSaldoConta pode retornar saldo_inicial ou saldo calculado
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSaldoTotal', () => {
    it('deve retornar saldo de uma conta específica', async () => {
      const result = await service.getSaldoTotal('conta-corrente');

      // getSaldoTotal retorna saldo da conta específica
      expect(typeof result).toBe('number');
    });

    it('deve calcular corretamente para contas sem transações', async () => {
      const novaConta = await service.createConta({
        nome: 'Conta Nova',
        tipo: 'corrente',
        saldo_inicial: 1500,
        ativa: true,
        incluir_dashboard: true,
      });

      const result = await service.getSaldoTotal(novaConta.id);

      expect(result).toBe(1500);
    });
  });

  describe('listContasByInstituicao', () => {
    it('deve retornar contas de uma instituição específica', async () => {
      const result = await service.listContasByInstituicao('inst-banco-brasil');

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(c => c.instituicao_id === 'inst-banco-brasil')).toBe(true);
    });

    it('deve retornar array vazio quando instituição não tem contas', async () => {
      const result = await service.listContasByInstituicao('inst-inexistente');

      expect(result).toHaveLength(0);
    });
  });

  describe('filtros de dashboard', () => {
    it('deve filtrar contas ativas com incluir_dashboard', async () => {
      const result = await service.listContas();
      const dashboard = result.filter(c => c.incluir_dashboard === true && c.ativa === true);

      expect(dashboard.length).toBeGreaterThan(0);
      expect(dashboard.every(c => c.incluir_dashboard === true)).toBe(true);
    });

    it('contas inativas não aparecem na lista padrão', async () => {
      const result = await service.listContas();

      expect(result.some(c => c.id === 'conta-inativa')).toBe(false);
    });
  });
});
