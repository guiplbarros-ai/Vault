import cron from 'node-cron'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { getMemoryRefreshStateDbService } from './memory-refresh-state-db.service.js'
import { getNotesDbService } from './notes-db.service.js'
import { getNotionRefreshService } from './notion-refresh.service.js'
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js'
import { getSupermemoryIndexService } from './supermemory-index.service.js'

loadEnv()

type SendMessageFn = (chatId: number, message: string) => Promise<void>

function truthyEnv(name: string, defaultValue = '1'): boolean {
  const v = (process.env[name] ?? defaultValue).toString().trim().toLowerCase()
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no' || v === '')
}

function parseCronList(value: string, fallback: string[]): string[] {
  const raw = (value || '').trim()
  const items = raw
    ? raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  return items.length ? items : fallback
}

function parseChatIdList(value: string): number[] {
  return (value || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
}

class MemoryRefreshService {
  private jobs: cron.ScheduledTask[] = []
  private sendMessage: SendMessageFn | null = null
  private running = false

  setSendMessage(fn: SendMessageFn): void {
    this.sendMessage = fn
  }

  private enabled(): boolean {
    return truthyEnv('MEMORY_REFRESH_ENABLED', '1')
  }

  private getTimezone(): string {
    return (
      (process.env.MEMORY_REFRESH_TIMEZONE || 'America/Sao_Paulo').trim() || 'America/Sao_Paulo'
    )
  }

  private getFullCrons(): string[] {
    // Back-compat: MEMORY_REFRESH_CRONS == full crons
    // default: 02:00 and 14:30 (BRT)
    return parseCronList(
      process.env.MEMORY_REFRESH_FULL_CRONS || process.env.MEMORY_REFRESH_CRONS || '',
      ['0 2 * * *', '30 14 * * *']
    )
  }

  private getLightCrons(): string[] {
    // “meio do intervalo” (BRT):
    // - entre 02:00 e 14:30 -> 08:15
    // - entre 14:30 e 19:00 -> 16:45
    return parseCronList(process.env.MEMORY_REFRESH_LIGHT_CRONS || '', [
      '15 8 * * *',
      '45 16 * * *',
    ])
  }

  private getNotifyChats(): number[] {
    return parseChatIdList(process.env.MEMORY_REFRESH_NOTIFY_CHATS || '')
  }

  async startJobs(): Promise<void> {
    this.jobs.forEach((j) => j.stop())
    this.jobs = []
    if (!this.enabled()) {
      logger.info('Memory Refresh: desativado (MEMORY_REFRESH_ENABLED=0)')
      return
    }

    const timezone = this.getTimezone()
    for (const expr of this.getFullCrons()) {
      const job = cron.schedule(
        expr,
        async () => {
          try {
            await this.run({ trigger: 'scheduled', mode: 'full' })
          } catch (e) {
            logger.error(
              `Memory Refresh: erro no job (${e instanceof Error ? e.message : String(e)})`
            )
          }
        },
        { timezone }
      )
      this.jobs.push(job)
      logger.info(`Memory Refresh: job FULL agendado - ${expr} (${timezone})`)
    }

    for (const expr of this.getLightCrons()) {
      const job = cron.schedule(
        expr,
        async () => {
          try {
            await this.run({ trigger: 'scheduled', mode: 'light' })
          } catch (e) {
            logger.error(
              `Memory Refresh: erro no job (${e instanceof Error ? e.message : String(e)})`
            )
          }
        },
        { timezone }
      )
      this.jobs.push(job)
      logger.info(`Memory Refresh: job LIGHT agendado - ${expr} (${timezone})`)
    }
  }

  stopJobs(): void {
    this.jobs.forEach((j) => j.stop())
    this.jobs = []
  }

  async run(input: {
    trigger: 'scheduled' | 'manual'
    mode: 'full' | 'light'
    chatId?: number
  }): Promise<{ ok: boolean; indexedNotes: number }> {
    if (!this.enabled()) return { ok: false, indexedNotes: 0 }
    if (this.running) return { ok: true, indexedNotes: 0 }
    this.running = true

    const notesDb = getNotesDbService()
    const idx = getSupermemoryIndexService()
    const stateDb = getMemoryRefreshStateDbService()

    let indexedTotal = 0
    const startedAt = new Date().toISOString()

    try {
      if (!notesDb.enabled() || !isSupabaseConfigured() || !stateDb.enabled()) {
        throw new Error('Supabase não configurado para memory refresh.')
      }
      if (!idx.enabled()) {
        logger.warn(
          'Memory Refresh: Supermemory index desativado (SUPERMEMORY_INDEX_SUPABASE_NOTES=0 ou SUPERMEMORY_API_KEY ausente).'
        )
      }

      // For now, we refresh the two known workspaces.
      for (const workspaceId of ['pessoal', 'freelaw']) {
        // FULL refresh: ingest from external sources into Supabase first.
        // (Light refresh skips ingestion to be cheap/fast.)
        if (input.mode === 'full') {
          try {
            const notion = getNotionRefreshService()
            if (notion.enabled()) {
              await notion.refreshWorkspace(workspaceId as any)
            }
          } catch (e) {
            logger.warn(
              `Memory Refresh: Notion ingest falhou (ws=${workspaceId}): ${e instanceof Error ? e.message : String(e)}`
            )
          }
        }

        const st = await stateDb.get(workspaceId)
        const since = st?.last_notes_indexed_at || null

        const batch = await notesDb.listUpdatedSince({ workspaceId, since, limit: 800 })
        if (idx.enabled()) {
          for (const n of batch) {
            await idx.indexSupabaseNote(n)
            indexedTotal += 1
          }
        }

        // Advance cursor to the last processed note updated_at (or keep as-is if nothing).
        const nextCursor = batch.length ? (batch[batch.length - 1] as any).updated_at : since
        await stateDb.upsert({ workspaceId, lastNotesIndexedAt: nextCursor })

        // Optional: write a lightweight run history
        try {
          const supabase = getSupabaseClient()
          await supabase.from('memory_refresh_runs').insert([
            {
              workspace_id: workspaceId,
              trigger: input.trigger,
              status: 'ok',
              indexed_notes: batch.length,
              error: '',
              meta: { since, cursor: nextCursor },
              started_at: startedAt,
              finished_at: new Date().toISOString(),
            },
          ])
        } catch {
          // ignore
        }

        // Optional: write a lightweight audit event
        try {
          const supabase = getSupabaseClient()
          await supabase.from('audit_log').insert([
            {
              workspace_id: workspaceId,
              actor: 'system',
              action: 'memory_refresh',
              entity_type: 'notes',
              entity_id: null,
              meta: {
                trigger: input.trigger,
                mode: input.mode,
                indexed_notes: batch.length,
                since,
                cursor: nextCursor,
              },
            },
          ])
        } catch {
          // ignore audit failures
        }
      }

      // Notify chats (scheduled) or the triggering chat (manual).
      const msg = 'memory refresh ✅'
      const targets = input.chatId ? [input.chatId] : this.getNotifyChats()
      if (this.sendMessage && targets.length) {
        await Promise.all(targets.map((cid) => this.sendMessage!(cid, msg).catch(() => {})))
      }

      return { ok: true, indexedNotes: indexedTotal }
    } finally {
      const finishedAt = new Date().toISOString()
      logger.info(
        `Memory Refresh: done trigger=${input.trigger} started=${startedAt} finished=${finishedAt} indexedNotes=${indexedTotal}`
      )
      this.running = false
    }
  }
}

let instance: MemoryRefreshService | null = null
export function getMemoryRefreshService(): MemoryRefreshService {
  if (!instance) instance = new MemoryRefreshService()
  return instance
}

export { MemoryRefreshService }
