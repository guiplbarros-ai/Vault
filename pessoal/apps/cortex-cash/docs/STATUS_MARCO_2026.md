# Vault One (ex-Cortex Cash) - Status Março 2026

## Estado Atual: v0.5.0-dev

O app avancou significativamente alem do roadmap original. Todas as versoes de v0.1 a v0.5 foram implementadas, incluindo features que estavam planejadas para v1.0+.

### Stack Atual
- **Frontend**: Next.js 16 + React 19 + TypeScript
- **UI**: Tailwind CSS 4 + shadcn/ui + Radix UI + Recharts
- **Backend**: Supabase (PostgreSQL) + Drizzle ORM
- **Auth**: Supabase Auth + RLS (Row Level Security)
- **IA**: OpenAI GPT-4o-mini (classificacao de transacoes)
- **Bank Sync**: Bradesco Infoemail (Gmail → PDF → Parse) via vault-zero
- **Testes**: Vitest + Happy DOM
- **Deploy**: Docker Compose on Hetzner (https://89-167-95-71.sslip.io)

### Features Implementadas

| Feature | Status | Notas |
|---------|--------|-------|
| Dashboard com KPIs e graficos | OK | Health score, cash flow, tendencias |
| Contas bancarias (CRUD, hierarquia) | OK | Multi-tipo, saldo calculado |
| Transacoes (CRUD, bulk, filtros) | OK | Hash dedupe, classificacao |
| Categorias (hierarquia, merge, analytics) | OK | Sistema + custom por usuario |
| Orcamentos (planejado vs realizado) | OK | Auto-sugestoes, alertas 80/100% |
| Cartoes de credito + faturas | PARCIAL | Falta pagamento de fatura |
| Classificacao por regras | OK | contains, starts_with, ends_with, regex |
| Classificacao por IA (OpenAI) | OK | Cache, custo monitorado, batch |
| Tags (sistema + custom) | OK | Auto-tagging |
| Importacao CSV + templates | OK | Bradesco, Inter, Santander, etc |
| Importacao OFX | NAO | Marcado "not yet supported" |
| Patrimonio e investimentos | OK | Alocacao, evolucao, top performers |
| Imposto de Renda | OK | Declaracoes, rendimentos, deducoes, bens |
| Planejamento financeiro | OK | Cenarios, projecoes 5 anos |
| Relatorios comparativos | OK | M/M, YTD, dia da semana |
| ~~Integracao Pluggy (Open Finance)~~ | DEPRECATED | Removido em 2026-03-23 — substituído por Bradesco email sync |
| API publica (Bearer token) | OK | Para Discord bots, ferramentas externas |
| Auth + multi-tenant (RLS) | OK | Isolamento por usuario |
| PWA (offline, service worker) | OK | Cache strategies, manifest |
| Admin tools | OK | Demo mode, diagnostics, seed |
| Onboarding | OK | Fluxo primeiro acesso |

### Database
- 26 tabelas no schema `cortex_cash`
- 5 migrations aplicadas
- RLS em todas as tabelas
- Migracao Dexie.js -> Supabase COMPLETA

### Qualidade
- 23 arquivos de teste (services + utils)
- Seguranca: CSP, HSTS, rate limiting, input sanitization
- Tipos manuais (sem auto-gen do Supabase CLI)

---

## Gaps Identificados (Fase 1 - Consolidacao)

1. **Tipos Supabase manuais** - Risco de drift com schema real. Gerar via `supabase gen types`.
2. **Pagamento de fatura** - TODO no codigo, feature core incompleta.
3. **OFX parsing** - Prometido mas nao implementado.
4. **Cambio USD/BRL hardcoded** (R$6.00) - Impreciso para custo de IA.
5. **Testes edge cases** - Cobertura focada em happy path.

---

## Proximos Passos

### Fase 1 - Consolidacao (1-2 semanas)
- [ ] Gerar tipos automaticos do Supabase
- [ ] Implementar pagamento de fatura
- [ ] Implementar parsing OFX
- [ ] Cambio dinamico via API
- [ ] Expandir testes para edge cases criticos

### Fase 2 - App Mobile (3-4 semanas)
- [ ] Expo + React Native em `pessoal/apps/vault-one-mobile/`
- [ ] Expo Router (paradigma similar ao Next.js)
- [ ] Compartilhar types via `@pessoal/shared`
- [ ] Telas: quick add, dashboard resumido, verificacao, push notifications
- [ ] Mesmo backend Supabase

### Fase 3 - Superpoderes Mobile (ongoing)
- [ ] Sync offline bidirecional
- [ ] Widgets nativos (saldo na home screen)
- [ ] Biometria (FaceID/fingerprint)
- [ ] Deep links web <-> mobile

---

## Decisao de Renomeacao

O app passa a se chamar **Vault One** (anteriormente Cortex Cash). O nome do package e diretorio (`cortex-cash`) sera mantido por enquanto para evitar breaking changes, mas toda referencia publica deve usar "Vault One".
