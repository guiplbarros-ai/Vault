# Roadmap — etapas, validações e atuação por agentes

Este documento é o “passo a passo” de tudo que vamos construir, em etapas, com o que precisa ser validado em cada fase.  
Baseado no PRD `docs/PRD-segundo-cerebro-telegram.md`.

## Status atual (repo) — 2026-01-13

> Nota: este status é “**o que já está implementado no código**”.  
> “Validado em produção” depende de configurar secrets/hosting e rodar smoke tests.

### ✅ Já implementado no código
- **HTTP server** com:
  - `GET /health` (inclui ping do Supabase quando configurado)
  - `POST /telegram/webhook` (validação opcional por `TELEGRAM_WEBHOOK_SECRET`)
  - `GET /oauth2callback` (OAuth Google, salva tokens no Supabase e notifica no Telegram)
- **Deploy target**: `fly.toml` + `Dockerfile` (porta 3000; always-on configurável).
- **Supabase schema mínimo** (`supabase/schema.sql`) com:
  - `workspaces`, `notes` (FTS), `rules` (manual versionado + ativo), `people`, `profiles`, `facts`, `chat_settings`
  - `google_tokens`, `usage_events`, `digest_schedules`, `memory_refresh_state/runs`, `notion_refresh_state`
  - finanças (`accounts`, `categories`, `transactions`) e `audit_log`
  - **RLS habilitado** (policies ainda são etapa seguinte)
- **Agent/Brain**:
  - Tools plugáveis via registry + protocolo `[EXECUTE:...]`
  - confirmação para ações mutáveis quando originadas pelo fluxo de IA (`BrainService`)
  - policy layer (classificação + RAG best-effort)
- **Telegram**:
  - modo **polling** (dev) e **webhook** (prod)
  - autorização opcional por `TELEGRAM_AUTHORIZED_USERS`
  - `/contexto` (pessoal vs freelaw) persistido no Supabase quando disponível
  - `/config` + versionamento de regras no Supabase (`/regras`, `/aplicar`, `/cancelar`)
  - ingestão de **voz/áudio/foto/vídeo**: salva no Supabase Storage (quando configurado) e registra como nota
  - paginação de mensagens longas

### 🟡 Parcial (existe, mas falta fechar o ciclo)
- **Webhook Telegram**: endpoint existe, mas o `setWebhook` ainda é operação externa (não tem comando guiado no CLI/bot).
- **Guardrails**: confirmação existe no fluxo de IA, mas comandos diretos (ex.: `/tarefa`, `/concluir`) ainda executam sem confirmação; falta deny list/dupla confirmação/janela de silêncio formal.
- **Entrada multimídia**: cobre voz/áudio/foto/vídeo; ainda não cobre “documentos” (PDF/etc).
- **Auditoria**: tabela `audit_log` existe; falta plugar escrita automática em todas as ações mutáveis.

## 0) Princípios (como vamos desenvolver)
- **Telegram-first**: tudo deve ser operável pelo Telegram.
- **Guardrails antes de autonomia**: segurança e confirmação vêm antes de automações complexas.
- **Evidência + fonte**: quando houver dado consultado, responder com fonte; quando não houver, sinalizar hipótese.
- **Agentes plugáveis**: agentes podem variar em quantidade; cada agente tem responsabilidade clara.
- **Cloud-first**: source of truth no **Supabase**, sem dependência do vault local.

## 1) Arquitetura “multi-agent” (papéis)

> Implementação inicial pode ser “1 agente” (orquestrador) chamando tools; a evolução é decompor em agentes especializados mantendo a mesma interface.

### Agente Orquestrador (Router/Coordinator)
Responsável por:
- interpretar a mensagem
- escolher quais agentes executar (0..N)
- consolidar a resposta final
- aplicar políticas (guardrails, janela de silêncio, ações proibidas, dupla confirmação)

### Agente de Memória/Contexto
Responsável por:
- carregar regras do Supabase (“manual”)
- buscar contexto (notes DB/people DB/glossário/timeline)
- resumir e devolver “context pack” para o orquestrador

### Agente de Planejamento
Responsável por:
- transformar pedido em plano de ações (com checagens e confirmação)
- identificar ambiguidade e gerar **no máximo 1–2 perguntas**

