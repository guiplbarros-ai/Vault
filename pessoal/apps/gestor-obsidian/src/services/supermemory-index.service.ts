import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import type { DbNote } from './notes-db.service.js'
import { type SupermemorySearchResult, getSupermemoryService } from './supermemory.service.js'

loadEnv()

function truthyEnv(name: string, defaultValue = '1'): boolean {
  const v = (process.env[name] ?? defaultValue).toString().trim().toLowerCase()
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no' || v === '')
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function getNoteExcerpt(body: string): string {
  const max = clamp(Number(process.env.SUPERMEMORY_INDEX_NOTE_EXCERPT_CHARS || 1400), 200, 5000)
  const clean = (body || '').replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 3).trim()}...` : clean
}

function noteCustomId(noteId: string): string {
  return `supabase:notes:${noteId}`
}

function workspaceTag(workspaceId: string): string {
  return `ws_${workspaceId}`
}

function extractNoteIdFromCustomId(customId: string): string | null {
  // supabase:notes:<uuid>
  const m = /^supabase:notes:([0-9a-fA-F-]{8,})$/.exec(customId.trim())
  return m ? m[1] : null
}

function getCustomIdFromResult(r: SupermemorySearchResult): string | null {
  const anyR = r as any
  const candidates = [
    anyR.customId,
    anyR.custom_id,
    r.metadata && (r.metadata as any).customId,
    r.metadata && (r.metadata as any).custom_id,
    r.metadata && (r.metadata as any).sourceId,
    r.metadata && (r.metadata as any).source_id,
  ].filter(Boolean)
  return candidates.length ? String(candidates[0]) : null
}

function isNotesIndexEnabled(): boolean {
  return truthyEnv('SUPERMEMORY_INDEX_SUPABASE_NOTES', '1')
}

class SupermemoryIndexService {
  enabled(): boolean {
    return isNotesIndexEnabled() && getSupermemoryService().enabled()
  }

  async indexSupabaseNote(note: DbNote): Promise<void> {
    if (!this.enabled()) return
    if (!note?.id || !note.workspace_id) return

    const sm = getSupermemoryService()
    const wid = note.workspace_id
    const customId = noteCustomId(note.id)

    // Content should be small to control Supermemory token spend.
    // We store title + excerpt, not the full markdown.
    const excerpt = getNoteExcerpt(note.body_md || '')
    const content =
      `TITLE: ${note.title}\nTYPE: ${note.type}\nTAGS: ${(note.tags || []).join(', ')}\n\n${excerpt}`.trim()

    try {
      await sm.addMemory({
        customId,
        title: note.title,
        content,
        containerTags: [workspaceTag(wid)],
        metadata: {
          source: 'supabase',
          table: 'notes',
          id: note.id,
          workspaceId: wid,
          kind: 'note',
          noteType: note.type,
          updatedAt: note.updated_at,
          tags: note.tags || [],
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.warn(`Supermemory index note failed: ${msg}`)
    }
  }

  async searchSupabaseNoteIds(query: string, workspaceId: string, limit = 5): Promise<string[]> {
    if (!this.enabled()) return []
    const sm = getSupermemoryService()
    const q = (query || '').trim()
    if (!q) return []

    const lim = clamp(limit, 1, 20)
    const tag = workspaceTag(workspaceId)

    try {
      const base = {
        q,
        limit: lim,
        rerank: true,
        containerTag: tag,
        containerTags: [tag],
      }

      // Prefer only Supabase-backed notes, but keep the system resilient:
      // if filters are not supported (or too strict), we fall back to unfiltered search.
      const filtered = await sm.search({
        ...base,
        filters: {
          AND: [
            { key: 'source', value: 'supabase', negate: false },
            { key: 'table', value: 'notes', negate: false },
            { key: 'workspaceId', value: workspaceId, negate: false },
          ],
        },
      })

      const res = (filtered.results || []).length
        ? filtered
        : await sm.search({
            ...base,
            // no filters fallback
          })

      const ids: string[] = []
      for (const r of res.results || []) {
        // 1) Try metadata.id
        const metaId = r.metadata && (r.metadata as any).id ? String((r.metadata as any).id) : ''
        if (metaId) {
          ids.push(metaId)
          continue
        }
        // 2) Try customId
        const cid = getCustomIdFromResult(r)
        if (cid) {
          const id = extractNoteIdFromCustomId(cid)
          if (id) ids.push(id)
        }
      }

      // de-dup preserve order
      return Array.from(new Set(ids)).slice(0, lim)
    } catch (e) {
      const dbg = (process.env.SUPERMEMORY_DEBUG || '').trim().toLowerCase()
      if (dbg === '1' || dbg === 'true' || dbg === 'yes' || dbg === 'on') {
        const msg = e instanceof Error ? e.message : String(e)
        logger.info(`Supermemory searchSupabaseNoteIds failed: ${msg}`)
      }
      return []
    }
  }
}

let instance: SupermemoryIndexService | null = null

export function getSupermemoryIndexService(): SupermemoryIndexService {
  if (!instance) instance = new SupermemoryIndexService()
  return instance
}

export { SupermemoryIndexService }
