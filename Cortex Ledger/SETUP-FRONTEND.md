# 🚀 Setup Frontend - Cortex Ledger

> Guia rápido para configurar e rodar o frontend localmente

---

## 📋 Pré-requisitos

- **Node.js** 20+
- **pnpm** 9+
- **Git**
- Conta no Supabase (para backend)

---

## ⚡ Quick Start (5 min)

```bash
# 1. Clone o repositório (se ainda não clonou)
git clone <repo-url>
cd "Cortex Ledger/apps/web"

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente
cp .env.local.example .env.local
# Editar .env.local e adicionar:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4. Rodar servidor de desenvolvimento
pnpm dev

# 5. Abrir no navegador
open http://localhost:3000
```

✅ **Pronto!** O frontend deve estar rodando.

---

## 🔧 Configuração Detalhada

### 1. Variáveis de Ambiente

Edite `apps/web/.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xborrshstfcvzrxyqyor.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-aqui>

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Onde encontrar as chaves:**
1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione o projeto `Cortex Ledger`
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### 2. Scripts Disponíveis

```bash
# Desenvolvimento (hot reload)
pnpm dev

# Build de produção
pnpm build

# Rodar build de produção
pnpm start

# Type check
pnpm tsc --noEmit

# Lint
pnpm lint

# Formatar código
pnpm format
```

---

## 📁 Estrutura de Arquivos

```
apps/web/
├── src/
│   ├── app/                    # App Router (Next.js 13+)
│   │   ├── (auth)/            # Páginas de autenticação
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (dashboard)/       # Páginas protegidas
│   │   │   ├── page.tsx       # Dashboard Home
│   │   │   ├── transacoes/
│   │   │   ├── orcamento/
│   │   │   ├── importar/
│   │   │   └── categorias/
│   │   ├── layout.tsx         # Layout raiz
│   │   └── globals.css        # Estilos globais
│   │
│   ├── components/
│   │   ├── ui/                # Componentes base (14 componentes)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── label.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── money-input.tsx      # 💰 Custom
│   │   │   ├── date-picker.tsx      # 📅 Custom
│   │   │   ├── avatar.tsx           # 👤 Custom
│   │   │   ├── tabs.tsx             # 📑 Custom
│   │   │   ├── skeleton.tsx         # ⏳ Custom
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/            # Layout components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── dashboard-layout.tsx
│   │   │
│   │   ├── auth/              # Autenticação
│   │   │   └── protected-route.tsx
│   │   │
│   │   ├── dashboard/         # Dashboard components
│   │   │   ├── accounts-overview.tsx
│   │   │   ├── dfc-chart.tsx
│   │   │   └── budget-vs-actual-chart.tsx
│   │   │
│   │   └── charts/            # Chart wrappers
│   │       └── chart-wrapper.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts        # Cliente Supabase
│   │   ├── providers.tsx      # React Query provider
│   │   ├── utils.ts           # Utilitários
│   │   ├── design-tokens.ts   # Tokens de design
│   │   ├── types.ts           # Tipos gerais
│   │   └── hooks/             # React Query hooks
│   │       ├── use-accounts.ts
│   │       ├── use-transacoes.ts
│   │       ├── use-dfc-data.ts
│   │       └── use-budget-data.ts
│   │
│   ├── contexts/
│   │   └── auth-context.tsx   # Context de autenticação
│   │
│   └── middleware.ts          # Middleware Next.js (proteção rotas)
│
├── public/                    # Assets estáticos
├── .env.local                 # Variáveis de ambiente (não commitado)
├── tailwind.config.ts         # Config Tailwind
├── tsconfig.json             # Config TypeScript
└── package.json              # Dependências
```

---

## 🎨 Componentes Disponíveis

### Componentes Base (Shadcn-style)

```tsx
import {
  Button,
  Input,
  Card, CardHeader, CardContent, CardFooter,
  Table, TableHeader, TableBody, TableRow, TableCell,
  Dialog,
  DropdownMenu,
  Select,
  Badge,
  Toast,
  Label,
  Modal
} from '@/components/ui'

// Exemplo
<Button variant="primary" size="md">Clique aqui</Button>
```

### Componentes Custom

```tsx
import {
  MoneyInput,
  DatePicker,
  DateRangePicker,
  UserAvatar,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Skeleton, SkeletonCard, SkeletonTable
} from '@/components/ui'

// Money Input (formato brasileiro)
<MoneyInput
  value={1234.56}
  onChange={setValor}
  currency="BRL"