### Agente Executor (Tools)
Responsável por:
- executar actions via tools (Supabase Notes/People/Finance + Todoist/Calendar/Gmail/Notion)
- garantir idempotência básica e evitar duplicatas

### Agente de Proatividade/Scheduler
Responsável por:
- jobs programados (briefings, aniversários, follow-ups)
- triggers (calendar/email/tarefa) → mensagem no Telegram
- respeitar janela de silêncio e rate limits

### Agente de Segurança/Compliance (Policy)
Responsável por:
- classificar risco de uma ação
- impor dupla confirmação e “deny list”
- validar que resposta tem fonte/hipótese quando apropriado

## 2) Etapas (milestones) — o que construir + validar

## 2.1) Execução passo a passo (checklist)

> Este é o passo a passo linear (0 → produção). Use `[x]` para marcar progresso.

### Passo 0 — Decisões iniciais (30–60min)
- [ ] Escolher hosting always-on (recomendação: Fly.io, Render, Railway)
- [ ] Definir estratégia de jobs/cron (no próprio serviço vs worker separado)
- [ ] Definir estratégia de ambientes (dev/staging/prod)
- [ ] Validar: você consegue descrever “como o bot fica de pé” em 3 frases (sem Obsidian local)

### Passo 1 — Supabase (projeto + segurança mínima)
- [ ] Criar projeto no Supabase
- [ ] Criar um “workspace/user” (modelo de tenant) que vai existir em todas as tabelas
- [ ] Ativar RLS nas tabelas (quando criaremos) e definir policy mínima (somente seu user/workspace)
- [ ] Validar: nenhuma leitura/escrita funciona sem auth; com auth funciona

### Passo 1.1 — Cursor ↔ Supabase (MCP para operar rápido)
- [ ] Configurar MCP do Supabase no Cursor (`docs/mcp-supabase-cursor.md`)
- [ ] Validar: `supabase_tables` lista tabelas; `supabase_sql` roda um `select now()`

### Passo 2 — Deploy mínimo (“Hello Telegram”)
- [x] Criar endpoint público `/health` (retorna status básico) *(implementado em `src/server.ts`)*
- [x] Criar endpoint público `/telegram/webhook` (recebe update e responde “ok”) *(implementado em `src/server.ts`)*
- [ ] Subir isso no hosting escolhido (always-on)
- [ ] Validar: curl no `/health` funciona; Telegram chega no webhook (logs)

### Passo 3 — Telegram webhook “de verdade”
- [ ] Configurar `setWebhook` do Telegram apontando para o endpoint em cloud
- [ ] Responder mensagem simples (“bot vivo”) via webhook
- [ ] Validar: enviar mensagem no Telegram e receber resposta em <2s

### Passo 4 — Schema mínimo no Supabase (MVP)
- [x] Tabelas: `rules`, `notes`, `people`, `accounts`, `transactions`, `categories` (mínimo) *(definidas em `supabase/schema.sql`)*
- [x] `audit_log` (recomendado) para registrar alterações (especialmente finanças) *(definido em `supabase/schema.sql`)*
- [ ] Validar: migrations aplicam; RLS protege; CRUD básico funciona

### Passo 5 — Camada de acesso a dados (Repos)
- [x] `RulesRepository` (lê versão ativa + histórico) *(implementado como `RulesDbService`)*
- [x] `NotesRepository` (CRUD + FTS básico) *(implementado como `NotesDbService`)*
- [x] `PeopleRepository` (CRUD + birthdays) *(implementado como `PeopleDbService` + campos de birthday; jobs ainda pendentes)*
- [ ] `FinanceRepository` (CRUD transações + categorias) *(schema existe; falta service/repo + comandos/tools)*
- [ ] Validar: pelo bot (Telegram), criar/ler uma nota e uma transação de teste

### Passo 6 — Guardrails (antes de qualquer automação)
- [ ] Confirmação para todas as ações mutáveis *(parcial; no fluxo de IA sim — falta cobrir comandos diretos e “dupla confirmação”)*
- [ ] Dupla confirmação para ações críticas (email/calendar/concluir tarefa importante)
- [ ] Deny list (ações proibidas)
- [ ] Janela de silêncio (“não me interrompa”)
- [ ] Validar: tentativa de ação proibida é bloqueada + auditada

