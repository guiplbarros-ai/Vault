/**
 * Serviço de Transações
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD e consultas para transações
 */

import { getDB } from '../db/client';
import type { Transacao, CreateTransacaoDTO } from '../types';
import type { ITransacaoService } from './interfaces';
import { generateHash } from '../utils/format';
import { validateDTO, createTransacaoSchema } from '../validations/dtos';
import { NotFoundError, ValidationError, DatabaseError } from '../errors';

export class TransacaoService implements ITransacaoService {
  async listTransacoes(filters?: {
    contaId?: string;
    categoriaId?: string;
    dataInicio?: Date;
    dataFim?: Date;
    tipo?: string;
    busca?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'data' | 'valor' | 'descricao';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Transacao[]> {
    const db = getDB();

    // Buscar todas as transações
    let transacoes = await db.transacoes.toArray();

    // Aplicar filtros
    if (filters?.contaId) {
      transacoes = transacoes.filter((t) => t.conta_id === filters.contaId);
    }

    if (filters?.categoriaId) {
      transacoes = transacoes.filter((t) => t.categoria_id === filters.categoriaId);
    }

    if (filters?.dataInicio) {
      const dataInicioTime = filters.dataInicio.getTime();
      transacoes = transacoes.filter((t) => {
        const tData = t.data instanceof Date ? t.data : new Date(t.data);
        return tData.getTime() >= dataInicioTime;
      });
    }

    if (filters?.dataFim) {
      const dataFimTime = filters.dataFim.getTime();
      transacoes = transacoes.filter((t) => {
        const tData = t.data instanceof Date ? t.data : new Date(t.data);
        return tData.getTime() <= dataFimTime;
      });
    }

    if (filters?.tipo) {
      transacoes = transacoes.filter((t) => t.tipo === filters.tipo);
    }

    if (filters?.busca) {
      const buscaLower = filters.busca.toLowerCase();
      transacoes = transacoes.filter((t) =>
        t.descricao.toLowerCase().includes(buscaLower)
      );
    }

    // Ordenar
    const sortBy = filters?.sortBy || 'data';
    const sortOrder = filters?.sortOrder || 'desc';

    transacoes.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      if (sortBy === 'data') {
        compareA = a.data instanceof Date ? a.data : new Date(a.data);
        compareB = b.data instanceof Date ? b.data : new Date(b.data);
        compareA = compareA.getTime();
        compareB = compareB.getTime();
      } else if (sortBy === 'valor') {
        compareA = a.valor;
        compareB = b.valor;
      } else if (sortBy === 'descricao') {
        compareA = a.descricao.toLowerCase();
        compareB = b.descricao.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : compareA < compareB ? -1 : 0;
      } else {
        return compareA < compareB ? 1 : compareA > compareB ? -1 : 0;
      }
    });

    // Aplicar paginação
    const offset = filters?.offset || 0;
    const limit = filters?.limit;

    if (limit !== undefined) {
      transacoes = transacoes.slice(offset, offset + limit);
    } else if (offset > 0) {
      transacoes = transacoes.slice(offset);
    }

    return transacoes;
  }

  async getTransacaoById(id: string): Promise<Transacao | null> {
    const db = getDB();
    const transacao = await db.transacoes.get(id);
    return transacao || null;
  }

  async createTransacao(data: CreateTransacaoDTO): Promise<Transacao> {
    try {
      // Validate input
      const validatedData = validateDTO(createTransacaoSchema, data);

      const db = getDB();

    const id = crypto.randomUUID();
    const now = new Date();

    // Gera hash para dedupe
    const hashInput = `${validatedData.conta_id}-${validatedData.data}-${validatedData.descricao}-${validatedData.valor}`;
    const hash = await generateHash(hashInput);

    const transacao: Transacao = {
      id,
      conta_id: validatedData.conta_id,
      categoria_id: validatedData.categoria_id,
      data: typeof validatedData.data === 'string' ? new Date(validatedData.data) : validatedData.data,
      descricao: validatedData.descricao,
      valor: validatedData.valor,
      tipo: validatedData.tipo,
      observacoes: validatedData.observacoes,
      tags: validatedData.tags ? JSON.stringify(validatedData.tags) : undefined,
      parcelado: false,
      classificacao_confirmada: !!validatedData.categoria_id,
      classificacao_origem: validatedData.categoria_id ? 'manual' : undefined,
      hash,
      created_at: now,
      updated_at: now,
    };

      await db.transacoes.add(transacao);

      return transacao;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Erro ao criar transação', error as Error);
    }
  }

  async updateTransacao(id: string, data: Partial<CreateTransacaoDTO>): Promise<Transacao> {
    try {
      const db = getDB();

      const existing = await db.transacoes.get(id);
      if (!existing) {
        throw new NotFoundError('Transação', id);
      }

    const updated: Partial<Transacao> = {
      ...data,
      updated_at: new Date(),
    };

    // Se categoria foi alterada, atualizar confirmação
    if (data.categoria_id !== undefined) {
      updated.classificacao_confirmada = true;
      updated.classificacao_origem = 'manual';
    }

      await db.transacoes.update(id, updated);

      const result = await db.transacoes.get(id);
      if (!result) {
        throw new DatabaseError(`Erro ao recuperar transação atualizada ${id}`);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Erro ao atualizar transação', error as Error);
    }
  }

  async deleteTransacao(id: string): Promise<void> {
    const db = getDB();
    await db.transacoes.delete(id);
  }

  async bulkUpdateCategoria(transacaoIds: string[], categoriaId: string): Promise<number> {
    const db = getDB();

    let count = 0;
    for (const id of transacaoIds) {
      try {
        await db.transacoes.update(id, {
          categoria_id: categoriaId,
          classificacao_confirmada: true,
          classificacao_origem: 'manual',
          updated_at: new Date(),
        });
        count++;
      } catch (error) {
        console.error(`Erro ao atualizar transação ${id}:`, error);
      }
    }

    return count;
  }

  async bulkDelete(transacaoIds: string[]): Promise<number> {
    const db = getDB();
    await db.transacoes.bulkDelete(transacaoIds);
    return transacaoIds.length;
  }
}

// Singleton instance
export const transacaoService = new TransacaoService();
