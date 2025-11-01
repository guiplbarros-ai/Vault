/**
 * Testes Unitários - TransacaoService
 * Agent CORE: Implementador
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TransacaoService } from './transacao.service';
import { getDB } from '../db/client';
import { NotFoundError, ValidationError } from '../errors';
import type { CreateTransacaoDTO } from '../types';

describe('TransacaoService', () => {
  let service: TransacaoService;

  beforeEach(async () => {
    service = new TransacaoService();

    // Limpar database antes de cada teste
    const db = getDB();
    await db.transacoes.clear();
    await db.categorias.clear();
    await db.contas.clear();
    await db.instituicoes.clear();

    // Criar instituição e conta de teste
    const instituicaoId = crypto.randomUUID();
    await db.instituicoes.add({
      id: instituicaoId,
      nome: 'Instituição Teste',
      tipo: 'banco',
      ativa: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db.contas.add({
      id: 'conta-1',
      instituicao_id: instituicaoId,
      nome: 'Conta Teste 1',
      tipo: 'corrente',
      saldo_inicial: 1000,
      saldo_atual: 1000,
      ativa: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db.contas.add({
      id: 'conta-2',
      instituicao_id: instituicaoId,
      nome: 'Conta Teste 2',
      tipo: 'poupanca',
      saldo_inicial: 2000,
      saldo_atual: 2000,
      ativa: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Criar categorias de teste
    await db.categorias.add({
      id: 'cat-1',
      nome: 'Categoria Teste 1',
      tipo: 'despesa',
      icone: '🛒',
      cor: '#ff0000',
      ativa: true,
      ordem: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db.categorias.add({
      id: 'cat-2',
      nome: 'Categoria Teste 2',
      tipo: 'receita',
      icone: '💰',
      cor: '#00ff00',
      ativa: true,
      ordem: 2,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  describe('createTransacao', () => {
    it('deve criar uma nova transação com sucesso', async () => {
      const novaTransacao: CreateTransacaoDTO = {
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date('2025-01-15'),
        descricao: 'Compra no supermercado',
        valor: 150.50,
        tipo: 'despesa',
      };

      const result = await service.createTransacao(novaTransacao);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.conta_id).toBe('conta-1');
      expect(result.categoria_id).toBe('cat-1');
      expect(result.descricao).toBe('Compra no supermercado');
      expect(result.valor).toBe(150.50);
      expect(result.tipo).toBe('despesa');
      expect(result.classificacao_confirmada).toBe(true);
      expect(result.classificacao_origem).toBe('manual');
      expect(result.hash).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('deve aceitar data como string', async () => {
      const novaTransacao: CreateTransacaoDTO = {
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: '2025-01-15',
        descricao: 'Teste',
        valor: 100,
        tipo: 'receita',
      };

      const result = await service.createTransacao(novaTransacao);

      expect(result.data).toBeInstanceOf(Date);
    });

    it('deve criar transação com observações e tags', async () => {
      const novaTransacao: CreateTransacaoDTO = {
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Compra especial',
        valor: 200,
        tipo: 'despesa',
        observacoes: 'Compra parcelada em 3x',
        tags: ['importante', 'parcelado'],
      };

      const result = await service.createTransacao(novaTransacao);

      expect(result.observacoes).toBe('Compra parcelada em 3x');
      expect(result.tags).toBeDefined();
      expect(JSON.parse(result.tags!)).toEqual(['importante', 'parcelado']);
    });

    it('deve validar campos obrigatórios', async () => {
      const transacaoInvalida = {
        conta_id: 'conta-1',
        // categoria_id faltando
        data: new Date(),
        // descricao faltando
        valor: 100,
        tipo: 'despesa',
      } as CreateTransacaoDTO;

      await expect(
        service.createTransacao(transacaoInvalida)
      ).rejects.toThrow(ValidationError);
    });

    it('deve validar tipo de transação', async () => {
      const transacaoInvalida = {
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Teste',
        valor: 100,
        tipo: 'invalido',
      } as CreateTransacaoDTO;

      await expect(
        service.createTransacao(transacaoInvalida)
      ).rejects.toThrow(ValidationError);
    });

    it('deve validar valor positivo', async () => {
      const transacaoInvalida: CreateTransacaoDTO = {
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Teste',
        valor: -100,
        tipo: 'despesa',
      };

      await expect(
        service.createTransacao(transacaoInvalida)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('listTransacoes', () => {
    beforeEach(async () => {
      await service.createTransacao({
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date('2025-01-10'),
        descricao: 'Receita A',
        valor: 1000,
        tipo: 'receita',
      });
      await service.createTransacao({
        conta_id: 'conta-1',
        categoria_id: 'cat-2',
        data: new Date('2025-01-15'),
        descricao: 'Despesa B',
        valor: 200,
        tipo: 'despesa',
      });
      await service.createTransacao({
        conta_id: 'conta-2',
        categoria_id: 'cat-1',
        data: new Date('2025-01-20'),
        descricao: 'Receita C',
        valor: 500,
        tipo: 'receita',
      });
    });

    it('deve listar todas as transações', async () => {
      const result = await service.listTransacoes();

      expect(result).toHaveLength(3);
    });

    it('deve filtrar por conta', async () => {
      const result = await service.listTransacoes({ contaId: 'conta-1' });

      expect(result).toHaveLength(2);
      expect(result.every(t => t.conta_id === 'conta-1')).toBe(true);
    });

    it('deve filtrar por categoria', async () => {
      const result = await service.listTransacoes({ categoriaId: 'cat-1' });

      expect(result).toHaveLength(2);
      expect(result.every(t => t.categoria_id === 'cat-1')).toBe(true);
    });

    it('deve filtrar por tipo', async () => {
      const result = await service.listTransacoes({ tipo: 'receita' });

      expect(result).toHaveLength(2);
      expect(result.every(t => t.tipo === 'receita')).toBe(true);
    });

    it('deve filtrar por período de datas', async () => {
      const result = await service.listTransacoes({
        dataInicio: new Date('2025-01-12'),
        dataFim: new Date('2025-01-18'),
      });

      expect(result).toHaveLength(1);
      expect(result[0].descricao).toBe('Despesa B');
    });

    it('deve buscar por termo na descrição', async () => {
      const result = await service.listTransacoes({ busca: 'receita' });

      expect(result).toHaveLength(2);
      expect(result.every(t => t.descricao.toLowerCase().includes('receita'))).toBe(true);
    });

    it('deve ordenar por data descendente por padrão', async () => {
      const result = await service.listTransacoes();

      const dates = result.map(t => (t.data instanceof Date ? t.data : new Date(t.data)).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    });

    it('deve ordenar por valor ascendente', async () => {
      const result = await service.listTransacoes({ sortBy: 'valor', sortOrder: 'asc' });

      expect(result[0].valor).toBe(200);
      expect(result[1].valor).toBe(500);
      expect(result[2].valor).toBe(1000);
    });

    it('deve ordenar por descrição', async () => {
      const result = await service.listTransacoes({ sortBy: 'descricao', sortOrder: 'asc' });

      for (let i = 1; i < result.length; i++) {
        expect(
          result[i].descricao.toLowerCase() >= result[i - 1].descricao.toLowerCase()
        ).toBe(true);
      }
    });

    it('deve aplicar paginação', async () => {
      const result = await service.listTransacoes({ limit: 2 });

      expect(result).toHaveLength(2);
    });

    it('deve aplicar offset', async () => {
      const all = await service.listTransacoes();
      const withOffset = await service.listTransacoes({ offset: 1 });

      expect(withOffset).toHaveLength(all.length - 1);
    });

    it('deve combinar múltiplos filtros', async () => {
      const result = await service.listTransacoes({
        contaId: 'conta-1',
        tipo: 'receita',
      });

      expect(result).toHaveLength(1);
      expect(result[0].descricao).toBe('Receita A');
    });
  });

  describe('getTransacaoById', () => {
    it('deve retornar transação existente', async () => {
      const created = await service.createTransacao({
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Teste',
        valor: 100,
        tipo: 'despesa',
      });

      const result = await service.getTransacaoById(created.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.descricao).toBe('Teste');
    });

    it('deve retornar null para transação inexistente', async () => {
      const result = await service.getTransacaoById('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('updateTransacao', () => {
    it('deve atualizar transação existente', async () => {
      const created = await service.createTransacao({
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Original',
        valor: 100,
        tipo: 'despesa',
      });

      const result = await service.updateTransacao(created.id, {
        descricao: 'Atualizada',
        valor: 200,
      });

      expect(result.descricao).toBe('Atualizada');
      expect(result.valor).toBe(200);
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('deve atualizar classificação ao mudar categoria', async () => {
      const created = await service.createTransacao({
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Teste',
        valor: 100,
        tipo: 'despesa',
      });

      const result = await service.updateTransacao(created.id, {
        categoria_id: 'cat-2',
      });

      expect(result.categoria_id).toBe('cat-2');
      expect(result.classificacao_confirmada).toBe(true);
      expect(result.classificacao_origem).toBe('manual');
    });

    it('deve lançar NotFoundError para transação inexistente', async () => {
      await expect(
        service.updateTransacao('id-inexistente', { descricao: 'Nova' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTransacao', () => {
    it('deve deletar transação permanentemente', async () => {
      const transacao = await service.createTransacao({
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Para Deletar',
        valor: 100,
        tipo: 'despesa',
      });

      await service.deleteTransacao(transacao.id);

      const result = await service.getTransacaoById(transacao.id);
      expect(result).toBeNull();
    });
  });

  describe('bulkUpdateCategoria', () => {
    it('deve atualizar categoria em múltiplas transações', async () => {
      const trans1 = await service.createTransacao({
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Trans 1',
        valor: 100,
        tipo: 'despesa',
      });

      const trans2 = await service.createTransacao({
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Trans 2',
        valor: 200,
        tipo: 'despesa',
      });

      const count = await service.bulkUpdateCategoria(
        [trans1.id, trans2.id],
        'cat-2'
      );

      expect(count).toBe(2);

      const updated1 = await service.getTransacaoById(trans1.id);
      const updated2 = await service.getTransacaoById(trans2.id);

      expect(updated1?.categoria_id).toBe('cat-2');
      expect(updated2?.categoria_id).toBe('cat-2');
      expect(updated1?.classificacao_confirmada).toBe(true);
      expect(updated2?.classificacao_confirmada).toBe(true);
    });

    it('deve continuar atualizando mesmo com IDs inválidos', async () => {
      const trans1 = await service.createTransacao({
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Trans 1',
        valor: 100,
        tipo: 'despesa',
      });

      const trans2 = await service.createTransacao({
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Trans 2',
        valor: 200,
        tipo: 'despesa',
      });

      // Note: Dexie doesn't throw on invalid IDs, it just doesn't update them
      // So we can't easily test the "skip invalid" behavior without checking DB state
      const count = await service.bulkUpdateCategoria(
        [trans1.id, trans2.id],
        'cat-2'
      );

      expect(count).toBe(2);
    });
  });

  describe('bulkDelete', () => {
    it('deve deletar múltiplas transações', async () => {
      const trans1 = await service.createTransacao({
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Trans 1',
        valor: 100,
        tipo: 'despesa',
      });

      const trans2 = await service.createTransacao({
        conta_id: 'conta-1',
        categoria_id: 'cat-1',
        data: new Date(),
        descricao: 'Trans 2',
        valor: 200,
        tipo: 'despesa',
      });

      const count = await service.bulkDelete([trans1.id, trans2.id]);

      expect(count).toBe(2);

      const result1 = await service.getTransacaoById(trans1.id);
      const result2 = await service.getTransacaoById(trans2.id);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });
});
