# Budget Cortihouse

Sistema de orçamentação para a **Cortihouse Cortinas**, desenvolvido para facilitar a criação de orçamentos profissionais de forma simples e intuitiva.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL)
- **ORM:** Drizzle ORM
- **Auth:** Supabase Auth
- **UI:** Tailwind CSS + shadcn/ui
- **State:** Zustand + TanStack Query
- **PDF:** @react-pdf/renderer

## Setup

### 1. Instalar dependências

```bash
cd apps/budget-cortihouse
bun install
```

### 2. Configurar variáveis de ambiente

O arquivo `.env.local` já está configurado com as credenciais do Supabase.

### 3. Criar as tabelas no banco

```bash
bun run db:push
```

### 4. Iniciar o servidor de desenvolvimento

```bash
bun run dev
```

O app estará disponível em `http://localhost:3000`.

## Estrutura do Projeto

```
src/
├── app/                        # App Router pages
│   ├── (dashboard)/           # Rotas autenticadas
│   │   ├── dashboard/         # Dashboard principal
│   │   ├── clientes/          # CRUD de clientes
│   │   ├── orcamentos/        # Gestão de orçamentos
│   │   │   └── novo/          # Wizard de novo orçamento
│   │   ├── produtos/          # Catálogo de produtos
│   │   └── configuracoes/     # Configurações
│   ├── login/                 # Página de login
│   ├── layout.tsx             # Layout root
│   └── page.tsx               # Redirect para login
├── components/
│   ├── layout/                # Sidebar, Header
│   └── ui/                    # Componentes shadcn/ui
├── lib/
│   ├── calculations/          # Lógica de cálculo
│   ├── db/                    # Schema Drizzle
│   ├── supabase/              # Clients Supabase
│   └── utils.ts               # Utilitários
├── constants/
│   └── calculation.ts         # Constantes de cálculo
└── middleware.ts              # Auth middleware
```

## Funcionalidades

### Implementadas

- ✅ Autenticação (login/logout)
- ✅ Dashboard com estatísticas
- ✅ Layout com sidebar e navegação
- ✅ Cadastro de clientes
- ✅ Listagem de clientes
- ✅ Listagem de orçamentos
- ✅ Listagem de produtos
- ✅ Wizard de criação de orçamento (4 etapas)
- ✅ Calculadora hospitalar
- ✅ Compartilhamento WhatsApp
- ✅ Configurações da empresa

### Pendentes

- ⏳ Geração de PDF
- ⏳ API de clientes (CRUD completo)
- ⏳ API de orçamentos (CRUD completo)
- ⏳ API de produtos (CRUD completo)
- ⏳ Preços reais (aguardando entrevista)

## Pendências de Dados

Os seguintes preços precisam ser coletados com a Vanda:

### Hospitalares
- Vinil VNS 45 (R$/m²)
- Tela Colméia (R$/m²)
- Trilho Suíço Luxo (R$/m)
- Suportes, tampas, ilhós, ganchos, deslizantes
- Confecção e instalação

### Residenciais
- Fatores de franzido por tipo
- Preços de tecidos
- Preços de trilhos

Ver `docs/INTERVIEW_SCRIPT.md` para o roteiro completo.

## Documentação

| Documento | Descrição |
|-----------|-----------|
| MASTER.md | Referência principal |
| TECH_DECISIONS.md | Decisões técnicas |
| IMPLEMENTATION_GUIDE.md | Guia de implementação |
| PRD.md | Requisitos do produto |
| USER_FLOWS.md | Fluxos de usuário |
| CALCULATIONS.md | Fórmulas de cálculo |
| HOSPITAL_RULES.md | Regras hospitalares |
| INTERVIEW_SCRIPT.md | Roteiro de entrevista |

## Comandos

```bash
# Desenvolvimento
bun run dev

# Build
bun run build

# Lint
bun run lint

# Type check
bun run typecheck

# Database
bun run db:generate   # Gerar migrations
bun run db:push       # Aplicar schema
bun run db:studio     # Abrir Drizzle Studio
```

---

*Desenvolvido para Cortihouse Cortinas*
