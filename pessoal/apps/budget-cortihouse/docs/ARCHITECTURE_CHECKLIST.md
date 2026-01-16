# Checklist de Arquitetura - Budget Cortihouse

## Status: 🔴 Incompleto

Este documento lista TUDO que precisa ser definido antes da implementação autônoma.

---

## 1. DECISÕES DE INFRAESTRUTURA

### 1.1 Hospedagem e Deploy
- [ ] **Plataforma de deploy:** Vercel? Railway? Fly.io?
- [ ] **Domínio:** Qual será? budget.cortihouse.com.br?
- [ ] **SSL:** Automático pelo provider?
- [ ] **CI/CD:** GitHub Actions? Vercel automático?
- [ ] **Ambientes:** Produção + Staging? Só produção?

### 1.2 Banco de Dados
- [ ] **Provider:** Supabase? PlanetScale? Neon? Railway Postgres?
- [ ] **Região:** South America (São Paulo)?
- [ ] **Backup:** Frequência? Retenção?
- [ ] **Conexão:** Connection pooling? Quantas conexões?

### 1.3 Autenticação
- [ ] **Provider:** Supabase Auth? NextAuth? Clerk?
- [ ] **Métodos:** Email/senha? Magic link? Google?
- [ ] **Sessão:** JWT? Cookie? Duração?
- [ ] **Recuperação de senha:** Email? SMS?

### 1.4 Storage (Arquivos)
- [ ] **Provider:** Supabase Storage? S3? Cloudinary?
- [ ] **O que armazenar:** Logo da empresa? PDFs gerados? Fotos de produtos?
- [ ] **Limite de tamanho:** Por arquivo? Total?

### 1.5 Email
- [ ] **Provider:** Resend? SendGrid? Amazon SES?
- [ ] **Casos de uso:** Recuperação de senha? Envio de orçamento?
- [ ] **Templates:** HTML customizado?

---

## 2. STACK TÉCNICA DETALHADA

### 2.1 Frontend
```
Framework: Next.js 14+ (App Router)
├── Linguagem: TypeScript (strict mode)
├── Styling: Tailwind CSS v3.4+
├── Componentes: shadcn/ui
├── Ícones: Lucide React
├── Formulários: React Hook Form + Zod
├── State: Zustand (global) + React Query (server state)
├── Tabelas: TanStack Table
├── Datas: date-fns
├── Máscaras: react-input-mask ou similar
├── PDF: @react-pdf/renderer
├── Toast/Notificações: Sonner
└── Animações: Framer Motion (opcional)
```

### 2.2 Backend
```
API: Next.js API Routes (Route Handlers)
├── ORM: Prisma ou Drizzle?
├── Validação: Zod
├── Auth: Supabase Auth / NextAuth?
└── Rate Limiting: Upstash?
```

### 2.3 Banco de Dados
```
Database: PostgreSQL
├── Provider: Supabase
├── ORM: Prisma
├── Migrations: Prisma Migrate
└── Seed: Script de dados iniciais
```

### 2.4 DevOps
```
Versionamento: Git + GitHub
├── Branch strategy: main + feature branches
├── Commits: Conventional Commits
├── CI: GitHub Actions
├── CD: Vercel (auto-deploy)
└── Monitoramento: Vercel Analytics + Sentry?
```

---

## 3. ESTRUTURA DE PASTAS

