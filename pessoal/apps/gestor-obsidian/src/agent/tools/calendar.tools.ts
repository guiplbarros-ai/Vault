import { addDays, endOfDay, format, startOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { getCalendarService } from '../../services/calendar.service.js'
import { getChatSettingsDbService } from '../../services/chat-settings-db.service.js'
import { getGoogleAuthService } from '../../services/google-auth.service.js'
import type { AgentTool } from '../types.js'
import { resolveGoogleAccounts } from './google-context.js'
import { resolveGoogleMutatingAccount } from './google-context.js'

async function ensureGoogleAccounts(
  chatId: number
): Promise<{ workspaceId: string; accounts: string[] }> {
  const { workspaceId, accountEmails } = await resolveGoogleAccounts(chatId)
  if (accountEmails.length === 0) return { workspaceId, accounts: [] }
  try {
    await getGoogleAuthService(workspaceId, accountEmails[0]).getValidAccessToken()
  } catch {
    /* ignore */
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
  if (!accounts.length) return { workspaceId, account: null, accounts: [] }

  const o = (override || '').toLowerCase().trim()
  if (o && accounts.includes(o)) return { workspaceId, account: o, accounts }

  const mut = await resolveGoogleMutatingAccount(chatId)
  return { workspaceId: mut.workspaceId, account: mut.accountEmail, accounts: mut.accountEmails }
}

function parseEmailPrefixedId(token: string): { account: string | null; id: string } {
  const parts = token.split('::')
  if (parts.length === 2) return { account: parts[0].toLowerCase(), id: parts[1] }
  return { account: null, id: token }
}

async function getChatTimezone(chatId: number): Promise<string> {
  const chatDb = getChatSettingsDbService()
  if (!chatDb.enabled()) return 'America/Sao_Paulo'
  try {
    const s = await chatDb.getOrCreate(chatId)
    return (s.timezone || 'America/Sao_Paulo').trim()
  } catch {
    return 'America/Sao_Paulo'
  }
}

function calendarRangeForDay(
  when: string,
  tz: string
): { timeMin: string; timeMax: string; label: string } {
  const nowZ = toZonedTime(new Date(), tz)
  const raw = (when || 'today').trim().toLowerCase()
  let dayZ: Date
  if (raw === 'tomorrow' || raw === 'amanhã' || raw === 'amanha') {
    dayZ = addDays(nowZ, 1)
  } else if (raw === 'today' || raw === 'hoje') {
    dayZ = nowZ
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    // interpret as local date in tz
    const localMid = new Date(`${raw}T12:00:00`)
    dayZ = toZonedTime(localMid, tz)
  } else {
    // fallback: treat unknown as today
    dayZ = nowZ
  }

  const startZ = startOfDay(dayZ)
  const endZ = endOfDay(dayZ)
  return {
    timeMin: fromZonedTime(startZ, tz).toISOString(),
    timeMax: fromZonedTime(endZ, tz).toISOString(),
    label: startZ.toLocaleDateString('pt-BR', { timeZone: tz }),
  }
}

function fmtTime(d: Date, tz: string): string {
  return format(toZonedTime(d, tz), 'HH:mm')
}

function fmtDateTimeShort(d: Date, tz: string): string {
  const z = toZonedTime(d, tz)
  // Ex: "seg., 13/01 14:30"
  return z.toLocaleString('pt-BR', {
    timeZone: tz,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function createCalendarTodayTool(): AgentTool {
  return {
    name: 'CALENDAR_TODAY',
    description: 'Carrega eventos do Google Calendar de hoje',
    async execute(_params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const tz = await getChatTimezone(ctx.chatId)
      const { timeMin, timeMax } = calendarRangeForDay('today', tz)
      const perAccount = await Promise.all(
        accounts.map(async (acc) => {
          const calendar = getCalendarService(workspaceId, acc)
          const events = await calendar.getEvents({ timeMin, timeMax, maxResults: 80 })
          const lines = events.map((e) => {
            const parsed = calendar.parseEvent(e)
            const time = parsed.isAllDay ? '📅 Dia inteiro' : `🕐 ${fmtTime(parsed.start, tz)}`
            const meet = parsed.meetLink ? ' 🔗' : ''
            const id = parsed.id || ''
            const link = parsed.link || ''
            const suffix = [id && `id=${id}`, link && `link=${link}`].filter(Boolean).join(' ')
            return {
              when: parsed.start.getTime(),
              line: `• [${acc}] ${time} - ${parsed.title}${meet}${suffix ? ` (${suffix})` : ''}`,
            }
          })
          return { acc, lines }
        })
      )

      const merged = perAccount.flatMap((x) => x.lines).sort((a, b) => a.when - b.when)
      if (merged.length === 0) return 'Nenhum evento para hoje! 🎉'
      const list = merged.map((x) => x.line).join('\n')
      ctx.appendInternalData('CALENDAR_TODAY', list)
      return `📅 Eventos de hoje carregados (${merged.length})`
    },
  }
}

export function createCalendarWeekTool(): AgentTool {
  return {
    name: 'CALENDAR_WEEK',
    description: 'Carrega eventos do Google Calendar da semana',
    async execute(_params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const tz = await getChatTimezone(ctx.chatId)
      const nowZ = toZonedTime(new Date(), tz)
      const startZ = startOfDay(nowZ)
      const endZ = endOfDay(addDays(nowZ, 7))
      const timeMin = fromZonedTime(startZ, tz).toISOString()
      const timeMax = fromZonedTime(endZ, tz).toISOString()

      const perAccount = await Promise.all(
        accounts.map(async (acc) => {
          const calendar = getCalendarService(workspaceId, acc)
          const events = await calendar.getEvents({ timeMin, timeMax, maxResults: 120 })
          const lines = events.map((e) => {
            const p = calendar.parseEvent(e)
            const when = p.isAllDay
              ? toZonedTime(p.start, tz).toLocaleDateString('pt-BR', { timeZone: tz })
              : fmtDateTimeShort(p.start, tz)
            const meet = p.meetLink ? ' 🔗' : ''
            return `• ${when} - ${p.title}${meet}`
          })
          const formatted = lines.join('\n') || '• (nenhum evento)'
          return { acc, formatted, count: events.length }
        })
      )

      const total = perAccount.reduce((s, x) => s + x.count, 0)
      if (total === 0) return 'Semana livre! Nenhum evento nos próximos 7 dias.'
      const block = perAccount
        .filter((x) => x.count > 0)
        .map((x) => `=== ${x.acc} ===\n${x.formatted}`)
        .join('\n\n')
      ctx.appendInternalData('CALENDAR_WEEK', block)
      return `📅 Eventos da semana carregados (total: ${total})`
    },
  }
}

export function createCalendarNextTool(): AgentTool {
  return {
    name: 'CALENDAR_NEXT',
    description: 'Retorna próximo evento do Google Calendar (texto pronto)',
    async execute(_params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'
      const tz = await getChatTimezone(ctx.chatId)

      const candidates = await Promise.all(
        accounts.map(async (acc) => {
          const calendar = getCalendarService(workspaceId, acc)
          const event = await calendar.getNextEvent()
          if (!event) return null
          const parsed = calendar.parseEvent(event)
          return { acc, parsed }
        })
      )

      const next = candidates
        .filter(Boolean)
        .sort((a, b) => a!.parsed.start.getTime() - b!.parsed.start.getTime())[0]
      if (!next) return 'Nenhum próximo evento agendado.'

      const time = next.parsed.isAllDay
        ? 'Dia inteiro'
        : toZonedTime(next.parsed.start, tz).toLocaleString('pt-BR', {
            timeZone: tz,
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })
      const meet = next.parsed.meetLink ? `\n🔗 Meet: ${next.parsed.meetLink}` : ''
      const location = next.parsed.location ? `\n📍 ${next.parsed.location}` : ''
      return `⏰ PRÓXIMO EVENTO:\n\n📌 [${next.acc}] ${next.parsed.title}\n🕐 ${time}${location}${meet}`
    },
  }
}

export function createCalendarQuickTool(): AgentTool {
  return {
    name: 'CALENDAR_QUICK',
    description: 'Cria evento no Google Calendar via quickAdd (texto natural)',
    async execute(params, ctx) {
      // Mutating action: keep single-account behavior even in pool (must be explicit).
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'
      if (workspaceId === 'pessoal' && accounts.length > 1) {
        return `Ação ambígua no modo pessoal (pool).\nEnvie o email da conta desejada primeiro (ex: guilhermeplbarros@gmail.com) e tente de novo.`
      }
      const calendar = getCalendarService(workspaceId, accounts[0])
      const event = await calendar.quickAdd(params.text)
      return `✅ Evento criado: "${event.summary}"\n🔗 ${event.htmlLink}`
    },
  }
}

export function createCalendarListCalendarsTool(): AgentTool {
  return {
    name: 'CALENDAR_LIST_CALENDARS',
    description: 'Lista calendários disponíveis (por conta no pool)',
    async execute(_params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const perAccount = await Promise.all(
        accounts.map(async (acc) => {
          const calendar = getCalendarService(workspaceId, acc)
          const cals = await calendar.getCalendars()
          const lines = cals
            .slice(0, 12)
            .map((c) => `• ${c.primary ? '⭐ ' : ''}${c.summary} (${c.id})`)
            .join('\n')
          return `=== ${acc} ===\n${lines || '• (nenhum calendário)'}`
        })
      )
      const out = perAccount.join('\n\n')
      ctx.appendInternalData('CALENDAR_LIST_CALENDARS', out)
      return `📚 Calendários carregados`
    },
  }
}

export function createCalendarSearchTool(): AgentTool {
  return {
    name: 'CALENDAR_SEARCH',
    description: 'Busca eventos por texto (q) dentro de uma janela de dias (pool mesclado)',
    async execute(params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'
      const query = (params.query || '').trim()
      const days = params.days ? Math.max(1, Math.min(60, Number.parseInt(params.days, 10))) : 14
      const max = params.max ? Math.max(1, Math.min(50, Number.parseInt(params.max, 10))) : 20
      if (!query) return 'Parâmetro obrigatório: query'

      const tz = await getChatTimezone(ctx.chatId)
      const nowZ = toZonedTime(new Date(), tz)
      const timeMin = fromZonedTime(startOfDay(nowZ), tz).toISOString()
      const timeMax = fromZonedTime(endOfDay(addDays(nowZ, days)), tz).toISOString()

      const perAccount = await Promise.all(
        accounts.map(async (acc) => {
          const calendar = getCalendarService(workspaceId, acc)
          const events = await calendar.getEvents({ timeMin, timeMax, q: query, maxResults: max })
          const lines = events.slice(0, max).map((e) => {
            const p = calendar.parseEvent(e)
            const when = p.isAllDay
              ? toZonedTime(p.start, tz).toLocaleDateString('pt-BR', { timeZone: tz })
              : fmtDateTimeShort(p.start, tz)
            const id = p.id || ''
            const link = p.link || ''
            const suffix = [id && `id=${id}`, link && `link=${link}`].filter(Boolean).join(' ')
            return `• [${acc}] ${when} - ${p.title}${suffix ? ` (${suffix})` : ''}`
          })
          return lines
        })
      )

      const flat = perAccount.flat()
      if (flat.length === 0)
        return `Nenhum evento encontrado para "${query}" nos próximos ${days} dias.`
      const out = flat.slice(0, 40).join('\n')
      ctx.appendInternalData(`CALENDAR_SEARCH("${query}")`, out)
      return `🔎 Busca de eventos carregada (${flat.length})`
    },
  }
}

export function createCalendarInvestigateTool(): AgentTool {
  return {
    name: 'CALENDAR_INVESTIGATE',
    description:
      'Investiga um possível compromisso: busca por termo (query) em um dia ou janela (when/days) e retorna evidências (conta, id, link).',
    async execute(params, ctx) {
      const query = (params.query || params.term || '').trim()
      const when = (params.when || params.date || '').trim()
      const days = params.days ? Math.max(1, Math.min(60, Number.parseInt(params.days, 10))) : 3
      const max = params.max ? Math.max(1, Math.min(50, Number.parseInt(params.max, 10))) : 20
      if (!query) return 'Parâmetro obrigatório: query'

      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const tz = await getChatTimezone(ctx.chatId)
      let timeMin: string
      let timeMax: string
      let label: string
      if (when) {
        const r = calendarRangeForDay(when, tz)
        timeMin = r.timeMin
        timeMax = r.timeMax
        label = r.label
      } else {
        const nowZ = toZonedTime(new Date(), tz)
        timeMin = fromZonedTime(startOfDay(nowZ), tz).toISOString()
        timeMax = fromZonedTime(endOfDay(addDays(nowZ, days)), tz).toISOString()
        label = `${days} dia(s)`
      }

      const perAccount = await Promise.all(
        accounts.map(async (acc) => {
          const calendar = getCalendarService(workspaceId, acc)
          const events = await calendar.getEvents({ timeMin, timeMax, q: query, maxResults: max })
          const lines = events.map((e) => {
            const p = calendar.parseEvent(e)
            const whenStr = p.isAllDay
              ? toZonedTime(p.start, tz).toLocaleDateString('pt-BR', { timeZone: tz })
              : fmtDateTimeShort(p.start, tz)
            const suffix = [p.id && `id=${p.id}`, p.link && `link=${p.link}`]
              .filter(Boolean)
              .join(' ')
            return `• [${acc}] ${whenStr} - ${p.title}${suffix ? ` (${suffix})` : ''}`
          })
          return { acc, count: events.length, lines }
        })
      )

      const total = perAccount.reduce((s, x) => s + x.count, 0)
      if (total === 0) return `Nenhum compromisso encontrado para "${query}" (${label}).`

      const out = perAccount
        .filter((x) => x.count > 0)
        .map((x) => `=== ${x.acc} (${x.count}) ===\n${x.lines.slice(0, 12).join('\n')}`)
        .join('\n\n')
      ctx.appendInternalData(`CALENDAR_INVESTIGATE("${query}")`, out)
      return `🔎 Investigação de calendário carregada (${total} match(es))`
    },
  }
}

export function createCalendarGetEventTool(): AgentTool {
  return {
    name: 'CALENDAR_GET_EVENT',
    description: 'Lê detalhes de um evento por id (no pool: use email::id)',
    async execute(params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'
      const tz = await getChatTimezone(ctx.chatId)
      const raw = (params.id || '').trim()
      if (!raw) return 'Parâmetro obrigatório: id'
      const parsed = parseEmailPrefixedId(raw)
      if (!parsed.account && accounts.length > 1)
        return `ID ambíguo no modo pessoal (pool).\nUse: email::id`
      const acc = parsed.account || accounts[0]
      const calendar = getCalendarService(workspaceId, acc)
      const ev = await calendar.getEvent(parsed.id)
      const p = calendar.parseEvent(ev)

      const content = [
        `Conta: ${acc}`,
        `Título: ${p.title}`,
        `Início: ${toZonedTime(p.start, tz).toLocaleString('pt-BR', { timeZone: tz })}${p.isAllDay ? ' (dia inteiro)' : ''}`,
        `Fim: ${toZonedTime(p.end, tz).toLocaleString('pt-BR', { timeZone: tz })}${p.isAllDay ? ' (dia inteiro)' : ''}`,
        p.location ? `Local: ${p.location}` : '',
        p.meetLink ? `Meet: ${p.meetLink}` : '',
        p.attendees.length ? `Convidados: ${p.attendees.join(', ')}` : '',
        p.description ? `\n${p.description}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      ctx.appendInternalData(`CALENDAR_GET_EVENT("${raw}")`, content)
      return `📅 Evento carregado`
    },
  }
}

export function createCalendarDayTool(): AgentTool {
  return {
    name: 'CALENDAR_DAY',
    description:
      'Carrega eventos de um dia específico (when=today|tomorrow|YYYY-MM-DD). No pool, mescla e prefixa [email].',
    async execute(params, ctx) {
      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (accounts.length === 0)
        return 'Google não autenticado. Diga "conectar google" para autorizar.'
      const when = (params.when || params.date || 'today').trim()
      const max = params.max ? Math.max(1, Math.min(80, Number.parseInt(params.max, 10))) : 80

      const tz = await getChatTimezone(ctx.chatId)
      const { timeMin, timeMax, label } = calendarRangeForDay(when, tz)

      const perAccount = await Promise.all(
        accounts.map(async (acc) => {
          const calendar = getCalendarService(workspaceId, acc)
          const events = await calendar.getEvents({ timeMin, timeMax, maxResults: max })
          const lines = events.map((e) => {
            const parsed = calendar.parseEvent(e)
            const time = parsed.isAllDay ? '📅 Dia inteiro' : `🕐 ${fmtTime(parsed.start, tz)}`
            const meet = parsed.meetLink ? ' 🔗' : ''
            const id = parsed.id || ''
            const link = parsed.link || ''
            const suffix = [id && `id=${id}`, link && `link=${link}`].filter(Boolean).join(' ')
            return {
              whenTs: parsed.start.getTime(),
              line: `• [${acc}] ${time} - ${parsed.title}${meet}${suffix ? ` (${suffix})` : ''}`,
            }
          })
          return lines
        })
      )

      const merged = perAccount.flat().sort((a, b) => a.whenTs - b.whenTs)
      if (merged.length === 0) return `Nenhum evento para ${label}. 🎉`
      const out = merged.map((x) => x.line).join('\n')
      ctx.appendInternalData(`CALENDAR_DAY(${when})`, out)
      return `📅 Eventos de ${label} carregados (${merged.length})`
    },
  }
}

export function createCalendarCreateTool(): AgentTool {
  return {
    name: 'CALENDAR_CREATE',
    description:
      'Cria evento com campos (summary/start/end/attendees/meet). Ação mutável; no pool exige conta ativa.',
    async execute(params, ctx) {
      const { workspaceId, account, accounts } = await ensureGoogleMutatingAccount(
        ctx.chatId,
        params.account || null
      )
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'
      if (!account)
        return `Ação ambígua no modo pessoal (pool).\nDefina a conta ativa: [EXECUTE:GOOGLE_SET_ACCOUNT]email: <conta>[/EXECUTE]`

      const summary = (params.summary || params.title || '').trim()
      const start = (params.start || '').trim()
      const end = (params.end || '').trim()
      if (!summary) return 'Parâmetro obrigatório: summary'
      if (!start) return 'Parâmetro obrigatório: start (ISO 8601)'
      if (!end) return 'Parâmetro obrigatório: end (ISO 8601)'

      const attendees = (params.attendees || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const meet = (params.meet || '').trim().toLowerCase()

      const calendar = getCalendarService(workspaceId, account)
      const ev = await calendar.createEvent({
        summary,
        description: params.description || undefined,
        location: params.location || undefined,
        start: start.includes('T') ? { dateTime: start } : { date: start },
        end: end.includes('T') ? { dateTime: end } : { date: end },
        attendees: attendees.length ? attendees : undefined,
        conferenceData: meet === 'true' || meet === '1' || meet === 'yes' || meet === 'sim',
      })
      return `✅ Evento criado via ${account}: "${ev.summary}"\n🔗 ${ev.htmlLink}\nID: ${ev.id}`
    },
  }
}

export function createCalendarUpdateTool(): AgentTool {
  return {
    name: 'CALENDAR_UPDATE',
    description:
      'Atualiza um evento por id. Ação mutável; no pool use email::id ou selecione conta ativa.',
    async execute(params, ctx) {
      const raw = (params.id || params.eventId || '').trim()
      if (!raw) return 'Parâmetro obrigatório: id'

      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const parsed = parseEmailPrefixedId(raw)
      let account = parsed.account
      if (!account) {
        const mut = await resolveGoogleMutatingAccount(ctx.chatId)
        account = mut.accountEmail
      }
      if (!account)
        return `Ação ambígua no modo pessoal (pool).\nUse: email::id ou defina conta ativa com GOOGLE_SET_ACCOUNT.`

      const updates: any = {}
      if (params.summary || params.title) updates.summary = (params.summary || params.title).trim()
      if (params.description) updates.description = params.description
      if (params.location) updates.location = params.location
      if (params.start)
        updates.start = params.start.includes('T')
          ? { dateTime: params.start }
          : { date: params.start }
      if (params.end)
        updates.end = params.end.includes('T') ? { dateTime: params.end } : { date: params.end }
      if (params.attendees) {
        const attendees = params.attendees
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        updates.attendees = attendees.map((email: string) => ({
          email,
          responseStatus: 'needsAction',
        }))
      }

      const calendar = getCalendarService(workspaceId, account)
      const ev = await calendar.updateEvent(parsed.id, updates)
      return `✅ Evento atualizado via ${account}: "${ev.summary}"\n🔗 ${ev.htmlLink}`
    },
  }
}

export function createCalendarDeleteTool(): AgentTool {
  return {
    name: 'CALENDAR_DELETE',
    description:
      'Deleta um evento por id. Ação mutável; no pool use email::id ou selecione conta ativa.',
    async execute(params, ctx) {
      const raw = (params.id || params.eventId || '').trim()
      if (!raw) return 'Parâmetro obrigatório: id'

      const { workspaceId, accounts } = await ensureGoogleAccounts(ctx.chatId)
      if (!accounts.length) return 'Google não autenticado. Diga "conectar google" para autorizar.'

      const parsed = parseEmailPrefixedId(raw)
      let account = parsed.account
      if (!account) {
        const mut = await resolveGoogleMutatingAccount(ctx.chatId)
        account = mut.accountEmail
      }
      if (!account)
        return `Ação ambígua no modo pessoal (pool).\nUse: email::id ou defina conta ativa com GOOGLE_SET_ACCOUNT.`

      const calendar = getCalendarService(workspaceId, account)
      await calendar.deleteEvent(parsed.id)
      return `✅ Evento deletado via ${account}`
    },
  }
}
