# Modelo de dados & taxonomia (biblioteconomia) — Supabase

Objetivo: dar ao Cortex uma “biblioteconomia” clara para **armazenar**, **buscar** e **responder** sem misturar coisas (pessoal vs Freelaw), e sem transformar qualquer dado em “note”.

## Princípio: cada coisa no seu lugar

- **Perfil (profiles)**: “dados do Guilherme / do workspace”
  - ex.: aniversário, timezone, idioma, preferências globais
- **Regras (rules)**: “como o bot deve trabalhar”
  - manual versionado + 1 versão ativa por workspace
- **Fatos (facts)**: memórias declarativas “key/value”
  - ex.: `moradia.cidade`, `preferencia.tom_resposta`, `freelaw.funcao`
- **Notas (notes)**: conhecimento narrativo (markdown)
  - reuniões, decisões, conceitos, projetos, diário
- **Pessoas (people)**: pessoas importantes + aniversários + presentes + notas sobre pessoas
- **Finanças (accounts/categories/transactions)**: dados financeiros estruturados

## Dimensões comuns (taxonomia)

Para qualquer dado “textual” (notes/facts/rules), guardar:
- **workspace_id**: separa ambientes (default, etc.)
- **context**:
  - `pessoal`
  - `freelaw`
  - `unknown`
- **source**: `telegram`, `agent`, `import`, etc.
- **tags**: “plano de contas” do conhecimento (ex.: `tipo/reuniao`, `area/pessoal`)

## Tipos de nota (note.type)

Baseado no Obsidian atual (`NoteType`):
- `inbox`, `livro`, `conceito`, `projeto`, `prof`, `pessoal`, `reuniao`, `nota`

Recomendação:
- manter `type` como string (MVP) e depois, se necessário, virar enum/lookup table.

## Busca (otimização)

- `notes.body_tsv` (FTS) para busca rápida por texto
- depois: chunks/embeddings para recall de longo prazo

## Captura no Telegram (roteamento correto)

Regra prática:
- Se a mensagem for “dado do usuário” (ex.: aniversário) → **profiles**
- Se for “regra de comportamento” → **rules** (via /config)
- Se for conhecimento narrativo → **notes**
- Se for pessoa X → **people**
- Se for transação/gasto/receita → **transactions**

## Separação por contexto (workspaces)

Para reduzir ambiguidade e evitar vazamento de contexto, usamos workspaces no Supabase:
- `workspace_id = pessoal`
- `workspace_id = freelaw`

No Telegram, o contexto pode ser definido por chat:
- `/contexto pessoal`
- `/contexto freelaw`

