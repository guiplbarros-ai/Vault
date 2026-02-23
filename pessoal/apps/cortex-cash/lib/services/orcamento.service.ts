/**
 * Serviço de Orçamentos
 * Agent FINANCE: Implementador
 *
 * Fornece operações CRUD e tracking de orçamentos mensais
 */

import { getSupabase } from '../db/supabase'
import { DatabaseError, NotFoundError, ValidationError } from '../errors'
import type { Orcamento } from '../types'
import { roundCurrency } from '../utils/currency'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function rowToOrcamento(row: Record<string, unknown>): Orcamento {
  return {
    id: row.id as string,
    nome: row.nome as string,
    tipo: row.tipo as 'categoria' | 'centro_custo',
    categoria_id: row.categoria_id as string | undefined,
    centro_custo_id: row.centro_custo_id as string | undefined,
    mes_referencia: row.mes_referencia as string,
    valor_planejado: Number(row.valor_planejado) || 0,
    valor_realizado: Number(row.valor_realizado) || 0,
    alerta_80: row.alerta_80 !== false,
    alerta_100: row.alerta_100 !== false,
    alerta_80_enviado: row.alerta_80_enviado === true,
    alerta_100_enviado: row.alerta_100_enviado === true,
    usuario_id: row.usuario_id as string | undefined,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    updated_at: row.updated_at ? new Date(row.updated_at as string) : new Date(),
  }
}

export interface CreateOrcamentoDTO {
  nome: string
  tipo: 'categoria' | 'centro_custo'
  categoria_id?: string
  centro_custo_id?: string
  mes_referencia: string // YYYY-MM format
  valor_planejado: number
  alerta_80?: boolean
  alerta_100?: boolean
}

export interface UpdateOrcamentoDTO {
  nome?: string
  valor_planejado?: number
  alerta_80?: boolean
  alerta_100?: boolean
}

export interface OrcamentoComProgresso extends Orcamento {
  percentual_usado: number
  valor_restante: number
  status: 'ok' | 'atencao' | 'excedido'
  categoria_nome?: string
  categoria_icone?: string
  categoria_cor?: string
  centro_custo_nome?: string
}

export class OrcamentoService {
  // ============================================================================
  // CRUD - Orçamentos
  // ============================================================================

  async listOrcamentos(options?: {
    mesReferencia?: string
    tipo?: 'categoria' | 'centro_custo'
    categoriaId?: string
    centroCustoId?: string
    limit?: number
    offset?: number
    sortBy?: 'nome' | 'valor_planejado' | 'valor_realizado' | 'created_at'
    sortOrder?: 'asc' | 'desc'
  }): Promise<Orcamento[]> {
    const supabase = getSupabase()
    const userId = await getUserId()
    const sortBy = options?.sortBy || 'nome'
    const sortOrder = options?.sortOrder || 'asc'

    let query = supabase
      .from('orcamentos')
      .select('*')
      .eq('usuario_id', userId)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (options?.mesReferencia) {
      query = query.eq('mes_referencia', options.mesReferencia)
    }

    if (options?.tipo) {
      query = query.eq('tipo', options.tipo)
    }

    if (options?.categoriaId) {
      query = query.eq('categoria_id', options.categoriaId)
    }

    if (options?.centroCustoId) {
      query = query.eq('centro_custo_id', options.centroCustoId)
    }

    if (options?.limit !== undefined) {
      const offset = options?.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao listar orçamentos', error as unknown as Error)

    return (data || []).map(rowToOrcamento)
  }

  async getOrcamentoById(id: string): Promise<Orcamento | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar orçamento', error as unknown as Error)

    return data ? rowToOrcamento(data) : null
  }

  async getOrcamentoComProgresso(id: string): Promise<OrcamentoComProgresso | null> {
    const orcamento = await this.getOrcamentoById(id)
    if (!orcamento) return null

    return this.enrichOrcamentoComProgresso(orcamento)
  }

