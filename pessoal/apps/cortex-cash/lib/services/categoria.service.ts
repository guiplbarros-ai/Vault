/**
 * Serviço de Categorias
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD para categorias
 */

import { assertUUID, escapeLikePattern } from '../api/sanitize'
import { getSupabase } from '../db/supabase'
import { DatabaseError, NotFoundError, ValidationError } from '../errors'
import type { Categoria, CreateCategoriaDTO } from '../types'
import type { ICategoriaService } from './interfaces'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  assertUUID(user.id, 'userId')
  return user.id
}

function rowToCategoria(row: Record<string, unknown>): Categoria {
  return {
    id: row.id as string,
    nome: row.nome as string,
    tipo: row.tipo as Categoria['tipo'],
    grupo: row.grupo as string | undefined,
    pai_id: row.pai_id as string | undefined,
    icone: row.icone as string | undefined,
    cor: row.cor as string | undefined,
    ordem: Number(row.ordem) || 0,
    ativa: row.ativa !== false,
    is_sistema: row.is_sistema === true,
    usuario_id: row.usuario_id as string | undefined,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
    updated_at: row.updated_at ? new Date(row.updated_at as string) : new Date(),
  }
}

/**
 * Deriva uma cor mais clara (para subcategoria) a partir da cor base
 */
