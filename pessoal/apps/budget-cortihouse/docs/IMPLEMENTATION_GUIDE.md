# Guia de Implementação - Budget Cortihouse

**Objetivo:** Este documento é o roteiro completo para implementação autônoma via Ralph Loop.
**Leia completamente antes de começar.**

---

## VISÃO GERAL

### O que será construído
Sistema de orçamentação para cortinas com:
- Autenticação de usuários
- Cadastro de clientes
- Cadastro de produtos
- Criação de orçamentos com cálculo automático
- Geração de PDF
- Compartilhamento via WhatsApp

### Ordem de Implementação

```
FASE 1: Setup (1-2h)
├── 1.1 Criar projeto Next.js
├── 1.2 Configurar Supabase
├── 1.3 Configurar Drizzle
├── 1.4 Instalar dependências
└── 1.5 Configurar shadcn/ui

FASE 2: Database (1-2h)
├── 2.1 Criar schema Drizzle
├── 2.2 Gerar migrations
├── 2.3 Aplicar migrations
└── 2.4 Criar seed data

FASE 3: Autenticação (2-3h)
├── 3.1 Configurar Supabase Auth
├── 3.2 Criar páginas de login
├── 3.3 Criar middleware de proteção
└── 3.4 Criar contexto de usuário

FASE 4: Layout (2-3h)
├── 4.1 Criar layout base
├── 4.2 Criar sidebar
├── 4.3 Criar header
└── 4.4 Criar componentes de navegação

FASE 5: Clientes (2-3h)
├── 5.1 Criar API de clientes
├── 5.2 Criar página de listagem
├── 5.3 Criar formulário de cadastro
└── 5.4 Criar página de detalhes

FASE 6: Produtos (2-3h)
├── 6.1 Criar API de produtos
├── 6.2 Criar página de listagem
├── 6.3 Criar formulário de cadastro
└── 6.4 Criar categorias

FASE 7: Calculadora (3-4h)
├── 7.1 Implementar cálculo hospitalar
├── 7.2 Implementar cálculo residencial
├── 7.3 Implementar cálculo fornecedor
└── 7.4 Criar testes unitários

FASE 8: Orçamentos (4-6h)
├── 8.1 Criar API de orçamentos
├── 8.2 Criar wizard de criação (4 etapas)
├── 8.3 Criar página de listagem
├── 8.4 Criar página de detalhes
└── 8.5 Implementar duplicação

FASE 9: PDF (2-3h)
├── 9.1 Criar template de PDF
├── 9.2 Implementar geração
└── 9.3 Implementar download

FASE 10: Compartilhamento (1-2h)
├── 10.1 Implementar WhatsApp
├── 10.2 Implementar Email (opcional)
└── 10.3 Implementar impressão

FASE 11: Configurações (1-2h)
├── 11.1 Criar página de empresa
├── 11.2 Implementar upload de logo
└── 11.3 Criar gerenciamento de usuários

FASE 12: Deploy (1-2h)
├── 12.1 Configurar Fly.io
├── 12.2 Configurar variáveis
└── 12.3 Deploy inicial
```

---

## FASE 1: SETUP DO PROJETO

### 1.1 Criar Projeto Next.js

```bash
cd "/Users/guilhermebarros/Documents/Coding/pessoal/Budget Cortihouse"

pnpm create next-app@latest app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd app
```

### 1.2 Instalar Dependências Base

```bash
# Core
pnpm add @supabase/supabase-js @supabase/ssr drizzle-orm postgres

# State & Forms
pnpm add @tanstack/react-query zustand react-hook-form @hookform/resolvers zod

# UI
pnpm add lucide-react sonner date-fns tailwind-merge clsx class-variance-authority

# PDF
pnpm add @react-pdf/renderer

# Dev
pnpm add -D drizzle-kit @types/node vitest @vitejs/plugin-react
```

### 1.3 Configurar shadcn/ui

```bash
pnpm dlx shadcn-ui@latest init
```

Responder:
- Style: Default
- Base color: Slate
- CSS variables: Yes

```bash
# Instalar componentes necessários
pnpm dlx shadcn-ui@latest add button input label select textarea checkbox dialog alert-dialog dropdown-menu table tabs card badge avatar tooltip separator scroll-area skeleton sheet
```

