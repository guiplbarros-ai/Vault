# Protocolo de Integração - Nova Aplicação no Cortex Ledger

**Versão:** 1.0
**Data:** 27 de outubro de 2025
**Objetivo:** Estabelecer protocolo claro para receber e integrar aplicação externa (Vercel/Lovable) ao Cortex Ledger

---

## 1. Arquitetura Atual do Cortex Ledger

### 1.1 Estrutura do Monorepo (pnpm workspace + Turborepo)

```
cortex-ledger/
├── apps/
│   ├── web/                    # Next.js 16 + React 19 + Tailwind v4
│   └── desktop/                # App macOS (wrapper)
├── packages/
│   ├── db/                     # Drizzle ORM (não usado no web ainda)
│   ├── services/               # Lógica compartilhada
│   └── etl/                    # Importação/parsing de extratos
├── supabase/
│   ├── migrations/             # Schema SQL
│   ├── functions/              # Edge functions
│   └── tests/                  # Testes de RLS
├── docs/
│   ├── architecture/
│   ├── features/
│   └── guides/
└── .playwright-mcp/            # MCP Playwright (manter)
```

### 1.2 Stack Tecnológico

**Frontend (apps/web):**
- Next.js 16.0.0 (App Router)
- React 19.2.0
- Tailwind CSS v4
- TanStack Query v5.90.5
- Lucide Icons v0.548.0
- ECharts + echarts-for-react
- date-fns v4.1.0

**Backend/Database:**
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Row Level Security (RLS) habilitado
- Realtime subscriptions (limitado a 2 eventos/seg)

**Dev Tools:**
- pnpm 9.15.0
- Turbo 2.3.3
- TypeScript 5
- ESLint 9

### 1.3 Pontos de Integração Críticos

#### A) Autenticação (Supabase Auth)
**Localização:** `apps/web/src/contexts/auth-context.tsx`

```typescript
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
}
```

**Cliente Supabase:** `apps/web/src/lib/supabase.ts`
- Configurado com `persistSession: true`
- `autoRefreshToken: true`
- Storage: `localStorage` (browser)
- Custom header: `x-client-info: cortex-ledger`

**Variáveis de ambiente necessárias:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xborrshstfcvzrxyqyor.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### B) Schema do Banco de Dados

**Tabelas principais:**
- `user_profile` - Perfil do usuário (nome, preferências)
- `instituicao` - Bancos/instituições financeiras
- `conta` - Contas bancárias/investimentos
- `transacao` - Transações financeiras
- `categoria` - Categorias de transação
- `orcamento` - Orçamentos mensais por categoria
- `cartao_credito` - Cartões de crédito (nova, sem conta_id)

**RLS Policy Pattern:**
```sql
-- Todas as tabelas usam user_id para isolamento
CREATE POLICY "users_own_data" ON table_name
FOR ALL USING (auth.uid() = user_id);
```

#### C) Sistema de Design (UI-FRONTEND-GUIDE.md)

**Paleta de cores:**
- **Brand (verde-acqua):** `brand-600 #12B5A2` (ação primária)
- **Grafites (dark mode):** `graphite-950` até `graphite-100`
- **Estados:** success, warning, error, info, insight

**Componentes padronizados:**
- Botões: `h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700`
- Inputs: `h-10 px-3 rounded-lg bg-graphite-700 border-graphite-600`
- Cards: `rounded-xl2 shadow-cardDark border-graphite-700`
- Focus ring: `focus:ring-2 focus:ring-brand-400`

**Modo:** Dark-first (`className="dark"` no html)

---

## 2. Protocolo de Recebimento

### 2.1 Informações Necessárias

Antes de enviar os arquivos, forneça:

1. **Descrição da aplicação:**
   - Propósito/funcionalidade
   - Stack tecnológico utilizada
   - Framework (Next.js, React, Vue, etc.)
   - Gerenciador de pacotes (npm, pnpm, yarn)

2. **Estrutura de arquivos:**
   - Listar diretórios principais
   - Componentes principais
   - Rotas/páginas
   - Assets (imagens, ícones, etc.)

3. **Dependências:**
   - Lista completa do package.json
   - Versões críticas (React, Next, etc.)
   - Bibliotecas de UI utilizadas

4. **Integrações existentes:**
   - APIs externas
   - Serviços de autenticação
   - Banco de dados (se houver)
   - Estado global (Redux, Zustand, Context, etc.)

