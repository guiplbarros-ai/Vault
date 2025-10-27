'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ReportFilters } from '@/components/relatorios/report-filters'

export interface ReportSummary {
  totalReceitas: number
  totalDespesas: number
  saldo: number
  transacoesCount: number
}

export interface CategoryBreakdown {
  categoria: string
  grupo: string
  total: number
  percentual: number
  count: number
}

export interface MonthlyTrend {
  mes: string
  receitas: number
  despesas: number
  saldo: number
}

export interface AccountBreakdown {
  conta: string
  tipo: string
  total: number
  percentual: number
}

async function fetchReportSummary(filters: ReportFilters): Promise<ReportSummary> {
  let query = supabase.from('transacao').select('valor, tipo')

  if (filters.dataInicio) {
    query = query.gte('data', filters.dataInicio)
  }
  if (filters.dataFim) {
    query = query.lte('data', filters.dataFim)
  }
  if (filters.categoriaId) {
    query = query.eq('categoria_id', filters.categoriaId)
  }
  if (filters.contaId) {
    query = query.eq('conta_id', filters.contaId)
  }
  if (filters.tipo) {
    query = query.eq('tipo', filters.tipo)
  }

  const { data, error } = await query

  if (error) throw error

  const receitas = data
    ?.filter((t) => t.tipo === 'RECEITA')
    .reduce((acc, t) => acc + (t.valor || 0), 0) || 0

  const despesas = data
    ?.filter((t) => t.tipo === 'DESPESA')
    .reduce((acc, t) => acc + Math.abs(t.valor || 0), 0) || 0

  return {
    totalReceitas: receitas,
    totalDespesas: despesas,
    saldo: receitas - despesas,
    transacoesCount: data?.length || 0,
  }
}

async function fetchCategoryBreakdown(filters: ReportFilters): Promise<CategoryBreakdown[]> {
  let query = supabase
    .from('transacao')
    .select('valor, tipo, categoria(nome, grupo)')
    .eq('tipo', 'DESPESA')

  if (filters.dataInicio) {
    query = query.gte('data', filters.dataInicio)
  }
  if (filters.dataFim) {
    query = query.lte('data', filters.dataFim)
  }
  if (filters.categoriaId) {
    query = query.eq('categoria_id', filters.categoriaId)
  }
  if (filters.contaId) {
    query = query.eq('conta_id', filters.contaId)
  }

  const { data, error } = await query

  if (error) throw error

  const categoryMap = new Map<string, { total: number; count: number; grupo: string }>()

  data?.forEach((t: any) => {
    const catNome = t.categoria?.nome || 'Sem Categoria'
    const catGrupo = t.categoria?.grupo || 'Outros'
    const existing = categoryMap.get(catNome) || { total: 0, count: 0, grupo: catGrupo }
    categoryMap.set(catNome, {
      total: existing.total + Math.abs(t.valor || 0),
      count: existing.count + 1,
      grupo: catGrupo,
    })
  })

  const total = Array.from(categoryMap.values()).reduce((acc, cat) => acc + cat.total, 0)

  return Array.from(categoryMap.entries())
    .map(([categoria, data]) => ({
      categoria,
      grupo: data.grupo,
      total: data.total,
      percentual: total > 0 ? (data.total / total) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total)
}

async function fetchMonthlyTrend(filters: ReportFilters): Promise<MonthlyTrend[]> {
  let query = supabase
    .from('transacao')
    .select('data, valor, tipo')
    .order('data', { ascending: true })

  if (filters.dataInicio) {
    query = query.gte('data', filters.dataInicio)
  }
  if (filters.dataFim) {
    query = query.lte('data', filters.dataFim)
  }
  if (filters.categoriaId) {
    query = query.eq('categoria_id', filters.categoriaId)
  }
  if (filters.contaId) {
    query = query.eq('conta_id', filters.contaId)
  }
  if (filters.tipo) {
    query = query.eq('tipo', filters.tipo)
  }

  const { data, error } = await query

  if (error) throw error

  const monthMap = new Map<string, { receitas: number; despesas: number }>()

  data?.forEach((t: any) => {
    const mes = t.data.substring(0, 7) // YYYY-MM
    const existing = monthMap.get(mes) || { receitas: 0, despesas: 0 }

    if (t.tipo === 'RECEITA') {
      existing.receitas += t.valor || 0
    } else if (t.tipo === 'DESPESA') {
      existing.despesas += Math.abs(t.valor || 0)
    }

    monthMap.set(mes, existing)
  })

  return Array.from(monthMap.entries())
    .map(([mes, data]) => ({
      mes,
      receitas: data.receitas,
      despesas: data.despesas,
      saldo: data.receitas - data.despesas,
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
}

async function fetchAccountBreakdown(filters: ReportFilters): Promise<AccountBreakdown[]> {
  let query = supabase
    .from('transacao')
    .select('valor, tipo, conta(apelido, tipo)')
    .eq('tipo', 'DESPESA')

  if (filters.dataInicio) {
    query = query.gte('data', filters.dataInicio)
  }
  if (filters.dataFim) {
    query = query.lte('data', filters.dataFim)
  }
  if (filters.categoriaId) {
    query = query.eq('categoria_id', filters.categoriaId)
  }
  if (filters.contaId) {
    query = query.eq('conta_id', filters.contaId)
  }

  const { data, error } = await query

  if (error) throw error

  const accountMap = new Map<string, { total: number; tipo: string }>()

  data?.forEach((t: any) => {
    const contaNome = t.conta?.apelido || 'Sem Conta'
    const contaTipo = t.conta?.tipo || 'N/A'
    const existing = accountMap.get(contaNome) || { total: 0, tipo: contaTipo }
    accountMap.set(contaNome, {
      total: existing.total + Math.abs(t.valor || 0),
      tipo: contaTipo,
    })
  })

  const total = Array.from(accountMap.values()).reduce((acc, acc2) => acc + acc2.total, 0)

  return Array.from(accountMap.entries())
    .map(([conta, data]) => ({
      conta,
      tipo: data.tipo,
      total: data.total,
      percentual: total > 0 ? (data.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

export function useReportSummary(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-summary', filters],
    queryFn: () => fetchReportSummary(filters),
    staleTime: 60000,
  })
}

export function useCategoryBreakdown(filters: ReportFilters) {
  return useQuery({
    queryKey: ['category-breakdown', filters],
    queryFn: () => fetchCategoryBreakdown(filters),
    staleTime: 60000,
  })
}

export function useMonthlyTrend(filters: ReportFilters) {
  return useQuery({
    queryKey: ['monthly-trend', filters],
    queryFn: () => fetchMonthlyTrend(filters),
    staleTime: 60000,
  })
}

export function useAccountBreakdown(filters: ReportFilters) {
  return useQuery({
    queryKey: ['account-breakdown', filters],
    queryFn: () => fetchAccountBreakdown(filters),
    staleTime: 60000,
  })
}
