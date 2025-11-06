/**
 * Testes Unitários - RegraClassificacaoService
 * Agent CORE: Implementador
 *
 * Testa funcionalidade de regras automáticas de classificação
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { regraClassificacaoService } from './regra-classificacao.service';
import { getDB } from '../db/client';
import { ValidationError, NotFoundError } from '../errors';
import type { RegraClassificacao, Transacao, Categoria } from '../types';

describe('RegraClassificacaoService', () => {
  let categoriaId: string;

  beforeEach(async () => {
    // Limpar database antes de cada teste
    const db = getDB();
    await db.regras_classificacao.clear();
    await db.categorias.clear();
    await db.transacoes.clear();

    // Criar categoria de teste
    const categoria: Categoria = {
      id: crypto.randomUUID(),
      nome: 'Alimentação',
      tipo: 'despesa',
      icone: '🍔',
      cor: '#FF6B6B',
      ordem: 1,
      ativa: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await db.categorias.add(categoria);
    categoriaId = categoria.id;
  });

  describe('createRegra', () => {
    it('deve criar regra com regex válido', async () => {
      const novaRegra = {
        categoria_id: categoriaId,
        nome: 'Regra Regex Válida',
        tipo_regra: 'regex' as const,
        padrao: '^PAG\\*.*IFOOD',
        prioridade: 1,
        ativa: true,
      };

      const result = await regraClassificacaoService.createRegra(novaRegra);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.nome).toBe('Regra Regex Válida');
      expect(result.tipo_regra).toBe('regex');
      expect(result.padrao).toBe('^PAG\\*.*IFOOD');
      expect(result.prioridade).toBe(1);
      expect(result.ativa).toBe(true);
      expect(result.total_aplicacoes).toBe(0);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('deve criar regra com tipo contains', async () => {
      const novaRegra = {
        categoria_id: categoriaId,
        nome: 'Regra Contains',
        tipo_regra: 'contains' as const,
        padrao: 'ifood',
        ativa: true,
      };

      const result = await regraClassificacaoService.createRegra(novaRegra);

      expect(result.tipo_regra).toBe('contains');
      expect(result.padrao).toBe('ifood');
      expect(result.prioridade).toBe(1); // Auto-incrementa
    });

    it('deve lançar ValidationError para regex inválido', async () => {
      const novaRegra = {
        categoria_id: categoriaId,
        nome: 'Regra Regex Inválida',
        tipo_regra: 'regex' as const,
        padrao: '[invalid(regex', // Regex mal formado
        ativa: true,
      };

      await expect(
        regraClassificacaoService.createRegra(novaRegra)
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError para padrão vazio', async () => {
      const novaRegra = {
        categoria_id: categoriaId,
        nome: 'Regra Vazia',
        tipo_regra: 'contains' as const,
        padrao: '',
        ativa: true,
      };

      await expect(
        regraClassificacaoService.createRegra(novaRegra)
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError para padrão muito curto', async () => {
      const novaRegra = {
        categoria_id: categoriaId,
        nome: 'Regra Curta',
        tipo_regra: 'contains' as const,
        padrao: 'a', // Apenas 1 caractere
        ativa: true,
      };

      await expect(
        regraClassificacaoService.createRegra(novaRegra)
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError para categoria inexistente', async () => {
      const novaRegra = {
        categoria_id: 'categoria-inexistente',
        nome: 'Regra sem Categoria',
        tipo_regra: 'contains' as const,
        padrao: 'teste',
        ativa: true,
      };

      await expect(
        regraClassificacaoService.createRegra(novaRegra)
      ).rejects.toThrow(ValidationError);
    });

    it('deve auto-incrementar prioridade quando não especificada', async () => {
      const regra1 = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra 1',
        tipo_regra: 'contains' as const,
        padrao: 'teste1',
        ativa: true,
      });

      const regra2 = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra 2',
        tipo_regra: 'contains' as const,
        padrao: 'teste2',
        ativa: true,
      });

      expect(regra2.prioridade).toBeGreaterThan(regra1.prioridade);
    });
  });

  describe('previewRegra', () => {
    beforeEach(async () => {
      const db = getDB();

      // Criar transações de teste
      const transacoes: Transacao[] = [
        {
          id: crypto.randomUUID(),
          conta_id: 'conta-1',
          categoria_id: categoriaId,
          data: new Date('2025-01-01'),
          descricao: 'PAG*IFOOD RESTAURANTE',
          valor: 45.50,
          tipo: 'despesa',
          parcelado: false,
          classificacao_confirmada: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: crypto.randomUUID(),
          conta_id: 'conta-1',
          categoria_id: categoriaId,
          data: new Date('2025-01-02'),
          descricao: 'UBER EATS DELIVERY',
          valor: 30.00,
          tipo: 'despesa',
          parcelado: false,
          classificacao_confirmada: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: crypto.randomUUID(),
          conta_id: 'conta-1',
          categoria_id: categoriaId,
          data: new Date('2025-01-03'),
          descricao: 'MERCADO PAGO COMPRA',
          valor: 120.00,
          tipo: 'despesa',
          parcelado: false,
          classificacao_confirmada: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      for (const t of transacoes) {
        await db.transacoes.add(t);
      }
    });

    it('deve retornar matches corretos para regra contains', async () => {
      const result = await regraClassificacaoService.previewRegra(
        'contains',
        'ifood'
      );

      expect(result.total_matches).toBe(1);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].descricao).toContain('IFOOD');
    });

    it('deve retornar matches corretos para regra starts_with', async () => {
      const result = await regraClassificacaoService.previewRegra(
        'starts_with',
        'pag'
      );

      expect(result.total_matches).toBe(1);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].descricao).toMatch(/^PAG/i);
    });

    it('deve retornar matches corretos para regra ends_with', async () => {
      const result = await regraClassificacaoService.previewRegra(
        'ends_with',
        'compra'
      );

      expect(result.total_matches).toBe(1);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].descricao).toMatch(/COMPRA$/i);
    });

    it('deve retornar matches corretos para regra regex', async () => {
      const result = await regraClassificacaoService.previewRegra(
        'regex',
        '^PAG\\*.*IFOOD'
      );

      expect(result.total_matches).toBe(1);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].descricao).toBe('PAG*IFOOD RESTAURANTE');
    });

    it('deve respeitar limit de resultados', async () => {
      // Adicionar mais transações para testar limit
      const db = getDB();
      for (let i = 0; i < 60; i++) {
        await db.transacoes.add({
          id: crypto.randomUUID(),
          conta_id: 'conta-1',
          categoria_id: categoriaId,
          data: new Date(),
          descricao: `TESTE ${i}`,
          valor: 10,
          tipo: 'despesa',
          parcelado: false,
          classificacao_confirmada: false,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      const result = await regraClassificacaoService.previewRegra(
        'contains',
        'teste',
        20 // limit
      );

      expect(result.matches).toHaveLength(20);
      expect(result.total_matches).toBe(60);
    });

    it('deve lançar ValidationError para padrão inválido', async () => {
      await expect(
        regraClassificacaoService.previewRegra('regex', '[invalid(regex')
      ).rejects.toThrow(ValidationError);
    });

    it('deve retornar array vazio quando nenhuma transação casa', async () => {
      const result = await regraClassificacaoService.previewRegra(
        'contains',
        'string-que-nao-existe'
      );

      expect(result.total_matches).toBe(0);
      expect(result.matches).toHaveLength(0);
    });

    it('deve ser case insensitive', async () => {
      const resultLower = await regraClassificacaoService.previewRegra(
        'contains',
        'ifood'
      );

      const resultUpper = await regraClassificacaoService.previewRegra(
        'contains',
        'IFOOD'
      );

      expect(resultLower.total_matches).toBe(resultUpper.total_matches);
    });
  });

  describe('listRegras', () => {
    beforeEach(async () => {
      // Criar regras de teste
      await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra A',
        tipo_regra: 'contains',
        padrao: 'teste a',
        prioridade: 1,
        ativa: true,
      });

      await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra B',
        tipo_regra: 'starts_with',
        padrao: 'teste b',
        prioridade: 2,
        ativa: false,
      });

      await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra C',
        tipo_regra: 'regex',
        padrao: 'teste.*c',
        prioridade: 3,
        ativa: true,
      });
    });

    it('deve listar todas as regras sem filtros', async () => {
      const result = await regraClassificacaoService.listRegras();

      expect(result).toHaveLength(3);
    });

    it('deve filtrar por regras ativas', async () => {
      const result = await regraClassificacaoService.listRegras({ ativa: true });

      expect(result).toHaveLength(2);
      expect(result.every(r => r.ativa)).toBe(true);
    });

    it('deve filtrar por regras inativas', async () => {
      const result = await regraClassificacaoService.listRegras({ ativa: false });

      expect(result).toHaveLength(1);
      expect(result[0].ativa).toBe(false);
    });

    it('deve filtrar por categoria_id', async () => {
      const result = await regraClassificacaoService.listRegras({
        categoria_id: categoriaId,
      });

      expect(result).toHaveLength(3);
      expect(result.every(r => r.categoria_id === categoriaId)).toBe(true);
    });

    it('deve filtrar por tipo_regra', async () => {
      const result = await regraClassificacaoService.listRegras({
        tipo_regra: 'regex',
      });

      expect(result).toHaveLength(1);
      expect(result[0].tipo_regra).toBe('regex');
    });

    it('deve ordenar por prioridade descendente', async () => {
      const result = await regraClassificacaoService.listRegras({
        sortBy: 'prioridade',
        sortOrder: 'desc',
      });

      expect(result[0].prioridade).toBe(3);
      expect(result[1].prioridade).toBe(2);
      expect(result[2].prioridade).toBe(1);
    });

    it('deve ordenar por nome ascendente', async () => {
      const result = await regraClassificacaoService.listRegras({
        sortBy: 'nome',
        sortOrder: 'asc',
      });

      expect(result[0].nome).toBe('Regra A');
      expect(result[1].nome).toBe('Regra B');
      expect(result[2].nome).toBe('Regra C');
    });
  });

  describe('updateRegra', () => {
    it('deve atualizar regra existente', async () => {
      const regra = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra Original',
        tipo_regra: 'contains',
        padrao: 'original',
        ativa: true,
      });

      const result = await regraClassificacaoService.updateRegra(regra.id, {
        nome: 'Regra Atualizada',
        padrao: 'atualizado',
        prioridade: 10,
      });

      expect(result.nome).toBe('Regra Atualizada');
      expect(result.padrao).toBe('atualizado');
      expect(result.prioridade).toBe(10);
      expect(result.updated_at.getTime()).toBeGreaterThan(regra.updated_at.getTime());
    });

    it('deve validar novo padrão ao atualizar', async () => {
      const regra = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra',
        tipo_regra: 'regex',
        padrao: '^valido',
        ativa: true,
      });

      await expect(
        regraClassificacaoService.updateRegra(regra.id, {
          padrao: '[invalid(regex',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar NotFoundError para regra inexistente', async () => {
      await expect(
        regraClassificacaoService.updateRegra('id-inexistente', {
          nome: 'Novo Nome',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('toggleRegra', () => {
    it('deve desativar regra ativa', async () => {
      const regra = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra Ativa',
        tipo_regra: 'contains',
        padrao: 'teste',
        ativa: true,
      });

      const result = await regraClassificacaoService.toggleRegra(regra.id);

      expect(result.ativa).toBe(false);
    });

    it('deve ativar regra inativa', async () => {
      const regra = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra Inativa',
        tipo_regra: 'contains',
        padrao: 'teste',
        ativa: false,
      });

      const result = await regraClassificacaoService.toggleRegra(regra.id);

      expect(result.ativa).toBe(true);
    });
  });

  describe('deleteRegra', () => {
    it('deve deletar regra existente', async () => {
      const regra = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra para Deletar',
        tipo_regra: 'contains',
        padrao: 'teste',
        ativa: true,
      });

      await regraClassificacaoService.deleteRegra(regra.id);

      await expect(
        regraClassificacaoService.getRegraById(regra.id)
      ).rejects.toThrow(NotFoundError);
    });

    it('deve lançar NotFoundError para regra inexistente', async () => {
      await expect(
        regraClassificacaoService.deleteRegra('id-inexistente')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('aplicarRegras', () => {
    beforeEach(async () => {
      // Criar regras com diferentes prioridades
      await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra Baixa Prioridade',
        tipo_regra: 'contains',
        padrao: 'ifood',
        prioridade: 1,
        ativa: true,
      });

      await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra Alta Prioridade',
        tipo_regra: 'starts_with',
        padrao: 'pag',
        prioridade: 10,
        ativa: true,
      });
    });

    it('deve retornar categoria_id da primeira regra que casa', async () => {
      const result = await regraClassificacaoService.aplicarRegras(
        'PAG*IFOOD RESTAURANTE'
      );

      expect(result).toBe(categoriaId);
    });

    it('deve respeitar prioridade das regras', async () => {
      // Ambas as regras casam com 'PAG*IFOOD', mas a de maior prioridade deve vencer
      const regras = await regraClassificacaoService.listRegras({
        ativa: true,
        sortBy: 'prioridade',
        sortOrder: 'desc',
      });

      expect(regras[0].prioridade).toBe(10);
      expect(regras[0].tipo_regra).toBe('starts_with');
    });

    it('deve retornar null quando nenhuma regra casa', async () => {
      const result = await regraClassificacaoService.aplicarRegras(
        'DESCRICAO QUE NAO CASA'
      );

      expect(result).toBeNull();
    });

    it('deve ignorar regras inativas', async () => {
      await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra Inativa',
        tipo_regra: 'contains',
        padrao: 'especifico',
        prioridade: 100,
        ativa: false,
      });

      const result = await regraClassificacaoService.aplicarRegras(
        'TEXTO ESPECIFICO'
      );

      expect(result).toBeNull();
    });
  });

  describe('getRegrasStats', () => {
    it('deve retornar estatísticas corretas', async () => {
      await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra 1',
        tipo_regra: 'contains',
        padrao: 'teste1',
        ativa: true,
      });

      await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra 2',
        tipo_regra: 'contains',
        padrao: 'teste2',
        ativa: false,
      });

      const stats = await regraClassificacaoService.getRegrasStats();

      expect(stats.total).toBe(2);
      expect(stats.ativas).toBe(1);
      expect(stats.inativas).toBe(1);
      expect(stats.total_aplicacoes).toBe(0);
    });

    it('deve retornar regra mais usada', async () => {
      const regra1 = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra 1',
        tipo_regra: 'contains',
        padrao: 'teste1',
        ativa: true,
      });

      const regra2 = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra 2',
        tipo_regra: 'contains',
        padrao: 'teste2',
        ativa: true,
      });

      // Simular aplicações
      const db = getDB();
      await db.regras_classificacao.update(regra1.id, { total_aplicacoes: 10 });
      await db.regras_classificacao.update(regra2.id, { total_aplicacoes: 5 });

      const stats = await regraClassificacaoService.getRegrasStats();

      expect(stats.mais_usada?.id).toBe(regra1.id);
      expect(stats.total_aplicacoes).toBe(15);
    });
  });

  describe('updatePrioridades', () => {
    it('deve atualizar prioridades de múltiplas regras', async () => {
      const regra1 = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra 1',
        tipo_regra: 'contains',
        padrao: 'teste1',
        prioridade: 1,
        ativa: true,
      });

      const regra2 = await regraClassificacaoService.createRegra({
        categoria_id: categoriaId,
        nome: 'Regra 2',
        tipo_regra: 'contains',
        padrao: 'teste2',
        prioridade: 2,
        ativa: true,
      });

      await regraClassificacaoService.updatePrioridades([
        { id: regra1.id, prioridade: 10 },
        { id: regra2.id, prioridade: 20 },
      ]);

      const updated1 = await regraClassificacaoService.getRegraById(regra1.id);
      const updated2 = await regraClassificacaoService.getRegraById(regra2.id);

      expect(updated1.prioridade).toBe(10);
      expect(updated2.prioridade).toBe(20);
    });
  });
});
