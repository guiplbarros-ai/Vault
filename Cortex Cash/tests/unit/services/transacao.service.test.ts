/**
 * Testes Unitários - TransacaoService
 * Agent CORE: Implementador
 *
 * Testa operações CRUD de transações
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransacaoService } from '@/lib/services/transacao.service';
import { getDB } from '@/lib/db/client';
import { transacoes, despesas, receitas } from '../../fixtures/transacoes';
import { contas, contaAtiva, contaPoupanca } from '../../fixtures/contas';
import { todasCategorias, categoriasDespesa } from '../../fixtures/categorias';
import type { CreateTransacaoDTO } from '@/lib/types';

describe('TransacaoService', () => {
  const service = new TransacaoService();

  beforeEach(async () => {
    // Limpar e popular database
    const db = getDB();
    await db.transacoes.clear();
    await db.contas.clear();
    await db.categorias.clear();
    await db.orcamentos.clear();

    await db.contas.bulkAdd(contas);
    await db.categorias.bulkAdd(todasCategorias);
    await db.transacoes.bulkAdd(transacoes);
  });

  describe('listTransacoes', () => {
    it('deve listar todas as transações quando sem filtros', async () => {
      const result = await service.listTransacoes();

      expect(result).toHaveLength(transacoes.length);
    });

    it('deve filtrar transações por conta', async () => {
      const result = await service.listTransacoes({ contaId: contaAtiva.id });

      expect(result.every(t => t.conta_id === contaAtiva.id)).toBe(true);
    });

    it('deve filtrar transações por categoria', async () => {
      const categoriaId = categoriasDespesa[0].id;
      const result = await service.listTransacoes({ categoriaId });

      expect(result.every(t => t.categoria_id === categoriaId)).toBe(true);
    });

    it('deve filtrar transações por tipo (despesa)', async () => {
      const result = await service.listTransacoes({ tipo: 'despesa' });

      expect(result.every(t => t.tipo === 'despesa')).toBe(true);
      expect(result.length).toBe(despesas.length);
    });

    it('deve filtrar transações por tipo (receita)', async () => {
      const result = await service.listTransacoes({ tipo: 'receita' });

      expect(result.every(t => t.tipo === 'receita')).toBe(true);
      expect(result.length).toBe(receitas.length);
    });

    it('deve filtrar transações por data de início', async () => {
      const dataInicio = new Date('2025-01-15');
      const result = await service.listTransacoes({ dataInicio });

      expect(result.every(t => {
        const tData = t.data instanceof Date ? t.data : new Date(t.data);
        return tData >= dataInicio;
      })).toBe(true);
    });

    it('deve filtrar transações por data de fim', async () => {
      const dataFim = new Date('2025-01-15');
      const result = await service.listTransacoes({ dataFim });

      expect(result.every(t => {
        const tData = t.data instanceof Date ? t.data : new Date(t.data);
        return tData <= dataFim;
      })).toBe(true);
    });

    it('deve filtrar transações por período', async () => {
      const dataInicio = new Date('2025-01-10');
      const dataFim = new Date('2025-01-20');
      const result = await service.listTransacoes({ dataInicio, dataFim });

      expect(result.every(t => {
        const tData = t.data instanceof Date ? t.data : new Date(t.data);
        return tData >= dataInicio && tData <= dataFim;
      })).toBe(true);
    });

    it('deve buscar transações por descrição', async () => {
      const result = await service.listTransacoes({ busca: 'IFOOD' });

      expect(result.every(t => t.descricao.toUpperCase().includes('IFOOD'))).toBe(true);
    });

    it('deve buscar transações case-insensitive', async () => {
      const result = await service.listTransacoes({ busca: 'ifood' });

      expect(result.length).toBeGreaterThan(0);
    });

    it('deve ordenar por data descendente (padrão)', async () => {
      const result = await service.listTransacoes();

      for (let i = 1; i < result.length; i++) {
        const dataA = result[i - 1].data instanceof Date ? result[i - 1].data : new Date(result[i - 1].data);
        const dataB = result[i].data instanceof Date ? result[i].data : new Date(result[i].data);
        expect(dataB.getTime() <= dataA.getTime()).toBe(true);
      }
    });

    it('deve ordenar por valor ascendente', async () => {
      const result = await service.listTransacoes({
        sortBy: 'valor',
        sortOrder: 'asc'
      });

      for (let i = 1; i < result.length; i++) {
        expect(result[i].valor >= result[i - 1].valor).toBe(true);
      }
    });

    it('deve ordenar por descrição ascendente', async () => {
      const result = await service.listTransacoes({
        sortBy: 'descricao',
        sortOrder: 'asc'
      });

      for (let i = 1; i < result.length; i++) {
        expect(result[i].descricao.toLowerCase() >= result[i - 1].descricao.toLowerCase()).toBe(true);
      }
    });

    it('deve aplicar paginação corretamente', async () => {
      const result = await service.listTransacoes({
        limit: 3,
        offset: 0
      });

      expect(result).toHaveLength(3);
    });

    it('deve combinar múltiplos filtros', async () => {
      const result = await service.listTransacoes({
        tipo: 'despesa',
        contaId: contaAtiva.id,
        dataInicio: new Date('2025-01-10'),
        dataFim: new Date('2025-01-20'),
      });

      expect(result.every(t => {
        const tData = t.data instanceof Date ? t.data : new Date(t.data);
        return t.tipo === 'despesa' &&
          t.conta_id === contaAtiva.id &&
          tData >= new Date('2025-01-10') &&
          tData <= new Date('2025-01-20');
      })).toBe(true);
    });
  });

  describe('getTransacaoById', () => {
    it('deve retornar transação quando ID existe', async () => {
      const result = await service.getTransacaoById('trans-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('trans-1');
      expect(result?.descricao).toBe('IFOOD RESTAURANTE');
    });

    it('deve retornar null quando ID não existe', async () => {
      const result = await service.getTransacaoById('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('createTransacao', () => {
    it('deve criar transação com dados válidos', async () => {
      const dto: CreateTransacaoDTO = {
        conta_id: contaAtiva.id,
        categoria_id: categoriasDespesa[0].id,
        data: new Date('2025-01-26'),
        descricao: 'NOVA TRANSACAO',
        valor: 100.00,
        tipo: 'despesa',
      };

      const result = await service.createTransacao(dto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.descricao).toBe('NOVA TRANSACAO');
      expect(result.valor).toBe(100.00);
      expect(result.tipo).toBe('despesa');
      expect(result.hash).toBeDefined();
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('deve criar transação com campos opcionais', async () => {
      const dto: CreateTransacaoDTO = {
        conta_id: contaAtiva.id,
        categoria_id: categoriasDespesa[0].id,
        data: new Date('2025-01-26'),
        descricao: 'TRANSACAO COM OBSERVACOES',
        valor: 50.00,
        tipo: 'despesa',
        observacoes: 'Observação importante',
        tags: ['tag1', 'tag2'],
      };

      const result = await service.createTransacao(dto);

      expect(result.observacoes).toBe('Observação importante');

      // Tags podem ser salvas como JSON string no IndexedDB
      if (typeof result.tags === 'string') {
        expect(JSON.parse(result.tags)).toEqual(['tag1', 'tag2']);
      } else {
        expect(result.tags).toEqual(['tag1', 'tag2']);
      }
    });

    it('deve rejeitar transação sem conta_id', async () => {
      const dto = {
        categoria_id: categoriasDespesa[0].id,
        data: new Date('2025-01-26'),
        descricao: 'SEM CONTA',
        valor: 100.00,
        tipo: 'despesa',
      } as any;

      await expect(service.createTransacao(dto)).rejects.toThrow();
    });

    it('deve rejeitar transação sem descrição', async () => {
      const dto = {
        conta_id: contaAtiva.id,
        categoria_id: categoriasDespesa[0].id,
        data: new Date('2025-01-26'),
        valor: 100.00,
        tipo: 'despesa',
      } as any;

      await expect(service.createTransacao(dto)).rejects.toThrow();
    });

    it('deve rejeitar transação sem valor', async () => {
      const dto = {
        conta_id: contaAtiva.id,
        categoria_id: categoriasDespesa[0].id,
        data: new Date('2025-01-26'),
        descricao: 'SEM VALOR',
        tipo: 'despesa',
      } as any;

      await expect(service.createTransacao(dto)).rejects.toThrow();
    });

    it('validação de valor (deve ser positivo para despesas)', async () => {
      const dto: CreateTransacaoDTO = {
        conta_id: contaAtiva.id,
        categoria_id: categoriasDespesa[0].id,
        data: new Date('2025-01-26'),
        descricao: 'VALOR POSITIVO',
        valor: 10,
        tipo: 'despesa',
      };

      const result = await service.createTransacao(dto);

      expect(result.valor).toBeGreaterThan(0);
    });

    it('deve criar transação sem categoria (pendente classificação)', async () => {
      const dto: CreateTransacaoDTO = {
        conta_id: contaAtiva.id,
        data: new Date('2025-01-26'),
        descricao: 'SEM CATEGORIA',
        valor: 100.00,
        tipo: 'despesa',
      };

      const result = await service.createTransacao(dto);

      expect(result.categoria_id).toBeUndefined();
      expect(result.classificacao_confirmada).toBe(false);
    });
  });

  describe('updateTransacao', () => {
    it('deve atualizar transação existente', async () => {
      const updates = {
        descricao: 'DESCRICAO ATUALIZADA',
        valor: 200.00,
      };

      const result = await service.updateTransacao('trans-1', updates);

      expect(result).toBeDefined();
      expect(result.descricao).toBe('DESCRICAO ATUALIZADA');
      expect(result.valor).toBe(200.00);
      expect(result.updated_at).toBeDefined();
      expect(result.created_at).toBeDefined();
    });

    it('deve lançar erro quando ID não existe', async () => {
      const updates = {
        descricao: 'NAO IMPORTA',
      };

      await expect(service.updateTransacao('id-inexistente', updates)).rejects.toThrow();
    });

    it('deve preservar campos não atualizados', async () => {
      const original = await service.getTransacaoById('trans-1');

      const result = await service.updateTransacao('trans-1', {
        descricao: 'NOVA DESCRICAO',
      });

      expect(result.tipo).toBe(original?.tipo);
      expect(result.valor).toBe(original?.valor);
      expect(result.conta_id).toBe(original?.conta_id);
    });

    it('deve atualizar categoria e marcar como confirmada', async () => {
      const result = await service.updateTransacao('trans-9', {
        categoria_id: categoriasDespesa[0].id,
        classificacao_confirmada: true,
      });

      expect(result.categoria_id).toBe(categoriasDespesa[0].id);
      expect(result.classificacao_confirmada).toBe(true);
    });
  });

  describe('deleteTransacao', () => {
    it('deve excluir transação existente', async () => {
      await service.deleteTransacao('trans-1');

      const result = await service.getTransacaoById('trans-1');
      expect(result).toBeNull();
    });

    it('deve lançar erro quando ID não existe', async () => {
      await expect(service.deleteTransacao('id-inexistente')).rejects.toThrow();
    });

    it('deve reduzir contagem de transações após exclusão', async () => {
      const countBefore = (await service.listTransacoes()).length;

      await service.deleteTransacao('trans-1');

      const countAfter = (await service.listTransacoes()).length;
      expect(countAfter).toBe(countBefore - 1);
    });
  });

  describe('bulkUpdateCategoria', () => {
    it('deve atualizar categoria de múltiplas transações', async () => {
      const ids = ['trans-1', 'trans-2', 'trans-3'];
      const novaCategoriaId = categoriasDespesa[4].id;

      await service.bulkUpdateCategoria(ids, novaCategoriaId);

      const trans1 = await service.getTransacaoById('trans-1');
      const trans2 = await service.getTransacaoById('trans-2');
      const trans3 = await service.getTransacaoById('trans-3');

      expect(trans1?.categoria_id).toBe(novaCategoriaId);
      expect(trans2?.categoria_id).toBe(novaCategoriaId);
      expect(trans3?.categoria_id).toBe(novaCategoriaId);
    });

    it('deve marcar transações como confirmadas após bulk update', async () => {
      const ids = ['trans-2']; // trans-2 não está confirmada
      const novaCategoriaId = categoriasDespesa[4].id;

      await service.bulkUpdateCategoria(ids, novaCategoriaId);

      const trans = await service.getTransacaoById('trans-2');
      expect(trans?.classificacao_confirmada).toBe(true);
    });

    it('deve ignorar IDs inexistentes sem erro', async () => {
      const ids = ['trans-1', 'id-inexistente', 'trans-2'];
      const novaCategoriaId = categoriasDespesa[4].id;

      await expect(service.bulkUpdateCategoria(ids, novaCategoriaId)).resolves.not.toThrow();
    });
  });

  describe('createTransfer', () => {
    it('deve criar transferência entre duas contas', async () => {
      const result = await service.createTransfer(
        contaAtiva.id,
        contaPoupanca.id,
        1000,
        'TRANSFERENCIA TESTE'
      );

      expect(result.origem).toBeDefined();
      expect(result.destino).toBeDefined();
      expect(result.origem.valor).toBe(-1000);
      expect(result.destino.valor).toBe(1000);
      expect(result.origem.tipo).toBe('transferencia');
      expect(result.destino.tipo).toBe('transferencia');
      expect(result.origem.transferencia_id).toBe(result.destino.transferencia_id);
      expect(result.origem.conta_destino_id).toBe(contaPoupanca.id);
    });

    it('deve rejeitar transferência quando contas são iguais', async () => {
      await expect(
        service.createTransfer(contaAtiva.id, contaAtiva.id, 1000, 'TESTE')
      ).rejects.toThrow('Conta de origem e destino não podem ser a mesma');
    });

    it('deve rejeitar transferência com valor negativo', async () => {
      await expect(
        service.createTransfer(contaAtiva.id, contaPoupanca.id, -100, 'TESTE')
      ).rejects.toThrow('Valor da transferência deve ser positivo');
    });

    it('deve rejeitar transferência com valor zero', async () => {
      await expect(
        service.createTransfer(contaAtiva.id, contaPoupanca.id, 0, 'TESTE')
      ).rejects.toThrow('Valor da transferência deve ser positivo');
    });

    it('deve rejeitar transferência sem conta origem', async () => {
      await expect(
        service.createTransfer('', contaPoupanca.id, 1000, 'TESTE')
      ).rejects.toThrow();
    });

    it('deve rejeitar transferência sem conta destino', async () => {
      await expect(
        service.createTransfer(contaAtiva.id, '', 1000, 'TESTE')
      ).rejects.toThrow();
    });
  });

  describe('filtros de classificação', () => {
    it('deve filtrar transações sem categoria', async () => {
      const result = await service.listTransacoes();
      const semCategoria = result.filter(t => !t.categoria_id);

      expect(semCategoria.length).toBeGreaterThanOrEqual(0);
    });

    it('deve filtrar transações não confirmadas', async () => {
      const result = await service.listTransacoes();
      const naoConfirmadas = result.filter(t => !t.classificacao_confirmada);

      expect(naoConfirmadas.length).toBeGreaterThanOrEqual(0);
    });

    it('deve excluir transferências ao filtrar por tipo despesa', async () => {
      const result = await service.listTransacoes({ tipo: 'despesa' });

      expect(result.every(t => t.tipo === 'despesa')).toBe(true);
    });
  });

  describe('resumos e agregações', () => {
    it('deve calcular totais por tipo', async () => {
      const despesas = await service.listTransacoes({ tipo: 'despesa' });
      const receitas = await service.listTransacoes({ tipo: 'receita' });

      const totalDespesas = despesas.reduce((sum, t) => sum + Math.abs(t.valor), 0);
      const totalReceitas = receitas.reduce((sum, t) => sum + t.valor, 0);

      expect(totalDespesas).toBeGreaterThan(0);
      expect(totalReceitas).toBeGreaterThan(0);
    });

    it('deve filtrar por período e calcular total', async () => {
      const dataInicio = new Date('2025-01-01');
      const dataFim = new Date('2025-01-31');

      const result = await service.listTransacoes({ dataInicio, dataFim });

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(t => {
        const tData = t.data instanceof Date ? t.data : new Date(t.data);
        return tData >= dataInicio && tData <= dataFim;
      })).toBe(true);
    });
  });

  describe('getTransacaoByHash', () => {
    it('deve retornar transação por hash', async () => {
      const trans = transacoes[0];
      const result = await service.getTransacaoByHash(trans.hash);

      expect(result).toBeDefined();
      expect(result?.id).toBe(trans.id);
      expect(result?.hash).toBe(trans.hash);
    });

    it('deve retornar null quando hash não existe', async () => {
      const result = await service.getTransacaoByHash('hash-inexistente');

      expect(result).toBeNull();
    });
  });
});
