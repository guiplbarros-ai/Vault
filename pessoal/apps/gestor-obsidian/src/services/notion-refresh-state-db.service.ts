import { loadEnv } from '../utils/env.js'
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js'

loadEnv()

export type NotionRefreshStateRow = {
  workspace_id: string
  database_id: string
  last_edited_time: string | null
  updated_at: string
}

class NotionRefreshStateDbService {
  enabled(): boolean {
    return isSupabaseConfigured()
  }

  async get(workspaceId: string, databaseId: string): Promise<NotionRefreshStateRow | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('notion_refresh_state')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('database_id', databaseId)
      .maybeSingle()
    if (error) throw new Error(`Supabase notion_refresh_state get failed: ${error.message}`)
    return (data as any) || null
  }

  async upsert(input: {
    workspaceId: string
    databaseId: string
    lastEditedTime: string | null
  }): Promise<void> {
    const supabase = getSupabaseClient()
    const payload = {
      workspace_id: input.workspaceId,
      database_id: input.databaseId,
      last_edited_time: input.lastEditedTime,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('notion_refresh_state')
      .upsert(payload, { onConflict: 'workspace_id,database_id' })
    if (error) throw new Error(`Supabase notion_refresh_state upsert failed: ${error.message}`)
  }
}

let instance: NotionRefreshStateDbService | null = null
export function getNotionRefreshStateDbService(): NotionRefreshStateDbService {
  if (!instance) instance = new NotionRefreshStateDbService()
  return instance
}

export { NotionRefreshStateDbService }
