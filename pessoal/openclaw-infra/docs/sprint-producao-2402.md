# Sprint de Produção — Seg 24 e Ter 25/02

## Context

Deadline 28/02. Somos guardiões de dados. Na sessão de 18/02 fizemos 15 PRs em 1 dia. Agora precisamos garantir que tudo funciona end-to-end para produção: billing, subscriptions, GL, backstage, guards.

**Estado atual:**
- 87 tabelas v2, 100% RLS, 13 bounded contexts
- 4 schemas ATIVOS (sync, billing, cs, finance), 9 SCHEMA-ONLY
- Billing pipeline: Stripe + Iugu → v2_billing → GL → DRE/Balanço/DFC
- Backstage: 28 páginas financeiras, 39 APIs, 48 arquivos sync/ETL
- 22 PRs nossas mergeadas (09-21/02)
- Issues abertas: #4333 (Fluxo Financeiro), #4316 (E2E Financeiro), #5256 (billing tests)

---

## Segunda 24/02

### Manhã — Auditoria Profunda (09:00-12:00)

**Bloco 1: Estado dos Dados v2 (FreelawData)**

Rodar via #data:
```sql
-- Para cada schema v2: contagem de registros por tabela
-- Resultado: mapa de calor (vazio / parcial / populado)
```

Objetivo: Saber exatamente quais tabelas têm dados e quais ETLs precisam rodar.

**Bloco 2: Billing Pipeline E2E (FreelawBackstage)**

Verificar os 4 elos da cadeia:
1. **Iugu → v2_sync** — mirror atualizado? Última sync quando?
2. **v2_sync → v2_billing** — ETL rodando? Subscriptions/invoices populados?
3. **Stripe → v2_billing** — dual-write ativo? Webhooks processando?
4. **v2_billing → v2_finance GL** — posting engine gerando lançamentos? Debit = credit?

**Bloco 3: Guards + CI (FreelawBackstage)**

- `bun run typecheck` — 0 errors?
- sql-schema-guard — 524+ tabelas cobertas?
- data-architecture-guard — sem falsos positivos?
- RLS coverage CI — 19 schemas (6 legacy + 13 v2)?
- Verificar que zero queries usam `payments.*` legacy

### Tarde — Correções P0 (13:00-18:00)

**Bloco 4: Fixes baseados na auditoria**

Corrigir tudo que a auditoria revelar. Histórico: na sessão de 18/02 fizemos 7 PRs de correção em 3h. Esperado:

| Tipo | Exemplo | PRs estimadas |
|------|---------|--------------|
| ETLs que não estão rodando | Ativar/corrigir billing-etl, finance-posting | 1-2 |
| Dados faltando em v2_billing | Backfill subscriptions/invoices | 1 |
| GL assertions falhando | Fix posting engine | 1 |
| Guards quebrando | Allowlist updates, schema fixes | 1-2 |
| Crons inativos | Ativar billing crons (auto-resume, collections) | 1 |

**Bloco 5: PR #5256 — Billing Invoice Settlement Tests**

Essa PR está aberta há dias. Revisar, ajustar se necessário, mergear. Importante para garantia de qualidade do billing.

**Bloco 6: Issue #4333 — Fluxo Financeiro Completo**

Mapear todo o fluxo: delegação aceita → fatura → cobrança → recebimento → GL → DRE.
Identificar gaps e criar PRs para cada um.

### Noite — Notificação + Doc (18:00-19:00)

- Notificar #status com resumo do dia
- Atualizar data-architecture-sprint.md com achados

---

## Terça 25/02

### Manhã — Backstage Intelligence (09:00-12:00)

**Bloco 7: Validação de Todas as Views Financeiras**

Testar cada uma das 28 páginas do financeiro no backstage:

