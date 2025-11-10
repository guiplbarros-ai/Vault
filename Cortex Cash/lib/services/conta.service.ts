/**
 * Serviço de Contas
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD e consultas para contas
 */

import { getDB } from '../db/client';
import type { Conta, Instituicao } from '../types';
import { NotFoundError, DatabaseError, ValidationError } from '../errors';
import { getCurrentUserId } from '../db/seed-usuarios';

export class ContaService {
  /**
   * Lista todas as contas ativas
   */
  async listContas(options?: {
    incluirInativas?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'nome' | 'saldo_referencia' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Conta[]> {
    const db = getDB();
    const currentUserId = getCurrentUserId();
    const incluirInativas = options?.incluirInativas || false;

    let contas: Conta[] = await db.contas.toArray();

    // Filtrar por usuário atual
    contas = contas.filter(c => c.usuario_id === currentUserId);

    if (!incluirInativas) {
      contas = contas.filter(c => c.ativa === true);
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
      } else if (sortBy === 'saldo_referencia') {
        compareA = a.saldo_referencia || 0;
        compareB = b.saldo_referencia || 0;
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
    const currentUserId = getCurrentUserId();

    const contas = await db.contas
      .where('instituicao_id')
      .equals(instituicaoId)
      .toArray();

    // Filtrar por usuário atual
    return contas.filter(c => c.usuario_id === currentUserId);
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
      // Transferências: valor já vem com sinal adequado (origem negativo, destino positivo)
      if (t.tipo === 'transferencia') {
        return saldo + t.valor;
      }
      return saldo;
    }, 0);
  }

  /**
   * Calcula o saldo inicial + saldo das transações
   */
  async getSaldoTotal(contaId: string): Promise<number> {
    const conta = await this.getContaById(contaId);
    if (!conta) {
      throw new NotFoundError('Conta', contaId);
    }

    // Novo modelo: usamos o saldo de referência (saldo final conhecido na data_referencia)
    // e calculamos o saldo na data desejada (agora) a partir dele.
    return await this.calcularSaldoEmData(contaId, new Date());
  }

  /**
   * Recalcula e atualiza o saldo_atual da conta baseado nas transações
   */
  async recalcularESalvarSaldo(contaId: string): Promise<void> {
    const conta = await this.getContaById(contaId);
    if (!conta) {
      throw new NotFoundError('Conta', contaId);
    }

    const db = getDB();
    // Calcula o saldo atual de forma consistente com a filosofia de saldo_referencia
    const novoSaldoAtual = await this.calcularSaldoEmData(contaId, new Date());

    await db.contas.update(contaId, {
      saldo_atual: novoSaldoAtual,
      updated_at: new Date(),
    });
  }

  /**
   * Cria uma nova conta
   */
  async createConta(data: Omit<Conta, 'id' | 'created_at' | 'updated_at'>): Promise<Conta> {
    const db = getDB();
    const currentUserId = getCurrentUserId();

    const id = crypto.randomUUID();
    const now = new Date();

    const contaBase: Conta = {
      ...data,
      id,
      usuario_id: currentUserId, // Pertence ao usuário atual
      // Inicializa saldo_atual com saldo_referencia (sem transações ainda)
      saldo_atual: data.saldo_referencia || 0,
      // Se data_referencia não fornecida, usa a data atual
      data_referencia: data.data_referencia || now,
      created_at: now,
      updated_at: now,
    };

    await db.contas.add(contaBase);

    return contaBase;
  }

  /**
   * Atualiza uma conta
   */
  async updateConta(id: string, data: Partial<Omit<Conta, 'id' | 'created_at' | 'updated_at'>>): Promise<Conta> {
    try {
      const db = getDB();

      const existing = await db.contas.get(id);
      if (!existing) {
        throw new NotFoundError('Conta', id);
      }

      // Se está desativando a conta, verificar se há cartões vinculados
      if (data.ativa === false && existing.ativa) {
        const cartoes = await db.cartoes_config
          .where('conta_pagamento_id')
          .equals(id)
          .toArray();

        const cartoesAtivos = cartoes.filter(c => c.ativo);

        if (cartoesAtivos.length > 0) {
          const nomesCartoes = cartoesAtivos.map(c => c.nome).join(', ');
          throw new ValidationError(
            `Não é possível desativar esta conta pois ela está vinculada a ${cartoesAtivos.length} cartão(ões) de crédito ativo(s): ${nomesCartoes}. ` +
            `Desvincule ou desative os cartões primeiro.`
          );
        }
      }

      await db.contas.update(id, {
        ...data,
        updated_at: new Date(),
      });

      const result = await db.contas.get(id);
      if (!result) {
        throw new DatabaseError(`Erro ao recuperar conta atualizada ${id}`);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Erro ao atualizar conta', error as Error);
    }
  }

  /**
   * Ativa/desativa uma conta
   */
  async toggleAtiva(id: string): Promise<Conta> {
    try {
      const db = getDB();

      const conta = await db.contas.get(id);
      if (!conta) {
        throw new NotFoundError('Conta', id);
      }

      // Se está desativando a conta, verificar se há cartões vinculados
      if (conta.ativa) {
        const cartoes = await db.cartoes_config
          .where('conta_pagamento_id')
          .equals(id)
          .toArray();

        const cartoesAtivos = cartoes.filter(c => c.ativo);

        if (cartoesAtivos.length > 0) {
          const nomesCartoes = cartoesAtivos.map(c => c.nome).join(', ');
          throw new ValidationError(
            `Não é possível desativar esta conta pois ela está vinculada a ${cartoesAtivos.length} cartão(ões) de crédito ativo(s): ${nomesCartoes}. ` +
            `Desvincule ou desative os cartões primeiro.`
          );
        }
      }

      await db.contas.update(id, {
        ativa: !conta.ativa,
        updated_at: new Date(),
      });

      const result = await db.contas.get(id);
      if (!result) {
        throw new DatabaseError(`Erro ao recuperar conta atualizada ${id}`);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Erro ao alternar estado da conta', error as Error);
    }
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

  /**
   * Calcula o saldo da conta em uma data específica
   * Filosofia: User é soberano - usa saldo_referencia como base e calcula para frente ou trás
   *
   * @param contaId ID da conta
   * @param data Data para calcular o saldo (default: hoje)
   * @returns Saldo calculado na data especificada
   */
  async calcularSaldoEmData(contaId: string, data: Date = new Date()): Promise<number> {
    try {
      const db = getDB();

      const conta = await db.contas.get(contaId);
      if (!conta) {
        throw new NotFoundError('Conta', contaId);
      }

      const dataReferencia = conta.data_referencia instanceof Date
        ? conta.data_referencia
        : new Date(conta.data_referencia);

      // Se a data solicitada é igual à data de referência, retorna o saldo de referência
      if (data.toDateString() === dataReferencia.toDateString()) {
        return conta.saldo_referencia;
      }

      // Buscar todas as transações da conta
      const todasTransacoes = await db.transacoes
        .where('conta_id')
        .equals(contaId)
        .toArray();

      let saldoCalculado = conta.saldo_referencia;

      if (data >= dataReferencia) {
        // FUTURO: adiciona transações entre data_referencia e data solicitada
        const transacoesFuturas = todasTransacoes.filter(t => {
          const dataTransacao = t.data instanceof Date ? t.data : new Date(t.data);
          return dataTransacao > dataReferencia && dataTransacao <= data;
        });

        for (const t of transacoesFuturas) {
          if (t.tipo === 'receita') {
            saldoCalculado += t.valor;
          } else if (t.tipo === 'despesa') {
            saldoCalculado -= t.valor;
          } else if (t.tipo === 'transferencia') {
            // Transferências: adiciona o valor (já vem com sinal correto)
            saldoCalculado += t.valor;
          }
        }
      } else {
        // PASSADO: subtrai transações entre data solicitada e data_referencia (invertido)
        const transacoesPassadas = todasTransacoes.filter(t => {
          const dataTransacao = t.data instanceof Date ? t.data : new Date(t.data);
          return dataTransacao > data && dataTransacao <= dataReferencia;
        });

        for (const t of transacoesPassadas) {
          // Inverte a lógica: o que era receita vira despesa e vice-versa
          if (t.tipo === 'receita') {
            saldoCalculado -= t.valor;
          } else if (t.tipo === 'despesa') {
            saldoCalculado += t.valor;
          } else if (t.tipo === 'transferencia') {
            // Transferências: inverte o sinal
            saldoCalculado -= t.valor;
          }
        }
      }

      return saldoCalculado;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Erro ao calcular saldo da conta', error as Error);
    }
  }

  /**
   * Atualiza o saldo de referência da conta
   * Usado quando o usuário verifica o saldo real no banco e quer atualizar
   *
   * @param contaId ID da conta
   * @param novoSaldo Novo saldo verificado
   * @param dataReferencia Data em que o saldo foi verificado (default: hoje)
   */
  async atualizarSaldoReferencia(
    contaId: string,
    novoSaldo: number,
    dataReferencia: Date = new Date()
  ): Promise<Conta> {
    try {
      const db = getDB();

      const conta = await db.contas.get(contaId);
      if (!conta) {
        throw new NotFoundError('Conta', contaId);
      }

      await db.contas.update(contaId, {
        saldo_referencia: novoSaldo,
        data_referencia: dataReferencia,
        updated_at: new Date(),
      });

      // Recalcula o saldo atual
      const saldoAtual = await this.calcularSaldoEmData(contaId, new Date());
      await db.contas.update(contaId, { saldo_atual: saldoAtual });

      const result = await db.contas.get(contaId);
      if (!result) {
        throw new DatabaseError(`Erro ao recuperar conta atualizada ${contaId}`);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Erro ao atualizar saldo de referência', error as Error);
    }
  }

  /**
   * Recalcula o saldo atual de todas as contas ativas
   * Útil após importações ou edições em massa de transações
   */
  async recalcularSaldosAtuais(): Promise<void> {
    try {
      const db = getDB();
      const contasAtivas = await db.contas.where('ativa').equals(1).toArray();

      for (const conta of contasAtivas) {
        const saldoAtual = await this.calcularSaldoEmData(conta.id, new Date());
        await db.contas.update(conta.id, {
          saldo_atual: saldoAtual,
          updated_at: new Date(),
        });
      }

      console.log(`[ContaService] Saldos atuais recalculados para ${contasAtivas.length} contas`);
    } catch (error) {
      throw new DatabaseError('Erro ao recalcular saldos atuais', error as Error);
    }
  }
}

// Singleton instance
export const contaService = new ContaService();
