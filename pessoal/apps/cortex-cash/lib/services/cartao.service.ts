/**
 * Serviço de Cartões de Crédito
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD e consultas para cartões, faturas e lançamentos
 */

import { getSupabase } from '../db/supabase'
import { DatabaseError, NotFoundError, ValidationError } from '../errors'
import type {
  Bandeira,
  CartaoComRelacoes,
  CartaoConfig,
  CicloFatura,
  Conta,
  CreateCartaoDTO,
  CreateFaturaDTO,
  CreateFaturaLancamentoDTO,
  Fatura,
  FaturaDetalhada,
  FaturaLancamento,
  PagarFaturaDTO,
  ProjecaoFatura,
  TipoConta,
} from '../types'
import {
  cartaoSchema,
  faturaLancamentoSchema,
  faturaSchema,
  pagarFaturaSchema,
} from '../validations'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function rowToCartao(row: Record<string, unknown>): CartaoConfig {
  return {
    id: row.id as string,
    instituicao_id: row.instituicao_id as string,
    nome: row.nome as string,
    bandeira: row.bandeira as Bandeira | undefined,
    limite_total: row.limite_total as number,
    dia_fechamento: row.dia_fechamento as number,
    dia_vencimento: row.dia_vencimento as number,
    conta_pagamento_id: row.conta_pagamento_id as string | undefined,
    ativo: row.ativo as boolean,
    cor: row.cor as string | undefined,
    pluggy_id: row.pluggy_id as string | undefined,
    usuario_id: row.usuario_id as string,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  }
}

function rowToFatura(row: Record<string, unknown>): Fatura {
  return {
    id: row.id as string,
    cartao_id: row.cartao_id as string,
    mes_referencia: row.mes_referencia as string,
    data_fechamento: new Date(row.data_fechamento as string),
    data_vencimento: new Date(row.data_vencimento as string),
    valor_total: row.valor_total as number,
    valor_minimo: row.valor_minimo as number,
    valor_pago: row.valor_pago as number,
    status: row.status as 'aberta' | 'fechada' | 'paga',
    fechada_automaticamente: row.fechada_automaticamente as boolean,
    data_pagamento: row.data_pagamento ? new Date(row.data_pagamento as string) : undefined,
    transacao_pagamento_id: row.transacao_pagamento_id as string | undefined,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  }
}

function rowToLancamento(row: Record<string, unknown>): FaturaLancamento {
  return {
    id: row.id as string,
    fatura_id: row.fatura_id as string,
    transacao_id: row.transacao_id as string | undefined,
    data_compra: new Date(row.data_compra as string),
    descricao: row.descricao as string,
    valor_brl: row.valor_brl as number,
    parcela_numero: row.parcela_numero as number | undefined,
    parcela_total: row.parcela_total as number | undefined,
    moeda_original: row.moeda_original as string | undefined,
    valor_original: row.valor_original as number | undefined,
    taxa_cambio: row.taxa_cambio as number | undefined,
    categoria_id: row.categoria_id as string | undefined,
    created_at: new Date(row.created_at as string),
  }
}

function rowToConta(row: Record<string, unknown>): Conta {
  return {
    id: row.id as string,
    instituicao_id: row.instituicao_id as string,
    nome: row.nome as string,
    tipo: row.tipo as TipoConta,
    saldo_referencia: row.saldo_referencia as number,
    data_referencia: new Date(row.data_referencia as string),
    saldo_atual: row.saldo_atual as number,
    ativa: row.ativa as boolean,
    cor: row.cor as string | undefined,
    icone: row.icone as string | undefined,
    observacoes: row.observacoes as string | undefined,
    pluggy_id: row.pluggy_id as string | undefined,
    usuario_id: row.usuario_id as string,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  }
}

export class CartaoService {
  // ============================================================================
  // CARTÕES - CRUD
  // ============================================================================

