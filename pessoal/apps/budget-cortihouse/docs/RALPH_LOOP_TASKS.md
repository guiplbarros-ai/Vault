# Tarefas para Ralph Loop - Budget Cortihouse

**Objetivo:** Completar a aplicação até estar 100% funcional.

**Localização do projeto:** `/Users/guilhermebarros/Documents/Coding/pessoal/apps/budget-cortihouse`

---

## ESTADO ATUAL

### ✅ Concluído
- Estrutura Next.js 15 (App Router)
- Schema Drizzle ORM (9 tabelas)
- Autenticação Supabase (client + server + middleware)
- Layout (Sidebar + Header)
- Páginas básicas (Dashboard, Clientes, Produtos, Orçamentos, Configurações)
- Wizard de orçamento (4 etapas com UI)
- Calculadora hospitalar (lógica completa)
- Compartilhamento WhatsApp (básico)
- Componentes UI (Button, Input, Label, Card, Sonner)

### ❌ Faltando
- APIs de CRUD
- Conexão das páginas com o banco
- Geração de PDF
- Seed inicial de dados
- Testes

---

## TAREFAS ORDENADAS POR PRIORIDADE

### 1. INSTALAR DEPENDÊNCIAS E TESTAR BUILD

```bash
cd /Users/guilhermebarros/Documents/Coding/pessoal
bun install
cd apps/budget-cortihouse
bun run build
```

Se houver erros de TypeScript, corrigi-los.

---

### 2. CRIAR APIS DE CRUD

#### 2.1 API de Clientes

**Arquivo:** `src/app/api/customers/route.ts`

```typescript
// GET /api/customers - Listar clientes
// POST /api/customers - Criar cliente

import { NextRequest, NextResponse } from 'next/server'
import { db, customers } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: Get companyId from user
  const companyId = 'COMPANY_ID_HERE'

  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.companyId, companyId))
    .orderBy(customers.name)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const companyId = 'COMPANY_ID_HERE'

  const [newCustomer] = await db
    .insert(customers)
    .values({ ...body, companyId })
    .returning()

  return NextResponse.json(newCustomer, { status: 201 })
}
```

**Arquivo:** `src/app/api/customers/[id]/route.ts`

```typescript
// GET /api/customers/[id] - Buscar cliente
// PUT /api/customers/[id] - Atualizar cliente
// DELETE /api/customers/[id] - Excluir cliente
```

#### 2.2 API de Produtos

**Arquivo:** `src/app/api/products/route.ts`
**Arquivo:** `src/app/api/products/[id]/route.ts`

Mesma estrutura de clientes.

#### 2.3 API de Categorias

**Arquivo:** `src/app/api/categories/route.ts`
**Arquivo:** `src/app/api/categories/[id]/route.ts`

#### 2.4 API de Orçamentos

**Arquivo:** `src/app/api/quotes/route.ts`

```typescript
// GET /api/quotes - Listar orçamentos
// POST /api/quotes - Criar orçamento completo (com rooms e items)
```

**Arquivo:** `src/app/api/quotes/[id]/route.ts`

```typescript
// GET /api/quotes/[id] - Buscar orçamento com rooms e items
// PUT /api/quotes/[id] - Atualizar orçamento
// DELETE /api/quotes/[id] - Excluir orçamento
// PATCH /api/quotes/[id]/status - Atualizar status
```

**Arquivo:** `src/app/api/quotes/[id]/pdf/route.ts`

```typescript
// GET /api/quotes/[id]/pdf - Gerar e retornar PDF
```

#### 2.5 API de Configurações

**Arquivo:** `src/app/api/settings/route.ts`

```typescript
// GET /api/settings - Buscar configurações da empresa
// PUT /api/settings - Atualizar configurações
```

#### 2.6 API de Empresa

**Arquivo:** `src/app/api/company/route.ts`

```typescript
// GET /api/company - Buscar dados da empresa
// PUT /api/company - Atualizar dados da empresa
```

---

### 3. CRIAR HOOKS DE DADOS

**Arquivo:** `src/hooks/use-customers.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/customers')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: NewCustomer) => {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
```

Criar hooks similares para:
- `src/hooks/use-products.ts`
- `src/hooks/use-quotes.ts`
- `src/hooks/use-categories.ts`
- `src/hooks/use-settings.ts`
- `src/hooks/use-company.ts`

---

### 4. CRIAR PROVIDER DE REACT QUERY

**Arquivo:** `src/components/providers/query-provider.tsx`

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

**Atualizar:** `src/app/layout.tsx` para incluir o provider.

---

### 5. CONECTAR PÁGINAS COM APIS

#### 5.1 Página de Clientes

**Atualizar:** `src/app/(dashboard)/clientes/page.tsx`
- Usar `useCustomers()` para buscar dados
- Mostrar lista real de clientes
- Implementar busca

