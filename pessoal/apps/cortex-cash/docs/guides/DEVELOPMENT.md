# Development Guide - Cortex Cash
**Convenções e Boas Práticas | v0.4**

## 🎯 Arquitetura de 3 Agentes

O projeto usa **3 agentes especializados** para desenvolvimento:

1. **Agent CORE** - Arquitetura, infraestrutura, coordenação
2. **Agent DATA** - Importação, ETL, classificação com IA
3. **Agent APP** - UI, UX, features visuais

Leia mais em: [AGENTES_IA.md](./AGENTES_IA.md)

---

## 🏗️ Stack Tecnológica

### Frontend
- **Next.js 16** (App Router + Turbopack)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 3**
- **shadcn/ui** (Radix UI + Tailwind)

### Database
- **Dexie.js** (IndexedDB wrapper)
- **Client-side only** (v0.x)
- **PostgreSQL** (v1.0+ com Supabase)

### IA
- **OpenAI GPT-4o-mini** (classificação)
- **Server-side only** (API routes)

### Tools
- **ESLint** (linting)
- **Prettier** (formatting - se habilitado)
- **TypeScript** (type checking)
- **Vitest** (testing - futuro)

---

## 📁 Estrutura de Pastas

```
app/                    # Next.js App Router
├── page.tsx           # Dashboard (Agent APP)
├── api/               # API routes (Agent DATA)
│   └── ai/           # Endpoints de IA
├── transactions/      # CRUD transações (Agent APP)
├── accounts/          # CRUD contas (Agent APP)
├── settings/          # Configurações (Agent APP)
└── providers/         # React contexts (Agent CORE)

components/            # Componentes React (Agent APP)
├── ui/               # shadcn/ui base components
├── forms/            # Formulários reutilizáveis
├── classification/   # Componentes de IA
└── dashboard-layout.tsx

lib/                   # Lógica de negócio
├── db/               # Database (Agent CORE)
│   ├── client.ts    # Dexie client
│   └── seed.ts      # Seed data
├── services/         # Business logic layer
│   ├── transacao.service.ts    (Agent DATA)
│   ├── categoria.service.ts    (Agent DATA)
│   ├── ai-usage.service.ts     (Agent DATA)
│   └── ...
├── finance/          # Lógica financeira (Agent DATA)
│   └── classification/
│       ├── rule-engine.ts
│       └── prompt-cache.ts
├── utils/            # Utilitários (Agent CORE)
├── validations/      # Zod schemas (Agent CORE)
└── types/            # TypeScript types (Agent CORE)

docs/                  # Documentação
├── guides/           # Guias de uso
├── ai/               # Docs de IA
├── features/         # Docs de features
└── architecture/     # Docs técnicos
```

---

## 🎨 Convenções de Código

### Nomenclatura

**TypeScript/React:**
- **PascalCase**: Components, Types, Interfaces
  ```typescript
  type TransacaoType = ...
  interface TransacaoFormProps { ... }
  export function TransacaoForm() { ... }
  ```

- **camelCase**: Functions, variables, props
  ```typescript
  const userName = 'João';
  function calculateTotal() { ... }
  ```

- **UPPER_CASE**: Constants, Enums
  ```typescript
  const MAX_LIMIT = 100;
  const USD_TO_BRL = 6.0;
  ```

**Files:**
- **kebab-case**: arquivos e pastas
  ```
  transaction-form.tsx
  ai-usage-card.tsx
  regra-classificacao.service.ts
  ```

**Database:**
- **snake_case**: tabelas e colunas
  ```typescript
  interface Transacao {
    id: string;
    conta_id: string;
    categoria_id?: string;
    created_at: Date;
  }
  ```

### Imports

**Ordem:**
1. React/Next.js
2. Libraries externas
3. Aliases `@/`
4. Relativos `./` `../`
5. Types (último)

```typescript
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { transacaoService } from '@/lib/services/transacao.service';

import { TransactionCard } from './transaction-card';

import type { Transacao } from '@/lib/types';
```

### Componentes React

**Estrutura padrão:**
```typescript
'use client';  // Se usa hooks ou estado

import { ... } from '...';
import type { ... } from '...';

interface ComponentProps {
  prop1: string;
  prop2?: number;
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // 1. Hooks
  const [state, setState] = useState();
  
  // 2. Effects
  useEffect(() => { ... }, []);
  
  // 3. Handlers
  const handleClick = () => { ... };
  
  // 4. Render
  return (
    <div>...</div>
  );
}
```

### Services

**Padrão Singleton:**
```typescript
class TransacaoService {
  async createTransacao(dto: CreateTransacaoDTO): Promise<Transacao> {
    // Validação
    // Lógica
    // Persistência
    // Retorno
  }
  
  // Outros métodos...
}

// Exporta instância única
export const transacaoService = new TransacaoService();
```

---

## 🔀 Git Workflow

### Branches

**Estrutura:**
```
main                          (protegida, sempre estável)
├── feature/transacoes-filtro
├── feature/ai-cache
├── fix/importacao-csv
└── docs/consolidacao
```

**Nomenclatura:**
- `feature/nome-curto` - Nova funcionalidade
- `fix/nome-bug` - Correção de bug
- `docs/nome-doc` - Apenas documentação
- `refactor/nome-refactor` - Refatoração

### Commits

