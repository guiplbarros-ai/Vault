# Roteamento de integrações (Segunda Cérebro)

Este projeto é um **segundo cérebro**. Para evitar misturar contexto **Freelaw** e **pessoal**, use sempre as regras abaixo ao buscar/criar/atualizar coisas via MCP / automações.

## Notion (via MCP no Cursor)

- **`Notion`**: assuntos da **Freelaw** (documentos, databases, informações oficiais).
- **`Notion-Pessoal`**: assuntos **pessoais**.

## Google (contas separadas)

Recomendação: **não misturar** contas pessoais e profissionais no mesmo OAuth client/token.

- Use perfis `.env.*` (ex.: `.env.pessoal`, `.env.trabalho`) e rode com `OBSIDIAN_MANAGER_ENV_FILE`.
- Use `GOOGLE_TOKENS_PATH` (um por profile) para isolar tokens.

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

