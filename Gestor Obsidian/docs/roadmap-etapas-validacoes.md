# Roadmap — etapas, validações e atuação por agentes

Este documento é o “passo a passo” de tudo que vamos construir, em etapas, com o que precisa ser validado em cada fase.  
Baseado no PRD `docs/PRD-segundo-cerebro-telegram.md`.

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

### Passo 2 — Deploy mínimo (“Hello Telegram”)
- [ ] Criar endpoint público `/health` (retorna status básico)
- [ ] Criar endpoint público `/telegram/webhook` (recebe update e responde “ok”)
- [ ] Subir isso no hosting escolhido (always-on)
- [ ] Validar: curl no `/health` funciona; Telegram chega no webhook (logs)

### Passo 3 — Telegram webhook “de verdade”
- [ ] Configurar `setWebhook` do Telegram apontando para o endpoint em cloud
- [ ] Responder mensagem simples (“bot vivo”) via webhook
- [ ] Validar: enviar mensagem no Telegram e receber resposta em <2s

### Passo 4 — Schema mínimo no Supabase (MVP)
- [ ] Tabelas: `rules`, `notes`, `people`, `accounts`, `transactions`, `categories` (mínimo)
- [ ] `audit_log` (recomendado) para registrar alterações (especialmente finanças)
- [ ] Validar: migrations aplicam; RLS protege; CRUD básico funciona

### Passo 5 — Camada de acesso a dados (Repos)
- [ ] `RulesRepository` (lê versão ativa + histórico)
- [ ] `NotesRepository` (CRUD + FTS básico)
- [ ] `PeopleRepository` (CRUD + birthdays)
- [ ] `FinanceRepository` (CRUD transações + categorias)
- [ ] Validar: pelo bot (Telegram), criar/ler uma nota e uma transação de teste

### Passo 6 — Guardrails (antes de qualquer automação)
- [ ] Confirmação para todas as ações mutáveis
- [ ] Dupla confirmação para ações críticas (email/calendar/concluir tarefa importante)
- [ ] Deny list (ações proibidas)
- [ ] Janela de silêncio (“não me interrompa”)
- [ ] Validar: tentativa de ação proibida é bloqueada + auditada

### Passo 7 — Conversa/UX (Telegram)
- [ ] Respostas curtas e estruturadas
- [ ] Paginação “enviar mais”
- [ ] “Fontes” (ids/links/paths do que foi consultado)
- [ ] Validar: buscas e resumos não “dumpam raw”, mas citam fonte quando existe

### Passo 8 — Scheduler always-on (proatividade)
- [ ] Briefing diário 07:00
- [ ] Pergunta diária (registrar resposta)
- [ ] Revisão semanal
- [ ] Validar: jobs disparam, dedupe e respeitam janela de silêncio

### Passo 9 — Pessoas (aniversários + follow-ups)
- [ ] CRUD people
- [ ] Lembrete 7 dias antes + no dia
- [ ] Sugestão de mensagem no seu tom
- [ ] Presentes/ideias por pessoa
- [ ] Follow-up “faz X dias”
- [ ] Validar: simulações e disparos reais sem spam + audit log

### Passo 10 — Finanças (MVP)
- [ ] Cadastro de contas e categorias
- [ ] Inserção de transações (manual)
- [ ] Regras de categorização
- [ ] Resumo semanal/mensal + checklist fechamento do mês
- [ ] Alertas (contas a pagar/receber quando houver fonte)
- [ ] Validar: RLS rígido + backups/restore (processo) + zero “ações financeiras” (só registro/alerta)

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
  - aniversário (simulado)

---

### M7 — Finanças (Supabase como base)
**Construir**
- Schema financeiro mínimo (`accounts`, `transactions`, `categories`, `rules`)
- Rotinas:
  - resumo semanal/mensal
  - checklist de fechamento do mês
  - alertas (contas a pagar/receber quando houver fonte)
- Integração opcional (incremental): Sheets import/export

**Validar**
- Inserção/edição segura (RLS)
- Nada executa “pagamentos” (somente registrar/alertar)
- Auditoria e backup restaurável (processo)