```
budget-cortihouse/
├── .github/
│   └── workflows/
│       └── ci.yml
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   ├── logo.png
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Dashboard
│   │   │   ├── orcamentos/
│   │   │   │   ├── page.tsx                # Lista
│   │   │   │   ├── novo/
│   │   │   │   │   └── page.tsx            # Criar
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx            # Detalhes
│   │   │   │       └── editar/
│   │   │   │           └── page.tsx        # Editar
│   │   │   ├── clientes/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── novo/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── produtos/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [categoria]/
│   │   │   │       └── page.tsx
│   │   │   └── configuracoes/
│   │   │       ├── page.tsx
│   │   │       ├── empresa/
│   │   │       │   └── page.tsx
│   │   │       └── usuarios/
│   │   │           └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── clientes/
│   │   │   │   ├── route.ts                # GET, POST
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts            # GET, PUT, DELETE
│   │   │   ├── orcamentos/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── pdf/
│   │   │   │   │   │   └── route.ts        # Gerar PDF
│   │   │   │   │   └── duplicar/
│   │   │   │   │       └── route.ts
│   │   │   │   └── calcular/
│   │   │   │       └── route.ts            # Calcular item
│   │   │   ├── produtos/
│   │   │   │   └── route.ts
│   │   │   └── empresa/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                             # shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── nav-item.tsx
│   │   │   └── user-menu.tsx
│   │   ├── forms/
│   │   │   ├── cliente-form.tsx
│   │   │   ├── orcamento-form.tsx
│   │   │   ├── item-form.tsx
│   │   │   └── produto-form.tsx
│   │   ├── orcamento/
│   │   │   ├── ambiente-card.tsx
│   │   │   ├── item-card.tsx
│   │   │   ├── resumo-card.tsx
│   │   │   ├── pdf-preview.tsx
│   │   │   └── calculator.tsx
│   │   └── shared/
│   │       ├── loading.tsx
│   │       ├── empty-state.tsx
│   │       ├── error-boundary.tsx
│   │       ├── confirm-dialog.tsx
│   │       └── search-input.tsx
│   ├── lib/
│   │   ├── prisma.ts                       # Prisma client
│   │   ├── supabase.ts                     # Supabase client
│   │   ├── auth.ts                         # Auth config
│   │   ├── utils.ts                        # Utilidades gerais
│   │   └── validations.ts                  # Schemas Zod
│   ├── hooks/
│   │   ├── use-clientes.ts
│   │   ├── use-orcamentos.ts
│   │   ├── use-produtos.ts
│   │   └── use-calculator.ts
│   ├── services/
│   │   ├── calculadora/
│   │   │   ├── index.ts
│   │   │   ├── hospitalar.ts
│   │   │   ├── residencial.ts
│   │   │   ├── palco.ts
│   │   │   └── fornecedor.ts
│   │   ├── pdf/
│   │   │   ├── generator.tsx
│   │   │   └── templates/
│   │   │       ├── orcamento.tsx
│   │   │       └── hospitalar.tsx
│   │   └── whatsapp/
│   │       └── share.ts
│   ├── stores/
│   │   ├── orcamento-store.ts
│   │   └── ui-store.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── cliente.ts
│   │   ├── orcamento.ts
│   │   ├── produto.ts
│   │   └── database.ts
│   └── constants/
│       ├── index.ts
│       ├── categorias.ts
│       ├── status.ts
│       └── textos-padrao.ts
├── .env.example
├── .env.local
├── .eslintrc.json
├── .prettierrc
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 4. SCHEMA DO BANCO DE DADOS

### 4.1 Diagrama ER

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Company   │       │    User     │       │  Customer   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ name        │◄──────│ company_id  │       │ company_id  │──────►│
│ cnpj        │       │ email       │       │ name        │
│ ie          │       │ name        │       │ phone       │
│ address     │       │ role        │       │ email       │
│ phone       │       │ created_at  │       │ address     │
│ phone2      │       └─────────────┘       │ cpf_cnpj    │
│ email       │                             │ notes       │
│ website     │                             │ created_at  │
│ logo_url    │                             └─────────────┘
│ created_at  │                                    │
└─────────────┘                                    │
                                                   │
┌─────────────┐       ┌─────────────┐              │
│  Category   │       │   Product   │              │
├─────────────┤       ├─────────────┤              │
│ id (PK)     │◄──────│ category_id │              │
│ name        │       │ id (PK)     │              │
│ type        │       │ company_id  │              │
│ description │       │ name        │              │
└─────────────┘       │ description │              │
                      │ unit        │              │
                      │ unit_price  │              │
                      │ is_active   │              │
                      │ metadata    │              │
                      │ created_at  │              │
                      └─────────────┘              │
                             │                    │
                             │                    │
┌─────────────┐       ┌──────┴──────┐       ┌─────┴───────┐
│ QuoteItem   │       │    Quote    │       │             │
├─────────────┤       ├─────────────┤       │             │
│ id (PK)     │──────►│ id (PK)     │◄──────│             │
│ quote_id    │       │ company_id  │       │             │
│ product_id  │       │ customer_id │───────┘             │
│ room_name   │       │ user_id     │                     │
│ description │       │ number      │                     │
│ width       │       │ status      │                     │
│ height      │       │ subtotal    │                     │
│ quantity    │       │ discount    │                     │
│ unit_price  │       │ discount_type│                    │
│ total       │       │ total       │                     │
│ metadata    │       │ valid_until │                     │
│ order       │       │ delivery_days│                    │
│ created_at  │       │ notes       │                     │
└─────────────┘       │ conditions  │                     │
                      │ created_at  │                     │
                      │ updated_at  │                     │
                      └─────────────┘                     │
                                                          │
┌─────────────┐                                           │
│ QuoteRoom   │ (opcional - para agrupar itens)           │
├─────────────┤                                           │
│ id (PK)     │                                           │
│ quote_id    │                                           │
│ name        │                                           │
│ order       │                                           │
└─────────────┘
```

