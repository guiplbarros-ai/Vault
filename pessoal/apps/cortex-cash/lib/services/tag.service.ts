/**
 * Serviço de Tags
 * Agent CORE: v0.2 - Tags System
 *
 * Fornece operações CRUD para tags de transações
 */

import { escapeLikePattern } from '../api/sanitize'
import { getSupabase } from '../db/supabase'
import { DatabaseError, DuplicateError, NotFoundError, ValidationError } from '../errors'
import type { Tag } from '../types'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function rowToTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as string,
    nome: row.nome as string,
    cor: row.cor as string | undefined,
    tipo: (row.tipo as 'sistema' | 'customizada') || 'customizada',
    is_sistema: row.is_sistema === true,
    usuario_id: row.usuario_id as string | undefined,
    created_at: row.created_at ? new Date(row.created_at as string) : new Date(),
  }
}

export interface CreateTagDTO {
  nome: string
  cor?: string
  tipo?: 'sistema' | 'customizada'
}

export interface UpdateTagDTO {
  nome?: string
  cor?: string
}

/**
 * Safely parse tags JSON string into array.
 * Returns empty array on invalid/missing input.
 */
export function safeParseTags(tags: string | undefined | null): string[] {
  if (!tags || typeof tags !== 'string') return []
  try {
    const parsed = JSON.parse(tags)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export class TagService {
  /**
   * Lista todas as tags do usuário atual
   */
  async listTags(options?: {
    tipo?: 'sistema' | 'customizada'
    sortBy?: 'nome' | 'created_at'
    sortOrder?: 'asc' | 'desc'
  }): Promise<Tag[]> {
    const supabase = getSupabase()
    const userId = await getUserId()
    const sortBy = options?.sortBy || 'nome'
    const sortOrder = options?.sortOrder || 'asc'

    let query = supabase
      .from('tags')
      .select('*')
      .eq('usuario_id', userId)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (options?.tipo) {
      query = query.eq('tipo', options.tipo)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao listar tags', error as unknown as Error)

    return (data || []).map(rowToTag)
  }

  /**
   * Busca tag por ID
   */
  async getTagById(id: string): Promise<Tag | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar tag', error as unknown as Error)

    return data ? rowToTag(data) : null
  }

  /**
   * Busca tag por nome
   */
  async getTagByNome(nome: string): Promise<Tag | null> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('usuario_id', userId)
      .ilike('nome', escapeLikePattern(nome))
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar tag por nome', error as unknown as Error)

    return data ? rowToTag(data) : null
  }

  /**
   * Cria uma nova tag
   */
  async createTag(data: CreateTagDTO): Promise<Tag> {
    try {
      if (!data.nome || data.nome.trim().length === 0) {
        throw new ValidationError('Nome da tag é obrigatório')
      }

      if (data.nome.length > 50) {
        throw new ValidationError('Nome da tag deve ter no máximo 50 caracteres')
      }

      const existing = await this.getTagByNome(data.nome)
      if (existing) {
        throw new DuplicateError(`Tag com nome "${data.nome}" já existe`)
      }

      const supabase = getSupabase()
      const userId = await getUserId()

      const { data: inserted, error } = await supabase
        .from('tags')
        .insert({
          id: crypto.randomUUID(),
          nome: data.nome.trim(),
          cor: data.cor,
          tipo: data.tipo || 'customizada',
          is_sistema: false,
          usuario_id: userId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao criar tag', error as unknown as Error)

      return rowToTag(inserted)
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DuplicateError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao criar tag', error as Error)
    }
  }

  /**
   * Atualiza uma tag existente
   */
  async updateTag(id: string, data: UpdateTagDTO): Promise<Tag> {
    try {
      const supabase = getSupabase()

      const existing = await this.getTagById(id)
      if (!existing) {
        throw new NotFoundError('Tag', id)
      }

      if (existing.tipo === 'sistema') {
        throw new ValidationError('Tags do sistema não podem ser editadas')
      }

      if (data.nome !== undefined) {
        if (!data.nome || data.nome.trim().length === 0) {
          throw new ValidationError('Nome da tag é obrigatório')
        }

        if (data.nome.length > 50) {
          throw new ValidationError('Nome da tag deve ter no máximo 50 caracteres')
        }

        const duplicate = await this.getTagByNome(data.nome)
        if (duplicate && duplicate.id !== id) {
          throw new DuplicateError(`Tag com nome "${data.nome}" já existe`)
        }
      }

      const { data: updated, error } = await supabase
        .from('tags')
        .update({
          ...data,
          nome: data.nome?.trim(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new DatabaseError('Erro ao atualizar tag', error as unknown as Error)

      return rowToTag(updated)
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ValidationError ||
        error instanceof DuplicateError ||
        error instanceof DatabaseError
      ) throw error
      throw new DatabaseError('Erro ao atualizar tag', error as Error)
    }
  }

  /**
   * Deleta uma tag
   */
  async deleteTag(id: string): Promise<void> {
    try {
      const supabase = getSupabase()
      const userId = await getUserId()

      const existing = await this.getTagById(id)
      if (!existing) {
        throw new NotFoundError('Tag', id)
      }

      if (existing.tipo === 'sistema') {
        throw new ValidationError('Tags do sistema não podem ser deletadas')
      }

      // Remove tag from all user transactions
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('id, tags')
        .eq('usuario_id', userId)

      for (const tx of transacoes || []) {
        const tagsArray = safeParseTags(tx.tags as string | undefined)
        if (tagsArray.includes(existing.nome)) {
          const novasTags = tagsArray.filter((t) => t !== existing.nome)
          await supabase
            .from('transacoes')
            .update({ tags: JSON.stringify(novasTags) })
            .eq('id', tx.id)
        }
      }

      const { error } = await supabase.from('tags').delete().eq('id', id)

      if (error) throw new DatabaseError('Erro ao deletar tag', error as unknown as Error)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof DatabaseError) throw error
      throw new DatabaseError('Erro ao deletar tag', error as Error)
    }
  }

  /**
   * Busca tags por nome (autocomplete)
   */
  async searchTags(termo: string): Promise<Tag[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('usuario_id', userId)
      .ilike('nome', `%${escapeLikePattern(termo)}%`)
      .order('nome', { ascending: true })

    if (error) throw new DatabaseError('Erro ao buscar tags', error as unknown as Error)

    return (data || []).map(rowToTag)
  }

  /**
   * Conta quantas transações usam uma tag
   */
  async contarTransacoesPorTag(tagNome: string): Promise<number> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const { data: transacoes } = await supabase
      .from('transacoes')
      .select('tags')
      .eq('usuario_id', userId)

    let count = 0
    for (const tx of transacoes || []) {
      const tagsArray = safeParseTags(tx.tags as string | undefined)
      if (tagsArray.includes(tagNome)) count++
    }

    return count
  }

  /**
   * Lista tags mais usadas (single-pass)
   */
  async getTagsMaisUsadas(limit = 10): Promise<Array<{ tag: Tag; count: number }>> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const tags = await this.listTags()

    const { data: transacoes } = await supabase
      .from('transacoes')
      .select('tags')
      .eq('usuario_id', userId)

    const tagCounts = new Map<string, number>()
    for (const tx of transacoes || []) {
      const tagsArray = safeParseTags(tx.tags as string | undefined)
      for (const tagNome of tagsArray) {
        tagCounts.set(tagNome, (tagCounts.get(tagNome) || 0) + 1)
      }
    }

    const counts = tags.map((tag) => ({
      tag,
      count: tagCounts.get(tag.nome) || 0,
    }))

    counts.sort((a, b) => b.count - a.count)

    return counts.slice(0, limit)
  }

  private getAutoTagDefinitions() {
    return [
      {
        nome: 'pix',
        cor: '#00BFFF',
        match: (tx: { descricao: string }) => /\bPIX\b/i.test(tx.descricao),
      },
      {
        nome: 'parcelado',
        cor: '#FF8C00',
        match: (tx: { parcelado?: boolean }) => tx.parcelado === true,
      },
      {
        nome: 'alto-valor',
        cor: '#FF4444',
        match: (tx: { valor: number }) => Math.abs(tx.valor) > 500,
      },
      {
        nome: 'débito-automático',
        cor: '#9370DB',
        match: (tx: { descricao: string }) =>
          /DEB(ITO)?\s*AUT(OMATICO)?|DEBITO AUTOMATICO/i.test(tx.descricao),
      },
    ]
  }

  /**
   * Cria as tags do sistema se não existirem
   */
  async ensureSystemTags(): Promise<Tag[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const definitions = [
      ...this.getAutoTagDefinitions(),
      { nome: 'recorrente', cor: '#32CD32' },
    ]

    const createdTags: Tag[] = []

    for (const def of definitions) {
      const existing = await this.getTagByNome(def.nome)
      if (!existing) {
        const { data: inserted, error } = await supabase
          .from('tags')
          .insert({
            id: crypto.randomUUID(),
            nome: def.nome,
            cor: def.cor,
            tipo: 'sistema',
            is_sistema: true,
            usuario_id: userId,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (!error && inserted) {
          createdTags.push(rowToTag(inserted))
        }
      }
    }

    return createdTags
  }

  /**
   * Aplica tags automáticas em todas as transações
   */
  async autoTagTransacoes(): Promise<{ tagsCreated: number; transacoesTagged: number }> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const createdTags = await this.ensureSystemTags()

    const { data: transacoes } = await supabase
      .from('transacoes')
      .select('id, descricao, valor, tags, parcelado, data')
      .eq('usuario_id', userId)

    const autoTagDefs = this.getAutoTagDefinitions()
    let transacoesTagged = 0

    // Find recurring transactions (same description in 2+ different months)
    const descMonths = new Map<string, Set<string>>()
    for (const tx of transacoes || []) {
      if (!tx.descricao) continue
      const key = tx.descricao.trim().toUpperCase()
      const d = new Date(tx.data)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!descMonths.has(key)) descMonths.set(key, new Set())
      descMonths.get(key)!.add(month)
    }
    const recurrentDescs = new Set<string>()
    for (const [desc, months] of descMonths) {
      if (months.size >= 2) recurrentDescs.add(desc)
    }

    for (const tx of transacoes || []) {
      const currentTags = safeParseTags(tx.tags as string | undefined)
      const newTags = new Set(currentTags)

      for (const def of autoTagDefs) {
        if (def.match(tx as { descricao: string; valor: number; parcelado?: boolean })) {
          newTags.add(def.nome)
        }
      }

      if (tx.descricao && recurrentDescs.has(tx.descricao.trim().toUpperCase())) {
        newTags.add('recorrente')
      }

      const updatedTags = Array.from(newTags)
      if (updatedTags.length !== currentTags.length || !updatedTags.every((t) => currentTags.includes(t))) {
        await supabase
          .from('transacoes')
          .update({ tags: JSON.stringify(updatedTags) })
          .eq('id', tx.id)
        transacoesTagged++
      }
    }

    return { tagsCreated: createdTags.length, transacoesTagged }
  }

  /**
   * Sincroniza tags das transações com a tabela de tags
   */
  async syncTagsFromTransactions(): Promise<number> {
    try {
      const supabase = getSupabase()
      const userId = await getUserId()

      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('tags')
        .eq('usuario_id', userId)

      const tagsExistentes = new Set((await this.listTags()).map((t) => t.nome.toLowerCase()))
      let tagsAdicionadas = 0
      const tagsParaCriar = new Set<string>()

      for (const tx of transacoes || []) {
        const tagsArray = safeParseTags(tx.tags as string | undefined)
        for (const tagNome of tagsArray) {
          if (tagNome && !tagsExistentes.has(tagNome.toLowerCase())) {
            tagsParaCriar.add(tagNome)
          }
        }
      }

      for (const tagNome of tagsParaCriar) {
        const { error } = await supabase.from('tags').insert({
          id: crypto.randomUUID(),
          nome: tagNome.trim(),
          cor: undefined,
          tipo: 'customizada',
          is_sistema: false,
          usuario_id: userId,
          created_at: new Date().toISOString(),
        })

        if (!error) tagsAdicionadas++
      }

      return tagsAdicionadas
    } catch (error) {
      throw new DatabaseError('Erro ao sincronizar tags das transações', error as Error)
    }
  }
}

// Singleton instance
export const tagService = new TagService()