  async listOrcamentosComProgresso(options?: {
    mesReferencia?: string
    tipo?: 'categoria' | 'centro_custo'
  }): Promise<OrcamentoComProgresso[]> {
    const supabase = getSupabase()
    const orcamentos = await this.listOrcamentos(options)

    const needsCategoria = orcamentos.some((o) => o.tipo === 'categoria' && o.categoria_id)
    const needsCentro = orcamentos.some((o) => o.tipo === 'centro_custo' && o.centro_custo_id)

    const [categoriasData, centrosData] = await Promise.all([
      needsCategoria
        ? supabase.from('categorias').select('id, nome, icone, cor').then((r: { data: { id: string; nome: string; icone: string | null; cor: string | null }[] | null }) => r.data || [])
        : Promise.resolve([]),
      needsCentro
        ? supabase.from('centros_custo').select('id, nome').then((r: { data: { id: string; nome: string }[] | null }) => r.data || [])
        : Promise.resolve([]),
    ])

    const categoriaById = new Map((categoriasData || []).map((c: { id: string }) => [c.id, c]))
    const centroById = new Map((centrosData || []).map((c: { id: string }) => [c.id, c]))

    return orcamentos.map((o) => {
      const percentual_usado = o.valor_planejado > 0 ? (o.valor_realizado / o.valor_planejado) * 100 : 0
      const valor_restante = o.valor_planejado - o.valor_realizado
      let status: 'ok' | 'atencao' | 'excedido' = 'ok'
      if (percentual_usado >= 100) status = 'excedido'
      else if (percentual_usado >= 80) status = 'atencao'

      const enriched: OrcamentoComProgresso = { ...o, percentual_usado, valor_restante, status }

      if (o.tipo === 'categoria' && o.categoria_id) {
        const cat = categoriaById.get(o.categoria_id) as { nome: string; icone?: string; cor?: string } | undefined
        if (cat) {
          enriched.categoria_nome = cat.nome
          enriched.categoria_icone = cat.icone
          enriched.categoria_cor = cat.cor
        }
      } else if (o.tipo === 'centro_custo' && o.centro_custo_id) {
        const cc = centroById.get(o.centro_custo_id) as { nome: string } | undefined
        if (cc) enriched.centro_custo_nome = cc.nome
      }
      return enriched
    })
  }

  private async enrichOrcamentoComProgresso(orcamento: Orcamento): Promise<OrcamentoComProgresso> {
    const supabase = getSupabase()

    const percentual_usado = orcamento.valor_planejado > 0
      ? (orcamento.valor_realizado / orcamento.valor_planejado) * 100
      : 0
    const valor_restante = orcamento.valor_planejado - orcamento.valor_realizado
    let status: 'ok' | 'atencao' | 'excedido' = 'ok'
    if (percentual_usado >= 100) status = 'excedido'
    else if (percentual_usado >= 80) status = 'atencao'

    const enriched: OrcamentoComProgresso = { ...orcamento, percentual_usado, valor_restante, status }

    if (orcamento.tipo === 'categoria' && orcamento.categoria_id) {
      const { data: cat } = await supabase
        .from('categorias')
        .select('nome, icone, cor')
        .eq('id', orcamento.categoria_id)
        .maybeSingle()

      if (cat) {
        enriched.categoria_nome = (cat as { nome: string }).nome
        enriched.categoria_icone = (cat as { icone?: string }).icone
        enriched.categoria_cor = (cat as { cor?: string }).cor
      }
    }

    if (orcamento.tipo === 'centro_custo' && orcamento.centro_custo_id) {
      const { data: cc } = await supabase
        .from('centros_custo')
        .select('nome')
        .eq('id', orcamento.centro_custo_id)
        .maybeSingle()

      if (cc) enriched.centro_custo_nome = (cc as { nome: string }).nome
    }

    return enriched
  }

