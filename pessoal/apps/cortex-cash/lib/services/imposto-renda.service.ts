/**
 * Imposto de Renda Service
 *
 * Pulls data automatically from transactions and investments to generate
 * tax-relevant summaries for the Brazilian income tax declaration (IRPF).
 */

import { endOfMonth, format, startOfMonth } from 'date-fns'
import { assertUUID } from '../api/sanitize'
import { getSupabase } from '../db/supabase'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  assertUUID(user.id, 'userId')
  return user.id
}

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
    const supabase = getSupabase()
    const userId = await getUserId()

    const meses: RendimentoMensal[] = []
    let totalGeral = 0

    const porCategoria = new Map<string, { nome: string; icone?: string; total: number }>()

    // Get all categories for lookup
    const { data: categoriasData } = await supabase
      .from('categorias')
      .select('id, nome, icone')
      .or(`is_sistema.eq.true,usuario_id.eq.${userId}`)

    const catMap = new Map<string, Record<string, unknown>>(
      (categoriasData || []).map((c: Record<string, unknown>) => [c.id as string, c])
    )

    // Fetch all year transactions in one query (instead of 12 queries)
    const yearStart = new Date(ano, 0, 1)
    const yearEnd = new Date(ano, 11, 31, 23, 59, 59)

    const { data: allTxData } = await supabase
      .from('transacoes')
      .select('data, tipo, valor, categoria_id')
      .eq('usuario_id', userId)
      .eq('tipo', 'receita')
      .gte('data', yearStart.toISOString())
      .lte('data', yearEnd.toISOString())

    const allTx = allTxData || []

    for (let m = 0; m < 12; m++) {
      const dt = new Date(ano, m, 1)
      const inicio = startOfMonth(dt)
      const fim = endOfMonth(dt)

      const receitas = allTx.filter((t: Record<string, unknown>) => {
        const d = new Date(t.data as string)
        return d >= inicio && d <= fim
      })

      const totalMes = receitas.reduce(
        (s: number, t: Record<string, unknown>) => s + Math.abs(t.valor as number),
        0
      )

      meses.push({
        mes: format(dt, 'yyyy-MM'),
        mes_label: format(dt, 'MMM/yyyy'),
        total: totalMes,
        transacoes: receitas.length,
      })

      totalGeral += totalMes

      // Aggregate by category
      for (const tx of receitas) {
        const catId = (tx.categoria_id as string) || 'sem_categoria'
        const cat = catMap.get(catId)
        const nome = (cat?.nome as string) || 'Sem Categoria'
        const existing = porCategoria.get(nome)
        if (existing) {
          existing.total += Math.abs(tx.valor as number)
        } else {
          porCategoria.set(nome, {
            nome,
            icone: cat?.icone as string | undefined,
            total: Math.abs(tx.valor as number),
          })
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
    const supabase = getSupabase()
    const userId = await getUserId()

    const { data: categoriasData } = await supabase
      .from('categorias')
      .select('id, nome, icone, pai_id')
      .or(`is_sistema.eq.true,usuario_id.eq.${userId}`)

    const categorias = categoriasData || []

    // Find deductible parent categories and their subcategories
    const deductibleParents = new Map<string, { nome: string; icone?: string; limite?: number }>()
    const deductibleIds = new Set<string>()

    for (const cat of categorias) {
      const nomeL = (cat.nome as string).toLowerCase()
      if (nomeL === 'saúde' || nomeL === 'saude') {
        deductibleParents.set(cat.id as string, {
          nome: cat.nome as string,
          icone: cat.icone as string | undefined,
        })
        deductibleIds.add(cat.id as string)
      }
      if (nomeL === 'educação' || nomeL === 'educacao') {
        deductibleParents.set(cat.id as string, {
          nome: cat.nome as string,
          icone: cat.icone as string | undefined,
          limite: 3561.5,
        })
        deductibleIds.add(cat.id as string)
      }
    }

    // Include subcategories
    for (const cat of categorias) {
      if (cat.pai_id && deductibleIds.has(cat.pai_id as string)) {
        deductibleIds.add(cat.id as string)
      }
    }

    // Get transactions for the year
    const inicio = new Date(ano, 0, 1)
    const fim = new Date(ano, 11, 31, 23, 59, 59)

    const { data: txData } = await supabase
      .from('transacoes')
      .select('valor, tipo, categoria_id')
      .eq('usuario_id', userId)
      .eq('tipo', 'despesa')
      .gte('data', inicio.toISOString())
      .lte('data', fim.toISOString())

    // Filter deductible expenses
    const deductibleTxs = (txData || []).filter(
      (t: Record<string, unknown>) =>
        t.categoria_id && deductibleIds.has(t.categoria_id as string)
    )

    // Group by parent category
    const byParent = new Map<string, { total: number; count: number }>()
    const catMapById = new Map<string, Record<string, unknown>>(
      categorias.map((c: Record<string, unknown>) => [c.id as string, c])
    )

    for (const tx of deductibleTxs) {
      const cat = catMapById.get(tx.categoria_id as string)
      if (!cat) continue
      const parentId = (cat.pai_id as string) || (cat.id as string)
      const existing = byParent.get(parentId)
      if (existing) {
        existing.total += Math.abs(tx.valor as number)
        existing.count++
      } else {
        byParent.set(parentId, { total: Math.abs(tx.valor as number), count: 1 })
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
    const supabase = getSupabase()
    const userId = await getUserId()

    // Get institutions for name lookup
    const { data: instituicoesData } = await supabase
      .from('instituicoes')
      .select('id, nome')

    const instMap = new Map(
      (instituicoesData || []).map((i: Record<string, unknown>) => [
        i.id as string,
        i.nome as string,
      ])
    )

    // Investments
    const { data: investimentosData } = await supabase
      .from('investimentos')
      .select('*')
      .eq('usuario_id', userId)
      .eq('status', 'ativo')

    const invItems: BemDireito[] = (investimentosData || []).map((i: Record<string, unknown>) => ({
      tipo: 'investimento' as const,
      descricao: i.nome as string,
      instituicao: instMap.get(i.instituicao_id as string) || 'N/A',
      valor_aplicado: i.valor_aplicado as number,
      valor_atual: i.valor_atual as number,
      data_aquisicao: i.data_aplicacao ? new Date(i.data_aplicacao as string) : undefined,
      ticker: i.ticker as string | undefined,
    }))

    // Bank accounts with balance > R$140
    const { data: contasData } = await supabase
      .from('contas')
      .select('*')
      .eq('usuario_id', userId)
      .eq('ativa', true)

    const contaItems: BemDireito[] = (contasData || [])
      .filter((c: Record<string, unknown>) => Math.abs(c.saldo_atual as number) > 140)
      .map((c: Record<string, unknown>) => ({
        tipo: 'conta_bancaria' as const,
        descricao: c.nome as string,
        instituicao: instMap.get(c.instituicao_id as string) || 'N/A',
        valor_atual: c.saldo_atual as number,
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
