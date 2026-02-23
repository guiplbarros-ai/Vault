/**
 * Serviço de Relatórios
 * Agent FINANCE: Owner
 *
 * Gera relatórios de gastos, receitas e comparações mensais
 */

import { endOfMonth, format, getDay, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { assertUUID } from '../api/sanitize'
import { getSupabase } from '../db/supabase'
import type { Categoria, OrigemClassificacao, TipoTransacao, Transacao } from '../types'
import { roundCurrency } from '../utils/currency'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  assertUUID(user.id, 'userId')
  return user.id
}

export interface GastoPorCategoria {
  categoria_id: string
  categoria_nome: string
  categoria_icone?: string
  categoria_cor?: string
  valor_total: number
  quantidade_transacoes: number
  percentual: number // % do total de gastos
}

export interface ComparacaoMensal {
  categoria_id: string
  categoria_nome: string
  mes_atual: number
  mes_anterior: number
  variacao_absoluta: number // mes_atual - mes_anterior
  variacao_percentual: number // ((mes_atual - mes_anterior) / mes_anterior) * 100
  tendencia: 'aumento' | 'reducao' | 'estavel'
}

export interface RelatorioMensal {
  mes_referencia: string // 'YYYY-MM'
  mes_formatado: string // 'Janeiro de 2025'

  // Totais
  total_receitas: number
  total_despesas: number
  total_transferencias: number
  saldo_liquido: number // receitas - despesas

  // Por categoria
  gastos_por_categoria: GastoPorCategoria[]
  receitas_por_categoria: GastoPorCategoria[]

  // Transações
  total_transacoes: number
  transacoes_receita: number
  transacoes_despesa: number
}

export interface RelatorioComparativo {
  mes_atual: RelatorioMensal
  mes_anterior: RelatorioMensal
  comparacoes: ComparacaoMensal[]

  // Resumo de variações
  variacao_total_despesas: number
  variacao_total_receitas: number
  variacao_saldo_liquido: number

  // Destaques
  maiores_aumentos: ComparacaoMensal[] // Top 3
  maiores_reducoes: ComparacaoMensal[] // Top 3
}

export interface GastoRecorrente {
  descricao: string
  valor_medio: number
  meses_presente: number
  total_meses: number
  categoria_nome: string
  categoria_icone?: string
  ultima_ocorrencia: Date
}

export interface PadraoDiaSemana {
  dia: string // 'Dom', 'Seg', etc.
  dia_index: number
  total_despesas: number
  quantidade_transacoes: number
  media_por_transacao: number
}

export interface PrevisaoProximoMes {
  total_previsto: number
  total_receitas_previsto: number
  total_despesas_previsto: number
  categorias: {
    categoria_nome: string
    categoria_icone?: string
    valor_previsto: number
    tendencia: 'aumento' | 'reducao' | 'estavel'
  }[]
  confianca: 'alta' | 'media' | 'baixa' // Based on data consistency
}

class RelatorioService {
  /**
   * Gera relatório de um mês específico
   */
  async gerarRelatorioMensal(
    mesReferencia: string // 'YYYY-MM'
  ): Promise<RelatorioMensal> {
    const supabase = getSupabase()
    const userId = await getUserId()

    // Parse data
    const [ano, mes] = mesReferencia.split('-').map(Number) as [number, number]
    const dataInicio = startOfMonth(new Date(ano, mes - 1))
    const dataFim = endOfMonth(new Date(ano, mes - 1))

    // Busca transações do mês
    const { data: transacoesRaw } = await supabase
      .from('transacoes')
      .select('*')
      .eq('usuario_id', userId)
      .gte('data', dataInicio.toISOString())
      .lte('data', dataFim.toISOString())

    const transacoes: Transacao[] = (transacoesRaw || []).map((row: Record<string, unknown>) => rowToTransacao(row))

    // Busca todas as categorias (para nomes)
    const { data: categoriasRaw } = await supabase
      .from('categorias')
      .select('*')
      .or(`is_sistema.eq.true,usuario_id.eq.${userId}`)

    const categorias: Categoria[] = (categoriasRaw || []).map((row: Record<string, unknown>) => rowToCategoria(row))
    const categoriasMap = new Map(categorias.map((c) => [c.id, c]))

    // Separa por tipo
    const receitas = transacoes.filter((t) => t.tipo === 'receita')
    const despesas = transacoes.filter((t) => t.tipo === 'despesa')
    const transferencias = transacoes.filter((t) => t.tipo === 'transferencia')

    // Calcula totais
    const total_receitas = roundCurrency(receitas.reduce((sum, t) => sum + Math.abs(t.valor), 0))
    const total_despesas = roundCurrency(despesas.reduce((sum, t) => sum + Math.abs(t.valor), 0))
    const total_transferencias = roundCurrency(
      transferencias.reduce((sum, t) => sum + Math.abs(t.valor), 0)
    )
    const saldo_liquido = roundCurrency(total_receitas - total_despesas)

    // Agrupa gastos por categoria
    const gastos_por_categoria = this.agruparPorCategoria(despesas, categoriasMap, total_despesas)

    // Agrupa receitas por categoria
    const receitas_por_categoria = this.agruparPorCategoria(receitas, categoriasMap, total_receitas)

    return {
      mes_referencia: mesReferencia,
      mes_formatado: format(dataInicio, "MMMM 'de' yyyy", { locale: ptBR }),
      total_receitas,
      total_despesas,
      total_transferencias,
      saldo_liquido,
      gastos_por_categoria,
      receitas_por_categoria,
      total_transacoes: transacoes.length,
      transacoes_receita: receitas.length,
      transacoes_despesa: despesas.length,
    }
  }

