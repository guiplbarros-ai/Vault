# PRD — Segundo Cérebro (Telegram-first)

Este PRD consolida o que você marcou na checklist (`docs/uso-possiveis-checklist.md`) + as decisões atuais de arquitetura (`docs/arquitetura-agente-segundo-cerebro.md`) + regras de roteamento (`docs/roteamento-integracoes.md`).

## 1) Visão / resultado esperado

Um “secretário/assistente” que opera via **Telegram**, capaz de:
- **Consultar** seu conhecimento e compromissos (Supabase/Notion/Todoist/Calendar/Gmail/etc.)
- **Registrar** novos itens (notas, tarefas, decisões, follow-ups, pessoas, aniversários, finanças)
- **Ser proativo** (briefings/lembretes/triggers), respeitando guardrails e janelas de silêncio
- **Executar com segurança** (confirmações, ações proibidas, modo leitura, rollback, logs)

## 1.1) Deployment (100% cloud, always-on)

Requisito do produto:
- Rodar **100% na nuvem**, **o tempo todo**, sem depender do Obsidian/vault no seu computador.

Implicações:
- Não usar filesystem local como “source of truth”.
- O bot deve operar com:
  - **Telegram Webhook** (recomendado) para receber mensagens em cloud
  - Jobs/cron (proatividade) rodando em um worker sempre ligado

## 1.2) Source of truth (dados)

Decisão:
- **Supabase (Postgres + RLS + Storage)** é a base principal (“source of truth”) para o segundo cérebro.

Uso do Obsidian:
- Obsidian passa a ser **cliente** (opcional) para importar/exportar e editar notas, não a base “host” do backend.

## 2) Escopo (o que entra)

### Canal / UX (Telegram)
- Conversa natural com respostas curtas
- Comandos explícitos existentes continuam válidos (ex.: `/nota`, `/tarefas`)
- Mensagens longas com paginação (“enviar mais”)
- Respostas com “fontes” (caminho/link/id)
- Mensagens proativas (briefings, alertas, lembretes)

### Regras e preferências (manual)
- Regras por contexto (pessoal vs Freelaw)
- Preferências de escrita por tipo (reunião/avaliação/decisão/projeto)
- Capturar “Eu disse que…” (transformar em regra quando explícito)
- Versionamento do manual (mudanças ao longo do tempo) ✅ desejado
- Sinalização de confiança quando não houver fonte ✅ desejado

### Base de conhecimento (Supabase) + Notas (Markdown)
- Captura rápida (mensagem vira nota inbox)
- Classificação automática por tipo
- Perguntar 1 vez quando ambíguo (pessoal vs Freelaw, etc.)
- Busca por pessoa/projeto/termo e resumo em bullets
- “Ata de reunião” + decisões + próximos passos
- Criar nota + tarefas derivadas
- Enriquecer nota com dados do Notion
- Export/import com Obsidian (opcional, incremental)

### Todoist
- Criar tarefas via linguagem natural (sempre confirmar)
- Priorização por heurística/regras
- Roteamento para projeto correto
- Listas do dia + atrasadas
- Revisão semanal
- Concluir tarefas via bot
- Alertas para atrasadas importantes

### Google Calendar
- Agenda do dia/semana e próximo compromisso
- Criar evento por texto (sempre confirmar)
- Lembretes antes de eventos importantes
- Briefing pré-reunião
- Triggers por evento → mensagem no Telegram ✅ desejado
- Janela de silêncio / “não me interrompa” ✅ desejado

### Gmail
- Resumo de não lidos e “importantes”
- Buscar email por query, ler e resumir
- Sugerir respostas (rascunho) com seu estilo
- Enviar email somente com confirmação explícita
- Rotular/arquivar por automação (regras)
- Detecção de urgência → alerta ✅ desejado

### Notion
- Buscar e resumir (Freelaw e Pessoal)
- Puxar dados e registrar na base de notas (Supabase)
- Sincronização de bases Notion ↔ Supabase Notes (nível de produto; implementação pode ser incremental)

### Pessoas / relacionamentos (alto valor)
- Cadastro de pessoas (nome + datas + tags)
- Lembretes de aniversário (7 dias antes + no dia)
- Sugestão de mensagem de parabéns (seu tom)
- Registro de presentes/ideias por pessoa
- Follow-up (“faz 30 dias que não falo com X”)
- Notas sobre pessoas

### CRM (pessoal e profissional) — obrigatório no produto
- Separação por contexto (**pessoal** vs **Freelaw**) com regras de roteamento
- Registro de interações (timeline por pessoa)
- Pendências por pessoa (“o que estou esperando do X?”)
- Follow-ups automáticos (com proatividade e janela de silêncio)
- Documentação: `docs/CRM-pessoal-e-profissional.md`

### Finanças (obrigatório)
- Registrar transações (manual e/ou importadas)
- Categorias e regras de categorização
- Resumos (semana/mês), alertas e checklist de fechamento do mês
- Integração com planilhas (ex.: Sheets) quando fizer sentido
- Guardrails: nada “paga”/movimenta dinheiro — somente registrar e alertar