### Passo 6.5 — Integrações Google “secretário completo” (Gmail + Calendar)
- [x] Pool no `pessoal` para leituras (emails e agenda) + origem por conta `[email@...]` *(implementado via “pool” por workspace + execução por conta)*
- [x] Seleção de conta ativa para ações no `pessoal` (`GOOGLE_SET_ACCOUNT`) *(implementado; persistido por chat)*
- [x] Gmail (ações): enviar email, criar rascunho, responder/encaminhar, marcar lido/não lido, arquivar, lixeira, labels *(implementado como tools)*
- [x] Calendar (ações): criar evento (campos), atualizar, deletar, listar calendários, buscar eventos, ler evento por id *(implementado como tools)*
- [ ] Validar (Telegram): pelo menos 1 ação mutável em `pessoal` e 1 em `freelaw` com confirmação correta

### Passo 6.6 — Backlog de tools (priorizado) — **sem anexos por enquanto**

> Objetivo: o Cortex operar como “secretário”, com **busca por qualquer data/período** e execução segura (confirmação, audit log, dedupe).
> **Anexos/mídia**: o MVP já cobre **voz/áudio/foto/vídeo** (download + storage + nota).  
> Ainda ficam para depois: **documentos (PDF/etc)** e **transcrição/OCR** (Passo 7 — Entrada multimídia).

#### P0 (maior impacto imediato)
- [ ] **Calendar**
  - [ ] `CALENDAR_RANGE` (start/end + timezone): listar eventos em intervalo arbitrário (ex.: “de 10/01 a 25/02”)
  - [ ] `CALENDAR_FREEBUSY` (start/end + attendees): checar disponibilidade e sugerir horários
  - [ ] `CALENDAR_ACCEPT` / `CALENDAR_DECLINE` / `CALENDAR_TENTATIVE`: responder convites
  - [ ] `CALENDAR_INVITE_ADD` / `CALENDAR_INVITE_REMOVE`: gerenciar convidados sem recriar evento
- [ ] **Gmail**
  - [ ] `GMAIL_SEARCH_NL` (query + start/end em linguagem natural): converter datas tipo “semana retrasada” para query do Gmail
  - [ ] `GMAIL_RANGE` (query + start/end): “busca por período” de forma explícita e estável
  - [ ] `GMAIL_THREAD_READ` (ler thread completa) + `GMAIL_THREAD_REPLY` (responder mantendo thread)
  - [ ] `GMAIL_DRAFT_SEND` / `GMAIL_DRAFT_UPDATE` / `GMAIL_DRAFT_DELETE`: ciclo completo de rascunhos
- [ ] **Todoist**
  - [ ] `TODOIST_UPDATE_TASK` (editar conteúdo/due/prioridade)
  - [ ] `TODOIST_RESCHEDULE_TASK` (atalho de reagendar)
  - [ ] `TODOIST_DELETE_TASK` (ação destrutiva; confirmação reforçada)
  - [ ] `TODOIST_ADD_COMMENT` (comentários/briefings dentro da tarefa)
- [ ] **Notas (Obsidian / Notes DB)**
  - [ ] `UPDATE_NOTE` / `APPEND_NOTE` (manter notas vivas)
  - [ ] `ADD_TAGS` / `REMOVE_TAGS` (inclui `area/*`)
  - [ ] `DELETE_NOTE` (destrutivo; confirmação reforçada)

#### P1 (organização + “memória de verdade”)
- [ ] **Supabase Facts/Profiles**
  - [ ] `FACTS_SET` / `FACTS_GET` / `FACTS_SEARCH` (usar tabela `facts`)
  - [ ] `PROFILE_GET` / `PROFILE_UPDATE` (timezone/locale/preferences por workspace)
- [ ] **People/CRM**
  - [ ] `PEOPLE_CREATE` / `PEOPLE_UPDATE` / `PEOPLE_SEARCH` / `PEOPLE_GET`
  - [ ] `PEOPLE_TIMELINE_ADD` / `PEOPLE_TIMELINE_QUERY`
  - [ ] `FOLLOWUP_SET` / `FOLLOWUP_LIST` (pendências por pessoa)
- [ ] **Rules (manual)**
  - [ ] `RULES_DIFF` / `RULES_PROPOSE` / `RULES_APPLY` (fluxo do /config como tools)

