/**
 * Planejamento Service
 * Agent PLANEJAMENTO: Owner
 *
 * Gerencia cenários de planejamento financeiro e suas configurações
 */

import { addMonths, endOfMonth, format, isAfter, isBefore, startOfMonth, subMonths } from 'date-fns'
import { nanoid } from 'nanoid'
import { assertUUID } from '../api/sanitize'
import { getSupabase } from '../db/supabase'
import { NotFoundError, ValidationError } from '../errors'
import type {
  Cenario,
  CategoriaObjetivo,
  ConfiguracaoComportamento,
  CreateCenarioDTO,
  CreateConfiguracaoDTO,
  CreateObjetivoDTO,
  ObjetivoFinanceiro,
  PrioridadeObjetivo,
  TipoCenario,
} from '../types'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  assertUUID(user.id, 'userId')
  return user.id
}

function rowToCenario(row: Record<string, unknown>): Cenario {
  return {
    id: row.id as string,
    nome: row.nome as string,
    descricao: row.descricao as string | undefined,
    tipo: row.tipo as TipoCenario,
    horizonte_anos: row.horizonte_anos as number,
    data_inicio: new Date(row.data_inicio as string),
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  }
}

function rowToConfiguracao(row: Record<string, unknown>): ConfiguracaoComportamento {
  return {
    id: row.id as string,
    cenario_id: row.cenario_id as string,
    tipo: row.tipo as ConfiguracaoComportamento['tipo'],
    categoria_id: row.categoria_id as string | undefined,
    modo: row.modo as ConfiguracaoComportamento['modo'],
    percentual_mudanca: row.percentual_mudanca as number | undefined,
    valor_fixo: row.valor_fixo as number | undefined,
    data_aplicacao: row.data_aplicacao ? new Date(row.data_aplicacao as string) : undefined,
    percentual_saving: row.percentual_saving as number | undefined,
    taxa_retorno_mensal: row.taxa_retorno_mensal as number | undefined,
    evento_descricao: row.evento_descricao as string | undefined,
    evento_valor: row.evento_valor as number | undefined,
    evento_data: row.evento_data ? new Date(row.evento_data as string) : undefined,
    evento_tipo: row.evento_tipo as 'receita' | 'despesa' | undefined,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  }
}

function rowToObjetivo(row: Record<string, unknown>): ObjetivoFinanceiro {
  return {
    id: row.id as string,
    cenario_id: row.cenario_id as string,
    nome: row.nome as string,
    valor_alvo: row.valor_alvo as number,
    data_alvo: new Date(row.data_alvo as string),
    categoria: row.categoria as CategoriaObjetivo,
    prioridade: row.prioridade as PrioridadeObjetivo,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  }
}

export class PlanejamentoService {
  // ============================================================================
  // CRUD de Cenários
  // ============================================================================

