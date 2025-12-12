# Obsidian Second Brain Manager

CLI para gerenciar notas no vault Obsidian, tarefas no Todoist, integração com Notion, Google Calendar e Gmail.

## Setup

1. Instale as dependências:

```bash
npm install
```

2. Configure as variáveis de ambiente:

```bash
cp env.example .env
```

Edite `.env` e configure:
- `OBSIDIAN_VAULT_PATH` - caminho absoluto do seu vault
- `TODOIST_API_TOKEN` - token da API do Todoist
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` - credenciais OAuth do Google (ver seção Google Calendar & Gmail)

## Comandos Disponíveis

### 📝 Notas no Obsidian

```bash
# Com #tag de classificação
npm run note -- "#livro Terminei cap 3 de Thinking in Bets..."
npm run note -- "#prof Reunião com time financeiro..."
npm run note -- "#pessoal Ideia sobre revisão semanal..."

# Com opções explícitas
npm run note -- "Conteúdo" --type livro --title "Nome do Livro"

# Append a nota existente
npm run note -- "Mais conteúdo" --append "20-RESOURCES/Livros/Livro - X.md"

# Forçar inbox
npm run note -- "Ideia solta" --inbox
```

#### Comandos de Classificação

| Comando | Destino |
|---------|---------|
| `#inbox` | `00-INBOX` |
| `#livro` | `20-RESOURCES/Livros` |
| `#conceito` | `20-RESOURCES/Conceitos` |
| `#projeto` | `30-PROJECTS` |
| `#prof` | `10-AREAS/Profissional` |
| `#pessoal` | `10-AREAS/Pessoal` |
| `#reuniao` | `10-AREAS/Profissional` |

---

### ✅ Tarefas no Todoist

```bash
# Listar tarefas pendentes
npm run dev -- todoist list

# Listar tarefas de hoje
npm run dev -- todoist today

# Listar com filtro
npm run dev -- todoist list --filter "p1"
npm run dev -- todoist list --project "Trabalho"

# Criar tarefa
npm run dev -- todoist add "Revisar documento"
npm run dev -- todoist add "Reunião com cliente" --due "tomorrow" --priority 4
npm run dev -- todoist add "Deploy" --project "Freelaw" --labels "urgente,tech"

# Completar tarefa
npm run dev -- todoist complete <task_id>

# Listar projetos
npm run dev -- todoist projects
```

#### Opções do comando `todoist add`

| Opção | Descrição |
|-------|-----------|
| `-d, --due <due>` | Data (ex: "today", "tomorrow", "next monday") |
| `-p, --priority <1-4>` | Prioridade (4 = mais alta) |
| `-P, --project <name>` | Nome do projeto |
| `-l, --labels <labels>` | Labels separadas por vírgula |
| `-D, --description <desc>` | Descrição da tarefa |

---

### 🤖 Bot do Telegram

O bot permite criar notas e tarefas diretamente pelo Telegram!

**Setup:**

