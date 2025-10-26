# Cortex Ledger — Arquitetura Híbrida (v1)

> **Status:** Arquitetura definida e aprovada
> **Data:** 2025-10-26
> **Decisão:** Híbrido (Supabase como fonte da verdade + SQLite local para cache offline)

---

## 1. Decisão Arquitetural

### Arquitetura Escolhida: **HÍBRIDO**

**Supabase (Cloud) como fonte da verdade:**
- PostgreSQL com RLS para dados multiusuário
- Auth nativo do Supabase
- Edge Functions para classificação server-side
- Realtime para sincronização

**SQLite (Local) como cache offline:**
- Réplica local para leitura rápida
- Suporte offline (read + enfileiramento de writes)
- Senha local para lock do app

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                      USER (Web App)                         │
│                     Next.js + React                          │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               │ Online                   │ Offline
               ▼                          ▼
┌──────────────────────────┐   ┌─────────────────────────────┐
│   Supabase (Cloud)       │   │  SQLite Local (Cache)       │
│   - Auth                 │◄──┤  - Leitura rápida           │
│   - PostgreSQL + RLS     │   │  - Enfileirar writes        │
│   - Edge Functions       │   │  - Senha local              │
│   - Storage              │   │                             │
│   - Realtime             │   │  Sync quando online         │
└──────────────────────────┘   └─────────────────────────────┘
```

---

## 2. Stack Tecnológico Consolidada

| Componente | Tecnologia | Propósito |
|------------|------------|-----------|
| **Frontend** | Next.js 14+ (App Router) | UI/UX, SSR, PWA |
| **Cloud DB** | Supabase PostgreSQL | Fonte da verdade, multiusuário |
| **Cache Local** | SQLite (better-sqlite3) | Offline, latência reduzida |
| **ORM** | Drizzle | Schema + migrations (ambos DBs) |
| **Auth** | Supabase Auth | Login/signup cloud |
| **Lock Local** | Senha local | Proteger dados no cache |
| **Classificação** | Edge Functions + OpenAI | Server-side, seguro |
| **Sync** | Supabase Realtime | Push updates para clientes |
| **Gráficos** | ECharts | Dashboards |
| **Ícones** | Lucide | UI consistente |
| **Build** | Turbo + pnpm | Monorepo, velocidade |

---

## 3. Estrutura de Pastas (Monorepo)

```
/Cortex Ledger
├── apps/
│   └── web/                    # Next.js app (TODO: criar)
│       ├── app/                # App Router
│       ├── components/         # Componentes específicos
│       ├── lib/                # Utils, hooks
│       └── public/             # Assets estáticos
│
├── packages/
│   ├── db/                     # ✅ Schema Drizzle (PostgreSQL)
│   │   ├── schema/             # Tabelas, relações
│   │   ├── migrations/         # Migrações Supabase
│   │   └── drizzle.config.ts
│   │
│   ├── db-local/               # TODO: Schema SQLite (cache)
│   │   ├── schema/             # Espelho das tabelas principais
│   │   └── sync.ts             # Lógica de sincronização
│   │
│   ├── services/               # ⚠️  Lógica de negócio
│   │   ├── normalization.ts    # ✅ Normalização de dados
│   │   ├── dedupe.ts           # TODO: Deduplicação
│   │   ├── rules.ts            # TODO: Engine de regras
│   │   └── classification.ts   # TODO: Cliente para Edge Function
│   │
│   ├── etl/                    # TODO: Importação CSV/OFX
│   │   ├── parsers/            # CSV, OFX, Excel
│   │   ├── templates/          # Mapeamentos por instituição
│   │   └── cli.ts              # CLI de importação
│   │
│   └── ui/                     # TODO: Componentes compartilhados
│       ├── table.tsx
│       ├── chart-wrapper.tsx
│       └── theme.ts
│
├── supabase/
│   ├── functions/
│   │   └── classify_batch/     # ⚠️  Edge Function (classificação)
│   └── migrations/             # SQL migrations (TODO: aplicar)
│
├── assets/                     # ✅ Ícones prontos
├── PRD-v1.md                   # ⚠️  Precisa atualização
├── Supabase-Plan.md            # Plano Supabase detalhado
└── ARCHITECTURE.md             # 👈 Este documento
```

---

## 4. Divisão de Trabalho (Agentes A, B, C)

### **Agent A — AGENT_DB_RLS** (Database & Schema)
**Responsabilidade:** Implementar e validar schemas (PostgreSQL + SQLite local)

**Tarefas:**
1. ✅ Schema PostgreSQL (`packages/db/schema/tables.ts`) — COMPLETO
2. ⚠️ Aplicar migrations no Supabase (via SQL Studio)
3. ⚠️ Validar RLS com 2 usuários teste
4. ❌ Criar `packages/db-local/` com schema SQLite espelhado
5. ❌ Implementar lógica de sync (Realtime → SQLite)
6. ❌ Testes: inserção, dedupe, RLS

**Aceite:**
- Migrations aplicadas; RLS funcionando
- SQLite local espelha tabelas principais
- Script de sync funcional (online → cache)

---

### **Agent B — AGENT_EDGE_CLASSIFY** (Classificação Server-Side)
**Responsabilidade:** Completar Edge Function `classify_batch`

**Tarefas:**
1. ⚠️ Skeleton existe (`supabase/functions/classify_batch/`)
2. ❌ Implementar engine de regras (regex, contains, starts, ends)
3. ❌ Integrar OpenAI para fallback
4. ❌ Persistir logs em `log_ia` (tokens, custo, score)
5. ❌ Testes: autorização, regras, fallback IA

**Interface (contrato):**
```typescript
// Request
POST /classify_batch
Authorization: Bearer <USER_TOKEN>
{
  "limit": 500,
  "dryRun": false,
  "useOpenAI": true,
  "filters": { "contaId": "uuid-here" }
}

