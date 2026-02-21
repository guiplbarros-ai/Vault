/**
 * Serviço de Patrimônio
 * Agent CORE: Implementador
 *
 * Fornece cálculos agregados de patrimônio total (contas + investimentos)
 */

import { getDB } from '../db/client'
import { getCurrentUserId } from '../db/seed-usuarios'
import type {
  Instituicao,
  PatrimonioPorInstituicao,
  PatrimonioPorTipo,
  PatrimonioSnapshot,
  PatrimonioTotal,
  RentabilidadeHistorico,
  TipoInvestimento,
} from '../types'
import { contaService } from './conta.service'
import { investimentoService } from './investimento.service'

export class PatrimonioService {
  /**
   * Calcula o patrimônio total (contas + investimentos)
   */
  async getPatrimonioTotal(): Promise<PatrimonioTotal> {
    // Busca todas as contas ativas e soma seus saldos
    const contas = await contaService.listContas({ incluirInativas: false })
    const saldo_contas = contas.reduce((total, conta) => total + conta.saldo_atual, 0)

    const saldo_investimentos = await investimentoService.getValorTotalAtual()
    const patrimonio_total = saldo_contas + saldo_investimentos

    // Calcular variação do mês (simplificado - pode ser melhorado com histórico)
    const valor_aplicado = await investimentoService.getValorTotalInvestido()
    const rentabilidade_investimentos =
      valor_aplicado > 0 ? ((saldo_investimentos - valor_aplicado) / valor_aplicado) * 100 : 0

    // Calculate month variation from snapshots
    let variacao_mes = 0
    let variacao_mes_percentual = 0
    try {
      const db = getDB()
      const currentUserId = getCurrentUserId()
      const now = new Date()
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMes = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
      const prevSnapshot = await db.patrimonio_snapshots
        .filter((s) => s.usuario_id === currentUserId && s.mes === prevMes)
        .first()
      if (prevSnapshot) {
        variacao_mes = patrimonio_total - prevSnapshot.patrimonio_total
        variacao_mes_percentual =
          prevSnapshot.patrimonio_total > 0
            ? (variacao_mes / prevSnapshot.patrimonio_total) * 100
            : 0
      }
    } catch (error) {
      console.error(
        '[PatrimonioService] Erro ao calcular variação mensal:',
        error instanceof Error ? error.message : error
      )
    }

    return {
      saldo_contas,
      saldo_investimentos,
      patrimonio_total,
      variacao_mes,
      variacao_mes_percentual,
      rentabilidade_investimentos,
      ultima_atualizacao: new Date(),
    }
  }

  /**
   * Agrupa investimentos por tipo
   */
  async getPatrimonioPorTipo(): Promise<PatrimonioPorTipo[]> {
    const investimentos = await investimentoService.getInvestimentosAtivos()

    // Agrupar por tipo
    const grouped = new Map<TipoInvestimento, PatrimonioPorTipo>()

    for (const inv of investimentos) {
      if (!grouped.has(inv.tipo)) {
        grouped.set(inv.tipo, {
          tipo: inv.tipo,
          valor_aplicado: 0,
          valor_atual: 0,
          rentabilidade: 0,
          rentabilidade_percentual: 0,
          quantidade_ativos: 0,
          investimentos: [],
        })
      }

      const grupo = grouped.get(inv.tipo)!
      grupo.valor_aplicado += inv.valor_aplicado
      grupo.valor_atual += inv.valor_atual
      grupo.quantidade_ativos += 1
      grupo.investimentos.push(inv)
    }

    // Calcular rentabilidades
    const result: PatrimonioPorTipo[] = []
    for (const grupo of grouped.values()) {
      grupo.rentabilidade = grupo.valor_atual - grupo.valor_aplicado
      grupo.rentabilidade_percentual =
        grupo.valor_aplicado > 0 ? (grupo.rentabilidade / grupo.valor_aplicado) * 100 : 0
      result.push(grupo)
    }

    // Ordenar por valor atual (maior primeiro)
    result.sort((a, b) => b.valor_atual - a.valor_atual)

    return result
  }