function derivarCorSubcategoria(corBase: string): string {
  const hex = corBase.replace('#', '')
  const r = Number.parseInt(hex.substring(0, 2), 16)
  const g = Number.parseInt(hex.substring(2, 4), 16)
  const b = Number.parseInt(hex.substring(4, 6), 16)
  const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.2))
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(lighten(r))}${toHex(lighten(g))}${toHex(lighten(b))}`
}

export class CategoriaService implements ICategoriaService {
  async listCategorias(options?: {
    tipo?: string
    ativas?: boolean
    limit?: number
    offset?: number
    sortBy?: 'nome' | 'ordem' | 'created_at'
    sortOrder?: 'asc' | 'desc'
  }): Promise<Categoria[]> {
    const supabase = getSupabase()
    const userId = await getUserId()
    const sortBy = options?.sortBy || 'ordem'
    const sortOrder = options?.sortOrder || 'asc'

    let query = supabase
      .from('categorias')
      .select('*')
      .or(`is_sistema.eq.true,usuario_id.eq.${userId}`)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (options?.tipo) {
      query = query.eq('tipo', options.tipo)
    }

    if (options?.ativas !== undefined) {
      query = query.eq('ativa', options.ativas)
    }

    if (options?.limit !== undefined) {
      const offset = options?.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao listar categorias', error as unknown as Error)

    return (data || []).map(rowToCategoria)
  }

  async getCategoriaById(id: string): Promise<Categoria | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar categoria', error as unknown as Error)

    return data ? rowToCategoria(data) : null
  }

  async createCategoria(data: CreateCategoriaDTO): Promise<Categoria> {
    try {
      if (!data.nome || !data.tipo) {
        throw new ValidationError('Nome e tipo são obrigatórios')
      }

      const supabase = getSupabase()
      const userId = await getUserId()

      let cor = data.cor
      if (data.pai_id) {
        const pai = await this.getCategoriaById(data.pai_id)
        if (!pai) {
          throw new NotFoundError('Categoria pai', data.pai_id)
        }
        if (!cor && pai.cor) {
          cor = derivarCorSubcategoria(pai.cor)
        }
      }

      const now = new Date().toISOString()

      const { data: inserted, error } = await supabase
        .from('categorias')
        .insert({
          id: crypto.randomUUID(),
          nome: data.nome,
          tipo: data.tipo,
          grupo: data.grupo,
          pai_id: data.pai_id || null,
          icone: data.icone,
          cor,
          ordem: data.ordem || 0,
          ativa: true,
          is_sistema: false,
          usuario_id: userId,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao criar categoria', error as unknown as Error)

      return rowToCategoria(inserted)
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao criar categoria', error as Error)
    }
  }

  async updateCategoria(id: string, data: Partial<CreateCategoriaDTO>): Promise<Categoria> {
    try {
      const supabase = getSupabase()

      const existing = await this.getCategoriaById(id)
      if (!existing) {
        throw new NotFoundError('Categoria', id)
      }

      const updateData: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() }
      if (data.pai_id === null) {
        updateData.pai_id = null
      }

      const { data: updated, error } = await supabase
        .from('categorias')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao atualizar categoria', error as unknown as Error)

      return rowToCategoria(updated)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError || error instanceof ValidationError) throw error
      throw new DatabaseError('Erro ao atualizar categoria', error as Error)
    }
  }

  async deleteCategoria(id: string): Promise<void> {
    const supabase = getSupabase()

    const { error } = await supabase
      .from('categorias')
      .update({ ativa: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new DatabaseError('Erro ao deletar categoria', error as unknown as Error)
  }

  async getCategoriasByGrupo(grupo: string): Promise<Categoria[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('grupo', grupo)
      .or(`is_sistema.eq.true,usuario_id.eq.${userId}`)
      .order('ordem', { ascending: true })

    if (error) throw new DatabaseError('Erro ao buscar categorias por grupo', error as unknown as Error)

    return (data || []).map(rowToCategoria)
  }

  async getCategoriasPrincipais(tipo?: string): Promise<Categoria[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    let query = supabase
      .from('categorias')
      .select('*')
      .or(`is_sistema.eq.true,usuario_id.eq.${userId}`)
      .is('grupo', null)
      .eq('ativa', true)
      .order('ordem', { ascending: true })

    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao buscar categorias principais', error as unknown as Error)

    return (data || []).map(rowToCategoria)
  }

  async searchCategorias(termo: string, tipo?: string): Promise<Categoria[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    let query = supabase
      .from('categorias')
      .select('*')
      .or(`is_sistema.eq.true,usuario_id.eq.${userId}`)
      .eq('ativa', true)
      .ilike('nome', `%${escapeLikePattern(termo)}%`)
      .order('ordem', { ascending: true })

    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao buscar categorias', error as unknown as Error)

    return (data || []).map(rowToCategoria)
  }

  // ==================== MÉTODOS HIERÁRQUICOS ====================

  async getCategoriasRaiz(tipo?: string): Promise<Categoria[]> {
    const supabase = getSupabase()

    let query = supabase
      .from('categorias')
      .select('*')
      .is('pai_id', null)
      .eq('ativa', true)
      .order('ordem', { ascending: true })

    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao buscar categorias raiz', error as unknown as Error)

    return (data || []).map(rowToCategoria)
  }

  async getSubcategorias(paiId: string): Promise<Categoria[]> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('pai_id', paiId)
      .eq('ativa', true)
      .order('ordem', { ascending: true })

    if (error) throw new DatabaseError('Erro ao buscar subcategorias', error as unknown as Error)

    return (data || []).map(rowToCategoria)
  }

  async getArvoreHierarquica(tipo?: string): Promise<CategoriaComSubcategorias[]> {
    const categoriasRaiz = await this.getCategoriasRaiz(tipo)

    const arvore: CategoriaComSubcategorias[] = []

    for (const raiz of categoriasRaiz) {
      const subcategorias = await this.getSubcategorias(raiz.id)
      arvore.push({
        ...raiz,
        subcategorias,
      })
    }

    return arvore
  }

  async validarNivelHierarquia(paiId: string): Promise<{ valido: boolean; mensagem?: string }> {
    const pai = await this.getCategoriaById(paiId)

    if (!pai) {
      return { valido: false, mensagem: 'Categoria pai não encontrada' }
    }

    if (pai.pai_id) {
      return { valido: false, mensagem: 'Máximo de 2 níveis de hierarquia permitido' }
    }

    return { valido: true }
  }

  async reordenarCategorias(reordenacao: { id: string; novaOrdem: number }[]): Promise<void> {
    try {
      const supabase = getSupabase()
      const now = new Date().toISOString()

      for (const item of reordenacao) {
        const { error } = await supabase
          .from('categorias')
          .update({ ordem: item.novaOrdem, updated_at: now })
          .eq('id', item.id)

        if (error) throw error
      }
    } catch (error) {
      throw new DatabaseError('Erro ao reordenar categorias', error as Error)
    }
  }

  async mesclarCategorias(origemId: string, destinoId: string): Promise<void> {
    try {
      const supabase = getSupabase()

      const origem = await this.getCategoriaById(origemId)
      const destino = await this.getCategoriaById(destinoId)

      if (!origem || !destino) {
        throw new NotFoundError('Categoria', !origem ? origemId : destinoId)
      }

      if (origem.tipo !== destino.tipo) {
        throw new ValidationError('Categorias devem ser do mesmo tipo para mesclar')
      }

      const now = new Date().toISOString()

      // Update transactions
      await supabase
        .from('transacoes')
        .update({ categoria_id: destinoId, updated_at: now })
        .eq('categoria_id', origemId)

      // Update orcamentos
      await supabase
        .from('orcamentos')
        .update({ categoria_id: destinoId, updated_at: now })
        .eq('categoria_id', origemId)

      // Update regras_classificacao
      await supabase
        .from('regras_classificacao')
        .update({ categoria_id: destinoId, updated_at: now })
        .eq('categoria_id', origemId)

      // Deactivate source category
      await supabase
        .from('categorias')
        .update({ ativa: false, updated_at: now })
        .eq('id', origemId)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error
      throw new DatabaseError('Erro ao mesclar categorias', error as Error)
    }
  }

  async contarTransacoesPorCategoria(categoriaId: string): Promise<number> {
    const supabase = getSupabase()

    const { count, error } = await supabase
      .from('transacoes')
      .select('*', { count: 'exact', head: true })
      .eq('categoria_id', categoriaId)

    if (error) throw new DatabaseError('Erro ao contar transações por categoria', error as unknown as Error)

    return count || 0
  }

  // ==================== SUBCATEGORIAS AUTOMÁTICAS ====================

  private static readonly SUBCATEGORIAS_DEFINICAO: Record<
    string,
    { nome: string; icone: string; cor: string }[]
  > = {
    Alimentação: [
      { nome: 'Restaurantes', icone: '🍴', cor: '#f87171' },
      { nome: 'Supermercado', icone: '🛒', cor: '#fca5a5' },
      { nome: 'Delivery', icone: '🛵', cor: '#fb923c' },
      { nome: 'Café/Padaria', icone: '☕', cor: '#fdba74' },
    ],
    Transporte: [
      { nome: 'Uber/99', icone: '🚘', cor: '#fbbf24' },
      { nome: 'Combustível', icone: '⛽', cor: '#fcd34d' },
      { nome: 'Estacionamento', icone: '🅿️', cor: '#fde68a' },
      { nome: 'Pedágio', icone: '🛣️', cor: '#fef08a' },
    ],
    Compras: [
      { nome: 'Marketplace', icone: '📦', cor: '#86efac' },
      { nome: 'Roupas', icone: '👕', cor: '#a7f3d0' },
      { nome: 'Eletrônicos', icone: '📱', cor: '#6ee7b7' },
    ],
    Saúde: [
      { nome: 'Farmácia', icone: '💊', cor: '#f472b6' },
      { nome: 'Plano de Saúde', icone: '🏥', cor: '#f9a8d4' },
      { nome: 'Consultas', icone: '👨‍⚕️', cor: '#fbcfe8' },
    ],
    Contas: [
      { nome: 'Energia', icone: '⚡', cor: '#c4b5fd' },
      { nome: 'Telefone/Internet', icone: '📶', cor: '#ddd6fe' },
    ],
    Assinaturas: [
      { nome: 'Streaming', icone: '▶️', cor: '#22d3ee' },
      { nome: 'Software', icone: '💻', cor: '#67e8f9' },
    ],
    Lazer: [
      { nome: 'Entretenimento', icone: '📺', cor: '#2dd4bf' },
      { nome: 'Viagens', icone: '✈️', cor: '#5eead4' },
    ],
  }

  private static _seedingSubcats: Promise<number> | null = null

  async seedSubcategorias(): Promise<number> {
    if (CategoriaService._seedingSubcats) {
      return CategoriaService._seedingSubcats
    }
    CategoriaService._seedingSubcats = this._doSeedSubcategorias()
    try {
      return await CategoriaService._seedingSubcats
    } finally {
      CategoriaService._seedingSubcats = null
    }
  }

  private async _doSeedSubcategorias(): Promise<number> {
    const supabase = getSupabase()
    const now = new Date().toISOString()
    let created = 0

    const { data: allCats, error } = await supabase.from('categorias').select('*')
    if (error || !allCats) return 0

    const cats: Categoria[] = allCats.map((row: Record<string, unknown>) => rowToCategoria(row))
    const parentsByName = new Map<string, Categoria>(cats.filter((c) => !c.pai_id && c.ativa).map((c) => [c.nome, c]))
    const existingSubs = new Set<string>(cats.filter((c) => c.pai_id).map((c) => `${c.pai_id}:${c.nome}`))

    for (const [parentName, subcats] of Object.entries(CategoriaService.SUBCATEGORIAS_DEFINICAO)) {
      const parent = parentsByName.get(parentName)
      if (!parent) continue

      for (const sub of subcats) {
        const key = `${parent.id}:${sub.nome}`
        if (existingSubs.has(key)) continue

        const { error: insertError } = await supabase.from('categorias').insert({
          id: crypto.randomUUID(),
          nome: sub.nome,
          tipo: parent.tipo,
          grupo: parent.nome,
          pai_id: parent.id,
          icone: sub.icone,
          cor: sub.cor,
          ordem: parent.ordem + created + 1,
          ativa: true,
          is_sistema: true,
          usuario_id: null,
          created_at: now,
          updated_at: now,
        })

        if (!insertError) created++
      }
    }

    return created
  }

  async exportarPlanoDeContas(): Promise<string> {
    const categorias = await this.listCategorias({ sortBy: 'ordem', sortOrder: 'asc' })

    const headers = ['ID', 'Nome', 'Tipo', 'Grupo', 'Pai ID', 'Ícone', 'Cor', 'Ordem', 'Ativa']
    const rows = categorias.map((c) => [
      c.id,
      c.nome,
      c.tipo,
      c.grupo || '',
      c.pai_id || '',
      c.icone || '',
      c.cor || '',
      c.ordem.toString(),
      c.ativa ? 'Sim' : 'Não',
    ])

    const csv = [headers, ...rows].map((row) => row.join(';')).join('\n')
    return csv
  }
}

// Tipo auxiliar para árvore hierárquica
export interface CategoriaComSubcategorias extends Categoria {
  subcategorias: Categoria[]
}

// Singleton instance
export const categoriaService = new CategoriaService()
