/**
 * Serviço de Tags
 * Agent CORE: v0.2 - Tags System
 *
 * Fornece operações CRUD para tags de transações
 */

import { getDB } from '../db/client'
import { getCurrentUserId } from '../db/seed-usuarios'
import { DatabaseError, DuplicateError, NotFoundError, ValidationError } from '../errors'
import type { Tag } from '../types'

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
function safeParseTags(tags: string | undefined | null): string[] {
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
   * Lista todas as tags
   */
  async listTags(options?: {
    tipo?: 'sistema' | 'customizada'
    sortBy?: 'nome' | 'created_at'
    sortOrder?: 'asc' | 'desc'
  }): Promise<Tag[]> {
    const db = getDB()
    const currentUserId = getCurrentUserId()

    let tags = await db.tags.toArray()

    // Filtrar por usuário
    tags = tags.filter((t) => t.usuario_id === currentUserId)

    // Aplicar filtros
    if (options?.tipo) {
      tags = tags.filter((t) => t.tipo === options.tipo)
    }

    // Ordenar
    const sortBy = options?.sortBy || 'nome'
    const sortOrder = options?.sortOrder || 'asc'

    tags.sort((a, b) => {
      let compareA: any
      let compareB: any

      if (sortBy === 'nome') {
        compareA = a.nome.toLowerCase()
        compareB = b.nome.toLowerCase()
      } else if (sortBy === 'created_at') {
        compareA = a.created_at instanceof Date ? a.created_at : new Date(a.created_at)
        compareB = b.created_at instanceof Date ? b.created_at : new Date(b.created_at)
        compareA = compareA.getTime()
        compareB = compareB.getTime()
      }

      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : compareA < compareB ? -1 : 0
      } else {
        return compareA < compareB ? 1 : compareA > compareB ? -1 : 0
      }
    })

    return tags
  }

  /**
   * Busca tag por ID
   */
  async getTagById(id: string): Promise<Tag | null> {
    const db = getDB()
    const tag = await db.tags.get(id)
    return tag || null
  }

  /**
   * Busca tag por nome
   */
  async getTagByNome(nome: string): Promise<Tag | null> {
    const db = getDB()
    const currentUserId = getCurrentUserId()
    const tags = await db.tags.toArray()
    const tag = tags.find(
      (t) => t.usuario_id === currentUserId && t.nome.toLowerCase() === nome.toLowerCase()
    )
    return tag || null
  }

  /**
   * Cria uma nova tag
   */
  async createTag(data: CreateTagDTO): Promise<Tag> {
    try {
      // Validar nome
      if (!data.nome || data.nome.trim().length === 0) {
        throw new ValidationError('Nome da tag é obrigatório')
      }

      if (data.nome.length > 50) {
        throw new ValidationError('Nome da tag deve ter no máximo 50 caracteres')
      }

      const db = getDB()

      // Verificar se já existe tag com mesmo nome
      const existing = await this.getTagByNome(data.nome)
      if (existing) {
        throw new DuplicateError(`Tag com nome "${data.nome}" já existe`)
      }

      const id = crypto.randomUUID()
      const now = new Date()
      const currentUserId = getCurrentUserId()

      const tag: Tag = {
        id,
        nome: data.nome.trim(),
        cor: data.cor,
        tipo: data.tipo || 'customizada',
        is_sistema: false,
        usuario_id: currentUserId,
        created_at: now,
      }

      await db.tags.add(tag)

      return tag
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DuplicateError) {
        throw error
      }
      throw new DatabaseError('Erro ao criar tag', error as Error)
    }
  }

  /**
   * Atualiza uma tag existente
   */
  async updateTag(id: string, data: UpdateTagDTO): Promise<Tag> {
    try {
      const db = getDB()

      const existing = await db.tags.get(id)
      if (!existing) {
        throw new NotFoundError('Tag', id)
      }

      // Tags do sistema não podem ser editadas
      if (existing.tipo === 'sistema') {
        throw new ValidationError('Tags do sistema não podem ser editadas')
      }

      // Validar nome se fornecido
      if (data.nome !== undefined) {
        if (!data.nome || data.nome.trim().length === 0) {
          throw new ValidationError('Nome da tag é obrigatório')
        }

        if (data.nome.length > 50) {
          throw new ValidationError('Nome da tag deve ter no máximo 50 caracteres')
        }

        // Verificar duplicata
        const duplicate = await this.getTagByNome(data.nome)
        if (duplicate && duplicate.id !== id) {
          throw new DuplicateError(`Tag com nome "${data.nome}" já existe`)
        }
      }

      await db.tags.update(id, {
        ...data,
        nome: data.nome?.trim(),
      })

      const result = await db.tags.get(id)
      if (!result) {
        throw new DatabaseError(`Erro ao recuperar tag atualizada ${id}`)
      }

      return result
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ValidationError ||
        error instanceof DuplicateError
      ) {
        throw error
      }
      throw new DatabaseError('Erro ao atualizar tag', error as Error)
    }
  }

  /**
   * Deleta uma tag
   */
  async deleteTag(id: string): Promise<void> {
    try {
      const db = getDB()

      const existing = await db.tags.get(id)
      if (!existing) {
        throw new NotFoundError('Tag', id)
      }

      // Tags do sistema não podem ser deletadas
      if (existing.tipo === 'sistema') {
        throw new ValidationError('Tags do sistema não podem ser deletadas')
      }

      // Remover a tag de todas as transações do usuário
      const currentUserId = getCurrentUserId()
      const transacoes = await db.transacoes
        .filter((t) => t.usuario_id === currentUserId)
        .toArray()
      for (const tx of transacoes) {
        const tagsArray = safeParseTags(tx.tags as string | undefined)
        if (tagsArray.includes(existing.nome)) {
          const novasTags = tagsArray.filter((t) => t !== existing.nome)
          await db.transacoes.update(tx.id, {
            tags: JSON.stringify(novasTags),
          })
        }
      }

      // Deletar a tag
      await db.tags.delete(id)
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error
      }
      throw new DatabaseError('Erro ao deletar tag', error as Error)
    }
  }

  /**
   * Busca tags por nome (autocomplete)
   */
  async searchTags(termo: string): Promise<Tag[]> {
    const db = getDB()
    const currentUserId = getCurrentUserId()

    let tags = await db.tags.toArray()

    const termoLower = termo.toLowerCase()
    tags = tags.filter(
      (t) => t.usuario_id === currentUserId && t.nome.toLowerCase().includes(termoLower)
    )

    // Ordenar por nome
    tags.sort((a, b) => a.nome.localeCompare(b.nome))

    return tags
  }

  /**
   * Conta quantas transações usam uma tag
   */
  async contarTransacoesPorTag(tagNome: string): Promise<number> {
    const db = getDB()
    const currentUserId = getCurrentUserId()
    const transacoes = await db.transacoes
      .filter((t) => t.usuario_id === currentUserId)
      .toArray()

    let count = 0
    for (const tx of transacoes) {
      const tagsArray = safeParseTags(tx.tags as string | undefined)
      if (tagsArray.includes(tagNome)) {
        count++
      }
    }

    return count
  }

  /**
   * Lista tags mais usadas
   * Single-pass: loads all transactions once and counts all tags in one loop (avoids N+1)
   */
  async getTagsMaisUsadas(limit = 10): Promise<Array<{ tag: Tag; count: number }>> {
    const db = getDB()
    const currentUserId = getCurrentUserId()
    const tags = await this.listTags()

    // Single pass through all transactions to count every tag
    const transacoes = await db.transacoes
      .filter((t) => t.usuario_id === currentUserId)
      .toArray()

    const tagCounts = new Map<string, number>()
    for (const tx of transacoes) {
      const tagsArray = safeParseTags(tx.tags as string | undefined)
      for (const tagNome of tagsArray) {
        tagCounts.set(tagNome, (tagCounts.get(tagNome) || 0) + 1)
      }
    }

    // Match counts to tag records
    const counts = tags.map((tag) => ({
      tag,
      count: tagCounts.get(tag.nome) || 0,
    }))

    // Ordenar por contagem decrescente
    counts.sort((a, b) => b.count - a.count)

    return counts.slice(0, limit)
  }

  /**
   * Define as tags automáticas do sistema com seus critérios
   */
  private getAutoTagDefinitions() {
    return [
      {
        nome: 'pix',
        cor: '#00BFFF',
        match: (tx: { descricao: string }) =>
          /\bPIX\b/i.test(tx.descricao),
      },
      {
        nome: 'parcelado',
        cor: '#FF8C00',
        match: (tx: { parcelado?: boolean }) =>
          tx.parcelado === true,
      },
      {
        nome: 'alto-valor',
        cor: '#FF4444',
        match: (tx: { valor: number }) =>
          Math.abs(tx.valor) > 500,
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
    const db = getDB()
    const currentUserId = getCurrentUserId()
    const definitions = [
      ...this.getAutoTagDefinitions(),
      { nome: 'recorrente', cor: '#32CD32' },
    ]

    const createdTags: Tag[] = []

    for (const def of definitions) {
      const existing = await this.getTagByNome(def.nome)
      if (!existing) {
        const id = crypto.randomUUID()
        const tag: Tag = {
          id,
          nome: def.nome,
          cor: def.cor,
          tipo: 'sistema',
          is_sistema: true,
          usuario_id: currentUserId,
          created_at: new Date(),
        }
        await db.tags.add(tag)
        createdTags.push(tag)
      }
    }

    return createdTags
  }

  /**
   * Aplica tags automáticas em todas as transações
   * Retorna o número de transações atualizadas
   */
  async autoTagTransacoes(): Promise<{ tagsCreated: number; transacoesTagged: number }> {
    const db = getDB()
    const currentUserId = getCurrentUserId()

    // 1. Ensure system tags exist
    const createdTags = await this.ensureSystemTags()

    // 2. Load all transactions
    const transacoes = await db.transacoes
      .filter((t) => t.usuario_id === currentUserId)
      .toArray()

    // 3. Simple pattern-based auto-tags
    const autoTagDefs = this.getAutoTagDefinitions()
    let transacoesTagged = 0

    // 4. Find recurring transactions (same description in 2+ different months)
    const descMonths = new Map<string, Set<string>>()
    for (const tx of transacoes) {
      if (!tx.descricao) continue
      const key = tx.descricao.trim().toUpperCase()
      const d = tx.data instanceof Date ? tx.data : new Date(tx.data)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!descMonths.has(key)) descMonths.set(key, new Set())
      descMonths.get(key)!.add(month)
    }
    const recurrentDescs = new Set<string>()
    for (const [desc, months] of descMonths) {
      if (months.size >= 2) recurrentDescs.add(desc)
    }

    // 5. Apply tags to each transaction
    for (const tx of transacoes) {
      const currentTags = safeParseTags(tx.tags as string | undefined)

      const newTags = new Set(currentTags)

      // Apply pattern-based tags
      for (const def of autoTagDefs) {
        if (def.match(tx as any)) {
          newTags.add(def.nome)
        }
      }

      // Apply recurrent tag
      if (tx.descricao && recurrentDescs.has(tx.descricao.trim().toUpperCase())) {
        newTags.add('recorrente')
      }

      // Only update if tags changed
      const updatedTags = Array.from(newTags)
      if (updatedTags.length !== currentTags.length || !updatedTags.every((t) => currentTags.includes(t))) {
        await db.transacoes.update(tx.id, { tags: JSON.stringify(updatedTags) })
        transacoesTagged++
      }
    }

    return { tagsCreated: createdTags.length, transacoesTagged }
  }

  /**
   * Sincroniza tags das transações com a tabela de tags
   * Cria registros de tags que estão em transações mas não existem na tabela
   */
  async syncTagsFromTransactions(): Promise<number> {
    try {
      const db = getDB()
      const currentUserId = getCurrentUserId()
      const transacoes = await db.transacoes
        .filter((t) => t.usuario_id === currentUserId)
        .toArray()
      const tagsExistentes = new Set((await this.listTags()).map((t) => t.nome.toLowerCase()))

      let tagsAdicionadas = 0
      const tagsParaCriar = new Set<string>()

      // Coletar todas as tags das transações
      for (const tx of transacoes) {
        const tagsArray = safeParseTags(tx.tags as string | undefined)
        for (const tagNome of tagsArray) {
          if (tagNome && !tagsExistentes.has(tagNome.toLowerCase())) {
            tagsParaCriar.add(tagNome)
          }
        }
      }

      // Criar tags que não existem
      for (const tagNome of tagsParaCriar) {
        const id = crypto.randomUUID()
        const now = new Date()

        const tag: Tag = {
          id,
          nome: tagNome.trim(),
          cor: undefined,
          tipo: 'customizada',
          is_sistema: false,
          usuario_id: currentUserId,
          created_at: now,
        }

        await db.tags.add(tag)
        tagsAdicionadas++
      }

      return tagsAdicionadas
    } catch (error) {
      throw new DatabaseError('Erro ao sincronizar tags das transações', error as Error)
    }
  }
}

// Singleton instance
export const tagService = new TagService()
