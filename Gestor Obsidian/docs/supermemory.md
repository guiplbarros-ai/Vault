# Supermemory (cloud memory) — Integração no Cortex

Este projeto é **cloud-first** (Fly + Supabase). O Supermemory entra como uma camada opcional de **memória de longo prazo** para melhorar:

- recuperação de contexto (“lembra do que já foi dito/decidido”)
- consistência em preferências e fatos estáveis
- reduzir “perguntas repetidas” quando o usuário já explicou algo antes

> O Supermemory é um **serviço externo**. Aqui assumimos que isso é aceitável para o produto (sem objeção de risco/privacidade).

## O que implementamos

### 1) Client HTTP

- `src/services/supermemory.service.ts`
  - `addMemory()` → `POST /v3/memories`
  - `search()` → `POST /v4/search`
  - Auth: header `Authorization: Bearer <SUPERMEMORY_API_KEY>`
  - Fallback automático: tenta `containerTag` e, se falhar, tenta `containerTags` (para evitar quebra por diferença de versões de API/docs).

### 2) Tools do agente

- `SUPER_MEMORY_SEARCH`
  - Busca memórias e injeta trechos no contexto interno do agente.
- `SUPER_MEMORY_ADD`
  - Salva uma memória com metadata padronizada (workspace/chat/kind/source).

Arquivos:
- `src/agent/tools/supermemory.tools.ts`
- Registradas em `src/agent/default-tools.ts`

### 3) Auto-retrieve (pré-busca automática)

No `BrainService`, antes de chamar o LLM, o app tenta buscar memórias automaticamente (se habilitado) e injeta no contexto:

- `SUPERMEMORY_AUTO_RETRIEVE=1` (padrão)
- `SUPERMEMORY_AUTO_RETRIEVE_LIMIT=6`

Isso melhora a qualidade sem exigir que o modelo “lembre de chamar uma tool” toda vez.

### 4) Auto-ingest (salvar automaticamente quando faz sentido)

Para frases explícitas do tipo “**lembre que...** / **anote...** / **guarde...**”, o app salva automaticamente no Supermemory (se habilitado):

- `SUPERMEMORY_AUTO_INGEST=1` (padrão)

### 5) Arquitetura recomendada (Supabase truth + Supermemory index)

**Supabase é o source of truth** (tabelas, RLS, auditoria, versionamento).  
**Supermemory é um índice de recuperação** (RAG/memória), não um banco primário.

Fluxo:

1. Dado nasce no Supabase (ex.: `notes`)
2. Indexamos no Supermemory **apenas um resumo + IDs** (para controlar custo de tokens)
3. Na busca, usamos Supermemory para achar os melhores IDs → depois buscamos o conteúdo real no Supabase

No código, isso está ativo para **notes**:

- Ao criar nota (`NotesDbService.createNote`): indexa best-effort no Supermemory
- Ao buscar (`SEARCH_VAULT` com Supabase): tenta Supermemory primeiro para retornar IDs e carregar as notas do Supabase

Env:

- `SUPERMEMORY_INDEX_SUPABASE_NOTES=1`
- `SUPERMEMORY_INDEX_NOTE_EXCERPT_CHARS=1400`

## Estratégia de isolamento (container / workspace / chat)

Supermemory suporta “containers” para isolar espaços de memória.

Na integração:

- **Scope padrão (`workspace`)**:
  - `containerTag = ws_<workspace_id>`
  - Se não houver workspace, cai para `chat_<chatId>`
- **Scope `chat`**:
  - `containerTag = chat_<chatId>`
  - E também grava `chatId` em `metadata` para filtros adicionais.

Isso permite:

- memórias compartilhadas por workspace (pessoal vs freelaw)
- memórias estritamente por chat quando fizer sentido

## Metadata padrão

Quando salvamos uma memória (`SUPER_MEMORY_ADD`), usamos:

```json
{
  "workspaceId": "pessoal|freelaw|...",
  "chatId": 123456,
  "kind": "note|decision|policy|preference|contact|meeting",
  "title": "opcional",
  "source": "cortex"
}
```

## Configuração (.env)

No `env.example`:

- `SUPERMEMORY_API_KEY` (**obrigatório** para habilitar)
- `SUPERMEMORY_BASE_URL` (default: `https://api.supermemory.ai`)
- `SUPERMEMORY_TIMEOUT_MS` (default: `8000`)
- `SUPERMEMORY_AUTO_RETRIEVE` (default: `1`)
- `SUPERMEMORY_AUTO_RETRIEVE_LIMIT` (default: `6`)

## Como testar rápido (CLI)

1) Configure no `.env`:

- `SUPERMEMORY_API_KEY=...`
- `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (opcional, mas recomendado para ter workspace)

2) Rode o chat do agente:

```bash
npm run dev -- agent chat --chat 123 --text "lembre que meu foco de Q1 é reduzir churn"
```

3) Peça algo que dependa disso:

```bash
npm run dev -- agent chat --chat 123 --text "quais eram meus focos mesmo?"
```

> Se o `AUTO_RETRIEVE` estiver ligado, o contexto do Supermemory já entra antes do LLM.

## Exemplos (forçando tools manualmente)

Quando você quiser “forçar” o uso do Supermemory (por exemplo para depurar), pode pedir explicitamente no chat:

- Buscar memórias:

```text
[EXECUTE:SUPER_MEMORY_SEARCH]
query: churn Q1
scope: workspace
limit: 8
[/EXECUTE]
```

- Salvar uma decisão:

```text
[EXECUTE:SUPER_MEMORY_ADD]
kind: decision
title: Foco Q1 2026
content: Meu foco de Q1 é reduzir churn em X% e melhorar onboarding.
[/EXECUTE]
```

## Custos e limites (operacional)

O custo passa a ter:

- ingest (tokens processados)
- queries de busca

Veja o pricing do Supermemory para dimensionar ambientes (principalmente se escalar para muitos chats).

## Observabilidade / Debug

Caso a recuperação atrapalhe (muito ruído), reduza:

- `SUPERMEMORY_AUTO_RETRIEVE_LIMIT`

Ou desligue temporariamente:

- `SUPERMEMORY_AUTO_RETRIEVE=0`

