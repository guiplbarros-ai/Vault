# Decisões Técnicas - Budget Cortihouse

**Data:** Janeiro 2026
**Status:** ✅ DEFINIDO

---

## Stack Confirmada

| Categoria | Tecnologia | Justificativa |
|-----------|------------|---------------|
| **Framework** | Next.js 14+ (App Router) | SSR, RSC, melhor DX |
| **Linguagem** | TypeScript (strict) | Type safety |
| **Styling** | Tailwind CSS + shadcn/ui | Componentes acessíveis |
| **Database** | Supabase (PostgreSQL) | Auth + Storage integrados |
| **ORM** | Drizzle ORM | Performance, type-safe |
| **Auth** | Supabase Auth | Integração nativa |
| **Deploy** | Fly.io | Boa performance, preço justo |
| **Package Manager** | pnpm | Rápido, eficiente |
| **Testes** | Vitest (unit only) | Rápido, compatível com Vite |
| **State** | Zustand + TanStack Query | Simples e eficiente |
| **Forms** | React Hook Form + Zod | Validação type-safe |
| **PDF** | @react-pdf/renderer | Geração client-side |

---

## Decisões de Projeto

| Decisão | Escolha |
|---------|---------|
| Estrutura | Projeto único (não monorepo) |
| i18n | Não (só português) |
| Documentação | Comentários essenciais |
| Git Strategy | main + feature branches |
| Commits | Conventional Commits |

---

## Configurações Específicas

### TypeScript
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

### ESLint
- Extends: next/core-web-vitals
- Plugin: @typescript-eslint
- Rules: consistent-type-imports, no-unused-vars (error)

### Prettier
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## Variáveis de Ambiente

```env
# App
NEXT_PUBLIC_APP_URL=https://budget.cortihouse.com.br
NEXT_PUBLIC_APP_NAME="Budget Cortihouse"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (Supabase connection string)
DATABASE_URL=

# Fly.io (se necessário)
FLY_APP_NAME=budget-cortihouse
```

---

## Dependências Principais

```json
{
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.1.0",
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "@react-pdf/renderer": "^3.1.0",
    "date-fns": "^3.2.0",
    "lucide-react": "^0.303.0",
    "sonner": "^1.3.0",
    "tailwind-merge": "^2.2.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "drizzle-kit": "^0.20.0",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.1.0",
    "prettier": "^3.2.0",
    "vitest": "^1.2.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}
```

---

## Estrutura de Pastas (Confirmada)

```
budget-cortihouse/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Grupo de rotas públicas
│   │   ├── (dashboard)/       # Grupo de rotas protegidas
│   │   ├── api/               # Route handlers
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                # shadcn/ui
│   │   ├── forms/             # Formulários
│   │   ├── layout/            # Header, Sidebar
│   │   └── orcamento/         # Específicos de orçamento
│   ├── lib/
│   │   ├── supabase/          # Client e server
│   │   ├── db/                # Drizzle config e schema
│   │   ├── validations/       # Schemas Zod
│   │   └── utils.ts
│   ├── hooks/                 # Custom hooks
│   ├── services/
│   │   ├── calculadora/       # Lógica de cálculo
│   │   └── pdf/               # Geração de PDF
│   ├── stores/                # Zustand stores
│   ├── types/                 # TypeScript types
│   └── constants/             # Constantes
├── drizzle/                   # Migrations
├── public/
├── tests/
│   └── unit/
├── .env.local
├── .env.example
├── drizzle.config.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## Fly.io Configuration

```toml
# fly.toml
app = "budget-cortihouse"
primary_region = "gru"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

---

## Supabase Setup

### Tabelas necessárias (via Drizzle migrations):
1. companies
2. users (extensão do auth.users)
3. customers
4. categories
5. products
6. quotes
7. quote_rooms
8. quote_items

### Storage Buckets:
- `logos` - Logos das empresas
- `pdfs` - PDFs gerados (opcional, pode ser efêmero)

### Row Level Security (RLS):
- Todas as tabelas com RLS habilitado
- Políticas baseadas em company_id
- Users só veem dados da própria empresa

---

*Documento finalizado - Pronto para implementação*