### 4.2 Prisma Schema Detalhado

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============== ENUMS ==============

enum UserRole {
  ADMIN
  USER
}

enum QuoteStatus {
  DRAFT
  PENDING
  APPROVED
  IN_PRODUCTION
  COMPLETED
  CANCELLED
}

enum DiscountType {
  PERCENTAGE
  FIXED
}

enum ProductUnit {
  METRO           // m
  METRO_QUADRADO  // m²
  UNIDADE         // un
  PAR             // par
  CONJUNTO        // conj
}

enum CategoryType {
  TECIDO
  TRILHO
  ACESSORIO
  SERVICO
  HOSPITALAR
  PALCO
  FORNECEDOR
}

// ============== MODELS ==============

model Company {
  id        String   @id @default(cuid())
  name      String
  tradeName String?  @map("trade_name") // Nome fantasia
  cnpj      String?  @unique
  ie        String?  // Inscrição estadual

  // Endereço
  address   String?
  city      String?
  state     String?
  zipCode   String?  @map("zip_code")

  // Contato
  phone     String?
  phone2    String?
  email     String?
  website   String?

  // Branding
  logoUrl   String?  @map("logo_url")

  // Configurações
  defaultValidityDays    Int @default(15) @map("default_validity_days")
  defaultDeliveryDays    Int @default(15) @map("default_delivery_days")
  defaultPaymentTerms    String? @map("default_payment_terms")
  defaultObservations    String? @map("default_observations")

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  users      User[]
  customers  Customer[]
  products   Product[]
  categories Category[]
  quotes     Quote[]

  @@map("companies")
}

model User {
  id        String   @id @default(cuid())
  companyId String   @map("company_id")

  email     String   @unique
  name      String
  role      UserRole @default(USER)
  isActive  Boolean  @default(true) @map("is_active")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  company   Company  @relation(fields: [companyId], references: [id])
  quotes    Quote[]

  @@map("users")
}

model Customer {
  id        String   @id @default(cuid())
  companyId String   @map("company_id")

  name      String
  phone     String
  phone2    String?
  email     String?

  // Documento
  cpfCnpj   String?  @map("cpf_cnpj")

  // Endereço
  address   String?
  city      String?
  state     String?
  zipCode   String?  @map("zip_code")

  // Contato adicional
  contactName  String? @map("contact_name")
  contactPhone String? @map("contact_phone")

  notes     String?

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  company   Company  @relation(fields: [companyId], references: [id])
  quotes    Quote[]

  @@map("customers")
}

model Category {
  id        String       @id @default(cuid())
  companyId String       @map("company_id")

  name      String
  type      CategoryType
  description String?
  isActive  Boolean      @default(true) @map("is_active")
  order     Int          @default(0)

  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  company   Company   @relation(fields: [companyId], references: [id])
  products  Product[]

  @@map("categories")
}