**Formato:**
```
Tipo: Descrição curta (50 chars)

Descrição detalhada opcional do que foi feito e por quê.
Pode ter múltiplas linhas.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Tipos:**
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Apenas documentação
- `style:` - Formatação, ponto e vírgula
- `refactor:` - Refatoração (sem mudança de comportamento)
- `perf:` - Melhoria de performance
- `test:` - Adicionar/corrigir testes
- `chore:` - Mudanças em build, CI, deps

**Exemplos:**
```bash
feat: Add AI classification button to transactions page

Implements ClassifyButton component with loading state and
feedback. Integrates with /api/ai/classify endpoint.

fix: Fix CSV import encoding detection

UTF-8 BOM was not being properly detected. Now checks first
3 bytes for EF BB BF sequence.

docs: Consolidate IA documentation into 2 files

Merged 4 files (AI_GUIDE, AI_ENDPOINTS) to reduce duplication
and improve navigation.
```

### Pull Requests

**Template:**
```markdown
## Descrição
Breve descrição do que foi implementado/corrigido.

## Tipo de mudança
- [ ] Nova feature
- [ ] Bug fix
- [ ] Documentação
- [ ] Refatoração

## Checklist
- [ ] Code compila sem erros
- [ ] Testes passam (se houver)
- [ ] Documentação atualizada
- [ ] Sem console.log esquecidos
- [ ] Types corretos (sem `any`)

## Screenshots (se aplicável)
...

## Agent Responsável
Agent APP / Agent DATA / Agent CORE
```

---

## ✅ Code Quality

### TypeScript

**Sempre tipar:**
```typescript
// ❌ RUIM
function calculate(a, b) {
  return a + b;
}

// ✅ BOM
function calculate(a: number, b: number): number {
  return a + b;
}
```

**Evitar `any`:**
```typescript
// ❌ RUIM
const data: any = await fetch(...);

// ✅ BOM
interface APIResponse {
  data: Transaction[];
}
const response: APIResponse = await fetch(...);
```

**Usar `unknown` se tipo realmente desconhecido:**
```typescript
try {
  ...
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}
```

### Error Handling

**Custom errors:**
```typescript
import { NotFoundError, ValidationError } from '@/lib/errors';

// Lançar
if (!transaction) {
  throw new NotFoundError('Transação não encontrada');
}

// Capturar
try {
  await transacaoService.create(dto);
} catch (error) {
  if (error instanceof ValidationError) {
    toast.error(error.message);
  } else {
    toast.error('Erro inesperado');
  }
}
```

### Validação

**Usar Zod runtime validation:**
```typescript
import { z } from 'zod';

const transacaoSchema = z.object({
  descricao: z.string().min(3),
  valor: z.number().positive(),
  data: z.date(),
});

// Validar
const result = transacaoSchema.safeParse(data);
if (!result.success) {
  throw new ValidationError(result.error.message);
}
```

---

## 🧪 Testing (Futuro)

**Estrutura (quando implementado):**
```
tests/
├── unit/
│   ├── services/
│   └── utils/
├── integration/
│   └── api/
└── e2e/
    └── flows/
```

**Convenções:**
- Arquivos: `*.test.ts` ou `*.spec.ts`
- 1 arquivo de teste por módulo
- Describe/It claros e descritivos

---

## 🚀 Deploy

### Vercel (Recomendado)

1. Push para GitHub
2. Conectar repositório no Vercel
3. Configurar variáveis de ambiente:
   ```
   OPENAI_API_KEY=sk-...
   ```
4. Deploy automático

### Build Local

```bash
npm run build
npm run start
```

**Verificações:**
- [ ] Build sem erros
- [ ] Type check passa
- [ ] Lint passa
- [ ] IndexedDB funciona (não usa server-side features)

---

## 📐 Ownership de Arquivos

### Agent CORE
- `lib/db/` - Database client
- `lib/types/` - Types globais
- `lib/validations/` - Schemas Zod
- `app/providers/` - React contexts
- `docs/architecture/` - Docs técnicos

### Agent DATA
- `app/api/` - API routes
- `lib/services/` - Business logic
- `lib/finance/` - Lógica financeira
- `docs/ai/` - Docs de IA

### Agent APP
- `app/**/*.tsx` - Páginas
- `components/` - Componentes React
- `docs/features/` - Docs de UI

**Regra:** Se precisar editar arquivo de outro agent, abra PR e peça review.

---

## 🔒 Segurança

### API Keys

**NUNCA:**
```typescript
// ❌ EXPOSTO NO CLIENT
const OPENAI_KEY = 'sk-...';
fetch('https://api.openai.com', {
  headers: { 'Authorization': `Bearer ${OPENAI_KEY}` }
});
```

**SEMPRE:**
```typescript
// ✅ SERVER-SIDE ONLY
// app/api/ai/classify/route.ts
const OPENAI_KEY = process.env.OPENAI_API_KEY;
```

### Validação de Entrada

**Sempre validar:**
- Request bodies (API routes)
- Form inputs (client)
- Query params
- File uploads

**Usar Zod:**
```typescript
const requestSchema = z.object({
  descricao: z.string().min(1).max(500),
  valor: z.number().finite(),
});

const result = requestSchema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
}
```

---

## 📚 Recursos

**Documentação:**
- [Getting Started](./GETTING_STARTED.md)
- [AI Guide](../ai/AI_GUIDE.md)
- [Data Model](../architecture/DATA_MODEL.md)

**Referências Externas:**
- [Next.js Docs](https://nextjs.org/docs)
- [Dexie.js Docs](https://dexie.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Última atualização:** 05 de Novembro de 2025
**Versão:** v0.4
