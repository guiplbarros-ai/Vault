/**
 * Imposto de Renda Service
 *
 * Pulls data automatically from transactions and investments to generate
 * tax-relevant summaries for the Brazilian income tax declaration (IRPF).
 */

import { endOfMonth, format, startOfMonth } from 'date-fns'
import { getDB } from '../db/client'
import type { Conta, Investimento, Transacao } from '../types'

// ============================================================================
// Types
// ============================================================================

export interface RendimentoMensal {
  mes: string // YYYY-MM
  mes_label: string // "Jan/2025"
  total: number
  transacoes: number
}

export interface ResumoRendimentos {
  ano: number
  total_rendimentos: number
  meses: RendimentoMensal[]
  por_categoria: { nome: string; icone?: string; total: number }[]
}

export interface DeducaoCategoria {
  nome: string
  icone?: string
  total: number
  limite_legal?: number
  valor_dedutivel: number
  transacoes: number
}

export interface ResumoDeducoes {
  ano: number
  total_despesas_dedutiveis: number
  total_dedutivel: number
  categorias: DeducaoCategoria[]
}

export interface BemDireito {
  tipo: 'investimento' | 'conta_bancaria'
  descricao: string
  instituicao: string
  valor_aplicado?: number
  valor_atual: number
  data_aquisicao?: Date
  ticker?: string
}

export interface ResumoBensDireitos {
  ano: number
  total_investimentos: number
  total_contas: number
  investimentos: BemDireito[]
  contas_bancarias: BemDireito[]
}

// ============================================================================
// Service
// ============================================================================

export class ImpostoRendaService {
  /**
   * Returns income summary for a calendar year.
   * Pulls all 'receita' transactions for the 12 months.
   */
  async getRendimentos(ano: number): Promise<ResumoRendimentos> {
    const db = getDB()

    const meses: RendimentoMensal[] = []
    let totalGeral = 0

    const porCategoria = new Map<string, { nome: string; icone?: string; total: number }>()

    // Get all categories for lookup
    const categorias = await db.categorias.toArray()
    const catMap = new Map(categorias.map((c) => [c.id, c]))

    for (let m = 0; m < 12; m++) {
      const dt = new Date(ano, m, 1)
      const inicio = startOfMonth(dt)
      const fim = endOfMonth(dt)

      const txs = await db.transacoes
        .where('data')
        .between(inicio, fim, true, true)
        .toArray()

      const receitas = txs.filter((t: Transacao) => t.tipo === 'receita')
      const totalMes = receitas.reduce((s: number, t: Transacao) => s + Math.abs(t.valor), 0)

      meses.push({
        mes: format(dt, 'yyyy-MM'),
        mes_label: format(dt, "MMM/yyyy"),
        total: totalMes,
        transacoes: receitas.length,
      })

      totalGeral += totalMes

      // Aggregate by category
      for (const tx of receitas) {
        const catId = tx.categoria_id || 'sem_categoria'
        const cat = catMap.get(catId)
        const nome = cat?.nome || 'Sem Categoria'
        const existing = porCategoria.get(nome)
        if (existing) {
          existing.total += Math.abs(tx.valor)
        } else {
          porCategoria.set(nome, { nome, icone: cat?.icone, total: Math.abs(tx.valor) })
        }
      }
    }

    return {
      ano,
      total_rendimentos: totalGeral,
      meses,
      por_categoria: [...porCategoria.values()].sort((a, b) => b.total - a.total),
    }
  }

