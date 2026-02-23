# Cortex Cash: Dexie → Supabase Migration

## Status: COMPLETE ✅

Migrado, deployado e em produção em `cortex-cash.fly.dev` desde 2026-02-23.

---

## Resumo

| Item | Detalhe |
|------|---------|
| **Origem** | Dexie.js (IndexedDB) — dados 100% local no browser |
| **Destino** | Supabase (PostgreSQL) — schema `cortex_cash` |
| **Projeto Supabase** | `prvxkdzmlemyhzarilhr` (compartilhado com atlas-app, schema separado) |
| **Deploy** | Fly.io — `cortex-cash.fly.dev` (região gru, 512MB) |
| **Serviços migrados** | 22 service files, ~12.000 linhas de código |
| **Tabelas** | 26 tabelas + RLS policies + indexes |
| **Dados migrados** | 2.185 transações, 107 regras, 38 categorias, 4 contas, 21 investimentos, 25 tags |
| **User ID** | `4f0a4b1f-7244-4866-b517-58a713837a54` |

---

## Arquitetura

```
Browser (Next.js)  ──→  Fly.io (SSR + API)  ──→  Supabase (PostgreSQL)
                                                       ↑
Discord (OpenClaw) ──→  API /api/financeiro/*  ────────┘
                                                       ↑
Pluggy (Open Finance) ──→  /api/pluggy/*  ─────────────┘
```

---

## O que foi feito

### Sprint 1: Supabase Foundation ✅
- [x] Schema `cortex_cash` criado no Supabase (mesmo projeto do atlas-app)
- [x] 26 tabelas via `001_initial_schema.sql` (SQLite → PostgreSQL: uuid, timestamptz, numeric, jsonb)
- [x] 70+ RLS policies via `002_rls_policies.sql` (`usuario_id = auth.uid()`)
- [x] 25+ indexes via `003_indexes.sql`
- [x] GRANT de permissões: `anon`, `authenticated`, `service_role` no schema `cortex_cash`

### Sprint 2: Supabase Client + Auth ✅
- [x] `lib/db/supabase.ts` — 4 exports: `getSupabaseBrowserClient()`, `getSupabaseServerClient()`, `getSupabaseAuthClient()`, `getSupabase()`
- [x] Todos os clients com `db: { schema: 'cortex_cash' }`
- [x] `@supabase/supabase-js` e `@supabase/ssr` instalados
- [x] `output: 'standalone'` em `next.config.mjs`
- [x] `.env.example` e `.env.local` com variáveis Supabase

### Sprint 3: Auth Migration ✅
- [x] `auth.service.ts` → `supabase.auth.signInWithPassword()` / `signUp()`
- [x] `auth-provider.tsx` → Supabase session via `onAuthStateChange`
- [x] `middleware.ts` → server-side session refresh com `@supabase/ssr`
- [x] `usuario.service.ts` → tabela `profiles` linkada a `auth.users.id`
- [x] `db-provider.tsx` → removido Dexie init, adicionado Supabase init
- [x] User criado no Supabase Auth: `guilhermeplbarros@gmail.com`
- [x] Profile criado em `cortex_cash.profiles`

### Sprint 4-5: Service Layer Migration (22 services) ✅
- [x] `instituicao.service.ts` → Supabase
- [x] `conta.service.ts` → Supabase
- [x] `categoria.service.ts` → Supabase
- [x] `tag.service.ts` → Supabase
- [x] `transacao.service.ts` → Supabase (core, mais complexo)
- [x] `regra-classificacao.service.ts` → Supabase
- [x] `orcamento.service.ts` → Supabase
- [x] `relatorio.service.ts` → Supabase
- [x] `cartao.service.ts` → Supabase (faturas, lançamentos — maior service)
- [x] `import.service.ts` → Supabase
- [x] `investimento.service.ts` → Supabase
- [x] `patrimonio.service.ts` → Supabase
- [x] `planejamento.service.ts` → Supabase
- [x] `projecao.service.ts` → Supabase
- [x] `imposto-renda.service.ts` → Supabase
- [x] `ai-usage.service.ts` + `ai-usage.store.ts` → Supabase
- [x] `pluggy-sync.service.ts` → Supabase
- [x] `settings.service.ts` → Supabase
- [x] `auth.service.ts` → Supabase Auth
- [x] `usuario.service.ts` → Supabase profiles

### Sprint 6: Cleanup de Referências Dexie ✅
- [x] ~56 arquivos atualizados para remover `getDB()`, `import ... from 'dexie'`, referências IndexedDB
- [x] Todas as pages, components, forms, providers, lib/ files atualizados
- [x] Zero referências Dexie restantes em código de runtime (apenas testes e script de migração)

