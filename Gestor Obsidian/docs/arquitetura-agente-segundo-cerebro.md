# Arquitetura do Agente (Segundo Cérebro via Telegram)

Este documento descreve a **arquitetura do agente** do “Segundo Cérebro” neste repositório.  
O **canal principal de comunicação é o Telegram**.

> Objetivo: ter um “secretário/assistente” que consulta e registra conhecimento/tarefas/agenda/emails, com segurança, previsibilidade e extensibilidade.

## Premissas de produção (cloud)

- O produto roda **100% cloud** e **always-on**.
- O backend **não depende do vault local do Obsidian** para funcionar.
- **Supabase** é o “source of truth” para:
  - regras/preferências (“manual”)
  - notas (markdown + metadados)
  - pessoas/aniversários/follow-ups
  - finanças (lançamentos, categorias, checklist)

## Visão geral (camadas)

### Canal (Interface)
- **Telegram** (`src/services/telegram.service.ts`)
  - Comandos explícitos (ex.: `/nota`, `/tarefas`) continuam existindo.
  - Texto “natural” (sem `/`) entra no **Agent**.

### Orquestração
- **AgentService** (`src/services/agent.service.ts`)
  - É a “porta de entrada” do assistente.
  - Injeta **regras/preferências do vault** no cérebro antes de cada conversa.
  - Delegação atual: `AgentService.chat(...) -> BrainService.chat(...)`.

### “Cérebro” (LLM + estado + execução)
- **BrainService** (`src/services/brain.service.ts`)
  - Mantém **estado por chatId** (histórico, confirmações, contexto interno).
  - Usa LLM (OpenAI) para:
    - decidir o que fazer
    - propor ações (quando precisam de confirmação)
    - executar ações via tags `[EXECUTE:...]`
    - gerar resposta final depois dos resultados das ferramentas
  - As ações são executadas por uma camada de tools (ToolRegistry), não mais por um `switch` monolítico.

### Tools (Integrações)
- **ToolRegistry** (`src/agent/tool-registry.ts`) + **default registry** (`src/agent/default-tools.ts`)
  - “Pluga” ferramentas com nome/descrição/execute.
  - Permite adicionar integrações sem crescer o `BrainService`.

### Dados (Supabase)
- O backend deve ter uma camada de “repos”/acesso a dados (a evoluir) que lê e escreve no Supabase:
  - Notes
  - People
  - Finance
  - Rules/Manual
- Recomendado: usar **RLS** com `workspace_id`/`user_id`, e registrar auditoria de alterações.

### Regras / Preferências
- **RulesService** (`src/services/rules.service.ts`)
  - Lê um arquivo no vault (markdown) com regras do seu assistente.
  - Faz cache (TTL) para não reler o arquivo em toda mensagem.

> Observação: o `RulesService` atual está orientado ao vault local. Para produção cloud, ele deve virar um `RulesRepository` (Supabase).

## Fluxo completo (Telegram → Resposta)

1. Você envia uma mensagem no Telegram
2. `TelegramService` valida autorização (opcional via env) e roteia:
   - Se for comando (`/algo`), executa handler específico
   - Se for texto natural, chama `AgentService.chat(chatId, text)`
3. `AgentService`:
   - carrega regras do vault via `RulesService.getRules()`
   - injeta no `BrainService` via `brain.setExternalRules(rules)`
   - chama `brain.chat(chatId, text)`
4. `BrainService`:
   - mantém histórico da conversa por `chatId`
   - envia prompt para LLM (incluindo regras externas)
   - se a resposta vier com `[EXECUTE:...]`, executa via ToolRegistry
   - após executar tools, gera resposta final (sem “dump raw”)
5. `TelegramService` envia a resposta, com divisão de mensagens longas

## Contrato de Tools (como o agente “age”)

### Formato de execução (saída do modelo)
O modelo pede execuções neste formato:

```text
[EXECUTE:NOME_DA_ACAO]
chave: valor
outra: valor
[/EXECUTE]
```

O `BrainService`:
- normaliza variações
- faz parse de params `chave: valor`
- executa cada ação sequencialmente