#### P2 (robustez operacional e auditoria)
- [ ] **Audit / Segurança**
  - [ ] `AUDIT_LOG_WRITE` para toda ação mutável (email/evento/task/nota) com “antes/depois” quando aplicável
  - [ ] Dupla confirmação configurável por tipo de ação (ex.: enviar email e convidar pessoas)
- [ ] **Triggers e Proatividade**
  - [ ] `TRIGGER_CALENDAR_UPCOMING` (briefing pré-reunião)
  - [ ] `TRIGGER_GMAIL_URGENT` (alerta)
  - [ ] `TRIGGER_TODOIST_OVERDUE_P1` (alerta)
  - [ ] Dedupe/idempotência + rate limit + janela de silêncio (anti-spam)

#### Depois (explicitamente fora do escopo agora)
- [ ] **Anexos/Mídia (postergar)**: download de arquivos/voz/foto/vídeo, transcrição/OCR, storage e referência (ver Passo 7)

### Passo 7 — Conversa/UX (Telegram)
- [ ] Respostas curtas e estruturadas
- [x] Paginação de mensagens longas *(implementado; split automático no `TelegramService`)*
- [x] “Fontes” (ids/links/paths do que foi consultado) *(implementado via `CORTEX_SHOW_SOURCES=1` + blocos `FONTE:` no contexto)*
- [x] Roteamento automático por áreas (taxonomia): aplicar `area/*` ao salvar nota; permitir correção rápida (`/areas`, `/area <slug>`) *(implementado)*
- [ ] Captura por conversa (sem “/”): salvar notas automaticamente quando o usuário estiver “passando informação” (decisões, números, máximas) dentro do contexto do chat *(parcial; hoje cai nisso no modo “sem IA” ou quando o modelo decide salvar)*
- [x] Entrada multimídia (básica): **áudios/voz, vídeos e fotos** (capturar metadados, baixar via Telegram API e persistir referência/arquivo) *(implementado)*
- [ ] Entrada multimídia (documentos): **arquivos/documentos (PDF/etc)** *(pendente)*
- [ ] Validar: buscas e resumos não “dumpam raw”, mas citam fonte quando existe
- [ ] Validar: enviar um arquivo (ex.: PDF), um áudio/voice e um vídeo; o bot registra o recebimento com metadados + referência (link/path) para uso posterior

### Passo 8 — Scheduler always-on (proatividade)
- [x] Briefing diário 07:00 *(implementado via `/resumo` e `/proativo` + jobs)*
- [ ] Pergunta diária (registrar resposta)
- [x] Revisão semanal *(implementado via `/semanal` + jobs)*
- [ ] Validar: jobs disparam, dedupe e respeitam janela de silêncio

### Passo 9 — Pessoas (aniversários + follow-ups)
- [ ] CRUD people
- [ ] Lembrete 7 dias antes + no dia
- [ ] Sugestão de mensagem no seu tom
- [ ] Presentes/ideias por pessoa
- [ ] Follow-up “faz X dias”
- [ ] Validar: simulações e disparos reais sem spam + audit log

### Passo 9.1 — CRM (pessoal e profissional)
- [ ] Separação por contexto (workspace_id: `pessoal` vs `freelaw`)
- [ ] Registro de interações por pessoa (timeline)
- [ ] Pendências por pessoa (“waiting on” / “to do”)
- [ ] Consultas: “último contato”, “o que estou esperando do X”, “me lembra de falar com Y”
- [ ] Validar: roteamento correto + perguntas 1 vez quando ambíguo

### Passo 10 — Finanças pessoais (controle de verdade)

> Objetivo: você conseguir **registrar, consultar e fechar o mês** pelo Telegram, com dados no Supabase e auditoria.

#### Escopo (MVP)
- [x] **Base de dados (Supabase)**: `accounts`, `categories`, `transactions` *(schema já existe)*
- [ ] **Cadastro/seed**
  - [ ] Seed de contas pessoais (ex.: Nubank, Itaú, cartão, corretora)
  - [ ] Seed de categorias baseado no `docs/plano-de-contas-taxonomia-pessoal.md`
