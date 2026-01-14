# ADR-0005 — Workspaces (`pessoal` vs `freelaw`) e roteamento por contexto

- **Status**: accepted
- **Data**: 2026-01-13

## Contexto
O produto opera em pelo menos dois contextos distintos:
- **pessoal**
- **freelaw**

Misturar dados/ações entre contextos é um risco (privacidade, confusão operacional e “dado errado no lugar errado”).

## Decisão
- Introduzir o conceito de **workspace** como chave de separação em todas as tabelas relevantes.
- Persistir o workspace por chat (`chat_settings.workspace_id`) e permitir troca via `/contexto`.
- Roteamento por contexto:
  - **Todoist**: projetos diferentes (ex.: “Gestão Financeira - Freelaw” vs projetos pessoais).
  - **Notion**: integrações separadas (Freelaw vs pessoal).
  - **Google**: pool pessoal vs workspace específico (com seleção de conta por chat quando necessário).

## Consequências
- **Prós**
  - Evita mistura de dados e reduz risco de ações no lugar errado.
  - Permite evoluir para multi-tenant real (no futuro) com RLS/policies por workspace/usuário.
- **Contras**
  - A UX precisa sempre deixar claro “em que contexto estou” quando relevante.
  - Exige rotas/integrações “duplas” (Notion, Google) e regras de fallback.

## Alternativas consideradas
- “Um único cérebro” sem separação: rejeitado (alto risco e confusão).
- Separar por chats diferentes apenas: insuficiente (usuário pode preferir um único chat e alternar contexto).

