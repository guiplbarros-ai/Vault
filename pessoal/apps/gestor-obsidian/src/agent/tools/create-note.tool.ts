import { type WorkspaceId, getAreaRouterService } from '../../services/area-router.service.js'
import { getChatSettingsDbService } from '../../services/chat-settings-db.service.js'
import { classifierService } from '../../services/classifier.service.js'
import { getNotesDbService } from '../../services/notes-db.service.js'
import type { NoteType } from '../../types/index.js'
import type { AgentTool } from '../types.js'

export function createCreateNoteTool(): AgentTool {
  return {
    name: 'CREATE_NOTE',
    description: 'Cria uma nota no Supabase (notes) e indexa no Supermemory quando habilitado',
    async execute(params, ctx) {
      const content = params.content || ''
      const type = (params.type as NoteType) || 'inbox'

      const notesDb = getNotesDbService()
      if (!notesDb.enabled()) {
        throw new Error(
          'Supabase não configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para salvar notas.'
        )
      }

      const title = (params.title || classifierService.extractTitle(content, 50) || 'Nota').trim()
      let workspaceId: string | undefined
      try {
        const chatDb = getChatSettingsDbService()
        if (chatDb.enabled()) {
          workspaceId = (await chatDb.getOrCreate(ctx.chatId)).workspace_id
        }
      } catch {
        /* ignore */
      }
      const ws = (workspaceId as WorkspaceId | undefined) || 'pessoal'
      const areaRouter = getAreaRouterService()
      const suggestion = await areaRouter.suggest(ws, content)
      const autoAreaTag = suggestion?.slug ? `area/${suggestion.slug}` : null
      const created = await notesDb.createNote({
        title,
        bodyMd: content,
        type,
        tags: [`tipo/${type}`, 'origem/agent', ...(autoAreaTag ? [autoAreaTag] : [])],
        source: 'agent',
        workspaceId,
      })
      return `Nota salva no Supabase: notes/${created.id}`
    },
  }
}