  /**
   * Gera relatório comparativo entre mês atual e anterior
   */
  async gerarRelatorioComparativo(
    mesReferencia: string // 'YYYY-MM'
  ): Promise<RelatorioComparativo> {
    // Gera relatório do mês atual
    const mes_atual = await this.gerarRelatorioMensal(mesReferencia)

    // Calcula mês anterior
    const [ano, mes] = mesReferencia.split('-').map(Number) as [number, number]
    const dataAtual = new Date(ano, mes - 1)
    const dataAnterior = subMonths(dataAtual, 1)
    const mesAnteriorRef = format(dataAnterior, 'yyyy-MM')

    // Gera relatório do mês anterior
    const mes_anterior = await this.gerarRelatorioMensal(mesAnteriorRef)

    // Calcula comparações por categoria
    const comparacoes = this.calcularComparacoes(
      mes_atual.gastos_por_categoria,
      mes_anterior.gastos_por_categoria
    )

    // Calcula variações totais
    const variacao_total_despesas = mes_atual.total_despesas - mes_anterior.total_despesas
    const variacao_total_receitas = mes_atual.total_receitas - mes_anterior.total_receitas
    const variacao_saldo_liquido = mes_atual.saldo_liquido - mes_anterior.saldo_liquido

    // Destaques (top 3 aumentos e reduções)
    const comparacoesOrdenadas = [...comparacoes].sort(
      (a, b) => b.variacao_absoluta - a.variacao_absoluta
    )

    const maiores_aumentos = comparacoesOrdenadas
      .filter((c) => c.tendencia === 'aumento')
      .slice(0, 3)

    const maiores_reducoes = comparacoesOrdenadas
      .filter((c) => c.tendencia === 'reducao')
      .sort((a, b) => a.variacao_absoluta - b.variacao_absoluta)
      .slice(0, 3)

    return {
      mes_atual,
      mes_anterior,
      comparacoes,
      variacao_total_despesas,
      variacao_total_receitas,
      variacao_saldo_liquido,
      maiores_aumentos,
      maiores_reducoes,
    }
  }

  /**
   * Exporta relatório para CSV
   */
  exportarParaCSV(relatorio: RelatorioMensal): string {
    const linhas: string[] = []

    // Header
    linhas.push(`Relatório Mensal - ${relatorio.mes_formatado}`)
    linhas.push('')

    // Resumo
    linhas.push('RESUMO')
    linhas.push('Tipo,Valor')
    linhas.push(`Receitas,${relatorio.total_receitas.toFixed(2)}`)
    linhas.push(`Despesas,${relatorio.total_despesas.toFixed(2)}`)
    linhas.push(`Saldo Líquido,${relatorio.saldo_liquido.toFixed(2)}`)
    linhas.push('')

    // Gastos por categoria
    linhas.push('GASTOS POR CATEGORIA')
    linhas.push('Categoria,Valor,Quantidade,Percentual')

    relatorio.gastos_por_categoria.forEach((gasto) => {
      linhas.push(
        `${gasto.categoria_nome},${gasto.valor_total.toFixed(2)},${gasto.quantidade_transacoes},${gasto.percentual.toFixed(1)}%`
      )
    })

    linhas.push('')

    // Receitas por categoria
    if (relatorio.receitas_por_categoria.length > 0) {
      linhas.push('RECEITAS POR CATEGORIA')
      linhas.push('Categoria,Valor,Quantidade,Percentual')

      relatorio.receitas_por_categoria.forEach((receita) => {
        linhas.push(
          `${receita.categoria_nome},${receita.valor_total.toFixed(2)},${receita.quantidade_transacoes},${receita.percentual.toFixed(1)}%`
        )
      })
    }

    return linhas.join('\n')
  }