model Product {
  id         String      @id @default(cuid())
  companyId  String      @map("company_id")
  categoryId String      @map("category_id")

  name       String
  description String?

  unit       ProductUnit
  unitPrice  Decimal     @map("unit_price") @db.Decimal(10, 2)

  // Para tecidos
  rollWidth  Decimal?    @map("roll_width") @db.Decimal(5, 2) // Largura do rolo

  // Para cálculos específicos
  metadata   Json?       // Dados extras (fator franzido, etc)

  isActive   Boolean     @default(true) @map("is_active")

  createdAt  DateTime    @default(now()) @map("created_at")
  updatedAt  DateTime    @updatedAt @map("updated_at")

  // Relations
  company    Company     @relation(fields: [companyId], references: [id])
  category   Category    @relation(fields: [categoryId], references: [id])
  quoteItems QuoteItem[]

  @@map("products")
}

model Quote {
  id         String      @id @default(cuid())
  companyId  String      @map("company_id")
  customerId String      @map("customer_id")
  userId     String      @map("user_id")

  number     Int         // Número sequencial do orçamento
  status     QuoteStatus @default(DRAFT)

  // Valores
  subtotal      Decimal      @db.Decimal(10, 2)
  discountType  DiscountType? @map("discount_type")
  discountValue Decimal?     @map("discount_value") @db.Decimal(10, 2)
  total         Decimal      @db.Decimal(10, 2)

  // Condições
  validUntil    DateTime     @map("valid_until")
  deliveryDays  Int          @map("delivery_days")
  paymentTerms  String?      @map("payment_terms")
  observations  String?

  // Metadados
  metadata   Json?       // Dados extras (tipo de orçamento, etc)

  createdAt  DateTime    @default(now()) @map("created_at")
  updatedAt  DateTime    @updatedAt @map("updated_at")

  // Relations
  company    Company     @relation(fields: [companyId], references: [id])
  customer   Customer    @relation(fields: [customerId], references: [id])
  user       User        @relation(fields: [userId], references: [id])
  items      QuoteItem[]
  rooms      QuoteRoom[]

  @@unique([companyId, number])
  @@map("quotes")
}

model QuoteRoom {
  id      String @id @default(cuid())
  quoteId String @map("quote_id")

  name    String
  order   Int    @default(0)

  // Relations
  quote   Quote       @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  items   QuoteItem[]

  @@map("quote_rooms")
}

model QuoteItem {
  id        String  @id @default(cuid())
  quoteId   String  @map("quote_id")
  roomId    String? @map("room_id")
  productId String? @map("product_id")

  // Descrição (pode ser livre ou do produto)
  description String

  // Medidas
  width     Decimal? @db.Decimal(5, 2)
  height    Decimal? @db.Decimal(5, 2)
  quantity  Int      @default(1)

  // Valores
  unitPrice Decimal  @map("unit_price") @db.Decimal(10, 2)
  total     Decimal  @db.Decimal(10, 2)

  // Detalhamento do cálculo
  calculation Json?  // Guarda o breakdown do cálculo

  // Ordem de exibição
  order     Int      @default(0)

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  quote     Quote     @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  room      QuoteRoom? @relation(fields: [roomId], references: [id], onDelete: SetNull)
  product   Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@map("quote_items")
}
```

---

## 5. APIs E ENDPOINTS

### 5.1 Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login com email/senha |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/forgot-password` | Solicitar reset de senha |
| POST | `/api/auth/reset-password` | Resetar senha |
| GET | `/api/auth/me` | Dados do usuário logado |

### 5.2 Clientes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/clientes` | Listar clientes (com busca e paginação) |
| POST | `/api/clientes` | Criar cliente |
| GET | `/api/clientes/:id` | Buscar cliente por ID |
| PUT | `/api/clientes/:id` | Atualizar cliente |
| DELETE | `/api/clientes/:id` | Excluir cliente |
| GET | `/api/clientes/:id/orcamentos` | Orçamentos do cliente |