// Response
{
  "processed": 450,
  "categorized": 420,
  "openaiCalls": 30,
  "errors": []
}
```

**Aceite:**
- Regras aplicadas na ordem correta (`ordem` ASC)
- OpenAI só chamado quando necessário
- Logs de custo precisos (±5%)

---

### **Agent C — AGENT_IMPORT_ETL** (Importação de Arquivos)
**Responsabilidade:** Parser tolerante + batch upsert

**Tarefas:**
1. ⚠️ `normalization.ts` existe (6.6KB)
2. ❌ Parser CSV/OFX (detectar cabeçalho, tolerar linhas ruins)
3. ❌ Normalização de datas (DD/MM/YYYY → ISO)
4. ❌ Normalização de valores (vírgula → ponto)
5. ❌ Computar `hash_dedupe` (SHA256)
6. ❌ Templates por instituição (Bradesco, Aeternum, Amex)
7. ❌ Batch upsert (1k–5k linhas por lote)
8. ❌ CLI de importação funcional

**Aceite (PRD 1.3):**
- 10k linhas importadas em ≤ 2min
- Dedupe > 99% de duplicatas exatas
- Report: N importadas, M descartadas, K duplicatas

---

## 5. Sincronização (Híbrido)

### 5.1 Estratégia de Sync

**Online (modo padrão):**
- Writes vão direto para Supabase
- Reads preferem cache local (se disponível)
- Realtime atualiza cache automaticamente

**Offline:**
- Reads do SQLite local
- Writes enfileirados (tabela `pending_writes`)
- Ao voltar online: flush da fila → Supabase

### 5.2 Tabelas a Sincronizar

**Críticas (sempre em cache):**
- `transacao` (últimos 6 meses)
- `conta`, `categoria`, `regra_classificacao`
- `orcamento` (ano corrente)

**Opcionais:**
- `log_ia` (não sincroniza; apenas cloud)
- `template_importacao` (só se usado)

### 5.3 Conflitos

- **Estratégia:** Last-write-wins (timestamp)
- **v1 simples:** usuário único, conflitos raros
- **v2 (futuro):** CRDT para multi-device

---

## 6. Segurança

| Item | Supabase | SQLite Local |
|------|----------|--------------|
| **Auth** | JWT (Supabase Auth) | Senha local (lock app) |
| **RLS** | ✅ Por `user_id` | ❌ (single user) |
| **Criptografia** | At-rest (Supabase) | SQLCipher (TODO) |
| **Secrets** | Vault (Edge Functions) | Keychain OS (chave API) |

---

## 7. Testes Mínimos (60% cobertura)

### Unit Tests
- `normalization.ts`: datas, valores, descrições
- `dedupe.ts`: hash consistency
- `rules.ts`: regex, contains, starts, ends, ordem
- `sync.ts`: enfileiramento, flush, conflitos

### Integration Tests
- Importação E2E (CSV → Supabase → SQLite)
- Classificação E2E (regras → IA fallback)
- RLS (cross-user denied)

### Smoke Tests
- Importar 4 arquivos amostra (Bradesco, Aeternum, Amex)
- Classificar 1k transações
- Sync offline→online

---

## 8. Roadmap de Implementação (4 semanas)

### Semana 1: Fundação
- [ ] Criar `/apps/web` (Next.js)
- [ ] Aplicar migrations Supabase
- [ ] Validar RLS
- [ ] Criar `packages/db-local/` (SQLite)
- [ ] Layout base + tema

### Semana 2: Importação
- [ ] Parser CSV/OFX tolerante
- [ ] Templates por instituição
- [ ] Batch upsert funcionando
- [ ] CLI de importação
- [ ] Tela "Importar" (preview)

### Semana 3: Classificação
- [ ] Edge Function `classify_batch` completa
- [ ] Engine de regras
- [ ] Fallback OpenAI
- [ ] Logs de custo
- [ ] Sync básico (Realtime → SQLite)

### Semana 4: Dashboards + Polimento
- [ ] DFC simplificado
- [ ] Orçado vs. Realizado
- [ ] Alertas 80%/100%
- [ ] Testes E2E
- [ ] PWA (manifest + ícones)

---

## 9. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| **Complexidade do híbrido** | Começar com sync simples (polling); Realtime depois |
| **Quota Supabase (free tier)** | Monitorar uso; plano de upgrade |
| **Custo IA** | Teto US$ 10/mês; alertas 80%/100%; hard stop |
| **Drift schema (PG vs SQLite)** | Drizzle para ambos; CI valida |
| **Latência cloud** | Cache agressivo; prefetch dados comuns |

---

## 10. Comandos Úteis (DevOps)

### Supabase
```bash
# Aplicar migration
supabase db push --project-ref xborrshstfcvzrxyqyor

