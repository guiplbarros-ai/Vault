/**
 * Serviço de Instituições
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD e consultas para instituições financeiras
 */

import { escapeLikePattern } from '../api/sanitize'
import { getSupabase } from '../db/supabase'
import { DatabaseError, NotFoundError, ValidationError } from '../errors'
import type { Conta, CreateInstituicaoDTO, Instituicao } from '../types'
import type { IInstituicaoService } from './interfaces'

function rowToInstituicao(row: Record<string, unknown>): Instituicao {
  return {
    id: row.id as string,
    nome: row.nome as string,
    codigo: row.codigo as string | undefined,
    logo_url: row.logo_url as string | undefined,
    cor: row.cor as string | undefined,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    updated_at: row.updated_at ? new Date(row.updated_at as string) : new Date(),
  }
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

export class InstituicaoService implements IInstituicaoService {
  /**
   * Lista todas as instituições
   */
  async listInstituicoes(options?: {
    limit?: number
    offset?: number
    sortBy?: 'nome' | 'codigo' | 'created_at'
    sortOrder?: 'asc' | 'desc'
  }): Promise<Instituicao[]> {
    const supabase = getSupabase()
    const sortBy = options?.sortBy || 'nome'
    const sortOrder = options?.sortOrder || 'asc'

    let query = supabase
      .from('instituicoes')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (options?.limit !== undefined) {
      const offset = options?.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao listar instituições', error as unknown as Error)

    return (data || []).map(rowToInstituicao)
  }

  /**
   * Busca uma instituição por ID
   */
  async getInstituicaoById(id: string): Promise<Instituicao | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('instituicoes')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar instituição', error as unknown as Error)

    return data ? rowToInstituicao(data) : null
  }

  /**
   * Busca uma instituição por código
   */
  async getInstituicaoByCodigo(codigo: string): Promise<Instituicao | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('instituicoes')
      .select('*')
      .eq('codigo', codigo)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar instituição por código', error as unknown as Error)

    return data ? rowToInstituicao(data) : null
  }

  /**
   * Cria uma nova instituição
   */
  async createInstituicao(data: CreateInstituicaoDTO): Promise<Instituicao> {
    try {
      if (!data.nome || data.nome.trim().length === 0) {
        throw new ValidationError('Nome da instituição é obrigatório')
      }

      const supabase = getSupabase()
      const now = new Date().toISOString()

      const { data: inserted, error } = await supabase
        .from('instituicoes')
        .insert({
          id: crypto.randomUUID(),
          nome: data.nome.trim(),
          codigo: data.codigo,
          logo_url: data.logo_url,
          cor: data.cor,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao criar instituição', error as unknown as Error)

      return rowToInstituicao(inserted)
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao criar instituição', error as Error)
    }
  }

  /**
   * Atualiza uma instituição
   */
  async updateInstituicao(id: string, data: Partial<CreateInstituicaoDTO>): Promise<Instituicao> {
    try {
      const supabase = getSupabase()

      const existing = await this.getInstituicaoById(id)
      if (!existing) {
        throw new NotFoundError('Instituição', id)
      }

      const { data: updated, error } = await supabase
        .from('instituicoes')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao atualizar instituição', error as unknown as Error)

      return rowToInstituicao(updated)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao atualizar instituição', error as Error)
    }
  }

  /**
   * Deleta uma instituição
   */
  async deleteInstituicao(id: string): Promise<void> {
    try {
      const supabase = getSupabase()

      const existing = await this.getInstituicaoById(id)
      if (!existing) {
        throw new NotFoundError('Instituição', id)
      }

      const { error } = await supabase.from('instituicoes').delete().eq('id', id)

      if (error) throw new DatabaseError('Erro ao deletar instituição', error as unknown as Error)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao deletar instituição', error as Error)
    }
  }

  /**
   * Busca instituições por termo de busca (nome ou código)
   */
  async searchInstituicoes(termo: string): Promise<Instituicao[]> {
    const supabase = getSupabase()

    const sanitized = escapeLikePattern(termo)
    const { data, error } = await supabase
      .from('instituicoes')
      .select('*')
      .or(`nome.ilike.%${sanitized}%,codigo.ilike.%${sanitized}%`)
      .order('nome', { ascending: true })

    if (error) throw new DatabaseError('Erro ao buscar instituições', error as unknown as Error)

    return (data || []).map(rowToInstituicao)
  }

  /**
   * Retorna uma instituição com suas contas associadas
   */
  async getInstituicaoComContas(
    id: string
  ): Promise<{ instituicao: Instituicao; contas: Conta[] }> {
    const supabase = getSupabase()

    const instituicao = await this.getInstituicaoById(id)
    if (!instituicao) {
      throw new NotFoundError('Instituição', id)
    }

    const { data: contasData, error } = await supabase
      .from('contas')
      .select('*')
      .eq('instituicao_id', id)

    if (error) throw new DatabaseError('Erro ao buscar contas da instituição', error as unknown as Error)

    return {
      instituicao,
      contas: (contasData || []).map(rowToConta),
    }
  }

  /**
   * Conta quantas contas uma instituição possui
   */
  async countContas(id: string): Promise<number> {
    const supabase = getSupabase()

    const { count, error } = await supabase
      .from('contas')
      .select('*', { count: 'exact', head: true })
      .eq('instituicao_id', id)

    if (error) throw new DatabaseError('Erro ao contar contas', error as unknown as Error)

    return count || 0
  }

  /**
   * Verifica se uma instituição possui contas ativas
   */
  async hasContasAtivas(id: string): Promise<boolean> {
    const supabase = getSupabase()

    const { count, error } = await supabase
      .from('contas')
      .select('*', { count: 'exact', head: true })
      .eq('instituicao_id', id)
      .eq('ativa', true)

    if (error) throw new DatabaseError('Erro ao verificar contas ativas', error as unknown as Error)

    return (count || 0) > 0
  }
}

// Singleton instance
export const instituicaoService = new InstituicaoService()
