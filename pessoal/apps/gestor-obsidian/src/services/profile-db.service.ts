import { loadEnv } from '../utils/env.js'
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js'

loadEnv()

export interface DbProfile {
  workspace_id: string
  display_name: string
  timezone: string
  locale: string
  birthday_day: number | null
  birthday_month: number | null
  preferences: Record<string, unknown>
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

class ProfileDbService {
  enabled(): boolean {
    return isSupabaseConfigured()
  }

  async getOrCreate(workspaceId?: string): Promise<DbProfile> {
    const supabase = getSupabaseClient()
    const wid = getWorkspaceId(workspaceId)

    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('workspace_id', wid)
      .maybeSingle()

    if (existing) return existing as DbProfile

    const { data, error } = await supabase
      .from('profiles')
      .insert({ workspace_id: wid })
      .select('*')
      .single()

    if (error || !data)
      throw new Error(`Supabase profiles insert failed: ${error?.message || 'unknown'}`)
    return data as DbProfile
  }

  async setBirthday(day: number, month: number, workspaceId?: string): Promise<DbProfile> {
    const supabase = getSupabaseClient()
    const wid = getWorkspaceId(workspaceId)

    // Ensure row exists
    await this.getOrCreate(wid)

    const { data, error } = await supabase
      .from('profiles')
      .update({ birthday_day: day, birthday_month: month })
      .eq('workspace_id', wid)
      .select('*')
      .single()

    if (error || !data)
      throw new Error(`Supabase profiles update failed: ${error?.message || 'unknown'}`)
    return data as DbProfile
  }
}

let instance: ProfileDbService | null = null

export function getProfileDbService(): ProfileDbService {
  if (!instance) instance = new ProfileDbService()
  return instance
}

export { ProfileDbService }
