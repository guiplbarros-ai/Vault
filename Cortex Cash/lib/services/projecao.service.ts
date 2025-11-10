/**
 * Projecao Service
 * Agent PLANEJAMENTO: Owner
 *
 * Calcula projeções financeiras baseadas em cenários e configurações
 */

import { getDB } from '../db/client'
import { getPlanejamentoService } from './planejamento.service'
import { transacaoService } from './transacao.service'
import { contaService } from './conta.service'
import { categoriaService } from './categoria.service'
import { startOfMonth, endOfMonth, addMonths, differenceInMonths, isBefore, isAfter, isSameMonth, format } from 'date-fns'
import type {
  Cenario,
  ConfiguracaoComportamento,
  ObjetivoFinanceiro,
  ProjecaoMensal,
  BaselineData,
  ResultadoProjecao,
  ObjetivoAnalise,
  ComparativoResultado,
} from '../types'
import { NotFoundError } from '../errors'

export class ProjecaoService {
  private db = getDB()
  private planejamentoService = getPlanejamentoService()

  // ============================================================================
  // Baseline (análise histórica)
  // ============================================================================

  /**
   * Calcula baseline a partir do histórico de transações
   * Analisa últimos 6 meses para obter médias
   */
  async calcularBaseline(): Promise<BaselineData> {
    const now = new Date()
    const sixMonthsAgo = addMonths(now, -6)

    // Buscar todas as transações dos últimos 6 meses
    const todasTransacoes = await transacaoService.listTransacoes({
      limit: 50000, // Aumentar limite para evitar dados incompletos
    })

    const transacoesFiltradas = todasTransacoes.filter(t => {
      const data = t.data instanceof Date ? t.data : new Date(t.data)
      return data >= sixMonthsAgo && data <= now
    })

    // Agrupar transações por mês-ano e categoria
    const receitasPorMesCategoria: Record<string, Record<string, number>> = {}
    const despesasPorMesCategoria: Record<string, Record<string, number>> = {}

    for (const transacao of transacoesFiltradas) {
      const data = transacao.data instanceof Date ? transacao.data : new Date(transacao.data)
      const mesAno = format(data, 'yyyy-MM')
      const valor = Math.abs(Number(transacao.valor) || 0)
      const categoriaId = transacao.categoria_id || 'sem_categoria'

      if (transacao.tipo === 'receita') {
        if (!receitasPorMesCategoria[mesAno]) {
          receitasPorMesCategoria[mesAno] = {}
        }
        if (!receitasPorMesCategoria[mesAno][categoriaId]) {
          receitasPorMesCategoria[mesAno][categoriaId] = 0
        }
        receitasPorMesCategoria[mesAno][categoriaId] += valor
      } else if (transacao.tipo === 'despesa') {
        if (!despesasPorMesCategoria[mesAno]) {
          despesasPorMesCategoria[mesAno] = {}
        }
        if (!despesasPorMesCategoria[mesAno][categoriaId]) {
          despesasPorMesCategoria[mesAno][categoriaId] = 0
        }
        despesasPorMesCategoria[mesAno][categoriaId] += valor
      }
    }

    // Calcular média mensal por categoria
    const receitas_mensais: Record<string, number> = {}
    const despesas_mensais: Record<string, number> = {}

    // Receitas: calcular média de cada categoria através dos meses
    const todasCategoriasReceita = new Set<string>()
    Object.values(receitasPorMesCategoria).forEach(categorias => {
      Object.keys(categorias).forEach(cat => todasCategoriasReceita.add(cat))
    })

    const numeroMeses = Math.max(1, Object.keys(receitasPorMesCategoria).length)
    for (const categoriaId of todasCategoriasReceita) {
      let soma = 0
      for (const mesData of Object.values(receitasPorMesCategoria)) {
        soma += mesData[categoriaId] || 0
      }
      receitas_mensais[categoriaId] = soma / numeroMeses
    }

    // Despesas: calcular média de cada categoria através dos meses
    const todasCategoriasDespesa = new Set<string>()
    Object.values(despesasPorMesCategoria).forEach(categorias => {
      Object.keys(categorias).forEach(cat => todasCategoriasDespesa.add(cat))
    })

    for (const categoriaId of todasCategoriasDespesa) {
      let soma = 0
      for (const mesData of Object.values(despesasPorMesCategoria)) {
        soma += mesData[categoriaId] || 0
      }
      despesas_mensais[categoriaId] = soma / numeroMeses
    }

    // Calcular totais
    const totalReceitas = Object.values(receitas_mensais).reduce((acc, val) => acc + val, 0)
    const totalDespesas = Object.values(despesas_mensais).reduce((acc, val) => acc + val, 0)
    const taxa_saving = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) : 0

