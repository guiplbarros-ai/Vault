import { loadEnv } from '../utils/env.js'

loadEnv()

export interface SupermemoryAddMemoryInput {
  customId?: string
  content: string
  title?: string
  metadata?: Record<string, unknown>
  containerTags?: string[]
}

export interface SupermemorySearchInput {
  q: string
  limit?: number
  rerank?: boolean
  /**
   * A Supermemory suporta filtragem por container. A documentação menciona
   * `containerTag` (string única) e `containerTags` (array). Este client tenta
   * ambos com fallback automático para evitar 400 por campo desconhecido.
   */
  containerTag?: string
  containerTags?: string[]
  filters?: unknown
}

export interface SupermemorySearchChunk {
  content?: string
  score?: number
  isRelevant?: boolean
}

export interface SupermemorySearchResult {
  documentId?: string
  id?: string
  title?: string
  score?: number
  createdAt?: string
  updatedAt?: string
  metadata?: Record<string, unknown>
  chunks?: SupermemorySearchChunk[]
  // Alguns endpoints retornam `content` direto (sem chunks)
  content?: string
}

class SupermemoryService {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly timeoutMs: number

  constructor() {
    this.baseUrl = (process.env.SUPERMEMORY_BASE_URL || 'https://api.supermemory.ai')
      .trim()
      .replace(/\/+$/, '')
    this.apiKey = (process.env.SUPERMEMORY_API_KEY || '').trim()
    this.timeoutMs = Number(process.env.SUPERMEMORY_TIMEOUT_MS || 8000)
  }

  enabled(): boolean {
    return this.apiKey.length > 0
  }