  /**
   * Agrupa patrimônio por instituição (contas + investimentos)
   */
  async getPatrimonioPorInstituicao(): Promise<PatrimonioPorInstituicao[]> {
    const db = getDB()

    const contas = await contaService.listContas({ incluirInativas: false })
    const investimentos = await investimentoService.getInvestimentosAtivos()

    // Buscar todas as instituições únicas
    const instituicaoIds = new Set<string>()
    contas.forEach((c) => instituicaoIds.add(c.instituicao_id))
    investimentos.forEach((i) => instituicaoIds.add(i.instituicao_id))

    // Fetch all institutions in a single query (avoid N+1)
    const instituicaoIdList = [...instituicaoIds]
    const instituicoesList = await db.instituicoes.bulkGet(instituicaoIdList)
    const instituicoesMap = new Map<string, Instituicao>()
    for (let i = 0; i < instituicaoIdList.length; i++) {
      const inst = instituicoesList[i]
      if (inst) instituicoesMap.set(instituicaoIdList[i]!, inst)
    }

    const result: PatrimonioPorInstituicao[] = []
    let patrimonio_total = 0

    for (const inst_id of instituicaoIds) {
      const instituicao = instituicoesMap.get(inst_id)
      if (!instituicao) continue

      const contas_instituicao = contas.filter((c) => c.instituicao_id === inst_id)
      const investimentos_instituicao = investimentos.filter((i) => i.instituicao_id === inst_id)

      const valor_contas = contas_instituicao.reduce((sum, c) => sum + c.saldo_atual, 0)
      const valor_investimentos = investimentos_instituicao.reduce(
        (sum, i) => sum + i.valor_atual,
        0
      )
      const valor_total = valor_contas + valor_investimentos

      patrimonio_total += valor_total

      result.push({
        instituicao,
        valor_contas,
        valor_investimentos,
        valor_total,
        percentual_patrimonio: 0, // Será calculado depois
        contas: contas_instituicao,
        investimentos: investimentos_instituicao,
      })
    }

    // Calcular percentuais
    for (const item of result) {
      item.percentual_patrimonio =
        patrimonio_total > 0 ? (item.valor_total / patrimonio_total) * 100 : 0
    }

    // Ordenar por valor total (maior primeiro)
    result.sort((a, b) => b.valor_total - a.valor_total)

    return result
  }

  /**
   * Retorna histórico de rentabilidade dos investimentos
   * (Por enquanto retorna apenas um snapshot atual, pode ser expandido com histórico real)
   */
  async getRentabilidadeHistorico(): Promise<RentabilidadeHistorico[]> {
    const investimentos = await investimentoService.getInvestimentosAtivos()

    // Por enquanto, retorna apenas um ponto com os dados atuais
    // No futuro, pode usar a tabela historico_investimentos para gerar série temporal
    const valor_aplicado = investimentos.reduce((sum, i) => sum + i.valor_aplicado, 0)
    const valor_atual = investimentos.reduce((sum, i) => sum + i.valor_atual, 0)
    const rentabilidade = valor_atual - valor_aplicado
    const rentabilidade_percentual = valor_aplicado > 0 ? (rentabilidade / valor_aplicado) * 100 : 0

    return [
      {
        data: new Date(),
        valor_aplicado,
        valor_atual,
        rentabilidade,
        rentabilidade_percentual,
      },
    ]
  }