  /**
   * Exporta relatório comparativo para CSV
   */
  exportarComparativoParaCSV(relatorio: RelatorioComparativo): string {
    const linhas: string[] = []

    // Header
    linhas.push(`Relatório Comparativo`)
    linhas.push(`${relatorio.mes_anterior.mes_formatado} vs ${relatorio.mes_atual.mes_formatado}`)
    linhas.push('')

    // Resumo de variações
    linhas.push('RESUMO DE VARIAÇÕES')
    linhas.push('Tipo,Mês Anterior,Mês Atual,Variação Absoluta,Variação %')

    const varPercDespesas =
      relatorio.mes_anterior.total_despesas > 0
        ? (
            (relatorio.variacao_total_despesas / relatorio.mes_anterior.total_despesas) *
            100
          ).toFixed(1)
        : '0.0'

    const varPercReceitas =
      relatorio.mes_anterior.total_receitas > 0
        ? (
            (relatorio.variacao_total_receitas / relatorio.mes_anterior.total_receitas) *
            100
          ).toFixed(1)
        : '0.0'

    linhas.push(
      `Despesas,${relatorio.mes_anterior.total_despesas.toFixed(2)},${relatorio.mes_atual.total_despesas.toFixed(2)},${relatorio.variacao_total_despesas.toFixed(2)},${varPercDespesas}%`
    )

    linhas.push(
      `Receitas,${relatorio.mes_anterior.total_receitas.toFixed(2)},${relatorio.mes_atual.total_receitas.toFixed(2)},${relatorio.variacao_total_receitas.toFixed(2)},${varPercReceitas}%`
    )

    linhas.push(
      `Saldo Líquido,${relatorio.mes_anterior.saldo_liquido.toFixed(2)},${relatorio.mes_atual.saldo_liquido.toFixed(2)},${relatorio.variacao_saldo_liquido.toFixed(2)},-`
    )

    linhas.push('')

    // Comparações por categoria
    linhas.push('COMPARAÇÃO POR CATEGORIA')
    linhas.push('Categoria,Mês Anterior,Mês Atual,Variação Absoluta,Variação %,Tendência')

    relatorio.comparacoes.forEach((comp) => {
      linhas.push(
        `${comp.categoria_nome},${comp.mes_anterior.toFixed(2)},${comp.mes_atual.toFixed(2)},${comp.variacao_absoluta.toFixed(2)},${comp.variacao_percentual.toFixed(1)}%,${comp.tendencia}`
      )
    })

    linhas.push('')

    // Destaques
    if (relatorio.maiores_aumentos.length > 0) {
      linhas.push('MAIORES AUMENTOS')
      linhas.push('Categoria,Variação Absoluta,Variação %')

      relatorio.maiores_aumentos.forEach((dest) => {
        linhas.push(
          `${dest.categoria_nome},${dest.variacao_absoluta.toFixed(2)},${dest.variacao_percentual.toFixed(1)}%`
        )
      })

      linhas.push('')
    }

    if (relatorio.maiores_reducoes.length > 0) {
      linhas.push('MAIORES REDUÇÕES')
      linhas.push('Categoria,Variação Absoluta,Variação %')

      relatorio.maiores_reducoes.forEach((dest) => {
        linhas.push(
          `${dest.categoria_nome},${dest.variacao_absoluta.toFixed(2)},${dest.variacao_percentual.toFixed(1)}%`
        )
      })
    }

    return linhas.join('\n')
  }

