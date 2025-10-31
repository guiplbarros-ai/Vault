/**
 * Serviço de Tags
 * Agent CORE: v0.2 - Tags System
 *
 * Fornece operações CRUD para tags de transações
 */

import { getDB } from '../db/client';
import type { Tag } from '../types';
import { NotFoundError, ValidationError, DatabaseError, DuplicateError } from '../errors';

export interface CreateTagDTO {
  nome: string;
  cor?: string;
  tipo?: 'sistema' | 'customizada';
}

export interface UpdateTagDTO {
  nome?: string;
  cor?: string;
}

export class TagService {
  /**
   * Lista todas as tags
   */
  async listTags(options?: {
    tipo?: 'sistema' | 'customizada';
    sortBy?: 'nome' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Tag[]> {
    const db = getDB();

    let tags = await db.tags.toArray();

    // Aplicar filtros
    if (options?.tipo) {
      tags = tags.filter((t) => t.tipo === options.tipo);
    }

    // Ordenar
    const sortBy = options?.sortBy || 'nome';
    const sortOrder = options?.sortOrder || 'asc';

    tags.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      if (sortBy === 'nome') {
        compareA = a.nome.toLowerCase();
        compareB = b.nome.toLowerCase();
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

    return tags;
  }

  /**
   * Busca tag por ID
   */
  async getTagById(id: string): Promise<Tag | null> {
    const db = getDB();
    const tag = await db.tags.get(id);
    return tag || null;
  }

  /**
   * Busca tag por nome
   */
  async getTagByNome(nome: string): Promise<Tag | null> {
    const db = getDB();
    const tags = await db.tags.toArray();
    const tag = tags.find(t => t.nome.toLowerCase() === nome.toLowerCase());
    return tag || null;
  }

  /**
   * Cria uma nova tag
   */
  async createTag(data: CreateTagDTO): Promise<Tag> {
    try {
      // Validar nome
      if (!data.nome || data.nome.trim().length === 0) {
        throw new ValidationError('Nome da tag é obrigatório');
      }

      if (data.nome.length > 50) {
        throw new ValidationError('Nome da tag deve ter no máximo 50 caracteres');
      }

      const db = getDB();

      // Verificar se já existe tag com mesmo nome
      const existing = await this.getTagByNome(data.nome);
      if (existing) {
        throw new DuplicateError(`Tag com nome "${data.nome}" já existe`);
      }

      const id = crypto.randomUUID();
      const now = new Date();

      const tag: Tag = {
        id,
        nome: data.nome.trim(),
        cor: data.cor,
        tipo: data.tipo || 'customizada',
        created_at: now,
      };

      await db.tags.add(tag);

      return tag;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DuplicateError) {
        throw error;
      }
      throw new DatabaseError('Erro ao criar tag', error as Error);
    }
  }

  /**
   * Atualiza uma tag existente
   */
  async updateTag(id: string, data: UpdateTagDTO): Promise<Tag> {
    try {
      const db = getDB();

      const existing = await db.tags.get(id);
      if (!existing) {
        throw new NotFoundError('Tag', id);
      }

      // Tags do sistema não podem ser editadas
      if (existing.tipo === 'sistema') {
        throw new ValidationError('Tags do sistema não podem ser editadas');
      }

      // Validar nome se fornecido
      if (data.nome !== undefined) {
        if (!data.nome || data.nome.trim().length === 0) {
          throw new ValidationError('Nome da tag é obrigatório');
        }

        if (data.nome.length > 50) {
          throw new ValidationError('Nome da tag deve ter no máximo 50 caracteres');
        }

        // Verificar duplicata
        const duplicate = await this.getTagByNome(data.nome);
        if (duplicate && duplicate.id !== id) {
          throw new DuplicateError(`Tag com nome "${data.nome}" já existe`);
        }
      }

      await db.tags.update(id, {
        ...data,
        nome: data.nome?.trim(),
      });

      const result = await db.tags.get(id);
      if (!result) {
        throw new DatabaseError(`Erro ao recuperar tag atualizada ${id}`);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof DuplicateError) {
        throw error;
      }
      throw new DatabaseError('Erro ao atualizar tag', error as Error);
    }
  }

  /**
   * Deleta uma tag
   */
  async deleteTag(id: string): Promise<void> {
    try {
      const db = getDB();

      const existing = await db.tags.get(id);
      if (!existing) {
        throw new NotFoundError('Tag', id);
      }

      // Tags do sistema não podem ser deletadas
      if (existing.tipo === 'sistema') {
        throw new ValidationError('Tags do sistema não podem ser deletadas');
      }

      // Remover a tag de todas as transações
      const transacoes = await db.transacoes.toArray();
      for (const tx of transacoes) {
        if (tx.tags && typeof tx.tags === 'string') {
          try {
            const tagsArray = JSON.parse(tx.tags);
            if (Array.isArray(tagsArray) && tagsArray.includes(existing.nome)) {
              const novasTags = tagsArray.filter(t => t !== existing.nome);
              await db.transacoes.update(tx.id, {
                tags: JSON.stringify(novasTags),
              });
            }
          } catch (e) {
            // Ignorar erros de parse
          }
        }
      }

      // Deletar a tag
      await db.tags.delete(id);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Erro ao deletar tag', error as Error);
    }
  }

  /**
   * Busca tags por nome (autocomplete)
   */
  async searchTags(termo: string): Promise<Tag[]> {
    const db = getDB();

    let tags = await db.tags.toArray();

    const termoLower = termo.toLowerCase();
    tags = tags.filter((t) =>
      t.nome.toLowerCase().includes(termoLower)
    );

    // Ordenar por nome
    tags.sort((a, b) => a.nome.localeCompare(b.nome));

    return tags;
  }

  /**
   * Conta quantas transações usam uma tag
   */
  async contarTransacoesPorTag(tagNome: string): Promise<number> {
    const db = getDB();
    const transacoes = await db.transacoes.toArray();

    let count = 0;
    for (const tx of transacoes) {
      if (tx.tags && typeof tx.tags === 'string') {
        try {
          const tagsArray = JSON.parse(tx.tags);
          if (Array.isArray(tagsArray) && tagsArray.includes(tagNome)) {
            count++;
          }
        } catch (e) {
          // Ignorar erros de parse
        }
      }
    }

    return count;
  }

  /**
   * Lista tags mais usadas
   */
  async getTagsMaisUsadas(limit = 10): Promise<Array<{ tag: Tag; count: number }>> {
    const tags = await this.listTags();
    const counts: Array<{ tag: Tag; count: number }> = [];

    for (const tag of tags) {
      const count = await this.contarTransacoesPorTag(tag.nome);
      counts.push({ tag, count });
    }

    // Ordenar por contagem decrescente
    counts.sort((a, b) => b.count - a.count);

    return counts.slice(0, limit);
  }
}

// Singleton instance
export const tagService = new TagService();