  /**
   * Calcula diversificação do patrimônio
   */
  async getDiversificacao(): Promise<{
    por_tipo_conta: Array<{ tipo: string; valor: number; percentual: number }>
    por_tipo_investimento: Array<{ tipo: string; valor: number; percentual: number }>
    contas_vs_investimentos: {
      contas: number
      investimentos: number
      percentual_contas: number
      percentual_investimentos: number
    }
  }> {
    const contas = await contaService.listContas({ incluirInativas: false })
    const investimentos = await investimentoService.getInvestimentosAtivos()

    const saldo_total_contas = contas.reduce((sum, c) => sum + c.saldo_atual, 0)
    const saldo_total_investimentos = investimentos.reduce((sum, i) => sum + i.valor_atual, 0)
    const patrimonio_total = saldo_total_contas + saldo_total_investimentos

    // Diversificação por tipo de conta
    const por_tipo_conta_map = new Map<string, number>()
    for (const conta of contas) {
      const current = por_tipo_conta_map.get(conta.tipo) || 0
      por_tipo_conta_map.set(conta.tipo, current + conta.saldo_atual)
    }

    const por_tipo_conta = Array.from(por_tipo_conta_map.entries()).map(([tipo, valor]) => ({
      tipo,
      valor,
      percentual: patrimonio_total > 0 ? (valor / patrimonio_total) * 100 : 0,
    }))

    // Diversificação por tipo de investimento
    const por_tipo_investimento_map = new Map<string, number>()
    for (const inv of investimentos) {
      const current = por_tipo_investimento_map.get(inv.tipo) || 0
      por_tipo_investimento_map.set(inv.tipo, current + inv.valor_atual)
    }

    const por_tipo_investimento = Array.from(por_tipo_investimento_map.entries()).map(
      ([tipo, valor]) => ({
        tipo,
        valor,
        percentual: patrimonio_total > 0 ? (valor / patrimonio_total) * 100 : 0,
      })
    )

    // Contas vs Investimentos
    const contas_vs_investimentos = {
      contas: saldo_total_contas,
      investimentos: saldo_total_investimentos,
      percentual_contas: patrimonio_total > 0 ? (saldo_total_contas / patrimonio_total) * 100 : 0,
      percentual_investimentos:
        patrimonio_total > 0 ? (saldo_total_investimentos / patrimonio_total) * 100 : 0,
    }

    return {
      por_tipo_conta,
      por_tipo_investimento,
      contas_vs_investimentos,
    }
  }

  // ========================================================================
  // Snapshots — evolução patrimonial histórica
  // ========================================================================

  /**
   * Salva o snapshot do mês atual (upsert — 1 snapshot por mês)
   */
  async saveCurrentSnapshot(): Promise<PatrimonioSnapshot> {
    const db = getDB()
    const currentUserId = getCurrentUserId()
    const now = new Date()
    const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const patrimonio = await this.getPatrimonioTotal()

    const snapshot: PatrimonioSnapshot = {
      id: `snapshot-${currentUserId}-${mes}`,
      usuario_id: currentUserId,
      mes,
      saldo_contas: patrimonio.saldo_contas,
      saldo_investimentos: patrimonio.saldo_investimentos,
      patrimonio_total: patrimonio.patrimonio_total,
      created_at: now,
    }

    await db.patrimonio_snapshots.put(snapshot)
    return snapshot
  }

  /**
   * Retorna todos os snapshots ordenados por mês
   */
  async getSnapshots(): Promise<PatrimonioSnapshot[]> {
    const db = getDB()
    const currentUserId = getCurrentUserId()

    const snapshots = await db.patrimonio_snapshots
      .filter((s) => s.usuario_id === currentUserId)
      .toArray()

    // Sort by mes string (YYYY-MM sorts naturally)
    snapshots.sort((a, b) => a.mes.localeCompare(b.mes))
    return snapshots
  }