    // Patrimônio atual: calcular de forma otimizada (sem N+1 queries)
    const patrimonio_inicial = await this.calcularPatrimonioAtual(todasTransacoes)

    return {
      receitas_mensais,
      despesas_mensais,
      taxa_saving,
      patrimonio_inicial,
    }
  }

  /**
   * Calcula patrimônio atual de forma otimizada (sem N+1 queries)
   */
  private async calcularPatrimonioAtual(todasTransacoes?: any[]): Promise<number> {
    const contas = await contaService.listContas()

    // Calcula o patrimônio atual somando o saldo atual de cada conta
    // Consistência: usa calcularSaldoEmData(conta, agora) que respeita saldo_referencia/data_referencia
    let patrimonio = 0
    for (const conta of contas) {
      try {
        const saldoAtualConta = await contaService.calcularSaldoEmData(conta.id, new Date())
        patrimonio += saldoAtualConta
      } catch (error) {
        console.error(`Erro ao calcular saldo da conta ${conta.id}:`, error)
      }
    }

    return patrimonio
  }

  // ============================================================================
  // Projeção de Cenários
  // ============================================================================

  /**
   * Calcula projeções para um cenário
   */
  async calcularProjecao(cenarioId: string): Promise<ResultadoProjecao> {
    const cenario = await this.planejamentoService.getCenario(cenarioId)
    const configuracoes = await this.planejamentoService.listConfiguracoes(cenarioId)
    const objetivos = await this.planejamentoService.listObjetivos(cenarioId)

    // Calcular baseline
    const baseline = await this.calcularBaseline()

    // Gerar projeções mês a mês
    const projecoes = await this.gerarProjecoesMensais(cenario, baseline, configuracoes)

    // Calcular resumo
    const resumo = this.calcularResumo(projecoes)

    // Analisar objetivos
    const objetivos_analise = this.analisarObjetivos(objetivos, projecoes)

    return {
      cenario,
      projecoes,
      resumo,
      objetivos_analise,
    }
  }

  /**
   * Gera projeções mês a mês aplicando configurações
   */
  private async gerarProjecoesMensais(
    cenario: Cenario,
    baseline: BaselineData,
    configuracoes: ConfiguracaoComportamento[]
  ): Promise<ProjecaoMensal[]> {
    const projecoes: ProjecaoMensal[] = []
    const mesesTotal = cenario.horizonte_anos * 12
    let patrimonioAcumulado = baseline.patrimonio_inicial

    for (let i = 0; i < mesesTotal; i++) {
      const mes = addMonths(cenario.data_inicio, i)

      // Aplicar configurações válidas para este mês
      const configsAplicaveis = configuracoes.filter(config => {
        if (!config.data_aplicacao) return true
        return !isBefore(mes, config.data_aplicacao)
      })

      // Calcular receitas do mês
      const receitas = this.calcularReceitasMes(baseline, configsAplicaveis, mes)

      // Calcular despesas do mês
      const despesas = this.calcularDespesasMes(baseline, configsAplicaveis, mes)

      // Saving bruto (receitas - despesas)
      const savingBruto = receitas.total - despesas.total

      // Calcular investimentos (percentual do saving que é direcionado a investimentos)
      const configInvestimento = configsAplicaveis.find(c => c.tipo === 'investimento')
      const percentualInvestimento = configInvestimento?.percentual_saving || 0
      const investimentos = savingBruto * (percentualInvestimento / 100)

      // Rendimento dos investimentos já acumulados no patrimônio
      const taxaRetorno = configInvestimento?.taxa_retorno_mensal || 0
      const rendimento_investimentos = patrimonioAcumulado * taxaRetorno

      // Atualizar patrimônio: adiciona o saving total (que já inclui o que vai para investimentos) + rendimentos
      patrimonioAcumulado += savingBruto + rendimento_investimentos

      projecoes.push({
        mes,
        receitas,
        despesas,
        investimentos,
        saving: savingBruto,
        rendimento_investimentos,
        patrimonio_acumulado: patrimonioAcumulado,
      })
    }

    return projecoes
  }

  /**
   * Calcula receitas do mês aplicando configurações
   */
  private calcularReceitasMes(
    baseline: BaselineData,
    configuracoes: ConfiguracaoComportamento[],
    mes: Date
  ): { total: number; porCategoria: Record<string, number> } {
    const porCategoria: Record<string, number> = {}
    let total = 0

    // Para cada categoria de receita no baseline
    for (const [categoriaId, valorBase] of Object.entries(baseline.receitas_mensais)) {
      let valor = valorBase

      // Aplicar configurações
      const config = configuracoes.find(c =>
        c.tipo === 'receita' && c.categoria_id === categoriaId
      )

      if (config) {
        if (config.modo === 'percentual') {
          valor = valorBase * (1 + (config.percentual_mudanca || 0) / 100)
        } else if (config.modo === 'valor_fixo') {
          valor = config.valor_fixo || 0
        } else if (config.modo === 'zerar') {
          valor = 0
        }
      }

      porCategoria[categoriaId] = valor
      total += valor
    }

    // Adicionar eventos únicos de receita
    const eventosReceita = configuracoes.filter(c => {
      if (c.tipo !== 'evento_unico' || c.evento_tipo !== 'receita' || !c.evento_data) {
        return false
      }
      const dataEvento = this.normalizeDate(c.evento_data)
      return dataEvento && isSameMonth(dataEvento, mes)
    })

    for (const evento of eventosReceita) {
      total += evento.evento_valor || 0
    }

    return { total, porCategoria }
  }

  /**
   * Calcula despesas do mês aplicando configurações
   */
  private calcularDespesasMes(
    baseline: BaselineData,
    configuracoes: ConfiguracaoComportamento[],
    mes: Date
  ): { total: number; porCategoria: Record<string, number> } {
    const porCategoria: Record<string, number> = {}
    let total = 0

    // Para cada categoria de despesa no baseline
    for (const [categoriaId, valorBase] of Object.entries(baseline.despesas_mensais)) {
      let valor = valorBase

      // Aplicar configurações
      const config = configuracoes.find(c =>
        c.tipo === 'despesa' && c.categoria_id === categoriaId
      )

      if (config) {
        if (config.modo === 'percentual') {
          valor = valorBase * (1 + (config.percentual_mudanca || 0) / 100)
        } else if (config.modo === 'valor_fixo') {
          valor = config.valor_fixo || 0
        } else if (config.modo === 'zerar') {
          valor = 0
        }
      }

      porCategoria[categoriaId] = valor
      total += valor
    }

    // Adicionar eventos únicos de despesa
    const eventosDespesa = configuracoes.filter(c => {
      if (c.tipo !== 'evento_unico' || c.evento_tipo !== 'despesa' || !c.evento_data) {
        return false
      }
      const dataEvento = this.normalizeDate(c.evento_data)
      return dataEvento && isSameMonth(dataEvento, mes)
    })

    for (const evento of eventosDespesa) {
      total += evento.evento_valor || 0
    }

    return { total, porCategoria }
  }

  // ============================================================================
  // Análise e Comparação
  // ============================================================================

  /**
   * Calcula resumo das projeções
   */
  private calcularResumo(projecoes: ProjecaoMensal[]) {
    if (projecoes.length === 0) {
      return {
        patrimonio_inicial: 0,
        patrimonio_final: 0,
        saving_acumulado: 0,
        receita_total: 0,
        despesa_total: 0,
        investimento_total: 0,
        rendimento_total: 0,
        taxa_saving_media: 0,
        melhor_mes: new Date(),
        pior_mes: new Date(),
      }
    }

    const patrimonio_inicial = projecoes[0].patrimonio_acumulado - projecoes[0].saving - projecoes[0].rendimento_investimentos
    const patrimonio_final = projecoes[projecoes.length - 1].patrimonio_acumulado
    const saving_acumulado = projecoes.reduce((acc, p) => acc + p.saving, 0)
    const receita_total = projecoes.reduce((acc, p) => acc + p.receitas.total, 0)
    const despesa_total = projecoes.reduce((acc, p) => acc + p.despesas.total, 0)
    const investimento_total = projecoes.reduce((acc, p) => acc + p.investimentos, 0)
    const rendimento_total = projecoes.reduce((acc, p) => acc + p.rendimento_investimentos, 0)
    const taxa_saving_media = receita_total > 0 ? (saving_acumulado / receita_total) : 0

    // Encontrar melhor e pior mês
    const melhorProjecao = projecoes.reduce((best, p) => p.saving > best.saving ? p : best, projecoes[0])
    const piorProjecao = projecoes.reduce((worst, p) => p.saving < worst.saving ? p : worst, projecoes[0])

    return {
      patrimonio_inicial,
      patrimonio_final,
      saving_acumulado,
      receita_total,
      despesa_total,
      investimento_total,
      rendimento_total,
      taxa_saving_media,
      melhor_mes: melhorProjecao.mes,
      pior_mes: piorProjecao.mes,
    }
  }

  /**
   * Analisa viabilidade dos objetivos
   */
  private analisarObjetivos(
    objetivos: ObjetivoFinanceiro[],
    projecoes: ProjecaoMensal[]
  ): ObjetivoAnalise[] {
    return objetivos.map(objetivo => {
      // Encontrar projeção do mês do objetivo
      const projecaoMeta = projecoes.find(p =>
        isSameMonth(p.mes, objetivo.data_alvo) ||
        isAfter(p.mes, objetivo.data_alvo)
      )

      const patrimonio_projetado = projecaoMeta?.patrimonio_acumulado || 0
      const diferenca = objetivo.valor_alvo - patrimonio_projetado
      const percentual_alcance = objetivo.valor_alvo > 0
        ? (patrimonio_projetado / objetivo.valor_alvo) * 100
        : 0

      // Determinar status
      let status: 'no_caminho' | 'precisa_ajustes' | 'inviavel'
      const sugestoes: string[] = []

      if (percentual_alcance >= 100) {
        status = 'no_caminho'
        sugestoes.push(`✅ Objetivo alcançável! Você terá ${this.formatarMoeda(patrimonio_projetado - objetivo.valor_alvo)} a mais.`)
      } else if (percentual_alcance >= 80) {
        status = 'precisa_ajustes'
        sugestoes.push(`⚠️ Faltam ${this.formatarMoeda(diferenca)}. Aumente saving em ${Math.ceil((diferenca / projecoes.length) / 1000) * 1000}/mês.`)
      } else {
        status = 'inviavel'
        sugestoes.push(`❌ Meta muito distante. Considere aumentar horizonte ou reduzir valor alvo.`)
        sugestoes.push(`Você precisaria de mais ${Math.ceil(diferenca / 10000) * 10000} em patrimônio.`)
      }

      return {
        objetivo,
        status,
        patrimonio_projetado,
        diferenca,
        percentual_alcance,
        sugestoes,
      }
    })
  }

  /**
   * Compara múltiplos cenários
   */
  async compararCenarios(cenarioIds: string[]): Promise<ComparativoResultado> {
    if (cenarioIds.length < 2 || cenarioIds.length > 3) {
      throw new Error('Comparação deve incluir 2 ou 3 cenários')
    }

    const cenarios: Cenario[] = []
    const metricas: Record<string, any> = {}

    // Calcular projeções para cada cenário
    for (const id of cenarioIds) {
      const resultado = await this.calcularProjecao(id)
      cenarios.push(resultado.cenario)

      metricas[id] = {
        patrimonio_final: resultado.resumo.patrimonio_final,
        saving_acumulado: resultado.resumo.saving_acumulado,
        taxa_saving_media: resultado.resumo.taxa_saving_media,
        receita_total_acumulada: resultado.resumo.receita_total,
        despesa_total_acumulada: resultado.resumo.despesa_total,
      }
    }

    // Calcular diferenças
    const patrimonios = cenarioIds.map(id => metricas[id].patrimonio_final)
    const savings = cenarioIds.map(id => metricas[id].saving_acumulado)

    const maxPatrimonio = Math.max(...patrimonios)
    const minPatrimonio = Math.min(...patrimonios)
    const idMaxPatrimonio = cenarioIds[patrimonios.indexOf(maxPatrimonio)]
    const idMinPatrimonio = cenarioIds[patrimonios.indexOf(minPatrimonio)]

    const maxSaving = Math.max(...savings)
    const minSaving = Math.min(...savings)
    const idMaxSaving = cenarioIds[savings.indexOf(maxSaving)]
    const idMinSaving = cenarioIds[savings.indexOf(minSaving)]

    return {
      cenarios,
      metricas,
      diferencas: {
        patrimonio_final: {
          maior: idMaxPatrimonio,
          menor: idMinPatrimonio,
          diferenca_valor: maxPatrimonio - minPatrimonio,
          diferenca_percentual: ((maxPatrimonio - minPatrimonio) / minPatrimonio) * 100,
        },
        saving_acumulado: {
          maior: idMaxSaving,
          menor: idMinSaving,
          diferenca_valor: maxSaving - minSaving,
        },
      },
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Normaliza uma data para objeto Date, independente se é Date ou string
   */
  private normalizeDate(date: Date | string | undefined): Date | undefined {
    if (!date) return undefined
    return date instanceof Date ? date : new Date(date)
  }

  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }
}

// Singleton instance
let projecaoServiceInstance: ProjecaoService | null = null

export function getProjecaoService(): ProjecaoService {
  if (!projecaoServiceInstance) {
    projecaoServiceInstance = new ProjecaoService()
  }
  return projecaoServiceInstance
}