/>
// Exibe: R$ 1.234,56

// Date Picker (formato DD/MM/YYYY)
<DatePicker
  value={new Date()}
  onChange={setData}
  placeholder="DD/MM/AAAA"
/>

// Avatar com iniciais
<UserAvatar
  name="João Silva"
  src="/foto.jpg"
  size="md"
/>
// Exibe: "JS" ou foto
```

---

## 🔐 Autenticação

O sistema usa **Supabase Auth** com middleware server-side.

### Login

```tsx
import { useAuth } from '@/contexts/auth-context'

function LoginForm() {
  const { signIn } = useAuth()

  const handleLogin = async () => {
    const { error } = await signIn('email@exemplo.com', 'senha123')
    if (!error) {
      // Redirect automático para /
    }
  }
}
```

### Protected Routes

Rotas em `app/(dashboard)/*` são automaticamente protegidas pelo middleware.

```typescript
// src/middleware.ts
// ✅ Já configurado - não requer ação
```

### Contas de Teste

No `.env.local` há duas contas de teste (ver seed do backend):

```
alice@exemplo.com / senha123
bob@exemplo.com / senha123
```

---

## 📊 React Query Hooks

### Buscar Dados

```tsx
import { useAccounts } from '@/lib/hooks/use-accounts'
import { useTransactions } from '@/lib/hooks/use-transacoes'
import { useDFCData } from '@/lib/hooks/use-dfc-data'

function Dashboard() {
  const { data: accounts, isLoading } = useAccounts()
  const { data: transactions } = useTransactions({ page: 1, limit: 50 })
  const { data: dfc } = useDFCData()

  if (isLoading) return <Skeleton />

  return <div>{/* Renderizar dados */}</div>
}
```

### Configuração

React Query está configurado em `src/lib/providers.tsx`:

```typescript
{
  staleTime: 60 * 1000,        // 1 minuto
  refetchOnWindowFocus: false,
}
```

---

## 🎨 Tema e Cores

### Paleta de Cores

```typescript
// Verde-acqua (Primary)
primary-500: #339686

// Grafite/Neutral
neutral-900: #212529

// Warning (Laranja queimado)
warning-500: #FF7733

// Success
success-500: #4CAF50

// Error
error-500: #E53935
```

### Dark Mode

O sistema detecta automaticamente o tema do SO:

```tsx
// tailwind.config.ts
darkMode: 'class'

// Uso
<div className="bg-white dark:bg-neutral-900">
```

---

## 🐛 Troubleshooting

### Erro: "Missing Supabase environment variables"

**Solução:**
1. Verifique se `.env.local` existe
2. Verifique se as chaves estão corretas
3. Reinicie o servidor (`pnpm dev`)

### Erro: TypeScript erros

```bash
# Limpar e recompilar
rm -rf node_modules .next
pnpm install
pnpm dev
```

### Erro: "Cannot find module"

```bash
# Reinstalar dependências
pnpm install
```

### Port 3000 já está em uso

```bash
# Usar porta diferente
PORT=3001 pnpm dev
```

---

## ⚠️ Bloqueios Conhecidos

### Backend não aplicado

**Sintoma:** Login retorna erro 401 ou "table not found"

**Causa:** Migrations do Supabase não foram aplicadas

**Solução:** Ver `/DESBLOQUEIO-BACKEND-GUIA.md` ou `/AGENTE-G-EXECUCAO-RAPIDA.md`

```bash
# Quick fix (15min)
cd "../.."  # Voltar para raiz
node scripts/apply-migration-api.mjs
supabase login
./scripts/complete-backend-setup.sh
```

---

## 📚 Documentação Adicional

- **PRD completo:** `/PRD-v1.md`
- **Architecture:** `/ARCHITECTURE.md`
- **Status Report:** `/STATUS-REPORT.md`
- **Agent D Report:** `/AGENTE-D-REPORT.md`
- **Backend Setup:** `/DESBLOQUEIO-BACKEND-GUIA.md`

---

## 🆘 Ajuda

### Comando para ver status geral

```bash
# Ver status do projeto
cat STATUS-REPORT.md | grep -A 10 "EXECUTIVE SUMMARY"

# Ver próximos passos
cat STATUS-REPORT.md | grep -A 20 "PRÓXIMOS PASSOS"
```

### Links Úteis

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)
- [React Query](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)

---

**Última atualização:** 2025-10-26 (Agente D)
