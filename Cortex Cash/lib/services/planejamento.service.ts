/**
 * Planejamento Service
 * Agent PLANEJAMENTO: Owner
 *
 * Gerencia cenários de planejamento financeiro e suas configurações
 */

import { getDB } from '../db/client'
import { nanoid } from 'nanoid'
import { addMonths, isBefore, isAfter, format } from 'date-fns'
import type {
  Cenario,
  ConfiguracaoComportamento,
  ObjetivoFinanceiro,
  CreateCenarioDTO,
  CreateConfiguracaoDTO,
  CreateObjetivoDTO,
} from '../types'
import { NotFoundError, ValidationError } from '../errors'

export class PlanejamentoService {
  private db = getDB()

  // ============================================================================
  // CRUD de Cenários
  // ============================================================================

  /**
   * Lista todos os cenários
   */
  async listCenarios(): Promise<Cenario[]> {
    return await this.db.cenarios.orderBy('created_at').reverse().toArray()
  }

  /**
   * Busca um cenário por ID
   */
  async getCenario(id: string): Promise<Cenario> {
    const cenario = await this.db.cenarios.get(id)
    if (!cenario) {
      throw new NotFoundError(`Cenário com ID ${id} não encontrado`)
    }
    return cenario
  }

  /**
   * Cria um novo cenário
   */
  async createCenario(data: CreateCenarioDTO): Promise<Cenario> {
    // Validações
    if (!data.nome || data.nome.trim().length === 0) {
      throw new ValidationError('Nome do cenário é obrigatório')
    }

    if (!data.horizonte_anos || data.horizonte_anos < 1 || data.horizonte_anos > 10) {
      throw new ValidationError('Horizonte deve estar entre 1 e 10 anos')
    }

    const cenario: Cenario = {
      id: nanoid(),
      nome: data.nome.trim(),
      descricao: data.descricao?.trim(),
      tipo: 'personalizado',
      horizonte_anos: data.horizonte_anos,
      data_inicio: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    }

    await this.db.cenarios.add(cenario)

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
    const cenario = await this.getCenario(id)

    // Validações
    if (data.horizonte_anos !== undefined) {
      if (data.horizonte_anos < 1 || data.horizonte_anos > 10) {
        throw new ValidationError('Horizonte deve estar entre 1 e 10 anos')
      }
    }

    const updated: Cenario = {
      ...cenario,
      ...data,
      id: cenario.id, // Garantir que ID não muda
      tipo: cenario.tipo, // Garantir que tipo não muda
      updated_at: new Date(),
    }

    await this.db.cenarios.put(updated)
    return updated
  }

  /**
   * Deleta um cenário e todas as suas configurações/objetivos
   */
  async deleteCenario(id: string): Promise<void> {
    const cenario = await this.getCenario(id)

    // Não permitir deletar cenário base
    if (cenario.tipo === 'base') {
      throw new ValidationError('Não é possível deletar o cenário base')
    }

    await this.db.transaction('rw',
      this.db.cenarios,
      this.db.configuracoes_comportamento,
      this.db.objetivos_financeiros,
      async () => {
        // Deletar configurações
        await this.db.configuracoes_comportamento
          .where('cenario_id').equals(id)
          .delete()

        // Deletar objetivos
        await this.db.objetivos_financeiros
          .where('cenario_id').equals(id)
          .delete()

        // Deletar cenário
        await this.db.cenarios.delete(id)
      }
    )
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
    return await this.db.configuracoes_comportamento
      .where('cenario_id').equals(cenarioId)
      .toArray()
  }

