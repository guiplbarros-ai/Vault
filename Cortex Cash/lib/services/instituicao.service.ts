/**
 * Serviço de Instituições
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD e consultas para instituições financeiras
 */

import { getDB } from '../db/client';
import type { Instituicao, CreateInstituicaoDTO, Conta } from '../types';
import type { IInstituicaoService } from './interfaces';
import { NotFoundError, DatabaseError, ValidationError } from '../errors';
import { validateDTO, createInstituicaoSchema } from '../validations/dtos';

export class InstituicaoService implements IInstituicaoService {
  /**
   * Lista todas as instituições
   */
  async listInstituicoes(options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'nome' | 'codigo' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Instituicao[]> {
    const db = getDB();

    let instituicoes = await db.instituicoes.toArray();

    // Ordenar
    const sortBy = options?.sortBy || 'nome';
    const sortOrder = options?.sortOrder || 'asc';

    instituicoes.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      if (sortBy === 'nome') {
        compareA = a.nome.toLowerCase();
        compareB = b.nome.toLowerCase();
      } else if (sortBy === 'codigo') {
        compareA = (a.codigo || '').toLowerCase();
        compareB = (b.codigo || '').toLowerCase();
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
      instituicoes = instituicoes.slice(offset, offset + limit);
    } else if (offset > 0) {
      instituicoes = instituicoes.slice(offset);
    }

    return instituicoes;
  }

  /**
   * Busca uma instituição por ID
   */
  async getInstituicaoById(id: string): Promise<Instituicao | null> {
    const db = getDB();
    const instituicao = await db.instituicoes.get(id);
    return instituicao || null;
  }

  /**
   * Busca uma instituição por código
   */
  async getInstituicaoByCodigo(codigo: string): Promise<Instituicao | null> {
    const db = getDB();
    const instituicoes = await db.instituicoes.toArray();
    const instituicao = instituicoes.find(i => i.codigo === codigo);
    return instituicao || null;
  }

  /**
   * Cria uma nova instituição
   */
  async createInstituicao(data: CreateInstituicaoDTO): Promise<Instituicao> {
    try {
      // Validate input
      const validatedData = validateDTO(createInstituicaoSchema, data);

      const db = getDB();

      const id = crypto.randomUUID();
      const now = new Date();

      const instituicao: Instituicao = {
        ...validatedData,
        id,
        created_at: now,
        updated_at: now,
      };

      await db.instituicoes.add(instituicao);

      return instituicao;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Erro ao criar instituição', error as Error);
    }
  }

  /**
   * Atualiza uma instituição
   */
  async updateInstituicao(id: string, data: Partial<CreateInstituicaoDTO>): Promise<Instituicao> {
    try {
      const db = getDB();

      const existing = await db.instituicoes.get(id);
      if (!existing) {
        throw new NotFoundError('Instituição', id);
      }

      await db.instituicoes.update(id, {
        ...data,
        updated_at: new Date(),
      });

      const result = await db.instituicoes.get(id);
      if (!result) {
        throw new DatabaseError(`Erro ao recuperar instituição atualizada ${id}`);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Erro ao atualizar instituição', error as Error);
    }
  }

  /**
   * Deleta uma instituição
   * ATENÇÃO: Isso não deleta as contas associadas!
   */
  async deleteInstituicao(id: string): Promise<void> {
    try {
      const db = getDB();

      const existing = await db.instituicoes.get(id);
      if (!existing) {
        throw new NotFoundError('Instituição', id);
      }

      await db.instituicoes.delete(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Erro ao deletar instituição', error as Error);
    }
  }

  /**
   * Busca instituições por termo de busca (nome ou código)
   */
  async searchInstituicoes(termo: string): Promise<Instituicao[]> {
    const db = getDB();

    const instituicoes = await db.instituicoes.toArray();

    const termoLower = termo.toLowerCase();
    const filtered = instituicoes.filter((i) =>
      i.nome.toLowerCase().includes(termoLower) ||
      (i.codigo && i.codigo.toLowerCase().includes(termoLower))
    );

    // Ordenar por nome
    filtered.sort((a, b) => a.nome.localeCompare(b.nome));

    return filtered;
  }

  /**
   * Retorna uma instituição com suas contas associadas
   */
  async getInstituicaoComContas(id: string): Promise<{ instituicao: Instituicao; contas: Conta[] }> {
    const db = getDB();

    const instituicao = await db.instituicoes.get(id);
    if (!instituicao) {
      throw new NotFoundError('Instituição', id);
    }

    const contas = await db.contas
      .where('instituicao_id')
      .equals(id)
      .toArray();

    return {
      instituicao,
      contas,
    };
  }

  /**
   * Conta quantas contas uma instituição possui
   */
  async countContas(id: string): Promise<number> {
    const db = getDB();

    const contas = await db.contas
      .where('instituicao_id')
      .equals(id)
      .toArray();

    return contas.length;
  }

  /**
   * Verifica se uma instituição possui contas ativas
   */
  async hasContasAtivas(id: string): Promise<boolean> {
    const db = getDB();

    const contas = await db.contas
      .where('instituicao_id')
      .equals(id)
      .toArray();

    return contas.some(c => c.ativa === true);
  }
}

// Singleton instance
export const instituicaoService = new InstituicaoService();
