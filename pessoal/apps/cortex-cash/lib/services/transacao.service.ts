/**
 * Serviço de Transações
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD e consultas para transações
 */

import { format } from 'date-fns'
import { escapeLikePattern } from '../api/sanitize'
import { getSupabase } from '../db/supabase'
import { DatabaseError, DuplicateError, NotFoundError, ValidationError } from '../errors'
import { generateTransactionHash } from '../import/dedupe'
import type { CreateTransacaoDTO, Transacao } from '../types'
import { roundCurrency } from '../utils/currency'
import { generateHash } from '../utils/format'
import { contaService } from './conta.service'
import type { ITransacaoService } from './interfaces'
import { orcamentoService } from './orcamento.service'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function rowToTransacao(row: Record<string, unknown>): Transacao {
  return {
    id: row.id as string,
    conta_id: row.conta_id as string,
    categoria_id: row.categoria_id as string | undefined,
    centro_custo_id: row.centro_custo_id as string | undefined,
    data: row.data ? new Date(row.data as string) : new Date(),
    descricao: row.descricao as string,
    valor: Number(row.valor) || 0,
    tipo: row.tipo as Transacao['tipo'],
    observacoes: row.observacoes as string | undefined,
    tags: row.tags as string | undefined,
    transferencia_id: row.transferencia_id as string | undefined,
    conta_destino_id: row.conta_destino_id as string | undefined,
    parcelado: row.parcelado === true,
    parcela_numero: row.parcela_numero as number | undefined,
    parcela_total: row.parcela_total as number | undefined,
    grupo_parcelamento_id: row.grupo_parcelamento_id as string | undefined,
    classificacao_confirmada: row.classificacao_confirmada === true,
    classificacao_origem: row.classificacao_origem as Transacao['classificacao_origem'],
    classificacao_confianca: row.classificacao_confianca as number | undefined,
    hash: row.hash as string | undefined,
    origem_arquivo: row.origem_arquivo as string | undefined,
    usuario_id: row.usuario_id as string | undefined,
    origem_linha: row.origem_linha as number | undefined,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    updated_at: row.updated_at ? new Date(row.updated_at as string) : new Date(),
  }
}

export class TransacaoService implements ITransacaoService {
  /**
   * Helper: Recalcula orçamentos relacionados a uma transação
   */
  private async recalcularOrcamentosRelacionados(transacao: Transacao): Promise<void> {
    try {
      if (transacao.tipo !== 'despesa') return

      const dataTransacao = transacao.data instanceof Date ? transacao.data : new Date(transacao.data)
      const mesReferencia = format(dataTransacao, 'yyyy-MM')

      const orcamentos = await orcamentoService.listOrcamentos({ mesReferencia })

      for (const orcamento of orcamentos) {
        const isRelacionado =
          (orcamento.tipo === 'categoria' && orcamento.categoria_id === transacao.categoria_id) ||
          (orcamento.tipo === 'centro_custo' && orcamento.centro_custo_id === transacao.centro_custo_id)

        if (isRelacionado) {
          await orcamentoService.recalcularValorRealizado(orcamento.id)
        }
      }
    } catch (error) {
      console.error(
        `[TransacaoService] Erro ao recalcular orçamentos (txn=${transacao.id}):`,
        error instanceof Error ? error.message : error
      )
    }
  }

