# Changelog — Cortex / Segundo Cérebro (Telegram-first)

Este arquivo registra **mudanças de produto e arquitetura** (alto nível).  
Para detalhes granulares (diff por arquivo), use o histórico do git.

## [Unreleased]

### Próximo (curto prazo)
- **Webhook Telegram (setup guiado)**: comando/fluxo para configurar `setWebhook` automaticamente (incluindo `secret_token`).
- **Guardrails v2**: deny list, dupla confirmação para ações críticas, e janela de silêncio (proatividade).
- **Tools P0 do roadmap**: Calendar range/freebusy/RSVP, Gmail range/thread/drafts, Todoist update/reschedule/delete/comments, Notes update/append/tags/delete.
- **Produção**: runbook + observabilidade mínima (logs, alertas) e hardening.

## [2026-01-13] — “baseline” documentado (estado atual do repo)

### Cloud / Always-on
- **HTTP server** com endpoints:
  - `GET /health` com ping do Supabase (quando configurado via `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`).
  - `POST /telegram/webhook` com validação opcional de `TELEGRAM_WEBHOOK_SECRET`.
  - `GET /oauth2callback` para concluir OAuth do Google e notificar o chat no Telegram.
- **Config Fly.io** via `fly.toml` (porta interna 3000, always-on com `min_machines_running=1`).

### Supabase (source of truth)
- **Schema mínimo** em `supabase/schema.sql` incluindo:
  - `workspaces` (`pessoal` e `freelaw`), `notes` (com FTS), `rules` (manual versionado + ativo), `people`/`people_gifts`, `profiles`, `facts`, `chat_settings`.
  - `google_tokens` (OAuth por workspace+conta), `usage_events`, `digest_schedules`, `memory_refresh_state/runs`, `notion_refresh_state`.
  - Finanças: `accounts`, `categories`, `transactions`.
  - **`audit_log`** (infra de auditoria).
  - **RLS habilitado** em todas as tabelas do MVP (policies ainda mínimas/pendentes).
- **Client Supabase** via service role (backend) + diagnóstico de mismatch de JWT/ref.

### Telegram UX / Operação
- Bot com **dois modos**:
  - **Polling** (dev) com lock local para evitar conflito (erro 409).
  - **Webhook** (prod) com `processUpdate()` alimentado pelo endpoint HTTP.
- **Autorização opcional** por `TELEGRAM_AUTHORIZED_USERS`.
- **Comandos e utilitários** no Telegram: notas (Supabase), Todoist, agenda (atalho), resumos/briefings, contexto (`/contexto`), config de regras (`/config`, `/regras`, `/aplicar`, `/cancelar`), debug.
- **Entrada multimídia (Telegram)**: recebe voz/áudio/foto/vídeo, baixa, tenta salvar em **Supabase Storage** (bucket configurável) e registra como nota no Supabase com metadados + signed URL (7 dias) quando possível.

### “Cérebro” / Agent / Guardrails
- **Orquestração** (`AgentService`) injeta regras:
  - Preferência por **rules no Supabase** (workspace-aware).
  - Fallback para rules no vault (dev/local).
- **Policy layer** (`PolicyService`) para classificar intent e fazer RAG best-effort (notes/people) + writeback opcional em memória.
- **BrainService** com:
  - Execução via `[EXECUTE:...]` + **ToolRegistry** (arquitetura plugável).
  - **Guardrail de confirmação**: ações mutáveis são “staged” e exigem confirmação explícita (ainda sem “dupla confirmação” por criticidade).
  - Opcional: **Fontes** na resposta (via `CORTEX_SHOW_SOURCES=1` quando houver “FONTE:” no contexto interno).

### Integrações
- **Google OAuth** (fluxo web) com persistência em `google_tokens` e seleção de conta por chat (`chat_settings.google_account_email`).
- **Todoist**, **Calendar**, **Gmail**, **Notion** e **Supermemory** já integrados como tools (com variações por workspace/contexto).
- **Memory refresh** (jobs) para refresh/indexação (Supabase → Supermemory), com suporte a disparo manual pelo Telegram.

### Lacunas conhecidas (intencionalmente ainda pendentes)
- **Setup automático do webhook do Telegram** (hoje depende de configuração externa).
- **Deny list**, **dupla confirmação** e **janela de silêncio** como guardrails formais.
- **Runbook de produção** (observabilidade, falhas, rotinas de recuperação).

