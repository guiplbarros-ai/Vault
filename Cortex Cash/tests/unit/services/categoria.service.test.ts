/**
 * Testes Unitários - CategoriaService
 * Agent CORE: Implementador
 *
 * Testa operações CRUD de categorias
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CategoriaService } from '@/lib/services/categoria.service';
import { getDB } from '@/lib/db/client';
import { todasCategorias, categoriasDespesa, categoriasReceita } from '../../fixtures/categorias';
import type { CreateCategoriaDTO } from '@/lib/types';

describe('CategoriaService', () => {
  const service = new CategoriaService();

  beforeEach(async () => {
    // Limpar e popular database
    const db = getDB();
    await db.categorias.clear();
    await db.categorias.bulkAdd(todasCategorias);
  });

  describe('listCategorias', () => {
    it('deve listar todas as categorias quando sem filtros', async () => {
      const result = await service.listCategorias();

      expect(result).toHaveLength(todasCategorias.length);
    });

    it('deve filtrar categorias por tipo (despesa)', async () => {
      const result = await service.listCategorias({ tipo: 'despesa' });

      expect(result).toHaveLength(categoriasDespesa.length);
      expect(result.every(c => c.tipo === 'despesa')).toBe(true);
    });

    it('deve filtrar categorias por tipo (receita)', async () => {
      const result = await service.listCategorias({ tipo: 'receita' });

      expect(result).toHaveLength(categoriasReceita.length);
      expect(result.every(c => c.tipo === 'receita')).toBe(true);
    });

    it('deve filtrar apenas categorias ativas', async () => {
      const result = await service.listCategorias({ ativas: true });

      expect(result.every(c => c.ativa === true)).toBe(true);
      expect(result.some(c => c.id === 'cat-inativa')).toBe(false);
    });

    it('deve incluir categorias inativas quando ativas=false', async () => {
      const result = await service.listCategorias({ ativas: false });

      expect(result.every(c => c.ativa === false)).toBe(true);
      expect(result.some(c => c.id === 'cat-inativa')).toBe(true);
    });

    it('deve ordenar por nome ascendente', async () => {
      const result = await service.listCategorias({
        sortBy: 'nome',
        sortOrder: 'asc'
      });

      for (let i = 1; i < result.length; i++) {
        expect(result[i].nome.toLowerCase() >= result[i - 1].nome.toLowerCase()).toBe(true);
      }
    });

    it('deve ordenar por nome descendente', async () => {
      const result = await service.listCategorias({
        sortBy: 'nome',
        sortOrder: 'desc'
      });

      for (let i = 1; i < result.length; i++) {
        expect(result[i].nome.toLowerCase() <= result[i - 1].nome.toLowerCase()).toBe(true);
      }
    });

    it('deve ordenar por ordem (padrão)', async () => {
      const result = await service.listCategorias({
        sortBy: 'ordem',
        sortOrder: 'asc'
      });

      for (let i = 1; i < result.length; i++) {
        const ordemA = result[i - 1].ordem || 0;
        const ordemB = result[i].ordem || 0;
        expect(ordemB >= ordemA).toBe(true);
      }
    });

    it('deve aplicar paginação corretamente', async () => {
      const result = await service.listCategorias({
        limit: 3,
        offset: 0
      });

      expect(result).toHaveLength(3);
    });

    it('deve aplicar offset corretamente', async () => {
      const allCategories = await service.listCategorias();
      const result = await service.listCategorias({
        limit: 2,
        offset: 2
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(allCategories[2].id);
    });

    it('deve combinar filtros e ordenação', async () => {
      const result = await service.listCategorias({
        tipo: 'despesa',
        ativas: true,
        sortBy: 'nome',
        sortOrder: 'asc'
      });

      expect(result.every(c => c.tipo === 'despesa' && c.ativa === true)).toBe(true);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].nome.toLowerCase() >= result[i - 1].nome.toLowerCase()).toBe(true);
      }
    });
  });

  describe('getCategoriaById', () => {
    it('deve retornar categoria quando ID existe', async () => {
      const result = await service.getCategoriaById('cat-alimentacao');

      expect(result).toBeDefined();
      expect(result?.id).toBe('cat-alimentacao');
      expect(result?.nome).toBe('Alimentação');
    });

    it('deve retornar null quando ID não existe', async () => {
      const result = await service.getCategoriaById('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('createCategoria', () => {
    it('deve criar categoria com dados válidos', async () => {
      const dto: CreateCategoriaDTO = {
        nome: 'Nova Categoria',
        tipo: 'despesa',
        icone: '🆕',
        cor: '#FF0000',
      };

      const result = await service.createCategoria(dto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.nome).toBe('Nova Categoria');
      expect(result.tipo).toBe('despesa');
      expect(result.ativa).toBe(true);
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('deve criar categoria com ordem padrão', async () => {
      const dto: CreateCategoriaDTO = {
        nome: 'Categoria Ordem Auto',
        tipo: 'despesa',
        icone: '🔢',
        cor: '#00FF00',
      };

      const result = await service.createCategoria(dto);

      // Ordem padrão é definida no service
      expect(result.ordem).toBeDefined();
      expect(typeof result.ordem).toBe('number');
    });

    it('deve lançar erro quando falta campo obrigatório (nome)', async () => {
      const dto = {
        tipo: 'despesa',
        icone: '❌',
        cor: '#FF0000',
      } as any;

      await expect(service.createCategoria(dto)).rejects.toThrow();
    });

    it('deve lançar erro quando tipo é inválido', async () => {
      const dto = {
        nome: 'Categoria Inválida',
        tipo: 'tipo-invalido',
        icone: '❌',
        cor: '#FF0000',
      } as any;

      await expect(service.createCategoria(dto)).rejects.toThrow();
    });
  });

  describe('updateCategoria', () => {
    it('deve atualizar categoria existente', async () => {
      const updates = {
        nome: 'Alimentação Atualizada',
        icone: '🍕',
      };

      const result = await service.updateCategoria('cat-alimentacao', updates);

      expect(result).toBeDefined();
      expect(result.nome).toBe('Alimentação Atualizada');
      expect(result.icone).toBe('🍕');
      expect(result.updated_at).toBeDefined();
      expect(result.created_at).toBeDefined();
    });

    it('deve lançar erro quando ID não existe', async () => {
      const updates = {
        nome: 'Não Importa',
      };

      await expect(service.updateCategoria('id-inexistente', updates)).rejects.toThrow();
    });

    it('deve preservar campos não atualizados', async () => {
      const original = await service.getCategoriaById('cat-alimentacao');

      const result = await service.updateCategoria('cat-alimentacao', {
        nome: 'Nome Atualizado',
      });

      expect(result.tipo).toBe(original?.tipo);
      expect(result.icone).toBe(original?.icone);
      expect(result.cor).toBe(original?.cor);
    });
  });

  describe('deleteCategoria (soft delete)', () => {
    it('deve desativar categoria (soft delete)', async () => {
      await service.deleteCategoria('cat-alimentacao');

      const result = await service.getCategoriaById('cat-alimentacao');

      expect(result).toBeDefined();
      expect(result?.ativa).toBe(false);
    });

    it('não deve lançar erro quando ID não existe (soft delete seguro)', async () => {
      // deleteCategoria faz soft delete, pode não lançar erro se ID não existe
      await service.deleteCategoria('id-inexistente');
      // Se não lançou erro, está ok
      expect(true).toBe(true);
    });

    it('categoria desativada não aparece em lista de ativas', async () => {
      await service.deleteCategoria('cat-alimentacao');

      const ativas = await service.listCategorias({ ativas: true });

      expect(ativas.some(c => c.id === 'cat-alimentacao')).toBe(false);
    });

    it('categoria desativada ainda aparece em lista completa', async () => {
      await service.deleteCategoria('cat-alimentacao');

      const todas = await service.listCategorias();

      expect(todas.some(c => c.id === 'cat-alimentacao')).toBe(true);
    });
  });

  describe('alternar status ativa (via update)', () => {
    it('deve desativar categoria via update', async () => {
      const result = await service.updateCategoria('cat-alimentacao', { ativa: false });

      expect(result.ativa).toBe(false);
    });

    it('deve ativar categoria via update', async () => {
      const result = await service.updateCategoria('cat-inativa', { ativa: true });

      expect(result.ativa).toBe(true);
    });
  });
});
