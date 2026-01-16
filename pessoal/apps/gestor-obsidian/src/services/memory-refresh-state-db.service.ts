import { loadEnv } from '../utils/env.js'
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js'

loadEnv()

export type MemoryRefreshStateRow = {
  workspace_id: string
  last_notes_indexed_at: string | null
  updated_at: string
}

class MemoryRefreshStateDbService {
  enabled(): boolean {
    return isSupabaseConfigured()
  }

  async get(workspaceId: string): Promise<MemoryRefreshStateRow | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('memory_refresh_state')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (error) throw new Error(`Supabase memory_refresh_state get failed: ${error.message}`)
    return (data as any) || null
  }

  async upsert(input: { workspaceId: string; lastNotesIndexedAt: string | null }): Promise<void> {
    const supabase = getSupabaseClient()
    const payload = {
      workspace_id: input.workspaceId,
      last_notes_indexed_at: input.lastNotesIndexedAt,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('memory_refresh_state')
      .upsert(payload, { onConflict: 'workspace_id' })
    if (error) throw new Error(`Supabase memory_refresh_state upsert failed: ${error.message}`)
  }
}

let instance: MemoryRefreshStateDbService | null = null
export function getMemoryRefreshStateDbService(): MemoryRefreshStateDbService {
  if (!instance) instance = new MemoryRefreshStateDbService()
  return instance
}

export { MemoryRefreshStateDbService }
