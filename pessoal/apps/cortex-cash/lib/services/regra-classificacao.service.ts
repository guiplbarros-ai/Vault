/**
 * Serviço de Regras de Classificação
 * Agent DATA: Owner
 *
 * Gerencia regras automáticas para classificação de transações
 */

import { getSupabase } from '../db/supabase'
import { DatabaseError, NotFoundError, ValidationError } from '../errors'
import type { RegraClassificacao, TipoRegra } from '../types'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function rowToRegra(row: Record<string, unknown>): RegraClassificacao {
  return {
    id: row.id as string,
    categoria_id: row.categoria_id as string,
    nome: row.nome as string,
    tipo_regra: row.tipo_regra as TipoRegra,
    padrao: row.padrao as string,
    prioridade: Number(row.prioridade) || 0,
    ativa: row.ativa !== false,
    total_aplicacoes: Number(row.total_aplicacoes) || 0,
    ultima_aplicacao: row.ultima_aplicacao ? new Date(row.ultima_aplicacao as string) : undefined,
    total_confirmacoes: Number(row.total_confirmacoes) || 0,
    total_rejeicoes: Number(row.total_rejeicoes) || 0,
    usuario_id: row.usuario_id as string | undefined,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    updated_at: row.updated_at ? new Date(row.updated_at as string) : new Date(),
  }
}

export interface CreateRegraClassificacaoDTO {
  categoria_id: string
  nome: string
  tipo_regra: TipoRegra
  padrao: string
  prioridade?: number
  ativa?: boolean
}

export interface UpdateRegraClassificacaoDTO {
  categoria_id?: string
  nome?: string
  tipo_regra?: TipoRegra
  padrao?: string
  prioridade?: number
  ativa?: boolean
}

export interface PreviewRegraResult {
  regra: RegraClassificacao
  matches: {
    descricao: string
    transacao_id: string
    data: Date
    valor: number
  }[]
  total_matches: number
}

class RegraClassificacaoService {
  /**
   * Lista todas as regras de classificação
   */
  async listRegras(options?: {
    ativa?: boolean
    categoria_id?: string
    tipo_regra?: TipoRegra
    sortBy?: 'prioridade' | 'nome' | 'created_at' | 'ultima_aplicacao'
    sortOrder?: 'asc' | 'desc'
  }): Promise<RegraClassificacao[]> {
    try {
      const supabase = getSupabase()
      const userId = await getUserId()
      const sortBy = options?.sortBy || 'prioridade'
      const sortOrder = options?.sortOrder || 'desc'

      let query = supabase
        .from('regras_classificacao')
        .select('*')
        .eq('usuario_id', userId)
        .order(sortBy, { ascending: sortOrder === 'asc' })

      if (options?.ativa !== undefined) {
        query = query.eq('ativa', options.ativa)
      }

      if (options?.categoria_id) {
        query = query.eq('categoria_id', options.categoria_id)
      }

      if (options?.tipo_regra) {
        query = query.eq('tipo_regra', options.tipo_regra)
      }

      const { data, error } = await query

      if (error) throw new DatabaseError('Erro ao listar regras', error as unknown as Error)

      return (data || []).map(rowToRegra)
    } catch (error) {
      throw new DatabaseError('Erro ao listar regras', error as Error)
    }
  }

  /**
   * Busca uma regra por ID
   */
  async getRegraById(id: string): Promise<RegraClassificacao> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('regras_classificacao')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw new DatabaseError('Erro ao buscar regra', error as unknown as Error)

      if (!data) {
        throw new NotFoundError(`Regra não encontrada: ${id}`)
      }