### Sprint 7: Type Fixes ✅
- [x] 15+ arquivos com `any` type annotations adicionadas (Supabase client sem generated types)
- [x] Build TypeScript passa com 0 erros

### Sprint 8: Data Migration ✅
- [x] Dados exportados do IndexedDB via Playwright browser automation → `scripts/data/export.json` (1.2MB)
- [x] Script de migração executado: `bun run scripts/migrate-dexie-to-supabase.ts`
- [x] 3 faturas com `usuario_id` null fixadas manualmente via REST API
- [x] Contagens verificadas no Supabase

**Dados migrados:**
| Tabela | Registros |
|--------|-----------|
| transacoes | 2.185 |
| regras_classificacao | 107 |
| categorias | 38 |
| tags | 25 |
| orcamentos | 9 |
| contas | 4 |
| investimentos | 21 |
| faturas | 3 |
| faturas_lancamentos | ~200 |
| patrimonio_snapshots | 5 |
| ... | (demais tabelas) |

### Sprint 9: Deploy Infrastructure ✅
- [x] `Dockerfile` — multi-stage build (deps → builder → runner), Node 20 Alpine
- [x] `fly.toml` — app `cortex-cash`, região gru, 512MB, auto-stop
- [x] Fly.io app criado, secrets configurados
- [x] Deploy bem-sucedido em `cortex-cash.fly.dev`

**Problemas resolvidos durante deploy:**
1. **npm peer deps**: `eslint-config-next` requer eslint>=9.0.0, projeto tem 8.x → `--legacy-peer-deps`
2. **tsconfig.json**: `extends: "../../tsconfig.base.json"` não resolve no Docker → inlined base config
3. **OpenAI client**: `new OpenAI()` no top-level crasha sem `OPENAI_API_KEY` no build → lazy init com `getOpenAI()`
4. **public/ permissions**: `nextjs` user não consegue ler `/app/public/examples` → `--chown=nextjs:nodejs`

**Fly.io Secrets configurados:**
```
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
PLUGGY_CLIENT_ID
PLUGGY_CLIENT_SECRET
```

**Build args (passados no deploy):**
```
NEXT_PUBLIC_SUPABASE_URL=https://prvxkdzmlemyhzarilhr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### Sprint 10: API Endpoints + Verificação em Produção ✅
- [x] 6 API endpoints criados e verificados com dados reais em produção

**Endpoints em produção (cortex-cash.fly.dev):**
| Endpoint | Auth | Resultado em Produção |
|----------|------|-----------------------|
| `GET /api/financeiro/resumo` | Bearer (service_role) | Patrimônio R$192.989,87 · Receitas R$28.051,87 · Despesas R$19.197,40 |
| `GET /api/financeiro/transacoes` | Bearer (service_role) | 20 transações retornadas com data, descrição, valor, tipo |
| `GET /api/financeiro/contas` | Bearer (service_role) | 4 contas · Saldo total -R$4.510,35 |
| `GET /api/financeiro/health-score` | Bearer (service_role) | Score 61 "Bom" · Poupança 63 · Investimento 100 · Orçamento 78 |
| `GET /api/financeiro/patrimonio` | Bearer (service_role) | R$197.500,22 investimentos · Evolução 5 meses |
| `GET /api/financeiro/orcamento` | Bearer (service_role) | 9 categorias · 67.5% utilizado |

**RLS Security (verificado):**
| Teste | Resultado |
|-------|-----------|
| Anon key lê profiles | ✅ Bloqueado (array vazio) |
| Service role lê profiles | ✅ Retorna dados |
| Authenticated user lê próprio | ✅ Retorna só seus dados |

---

## Estrutura de Arquivos

```
cortex-cash/
├── app/
│   ├── api/
│   │   ├── ai/                    # AI classification + reports
│   │   │   ├── classify/route.ts
│   │   │   ├── classify/batch/route.ts
│   │   │   └── report/route.ts
│   │   ├── financeiro/            # Discord/API endpoints (6 routes)
│   │   │   ├── resumo/route.ts
│   │   │   ├── transacoes/route.ts
│   │   │   ├── contas/route.ts
│   │   │   ├── health-score/route.ts
│   │   │   ├── patrimonio/route.ts
│   │   │   └── orcamento/route.ts
│   │   ├── import/                # Import de extratos
│   │   └── pluggy/                # Open Finance (Pluggy)
│   ├── providers/
│   │   ├── auth-provider.tsx      # Supabase Auth session
│   │   └── db-provider.tsx        # Supabase init
│   └── ...                        # Pages
├── lib/
│   ├── db/
│   │   ├── supabase.ts            # ★ Supabase clients (browser, server, auth)
│   │   └── client.ts              # ⚠ LEGACY — Dexie (pode ser removido)
│   └── services/                  # 22 services (todos migrados para Supabase)
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql # 26 tabelas
│       ├── 002_rls_policies.sql   # 70+ RLS policies
│       └── 003_indexes.sql        # 25+ indexes
├── scripts/
│   ├── migrate-dexie-to-supabase.ts
│   └── data/export.json           # Dados exportados do IndexedDB (1.2MB)
├── Dockerfile                     # Multi-stage build
├── fly.toml                       # Fly.io config (gru, 512MB)
├── middleware.ts                   # Supabase session refresh
└── tsconfig.json                  # Standalone (base config inlined)
```

---

## Como fazer deploy

```bash
# Deploy (do diretório cortex-cash)
fly deploy --app cortex-cash \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://prvxkdzmlemyhzarilhr.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Ver logs
fly logs --app cortex-cash