  /**
   * Identifica gastos recorrentes (mesma descrição em 2+ meses dos últimos 3)
   */
  async getGastosRecorrentes(mesReferencia: string): Promise<GastoRecorrente[]> {
    const supabase = getSupabase()
    const userId = await getUserId()
    const [ano, mes] = mesReferencia.split('-').map(Number) as [number, number]
    const baseDate = new Date(ano, mes - 1)

    // Fetch 3 months of transactions in a single range query
    const rangeStart = startOfMonth(subMonths(baseDate, 2))
    const rangeEnd = endOfMonth(baseDate)

    const { data: allTxRaw } = await supabase
      .from('transacoes')
      .select('*')
      .eq('usuario_id', userId)
      .gte('data', rangeStart.toISOString())
      .lte('data', rangeEnd.toISOString())

    const allTx: Transacao[] = (allTxRaw || []).map((row: Record<string, unknown>) => rowToTransacao(row))
    const despesas = allTx.filter((t) => t.tipo === 'despesa')

    // Group by normalized description
    const byDesc = new Map<string, { months: Set<string>; txs: Transacao[] }>()
    for (const tx of despesas) {
      const key = tx.descricao.trim().toUpperCase()
      if (!byDesc.has(key)) {
        byDesc.set(key, { months: new Set(), txs: [] })
      }
      const group = byDesc.get(key)!
      const txDate = tx.data instanceof Date ? tx.data : new Date(tx.data)
      group.months.add(format(txDate, 'yyyy-MM'))
      group.txs.push(tx)
    }

    // Get categories for name lookup
    const { data: categoriasRaw } = await supabase
      .from('categorias')
      .select('*')
      .or(`is_sistema.eq.true,usuario_id.eq.${userId}`)

    const categorias: Categoria[] = (categoriasRaw || []).map((row: Record<string, unknown>) => rowToCategoria(row))
    const catMap = new Map(categorias.map((c) => [c.id, c]))

    const result: GastoRecorrente[] = []
    for (const [_key, group] of byDesc) {
      if (group.months.size < 2) continue

      const valores = group.txs.map((t) => Math.abs(t.valor))
      const valor_medio = valores.reduce((a, b) => a + b, 0) / valores.length
      const cat = group.txs[0]?.categoria_id ? catMap.get(group.txs[0].categoria_id) : null
      const dates = group.txs.map((t) => (t.data instanceof Date ? t.data : new Date(t.data)))
      const ultima = dates.sort((a, b) => b.getTime() - a.getTime())[0]!

      result.push({
        descricao: group.txs[0]!.descricao,
        valor_medio,
        meses_presente: group.months.size,
        total_meses: 3,
        categoria_nome: cat?.nome || 'Sem Categoria',
        categoria_icone: cat?.icone,
        ultima_ocorrencia: ultima,
      })
    }

    result.sort((a, b) => b.valor_medio - a.valor_medio)
    return result
  }

  /**
   * Padrão de gastos por dia da semana (mês selecionado)
   */
  async getPadraoPorDiaDaSemana(mesReferencia: string): Promise<PadraoDiaSemana[]> {
    const supabase = getSupabase()
    const userId = await getUserId()
    const [ano, mes] = mesReferencia.split('-').map(Number) as [number, number]
    const dataInicio = startOfMonth(new Date(ano, mes - 1))
    const dataFim = endOfMonth(new Date(ano, mes - 1))

    const { data: transacoesRaw } = await supabase
      .from('transacoes')
      .select('*')
      .eq('usuario_id', userId)
      .gte('data', dataInicio.toISOString())
      .lte('data', dataFim.toISOString())

    const transacoes: Transacao[] = (transacoesRaw || []).map((row: Record<string, unknown>) => rowToTransacao(row))
    const despesas = transacoes.filter((t) => t.tipo === 'despesa')

    const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const byDay = new Map<number, { total: number; count: number }>()
    for (let i = 0; i < 7; i++) {
      byDay.set(i, { total: 0, count: 0 })
    }

    for (const tx of despesas) {
      const d = tx.data instanceof Date ? tx.data : new Date(tx.data)
      const dayIndex = getDay(d)
      const entry = byDay.get(dayIndex)!
      entry.total += Math.abs(tx.valor)
      entry.count += 1
    }

    return DIAS.map((dia, i) => {
      const entry = byDay.get(i)!
      return {
        dia,
        dia_index: i,
        total_despesas: entry.total,
        quantidade_transacoes: entry.count,
        media_por_transacao: entry.count > 0 ? entry.total / entry.count : 0,
      }
    })
  }

