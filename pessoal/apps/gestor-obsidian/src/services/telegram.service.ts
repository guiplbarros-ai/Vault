import { randomUUID } from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import TelegramBot from 'node-telegram-bot-api'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { createOAuthState } from '../utils/oauth-state.js'
import { type ProcessLock, acquireProcessLockSync } from '../utils/process-lock.js'
import { type AgentService, getAgentService } from './agent.service.js'
import { getAreaRouterService } from './area-router.service.js'
import { type BrainService, getBrainService } from './brain.service.js'
import { getCalendarService } from './calendar.service.js'
import { type WorkspaceId, getChatSettingsDbService } from './chat-settings-db.service.js'
import { classifierService } from './classifier.service.js'
import { getDailyDigestService } from './daily-digest.service.js'
import { getGmailService } from './gmail.service.js'
import { getGoogleAuthService } from './google-auth.service.js'
import { getMemoryRefreshService } from './memory-refresh.service.js'
import { getNotesDbService } from './notes-db.service.js'
import { getNotionService } from './notion.service.js'
import { getProfileDbService } from './profile-db.service.js'
import { getRulesDbService } from './rules-db.service.js'
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js'
import { getTaxonsDbService } from './taxons-db.service.js'
import { getTodoistService } from './todoist.service.js'

loadEnv()

// Notion MCP functions - will be set by external caller if available
let notionSearchFn: ((query: string) => Promise<string>) | null = null
let notionFetchFn: ((id: string) => Promise<string>) | null = null

export function setNotionFunctions(
  search: (query: string) => Promise<string>,
  fetch: (id: string) => Promise<string>
): void {
  notionSearchFn = search
  notionFetchFn = fetch
  logger.info('Notion functions registered')
}

type TelegramMode = 'polling' | 'webhook'

class TelegramService {
  private bot: TelegramBot
  private authorizedUsers: number[]
  private brain: BrainService | null = null
  private agent: AgentService | null = null
  private pollingRestartAttempts = 0
  private pollingRestartTimer: NodeJS.Timeout | null = null
  private lock: ProcessLock | null = null
  private shutdownHooked = false
  private mode: TelegramMode
  private configModeChats = new Set<number>()
  private pendingRuleDraftByChat = new Map<number, { ruleId: string; version: number }>()
  private workspaceByChat = new Map<number, WorkspaceId>()
  private lastCreatedNoteByChat = new Map<number, string>()
  private ensuredMediaBucket = new Set<string>()

  constructor(mode: TelegramMode = 'polling') {
    this.mode = mode
    const token = process.env.TELEGRAM_BOT_TOKEN

    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN não configurado')
    }

    if (mode === 'polling') {
      // Prevent two processes from polling at the same time (common root cause of 409 Conflict).
      // Override with TELEGRAM_LOCK_PATH if needed.
      const lockPath =
        process.env.TELEGRAM_LOCK_PATH || path.join(process.cwd(), '.telegram-bot.lock')
      this.lock = acquireProcessLockSync(lockPath)
      logger.info(`Telegram lock adquirido: ${this.lock.lockPath} (pid=${process.pid})`)
    }

    const authorizedIds = process.env.TELEGRAM_AUTHORIZED_USERS
    this.authorizedUsers = authorizedIds
      ? authorizedIds
          .split(',')
          .map((id) => Number.parseInt(id.trim(), 10))
          .filter((n) => Number.isFinite(n))
      : []

    if (mode === 'polling') {
      // Use explicit polling config so we can recover from transient errors.
      this.bot = new TelegramBot(token, {
        polling: {
          autoStart: false,
          // Keep interval low; Telegram long polling does most of the work.
          interval: 300,
          params: { timeout: 30 },
        } as any,
      })
    } else {
      // Webhook mode: updates are injected via processUpdate().
      this.bot = new TelegramBot(token, { polling: false })
    }
    this.setupBrain()
    this.setupDailyDigest()
    this.setupMemoryRefresh()
    this.setupHandlers()

    if (mode === 'polling') {
      // Start polling asynchronously (allows deleteWebhook + clear startup errors).
      void this.initPolling()
    }