  /**
   * Gera snapshots retroativos baseado nas transações históricas.
   * Limited to last 6 months to avoid error accumulation in backward estimation.
   * For each past month, estimates patrimônio by walking backwards from current balance.
   */
  async generateRetroactiveSnapshots(): Promise<number> {
    const db = getDB()
    const currentUserId = getCurrentUserId()

    // 1. Get current patrimonio
    const currentPatrimonio = await this.getPatrimonioTotal()

    // 2. Get all transactions
    const transacoes = await db.transacoes
      .filter((t) => t.usuario_id === currentUserId)
      .toArray()

    if (transacoes.length === 0) return 0

    // 3. Only go back 4 months max (estimation gets unreliable further back)
    const now = new Date()
    const maxMonthsBack = 4
    const startDate = new Date(now.getFullYear(), now.getMonth() - maxMonthsBack, 1)

    // 4. Calculate monthly net flows (receitas - despesas) for recent months only
    const monthlyNet = new Map<string, number>()
    for (const tx of transacoes) {
      const d = tx.data instanceof Date ? tx.data : new Date(tx.data)
      if (d < startDate) continue
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

      const current = monthlyNet.get(monthKey) || 0
      if (tx.tipo === 'receita') {
        monthlyNet.set(monthKey, current + Math.abs(tx.valor))
      } else if (tx.tipo === 'despesa') {
        monthlyNet.set(monthKey, current - Math.abs(tx.valor))
      }
      // transfers don't affect net patrimonio
    }

    // 5. Generate month list (last 6 months + current)
    const months: string[] = []
    const cursor = new Date(startDate)
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    while (cursor <= endMonth) {
      months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
      cursor.setMonth(cursor.getMonth() + 1)
    }

    // 6. Walk backwards from current month
    let runningBalance = currentPatrimonio.saldo_contas
    const snapshotData = new Map<string, { contas: number; investimentos: number }>()

    for (let i = months.length - 1; i >= 0; i--) {
      const m = months[i]!
      if (i === months.length - 1) {
        // Current month = real value
        snapshotData.set(m, {
          contas: currentPatrimonio.saldo_contas,
          investimentos: currentPatrimonio.saldo_investimentos,
        })
      } else {
        // Previous month: subtract the NEXT month's net flow to estimate
        const nextMonth = months[i + 1]!
        const nextNet = monthlyNet.get(nextMonth) || 0
        runningBalance = runningBalance - nextNet
        snapshotData.set(m, {
          contas: runningBalance,
          investimentos: currentPatrimonio.saldo_investimentos,
        })
      }
    }

    // 7. Save snapshots using put (upsert) with deterministic IDs to prevent duplicates
    let created = 0
    const existingSnapshots = await this.getSnapshots()
    const existingMonths = new Set(existingSnapshots.map((s) => s.mes))

    for (const [mes, data] of snapshotData) {
      if (existingMonths.has(mes)) continue

      const snapshot: PatrimonioSnapshot = {
        id: `snapshot-${currentUserId}-${mes}`,
        usuario_id: currentUserId,
        mes,
        saldo_contas: data.contas,
        saldo_investimentos: data.investimentos,
        patrimonio_total: data.contas + data.investimentos,
        created_at: new Date(),
      }
      await db.patrimonio_snapshots.put(snapshot)
      created++
    }

    return created
  }

  /**
   * Retorna resumo do patrimônio para dashboard
   */
  async getResumoPatrimonio(): Promise<{
    patrimonio_total: number
    contas: number
    investimentos: number
    rentabilidade_total: number
    rentabilidade_percentual: number
    maior_investimento: { nome: string; valor: number } | null
    maior_conta: { nome: string; valor: number } | null
  }> {
    const patrimonioTotal = await this.getPatrimonioTotal()
    const investimentos = await investimentoService.getInvestimentosAtivos()
    const contas = await contaService.listContas({ incluirInativas: false })

    // Maior investimento
    let maior_investimento = null
    if (investimentos.length > 0) {
      const maior = investimentos.reduce((max, inv) =>
        inv.valor_atual > max.valor_atual ? inv : max
      )
      maior_investimento = { nome: maior.nome, valor: maior.valor_atual }
    }

    // Maior conta
    let maior_conta = null
    if (contas.length > 0) {
      const maior = contas.reduce((max, conta) =>
        conta.saldo_atual > max.saldo_atual ? conta : max
      )
      maior_conta = { nome: maior.nome, valor: maior.saldo_atual }
    }

    const valor_aplicado = await investimentoService.getValorTotalInvestido()
    const rentabilidade_total = patrimonioTotal.saldo_investimentos - valor_aplicado

    return {
      patrimonio_total: patrimonioTotal.patrimonio_total,
      contas: patrimonioTotal.saldo_contas,
      investimentos: patrimonioTotal.saldo_investimentos,
      rentabilidade_total,
      rentabilidade_percentual: patrimonioTotal.rentabilidade_investimentos,
      maior_investimento,
      maior_conta,
    }
  }
}

// Singleton instance
export const patrimonioService = new PatrimonioService()