  /**
   * Previsão do próximo mês (média ponderada dos últimos 3 meses)
   */
  async getPrevisaoProximoMes(mesReferencia: string): Promise<PrevisaoProximoMes> {
    const [ano, mes] = mesReferencia.split('-').map(Number) as [number, number]
    const baseDate = new Date(ano, mes - 1)

    // Get 3 months of reports (weights: 50% most recent, 30% middle, 20% oldest)
    const weights = [0.2, 0.3, 0.5]
    const meses = [subMonths(baseDate, 2), subMonths(baseDate, 1), baseDate]

    const reports = await Promise.all(
      meses.map((m) => this.gerarRelatorioMensal(format(m, 'yyyy-MM')))
    )

    // Weighted average totals
    const total_receitas_previsto = reports.reduce(
      (sum, r, i) => sum + r.total_receitas * weights[i]!,
      0
    )
    const total_despesas_previsto = reports.reduce(
      (sum, r, i) => sum + r.total_despesas * weights[i]!,
      0
    )
    const total_previsto = total_receitas_previsto - total_despesas_previsto

    // Per-category forecast (use expense categories)
    const allCatIds = new Set<string>()
    for (const r of reports) {
      for (const g of r.gastos_por_categoria) {
        allCatIds.add(g.categoria_id)
      }
    }

    const categorias: PrevisaoProximoMes['categorias'] = []
    for (const catId of allCatIds) {
      const valores = reports.map((r) => {
        const g = r.gastos_por_categoria.find((x) => x.categoria_id === catId)
        return g?.valor_total || 0
      })

      const valor_previsto = valores.reduce((sum, v, i) => sum + v * weights[i]!, 0)
      if (valor_previsto < 10) continue // Skip negligible

      const catInfo = reports
        .flatMap((r) => r.gastos_por_categoria)
        .find((g) => g.categoria_id === catId)

      // Trend: compare latest month vs weighted average of previous 2
      const recentVal = valores[2] || 0
      const olderAvg = (valores[0]! + valores[1]!) / 2
      const changePct = olderAvg > 0 ? ((recentVal - olderAvg) / olderAvg) * 100 : 0
      const tendencia: 'aumento' | 'reducao' | 'estavel' =
        changePct > 10 ? 'aumento' : changePct < -10 ? 'reducao' : 'estavel'

      categorias.push({
        categoria_nome: catInfo?.categoria_nome || 'Sem Categoria',
        categoria_icone: catInfo?.categoria_icone,
        valor_previsto,
        tendencia,
      })
    }

    categorias.sort((a, b) => b.valor_previsto - a.valor_previsto)

    // Confidence: based on how consistent the 3 months are
    const stdDev =
      Math.sqrt(
        reports.reduce((sum, r) => sum + (r.total_despesas - total_despesas_previsto) ** 2, 0) / 3
      ) / total_despesas_previsto

    const confianca: 'alta' | 'media' | 'baixa' =
      stdDev < 0.15 ? 'alta' : stdDev < 0.35 ? 'media' : 'baixa'

    return {
      total_previsto,
      total_receitas_previsto,
      total_despesas_previsto,
      categorias: categorias.slice(0, 8),
      confianca,
    }
  }

  /**
   * Helper: Agrupa transações por categoria
   */
  private agruparPorCategoria(
    transacoes: Transacao[],
    categoriasMap: Map<string, Categoria>,
    total: number
  ): GastoPorCategoria[] {
    // Agrupa por categoria_id
    const grupos = new Map<string, Transacao[]>()

    transacoes.forEach((t) => {
      const catId = t.categoria_id || 'sem_categoria'
      if (!grupos.has(catId)) {
        grupos.set(catId, [])
      }
      grupos.get(catId)!.push(t)
    })

    // Calcula totais por categoria
    const resultado: GastoPorCategoria[] = []

    grupos.forEach((transacoesCategoria, catId) => {
      const categoria = categoriasMap.get(catId)
      const valor_total = roundCurrency(
        transacoesCategoria.reduce((sum, t) => sum + Math.abs(t.valor), 0)
      )
      const percentual = total > 0 ? roundCurrency((valor_total / total) * 100) : 0

      resultado.push({
        categoria_id: catId,
        categoria_nome: categoria?.nome || 'Sem Categoria',
        categoria_icone: categoria?.icone,
        categoria_cor: categoria?.cor,
        valor_total,
        quantidade_transacoes: transacoesCategoria.length,
        percentual,
      })
    })

    // Ordena por valor (maior primeiro)
    resultado.sort((a, b) => b.valor_total - a.valor_total)

    return resultado
  }

