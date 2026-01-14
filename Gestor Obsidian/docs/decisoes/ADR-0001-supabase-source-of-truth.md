# ADR-0001 — Supabase como source of truth

- **Status**: accepted
- **Data**: 2026-01-13

## Contexto
O produto precisa ser **cloud-first** e **always-on**, sem depender do vault local do Obsidian para funcionar.
Precisamos de:
- dados estruturados (workspaces, people, regras, finanças),
- notas em Markdown com busca,
- segurança (RLS),
- auditoria mínima,
- base para jobs/cron e automações.

## Decisão
Usar **Supabase (Postgres + RLS + Storage)** como **fonte de verdade**:
- **Postgres** para entidades principais (`notes`, `rules`, `people`, `profiles`, `facts`, `finance`, etc.)
- **Storage** para mídia recebida pelo Telegram (áudio/foto/vídeo), com URLs assinadas quando necessário.

O Obsidian fica como **cliente opcional** (import/export/edição humana), não como base do backend.

## Consequências
- **Prós**
  - Governança: esquema + constraints + auditoria.
  - Segurança: RLS habilitado no MVP e evolui para policies por workspace/usuário.
  - Cloud: simplifica deploy e execução contínua.
- **Contras**
  - Exige setup de secrets (URL + service role).
  - Requer desenho cuidadoso de RLS/policies para abrir acesso além do backend.

## Alternativas consideradas
- Vault local (Obsidian) como base: rejeitado (não cloud-first).
- Notion como base: rejeitado (limitações de query/performance e lock-in para várias entidades).
- SQLite/arquivos em storage: rejeitado (governança e RLS/auditoria mais fracos).