5. **Variáveis de ambiente:**
   - Liste todas as variáveis necessárias (SEM valores sensíveis)
   - Indique quais são obrigatórias vs opcionais

### 2.2 Formato de Envio

**Opção A - Arquivo por arquivo:**
```
1. Enviar estrutura de diretórios primeiro
2. Enviar package.json
3. Enviar arquivos de configuração (next.config, tailwind.config, etc.)
4. Enviar componentes principais
5. Enviar páginas/rotas
6. Enviar utilitários e hooks
```

**Opção B - Contexto completo:**
```
Compartilhar link do repositório Git ou export do Lovable/v0
```

### 2.3 Checklist Pré-Integração

Antes de receber, verificar:
- [ ] Compatibilidade de versões do React (atual: 19.2.0)
- [ ] Compatibilidade do Next.js (atual: 16.0.0)
- [ ] Conflitos de dependências
- [ ] Overlapping de rotas
- [ ] Conflitos de styling (Tailwind v4 compatibility)
- [ ] Necessidade de migração de dados

---

## 3. Estratégias de Integração

### 3.1 Opção A - Nova Rota no App Web

**Quando usar:** Aplicação é uma feature adicional do Cortex Ledger

**Estrutura:**
```
apps/web/src/app/
├── (dashboard)/              # Rotas existentes
│   ├── page.tsx
│   ├── transactions/
│   └── budgets/
└── (nova-feature)/           # Nova aplicação
    ├── layout.tsx            # Layout específico se necessário
    ├── page.tsx
    └── components/
```

**Passos:**
1. Criar novo grupo de rotas em `apps/web/src/app/(nome-feature)/`
2. Migrar componentes para `apps/web/src/components/nome-feature/`
3. Adaptar imports e paths
4. Ajustar estilos para seguir UI-FRONTEND-GUIDE.md
5. Integrar com AuthContext existente
6. Conectar ao Supabase se necessário

### 3.2 Opção B - Novo App no Monorepo

**Quando usar:** Aplicação é standalone mas compartilha backend/auth

**Estrutura:**
```
apps/
├── web/                      # Existente
└── nova-app/                 # Nova aplicação isolada
    ├── package.json
    ├── next.config.js
    ├── src/
    └── public/
```

**Passos:**
1. Criar novo diretório em `apps/nova-app/`
2. Copiar estrutura completa da aplicação
3. Configurar workspace no pnpm-workspace.yaml
4. Adicionar ao turbo.json
5. Compartilhar pacotes comuns via `packages/`
6. Usar mesmo Supabase client

### 3.3 Opção C - Package Compartilhado

**Quando usar:** Funcionalidade será usada por múltiplos apps

**Estrutura:**
```
packages/
├── ui/                       # Componentes compartilhados
├── services/                 # Existente
└── nova-feature/             # Nova feature como pacote
    ├── package.json
    ├── src/
    └── tsconfig.json
```

**Passos:**
1. Criar package em `packages/nome-feature/`
2. Exportar componentes/funções necessários
3. Configurar build (tsup, vite, etc.)
4. Importar nos apps que precisam

---

## 4. Checklist de Migração

### 4.1 Código

- [ ] Ajustar imports para estrutura do monorepo
- [ ] Converter estilos para tokens do UI-FRONTEND-GUIDE.md
- [ ] Adaptar componentes para dark-first design
- [ ] Remover dependências duplicadas
- [ ] Atualizar versões conflitantes
- [ ] Substituir fetch direto por cliente Supabase (se aplicável)
- [ ] Integrar com AuthContext global
- [ ] Adicionar tratamento de RLS errors

### 4.2 Configuração

- [ ] Adicionar scripts no package.json raiz
- [ ] Configurar no turbo.json
- [ ] Atualizar pnpm-workspace.yaml
- [ ] Adicionar variáveis de ambiente necessárias
- [ ] Configurar rotas no next.config.js (se necessário)

### 4.3 Database (se necessário)

- [ ] Criar migrations Supabase
- [ ] Adicionar RLS policies
- [ ] Seed de dados iniciais
- [ ] Testar isolamento de dados por usuário
- [ ] Documentar schema em Database type definitions

### 4.4 UI/UX

- [ ] Auditar contraste (AA mínimo)
- [ ] Aplicar focus rings (brand-400)
- [ ] Ajustar heights (inputs: h-10, buttons: h-10)
- [ ] Usar cores semânticas (success, error, warning)
- [ ] Testar no dark mode
- [ ] Validar responsividade

### 4.5 Testes