  /**
   * Lista todos os cenários
   */
  async listCenarios(): Promise<Cenario[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('cenarios')
      .select('*')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Erro ao listar cenários: ${error.message}`)

    return (data || []).map(rowToCenario)
  }

  /**
   * Busca um cenário por ID
   */
  async getCenario(id: string): Promise<Cenario> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('cenarios')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(`Erro ao buscar cenário: ${error.message}`)
    if (!data) throw new NotFoundError(`Cenário com ID ${id} não encontrado`)

    return rowToCenario(data)
  }

  /**
   * Cria um novo cenário
   */
  async createCenario(data: CreateCenarioDTO): Promise<Cenario> {
    const supabase = getSupabase()
    const userId = await getUserId()

    // Validações
    if (!data.nome || data.nome.trim().length === 0) {
      throw new ValidationError('Nome do cenário é obrigatório')
    }

    if (!data.horizonte_anos || data.horizonte_anos < 1 || data.horizonte_anos > 10) {
      throw new ValidationError('Horizonte deve estar entre 1 e 10 anos')
    }

    const now = new Date().toISOString()
    const cenarioId = nanoid()

    const { data: inserted, error } = await supabase
      .from('cenarios')
      .insert({
        id: cenarioId,
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || null,
        tipo: 'personalizado',
        horizonte_anos: data.horizonte_anos,
        data_inicio: now,
        usuario_id: userId,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw new Error(`Erro ao criar cenário: ${error.message}`)

    const cenario = rowToCenario(inserted)

    // Se solicitou duplicar de outro cenário, copia as configurações
    if (data.duplicar_de_cenario_id) {
      await this.duplicarConfiguracoes(data.duplicar_de_cenario_id, cenario.id)
    }

    return cenario
  }

  /**
   * Atualiza um cenário
   */
  async updateCenario(id: string, data: Partial<Cenario>): Promise<Cenario> {
    const supabase = getSupabase()
    const cenario = await this.getCenario(id)

    // Validações
    if (data.horizonte_anos !== undefined) {
      if (data.horizonte_anos < 1 || data.horizonte_anos > 10) {
        throw new ValidationError('Horizonte deve estar entre 1 e 10 anos')
      }
    }

    const updateData: Record<string, unknown> = {
      ...data,
      id: cenario.id,
      tipo: cenario.tipo,
      updated_at: new Date().toISOString(),
    }

    // Convert Date objects
    if (data.data_inicio) {
      updateData.data_inicio =
        data.data_inicio instanceof Date ? data.data_inicio.toISOString() : data.data_inicio
    }

    const { data: updated, error } = await supabase
      .from('cenarios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Erro ao atualizar cenário: ${error.message}`)

