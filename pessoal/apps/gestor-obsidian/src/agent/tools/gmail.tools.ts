import { getGmailService } from '../../services/gmail.service.js'
import { getGoogleAuthService } from '../../services/google-auth.service.js'
import type { AgentTool } from '../types.js'
import { resolveGoogleAccounts } from './google-context.js'
import { resolveGoogleMutatingAccount } from './google-context.js'

async function ensureGoogleAccounts(
  chatId: number
): Promise<{ workspaceId: string; accounts: string[] }> {
  const { workspaceId, accountEmails } = await resolveGoogleAccounts(chatId)
  if (accountEmails.length === 0) {
    return { workspaceId, accounts: [] }
  }
  // Ensure at least one account has a valid token (loads async)
  try {
    await getGoogleAuthService(workspaceId, accountEmails[0]).getValidAccessToken()
  } catch {
    // ignore; we'll handle downstream
  }
  return { workspaceId, accounts: accountEmails }
}

async function ensureGoogleMutatingAccount(
  chatId: number,
  override?: string | null
): Promise<{
  workspaceId: string
  account: string | null
  accounts: string[]
}> {
  const { workspaceId, accounts } = await ensureGoogleAccounts(chatId)
  if (accounts.length === 0) return { workspaceId, account: null, accounts: [] }

  const o = (override || '').toLowerCase().trim()
  if (o && accounts.includes(o)) return { workspaceId, account: o, accounts }

  const mut = await resolveGoogleMutatingAccount(chatId)
  if (mut.accountEmail)
    return { workspaceId: mut.workspaceId, account: mut.accountEmail, accounts: mut.accountEmails }

  return { workspaceId: mut.workspaceId, account: null, accounts: mut.accountEmails }
}