### 1.4 Criar Estrutura de Pastas

```bash
mkdir -p src/lib/supabase
mkdir -p src/lib/db
mkdir -p src/lib/validations
mkdir -p src/hooks
mkdir -p src/services/calculadora
mkdir -p src/services/pdf
mkdir -p src/stores
mkdir -p src/types
mkdir -p src/constants
mkdir -p src/components/forms
mkdir -p src/components/layout
mkdir -p src/components/orcamento
mkdir -p drizzle
mkdir -p tests/unit
```

### 1.5 Configurar Arquivos Base

#### tsconfig.json (atualizar paths)
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### .env.local (criar)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Budget Cortihouse"

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DATABASE_URL=
```

#### .env.example (criar - mesmo conteúdo sem valores)

---

## FASE 2: DATABASE

### 2.1 Criar Schema Drizzle

Criar arquivo `src/lib/db/schema.ts`:

```typescript
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  json,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'USER'])
export const quoteStatusEnum = pgEnum('quote_status', [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'IN_PRODUCTION',
  'COMPLETED',
  'CANCELLED',
])
export const discountTypeEnum = pgEnum('discount_type', ['PERCENTAGE', 'FIXED'])
export const productUnitEnum = pgEnum('product_unit', [
  'METRO',
  'METRO_QUADRADO',
  'UNIDADE',
  'PAR',
  'CONJUNTO',
])
export const categoryTypeEnum = pgEnum('category_type', [
  'TECIDO',
  'TRILHO',
  'ACESSORIO',
  'SERVICO',
  'HOSPITALAR',
  'PALCO',
  'FORNECEDOR',
])

// Tables
export const companies = pgTable('companies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  tradeName: text('trade_name'),
  cnpj: text('cnpj').unique(),
  ie: text('ie'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  phone: text('phone'),
  phone2: text('phone2'),
  email: text('email'),
  website: text('website'),
  logoUrl: text('logo_url'),
  defaultValidityDays: integer('default_validity_days').default(15),
  defaultDeliveryDays: integer('default_delivery_days').default(15),
  defaultPaymentTerms: text('default_payment_terms'),
  defaultObservations: text('default_observations'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  authId: text('auth_id').unique(), // Supabase Auth ID
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').default('USER'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const customers = pgTable('customers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  phone2: text('phone2'),
  email: text('email'),
  cpfCnpj: text('cpf_cnpj'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const categories = pgTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  type: categoryTypeEnum('type').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const products = pgTable('products', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  categoryId: text('category_id').notNull().references(() => categories.id),
  name: text('name').notNull(),
  description: text('description'),
  unit: productUnitEnum('unit').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  rollWidth: decimal('roll_width', { precision: 5, scale: 2 }),
  metadata: json('metadata'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const quotes = pgTable('quotes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text('company_id').notNull().references(() => companies.id),
  customerId: text('customer_id').notNull().references(() => customers.id),
  userId: text('user_id').notNull().references(() => users.id),
  number: integer('number').notNull(),
  status: quoteStatusEnum('status').default('DRAFT'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  discountType: discountTypeEnum('discount_type'),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  validUntil: timestamp('valid_until').notNull(),
  deliveryDays: integer('delivery_days').notNull(),
  paymentTerms: text('payment_terms'),
  observations: text('observations'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const quoteRooms = pgTable('quote_rooms', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  quoteId: text('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  order: integer('order').default(0),
})

export const quoteItems = pgTable('quote_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  quoteId: text('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  roomId: text('room_id').references(() => quoteRooms.id, { onDelete: 'set null' }),
  productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  width: decimal('width', { precision: 5, scale: 2 }),
  height: decimal('height', { precision: 5, scale: 2 }),
  quantity: integer('quantity').default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  calculation: json('calculation'),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  categories: many(categories),
  products: many(products),
  quotes: many(quotes),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  quotes: many(quotes),
}))

export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, {
    fields: [customers.companyId],
    references: [companies.id],
  }),
  quotes: many(quotes),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  company: one(companies, {
    fields: [categories.companyId],
    references: [companies.id],
  }),
  products: many(products),
}))

export const productsRelations = relations(products, ({ one }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}))

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  company: one(companies, {
    fields: [quotes.companyId],
    references: [companies.id],
  }),
  customer: one(customers, {
    fields: [quotes.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [quotes.userId],
    references: [users.id],
  }),
  rooms: many(quoteRooms),
  items: many(quoteItems),
}))

