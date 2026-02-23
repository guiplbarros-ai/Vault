/**
 * Serviço de Contas
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD e consultas para contas
 */

import { getSupabase } from '../db/supabase'
import { DatabaseError, NotFoundError, ValidationError } from '../errors'
import type { Conta } from '../types'
import { roundCurrency } from '../utils/currency'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function rowToConta(row: Record<string, unknown>): Conta {
  return {
    id: row.id as string,
    instituicao_id: row.instituicao_id as string,
    nome: row.nome as string,
    tipo: row.tipo as Conta['tipo'],
    agencia: row.agencia as string | undefined,
    numero: row.numero as string | undefined,
    saldo_referencia: Number(row.saldo_referencia) || 0,
    data_referencia: row.data_referencia ? new Date(row.data_referencia as string) : new Date(),
    saldo_atual: Number(row.saldo_atual) || 0,
    ativa: row.ativa !== false,
    cor: row.cor as string | undefined,
    icone: row.icone as string | undefined,
    observacoes: row.observacoes as string | undefined,
    conta_pai_id: row.conta_pai_id as string | undefined,
    pluggy_id: row.pluggy_id as string | undefined,
    usuario_id: row.usuario_id as string | undefined,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    updated_at: row.updated_at ? new Date(row.updated_at as string) : new Date(),
  }
}

export class ContaService {
  /**
   * Lista todas as contas do usuário atual
   */
  async listContas(options?: {
    incluirInativas?: boolean
    limit?: number
    offset?: number
    sortBy?: 'nome' | 'saldo_referencia' | 'created_at'
    sortOrder?: 'asc' | 'desc'
  }): Promise<Conta[]> {
    const supabase = getSupabase()
    const userId = await getUserId()
    const incluirInativas = options?.incluirInativas || false
    const sortBy = options?.sortBy || 'nome'
    const sortOrder = options?.sortOrder || 'asc'

    let query = supabase
      .from('contas')
      .select('*')
      .eq('usuario_id', userId)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (!incluirInativas) {
      query = query.eq('ativa', true)
    }

    if (options?.limit !== undefined) {
      const offset = options?.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao listar contas', error as unknown as Error)

    return (data || []).map(rowToConta)
  }

  /**
   * Busca uma conta por ID
   */
  async getContaById(id: string): Promise<Conta | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('contas')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar conta', error as unknown as Error)

    return data ? rowToConta(data) : null
  }

  /**
   * Lista contas de uma instituição específica do usuário atual
   */
  async listContasByInstituicao(instituicaoId: string): Promise<Conta[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('contas')
      .select('*')
      .eq('instituicao_id', instituicaoId)
      .eq('usuario_id', userId)

    if (error) throw new DatabaseError('Erro ao listar contas por instituição', error as unknown as Error)

    return (data || []).map(rowToConta)
  }

  /**
   * Calcula o saldo de uma conta baseado no saldo de referência + transações.
   */
  async getSaldoConta(contaId: string): Promise<number> {
    return this.calcularSaldoEmData(contaId, new Date())
  }

  /**
   * Calcula o saldo inicial + saldo das transações
   */
  async getSaldoTotal(contaId: string): Promise<number> {
    const conta = await this.getContaById(contaId)
    if (!conta) {
      throw new NotFoundError('Conta', contaId)
    }

    return await this.calcularSaldoEmData(contaId, new Date())
  }