  async createOrcamento(data: CreateOrcamentoDTO): Promise<Orcamento> {
    const supabase = getSupabase()
    const userId = await getUserId()

    if (data.tipo === 'categoria' && !data.categoria_id) {
      throw new ValidationError('categoria_id é obrigatório quando tipo é "categoria"')
    }

    if (data.tipo === 'centro_custo' && !data.centro_custo_id) {
      throw new ValidationError('centro_custo_id é obrigatório quando tipo é "centro_custo"')
    }

    if (data.valor_planejado <= 0) {
      throw new ValidationError('Valor planejado deve ser maior que zero')
    }

    const mesRegex = /^\d{4}-\d{2}$/
    if (!mesRegex.test(data.mes_referencia)) {
      throw new ValidationError('mes_referencia deve estar no formato YYYY-MM (ex: 2025-11)')
    }

    if (data.tipo === 'categoria' && data.categoria_id) {
      const { data: cat } = await supabase
        .from('categorias')
        .select('id')
        .eq('id', data.categoria_id)
        .maybeSingle()
      if (!cat) throw new NotFoundError('Categoria não encontrada')
    }

    if (data.tipo === 'centro_custo' && data.centro_custo_id) {
      const { data: cc } = await supabase
        .from('centros_custo')
        .select('id')
        .eq('id', data.centro_custo_id)
        .maybeSingle()
      if (!cc) throw new NotFoundError('Centro de custo não encontrado')
    }

    const now = new Date().toISOString()

    const { data: inserted, error } = await supabase
      .from('orcamentos')
      .insert({
        id: crypto.randomUUID(),
        nome: data.nome,
        tipo: data.tipo,
        categoria_id: data.categoria_id || null,
        centro_custo_id: data.centro_custo_id || null,
        mes_referencia: data.mes_referencia,
        valor_planejado: data.valor_planejado,
        valor_realizado: 0,
        alerta_80: data.alerta_80 ?? true,
        alerta_100: data.alerta_100 ?? true,
        alerta_80_enviado: false,
        alerta_100_enviado: false,
        usuario_id: userId,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) {
      throw new DatabaseError('Erro ao criar orçamento: ' + error.message)
    }

    return rowToOrcamento(inserted)
  }

  async updateOrcamento(id: string, data: UpdateOrcamentoDTO): Promise<Orcamento> {
    const supabase = getSupabase()

    const existing = await this.getOrcamentoById(id)
    if (!existing) throw new NotFoundError('Orçamento não encontrado')

    if (data.valor_planejado !== undefined && data.valor_planejado <= 0) {
      throw new ValidationError('Valor planejado deve ser maior que zero')
    }

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.nome !== undefined) updatePayload.nome = data.nome
    if (data.valor_planejado !== undefined) updatePayload.valor_planejado = data.valor_planejado
    if (data.alerta_80 !== undefined) updatePayload.alerta_80 = data.alerta_80
    if (data.alerta_100 !== undefined) updatePayload.alerta_100 = data.alerta_100

    const { data: updated, error } = await supabase
      .from('orcamentos')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error instanceof NotFoundError) throw error
      throw new DatabaseError('Erro ao atualizar orçamento: ' + error.message)
    }

    return rowToOrcamento(updated)
  }

  async deleteOrcamento(id: string): Promise<void> {
    const supabase = getSupabase()

    const existing = await this.getOrcamentoById(id)
    if (!existing) throw new NotFoundError('Orçamento não encontrado')

    const { error } = await supabase.from('orcamentos').delete().eq('id', id)

    if (error) throw new DatabaseError('Erro ao deletar orçamento', error as unknown as Error)
  }

  // ============================================================================
  // TRACKING - Valor Realizado
  // ============================================================================

  async recalcularValorRealizado(orcamentoId: string): Promise<Orcamento> {
    const supabase = getSupabase()

    const orcamento = await this.getOrcamentoById(orcamentoId)
    if (!orcamento) throw new NotFoundError('Orçamento não encontrado')

    const [ano, mes] = orcamento.mes_referencia.split('-').map(Number) as [number, number]
    const dataInicio = new Date(ano, mes - 1, 1).toISOString()
    const dataFim = new Date(ano, mes, 0, 23, 59, 59).toISOString()

    let query = supabase
      .from('transacoes')
      .select('valor')
      .eq('tipo', 'despesa')
      .gte('data', dataInicio)
      .lte('data', dataFim)

    if (orcamento.tipo === 'categoria' && orcamento.categoria_id) {
      query = query.eq('categoria_id', orcamento.categoria_id)
    } else if (orcamento.tipo === 'centro_custo' && orcamento.centro_custo_id) {
      query = query.eq('centro_custo_id', orcamento.centro_custo_id)
    }

    const { data: transacoes } = await query

    const valorRealizado = (transacoes || []).reduce(
      (sum: number, t: { valor: number }) => sum + Math.abs(t.valor),
      0
    )

    await supabase
      .from('orcamentos')
      .update({
        valor_realizado: roundCurrency(valorRealizado),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orcamentoId)

    await this.verificarAlertas(orcamentoId)

    const orcamentoAtualizado = await this.getOrcamentoById(orcamentoId)
    if (!orcamentoAtualizado) throw new NotFoundError('Orçamento não encontrado após recalcular')

    return orcamentoAtualizado
  }

  async recalcularTodosDoMes(mesReferencia: string): Promise<number> {
    const orcamentos = await this.listOrcamentos({ mesReferencia })

    let count = 0
    for (const orcamento of orcamentos) {
      try {
        await this.recalcularValorRealizado(orcamento.id)
        count++
      } catch (error) {
        console.error(`Erro ao recalcular orçamento ${orcamento.id}:`, error)
      }
    }

    return count
  }

  private async verificarAlertas(orcamentoId: string): Promise<void> {
    const supabase = getSupabase()
    const orcamento = await this.getOrcamentoById(orcamentoId)
    if (!orcamento) return

    const percentualUsado = orcamento.valor_planejado > 0
      ? (orcamento.valor_realizado / orcamento.valor_planejado) * 100
      : 0

    const updates: Record<string, unknown> = {}

    if (orcamento.alerta_80 && !orcamento.alerta_80_enviado && percentualUsado >= 80) {
      updates.alerta_80_enviado = true
      console.log(`Alerta 80%: Orçamento "${orcamento.nome}" atingiu ${percentualUsado.toFixed(1)}%`)
    }

    if (orcamento.alerta_100 && !orcamento.alerta_100_enviado && percentualUsado >= 100) {
      updates.alerta_100_enviado = true
      console.log(`Alerta 100%: Orçamento "${orcamento.nome}" atingiu ${percentualUsado.toFixed(1)}%`)
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('orcamentos').update(updates).eq('id', orcamentoId)
    }
  }

  // ============================================================================
  // RELATÓRIOS E ANÁLISES
  // ============================================================================

  async getResumoMensal(mesReferencia: string): Promise<{
    total_planejado: number
    total_realizado: number
    total_restante: number
    percentual_usado: number
    orcamentos_ok: number
    orcamentos_atencao: number
    orcamentos_excedidos: number
  }> {
    const orcamentos = await this.listOrcamentosComProgresso({ mesReferencia })

    const total_planejado = orcamentos.reduce((sum, o) => sum + o.valor_planejado, 0)
    const total_realizado = orcamentos.reduce((sum, o) => sum + o.valor_realizado, 0)
    const total_restante = total_planejado - total_realizado
    const percentual_usado = total_planejado > 0 ? (total_realizado / total_planejado) * 100 : 0

    return {
      total_planejado,
      total_realizado,
      total_restante,
      percentual_usado,
      orcamentos_ok: orcamentos.filter((o) => o.status === 'ok').length,
      orcamentos_atencao: orcamentos.filter((o) => o.status === 'atencao').length,
      orcamentos_excedidos: orcamentos.filter((o) => o.status === 'excedido').length,
    }
  }

  async copiarOrcamentosParaMes(mesOrigem: string, mesDestino: string): Promise<number> {
    const orcamentosOrigem = await this.listOrcamentos({ mesReferencia: mesOrigem })

    let count = 0
    for (const orcamento of orcamentosOrigem) {
      try {
        await this.createOrcamento({
          nome: orcamento.nome,
          tipo: orcamento.tipo,
          categoria_id: orcamento.categoria_id,
          centro_custo_id: orcamento.centro_custo_id,
          mes_referencia: mesDestino,
          valor_planejado: orcamento.valor_planejado,
          alerta_80: orcamento.alerta_80,
          alerta_100: orcamento.alerta_100,
        })
        count++
      } catch (error) {
        console.error(`Erro ao copiar orçamento ${orcamento.id}:`, error)
      }
    }

    return count
  }

  async recalcularAfetados(transacaoDatas: Date[]): Promise<number> {
    if (transacaoDatas.length === 0) return 0

    const mesesAfetados = new Set<string>()
    for (const data of transacaoDatas) {
      const dataObj = data instanceof Date ? data : new Date(data)
      const ano = dataObj.getFullYear()
      const mes = (dataObj.getMonth() + 1).toString().padStart(2, '0')
      mesesAfetados.add(`${ano}-${mes}`)
    }

    let totalRecalculado = 0
    for (const mesRef of mesesAfetados) {
      try {
        const count = await this.recalcularTodosDoMes(mesRef)
        totalRecalculado += count
        console.log(`Recalculados ${count} orçamentos de ${mesRef}`)
      } catch (error) {
        console.error(`Erro ao recalcular orçamentos de ${mesRef}:`, error)
      }
    }

    return totalRecalculado
  }

  async recalcularPorCategoria(categoriaId: string, mesReferencia?: string): Promise<number> {
    const filtros: Parameters<typeof this.listOrcamentos>[0] = { tipo: 'categoria', categoriaId }
    if (mesReferencia) filtros.mesReferencia = mesReferencia

    const orcamentos = await this.listOrcamentos(filtros)

    let count = 0
    for (const orcamento of orcamentos) {
      try {
        await this.recalcularValorRealizado(orcamento.id)
        count++
      } catch (error) {
        console.error(`Erro ao recalcular orçamento ${orcamento.id}:`, error)
      }
    }

    return count
  }

  // ============================================================================
  // AUTO-GERAÇÃO DE ORÇAMENTOS
  // ============================================================================

  async gerarSugestoesOrcamento(mesReferencia: string): Promise<Array<{
    categoria_id: string
    categoria_nome: string
    categoria_icone?: string
    media_mensal: number
    valor_sugerido: number
    total_transacoes: number
    meses_com_gasto: number
  }>> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const parts = mesReferencia.split('-').map(Number)
    const ano = parts[0] ?? 2026
    const mes = parts[1] ?? 1
    const dataFim = new Date(ano, mes - 1, 0, 23, 59, 59).toISOString()
    const dataInicio = new Date(ano, mes - 4, 1).toISOString()

    const { data: transacoes } = await supabase
      .from('transacoes')
      .select('categoria_id, valor, data')
      .eq('tipo', 'despesa')
      .eq('usuario_id', userId)
      .not('categoria_id', 'is', null)
      .gte('data', dataInicio)
      .lte('data', dataFim)

    const porCategoria = new Map<string, { total: number; count: number; meses: Set<string> }>()

    for (const t of transacoes || []) {
      const catId = t.categoria_id as string
      const mesKey = new Date(t.data).toISOString().substring(0, 7)

      if (!porCategoria.has(catId)) {
        porCategoria.set(catId, { total: 0, count: 0, meses: new Set() })
      }
      const entry = porCategoria.get(catId)!
      entry.total += Math.abs(t.valor)
      entry.count++
      entry.meses.add(mesKey)
    }

    const categoriasValidas = Array.from(porCategoria.entries()).filter(([, data]) => data.count >= 3)
    const categoriaIds = categoriasValidas.map(([id]) => id)

    const { data: categorias } = categoriaIds.length > 0
      ? await supabase.from('categorias').select('id, nome, icone').in('id', categoriaIds)
      : { data: [] }

    const categoriaMap = new Map((categorias || []).map((c: { id: string; nome: string; icone?: string }) => [c.id, c]))

    const orcamentosExistentes = await this.listOrcamentos({ mesReferencia })
    const categoriasComOrcamento = new Set(
      orcamentosExistentes
        .filter((o) => o.tipo === 'categoria' && o.categoria_id)
        .map((o) => o.categoria_id!)
    )

    return categoriasValidas
      .filter(([catId]) => !categoriasComOrcamento.has(catId))
      .map(([catId, data]) => {
        const cat = categoriaMap.get(catId) as { nome: string; icone?: string } | undefined
        const mesesAtivos = Math.max(data.meses.size, 1)
        const mediaMensal = data.total / mesesAtivos
        const valorSugerido = Math.ceil(mediaMensal / 50) * 50

        return {
          categoria_id: catId,
          categoria_nome: cat?.nome || 'Desconhecida',
          categoria_icone: cat?.icone,
          media_mensal: Math.round(mediaMensal * 100) / 100,
          valor_sugerido: valorSugerido,
          total_transacoes: data.count,
          meses_com_gasto: data.meses.size,
        }
      })
      .sort((a, b) => b.valor_sugerido - a.valor_sugerido)
  }

  async criarOrcamentosEmLote(
    sugestoes: Array<{ categoria_id: string; categoria_nome: string; valor_planejado: number }>,
    mesReferencia: string
  ): Promise<number> {
    let count = 0
    for (const s of sugestoes) {
      try {
        await this.createOrcamento({
          nome: s.categoria_nome,
          tipo: 'categoria',
          categoria_id: s.categoria_id,
          mes_referencia: mesReferencia,
          valor_planejado: s.valor_planejado,
        })
        count++
      } catch (error) {
        console.error(`Erro ao criar orçamento para ${s.categoria_nome}:`, error)
      }
    }

    await this.recalcularTodosDoMes(mesReferencia)

    return count
  }
}

// Exportar instância singleton
export const orcamentoService = new OrcamentoService()
