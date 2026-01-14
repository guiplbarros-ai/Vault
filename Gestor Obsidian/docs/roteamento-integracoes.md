# Roteamento de integrações (Segunda Cérebro)

Este projeto é um **segundo cérebro**. Para evitar misturar contexto **Freelaw** e **pessoal**, use sempre as regras abaixo ao buscar/criar/atualizar coisas via MCP / automações.

## Notion (via MCP no Cursor)

- **`Notion`**: assuntos da **Freelaw** (documentos, databases, informações oficiais).
- **`Notion-Pessoal`**: assuntos **pessoais**.

## Google (contas separadas)

Agora estamos em modo **cloud-first** (Fly + Supabase) e o roteamento é feito por **contexto (workspace)**.

### Freelaw
- 1 conta (ex.: `guilherme@freelaw.work`)
- o bot usa a conta selecionada no chat (ou a primeira conectada)

### Pessoal
- *pool* de contas (ex.: `guilhermeplbarros@gmail.com` + `guiplbarros@gmail.com`)
- leituras de **emails** e **agenda** consultam **todas as contas conectadas** e o bot responde com resultado mesclado
- itens vêm prefixados com a conta: `[email@...]`

> Ações mutáveis (ex.: enviar email, criar/editar/deletar evento, arquivar email, aplicar labels) seguem pedindo confirmação.
> No **pessoal** com múltiplas contas, o bot exige uma conta **ativa** para mutações:
> - use `GOOGLE_SET_ACCOUNT` para selecionar a conta
> - ou use o formato `email::id` quando a ação for por id (ex.: `GMAIL_ARCHIVE`, `GMAIL_REPLY`, `CALENDAR_DELETE`)

## Todoist

### Freelaw — Financeiro

- **Projeto `Gestão financeira`**: tudo que for do **financeiro da Freelaw**.

### Pessoal

- **Projeto `Casinha :)`**: tudo relacionado a **casa/obra/reforma**.
- **Projeto `Guilherme Barros`**: demais assuntos **pessoais**.

## Regra prática (para prompts)

- Se o pedido mencionar **Freelaw + financeiro**, direcione para:
  - Notion: `Notion`
  - Todoist: projeto `Gestão financeira`
- Se o pedido for **pessoal**, direcione para:
  - Notion: `Notion-Pessoal`
  - Todoist: `Casinha :)` (se casa/obra/reforma) ou `Guilherme Barros` (caso contrário)

