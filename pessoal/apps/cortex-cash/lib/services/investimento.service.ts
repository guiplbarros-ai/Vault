/**
 * Serviço de Investimentos
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD e consultas para investimentos
 */

import { getSupabase } from '../db/supabase'
import { DatabaseError, NotFoundError, ValidationError } from '../errors'
import type {
  CreateHistoricoInvestimentoDTO,
  CreateInvestimentoDTO,
  HistoricoInvestimento,
  Investimento,
  InvestimentoComRelacoes,
  TipoInvestimento,
} from '../types'
import {
  createHistoricoInvestimentoSchema,
  createInvestimentoSchema,
  validateDTO,
} from '../validations/dtos'
import { contaService } from './conta.service'
import { transacaoService } from './transacao.service'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function rowToInvestimento(row: Record<string, unknown>): Investimento {
  return {
    id: row.id as string,
    instituicao_id: row.instituicao_id as string,
    nome: row.nome as string,
    tipo: row.tipo as TipoInvestimento,
    ticker: row.ticker as string | undefined,
    valor_aplicado: row.valor_aplicado as number,
    valor_atual: row.valor_atual as number,
    quantidade: row.quantidade as number | undefined,
    data_aplicacao: new Date(row.data_aplicacao as string),
    data_vencimento: row.data_vencimento ? new Date(row.data_vencimento as string) : undefined,
    taxa_juros: row.taxa_juros as number | undefined,
    rentabilidade_contratada: row.rentabilidade_contratada as number | undefined,
    indexador: row.indexador as string | undefined,
    status: row.status as 'ativo' | 'resgatado' | 'vencido',
    conta_origem_id: row.conta_origem_id as string | undefined,
    observacoes: row.observacoes as string | undefined,
    cor: row.cor as string | undefined,
    pluggy_id: row.pluggy_id as string | undefined,
    usuario_id: row.usuario_id as string,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  }
}

function rowToHistorico(row: Record<string, unknown>): HistoricoInvestimento {
  return {
    id: row.id as string,
    investimento_id: row.investimento_id as string,
    data: new Date(row.data as string),
    valor: row.valor as number,
    quantidade: row.quantidade as number | undefined,
    tipo_movimentacao: row.tipo_movimentacao as 'aporte' | 'resgate' | 'rendimento' | 'ajuste',
    observacoes: row.observacoes as string | undefined,
    created_at: new Date(row.created_at as string),
  }
}

export class InvestimentoService {
  /**
   * Lista todos os investimentos
   */
  async listInvestimentos(options?: {
    status?: string
    tipo?: TipoInvestimento
    instituicao_id?: string
    limit?: number
    offset?: number
    sortBy?: 'nome' | 'valor_atual' | 'data_aplicacao' | 'rentabilidade'
    sortOrder?: 'asc' | 'desc'
  }): Promise<Investimento[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const sortBy = options?.sortBy === 'rentabilidade' ? 'valor_atual' : (options?.sortBy || 'data_aplicacao')
    const sortOrder = options?.sortOrder || 'desc'

    let query = supabase
      .from('investimentos')
      .select('*')
      .eq('usuario_id', userId)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.tipo) {
      query = query.eq('tipo', options.tipo)
    }

    if (options?.instituicao_id) {
      query = query.eq('instituicao_id', options.instituicao_id)
    }

    if (options?.limit !== undefined) {
      const offset = options?.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    } else if (options?.offset && options.offset > 0) {
      query = query.range(options.offset, 999999)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao listar investimentos', error as unknown as Error)

    let investimentos: Investimento[] = (data || []).map((row: Record<string, unknown>) => rowToInvestimento(row))

    // Handle rentabilidade sort in-memory (computed field)
    if (options?.sortBy === 'rentabilidade') {
      investimentos.sort((a, b) => {
        const rentA = ((a.valor_atual - a.valor_aplicado) / a.valor_aplicado) * 100
        const rentB = ((b.valor_atual - b.valor_aplicado) / b.valor_aplicado) * 100
        return sortOrder === 'asc' ? rentA - rentB : rentB - rentA
      })
    }

    return investimentos
  }

  /**
   * Busca um investimento por ID
   */
  async getInvestimentoById(id: string): Promise<Investimento | null> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('investimentos')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar investimento', error as unknown as Error)