- [ ] **Inserção manual (Telegram)**
  - [ ] Comando/fluxo: “gastei R$ 34,50 no iFood no cartão Nubank” → cria `transaction`
  - [ ] Suportar: despesa, receita, transferência; conta; categoria; data; descrição; contraparte
  - [ ] Guardrail: confirmar **edição/remoção** (ações mutáveis). Criar lançamento pode ser “1 confirmação” (ou automático, se preferir).
- [ ] **Consulta**
  - [ ] “quanto gastei em mercado este mês?” / “saldo por conta” / “top 10 despesas do mês”
  - [ ] Filtros: período, categoria, conta, busca por descrição/contraparte
- [ ] **Regras de categorização (semi-automático)**
  - [ ] Sugestão de categoria por heurística (merchant/descrição) + confirmação rápida
  - [ ] Regras simples (ex.: contém “IFOOD” → Alimentação) para autopreencher
- [ ] **Resumo e fechamento**
  - [ ] Resumo semanal/mensal (totais por categoria + variação vs mês anterior)
  - [ ] Checklist de fechamento do mês (itens fixos: revisar pendências, confirmar faturas, conciliar)
- [ ] **Alertas (somente informação)**
  - [ ] Alertas de fatura/boletos/prazos **quando houver fonte** (email/nota)

#### Fora de escopo (por enquanto)
- [ ] “Executar pagamentos” / mover dinheiro (proibido — apenas registrar/alertar)
- [ ] Integração direta com bancos via Open Finance

#### Validações (críticas)
- [ ] RLS rígido + backups/restore (processo)
- [ ] Auditoria: toda criação/edição/remoção de transação gera registro (`audit_log`)
- [ ] Idempotência/dedupe (evitar lançar duplicado quando vier de import/sheets/email)

### Passo 11 — Triggers (calendar/email/todoist)
- [ ] Calendar: evento importante → briefing pré-reunião
- [ ] Gmail: urgência → alerta
- [ ] Todoist: P1 atrasada → alerta
- [ ] Validar: rate limit + dedupe + logs

### Passo 12 — Hardening de produção (último)
- [ ] Observabilidade (logs estruturados + alertas)
- [ ] Rotação de secrets
- [ ] Migrações seguras
- [ ] Rate limit/anti-loop
- [ ] Runbook (como operar e recuperar)
- [ ] Validar: simular falha (OpenAI down, Supabase down) e ver comportamento

### M0 — Cloud foundation (always-on + Supabase)
**Entregáveis**
- Doc única de PRD + roadmap
- Definição de hosting always-on (ex.: Fly.io/Render/Railway) + estratégia de deploy
- **Telegram Webhook** (cloud) e endpoint de callback
- Supabase project criado + variáveis de ambiente
- Schema inicial + RLS (workspace/user)
- Convenções de logs/auditoria (o que registrar, especialmente finanças)

**Validações**
- Bot recebe updates via webhook
- Health check mínimo inclui Supabase (conexão) + OpenAI + Telegram
- Persistência básica no Supabase (escrever/ler uma “nota” de teste)

---

### M1 — Guardrails & Operação mínima (produção básica)
**Construir**
- Autorização obrigatória no Telegram (se `TELEGRAM_AUTHORIZED_USERS` não estiver definido → warn forte + modo “read-only” opcional)
- “Ações proibidas” (deny list) + mapeamento de risco por tool
- Dupla confirmação para: enviar email, criar evento com convidados, concluir tarefa “importante”
- Janela de silêncio (“não me interrompa”)
- Health check do bot (status de: OpenAI, Telegram, Supabase, Todoist, Google auth, Notion availability)
- Fallback offline: sem OpenAI → manter comandos e rotinas pré-definidas

**Validar**
- Testes manuais de “não executar sem confirmação”
- Teste de dupla confirmação
- Teste de janela de silêncio (proatividade bloqueada)
- Teste de queda do OpenAI (bot continua em modo comandos)

---

### M2 — UX Telegram (para escalar uso real)
**Construir**
- Paginação “enviar mais” para respostas longas (via comando/trigger simples)
- Padrão de resposta: 1) resumo, 2) bullets, 3) fontes
- Confirmação com botões (inline keyboard) (opcional, se priorizar)
- Multi-chat (pessoal vs trabalho) (opcional, se priorizar)

**Validar**
- Cenários longos: busca + leitura + resumo + fontes
- “Sem dicas genéricas”: usar tarefas/agenda/notas quando houver