  /**
   * Cria uma transferência entre contas com duas transações vinculadas.
   */
  async createTransfer(
    contaOrigemId: string,
    contaDestinoId: string,
    valor: number,
    descricao: string,
    data?: Date | string
  ): Promise<{ origem: Transacao; destino: Transacao }> {
    if (!contaOrigemId || !contaDestinoId) {
      throw new ValidationError('Contas de origem e destino são obrigatórias')
    }
    if (contaOrigemId === contaDestinoId) {
      throw new ValidationError('Conta de origem e destino não podem ser a mesma')
    }
    if (!(valor > 0)) {
      throw new ValidationError('Valor da transferência deve ser positivo')
    }

    const supabase = getSupabase()
    const userId = await getUserId()
    const transferenciaId = crypto.randomUUID()
    const now = new Date()
    const dataTransacao = typeof data === 'string' ? new Date(data) : data || now

    const origemData = {
      id: crypto.randomUUID(),
      conta_id: contaOrigemId,
      categoria_id: null,
      data: dataTransacao.toISOString(),
      descricao: descricao || 'Transferência para conta destino',
      valor: -Math.abs(valor),
      tipo: 'transferencia',
      observacoes: null,
      tags: null,
      transferencia_id: transferenciaId,
      conta_destino_id: contaDestinoId,
      parcelado: false,
      classificacao_confirmada: true,
      classificacao_origem: 'manual',
      usuario_id: userId,
      hash: await generateHash(
        `${contaOrigemId}-${contaDestinoId}-${dataTransacao.toISOString()}-${descricao}-orig-${valor}`
      ),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    const destinoData = {
      id: crypto.randomUUID(),
      conta_id: contaDestinoId,
      categoria_id: null,
      data: dataTransacao.toISOString(),
      descricao: descricao || 'Transferência recebida',
      valor: Math.abs(valor),
      tipo: 'transferencia',
      observacoes: null,
      tags: null,
      transferencia_id: transferenciaId,
      conta_destino_id: null,
      parcelado: false,
      classificacao_confirmada: true,
      classificacao_origem: 'manual',
      usuario_id: userId,
      hash: await generateHash(
        `${contaOrigemId}-${contaDestinoId}-${dataTransacao.toISOString()}-${descricao}-dest-${valor}`
      ),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    const { data: inserted, error } = await supabase
      .from('transacoes')
      .insert([origemData, destinoData])
      .select()

    if (error) throw new DatabaseError('Erro ao criar transferência', error as unknown as Error)

    await contaService.recalcularESalvarSaldo(contaOrigemId)
    await contaService.recalcularESalvarSaldo(contaDestinoId)

    const rows = inserted || []
    const origem = rowToTransacao(rows.find((r: Record<string, unknown>) => r.conta_id === contaOrigemId) || rows[0])
    const destino = rowToTransacao(rows.find((r: Record<string, unknown>) => r.conta_id === contaDestinoId) || rows[1])

    return { origem, destino }
  }

  async listTransacoes(filters?: {
    contaId?: string
    categoriaId?: string
    dataInicio?: Date
    dataFim?: Date
    tipo?: string
    busca?: string
    limit?: number
    offset?: number
    sortBy?: 'data' | 'valor' | 'descricao'
    sortOrder?: 'asc' | 'desc'
  }): Promise<Transacao[]> {
    const supabase = getSupabase()
    const userId = await getUserId()
    const sortBy = filters?.sortBy || 'data'
    const sortOrder = filters?.sortOrder || 'desc'

    let query = supabase
      .from('transacoes')
      .select('*')
      .eq('usuario_id', userId)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (filters?.contaId) {
      query = query.eq('conta_id', filters.contaId)
    }

    if (filters?.categoriaId) {
      query = query.eq('categoria_id', filters.categoriaId)
    }

    if (filters?.dataInicio) {
      query = query.gte('data', filters.dataInicio.toISOString())
    }

    if (filters?.dataFim) {
      query = query.lte('data', filters.dataFim.toISOString())
    }

    if (filters?.tipo) {
      query = query.eq('tipo', filters.tipo)
    }

    if (filters?.busca) {
      query = query.ilike('descricao', `%${escapeLikePattern(filters.busca)}%`)
    }

    if (filters?.limit !== undefined) {
      const offset = filters?.offset || 0
      query = query.range(offset, offset + filters.limit - 1)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao listar transações', error as unknown as Error)

    return (data || []).map(rowToTransacao)
  }

  async getTransacaoById(id: string): Promise<Transacao | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('transacoes')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar transação', error as unknown as Error)

    return data ? rowToTransacao(data) : null
  }

  async getTransacaoByHash(hash: string): Promise<Transacao | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('transacoes')
      .select('*')
      .eq('hash', hash)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar transação por hash', error as unknown as Error)

    return data ? rowToTransacao(data) : null
  }

  async createTransacao(data: CreateTransacaoDTO): Promise<Transacao> {
    try {
      if (!data.conta_id || !data.descricao || !data.tipo) {
        throw new ValidationError('Dados insuficientes para criar transação')
      }

      const supabase = getSupabase()
      const userId = await getUserId()
      const now = new Date()

      const dataTransacao = typeof data.data === 'string' ? new Date(data.data) : (data.data || now)

      const canonicalHash = await generateTransactionHash(
        {
          data: dataTransacao,
          descricao: data.descricao,
          valor: data.valor,
        },
        data.conta_id
      )

      // Check for duplicates
      const { count } = await supabase
        .from('transacoes')
        .select('*', { count: 'exact', head: true })
        .eq('hash', canonicalHash)

      if (count && count > 0) {
        throw new DuplicateError('Transação', 'hash')
      }

      const { data: inserted, error } = await supabase
        .from('transacoes')
        .insert({
          id: crypto.randomUUID(),
          conta_id: data.conta_id,
          categoria_id: data.categoria_id || null,
          data: dataTransacao.toISOString(),
          descricao: data.descricao,
          valor: data.valor,
          tipo: data.tipo,
          observacoes: data.observacoes || null,
          tags: data.tags ? JSON.stringify(data.tags) : null,
          parcelado: false,
          classificacao_confirmada: !!data.categoria_id,
          classificacao_origem: data.categoria_id ? 'manual' : null,
          usuario_id: userId,
          hash: canonicalHash,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao criar transação', error as unknown as Error)

      const transacao = rowToTransacao(inserted)

      await contaService.recalcularESalvarSaldo(data.conta_id)
      await this.recalcularOrcamentosRelacionados(transacao)

      return transacao
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DuplicateError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao criar transação', error as Error)
    }
  }

  async updateTransacao(
    id: string,
    data: import('../types').UpdateTransacaoDTO
  ): Promise<Transacao> {
    try {
      const supabase = getSupabase()

      const existing = await this.getTransacaoById(id)
      if (!existing) {
        throw new NotFoundError('Transação', id)
      }

      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (data.conta_id !== undefined) updatePayload.conta_id = data.conta_id
      if (data.descricao !== undefined) updatePayload.descricao = data.descricao
      if (data.valor !== undefined) updatePayload.valor = data.valor
      if (data.tipo !== undefined) updatePayload.tipo = data.tipo
      if (data.observacoes !== undefined) updatePayload.observacoes = data.observacoes
      if (data.tags !== undefined) updatePayload.tags = JSON.stringify(data.tags)
      if (data.data !== undefined) {
        updatePayload.data = (typeof data.data === 'string' ? new Date(data.data) : data.data).toISOString()
      }

      if (data.categoria_id !== undefined) {
        updatePayload.categoria_id = data.categoria_id
        updatePayload.classificacao_confirmada = data.classificacao_confirmada ?? true
        updatePayload.classificacao_origem = data.classificacao_origem ?? 'manual'
        if (data.classificacao_confianca !== undefined) {
          updatePayload.classificacao_confianca = data.classificacao_confianca
        }
      }

      // Recalculate hash if relevant fields changed
      const nextContaId = (updatePayload.conta_id as string) ?? existing.conta_id
      const nextData = updatePayload.data
        ? new Date(updatePayload.data as string)
        : existing.data instanceof Date ? existing.data : new Date(existing.data)
      const nextDescricao = (updatePayload.descricao as string) ?? existing.descricao
      const nextValor = (updatePayload.valor as number) ?? existing.valor

      const hashRelevantChanged =
        nextContaId !== existing.conta_id ||
        nextDescricao !== existing.descricao ||
        nextValor !== existing.valor ||
        nextData.getTime() !== (existing.data instanceof Date ? existing.data.getTime() : new Date(existing.data).getTime())

      if (hashRelevantChanged) {
        const newHash = await generateTransactionHash(
          { data: nextData, descricao: nextDescricao, valor: nextValor },
          nextContaId
        )

        if (newHash !== existing.hash) {
          const { count } = await supabase
            .from('transacoes')
            .select('*', { count: 'exact', head: true })
            .eq('hash', newHash)
            .neq('id', id)

          if (count && count > 0) {
            throw new DuplicateError('Transação', 'hash')
          }
          updatePayload.hash = newHash
        }
      }

      const { data: updated, error } = await supabase
        .from('transacoes')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao atualizar transação', error as unknown as Error)

      const result = rowToTransacao(updated)

      await contaService.recalcularESalvarSaldo(existing.conta_id)
      if (data.conta_id && data.conta_id !== existing.conta_id) {
        await contaService.recalcularESalvarSaldo(data.conta_id)
      }

      await this.recalcularOrcamentosRelacionados(existing)
      await this.recalcularOrcamentosRelacionados(result)

      return result
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof DatabaseError ||
        error instanceof ValidationError ||
        error instanceof DuplicateError
      ) throw error
      throw new DatabaseError('Erro ao atualizar transação', error as Error)
    }
  }

  async deleteTransacao(id: string): Promise<void> {
    const supabase = getSupabase()

    const transacao = await this.getTransacaoById(id)
    if (!transacao) {
      throw new NotFoundError('Transação', id)
    }

    const { error } = await supabase.from('transacoes').delete().eq('id', id)
    if (error) throw new DatabaseError('Erro ao deletar transação', error as unknown as Error)

    await contaService.recalcularESalvarSaldo(transacao.conta_id)

    if (transacao.transferencia_id) {
      const { data: sibling } = await supabase
        .from('transacoes')
        .select('*')
        .eq('transferencia_id', transacao.transferencia_id)
        .neq('id', id)
        .maybeSingle()

      if (sibling) {
        await supabase.from('transacoes').delete().eq('id', sibling.id)
        await contaService.recalcularESalvarSaldo(sibling.conta_id)
      }
    } else if (transacao.tipo === 'transferencia' && transacao.conta_destino_id) {
      await contaService.recalcularESalvarSaldo(transacao.conta_destino_id)
    }

    await this.recalcularOrcamentosRelacionados(transacao)
  }

  async bulkUpdateCategoria(transacaoIds: string[], categoriaId: string): Promise<number> {
    const supabase = getSupabase()

    // Fetch existing categories before update
    const { data: existingRows } = await supabase
      .from('transacoes')
      .select('id, categoria_id')
      .in('id', transacaoIds)

    const categoriasAntigas = new Set<string>()
    for (const t of existingRows || []) {
      if (t.categoria_id) categoriasAntigas.add(t.categoria_id)
    }

    const { error, count } = await supabase
      .from('transacoes')
      .update({
        categoria_id: categoriaId,
        classificacao_confirmada: true,
        classificacao_origem: 'manual',
        updated_at: new Date().toISOString(),
      })
      .in('id', transacaoIds)

    if (error) throw new DatabaseError('Erro ao atualizar categorias', error as unknown as Error)

    // Recalculate orcamentos
    if (transacaoIds.length > 0) {
      const sampleTx = await this.getTransacaoById(transacaoIds[0]!)
      if (sampleTx) {
        await this.recalcularOrcamentosRelacionados(sampleTx)
        for (const catId of categoriasAntigas) {
          if (catId !== categoriaId) {
            await this.recalcularOrcamentosRelacionados({ ...sampleTx, categoria_id: catId } as Transacao)
          }
        }
      }
    }

    return count || transacaoIds.length
  }

  async bulkDelete(transacaoIds: string[]): Promise<number> {
    const supabase = getSupabase()

    // Fetch transactions to be deleted
    const { data: transacoes } = await supabase
      .from('transacoes')
      .select('id, conta_id, transferencia_id, tipo, conta_destino_id, categoria_id')
      .in('id', transacaoIds)

    const contasAfetadas = new Set<string>()
    const idsParaDeletar = new Set<string>(transacaoIds)

    for (const transacao of transacoes || []) {
      contasAfetadas.add(transacao.conta_id)

      if (transacao.transferencia_id) {
        const { data: siblings } = await supabase
          .from('transacoes')
          .select('id, conta_id')
          .eq('transferencia_id', transacao.transferencia_id)
          .not('id', 'in', `(${[...idsParaDeletar].join(',')})`)

        for (const sibling of siblings || []) {
          idsParaDeletar.add(sibling.id)
          contasAfetadas.add(sibling.conta_id)
        }
      } else if (transacao.tipo === 'transferencia' && transacao.conta_destino_id) {
        contasAfetadas.add(transacao.conta_destino_id)
      }

      if (transacao.tipo === 'despesa') {
        await this.recalcularOrcamentosRelacionados(rowToTransacao(transacao))
      }
    }

    const { error } = await supabase
      .from('transacoes')
      .delete()
      .in('id', [...idsParaDeletar])

    if (error) throw new DatabaseError('Erro ao deletar transações', error as unknown as Error)

    for (const contaId of contasAfetadas) {
      await contaService.recalcularESalvarSaldo(contaId)
    }

    return transacaoIds.length
  }

  async getGastosPorCategoria(
    dataInicio: Date,
    dataFim: Date
  ): Promise<{
    categoria_id: string
    categoria_nome: string
    categoria_icone: string
    categoria_cor: string
    total_gasto: number
    quantidade_transacoes: number
  }[]> {
    const supabase = getSupabase()

    const transacoes = await this.listTransacoes({ tipo: 'despesa', dataInicio, dataFim })

    const gastosPorCategoria = new Map<string, { total: number; quantidade: number }>()

    for (const t of transacoes) {
      if (!t.categoria_id) continue
      const valorAbsoluto = Math.abs(t.valor)
      const existing = gastosPorCategoria.get(t.categoria_id)
      if (existing) {
        existing.total += valorAbsoluto
        existing.quantidade += 1
      } else {
        gastosPorCategoria.set(t.categoria_id, { total: valorAbsoluto, quantidade: 1 })
      }
    }

    const categoriaIds = [...gastosPorCategoria.keys()]
    const { data: categorias } = categoriaIds.length > 0
      ? await supabase.from('categorias').select('id, nome, icone, cor').in('id', categoriaIds)
      : { data: [] }

    const categoriaMap = new Map((categorias || []).map((c: { id: string; nome: string; icone?: string; cor?: string }) => [c.id, c]))

    return Array.from(gastosPorCategoria.entries())
      .map(([categoriaId, gasto]) => {
        const categoria = categoriaMap.get(categoriaId)
        return {
          categoria_id: categoriaId,
          categoria_nome: (categoria as { nome: string } | undefined)?.nome || 'Sem categoria',
          categoria_icone: (categoria as { icone?: string } | undefined)?.icone || '📦',
          categoria_cor: (categoria as { cor?: string } | undefined)?.cor || '#6B7280',
          total_gasto: roundCurrency(gasto.total),
          quantidade_transacoes: gasto.quantidade,
        }
      })
      .sort((a, b) => b.total_gasto - a.total_gasto)
  }

  async getTransacoesNaoClassificadas(filters?: {
    contaId?: string
    dataInicio?: Date
    dataFim?: Date
    tipo?: string
    limit?: number
    offset?: number
  }): Promise<Transacao[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    let query = supabase
      .from('transacoes')
      .select('*')
      .eq('usuario_id', userId)
      .is('categoria_id', null)
      .order('data', { ascending: false })

    if (filters?.contaId) query = query.eq('conta_id', filters.contaId)
    if (filters?.dataInicio) query = query.gte('data', filters.dataInicio.toISOString())
    if (filters?.dataFim) query = query.lte('data', filters.dataFim.toISOString())
    if (filters?.tipo) query = query.eq('tipo', filters.tipo)

    if (filters?.limit !== undefined) {
      const offset = filters?.offset || 0
      query = query.range(offset, offset + filters.limit - 1)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao buscar transações não classificadas', error as unknown as Error)

    return (data || []).map(rowToTransacao)
  }

  async bulkUpdateTags(transacaoIds: string[], tags: string[]): Promise<number> {
    const supabase = getSupabase()

    const { error, count } = await supabase
      .from('transacoes')
      .update({
        tags: JSON.stringify(tags),
        updated_at: new Date().toISOString(),
      })
      .in('id', transacaoIds)

    if (error) throw new DatabaseError('Erro ao atualizar tags', error as unknown as Error)

    return count || transacaoIds.length
  }

  async getVariacoesPorCategoria(
    periodoAtualInicio: Date,
    periodoAtualFim: Date,
    periodoAnteriorInicio: Date,
    periodoAnteriorFim: Date
  ): Promise<{
    categoria_id: string
    categoria_nome: string
    categoria_icone: string
    categoria_cor: string
    total_gasto_atual: number
    total_gasto_anterior: number
    variacao_absoluta: number
    variacao_percentual: number
    quantidade_transacoes: number
  }[]> {
    const supabase = getSupabase()

    const transacoesAtuais = await this.listTransacoes({
      tipo: 'despesa',
      dataInicio: periodoAtualInicio,
      dataFim: periodoAtualFim,
    })

    const transacoesAnteriores = await this.listTransacoes({
      tipo: 'despesa',
      dataInicio: periodoAnteriorInicio,
      dataFim: periodoAnteriorFim,
    })

    const gastosAtuais = new Map<string, number>()
    for (const t of transacoesAtuais) {
      if (!t.categoria_id) continue
      gastosAtuais.set(t.categoria_id, (gastosAtuais.get(t.categoria_id) || 0) + Math.abs(t.valor))
    }

    const gastosAnteriores = new Map<string, number>()
    for (const t of transacoesAnteriores) {
      if (!t.categoria_id) continue
      gastosAnteriores.set(t.categoria_id, (gastosAnteriores.get(t.categoria_id) || 0) + Math.abs(t.valor))
    }

    const quantidades = new Map<string, number>()
    for (const t of transacoesAtuais) {
      if (!t.categoria_id) continue
      quantidades.set(t.categoria_id, (quantidades.get(t.categoria_id) || 0) + 1)
    }

    const todasCategoriaIds = new Set([...gastosAtuais.keys(), ...gastosAnteriores.keys()])
    const categoriaIds = [...todasCategoriaIds]

    const { data: categorias } = categoriaIds.length > 0
      ? await supabase.from('categorias').select('id, nome, icone, cor').in('id', categoriaIds)
      : { data: [] }

    const categoriaMap = new Map((categorias || []).map((c: { id: string; nome: string; icone?: string; cor?: string }) => [c.id, c]))

    return Array.from(todasCategoriaIds)
      .map((categoriaId) => {
        const categoria = categoriaMap.get(categoriaId)
        const gastoAtual = gastosAtuais.get(categoriaId) || 0
        const gastoAnterior = gastosAnteriores.get(categoriaId) || 0
        const variacaoAbsoluta = gastoAtual - gastoAnterior
        const variacaoPercentual = gastoAnterior > 0
          ? ((gastoAtual - gastoAnterior) / gastoAnterior) * 100
          : gastoAtual > 0 ? 100 : 0

        return {
          categoria_id: categoriaId,
          categoria_nome: (categoria as { nome: string } | undefined)?.nome || 'Sem categoria',
          categoria_icone: (categoria as { icone?: string } | undefined)?.icone || '📦',
          categoria_cor: (categoria as { cor?: string } | undefined)?.cor || '#6B7280',
          total_gasto_atual: roundCurrency(gastoAtual),
          total_gasto_anterior: roundCurrency(gastoAnterior),
          variacao_absoluta: roundCurrency(variacaoAbsoluta),
          variacao_percentual: roundCurrency(variacaoPercentual),
          quantidade_transacoes: quantidades.get(categoriaId) || 0,
        }
      })
      .sort((a, b) => Math.abs(b.variacao_absoluta) - Math.abs(a.variacao_absoluta))
  }
}

// Singleton instance
export const transacaoService = new TransacaoService()