### Operação / confiabilidade
- Health check do bot (status + integrações)
- Fallback offline (OpenAI indisponível → manter comandos/rotinas simples)
- Backups/rollback (desfazer itens criados automaticamente)
- Fila de ações (retries controlados)
- Detecção de duplicatas

### Segurança / guardrails
- Confirmação em 2 passos para ações críticas
- Lista de ações proibidas
- Janela de silêncio
- Modo somente leitura (desejado; ainda não marcado como “x” na checklist, mas deve existir)

## 3) Fora de escopo (por agora)

Itens ainda não priorizados (não marcados com X na checklist, portanto “não obrigatório agora”):
- Botões/inline keyboard para confirmar (Telegram UI)
- “Modo silencioso” completo (além da janela de silêncio)
- Multi-chat (pessoal vs trabalho em chats separados)
- Propor horários automaticamente (buscar slots livres) — ainda não marcado
- Briefing fim do dia (18:00) — ainda não marcado
- Auditoria com “por quê” + fonte usada — ainda não marcado (mas recomendado)
- Rate limit / anti-spam — ainda não marcado (mas recomendado)
- “Citações” sempre (arquivo/ID) — ainda não marcado (mas recomendado)
- Resumo de livro/artigo e flashcards/anki — não marcado

## 4) Requisitos funcionais (lista “contratual”)

### RF-01 — Telegram é o canal principal
- Tudo deve funcionar via Telegram (consultar/registrar/confirmar/proatividade).

### RF-01.1 — Always-on cloud
- O bot deve rodar continuamente em cloud e receber mensagens via webhook.
- Proatividade (cron/triggers) deve rodar em worker sempre ligado.

### RF-02 — Guardrails obrigatórios
- Ações com efeito colateral exigem confirmação.
- Ações críticas exigem **2 passos**.
- Deve existir lista de ações proibidas.
- Deve respeitar janela de silêncio.

### RF-03 — Consultas com fontes
- Ao responder, deve incluir “de onde veio” (path/link/id) quando houver fonte.
- Quando não houver fonte, sinalizar “hipótese”.

### RF-04 — Memória e regras
- Regras por contexto (Freelaw vs pessoal).
- Preferências de escrita por tipo.
- Capturar “Eu disse que…” quando explícito.
- Versionamento do manual (registrar mudanças).

### RF-05 — Proatividade (mensagens programadas e triggers)
- Briefing diário 07:00.
- Pergunta diária curta + registrar resposta.
- Revisão semanal guiada.
- Lembretes por contexto.
- Triggers por calendário/email/tarefa → Telegram.

### RF-06 — Pessoas / aniversários
- Cadastro, aniversários, mensagens sugeridas, presentes e follow-ups.

### RF-07 — Finanças
- Registrar transações e gerar resumos.
- Alertas de contas a pagar/receber (quando houver fonte).
- Checklist de fechamento do mês.

## 5) Requisitos não-funcionais
- **Confiabilidade**: não duplicar ações, ter fila/retry e health check.
- **Observabilidade**: logs suficientes para auditoria (o que consultou/criou/quando).
- **Segurança**: autorização no Telegram e modo somente leitura.
- **Privacidade**: evitar “dump raw”; retornar sempre resumo/estrutura.
- **Segurança (dados financeiros)**:
  - RLS no Supabase
  - segregação por “workspace/user”
  - auditoria de alterações
  - backups

## 6) Dados (proposta mínima)

### Fonte de regras
- Regras e preferências ficam no Supabase (tabela), com versionamento.
- Um “export” em markdown pode existir para edição humana (opcional).

### Pessoas / aniversários (proposta)
- Tabela `people` (ex.: `id, name, tags, notes`)
- Campos de datas (ex.: `birthday_day`, `birthday_month`) e preferências por pessoa
- Itens como “presentes/ideias” podem ser sub-tabela (`people_gifts`)

### Notas (proposta)
- Tabela `notes` (markdown + metadados)
  - `id, title, body_md, type, tags, source, created_at, updated_at, context (pessoal/freelaw)`
- Para busca/IA:
  - índice de texto (FTS) e/ou tabela de chunks + embeddings (incremental)

### Finanças (proposta mínima)
- Tabelas:
  - `accounts` (contas)
  - `transactions` (lançamentos)
  - `categories` (categorias)
  - `rules` (regras de categorização)
  - `monthly_close_checklist` (fechamento do mês)
- Regras de acesso: RLS rígido e separação por workspace.

## 7) Critérios de aceitação (MVP de produto)
- Eu consigo operar só pelo Telegram:
  - consultar agenda/tarefas/emails/notas
  - registrar nota/tarefa/evento com confirmação
  - receber briefing/lembretes
  - receber lembrete de aniversário e sugestão de mensagem
- Eu consigo registrar e consultar finanças (lançamentos + resumo + checklist mensal).
- Se OpenAI cair:
  - comandos `/...` continuam funcionando
  - health check informa status
- Não há ações duplicadas (fila + idempotência básica).

