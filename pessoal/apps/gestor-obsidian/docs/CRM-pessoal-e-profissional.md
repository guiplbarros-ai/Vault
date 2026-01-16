# CRM (pessoal e profissional) — Cortex

Este documento define o “CRM” do Cortex: **como registrar e consultar relacionamentos** (pessoas, histórico, pendências, follow-ups), com separação **por contexto**.

## 1) Por que CRM faz parte do PRD

Pelo PRD, o Cortex precisa:
- lembrar pessoas importantes
- registrar interações
- sugerir follow-ups
- responder “o que estou esperando do X?”
- lembrar aniversários e puxar contexto/presentes

Isso é, na prática, um CRM (mas **pessoal** e também **de trabalho**).

## 2) Separação por contexto (regra de ouro)

Você pediu **separado por contexto**. Vamos tratar como dois “workspaces” lógicos no Supabase:
- `workspace_id = "pessoal"`
- `workspace_id = "freelaw"`

Regra operacional:
- Tudo que for pessoal (família/amigos/vida pessoal) → `pessoal`
- Tudo que for Freelaw (time, stakeholders, clientes, comunidade) → `freelaw`

> Observação: no MVP, “workspace_id” é um texto. Mais tarde pode virar UUID + tabela `workspaces`.

## 3) Entidades do CRM (modelo de dados)

### 3.1 People (pessoas)
Tabela: `people`

Campos mínimos:
- `name`
- `tags[]` (ex.: `familia`, `amigos`, `time`, `stakeholder`, `cliente`)
- `notes` (observações rápidas sobre a pessoa)
- `birthday_day`, `birthday_month`
- `workspace_id` (pessoal vs freelaw)

Sub-entidade:
- `people_gifts` (ideias de presente/agrados)

### 3.2 Interactions (histórico de contato) — a criar
Tabela proposta: `interactions`

Objetivo:
- registrar “interações” como eventos do relacionamento
- permitir consultas: “última vez que falei com X”, “timeline do X”

Campos propostos:
- `person_id`
- `occurred_at` (timestamp)
- `channel` (telegram/whatsapp/email/reunião)
- `summary` (texto curto)
- `note_id` (opcional, link para uma nota mais longa)
- `workspace_id`

### 3.3 Follow-ups / Pendências — a criar
Tabela proposta: `followups` (ou `relationship_tasks`)

Objetivo:
- “o que estou esperando do X?”
- “o que eu devo fazer com X?”

Campos propostos:
- `person_id`
- `type` (waiting_on / need_to_do / remind_me)
- `due_at` (opcional)
- `status` (open/done/cancelled)
- `text` (descrição)
- `workspace_id`

## 4) Fluxos no Telegram (UX)

### 4.1 Seleção de contexto (MVP)
Comando proposto (a implementar): `/contexto pessoal` | `/contexto freelaw`
- O bot “trava” o contexto no chat, até ser trocado.
- Default: pergunta 1 vez quando estiver ambíguo.

### 4.2 Cadastro rápido de pessoa
Exemplos:
- “cadastre a pessoa João (amigo)”
- “adiciona a Julia Horta no contexto freelaw”

### 4.3 Registrar interação
Exemplos:
- “registre que falei com o Rik hoje e ele ficou de me enviar o report”
- “encontro com minha mãe: combinamos almoço domingo”

O bot deve:
- criar `interaction`
- se houver pendência (“ficou de…”) criar `followup`

### 4.4 Perguntas que o CRM precisa responder bem
- “faz quanto tempo que não falo com X?”
- “o que eu tô esperando do X?”
- “me lembra de falar com Y daqui 2 semanas”
- “qual é o aniversário do X?”
- “o que eu sei sobre o X mesmo?”

## 5) Integração com o resto do segundo cérebro

- `notes`: conteúdo longo (atas, contexto, decisões) que pode ser linkado a interações.
- `gmail/calendar/todoist`: podem gerar interações automaticamente (trigger), mas sempre com guardrails.
- `profiles`: aniversário do Guilherme é **perfil**, não “people”.

## 6) Critérios de aceitação (CRM MVP)

- Cadastro/edição de pessoas (pessoal e freelaw separados)
- Registrar interação + criar followup quando aplicável
- Consultar:
  - aniversários
  - últimos contatos
  - pendências por pessoa
- Tudo via Telegram, com confirmação quando houver escrita/alteração

