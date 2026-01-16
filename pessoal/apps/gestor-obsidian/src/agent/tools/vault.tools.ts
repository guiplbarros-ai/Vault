import { getChatSettingsDbService } from '../../services/chat-settings-db.service.js'
import { getNotesDbService } from '../../services/notes-db.service.js'
import { getSupermemoryIndexService } from '../../services/supermemory-index.service.js'
import type { AgentTool } from '../types.js'

export function createSearchVaultTool(): AgentTool {
  return {
    name: 'SEARCH_VAULT',
    description: 'Busca notas no Supabase (source of truth) e carrega no contexto interno',
    async execute(params, ctx) {
      const notesDb = getNotesDbService()
      if (!notesDb.enabled()) {
        throw new Error(
          'Supabase não configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para buscar notas.'
        )
      }

      const query = (params.query || '').trim()
      if (!query) return 'Busca inválida: query vazia'

      let workspaceId: string | undefined
      try {
        const chatDb = getChatSettingsDbService()
        if (chatDb.enabled()) workspaceId = (await chatDb.getOrCreate(ctx.chatId)).workspace_id
      } catch {
        /* ignore */
      }

      // Prefer Supermemory as retrieval index, then fetch from Supabase (truth).
      try {
        const idx = getSupermemoryIndexService()
        if (idx.enabled() && workspaceId) {
          const ids = await idx.searchSupabaseNoteIds(query, workspaceId, 3)
          if (ids.length > 0) {
            for (const id of ids) {
              const note = await notesDb.getById(id, workspaceId)
              if (!note) continue
              const src = (note as any).source_path ? ` — ${(note as any).source_path}` : ''
              const title = note.title ? ` "${note.title}"` : ''
              ctx.appendInternalData(
                `FONTE: supabase.notes/${note.id}${title}${src} (via Supermemory)`,
                note.body_md.substring(0, 6500)
              )
            }
            return `Dados carregados do Supabase via Supermemory: notes/${ids[0]}`
          }
        }
      } catch {
        /* ignore */
      }

      const results = await notesDb.search(query, 6, workspaceId)
      if (results.length === 0) return `Nenhuma nota encontrada para "${query}"`
      const top = results[0]
      const src = (top as any).source_path ? ` — ${(top as any).source_path}` : ''
      const title = top.title ? ` "${top.title}"` : ''
      ctx.appendInternalData(
        `FONTE: supabase.notes/${top.id}${title}${src}`,
        top.body_md.substring(0, 6500)
      )
      return `Dados carregados do Supabase: notes/${top.id}`
    },
  }
}

export function createReadNoteTool(): AgentTool {
  return {
    name: 'READ_NOTE',
    description: 'Lê uma nota do Supabase (notes/<id>) e coloca no contexto interno',
    async execute(params, ctx) {
      const notesDb = getNotesDbService()
      if (!notesDb.enabled()) {
        throw new Error(
          'Supabase não configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para ler notas.'
        )
      }

      const raw = (params.path || '').trim()
      const id = raw.startsWith('notes/') ? raw.slice('notes/'.length) : raw
      if (!id) return `Nota não encontrada: ${params.path}`

      let workspaceId: string | undefined
      try {
        const chatDb = getChatSettingsDbService()
        if (chatDb.enabled()) workspaceId = (await chatDb.getOrCreate(ctx.chatId)).workspace_id
      } catch {
        /* ignore */
      }

      const note = await notesDb.getById(id, workspaceId)
      if (!note) return `Nota não encontrada: ${params.path}`
      ctx.appendInternalData(`FONTE: supabase.notes/${note.id}`, note.body_md.substring(0, 6500))
      return `Dados carregados do Supabase: notes/${note.id}`
    },
  }
}