  /**
   * Lista todos os cartões
   */
  async listCartoes(options?: {
    incluirInativos?: boolean
    instituicaoId?: string
    limit?: number
    offset?: number
    sortBy?: 'nome' | 'limite_total' | 'dia_vencimento' | 'created_at'
    sortOrder?: 'asc' | 'desc'
  }): Promise<CartaoConfig[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const incluirInativos = options?.incluirInativos || false
    const sortBy = options?.sortBy || 'nome'
    const sortOrder = options?.sortOrder || 'asc'

    let query = supabase
      .from('cartoes_config')
      .select('*')
      .eq('usuario_id', userId)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (!incluirInativos) {
      query = query.eq('ativo', true)
    }

    if (options?.instituicaoId) {
      query = query.eq('instituicao_id', options.instituicaoId)
    }

    if (options?.limit !== undefined) {
      const offset = options?.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    } else if (options?.offset && options.offset > 0) {
      query = query.range(options.offset, 999999)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao listar cartões', error as unknown as Error)

    return (data || []).map(rowToCartao)
  }

  /**
   * Busca um cartão por ID
   */
  async getCartaoById(id: string): Promise<CartaoConfig | null> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('cartoes_config')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar cartão', error as unknown as Error)

    return data ? rowToCartao(data) : null
  }

  /**
   * Busca cartão com todas as relações
   */
  async getCartaoComRelacoes(id: string): Promise<CartaoComRelacoes | null> {
    const supabase = getSupabase()

    const cartao = await this.getCartaoById(id)
    if (!cartao) return null

    const { data: instData, error: instError } = await supabase
      .from('instituicoes')
      .select('*')
      .eq('id', cartao.instituicao_id)
      .maybeSingle()

    if (instError) throw new DatabaseError('Erro ao buscar instituição', instError as unknown as Error)
    if (!instData) throw new NotFoundError('Instituição', cartao.instituicao_id)

    const instituicao = {
      id: instData.id as string,
      nome: instData.nome as string,
      codigo: instData.codigo as string | undefined,
      tipo: instData.tipo as string,
      logo_url: instData.logo_url as string | undefined,
      cor_primaria: instData.cor_primaria as string | undefined,
      site: instData.site as string | undefined,
      created_at: new Date(instData.created_at as string),
      updated_at: new Date(instData.updated_at as string),
    }

    let conta_pagamento: Conta | undefined
    if (cartao.conta_pagamento_id) {
      const { data: contaData } = await supabase
        .from('contas')
        .select('*')
        .eq('id', cartao.conta_pagamento_id)
        .maybeSingle()
      conta_pagamento = contaData ? rowToConta(contaData) : undefined
    }

    const { data: faturasData } = await supabase
      .from('faturas')
      .select('*')
      .eq('cartao_id', id)

    const faturas = (faturasData || []).map(rowToFatura)

    return {
      ...cartao,
      instituicao,
      conta_pagamento,
      faturas,
    }
  }

  /**
   * Cria um novo cartão
   */
  async createCartao(data: CreateCartaoDTO): Promise<CartaoConfig> {
    const supabase = getSupabase()
    const userId = await getUserId()

    // Validar com Zod
    const validationResult = cartaoSchema.safeParse(data)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError('Erro de validação ao criar cartão', errors)
    }

    // Validar se a instituição existe
    const { data: instData } = await supabase
      .from('instituicoes')
      .select('id')
      .eq('id', data.instituicao_id)
      .maybeSingle()

    if (!instData) throw new NotFoundError('Instituição', data.instituicao_id)

