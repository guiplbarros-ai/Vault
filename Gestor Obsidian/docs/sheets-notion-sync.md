## Integração Google Sheets → Notion (Financeiro)

Esta integração existe para manter o **controle financeiro do Google Sheets** refletido no Notion, na database:
- **Notion (pessoal):** `Controle Financeiro - Obra e Compras`

### O que foi implementado

- **Perfis de ambiente**:
  - Suporte a múltiplos arquivos `.env.*` via `OBSIDIAN_MANAGER_ENV_FILE` (ou `ENV_FILE`).
  - Carregamento de env centralizado em `src/utils/env.ts` com `override: true` para evitar “vazamento” de variáveis exportadas no shell.

- **Comando de sync (CLI)**:
  - `npm run dev -- sheets sync-finance`
  - Lê um range do Google Sheets e faz upsert no Notion.
  - Modo `--dry-run` lê o Sheets e imprime o que faria (sem Notion).

- **Google OAuth**:
  - Escopo de Sheets incluído: `https://www.googleapis.com/auth/spreadsheets.readonly`
  - URL de auth com `prompt=consent select_account` (ajuda com múltiplas contas).
  - Tokens por `client_id` e opção de fixar com `GOOGLE_TOKENS_PATH`.
  - Comando `google diag` para inspecionar qual profile/env/client/token-file está ativo sem abrir navegador.

### O que NÃO foi concluído (pendências)

- **Autenticação Google por profile**:
  - Ainda é necessário autenticar (`google auth --force`) cada profile para gerar tokens separados.
  - Se aparecer “**cortex-app**” na tela do Google, o profile está usando o `GOOGLE_CLIENT_ID` do app errado.

- **Sync “write” no Notion via terminal**:
  - Para escrever no Notion pelo terminal, é necessário `NOTION_API_KEY` (token da integração) + compartilhar a database com a integração.
  - Alternativa: usar Notion via MCP no Cursor para alterações manuais (não automático).

### Como usar (fluxo recomendado)

#### 1) Diagnóstico (qual profile está ativo)

```bash
OBSIDIAN_MANAGER_ENV_FILE=.env.pessoal  npm run dev -- google diag
OBSIDIAN_MANAGER_ENV_FILE=.env.codigo   npm run dev -- google diag
OBSIDIAN_MANAGER_ENV_FILE=.env.trabalho npm run dev -- google diag
```

#### 2) Autenticar o Google (no profile certo)

```bash
OBSIDIAN_MANAGER_ENV_FILE=.env.pessoal npm run dev -- google auth --force
```

#### 3) Ler o Sheets (sem Notion)

```bash
OBSIDIAN_MANAGER_ENV_FILE=.env.pessoal npm run dev -- sheets sync-finance \
  --spreadsheet "1dck3mGWp2BHAPfgk3tDKA3d53oIlzJq0RPze3Se6wok" \
  --range 'Financeiro!A1:K30' \
  --dry-run
```

#### 4) Escrever no Notion (sync completo)

Pré-requisitos no mesmo profile:
- `NOTION_API_KEY=...`
- `NOTION_FINANCE_DATABASE_ID=2e482982-7596-8076-bfa7-c1cdb5bb2e91`
- Database compartilhada com a integração do `NOTION_API_KEY`.

```bash
OBSIDIAN_MANAGER_ENV_FILE=.env.pessoal npm run dev -- sheets sync-finance \
  --spreadsheet "1dck3mGWp2BHAPfgk3tDKA3d53oIlzJq0RPze3Se6wok" \
  --range 'Financeiro!A1:Z2000' \
  --notionDb "2e482982-7596-8076-bfa7-c1cdb5bb2e91"
```

### Variáveis necessárias (por profile)

- **Google**
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI` (default: `http://localhost:3000/oauth2callback`)
  - `GOOGLE_TOKENS_PATH` (recomendado por profile)

- **Sheets (financeiro)**
  - `GOOGLE_SHEETS_FINANCE_SPREADSHEET_ID`
  - `GOOGLE_SHEETS_FINANCE_RANGE`

- **Notion (para sync via terminal)**
  - `NOTION_API_KEY`
  - `NOTION_FINANCE_DATABASE_ID`

