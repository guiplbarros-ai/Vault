import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js'
import { getSupermemoryIndexService } from './supermemory-index.service.js'

loadEnv()

export type NoteContext = 'pessoal' | 'freelaw' | 'unknown'

export interface DbNote {
  id: string
  workspace_id?: string
  title: string
  body_md: string
  type: string
  tags: string[]
  source: string
  context: NoteContext
  source_path?: string | null
  source_hash?: string | null
  vault_id?: string | null
  imported_at?: string | null
  raw_frontmatter?: Record<string, unknown>
  created_at: string
  updated_at: string
}

function getWorkspaceId(workspaceId?: string): string {
  return (
    workspaceId ||
    process.env.CORTEX_WORKSPACE_ID ||
    process.env.CORTEX_DEFAULT_WORKSPACE ||
    'pessoal'
  ).trim()
}

class NotesDbService {
  enabled(): boolean {
    return isSupabaseConfigured()
  }

  async createNote(input: {
    title: string
    bodyMd: string
    type: string
    tags?: string[]
    source?: string
    context?: NoteContext
    workspaceId?: string
    sourcePath?: string
    sourceHash?: string
    vaultId?: string
    importedAt?: string
    rawFrontmatter?: Record<string, unknown>
  }): Promise<DbNote> {
    const supabase = getSupabaseClient()
    const payload = {
      workspace_id: getWorkspaceId(input.workspaceId),
      title: input.title,
      body_md: input.bodyMd,
      type: input.type,
      tags: input.tags ?? [],
      source: input.source ?? 'telegram',
      context: input.context ?? 'unknown',
      source_path: input.sourcePath ?? null,
      source_hash: input.sourceHash ?? null,
      vault_id: input.vaultId ?? null,
      imported_at: input.importedAt ?? null,
      raw_frontmatter: input.rawFrontmatter ?? {},
    }

    const { data, error } = await supabase.from('notes').insert(payload).select('*').single()

    if (error || !data) {
      throw new Error(`Supabase notes insert failed: ${error?.message || 'unknown'}`)
    }

    const created = data as DbNote

    // Optional: index in Supermemory as retrieval layer (best-effort; never break note creation).
    try {
      const idx = getSupermemoryIndexService()
      if (idx.enabled()) {
        void idx.indexSupabaseNote(created)
      }
    } catch {
      // ignore
    }

    return created
  }

  /**
   * Upsert para fontes externas (Notion/Gmail/Calendar/etc) usando (workspace_id, source, source_path).
   * Requer o índice único parcial `notes_workspace_source_sourcepath_unique` no Supabase.
   */
  async upsertExternalNote(input: {
    workspaceId: string
    source: string
    sourcePath: string
    title: string
    bodyMd: string
    type?: string
    tags?: string[]
    context?: NoteContext
  }): Promise<DbNote> {
    const supabase = getSupabaseClient()
    const payload = {
      workspace_id: getWorkspaceId(input.workspaceId),
      source: (input.source || 'external').trim(),
      source_path: (input.sourcePath || '').trim(),
      title: input.title,
      body_md: input.bodyMd,
      type: input.type || 'nota',
      tags: input.tags ?? [],
      context: input.context ?? 'unknown',
    }
    if (!payload.source_path) throw new Error('upsertExternalNote: sourcePath vazio')

    const { data, error } = await supabase
      .from('notes')
      .upsert(payload, { onConflict: 'workspace_id,source,source_path' })
      .select('*')
      .single()
    if (error || !data)
      throw new Error(`Supabase notes upsertExternalNote failed: ${error?.message || 'unknown'}`)

    const row = data as DbNote
    // Best-effort: index in Supermemory (same pipeline as createNote)
    try {
      const idx = getSupermemoryIndexService()
      if (idx.enabled()) void idx.indexSupabaseNote(row)
    } catch {
      // ignore
    }
    return row
  }

  async search(query: string, limit = 10, workspaceId?: string): Promise<DbNote[]> {
    const supabase = getSupabaseClient()
    const q = (query || '').trim()
    if (!q) return []

    // Prefer FTS when available (body_tsv).
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('workspace_id', getWorkspaceId(workspaceId))
      .textSearch('body_tsv', q, { type: 'websearch', config: 'portuguese' })
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      // Fallback to ilike if FTS isn't available yet.
      const { data: data2, error: error2 } = await supabase
        .from('notes')
        .select('*')
        .eq('workspace_id', getWorkspaceId(workspaceId))
        .or(`title.ilike.%${q}%,body_md.ilike.%${q}%`)
        .order('updated_at', { ascending: false })
        .limit(limit)
      if (error2) {
        logger.warn(`Supabase notes search failed: ${error2.message}`)
        return []
      }
      return (data2 || []) as DbNote[]
    }

    return (data || []) as DbNote[]
  }

  async getById(noteId: string, workspaceId?: string): Promise<DbNote | null> {
    const supabase = getSupabaseClient()
    const wid = getWorkspaceId(workspaceId)
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('workspace_id', wid)
      .eq('id', noteId)
      .maybeSingle()

    if (error) {
      logger.warn(`Supabase notes getById failed: ${error.message}`)
      return null
    }
    return (data as DbNote) || null
  }

  async updateTags(noteId: string, tags: string[], workspaceId?: string): Promise<DbNote> {
    const supabase = getSupabaseClient()
    const wid = getWorkspaceId(workspaceId)
    const { data, error } = await supabase
      .from('notes')
      .update({ tags })
      .eq('workspace_id', wid)
      .eq('id', noteId)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(`Supabase notes update failed: ${error?.message || 'unknown'}`)
    }
    return data as DbNote
  }

  /**
   * Lista notas atualizadas desde um timestamp (para rotinas de reindex/refresh).
   * Ordena por updated_at asc (estável para processamento incremental).
   */
  async listUpdatedSince(input: {
    workspaceId?: string
    since?: string | null
    limit?: number
  }): Promise<DbNote[]> {
    const supabase = getSupabaseClient()
    const wid = getWorkspaceId(input.workspaceId)
    const limit = Number.isFinite(Number(input.limit))
      ? Math.max(1, Math.min(2000, Number(input.limit)))
      : 500

    let q = supabase
      .from('notes')
      .select('*')
      .eq('workspace_id', wid)
      .order('updated_at', { ascending: true })
      .limit(limit)

    const since = (input.since || '').trim()
    if (since) q = q.gt('updated_at', since)

    const { data, error } = await q
    if (error) throw new Error(`Supabase notes listUpdatedSince failed: ${error.message}`)
    return (data || []) as DbNote[]
  }
}

let instance: NotesDbService | null = null

export function getNotesDbService(): NotesDbService {
  if (!instance) instance = new NotesDbService()
  return instance
}

export { NotesDbService }