    // Validar se a conta de pagamento existe e está ativa (se fornecida)
    if (data.conta_pagamento_id) {
      const { data: contaData } = await supabase
        .from('contas')
        .select('*')
        .eq('id', data.conta_pagamento_id)
        .maybeSingle()

      if (!contaData) throw new NotFoundError('Conta de pagamento', data.conta_pagamento_id)
      if (!contaData.ativa) throw new ValidationError('Não é possível vincular cartão a uma conta inativa')
      if (contaData.tipo !== 'corrente') {
        throw new ValidationError('Apenas contas-corrente podem ser usadas para pagamento de faturas')
      }
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const { data: inserted, error } = await supabase
      .from('cartoes_config')
      .insert({
        ...data,
        id,
        ativo: true,
        usuario_id: userId,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw new DatabaseError('Erro ao criar cartão', error as unknown as Error)

    return rowToCartao(inserted)
  }

  /**
   * Atualiza um cartão
   */
  async updateCartao(
    id: string,
    data: Partial<Omit<CreateCartaoDTO, 'instituicao_id'>>
  ): Promise<CartaoConfig> {
    const supabase = getSupabase()

    const existing = await this.getCartaoById(id)
    if (!existing) throw new NotFoundError('Cartão', id)

    // Validar parcialmente
    const validationResult = cartaoSchema.partial().safeParse(data)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError('Erro de validação ao atualizar cartão', errors)
    }

    // Validar se a conta de pagamento existe e está ativa (se fornecida)
    if (data.conta_pagamento_id !== undefined) {
      if (data.conta_pagamento_id) {
        const { data: contaData } = await supabase
          .from('contas')
          .select('*')
          .eq('id', data.conta_pagamento_id)
          .maybeSingle()

        if (!contaData) throw new NotFoundError('Conta de pagamento', data.conta_pagamento_id)
        if (!contaData.ativa) throw new ValidationError('Não é possível vincular cartão a uma conta inativa')
        if (contaData.tipo !== 'corrente') {
          throw new ValidationError('Apenas contas-corrente podem ser usadas para pagamento de faturas')
        }
      }
    }

    const { data: updated, error } = await supabase
      .from('cartoes_config')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new DatabaseError('Erro ao atualizar cartão', error as unknown as Error)

    return rowToCartao(updated)
  }

  /**
   * Ativa/desativa um cartão
   */
  async toggleAtivo(id: string): Promise<CartaoConfig> {
    const supabase = getSupabase()

    const cartao = await this.getCartaoById(id)
    if (!cartao) throw new NotFoundError('Cartão', id)

    const { data: updated, error } = await supabase
      .from('cartoes_config')
      .update({
        ativo: !cartao.ativo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new DatabaseError('Erro ao atualizar cartão', error as unknown as Error)

    return rowToCartao(updated)
  }

  /**
   * Deleta um cartão (soft delete - apenas desativa)
   */
  async deleteCartao(id: string): Promise<void> {
    const supabase = getSupabase()
    await supabase
      .from('cartoes_config')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
  }

  /**
   * Deleta permanentemente um cartão e seus dados relacionados
   */
  async hardDeleteCartao(id: string): Promise<void> {
    const supabase = getSupabase()

    // Collect related fatura IDs
    const { data: faturasData } = await supabase
      .from('faturas')
      .select('id')
      .eq('cartao_id', id)

    const faturaIds = (faturasData || []).map((f: Record<string, unknown>) => f.id as string)

    // Delete lancamentos for all faturas
    if (faturaIds.length > 0) {
      await supabase.from('faturas_lancamentos').delete().in('fatura_id', faturaIds)
    }

    // Delete faturas
    if (faturaIds.length > 0) {
      await supabase.from('faturas').delete().in('id', faturaIds)
    }

    // Delete cartao
    const { error } = await supabase.from('cartoes_config').delete().eq('id', id)
    if (error) throw new DatabaseError('Erro ao deletar cartão', error as unknown as Error)
  }

  // ============================================================================
  // FATURAS - CRUD
  // ============================================================================

  /**
   * Lista faturas de um cartão
   */
  async listFaturas(
    cartaoId: string,
    options?: {
      status?: string
      limit?: number
      offset?: number
      sortBy?: 'mes_referencia' | 'data_vencimento' | 'valor_total'
      sortOrder?: 'asc' | 'desc'
    }
  ): Promise<Fatura[]> {
    const supabase = getSupabase()

    const sortBy = options?.sortBy || 'mes_referencia'
    const sortOrder = options?.sortOrder || 'desc'

    let query = supabase
      .from('faturas')
      .select('*')
      .eq('cartao_id', cartaoId)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.limit !== undefined) {
      const offset = options?.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    } else if (options?.offset && options.offset > 0) {
      query = query.range(options.offset, 999999)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao listar faturas', error as unknown as Error)

    return (data || []).map(rowToFatura)
  }

  /**
   * Busca uma fatura por ID
   */
  async getFaturaById(id: string): Promise<Fatura | null> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('faturas')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar fatura', error as unknown as Error)

    return data ? rowToFatura(data) : null
  }

  /**
   * Busca fatura com lançamentos
   */
  async getFaturaDetalhada(id: string): Promise<FaturaDetalhada | null> {
    const supabase = getSupabase()

    const fatura = await this.getFaturaById(id)
    if (!fatura) return null

    const cartao = await this.getCartaoById(fatura.cartao_id)
    if (!cartao) throw new NotFoundError('Cartão', fatura.cartao_id)

    const { data: lancamentosData } = await supabase
      .from('faturas_lancamentos')
      .select('*')
      .eq('fatura_id', id)

    const lancamentos = (lancamentosData || []).map(rowToLancamento)

    return {
      ...fatura,
      cartao,
      lancamentos,
      total_lancamentos: lancamentos.length,
    }
  }

  /**
   * Cria uma nova fatura
   */
  async createFatura(data: CreateFaturaDTO): Promise<Fatura> {
    // Validar com Zod
    const validationResult = faturaSchema.safeParse(data)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError('Erro de validação ao criar fatura', errors)
    }

    const supabase = getSupabase()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const { data: inserted, error } = await supabase
      .from('faturas')
      .insert({
        id,
        cartao_id: data.cartao_id,
        mes_referencia: data.mes_referencia,
        data_fechamento:
          data.data_fechamento instanceof Date
            ? data.data_fechamento.toISOString()
            : new Date(data.data_fechamento).toISOString(),
        data_vencimento:
          data.data_vencimento instanceof Date
            ? data.data_vencimento.toISOString()
            : new Date(data.data_vencimento).toISOString(),
        valor_total: data.valor_total || 0,
        valor_minimo: data.valor_minimo || 0,
        valor_pago: data.valor_pago || 0,
        status: data.status || 'aberta',
        fechada_automaticamente: data.fechada_automaticamente || false,
        data_pagamento: data.data_pagamento
          ? data.data_pagamento instanceof Date
            ? data.data_pagamento.toISOString()
            : new Date(data.data_pagamento).toISOString()
          : null,
        transacao_pagamento_id: data.transacao_pagamento_id || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw new DatabaseError('Erro ao criar fatura', error as unknown as Error)

    return rowToFatura(inserted)
  }

  /**
   * Atualiza uma fatura
   */
  async updateFatura(
    id: string,
    data: Partial<Omit<CreateFaturaDTO, 'cartao_id'>>
  ): Promise<Fatura> {
    const supabase = getSupabase()

    const existing = await this.getFaturaById(id)
    if (!existing) throw new NotFoundError('Fatura', id)

    // Convert dates to ISO strings
    const updateData: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() }
    if (updateData.data_fechamento) {
      updateData.data_fechamento =
        updateData.data_fechamento instanceof Date
          ? (updateData.data_fechamento as Date).toISOString()
          : new Date(updateData.data_fechamento as string).toISOString()
    }
    if (updateData.data_vencimento) {
      updateData.data_vencimento =
        updateData.data_vencimento instanceof Date
          ? (updateData.data_vencimento as Date).toISOString()
          : new Date(updateData.data_vencimento as string).toISOString()
    }
    if (updateData.data_pagamento) {
      updateData.data_pagamento =
        updateData.data_pagamento instanceof Date
          ? (updateData.data_pagamento as Date).toISOString()
          : new Date(updateData.data_pagamento as string).toISOString()
    }

    const { data: updated, error } = await supabase
      .from('faturas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new DatabaseError('Erro ao atualizar fatura', error as unknown as Error)

    return rowToFatura(updated)
  }

  /**
   * Deleta uma fatura
   */
  async deleteFatura(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('faturas').delete().eq('id', id)
    if (error) throw new DatabaseError('Erro ao deletar fatura', error as unknown as Error)
  }

  // ============================================================================
  // LANÇAMENTOS DE FATURA - CRUD
  // ============================================================================

  /**
   * Lista lançamentos de uma fatura
   */
  async listLancamentos(faturaId: string): Promise<FaturaLancamento[]> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('faturas_lancamentos')
      .select('*')
      .eq('fatura_id', faturaId)
      .order('data_compra', { ascending: false })

    if (error) throw new DatabaseError('Erro ao listar lançamentos', error as unknown as Error)

    return (data || []).map(rowToLancamento)
  }

  /**
   * Busca um lançamento por ID
   */
  async getLancamentoById(id: string): Promise<FaturaLancamento | null> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('faturas_lancamentos')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar lançamento', error as unknown as Error)

    return data ? rowToLancamento(data) : null
  }

  /**
   * Cria um novo lançamento
   */
  async createLancamento(data: CreateFaturaLancamentoDTO): Promise<FaturaLancamento> {
    // Validar com Zod
    const validationResult = faturaLancamentoSchema.safeParse(data)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError('Erro de validação ao criar lançamento', errors)
    }

    const supabase = getSupabase()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const { data: inserted, error } = await supabase
      .from('faturas_lancamentos')
      .insert({
        id,
        fatura_id: data.fatura_id,
        transacao_id: data.transacao_id || null,
        data_compra:
          data.data_compra instanceof Date
            ? data.data_compra.toISOString()
            : new Date(data.data_compra).toISOString(),
        descricao: data.descricao,
        valor_brl: data.valor_brl,
        parcela_numero: data.parcela_numero || null,
        parcela_total: data.parcela_total || null,
        moeda_original: data.moeda_original || null,
        valor_original: data.valor_original || null,
        taxa_cambio: data.taxa_cambio || null,
        categoria_id: data.categoria_id || null,
        created_at: now,
      })
      .select()
      .single()

    if (error) throw new DatabaseError('Erro ao criar lançamento', error as unknown as Error)

    // Recalcular valor total da fatura
    await this.recalcularValorFatura(data.fatura_id)

    return rowToLancamento(inserted)
  }