---

### M3 — Memória de verdade (manual, glossário, timeline)
**Construir**
- Manual/regras no Supabase como fonte real e versionada (changelog automático)
- “Eu disse que…”: parser de regras explícitas e proposta de atualização do manual (com confirmação)
- Glossário pessoal (Supabase) + tool para consultar/atualizar
- Timeline por projeto/pessoa (Supabase)
- Sinalização de confiança (hipótese vs fonte)

**Validar**
- Alterar manual e confirmar que o comportamento muda
- Auditoria de mudanças no manual
- Perguntas 1–2 quando ambíguo

---

### M4 — Pessoas (aniversários + follow-ups + presentes)
**Construir**
- Base de pessoas (Supabase “people DB”) + tool CRUD
- Job de aniversários:
  - 7 dias antes + no dia
  - sugestão de mensagem (seu tom)
  - puxar presentes/ideias associadas
- Follow-up automático (ex.: “30 dias sem falar”)

**Validar**
- Cadastro/edição de pessoa
- Disparo correto de lembrete (simulação)
- Janela de silêncio respeitada
- Mensagem sugere, não executa (ex.: não envia por você sem confirmação, se você quiser esse guardrail)

---

### M5 — Proatividade e triggers (calendar/email/todoist)
**Construir**
- Triggers do Calendar (evento importante chegando) → briefing pré-reunião
- Triggers do Gmail (email urgente) → alerta
- Triggers do Todoist (tarefa P1 atrasada) → alerta
- Fila de ações + dedupe (idempotência)

**Validar**
- Não duplicar alertas
- Rate limit / anti-loop (se começar a spammar, cortar)
- Logs “por quê” (quando aplicável)

---

### M6 — Rotinas de secretário (reuniões e triagem)
**Construir**
- Preparação de reunião (agenda + contexto + perguntas)
- Follow-up pós-reunião (ata + tarefas + rascunho de email — com confirmação)
- Triagem (inbox: emails/notas/tarefas) com checklist guiado
- Gestão de pendências por pessoa (“estou esperando X”)

**Validar**
- Cenário end-to-end: reunião → ata → tarefas → email rascunho
- Confirmar que nada “envia” sem confirmação

## 3) O que precisamos validar continuamente (checklist de validação)
- Segurança:
  - nenhuma ação mutável sem confirmação
  - dupla confirmação em ações críticas
  - deny list funcionando
- Confiabilidade:
  - dedupe/idempotência
  - fila/retry
  - fallback offline
- Qualidade:
  - fonte/hypótese
  - respostas curtas e acionáveis
  - perguntas no máximo 1–2 quando faltar info

## 4) Plano de testes (mínimo viável)
- Smoke (CLI):
  - `telegram status`
  - `telegram send`
  - `agent chat`
- E2E (manual no Telegram):
  - criar nota (confirmado)
  - criar tarefa (confirmado)
  - agenda do dia (consulta)
  - email importante (consulta)
  - enviar arquivo/áudio/vídeo (ingestão + registro de metadados/referência)
  - aniversário (simulado)

---

### M7 — Finanças (Supabase como base)
**Construir**
- [x] Schema financeiro mínimo (`accounts`, `transactions`, `categories`) *(já está em `supabase/schema.sql`)*
- [ ] Camada de acesso e comandos/tools (CRUD + consultas):
  - [ ] `FINANCE_CREATE_TRANSACTION` / `FINANCE_UPDATE_TRANSACTION` / `FINANCE_DELETE_TRANSACTION`
  - [ ] `FINANCE_LIST_TRANSACTIONS` (por período/conta/categoria)
  - [ ] `FINANCE_SUMMARY_MONTH` (totais por categoria)
- [ ] Rotinas:
  - [x] resumo semanal/mensal (infra de scheduler existe) *(falta implementar o conteúdo financeiro)*
  - [ ] checklist de fechamento do mês
  - [ ] alertas (contas a pagar/receber quando houver fonte)
- [ ] Integração opcional (incremental): Sheets import/export (via `Google Sheets`)

**Validar**
- Inserção/edição segura (RLS)
- Nada executa “pagamentos” (somente registrar/alertar)
- Auditoria e backup restaurável (processo)