# Servir Edge Functions localmente
supabase functions serve classify_batch

# Deploy Edge Function
supabase functions deploy classify_batch --project-ref xborrshstfcvzrxyqyor

# Configurar secrets
supabase secrets set OPENAI_API_KEY=sk-...
```

### Drizzle (PostgreSQL)
```bash
# Gerar migrations
pnpm --filter @cortex/db drizzle:generate

# Aplicar no Supabase
pnpm --filter @cortex/db drizzle:push
```

### SQLite Local (futuro)
```bash
# Gerar schema
pnpm --filter @cortex/db-local generate

# Executar sync manual
pnpm --filter @cortex/db-local sync
```

### Monorepo
```bash
# Instalar deps
pnpm install

# Dev (todos os pacotes)
pnpm dev

# Build
pnpm build

# Testes
pnpm test
```

---

## 11. Definition of Done (Beta Fechado)

- [ ] **Importação:** 10k linhas em ≤ 2min; dedupe >99%
- [ ] **Classificação:** ≥85% sugestão automática; regras vencem IA
- [ ] **Orçamento:** Alertas 80%/100% funcionando
- [ ] **Dashboards:** DFC, Orçado vs. Realizado, Evolução M/M
- [ ] **Offline:** Leitura funciona; writes enfileirados
- [ ] **Sync:** Realtime atualiza cache local
- [ ] **Segurança:** RLS validado; senha local ativa
- [ ] **Testes:** 60% cobertura; smoke E2E passa
- [ ] **PWA:** Instalável no macOS (Dock icon)

---

## 12. Próximos Passos Imediatos

### Para Agente A (DB):
1. Aplicar migrations no Supabase Studio
2. Criar 2 usuários teste e validar RLS
3. Scaffoldar `packages/db-local/`

### Para Agente B (Edge Function):
1. Verificar skeleton existente
2. Implementar engine de regras (sem IA primeiro)
3. Testes de autorização

### Para Agente C (ETL):
1. Revisar `normalization.ts` existente
2. Implementar parser CSV (header detection)
3. Criar CLI básico (importar 1 arquivo teste)

---

**Versão:** 1.0
**Última atualização:** 2025-10-26
**Próxima revisão:** Após Semana 1 (validar fundação)