export const quoteRoomsRelations = relations(quoteRooms, ({ one, many }) => ({
  quote: one(quotes, {
    fields: [quoteRooms.quoteId],
    references: [quotes.id],
  }),
  items: many(quoteItems),
}))

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
  room: one(quoteRooms, {
    fields: [quoteItems.roomId],
    references: [quoteRooms.id],
  }),
  product: one(products, {
    fields: [quoteItems.productId],
    references: [products.id],
  }),
}))
```

### 2.2 Criar Drizzle Config

Criar `drizzle.config.ts` na raiz:

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
```

### 2.3 Criar Cliente Drizzle

Criar `src/lib/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

const client = postgres(connectionString, { prepare: false })
export const db = drizzle(client, { schema })

export * from './schema'
```

### 2.4 Gerar e Aplicar Migrations

```bash
# Gerar migration
pnpm drizzle-kit generate:pg

# Aplicar (após configurar DATABASE_URL)
pnpm drizzle-kit push:pg
```

---

## FASE 3: AUTENTICAÇÃO

### 3.1 Configurar Supabase Client

Criar `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Criar `src/lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle cookie errors in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle cookie errors in Server Components
          }
        },
      },
    }
  )
}
```

### 3.2 Criar Middleware

Criar `src/middleware.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rotas públicas
  const publicRoutes = ['/login', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Redirecionar não autenticados
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirecionar autenticados tentando acessar login
  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 3.3 Criar Página de Login

Criar `src/app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8">
        {children}
      </div>
    </div>
  )
}
```

Criar `src/app/(auth)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error('Email ou senha incorretos')
      setLoading(false)
      return
    }

    toast.success('Login realizado com sucesso!')
    router.push('/')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Budget Cortihouse</h1>
        <p className="text-slate-500 mt-2">Entre com suas credenciais</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <div className="text-center">
        <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
          Esqueceu sua senha?
        </a>
      </div>
    </div>
  )
}
```

---

## FASE 4-12: CONTINUA...

O documento completo de implementação continua com:

- **Fase 4:** Layout do dashboard (sidebar, header, navigation)
- **Fase 5:** CRUD de clientes
- **Fase 6:** CRUD de produtos e categorias
- **Fase 7:** Serviço de calculadora (hospitalar, residencial, palco)
- **Fase 8:** CRUD de orçamentos com wizard de 4 etapas
- **Fase 9:** Geração de PDF com @react-pdf/renderer
- **Fase 10:** Compartilhamento (WhatsApp, download)
- **Fase 11:** Configurações da empresa
- **Fase 12:** Deploy no Fly.io

---

## COMANDOS ÚTEIS

```bash
# Desenvolvimento
pnpm dev                  # Iniciar servidor dev
pnpm build                # Build para produção
pnpm start                # Iniciar servidor produção

# Database
pnpm drizzle-kit generate:pg  # Gerar migration
pnpm drizzle-kit push:pg      # Aplicar migration
pnpm drizzle-kit studio       # Abrir Drizzle Studio

# Testes
pnpm test                 # Rodar testes
pnpm test:watch           # Testes em watch mode

# Lint & Format
pnpm lint                 # Verificar lint
pnpm lint:fix             # Corrigir lint
pnpm format               # Formatar código

# Deploy
fly deploy                # Deploy para Fly.io
fly logs                  # Ver logs
fly status                # Ver status
```

---

## CHECKLIST DE VERIFICAÇÃO

Após cada fase, verificar:

- [ ] Código compila sem erros (`pnpm build`)
- [ ] Lint passa (`pnpm lint`)
- [ ] Funcionalidade funciona no browser
- [ ] Responsivo em mobile
- [ ] Não há console.log de debug

---

## NOTAS IMPORTANTES

1. **Sempre usar Server Components** quando possível
2. **'use client'** apenas quando necessário (interatividade)
3. **Validar inputs** com Zod antes de salvar
4. **Tratar erros** com try/catch e mostrar toast
5. **Usar loading states** para feedback visual
6. **Testar em mobile** - a usuária pode usar tablet

---

*Este documento será expandido conforme necessário durante a implementação.*