# Status
fly status --app cortex-cash

# Secrets (já configurados, mas para referência)
fly secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
fly secrets set OPENAI_API_KEY=<key>
fly secrets set PLUGGY_CLIENT_ID=<id>
fly secrets set PLUGGY_CLIENT_SECRET=<secret>
```

## Como consultar a API

```bash
# Resumo financeiro
curl https://cortex-cash.fly.dev/api/financeiro/resumo \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"

# Transações recentes
curl https://cortex-cash.fly.dev/api/financeiro/transacoes \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"

# Health score
curl https://cortex-cash.fly.dev/api/financeiro/health-score \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
```

---

## O que falta fazer

### Prioridade Alta

- [ ] **Configurar Discord bots (OpenClaw)** para consultar a API
  - Bots `pessoal` ou `data` podem fazer `curl` para `cortex-cash.fly.dev/api/financeiro/*`
  - Auth via `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
  - Comandos sugeridos: `!resumo`, `!transacoes`, `!score`, `!patrimonio`

- [ ] **Testar Pluggy em produção**
  - Conexão Pluggy com conta Bradesco real
  - Sync de transações via `/api/pluggy/sync`
  - Verificar se novas transações chegam ao Supabase

### Prioridade Média

- [ ] **CI/CD (GitHub Actions)**
  - Pipeline: typecheck → build → deploy condicional (push to main)
  - Exemplo: `.github/workflows/deploy.yml`

- [ ] **Supabase Generated Types**
  - Rodar `npx supabase gen types typescript` para gerar tipos
  - Substitui os `: any` adicionados durante a migração
  - Melhora autocomplete e type safety

- [ ] **Login no app web**
  - Testar flow de login em `cortex-cash.fly.dev/login`
  - Credenciais: `guilhermeplbarros@gmail.com` / `cortex-cash-2024`
  - Verificar se o app carrega dados do Supabase corretamente no browser

### Prioridade Baixa (Cleanup)

- [ ] **Remover Dexie do package.json**
  - `dexie` (dependency)
  - `fake-indexeddb` (devDependency)
  - Requer atualizar 19 arquivos de teste que ainda usam Dexie/fake-indexeddb mocks

- [ ] **Remover `lib/db/client.ts`** (antigo Dexie client, não usado)

- [ ] **Atualizar testes para Supabase mocks**
  - 10 test files em `lib/services/*.test.ts` e `tests/` usam Dexie
  - Migrar para mocks do Supabase client

- [ ] **Remover `components/performance-dashboard.tsx`** referência a indexedDB (ou migrar)

- [ ] **`min_machines_running = 0`** no fly.toml
  - Atualmente cria 2 machines (HA). Com 0, a 2a machine para após cold start.
  - Já está configurado, mas Fly criou 2 machines no primeiro deploy. A 2a já está stopped.

---

## Credenciais

### Supabase Auth
- Email: `guilhermeplbarros@gmail.com`
- Password: `cortex-cash-2024`
- User ID: `4f0a4b1f-7244-4866-b517-58a713837a54`

### Supabase Project
- Dashboard: https://supabase.com/dashboard/project/prvxkdzmlemyhzarilhr
- Schema: `cortex_cash`
- URL: `https://prvxkdzmlemyhzarilhr.supabase.co`

### Fly.io
- App: `cortex-cash`
- URL: https://cortex-cash.fly.dev
- Region: gru (São Paulo)
- Machines: 2 (1 started, 1 stopped)

---

## Timeline

| Data | Sessão | O que foi feito |
|------|--------|----------------|
| 2026-02-22 | Session 1 | Schema SQL, RLS policies, indexes no Supabase |
| 2026-02-22/23 | Session 2 | Supabase client, auth, 22 services migrados, build passa |
| 2026-02-23 | Session 3 | Cleanup ~56 files getDB(), fix types, data migration via Playwright |
| 2026-02-23 | Session 3 | Fly.io app criado, 4 fixes no Dockerfile/tsconfig, deploy bem-sucedido |
| 2026-02-23 | Session 3 | 6 API endpoints verificados em produção com dados reais |