    this.hookShutdown()
    logger.info('Telegram bot iniciado')
  }

  /**
   * Webhook mode: process incoming update.
   */
  processUpdate(update: unknown): void {
    if (this.mode !== 'webhook') {
      throw new Error('processUpdate só é suportado em modo webhook')
    }
    ;(this.bot as any).processUpdate(update)
  }

  private hookShutdown(): void {
    if (this.shutdownHooked) return
    this.shutdownHooked = true

    const shutdown = () => {
      try {
        this.stop()
      } catch {
        // ignore
      }
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
    process.on('exit', shutdown)
  }

  private async initPolling(): Promise<void> {
    try {
      // Ensure we aren't in webhook mode (polling + webhook is a common misconfiguration).
      await (this.bot as any).deleteWebHook?.({ drop_pending_updates: false }).catch(() => {})
    } catch {
      // ignore
    }

    try {
      await (this.bot as any).startPolling()
      logger.info('Telegram polling iniciado')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`Telegram polling: falha ao iniciar (${msg})`)
      this.schedulePollingRestart(err)
    }
  }

  private setupDailyDigest(): void {
    const digest = getDailyDigestService()

    // Configura função de envio
    digest.setSendMessage(async (chatId: number, message: string) => {
      await this.sendLongMessage(chatId, message)
    })

    // Inicia os jobs
    void digest
      .startJobs()
      .catch((e) =>
        logger.error(`Daily Digest startJobs error: ${e instanceof Error ? e.message : String(e)}`)
      )
  }

  private setupMemoryRefresh(): void {
    const refresh = getMemoryRefreshService()
    refresh.setSendMessage(async (chatId: number, message: string) => {
      await this.bot.sendMessage(chatId, message)
    })
    void refresh
      .startJobs()
      .catch((e) =>
        logger.error(
          `Memory Refresh startJobs error: ${e instanceof Error ? e.message : String(e)}`
        )
      )
  }

  private setupBrain(): void {
    try {
      const brain = getBrainService()
      this.brain = brain
      this.agent = getAgentService()

      // Try to connect Notion
      const notion = getNotionService()
      if (notion) {
        brain.notionSearch = (query: string) => notion.search(query)
        brain.notionFetch = (id: string) => notion.getPage(id)
        logger.info('Notion conectado ao Brain')
      } else {
        logger.info('Notion não configurado (NOTION_API_KEY ausente)')
      }
    } catch (error) {
      // OPENAI_API_KEY (ou outra dependência do Brain) pode não estar configurada.
      // O bot deve continuar funcionando em "modo comandos".
      const msg = error instanceof Error ? error.message : 'Erro ao iniciar Brain'
      this.brain = null
      logger.warn(`Brain indisponível: ${msg}`)
    }
  }

  private isAuthorized(userId: number): boolean {
    if (this.authorizedUsers.length === 0) return true
    return this.authorizedUsers.includes(userId)
  }

  private async ensureAuthorized(msg: TelegramBot.Message): Promise<boolean> {
    const userId = msg.from?.id
    if (!userId) return true
    if (this.isAuthorized(userId)) return true
    await this.bot.sendMessage(msg.chat.id, '⛔ Você não está autorizado. Use /id para ver seu ID.')
    return false
  }

  private setupHandlers(): void {
    // /help - show commands
    this.bot.onText(/\/help/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      await this.sendLongMessage(
        msg.chat.id,
        `
🤖 *Comandos do Cortex*

*Notas (Supabase):*
/nota <texto> - Salva no Inbox
/livro <texto> - Nota de livro
/conceito <texto> - Nota de conceito
/projeto <texto> - Nota de projeto
/prof <texto> - Nota profissional
/pessoal <texto> - Nota pessoal
/reuniao <texto> - Nota de reunião
/buscar <termo> - Buscar notas (Supabase)

*Todoist:*
/tarefas - Lista tarefas de hoje (e atrasadas)
/tarefa <texto> - Cria uma tarefa
/concluir <id> - Conclui uma tarefa

*Resumo diário:*
/resumo - Ativa resumo diário às 7h
/resumo HH:MM - Ativa em horário específico
/proativo - Ativa modo proativo (07:00 e 19:00)
/brief - Envia um briefing agora (agenda + tarefas + emails)
/semanal - Ativa resumo semanal (segundas 07:00)
/semanal agora - Envia o resumo semanal agora
/status - Mostra status do modo proativo/briefing
/semresumo - Desativa
/agora - Envia o resumo agora

*Utilitários:*
/id - Mostra seu user ID
/limpar - Reseta a conversa (modo IA)
/refresh - Roda memory refresh agora (Supabase → Supermemory)
/config - Entra/sai do modo configuração (ajustar como o bot trabalha)
/regras - Mostra regras ativas (resumo)
/aplicar - Aplica a última alteração de regras (modo config)
/cancelar - Cancela a última alteração de regras (modo config)
/todoist_regras - Aplica regras de operação do Todoist neste contexto

*Mídia (sem comando):*
Envie *áudio/voz*, *foto* ou *vídeo* no chat e eu vou registrar e salvar.
      `.trim()
      )
    })

    // /config - toggle config mode
    this.bot.onText(/\/config(?:\s+(on|off))?/, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return
      const arg = (match?.[1] || '').toLowerCase()
      const chatId = msg.chat.id

      const enable = arg === 'on' ? true : arg === 'off' ? false : !this.configModeChats.has(chatId)
      if (enable) {
        this.configModeChats.add(chatId)
        await this.sendLongMessage(
          chatId,
          [
            '🛠️ *Modo configuração ATIVADO*',
            '',
            'Agora, tudo que você escrever (sem começar com /) será tratado como *ajuste de comportamento*.',
            'Eu vou criar uma *nova versão* das regras no Supabase e pedir para você aplicar.',
            '',
            'Comandos:',
            '- /regras (ver regras ativas)',
            '- /aplicar (ativar a última alteração)',
            '- /cancelar (descartar a última alteração)',
            '- /config off (sair)',
          ].join('\n')
        )
      } else {
        this.configModeChats.delete(chatId)
        await this.bot.sendMessage(chatId, '✅ Modo configuração desativado.')
      }
    })

    // /regras - show active rules summary
    this.bot.onText(/\/regras\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      try {
        const db = getRulesDbService()
        if (!db.enabled()) {
          await this.bot.sendMessage(msg.chat.id, '❌ Supabase não configurado para regras ainda.')
          return
        }
        const chatDb = getChatSettingsDbService()
        const ws = chatDb.enabled()
          ? (await chatDb.getOrCreate(msg.chat.id)).workspace_id
          : (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) || 'pessoal'
        this.workspaceByChat.set(msg.chat.id, ws)
        const active = await db.getActive(ws)
        if (!active) {
          await this.bot.sendMessage(msg.chat.id, 'ℹ️ Nenhuma regra ativa encontrada.')
          return
        }
        const preview =
          active.body_md.length > 1800
            ? `${active.body_md.slice(0, 1800)}\n\n[…truncado]`
            : active.body_md
        await this.sendLongMessage(
          msg.chat.id,
          `📌 *Regras ativas* (v${active.version})\n\n${preview}`
        )
      } catch (e) {
        await this.bot.sendMessage(
          msg.chat.id,
          `❌ Erro ao ler regras: ${e instanceof Error ? e.message : String(e)}`
        )
      }
    })

    // /aplicar - activate last draft for this chat
    this.bot.onText(/\/aplicar\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      const chatId = msg.chat.id
      const pending = this.pendingRuleDraftByChat.get(chatId)
      if (!pending) {
        await this.bot.sendMessage(
          chatId,
          'ℹ️ Não há nenhuma alteração pendente. Use /config e mande uma regra.'
        )
        return
      }
      try {
        const db = getRulesDbService()
        const chatDb = getChatSettingsDbService()
        const ws = chatDb.enabled()
          ? (await chatDb.getOrCreate(chatId)).workspace_id
          : (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) || 'pessoal'
        this.workspaceByChat.set(chatId, ws)
        await db.activate(pending.ruleId, ws)
        this.pendingRuleDraftByChat.delete(chatId)
        await this.bot.sendMessage(chatId, `✅ Regras aplicadas (v${pending.version}).`)
      } catch (e) {
        await this.bot.sendMessage(
          chatId,
          `❌ Erro ao aplicar regras: ${e instanceof Error ? e.message : String(e)}`
        )
      }
    })

    // /cancelar - discard last draft pointer
    this.bot.onText(/\/cancelar\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      const chatId = msg.chat.id
      if (this.pendingRuleDraftByChat.has(chatId)) {
        this.pendingRuleDraftByChat.delete(chatId)
        await this.bot.sendMessage(chatId, '✅ Alteração pendente descartada (não apliquei).')
      } else {
        await this.bot.sendMessage(chatId, 'ℹ️ Não há alteração pendente.')
      }
    })

    // /todoist_regras - apply approved Todoist operating rules to this workspace
    this.bot.onText(/\/todoist_regras\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      try {
        const db = getRulesDbService()
        if (!db.enabled()) {
          await this.bot.sendMessage(msg.chat.id, '❌ Supabase não configurado para regras ainda.')
          return
        }
        const chatDb = getChatSettingsDbService()
        const ws = chatDb.enabled()
          ? (await chatDb.getOrCreate(msg.chat.id)).workspace_id
          : (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) || 'pessoal'
        this.workspaceByChat.set(msg.chat.id, ws)

        const active = await db.getActive(ws)
        const base = (active?.body_md || '# Manual do Cortex').trim()
        const marker = '## Todoist — Operação (Cortex)'
        if (base.includes(marker)) {
          await this.bot.sendMessage(
            msg.chat.id,
            `ℹ️ As regras do Todoist já estão aplicadas no contexto *${ws}*.`
          )
          return
        }

        const section = `

${marker}

### 1) Roteamento por contexto do chat (regra principal)
- **Contexto \`freelaw\`**: criar/editar tarefas por padrão no projeto **"Gestão Financeira - Freelaw"**
- **Contexto \`pessoal\`**:
  - se a tarefa indicar casa/obra/reforma/mudança/manutenção/apartamento/condomínio → projeto **"Casinha :)"**
  - caso contrário → projeto **"Guilherme Barros"**

### 2) Guardrails (leitura vs ação)
- Consultas (listar/ler tarefa/listar projetos/listar labels) podem executar direto.
- Ações mutáveis (criar/concluir/reabrir/deletar/editar/comentar) exigem confirmação.

### 3) Criação de tarefa (padrão)
- Content curto e claro (verbo + objeto).
- Se houver prazo, registrar em \`due\` (today/tomorrow/weekday/data).
- Se houver urgência explícita, usar \`priority\`.
- Se houver ambiguidade crítica, fazer no máximo 1 pergunta para decidir.

### 4) Edição de tarefa
- \`TODOIST_UPDATE_TASK\` pode alterar: content, due, priority, labels, project.
- Não mover de projeto automaticamente ao editar, a menos que o usuário peça; se sugerir mudança, pedir confirmação.

### 5) Comentários
- Para “registrar contexto/briefing”, usar comentário com bullets objetivos.
        `.trimEnd()

        const body = `${base}${section}`
        const draft = await db.createDraftFromBody({ bodyMd: body, workspaceId: ws })
        await db.activate(draft.id, ws)
        await this.bot.sendMessage(
          msg.chat.id,
          `✅ Regras do Todoist aplicadas no contexto *${ws}* (v${draft.version}).`,
          { parse_mode: 'Markdown' }
        )
      } catch (e) {
        await this.bot.sendMessage(
          msg.chat.id,
          `❌ Erro ao aplicar regras do Todoist: ${e instanceof Error ? e.message : String(e)}`
        )
      }
    })

    // /start - apenas boas vindas
    this.bot.onText(/\/start/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return

      await this.bot.sendMessage(
        msg.chat.id,
        `
🧠 *Cortex - Seu Segundo Cérebro*

Oi ${msg.from?.first_name}! Sou o Cortex.

Pode conversar comigo naturalmente. Eu consigo:

📝 Criar e buscar notas no Obsidian
✅ Gerenciar tarefas no Todoist  
📘 Buscar informações no Notion
📅 Ver sua agenda no Google Calendar
📧 Verificar emails no Gmail
🔄 Integrar tudo (ex: ler Notion → criar nota)

*Comandos úteis:*
/resumo - Ativa resumo diário às 7h
/resumo 8:30 - Resumo em horário específico
/agora - Recebe o resumo agora
/limpar - Reseta a conversa

*Exemplos de conversa:*
• "o que tenho na agenda hoje?"
• "algum email importante não lido?"
• "qual meu próximo compromisso?"
• "cria uma tarefa pra revisar relatório"

Manda ver! 🚀
      `,
        { parse_mode: 'Markdown' }
      )
    })

    // /limpar - reset conversation
    this.bot.onText(/\/limpar/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      if (!this.brain) {
        await this.bot.sendMessage(
          msg.chat.id,
          '🧹 Ok! (Modo IA está desativado; nada para limpar).'
        )
        return
      }
      this.brain.clearConversation(msg.chat.id)
      await this.bot.sendMessage(msg.chat.id, '🧹 Conversa resetada! Começamos do zero.')
    })

    // /id - show user ID
    this.bot.onText(/\/id/, async (msg) => {
      await this.bot.sendMessage(msg.chat.id, `Seu ID: ${msg.from?.id}`)
    })

    // /debug - mostra diagnóstico de env/supabase (sem vazar segredos)
    this.bot.onText(/\/debug\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      const envInfo = loadEnv()
      const url = (process.env.SUPABASE_URL || '').trim()
      const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
      const maskedUrl = url ? url.replace(/^(.{0,12}).+(.{0,8})$/, '$1…$2') : '(vazio)'
      const keyHint = key ? `set (len=${key.length})` : '(vazio)'
      const bucket = (process.env.SUPABASE_MEDIA_BUCKET || 'cortex-media').trim() || 'cortex-media'

      await this.sendLongMessage(
        msg.chat.id,
        [
          '🧪 *Debug*',
          '',
          `- env_file: ${envInfo.path} (${envInfo.exists ? 'existe' : 'não existe'})`,
          `- supabase_configured: ${isSupabaseConfigured() ? 'true' : 'false'}`,
          `- SUPABASE_URL: ${maskedUrl}`,
          `- SUPABASE_SERVICE_ROLE_KEY: ${keyHint}`,
          `- SUPABASE_MEDIA_BUCKET: ${bucket}`,
          '',
          'Se `supabase_configured=false`, defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY e reinicie o bot.',
        ].join('\n')
      )
    })

    // Fallback: comandos desconhecidos não ficam "em silêncio"
    // (Importante: deve ficar após todos os handlers específicos.)
    this.bot.onText(/^\/([a-zA-Z0-9_]+)\b/, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return
      const cmd = (match?.[1] || '').toLowerCase()
      if (!cmd) return

      // Lista de comandos suportados (sem barra)
      const known = new Set<string>([
        'help',
        'config',
        'regras',
        'aplicar',
        'cancelar',
        'todoist_regras',
        'start',
        'limpar',
        'id',
        'refresh',
        'debug',
        'areas',
        'area',
        'contexto',
        'eu',
        'nota',
        'livro',
        'conceito',
        'projeto',
        'prof',
        'pessoal',
        'reuniao',
        'buscar',
        'tarefas',
        'tarefa',
        'concluir',
        'agenda',
        'resumo',
        'proativo',
        'brief',
        'status',
        'semresumo',
        'agora',
        'semanal',
      ])
      if (known.has(cmd)) return

      await this.bot.sendMessage(
        msg.chat.id,
        `❓ Comando não reconhecido: /${cmd}\n\nUse /help para ver os comandos disponíveis.`
      )
    })

    // /areas - lista áreas (taxons namespace=area) do workspace atual
    this.bot.onText(/\/areas\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      try {
        const chatDb = getChatSettingsDbService()
        const ws = chatDb.enabled()
          ? (await chatDb.getOrCreate(msg.chat.id)).workspace_id
          : (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) || 'pessoal'
        this.workspaceByChat.set(msg.chat.id, ws)

        const taxons = getTaxonsDbService()
        if (!taxons.enabled()) {
          await this.bot.sendMessage(
            msg.chat.id,
            '❌ Supabase não configurado para taxonomia ainda.'
          )
          return
        }

        const items = await taxons.listByNamespace(ws, 'area')
        if (items.length === 0) {
          await this.bot.sendMessage(msg.chat.id, 'ℹ️ Nenhuma área cadastrada para este contexto.')
          return
        }
        const lines = items.map((t) => `• ${t.slug} — ${t.title}`).join('\n')
        await this.sendLongMessage(msg.chat.id, `🏷️ *Áreas* (${ws})\n\n${lines}`)
      } catch (e) {
        await this.bot.sendMessage(
          msg.chat.id,
          `❌ Erro ao listar áreas: ${e instanceof Error ? e.message : String(e)}`
        )
      }
    })

    // /area <slug> [notes/<id>] - ajusta tag de área da última nota do chat (ou nota específica)
    this.bot.onText(
      /\/area(?:\s+([a-z0-9\-]+))?(?:\s+(notes\/[0-9a-fA-F\-]{36}|[0-9a-fA-F\-]{36}))?/,
      async (msg, match) => {
        if (!(await this.ensureAuthorized(msg))) return
        const slug = (match?.[1] || '').trim().toLowerCase()
        const rawId = (match?.[2] || '').trim()
        if (!slug) {
          await this.bot.sendMessage(
            msg.chat.id,
            '❌ Use: /area <slug> (ex: /area casa) ou /areas para listar.'
          )
          return
        }

        try {
          const chatDb = getChatSettingsDbService()
          const ws = chatDb.enabled()
            ? (await chatDb.getOrCreate(msg.chat.id)).workspace_id
            : (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) || 'pessoal'
          this.workspaceByChat.set(msg.chat.id, ws)

          const noteId = rawId
            ? rawId.startsWith('notes/')
              ? rawId.slice('notes/'.length)
              : rawId
            : this.lastCreatedNoteByChat.get(msg.chat.id) || ''
          if (!noteId) {
            await this.bot.sendMessage(
              msg.chat.id,
              'ℹ️ Não achei a última nota deste chat. Use: /area <slug> notes/<id>.'
            )
            return
          }

          const notesDb = getNotesDbService()
          if (!notesDb.enabled()) {
            await this.bot.sendMessage(msg.chat.id, '❌ Supabase não configurado para notas ainda.')
            return
          }

          const note = await notesDb.getById(noteId, ws)
          if (!note) {
            await this.bot.sendMessage(
              msg.chat.id,
              `❌ Nota não encontrada no contexto atual: notes/${noteId}`
            )
            return
          }

          const nextTags = (note.tags || []).filter((t) => !t.startsWith('area/'))
          nextTags.push(`area/${slug}`)
          const updated = await notesDb.updateTags(noteId, nextTags, ws)
          await this.bot.sendMessage(
            msg.chat.id,
            `✅ Área definida: area/${slug} em notes/${updated.id}`
          )
        } catch (e) {
          await this.bot.sendMessage(
            msg.chat.id,
            `❌ Erro ao ajustar área: ${e instanceof Error ? e.message : String(e)}`
          )
        }
      }
    )

    // /contexto - define contexto (workspace) para este chat
    // uso: /contexto pessoal | /contexto freelaw | /contexto (mostra atual)
    this.bot.onText(/\/contexto(?:\s+(pessoal|freelaw))?/i, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return
      const chatId = msg.chat.id
      const arg = (match?.[1] || '').toLowerCase() as WorkspaceId | ''

      try {
        const chatDb = getChatSettingsDbService()
        if (!chatDb.enabled()) {
          // Fallback in-memory (não persistente) — útil quando o Supabase está fora/sem secrets.
          const current =
            this.workspaceByChat.get(chatId) ||
            (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) ||
            'pessoal'
          if (!arg) {
            await this.bot.sendMessage(
              chatId,
              `🧭 Contexto atual (temporário): *${current}*\n\n⚠️ Supabase não configurado/indisponível — contexto não ficará persistente.`,
              { parse_mode: 'Markdown' }
            )
            return
          }
          const next = arg === 'freelaw' ? 'freelaw' : 'pessoal'
          this.workspaceByChat.set(chatId, next)
          await this.bot.sendMessage(
            chatId,
            `✅ Contexto definido (temporário) para: *${next}*\n\n⚠️ Supabase não configurado/indisponível — contexto não ficará persistente.`,
            { parse_mode: 'Markdown' }
          )
          return
        }

        if (!arg) {
          const s = await chatDb.getOrCreate(chatId)
          this.workspaceByChat.set(chatId, s.workspace_id)
          await this.bot.sendMessage(chatId, `🧭 Contexto atual: *${s.workspace_id}*`, {
            parse_mode: 'Markdown',
          })
          return
        }

        const next = arg === 'freelaw' ? 'freelaw' : 'pessoal'
        const s = await chatDb.setWorkspace(chatId, next)
        this.workspaceByChat.set(chatId, s.workspace_id)
        await this.bot.sendMessage(chatId, `✅ Contexto definido para: *${s.workspace_id}*`, {
          parse_mode: 'Markdown',
        })
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e)
        logger.error(`Telegram /contexto error: ${err}`)
        // Último recurso: mantém um contexto em memória pra não travar o fluxo.
        const current =
          this.workspaceByChat.get(chatId) ||
          (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) ||
          'pessoal'
        if (arg) {
          const next = arg === 'freelaw' ? 'freelaw' : 'pessoal'
          this.workspaceByChat.set(chatId, next)
          await this.bot.sendMessage(
            chatId,
            `✅ Contexto definido (temporário) para: *${next}*\n\n⚠️ Falha ao persistir no Supabase agora.\nDetalhe: ${err}`,
            { parse_mode: 'Markdown' }
          )
          return
        }
        await this.bot.sendMessage(
          chatId,
          `🧭 Contexto atual (temporário): *${current}*\n\n⚠️ Falha ao ler/persistir no Supabase agora.\nDetalhe: ${err}`,
          { parse_mode: 'Markdown' }
        )
      }
    })

    // /eu - perfil do usuário/workspace (cloud-first)
    // Uso:
    // - /eu (mostra perfil)
    // - /eu aniversario DD/MM
    this.bot.onText(/\/eu(?:\s+(.+))?/, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return
      const args = (match?.[1] || '').trim()
      const profileDb = getProfileDbService()
      if (!profileDb.enabled()) {
        await this.bot.sendMessage(msg.chat.id, '❌ Supabase não configurado para perfil ainda.')
        return
      }

      const chatDb = getChatSettingsDbService()
      const ws = chatDb.enabled()
        ? (await chatDb.getOrCreate(msg.chat.id)).workspace_id
        : (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) || 'pessoal'
      this.workspaceByChat.set(msg.chat.id, ws)

      if (!args) {
        const p = await profileDb.getOrCreate(ws)
        const b =
          p.birthday_day && p.birthday_month
            ? `${String(p.birthday_day).padStart(2, '0')}/${String(p.birthday_month).padStart(2, '0')}`
            : '(não definido)'
        await this.bot.sendMessage(
          msg.chat.id,
          `👤 Perfil\n- nome: ${p.display_name}\n- aniversário: ${b}\n- timezone: ${p.timezone}\n- locale: ${p.locale}`
        )
        return
      }

      const m = args.match(/^anivers[aá]rio\s+(\d{1,2})[\/\-](\d{1,2})$/i)
      if (m) {
        const day = Number(m[1])
        const month = Number(m[2])
        if (!(day >= 1 && day <= 31 && month >= 1 && month <= 12)) {
          await this.bot.sendMessage(msg.chat.id, '❌ Data inválida. Use: /eu aniversario DD/MM')
          return
        }
        const p = await profileDb.setBirthday(day, month, ws)
        await this.bot.sendMessage(
          msg.chat.id,
          `✅ Aniversário salvo no perfil: ${String(p.birthday_day).padStart(2, '0')}/${String(p.birthday_month).padStart(2, '0')}`
        )
        return
      }

      await this.bot.sendMessage(
        msg.chat.id,
        '❌ Comando inválido. Use:\n- /eu\n- /eu aniversario DD/MM'
      )
    })

    // ==================== NOTES (SUPABASE) ====================

    const saveNote = async (
      msg: TelegramBot.Message,
      type: 'inbox' | 'livro' | 'conceito' | 'projeto' | 'prof' | 'pessoal' | 'reuniao',
      text: string
    ) => {
      if (!(await this.ensureAuthorized(msg))) return
      const content = text.trim()
      if (!content) {
        await this.bot.sendMessage(msg.chat.id, '❌ Envie o texto. Ex: /nota Minha ideia...')
        return
      }

      try {
        const chatDb = getChatSettingsDbService()
        const ws = chatDb.enabled()
          ? (await chatDb.getOrCreate(msg.chat.id)).workspace_id
          : (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) || 'pessoal'
        this.workspaceByChat.set(msg.chat.id, ws)

        const notesDb = getNotesDbService()
        if (!notesDb.enabled()) {
          throw new Error(
            'Supabase não configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
          )
        }
        const title = classifierService.extractTitle(content, 50) || 'Nota'
        const areaRouter = getAreaRouterService()
        const suggestion = await areaRouter.suggest(ws, content)
        const autoAreaTag = suggestion?.slug ? `area/${suggestion.slug}` : null
        const created = await notesDb.createNote({
          title,
          bodyMd: content,
          type,
          tags: [`tipo/${type}`, 'origem/telegram', ...(autoAreaTag ? [autoAreaTag] : [])],
          source: 'telegram',
          workspaceId: ws,
        })
        this.lastCreatedNoteByChat.set(msg.chat.id, created.id)
        await this.bot.sendMessage(msg.chat.id, `✅ Salvo no Supabase: notes/${created.id}`)
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro'
        logger.error(`Telegram note error: ${err}`)
        await this.bot.sendMessage(msg.chat.id, `❌ Não consegui salvar a nota: ${err}`)
      }
    }

    // /nota
    this.bot.onText(/\/nota(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'inbox', match?.[1] || '')
    })
    this.bot.onText(/\/livro(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'livro', match?.[1] || '')
    })
    this.bot.onText(/\/conceito(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'conceito', match?.[1] || '')
    })
    this.bot.onText(/\/projeto(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'projeto', match?.[1] || '')
    })
    this.bot.onText(/\/prof(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'prof', match?.[1] || '')
    })
    this.bot.onText(/\/pessoal(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'pessoal', match?.[1] || '')
    })
    this.bot.onText(/\/reuniao(?:\s+([\s\S]+))?/, async (msg, match) => {
      await saveNote(msg, 'reuniao', match?.[1] || '')
    })

    // /buscar <termo>
    this.bot.onText(/\/buscar(?:\s+(.+))?/, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return
      const query = (match?.[1] || '').trim()
      if (!query) {
        await this.bot.sendMessage(msg.chat.id, '❌ Use: /buscar <termo>')
        return
      }

      try {
        const chatDb = getChatSettingsDbService()
        const ws = chatDb.enabled()
          ? (await chatDb.getOrCreate(msg.chat.id)).workspace_id
          : (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) || 'pessoal'
        this.workspaceByChat.set(msg.chat.id, ws)

        const notesDb = getNotesDbService()
        if (!notesDb.enabled()) {
          throw new Error(
            'Supabase não configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
          )
        }
        const results = await notesDb.search(query, 10, ws)
        if (results.length === 0) {
          await this.bot.sendMessage(msg.chat.id, `🔎 Não encontrei notas para "${query}".`)
          return
        }
        const lines = results.map((n) => `• notes/${n.id} — ${n.title}`).join('\n')
        await this.sendLongMessage(
          msg.chat.id,
          `🔎 Encontrei ${results.length} resultado(s):\n\n${lines}`
        )
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro'
        logger.error(`Telegram search error: ${err}`)
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao buscar: ${err}`)
      }
    })

    // ==================== TODOIST COMMANDS ====================

    // /tarefas
    this.bot.onText(/\/tarefas\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      try {
        const todoist = getTodoistService()
        const chatDb = getChatSettingsDbService()
        const ws = chatDb.enabled()
          ? (await chatDb.getOrCreate(msg.chat.id)).workspace_id
          : (process.env.CORTEX_DEFAULT_WORKSPACE as any) || 'pessoal'

        const tasksAll = await todoist.getTasks('today | overdue')
        let tasks = tasksAll
        if (ws === 'freelaw') {
          const p = await todoist.findProjectByName('Gestão Financeira - Freelaw')
          if (p?.id) tasks = tasksAll.filter((t) => t.project_id === p.id)
        }
        if (tasks.length === 0) {
          await this.bot.sendMessage(msg.chat.id, '✅ Nenhuma tarefa para hoje! 🎉')
          return
        }
        const list = tasks
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 15)
          .map((t) => {
            const p = t.priority > 1 ? ` [P${5 - t.priority}]` : ''
            const d = t.due ? ` 📅 ${t.due.string}` : ''
            return `• ${t.content}${p}${d}\n  id: ${t.id}`
          })
          .join('\n')
        await this.sendLongMessage(msg.chat.id, `📋 *Tarefas de hoje*\n\n${list}`)
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro'
        logger.error(`Telegram todoist list error: ${err}`)
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao listar tarefas: ${err}`)
      }
    })

    // /tarefa <texto>
    this.bot.onText(/\/tarefa(?:\s+([\s\S]+))?/, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return
      const content = (match?.[1] || '').trim()
      if (!content) {
        await this.bot.sendMessage(msg.chat.id, '❌ Use: /tarefa <descrição>')
        return
      }
      try {
        const todoist = getTodoistService()
        // Route by chat workspace: freelaw -> Gestão Financeira - Freelaw; pessoal -> Casinha :) when about home, otherwise Guilherme Barros.
        let project_id: string | undefined = undefined
        try {
          const chatDb = getChatSettingsDbService()
          const ws = chatDb.enabled()
            ? (await chatDb.getOrCreate(msg.chat.id)).workspace_id
            : (process.env.CORTEX_DEFAULT_WORKSPACE as any) || 'pessoal'

          if (ws === 'freelaw') {
            const p = await todoist.findProjectByName('Gestão Financeira - Freelaw')
            project_id = p?.id
          } else {
            const t = content.toLowerCase()
            const casa = [
              'casa',
              'obra',
              'reforma',
              'mudança',
              'mudanca',
              'apartamento',
              'condomínio',
              'condominio',
              'manutenção',
              'manutencao',
            ].some((k) => t.includes(k))
            const p = await todoist.findProjectByName(casa ? 'Casinha :)' : 'Guilherme Barros')
            project_id = p?.id
          }
        } catch {
          // ignore routing errors; fall back to inbox
        }

        const task = await todoist.createTask({ content, project_id })
        await this.bot.sendMessage(
          msg.chat.id,
          `✅ Tarefa criada: "${task.content}"\nID: ${task.id}`
        )
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro'
        logger.error(`Telegram todoist create error: ${err}`)
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao criar tarefa: ${err}`)
      }
    })

    // /concluir <id>
    this.bot.onText(/\/concluir(?:\s+(\S+))?/, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return
      const id = (match?.[1] || '').trim()
      if (!id) {
        await this.bot.sendMessage(msg.chat.id, '❌ Use: /concluir <id>')
        return
      }
      try {
        const todoist = getTodoistService()
        await todoist.completeTask(id)
        await this.bot.sendMessage(msg.chat.id, `✅ Tarefa concluída: ${id}`)
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro'
        logger.error(`Telegram todoist complete error: ${err}`)
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao concluir: ${err}`)
      }
    })

    // ==================== CALENDAR COMMANDS ====================

    // /agenda - eventos de hoje (atalho sem IA)
    this.bot.onText(/\/agenda\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      try {
        const auth = getGoogleAuthService()
        if (!auth.isAuthenticated()) {
          await this.bot.sendMessage(
            msg.chat.id,
            '🔑 Google não autenticado. Rode no terminal: `npm run dev -- google auth`'
          )
          return
        }

        const calendar = getCalendarService()
        const events = await calendar.getTodayEvents()
        if (events.length === 0) {
          await this.bot.sendMessage(msg.chat.id, '📅 Hoje está livre! Nenhum compromisso. 🎉')
          return
        }

        const list = events
          .slice(0, 10)
          .map((e) => {
            const parsed = calendar.parseEvent(e)
            const time = parsed.isAllDay
              ? '📅 Dia inteiro'
              : `🕐 ${parsed.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
            const meet = parsed.meetLink ? ' 🔗' : ''
            return `• ${time} - ${parsed.title}${meet}`
          })
          .join('\n')

        await this.sendLongMessage(msg.chat.id, `📅 *Agenda de hoje*\n\n${list}`)
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro'
        logger.error(`Telegram calendar error: ${err}`)
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao buscar agenda: ${err}`)
      }
    })

    // /resumo - ativa resumo diário
    this.bot.onText(/\/resumo(?:\s+(\d{1,2})(?::(\d{2}))?)?/, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return

      const hour = match?.[1] ? Number.parseInt(match[1]) : 7
      const minute = match?.[2] ? Number.parseInt(match[2]) : 0

      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        await this.bot.sendMessage(msg.chat.id, '❌ Horário inválido. Use formato: /resumo HH:MM')
        return
      }

      const digest = getDailyDigestService()
      digest.addChat(msg.chat.id, hour, minute)

      await this.bot.sendMessage(
        msg.chat.id,
        `✅ *Resumo diário ativado!*\n\n` +
          `📅 Você receberá um resumo todos os dias às *${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}* com:\n` +
          `• Eventos do dia\n` +
          `• Tarefas pendentes\n` +
          `• Emails não lidos\n\n` +
          `_Use /semresumo para desativar_\n` +
          `_Use /agora para receber agora_`,
        { parse_mode: 'Markdown' }
      )

      logger.info(`Daily Digest: Ativado para chat ${msg.chat.id} às ${hour}:${minute}`)
    })

    // /proativo - ativa 07:00 e 18:00 e manda brief agora
    this.bot.onText(/\/proativo\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      const digest = getDailyDigestService()
      digest.enableProactiveDefaults(msg.chat.id)
      await this.bot.sendMessage(
        msg.chat.id,
        '✅ Modo proativo ativado! Vou te enviar briefing diário às 07:00 e 18:00.\n\nVou mandar um briefing agora.'
      )
      try {
        await digest.sendNow(msg.chat.id)
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro'
        await this.bot.sendMessage(msg.chat.id, `❌ Não consegui gerar o briefing agora: ${err}`)
      }
    })

    // /brief - envia briefing agora
    this.bot.onText(/\/brief\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      await this.bot.sendChatAction(msg.chat.id, 'typing')
      try {
        const digest = getDailyDigestService()
        await digest.sendNow(msg.chat.id)
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro'
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao gerar briefing: ${err}`)
      }
    })

    // /refresh - roda memory refresh manualmente (Supabase -> Supermemory)
    this.bot.onText(/\/refresh\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      await this.bot.sendChatAction(msg.chat.id, 'typing')
      try {
        const refresh = getMemoryRefreshService()
        await refresh.run({ trigger: 'manual', mode: 'full', chatId: msg.chat.id })
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro'
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao rodar memory refresh: ${err}`)
      }
    })

    // /status - mostra schedules
    this.bot.onText(/\/status\b/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return
      const digest = getDailyDigestService()
      const schedules = digest.getSchedulesForChat(msg.chat.id)
      const weekly = digest.getWeeklySchedulesForChat(msg.chat.id)
      if (schedules.length === 0) {
        await this.bot.sendMessage(
          msg.chat.id,
          'ℹ️ Nenhum modo proativo ativo neste chat.\n\nUse /proativo ou /resumo HH:MM.'
        )
        return
      }

      const lines = schedules.map((s) => `• ${s.cronExpression} (America/Sao_Paulo)`).join('\n')
      const weeklyLines = weekly.length
        ? weekly.map((s) => `• ${s.cronExpression} (semanal)`).join('\n')
        : ''
      await this.sendLongMessage(
        msg.chat.id,
        `🧠 *Status Proativo*\n\nAgendamentos diários:\n${lines}\n\n` +
          (weeklyLines ? `Agendamentos semanais:\n${weeklyLines}\n\n` : '') +
          `Use /semresumo para desativar.`
      )
    })

    // /semresumo - desativa resumo diário
    this.bot.onText(/\/semresumo/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return

      const digest = getDailyDigestService()
      digest.removeChat(msg.chat.id)
      digest.removeWeekly(msg.chat.id)

      await this.bot.sendMessage(
        msg.chat.id,
        '✅ Resumo diário desativado.\n\n_Use /resumo para reativar_',
        { parse_mode: 'Markdown' }
      )
    })

    // /agora - envia resumo imediatamente
    this.bot.onText(/\/agora/, async (msg) => {
      if (!(await this.ensureAuthorized(msg))) return

      await this.bot.sendChatAction(msg.chat.id, 'typing')

      try {
        const digest = getDailyDigestService()
        await digest.sendNow(msg.chat.id)
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro'
        await this.bot.sendMessage(msg.chat.id, `❌ Erro ao gerar resumo: ${err}`)
      }
    })

    // /semanal - ativa resumo semanal padrão; "/semanal agora" envia agora
    this.bot.onText(/\/semanal(?:\s+(agora))?/, async (msg, match) => {
      if (!(await this.ensureAuthorized(msg))) return
      const now = (match?.[1] || '').toLowerCase() === 'agora'
      const digest = getDailyDigestService()
      digest.enableWeeklyDefault(msg.chat.id, 7, 0)
      if (now) {
        await this.bot.sendChatAction(msg.chat.id, 'typing')
        try {
          await digest.sendWeeklyNow(msg.chat.id)
        } catch (error) {
          const err = error instanceof Error ? error.message : 'Erro'
          await this.bot.sendMessage(msg.chat.id, `❌ Erro ao gerar resumo semanal: ${err}`)
        }
        return
      }
      await this.bot.sendMessage(
        msg.chat.id,
        `✅ *Resumo semanal ativado!*\n\nVou te enviar toda segunda às *07:00* (America/Sao_Paulo).\n\nUse /semanal agora para receber agora.`,
        { parse_mode: 'Markdown' }
      )
    })

    // ALL messages go to Brain
    this.bot.on('message', async (msg) => {
      // 1) Mídia (áudio/voz/foto/vídeo) — trata antes do fluxo de texto
      try {
        const handled = await this.tryHandleMediaMessage(msg)
        if (handled) return
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e)
        logger.error(`Telegram media error: ${err}`)
        // best-effort: don't block normal text flow if media handler fails
      }

      if (msg.text) {
        // log leve para diagnosticar "não responde"
        logger.info(
          `Telegram msg recebida chat=${msg.chat.id} from=${msg.from?.id} text=${msg.text.startsWith('/') ? '[command]' : '[text]'}`
        )
      }

      // Skip commands
      if (!msg.text || msg.text.startsWith('/')) return
      if (!(await this.ensureAuthorized(msg))) return

      try {
        // Shortcut: after a digest, allow replying with "1,3,4" to mark numbered emails as read.
        {
          const raw = msg.text.trim()
          const onlyNums = /^\d+(?:\s*[, ]\s*\d+)*$/.test(raw)
          if (onlyNums) {
            const digest = getDailyDigestService()
            const last = digest.getLastDigestEmailRefs(msg.chat.id)
            if (
              last &&
              Array.isArray(last.refs) &&
              last.refs.length > 0 &&
              Date.now() - last.at < 12 * 60 * 60 * 1000
            ) {
              const nums = raw
                .split(/[,\s]+/)
                .map((s) => Number.parseInt(s.trim(), 10))
                .filter((n) => Number.isFinite(n) && n > 0)
              const uniq = Array.from(new Set(nums))
              const picked = uniq
                .map((n) => ({ n, ref: last.refs[n - 1] }))
                .filter((x) => x.ref && x.ref.id)
              if (picked.length === 0) {
                await this.bot.sendMessage(
                  msg.chat.id,
                  'Não encontrei esses números no último digest.'
                )
                return
              }

              // Mark as read (mutating) — user intent is explicit by sending the numbers.
              let total = 0
              for (const { ref } of picked) {
                try {
                  const gmail = getGmailService(ref.workspaceId, ref.account)
                  await gmail.markAsRead(ref.id)
                  total += 1
                } catch {
                  // ignore individual failures
                }
              }
              await this.bot.sendMessage(msg.chat.id, `✅ Marquei ${total} email(s) como lido(s).`)
              return
            }
          }
        }

        // UX sem barra: permitir "contexto pessoal|freelaw"
        {
          const m = msg.text.trim().match(/^contexto\s+(pessoal|freelaw)\b/i)
          if (m) {
            const arg = m[1].toLowerCase() as WorkspaceId
            const chatDb = getChatSettingsDbService()
            if (!chatDb.enabled()) {
              this.workspaceByChat.set(msg.chat.id, arg)
              await this.bot.sendMessage(
                msg.chat.id,
                `✅ Contexto definido (temporário) para: *${arg}*\n\n⚠️ Supabase não configurado/indisponível — contexto não ficará persistente.`,
                { parse_mode: 'Markdown' }
              )
              return
            }
            try {
              const s = await chatDb.setWorkspace(msg.chat.id, arg)
              this.workspaceByChat.set(msg.chat.id, s.workspace_id)
              await this.bot.sendMessage(
                msg.chat.id,
                `✅ Contexto definido para: *${s.workspace_id}*`,
                { parse_mode: 'Markdown' }
              )
            } catch (e) {
              const err = e instanceof Error ? e.message : String(e)
              this.workspaceByChat.set(msg.chat.id, arg)
              await this.bot.sendMessage(
                msg.chat.id,
                `✅ Contexto definido (temporário) para: *${arg}*\n\n⚠️ Falha ao persistir no Supabase agora.\nDetalhe: ${err}`,
                { parse_mode: 'Markdown' }
              )
            }
            return
          }
        }
        // UX sem barra (atalho): enviar apenas "pessoal" ou "freelaw" troca contexto
        {
          const raw = msg.text.trim().toLowerCase()
          if (raw === 'pessoal' || raw === 'freelaw') {
            const chatDb = getChatSettingsDbService()
            if (!chatDb.enabled()) {
              this.workspaceByChat.set(msg.chat.id, raw as WorkspaceId)
              await this.bot.sendMessage(
                msg.chat.id,
                `✅ Contexto definido (temporário) para: *${raw}*\n\n⚠️ Supabase não configurado/indisponível — contexto não ficará persistente.`,
                { parse_mode: 'Markdown' }
              )
              return
            }
            try {
              const s = await chatDb.setWorkspace(msg.chat.id, raw as WorkspaceId)
              this.workspaceByChat.set(msg.chat.id, s.workspace_id)
              await this.bot.sendMessage(
                msg.chat.id,
                `✅ Contexto definido para: *${s.workspace_id}*`,
                { parse_mode: 'Markdown' }
              )
            } catch (e) {
              const err = e instanceof Error ? e.message : String(e)
              this.workspaceByChat.set(msg.chat.id, raw as WorkspaceId)
              await this.bot.sendMessage(
                msg.chat.id,
                `✅ Contexto definido (temporário) para: *${raw}*\n\n⚠️ Falha ao persistir no Supabase agora.\nDetalhe: ${err}`,
                { parse_mode: 'Markdown' }
              )
            }
            return
          }
        }

        // UX sem barra: conectar google (gera URL OAuth do contexto atual)
        {
          const raw = msg.text.trim()
          const lower = raw.toLowerCase()
          if (
            /(^|\b)(conectar google|conecta google|login google|google auth|autorizar google)\b/.test(
              lower
            )
          ) {
            const chatDb = getChatSettingsDbService()
            const ws = chatDb.enabled()
              ? (await chatDb.getOrCreate(msg.chat.id)).workspace_id
              : (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) || 'pessoal'
            this.workspaceByChat.set(msg.chat.id, ws)

            const redirect = (process.env.GOOGLE_REDIRECT_URI || '').trim()
            const stateSecret = (
              process.env.CORTEX_OAUTH_STATE_SECRET ||
              process.env.TELEGRAM_WEBHOOK_SECRET ||
              ''
            ).trim()
            if (!redirect || !stateSecret) {
              await this.bot.sendMessage(
                msg.chat.id,
                '❌ OAuth não configurado.\n\nVerifique GOOGLE_REDIRECT_URI e CORTEX_OAUTH_STATE_SECRET no Fly.'
              )
              return
            }
            // Guardrail: não gere link com localhost no Telegram/Fly (vai quebrar em mobile e fora do seu Mac)
            if (/^http:\/\/localhost(?::\d+)?\/oauth2callback$/i.test(redirect)) {
              const app = (process.env.FLY_APP_NAME || '').trim()
              const hint = app
                ? `https://${app}.fly.dev/oauth2callback`
                : 'https://<seu-app>.fly.dev/oauth2callback'
              await this.bot.sendMessage(
                msg.chat.id,
                `❌ OAuth está apontando para localhost.\n\n` +
                  `No Fly, configure GOOGLE_REDIRECT_URI=${hint}\n` +
                  `E adicione o mesmo redirect URI no Google Cloud Console (OAuth client).\n\n` +
                  `Depois mande "conectar google" novamente.`
              )
              return
            }

            const state = createOAuthState(
              { chatId: msg.chat.id, workspaceId: ws, ts: Date.now() },
              stateSecret
            )
            const url = getGoogleAuthService(ws, null).getAuthUrl({ state })
            await this.sendLongMessage(
              msg.chat.id,
              `🔐 Para conectar sua conta Google no contexto *${ws}*:\n\n1) Abra este link e escolha a conta correta\n2) Autorize\n\n${url}\n\nDepois disso, eu vou confirmar aqui no Telegram.`
            )
            return
          }
        }

        // UX sem barra: selecionar conta google para este chat ("email fulano@..." ou só o email)
        {
          const raw = msg.text.trim()
          const m =
            raw.match(/^(?:email|conta)\s+([^\s]+@[^\s]+\.[^\s]+)$/i) ||
            raw.match(/^([^\s]+@[^\s]+\.[^\s]+)$/)
          if (m?.[1]) {
            const email = m[1].toLowerCase()
            const chatDb = getChatSettingsDbService()
            if (!chatDb.enabled()) {
              await this.bot.sendMessage(
                msg.chat.id,
                '❌ Supabase não configurado para chat_settings.'
              )
              return
            }
            await chatDb.setGoogleAccountEmail(msg.chat.id, email)
            await this.bot.sendMessage(
              msg.chat.id,
              `✅ Conta Google selecionada para este chat: ${email}`
            )
            return
          }
        }

        // Config mode: treat message as rule change request
        if (this.configModeChats.has(msg.chat.id)) {
          const db = getRulesDbService()
          if (!db.enabled()) {
            await this.bot.sendMessage(
              msg.chat.id,
              '❌ Supabase não configurado para regras (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).'
            )
            return
          }
          const chatDb = getChatSettingsDbService()
          const ws = chatDb.enabled()
            ? (await chatDb.getOrCreate(msg.chat.id)).workspace_id
            : (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) || 'pessoal'
          this.workspaceByChat.set(msg.chat.id, ws)

          const draft = await db.createDraftFromComment({
            comment: msg.text,
            actor: msg.from?.username
              ? `@${msg.from.username}`
              : msg.from?.first_name || 'telegram',
            workspaceId: ws,
          })
          this.pendingRuleDraftByChat.set(msg.chat.id, { ruleId: draft.id, version: draft.version })
          await this.sendLongMessage(
            msg.chat.id,
            `🧾 Criei uma *nova versão* das regras (v${draft.version}), ainda *não aplicada*.\n\nUse /aplicar para ativar ou /cancelar para descartar.`
          )
          return
        }

        await this.bot.sendChatAction(msg.chat.id, 'typing')

        if (!this.brain) {
          // Sem IA: ainda assim capturar como nota (cloud-first), para não exigir "/".
          const chatDb = getChatSettingsDbService()
          const ws = chatDb.enabled()
            ? (await chatDb.getOrCreate(msg.chat.id)).workspace_id
            : (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) || 'pessoal'
          this.workspaceByChat.set(msg.chat.id, ws)

          const notesDb = getNotesDbService()
          if (!notesDb.enabled()) {
            await this.bot.sendMessage(
              msg.chat.id,
              '🧠 Modo IA está desativado e Supabase não está configurado para notas.\n\nUse /help para ver os comandos disponíveis.'
            )
            return
          }

          const areaRouter = getAreaRouterService()
          const suggestion = await areaRouter.suggest(ws, msg.text)
          const autoAreaTag = suggestion?.slug ? `area/${suggestion.slug}` : null

          const title = classifierService.extractTitle(msg.text, 50) || 'Nota'
          const created = await notesDb.createNote({
            title,
            bodyMd: msg.text,
            type: 'inbox',
            tags: ['tipo/inbox', 'origem/telegram', ...(autoAreaTag ? [autoAreaTag] : [])],
            source: 'telegram',
            workspaceId: ws,
          })
          this.lastCreatedNoteByChat.set(msg.chat.id, created.id)
          await this.bot.sendMessage(
            msg.chat.id,
            `✅ Registrei isso como nota (${autoAreaTag ? autoAreaTag : 'sem área'}): notes/${created.id}`
          )
          return
        }

        const response = await (this.agent ?? getAgentService()).chat(msg.chat.id, msg.text)

        // Send response, splitting if needed
        await this.sendLongMessage(msg.chat.id, response.message)
      } catch (error) {
        const err = error instanceof Error ? error.message : 'Erro'
        logger.error(`Telegram error: ${err}`)
        await this.bot.sendMessage(
          msg.chat.id,
          `😅 Tive um problema: ${err}\n\nTente de novo ou /limpar para resetar.`
        )
      }
    })

    this.bot.on('polling_error', (error) => {
      const e = error as any
      const code = e?.code ? `code=${e.code}` : ''
      const status = e?.response?.statusCode ? `status=${e.response.statusCode}` : ''
      const body = e?.response?.body ? `body=${JSON.stringify(e.response.body)}` : ''
      logger.error(`Polling error: ${code} ${status} ${error.message} ${body}`.trim())

      // Auto-recover from common transient polling failures.
      // - ECONNRESET/ETIMEDOUT often happen due to network hiccups.
      // - EFATAL indicates the polling loop stopped.
      // - 409 can happen if another instance is polling; restarting may help after the other stops.
      this.schedulePollingRestart(error)
    })
  }

  private getTmpMediaDir(): string {
    const dir = process.env.TELEGRAM_MEDIA_TMP_DIR
      ? path.resolve(process.env.TELEGRAM_MEDIA_TMP_DIR)
      : path.join(process.cwd(), 'tmp', 'telegram-media')
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch {
      // ignore
    }
    return dir
  }

  private async ensureMediaBucket(bucket: string): Promise<void> {
    if (this.ensuredMediaBucket.has(bucket)) return
    if (!isSupabaseConfigured()) return
    const supabase = getSupabaseClient()
    try {
      const { data, error } = await supabase.storage.listBuckets()
      if (error) throw error
      const exists = (data || []).some((b) => b.name === bucket)
      if (!exists) {
        // Default: private bucket. We'll use signed URLs when needed.
        const { error: ce } = await supabase.storage.createBucket(bucket, { public: false })
        if (ce) throw ce
        logger.info(`Supabase bucket criado: ${bucket}`)
      }
      this.ensuredMediaBucket.add(bucket)
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e)
      logger.warn(`Supabase ensure bucket falhou (${bucket}): ${err}`)
      // don't throw — fallback to local vault if possible
    }
  }

  private sanitizeBaseName(name: string): string {
    return (
      (name || '')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120) || 'arquivo'
    )
  }

  private async tryHandleMediaMessage(msg: TelegramBot.Message): Promise<boolean> {
    // Ignore service messages, commands, etc.
    if (!(await this.ensureAuthorized(msg))) return false

    const chatId = msg.chat.id
    const voice = (msg as any).voice as TelegramBot.Voice | undefined
    const audio = (msg as any).audio as TelegramBot.Audio | undefined
    const video = (msg as any).video as TelegramBot.Video | undefined
    const photo = (msg as any).photo as TelegramBot.PhotoSize[] | undefined
    const caption = ((msg as any).caption as string | undefined) || ''

    const kind: 'voice' | 'audio' | 'photo' | 'video' | null = voice
      ? 'voice'
      : audio
        ? 'audio'
        : ((photo && photo.length ? 'photo' : null) ?? (video ? 'video' : null))

    if (!kind) return false

    // Determine workspace
    const chatDb = getChatSettingsDbService()
    const ws = chatDb.enabled()
      ? (await chatDb.getOrCreate(chatId)).workspace_id
      : (process.env.CORTEX_DEFAULT_WORKSPACE as WorkspaceId | undefined) || 'pessoal'
    this.workspaceByChat.set(chatId, ws)

    // Choose fileId + filename
    let fileId = ''
    let originalName = ''
    let mimeType = ''
    let durationSec: number | undefined = undefined

    if (kind === 'voice' && voice) {
      fileId = voice.file_id
      durationSec = voice.duration
      mimeType = 'audio/ogg'
      originalName = `voice-${new Date().toISOString().replace(/[:.]/g, '-')}.ogg`
    } else if (kind === 'audio' && audio) {
      fileId = audio.file_id
      durationSec = audio.duration
      mimeType = audio.mime_type || 'audio/mpeg'
      originalName =
        ((audio as any).file_name as string | undefined) ||
        `audio-${new Date().toISOString().replace(/[:.]/g, '-')}`
    } else if (kind === 'video' && video) {
      fileId = video.file_id
      durationSec = video.duration
      mimeType = video.mime_type || 'video/mp4'
      originalName = `video-${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`
    } else if (kind === 'photo' && photo && photo.length) {
      // pick the largest resolution photo
      const best = photo.reduce((a, b) => ((b.file_size || 0) > (a.file_size || 0) ? b : a))
      fileId = best.file_id
      mimeType = 'image/jpeg'
      originalName = `photo-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`
    }

    if (!fileId) return false

    await this.bot.sendChatAction(chatId, 'upload_document').catch(() => {})

    const tmpDir = this.getTmpMediaDir()
    const downloadedPath = await this.bot.downloadFile(fileId, tmpDir)
    const extFromDisk = path.extname(downloadedPath || '')
    const base = this.sanitizeBaseName(path.parse(originalName).name || `${kind}-${randomUUID()}`)
    const finalFileName = `${base}${extFromDisk || path.extname(originalName) || ''}` || `${base}`

    let storedRef: {
      kind: string
      storage: 'supabase' | 'vault' | 'tmp'
      bucket?: string
      path?: string
      signedUrl?: string
      vaultPath?: string
      tmpPath?: string
    } = { kind, storage: 'tmp', tmpPath: downloadedPath }

    // Prefer Supabase Storage when configured
    if (isSupabaseConfigured()) {
      const bucket = (process.env.SUPABASE_MEDIA_BUCKET || 'cortex-media').trim() || 'cortex-media'
      await this.ensureMediaBucket(bucket)
      try {
        const y = new Date().toISOString().slice(0, 4)
        const ym = new Date().toISOString().slice(0, 7) // YYYY-MM
        const storagePath = `${ws}/telegram/${kind}/${ym}/${finalFileName}`

        const supabase = getSupabaseClient()
        const buf = fs.readFileSync(downloadedPath)
        const { error: upErr } = await supabase.storage.from(bucket).upload(storagePath, buf, {
          contentType: mimeType || undefined,
          upsert: true,
        })
        if (upErr) throw upErr

        // Signed URL (7 days) for convenience
        let signedUrl: string | undefined = undefined
        try {
          const { data } = await supabase.storage
            .from(bucket)
            .createSignedUrl(storagePath, 60 * 60 * 24 * 7)
          signedUrl = data?.signedUrl || undefined
        } catch {
          // ignore
        }

        storedRef = { kind, storage: 'supabase', bucket, path: storagePath, signedUrl }
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e)
        logger.warn(`Falha ao salvar mídia no Supabase; fallback local. Detalhe: ${err}`)
      }
    }

    // No local vault fallback: cloud-first (Supabase Storage).

    // Register as note (cloud-first when available)
    const metaLines: string[] = [
      `- kind: ${kind}`,
      `- chat: ${chatId}`,
      `- from: ${msg.from?.id ?? 'unknown'}`,
      `- date: ${new Date().toISOString()}`,
      durationSec != null ? `- duration_s: ${durationSec}` : '',
      caption ? `- caption: ${caption}` : '',
      storedRef.storage === 'supabase'
        ? `- storage: supabase://${storedRef.bucket}/${storedRef.path}`
        : `- storage: tmp:${storedRef.tmpPath}`,
      storedRef.signedUrl ? `- signed_url_7d: ${storedRef.signedUrl}` : '',
    ].filter(Boolean)

    const bodyMd =
      `# Mídia recebida (Telegram)\n\n` +
      metaLines.join('\n') +
      (caption ? `\n\n## Legenda\n\n${caption}\n` : '')

    try {
      const notesDb = getNotesDbService()
      if (!notesDb.enabled()) throw new Error('Supabase não configurado.')
      const title = `${kind.toUpperCase()} — ${new Date().toLocaleDateString('pt-BR')}`
      const created = await notesDb.createNote({
        title,
        bodyMd,
        type: 'inbox',
        tags: ['tipo/inbox', 'origem/telegram', `midia/${kind}`],
        source: 'telegram',
        workspaceId: ws,
      })
      this.lastCreatedNoteByChat.set(chatId, created.id)
      await this.bot.sendMessage(chatId, `✅ Recebi e registrei seu ${kind}: notes/${created.id}`)
      return true
    } catch (e) {
      logger.warn(
        `Falha ao registrar nota no Supabase: ${e instanceof Error ? e.message : String(e)}`
      )
    }

    await this.bot.sendMessage(chatId, `✅ Recebi seu ${kind}.`)
    return true
  }

  private schedulePollingRestart(error?: unknown): void {
    if (this.pollingRestartTimer) return

    this.pollingRestartAttempts += 1
    const attempt = this.pollingRestartAttempts
    const e = error as any
    const statusCode = e?.response?.statusCode

    // 409 means another getUpdates loop is active elsewhere. Retrying quickly only spams logs.
    // Backoff slower for 409; faster exponential for transient network issues.
    const delayMs =
      statusCode === 409
        ? Math.min(15 * 60_000, 30_000 * attempt) // 30s, 60s, 90s... capped at 15min
        : Math.min(60_000, 1000 * Math.pow(2, Math.min(6, attempt))) // 2s..64s capped

    logger.warn(
      `Telegram polling: tentando recuperar (tentativa ${attempt}) em ${Math.round(delayMs / 1000)}s`
    )

    this.pollingRestartTimer = setTimeout(async () => {
      this.pollingRestartTimer = null
      try {
        // Stop + start polling to force a new getUpdates loop.
        await (this.bot as any).stopPolling?.().catch(() => {})
      } catch {
        /* ignore */
      }

      try {
        await (this.bot as any).startPolling()
        this.pollingRestartAttempts = 0
        logger.info('Telegram polling: recuperado com sucesso')
      } catch (err) {
        logger.error(
          `Telegram polling: falha ao recuperar (${err instanceof Error ? err.message : String(err)})`
        )
        // Retry again
        this.schedulePollingRestart()
      }
    }, delayMs)
  }

  private async sendLongMessage(chatId: number, text: string): Promise<void> {
    const maxLen = 4000

    if (text.length <= maxLen) {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(async () => {
        // Fallback without markdown if it fails
        await this.bot.sendMessage(chatId, text)
      })
      return
    }

    // Split message
    let remaining = text
    while (remaining.length > 0) {
      let chunk: string
      if (remaining.length <= maxLen) {
        chunk = remaining
        remaining = ''
      } else {
        let breakPoint = remaining.lastIndexOf('\n\n', maxLen)
        if (breakPoint < maxLen * 0.3) breakPoint = remaining.lastIndexOf('\n', maxLen)
        if (breakPoint < maxLen * 0.3) breakPoint = remaining.lastIndexOf(' ', maxLen)
        if (breakPoint < maxLen * 0.3) breakPoint = maxLen

        chunk = remaining.substring(0, breakPoint)
        remaining = remaining.substring(breakPoint).trim()
      }

      await this.bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' }).catch(async () => {
        await this.bot.sendMessage(chatId, chunk)
      })
    }
  }

  /**
   * Used by server-side callbacks (ex: OAuth) to notify a chat.
   */
  async sendSystemMessage(chatId: number, text: string): Promise<void> {
    await this.sendLongMessage(chatId, text)
  }

  stop(): void {
    try {
      if (this.pollingRestartTimer) {
        clearTimeout(this.pollingRestartTimer)
        this.pollingRestartTimer = null
      }
    } catch {
      /* ignore */
    }

    if (this.mode === 'polling') {
      try {
        ;(this.bot as any).stopPolling?.()
      } catch {
        /* ignore */
      }
    }

    if (this.mode === 'polling') {
      try {
        this.lock?.release()
        if (this.lock)
          logger.info(`Telegram lock liberado: ${this.lock.lockPath} (pid=${process.pid})`)
      } catch {
        /* ignore */
      }
    }
    this.lock = null
  }
}

let instance: TelegramService | null = null

export function startTelegramBot(): TelegramService {
  if (!instance) {
    instance = new TelegramService('polling')
  }
  return instance
}

export function getTelegramWebhookBot(): TelegramService {
  if (!instance) {
    instance = new TelegramService('webhook')
  }
  return instance
}

export function stopTelegramBot(): void {
  if (instance) {
    instance.stop()
    instance = null
  }
}
