import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { addDays, endOfDay, format, startOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import cron from 'node-cron'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { getCalendarService } from './calendar.service.js'
import { getChatSettingsDbService } from './chat-settings-db.service.js'
import { getDigestSchedulesDbService } from './digest-schedules-db.service.js'
import { getGmailService } from './gmail.service.js'
import { getGoogleTokensDbService } from './google-tokens-db.service.js'
import { type NewsItem, getNewsService } from './news.service.js'
import { getTodoistService } from './todoist.service.js'
import { getUsageDbService } from './usage-db.service.js'
import { getWeatherPrefsService } from './weather-prefs.service.js'
import { getWeatherService, weatherCodeToPt } from './weather.service.js'

loadEnv()

interface DigestConfig {
  id: string
  chatId: number
  cronExpression: string // Ex: '0 7 * * *' = 7h todos os dias
  kind?: 'daily' | 'weekly'
  enabled: boolean
}

type SendMessageFn = (chatId: number, message: string) => Promise<void>

class DailyDigestService {
  private configs: DigestConfig[] = []
  private jobs: cron.ScheduledTask[] = []
  private sendMessage: SendMessageFn | null = null
  private configPath: string
  private initialized = false
  private lastEmailRefsByChat = new Map<
    number,
    { at: number; refs: Array<{ workspaceId: 'pessoal' | 'freelaw'; account: string; id: string }> }
  >()

  constructor() {
    this.configPath = path.join(os.homedir(), '.obsidian-manager', 'daily-digest.json')
    // configs will be loaded on first startJobs()
  }

  /**
   * Configura a função de envio de mensagem (do Telegram)
   */
  setSendMessage(fn: SendMessageFn): void {
    this.sendMessage = fn
    logger.info('Daily Digest: Função de envio configurada')
  }

  private ensureConfigDir(): void {
    const dir = path.dirname(this.configPath)
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    } catch {
      // ignore
    }
  }

  private loadConfigsFromFile(): void {
    try {
      if (!fs.existsSync(this.configPath)) return
      const raw = fs.readFileSync(this.configPath, 'utf-8')
      const parsed = JSON.parse(raw) as DigestConfig[]
      if (Array.isArray(parsed)) {
        // Basic validation
        this.configs = parsed
          .filter((c) => typeof c?.chatId === 'number' && typeof c?.cronExpression === 'string')
          .map((c) => ({
            id: c.id || `${c.chatId}:${c.cronExpression}`,
            chatId: c.chatId,
            cronExpression: c.cronExpression,
            kind: c.kind === 'weekly' ? 'weekly' : 'daily',
            enabled: c.enabled !== false,
          }))
        logger.info(`Daily Digest: Config carregada (${this.configs.length} schedule(s))`)
      }
    } catch (error) {
      logger.error(
        `Daily Digest: Falha ao carregar config (${error instanceof Error ? error.message : 'erro'})`
      )
    }
  }

  private saveConfigsToFile(): void {
    try {
      this.ensureConfigDir()
      fs.writeFileSync(this.configPath, JSON.stringify(this.configs, null, 2), 'utf-8')
    } catch (error) {
      logger.error(
        `Daily Digest: Falha ao salvar config (${error instanceof Error ? error.message : 'erro'})`
      )
    }
  }

  private async loadConfigsFromDb(): Promise<void> {
    const db = getDigestSchedulesDbService()
    if (!db.enabled()) return
    const rows = await db.listEnabled()
    this.configs = rows.map((r) => ({
      id: r.id || `${r.chat_id}:${r.cron_expression}`,
      chatId: r.chat_id,
      cronExpression: r.cron_expression,
      kind: r.kind,
      enabled: r.enabled !== false,
    }))
  }

  private async persistChatKindToDb(chatId: number, kind: 'daily' | 'weekly'): Promise<void> {
    const db = getDigestSchedulesDbService()
    if (!db.enabled()) return
    const schedules = this.configs
      .filter((c) => c.chatId === chatId && (c.kind || 'daily') === kind && c.enabled)
      .map((c) => ({ cronExpression: c.cronExpression, timezone: 'America/Sao_Paulo' }))
    await db.replaceForChatKind({ chatId, kind, schedules })
  }

  private makeId(chatId: number, cronExpression: string): string {
    return `${chatId}:${cronExpression}`
  }

  /**
   * Define UM horário (substitui os anteriores) para um chat
   */
  addChat(chatId: number, hour = 7, minute = 0): void {
    const cronExpression = `${minute} ${hour} * * *`

    // Remove configs existentes do chat (substitui)
    this.configs = this.configs.filter(
      (c) => !(c.chatId === chatId && (c.kind || 'daily') === 'daily')
    )

    this.configs.push({
      id: this.makeId(chatId, cronExpression),
      chatId,
      cronExpression,
      kind: 'daily',
      enabled: true,
    })

    logger.info(
      `Daily Digest: Chat ${chatId} configurado para ${hour}:${minute.toString().padStart(2, '0')}`
    )

    // Reinicia os jobs
    this.saveConfigsToFile()
    void this.persistChatKindToDb(chatId, 'daily').catch(() => {})
    void this.startJobs().catch(() => {})
  }

  /**
   * Adiciona MAIS UM horário para um chat (sem remover os existentes)
   */
  addSchedule(chatId: number, hour: number, minute: number): void {
    const cronExpression = `${minute} ${hour} * * *`
    const id = this.makeId(chatId, cronExpression)
    if (this.configs.some((c) => c.id === id)) return

    this.configs.push({ id, chatId, cronExpression, kind: 'daily', enabled: true })
    this.saveConfigsToFile()
    void this.persistChatKindToDb(chatId, 'daily').catch(() => {})
    void this.startJobs().catch(() => {})
    logger.info(
      `Daily Digest: Schedule adicionado para chat ${chatId} - ${hour}:${minute.toString().padStart(2, '0')}`
    )
  }

  /**
   * Ativa resumo semanal padrão: segundas 07:00 (America/Sao_Paulo)
   */
  enableWeeklyDefault(chatId: number, hour = 7, minute = 0): void {
    const cronExpression = `${minute} ${hour} * * 1` // Monday
    const id = this.makeId(chatId, cronExpression)
    if (this.configs.some((c) => c.id === id && (c.kind || 'daily') === 'weekly')) return
    // Remove outros semanais do chat (substitui)
    this.configs = this.configs.filter(
      (c) => !(c.chatId === chatId && (c.kind || 'daily') === 'weekly')
    )
    this.configs.push({ id, chatId, cronExpression, kind: 'weekly', enabled: true })
    this.saveConfigsToFile()
    void this.persistChatKindToDb(chatId, 'weekly').catch(() => {})
    void this.startJobs().catch(() => {})
    logger.info(
      `Weekly Digest: Ativado para chat ${chatId} - segundas ${hour}:${minute.toString().padStart(2, '0')}`
    )
  }

  /**
   * Ativa modo proativo padrão: 07:00 e 19:00
   */
  enableProactiveDefaults(chatId: number): void {
    // Não remove: só garante que exista
    this.addSchedule(chatId, 7, 0)
    this.addSchedule(chatId, 19, 0)
    this.enableWeeklyDefault(chatId, 7, 0)
  }

  /**
   * Remove um chat do resumo diário
   */
  removeChat(chatId: number): void {
    this.configs = this.configs.filter(
      (c) => !(c.chatId === chatId && (c.kind || 'daily') === 'daily')
    )
    this.saveConfigsToFile()
    const db = getDigestSchedulesDbService()
    if (db.enabled()) void db.removeChatKind(chatId, 'daily').catch(() => {})
    void this.startJobs().catch(() => {})
    logger.info(`Daily Digest: Chat ${chatId} removido`)
  }

  removeWeekly(chatId: number): void {
    this.configs = this.configs.filter(
      (c) => !(c.chatId === chatId && (c.kind || 'daily') === 'weekly')
    )
    this.saveConfigsToFile()
    const db = getDigestSchedulesDbService()
    if (db.enabled()) void db.removeChatKind(chatId, 'weekly').catch(() => {})
    void this.startJobs().catch(() => {})
    logger.info(`Weekly Digest: Chat ${chatId} removido`)
  }

  getSchedulesForChat(chatId: number): DigestConfig[] {
    return this.configs
      .filter((c) => c.chatId === chatId && c.enabled && (c.kind || 'daily') === 'daily')
      .slice()
      .sort((a, b) => a.cronExpression.localeCompare(b.cronExpression))
  }

  getWeeklySchedulesForChat(chatId: number): DigestConfig[] {
    return this.configs
      .filter((c) => c.chatId === chatId && c.enabled && (c.kind || 'daily') === 'weekly')
      .slice()
      .sort((a, b) => a.cronExpression.localeCompare(b.cronExpression))
  }

  /**
   * Inicia os jobs de agendamento
   */
  async startJobs(): Promise<void> {
    // lazy init: prefer DB schedules when available
    if (!this.initialized) {
      this.initialized = true
      const db = getDigestSchedulesDbService()
      if (db.enabled()) {
        try {
          await this.loadConfigsFromDb()
          logger.info(
            `Daily Digest: Config carregada do Supabase (${this.configs.length} schedule(s))`
          )
        } catch (e) {
          logger.error(
            `Daily Digest: Falha ao carregar do Supabase (${e instanceof Error ? e.message : 'erro'})`
          )
          this.loadConfigsFromFile()
        }
      } else {
        this.loadConfigsFromFile()
      }
    }

    // Para todos os jobs existentes
    this.jobs.forEach((job) => job.stop())
    this.jobs = []

    // Cria novos jobs para cada config
    for (const config of this.configs) {
      if (!config.enabled) continue

      const job = cron.schedule(
        config.cronExpression,
        async () => {
          const kind = config.kind || 'daily'
          logger.info(
            `${kind === 'weekly' ? 'Weekly' : 'Daily'} Digest: Executando para chat ${config.chatId}`
          )
          if (kind === 'weekly') {
            await this.sendWeeklyDigest(config.chatId)
          } else {
            await this.sendDigest(config.chatId)
          }
        },
        {
          timezone: 'America/Sao_Paulo',
        }
      )

      this.jobs.push(job)
      logger.info(
        `${(config.kind || 'daily') === 'weekly' ? 'Weekly' : 'Daily'} Digest: Job agendado - ${config.cronExpression} (America/Sao_Paulo)`
      )
    }
  }

  /**
   * Para todos os jobs
   */
  stopJobs(): void {
    this.jobs.forEach((job) => job.stop())
    this.jobs = []
    logger.info('Daily Digest: Todos os jobs parados')
  }

  /**
   * Gera e envia o resumo diário
   */
  async sendDigest(chatId: number): Promise<void> {
    if (!this.sendMessage) {
      logger.error('Daily Digest: Função de envio não configurada')
      return
    }

    try {
      const digest = await this.generateDailyDigest(chatId)
      await this.sendMessage(chatId, digest)
      logger.info(`Daily Digest: Enviado para chat ${chatId}`)
    } catch (error) {
      logger.error(`Daily Digest erro: ${error instanceof Error ? error.message : 'Erro'}`)
    }
  }

  async sendWeeklyDigest(chatId: number): Promise<void> {
    if (!this.sendMessage) {
      logger.error('Weekly Digest: Função de envio não configurada')
      return
    }
    try {
      const digest = await this.generateWeeklyDigest(chatId)
      await this.sendMessage(chatId, digest)
      logger.info(`Weekly Digest: Enviado para chat ${chatId}`)
    } catch (error) {
      logger.error(`Weekly Digest erro: ${error instanceof Error ? error.message : 'Erro'}`)
    }
  }

  /**
   * Lista contas Google conectadas por workspace via Supabase
   */
  private async listGoogleAccountsByWorkspace(
    workspaceId: 'pessoal' | 'freelaw'
  ): Promise<string[]> {
    const db = getGoogleTokensDbService()
    if (!db.enabled()) return []
    const tokens = await db.list(workspaceId)
    return tokens.map((t) => t.account_email).filter(Boolean)
  }

  private async getChatTimezone(chatId: number): Promise<string> {
    const chatDb = getChatSettingsDbService()
    if (!chatDb.enabled()) return 'America/Sao_Paulo'
    try {
      const s = await chatDb.getOrCreate(chatId)
      return (s.timezone || 'America/Sao_Paulo').trim()
    } catch {
      return 'America/Sao_Paulo'
    }
  }

  private async getChatWorkspaceId(chatId: number): Promise<'pessoal' | 'freelaw'> {
    const chatDb = getChatSettingsDbService()
    if (!chatDb.enabled()) return 'pessoal'
    try {
      const s = await chatDb.getOrCreate(chatId)
      return (s.workspace_id as any) === 'freelaw' ? 'freelaw' : 'pessoal'
    } catch {
      return 'pessoal'
    }
  }

  private escapeMd(text: string): string {
    // Telegram parse_mode: 'Markdown' (legacy). Escape the most common breakers.
    // We keep it minimal to preserve readability.
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/`/g, '\\`')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
  }

  private ellipsize(text: string, max: number): string {
    const s = (text || '').trim()
    if (s.length <= max) return s
    return `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`
  }

  private formatNewsLines(items: NewsItem[], max: number): string[] {
    const out: string[] = []
    const slice = items.slice(0, Math.max(0, max))
    for (const it of slice) {
      const title = this.escapeMd(this.ellipsize(it.title, 110))
      const src = this.escapeMd(this.ellipsize(it.source, 28))
      out.push(`- ${title} _(${src})_`)
    }
    return out
  }

  private formatAccount(email: string): string {
    const e = (email || '').trim()
    const at = e.indexOf('@')
    if (at <= 0) return e
    const local = e.slice(0, at)
    const domain = e.slice(at + 1)
    return `${local}(@${domain})`
  }

  private accountDisplayName(email: string): string {
    const e = (email || '').trim().toLowerCase()
    if (e === 'guiplbarros@gmail.com') return 'e-mail pessoal'
    if (e === 'guilhermeplbarros@gmail.com') return 'e-mail profissional'
    if (e === 'guilherme@freelaw.work') return 'e-mail Freelaw'
    // fallback
    return this.formatAccount(email)
  }

  private locationDisplayName(location: string, resolvedName?: string): string {
    const loc = (location || '').trim()
    const res = (resolvedName || '').trim()
    // Hard default for the user's locale / preference
    if (loc === '-19.922753,-43.945158') return 'Belo Horizonte/MG'
    if (res && /belo horizonte/i.test(res)) return 'Belo Horizonte/MG'
    return res || loc
  }

  private async getInboxUnreadCount(
    workspaceId: 'pessoal' | 'freelaw',
    accountEmail: string
  ): Promise<number> {
    // We prefer label metadata to avoid "sampling" unread messages.
    // Gmail exposes exact unread counts for system labels like INBOX.
    const gmail = getGmailService(workspaceId, accountEmail)
    const labels = await gmail.getLabels()
    const inbox = labels.find(
      (l) => (l.id || '').toUpperCase() === 'INBOX' || (l.name || '').toUpperCase() === 'INBOX'
    )
    return Number.isFinite(Number(inbox?.messagesUnread)) ? Number(inbox?.messagesUnread) : 0
  }

  private emailHighlightReason(input: { from: string; subject: string }): string | null {
    const from = (input.from || '').toLowerCase()
    const subject = (input.subject || '').toLowerCase()
    const blob = `${from} ${subject}`

    // Noise / not relevant (user preferences)
    const ignore = [
      'glassdoor',
      'binance',
      'lse online',
      // generic promos
      'last chance',
      '% off',
      'desconto',
      'promo',
      'promoção',
      'promocao',
      'oferta',
      'sale',
      'black friday',
      'cyber',
      'candidatar-se agora',
      'apply now',
    ]
    if (ignore.some((k) => blob.includes(k))) return null

    // High-signal categories
    const security = [
      'security',
      'alert',
      'login',
      'senha',
      'password',
      'verificação',
      'verificacao',
      '2fa',
      'suspicious',
      'suspeit',
    ]
    if (security.some((k) => blob.includes(k)))
      return 'segurança da conta (vale checar se foi você)'

    const finance = [
      'pagamento',
      'cobran',
      'fatura',
      'boleto',
      'invoice',
      'nota fiscal',
      'nf',
      'reembolso',
      'pix',
      'transfer',
      'concilia',
      'extrato',
    ]
    if (finance.some((k) => blob.includes(k))) return 'financeiro (pode exigir ação/validação)'

    const access = [
      'acesso',
      'api',
      'itau',
      'itaú',
      'token',
      'credencial',
      'oauth',
      'auth',
      'integra',
    ]
    if (access.some((k) => blob.includes(k)))
      return 'integração/acesso (pode destravar rotina/processo)'

    const delivery = [
      'enviado',
      'entregue',
      'rastream',
      'tracking',
      'shipment',
      'delivery',
      'pedido',
    ]
    if (delivery.some((k) => blob.includes(k)) || from.includes('amazon'))
      return 'entrega/pedido em andamento (acompanhar recebimento)'

    const approvals = [
      'aprova',
      'aprovação',
      'aprovacao',
      'contrato',
      'proposta',
      'orçament',
      'orcament',
      'assinar',
      'assinatura',
    ]
    if (approvals.some((k) => blob.includes(k))) return 'decisão/aprovação pendente (evitar atraso)'

    return null
  }

  private wsLabel(ws: 'pessoal' | 'freelaw'): string {
    return ws === 'pessoal' ? 'PESSOAL' : 'FREELAW'
  }

  private wsEmoji(ws: 'pessoal' | 'freelaw'): string {
    return ws === 'pessoal' ? '👤' : '💼'
  }

  async generateDailyDigest(chatId: number): Promise<string> {
    const today = new Date()
    const tz = await this.getChatTimezone(chatId)
    const workspaceId = await this.getChatWorkspaceId(chatId)
    const nowZ = toZonedTime(new Date(), tz)
    const isEveningPreview = nowZ.getHours() >= 18
    const targetZ = isEveningPreview ? addDays(nowZ, 1) : nowZ
    const dateStr = format(targetZ, "EEEE, dd 'de' MMMM", { locale: ptBR })
    const dayLabel = isEveningPreview ? 'amanhã' : 'hoje'
    const sections: string[] = [`*📌 Resumo — ${this.escapeMd(dateStr)} (${dayLabel})*`]
    let emailIndex = 0
    const emailRefs: Array<{ workspaceId: 'pessoal' | 'freelaw'; account: string; id: string }> = []

    // ========== TEMPO (Tomorrow.io) ==========
    try {
      const weather = getWeatherService()
      const prefs = getWeatherPrefsService()
      const pref = await prefs.getDefaultLocation(chatId)
      const prefLoc = (pref?.location || '').trim()
      // Backward-compatible fix: older default was Boston; treat it as unset.
      const location =
        prefLoc && prefLoc !== '42.3478,-71.0466' ? prefLoc : weather.defaultLocation()
      sections.push('')
      sections.push(`*🌤️ Previsão do tempo (${dayLabel})*`)
      if (!weather.enabled()) {
        sections.push('_TOMORROW_API_KEY não configurado._')
      } else {
        const fc = await weather.getForecast({ location })
        const label = this.escapeMd(
          pref?.label || this.locationDisplayName(location, fc.resolvedName) || fc.requestedLocation
        )
        const d0 =
          fc.daily.find((d) => {
            const z = toZonedTime(d.time, tz)
            return (
              z.getFullYear() === targetZ.getFullYear() &&
              z.getMonth() === targetZ.getMonth() &&
              z.getDate() === targetZ.getDate()
            )
          }) || fc.daily[0]
        if (!d0) {
          sections.push(`_${label}: sem dados agora._`)
        } else {
          const desc = weatherCodeToPt(d0.weatherCode)
          const min = d0.temperatureMinC !== undefined ? `${Math.round(d0.temperatureMinC)}°C` : '—'
          const max = d0.temperatureMaxC !== undefined ? `${Math.round(d0.temperatureMaxC)}°C` : '—'
          const rain =
            d0.precipitationProbabilityAvg !== undefined
              ? `${Math.round(d0.precipitationProbabilityAvg)}%`
              : '—'
          const uv = d0.uvIndexMax !== undefined ? `${Math.round(d0.uvIndexMax)}` : '—'
          const sunrise = d0.sunriseTime ? format(toZonedTime(d0.sunriseTime, tz), 'HH:mm') : null
          const sunset = d0.sunsetTime ? format(toZonedTime(d0.sunsetTime, tz), 'HH:mm') : null
          sections.push(`- ${label}: ${this.escapeMd(desc)}`)
          sections.push(`  - mín: ${min} | máx: ${max}`)
          sections.push(`  - chuva: ${rain} | UV máx: ${uv}`)
          if (sunrise && sunset) sections.push(`  - nascer/pôr do sol: ${sunrise}/${sunset}`)
        }
      }
    } catch (e) {
      logger.error(`Digest Weather error: ${e instanceof Error ? e.message : String(e)}`)
      sections.push('')
      sections.push(`*🌤️ Previsão do tempo (${dayLabel})*`)
      sections.push('_Não foi possível carregar agora._')
    }

    // ========== NOTÍCIAS (RSS + HN) ==========
    try {
      const news = getNewsService()
      // Only include news in the morning digest (7h local time).
      const includeNews = news.enabled() && nowZ.getHours() === 7
      if (includeNews) {
        const maxPerSection = 4
        const [general, finance, sports, hn] = await Promise.all([
          news.getRssItems({ topic: 'general', max: maxPerSection }),
          news.getRssItems({ topic: 'finance', max: maxPerSection }),
          news.getRssItems({ topic: 'sports', max: Math.max(4, maxPerSection) }),
          news.getHackerNewsFrontPage({ max: 5 }),
        ])

        // Save snapshots to notes (best-effort, never break digest).
        try {
          const all = [...general, ...finance, ...sports, ...hn]
          if (all.length) await news.captureToNotes({ workspaceId, items: all })
        } catch {
          // ignore persistence failure
        }

        sections.push('')
        sections.push('*🗞️ Headlines (hoje)*')

        if (finance.length) {
          sections.push('*💰 Finanças*')
          sections.push(...this.formatNewsLines(finance, maxPerSection))
        } else {
          sections.push('*💰 Finanças*')
          sections.push('_Sem itens agora._')
        }

        sections.push('')
        if (general.length) {
          sections.push('*🌍 Geral*')
          sections.push(...this.formatNewsLines(general, maxPerSection))
        } else {
          sections.push('*🌍 Geral*')
          sections.push('_Sem itens agora._')
        }

        sections.push('')
        if (sports.length) {
          sections.push('*🏟️ Esportes (Galo + Steelers)*')
          sections.push(...this.formatNewsLines(sports, 6))
        } else {
          sections.push('*🏟️ Esportes (Galo + Steelers)*')
          sections.push('_Sem itens agora._')
        }

        if (hn.length) {
          sections.push('')
          sections.push('*🧠 Hacker News (top)*')
          sections.push(...this.formatNewsLines(hn, 5))
        }
      }
    } catch (e) {
      logger.error(`Digest News error: ${e instanceof Error ? e.message : String(e)}`)
      // silent fail: digest should still be delivered
    }

    // ========== GOOGLE: AGENDA + EMAIL (pessoal + freelaw) ==========
    for (const ws of ['pessoal', 'freelaw'] as const) {
      const accounts = await this.listGoogleAccountsByWorkspace(ws)
      sections.push('')
      sections.push(`*${this.wsEmoji(ws)} ${this.wsLabel(ws)}*`)

      // Agenda de hoje (pool)
      try {
        if (accounts.length === 0) {
          sections.push(`*🗓️ Agenda ${ws === 'pessoal' ? 'Pessoal' : 'Freelaw'} (${dayLabel})*`)
          sections.push('_Google não conectado neste contexto._')
        } else {
          const timeMin = fromZonedTime(startOfDay(targetZ), tz).toISOString()
          const timeMax = fromZonedTime(endOfDay(targetZ), tz).toISOString()
          const perAccount = await Promise.all(
            accounts.map(async (acc) => {
              const calendar = getCalendarService(ws, acc)
              const events = await calendar.getEvents({ timeMin, timeMax, maxResults: 80 })
              const items = events.map((e) => {
                const parsed = calendar.parseEvent(e)
                const time = parsed.isAllDay
                  ? 'Dia inteiro'
                  : format(toZonedTime(parsed.start, tz), 'HH:mm')
                const suffix = parsed.meetLink ? ' (meet)' : ''
                const self = e.attendees?.find((a) => a.self)
                const notConfirmed =
                  !!self &&
                  (self.responseStatus === 'needsAction' || self.responseStatus === 'tentative')
                const confirmSuffix = notConfirmed ? ' (não confirmado)' : ''
                const title =
                  this.escapeMd(this.ellipsize(parsed.title || '(sem título)', 90)) +
                  this.escapeMd(confirmSuffix)
                return { when: parsed.start.getTime(), line: `- ${time} — ${title}${suffix}` }
              })
              return { acc, items: items.sort((a, b) => a.when - b.when) }
            })
          )

          const merged = perAccount.flatMap((x) => x.items).sort((a, b) => a.when - b.when)
          sections.push(`*🗓️ Agenda ${ws === 'pessoal' ? 'Pessoal' : 'Freelaw'} (${dayLabel})*`)
          if (merged.length === 0) {
            sections.push('_sem eventos_')
          } else {
            merged.slice(0, 12).forEach((x) => sections.push(x.line))
            if (merged.length > 12) sections.push(`_+${merged.length - 12} evento(s)_`)
          }
        }
      } catch (e) {
        logger.error(`Digest Calendar error (${ws}): ${e instanceof Error ? e.message : String(e)}`)
        sections.push(`*🗓️ Agenda ${ws === 'pessoal' ? 'Pessoal' : 'Freelaw'} (${dayLabel})*`)
        sections.push('_Não foi possível carregar agora._')
      }

      // Emails não lidos (pool)
      try {
        if (accounts.length === 0) {
          sections.push('')
          sections.push('*📧 Emails (não lidos)*')
          sections.push('_Google não conectado neste contexto._')
        } else {
          const perAccount = await Promise.all(
            accounts.map(async (acc) => {
              const gmail = getGmailService(ws, acc)
              const unreadCountLabel = await this.getInboxUnreadCount(ws, acc)
              // Fallback: if label count says 0, double-check via search for unread.
              // This avoids false "Inbox zero" when Gmail label metadata is stale or not present.
              let unreadCount = unreadCountLabel
              if (unreadCountLabel === 0) {
                try {
                  const sample = await gmail.getUnreadMessages(1)
                  if (sample.length > 0) unreadCount = 1 // at least one
                } catch {
                  // ignore
                }
              }

              // Highlights: important unread first, then fallback to unread.
              const refs = [
                ...(await gmail.getImportantUnread(6)),
                ...(await gmail.getUnreadMessages(12)),
              ]

              const seen = new Set<string>()
              const highlights: { from: string; subject: string; why: string; id: string }[] = []
              for (const ref of refs) {
                if (seen.has(ref.id)) continue
                seen.add(ref.id)
                const msg = await gmail.getMessage(ref.id, 'metadata')
                const parsed = gmail.parseMessage(msg)
                const fromRaw = parsed.from.match(/^([^<]+)/)?.[1]?.trim() || parsed.from
                const why = this.emailHighlightReason({
                  from: fromRaw,
                  subject: parsed.subject || '',
                })
                if (!why) continue
                highlights.push({
                  from: this.escapeMd(this.ellipsize(fromRaw, 28)),
                  subject: this.escapeMd(this.ellipsize(parsed.subject || '(sem assunto)', 90)),
                  why: this.escapeMd(this.ellipsize(why, 80)),
                  id: ref.id,
                })
                if (highlights.length >= 3) break
              }

              return { acc, unreadCount, highlights }
            })
          )

          const totalUnread = perAccount.reduce(
            (sum, x) => sum + (Number.isFinite(Number(x.unreadCount)) ? Number(x.unreadCount) : 0),
            0
          )

          sections.push('')
          sections.push('*📧 Emails (não lidos)*')
          if (totalUnread === 0) {
            sections.push('_Sem não lidos detectados agora._')
          } else {
            for (const row of perAccount) {
              const accShort = this.escapeMd(this.accountDisplayName(row.acc))
              sections.push(`- ${accShort}: *${row.unreadCount}*`)
              if (row.highlights.length) {
                sections.push(`  _E-mails para olhar:_`)
                for (const h of row.highlights) {
                  emailIndex += 1
                  emailRefs.push({ workspaceId: ws, account: row.acc, id: h.id })
                  sections.push(`  ${emailIndex}. ${h.from}: ${h.subject}`)
                  sections.push(`     ${h.why}`)
                }
              }
            }
            sections.push(`Total: *${totalUnread}*`)
          }
        }
      } catch (e) {
        logger.error(`Digest Gmail error (${ws}): ${e instanceof Error ? e.message : String(e)}`)
        sections.push('')
        sections.push('*📧 Emails (não lidos)*')
        sections.push('_Não foi possível carregar agora._')
      }
    }

    // ========== TODOIST (global) ==========
    try {
      const todoist = getTodoistService()
      const filter = isEveningPreview ? 'tomorrow | overdue' : 'today | overdue'
      const tasksAll = await todoist.getTasks(filter)

      // Strict filter: only tasks explicitly assigned to you.
      // We resolve your Todoist user id via Sync API (owner of TODOIST_API_TOKEN).
      const me = await todoist.getMe()
      const meId = String(me.id)
      const tasks = tasksAll.filter((t) => (t.assignee_id || '').trim() === meId)

      if (tasks.length === 0) {
        sections.push('')
        sections.push(
          `*✅ Tarefas (${isEveningPreview ? 'amanhã + atrasadas' : 'hoje + atrasadas'})*`
        )
        sections.push('_Nenhuma pendente._')
      } else {
        sections.push('')
        sections.push(
          `*✅ Tarefas (${isEveningPreview ? 'amanhã + atrasadas' : 'hoje + atrasadas'})*`
        )
        const sorted = tasks.slice().sort((a, b) => b.priority - a.priority)
        const byPriority = new Map<number, typeof sorted>()
        for (const t of sorted) {
          const p = t.priority || 1
          if (!byPriority.has(p)) byPriority.set(p, [])
          byPriority.get(p)!.push(t)
        }
        const prios = [4, 3, 2, 1].filter((p) => (byPriority.get(p) || []).length > 0)
        let shown = 0
        for (const p of prios) {
          const label =
            p === 4
              ? 'Prioridade 1'
              : p === 3
                ? 'Prioridade 2'
                : p === 2
                  ? 'Prioridade 3'
                  : 'Prioridade (sem urgência)'
          sections.push(`- *${label}*`)
          for (const t of (byPriority.get(p) || []).slice(0, 8)) {
            const content = this.escapeMd(this.ellipsize(t.content || '(sem conteúdo)', 120))
            sections.push(`  - ${content}`)
            shown += 1
            if (shown >= 20) break
          }
          if (shown >= 20) break
        }
        if (tasks.length > shown) sections.push(`_+${tasks.length - shown} tarefa(s)_`)
        sections.push(`Total: *${tasks.length}*`)
      }
    } catch (e) {
      logger.error(`Digest Todoist error: ${e instanceof Error ? e.message : String(e)}`)
      sections.push('')
      sections.push('*✅ Tarefas*')
      sections.push('_Não foi possível carregar agora._')
    }

    sections.push('')
    sections.push(
      '_Quer aprofundar algum item? Basta responder destacando o assunto (ex.: colar o título do email/evento/tarefa). Eu busco a fonte, leio/analiso e te digo em detalhes o que está acontecendo e próximos passos (ações sempre com confirmação)._'
    )
    // Persist mapping for "mark as read by number" (used by Telegram handler)
    this.lastEmailRefsByChat.set(chatId, { at: Date.now(), refs: emailRefs })
    if (emailRefs.length > 0) {
      sections.push('')
      sections.push(
        '_Para marcar emails como lidos, responda **apenas com os números** (ex: "1,3,4"). Eu marco automaticamente._'
      )
    }
    return sections.join('\n')
  }

  getLastDigestEmailRefs(
    chatId: number
  ): {
    at: number
    refs: Array<{ workspaceId: 'pessoal' | 'freelaw'; account: string; id: string }>
  } | null {
    return this.lastEmailRefsByChat.get(chatId) || null
  }

  async generateWeeklyDigest(_chatId: number): Promise<string> {
    const today = new Date()
    const dateStr = format(today, 'dd/MM/yyyy', { locale: ptBR })
    const sections: string[] = [`*📅 Resumo semanal — a partir de ${this.escapeMd(dateStr)}*`]
    const tz = await this.getChatTimezone(_chatId)

    for (const ws of ['pessoal', 'freelaw'] as const) {
      const accounts = await this.listGoogleAccountsByWorkspace(ws)
      sections.push('')
      sections.push(`*${this.wsEmoji(ws)} ${this.wsLabel(ws)}*`)

      // Agenda da semana (pool)
      try {
        if (accounts.length === 0) {
          sections.push('*🗓️ Agenda (próximos 7 dias)*')
          sections.push('_Google não conectado neste contexto._')
        } else {
          const nowZ = toZonedTime(new Date(), tz)
          const timeMin = fromZonedTime(startOfDay(nowZ), tz).toISOString()
          const timeMax = fromZonedTime(endOfDay(addDays(nowZ, 7)), tz).toISOString()
          const perAccount = await Promise.all(
            accounts.map(async (acc) => {
              const calendar = getCalendarService(ws, acc)
              const events = await calendar.getEvents({ timeMin, timeMax, maxResults: 160 })
              const items = events.map((e) => {
                const p = calendar.parseEvent(e)
                const when = p.isAllDay
                  ? toZonedTime(p.start, tz).toLocaleDateString('pt-BR', { timeZone: tz })
                  : toZonedTime(p.start, tz).toLocaleString('pt-BR', {
                      timeZone: tz,
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                const title = this.escapeMd(this.ellipsize(p.title || '(sem título)', 90))
                return { whenTs: p.start.getTime(), line: `- ${this.escapeMd(when)} — ${title}` }
              })
              return { acc, items: items.sort((a, b) => a.whenTs - b.whenTs) }
            })
          )
          sections.push('*🗓️ Agenda (próximos 7 dias)*')
          for (const { acc, items } of perAccount) {
            const accShort = this.escapeMd(this.accountDisplayName(acc))
            if (items.length === 0) {
              sections.push(`- ${accShort}: _sem eventos_`)
              continue
            }
            sections.push(`- ${accShort}:`)
            items.slice(0, 14).forEach((x) => sections.push(`  ${x.line}`))
            if (items.length > 14) sections.push(`  _+${items.length - 14} evento(s)_`)
          }
        }
      } catch (e) {
        logger.error(
          `Weekly Digest Calendar error (${ws}): ${e instanceof Error ? e.message : String(e)}`
        )
        sections.push('*🗓️ Agenda (próximos 7 dias)*')
        sections.push('_Não foi possível carregar agora._')
      }

      // Emails (não lidos + importantes)
      try {
        if (accounts.length === 0) {
          sections.push('')
          sections.push('*📧 Emails (pendências)*')
          sections.push('_Google não conectado neste contexto._')
        } else {
          const perAccount = await Promise.all(
            accounts.map(async (acc) => {
              const gmail = getGmailService(ws, acc)
              const unreadCount = await this.getInboxUnreadCount(ws, acc)
              const refs = [
                ...(await gmail.getImportantUnread(10)),
                ...(await gmail.getUnreadMessages(20)),
              ]
              const seen = new Set<string>()
              const highlights: { from: string; subject: string; why: string }[] = []
              for (const ref of refs) {
                if (seen.has(ref.id)) continue
                seen.add(ref.id)
                const msg = await gmail.getMessage(ref.id, 'metadata')
                const parsed = gmail.parseMessage(msg)
                const fromRaw = parsed.from.match(/^([^<]+)/)?.[1]?.trim() || parsed.from
                const why = this.emailHighlightReason({
                  from: fromRaw,
                  subject: parsed.subject || '',
                })
                if (!why) continue
                highlights.push({
                  from: this.escapeMd(this.ellipsize(fromRaw, 28)),
                  subject: this.escapeMd(this.ellipsize(parsed.subject || '(sem assunto)', 90)),
                  why: this.escapeMd(this.ellipsize(why, 80)),
                })
                if (highlights.length >= 4) break
              }
              return { acc, unreadCount, highlights }
            })
          )

          const totalUnread = perAccount.reduce(
            (sum, x) => sum + (Number.isFinite(Number(x.unreadCount)) ? Number(x.unreadCount) : 0),
            0
          )

          sections.push('')
          sections.push('*📧 Emails (pendências)*')
          if (totalUnread === 0) {
            sections.push('_Inbox zero._')
          } else {
            for (const row of perAccount) {
              const accShort = this.escapeMd(this.accountDisplayName(row.acc))
              sections.push(`- ${accShort}: *${row.unreadCount}*`)
              if (row.highlights.length) {
                sections.push(`  _Destaques:_`)
                for (const h of row.highlights) {
                  sections.push(`  - ${h.from}: ${h.subject}`)
                  sections.push(`    Por quê: ${h.why}`)
                }
              }
            }
            sections.push(`Total: *${totalUnread}*`)
          }
        }
      } catch (e) {
        logger.error(
          `Weekly Digest Gmail error (${ws}): ${e instanceof Error ? e.message : String(e)}`
        )
        sections.push('')
        sections.push('*📧 Emails (pendências)*')
        sections.push('_Não foi possível carregar agora._')
      }
    }

    // Todoist semanal (global)
    try {
      const todoist = getTodoistService()
      const tasks = await todoist.getTasks('overdue | today | next 7 days')
      if (tasks.length === 0) {
        sections.push('')
        sections.push('*✅ Tarefas (próximos 7 dias + atrasadas)*')
        sections.push('_Nenhuma pendente._')
      } else {
        sections.push('')
        sections.push('*✅ Tarefas (próximos 7 dias + atrasadas)*')
        const sorted = tasks.slice().sort((a, b) => b.priority - a.priority)
        for (const task of sorted.slice(0, 12)) {
          const p = task.priority > 1 ? ` [P${5 - task.priority}]` : ''
          const d = task.due?.string ? ` — ${task.due.string}` : ''
          const content = this.escapeMd(this.ellipsize(task.content || '(sem conteúdo)', 110))
          sections.push(`- ${content}${p}${this.escapeMd(d)}`)
        }
        if (tasks.length > 12) sections.push(`_+${tasks.length - 12} tarefa(s)_`)
        sections.push(`Total: *${tasks.length}*`)
      }
    } catch (e) {
      logger.error(`Weekly Digest Todoist error: ${e instanceof Error ? e.message : String(e)}`)
      sections.push('')
      sections.push('*✅ Tarefas*')
      sections.push('_Não foi possível carregar agora._')
    }

    // Custos (últimos 7 dias) — OpenAI estimado por tokens + Fly por estimativa configurável
    try {
      const usageDb = getUsageDbService()
      const openAi = usageDb.enabled()
        ? await usageDb.sumLastDays({ provider: 'openai', days: 7 })
        : { usd: null, inputTokens: 0, outputTokens: 0, count: 0 }

      const flyPerDay = Number(process.env.CORTEX_FLY_USD_PER_DAY || '')
      const flyUsd = Number.isFinite(flyPerDay) && flyPerDay > 0 ? flyPerDay * 7 : null

      sections.push('')
      sections.push('*💸 Custos (últimos 7 dias)*')
      sections.push(
        openAi.count > 0
          ? `- OpenAI: ${openAi.usd !== null ? `$${openAi.usd.toFixed(2)}` : '(USD não configurado)'} — tokens in/out: ${openAi.inputTokens}/${openAi.outputTokens}`
          : '- OpenAI: (sem dados ainda)'
      )
      sections.push(
        flyUsd !== null
          ? `- Fly.io: ~$${flyUsd.toFixed(2)} (estimativa via CORTEX_FLY_USD_PER_DAY)`
          : '- Fly.io: (estimativa não configurada)'
      )
      const total = (openAi.usd || 0) + (flyUsd || 0)
      if (openAi.usd !== null || flyUsd !== null) {
        sections.push(`- Total: ~$${total.toFixed(2)}`)
      }
    } catch (e) {
      logger.error(`Weekly Digest costs error: ${e instanceof Error ? e.message : String(e)}`)
    }

    sections.push('')
    sections.push(
      '_Quer aprofundar algum item? Basta responder destacando o assunto (ex.: colar o título do email/evento/tarefa). Eu busco a fonte, leio/analiso e te digo em detalhes o que está acontecendo e próximos passos (ações sempre com confirmação)._'
    )
    return sections.join('\n')
  }

  /**
   * Envia resumo manualmente (para teste)
   */
  async sendNow(chatId: number): Promise<string> {
    const digest = await this.generateDailyDigest(chatId)
    if (this.sendMessage) {
      await this.sendMessage(chatId, digest)
    }
    return digest
  }

  async sendWeeklyNow(chatId: number): Promise<string> {
    const digest = await this.generateWeeklyDigest(chatId)
    if (this.sendMessage) {
      await this.sendMessage(chatId, digest)
    }
    return digest
  }

  /**
   * Retorna status do serviço
   */
  getStatus(): { chats: number; nextRun?: string } {
    return {
      chats: this.configs.filter((c) => c.enabled).length,
    }
  }
}

// Singleton
let digestInstance: DailyDigestService | null = null

export function getDailyDigestService(): DailyDigestService {
  if (!digestInstance) {
    digestInstance = new DailyDigestService()
  }
  return digestInstance
}

export { DailyDigestService }