### 5.3 Orçamentos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/orcamentos` | Listar orçamentos (filtros, paginação) |
| POST | `/api/orcamentos` | Criar orçamento |
| GET | `/api/orcamentos/:id` | Buscar orçamento por ID |
| PUT | `/api/orcamentos/:id` | Atualizar orçamento |
| DELETE | `/api/orcamentos/:id` | Excluir orçamento |
| POST | `/api/orcamentos/:id/duplicar` | Duplicar orçamento |
| PATCH | `/api/orcamentos/:id/status` | Alterar status |
| GET | `/api/orcamentos/:id/pdf` | Gerar PDF |

### 5.4 Itens do Orçamento

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/orcamentos/:id/itens` | Adicionar item |
| PUT | `/api/orcamentos/:id/itens/:itemId` | Atualizar item |
| DELETE | `/api/orcamentos/:id/itens/:itemId` | Remover item |
| POST | `/api/orcamentos/:id/ambientes` | Adicionar ambiente |
| PUT | `/api/orcamentos/:id/ambientes/:ambId` | Atualizar ambiente |
| DELETE | `/api/orcamentos/:id/ambientes/:ambId` | Remover ambiente |

### 5.5 Calculadora

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/calcular/hospitalar` | Calcular cortina hospitalar |
| POST | `/api/calcular/residencial` | Calcular cortina residencial |
| POST | `/api/calcular/palco` | Calcular cortina de palco |
| POST | `/api/calcular/fornecedor` | Calcular produto de fornecedor |

### 5.6 Produtos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/produtos` | Listar produtos |
| POST | `/api/produtos` | Criar produto |
| PUT | `/api/produtos/:id` | Atualizar produto |
| DELETE | `/api/produtos/:id` | Excluir produto |
| GET | `/api/categorias` | Listar categorias |

### 5.7 Configurações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/empresa` | Dados da empresa |
| PUT | `/api/empresa` | Atualizar empresa |
| POST | `/api/empresa/logo` | Upload do logo |
| GET | `/api/usuarios` | Listar usuários |
| POST | `/api/usuarios` | Criar usuário |
| PUT | `/api/usuarios/:id` | Atualizar usuário |

---

## 6. COMPONENTES DE UI

### 6.1 Componentes Base (shadcn/ui)

```
□ Button (variantes: default, outline, ghost, destructive)
□ Input (com máscara para telefone, CNPJ, moeda)
□ Select
□ Textarea
□ Checkbox
□ Radio Group
□ Switch
□ Dialog / Modal
□ Alert Dialog (confirmação)
□ Dropdown Menu
□ Table
□ Tabs
□ Card
□ Badge
□ Avatar
□ Tooltip
□ Toast (Sonner)
□ Skeleton (loading)
□ Separator
□ ScrollArea
```

### 6.2 Componentes Customizados

```
Layout:
□ AppShell (container geral com sidebar)
□ Sidebar (navegação lateral)
□ Header (topo com busca e user menu)
□ PageHeader (título + ações da página)
□ Breadcrumb

Formulários:
□ MoneyInput (input de valor monetário)
□ PhoneInput (input de telefone com máscara)
□ CnpjCpfInput (input com validação)
□ MeasureInput (input de medida em metros)
□ SearchSelect (select com busca)
□ DatePicker

Orçamento:
□ QuoteWizard (wizard de 4 etapas)
□ CustomerSelector (busca/cadastro de cliente)
□ RoomCard (card de ambiente)
□ ItemCard (card de item dentro do ambiente)
□ ItemForm (formulário de adicionar item)
□ CalculationPreview (preview do cálculo em tempo real)
□ QuoteSummary (resumo com totais)
□ DiscountInput (input de desconto % ou R$)
□ PdfPreview (preview do PDF)
□ ShareButtons (botões de compartilhar)

Listagens:
□ DataTable (tabela com sort, filter, pagination)
□ EmptyState (estado vazio)
□ LoadingState (estado carregando)
□ ErrorState (estado de erro)
□ SearchBar (barra de busca)
□ FilterBar (filtros)
□ StatusBadge (badge de status)

Outros:
□ ConfirmDialog (dialog de confirmação)
□ DeleteDialog (confirmar exclusão)
□ ImageUpload (upload de imagem)
```

---

## 7. LÓGICA DE NEGÓCIO (SERVICES)

### 7.1 Calculadora

