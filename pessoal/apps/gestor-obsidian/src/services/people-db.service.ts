import { loadEnv } from '../utils/env.js'
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js'

loadEnv()

export interface DbPerson {
  id: string
  workspace_id: string
  name: string
  tags: string[]
  notes: string
  birthday_day: number | null
  birthday_month: number | null
  created_at: string
  updated_at: string
}

class PeopleDbService {
  enabled(): boolean {
    return isSupabaseConfigured()
  }

  async findByName(workspaceId: string, name: string): Promise<DbPerson | null> {
    const supabase = getSupabaseClient()
    const q = name.trim()
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('workspace_id', workspaceId)
      .ilike('name', `%${q}%`)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Supabase people select failed: ${error.message}`)
    return (data as DbPerson) || null
  }

  async upsertByExactName(input: {
    workspaceId: string
    name: string
    tags?: string[]
    notes?: string
  }): Promise<DbPerson> {
    const supabase = getSupabaseClient()
    const existing = await supabase
      .from('people')
      .select('*')
      .eq('workspace_id', input.workspaceId)
      .eq('name', input.name)
      .limit(1)
      .maybeSingle()

    if (existing.error) throw new Error(`Supabase people select failed: ${existing.error.message}`)

    if (existing.data) {
      const { data, error } = await supabase
        .from('people')
        .update({
          tags: input.tags ?? (existing.data as any).tags,
          notes: input.notes ?? (existing.data as any).notes,
        })
        .eq('id', (existing.data as any).id)
        .select('*')
        .single()
      if (error || !data)
        throw new Error(`Supabase people update failed: ${error?.message || 'unknown'}`)
      return data as DbPerson
    }

    const { data, error } = await supabase
      .from('people')
      .insert({
        workspace_id: input.workspaceId,
        name: input.name,
        tags: input.tags ?? [],
        notes: input.notes ?? '',
      })
      .select('*')
      .single()
    if (error || !data)
      throw new Error(`Supabase people insert failed: ${error?.message || 'unknown'}`)
    return data as DbPerson
  }
}

let instance: PeopleDbService | null = null
export function getPeopleDbService(): PeopleDbService {
  if (!instance) instance = new PeopleDbService()
  return instance
}