1. Crie um bot no [@BotFather](https://t.me/BotFather):
   - Envie `/newbot`
   - Escolha nome e username
   - Copie o token

2. Configure no `.env`:
   ```
   TELEGRAM_BOT_TOKEN=seu_token_aqui
   ```

3. Inicie o bot:
   ```bash
   npm run dev -- telegram start
   ```

**Comandos do Bot:**

| Comando | Ação |
|---------|------|
| `/nota <texto>` | Salva no Inbox |
| `/livro <texto>` | Nota de livro |
| `/projeto <texto>` | Nota de projeto |
| `/prof <texto>` | Nota profissional |
| `/pessoal <texto>` | Nota pessoal |
| `/buscar <termo>` | Busca notas |
| `/tarefas` | Tarefas de hoje |
| `/tarefa <texto>` | Cria tarefa |
| `/concluir <id>` | Conclui tarefa |

**Dica:** Envie texto sem comando e o bot pergunta onde salvar!

---

### 📅 Google Calendar

**Setup inicial:**

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crie um projeto ou use um existente
3. Ative as APIs:
   - [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
   - [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
4. Configure a [tela de consentimento OAuth](https://console.cloud.google.com/apis/credentials/consent):
   - Escolha "Externo"
   - Adicione seu email como usuário de teste
5. Crie credenciais OAuth 2.0 (tipo: Aplicativo de desktop)
6. Configure no `.env`:
   ```
   GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=seu_client_secret
   ```

**Autenticação:**

```bash
# Autenticar (abre navegador)
npm run dev -- google auth

# Verificar status
npm run dev -- google status

# Logout
npm run dev -- google logout
```

**Comandos do Calendar:**

```bash
# Eventos de hoje
npm run dev -- calendar today

# Eventos da semana
npm run dev -- calendar week

# Próximos eventos
npm run dev -- calendar list
npm run dev -- calendar list --max 20 --query "reunião"

# Próximo evento
npm run dev -- calendar next

# Criar evento rápido (linguagem natural)
npm run dev -- calendar quick "Reunião com João amanhã às 14h"

# Criar evento com detalhes
npm run dev -- calendar add "Reunião de Status" --date 15/12/2025 --time 10:00 --duration 1.5
npm run dev -- calendar add "Call com cliente" --date 16/12/2025 --time 14:00 --meet --attendees "joao@email.com,maria@email.com"

# Ver detalhes de um evento
npm run dev -- calendar show <eventId>

# Remover evento
npm run dev -- calendar delete <eventId>

# Listar calendários
npm run dev -- calendar calendars
```

| Opção | Descrição |
|-------|-----------|
| `-d, --date <DD/MM/YYYY>` | Data do evento |
| `-t, --time <HH:MM>` | Horário de início |
| `-D, --duration <hours>` | Duração em horas |
| `-l, --location <local>` | Local do evento |
| `-m, --meet` | Criar link do Google Meet |
| `-a, --attendees <emails>` | Convidados (vírgula) |

---

### 📧 Gmail

```bash
# Emails não lidos
npm run dev -- gmail unread
npm run dev -- gmail unread --max 30

# Emails importantes não lidos
npm run dev -- gmail important

# Emails de hoje
npm run dev -- gmail today

# Listar emails recentes
npm run dev -- gmail list
npm run dev -- gmail list --label "trabalho" --max 50

# Buscar emails
npm run dev -- gmail search "from:joao@email.com"
npm run dev -- gmail search "subject:reunião after:2025/12/01"

# Ler email completo
npm run dev -- gmail read <messageId>
npm run dev -- gmail read <messageId> --mark-read

# Marcar como lido
npm run dev -- gmail mark-read <messageId>

# Arquivar emails
npm run dev -- gmail archive <messageId>

# Mover para lixeira
npm run dev -- gmail trash <messageId>

# Enviar email
npm run dev -- gmail send --to "destino@email.com" --subject "Assunto" --body "Corpo do email"

# Criar rascunho
npm run dev -- gmail draft --to "destino@email.com" --subject "Assunto" --body "Corpo"

# Listar labels
npm run dev -- gmail labels

# Ver perfil da conta
npm run dev -- gmail profile
```

**Queries de busca do Gmail:**

| Query | Descrição |
|-------|-----------|
| `from:email` | De um remetente |
| `to:email` | Para um destinatário |
| `subject:texto` | No assunto |
| `is:unread` | Não lidos |
| `is:starred` | Com estrela |
| `has:attachment` | Com anexos |
| `after:YYYY/MM/DD` | Após data |
| `before:YYYY/MM/DD` | Antes de data |
| `label:nome` | Com label |

---

### 📘 Notion (via MCP)

O Notion está integrado via MCP no Cursor. Use comandos naturais:

```bash
# Ver guia de uso
npm run dev -- notion help

# Ver instrução de busca
npm run dev -- notion search "comunidade"

# Instrução para enriquecer nota
npm run dev -- notion enrich "10-AREAS/.../nota.md" "termo de busca"
```

#### Como usar no Cursor

O Cursor tem acesso direto ao Notion via MCP. Exemplos de prompts:

- **Buscar:** "Busque no Notion por documentos financeiros"
- **Ler:** "Leia a página Comunidade do Notion"
- **Criar:** "Crie uma página no Notion com as notas da reunião"
- **Enriquecer:** "Busque no Notion sobre X e adicione na nota Y do Obsidian"

---

## Uso com Cursor

Este CLI foi projetado para ser usado com o Cursor. O modelo de IA pode:

1. Interpretar suas mensagens no chat
2. Decidir o tipo/classificação adequada
3. Chamar os comandos CLI automaticamente

### Exemplos de prompts

**Obsidian:**
> "Adicione uma nota sobre o livro Atomic Habits: O capítulo 2 fala sobre loops de hábitos."

**Todoist:**
> "Crie uma tarefa para revisar o documento financeiro até amanhã com prioridade alta"

**Notion + Obsidian:**
> "Busque no Notion informações sobre a Comunidade Freelaw e adicione um resumo na nota Dashboard-Comunidade.md"

---

## Estrutura das Notas

### Nova nota

```markdown
---
title: "Título da nota"
created_at: "2025-12-11 10:32"
updated_at: "2025-12-11 10:32"
tags: ["origem/chat", "tipo/livro"]
source: "chat-cursor"
---

## Registro - 2025-12-11 10:32

Conteúdo enviado...
```

### Atualização (append)

```markdown
## Registro - 2025-12-11 14:45

Novo conteúdo adicionado...
```

---

## Logs

As operações são registradas em `obsidian-manager.log`:

```
[2025-12-11 10:32] [INFO] Nota criada: 20-RESOURCES/Livros/Livro - X.md (tipo: livro)
[2025-12-11 10:35] [INFO] Todoist: Tarefa criada - "Revisar doc" (ID: 123)
```

---

## Desenvolvimento

```bash
# Rodar em modo de desenvolvimento
npm run dev -- note "teste"
npm run dev -- todoist list

# Build
npm run build

# Rodar versão compilada
npm start -- note "teste"
```

---

## Arquitetura

```
obsidian-manager/
├── src/
│   ├── index.ts                    # Entry point CLI
│   ├── commands/
│   │   ├── note.ts                 # Comandos de notas
│   │   ├── todoist.ts              # Comandos do Todoist
│   │   ├── notion.ts               # Guia do Notion
│   │   ├── telegram.ts             # Bot do Telegram
│   │   ├── google.ts               # Autenticação Google
│   │   ├── calendar.ts             # Comandos do Calendar
│   │   └── gmail.ts                # Comandos do Gmail
│   ├── services/
│   │   ├── vault.service.ts        # Acesso ao filesystem
│   │   ├── classifier.service.ts
│   │   ├── note.service.ts
│   │   ├── todoist.service.ts
│   │   ├── telegram.service.ts
│   │   ├── google-auth.service.ts  # OAuth2 Google
│   │   ├── calendar.service.ts     # API Google Calendar
│   │   └── gmail.service.ts        # API Gmail
│   ├── types/
│   │   ├── index.ts
│   │   ├── todoist.ts
│   │   ├── notion.ts
│   │   ├── telegram.ts
│   │   └── google.ts               # Tipos Calendar/Gmail
│   └── utils/
│       ├── logger.ts
│       ├── date.ts
│       └── frontmatter.ts
├── .env
├── env.example
└── package.json
```