  /**
   * Returns deductible expenses for the calendar year.
   * Deductible categories: Saúde (no limit), Educação (R$ 3,561.50 limit).
   */
  async getDeducoes(ano: number): Promise<ResumoDeducoes> {
    const db = getDB()
    const categorias = await db.categorias.toArray()

    // Find deductible parent categories and their subcategories
    const deductibleParents = new Map<string, { nome: string; icone?: string; limite?: number }>()
    const deductibleIds = new Set<string>()

    for (const cat of categorias) {
      const nomeL = cat.nome.toLowerCase()
      if (nomeL === 'saúde' || nomeL === 'saude') {
        deductibleParents.set(cat.id, { nome: cat.nome, icone: cat.icone })
        deductibleIds.add(cat.id)
      }
      if (nomeL === 'educação' || nomeL === 'educacao') {
        deductibleParents.set(cat.id, { nome: cat.nome, icone: cat.icone, limite: 3561.5 })
        deductibleIds.add(cat.id)
      }
    }

    // Include subcategories
    for (const cat of categorias) {
      if (cat.pai_id && deductibleIds.has(cat.pai_id)) {
        deductibleIds.add(cat.id)
      }
    }

    // Get transactions for the year
    const inicio = new Date(ano, 0, 1)
    const fim = new Date(ano, 11, 31, 23, 59, 59)
    const txs = await db.transacoes
      .where('data')
      .between(inicio, fim, true, true)
      .toArray()

    // Filter deductible expenses
    const deductibleTxs = txs.filter(
      (t: Transacao) => t.tipo === 'despesa' && t.categoria_id && deductibleIds.has(t.categoria_id)
    )

    // Group by parent category
    const byParent = new Map<string, { total: number; count: number }>()

    for (const tx of deductibleTxs) {
      const cat = categorias.find((c) => c.id === tx.categoria_id)
      if (!cat) continue
      // Resolve to parent category
      const parentId = cat.pai_id || cat.id
      const existing = byParent.get(parentId)
      if (existing) {
        existing.total += Math.abs(tx.valor)
        existing.count++
      } else {
        byParent.set(parentId, { total: Math.abs(tx.valor), count: 1 })
      }
    }

    const result: DeducaoCategoria[] = []
    let totalDedutivel = 0
    let totalDespesas = 0

    for (const [parentId, info] of byParent) {
      const parentDef = deductibleParents.get(parentId)
      if (!parentDef) continue

      const valorDedutivel = parentDef.limite
        ? Math.min(info.total, parentDef.limite)
        : info.total

      totalDespesas += info.total
      totalDedutivel += valorDedutivel

      result.push({
        nome: parentDef.nome,
        icone: parentDef.icone,
        total: info.total,
        limite_legal: parentDef.limite,
        valor_dedutivel: valorDedutivel,
        transacoes: info.count,
      })
    }

    return {
      ano,
      total_despesas_dedutiveis: totalDespesas,
      total_dedutivel: totalDedutivel,
      categorias: result.sort((a, b) => b.total - a.total),
    }
  }

  /**
   * Returns assets and rights for the calendar year.
   * Includes: active investments and bank accounts with balance > R$140.
   */
  async getBensDireitos(ano: number): Promise<ResumoBensDireitos> {
    const db = getDB()

    // Get institutions for name lookup
    const instituicoes = await db.instituicoes.toArray()
    const instMap = new Map(instituicoes.map((i) => [i.id, i.nome]))

    // Investments
    const investimentos = await db.investimentos.toArray()
    const investimentosAtivos = investimentos.filter(
      (i: Investimento) => i.status === 'ativo'
    )

    const invItems: BemDireito[] = investimentosAtivos.map((i: Investimento) => ({
      tipo: 'investimento' as const,
      descricao: i.nome,
      instituicao: instMap.get(i.instituicao_id) || 'N/A',
      valor_aplicado: i.valor_aplicado,
      valor_atual: i.valor_atual,
      data_aquisicao: i.data_aplicacao,
      ticker: i.ticker,
    }))

    // Bank accounts with balance > R$140
    const contas = await db.contas.toArray()
    const contasRelevantes = contas.filter(
      (c: Conta) => c.ativa && Math.abs(c.saldo_atual) > 140
    )

    const contaItems: BemDireito[] = contasRelevantes.map((c: Conta) => ({
      tipo: 'conta_bancaria' as const,
      descricao: c.nome,
      instituicao: instMap.get(c.instituicao_id) || 'N/A',
      valor_atual: c.saldo_atual,
    }))

    return {
      ano,
      total_investimentos: invItems.reduce((s, i) => s + i.valor_atual, 0),
      total_contas: contaItems.reduce((s, c) => s + c.valor_atual, 0),
      investimentos: invItems.sort((a, b) => b.valor_atual - a.valor_atual),
      contas_bancarias: contaItems.sort((a, b) => b.valor_atual - a.valor_atual),
    }
  }
}

// Singleton
let instance: ImpostoRendaService | null = null

export function getImpostoRendaService(): ImpostoRendaService {
  if (!instance) {
    instance = new ImpostoRendaService()
  }
  return instance
}
