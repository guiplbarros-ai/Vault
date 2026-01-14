# Plano de contas / taxonomia (PESSOAL)

Este documento define a “biblioteconomia” do seu segundo cérebro no contexto **pessoal** (`workspace_id = pessoal`).

## 1) Objetivo
- Permitir que o bot **roteie** e **busque** com precisão.
- Evitar que “qualquer coisa” vire `notes`.
- Criar um vocabulário consistente: áreas, tipos, tags.

## 2) Conceitos

- **Área (`area/*`)**: “onde isso vive” na vida (casa, família, finanças pessoais…)
- **Tipo de nota (`type`)**: formato/intenção (reunião, conceito, projeto…)
- **Tags (`tags[]`)**: detalhes/filtros (ex.: `area/casa`, `pessoa/esposa`, `status/ativo`)

## 3) Áreas (mínimas)

Use como tags em notas e fatos:
- `area/casa`
- `area/casamento`
- `area/familia`
- `area/financas-pessoais`
- `area/saude`
- `area/amigos`
- `area/lazer`

> Essas áreas também estão “seedadas” no Supabase via tabela `taxons`.

## 4) Onde guardar cada coisa (regra prática)

- **Perfil (`profiles`)**:
  - aniversário do Guilherme
  - timezone/locale
  - preferências globais
- **Fatos (`facts`)**:
  - “moro em X”
  - “meu objetivo do mês é Y”
  - “minha esposa se chama Z”
- **Pessoas (`people`)**:
  - esposa, família, amigos
  - aniversários deles
  - notas por pessoa
- **Notas (`notes`)**:
  - reunião/decisão/diário
  - notas longas e contexto narrativo
- **Finanças (`transactions` etc.)**:
  - lançamentos estruturados
  - categorias
  - contas

## 5) Exemplos (Telegram)

### Aniversário do Guilherme (perfil)
- `/eu aniversario 22/03`

### Nota de casa
- `/nota #pessoal Reforma: avaliar orçamento do armário`
  - tags recomendadas: `area/casa`

### Fato rápido
- “Registre: moro em São Paulo” (futuro: `/fato morar.cidade São Paulo`)

