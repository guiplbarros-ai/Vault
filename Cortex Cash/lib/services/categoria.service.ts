/**
 * Serviço de Categorias
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD para categorias
 */

import { getDB } from '../db/client';
import type { Categoria, CreateCategoriaDTO } from '../types';
import type { ICategoriaService } from './interfaces';
import { validateDTO, createCategoriaSchema } from '../validations/dtos';
import { NotFoundError, ValidationError, DatabaseError } from '../errors';

export class CategoriaService implements ICategoriaService {
  async listCategorias(options?: {
    tipo?: string;
    ativas?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'nome' | 'ordem' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Categoria[]> {
    const db = getDB();

    let categorias = await db.categorias.toArray();

    // Aplicar filtros
    if (options?.tipo) {
      categorias = categorias.filter((c) => c.tipo === options.tipo);
    }

    if (options?.ativas !== undefined) {
      categorias = categorias.filter((c) => c.ativa === options.ativas);
    }

    // Ordenar
    const sortBy = options?.sortBy || 'ordem';
    const sortOrder = options?.sortOrder || 'asc';

    categorias.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      if (sortBy === 'nome') {
        compareA = a.nome.toLowerCase();
        compareB = b.nome.toLowerCase();
      } else if (sortBy === 'ordem') {
        compareA = a.ordem || 0;
        compareB = b.ordem || 0;
      } else if (sortBy === 'created_at') {
        compareA = a.created_at instanceof Date ? a.created_at : new Date(a.created_at);
        compareB = b.created_at instanceof Date ? b.created_at : new Date(b.created_at);
        compareA = compareA.getTime();
        compareB = compareB.getTime();
      }

      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : compareA < compareB ? -1 : 0;
      } else {
        return compareA < compareB ? 1 : compareA > compareB ? -1 : 0;
      }
    });

    // Aplicar paginação
    const offset = options?.offset || 0;
    const limit = options?.limit;

    if (limit !== undefined) {
      categorias = categorias.slice(offset, offset + limit);
    } else if (offset > 0) {
      categorias = categorias.slice(offset);
    }

    return categorias;
  }

  async getCategoriaById(id: string): Promise<Categoria | null> {
    const db = getDB();
    const categoria = await db.categorias.get(id);
    return categoria || null;
  }

  async createCategoria(data: CreateCategoriaDTO): Promise<Categoria> {
    try {
      // Validate input
      const validatedData = validateDTO(createCategoriaSchema, data);

      const db = getDB();

    const id = crypto.randomUUID();
    const now = new Date();

    const categoria: Categoria = {
      id,
      nome: validatedData.nome,
      tipo: validatedData.tipo,
      grupo: validatedData.grupo,
      icone: validatedData.icone,
      cor: validatedData.cor,
      ordem: validatedData.ordem || 0,
      ativa: true,
      created_at: now,
      updated_at: now,
    };

      await db.categorias.add(categoria);

      return categoria;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Erro ao criar categoria', error as Error);
    }
  }

  async updateCategoria(id: string, data: Partial<CreateCategoriaDTO>): Promise<Categoria> {
    try {
      const db = getDB();

      const existing = await db.categorias.get(id);
      if (!existing) {
        throw new NotFoundError('Categoria', id);
      }

      await db.categorias.update(id, {
        ...data,
        updated_at: new Date(),
      });

      const result = await db.categorias.get(id);
      if (!result) {
        throw new DatabaseError(`Erro ao recuperar categoria atualizada ${id}`);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Erro ao atualizar categoria', error as Error);
    }
  }

  async deleteCategoria(id: string): Promise<void> {
    const db = getDB();

    // Soft delete - apenas desativa
    await db.categorias.update(id, {
      ativa: false,
      updated_at: new Date(),
    });
  }

  async getCategoriasByGrupo(grupo: string): Promise<Categoria[]> {
    const db = getDB();

    const categorias = await db.categorias
      .where('grupo')
      .equals(grupo)
      .toArray();

    // Ordenar por ordem
    categorias.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    return categorias;
  }

  /**
   * Lista categorias principais (sem grupo)
   */
  async getCategoriasPrincipais(tipo?: string): Promise<Categoria[]> {
    const db = getDB();

    let categorias = await db.categorias.toArray();

    // Filtrar apenas principais (sem grupo)
    categorias = categorias.filter((c) => !c.grupo && c.ativa);

    if (tipo) {
      categorias = categorias.filter((c) => c.tipo === tipo);
    }

    // Ordenar por ordem
    categorias.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    return categorias;
  }

  /**
   * Busca categorias por nome (útil para autocomplete)
   */
  async searchCategorias(termo: string, tipo?: string): Promise<Categoria[]> {
    const db = getDB();

    let categorias = await db.categorias.toArray();
    categorias = categorias.filter(c => c.ativa === true);

    const termoLower = termo.toLowerCase();
    categorias = categorias.filter((c) =>
      c.nome.toLowerCase().includes(termoLower)
    );

    if (tipo) {
      categorias = categorias.filter((c) => c.tipo === tipo);
    }

    // Ordenar por ordem
    categorias.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    return categorias;
  }
}

// Singleton instance
export const categoriaService = new CategoriaService();