### Interface de Tool
Uma Tool é:
- `name`: string (ex.: `SEARCH_VAULT`)
- `description`: string
- `execute(params, ctx) => Promise<string>`

`ctx` inclui:
- `chatId`
- `appendInternalData(title, payload)` para alimentar contexto interno (sem expor raw na resposta)
- `notion.search/fetch` (se disponível)

### Tools já implementadas

As tools default estão em `src/agent/tools/` e registradas em `src/agent/default-tools.ts`.

- **Obsidian**
  - `SEARCH_VAULT`: busca e carrega conteúdo da melhor nota no contexto interno
  - `READ_NOTE`: lê uma nota por path
  - `CREATE_NOTE`: cria nota via `NoteService`
- **Todoist**
  - `LIST_TASKS`, `CREATE_TASK`, `COMPLETE_TASK`
- **Notion**
  - `NOTION_SEARCH`, `NOTION_FETCH` (dependem de função injetada)
- **Google Calendar**
  - `CALENDAR_TODAY`, `CALENDAR_WEEK`, `CALENDAR_NEXT`, `CALENDAR_QUICK`
- **Gmail**
  - `GMAIL_UNREAD`, `GMAIL_IMPORTANT`, `GMAIL_SEARCH`, `GMAIL_READ`

## Onde ficam “regras e preferências” do seu cérebro

### Arquivo de regras (Vault)
Por padrão, o agente tenta ler:
- `00-INBOX/CORTEX_RULES.md` (dentro do vault)

Você pode mudar via env:
- `CORTEX_RULES_NOTE="caminho/relativo/no/vault.md"`

Cache (ms):
- `CORTEX_RULES_CACHE_MS=10000`

### Produção cloud (Supabase)
Em produção, as regras devem morar no Supabase (tabela versionada).  
O arquivo no vault vira opcional (export/import).

### Conteúdo recomendado do `CORTEX_RULES.md`
- **Prioridades e valores** (o que otimizar)
- **Roteamento Freelaw vs Pessoal** (link/espelho de `docs/roteamento-integracoes.md`)
- **Estilo** (tom, concisão, quando fazer perguntas)
- **Guardrails** (ações que exigem confirmação, limites, “nunca faça X”)
- **Preferências operacionais**
  - como nomear notas
  - quais pastas usar
  - quais horários de briefings/lembretes
  - critérios para “email importante”

## Segurança e guardrails (mínimo necessário)

### Autorização no Telegram
- `TELEGRAM_AUTHORIZED_USERS` (lista de ids, separados por vírgula)
  - Se vazio, qualquer um que achar o bot pode falar com ele (não recomendado).

### Confirmação antes de ações mutáveis
O `BrainService` foi desenhado para:
- Executar direto consultas (buscar/listar/ler)
- Pedir confirmação para ações que modificam estado (criar nota/tarefa, concluir tarefa, criar evento, etc.)

Se você quiser “níveis de autonomia”, o lugar certo é:
- reforçar no `CORTEX_RULES.md`
- e/ou adicionar um guardrail programático (futuro): “policy” no AgentService

## Extensibilidade: como adicionar uma nova integração

1. Crie um arquivo em `src/agent/tools/` (ex.: `reservas.tool.ts`)
2. Exporte uma função `createXTool(): AgentTool`
3. Registre em `src/agent/default-tools.ts`
4. (Opcional) atualize o prompt/guia de ações do `BrainService` (para ensinar o modelo a chamar a nova tool)

## Operação / comandos úteis

### Telegram
- Diagnóstico:
  - `npm run dev -- telegram status`
- Iniciar bot:
  - `npm run dev -- telegram start`
- Enviar mensagem (smoke test):
  - `npm run dev -- telegram send --chat <chatId> --text "..." `

### Agent (CLI)
- Chat via CLI (usa a mesma lógica do Telegram, com `chatId` como escopo de memória):
  - `npm run dev -- agent chat --chat <chatId> --text "..." `
- Limpar memória do chat:
  - `npm run dev -- agent clear --chat <chatId>`