    return data ? rowToInvestimento(data) : null
  }

  /**
   * Busca um investimento por ID com relações (instituição, conta origem, histórico)
   */
  async getInvestimentoComRelacoes(id: string): Promise<InvestimentoComRelacoes | null> {
    const supabase = getSupabase()

    const investimento = await this.getInvestimentoById(id)
    if (!investimento) return null

    const { data: instData, error: instError } = await supabase
      .from('instituicoes')
      .select('*')
      .eq('id', investimento.instituicao_id)
      .maybeSingle()

    if (instError) throw new DatabaseError('Erro ao buscar instituição', instError as unknown as Error)
    if (!instData) throw new NotFoundError('Instituição', investimento.instituicao_id)

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

    let conta_origem
    if (investimento.conta_origem_id) {
      const { data: contaData } = await supabase
        .from('contas')
        .select('*')
        .eq('id', investimento.conta_origem_id)
        .maybeSingle()
      conta_origem = contaData || undefined
    }

    const { data: historicoData } = await supabase
      .from('historico_investimentos')
      .select('*')
      .eq('investimento_id', id)
      .order('data', { ascending: false })

    const historico: HistoricoInvestimento[] = (historicoData || []).map((row: Record<string, unknown>) => rowToHistorico(row))

    return {
      ...investimento,
      instituicao,
      conta_origem,
      historico,
    }
  }

  /**
   * Cria um novo investimento
   */
  async createInvestimento(data: CreateInvestimentoDTO): Promise<Investimento> {
    try {
      // Validate input
      const validatedData = validateDTO(createInvestimentoSchema, data)

      const supabase = getSupabase()
      const userId = await getUserId()

      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      const { data: inserted, error } = await supabase
        .from('investimentos')
        .insert({
          id,
          instituicao_id: validatedData.instituicao_id,
          nome: validatedData.nome,
          tipo: validatedData.tipo,
          ticker: validatedData.ticker || null,
          valor_aplicado: validatedData.valor_aplicado,
          valor_atual: validatedData.valor_atual,
          quantidade: validatedData.quantidade || null,
          data_aplicacao:
            typeof validatedData.data_aplicacao === 'string'
              ? validatedData.data_aplicacao
              : (validatedData.data_aplicacao as Date).toISOString(),
          data_vencimento: validatedData.data_vencimento
            ? typeof validatedData.data_vencimento === 'string'
              ? validatedData.data_vencimento
              : (validatedData.data_vencimento as Date).toISOString()
            : null,
          taxa_juros: validatedData.taxa_juros || null,
          rentabilidade_contratada: validatedData.rentabilidade_contratada || null,
          indexador: validatedData.indexador || null,
          status: 'ativo',
          conta_origem_id: validatedData.conta_origem_id || null,
          observacoes: validatedData.observacoes || null,
          cor: validatedData.cor || null,
          usuario_id: userId,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao criar investimento', error as unknown as Error)

      const investimento = rowToInvestimento(inserted)

      // Criar histórico inicial
      const dataAplicacao =
        typeof validatedData.data_aplicacao === 'string'
          ? new Date(validatedData.data_aplicacao)
          : validatedData.data_aplicacao

      await this.createHistoricoInvestimento({
        investimento_id: id,
        data: dataAplicacao as Date,
        valor: validatedData.valor_aplicado,
        quantidade: validatedData.quantidade,
        tipo_movimentacao: 'aporte',
        observacoes: 'Aplicação inicial',
      })

      // Registrar movimentação financeira (se tivermos conta de origem)
      if (validatedData.conta_origem_id) {
        const { data: instData } = await supabase
          .from('instituicoes')
          .select('nome')
          .eq('id', validatedData.instituicao_id)
          .maybeSingle()

        const instNome = instData ? (instData.nome as string) : 'Investimentos'

        // Encontrar (ou criar) conta de investimento da mesma instituição
        const contas = await contaService.listContas({ incluirInativas: false })
        let contaInvestimento = contas.find(
          (c) => c.tipo === 'investimento' && c.instituicao_id === validatedData.instituicao_id
        )

        if (!contaInvestimento) {
          contaInvestimento = await contaService.createConta({
            instituicao_id: validatedData.instituicao_id,
            nome: `${instNome} - Carteira`,
            tipo: 'investimento',
            saldo_referencia: 0,
            data_referencia: new Date(),
            saldo_atual: 0,
            ativa: true,
            cor: undefined,
            icone: undefined,
            observacoes: undefined,
            usuario_id: userId,
          })
        }

        const dataApl =
          typeof validatedData.data_aplicacao === 'string'
            ? new Date(validatedData.data_aplicacao)
            : (validatedData.data_aplicacao as Date)

        await transacaoService.createTransfer(
          validatedData.conta_origem_id,
          contaInvestimento.id,
          validatedData.valor_aplicado,
          `Aporte em ${validatedData.nome}`,
          dataApl
        )
      }

      return investimento
    } catch (error) {
      if (error instanceof ValidationError) throw error
      throw new DatabaseError('Erro ao criar investimento', error as Error)
    }
  }

  /**
   * Atualiza um investimento
   */
  async updateInvestimento(
    id: string,
    data: Partial<CreateInvestimentoDTO>
  ): Promise<Investimento> {
    try {
      const supabase = getSupabase()

      const existing = await this.getInvestimentoById(id)
      if (!existing) throw new NotFoundError('Investimento', id)

      const updateData: Record<string, unknown> = {
        ...data,
        updated_at: new Date().toISOString(),
      }

      // Convert string dates to ISO strings
      if (data.data_aplicacao) {
        updateData.data_aplicacao =
          typeof data.data_aplicacao === 'string'
            ? data.data_aplicacao
            : (data.data_aplicacao as Date).toISOString()
      }
      if (data.data_vencimento) {
        updateData.data_vencimento =
          typeof data.data_vencimento === 'string'
            ? data.data_vencimento
            : (data.data_vencimento as Date).toISOString()
      }

      const { data: updated, error } = await supabase
        .from('investimentos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao atualizar investimento', error as unknown as Error)

      return rowToInvestimento(updated)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao atualizar investimento', error as Error)
    }
  }

  /**
   * Deleta um investimento (soft delete - marca como resgatado)
   */
  async deleteInvestimento(id: string): Promise<void> {
    try {
      const supabase = getSupabase()

      const existing = await this.getInvestimentoById(id)
      if (!existing) throw new NotFoundError('Investimento', id)

      const { error } = await supabase
        .from('investimentos')
        .update({ status: 'resgatado', updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw new DatabaseError('Erro ao deletar investimento', error as unknown as Error)
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      throw new DatabaseError('Erro ao deletar investimento', error as Error)
    }
  }

  /**
   * Deleta permanentemente um investimento
   */
  async hardDeleteInvestimento(id: string): Promise<void> {
    try {
      const supabase = getSupabase()

      const existing = await this.getInvestimentoById(id)
      if (!existing) throw new NotFoundError('Investimento', id)

      // Deletar histórico relacionado
      await supabase.from('historico_investimentos').delete().eq('investimento_id', id)

      // Deletar investimento
      const { error } = await supabase.from('investimentos').delete().eq('id', id)
      if (error) throw new DatabaseError('Erro ao deletar investimento', error as unknown as Error)
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      throw new DatabaseError('Erro ao deletar investimento permanentemente', error as Error)
    }
  }

  /**
   * Cria um registro de histórico de investimento
   */
  async createHistoricoInvestimento(
    data: CreateHistoricoInvestimentoDTO
  ): Promise<HistoricoInvestimento> {
    try {
      // Validate input
      const validatedData = validateDTO(createHistoricoInvestimentoSchema, data)

      const supabase = getSupabase()
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      const { data: inserted, error } = await supabase
        .from('historico_investimentos')
        .insert({
          id,
          investimento_id: validatedData.investimento_id,
          data:
            typeof validatedData.data === 'string'
              ? validatedData.data
              : (validatedData.data as Date).toISOString(),
          valor: validatedData.valor,
          quantidade: validatedData.quantidade || null,
          tipo_movimentacao: validatedData.tipo_movimentacao,
          observacoes: validatedData.observacoes || null,
          created_at: now,
        })
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao criar histórico', error as unknown as Error)

      return rowToHistorico(inserted)
    } catch (error) {
      if (error instanceof ValidationError) throw error
      throw new DatabaseError('Erro ao criar histórico de investimento', error as Error)
    }
  }

  /**
   * Lista histórico de um investimento
   */
  async getHistoricoInvestimento(investimento_id: string): Promise<HistoricoInvestimento[]> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('historico_investimentos')
      .select('*')
      .eq('investimento_id', investimento_id)
      .order('data', { ascending: false })

    if (error) throw new DatabaseError('Erro ao buscar histórico', error as unknown as Error)

    return (data || []).map((row: Record<string, unknown>) => rowToHistorico(row))
  }

  /**
   * Calcula rentabilidade de um investimento
   */
  async calcularRentabilidade(id: string): Promise<{
    rentabilidade: number
    rentabilidade_percentual: number
  }> {
    const investimento = await this.getInvestimentoById(id)
    if (!investimento) throw new NotFoundError('Investimento', id)

    const rentabilidade = investimento.valor_atual - investimento.valor_aplicado
    const rentabilidade_percentual = (rentabilidade / investimento.valor_aplicado) * 100

    return { rentabilidade, rentabilidade_percentual }
  }

  /**
   * Busca investimentos por tipo
   */
  async getInvestimentosPorTipo(tipo: TipoInvestimento): Promise<Investimento[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('investimentos')
      .select('*')
      .eq('usuario_id', userId)
      .eq('tipo', tipo)

    if (error) throw new DatabaseError('Erro ao buscar investimentos por tipo', error as unknown as Error)

    return (data || []).map((row: Record<string, unknown>) => rowToInvestimento(row))
  }

  /**
   * Busca investimentos ativos
   */
  async getInvestimentosAtivos(): Promise<Investimento[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('investimentos')
      .select('*')
      .eq('usuario_id', userId)
      .eq('status', 'ativo')

    if (error) throw new DatabaseError('Erro ao buscar investimentos ativos', error as unknown as Error)

    return (data || []).map((row: Record<string, unknown>) => rowToInvestimento(row))
  }

  /**
   * Calcula valor total investido (apenas ativos)
   */
  async getValorTotalInvestido(): Promise<number> {
    const investimentos = await this.getInvestimentosAtivos()
    return investimentos.reduce((total, inv) => total + inv.valor_aplicado, 0)
  }

  /**
   * Calcula valor total atual dos investimentos (apenas ativos)
   */
  async getValorTotalAtual(): Promise<number> {
    const investimentos = await this.getInvestimentosAtivos()
    return investimentos.reduce((total, inv) => total + inv.valor_atual, 0)
  }
}

// Singleton instance
export const investimentoService = new InvestimentoService()