      return rowToRegra(data)
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      throw new DatabaseError('Erro ao buscar regra', error as Error)
    }
  }

  /**
   * Cria uma nova regra de classificação
   */
  async createRegra(data: CreateRegraClassificacaoDTO): Promise<RegraClassificacao> {
    try {
      if (!data.categoria_id || !data.nome || !data.tipo_regra || !data.padrao) {
        throw new ValidationError('Dados obrigatórios não fornecidos')
      }

      const supabase = getSupabase()
      const userId = await getUserId()

      // Validate categoria exists
      const { data: categoria } = await supabase
        .from('categorias')
        .select('id')
        .eq('id', data.categoria_id)
        .maybeSingle()

      if (!categoria) {
        throw new ValidationError(`Categoria não encontrada: ${data.categoria_id}`)
      }

      this.validatePadrao(data.tipo_regra, data.padrao)

      let prioridade = data.prioridade ?? 0
      if (data.prioridade === undefined) {
        const { data: regras } = await supabase
          .from('regras_classificacao')
          .select('prioridade')
          .eq('usuario_id', userId)
          .order('prioridade', { ascending: false })
          .limit(1)

        prioridade = regras && regras.length > 0 ? (regras[0].prioridade || 0) + 1 : 1
      }

      const now = new Date().toISOString()

      const { data: inserted, error } = await supabase
        .from('regras_classificacao')
        .insert({
          id: crypto.randomUUID(),
          categoria_id: data.categoria_id,
          nome: data.nome,
          tipo_regra: data.tipo_regra,
          padrao: data.padrao,
          prioridade,
          ativa: data.ativa ?? true,
          total_aplicacoes: 0,
          ultima_aplicacao: null,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          usuario_id: userId,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao criar regra', error as unknown as Error)

      return rowToRegra(inserted)
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao criar regra de classificação', error as Error)
    }
  }

  /**
   * Atualiza uma regra existente
   */
  async updateRegra(id: string, data: UpdateRegraClassificacaoDTO): Promise<RegraClassificacao> {
    try {
      const supabase = getSupabase()
      const regra = await this.getRegraById(id)

      if (data.categoria_id && data.categoria_id !== regra.categoria_id) {
        const { data: categoria } = await supabase
          .from('categorias')
          .select('id')
          .eq('id', data.categoria_id)
          .maybeSingle()

        if (!categoria) {
          throw new ValidationError(`Categoria não encontrada: ${data.categoria_id}`)
        }
      }

      const novoTipo = data.tipo_regra ?? regra.tipo_regra
      const novoPadrao = data.padrao ?? regra.padrao
      if (data.tipo_regra || data.padrao) {
        this.validatePadrao(novoTipo, novoPadrao)
      }

      const { data: updated, error } = await supabase
        .from('regras_classificacao')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao atualizar regra', error as unknown as Error)

      return rowToRegra(updated)
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao atualizar regra', error as Error)
    }
  }

  /**
   * Deleta uma regra
   */
  async deleteRegra(id: string): Promise<void> {
    try {
      const supabase = getSupabase()
      await this.getRegraById(id)

      const { error } = await supabase.from('regras_classificacao').delete().eq('id', id)

      if (error) throw new DatabaseError('Erro ao deletar regra', error as unknown as Error)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao deletar regra', error as Error)
    }
  }

  /**
   * Ativa ou desativa uma regra
   */
  async toggleRegra(id: string): Promise<RegraClassificacao> {
    try {
      const regra = await this.getRegraById(id)
      return await this.updateRegra(id, { ativa: !regra.ativa })
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao alternar status da regra', error as Error)
    }
  }

  /**
   * Atualiza prioridades de múltiplas regras
   */
  async updatePrioridades(updates: { id: string; prioridade: number }[]): Promise<void> {
    try {
      const supabase = getSupabase()

      for (const update of updates) {
        const { error } = await supabase
          .from('regras_classificacao')
          .update({ prioridade: update.prioridade, updated_at: new Date().toISOString() })
          .eq('id', update.id)

        if (error) throw error
      }
    } catch (error) {
      throw new DatabaseError('Erro ao atualizar prioridades', error as Error)
    }
  }

  /**
   * Obtém estatísticas de uso das regras
   */
  async getRegrasStats(): Promise<{
    total: number
    ativas: number
    inativas: number
    total_aplicacoes: number
    mais_usada?: RegraClassificacao
  }> {
    try {
      const regras = await this.listRegras()

      const ativas = regras.filter((r) => r.ativa).length
      const total_aplicacoes = regras.reduce((sum, r) => sum + r.total_aplicacoes, 0)
      const mais_usada = [...regras].sort((a, b) => b.total_aplicacoes - a.total_aplicacoes)[0]

      return {
        total: regras.length,
        ativas,
        inativas: regras.length - ativas,
        total_aplicacoes,
        mais_usada,
      }
    } catch (error) {
      throw new DatabaseError('Erro ao obter estatísticas de regras', error as Error)
    }
  }

  /**
   * Preview de uma regra - mostra quantas transações casariam com ela
   */
  async previewRegra(
    tipo_regra: TipoRegra,
    padrao: string,
    limit = 50
  ): Promise<PreviewRegraResult> {
    try {
      const supabase = getSupabase()
      const userId = await getUserId()

      this.validatePadrao(tipo_regra, padrao)

      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('id, descricao, data, valor')
        .eq('usuario_id', userId)

      const allMatches = (transacoes || []).filter((t: { descricao: string }) =>
        this.testarRegraComPadrao(tipo_regra, padrao, t.descricao)
      )

      const matches = allMatches.slice(0, limit).map((t: { id: string; descricao: string; data: string; valor: number }) => ({
        descricao: t.descricao,
        transacao_id: t.id,
        data: new Date(t.data),
        valor: t.valor,
      }))

      const tempRegra: RegraClassificacao = {
        id: 'preview',
        categoria_id: '',
        nome: 'Preview',
        tipo_regra,
        padrao,
        prioridade: 0,
        ativa: true,
        total_aplicacoes: 0,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        usuario_id: userId,
        created_at: new Date(),
        updated_at: new Date(),
      }

      return {
        regra: tempRegra,
        matches,
        total_matches: allMatches.length,
      }
    } catch (error) {
      if (error instanceof ValidationError) throw error
      throw new DatabaseError('Erro ao fazer preview de regra', error as Error)
    }
  }

  private validatePadrao(tipo: TipoRegra, padrao: string): void {
    if (!padrao || padrao.trim() === '') {
      throw new ValidationError('Padrão não pode ser vazio')
    }

    if (tipo === 'regex') {
      try {
        new RegExp(padrao)
      } catch (error) {
        throw new ValidationError(
          `Padrão regex inválido: ${error instanceof Error ? error.message : 'erro desconhecido'}`
        )
      }

      if (/([+*])\)?[+*]/.test(padrao) || /\(\?[^)]*\([^)]*[+*]/.test(padrao)) {
        throw new ValidationError(
          'Padrão regex rejeitado: quantificadores aninhados podem causar lentidão extrema (ex: (a+)+)'
        )
      }
      if (padrao.length > 200) {
        throw new ValidationError('Padrão regex muito longo (máx 200 caracteres)')
      }
    }

    if (tipo === 'contains' || tipo === 'starts_with' || tipo === 'ends_with') {
      if (padrao.length < 2) {
        throw new ValidationError('Padrão deve ter pelo menos 2 caracteres')
      }
    }
  }

  /**
   * Aplica regras de classificação a uma descrição
   */
  async aplicarRegras(descricao: string): Promise<string | null> {
    const regras = await this.listRegras({
      ativa: true,
      sortBy: 'prioridade',
      sortOrder: 'desc',
    })

    for (const regra of regras) {
      if (this.testarRegraComPadrao(regra.tipo_regra, regra.padrao, descricao)) {
        await this.incrementarAplicacao(regra.id)
        return regra.categoria_id
      }
    }

    return null
  }

  private testarRegraComPadrao(tipo: TipoRegra, padrao: string, descricao: string): boolean {
    const desc = descricao.toLowerCase()
    const padraoLower = padrao.toLowerCase()

    switch (tipo) {
      case 'contains':
        return desc.includes(padraoLower)
      case 'starts_with':
        return desc.startsWith(padraoLower)
      case 'ends_with':
        return desc.endsWith(padraoLower)
      case 'regex':
        try {
          return new RegExp(padrao, 'i').test(desc)
        } catch {
          return false
        }
      default:
        return false
    }
  }

  private async incrementarAplicacao(id: string): Promise<void> {
    try {
      const supabase = getSupabase()
      const regra = await this.getRegraById(id)

      await supabase
        .from('regras_classificacao')
        .update({
          total_aplicacoes: regra.total_aplicacoes + 1,
          ultima_aplicacao: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    } catch {
      // silently fail - not critical
    }
  }

  /**
   * Aplica classificação híbrida (regras + IA)
   */
  async classificarHibrido(
    descricao: string,
    valor: number,
    tipo: 'receita' | 'despesa',
    useAI = true
  ): Promise<{
    categoria_id: string | null
    metodo: 'regra' | 'ia' | 'nenhum'
    confianca?: number
    regra_aplicada?: string
  }> {
    const categoriaIdRegra = await this.aplicarRegras(descricao)

    if (categoriaIdRegra) {
      return {
        categoria_id: categoriaIdRegra,
        metodo: 'regra',
      }
    }

    if (useAI) {
      try {
        const response = await fetch('/api/ai/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descricao, valor, tipo }),
        })

        if (response.ok) {
          const data = await response.json()
          return {
            categoria_id: data.categoria_sugerida_id,
            metodo: 'ia',
            confianca: data.confianca,
          }
        }
      } catch (error) {
        console.error('Erro ao classificar com IA:', error)
      }
    }

    return { categoria_id: null, metodo: 'nenhum' }
  }

  /**
   * Registra confirmação de uma regra
   */
  async registrarConfirmacao(regra_id: string): Promise<void> {
    try {
      const supabase = getSupabase()
      const regra = await this.getRegraById(regra_id)

      const { error } = await supabase
        .from('regras_classificacao')
        .update({
          total_confirmacoes: regra.total_confirmacoes + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', regra_id)

      if (error) throw new DatabaseError('Erro ao registrar confirmação', error as unknown as Error)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao registrar confirmação', error as Error)
    }
  }

  /**
   * Registra rejeição de uma regra
   */
  async registrarRejeicao(regra_id: string): Promise<void> {
    try {
      const supabase = getSupabase()
      const regra = await this.getRegraById(regra_id)

      const { error } = await supabase
        .from('regras_classificacao')
        .update({
          total_rejeicoes: regra.total_rejeicoes + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', regra_id)

      if (error) throw new DatabaseError('Erro ao registrar rejeição', error as unknown as Error)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao registrar rejeição', error as Error)
    }
  }

  /**
   * Calcula taxa de acurácia de uma regra
   */
  async getAcuracia(regra_id: string): Promise<number | null> {
    try {
      const regra = await this.getRegraById(regra_id)
      const total = regra.total_confirmacoes + regra.total_rejeicoes

      if (total === 0) return null

      return (regra.total_confirmacoes / total) * 100
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      throw new DatabaseError('Erro ao calcular acurácia', error as Error)
    }
  }

  /**
   * Obtém métricas detalhadas de todas as regras
   */
  async getMetricasDetalhadas(): Promise<{
    regra_id: string
    nome: string
    total_aplicacoes: number
    total_confirmacoes: number
    total_rejeicoes: number
    acuracia: number | null
    ativa: boolean
  }[]> {
    try {
      const regras = await this.listRegras()

      return regras.map((regra) => {
        const total = regra.total_confirmacoes + regra.total_rejeicoes
        const acuracia = total > 0 ? (regra.total_confirmacoes / total) * 100 : null

        return {
          regra_id: regra.id,
          nome: regra.nome,
          total_aplicacoes: regra.total_aplicacoes,
          total_confirmacoes: regra.total_confirmacoes,
          total_rejeicoes: regra.total_rejeicoes,
          acuracia,
          ativa: regra.ativa,
        }
      })
    } catch (error) {
      throw new DatabaseError('Erro ao obter métricas detalhadas', error as Error)
    }
  }
}

export const regraClassificacaoService = new RegraClassificacaoService()
