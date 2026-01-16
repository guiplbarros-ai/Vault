# Decisões (ADRs)

Este diretório guarda **Architecture Decision Records (ADR)**: decisões importantes de arquitetura/produto, com contexto e trade-offs.

## Índice
- `ADR-0001` — Supabase como source of truth
- `ADR-0002` — Telegram-first + webhook + serviço always-on
- `ADR-0003` — Tools plugáveis + protocolo `[EXECUTE:...]`
- `ADR-0004` — Policy layer para RAG/memória (best-effort, sem quebrar fluxo)
- `ADR-0005` — Workspaces (`pessoal` vs `freelaw`) e roteamento por contexto

## Template (para novas decisões)

Crie um arquivo `ADR-XXXX-titulo-curto.md` com:

- **Status**: proposed | accepted | deprecated
- **Data**
- **Contexto**
- **Decisão**
- **Consequências** (positivas/negativas)
- **Alternativas consideradas**