**Atualizar:** `src/app/(dashboard)/clientes/novo/page.tsx`
- Usar `useCreateCustomer()` para salvar
- Redirecionar após sucesso

**Criar:** `src/app/(dashboard)/clientes/[id]/page.tsx`
- Página de detalhes/edição do cliente

#### 5.2 Página de Produtos

**Atualizar:** `src/app/(dashboard)/produtos/page.tsx`
**Criar:** `src/app/(dashboard)/produtos/novo/page.tsx`
**Criar:** `src/app/(dashboard)/produtos/[id]/page.tsx`

#### 5.3 Página de Orçamentos

**Atualizar:** `src/app/(dashboard)/orcamentos/page.tsx`
- Listar orçamentos reais
- Filtros por status
- Busca por cliente/número

**Criar:** `src/app/(dashboard)/orcamentos/[id]/page.tsx`
- Visualização detalhada
- Ações (PDF, WhatsApp, Editar, Duplicar, Status)

**Atualizar:** `src/app/(dashboard)/orcamentos/novo/steps/step-customer.tsx`
- Buscar clientes reais da API

**Atualizar:** `src/app/(dashboard)/orcamentos/novo/steps/step-review.tsx`
- Salvar orçamento na API

#### 5.4 Página de Configurações

**Atualizar:** `src/app/(dashboard)/configuracoes/page.tsx`
- Carregar dados reais da empresa e settings
- Salvar alterações via API

#### 5.5 Dashboard

**Atualizar:** `src/app/(dashboard)/dashboard/page.tsx`
- Buscar estatísticas reais (count de orçamentos, clientes, etc)
- Listar últimos 5 orçamentos

---

### 6. IMPLEMENTAR GERAÇÃO DE PDF

**Arquivo:** `src/lib/pdf/quote-template.tsx`

```typescript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30 },
  header: { marginBottom: 20 },
  // ... mais estilos
})

interface QuotePDFProps {
  quote: Quote
  company: Company
  customer: Customer
}

export function QuotePDF({ quote, company, customer }: QuotePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho com logo e dados da empresa */}
        <View style={styles.header}>
          <Text>{company.name}</Text>
          <Text>CNPJ: {company.cnpj}</Text>
          {/* ... */}
        </View>

        {/* Número da proposta */}
        <Text>PROPOSTA Nº {quote.quoteNumber}</Text>

        {/* Dados do cliente */}
        <View>
          <Text>Cliente: {customer.name}</Text>
          <Text>Endereço: {quote.installationAddress}</Text>
        </View>

        {/* Tabela de itens */}
        {/* ... */}

        {/* Totais */}
        {/* ... */}

        {/* Condições comerciais */}
        {/* ... */}

        {/* Observações padrão */}
        {/* ... */}
      </Page>
    </Document>
  )
}
```

**Arquivo:** `src/app/api/quotes/[id]/pdf/route.ts`

```typescript
import { renderToBuffer } from '@react-pdf/renderer'
import { QuotePDF } from '@/lib/pdf/quote-template'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Buscar quote, company, customer
  // ...

  const pdfBuffer = await renderToBuffer(
    <QuotePDF quote={quote} company={company} customer={customer} />
  )

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="proposta-${quote.quoteNumber}.pdf"`,
    },
  })
}
```

---

### 7. CRIAR SEED DE DADOS INICIAIS

**Arquivo:** `src/lib/db/seed.ts`

```typescript
import { db } from '.'
import { companies, users, categories, settings } from './schema'

async function seed() {
  // 1. Criar empresa Cortihouse
  const [company] = await db.insert(companies).values({
    name: 'Cortihouse Cortinas de Palco, Decorações & Confecções Ltda',
    tradeName: 'Cortihouse Cortinas',
    cnpj: '41.697.350/0001-36',
    ie: '186.78326000-90',
    address: 'Rua Diamantina, 26, Santa Edwiges, Contagem/MG, 32040-260',
    phone: '31 3351-7467',
    phone2: '31 9 9973-2346',
    website: 'www.cortihouse.com.br',
  }).returning()

  // 2. Criar configurações padrão
  await db.insert(settings).values({
    companyId: company.id,
    hospitalFranzidoFactor: '1.65',
    hospitalVinylHeight: '2.00',
    hospitalMeshSmallHeight: '0.60',
    hospitalMeshLargeHeight: '0.90',
    hospitalCeilingMeshThreshold: '2.60',
    hospitalCeilingLoweringThreshold: '3.10',
    hospitalHookSpacing: '0.15',
    hospitalCurvePrice: '30.00',
    defaultDiscountCash: '3.00',
    defaultValidityDays: 15,
    defaultDeliveryDays: 15,
    returnFee: '100.00',
    markupKazza: '30.00',
    markupLiber: '30.00',
  })

  // 3. Criar categorias padrão
  const categoryData = [
    { name: 'Cortinas Hospitalares', type: 'hospitalar' as const },
    { name: 'Cortinas Residenciais', type: 'residencial' as const },
    { name: 'Cortinas de Palco', type: 'palco' as const },
    { name: 'Persianas Kazza', type: 'fornecedor' as const },
    { name: 'Persianas Liber', type: 'fornecedor' as const },
    { name: 'Serviços', type: 'servico' as const },
  ]

  for (const cat of categoryData) {
    await db.insert(categories).values({
      companyId: company.id,
      ...cat,
    })
  }

  console.log('Seed completed!')
  console.log('Company ID:', company.id)
}