  /**
   * Recalcula e atualiza o saldo_atual da conta baseado nas transações
   */
  async recalcularESalvarSaldo(contaId: string): Promise<void> {
    const conta = await this.getContaById(contaId)
    if (!conta) {
      throw new NotFoundError('Conta', contaId)
    }

    const supabase = getSupabase()
    const novoSaldoAtual = await this.calcularSaldoEmData(contaId, new Date())

    const { error } = await supabase
      .from('contas')
      .update({
        saldo_atual: novoSaldoAtual,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contaId)

    if (error) throw new DatabaseError('Erro ao salvar saldo recalculado', error as unknown as Error)
  }

  /**
   * Cria uma nova conta
   */
  async createConta(data: Omit<Conta, 'id' | 'created_at' | 'updated_at'>): Promise<Conta> {
    if (!data.instituicao_id || !data.nome || !data.tipo) {
      throw new ValidationError('Dados insuficientes para criar conta')
    }

    const supabase = getSupabase()
    const userId = await getUserId()
    const now = new Date().toISOString()

    const { data: inserted, error } = await supabase
      .from('contas')
      .insert({
        id: crypto.randomUUID(),
        ...data,
        usuario_id: userId,
        saldo_atual: data.saldo_referencia || 0,
        data_referencia: data.data_referencia
          ? (data.data_referencia instanceof Date
              ? data.data_referencia.toISOString()
              : data.data_referencia)
          : now,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw new DatabaseError('Erro ao criar conta', error as unknown as Error)

    return rowToConta(inserted)
  }

  /**
   * Atualiza uma conta
   */
  async updateConta(
    id: string,
    data: Partial<Omit<Conta, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Conta> {
    try {
      const supabase = getSupabase()

      const existing = await this.getContaById(id)
      if (!existing) {
        throw new NotFoundError('Conta', id)
      }

      // If disabling, check for linked active credit cards
      if (data.ativa === false && existing.ativa) {
        const { data: cartoesAtivos, error: cartaoError } = await supabase
          .from('cartoes_config')
          .select('nome')
          .eq('conta_pagamento_id', id)
          .eq('ativo', true)

        if (!cartaoError && cartoesAtivos && cartoesAtivos.length > 0) {
          const nomesCartoes = cartoesAtivos.map((c: { nome: string }) => c.nome).join(', ')
          throw new ValidationError(
            `Não é possível desativar esta conta pois ela está vinculada a ${cartoesAtivos.length} cartão(ões) de crédito ativo(s): ${nomesCartoes}. ` +
              `Desvincule ou desative os cartões primeiro.`
          )
        }
      }

      const updatePayload: Record<string, unknown> = {
        ...data,
        updated_at: new Date().toISOString(),
      }

      if (data.data_referencia instanceof Date) {
        updatePayload.data_referencia = data.data_referencia.toISOString()
      }

      const { data: updated, error } = await supabase
        .from('contas')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao atualizar conta', error as unknown as Error)

      return rowToConta(updated)
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof DatabaseError ||
        error instanceof ValidationError
      ) {
        throw error
      }
      throw new DatabaseError('Erro ao atualizar conta', error as Error)
    }
  }

  /**
   * Ativa/desativa uma conta
   */
  async toggleAtiva(id: string): Promise<Conta> {
    try {
      const conta = await this.getContaById(id)
      if (!conta) {
        throw new NotFoundError('Conta', id)
      }

      const supabase = getSupabase()

      // If disabling, check for linked active credit cards
      if (conta.ativa) {
        const { data: cartoesAtivos, error: cartaoError } = await supabase
          .from('cartoes_config')
          .select('nome')
          .eq('conta_pagamento_id', id)
          .eq('ativo', true)

        if (!cartaoError && cartoesAtivos && cartoesAtivos.length > 0) {
          const nomesCartoes = cartoesAtivos.map((c: { nome: string }) => c.nome).join(', ')
          throw new ValidationError(
            `Não é possível desativar esta conta pois ela está vinculada a ${cartoesAtivos.length} cartão(ões) de crédito ativo(s): ${nomesCartoes}. ` +
              `Desvincule ou desative os cartões primeiro.`
          )
        }
      }

      const { data: updated, error } = await supabase
        .from('contas')
        .update({
          ativa: !conta.ativa,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao alternar estado da conta', error as unknown as Error)

      return rowToConta(updated)
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof DatabaseError ||
        error instanceof ValidationError
      ) {
        throw error
      }
      throw new DatabaseError('Erro ao alternar estado da conta', error as Error)
    }
  }

  /**
   * Deleta uma conta (soft delete - apenas desativa)
   */
  async deleteConta(id: string): Promise<void> {
    await this.updateConta(id, { ativa: false })
  }

  /**
   * Deleta permanentemente uma conta e todas as suas transações associadas.
   */
  async hardDeleteConta(id: string): Promise<void> {
    const supabase = getSupabase()

    // Get all transactions for this account
    const { data: transacoes, error: txError } = await supabase
      .from('transacoes')
      .select('id, transferencia_id, conta_id')
      .eq('conta_id', id)

    if (txError) throw new DatabaseError('Erro ao buscar transações', txError as unknown as Error)

    const idsParaDeletar = new Set((transacoes || []).map((t: { id: string }) => t.id))
    const contasParaRecalcular = new Set<string>()

    // Find sibling transactions from transfers
    for (const t of transacoes || []) {
      if (t.transferencia_id) {
        const { data: siblings } = await supabase
          .from('transacoes')
          .select('id, conta_id')
          .eq('transferencia_id', t.transferencia_id)
          .neq('conta_id', id)

        for (const sibling of siblings || []) {
          if (!idsParaDeletar.has(sibling.id)) {
            idsParaDeletar.add(sibling.id)
            contasParaRecalcular.add(sibling.conta_id)
          }
        }
      }
    }

    // Delete all collected transactions
    if (idsParaDeletar.size > 0) {
      const { error: delTxError } = await supabase
        .from('transacoes')
        .delete()
        .in('id', [...idsParaDeletar])

      if (delTxError) throw new DatabaseError('Erro ao deletar transações', delTxError as unknown as Error)
    }

    // Delete the account
    const { error: delContaError } = await supabase.from('contas').delete().eq('id', id)

    if (delContaError) throw new DatabaseError('Erro ao deletar conta', delContaError as unknown as Error)

    // Recalculate balances for affected sibling accounts
    for (const contaId of contasParaRecalcular) {
      if (contaId !== id) {
        await this.recalcularESalvarSaldo(contaId)
      }
    }
  }

  /**
   * Calcula o saldo da conta em uma data específica
   * Filosofia: User é soberano - usa saldo_referencia como base e calcula para frente ou trás
   */
  async calcularSaldoEmData(contaId: string, data: Date = new Date()): Promise<number> {
    try {
      const supabase = getSupabase()

      const conta = await this.getContaById(contaId)
      if (!conta) {
        throw new NotFoundError('Conta', contaId)
      }

      const dataReferencia =
        conta.data_referencia instanceof Date
          ? conta.data_referencia
          : new Date(conta.data_referencia)

      if (data.toDateString() === dataReferencia.toDateString()) {
        return conta.saldo_referencia
      }

      // Fetch all transactions for this account
      const { data: todasTransacoes, error } = await supabase
        .from('transacoes')
        .select('tipo, valor, data')
        .eq('conta_id', contaId)

      if (error) throw new DatabaseError('Erro ao buscar transações', error as unknown as Error)

      let saldoCalculado = conta.saldo_referencia

      if (data >= dataReferencia) {
        // FUTURE: add transactions between data_referencia and requested date
        const transacoesFuturas = (todasTransacoes || []).filter((t: { data: string; tipo: string; valor: number }) => {
          const dataTransacao = new Date(t.data)
          return dataTransacao > dataReferencia && dataTransacao <= data
        })

        for (const t of transacoesFuturas) {
          if (t.tipo === 'receita') {
            saldoCalculado += t.valor
          } else if (t.tipo === 'despesa') {
            saldoCalculado -= t.valor
          } else if (t.tipo === 'transferencia') {
            saldoCalculado += t.valor
          }
        }
      } else {
        // PAST: subtract transactions between requested date and data_referencia (reversed)
        const transacoesPassadas = (todasTransacoes || []).filter((t: { data: string; tipo: string; valor: number }) => {
          const dataTransacao = new Date(t.data)
          return dataTransacao > data && dataTransacao <= dataReferencia
        })

        for (const t of transacoesPassadas) {
          if (t.tipo === 'receita') {
            saldoCalculado -= t.valor
          } else if (t.tipo === 'despesa') {
            saldoCalculado += t.valor
          } else if (t.tipo === 'transferencia') {
            saldoCalculado -= t.valor
          }
        }
      }

      return roundCurrency(saldoCalculado)
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      throw new DatabaseError('Erro ao calcular saldo da conta', error as Error)
    }
  }

  /**
   * Atualiza o saldo de referência da conta
   */
  async atualizarSaldoReferencia(
    contaId: string,
    novoSaldo: number,
    dataReferencia: Date = new Date()
  ): Promise<Conta> {
    try {
      const supabase = getSupabase()

      const conta = await this.getContaById(contaId)
      if (!conta) {
        throw new NotFoundError('Conta', contaId)
      }

      await supabase
        .from('contas')
        .update({
          saldo_referencia: novoSaldo,
          data_referencia: dataReferencia.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', contaId)

      // Recalculate current balance
      const saldoAtual = await this.calcularSaldoEmData(contaId, new Date())

      const { data: result, error } = await supabase
        .from('contas')
        .update({ saldo_atual: saldoAtual, updated_at: new Date().toISOString() })
        .eq('id', contaId)
        .select()
        .single()

      if (error || !result) {
        throw new DatabaseError(`Erro ao recuperar conta atualizada ${contaId}`)
      }

      return rowToConta(result)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao atualizar saldo de referência', error as Error)
    }
  }

  /**
   * Recalcula o saldo atual de todas as contas ativas do usuário
   */
  async recalcularSaldosAtuais(): Promise<void> {
    try {
      const supabase = getSupabase()
      const userId = await getUserId()

      const { data: contasAtivas, error } = await supabase
        .from('contas')
        .select('id')
        .eq('usuario_id', userId)
        .eq('ativa', true)

      if (error) throw new DatabaseError('Erro ao buscar contas', error as unknown as Error)

      for (const conta of contasAtivas || []) {
        const saldoAtual = await this.calcularSaldoEmData(conta.id, new Date())
        await supabase
          .from('contas')
          .update({
            saldo_atual: saldoAtual,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conta.id)
      }

      console.log(`[ContaService] Saldos atuais recalculados para ${(contasAtivas || []).length} contas`)
    } catch (error) {
      throw new DatabaseError('Erro ao recalcular saldos atuais', error as Error)
    }
  }
}

// Singleton instance
export const contaService = new ContaService()