  /**
   * Atualiza um lançamento
   */
  async updateLancamento(
    id: string,
    data: Partial<Omit<CreateFaturaLancamentoDTO, 'fatura_id'>>
  ): Promise<FaturaLancamento> {
    const supabase = getSupabase()

    const existing = await this.getLancamentoById(id)
    if (!existing) throw new NotFoundError('Lançamento', id)

    const updateData: Record<string, unknown> = { ...data }
    if (updateData.data_compra) {
      updateData.data_compra =
        updateData.data_compra instanceof Date
          ? (updateData.data_compra as Date).toISOString()
          : new Date(updateData.data_compra as string).toISOString()
    }

    const { data: updated, error } = await supabase
      .from('faturas_lancamentos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new DatabaseError('Erro ao atualizar lançamento', error as unknown as Error)

    // Recalcular valor total da fatura
    await this.recalcularValorFatura(existing.fatura_id)

    return rowToLancamento(updated)
  }

  /**
   * Deleta um lançamento
   */
  async deleteLancamento(id: string): Promise<void> {
    const supabase = getSupabase()

    const lancamento = await this.getLancamentoById(id)
    if (!lancamento) throw new NotFoundError('Lançamento', id)

    const { error } = await supabase.from('faturas_lancamentos').delete().eq('id', id)
    if (error) throw new DatabaseError('Erro ao deletar lançamento', error as unknown as Error)

    // Recalcular valor total da fatura
    await this.recalcularValorFatura(lancamento.fatura_id)
  }

  // ============================================================================
  // OPERAÇÕES ESPECIAIS
  // ============================================================================

  /**
   * Recalcula o valor total de uma fatura baseado nos lançamentos
   */
  async recalcularValorFatura(faturaId: string): Promise<void> {
    const supabase = getSupabase()

    const { data: lancamentosData } = await supabase
      .from('faturas_lancamentos')
      .select('valor_brl')
      .eq('fatura_id', faturaId)

    const valorTotal = (lancamentosData || []).reduce(
      (sum: number, l: Record<string, unknown>) => sum + (l.valor_brl as number),
      0
    )

    // Valor mínimo geralmente é 15% do total
    const valorMinimo = valorTotal * 0.15

    await supabase
      .from('faturas')
      .update({
        valor_total: valorTotal,
        valor_minimo: valorMinimo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', faturaId)
  }

  /**
   * Calcula o ciclo da fatura para um mês específico
   */
  calcularCicloFatura(cartao: CartaoConfig, mesReferencia: string): CicloFatura {
    const [ano, mes] = mesReferencia.split('-').map(Number) as [number, number]

    // Data de fechamento: último dia do período
    const dataFechamento = new Date(ano, mes - 1, cartao.dia_fechamento)

    // Data de vencimento: após o fechamento
    let dataVencimento = new Date(ano, mes - 1, cartao.dia_vencimento)
    if (cartao.dia_vencimento < cartao.dia_fechamento) {
      // Se vencimento é antes do fechamento, está no próximo mês
      dataVencimento = new Date(ano, mes, cartao.dia_vencimento)
    }

    // Data de início: dia após fechamento do mês anterior
    const dataInicio = new Date(ano, mes - 2, cartao.dia_fechamento + 1)

    return {
      data_inicio: dataInicio,
      data_fim: dataFechamento,
      data_vencimento: dataVencimento,
      mes_referencia: mesReferencia,
    }
  }

  /**
   * Paga uma fatura (cria transação e atualiza fatura)
   */
  async pagarFatura(data: PagarFaturaDTO): Promise<void> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const fatura = await this.getFaturaById(data.fatura_id)
    if (!fatura) throw new NotFoundError('Fatura', data.fatura_id)

    const cartao = await this.getCartaoById(fatura.cartao_id)
    if (!cartao) throw new NotFoundError('Cartão', fatura.cartao_id)

    // Se não foi fornecida conta de pagamento, usa a configurada no cartão
    let contaPagamentoId = data.conta_pagamento_id
    if (!contaPagamentoId && cartao.conta_pagamento_id) {
      contaPagamentoId = cartao.conta_pagamento_id
    }

    // Validar com dados completos
    const dataCompleta = { ...data, conta_pagamento_id: contaPagamentoId }
    const validationResult = pagarFaturaSchema.safeParse(dataCompleta)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError('Erro de validação ao pagar fatura', errors)
    }

    // Validar que o valor pago não excede o valor total da fatura
    if (data.valor_pago > fatura.valor_total) {
      throw new ValidationError('Valor pago não pode ser maior que o valor total da fatura')
    }

    const { data: contaData } = await supabase
      .from('contas')
      .select('id')
      .eq('id', contaPagamentoId)
      .maybeSingle()

    if (!contaData) throw new NotFoundError('Conta', contaPagamentoId)

    // Criar transação de pagamento
    const transacaoId = crypto.randomUUID()
    const now = new Date().toISOString()
    const dataPagamento =
      data.data_pagamento instanceof Date
        ? data.data_pagamento.toISOString()
        : new Date(data.data_pagamento).toISOString()

    const { error: txError } = await supabase.from('transacoes').insert({
      id: transacaoId,
      conta_id: contaPagamentoId,
      categoria_id: null,
      data: dataPagamento,
      descricao: `Pagamento Fatura - ${fatura.mes_referencia}`,
      valor: data.valor_pago,
      tipo: 'despesa',
      observacoes: data.observacoes || null,
      tags: null,
      transferencia_id: null,
      conta_destino_id: null,
      parcelado: false,
      parcela_numero: null,
      parcela_total: null,
      grupo_parcelamento_id: null,
      classificacao_confirmada: true,
      classificacao_origem: 'manual',
      classificacao_confianca: 1,
      hash: null,
      origem_arquivo: null,
      origem_linha: null,
      usuario_id: userId,
      created_at: now,
      updated_at: now,
    })

    if (txError) throw new DatabaseError('Erro ao criar transação de pagamento', txError as unknown as Error)

    // Atualizar fatura
    await supabase.from('faturas').update({
      valor_pago: data.valor_pago,
      data_pagamento: dataPagamento,
      transacao_pagamento_id: transacaoId,
      status: data.valor_pago >= fatura.valor_total ? 'paga' : 'fechada',
      updated_at: now,
    }).eq('id', data.fatura_id)
  }

  /**
   * Obtém projeção de gastos da fatura
   */
  async getProjecaoFatura(faturaId: string): Promise<ProjecaoFatura | null> {
    const supabase = getSupabase()

    const fatura = await this.getFaturaById(faturaId)
    if (!fatura) return null

    const cartao = await this.getCartaoById(fatura.cartao_id)
    if (!cartao) return null

    const { data: lancamentosData } = await supabase
      .from('faturas_lancamentos')
      .select('valor_brl')
      .eq('fatura_id', faturaId)

    const valorAtual = (lancamentosData || []).reduce(
      (sum: number, l: Record<string, unknown>) => sum + (l.valor_brl as number),
      0
    )

    const hoje = new Date()
    const dataFechamento =
      fatura.data_fechamento instanceof Date
        ? fatura.data_fechamento
        : new Date(fatura.data_fechamento)
    const diasRestantes = Math.max(
      0,
      Math.ceil((dataFechamento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    )

    // Calcular dias desde início do ciclo
    const ciclo = this.calcularCicloFatura(cartao, fatura.mes_referencia)
    const diasCiclo = Math.ceil(
      (dataFechamento.getTime() - ciclo.data_inicio.getTime()) / (1000 * 60 * 60 * 24)
    )
    const diasDecorridos = diasCiclo - diasRestantes

    const mediaDiaria = diasDecorridos > 0 ? valorAtual / diasDecorridos : 0
    const valorProjetado = mediaDiaria > 0 ? valorAtual + mediaDiaria * diasRestantes : valorAtual

    const limiteDisponivel = cartao.limite_total - valorAtual
    const percentualLimite = (valorAtual / cartao.limite_total) * 100

    return {
      fatura,
      valor_atual: valorAtual,
      valor_projetado: valorProjetado,
      dias_restantes: diasRestantes,
      media_diaria: mediaDiaria,
      limite_disponivel: limiteDisponivel,
      percentual_limite: percentualLimite,
    }
  }

  /**
   * Obtém ou cria fatura atual de um cartão
   */
  async getOrCreateFaturaAtual(cartaoId: string): Promise<Fatura> {
    const supabase = getSupabase()

    const cartao = await this.getCartaoById(cartaoId)
    if (!cartao) throw new NotFoundError('Cartão', cartaoId)

    // Determinar mês de referência atual
    const hoje = new Date()
    const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

    // Buscar fatura do mês
    const { data: faturaData } = await supabase
      .from('faturas')
      .select('*')
      .eq('cartao_id', cartaoId)
      .eq('mes_referencia', mesReferencia)
      .maybeSingle()

    if (faturaData) return rowToFatura(faturaData)

    // Criar nova fatura
    const ciclo = this.calcularCicloFatura(cartao, mesReferencia)

    return this.createFatura({
      cartao_id: cartaoId,
      mes_referencia: mesReferencia,
      data_fechamento: ciclo.data_fim,
      data_vencimento: ciclo.data_vencimento,
      valor_total: 0,
      valor_minimo: 0,
      valor_pago: 0,
      status: 'aberta',
      fechada_automaticamente: false,
    })
  }

  /**
   * Fecha uma fatura manualmente
   */
  async fecharFatura(faturaId: string): Promise<Fatura> {
    const supabase = getSupabase()

    const fatura = await this.getFaturaById(faturaId)
    if (!fatura) throw new NotFoundError('Fatura', faturaId)

    if (fatura.status !== 'aberta') {
      throw new ValidationError(
        `Fatura já está ${fatura.status}. Apenas faturas abertas podem ser fechadas.`
      )
    }

    // Recalcula valor total baseado nos lançamentos
    const { data: lancamentosData } = await supabase
      .from('faturas_lancamentos')
      .select('valor_brl')
      .eq('fatura_id', faturaId)

    const valorTotal = (lancamentosData || []).reduce(
      (sum: number, l: Record<string, unknown>) => sum + (l.valor_brl as number),
      0
    )
    const valorMinimo = valorTotal * 0.15

    const { data: updated, error } = await supabase
      .from('faturas')
      .update({
        status: 'fechada',
        fechada_automaticamente: false,
        valor_total: valorTotal,
        valor_minimo: valorMinimo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', faturaId)
      .select()
      .single()

    if (error) throw new DatabaseError('Erro ao fechar fatura', error as unknown as Error)

    return rowToFatura(updated)
  }

  /**
   * Fecha automaticamente faturas vencidas
   */
  async fecharFaturasVencidas(): Promise<number> {
    const supabase = getSupabase()
    const hoje = new Date()

    const { data: faturasData } = await supabase
      .from('faturas')
      .select('*')
      .eq('status', 'aberta')
      .lt('data_fechamento', hoje.toISOString())

    let contadorFechadas = 0

    for (const faturaRow of faturasData || []) {
      const fatura = rowToFatura(faturaRow)
      try {
        await this.fecharFatura(fatura.id)
        contadorFechadas++
      } catch (error) {
        console.error(
          `[CartaoService] Erro ao fechar fatura ${fatura.id} (cartão=${fatura.cartao_id}, ref=${fatura.mes_referencia}):`,
          error instanceof Error ? error.message : error
        )
      }
    }

    return contadorFechadas
  }

  /**
   * Calcula limite disponível de um cartão.
   */
  async getLimiteDisponivel(cartaoId: string): Promise<{
    limite_total: number
    limite_usado: number
    limite_disponivel: number
    percentual_usado: number
    gastos_mes: number
  }> {
    const supabase = getSupabase()

    const cartao = await this.getCartaoById(cartaoId)
    if (!cartao) throw new NotFoundError('Cartão', cartaoId)

    let gastosMes = 0

    // Try to calculate from CC fatura account transactions (Pluggy sync)
    if (cartao.pluggy_id) {
      const ccPluggyId = `cc_${cartao.pluggy_id}`
      const { data: ccContaData } = await supabase
        .from('contas')
        .select('id')
        .eq('pluggy_id', ccPluggyId)
        .maybeSingle()

      if (ccContaData) {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        const { data: txData } = await supabase
          .from('transacoes')
          .select('valor')
          .eq('conta_id', (ccContaData as Record<string, unknown>).id as string)
          .eq('tipo', 'despesa')
          .gte('data', monthStart.toISOString())
          .lte('data', monthEnd.toISOString())

        gastosMes = (txData || []).reduce(
          (sum: number, t: Record<string, unknown>) => sum + Math.abs(t.valor as number),
          0
        )
      }
    }

    // Fallback: try from faturas table
    if (gastosMes === 0) {
      try {
        const faturaAtual = await this.getOrCreateFaturaAtual(cartaoId)
        gastosMes = faturaAtual.valor_total || 0
      } catch {
        // No fatura available either
      }
    }

    const limiteDisponivel = cartao.limite_total > 0 ? cartao.limite_total - gastosMes : 0
    const percentualUsado = cartao.limite_total > 0 ? (gastosMes / cartao.limite_total) * 100 : 0

    return {
      limite_total: cartao.limite_total,
      limite_usado: gastosMes,
      limite_disponivel: limiteDisponivel,
      percentual_usado: percentualUsado,
      gastos_mes: gastosMes,
    }
  }
}

// Singleton instance
export const cartaoService = new CartaoService()
