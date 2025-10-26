# Cortex Ledger

Sistema moderno de gestão financeira pessoal com classificação inteligente de transações, importação de extratos bancários e visualizações avançadas.

## Stack Tecnológica

- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime)
- **ORM:** Drizzle ORM
- **Frontend:** Next.js (planejado)
- **Monorepo:** pnpm + Turbo
- **IA:** OpenAI GPT para classificação automática
- **Visualização:** ECharts (planejado)

## Arquitetura

```
Cortex Ledger/
├── packages/
│   └── db/              # Drizzle schemas e migrações
├── supabase/
│   ├── migrations/      # SQL migrations
│   ├── functions/       # Edge Functions (Deno)
│   ├── tests/           # Testes de validação
│   └── seed.sql         # Dados de exemplo
├── PRD-v1.md            # Product Requirements Document
└── Supabase-Plan.md     # Plano de implementação detalhado
```

## Características Principais

### Implementadas (Batch 2C - Agent A)

✅ **Database & Security**
- 11 tabelas com Row Level Security (RLS)
- Dedupe automático via triggers SHA256
- Índices otimizados para queries frequentes
- Schemas TypeScript tipados (Drizzle)
- Isolamento completo de dados entre usuários

### Planejadas

🔄 **Classificação Inteligente (Agent B)**
- Regras customizáveis (regex, contains, starts, ends)
- Fallback OpenAI para transações ambíguas
- Logs de IA (custos, tokens, score)

🔄 **Importação de Extratos (Agent C)**
- Suporte CSV/OFX
- Templates por instituição (Bradesco, Nubank, Amex, Aeternum)
- Normalização automática de datas e valores
- Batch upsert (1k-5k linhas)

📋 **Features Futuras**
- Dashboard com métricas e gráficos
- Orçamentos e metas
- Detecção de anomalias
- Recorrências automáticas
- Exportação de relatórios

## Setup Rápido

### Pré-requisitos

- Node.js ≥ 20
- pnpm ≥ 9
- Conta Supabase (projeto: `xborrshstfcvzrxyqyor`)

### Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd "Cortex Ledger"

# Instale dependências
pnpm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase
```

### Aplicar Migração SQL

**Opção 1: Supabase Studio (Recomendado)**

1. Acesse: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/sql/new
2. Cole o conteúdo de `supabase/migrations/20251026T000000_init.sql`
3. Execute

**Opção 2: Supabase CLI**

```bash
supabase db push --project-ref xborrshstfcvzrxyqyor
```

### Criar Usuários de Teste

1. Dashboard → Auth → Users → Add User
2. Crie:
   - `user-a@test.com`
   - `user-b@test.com`

### Executar Seed

1. Obtenha UUIDs dos usuários:
   ```sql
   SELECT id, email FROM auth.users WHERE email IN ('user-a@test.com', 'user-b@test.com');
   ```
2. Edite `supabase/seed.sql` e substitua `USER_A_ID_AQUI` e `USER_B_ID_AQUI`
3. Execute no SQL Editor

### Validar RLS

Siga as instruções em `supabase/tests/RLS-VALIDATION.md`

## Estrutura de Desenvolvimento

### Terminais

```bash
# Terminal 1: Web app (futuro)
pnpm dev --filter @cortex/web

# Terminal 2: Testes (futuro)
pnpm --filter @cortex/services test --watch

# Terminal 3: DB migrations
pnpm db:generate  # Gera migrações Drizzle

# Terminal 4: Edge Functions
supabase functions serve --project-ref xborrshstfcvzrxyqyor

# Terminal 5: Supabase local (opcional)
supabase start
```

### Comandos Úteis

```bash
# Database
pnpm db:generate     # Gera migrações Drizzle
pnpm db:push         # Aplica migrações no DB
pnpm db:studio       # Abre Drizzle Studio

# Supabase
supabase functions deploy classify_batch --project-ref xborrshstfcvzrxyqyor
supabase secrets list --project-ref xborrshstfcvzrxyqyor
```

## Documentação

- **Setup Completo:** `supabase/README.md`
- **Testes RLS:** `supabase/tests/RLS-VALIDATION.md`
- **PRD:** `PRD-v1.md` (Product Requirements Document)
- **Plano Supabase:** `Supabase-Plan.md`
- **Relatório Agent A:** `AGENT_A_REPORT.md`

## Segurança

### Princípios

- ✅ **Row Level Security (RLS)** em todas as tabelas
- ✅ Dados isolados por `user_id = auth.uid()`
- ✅ Políticas owner-only (USING + WITH CHECK)
- ✅ Secrets via Supabase Vault (nunca no código)
- ✅ Client usa apenas `anon key` (safe)
- ✅ Service Role Key apenas em Edge Functions

### Validação

Execute os testes RLS para garantir isolamento completo entre usuários:

```bash
pnpm tsx supabase/tests/rls-test.ts
```

## Roadmap

### Batch 2C (Atual) - Fundação Supabase

- [x] **Agent A (DB/RLS/Types):** Schema, triggers, RLS, Drizzle ✅
- [ ] **Agent B (Edge Functions):** `classify_batch` com regras + OpenAI
- [ ] **Agent C (Import):** Parser CSV/OFX + batch upsert

### Futuras Versões

- Dashboard web (Next.js + Tailwind)
- Gráficos interativos (ECharts)
- Mobile app (React Native)
- Notificações push (Realtime)
- Integração com Open Banking

## Contribuindo

Este é um projeto em desenvolvimento seguindo um plano multi-agente. Consulte `Supabase-Plan.md` para entender a arquitetura e divisão de trabalho.

## Licença

[Definir licença]

---

**Status Atual:** Batch 2C - Agent A concluído ✅
**Próximo:** Agent B (classify_batch) e Agent C (import pipeline)
