/**
 * Testes Unitários - ContaService
 * Agent CORE: Implementador
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContaService } from './conta.service';
import { getDB } from '../db/client';
import { NotFoundError, DatabaseError } from '../errors';
import type { Conta } from '../types';

describe('ContaService', () => {
  let service: ContaService;

  beforeEach(async () => {
    service = new ContaService();

    // Limpar database antes de cada teste
    const db = getDB();
    await db.contas.clear();
    await db.transacoes.clear();
  });

  describe('createConta', () => {
    it('deve criar uma nova conta com sucesso', async () => {
      const novaConta = {
        nome: 'Conta Teste',
        tipo: 'corrente' as const,
        instituicao_id: 'inst-1',
        saldo_referencia: 1000,
        data_referencia: new Date(),
        saldo_atual: 1000,
        ativa: true,
      };

      const result = await service.createConta(novaConta);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.nome).toBe('Conta Teste');
      expect(result.tipo).toBe('corrente');
      expect(result.saldo_referencia).toBe(1000);
      expect(result.ativa).toBe(true);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('deve criar conta com saldo_referencia 0 por padrão', async () => {
      const novaConta = {
        nome: 'Conta Sem Saldo',
        tipo: 'corrente' as const,
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
        ativa: true,
      };

      const result = await service.createConta(novaConta);

      expect(result.saldo_referencia).toBeUndefined();
    });
  });

  describe('listContas', () => {
    beforeEach(async () => {
      // Criar contas de teste
      await service.createConta({
        nome: 'Conta A',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 100,
        data_referencia: new Date(),
        saldo_atual: 100,
        ativa: true,
      });
      await service.createConta({
        nome: 'Conta B',
        tipo: 'poupanca',
        instituicao_id: 'inst-1',
        saldo_referencia: 200,
        data_referencia: new Date(),
        saldo_atual: 200,
        ativa: true,
      });
      await service.createConta({
        nome: 'Conta C Inativa',
        tipo: 'corrente',
        instituicao_id: 'inst-2',
        saldo_referencia: 300,
        data_referencia: new Date(),
        saldo_atual: 300,
        ativa: false,
      });
    });

    it('deve listar apenas contas ativas por padrão', async () => {
      const result = await service.listContas();

      expect(result).toHaveLength(2);
      expect(result.every(c => c.ativa)).toBe(true);
    });

    it('deve listar todas as contas incluindo inativas', async () => {
      const result = await service.listContas({ incluirInativas: true });

      expect(result).toHaveLength(3);
    });

    it('deve ordenar por nome ascendente', async () => {
      const result = await service.listContas({ sortBy: 'nome', sortOrder: 'asc' });

      expect(result[0].nome).toBe('Conta A');
      expect(result[1].nome).toBe('Conta B');
    });

    it('deve ordenar por saldo_referencia descendente', async () => {
      const result = await service.listContas({ sortBy: 'saldo_referencia', sortOrder: 'desc' });

      expect(result[0].saldo_referencia).toBe(200);
      expect(result[1].saldo_referencia).toBe(100);
    });

    it('deve aplicar paginação corretamente', async () => {
      const result = await service.listContas({ limit: 1, offset: 1 });

      expect(result).toHaveLength(1);
    });
  });

  describe('getContaById', () => {
    it('deve retornar conta existente', async () => {
      const created = await service.createConta({
        nome: 'Conta Teste',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
      ativa: true,
      });

      const result = await service.getContaById(created.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.nome).toBe('Conta Teste');
    });

    it('deve retornar null para conta inexistente', async () => {
      const result = await service.getContaById('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('updateConta', () => {
    it('deve atualizar conta existente', async () => {
      const created = await service.createConta({
        nome: 'Conta Original',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
      ativa: true,
      });

      const result = await service.updateConta(created.id, {
        nome: 'Conta Atualizada',
        saldo_referencia: 500,
      });

      expect(result.nome).toBe('Conta Atualizada');
      expect(result.saldo_referencia).toBe(500);
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('deve lançar NotFoundError para conta inexistente', async () => {
      await expect(
        service.updateConta('id-inexistente', { nome: 'Novo Nome' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('toggleAtiva', () => {
    it('deve desativar conta ativa', async () => {
      const created = await service.createConta({
        nome: 'Conta Ativa',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
      ativa: true,
      });

      const result = await service.toggleAtiva(created.id);

      expect(result.ativa).toBe(false);
    });

    it('deve ativar conta inativa', async () => {
      const created = await service.createConta({
        nome: 'Conta Inativa',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
      ativa: false,
      });

      const result = await service.toggleAtiva(created.id);

      expect(result.ativa).toBe(true);
    });

    it('deve lançar NotFoundError para conta inexistente', async () => {
      await expect(
        service.toggleAtiva('id-inexistente')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getSaldoConta', () => {
    it('deve retornar 0 para conta sem transações', async () => {
      const conta = await service.createConta({
        nome: 'Conta Vazia',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
      ativa: true,
      });

      const saldo = await service.getSaldoConta(conta.id);

      expect(saldo).toBe(0);
    });

    it('deve calcular saldo com receitas e despesas', async () => {
      const db = getDB();
      const conta = await service.createConta({
        nome: 'Conta Teste',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
      ativa: true,
      });

      // Adicionar transações manualmente
      await db.transacoes.add({
        id: 'trans-1',
        conta_id: conta.id,
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Receita',
        valor: 100,
        tipo: 'receita',
        parcelado: false,
        classificacao_confirmada: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.transacoes.add({
        id: 'trans-2',
        conta_id: conta.id,
        categoria_id: 'cat-2',
        data: new Date(),
        descricao: 'Despesa',
        valor: 30,
        tipo: 'despesa',
        parcelado: false,
        classificacao_confirmada: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const saldo = await service.getSaldoConta(conta.id);

      expect(saldo).toBe(70); // 100 - 30
    });
  });

  describe('getSaldoTotal', () => {
    it('deve somar saldo_referencia + saldo das transações', async () => {
      const db = getDB();
      const conta = await service.createConta({
        nome: 'Conta Teste',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 500,
        data_referencia: new Date(),
        saldo_atual: 500,
        ativa: true,
      });

      await db.transacoes.add({
        id: 'trans-1',
        conta_id: conta.id,
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Receita',
        valor: 100,
        tipo: 'receita',
        parcelado: false,
        classificacao_confirmada: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const saldoTotal = await service.getSaldoTotal(conta.id);

      expect(saldoTotal).toBe(600); // 500 + 100
    });

    it('deve lançar NotFoundError para conta inexistente', async () => {
      await expect(
        service.getSaldoTotal('id-inexistente')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteConta', () => {
    it('deve fazer soft delete (desativar conta)', async () => {
      const conta = await service.createConta({
        nome: 'Conta para Deletar',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
      ativa: true,
      });

      await service.deleteConta(conta.id);

      const result = await service.getContaById(conta.id);
      expect(result).toBeDefined();
      expect(result?.ativa).toBe(false);
    });
  });

  describe('hardDeleteConta', () => {
    it('deve deletar conta permanentemente', async () => {
      const conta = await service.createConta({
        nome: 'Conta para Hard Delete',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
      ativa: true,
      });

      await service.hardDeleteConta(conta.id);

      const result = await service.getContaById(conta.id);
      expect(result).toBeNull();
    });
  });

  describe('listContasByInstituicao', () => {
    beforeEach(async () => {
      await service.createConta({
        nome: 'Conta Inst 1 - A',
        tipo: 'corrente',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
      ativa: true,
      });
      await service.createConta({
        nome: 'Conta Inst 1 - B',
        tipo: 'poupanca',
        instituicao_id: 'inst-1',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
      ativa: true,
      });
      await service.createConta({
        nome: 'Conta Inst 2',
        tipo: 'corrente',
        instituicao_id: 'inst-2',
        saldo_referencia: 0,
        data_referencia: new Date(),
        saldo_atual: 0,
      ativa: true,
      });
    });

    it('deve listar contas de uma instituição específica', async () => {
      const result = await service.listContasByInstituicao('inst-1');

      expect(result).toHaveLength(2);
      expect(result.every(c => c.instituicao_id === 'inst-1')).toBe(true);
    });

    it('deve retornar array vazio para instituição sem contas', async () => {
      const result = await service.listContasByInstituicao('inst-inexistente');

      expect(result).toHaveLength(0);
    });
  });
});
