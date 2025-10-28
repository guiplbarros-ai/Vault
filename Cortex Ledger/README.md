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
- macOS (para aplicativo desktop)

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

## Aplicativo Desktop (macOS)

O Cortex Ledger possui um aplicativo nativo para macOS que abre a aplicação web no Chrome:

### Instalar

O aplicativo já está instalado em `/Applications/Cortex Ledger.app`

### Usar

1. Inicie o servidor web:
   ```bash
   pnpm dev:web
   ```

2. Abra o aplicativo:
   - Clique no ícone no Launchpad/Dock
   - Ou execute: `pnpm open:desktop`
   - Ou pesquise "Cortex Ledger" no Spotlight

3. Para manter no Dock permanentemente:
   - Clique com botão direito no ícone do Dock
   - Opções → Manter no Dock

### Recriar/Personalizar

```bash
cd apps/desktop
./create-mac-app.sh
cp -r "Cortex Ledger.app" /Applications/
```

Veja mais detalhes em `apps/desktop/README.md`

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

### 📚 Documentação Principal
- **[Começar Aqui](./docs/LEIA-ME-PRIMEIRO.md)** — Navegação principal
- **[Status do Projeto](./docs/reports/STATUS-REPORT.md)** — Relatório consolidado (v5.0)
- **[PRD v1](./PRD-v1.md)** — Product Requirements Document

### 🔧 Guias Técnicos
- **[Guia de Backend](./docs/guides/DESBLOQUEIO-BACKEND-GUIA.md)** — Setup migrations e deploy
- **[Guia de UI](./docs/guides/UI-FRONTEND-GUIDE.md)** — Design System
- **[Setup Supabase](./supabase/README.md)** — Configuração completa

### 🏗️ Arquitetura
- **[Arquitetura Geral](./docs/architecture/ARCHITECTURE.md)** — Decisões arquiteturais
- **[Arquitetura de Importação](./docs/architecture/ARQUITETURA-IMPORTACAO.md)** — ETL e parsers
- **[Validação RLS](./supabase/tests/RLS-VALIDATION.md)** — Testes de segurança

### 📁 Toda a Documentação
Veja o índice completo em **[docs/README.md](./docs/README.md)**

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

## Status do Projeto

> **Última atualização:** 27 de outubro de 2025

```
Backend:   ██████████████████████████████████████████ 100%
Frontend:  ███████████████████████████████████████░░░  95%
═══════════════════════════════════════════════════
TOTAL:     ███████████████████████████████████████░░░  97%
```

### ✅ Completo
- Schema PostgreSQL (11 tabelas)
- Migrations SQL (3 arquivos)
- Edge Function de classificação
- Parsers CSV/OFX (Bradesco, Aeternum, Amex)
- Dedupe e normalização
- Autenticação completa
- Layout responsivo com sidebar
- 14+ componentes UI com Design System
- Dashboard com gráficos ECharts
- 10 páginas funcionais
- Sistema de filtros e paginação
- Dark mode

### 🟡 Em Progresso
- Aplicação completa do Design System (35% → 100%)
- Features de orçamento (CRUD completo)
- Upload drag-and-drop importação
- Gestão de regras de classificação

### 📊 Detalhes Completos
Veja o [Status Report](./docs/reports/STATUS-REPORT.md) para métricas detalhadas e próximos passos.

## Roadmap

### Próximas Semanas
1. **Aplicar migrations** no Supabase (5min)
2. **Deploy Edge Function** (5min)
3. **Completar Design System** (1-2 dias)
4. **Features Agent F** (2-3 dias) — Orçamento, Importação, Regras
5. **Testes E2E** (1 dia)
6. **Beta Fechado** (1-3 usuários)

**Estimativa para Beta:** 1 semana

### Futuras Versões
- Performance optimization
- Polimento UX (empty states, loading skeletons)
- Documentação de usuário
- Mobile app (React Native)
- Notificações push (Realtime)
- Integração com Open Banking

## Contribuindo

Este é um projeto em desenvolvimento ativo. Consulte:
- **[Status Report](./docs/reports/STATUS-REPORT.md)** para o estado atual
- **[Arquitetura](./docs/architecture/ARCHITECTURE.md)** para decisões técnicas
- **[PRD v1](./PRD-v1.md)** para requisitos do produto

## Licença

[Definir licença]

---

**Servidor dev rodando em:** http://localhost:3000
**Documentação completa:** [docs/README.md](./docs/README.md)