seed().catch(console.error)
```

**Adicionar script no package.json:**
```json
{
  "scripts": {
    "db:seed": "bun run src/lib/db/seed.ts"
  }
}
```

---

### 8. CRIAR USUÁRIO INICIAL NO SUPABASE

No Supabase Dashboard ou via SQL:

1. Criar usuário no Auth com email da Vanda
2. Associar o usuário à empresa via tabela `users`

```sql
-- Após criar usuário no Supabase Auth, executar:
INSERT INTO users (id, company_id, email, name, role)
VALUES (
  'UUID_DO_AUTH_USER',
  'UUID_DA_EMPRESA',
  'vanda@cortihouse.com.br',
  'Vanda Barros',
  'admin'
);
```

---

### 9. COMPONENTES UI ADICIONAIS NECESSÁRIOS

Criar componentes shadcn/ui que estão faltando:

**Executar para cada componente:**
```bash
bunx shadcn@latest add dialog
bunx shadcn@latest add select
bunx shadcn@latest add dropdown-menu
bunx shadcn@latest add table
bunx shadcn@latest add badge
bunx shadcn@latest add alert-dialog
bunx shadcn@latest add tabs
bunx shadcn@latest add separator
bunx shadcn@latest add scroll-area
bunx shadcn@latest add tooltip
bunx shadcn@latest add popover
```

---

### 10. MELHORIAS DE UX

#### 10.1 Loading States
Criar componente de skeleton para listas

#### 10.2 Empty States
Já existem, mas podem ser melhorados

#### 10.3 Error Handling
Criar boundary de erro e componente de erro

#### 10.4 Confirmação de Exclusão
Usar AlertDialog para confirmar ações destrutivas

---

## RESUMO DE ARQUIVOS A CRIAR

### APIs (12 arquivos)
```
src/app/api/
├── customers/
│   ├── route.ts
│   └── [id]/route.ts
├── products/
│   ├── route.ts
│   └── [id]/route.ts
├── categories/
│   ├── route.ts
│   └── [id]/route.ts
├── quotes/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── pdf/route.ts
├── settings/
│   └── route.ts
└── company/
    └── route.ts
```

### Hooks (6 arquivos)
```
src/hooks/
├── use-customers.ts
├── use-products.ts
├── use-quotes.ts
├── use-categories.ts
├── use-settings.ts
└── use-company.ts
```

### Providers (1 arquivo)
```
src/components/providers/
└── query-provider.tsx
```

### PDF (1 arquivo)
```
src/lib/pdf/
└── quote-template.tsx
```

### Seed (1 arquivo)
```
src/lib/db/
└── seed.ts
```

### Páginas novas (4 arquivos)
```
src/app/(dashboard)/
├── clientes/[id]/page.tsx
├── produtos/novo/page.tsx
├── produtos/[id]/page.tsx
└── orcamentos/[id]/page.tsx
```

---

## ORDEM DE EXECUÇÃO RECOMENDADA

1. Instalar dependências e verificar build
2. Criar seed e executar para ter dados iniciais
3. Criar APIs na ordem: company → settings → categories → customers → products → quotes
4. Criar hooks
5. Criar QueryProvider e adicionar ao layout
6. Conectar páginas existentes com APIs
7. Criar páginas de detalhes faltantes
8. Implementar geração de PDF
9. Adicionar componentes UI faltantes
10. Testar fluxo completo

---

## CRITÉRIOS DE CONCLUSÃO

A aplicação está pronta quando:

- [ ] Build passa sem erros
- [ ] Login funciona
- [ ] CRUD de clientes funciona
- [ ] CRUD de produtos funciona
- [ ] Criar orçamento funciona (todas as 4 etapas)
- [ ] Listar orçamentos funciona
- [ ] Ver detalhes do orçamento funciona
- [ ] Gerar PDF funciona
- [ ] Compartilhar WhatsApp funciona
- [ ] Configurações salvam corretamente

---

*Documento gerado para execução autônoma pelo Ralph Loop*
