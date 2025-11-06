# Plano de Testes v0.5 — Cortex Cash

Este documento define os testes a implementar para garantir a integridade funcional do app na v0.5 e preparar a v0.6.

## 🎯 Objetivos

- Cobrir fluxos críticos (CRUDs, importação, classificação IA, orçamentos, faturas, backup, PWA/offline).
- Prevenir regressões nas rotas de API e nos serviços Dexie.
- Garantir UX mínima (validações de formulários e estados de loading/empty).

## 🧰 Estratégia e Ferramentas

- Test Runner: Vitest (jsdom ou happy-dom).
- UI: @testing-library/react, @testing-library/jest-dom.
- IndexedDB: fake-indexeddb para isolar Dexie.
- Cobertura: v8 (text, json, html).

Setup já configurado em `vitest.config.ts` com `lib/tests/setup.ts`.

## 📦 Escopo (v0.5)

1) Núcleo (Dexie services) — crítico
2) Importação (já com 32 unit + 10 smoke) — complementar
3) IA (classify/batch/usage + rule engine) — crítico
4) Finanças (orçamentos e faturas) — alto
5) Backup/Export — alto
6) Monitoring/Health/Performance — médio
7) UI (DataTable, Forms, Charts, Classificação) — médio
8) PWA/Offline — checklist manual + smoke

## ✅ Cobertura Obrigatória v0.5

- Unit: serviços Dexie (+ cálculos de orçamentos e faturas).
- Integration: rotas `app/api/ai/{classify,batch,usage}` e `app/api/import/*` (cenários de erro também).
- Smoke: páginas principais renderizam sem erro; endpoints principais respondem OK.

## 🧪 Casos de Teste por Módulo

### 1) Core Services (Dexie)

Arquivos: `lib/services/*.service.ts`

- transacao.service
  - cria/atualiza/exclui transação (valores positivos/negativos, arredondamento).
  - busca por intervalo de data, ordenação, paginação simples.
  - dedupe por hash (se aplicável) e integridade de índices.
- conta.service
  - CRUD de contas; bloqueio de exclusão com dependências (se regra existir).
  - cálculo de saldo agregado (sum por conta; despesas/receitas do mês).
- categoria.service
  - CRUD; não permitir duplicação por nome+tipo (se regra existir).
  - interação com seed (somente leitura do seed inicial).
- orcamento.service
  - criação e atualização por mês/categoria/centro de custo.
  - cálculo de realizado e status (80%/100%).
  - cópia entre meses e recálculo automático.
- cartao.service
  - lançamento parcelado: geração de parcelas, total e datas corretas.
  - compras em moeda estrangeira: conversão para BRL (precisão e arredondamento).
- import.service (camada de orquestração)
  - integração com parsers e normalizadores (mocks/stubs). 

### 2) Importação (complementos)

Arquivos: `lib/import/**`, `app/api/import/**`

- OFX 2.x: casos com timezones e descrições longas.
- CSV: separadores exóticos e aspas em campos com vírgulas.
- Normalizadores: valores com múltiplos pontos de milhar e símbolos.
- Dedupe: colisões e falsos positivos (datasets similares).
- API: validações de payload; limites de tamanho; tipos inválidos (já há smoke, ampliar casos de erro).

### 3) IA (Classificação)

Arquivos: `app/api/ai/{classify,batch,usage}/route.ts`, `lib/finance/classification/rule-engine.ts`, `lib/services/ai-usage.service.ts`, hooks `lib/hooks/use-ai-classification.ts`, `lib/hooks/use-batch-classification.ts`

- Rule engine: ordem cache → regras → OpenAI; queda controlada quando sem sugestão.
- Cache hit/miss: mesmo input retorna do cache; inválido quando muda descrição/valor.
- Batch: mistura de entradas válidas/invalidas, retorno parcial consistente.
- Custos/usage: registrar consumo por request, somatórios por dia.
- Erros: timeouts, falta de chave, rate-limit — respostas HTTP adequadas.
- Hooks: estados loading/success/error; re-render mínimo; cancelamento.

### 4) Finanças (Orçamentos e Faturas)

Arquivos: `lib/services/orcamento.service.ts`, `components/budgets/**`, `components/credit-card-limit.tsx`, `app/credit-cards/**`

- Orçamentos: thresholds 80%/100%; mudança de mês; cópia entre meses.
- Faturas: criação/edição/exclusão de lançamentos; parcelamento; conversão cambial.
- Alertas: hook de limite de cartão acionado ao ultrapassar threshold.

### 5) Backup/Export

Arquivos: `lib/backup/**`, `components/backup-manager.tsx`, `/settings/backup`

- Export: inclui todas as tabelas e metadados.
- Import replace/merge: integridade preservada; sem duplicar seeds.
- Validação: schemas inválidos e versões antigas (mensagens claras).

### 6) Monitoring & Performance

Arquivos: `lib/monitoring/**`, `components/performance-dashboard.tsx`, `/settings/{system,performance}`

- Health checks: estados healthy/degraded/unhealthy conforme simulação.
- Performance: métricas básicas registradas; dashboards renderizam sem erro.

### 7) UI Crítica

Arquivos: `components/data-table/**`, `components/forms/**`, `components/classification/**`, `components/overview-cards.tsx`, `components/*-chart.tsx`

- DataTable: filtros, ordenação, seleção, reset.
- Forms: validação Zod (erro por campo; submit desabilitado até válido).
- Classificação: botões e bulk; feedbacks de sucesso/erro; badges.
- Charts: render mínimo com dados reais/placeholder (sem snapshot pesado).

### 8) PWA / Offline (Checklist)

- Service Worker registra sem erro; atualização notificada pelo `ServiceWorkerUpdatePrompt`.
- Página `/offline` carregada quando sem rede (network-first com fallback).
- Assets estáticos servidos do cache.

## 📈 Metas de Cobertura

- Serviços core e IA: ≥ 80%
- Importação: manter 100% dos módulos cobertos existentes
- UI crítica (forms, datatable): ≥ 60% linhas, ≥ 70% branches em validações

## ▶️ Execução

- Todos os testes: `pnpm test`
- UI dos testes: `pnpm test:ui`
- Cobertura: `pnpm test:coverage`
- Import suite: `pnpm run test:import`
- Smokes (node): `pnpm run ai:smoke` e `pnpm run import:smoke`

## 🧱 Isolamento de Banco (Dexie)

- Usar `fake-indexeddb` e limpar o DB entre testes.
- Padrão: `beforeEach` criar instância; `afterEach` `db.delete()`.
- Fixtures em `lib/tests/setup.ts` (fábricas de entidades e reset global).

## 🔢 Estrutura Sugerida (tests/)

```
tests/
  unit/
    services/*.test.ts
    finance/*.test.ts
  integration/
    api/ai/*.test.ts
    api/import/*.test.ts
  ui/
    components/*.test.tsx
  smoke/
    routes.smoke.test.ts
```

Obs.: manter compatível com a estrutura atual; reorganização gradual.

## ⏱️ Priorização

1. Crítico: services core, IA endpoints.
2. Alto: orçamentos/faturas, backup.
3. Médio: UI crítica, monitoring.
4. Baixo: PWA offline (checagem manual + smoke mínimo).

## ✅ Critérios de Aceite

- Pipelines locais (build + test + lint) verdes.
- Cobertura mínima atingida por área.
- Sem regressão nos smokes de API e páginas principais.