    return rowToCenario(updated)
  }

  /**
   * Deleta um cenário e todas as suas configurações/objetivos
   */
  async deleteCenario(id: string): Promise<void> {
    const supabase = getSupabase()
    const cenario = await this.getCenario(id)

    // Não permitir deletar cenário base
    if (cenario.tipo === 'base') {
      throw new ValidationError('Não é possível deletar o cenário base')
    }

    // Deletar configurações
    await supabase.from('configuracoes_comportamento').delete().eq('cenario_id', id)

    // Deletar objetivos
    await supabase.from('objetivos_financeiros').delete().eq('cenario_id', id)

    // Deletar cenário
    const { error } = await supabase.from('cenarios').delete().eq('id', id)
    if (error) throw new Error(`Erro ao deletar cenário: ${error.message}`)
  }

  /**
   * Duplica um cenário completo (com configurações e objetivos)
   */
  async duplicarCenario(cenarioOrigemId: string, novoNome?: string): Promise<Cenario> {
    const cenarioOrigem = await this.getCenario(cenarioOrigemId)

    // Criar novo cenário
    const novoCenario = await this.createCenario({
      nome: novoNome || `${cenarioOrigem.nome} (Cópia)`,
      descricao: cenarioOrigem.descricao,
      horizonte_anos: cenarioOrigem.horizonte_anos,
      duplicar_de_cenario_id: cenarioOrigemId,
    })

    // Duplicar objetivos também
    const objetivos = await this.listObjetivos(cenarioOrigemId)
    for (const objetivo of objetivos) {
      const dto: CreateObjetivoDTO = {
        cenario_id: novoCenario.id,
        nome: objetivo.nome,
        valor_alvo: objetivo.valor_alvo,
        data_alvo: objetivo.data_alvo,
        categoria: objetivo.categoria,
        prioridade: objetivo.prioridade,
      }
      await this.addObjetivo(novoCenario.id, dto)
    }

    return novoCenario
  }

  // ============================================================================
  // Configurações de Comportamento
  // ============================================================================

  /**
   * Lista todas as configurações de um cenário
   */
  async listConfiguracoes(cenarioId: string): Promise<ConfiguracaoComportamento[]> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('configuracoes_comportamento')
      .select('*')
      .eq('cenario_id', cenarioId)

    if (error) throw new Error(`Erro ao listar configurações: ${error.message}`)

    return (data || []).map(rowToConfiguracao)
  }

  /**
   * Adiciona uma configuração de comportamento ao cenário
   */
  async addConfiguracao(
    cenarioId: string,
    data: CreateConfiguracaoDTO
  ): Promise<ConfiguracaoComportamento> {
    const supabase = getSupabase()

    // Verificar se cenário existe
    await this.getCenario(cenarioId)

    // Validações
    if (!data.tipo) throw new ValidationError('Tipo de configuração é obrigatório')
    if (!data.modo) throw new ValidationError('Modo de configuração é obrigatório')

    if (data.modo === 'percentual') {
      if (data.percentual_mudanca === undefined || data.percentual_mudanca === null) {
        throw new ValidationError('Percentual de mudança é obrigatório para modo "percentual"')
      }
      if (isNaN(data.percentual_mudanca)) {
        throw new ValidationError('Percentual de mudança deve ser um número')
      }
      if (data.percentual_mudanca < -100 || data.percentual_mudanca > 10000) {
        throw new ValidationError('Percentual de mudança deve estar entre -100% e +10000%')
      }
    }

    if (data.modo === 'valor_fixo') {
      if (data.valor_fixo === undefined || data.valor_fixo === null) {
        throw new ValidationError('Valor fixo é obrigatório para modo "valor_fixo"')
      }
      if (isNaN(data.valor_fixo)) {
        throw new ValidationError('Valor fixo deve ser um número')
      }
      if (data.valor_fixo < 0 && (data.tipo === 'receita' || data.tipo === 'investimento')) {
        throw new ValidationError('Valor fixo não pode ser negativo para receitas/investimentos')
      }
    }

    if (data.tipo === 'evento_unico') {
      if (!data.evento_descricao?.trim()) throw new ValidationError('Descrição do evento é obrigatória')
      if (data.evento_valor === undefined || data.evento_valor === null) {
        throw new ValidationError('Valor do evento é obrigatório')
      }
      if (data.evento_valor <= 0) throw new ValidationError('Valor do evento deve ser maior que zero')
      if (!data.evento_data) throw new ValidationError('Data do evento é obrigatória')
      if (!data.evento_tipo || !['receita', 'despesa'].includes(data.evento_tipo)) {
        throw new ValidationError('Tipo do evento deve ser "receita" ou "despesa"')
      }
    }

    const now = new Date().toISOString()
    const id = nanoid()

    const { data: inserted, error } = await supabase
      .from('configuracoes_comportamento')
      .insert({
        id,
        cenario_id: cenarioId,
        tipo: data.tipo,
        categoria_id: data.categoria_id || null,
        modo: data.modo,
        percentual_mudanca: data.percentual_mudanca ?? null,
        valor_fixo: data.valor_fixo ?? null,
        data_aplicacao: data.data_aplicacao
          ? data.data_aplicacao instanceof Date
            ? data.data_aplicacao.toISOString()
            : new Date(data.data_aplicacao as string).toISOString()
          : null,
        percentual_saving: data.percentual_saving ?? null,
        taxa_retorno_mensal: data.taxa_retorno_mensal ?? null,
        evento_descricao: data.evento_descricao || null,
        evento_valor: data.evento_valor ?? null,
        evento_data: data.evento_data
          ? data.evento_data instanceof Date
            ? data.evento_data.toISOString()
            : new Date(data.evento_data as string).toISOString()
          : null,
        evento_tipo: data.evento_tipo || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw new Error(`Erro ao criar configuração: ${error.message}`)

    return rowToConfiguracao(inserted)
  }

  /**
   * Remove uma configuração
   */
  async removeConfiguracao(configuracaoId: string): Promise<void> {
    const supabase = getSupabase()

    const { data: existing } = await supabase
      .from('configuracoes_comportamento')
      .select('id')
      .eq('id', configuracaoId)
      .maybeSingle()

    if (!existing) throw new NotFoundError(`Configuração com ID ${configuracaoId} não encontrada`)

    const { error } = await supabase
      .from('configuracoes_comportamento')
      .delete()
      .eq('id', configuracaoId)

    if (error) throw new Error(`Erro ao remover configuração: ${error.message}`)
  }

  /**
   * Duplica todas as configurações de um cenário para outro
   */
  private async duplicarConfiguracoes(
    cenarioOrigemId: string,
    cenarioDestinoId: string
  ): Promise<void> {
    const configuracoes = await this.listConfiguracoes(cenarioOrigemId)

    for (const config of configuracoes) {
      const dto: CreateConfiguracaoDTO = {
        cenario_id: cenarioDestinoId,
        tipo: config.tipo,
        categoria_id: config.categoria_id,
        modo: config.modo,
        percentual_mudanca: config.percentual_mudanca,
        valor_fixo: config.valor_fixo,
        data_aplicacao: config.data_aplicacao,
        percentual_saving: config.percentual_saving,
        taxa_retorno_mensal: config.taxa_retorno_mensal,
        evento_descricao: config.evento_descricao,
        evento_valor: config.evento_valor,
        evento_data: config.evento_data,
        evento_tipo: config.evento_tipo,
      }
      await this.addConfiguracao(cenarioDestinoId, dto)
    }
  }

  // ============================================================================
  // Objetivos Financeiros
  // ============================================================================

  /**
   * Lista todos os objetivos de um cenário
   */
  async listObjetivos(cenarioId: string): Promise<ObjetivoFinanceiro[]> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('objetivos_financeiros')
      .select('*')
      .eq('cenario_id', cenarioId)
      .order('data_alvo', { ascending: true })

    if (error) throw new Error(`Erro ao listar objetivos: ${error.message}`)

    return (data || []).map(rowToObjetivo)
  }

  /**
   * Adiciona um objetivo financeiro ao cenário
   */
  async addObjetivo(cenarioId: string, data: CreateObjetivoDTO): Promise<ObjetivoFinanceiro> {
    const supabase = getSupabase()

    // Verificar se cenário existe
    const cenario = await this.getCenario(cenarioId)

    // Validações
    if (!data.nome || data.nome.trim().length === 0) {
      throw new ValidationError('Nome do objetivo é obrigatório')
    }
    if (!data.valor_alvo || data.valor_alvo <= 0) {
      throw new ValidationError('Valor alvo deve ser maior que zero')
    }
    if (!data.data_alvo) {
      throw new ValidationError('Data alvo é obrigatória')
    }

    const dataAlvo = new Date(data.data_alvo as string | Date)
    if (isNaN(dataAlvo.getTime())) {
      throw new ValidationError('Data alvo inválida')
    }

    const dataFimCenario = addMonths(cenario.data_inicio, cenario.horizonte_anos * 12)

    if (isBefore(dataAlvo, new Date())) {
      throw new ValidationError('Data alvo deve estar no futuro')
    }

    if (isAfter(dataAlvo, dataFimCenario)) {
      throw new ValidationError(
        `Data alvo deve estar dentro do horizonte do cenário (até ${format(dataFimCenario, 'dd/MM/yyyy')})`
      )
    }

    const now = new Date().toISOString()
    const id = nanoid()

    const { data: inserted, error } = await supabase
      .from('objetivos_financeiros')
      .insert({
        id,
        cenario_id: cenarioId,
        nome: data.nome.trim(),
        valor_alvo: data.valor_alvo,
        data_alvo: dataAlvo.toISOString(),
        categoria: data.categoria || null,
        prioridade: data.prioridade ?? null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw new Error(`Erro ao criar objetivo: ${error.message}`)

    return rowToObjetivo(inserted)
  }

  /**
   * Remove um objetivo
   */
  async removeObjetivo(objetivoId: string): Promise<void> {
    const supabase = getSupabase()

    const { data: existing } = await supabase
      .from('objetivos_financeiros')
      .select('id')
      .eq('id', objetivoId)
      .maybeSingle()

    if (!existing) throw new NotFoundError(`Objetivo com ID ${objetivoId} não encontrado`)

    const { error } = await supabase.from('objetivos_financeiros').delete().eq('id', objetivoId)
    if (error) throw new Error(`Erro ao remover objetivo: ${error.message}`)
  }

  /**
   * Atualiza um objetivo
   */
  async updateObjetivo(
    objetivoId: string,
    data: Partial<ObjetivoFinanceiro>
  ): Promise<ObjetivoFinanceiro> {
    const supabase = getSupabase()

    const { data: existing } = await supabase
      .from('objetivos_financeiros')
      .select('*')
      .eq('id', objetivoId)
      .maybeSingle()

    if (!existing) throw new NotFoundError(`Objetivo com ID ${objetivoId} não encontrado`)

    const updateData: Record<string, unknown> = {
      ...data,
      id: objetivoId,
      cenario_id: (existing as Record<string, unknown>).cenario_id,
      updated_at: new Date().toISOString(),
    }

    if (data.data_alvo) {
      updateData.data_alvo =
        data.data_alvo instanceof Date ? data.data_alvo.toISOString() : data.data_alvo
    }

    const { data: updated, error } = await supabase
      .from('objetivos_financeiros')
      .update(updateData)
      .eq('id', objetivoId)
      .select()
      .single()

    if (error) throw new Error(`Erro ao atualizar objetivo: ${error.message}`)

    return rowToObjetivo(updated)
  }

  // ============================================================================
  // Auto-Generated Scenarios
  // ============================================================================

  private static _creatingDefault: Promise<Cenario> | null = null

  async createDefaultScenario(): Promise<Cenario> {
    if (PlanejamentoService._creatingDefault) {
      return PlanejamentoService._creatingDefault
    }

    PlanejamentoService._creatingDefault = this._doCreateDefaultScenario()
    try {
      return await PlanejamentoService._creatingDefault
    } finally {
      PlanejamentoService._creatingDefault = null
    }
  }

  private async _doCreateDefaultScenario(): Promise<Cenario> {
    const supabase = getSupabase()
    const userId = await getUserId()
    const now = new Date()

    // Guard: check if a base scenario already exists
    const { data: existing } = await supabase
      .from('cenarios')
      .select('*')
      .eq('usuario_id', userId)
      .eq('tipo', 'base')
      .maybeSingle()

    if (existing) return rowToCenario(existing)

    // 1. Create the base scenario
    const cenarioId = nanoid()
    const nowIso = now.toISOString()

    const { data: inserted, error } = await supabase
      .from('cenarios')
      .insert({
        id: cenarioId,
        nome: 'Minha Situação Atual',
        descricao:
          'Cenário gerado automaticamente com base nos últimos 3 meses de transações reais.',
        tipo: 'base',
        horizonte_anos: 1,
        data_inicio: nowIso,
        usuario_id: userId,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .single()

    if (error) throw new Error(`Erro ao criar cenário padrão: ${error.message}`)

    const cenario = rowToCenario(inserted)

    // 2. Analyze last 3 months of transactions for baseline
    const months = [subMonths(now, 2), subMonths(now, 1), now]
    const allTx: { tipo: string; valor: number; categoria_id?: string }[] = []

    for (const m of months) {
      const { data: txData } = await supabase
        .from('transacoes')
        .select('tipo, valor, categoria_id')
        .eq('usuario_id', userId)
        .gte('data', startOfMonth(m).toISOString())
        .lte('data', endOfMonth(m).toISOString())

      if (txData) {
        allTx.push(
          ...txData.map((t: Record<string, unknown>) => ({
            tipo: t.tipo as string,
            valor: t.valor as number,
            categoria_id: t.categoria_id as string | undefined,
          }))
        )
      }
    }

    if (allTx.length === 0) return cenario

    // 3. Calculate monthly averages
    const receitas = allTx.filter((t) => t.tipo === 'receita')
    const despesas = allTx.filter((t) => t.tipo === 'despesa')

    const avgReceita = receitas.reduce((s, t) => s + Math.abs(t.valor), 0) / 3
    const avgDespesa = despesas.reduce((s, t) => s + Math.abs(t.valor), 0) / 3
    const savingRate = avgReceita > 0 ? ((avgReceita - avgDespesa) / avgReceita) * 100 : 0

    // 4. Add baseline configuration for income
    await supabase.from('configuracoes_comportamento').insert({
      id: nanoid(),
      cenario_id: cenario.id,
      tipo: 'receita',
      modo: 'valor_fixo',
      valor_fixo: Math.round(avgReceita),
      created_at: nowIso,
      updated_at: nowIso,
    })

    // 5. Add per-category expense configurations (top categories)
    const despesaPorCat = new Map<string, number>()
    for (const tx of despesas) {
      const catId = tx.categoria_id || 'sem_categoria'
      despesaPorCat.set(catId, (despesaPorCat.get(catId) || 0) + Math.abs(tx.valor))
    }

    const { data: categoriasData } = await supabase
      .from('categorias')
      .select('id, nome')
      .or(`is_sistema.eq.true,usuario_id.eq.${userId}`)

    const catMap = new Map(
      (categoriasData || []).map((c: Record<string, unknown>) => [c.id as string, c])
    )

    const sortedCats = [...despesaPorCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)

    for (const [catId, total] of sortedCats) {
      const monthlyAvg = total / 3
      if (monthlyAvg < 50) continue

      await supabase.from('configuracoes_comportamento').insert({
        id: nanoid(),
        cenario_id: cenario.id,
        tipo: 'despesa',
        categoria_id: catId === 'sem_categoria' ? null : catId,
        modo: 'valor_fixo',
        valor_fixo: Math.round(monthlyAvg),
        created_at: nowIso,
        updated_at: nowIso,
      })
    }

    // 6. Add saving/investment config
    if (savingRate > 0) {
      await supabase.from('configuracoes_comportamento').insert({
        id: nanoid(),
        cenario_id: cenario.id,
        tipo: 'investimento',
        modo: 'percentual',
        percentual_saving: Math.round(savingRate),
        taxa_retorno_mensal: 0.8,
        created_at: nowIso,
        updated_at: nowIso,
      })
    }

    return cenario
  }

  /**
   * Creates an optimized copy of a scenario, reducing non-essential expenses by 10%.
   */
  async createOptimizedScenario(baseScenarioId: string): Promise<Cenario> {
    const supabase = getSupabase()
    const userId = await getUserId()
    const baseCenario = await this.getCenario(baseScenarioId)

    // Get category names to identify essential ones
    const { data: categoriasData } = await supabase
      .from('categorias')
      .select('id, nome')
      .or(`is_sistema.eq.true,usuario_id.eq.${userId}`)

    const essentialNames = new Set(['moradia', 'saúde', 'saude'])
    const essentialIds = new Set(
      (categoriasData || [])
        .filter((c: Record<string, unknown>) =>
          essentialNames.has((c.nome as string).toLowerCase())
        )
        .map((c: Record<string, unknown>) => c.id as string)
    )

    // Clone the scenario
    const novoCenario = await this.createCenario({
      nome: `${baseCenario.nome} (Otimizado -10%)`,
      descricao:
        'Cenário otimizado: despesas não-essenciais reduzidas em 10% para aumentar taxa de economia.',
      horizonte_anos: baseCenario.horizonte_anos,
    })

    // Copy configs with 10% reduction on non-essential expenses
    const configs = await this.listConfiguracoes(baseScenarioId)
    for (const config of configs) {
      const isEssential = config.categoria_id && essentialIds.has(config.categoria_id)
      const isExpense = config.tipo === 'despesa'
      const reduction = isExpense && !isEssential ? 0.9 : 1

      const dto: CreateConfiguracaoDTO = {
        cenario_id: novoCenario.id,
        tipo: config.tipo,
        categoria_id: config.categoria_id,
        modo: config.modo,
        percentual_mudanca: config.percentual_mudanca,
        valor_fixo: config.valor_fixo ? Math.round(config.valor_fixo * reduction) : undefined,
        data_aplicacao: config.data_aplicacao,
        percentual_saving: config.percentual_saving,
        taxa_retorno_mensal: config.taxa_retorno_mensal,
        evento_descricao: config.evento_descricao,
        evento_valor: config.evento_valor,
        evento_data: config.evento_data,
        evento_tipo: config.evento_tipo,
      }
      await this.addConfiguracao(novoCenario.id, dto)
    }

    return novoCenario
  }
}

// Singleton instance
let planejamentoServiceInstance: PlanejamentoService | null = null

export function getPlanejamentoService(): PlanejamentoService {
  if (!planejamentoServiceInstance) {
    planejamentoServiceInstance = new PlanejamentoService()
  }
  return planejamentoServiceInstance
}
