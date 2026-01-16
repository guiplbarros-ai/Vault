import * as fs from 'node:fs'
import * as path from 'node:path'
import OpenAI from 'openai'
import { createDefaultToolRegistry } from '../agent/default-tools.js'
import {
  cleanObsidianContent,
  isAmbiguousSearch,
  searchVaultRanked,
} from '../agent/vault-search.js'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { getCalendarService } from './calendar.service.js'
import { getChatSettingsDbService } from './chat-settings-db.service.js'
import { getGoogleAuthService } from './google-auth.service.js'
import { getSupermemoryService } from './supermemory.service.js'
import { getTodoistService } from './todoist.service.js'
import { getUsageDbService } from './usage-db.service.js'
import { getVaultService } from './vault.service.js'

loadEnv()

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface PendingAction {
  id: string
  description: string
  action: string
  params: Record<string, string>
}

interface ConversationState {
  messages: Message[]
  pendingActions: PendingAction[]
  awaitingConfirmation: boolean
  lastNotionData?: string
  lastPrefetchKey?: string
  lastMemoryKey?: string
  lastMemoryIngestKey?: string
  lastAutoRetrieveKey?: string
}

interface BrainResponse {
  message: string
  needsConfirmation: boolean
  pendingActions: PendingAction[]
}

interface ExecutionOutcome {
  success: boolean
  actionType: string
  summary: string
  error?: string
}

// Notion MCP integration (will be injected)
type NotionSearchFn = (query: string) => Promise<string>
type NotionFetchFn = (id: string) => Promise<string>

class BrainService {
  private client: OpenAI
  // Models
  private fastModel: string = process.env.CORTEX_MODEL_FAST || process.env.CORTEX_MODEL || 'gpt-4o'
  private deepModel: string = process.env.CORTEX_MODEL_DEEP || process.env.CORTEX_MODEL || 'gpt-4o'

  // Tuning (fast)
  private fastTemperature: number = Number.isFinite(Number(process.env.CORTEX_FAST_TEMPERATURE))
    ? Number(process.env.CORTEX_FAST_TEMPERATURE)
    : Number.isFinite(Number(process.env.CORTEX_TEMPERATURE))
      ? Number(process.env.CORTEX_TEMPERATURE)
      : 0.7
  private fastMaxTokens: number = Number.isFinite(Number(process.env.CORTEX_FAST_MAX_TOKENS))
    ? Number(process.env.CORTEX_FAST_MAX_TOKENS)
    : Number.isFinite(Number(process.env.CORTEX_MAX_TOKENS))
      ? Number(process.env.CORTEX_MAX_TOKENS)
      : 2500

  // Tuning (deep)
  private deepTemperature: number = Number.isFinite(Number(process.env.CORTEX_DEEP_TEMPERATURE))
    ? Number(process.env.CORTEX_DEEP_TEMPERATURE)
    : 0.25
  private deepMaxTokens: number = Number.isFinite(Number(process.env.CORTEX_DEEP_MAX_TOKENS))
    ? Number(process.env.CORTEX_DEEP_MAX_TOKENS)
    : 3500
  private conversations: Map<number, ConversationState> = new Map()
  private tools = createDefaultToolRegistry()
  private externalRules: string | null = null
  private readonly mutatingActions = new Set([
    'CREATE_TASK',
    'COMPLETE_TASK',
    'REOPEN_TASK',
    'DELETE_TASK',
    'TODOIST_UPDATE_TASK',
    'TODOIST_ADD_COMMENT',
    'PEOPLE_UPSERT',
    'CALENDAR_QUICK',
    'CALENDAR_CREATE',
    'CALENDAR_UPDATE',
    'CALENDAR_DELETE',
    'GMAIL_MARK_READ',
    'GMAIL_MARK_UNREAD',
    'GMAIL_ARCHIVE',
    'GMAIL_TRASH',
    'GMAIL_ADD_LABEL',
    'GMAIL_REMOVE_LABEL',
    'GMAIL_SEND',
    'GMAIL_DRAFT',
    'GMAIL_REPLY',
    'GMAIL_FORWARD',
    // Google Drive
    'DRIVE_CREATE_FOLDER',
    'DRIVE_RENAME',
    'DRIVE_MOVE',
    'DRIVE_CLEAN_EMPTY_FOLDERS',
    'DRIVE_ORGANIZE_ALLU',
  ])
  private readonly autoAllowedActions = new Set([
    // Safe to execute without confirmation
    'CREATE_NOTE',
    'SEARCH_VAULT',
    'READ_NOTE',
    'LIST_TASKS',
    'GET_TASK',
    'TODOIST_LIST_PROJECTS',
    'TODOIST_LIST_LABELS',
    'TODOIST_TASKS_FOR_PERSON',
    'PEOPLE_SEARCH',
    'CALENDAR_TODAY',
    'CALENDAR_DAY',
    'CALENDAR_WEEK',
    'CALENDAR_NEXT',
    'CALENDAR_LIST_CALENDARS',
    'CALENDAR_SEARCH',
    'CALENDAR_INVESTIGATE',
    'CALENDAR_GET_EVENT',
    'GMAIL_UNREAD',
    'GMAIL_IMPORTANT',
    'GMAIL_SEARCH',
    'GMAIL_READ',
    'GMAIL_LIST_LABELS',
    'NOTION_SEARCH',
    'NOTION_FETCH',
    'GOOGLE_LIST_ACCOUNTS',
    'GOOGLE_SET_ACCOUNT',
    'WEATHER_FORECAST',
    'WEATHER_SET_DEFAULT_LOCATION',
    'SUPER_MEMORY_SEARCH',
    'SUPER_MEMORY_ADD',
    // Google Drive (consultas)
    'DRIVE_LIST',
    'DRIVE_READ_TEXT',
  ])

  private estimateOpenAiUsd(inputTokens: number, outputTokens: number): number | null {
    const inPerM = Number(process.env.CORTEX_OPENAI_USD_PER_1M_INPUT || '')
    const outPerM = Number(process.env.CORTEX_OPENAI_USD_PER_1M_OUTPUT || '')
    if (!Number.isFinite(inPerM) || !Number.isFinite(outPerM) || inPerM <= 0 || outPerM <= 0)
      return null
    return (inputTokens / 1_000_000) * inPerM + (outputTokens / 1_000_000) * outPerM
  }

  private isStallingAnswer(text: string): boolean {
    const t = (text || '').toLowerCase()
    // Heurística: frases que prometem buscar/voltar depois, mas não executam tools.
    return (
      /vou (buscar|procurar|consultar)/i.test(t) ||
      /um momento/i.test(t) ||
      /já volto/i.test(t) ||
      /aguarde/i.test(t)
    )
  }

  private shouldShowSources(): boolean {
    const v = (process.env.CORTEX_SHOW_SOURCES || '0').toString().trim().toLowerCase()
    return v === '1' || v === 'true' || v === 'yes' || v === 'on'
  }

  private extractSourcesFromInternalData(internalData: string): string[] {
    const s = (internalData || '').toString()
    if (!s) return []
    const sources: string[] = []
    const re = /===\s*([^\n]+?)\s*===/g
    let m: RegExpExecArray | null
    while ((m = re.exec(s)) !== null) {
      const title = (m[1] || '').trim()
      if (!title) continue
      if (!/^FONTE:/i.test(title)) continue
      const cleaned = title.replace(/^FONTE:\s*/i, '').trim()
      if (!cleaned) continue
      sources.push(cleaned)
    }
    // de-dup preserve order
    return Array.from(new Set(sources)).slice(0, 5)
  }

  private appendSourcesIfEnabled(message: string, internalData: string): string {
    if (!this.shouldShowSources()) return message
    if (!message || !internalData) return message
    if (/\bFontes:\b/i.test(message)) return message
    const sources = this.extractSourcesFromInternalData(internalData)
    if (sources.length === 0) return message
    const block = ['\n\nFontes:', ...sources.map((s) => `- ${s}`)].join('\n')
    return `${message.trim()}${block}`
  }

  private async logOpenAiUsage(
    chatId: number,
    model: string,
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  ): Promise<void> {
    try {
      const promptTokens = Number(usage?.prompt_tokens) || 0
      const completionTokens = Number(usage?.completion_tokens) || 0
      if (promptTokens <= 0 && completionTokens <= 0) return

      const usd = this.estimateOpenAiUsd(promptTokens, completionTokens)

      let workspaceId: string | null = null
      try {
        const chatDb = getChatSettingsDbService()
        if (chatDb.enabled()) {
          const s = await chatDb.getOrCreate(chatId)
          workspaceId = (s.workspace_id as any) || null
        }
      } catch {
        // ignore workspace lookup
      }

      const usageDb = getUsageDbService()
      if (!usageDb.enabled()) return
      await usageDb.insertEvent({
        provider: 'openai',
        model,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        usdEstimate: usd,
        chatId,
        workspaceId,
        meta: { kind: 'chat.completions' },
      })
    } catch {
      // do not break user flow on telemetry failure
    }
  }