```typescript
// src/services/calculadora/types.ts

interface CalculoHospitalarInput {
  largura: number;          // metros
  peDireito: number;        // metros
  incluiTrilho: boolean;
  incluiInstalacao: boolean;
  quantidadeCurvas: number;
  destino: 'MG' | 'SP' | 'OUTRO';
}

interface CalculoHospitalarOutput {
  materiais: {
    vinil: { metros: number; preco: number; total: number };
    telaColmeia: { metros: number; preco: number; total: number };
    ilhoses: { quantidade: number; preco: number; total: number };
    ganchos: { quantidade: number; preco: number; total: number };
    deslizantes: { quantidade: number; preco: number; total: number };
  };
  trilho?: {
    trilho: { metros: number; preco: number; total: number };
    suportes: { quantidade: number; preco: number; total: number };
    tampas: { quantidade: number; preco: number; total: number };
    curvas: { quantidade: number; preco: number; total: number };
  };
  rebaixamento?: {
    perfil: { metros: number; preco: number; total: number };
    suportes: { quantidade: number; preco: number; total: number };
    maoDeObra: number;
  };
  maoDeObra: {
    confeccao: number;
    instalacao: number;
  };
  frete: number;
  icms: number;
  subtotal: number;
  total: number;
}
```

### 7.2 Gerador de PDF

```typescript
// src/services/pdf/types.ts

interface PdfOrcamentoData {
  empresa: {
    nome: string;
    cnpj: string;
    endereco: string;
    telefones: string[];
    email: string;
    website: string;
    logoUrl: string;
  };
  orcamento: {
    numero: number;
    data: Date;
    validade: Date;
  };
  cliente: {
    nome: string;
    endereco: string;
    cnpj?: string;
    contato: string;
    telefone: string;
  };
  itens: Array<{
    item: number;
    tipo: string;
    quantidade: number;
    medidas: string;
    acabamento: string;
    modelo: string;
    cor: string;
    acessorios: string;
    precoUnitario: number;
    precoTotal: number;
  }>;
  valores: {
    subtotal: number;
    desconto?: number;
    total: number;
  };
  condicoes: {
    pagamento: string;
    prazoEntrega: string;
    observacoes: string[];
  };
}
```

---

## 8. VARIÁVEIS DE AMBIENTE

```env
# .env.example

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Budget Cortihouse"

# Database (Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"
SUPABASE_SERVICE_ROLE_KEY="xxx"

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="xxx"

# Email (Resend)
RESEND_API_KEY="xxx"
EMAIL_FROM="orcamentos@cortihouse.com.br"

# Storage
STORAGE_BUCKET="cortihouse"
```

---

## 9. DADOS INICIAIS (SEED)

### 9.1 Empresa

```typescript
const empresaSeed = {
  name: "Cortihouse Cortinas de Palco, Decorações & Confecções Ltda",
  tradeName: "Cortihouse Cortinas e Persianas",
  cnpj: "41.697.350/0001-36",
  ie: "186.78326000-90",
  address: "Rua Diamantina, 26",
  city: "Contagem",
  state: "MG",
  zipCode: "32040-260",
  phone: "31 3351-7467",
  phone2: "31 9 9973-2346",
  email: "contato@cortihouse.com.br",
  website: "www.cortihouse.com.br",
  defaultValidityDays: 15,
  defaultDeliveryDays: 15,
  defaultPaymentTerms: "À vista c/3% de desconto, sendo 40% no pedido, restante na entrega via pix, ou 30% no pedido e restante em 2x no cartão de crédito Visa ou Mastercard.",
  defaultObservations: `✓ Frete e Instalação Inclusos
✓ Entregas/Instalações de seg às quintas-feiras, das 8h às 16h
✓ Agendamento da instalação parte da manhã (08h às 11h) ou da tarde (das 13h às 16h)
✓ Disponibilizar banheiro para uso da equipe em trabalho
✓ O cliente deve orientar o instalador sobre local de tubulações, a Cortihouse não se responsabilizará por furos em tubulações de água, energia, gás etc.
✓ O cliente deverá providenciar pessoa para receber o instalador no dia e horário agendados, caso contrário será cobrada taxa de R$100,00`,
};
```