  /**
   * Adiciona uma configuração de comportamento ao cenário
   */
  async addConfiguracao(cenarioId: string, data: CreateConfiguracaoDTO): Promise<ConfiguracaoComportamento> {
    // Verificar se cenário existe
    await this.getCenario(cenarioId)

    // Validações
    if (!data.tipo) {
      throw new ValidationError('Tipo de configuração é obrigatório')
    }

    if (!data.modo) {
      throw new ValidationError('Modo de configuração é obrigatório')
    }

    // Validações específicas por modo
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

    // Validações específicas para eventos únicos
    if (data.tipo === 'evento_unico') {
      if (!data.evento_descricao?.trim()) {
        throw new ValidationError('Descrição do evento é obrigatória')
      }
      if (data.evento_valor === undefined || data.evento_valor === null) {
        throw new ValidationError('Valor do evento é obrigatório')
      }
      if (data.evento_valor <= 0) {
        throw new ValidationError('Valor do evento deve ser maior que zero')
      }
      if (!data.evento_data) {
        throw new ValidationError('Data do evento é obrigatória')
      }
      if (!data.evento_tipo || !['receita', 'despesa'].includes(data.evento_tipo)) {
        throw new ValidationError('Tipo do evento deve ser "receita" ou "despesa"')
      }
    }

    const configuracao: ConfiguracaoComportamento = {
      id: nanoid(),
      cenario_id: cenarioId,
      tipo: data.tipo,
      categoria_id: data.categoria_id,
      modo: data.modo,
      percentual_mudanca: data.percentual_mudanca,
      valor_fixo: data.valor_fixo,
      data_aplicacao: data.data_aplicacao ? new Date(data.data_aplicacao) : undefined,
      percentual_saving: data.percentual_saving,
      taxa_retorno_mensal: data.taxa_retorno_mensal,
      evento_descricao: data.evento_descricao,
      evento_valor: data.evento_valor,
      evento_data: data.evento_data ? new Date(data.evento_data) : undefined,
      evento_tipo: data.evento_tipo,
      created_at: new Date(),
      updated_at: new Date(),
    }

    await this.db.configuracoes_comportamento.add(configuracao)
    return configuracao
  }

  /**
   * Remove uma configuração
   */
  async removeConfiguracao(configuracaoId: string): Promise<void> {
    // Verificar se existe antes de deletar
    const config = await this.db.configuracoes_comportamento.get(configuracaoId)
    if (!config) {
      throw new NotFoundError(`Configuração com ID ${configuracaoId} não encontrada`)
    }
    await this.db.configuracoes_comportamento.delete(configuracaoId)
  }

  /**
   * Duplica todas as configurações de um cenário para outro
   */
  private async duplicarConfiguracoes(cenarioOrigemId: string, cenarioDestinoId: string): Promise<void> {
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
    return await this.db.objetivos_financeiros
      .where('cenario_id').equals(cenarioId)
      .sortBy('data_alvo')
  }

  /**
   * Adiciona um objetivo financeiro ao cenário
   */
  async addObjetivo(cenarioId: string, data: CreateObjetivoDTO): Promise<ObjetivoFinanceiro> {
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

    // Validar data alvo
    const dataAlvo = new Date(data.data_alvo)
    if (isNaN(dataAlvo.getTime())) {
      throw new ValidationError('Data alvo inválida')
    }

    const dataFimCenario = addMonths(cenario.data_inicio, cenario.horizonte_anos * 12)

    if (isBefore(dataAlvo, new Date())) {
      throw new ValidationError('Data alvo deve estar no futuro')
    }

    if (isAfter(dataAlvo, dataFimCenario)) {
      throw new ValidationError(`Data alvo deve estar dentro do horizonte do cenário (até ${format(dataFimCenario, 'dd/MM/yyyy')})`)
    }

    const objetivo: ObjetivoFinanceiro = {
      id: nanoid(),
      cenario_id: cenarioId,
      nome: data.nome.trim(),
      valor_alvo: data.valor_alvo,
      data_alvo: dataAlvo,
      categoria: data.categoria,
      prioridade: data.prioridade,
      created_at: new Date(),
      updated_at: new Date(),
    }

    await this.db.objetivos_financeiros.add(objetivo)
    return objetivo
  }

  /**
   * Remove um objetivo
   */
  async removeObjetivo(objetivoId: string): Promise<void> {
    // Verificar se existe antes de deletar
    const objetivo = await this.db.objetivos_financeiros.get(objetivoId)
    if (!objetivo) {
      throw new NotFoundError(`Objetivo com ID ${objetivoId} não encontrado`)
    }
    await this.db.objetivos_financeiros.delete(objetivoId)
  }

  /**
   * Atualiza um objetivo
   */
  async updateObjetivo(objetivoId: string, data: Partial<ObjetivoFinanceiro>): Promise<ObjetivoFinanceiro> {
    const objetivo = await this.db.objetivos_financeiros.get(objetivoId)
    if (!objetivo) {
      throw new NotFoundError(`Objetivo com ID ${objetivoId} não encontrado`)
    }

    const updated: ObjetivoFinanceiro = {
      ...objetivo,
      ...data,
      id: objetivo.id,
      cenario_id: objetivo.cenario_id,
      updated_at: new Date(),
    }

    await this.db.objetivos_financeiros.put(updated)
    return updated
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
