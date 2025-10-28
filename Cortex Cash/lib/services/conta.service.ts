/**
 * Serviço de Contas
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD e consultas para contas
 */

import { getDB } from '../db/client';
import type { Conta, Instituicao } from '../types';

export class ContaService {
  /**
   * Lista todas as contas ativas
   */
  async listContas(options?: {
    incluirInativas?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'nome' | 'saldo_inicial' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Conta[]> {
    const db = getDB();
    const incluirInativas = options?.incluirInativas || false;

    let contas: Conta[];

    if (incluirInativas) {
      contas = await db.contas.toArray();
    } else {
      contas = await db.contas.where('ativa').equals(true).toArray();
    }

    // Ordenar
    const sortBy = options?.sortBy || 'nome';
    const sortOrder = options?.sortOrder || 'asc';

    contas.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      if (sortBy === 'nome') {
        compareA = a.nome.toLowerCase();
        compareB = b.nome.toLowerCase();
      } else if (sortBy === 'saldo_inicial') {
        compareA = a.saldo_inicial || 0;
        compareB = b.saldo_inicial || 0;
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
      contas = contas.slice(offset, offset + limit);
    } else if (offset > 0) {
      contas = contas.slice(offset);
    }

    return contas;
  }

  /**
   * Busca uma conta por ID
   */
  async getContaById(id: string): Promise<Conta | null> {
    const db = getDB();
    const conta = await db.contas.get(id);
    return conta || null;
  }

  /**
   * Lista contas de uma instituição específica
   */
  async listContasByInstituicao(instituicaoId: string): Promise<Conta[]> {
    const db = getDB();
    return db.contas
      .where('instituicao_id')
      .equals(instituicaoId)
      .toArray();
  }

  /**
   * Calcula o saldo de uma conta baseado nas transações
   */
  async getSaldoConta(contaId: string): Promise<number> {
    const db = getDB();

    const transacoes = await db.transacoes
      .where('conta_id')
      .equals(contaId)
      .toArray();

    return transacoes.reduce((saldo, t) => {
      if (t.tipo === 'receita') {
        return saldo + t.valor;
      } else if (t.tipo === 'despesa') {
        return saldo - t.valor;
      }
      // transferências não afetam o saldo da conta_origem (são movimentadas para conta_destino)
      return saldo;
    }, 0);
  }

  /**
   * Calcula o saldo inicial + saldo das transações
   */
  async getSaldoTotal(contaId: string): Promise<number> {
    const conta = await this.getContaById(contaId);
    if (!conta) {
      throw new Error(`Conta ${contaId} não encontrada`);
    }

    const saldoTransacoes = await this.getSaldoConta(contaId);
    return (conta.saldo_inicial || 0) + saldoTransacoes;
  }

  /**
   * Cria uma nova conta
   */
  async createConta(data: Omit<Conta, 'id' | 'created_at' | 'updated_at'>): Promise<Conta> {
    const db = getDB();

    const id = crypto.randomUUID();
    const now = new Date();

    const conta: Conta = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };

    await db.contas.add(conta);

    return conta;
  }

  /**
   * Atualiza uma conta
   */
  async updateConta(id: string, data: Partial<Omit<Conta, 'id' | 'created_at' | 'updated_at'>>): Promise<Conta> {
    const db = getDB();

    const existing = await db.contas.get(id);
    if (!existing) {
      throw new Error(`Conta ${id} não encontrada`);
    }

    await db.contas.update(id, {
      ...data,
      updated_at: new Date(),
    });

    const result = await db.contas.get(id);
    if (!result) {
      throw new Error(`Erro ao recuperar conta atualizada ${id}`);
    }

    return result;
  }

  /**
   * Ativa/desativa uma conta
   */
  async toggleAtiva(id: string): Promise<Conta> {
    const db = getDB();

    const conta = await db.contas.get(id);
    if (!conta) {
      throw new Error(`Conta ${id} não encontrada`);
    }

    await db.contas.update(id, {
      ativa: !conta.ativa,
      updated_at: new Date(),
    });

    const result = await db.contas.get(id);
    if (!result) {
      throw new Error(`Erro ao recuperar conta atualizada ${id}`);
    }

    return result;
  }

  /**
   * Deleta uma conta (soft delete - apenas desativa)
   */
  async deleteConta(id: string): Promise<void> {
    await this.updateConta(id, { ativa: false });
  }

  /**
   * Deleta permanentemente uma conta
   * ATENÇÃO: Isso não deleta as transações associadas!
   */
  async hardDeleteConta(id: string): Promise<void> {
    const db = getDB();
    await db.contas.delete(id);
  }
}

// Singleton instance
export const contaService = new ContaService();