function splitIds(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseEmailPrefixedId(token: string): { account: string | null; id: string } {
  const parts = token.split('::')
  if (parts.length === 2) return { account: parts[0].toLowerCase(), id: parts[1] }
  return { account: null, id: token }
}

export function createGmailUnreadTool(): AgentTool {
  return {
    name: 'GMAIL_UNREAD',
    description: 'Carrega emails não lidos (resumo)',
    async execute(params, ctx) {
      const max = params.max ? Number.parseInt(params.max, 10) : 10
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'

      // Pool for pessoal: merge results from all accounts
      const perAccount = await Promise.all(
        accounts.map(async (acc) => {
          const gmail = getGmailService(workspaceId, acc)
          const refs = await gmail.getUnreadMessages(Math.min(10, max))
          const lines: string[] = []
          for (const ref of refs.slice(0, 5)) {
            const msg = await gmail.getMessage(ref.id)
            const parsed = gmail.parseMessage(msg)
            const fromName = parsed.from.match(/^([^<]+)/)?.[1]?.trim() || parsed.from
            lines.push(`[${acc}] ${fromName.slice(0, 22)} - ${parsed.subject.slice(0, 45)}`)
          }
          return { acc, count: refs.length, lines }
        })
      )

      const total = perAccount.reduce((sum, x) => sum + x.count, 0)
      if (total === 0) return '✨ Inbox zero! Nenhum email não lido.'

      const list = perAccount.flatMap((x) => x.lines.map((l) => `• ${l}`)).join('\n')
      ctx.appendInternalData('GMAIL_UNREAD', list)
      return `📬 Emails não lidos carregados (total: ${total})`
    },
  }
}

export function createGmailImportantTool(): AgentTool {
  return {
    name: 'GMAIL_IMPORTANT',
    description: 'Lista emails importantes não lidos (texto pronto)',
    async execute(_params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const messages: string[] = []
      let total = 0
      for (const acc of accounts) {
        const gmail = getGmailService(workspaceId, acc)
        const refs = await gmail.getImportantUnread(5)
        total += refs.length
        for (const ref of refs.slice(0, 5)) {
          const msg = await gmail.getMessage(ref.id)
          const parsed = gmail.parseMessage(msg)
          const fromName = parsed.from.match(/^([^<]+)/)?.[1]?.trim() || parsed.from
          messages.push(`⭐ [${acc}] ${fromName.slice(0, 22)} - ${parsed.subject.slice(0, 45)}`)
        }
      }

      if (total === 0) return '✨ Nenhum email importante não lido!'
      const list = messages.join('\n')
      return `📧 EMAILS IMPORTANTES NÃO LIDOS (total: ${total}):\n\n${list}`
    },
  }
}

export function createGmailSearchTool(): AgentTool {
  return {
    name: 'GMAIL_SEARCH',
    description: 'Busca emails no Gmail (salva resumo em contexto interno)',
    async execute(params, ctx) {
      const max = params.max ? Number.parseInt(params.max, 10) : 10
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const perAccount = await Promise.all(
        accounts.map(async (acc) => {
          const gmail = getGmailService(workspaceId, acc)
          const messages = await gmail.search(params.query, Math.min(5, max))
          const list = messages.map((msg) => {
            const parsed = gmail.parseMessage(msg)
            const fromName = parsed.from.match(/^([^<]+)/)?.[1]?.trim() || parsed.from
            return `• [${acc}] ${fromName.slice(0, 20)} - ${parsed.subject.slice(0, 45)}`
          })
          return list
        })
      )

      const flat = perAccount.flat()
      if (flat.length === 0) return `Nenhum email encontrado para: "${params.query}"`
      const list = flat.slice(0, 20).join('\n')

      ctx.appendInternalData(`GMAIL_SEARCH("${params.query}")`, list)
      return `🔍 Busca no Gmail carregada (${flat.length} resultado(s))`
    },
  }
}

export function createGmailReadTool(): AgentTool {
  return {
    name: 'GMAIL_READ',
    description: 'Lê email por id (salva conteúdo em contexto interno)',
    async execute(params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'

      // In pool mode, ids are ambiguous. Support "email::id" format.
      const raw = (params.id || '').trim()
      const parts = raw.split('::')
      const account = parts.length === 2 ? parts[0].toLowerCase() : null
      const id = parts.length === 2 ? parts[1] : raw

      const target = account && accounts.includes(account) ? [account] : accounts
      if (!account && accounts.length > 1) {
        return `ID ambíguo no modo pessoal (pool).\nUse: <email>::<id>\nEx: guilhermeplbarros@gmail.com::${id}`
      }

      const gmail = getGmailService(workspaceId, target[0])
      const message = await gmail.getMessage(id)
      const parsed = gmail.parseMessage(message)

      const content = `
De: ${parsed.from}
Para: ${parsed.to.join(', ')}
Assunto: ${parsed.subject}
Data: ${parsed.date.toLocaleString('pt-BR')}

${parsed.body.slice(0, 2000)}${parsed.body.length > 2000 ? '\n\n[...truncado]' : ''}
      `.trim()

      ctx.appendInternalData(`GMAIL_READ("${raw}")`, content)
      return `📧 Email carregado`
    },
  }
}

export function createGmailMarkReadTool(): AgentTool {
  return {
    name: 'GMAIL_MARK_READ',
    description:
      'Marca email(s) como lido(s). Em modo pessoal (pool), use o formato email::id para desambiguar.',
    async execute(params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const raw = (params.ids || params.id || '').trim()
      if (!raw) return 'Parâmetro obrigatório: ids (ex: id1,id2 ou email::id)'

      const parts = splitIds(raw)
      if (parts.length === 0) return 'Parâmetro inválido: ids vazio'

      // Group by account (pool)
      const groups = new Map<string, string[]>()

      for (const token of parts) {
        const parsed = parseEmailPrefixedId(token)
        if (parsed.account) {
          const acc = parsed.account
          const id = parsed.id
          if (!accounts.includes(acc)) {
            return `Conta inválida no modo pool: ${acc}`
          }
          if (!groups.has(acc)) groups.set(acc, [])
          groups.get(acc)!.push(id)
          continue
        }

        // Without account prefix: only allowed when there is a single account
        if (accounts.length > 1) {
          return `IDs ambíguos no modo pessoal (pool).\nUse: email::id\nEx: guilhermeplbarros@gmail.com::${token}`
        }
        const acc = accounts[0]
        if (!groups.has(acc)) groups.set(acc, [])
        groups.get(acc)!.push(token)
      }

      let total = 0
      for (const [acc, ids] of groups) {
        const gmail = getGmailService(workspaceId, acc)
        for (const id of ids) {
          await gmail.markAsRead(id)
          total += 1
        }
      }

      return `✅ Marquei ${total} email(s) como lido(s).`
    },
  }
}

export function createGmailListLabelsTool(): AgentTool {
  return {
    name: 'GMAIL_LIST_LABELS',
    description: 'Lista labels do Gmail (inclui labels do usuário)',
    async execute(_params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const perAccount = await Promise.all(
        accounts.map(async (acc) => {
          const gmail = getGmailService(workspaceId, acc)
          const labels = await gmail.getLabels()
          const userLabels = labels.filter((l) => l.type === 'user').slice(0, 80)
          const block =
            userLabels.map((l) => `• ${l.name} (${l.id})`).join('\n') ||
            '• (nenhuma label de usuário)'
          return `=== ${acc} ===\n${block}`
        })
      )

      const out = perAccount.join('\n\n')
      ctx.appendInternalData('GMAIL_LIST_LABELS', out)
      return `🏷️ Labels carregadas (use nome ou id nas ações).`
    },
  }
}

async function resolveLabelId(
  gmail: ReturnType<typeof getGmailService>,
  label: string
): Promise<string> {
  const raw = label.trim()
  if (!raw) throw new Error('label vazio')
  const byName = await gmail.getLabelByName(raw)
  return byName?.id || raw
}

export function createGmailAddLabelTool(): AgentTool {
  return {
    name: 'GMAIL_ADD_LABEL',
    description: 'Adiciona uma label a email(s) por id. No pool: use email::id.',
    async execute(params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const idsRaw = (params.ids || params.id || '').trim()
      const labelRaw = (params.label || '').trim()
      if (!idsRaw) return 'Parâmetro obrigatório: ids'
      if (!labelRaw) return 'Parâmetro obrigatório: label (nome ou id)'

      const ids = splitIds(idsRaw)
      const groups = new Map<string, string[]>()
      for (const t of ids) {
        const parsed = parseEmailPrefixedId(t)
        if (parsed.account) {
          if (!accounts.includes(parsed.account))
            return `Conta inválida no modo pool: ${parsed.account}`
          if (!groups.has(parsed.account)) groups.set(parsed.account, [])
          groups.get(parsed.account)!.push(parsed.id)
          continue
        }
        if (accounts.length > 1) return `IDs ambíguos no modo pessoal (pool).\nUse: email::id`
        const acc = accounts[0]
        if (!groups.has(acc)) groups.set(acc, [])
        groups.get(acc)!.push(parsed.id)
      }

      let total = 0
      for (const [acc, idsList] of groups) {
        const gmail = getGmailService(workspaceId, acc)
        const labelId = await resolveLabelId(gmail, labelRaw)
        for (const id of idsList) {
          await gmail.addLabel(id, labelId)
          total += 1
        }
      }
      return `✅ Label aplicada em ${total} email(s).`
    },
  }
}

export function createGmailRemoveLabelTool(): AgentTool {
  return {
    name: 'GMAIL_REMOVE_LABEL',
    description: 'Remove uma label de email(s) por id. No pool: use email::id.',
    async execute(params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const idsRaw = (params.ids || params.id || '').trim()
      const labelRaw = (params.label || '').trim()
      if (!idsRaw) return 'Parâmetro obrigatório: ids'
      if (!labelRaw) return 'Parâmetro obrigatório: label (nome ou id)'

      const ids = splitIds(idsRaw)
      const groups = new Map<string, string[]>()
      for (const t of ids) {
        const parsed = parseEmailPrefixedId(t)
        if (parsed.account) {
          if (!accounts.includes(parsed.account))
            return `Conta inválida no modo pool: ${parsed.account}`
          if (!groups.has(parsed.account)) groups.set(parsed.account, [])
          groups.get(parsed.account)!.push(parsed.id)
          continue
        }
        if (accounts.length > 1) return `IDs ambíguos no modo pessoal (pool).\nUse: email::id`
        const acc = accounts[0]
        if (!groups.has(acc)) groups.set(acc, [])
        groups.get(acc)!.push(parsed.id)
      }

      let total = 0
      for (const [acc, idsList] of groups) {
        const gmail = getGmailService(workspaceId, acc)
        const labelId = await resolveLabelId(gmail, labelRaw)
        for (const id of idsList) {
          await gmail.removeLabel(id, labelId)
          total += 1
        }
      }
      return `✅ Label removida de ${total} email(s).`
    },
  }
}

export function createGmailArchiveTool(): AgentTool {
  return {
    name: 'GMAIL_ARCHIVE',
    description: 'Arquiva email(s) por id (remove da Inbox). No pool: use email::id.',
    async execute(params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'
      const idsRaw = (params.ids || params.id || '').trim()
      if (!idsRaw) return 'Parâmetro obrigatório: ids'

      const ids = splitIds(idsRaw)
      const groups = new Map<string, string[]>()
      for (const t of ids) {
        const parsed = parseEmailPrefixedId(t)
        if (parsed.account) {
          if (!accounts.includes(parsed.account))
            return `Conta inválida no modo pool: ${parsed.account}`
          if (!groups.has(parsed.account)) groups.set(parsed.account, [])
          groups.get(parsed.account)!.push(parsed.id)
          continue
        }
        if (accounts.length > 1) return `IDs ambíguos no modo pessoal (pool).\nUse: email::id`
        const acc = accounts[0]
        if (!groups.has(acc)) groups.set(acc, [])
        groups.get(acc)!.push(parsed.id)
      }

      let total = 0
      for (const [acc, idsList] of groups) {
        const gmail = getGmailService(workspaceId, acc)
        for (const id of idsList) {
          await gmail.archive(id)
          total += 1
        }
      }
      return `✅ Arquivei ${total} email(s).`
    },
  }
}

export function createGmailTrashTool(): AgentTool {
  return {
    name: 'GMAIL_TRASH',
    description: 'Move email(s) para lixeira por id. No pool: use email::id.',
    async execute(params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'
      const idsRaw = (params.ids || params.id || '').trim()
      if (!idsRaw) return 'Parâmetro obrigatório: ids'

      const ids = splitIds(idsRaw)
      const groups = new Map<string, string[]>()
      for (const t of ids) {
        const parsed = parseEmailPrefixedId(t)
        if (parsed.account) {
          if (!accounts.includes(parsed.account))
            return `Conta inválida no modo pool: ${parsed.account}`
          if (!groups.has(parsed.account)) groups.set(parsed.account, [])
          groups.get(parsed.account)!.push(parsed.id)
          continue
        }
        if (accounts.length > 1) return `IDs ambíguos no modo pessoal (pool).\nUse: email::id`
        const acc = accounts[0]
        if (!groups.has(acc)) groups.set(acc, [])
        groups.get(acc)!.push(parsed.id)
      }

      let total = 0
      for (const [acc, idsList] of groups) {
        const gmail = getGmailService(workspaceId, acc)
        for (const id of idsList) {
          await gmail.trash(id)
          total += 1
        }
      }
      return `✅ Enviei ${total} email(s) para a lixeira.`
    },
  }
}

export function createGmailMarkUnreadTool(): AgentTool {
  return {
    name: 'GMAIL_MARK_UNREAD',
    description: 'Marca email(s) como não lido(s) por id. No pool: use email::id.',
    async execute(params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'
      const idsRaw = (params.ids || params.id || '').trim()
      if (!idsRaw) return 'Parâmetro obrigatório: ids'

      const ids = splitIds(idsRaw)
      const groups = new Map<string, string[]>()
      for (const t of ids) {
        const parsed = parseEmailPrefixedId(t)
        if (parsed.account) {
          if (!accounts.includes(parsed.account))
            return `Conta inválida no modo pool: ${parsed.account}`
          if (!groups.has(parsed.account)) groups.set(parsed.account, [])
          groups.get(parsed.account)!.push(parsed.id)
          continue
        }
        if (accounts.length > 1) return `IDs ambíguos no modo pessoal (pool).\nUse: email::id`
        const acc = accounts[0]
        if (!groups.has(acc)) groups.set(acc, [])
        groups.get(acc)!.push(parsed.id)
      }

      let total = 0
      for (const [acc, idsList] of groups) {
        const gmail = getGmailService(workspaceId, acc)
        for (const id of idsList) {
          await gmail.markAsUnread(id)
          total += 1
        }
      }
      return `✅ Marquei ${total} email(s) como não lido(s).`
    },
  }
}

export function createGmailSendTool(): AgentTool {
  return {
    name: 'GMAIL_SEND',
    description:
      'Envia um email (ação mutável). No pool pessoal, exige conta ativa (GOOGLE_SET_ACCOUNT).',
    async execute(params, ctx) {
      const { workspaceId, account, accounts } = await ensureGoogleMutatingAccount(
        ctx.chatId,
        params.account || null
      )
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'
      if (!account) {
        return `Ação ambígua no modo pessoal (pool).\nDefina a conta ativa: [EXECUTE:GOOGLE_SET_ACCOUNT]email: <conta>[/EXECUTE]`
      }

      const to = (params.to || '').trim()
      const subject = (params.subject || '').trim()
      const body = (params.body || '').trim()
      if (!to) return 'Parâmetro obrigatório: to'
      if (!subject) return 'Parâmetro obrigatório: subject'
      if (!body) return 'Parâmetro obrigatório: body'

      const gmail = getGmailService(workspaceId, account)
      await gmail.sendEmail({
        to: to
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        subject,
        body,
        cc: params.cc
          ? params.cc
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        bcc: params.bcc
          ? params.bcc
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      })
      return `✅ Email enviado via ${account}`
    },
  }
}

export function createGmailDraftTool(): AgentTool {
  return {
    name: 'GMAIL_DRAFT',
    description: 'Cria um rascunho de email (ação mutável). No pool pessoal, exige conta ativa.',
    async execute(params, ctx) {
      const { workspaceId, account, accounts } = await ensureGoogleMutatingAccount(
        ctx.chatId,
        params.account || null
      )
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'
      if (!account) {
        return `Ação ambígua no modo pessoal (pool).\nDefina a conta ativa: [EXECUTE:GOOGLE_SET_ACCOUNT]email: <conta>[/EXECUTE]`
      }

      const to = (params.to || '').trim()
      const subject = (params.subject || '').trim()
      const body = (params.body || '').trim()
      if (!to) return 'Parâmetro obrigatório: to'
      if (!subject) return 'Parâmetro obrigatório: subject'
      if (!body) return 'Parâmetro obrigatório: body'

      const gmail = getGmailService(workspaceId, account)
      const draft = await gmail.createDraft({
        to: to
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        subject,
        body,
        cc: params.cc
          ? params.cc
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        bcc: params.bcc
          ? params.bcc
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      })
      ctx.appendInternalData(`GMAIL_DRAFT(${account})`, `draftId=${draft.id}`)
      return `✅ Rascunho criado via ${account} (id: ${draft.id})`
    },
  }
}

function getHeaderValue(headers: Array<{ name: string; value: string }>, name: string): string {
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

function quoteForReply(text: string, maxLines = 20): string {
  const lines = text.split('\n').map((l) => l.trimEnd())
  const slice = lines.slice(0, maxLines).map((l) => `> ${l}`)
  return slice.join('\n')
}

export function createGmailReplyTool(): AgentTool {
  return {
    name: 'GMAIL_REPLY',
    description: 'Responde um email por id (ação mutável). No pool: use email::id.',
    async execute(params, ctx) {
      const idRaw = (params.id || '').trim()
      const body = (params.body || '').trim()
      if (!idRaw) return 'Parâmetro obrigatório: id (use email::id no pool)'
      if (!body) return 'Parâmetro obrigatório: body'

      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const parsed = parseEmailPrefixedId(idRaw)
      const acc = parsed.account || null
      const id = parsed.id
      if (!acc && accounts.length > 1) return `ID ambíguo no modo pessoal (pool).\nUse: email::id`
      const account = acc || accounts[0]

      const gmail = getGmailService(workspaceId, account)
      const msg = await gmail.getMessage(id, 'full')
      const headers = msg.payload.headers || []

      const from = getHeaderValue(headers, 'From')
      const replyTo = getHeaderValue(headers, 'Reply-To')
      const to = (replyTo || from).trim()
      const subject0 = getHeaderValue(headers, 'Subject') || '(sem assunto)'
      const subject = /^re:/i.test(subject0) ? subject0 : `Re: ${subject0}`
      const messageId =
        getHeaderValue(headers, 'Message-Id') || getHeaderValue(headers, 'Message-ID')
      const references0 = getHeaderValue(headers, 'References')
      const references = [references0, messageId].filter(Boolean).join(' ').trim()

      const parsedMsg = gmail.parseMessage(msg)
      const quoted = quoteForReply(parsedMsg.body)
      const rawEmail = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        ...(messageId ? [`In-Reply-To: ${messageId}`] : []),
        ...(references ? [`References: ${references}`] : []),
        '',
        `${body}\n\n---\nEm ${parsedMsg.date.toLocaleString('pt-BR')}, ${parsedMsg.from} escreveu:\n${quoted}`,
      ].join('\r\n')

      await gmail.sendRawEmail(rawEmail, msg.threadId)
      return `✅ Resposta enviada via ${account}`
    },
  }
}

export function createGmailForwardTool(): AgentTool {
  return {
    name: 'GMAIL_FORWARD',
    description: 'Encaminha um email por id (ação mutável). No pool: use email::id.',
    async execute(params, ctx) {
      const idRaw = (params.id || '').trim()
      const toRaw = (params.to || '').trim()
      const body = (params.body || '').trim()
      if (!idRaw) return 'Parâmetro obrigatório: id (use email::id no pool)'
      if (!toRaw) return 'Parâmetro obrigatório: to'

      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const parsed = parseEmailPrefixedId(idRaw)
      const acc = parsed.account || null
      const id = parsed.id
      if (!acc && accounts.length > 1) return `ID ambíguo no modo pessoal (pool).\nUse: email::id`
      const account = acc || accounts[0]

      const gmail = getGmailService(workspaceId, account)
      const msg = await gmail.getMessage(id, 'full')
      const headers = msg.payload.headers || []
      const subject0 = getHeaderValue(headers, 'Subject') || '(sem assunto)'
      const subject = /^fwd:/i.test(subject0) ? subject0 : `Fwd: ${subject0}`

      const parsedMsg = gmail.parseMessage(msg)
      const forwardedBlock = [
        '---------- Mensagem encaminhada ----------',
        `De: ${parsedMsg.from}`,
        `Data: ${parsedMsg.date.toLocaleString('pt-BR')}`,
        `Assunto: ${parsedMsg.subject}`,
        `Para: ${parsedMsg.to.join(', ')}`,
        '',
        parsedMsg.body,
      ].join('\n')

      const rawEmail = [
        `To: ${toRaw}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        '',
        [body, forwardedBlock].filter(Boolean).join('\n\n'),
      ].join('\r\n')

      await gmail.sendRawEmail(rawEmail)
      return `✅ Email encaminhado via ${account}`
    },
  }
}
