import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js'

loadEnv()

export interface DbRule {
  id: string
  workspace_id: string
  version: number
  body_md: string
  active: boolean
  created_at: string
}

function getWorkspaceId(workspaceId?: string): string {
  return (
    workspaceId ||
    process.env.CORTEX_WORKSPACE_ID ||
    process.env.CORTEX_DEFAULT_WORKSPACE ||
    'pessoal'
  ).trim()
}

class RulesDbService {
  enabled(): boolean {
    return isSupabaseConfigured()
  }

  async getActive(workspaceId?: string): Promise<DbRule | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('workspace_id', getWorkspaceId(workspaceId))
      .eq('active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      logger.warn(`Supabase rules getActive failed: ${error.message}`)
      return null
    }
    return (data as DbRule) || null
  }

  async createDraftFromComment(input: {
    comment: string
    actor?: string
    workspaceId?: string
  }): Promise<DbRule> {
    const supabase = getSupabaseClient()
    const workspaceId = getWorkspaceId(input.workspaceId)

    const active = await this.getActive(workspaceId)
    const nextVersion = (active?.version ?? 0) + 1
    const base = (active?.body_md || '').trim()
    const now = new Date().toISOString()

    const block =
      `\n\n## Ajustes do operador (${now})\n` +
      `- ${input.comment.trim().replace(/\n+/g, '\n  ')}\n` +
      (input.actor ? `\n_Actor_: ${input.actor}\n` : '')

    const body = (base ? base : '# Manual do Cortex') + block

    const { data, error } = await supabase
      .from('rules')
      .insert({
        workspace_id: workspaceId,
        version: nextVersion,
        body_md: body,
        active: false,
      })
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(`Supabase rules insert failed: ${error?.message || 'unknown'}`)
    }
    return data as DbRule
  }

  async createDraftFromBody(input: { bodyMd: string; workspaceId?: string }): Promise<DbRule> {
    const supabase = getSupabaseClient()
    const workspaceId = getWorkspaceId(input.workspaceId)
    const active = await this.getActive(workspaceId)
    const nextVersion = (active?.version ?? 0) + 1

    const { data, error } = await supabase
      .from('rules')
      .insert({
        workspace_id: workspaceId,
        version: nextVersion,
        body_md: input.bodyMd,
        active: false,
      })
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(`Supabase rules insert failed: ${error?.message || 'unknown'}`)
    }
    return data as DbRule
  }

  async activate(ruleId: string, workspaceId?: string): Promise<void> {
    const supabase = getSupabaseClient()
    const wid = getWorkspaceId(workspaceId)

    // Deactivate current
    await supabase
      .from('rules')
      .update({ active: false })
      .eq('workspace_id', wid)
      .eq('active', true)

    const { error } = await supabase
      .from('rules')
      .update({ active: true })
      .eq('workspace_id', wid)
      .eq('id', ruleId)

    if (error) {
      throw new Error(`Supabase rules activate failed: ${error.message}`)
    }
  }
}

let instance: RulesDbService | null = null

export function getRulesDbService(): RulesDbService {
  if (!instance) instance = new RulesDbService()
  return instance
}

export { RulesDbService }