  /**
   * Helper: Calcula comparações entre dois meses
   */
  private calcularComparacoes(
    gastosAtual: GastoPorCategoria[],
    gastosAnterior: GastoPorCategoria[]
  ): ComparacaoMensal[] {
    const comparacoes: ComparacaoMensal[] = []

    // Cria map de gastos anteriores para lookup rápido
    const anteriorMap = new Map(gastosAnterior.map((g) => [g.categoria_id, g.valor_total]))

    // Todas as categorias únicas (atual + anterior)
    const todasCategorias = new Set([
      ...gastosAtual.map((g) => g.categoria_id),
      ...gastosAnterior.map((g) => g.categoria_id),
    ])

    todasCategorias.forEach((catId) => {
      const gastoAtual = gastosAtual.find((g) => g.categoria_id === catId)
      const valorAtual = gastoAtual?.valor_total || 0
      const valorAnterior = anteriorMap.get(catId) || 0

      const variacao_absoluta = valorAtual - valorAnterior
      const variacao_percentual =
        valorAnterior > 0 ? (variacao_absoluta / valorAnterior) * 100 : valorAtual > 0 ? 100 : 0

      // Define tendência (tolerância de 5% para "estável")
      let tendencia: 'aumento' | 'reducao' | 'estavel'
      if (Math.abs(variacao_percentual) < 5) {
        tendencia = 'estavel'
      } else if (variacao_absoluta > 0) {
        tendencia = 'aumento'
      } else {
        tendencia = 'reducao'
      }

      comparacoes.push({
        categoria_id: catId,
        categoria_nome: gastoAtual?.categoria_nome || 'Sem Categoria',
        mes_atual: valorAtual,
        mes_anterior: valorAnterior,
        variacao_absoluta,
        variacao_percentual,
        tendencia,
      })
    })

    // Ordena por variação absoluta (maior primeiro)
    comparacoes.sort((a, b) => Math.abs(b.variacao_absoluta) - Math.abs(a.variacao_absoluta))

    return comparacoes
  }
}

// Row converters
function rowToTransacao(row: Record<string, unknown>): Transacao {
  return {
    id: row.id as string,
    conta_id: row.conta_id as string,
    categoria_id: row.categoria_id as string | undefined,
    data: new Date(row.data as string),
    descricao: row.descricao as string,
    valor: row.valor as number,
    tipo: row.tipo as 'receita' | 'despesa' | 'transferencia',
    observacoes: row.observacoes as string | undefined,
    tags: row.tags as string | undefined,
    transferencia_id: row.transferencia_id as string | undefined,
    conta_destino_id: row.conta_destino_id as string | undefined,
    parcelado: row.parcelado as boolean | undefined,
    parcela_numero: row.parcela_numero as number | undefined,
    parcela_total: row.parcela_total as number | undefined,
    grupo_parcelamento_id: row.grupo_parcelamento_id as string | undefined,
    classificacao_confirmada: row.classificacao_confirmada as boolean | undefined,
    classificacao_origem: row.classificacao_origem as OrigemClassificacao | undefined,
    classificacao_confianca: row.classificacao_confianca as number | undefined,
    hash: row.hash as string | undefined,
    origem_arquivo: row.origem_arquivo as string | undefined,
    origem_linha: row.origem_linha as number | undefined,
    usuario_id: row.usuario_id as string,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  }
}

function rowToCategoria(row: Record<string, unknown>): Categoria {
  return {
    id: row.id as string,
    nome: row.nome as string,
    tipo: row.tipo as TipoTransacao,
    icone: row.icone as string | undefined,
    cor: row.cor as string | undefined,
    pai_id: row.pai_id as string | undefined,
    ordem: (row.ordem as number) ?? 0,
    ativa: (row.ativa as boolean) ?? true,
    is_sistema: row.is_sistema as boolean | undefined,
    usuario_id: row.usuario_id as string | undefined,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  }
}

export const relatorioService = new RelatorioService()