### 9.2 Categorias

```typescript
const categoriasSeed = [
  // Hospitalares
  { name: "Vinil Hospitalar", type: "HOSPITALAR" },
  { name: "Tela Colméia", type: "HOSPITALAR" },
  { name: "Trilhos Hospitalares", type: "HOSPITALAR" },
  { name: "Acessórios Hospitalares", type: "HOSPITALAR" },

  // Residenciais
  { name: "Tecidos", type: "TECIDO" },
  { name: "Trilhos Residenciais", type: "TRILHO" },
  { name: "Varões", type: "TRILHO" },
  { name: "Acessórios", type: "ACESSORIO" },

  // Palco
  { name: "Tecidos de Palco", type: "PALCO" },
  { name: "Estruturas de Palco", type: "PALCO" },

  // Fornecedores
  { name: "Kazza Persianas", type: "FORNECEDOR" },
  { name: "Liber Persianas", type: "FORNECEDOR" },

  // Serviços
  { name: "Mão de Obra", type: "SERVICO" },
  { name: "Frete", type: "SERVICO" },
];
```

### 9.3 Produtos (após entrevista)

```typescript
// PENDENTE - será preenchido após coletar preços
const produtosSeed = [
  // Hospitalares
  { name: "Vinil VNS 45 - Azul", category: "Vinil Hospitalar", unit: "METRO_QUADRADO", unitPrice: 0 },
  { name: "Tela Colméia 100% Poliéster", category: "Tela Colméia", unit: "METRO_QUADRADO", unitPrice: 0 },
  { name: "Trilho Suíço Luxo", category: "Trilhos Hospitalares", unit: "METRO", unitPrice: 0 },
  // ... continua
];
```

---

## 10. TESTES

### 10.1 Estrutura de Testes

```
__tests__/
├── unit/
│   ├── calculadora/
│   │   ├── hospitalar.test.ts
│   │   ├── residencial.test.ts
│   │   └── fornecedor.test.ts
│   ├── utils/
│   │   └── formatters.test.ts
│   └── validations/
│       └── schemas.test.ts
├── integration/
│   ├── api/
│   │   ├── clientes.test.ts
│   │   ├── orcamentos.test.ts
│   │   └── produtos.test.ts
│   └── db/
│       └── queries.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── criar-orcamento.spec.ts
    └── gerar-pdf.spec.ts
```

### 10.2 Casos de Teste Críticos

```
Calculadora Hospitalar:
□ Calcular cortina com trilho e instalação
□ Calcular cortina sem trilho
□ Calcular com rebaixamento (pé direito > 3.10m)
□ Calcular com curvas no trilho
□ Aplicar ICMS para SP
□ Fator de franzido 1.65 corretamente aplicado

Orçamentos:
□ Criar orçamento com múltiplos itens
□ Adicionar/remover itens
□ Aplicar desconto percentual
□ Aplicar desconto fixo
□ Duplicar orçamento
□ Gerar PDF
□ Alterar status

Validações:
□ Cliente sem nome (erro)
□ Cliente sem telefone (erro)
□ Medidas negativas (erro)
□ Medidas zero (erro)
□ Orçamento sem itens (erro)
```

---

## 11. DEPLOY E CI/CD

### 11.1 GitHub Actions

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
```

### 11.2 Vercel Config

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["gru1"]
}
```

---

## 12. CHECKLIST FINAL

### Pré-requisitos para começar desenvolvimento:

**Infraestrutura:**
- [ ] Criar projeto no Supabase
- [ ] Criar projeto no Vercel
- [ ] Configurar domínio (opcional)
- [ ] Configurar Resend para emails

**Dados:**
- [ ] Coletar preços unitários (entrevista)
- [ ] Definir fatores de franzido
- [ ] Definir markup de fornecedores
- [ ] Obter logo da empresa

**Decisões técnicas:**
- [ ] Confirmar ORM (Prisma vs Drizzle)
- [ ] Confirmar auth provider
- [ ] Confirmar estrutura de permissões

---

*Documento de Arquitetura v1.0*
*Status: EM CONSTRUÇÃO*