| Grupo | Views | O que verificar |
|-------|-------|----------------|
| Receita | overview, assinaturas, billing, faturamento, novo-mrr, recebimentos | MRR/ARR corretos, dados v2_billing |
| Relatórios | DRE, balanço, DFC, indicadores, auditoria, relatório-diário | GL numbers, debit=credit |
| Custos | despesas, prestadores, nova-sede | Categorias, centros de custo |
| Análise | analytics, cancelamentos, churn, inadimplência, unit-economics | Cálculos corretos |
| Planejamento | budget, business-plan, estratégico | Dados carregando |
| Config | conciliação, sync, usuários | Conta Azul funcional |
| ERP | ERP page | Dados consolidados |

Para cada view que falhar: criar PR de fix imediato.

**Bloco 8: Sync/ETL Orchestrator**

- Verificar que todos os 12 domain ETLs estão registrados
- Trigger manual de cada ETL e verificar resultado
- Verificar que billing-etl e finance-posting não têm erros
- Reconciliação Conta Azul: match rate aceitável?

### Tarde — Hardening (13:00-18:00)

**Bloco 9: Produção Hardening PRs**

| Item | Status (verificar) | PR se necessário |
|------|-------------------|-----------------|
| Webhook Iugu fail-closed | PR #4945 mergeada | Verificar deploy |
| Idempotency guards billing crons | PR #5277 mergeada | Verificar deploy |
| DLQ consumer + Slack alerts | PR #5284 mergeada | Verificar operacional |
| GL atomic posting | PR #4944 mergeada | Verificar deploy |
| Subscription dedup | PR #4941 mergeada | Verificar deploy |
| Audit log endpoints | PR #4951 mergeada | Verificar operacional |
| Composite indexes GL | PR #4950 mergeada | Verificar em banco |

Para cada "mergeada" que NÃO estiver efetivamente em produção: garantir deploy.

**Bloco 10: Schema Snapshot + Lock**

- `drizzle-kit generate` — snapshot final do schema
- Comparar schema código vs schema banco (drift detection)
- Se tiver drift: migration PR

**Bloco 11: Smoke Tests**

| Test | Critério |
|------|---------|
| Backstage login + dashboard | Carrega sem erro |
| API /api/financeiro/overview | Retorna MRR/ARR |
| API /api/financeiro/dre | Retorna dados DRE |
| GL balance assertion | sum(debit) = sum(credit) |
| Billing webhook (Stripe test) | Processa sem erro |
| Billing webhook (Iugu test) | Processa sem erro |
| Sync Iugu trigger | Dados sincronizam |
| DLQ check | Fila vazia |

### Noite — Documentação Final (18:00-19:00)

- Atualizar data-architecture-sprint.md
- Criar checklist de produção no repo
- Notificar #status com status final
- Documentar rollback plan

---

## Documentação

O plano e toda documentação ficam em:

| Doc | Local | Acesso |
|-----|-------|--------|
| **Este plano** | `openclaw-infra/docs/sprint-producao-2402.md` | Git + Discord |
| Sprint log | `memory/data-architecture-sprint.md` | Persistente entre sessões |
| Architecture status | Repo freelaw `docs/data-architecture-status.md` (PR #5275) | Monorepo |

Ao final de cada dia, o resumo é postado no **#status** via webhook automaticamente.

---

## Orquestração

| Bloco | Canal | Bot/Tool |
|-------|-------|----------|
| Auditoria dados | #data | FreelawData (opus) |
| Typecheck/lint/build | #backstage | FreelawBackstage (sonnet) |
| Code review PRs | #review | FreelawReview (sonnet) |
| Deploy/restart | #ops ou SSH | FreelawOps / ops.sh |
| Notificações | #status | Webhook automático |
| Fluxos complexos | Terminal Mac | Claude Code direto |

---

## Meta: 28/02 GO/NO-GO

| Critério | Target |
|----------|--------|
| Billing E2E | Iugu + Stripe → v2_billing → GL → DRE funcional |
| Backstage | 28 views financeiras sem erro |
| GL integrity | sum(debit) = sum(credit) sempre |
| Guards CI | Todos green |
| DLQ | Empty |
| Webhooks | Processing < 5s p95 |
| Zero legacy | 0 queries payments.* |