  private headers(): Record<string, string> {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${this.apiKey}`,
    }
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    if (!this.enabled()) throw new Error('SUPERMEMORY_API_KEY não configurado')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      const raw = await res.text()
      if (!res.ok) {
        const snippet = raw.slice(0, 800)
        throw new Error(`Supermemory HTTP ${res.status}: ${snippet || res.statusText}`)
      }
      return raw ? (JSON.parse(raw) as T) : ({} as T)
    } finally {
      clearTimeout(timeout)
    }
  }

  private isNotFoundError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : String(e)
    return /HTTP 404\b/.test(msg) || /\b404\b/.test(msg) || /not found/i.test(msg)
  }

  async addMemory(input: SupermemoryAddMemoryInput): Promise<{ id?: string; documentId?: string }> {
    const content = (input.content || '').trim()
    if (!content) throw new Error('Memória inválida: content vazio')

    const payloadBase: Record<string, unknown> = {
      content,
    }
    if (input.customId) payloadBase.customId = input.customId
    if (input.title) payloadBase.title = input.title
    if (input.metadata) payloadBase.metadata = input.metadata
    if (input.containerTags && input.containerTags.length) {
      payloadBase.containerTags = input.containerTags
    }

    // Docs variam entre /v3/documents e /v3/memories.
    // A UI do Supermemory mostra /v3/documents, então preferimos esse.
    const tryAdd = async (
      path: '/v3/documents' | '/v3/memories',
      body: Record<string, unknown>
    ) => {
      return await this.postJson<{ id?: string; documentId?: string }>(path, body)
    }

    // Estratégia:
    // - Envia APENAS containerTags (NUNCA ambos), porque a API rejeita containerTag+containerTags.
    // - Se o backend não aceitar containerTags (variante antiga), faz fallback enviando containerTag (primeira tag).
    const withTagsOnly = payloadBase
    const withTagOnly =
      input.containerTags && input.containerTags.length
        ? (() => {
            const { containerTags, ...rest } = payloadBase
            return { ...rest, containerTag: input.containerTags![0] }
          })()
        : payloadBase

    try {
      return await tryAdd('/v3/documents', withTagsOnly)
    } catch (e1) {
      // fallback de endpoint
      if (this.isNotFoundError(e1)) return await tryAdd('/v3/memories', withTagsOnly)

      // fallback de schema (containerTags não aceito)
      const msg = e1 instanceof Error ? e1.message : String(e1)
      if (/unknown.*containerTags|containerTags.*unknown|unrecognized.*containerTags/i.test(msg)) {
        try {
          return await tryAdd('/v3/documents', withTagOnly)
        } catch (e2) {
          if (this.isNotFoundError(e2)) return await tryAdd('/v3/memories', withTagOnly)
          throw e2
        }
      }
      throw e1
    }
  }

  private buildSearchPayload(
    input: SupermemorySearchInput,
    mode: 'containerTag' | 'containerTags' | 'none'
  ): Record<string, unknown> {
    const q = (input.q || '').trim()
    if (!q) throw new Error('Busca inválida: q vazio')

    const payload: Record<string, unknown> = {
      q,
      limit: input.limit ?? 8,
      rerank: input.rerank ?? true,
    }

    if (input.filters) payload.filters = input.filters

    if (mode === 'containerTag' && input.containerTag) {
      payload.containerTag = input.containerTag
    } else if (mode === 'containerTags' && input.containerTags && input.containerTags.length) {
      payload.containerTags = input.containerTags
    }

    return payload
  }

  private async searchOnce(
    path: '/v4/search' | '/v3/search',
    input: SupermemorySearchInput,
    mode: 'containerTag' | 'containerTags' | 'none'
  ): Promise<{ results?: SupermemorySearchResult[]; total?: number }> {
    const payload = this.buildSearchPayload(input, mode)
    // Alguns exemplos de /v3/search mostram só { q }. Campos extras devem ser ignorados.
    return await this.postJson(path, payload)
  }

  async search(
    input: SupermemorySearchInput
  ): Promise<{ results: SupermemorySearchResult[]; total?: number }> {
    const containerTag =
      input.containerTag || (input.containerTags && input.containerTags[0]) || undefined
    const containerTags = input.containerTags || (containerTag ? [containerTag] : undefined)

    // Estratégia:
    // - se houver 1 tag, tenta `containerTag` primeiro, e em erro faz fallback para `containerTags`
    // - se houver múltiplas tags, tenta `containerTags` primeiro, e em erro faz fallback para `containerTag` (primeira)
    const hasMany = (containerTags?.length || 0) > 1
    const first = hasMany ? 'containerTags' : containerTag ? 'containerTag' : 'none'
    const second = hasMany
      ? containerTag
        ? 'containerTag'
        : 'none'
      : containerTags?.length
        ? 'containerTags'
        : 'none'

    const base: SupermemorySearchInput = {
      ...input,
      containerTag,
      containerTags,
    }

    const tryOne = async (
      path: '/v4/search' | '/v3/search',
      allowNoContainerFallback: boolean
    ): Promise<{ results: SupermemorySearchResult[]; total?: number }> => {
      try {
        const r = await this.searchOnce(path, base, first as any)
        const out = { results: r.results || [], total: r.total }
        if (out.results.length > 0 || !allowNoContainerFallback) return out

        // Fallback sem container: útil quando o endpoint ignora tags na criação
        // ou quando existe um "default container" invisível.
        const noContainer: SupermemorySearchInput = {
          ...base,
          containerTag: undefined,
          containerTags: undefined,
        }
        const rNo = await this.searchOnce(path, noContainer, 'none')
        return { results: rNo.results || [], total: rNo.total }
      } catch (e) {
        if (second === 'none' || second === first) throw e
        const r2 = await this.searchOnce(path, base, second as any)
        const out2 = { results: r2.results || [], total: r2.total }
        if (out2.results.length > 0 || !allowNoContainerFallback) return out2

        const noContainer: SupermemorySearchInput = {
          ...base,
          containerTag: undefined,
          containerTags: undefined,
        }
        const rNo = await this.searchOnce(path, noContainer, 'none')
        return { results: rNo.results || [], total: rNo.total }
      }
    }

    // Docs variam entre /v4/search e /v3/search.
    // Tentamos /v4 primeiro e fazemos fallback em 404.
    // Além disso, se /v4 retornar 0 resultados, tentamos /v3 também (index separado é comum).
    try {
      const r4 = await tryOne('/v4/search', true)
      if (r4.results.length > 0) return r4
      // fallback on empty
      const r3 = await tryOne('/v3/search', true)
      return r3
    } catch (e) {
      if (!this.isNotFoundError(e)) throw e
      return await tryOne('/v3/search', true)
    }
  }
}

let instance: SupermemoryService | null = null

export function getSupermemoryService(): SupermemoryService {
  if (!instance) instance = new SupermemoryService()
  return instance
}

export { SupermemoryService }
