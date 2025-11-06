/**
 * Testes Unitários - CategoriaService
 * Agent CORE: Implementador
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CategoriaService } from './categoria.service';
import { getDB } from '../db/client';
import { NotFoundError, ValidationError } from '../errors';
import type { CreateCategoriaDTO } from '../types';

describe('CategoriaService', () => {
  let service: CategoriaService;

  beforeEach(async () => {
    service = new CategoriaService();

    // Limpar database antes de cada teste
    const db = getDB();
    await db.categorias.clear();
  });

  describe('createCategoria', () => {
    it('deve criar uma nova categoria com sucesso', async () => {
      const novaCategoria: CreateCategoriaDTO = {
        nome: 'Alimentação',
        tipo: 'despesa',
        icone: '🍔',
        cor: '#FF5733',
        ordem: 1,
      };

      const result = await service.createCategoria(novaCategoria);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.nome).toBe('Alimentação');
      expect(result.tipo).toBe('despesa');
      expect(result.icone).toBe('🍔');
      expect(result.cor).toBe('#FF5733');
      expect(result.ordem).toBe(1);
      expect(result.ativa).toBe(true);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('deve criar categoria com grupo', async () => {
      const novaCategoria: CreateCategoriaDTO = {
        nome: 'Restaurantes',
        tipo: 'despesa',
        grupo: 'Alimentação',
        icone: '🍽️',
        cor: '#FF5733',
        ordem: 2,
      };

      const result = await service.createCategoria(novaCategoria);

      expect(result.grupo).toBe('Alimentação');
    });

    it('deve validar campos obrigatórios', async () => {
      const categoriInvalida = {
        // nome faltando
        tipo: 'despesa',
        icone: '🍔',
        cor: '#FF5733',
      } as CreateCategoriaDTO;

      await expect(
        service.createCategoria(categoriInvalida)
      ).rejects.toThrow(ValidationError);
    });

    it('deve validar tipo de categoria', async () => {
      const categoriInvalida = {
        nome: 'Teste',
        tipo: 'invalido',
        icone: '🍔',
        cor: '#FF5733',
      } as unknown as CreateCategoriaDTO;

      await expect(
        service.createCategoria(categoriInvalida)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('listCategorias', () => {
    beforeEach(async () => {
      await service.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        icone: '🍔',
        cor: '#FF5733',
        ordem: 1,
      });
      await service.createCategoria({
        nome: 'Salário',
        tipo: 'receita',
        icone: '💰',
        cor: '#33FF57',
        ordem: 2,
      });
      await service.createCategoria({
        nome: 'Transporte',
        tipo: 'despesa',
        icone: '🚗',
        cor: '#3357FF',
        ordem: 3,
      });
      // Criar categoria inativa
      const catInativa = await service.createCategoria({
        nome: 'Categoria Inativa',
        tipo: 'despesa',
        icone: '❌',
        cor: '#999999',
        ordem: 4,
      });
      await service.deleteCategoria(catInativa.id);
    });

    it('deve listar todas as categorias ativas por padrão', async () => {
      const result = await service.listCategorias();

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('deve filtrar por tipo', async () => {
      const result = await service.listCategorias({ tipo: 'despesa' });

      expect(result.every(c => c.tipo === 'despesa')).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('deve filtrar incluindo inativas', async () => {
      const result = await service.listCategorias({ ativas: false });

      expect(result.some(c => !c.ativa)).toBe(true);
    });

    it('deve ordenar por nome ascendente', async () => {
      const result = await service.listCategorias({
        sortBy: 'nome',
        sortOrder: 'asc',
        ativas: true
      });

      for (let i = 1; i < result.length; i++) {
        expect(result[i].nome.toLowerCase() >= result[i-1].nome.toLowerCase()).toBe(true);
      }
    });

    it('deve ordenar por ordem', async () => {
      const result = await service.listCategorias({ sortBy: 'ordem', sortOrder: 'asc' });

      expect(result[0].ordem).toBeLessThanOrEqual(result[1].ordem || 0);
    });

    it('deve aplicar paginação', async () => {
      const result = await service.listCategorias({ limit: 2 });

      expect(result).toHaveLength(2);
    });

    it('deve aplicar offset', async () => {
      const all = await service.listCategorias({ ativas: true });
      const withOffset = await service.listCategorias({ offset: 1, ativas: true });

      expect(withOffset).toHaveLength(all.length - 1);
    });
  });

  describe('getCategoriaById', () => {
    it('deve retornar categoria existente', async () => {
      const created = await service.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        icone: '🍔',
        cor: '#FF5733',
      });

      const result = await service.getCategoriaById(created.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.nome).toBe('Alimentação');
    });

    it('deve retornar null para categoria inexistente', async () => {
      const result = await service.getCategoriaById('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('updateCategoria', () => {
    it('deve atualizar categoria existente', async () => {
      const created = await service.createCategoria({
        nome: 'Original',
        tipo: 'despesa',
        icone: '🍔',
        cor: '#FF5733',
      });

      const result = await service.updateCategoria(created.id, {
        nome: 'Atualizada',
        cor: '#000000',
      });

      expect(result.nome).toBe('Atualizada');
      expect(result.cor).toBe('#000000');
      expect(result.icone).toBe('🍔'); // Mantém valor original
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('deve lançar NotFoundError para categoria inexistente', async () => {
      await expect(
        service.updateCategoria('id-inexistente', { nome: 'Novo Nome' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteCategoria', () => {
    it('deve fazer soft delete (desativar categoria)', async () => {
      const categoria = await service.createCategoria({
        nome: 'Para Deletar',
        tipo: 'despesa',
        icone: '🗑️',
        cor: '#FF0000',
      });

      await service.deleteCategoria(categoria.id);

      const result = await service.getCategoriaById(categoria.id);
      expect(result).toBeDefined();
      expect(result?.ativa).toBe(false);
    });
  });

  describe('getCategoriasByGrupo', () => {
    beforeEach(async () => {
      await service.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        icone: '🍔',
        cor: '#FF5733',
        ordem: 1,
      });
      await service.createCategoria({
        nome: 'Restaurantes',
        tipo: 'despesa',
        grupo: 'Alimentação',
        icone: '🍽️',
        cor: '#FF5733',
        ordem: 1,
      });
      await service.createCategoria({
        nome: 'Supermercado',
        tipo: 'despesa',
        grupo: 'Alimentação',
        icone: '🛒',
        cor: '#FF5733',
        ordem: 2,
      });
      await service.createCategoria({
        nome: 'Salário',
        tipo: 'receita',
        icone: '💰',
        cor: '#33FF57',
        ordem: 1,
      });
    });

    it('deve listar categorias de um grupo específico', async () => {
      const result = await service.getCategoriasByGrupo('Alimentação');

      expect(result).toHaveLength(2);
      expect(result.every(c => c.grupo === 'Alimentação')).toBe(true);
    });

    it('deve ordenar por ordem', async () => {
      const result = await service.getCategoriasByGrupo('Alimentação');

      expect(result[0].ordem).toBeLessThanOrEqual(result[1].ordem || 0);
    });

    it('deve retornar array vazio para grupo inexistente', async () => {
      const result = await service.getCategoriasByGrupo('Grupo Inexistente');

      expect(result).toHaveLength(0);
    });
  });

  describe('getCategoriasPrincipais', () => {
    beforeEach(async () => {
      await service.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        icone: '🍔',
        cor: '#FF5733',
        ordem: 2,
      });
      await service.createCategoria({
        nome: 'Restaurantes',
        tipo: 'despesa',
        grupo: 'Alimentação',
        icone: '🍽️',
        cor: '#FF5733',
        ordem: 1,
      });
      await service.createCategoria({
        nome: 'Transporte',
        tipo: 'despesa',
        icone: '🚗',
        cor: '#3357FF',
        ordem: 1,
      });
      await service.createCategoria({
        nome: 'Salário',
        tipo: 'receita',
        icone: '💰',
        cor: '#33FF57',
        ordem: 1,
      });
    });

    it('deve listar apenas categorias principais (sem grupo)', async () => {
      const result = await service.getCategoriasPrincipais();

      expect(result.every(c => !c.grupo)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('deve filtrar por tipo', async () => {
      const result = await service.getCategoriasPrincipais('despesa');

      expect(result.every(c => c.tipo === 'despesa' && !c.grupo)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('deve ordenar por ordem', async () => {
      const result = await service.getCategoriasPrincipais();

      for (let i = 1; i < result.length; i++) {
        expect((result[i].ordem || 0) >= (result[i-1].ordem || 0)).toBe(true);
      }
    });
  });

  describe('searchCategorias', () => {
    beforeEach(async () => {
      await service.createCategoria({
        nome: 'Alimentação',
        tipo: 'despesa',
        icone: '🍔',
        cor: '#FF5733',
      });
      await service.createCategoria({
        nome: 'Alimentação Saudável',
        tipo: 'despesa',
        icone: '🥗',
        cor: '#33FF57',
      });
      await service.createCategoria({
        nome: 'Transporte',
        tipo: 'despesa',
        icone: '🚗',
        cor: '#3357FF',
      });
      await service.createCategoria({
        nome: 'Salário',
        tipo: 'receita',
        icone: '💰',
        cor: '#FFD700',
      });
    });

    it('deve buscar categorias por termo parcial', async () => {
      const result = await service.searchCategorias('Aliment');

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every(c => c.nome.toLowerCase().includes('aliment'))).toBe(true);
    });

    it('deve buscar case-insensitive', async () => {
      const result = await service.searchCategorias('ALIMENTAÇÃO');

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('deve filtrar por tipo na busca', async () => {
      const result = await service.searchCategorias('a', 'receita');

      expect(result.every(c => c.tipo === 'receita')).toBe(true);
    });

    it('deve retornar array vazio para termo sem matches', async () => {
      const result = await service.searchCategorias('xyzabc123');

      expect(result).toHaveLength(0);
    });
  });
});
