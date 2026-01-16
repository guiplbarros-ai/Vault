import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { getNotesDbService } from './notes-db.service.js'
import { getNotionDbService } from './notion-db.service.js'
import { getNotionRefreshStateDbService } from './notion-refresh-state-db.service.js'
import { getNotionService } from './notion.service.js'

loadEnv()

type WorkspaceId = 'pessoal' | 'freelaw'

type NotionDatabaseQueryPage = {
  object: 'page'
  id: string
  url?: string
  last_edited_time?: string
}

type NotionDatabaseQueryResponse = {
  results: NotionDatabaseQueryPage[]
  has_more: boolean
  next_cursor: string | null
}

function parseIdList(v: string): string[] {
  return (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function titleFromMarkdown(md: string): string {
  const m = /^\s*#\s+(.+)\s*$/m.exec(md || '')
  return (m?.[1] || '').trim() || 'Notion'
}

export class NotionRefreshService {
  enabled(): boolean {
    return !!(
      process.env.NOTION_API_KEY_PESSOAL ||
      process.env.NOTION_API_KEY_FREELAW ||
      process.env.NOTION_API_KEY
    )
  }

  private getTargetIds(ws: WorkspaceId): string[] {
    if (ws === 'freelaw') return parseIdList(process.env.NOTION_REFRESH_DATABASE_IDS_FREELAW || '')
    return parseIdList(process.env.NOTION_REFRESH_DATABASE_IDS_PESSOAL || '')
  }

  async refreshWorkspace(ws: WorkspaceId): Promise<{ ingested: number; databases: number }> {
    if (!this.enabled()) return { ingested: 0, databases: 0 }
    const db = getNotionDbService(ws)
    const notion = getNotionService(ws)
    const notesDb = getNotesDbService()
    const stateDb = getNotionRefreshStateDbService()
    if (!db || !notion) throw new Error('Notion não configurado (faltando NOTION_API_KEY_*).')
    if (!notesDb.enabled()) throw new Error('Supabase não configurado para salvar notas (notes).')
    if (!stateDb.enabled()) throw new Error('Supabase não configurado para notion_refresh_state.')

    const targetIds = this.getTargetIds(ws)
    if (targetIds.length === 0) {
      return { ingested: 0, databases: 0 }
    }

    let ingested = 0
    for (const targetId of targetIds) {
      let cursor: string | null = null
      const st = await stateDb.get(ws, targetId)
      const lastEdited = st?.last_edited_time || null
      let maxEdited = lastEdited

      // 1) Try as DATABASE target (queryDatabase)
      try {
        for (let page = 0; page < 20; page++) {
          const body: any = {
            page_size: 50,
            sorts: [{ timestamp: 'last_edited_time', direction: 'ascending' }],
          }
          if (cursor) body.start_cursor = cursor
          if (lastEdited) {
            // inclusive to avoid missing same-timestamp edits
            body.filter = {
              timestamp: 'last_edited_time',
              last_edited_time: { on_or_after: lastEdited },
            }
          }

          const res = (await db.queryDatabase(
            targetId,
            body
          )) as unknown as NotionDatabaseQueryResponse
          const rows = (res.results || []).filter((r) => r?.id)
          if (rows.length === 0) break

          for (const r of rows) {
            try {
              const pageId = r.id
              const md = await notion.getPage(pageId)
              const title = titleFromMarkdown(md)
              const sourcePath = `notion:page:${pageId}`
              const tags = ['origem/notion', `notion/target/${targetId}`]

              await notesDb.upsertExternalNote({
                workspaceId: ws,
                source: 'notion',
                sourcePath,
                title,
                bodyMd: md,
                type: 'nota',
                tags,
                context: ws,
              })
              ingested += 1

              const edited = (r.last_edited_time || '').trim()
              if (edited && (!maxEdited || edited > maxEdited)) maxEdited = edited
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e)
              logger.warn(
                `Notion refresh: falha ao ingerir page (target=${targetId} ws=${ws}): ${msg}`
              )
            }
          }

          if (!res.has_more || !res.next_cursor) break
          cursor = res.next_cursor
        }

        await stateDb.upsert({
          workspaceId: ws,
          databaseId: targetId,
          lastEditedTime: maxEdited || lastEdited,
        })
        continue
      } catch (e) {
        // Not a database (or no access) → try as PAGE target below.
        void e
      }

      // 2) PAGE target: refresh only if last_edited_time advanced (otherwise skip)
      try {
        const meta = await notion.getPageMeta(targetId)
        const edited = (meta.lastEditedTime || '').trim() || null
        if (edited && lastEdited && edited <= lastEdited) {
          continue
        }
        const md = await notion.getPage(targetId)
        const title = meta.title || titleFromMarkdown(md)
        const sourcePath = `notion:page:${meta.id}`
        const tags = ['origem/notion', `notion/target/${targetId}`]
        await notesDb.upsertExternalNote({
          workspaceId: ws,
          source: 'notion',
          sourcePath,
          title,
          bodyMd: md,
          type: 'nota',
          tags,
          context: ws,
        })
        ingested += 1
        await stateDb.upsert({ workspaceId: ws, databaseId: targetId, lastEditedTime: edited })
      } catch (e2) {
        const msg = e2 instanceof Error ? e2.message : String(e2)
        logger.warn(
          `Notion refresh: target inválido/sem acesso (ws=${ws} target=${targetId}): ${msg}`
        )
      }
    }

    logger.info(`Notion refresh: ws=${ws} targets=${targetIds.length} ingested=${ingested}`)
    return { ingested, databases: targetIds.length }
  }
}

let instance: NotionRefreshService | null = null
export function getNotionRefreshService(): NotionRefreshService {
  if (!instance) instance = new NotionRefreshService()
  return instance
}
