# ADR-0003 — Tools plugáveis + protocolo `[EXECUTE:...]`

- **Status**: accepted
- **Data**: 2026-01-13

## Contexto
O assistente precisa integrar múltiplos sistemas (Supabase, Todoist, Gmail, Calendar, Notion, etc.) sem virar um `switch` monolítico difícil de evoluir.
Também precisamos de um “contrato” simples para o LLM pedir ações.

## Decisão
- Adotar um **ToolRegistry** com tools plugáveis (registradas no default registry).
- O LLM solicita ações via blocos:

```text
[EXECUTE:NOME_DA_ACAO]
param: valor
[/EXECUTE]
```

O runtime (Brain) faz parse, valida e executa tools, e depois gera uma resposta final (sem “dump raw”).

## Consequências
- **Prós**
  - Novas integrações entram como novos arquivos/tools, sem mexer no core.
  - O protocolo `[EXECUTE:...]` é simples, debuggável e testável.
- **Contras**
  - Requer disciplina de nomenclatura/contrato de params.
  - Exige guardrails para não executar ações mutáveis “no automático”.

## Alternativas consideradas
- Switch/cadeia de `if` no Brain: rejeitado (cresce rápido e vira legado).
- Function calling “nativo” do modelo: possível, mas o projeto já tem um protocolo simples e portátil.