- [ ] Testar autenticação funciona
- [ ] Testar queries retornam dados corretos
- [ ] Testar RLS policies bloqueiam acesso não autorizado
- [ ] Testar navegação entre rotas
- [ ] Testar no build de produção (`pnpm build`)

---

## 5. Padrões de Código a Seguir

### 5.1 React Hooks

```typescript
// Usar TanStack Query para data fetching
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useData() {
  return useQuery({
    queryKey: ['data-key'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table')
        .select('*')

      if (error) throw error
      return data
    },
    staleTime: 1000 * 60, // 1 minuto
  })
}
```

### 5.2 Componentes

```typescript
// Use 'use client' apenas quando necessário (interatividade)
'use client'

import { useState } from 'react'

interface Props {
  title: string
  onAction: () => void
}

export function Component({ title, onAction }: Props) {
  const [state, setState] = useState(false)

  return (
    <div className="bg-graphite-800 border border-graphite-700 rounded-xl2 p-6">
      <h2 className="text-xl font-semibold text-graphite-100">{title}</h2>
      <button
        onClick={onAction}
        className="h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
      >
        Action
      </button>
    </div>
  )
}
```

### 5.3 Queries Supabase

```typescript
// Sempre filtrar por user_id
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('Not authenticated')

const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('user_id', user.id) // RLS faz isso automaticamente, mas seja explícito
  .order('created_at', { ascending: false })

if (error) {
  console.error('Supabase error:', error)
  throw new Error(`Failed to fetch data: ${error.message}`)
}
```

---

## 6. Workflow de Integração

### 6.1 Fase 1 - Análise (Claude)

1. Receber informações conforme seção 2.1
2. Analisar compatibilidade de stack
3. Identificar pontos de conflito
4. Propor estratégia de integração (A, B ou C)
5. Listar modificações necessárias

### 6.2 Fase 2 - Setup

1. Criar estrutura de diretórios
2. Configurar workspace/turborepo
3. Instalar dependências únicas
4. Copiar arquivos base (configs, etc.)

### 6.3 Fase 3 - Migração

1. Migrar componentes (adaptando estilos)
2. Migrar páginas/rotas
3. Migrar hooks/utils
4. Integrar autenticação
5. Integrar data fetching

### 6.4 Fase 4 - Validação

1. Rodar `pnpm install`
2. Rodar `pnpm dev` e verificar erros
3. Testar funcionalidades principais
4. Auditar UI (seguir GUIDE)
5. Testar build (`pnpm build`)

### 6.5 Fase 5 - Documentação

1. Atualizar README com nova feature
2. Documentar rotas adicionadas
3. Documentar tabelas/migrations novas
4. Atualizar architecture docs

---

## 7. Cenários Especiais

### 7.1 Aplicação usa autenticação diferente
- Remover sistema de auth existente
- Substituir por imports do AuthContext
- Adaptar guards de rota para usar `useAuth()`

### 7.2 Aplicação usa outra biblioteca de estilos
- Se CSS-in-JS (styled-components, emotion): migrar para Tailwind
- Se Tailwind v3: atualizar para v4 (remover `@apply`, usar CSS vars)
- Se Bootstrap/Material: migrar componente por componente

### 7.3 Aplicação tem próprio backend
- Avaliar se pode ser substituído por Supabase
- Se não: criar proxy em Edge Functions ou API Routes
- Garantir autenticação consistente

### 7.4 Aplicação usa state management global
- Redux: pode manter ou migrar para React Query
- Zustand: compatível, pode coexistir
- Context API: integrar com AuthContext existente

---

## 8. Regras de Ouro

1. **NUNCA** sobrescrever componentes existentes do Cortex Ledger
2. **SEMPRE** seguir UI-FRONTEND-GUIDE.md para novos componentes
3. **SEMPRE** usar AuthContext para autenticação
4. **SEMPRE** usar cliente Supabase compartilhado
5. **NUNCA** criar variantes light/dark manuais (dark-first apenas)
6. **SEMPRE** validar RLS policies antes de deploy
7. **SEMPRE** rodar `pnpm build` antes de considerar completo

---

## 9. Contato e Suporte

**Mantenedor:** Guilherme (PO)
**Issues:** Documentar em `docs/reports/`
**Updates:** Versionar este documento conforme evolução

---

**Próximos passos:**
1. Aguardar informações da aplicação conforme seção 2.1
2. Analisar e propor estratégia de integração
3. Iniciar migração seguindo workflow da seção 6
