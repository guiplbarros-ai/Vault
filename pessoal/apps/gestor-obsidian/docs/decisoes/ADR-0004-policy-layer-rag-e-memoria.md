# ADR-0004 — Policy layer para RAG/memória (best-effort)

- **Status**: accepted
- **Data**: 2026-01-13

## Contexto
Sem uma camada de policy, o LLM tende a:
- responder “genérico” para perguntas de planejamento,
- pedir passos extras (busca/consulta) quando já dá pra antecipar contexto,
- misturar “lembrança” com busca no vault, e vice-versa.

Além disso, queremos:
- RAG com **fontes** (quando houver),
- memory (Supermemory) como camada opcional, sem travar o produto se estiver desligada.

## Decisão
Criar uma **Policy layer** antes do Brain/LLM para:
- classificar intent (`recall`, `lookup_notes`, `lookup_people`, `save_memory`, `no_retrieval`);
- fazer prefetch/RAG quando útil (Supabase notes/people; opcionalmente índice via Supermemory);
- fazer writeback opcional (“save_memory”) para Supermemory.

Regra operacional: **best-effort** — falhas na policy **não quebram** o fluxo do usuário.

## Consequências
- **Prós**
  - Respostas menos genéricas e com mais contexto “na primeira”.
  - Clarifica fluxo de “lembrar” vs “buscar em notas”.
  - Deixa Supermemory opcional, sem dependência rígida.
- **Contras**
  - Mais uma peça para operar/depurar (flags/env).
  - Exige cuidado para não acumular contexto stale (limpeza por chat).

## Alternativas consideradas
- Deixar tudo para o LLM decidir: rejeitado (tende a ser inconsistente e custoso).
- Fazer RAG sempre: rejeitado (custo e risco de “noise”).

