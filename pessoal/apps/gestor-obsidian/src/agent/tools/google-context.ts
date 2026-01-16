import { getChatSettingsDbService } from '../../services/chat-settings-db.service.js'
import { getGoogleTokensDbService } from '../../services/google-tokens-db.service.js'

export type WorkspaceId = 'pessoal' | 'freelaw'

export interface GoogleAccountContext {
  workspaceId: WorkspaceId
  accountEmails: string[] // 1..N
}

export async function resolveGoogleAccounts(chatId: number): Promise<GoogleAccountContext> {
  const chatDb = getChatSettingsDbService()
  const googleDb = getGoogleTokensDbService()

  // Default fallback
  if (!chatDb.enabled() || !googleDb.enabled()) {
    return { workspaceId: 'pessoal', accountEmails: [] }
  }

  const chat = await chatDb.getOrCreate(chatId)
  const workspaceId = (chat.workspace_id as WorkspaceId) || 'pessoal'

  // Pool behavior:
  // - pessoal: use ALL connected accounts in that workspace
  // - freelaw: use selected account if present, otherwise first connected
  const tokens = await googleDb.list(workspaceId)
  const emails = tokens.map((t) => t.account_email).filter(Boolean)

  if (workspaceId === 'pessoal') {
    return { workspaceId, accountEmails: emails }
  }

  const selected = (chat.google_account_email || '').toLowerCase().trim()
  if (selected && emails.includes(selected)) {
    return { workspaceId, accountEmails: [selected] }
  }
  return { workspaceId, accountEmails: emails.length ? [emails[0]] : [] }
}

export interface GoogleMutatingAccountContext {
  workspaceId: WorkspaceId
  /** All connected accounts for the workspace (pool) */
  accountEmails: string[]
  /** Selected account for mutating actions (if any) */
  selectedAccountEmail: string | null
  /** The account to use for a mutating action (null when ambiguous) */
  accountEmail: string | null
}

/**
 * For mutating actions (send email, create event, etc):
 * - freelaw: use selected if present, otherwise first connected
 * - pessoal: if only 1 connected, use it; if 2+, require an explicit selection (chat_settings.google_account_email)
 */
export async function resolveGoogleMutatingAccount(
  chatId: number
): Promise<GoogleMutatingAccountContext> {
  const chatDb = getChatSettingsDbService()
  const googleDb = getGoogleTokensDbService()

  if (!chatDb.enabled() || !googleDb.enabled()) {
    return {
      workspaceId: 'pessoal',
      accountEmails: [],
      selectedAccountEmail: null,
      accountEmail: null,
    }
  }

  const chat = await chatDb.getOrCreate(chatId)
  const workspaceId = (chat.workspace_id as WorkspaceId) || 'pessoal'
  const tokens = await googleDb.list(workspaceId)
  const accountEmails = tokens.map((t) => t.account_email).filter(Boolean)
  const selectedAccountEmail = (chat.google_account_email || '').toLowerCase().trim() || null

  if (workspaceId === 'freelaw') {
    const acc =
      selectedAccountEmail && accountEmails.includes(selectedAccountEmail)
        ? selectedAccountEmail
        : accountEmails[0] || null
    return { workspaceId, accountEmails, selectedAccountEmail, accountEmail: acc }
  }

  // pessoal
  if (accountEmails.length <= 1) {
    return {
      workspaceId,
      accountEmails,
      selectedAccountEmail,
      accountEmail: accountEmails[0] || null,
    }
  }
  if (selectedAccountEmail && accountEmails.includes(selectedAccountEmail)) {
    return { workspaceId, accountEmails, selectedAccountEmail, accountEmail: selectedAccountEmail }
  }
  return { workspaceId, accountEmails, selectedAccountEmail, accountEmail: null }
}
