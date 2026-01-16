import { getChatSettingsDbService } from '../../services/chat-settings-db.service.js'
import { getGoogleTokensDbService } from '../../services/google-tokens-db.service.js'
import type { AgentTool } from '../types.js'
import { resolveGoogleMutatingAccount } from './google-context.js'

export function createGoogleListAccountsTool(): AgentTool {
  return {
    name: 'GOOGLE_LIST_ACCOUNTS',
    description: 'Lista contas Google conectadas no workspace atual (e a conta ativa para ações)',
    async execute(_params, ctx) {
      const chatDb = getChatSettingsDbService()
      const googleDb = getGoogleTokensDbService()
      if (!chatDb.enabled() || !googleDb.enabled())
        return 'Supabase não configurado para listar contas Google.'

      const chat = await chatDb.getOrCreate(ctx.chatId)
      const workspaceId = chat.workspace_id
      const tokens = await googleDb.list(workspaceId)
      const emails = tokens.map((t) => t.account_email).filter(Boolean)
      const selected = (chat.google_account_email || '').toLowerCase().trim()

      if (emails.length === 0)
        return `Nenhuma conta Google conectada no contexto ${workspaceId}. Diga "conectar google".`

      const lines = emails
        .map((e) => {
          const mark = selected && e === selected ? ' ✅ ativa' : ''
          return `• ${e}${mark}`
        })
        .join('\n')

      ctx.appendInternalData('GOOGLE_LIST_ACCOUNTS', `workspace=${workspaceId}\n${lines}`)
      return `Contas Google conectadas (${workspaceId}):\n${lines}`
    },
  }
}

export function createGoogleSetAccountTool(): AgentTool {
  return {
    name: 'GOOGLE_SET_ACCOUNT',
    description:
      'Define qual conta Google usar para ações mutáveis no contexto atual (especialmente no pool pessoal)',
    async execute(params, ctx) {
      const email = (params.email || '').toLowerCase().trim()
      const chatDb = getChatSettingsDbService()
      const googleDb = getGoogleTokensDbService()
      if (!chatDb.enabled() || !googleDb.enabled())
        return 'Supabase não configurado para selecionar conta Google.'

      const chat = await chatDb.getOrCreate(ctx.chatId)
      const workspaceId = chat.workspace_id
      const tokens = await googleDb.list(workspaceId)
      const emails = tokens.map((t) => t.account_email).filter(Boolean)

      if (emails.length === 0)
        return `Nenhuma conta Google conectada no contexto ${workspaceId}. Diga "conectar google".`
      if (!email) return `Envie: email=<conta>\nContas: ${emails.join(', ')}`
      if (!emails.includes(email))
        return `Essa conta não está conectada no contexto ${workspaceId}: ${email}\nContas: ${emails.join(', ')}`

      await chatDb.setGoogleAccountEmail(ctx.chatId, email)
      const mut = await resolveGoogleMutatingAccount(ctx.chatId)
      return `✅ Conta ativa para ações no contexto ${mut.workspaceId}: ${mut.accountEmail || email}`
    },
  }
}