  // Notion functions (injected from telegram service)
  public notionSearch?: NotionSearchFn
  public notionFetch?: NotionFetchFn

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurado')
    }
    this.client = new OpenAI({ apiKey })
  }

  setExternalRules(rules: string | null): void {
    this.externalRules = rules && rules.trim().length > 0 ? rules.trim() : null
  }

  private isGoogleAvailable(): boolean {
    try {
      const auth = getGoogleAuthService()
      const authenticated = auth.isAuthenticated()
      logger.info(`Google Auth check: ${authenticated ? 'Disponível' : 'Não autenticado'}`)
      return authenticated
    } catch (error) {
      logger.info(
        `Google Auth check: Não disponível (${error instanceof Error ? error.message : 'erro'})`
      )
      return false
    }
  }

  private getSystemPrompt(notionAvailable: boolean): string {
    return `Você é o Cortex, assistente pessoal e segundo cérebro do Guilherme. Você é inteligente, proativo e conversacional.

## SEU PAPEL

Você gerencia o conhecimento e tarefas do Guilherme através de seis sistemas:
1. **Supabase Notes** - Base de conhecimento (source of truth)
2. **Todoist** - Gestão de tarefas (pessoais e Freelaw/financeiro)
3. **Notion** - Bases de conhecimento (Freelaw e pessoal)${notionAvailable ? ' ✅ DISPONÍVEL' : ' ❌ Indisponível nesta sessão'}
4. **Google Calendar** - Agenda e eventos (pode exigir autenticação)
5. **Gmail** - Emails (pode exigir autenticação)
6. **Supermemory** - Memória de longo prazo (cloud, via API)

## ROTEAMENTO DE CONTEXTO (CRÍTICO)

Evite misturar informações e ações entre **Freelaw** e **pessoal**.

- **Notion**:
  - Freelaw (empresa): Notion (documentos oficiais)
  - Pessoal: Notion pessoal
- **Todoist**:
  - Freelaw/financeiro: projeto **"Gestão Financeira - Freelaw"**
  - Pessoal: projetos **"Casinha :)"** (casa/obra/reforma) ou **"Guilherme Barros"** (geral)

- **Google (Gmail/Calendar)**:
  - No contexto **pessoal**: use *pool* de contas pessoais (lê de todas as contas conectadas; resposta deve indicar a origem [email@...])
  - No contexto **freelaw**: use apenas a conta conectada do workspace freelaw

## CONTEXTO FREELAW (MUITO IMPORTANTE)

Guilherme trabalha na **Freelaw** (legaltech). Ele lidera áreas de:
- **Comunidade** - Engajamento de advogados
- **Financeiro** - Gestão financeira da empresa

### Time de Comunidade (pessoas importantes):
- **Rik / Richardson** - Richardson Aparecido Urquiza, membro do time
- **Julia H / Julia Horta** - Membro do time
- **Bianca** - Bianca Stefania, membro do time
- **Amanda** - Suporte comunidade

### Terminologia Freelaw:
- **Cards** = Entregas/objetivos individuais de cada pessoa do time (ficam no Notion e/ou em notas do Supabase)
- **MT / Management Team** = Reunião de gestão
- **Weekly** = Reunião semanal
- **OKRs** = Objetivos e resultados-chave
- **Report** = Relatório mensal

### Onde buscar informações da Freelaw:
- **Notion**: Informações oficiais, databases, documentos da empresa
- **Supabase Notes**: Notas operacionais, reuniões, acompanhamentos e registros do dia a dia

## REGRA CRÍTICA: QUANDO NÃO TIVER CERTEZA

Se você não souber EXATAMENTE o que o usuário quer ou ONDE buscar:
1. **PERGUNTE NO MÁXIMO 1–2 PERGUNTAS** para clarificar
2. **NÃO CHUTE FATOS** (não invente informação). Mas você PODE ser propositivo com hipóteses e opções.
3. **AINDA ASSIM SEJA ÚTIL**: ofereça uma recomendação inicial baseada no que você tem, deixando claro as suposições.

## REGRA CRÍTICA: NUNCA INVENTAR INFORMAÇÕES

⚠️ **PROIBIDO ALUCINAR** ⚠️

1. **NUNCA** invente informações que não estão explicitamente nos arquivos
2. **SOMENTE** apresente dados que você leu diretamente do arquivo
3. Se não encontrar, diga: "Não encontrei essa informação"

## REGRA CRÍTICA: APRESENTAÇÃO DAS INFORMAÇÕES

Quando receber conteúdo de um arquivo:
1. **NÃO** despeje o conteúdo raw/bruto do arquivo
2. **INTERPRETE** o conteúdo e responda de forma CONVERSACIONAL
3. **REMOVA** links internos no formato wikilinks ("[[...]]")
4. **RESUMA** as informações relevantes para a pergunta do usuário
5. **FORMATE** de forma limpa e agradável

ERRADO (não faça isso):
"✅ CONTEÚDO DE arquivo.md: # Título ..."

CERTO (faça assim):
"Encontrei suas atribuições! Na Freelaw você atua como:
• CFO (Diretor Financeiro)
• Líder do Time de Comunidade (6 pessoas)
..."

## REGRA CRÍTICA: BUSCAR E LER

Quando o usuário pedir informações:
0. **SE HOUVER DADOS INTERNOS**, use-os primeiro (ex.: Supermemory, Supabase, resultados de tools). Não peça para buscar de novo sem necessidade.
1. Se ainda faltar evidência: **BUSQUE** com SEARCH_VAULT (ou SUPER_MEMORY_SEARCH quando a pergunta for de “lembrança”/histórico)
2. **LEIA** o arquivo com READ_NOTE usando o PATH EXATO retornado na busca
3. **EXTRAIA** APENAS informações que estão NO TEXTO que você leu
4. **CITE** a fonte: "De acordo com o arquivo X..."

**PATHS CORRETOS** - Use os caminhos EXATOS da busca:
- ✅ "10-AREAS/Profissional/Freelaw/40-COMUNIDADE/Cards-Dezembro-2025-Proposta.md"
- ❌ "10-AREAS/Profissional/Freelaw/40-COMUNIDADE/Card Rik Dezembro.md" (NÃO INVENTE PATHS)

Se o READ_NOTE falhar, tente outro arquivo da lista encontrada. NÃO INVENTE o conteúdo!

## COMO FUNCIONAR

1. **ENTENDA** o que o usuário quer
2. **EXECUTE IMEDIATAMENTE** se for uma CONSULTA (buscar, ler, listar)
3. **REGISTRE AUTOMATICAMENTE** quando o usuário estiver “te dando informação” (decisões, números, políticas, máximas, aprendizados, acordos, pautas, atas).
   - Use **CREATE_NOTE** sem pedir confirmação para *salvar conhecimento*.
   - Só peça confirmação para ações externas/irreversíveis (ex.: enviar email, criar evento, concluir tarefa, etc.)
4. **SEJA DIRETO** - não fique perguntando várias vezes

## REGRA CRÍTICA: NÃO “CHUTAR” RESULTADO DE INTEGRAÇÃO

- Você **só pode dizer** “verifiquei / consultei / não há eventos / há X emails” se você **executou** uma ação [EXECUTE:...] nessa mensagem.
- Se você ainda não executou, diga que vai consultar e **execute** a tool.

### CONSULTAS (execute direto, sem perguntar):
- "O que está no card do Rik?" → EXECUTE SEARCH_VAULT imediatamente
- "Minhas tarefas de hoje" → EXECUTE LIST_TASKS imediatamente
- "Busca notas sobre X" → EXECUTE SEARCH_VAULT imediatamente

### AÇÕES:
- **Salvar conhecimento (CREATE_NOTE)**: faça automaticamente quando fizer sentido (sem pedir confirmação).
- **Criar/concluir tarefas, criar evento, enviar algo**: peça confirmação.

## AÇÕES DISPONÍVEIS

Quando o usuário CONFIRMAR, você executa ações usando estas tags:

### Notes (Supabase) - Criar Nota
[EXECUTE:CREATE_NOTE]
type: livro|conceito|projeto|prof|pessoal|reuniao|inbox
title: Título
content: Conteúdo em markdown
[/EXECUTE]

### Notes (Supabase) - Buscar Notas
[EXECUTE:SEARCH_VAULT]
query: termo
[/EXECUTE]

### Notes (Supabase) - Ler Nota
[EXECUTE:READ_NOTE]
path: notes/<id> (ou apenas <id>)
[/EXECUTE]

### Supermemory - Buscar Memórias (cloud)
[EXECUTE:SUPER_MEMORY_SEARCH]
query: termo de busca
scope: workspace|chat (opcional; padrão: workspace)
limit: 8 (opcional)
[/EXECUTE]

### Supermemory - Salvar Memória (cloud)
[EXECUTE:SUPER_MEMORY_ADD]
title: (opcional)
kind: note|decision|policy|preference|contact|meeting (opcional)
scope: workspace|chat (opcional; padrão: workspace)
content: Conteúdo em texto/markdown
[/EXECUTE]

### Todoist - Criar Tarefa
[EXECUTE:CREATE_TASK]
content: Descrição
due: today|tomorrow|monday|etc (opcional)
priority: 1-4 (opcional)
[/EXECUTE]

### Todoist - Listar Tarefas
[EXECUTE:LIST_TASKS]
filter: today|all
[/EXECUTE]

### Todoist - Completar Tarefa
[EXECUTE:COMPLETE_TASK]
id: task_id
[/EXECUTE]

### Todoist - Reabrir Tarefa
[EXECUTE:REOPEN_TASK]
id: task_id
[/EXECUTE]

### Todoist - Deletar Tarefa
[EXECUTE:DELETE_TASK]
id: task_id
[/EXECUTE]

### Todoist - Ler Tarefa
[EXECUTE:GET_TASK]
id: task_id
[/EXECUTE]

### Todoist - Atualizar Tarefa
[EXECUTE:TODOIST_UPDATE_TASK]
id: task_id
content: (opcional)
description: (opcional)
due: (opcional) today|tomorrow|YYYY-MM-DD|...
priority: (opcional) 1-4
labels: (opcional) a,b,c
project: (opcional) id_ou_nome
[/EXECUTE]

### Todoist - Comentar em Tarefa
[EXECUTE:TODOIST_ADD_COMMENT]
id: task_id
content: texto do comentário
[/EXECUTE]

### Todoist - Listar Projetos
[EXECUTE:TODOIST_LIST_PROJECTS]
[/EXECUTE]

### Todoist - Listar Labels
[EXECUTE:TODOIST_LIST_LABELS]
[/EXECUTE]

### CRM - Buscar pessoa
[EXECUTE:PEOPLE_SEARCH]
query: nome
workspace: freelaw|pessoal (opcional)
[/EXECUTE]

### CRM - Criar/Atualizar pessoa
[EXECUTE:PEOPLE_UPSERT]
name: Nome completo
email: email@dominio.com (opcional)
role: Cargo (opcional)
channels: WhatsApp, Telegram (opcional)
tags: a,b,c (opcional)
source: link (opcional)
notes: texto livre (opcional)
workspace: freelaw|pessoal (opcional; padrão: contexto do chat)
[/EXECUTE]

### Todoist - Tarefas de uma pessoa (assignee)
[EXECUTE:TODOIST_TASKS_FOR_PERSON]
person: Clariny (nome ou email)
project: Gestão Financeira - Freelaw (opcional; no contexto freelaw é padrão)
filter: today | overdue (opcional)
[/EXECUTE]

${
  notionAvailable
    ? `### Notion - Buscar
[EXECUTE:NOTION_SEARCH]
query: termo de busca
[/EXECUTE]

### Notion - Ler Página
[EXECUTE:NOTION_FETCH]
id: page_id ou URL
[/EXECUTE]`
    : ''
}

### Google Calendar - Eventos de Hoje
[EXECUTE:CALENDAR_TODAY]
[/EXECUTE]

### Google Calendar - Eventos de um Dia (hoje/amanhã/data)
[EXECUTE:CALENDAR_DAY]
when: tomorrow|today|YYYY-MM-DD
max: 80 (opcional)
[/EXECUTE]

### Google Calendar - Eventos da Semana
[EXECUTE:CALENDAR_WEEK]
[/EXECUTE]

### Google Calendar - Próximo Evento
[EXECUTE:CALENDAR_NEXT]
[/EXECUTE]

### Google Calendar - Criar Evento Rápido
[EXECUTE:CALENDAR_QUICK]
text: Reunião com João amanhã às 14h
[/EXECUTE]

### Google - Listar Contas Conectadas
[EXECUTE:GOOGLE_LIST_ACCOUNTS]
[/EXECUTE]

### Google - Selecionar Conta Ativa (para ações no pool pessoal)
[EXECUTE:GOOGLE_SET_ACCOUNT]
email: guilhermeplbarros@gmail.com
[/EXECUTE]

### Google Drive - Listar arquivos/pastas
[EXECUTE:DRIVE_LIST]
q: 'root' in parents and trashed=false and mimeType='application/vnd.google-apps.folder' (opcional)
folderId: root (opcional; alternativa ao q)
max: 30 (opcional)
orderBy: modifiedTime desc (opcional)
[/EXECUTE]

### Google Drive - Criar pasta (ação mutável)
[EXECUTE:DRIVE_CREATE_FOLDER]
name: 00 - Inbox
parentId: root (opcional)
account: email@conta.com (opcional; no pool use GOOGLE_SET_ACCOUNT)
[/EXECUTE]

### Google Drive - Renomear (ação mutável)
[EXECUTE:DRIVE_RENAME]
id: fileId
name: Novo nome
account: email@conta.com (opcional; no pool use GOOGLE_SET_ACCOUNT)
[/EXECUTE]

### Google Drive - Mover entre pastas (ação mutável)
[EXECUTE:DRIVE_MOVE]
id: fileId
toParentId: folderIdDestino
fromParentId: folderIdOrigem (opcional; recomendado)
account: email@conta.com (opcional; no pool use GOOGLE_SET_ACCOUNT)
[/EXECUTE]

### Google Drive - Ler texto de Google Doc (consulta)
[EXECUTE:DRIVE_READ_TEXT]
id: fileId
[/EXECUTE]

### Google Drive - Limpar pastas vazias (dry-run por padrão)
[EXECUTE:DRIVE_CLEAN_EMPTY_FOLDERS]
folderId: root
maxDepth: 2 (opcional)
mode: dry_run|apply (opcional; padrão: dry_run)
trash: true|false (opcional; se true, manda APENAS pastas vazias para lixeira)
quarantineName: 🧹 _Empty Folders (quarentena) (opcional)
account: email@conta.com (opcional; no pool use GOOGLE_SET_ACCOUNT)
[/EXECUTE]

### Google Drive - Organizar pasta Allu (por regras de nome)
[EXECUTE:DRIVE_ORGANIZE_ALLU]
folderId: <id da pasta Allu>
mode: dry_run|apply (opcional; padrão: dry_run)
account: local|email@conta.com (opcional)
[/EXECUTE]

### Google Calendar - Listar Calendários
[EXECUTE:CALENDAR_LIST_CALENDARS]
[/EXECUTE]

### Google Calendar - Buscar Eventos
[EXECUTE:CALENDAR_SEARCH]
query: termo
days: 14
max: 20
[/EXECUTE]

### Google Calendar - Investigar Compromisso (com evidências)
[EXECUTE:CALENDAR_INVESTIGATE]
query: termo (ex: nome/título)
when: tomorrow|today|YYYY-MM-DD (opcional)
days: 3 (opcional)
max: 20 (opcional)
[/EXECUTE]

### Google Calendar - Ler Evento por ID (no pool: email::id)
[EXECUTE:CALENDAR_GET_EVENT]
id: email::eventId
[/EXECUTE]

### Google Calendar - Criar Evento (campos)
[EXECUTE:CALENDAR_CREATE]
summary: Reunião
start: 2026-01-15T14:00:00-03:00
end: 2026-01-15T14:30:00-03:00
attendees: a@b.com, c@d.com (opcional)
location: (opcional)
description: (opcional)
meet: true|false (opcional)
account: email@conta.com (opcional; no pool use GOOGLE_SET_ACCOUNT)
[/EXECUTE]

### Google Calendar - Atualizar Evento (no pool: email::id ou selecione conta ativa)
[EXECUTE:CALENDAR_UPDATE]
id: email::eventId
summary: (opcional)
start: (opcional)
end: (opcional)
attendees: (opcional)
location: (opcional)
description: (opcional)
[/EXECUTE]

### Google Calendar - Deletar Evento (no pool: email::id ou selecione conta ativa)
[EXECUTE:CALENDAR_DELETE]
id: email::eventId
[/EXECUTE]

### Gmail - Emails Não Lidos
[EXECUTE:GMAIL_UNREAD]
max: 10
[/EXECUTE]

### Gmail - Emails Importantes
[EXECUTE:GMAIL_IMPORTANT]
[/EXECUTE]

### Gmail - Buscar Emails
[EXECUTE:GMAIL_SEARCH]
query: from:alguem@email.com
max: 10
[/EXECUTE]

### Gmail - Ler Email
[EXECUTE:GMAIL_READ]
id: message_id
[/EXECUTE]

### Gmail - Marcar como lido
[EXECUTE:GMAIL_MARK_READ]
ids: email::id1, email::id2
[/EXECUTE]

### Gmail - Marcar como não lido
[EXECUTE:GMAIL_MARK_UNREAD]
ids: email::id1, email::id2
[/EXECUTE]

### Gmail - Arquivar (remover da Inbox)
[EXECUTE:GMAIL_ARCHIVE]
ids: email::id1, email::id2
[/EXECUTE]

### Gmail - Lixeira
[EXECUTE:GMAIL_TRASH]
ids: email::id1, email::id2
[/EXECUTE]

### Gmail - Listar Labels
[EXECUTE:GMAIL_LIST_LABELS]
[/EXECUTE]

### Gmail - Adicionar Label
[EXECUTE:GMAIL_ADD_LABEL]
ids: email::id1, email::id2
label: NomeDaLabelOuId
[/EXECUTE]

### Gmail - Remover Label
[EXECUTE:GMAIL_REMOVE_LABEL]
ids: email::id1, email::id2
label: NomeDaLabelOuId
[/EXECUTE]

### Gmail - Enviar Email
[EXECUTE:GMAIL_SEND]
to: a@b.com, c@d.com
cc: (opcional)
bcc: (opcional)
subject: Assunto
body: Corpo do email
account: email@conta.com (opcional; no pool use GOOGLE_SET_ACCOUNT)
[/EXECUTE]

### Gmail - Criar Rascunho
[EXECUTE:GMAIL_DRAFT]
to: a@b.com
subject: Assunto
body: Corpo
account: email@conta.com (opcional; no pool use GOOGLE_SET_ACCOUNT)
[/EXECUTE]

### Gmail - Responder (no pool: email::id)
[EXECUTE:GMAIL_REPLY]
id: email::messageId
body: Texto da resposta
[/EXECUTE]

### Gmail - Encaminhar (no pool: email::id)
[EXECUTE:GMAIL_FORWARD]
id: email::messageId
to: destino@x.com
body: (opcional) texto introdutório
[/EXECUTE]

### Tempo - Previsão do tempo (Tomorrow.io)
[EXECUTE:WEATHER_FORECAST]
location: lat,lon ou texto (opcional)
hours: 8 (opcional)
days: 1 (opcional)
[/EXECUTE]

### Tempo - Definir localização padrão (por chat)
[EXECUTE:WEATHER_SET_DEFAULT_LOCATION]
location: Belo Horizonte, MG (ou lat,lon)
label: Belo Horizonte - MG (opcional)
[/EXECUTE]

## BASE DE NOTAS (SUPABASE)

- As notas são salvas em **Supabase** (tabela "notes") como fonte de verdade.
- A recuperação (“lembrar/buscar”) pode usar **Supermemory** como índice, mas sempre carregue o conteúdo final do Supabase.

## REGRAS IMPORTANTES

1. **NUNCA execute ações externas/irreversíveis sem confirmação** (email, evento, concluir tarefa, etc.)
2. **Pode registrar notas automaticamente** quando o usuário estiver te passando informações para guardar
2. **Seja conversacional** - não pareça um robô
3. **Seja específico** nas propostas - diga exatamente o que vai fazer
4. **Pode fazer múltiplas ações** em sequência após uma confirmação
5. **Cross-platform**: pode ler do Notion e criar notas no Supabase/Todoist
6. **Palavras de confirmação**: sim, pode, ok, vai, faz, isso, confirmo, por favor, manda
7. **Palavras de negação**: não, cancela, espera, para, deixa

## REGRA DE QUALIDADE (MUITO IMPORTANTE)

Quando o usuário pedir **prioridades / próximos projetos / planejamento**:
1. Busque contexto nas notas (Supabase) via SEARCH_VAULT sobre o tema e período (ex.: Q1 2026, comunidade).
2. Se fizer sentido, consulte tarefas (LIST_TASKS) e agenda (CALENDAR_WEEK ou CALENDAR_TODAY) para contexto de carga.
3. Responda de forma **analítica e propositiva**, com:
   - Contexto (o que você entendeu)
   - Opções (2–4 caminhos) com prós/contras
   - Recomendação (top 1–2) e por quê
   - Próximos passos (ações concretas)
   - Perguntas (no máximo 1–2) para refinar

## ANTI-GENERICIDADE (CRÍTICO)

Evite respostas com “dicas gerais” e explicações de como planejar.
O usuário quer sugestões **direcionadas**. Regras:
1. Antes de sugerir, use o contexto disponível (Todoist/Calendar/Notes no Supabase).
2. Cada sugestão deve estar ligada a **algo específico** encontrado (tarefa, evento, nota, KPI) OU ser marcada como hipótese explícita.
3. Se faltar informação essencial, faça **1 pergunta** objetiva (no máximo 2).
4. Para foco do mês, prefira:
   - Top 3 focos (com “por quê” e “o que fazer na prática”)
   - Riscos/Trade-offs
   - 1 pergunta para calibrar (se necessário)

## EXEMPLOS DE CONVERSA

**Usuário:** quero anotar sobre a reunião de hoje com financeiro
**Cortex:** Entendi! Vou criar uma nota de reunião em Profissional com as informações que você passar. Me conta o que foi discutido?

**Usuário:** decidimos aprovar budget de Q1 em 50k e revisar contratos
**Cortex:** Perfeito! Vou fazer o seguinte:

📝 **Criar nota no Supabase (notes):**
- Título: "Reunião Financeiro - Budget Q1"
- Conteúdo: Decisões sobre budget e contratos

✅ **Criar tarefas no Todoist:**
- "Revisar contratos - follow-up reunião financeiro"

Posso prosseguir?

**Usuário:** pode
**Cortex:** [EXECUTA AS AÇÕES]

---

**Usuário:** busca no notion sobre comunidade e me faz um resumo nas notas
**Cortex:** Vou buscar informações sobre Comunidade no Notion e depois criar um resumo organizado nas suas notas (Supabase). Posso começar?

**Usuário:** sim
**Cortex:** [EXECUTE:NOTION_SEARCH]query: comunidade[/EXECUTE]

[Após receber resultados, continua a conversa propondo criar a nota]

---

**Usuário:** o que tenho pra hoje na agenda?
**Cortex:** [EXECUTE:CALENDAR_TODAY][/EXECUTE]

[Após receber eventos, apresenta de forma resumida e conversacional]

---

**Usuário:** algum email importante não lido?
**Cortex:** [EXECUTE:GMAIL_IMPORTANT][/EXECUTE]

[Apresenta os emails importantes de forma clara]

---

**Usuário:** qual meu próximo compromisso?
**Cortex:** [EXECUTE:CALENDAR_NEXT][/EXECUTE]

[Mostra o próximo evento com horário e detalhes relevantes]`
  }

  private getState(chatId: number): ConversationState {
    if (!this.conversations.has(chatId)) {
      const base: ConversationState = {
        messages: [],
        pendingActions: [],
        awaitingConfirmation: false,
        lastPrefetchKey: undefined,
      }
      const loaded = this.loadPersistedState(chatId)
      this.conversations.set(chatId, loaded || base)
    }
    return this.conversations.get(chatId)!
  }

  private shouldPersistLocally(): boolean {
    const v = (process.env.CORTEX_BRAIN_PERSIST_LOCAL || '').toString().trim().toLowerCase()
    return v === '1' || v === 'true' || v === 'yes' || v === 'on'
  }

  private getLocalPersistDir(): string {
    const home = process.env.HOME || process.env.USERPROFILE || '.'
    return path.join(home, '.obsidian-manager', 'brain-state')
  }

  private getLocalPersistPath(chatId: number): string {
    return path.join(this.getLocalPersistDir(), `chat-${chatId}.json`)
  }

  private loadPersistedState(chatId: number): ConversationState | null {
    try {
      if (!this.shouldPersistLocally()) return null
      const p = this.getLocalPersistPath(chatId)
      if (!fs.existsSync(p)) return null
      const raw = fs.readFileSync(p, 'utf-8')
      const parsed = raw ? (JSON.parse(raw) as Partial<ConversationState>) : null
      if (!parsed) return null
      const messages = Array.isArray(parsed.messages)
        ? (parsed.messages.slice(-30) as Message[])
        : []
      const pendingActions = Array.isArray(parsed.pendingActions)
        ? (parsed.pendingActions as PendingAction[])
        : []
      const awaitingConfirmation = Boolean(parsed.awaitingConfirmation)
      return {
        messages,
        pendingActions,
        awaitingConfirmation,
        lastNotionData:
          typeof parsed.lastNotionData === 'string' ? parsed.lastNotionData : undefined,
        lastPrefetchKey:
          typeof parsed.lastPrefetchKey === 'string' ? parsed.lastPrefetchKey : undefined,
        lastMemoryKey: typeof parsed.lastMemoryKey === 'string' ? parsed.lastMemoryKey : undefined,
        lastMemoryIngestKey:
          typeof parsed.lastMemoryIngestKey === 'string' ? parsed.lastMemoryIngestKey : undefined,
        lastAutoRetrieveKey:
          typeof parsed.lastAutoRetrieveKey === 'string' ? parsed.lastAutoRetrieveKey : undefined,
      }
    } catch {
      return null
    }
  }

  private persistState(chatId: number, state: ConversationState): void {
    try {
      if (!this.shouldPersistLocally()) return
      const dir = this.getLocalPersistDir()
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const p = this.getLocalPersistPath(chatId)
      const payload: ConversationState = {
        ...state,
        messages: (state.messages || []).slice(-30),
        pendingActions: state.pendingActions || [],
        awaitingConfirmation: Boolean(state.awaitingConfirmation),
      }
      fs.writeFileSync(p, JSON.stringify(payload, null, 2))
    } catch {
      // ignore persistence errors
    }
  }

  private clearPersistedState(chatId: number): void {
    try {
      if (!this.shouldPersistLocally()) return
      const p = this.getLocalPersistPath(chatId)
      if (fs.existsSync(p)) fs.unlinkSync(p)
    } catch {
      // ignore
    }
  }

  private isConfirmation(text: string): boolean {
    const confirmWords = [
      'sim',
      'pode',
      'ok',
      'vai',
      'faz',
      'isso',
      'confirmo',
      'por favor',
      'manda',
      'bora',
      'vamos',
      'yes',
      'go',
      'blz',
      'beleza',
      'perfeito',
      'manda ver',
      'tá bom',
      'ta bom',
      'certo',
      'fechado',
    ]
    const lower = text.toLowerCase().trim()
    return confirmWords.some((w) => lower.includes(w) || lower === w)
  }

  private isNegation(text: string): boolean {
    const negWords = [
      'não',
      'nao',
      'cancela',
      'espera',
      'para',
      'deixa',
      'no',
      'cancel',
      'stop',
      'aguarda',
      'perai',
      'calma',
    ]
    const lower = text.toLowerCase().trim()
    return negWords.some((w) => lower.includes(w) || lower === w)
  }

  async chat(chatId: number, userMessage: string): Promise<BrainResponse> {
    const state = this.getState(chatId)
    const deliberate = this.shouldDeliberate(userMessage)
    const { model, temperature, maxTokens } = this.getModelConfig(deliberate)

    // Prefetch context for planning/priorities to avoid generic answers.
    await this.prefetchContextIfHelpful(state, userMessage)

    // Check if this is a confirmation/negation of pending actions
    if (state.awaitingConfirmation && state.pendingActions.length > 0) {
      if (this.isConfirmation(userMessage)) {
        // Execute pending actions
        const out = await this.executePendingActions(chatId)
        // executePendingActions clears state; persist the cleared state
        const st2 = this.getState(chatId)
        if (!st2.awaitingConfirmation && st2.pendingActions.length === 0)
          this.clearPersistedState(chatId)
        else this.persistState(chatId, st2)
        return out
      } else if (this.isNegation(userMessage)) {
        state.pendingActions = []
        state.awaitingConfirmation = false
        this.clearPersistedState(chatId)
        return {
          message: 'Ok, cancelei as ações. O que mais posso fazer por você?',
          needsConfirmation: false,
          pendingActions: [],
        }
      }
    }

    // Power-user mode (CLI): allow the user to send explicit [EXECUTE:...] blocks
    // and run them directly, without relying on the LLM to re-emit the same blocks.
    // Mutating actions still require explicit confirmation.
    if (/\[EXECUTE:\w+\]/.test(userMessage)) {
      const parsed = this.parseExecuteBlocks(userMessage)
      const toConfirm = parsed.filter((a) => this.mutatingActions.has(a.actionType))
      const safe = parsed.filter((a) => !this.mutatingActions.has(a.actionType))

      const results = safe.length > 0 ? await this.executeParsedActions(chatId, safe, state) : []
      const resultText = results
        .map((r) => (r.success ? `✅ ${r.summary}` : `❌ ${r.actionType}: ${r.error}`))
        .join('\n')

      if (toConfirm.length > 0) {
        state.awaitingConfirmation = true
        state.pendingActions = toConfirm.map((a) => ({
          id: `${Date.now()}-${a.actionType}`,
          description: `Executar ${a.actionType}`,
          action: a.actionType,
          params: a.params,
        }))
        this.persistState(chatId, state)
        const summary = toConfirm
          .map((a) =>
            `- ${a.actionType} ${
              Object.keys(a.params).length
                ? `(${Object.entries(a.params)
                    .map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`)
                    .join(', ')})`
                : ''
            }`.trim()
          )
          .join('\n')
        return {
          message: [
            resultText ? `${resultText}\n` : '',
            `\nPara eu executar as ações mutáveis abaixo, me confirme com "sim":\n${summary}\n\nOu diga "não" para cancelar.`,
          ]
            .join('')
            .trim(),
          needsConfirmation: true,
          pendingActions: state.pendingActions,
        }
      }

      return { message: resultText || 'Pronto!', needsConfirmation: false, pendingActions: [] }
    }

    // Add user message to history
    state.messages.push({ role: 'user', content: userMessage })

    // Keep history manageable
    if (state.messages.length > 30) {
      state.messages = state.messages.slice(-30)
    }

    try {
      const notionAvailable = !!this.notionSearch

      // Optional: auto-ingest "memory-like" user messages (ex: "lembre que ...").
      // This avoids relying on the model to emit [EXECUTE:SUPER_MEMORY_ADD].
      await this.autoIngestSupermemoryIfEnabled(state, chatId, userMessage)

      // Optional: prefetch long-term memory (Supermemory) and inject into internal context.
      await this.prefetchSupermemoryIfEnabled(state, chatId, userMessage)

      // If we have internal data (from tools/prefetch), include it in the prompt so
      // the assistant can answer immediately (without needing an extra tool call).
      const internalData = (state.lastNotionData || '').trim()

      // Hard guarantee: for recall-like questions, answer from Supermemory directly
      // (avoid the model defaulting to SEARCH_VAULT).
      const recallAnswer = await this.answerRecallFromSupermemory(chatId, userMessage)
      if (recallAnswer) {
        const out = this.appendSourcesIfEnabled(recallAnswer, internalData)
        state.messages.push({ role: 'assistant', content: out })
        return { message: out, needsConfirmation: false, pendingActions: [] }
      }

      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              this.getSystemPrompt(notionAvailable) +
              (this.externalRules
                ? `\n\n## REGRAS EXTERNAS (Vault)\n\n${this.externalRules}\n`
                : ''),
          },
          ...(internalData
            ? [
                {
                  role: 'system' as const,
                  content:
                    `Você também recebeu DADOS INTERNOS (resultado de buscas/integrações/memória).\n` +
                    `- Use para responder com precisão.\n` +
                    `- NÃO mostre dumps/bruto.\n` +
                    `- Se houver contradição, aponte e pergunte 1 coisa objetiva.\n\n` +
                    `[DADOS INTERNOS - NÃO MOSTRAR RAW]\n${internalData.substring(0, 6500)}`,
                },
              ]
            : []),
          ...state.messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ],
        temperature,
        max_tokens: maxTokens,
      })
      await this.logOpenAiUsage(chatId, model, response.usage as any)

      const assistantMessage = response.choices[0].message.content || ''
      // Guardrail: if the model "stalls" (e.g. "vou buscar... um momento") without executing tools,
      // we auto-run a minimal retrieval and answer in the SAME turn.
      let finalAssistantMessage = assistantMessage
      const hasExecuteTags0 =
        /\[EXECUTE:\w+\]/.test(finalAssistantMessage) ||
        /\bEXECUTE:\w+\b/.test(finalAssistantMessage)
      const internal0 = (state.lastNotionData || '').trim()
      const key = this.normalizeText(userMessage).slice(0, 140)
      const alreadyTried = state.lastAutoRetrieveKey === key
      if (
        !alreadyTried &&
        !hasExecuteTags0 &&
        internal0.length === 0 &&
        this.isStallingAnswer(finalAssistantMessage)
      ) {
        state.lastAutoRetrieveKey = key
        try {
          // Minimal: search notes (Supabase) using existing tool registry.
          await this.executeAction(chatId, 'SEARCH_VAULT', { query: userMessage }, state)
          const internal1 = (state.lastNotionData || '').trim()
          if (internal1.length > 0) {
            const resp2 = await this.client.chat.completions.create({
              model,
              messages: [
                {
                  role: 'system',
                  content:
                    this.getSystemPrompt(notionAvailable) +
                    (this.externalRules
                      ? `\n\n## REGRAS EXTERNAS (Vault)\n\n${this.externalRules}\n`
                      : ''),
                },
                {
                  role: 'system' as const,
                  content:
                    `Você recebeu DADOS INTERNOS (resultado de buscas/integrações).\n` +
                    `Responda AGORA ao usuário usando esses dados.\n` +
                    `- NÃO diga "vou buscar"/"um momento".\n` +
                    `- Se ainda faltar evidência, faça no máximo 1 pergunta objetiva.\n\n` +
                    `[DADOS INTERNOS - NÃO MOSTRAR RAW]\n${internal1.substring(0, 6500)}`,
                },
                ...state.messages.map((m) => ({
                  role: m.role as 'user' | 'assistant',
                  content: m.content,
                })),
              ],
              temperature: deliberate ? Math.min(0.25, temperature) : temperature,
              max_tokens: maxTokens,
            })
            await this.logOpenAiUsage(chatId, model, resp2.usage as any)
            finalAssistantMessage = resp2.choices[0].message.content || finalAssistantMessage
          }
        } catch {
          // ignore auto-retrieve failures; fall back to model text
        }
      }

      const assistantMessageWithSources = this.appendSourcesIfEnabled(
        finalAssistantMessage,
        (state.lastNotionData || '').trim()
      )
      state.messages.push({ role: 'assistant', content: assistantMessageWithSources })

      // For deep mode (and no tool execution), refine once to get more analytical/propositive answers.
      if (
        deliberate &&
        !(/\[EXECUTE:\w+\]/.test(assistantMessage) || /\bEXECUTE:\w+\b/.test(assistantMessage))
      ) {
        const refined = await this.refineAnswer(chatId, state, assistantMessageWithSources)
        // Replace the last assistant message with refined version
        state.messages.pop()
        state.messages.push({
          role: 'assistant',
          content: this.appendSourcesIfEnabled(refined, internalData),
        })
      }

      // Check if response contains EXECUTE tags (AI wants to execute now)
      const finalAssistantMessage2 =
        state.messages[state.messages.length - 1]?.content || assistantMessageWithSources
      const hasExecuteTags =
        /\[EXECUTE:\w+\]/.test(finalAssistantMessage2) ||
        /\bEXECUTE:\w+\b/.test(finalAssistantMessage2)

      if (hasExecuteTags) {
        // Guardrails: if the model tries to execute mutating actions without confirmation,
        // we stage them and ask for explicit confirmation.
        const parsed = this.parseExecuteBlocks(finalAssistantMessage2)
        const toConfirm = parsed.filter((a) => this.mutatingActions.has(a.actionType))
        const safe = parsed.filter((a) => !this.mutatingActions.has(a.actionType))

        // Execute safe actions immediately (read-only + note capture)
        const results = safe.length > 0 ? await this.executeParsedActions(chatId, safe, state) : []
        const cleanMessage = this.removeExecuteTags(finalAssistantMessage2)

        if (toConfirm.length > 0) {
          state.awaitingConfirmation = true
          state.pendingActions = toConfirm.map((a) => ({
            id: `${Date.now()}-${a.actionType}`,
            description: `Executar ${a.actionType}`,
            action: a.actionType,
            params: a.params,
          }))
          this.persistState(chatId, state)

          const summary = toConfirm
            .map((a) =>
              `- ${a.actionType} ${
                Object.keys(a.params).length
                  ? `(${Object.entries(a.params)
                      .map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`)
                      .join(', ')})`
                  : ''
              }`.trim()
            )
            .join('\n')

          const prefix = results.length
            ? results
                .map((r) => (r.success ? `✅ ${r.summary}` : `❌ ${r.actionType}: ${r.error}`))
                .join('\n')
            : ''

          return {
            message: [
              cleanMessage,
              prefix ? `\n${prefix}` : '',
              `\n\nPara eu executar as ações mutáveis abaixo, me confirme com "sim":\n${summary}\n\nOu diga "não" para cancelar.`,
            ]
              .join('')
              .trim(),
            needsConfirmation: true,
            pendingActions: state.pendingActions,
          }
        }

        const followupNeeded = this.shouldGenerateFollowup(results, state)
        if (followupNeeded) {
          // Remove the "execute-tagged" assistant message from history to avoid loops.
          state.messages.pop()
          const finalMessage = await this.generateFollowupAnswer(
            chatId,
            state,
            cleanMessage,
            results
          )
          state.messages.push({ role: 'assistant', content: finalMessage })
          return {
            message: finalMessage,
            needsConfirmation: false,
            pendingActions: [],
          }
        }

        // Simple actions: append compact results
        const resultText = results
          .map((r) => (r.success ? `✅ ${r.summary}` : `❌ ${r.actionType}: ${r.error}`))
          .join('\n')

        return {
          message: (cleanMessage ? `${cleanMessage}\n\n${resultText}` : resultText).trim(),
          needsConfirmation: false,
          pendingActions: [],
        }
      }

      // Check if AI is proposing actions (asking for confirmation)
      const isProposing = this.detectProposal(assistantMessage)

      if (isProposing) {
        state.awaitingConfirmation = true
        // Parse proposed actions from the message for later execution
        state.pendingActions = this.parseProposedActions(assistantMessage)
        this.persistState(chatId, state)
      }

      return {
        message: state.messages[state.messages.length - 1]?.content || assistantMessageWithSources,
        needsConfirmation: isProposing,
        pendingActions: state.pendingActions,
      }
    } catch (error) {
      logger.error(`Brain error: ${error instanceof Error ? error.message : 'Unknown'}`)
      throw error
    }
  }

  private detectProposal(message: string): boolean {
    const proposalIndicators = [
      'posso prosseguir',
      'posso fazer isso',
      'posso continuar',
      'posso executar',
      'confirma',
      'quer que eu',
      'devo criar',
      'devo fazer',
      'vou fazer o seguinte',
      'o plano é',
      'minha proposta',
      'o que acha',
      'tudo certo',
      'pode ser',
    ]
    const lower = message.toLowerCase()
    return proposalIndicators.some((p) => lower.includes(p))
  }

  private parseProposedActions(message: string): PendingAction[] {
    // Store the full message as context for when user confirms
    return [
      {
        id: Date.now().toString(),
        description: 'Ações propostas',
        action: 'PROPOSAL',
        params: { context: message },
      },
    ]
  }

  private async executePendingActions(chatId: number): Promise<BrainResponse> {
    const state = this.getState(chatId)
    state.awaitingConfirmation = false

    // If pending actions are real tool actions, execute them directly (guardrails).
    const onlyToolActions =
      state.pendingActions.length > 0 && state.pendingActions.every((a) => a.action !== 'PROPOSAL')
    if (onlyToolActions) {
      const actions = state.pendingActions.map((a) => ({ actionType: a.action, params: a.params }))
      state.pendingActions = []
      const results = await this.executeParsedActions(chatId, actions, state)
      const resultText = results
        .map((r) => (r.success ? `✅ ${r.summary}` : `❌ ${r.actionType}: ${r.error}`))
        .join('\n')
      return { message: resultText || 'Pronto!', needsConfirmation: false, pendingActions: [] }
    }

    // Backwards compat: if we only have a PROPOSAL blob, ask the model to emit EXECUTE blocks.
    const deliberate = this.shouldDeliberate(
      state.messages
        .slice()
        .reverse()
        .find((m) => m.role === 'user')?.content || ''
    )
    state.messages.push({ role: 'user', content: 'Confirmado. Execute as ações propostas.' })
    try {
      const { model, temperature, maxTokens } = this.getModelConfig(deliberate)
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              this.getSystemPrompt(!!this.notionSearch) +
              (this.externalRules
                ? `\n\n## REGRAS EXTERNAS (Vault)\n\n${this.externalRules}\n`
                : '') +
              '\n\nO USUÁRIO CONFIRMOU. EXECUTE AGORA usando as tags [EXECUTE:...]. NÃO peça confirmação novamente.',
          },
          ...state.messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ],
        temperature: deliberate ? Math.min(0.25, temperature) : Math.min(0.3, temperature),
        max_tokens: deliberate ? Math.max(maxTokens, 3200) : maxTokens,
      })
      await this.logOpenAiUsage(chatId, model, response.usage as any)
      const assistantMessage = response.choices[0].message.content || ''
      state.messages.push({ role: 'assistant', content: assistantMessage })
      state.pendingActions = []
      const parsed = this.parseExecuteBlocks(assistantMessage)
      const results = await this.executeParsedActions(chatId, parsed, state)
      const cleanMessage = this.removeExecuteTags(assistantMessage)
      const followupNeeded = this.shouldGenerateFollowup(results, state)
      if (followupNeeded) {
        state.messages.pop()
        const finalMessage = await this.generateFollowupAnswer(chatId, state, cleanMessage, results)
        state.messages.push({ role: 'assistant', content: finalMessage })
        return {
          message: finalMessage || 'Pronto! Ações executadas.',
          needsConfirmation: false,
          pendingActions: [],
        }
      }
      const resultText = results
        .map((r) => (r.success ? `✅ ${r.summary}` : `❌ ${r.actionType}: ${r.error}`))
        .join('\n')
      return {
        message:
          (cleanMessage ? `${cleanMessage}\n\n${resultText}` : resultText).trim() || 'Pronto!',
        needsConfirmation: false,
        pendingActions: [],
      }
    } catch (error) {
      logger.error(`Brain execution error: ${error}`)
      return {
        message: 'Ops, tive um problema ao executar. Pode tentar de novo?',
        needsConfirmation: false,
        pendingActions: [],
      }
    }
  }

  private parseExecuteBlocks(
    message: string
  ): Array<{ actionType: string; params: Record<string, string> }> {
    const normalized = this.normalizeExecuteMessage(message)
    const out: Array<{ actionType: string; params: Record<string, string> }> = []
    const executeRegex = /\[EXECUTE:(\w+)\]([\s\S]*?)\[\/EXECUTE\]/g
    let match
    while ((match = executeRegex.exec(normalized)) !== null) {
      const actionType = match[1]
      const params = this.parseParams(match[2])
      out.push({ actionType, params })
    }
    return out
  }

  private async executeParsedActions(
    chatId: number,
    actions: Array<{ actionType: string; params: Record<string, string> }>,
    state: ConversationState
  ): Promise<ExecutionOutcome[]> {
    const results: ExecutionOutcome[] = []
    for (const a of actions) {
      try {
        const result = await this.executeAction(chatId, a.actionType, a.params, state)
        results.push({ success: true, actionType: a.actionType, summary: result })
      } catch (error) {
        results.push({
          success: false,
          actionType: a.actionType,
          summary: a.actionType,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        })
      }
    }
    return results
  }

  private async processExecutions(
    chatId: number,
    message: string,
    state: ConversationState
  ): Promise<ExecutionOutcome[]> {
    // Legacy path kept for compatibility: execute everything.
    // Guardrails are enforced earlier in chat().
    return await this.executeParsedActions(chatId, this.parseExecuteBlocks(message), state)
  }

  private shouldGenerateFollowup(results: ExecutionOutcome[], state: ConversationState): boolean {
    // If we loaded any "data" into state or used query-style actions, generate a coherent final answer.
    const followupActions = new Set([
      'SEARCH_VAULT',
      'READ_NOTE',
      'NOTION_SEARCH',
      'NOTION_FETCH',
      'LIST_TASKS',
      'CALENDAR_TODAY',
      'CALENDAR_WEEK',
      'CALENDAR_NEXT',
      'GMAIL_UNREAD',
      'GMAIL_IMPORTANT',
      'GMAIL_SEARCH',
      'GMAIL_READ',
      'SUPER_MEMORY_SEARCH',
    ])
    if (state.lastNotionData && state.lastNotionData.trim().length > 0) return true
    return results.some((r) => followupActions.has(r.actionType))
  }

  private async prefetchSupermemoryIfEnabled(
    state: ConversationState,
    chatId: number,
    userMessage: string
  ): Promise<void> {
    const sm = getSupermemoryService()
    if (!sm.enabled()) return

    const on = (process.env.SUPERMEMORY_AUTO_RETRIEVE || '1').trim()
    if (on === '0' || on.toLowerCase() === 'false' || on.toLowerCase() === 'off') return

    const rawQ = (userMessage || '').trim()
    let q = rawQ
    if (q.length < 6) return

    const key = this.normalizeText(q).slice(0, 120)
    if (state.lastMemoryKey === key) return
    state.lastMemoryKey = key

    const limitEnv = Number(process.env.SUPERMEMORY_AUTO_RETRIEVE_LIMIT || 6)
    const limit = Number.isFinite(limitEnv) ? Math.max(1, Math.min(12, limitEnv)) : 6

    let workspaceId: string | undefined
    try {
      const chatDb = getChatSettingsDbService()
      if (chatDb.enabled()) workspaceId = (await chatDb.getOrCreate(chatId)).workspace_id
    } catch {
      workspaceId = undefined
    }
    const workspaceTag = workspaceId ? `ws_${workspaceId}` : undefined
    const chatTag = `chat_${chatId}`
    const primaryTag = workspaceTag || chatTag

    try {
      // Heurística: perguntas de "lembrança" costumam ser curtas e genéricas.
      // Expandimos com termos que aumentam chance de achar memórias salvas.
      const norm = this.normalizeText(rawQ)
      const isRecall =
        /\b(foco|focos|prioridade|prioridades|meta|metas|objetivo|objetivos|lembra|lembrar|relembra|relembrar)\b/i.test(
          norm
        ) || /\b(o que eu te disse|o que eu falei|o que eu tinha dito)\b/i.test(norm)
      if (isRecall) {
        const extra = ' foco prioridades metas objetivos'
        q = `${rawQ}${extra}`.trim()
      }

      // 1) busca no container principal (workspace quando existir; senão chat)
      let res = await sm.search({
        q,
        limit,
        rerank: true,
        containerTag: primaryTag,
        containerTags: [primaryTag],
      })

      // 2) fallback: se tiver workspace, tenta também pelo chat container (memórias podem ter sido salvas por chat)
      if ((!res.results || res.results.length === 0) && workspaceTag && chatTag !== primaryTag) {
        res = await sm.search({
          q,
          limit,
          rerank: true,
          containerTag: chatTag,
          containerTags: [chatTag],
        })
      }

      if (!res.results.length) return

      const formatted = res.results
        .slice(0, limit)
        .map((r, idx) => {
          const id = r.documentId || r.id || 'sem-id'
          const title = (r.title || (r.metadata && (r.metadata as any).title) || '')
            .toString()
            .trim()
          const score = typeof r.score === 'number' ? ` score=${r.score.toFixed(3)}` : ''

          const chunks =
            Array.isArray(r.chunks) && r.chunks.length
              ? r.chunks
                  .filter((c) => (c?.content || '').toString().trim().length > 0)
                  .slice(0, 2)
                  .map((c) => `> ${(c.content || '').toString().trim()}`)
                  .join('\n')
              : (r.content || '').toString().trim()

          const header = [`#${idx + 1}`, title ? `"${title}"` : '', `${id}${score}`]
            .filter(Boolean)
            .join(' ')
          return `${header}\n${chunks}`.trim()
        })
        .join('\n\n')

      const scopeLabel = primaryTag.startsWith('ws_') ? 'workspace' : 'chat'
      this.appendInternalData(
        state,
        `SUPERMEMORY (auto:${scopeLabel}) — "${q.substring(0, 80)}"`,
        formatted,
        6500
      )
    } catch (e) {
      // Never break user flow on memory retrieval errors
      const dbg = (process.env.SUPERMEMORY_DEBUG || '').trim().toLowerCase()
      if (dbg === '1' || dbg === 'true' || dbg === 'yes' || dbg === 'on') {
        const msg = e instanceof Error ? e.message : String(e)
        logger.info(`Supermemory auto-retrieve falhou: ${msg}`)
      }
    }
  }

  private shouldAutoIngestToSupermemory(text: string): boolean {
    const t = this.normalizeText(text)
    if (t.length < 8) return false

    // Intenção explícita de "guardar/lembrar"
    const explicit =
      /(lembre|guarde|registra|registre|anote|salve)\s+(que|isso|este|esta|pra|para)/i.test(t) ||
      /nao\s+(esquece|esqueca)/i.test(t) ||
      /isso\s+e\s+importante/i.test(t)
    if (explicit) return true

    // Preferências/políticas do usuário (tendem a ser memórias úteis)
    const prefs =
      /(minha|minhas|meu|meus)\s+(preferencia|preferencias|regra|regras|politica|politicas)/i.test(
        t
      ) || /(a partir de agora|daqui pra frente|sempre que|nunca|prefiro|odeio|gosto)/i.test(t)
    return prefs
  }

  private inferSupermemoryKind(text: string): string {
    const t = this.normalizeText(text)
    if (/(decidi|decidimos|combinado|acordado|vamos|ficou decidido)/i.test(t)) return 'decision'
    if (/(preferencia|prefiro|sempre que|nunca|daqui pra frente|a partir de agora)/i.test(t))
      return 'preference'
    if (/(regra|politica|guardrail)/i.test(t)) return 'policy'
    return 'note'
  }

  private makeTitleFromText(text: string): string {
    const cleaned = text.replace(/\s+/g, ' ').trim()
    if (cleaned.length <= 60) return cleaned
    return `${cleaned.slice(0, 57).trim()}...`
  }

  private async autoIngestSupermemoryIfEnabled(
    state: ConversationState,
    chatId: number,
    userMessage: string
  ): Promise<void> {
    const sm = getSupermemoryService()
    if (!sm.enabled()) return

    const on = (process.env.SUPERMEMORY_AUTO_INGEST || '1').trim()
    if (on === '0' || on.toLowerCase() === 'false' || on.toLowerCase() === 'off') return

    const msg = (userMessage || '').trim()
    if (!this.shouldAutoIngestToSupermemory(msg)) return

    const key = this.normalizeText(msg).slice(0, 140)
    if (state.lastMemoryIngestKey === key) return
    state.lastMemoryIngestKey = key

    let workspaceId: string | undefined
    try {
      const chatDb = getChatSettingsDbService()
      if (chatDb.enabled()) workspaceId = (await chatDb.getOrCreate(chatId)).workspace_id
    } catch {
      workspaceId = undefined
    }

    const workspaceTag = workspaceId ? `ws_${workspaceId}` : undefined
    const chatTag = `chat_${chatId}`
    const containerTags = Array.from(new Set([workspaceTag, chatTag].filter(Boolean))) as string[]
    const kind = this.inferSupermemoryKind(msg)
    const title = this.makeTitleFromText(msg)

    try {
      await sm.addMemory({
        content: msg,
        title,
        containerTags,
        metadata: {
          workspaceId: workspaceId || null,
          chatId,
          kind,
          title,
          source: 'cortex:auto',
        },
      })
      // We intentionally don't append raw or say "I saved it" automatically.
      // The assistant reply will naturally reflect it if needed.
    } catch {
      // Never break user flow on ingest errors
    }
  }

  private async generateFollowupAnswer(
    chatId: number,
    state: ConversationState,
    draftMessage: string,
    results: ExecutionOutcome[]
  ): Promise<string> {
    const notionAvailable = !!this.notionSearch
    const lastUser =
      state.messages
        .slice()
        .reverse()
        .find((m) => m.role === 'user')?.content || ''
    const deliberate = this.shouldDeliberate(lastUser)
    const { model, temperature, maxTokens } = this.getModelConfig(deliberate)
    const toolSummary = results
      .map((r) =>
        r.success ? `OK ${r.actionType}: ${r.summary}` : `ERR ${r.actionType}: ${r.error}`
      )
      .join('\n')

    const data = (state.lastNotionData || '').trim()
    const dataBlock = data
      ? `\n\n[DADOS INTERNOS - NÃO MOSTRAR RAW]\n${data.substring(0, 6500)}`
      : ''

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            this.getSystemPrompt(notionAvailable) +
            (this.externalRules ? `\n\n## REGRAS EXTERNAS (Vault)\n\n${this.externalRules}\n` : ''),
        },
        ...state.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        {
          role: 'system',
          content:
            `Você acabou de executar ações internas e recebeu resultados.\n` +
            `- NÃO mostre dumps/raw.\n` +
            `- Responda direto, organizado e ÚTIL.\n` +
            `- Seja propositivo: traga opções, trade-offs e uma recomendação.\n` +
            `- Faça no máximo 1–2 perguntas quando necessário.\n` +
            `- NÃO dê dicas genéricas. Faça sugestões específicas e acionáveis.\n` +
            `\n` +
            `REGRA DE AVALIAÇÃO POR PAPEL (crítica):\n` +
            `- Se o avaliado for CEO/C-level/VP (ex.: CEO, CFO, COO, VP), NÃO restrinja a avaliação a um único pilar.\n` +
            `  Avalie com visão de empresa: estratégia e direção, execução e entregas, resultados (KPIs/OKRs), liderança e pessoas,\n` +
            `  cultura, comunicação/stakeholders, qualidade de decisão, gestão de riscos e financeiro (quando aplicável).\n` +
            `  Se faltarem dados para algum pilar, explicite e faça 1 pergunta para preencher a lacuna.\n` +
            `\n` +
            `FORMATO (escolha o mais apropriado):\n` +
            `A) Avaliação de desempenho:\n` +
            `   - Resumo (3 bullets)\n` +
            `   - Evidências (com citação da fonte pelo PATH quando houver)\n` +
            `   - Pontos fortes\n` +
            `   - Pontos a melhorar\n` +
            `   - Próximos passos (ações)\n` +
            `   - Perguntas (0–2)\n` +
            `B) Projetos / prioridades / planejamento:\n` +
            `   - Contexto (1 parágrafo)\n` +
            `   - Hipóteses (se faltar info)\n` +
            `   - Opções (2–4) com prós/contras\n` +
            `   - Recomendação (top 1–2) + por quê\n` +
            `   - Próximos passos (3–6 bullets acionáveis)\n` +
            `   - Perguntas (0–2)\n` +
            `\n` +
            `- Se os dados estiverem ambíguos (vários candidatos), NÃO escolha errado: pergunte e mostre 2–3 opções.\n\n` +
            `[RESULTADOS DE AÇÕES]\n${toolSummary}${dataBlock}`,
        },
        {
          role: 'user',
          content:
            `Reescreva a resposta final ao usuário agora.\n\n` +
            `Rascunho (pode ignorar se estiver ruim):\n${draftMessage}`.trim(),
        },
      ],
      temperature: deliberate ? Math.min(0.25, temperature) : Math.min(0.3, temperature),
      max_tokens: deliberate ? Math.max(1400, Math.min(2200, maxTokens)) : Math.min(900, maxTokens),
    })
    await this.logOpenAiUsage(chatId, model, response.usage as any)

    const msg = response.choices[0].message.content || ''
    return this.removeExecuteTags(msg)
  }

  private getModelConfig(deliberate: boolean): {
    model: string
    temperature: number
    maxTokens: number
  } {
    if (deliberate) {
      return {
        model: this.deepModel,
        temperature: this.deepTemperature,
        maxTokens: this.deepMaxTokens,
      }
    }
    return {
      model: this.fastModel,
      temperature: this.fastTemperature,
      maxTokens: this.fastMaxTokens,
    }
  }

  private async refineAnswer(
    chatId: number,
    state: ConversationState,
    draft: string
  ): Promise<string> {
    // Single-pass refinement: add reasoning quality without extra questions spam.
    const notionAvailable = !!this.notionSearch
    const { model, temperature, maxTokens } = this.getModelConfig(true)
    const lastUser =
      state.messages
        .slice()
        .reverse()
        .find((m) => m.role === 'user')?.content || ''

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            this.getSystemPrompt(notionAvailable) +
            (this.externalRules ? `\n\n## REGRAS EXTERNAS (Vault)\n\n${this.externalRules}\n` : ''),
        },
        {
          role: 'system',
          content:
            `Você está no modo DEEP.\n` +
            `Refine a resposta para ser mais analítica/propositiva.\n` +
            `- Traga opções e trade-offs\n` +
            `- Feche com recomendação\n` +
            `- Faça 0–2 perguntas (somente se realmente necessário)\n` +
            `- Não invente fatos`,
        },
        {
          role: 'user',
          content: `Pergunta do usuário:\n${lastUser}\n\nRascunho:\n${draft}\n\nResposta final refinada:`,
        },
      ],
      temperature: Math.min(0.25, temperature),
      max_tokens: Math.min(1400, maxTokens),
    })
    await this.logOpenAiUsage(chatId, model, response.usage as any)

    const msg = response.choices[0].message.content || draft
    return this.removeExecuteTags(msg)
  }

  private shouldDeliberate(userMessage: string): boolean {
    const lower = userMessage.toLowerCase()
    const triggers = [
      'avali',
      'avd',
      'desempenho',
      'performance',
      'feedback',
      'ceo',
      'diret',
      'vp',
      'c-level',
      'prioridad',
      'projeto',
      'planej',
      'estrateg',
      'okr',
      'kr',
      'q1',
      'q2',
      'q3',
      'q4',
      'trade-off',
      'decis',
      'métrica',
      'metric',
      'kpi',
    ]
    return triggers.some((t) => lower.includes(t))
  }

  private appendInternalData(
    state: ConversationState,
    title: string,
    payload: string,
    limit = 6500
  ): void {
    const header = `\n\n=== ${title} ===\n`
    const next = (state.lastNotionData || '') + header + payload
    state.lastNotionData = next.length > limit ? next.substring(next.length - limit) : next
  }

  /**
   * Permite que a camada de Policy (antes do LLM) injete contexto no chat.
   * Ex: resultados de RAG (Supabase/People/Supermemory) já processados.
   */
  public prefillContext(chatId: number, title: string, payload: string, limit = 6500): void {
    const state = this.getState(chatId)
    this.appendInternalData(state, title, payload, limit)
  }

  /**
   * Limpa o contexto interno (dados de integrações) do chat, preservando o histórico.
   * Útil para evitar acúmulo de snippets antigos.
   */
  public clearPrefilledContext(chatId: number): void {
    const state = this.getState(chatId)
    state.lastNotionData = ''
    state.lastPrefetchKey = undefined
    state.lastMemoryKey = undefined
  }

  private async prefetchContextIfHelpful(
    state: ConversationState,
    userMessage: string
  ): Promise<void> {
    const lower = userMessage.toLowerCase()
    const recallLike =
      /(quais eram|quais era|qual era|o que era|lembra|relembra|o que eu te disse|o que eu falei)/i.test(
        lower
      ) ||
      (/\b(foco|focos|prioridade|prioridades|meta|metas|objetivo|objetivos)\b/i.test(lower) &&
        (/\b(era|eram|mesmo|mesma)\b/i.test(lower) || /\b(quais|qual|o que)\b/i.test(lower)))

    // Para perguntas de "lembrança", não puxe Todoist/Calendar/Vault — use memória (Supermemory) no fluxo principal.
    if (recallLike) return

    const wantsPlanning =
      /(prioridad|foco|planej|projeto|q[1-4]|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i.test(
        lower
      )
    if (!wantsPlanning) return

    // Avoid scanning the vault for "planejamento genérico" sem tópico claro.
    // Ex: "me ajuda com prioridades" -> melhor usar Todoist/Calendar e pedir contexto depois,
    // do que varrer o vault inteiro.
    const planningNoise = new Set([
      'prioridade',
      'prioridades',
      'foco',
      'planejamento',
      'planejar',
      'plano',
      'projeto',
      'projetos',
      'metas',
      'meta',
      'janeiro',
      'fevereiro',
      'marco',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
      'q1',
      'q2',
      'q3',
      'q4',
    ])
    const topicTokens = this.tokenizeQuery(userMessage).filter((t) => !planningNoise.has(t))
    if (topicTokens.length === 0) return

    // Avoid repeated prefetch spam for the same question
    const key = this.normalizeText(userMessage).slice(0, 80)
    if (state.lastPrefetchKey === key) return
    state.lastPrefetchKey = key

    // Keep focused context for planning
    state.lastNotionData = ''

    // Todoist context (if configured)
    try {
      const todoist = getTodoistService()
      const tasks = await todoist.getTasks('overdue | today | next 14 days | p1')
      const list = tasks
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 12)
        .map((t) => {
          const p = t.priority > 1 ? ` [P${5 - t.priority}]` : ''
          const d = t.due ? ` 📅 ${t.due.string}` : ''
          return `• ${t.content}${p}${d}`
        })
        .join('\n')
      if (list) this.appendInternalData(state, 'TODOIST (próximas/urgentes)', list)
    } catch {
      /* ignore */
    }

    // Calendar context (if authenticated)
    try {
      if (this.isGoogleAvailable()) {
        const calendar = getCalendarService()
        const events = await calendar.getWeekEvents()
        const list = events
          .slice(0, 12)
          .map((e) => {
            const parsed = calendar.parseEvent(e)
            const time = parsed.isAllDay
              ? 'Dia inteiro'
              : parsed.start.toLocaleString('pt-BR', {
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
            return `• ${time} - ${parsed.title}`
          })
          .join('\n')
        if (list) this.appendInternalData(state, 'CALENDAR (semana)', list)
      }
    } catch {
      /* ignore */
    }

    // Vault context: search likely sources for the topic
    try {
      const vault = getVaultService()
      // Use the user's message only; adding fixed terms tends to explode the search space.
      const query = userMessage
      const ranked = this.searchVaultRanked(vault, query)
      const top = ranked.slice(0, 3)
      if (top.length > 0 && !this.isAmbiguousSearch(ranked)) {
        for (const r of top) {
          const content = vault.readFile(r.path)
          if (!content) continue
          const clean = this.cleanObsidianContent(content).substring(0, 2200)
          this.appendInternalData(state, `FONTE: ${r.path}`, clean)
        }
      } else if (top.length > 0) {
        this.appendInternalData(
          state,
          'CANDIDATOS (ambíguo)',
          top.map((r, i) => `${i + 1}. ${r.path}`).join('\n')
        )
      }
    } catch {
      /* ignore */
    }
  }

  private isRecallQuestion(text: string): boolean {
    const t = this.normalizeText(text)
    if (t.length < 5) return false
    return (
      /(quais eram|quais era|qual era|o que era|lembra|relembra|o que eu te disse|o que eu falei)/i.test(
        t
      ) ||
      (/\b(foco|focos|prioridade|prioridades|meta|metas|objetivo|objetivos)\b/i.test(t) &&
        (/\b(era|eram|mesmo|mesma)\b/i.test(t) || /\b(quais|qual|o que)\b/i.test(t)))
    )
  }

  private compactText(s: string, max: number): string {
    const x = (s || '').replace(/\s+/g, ' ').trim()
    if (x.length <= max) return x
    return `${x.slice(0, Math.max(0, max - 3)).trim()}...`
  }

  private async answerRecallFromSupermemory(
    chatId: number,
    userMessage: string
  ): Promise<string | null> {
    const sm = getSupermemoryService()
    if (!this.isRecallQuestion(userMessage)) return null
    if (!sm.enabled()) {
      return `Minha memória (Supermemory) não está configurada neste ambiente.\n\nSe você já tem a chave, coloque em \`SUPERMEMORY_API_KEY\` no seu arquivo .env e rode de novo.\n\nQuer que eu busque nas suas notas/tarefas (vault/Supabase/Todoist) como fallback?`
    }

    // Build tags: try workspace first, then chat fallback
    let workspaceId: string | undefined
    try {
      const chatDb = getChatSettingsDbService()
      if (chatDb.enabled()) workspaceId = (await chatDb.getOrCreate(chatId)).workspace_id
    } catch {
      workspaceId = undefined
    }
    const workspaceTag = workspaceId ? `ws_${workspaceId}` : undefined
    const chatTag = `chat_${chatId}`
    const primaryTag = workspaceTag || chatTag

    const raw = (userMessage || '').trim()
    const norm = this.normalizeText(raw)
    const isRecall = this.isRecallQuestion(norm)
    const q = isRecall ? `${raw} foco prioridades metas objetivos` : raw

    try {
      const dbg = (process.env.SUPERMEMORY_DEBUG || '').trim().toLowerCase()
      const debugOn = dbg === '1' || dbg === 'true' || dbg === 'yes' || dbg === 'on'
      if (debugOn) {
        logger.info(
          `Supermemory recall direto: primaryTag=${primaryTag} workspaceTag=${workspaceTag || '-'} chatTag=${chatTag}`
        )
        logger.info(`Supermemory recall direto: q="${q.slice(0, 120)}"`)
      }

      let res = await sm.search({
        q,
        limit: 5,
        rerank: true,
        containerTag: primaryTag,
        containerTags: [primaryTag],
      })
      if ((!res.results || res.results.length === 0) && workspaceTag) {
        res = await sm.search({
          q,
          limit: 5,
          rerank: true,
          containerTag: chatTag,
          containerTags: [chatTag],
        })
      }
      if (!res.results || res.results.length === 0) {
        // For recall questions, do NOT auto-fallback to vault/todoist.
        // Ask the user explicitly if they want that fallback.
        if (debugOn) logger.info('Supermemory recall direto: 0 resultados')
        return `Eu não encontrei isso na minha memória (Supermemory) ainda.\n\nQuer que eu busque nas suas notas/tarefas (vault/Supabase/Todoist) como fallback?`
      }

      const items = res.results.slice(0, 3).map((r) => {
        const chunk = Array.isArray(r.chunks) && r.chunks.length ? r.chunks[0]?.content : undefined
        const content = (chunk || r.content || '').toString()
        const title = (r.title || (r.metadata && (r.metadata as any).title) || '').toString().trim()
        const line = this.compactText(content, 180)
        return title ? `- **${title}**: ${line}` : `- ${line}`
      })

      return [`Pelo que tenho salvo na minha memória:`, items.join('\n')].join('\n')
    } catch {
      // If it's a recall question and memory lookup fails, avoid falling back to vault automatically.
      const dbg = (process.env.SUPERMEMORY_DEBUG || '').trim().toLowerCase()
      if (dbg === '1' || dbg === 'true' || dbg === 'yes' || dbg === 'on') {
        logger.info('Supermemory recall direto falhou (answerRecallFromSupermemory).')
      }
      return `Agora mesmo eu não consegui consultar minha memória (Supermemory) para responder.\n\nQuer que eu busque isso nas suas notas/tarefas (vault/Supabase) como fallback?`
    }
  }

  /**
   * Aceita variações do formato de execução retornado pelo modelo.
   * Ex:
   * - EXECUTE:CALENDAR_TODAY
   * - [EXECUTE:CALENDAR_TODAY] (sem fechamento)
   * - [EXECUTE:CALENDAR_TODAY] ... [/EXECUTE]
   */
  private normalizeExecuteMessage(message: string): string {
    let m = message

    // Converte linhas "EXECUTE:ACTION" para o bloco esperado
    m = m.replace(
      /(^|\n)\s*EXECUTE:(\w+)\s*(?=\n|$)/g,
      (_all, prefix: string, action: string) => `${prefix}[EXECUTE:${action}]\n[/EXECUTE]`
    )

    // Se houver abertura mas não houver nenhum fechamento, fecha no final
    if (/\[EXECUTE:\w+\]/.test(m) && !/\[\/EXECUTE\]/.test(m)) {
      m += '\n[/EXECUTE]'
    }

    return m
  }

  private parseParams(content: string): Record<string, string> {
    const params: Record<string, string> = {}
    const lines = content.trim().split('\n')
    let currentKey = ''
    let currentValue = ''

    for (const line of lines) {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0 && colonIdx < 20 && !line.startsWith(' ')) {
        if (currentKey) params[currentKey] = currentValue.trim()
        currentKey = line.substring(0, colonIdx).trim().toLowerCase()
        currentValue = line.substring(colonIdx + 1)
      } else if (currentKey) {
        currentValue += '\n' + line
      }
    }
    if (currentKey) params[currentKey] = currentValue.trim()

    return params
  }

  private async executeAction(
    chatId: number,
    actionType: string,
    params: Record<string, string>,
    state: ConversationState
  ): Promise<string> {
    logger.info(`Brain executing: ${actionType}`)

    return await this.tools.execute(actionType, params, {
      chatId,
      appendInternalData: (title, payload, limit) =>
        this.appendInternalData(state, title, payload, limit),
      notion: { search: this.notionSearch, fetch: this.notionFetch },
    })
  }

  private searchVault(vault: ReturnType<typeof getVaultService>, query: string): string[] {
    // NOTE: kept for backwards compatibility; use searchVaultRanked for new logic
    return this.searchVaultRanked(vault, query).map((r) => r.path)
  }

  private cleanObsidianContent(content: string): string {
    return cleanObsidianContent(content)
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^\p{L}\p{N}\s\-_/]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private getStopwords(): Set<string> {
    return new Set([
      'a',
      'o',
      'os',
      'as',
      'um',
      'uma',
      'uns',
      'umas',
      'de',
      'do',
      'da',
      'dos',
      'das',
      'no',
      'na',
      'nos',
      'nas',
      'para',
      'pra',
      'por',
      'com',
      'sem',
      'em',
      'e',
      'ou',
      'que',
      'como',
      'qual',
      'quais',
      'quando',
      'onde',
      'porque',
      'por que',
      'porquê',
      'porquê',
      'meu',
      'minha',
      'meus',
      'minhas',
      'seu',
      'sua',
      'seus',
      'suas',
      'hoje',
      'amanha',
      'amanhã',
      'agora',
      'proximo',
      'próximo',
      'proximos',
      'próximos',
      'preciso',
      'quero',
      'ajuda',
      'ajudar',
      'ver',
      'buscar',
      'procure',
      'encontrar',
    ])
  }

  private expandSynonyms(tokens: string[]): string[] {
    const out = new Set(tokens)
    const map: Record<string, string[]> = {
      biel: ['gabriel'],
      gabriel: ['biel'],
      avaliacao: ['avaliacao', 'avaliacao', 'avd', 'performance', 'desempenho'],
      avd: ['avaliacao', 'desempenho', 'performance'],
      cards: ['card', 'okrs', 'okr'],
      card: ['cards'],
      mt: ['management', 'team'],
      weekly: ['semanal'],
      q1: ['q1', 'quarter1', 'trimestre1'],
      q2: ['q2', 'quarter2', 'trimestre2'],
      q3: ['q3', 'quarter3', 'trimestre3'],
      q4: ['q4', 'quarter4', 'trimestre4'],
    }

    for (const t of tokens) {
      const add = map[t]
      if (add) add.forEach((a) => out.add(a))
    }
    return Array.from(out)
  }

  private tokenizeQuery(query: string): string[] {
    const q = this.normalizeText(query)
    const raw = q.split(/\s+/).filter(Boolean)
    const stop = this.getStopwords()
    const tokens = raw
      .map((t) => t.replace(/^[#@]/, ''))
      .filter((t) => t.length >= 2)
      .filter((t) => !stop.has(t))
    return this.expandSynonyms(tokens)
  }

  private getSearchRootsForQuery(tokens: string[]): string[] {
    const workHints = new Set([
      'freelaw',
      'comunidade',
      'financeiro',
      'financas',
      'avaliacao',
      'avd',
      'performance',
      'cards',
      'card',
      'okr',
      'okrs',
      'mt',
      'weekly',
      'pdi',
      'lideranca',
      'liderancas',
      'biel',
      'gabriel',
      'rik',
      'richardson',
      'julia',
      'bianca',
      'amanda',
    ])

    const isWork = tokens.some((t) => workHints.has(t))
    if (isWork) {
      return ['10-AREAS/Profissional/Freelaw', '10-AREAS/Profissional', '30-PROJECTS']
    }
    return ['00-INBOX', '10-AREAS', '20-RESOURCES', '30-PROJECTS']
  }

  private scorePath(pathStr: string, tokens: string[]): { score: number; reason: string } {
    const p = this.normalizeText(pathStr)
    let score = 0
    const reasons: string[] = []

    const inFreelaw = p.includes('10-areas/profissional/freelaw')
    if (inFreelaw) {
      score += 25
      reasons.push('freelaw')
    }
    if (p.includes('30-projects')) {
      score += 12
      reasons.push('projects')
    }
    if (p.includes('20-pessoas') || p.includes('pessoas')) {
      score += 10
      reasons.push('pessoas')
    }

    // filename boost
    const file = p.split('/').pop() || p
    let fileMatches = 0
    for (const t of tokens) {
      if (!t) continue
      if (file.includes(t)) fileMatches++
    }
    if (fileMatches > 0) {
      const add = Math.min(45, fileMatches * 18)
      score += add
      reasons.push(`nome(${fileMatches})`)
    }

    // path token matches
    let pathMatches = 0
    for (const t of tokens) {
      if (!t) continue
      if (
        p.includes(`/${t}`) ||
        p.includes(`${t}-`) ||
        p.includes(`-${t}`) ||
        p.includes(`_${t}`)
      ) {
        pathMatches++
      }
    }
    if (pathMatches > 0) {
      score += Math.min(25, pathMatches * 6)
      reasons.push(`path(${pathMatches})`)
    }

    // quarter/year heuristics
    const q = tokens.find((t) => /^q[1-4]$/.test(t))
    if (q && p.includes(q)) {
      score += 10
      reasons.push(q)
    }
    const year = tokens.find((t) => /^\d{4}$/.test(t))
    if (year && p.includes(year)) {
      score += 6
      reasons.push(year)
    }

    return { score, reason: reasons.join('+') || 'geral' }
  }

  private isAmbiguousSearch(
    results: Array<{ path: string; score: number; reason: string }>
  ): boolean {
    return isAmbiguousSearch(results)
  }

  private searchVaultRanked(
    vault: ReturnType<typeof getVaultService>,
    query: string
  ): Array<{ path: string; score: number; reason: string }> {
    return searchVaultRanked(vault, query)
  }

  private removeExecuteTags(message: string): string {
    return message
      .replace(/\[EXECUTE:\w+\][\s\S]*?\[\/EXECUTE\]/g, '')
      .replace(/(^|\n)\s*EXECUTE:\w+\s*(?=\n|$)/g, '$1')
      .replace(/(^|\n)\s*\[EXECUTE:\w+\]\s*(?=\n|$)/g, '$1')
      .replace(/(^|\n)\s*\[\/EXECUTE\]\s*(?=\n|$)/g, '$1')
      .replace(/\[DADOS DO ARQUIVO[^\]]*\]:[\s\S]*$/g, '') // Remove raw data dumps
      .replace(/✅\s*(CONTEÚDO|ARQUIVOS|Encontrei)[\s\S]*?(Outros arquivos|$)/g, '') // Remove raw outputs
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  clearConversation(chatId: number): void {
    this.conversations.delete(chatId)
  }
}

let brainInstance: BrainService | null = null

export function getBrainService(): BrainService {
  if (!brainInstance) {
    brainInstance = new BrainService()
  }
  return brainInstance
}

export { BrainService }
