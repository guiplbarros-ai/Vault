# CLAUDE.md - Projetos Pessoais

Este monorepo contém os projetos pessoais do Guilherme.

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│  PESSOAL - Monorepo de Projetos Pessoais                        │
│  Stack: Next.js + React + TypeScript + Bun                      │
├─────────────────────────────────────────────────────────────────┤
│  📦 PACKAGE MANAGER: bun@1.2.0 (ÚNICO)                          │
│     bun run <cmd>  │  bunx <pkg>  │  bun add <dep>             │
├─────────────────────────────────────────────────────────────────┤
│  🏗️ ESTRUTURA                                                   │
│     Apps: budget-cortihouse, cortex-cash, gestor-obsidian      │
│     Packages: @pessoal/shared                                   │
├─────────────────────────────────────────────────────────────────┤
│  🚀 COMANDOS                                                    │
│     dev       → bun run dev           (todos os apps)          │
│     build     → bun run build         (produção)               │
│     lint      → bun run lint          (biome)                  │
│     format    → bun run format        (biome)                  │
│     check     → bun run check         (lint + format)          │
│     typecheck → bun run typecheck                              │
└─────────────────────────────────────────────────────────────────┘
```

## Estrutura

```
pessoal/
├── apps/
│   ├── budget-cortihouse/    # Orçamento Casa Cortihouse
│   ├── cortex-cash/          # App financeiro pessoal (Next.js)
│   └── gestor-obsidian/      # Bot para gerenciar vaults Obsidian
├── packages/
│   └── shared/               # Código compartilhado (@pessoal/shared)
├── .vscode/                  # Configurações VSCode
├── biome.json                # Linter + Formatter
├── tsconfig.base.json        # TypeScript base config
└── .husky/                   # Git hooks
```

## Apps

### Budget Cortihouse
Orçamento para construção da casa.

### Vault One (dir: cortex-cash)
App financeiro pessoal completo. Renomeado de "Cortex Cash" para "Vault One".
- **Versao**: v0.5.0-dev (features de v0.1 a v0.5 implementadas)
- **Tech**: Next.js 16 + React 19 + TypeScript + Supabase + Tailwind 4 + shadcn/ui
- **IA**: OpenAI GPT-4o-mini (classificacao de transacoes)
- **Open Finance**: Pluggy SDK
- **DB**: Supabase PostgreSQL (26 tabelas, RLS, Drizzle ORM)
- **Deploy**: Vercel
- **Status**: Ver `apps/cortex-cash/docs/STATUS_MARCO_2026.md`
- **Proximo**: Fase 1 (consolidacao) -> Fase 2 (mobile Expo)

### Gestor Obsidian
Bot TypeScript para gerenciar vaults do Obsidian via Telegram.
- **Tech**: TypeScript, Node.js
- **Deploy**: Fly.io

## Package Compartilhado

O pacote `@pessoal/shared` contém:
- **Utils**: `formatCurrency`, `formatDate`, `formatDateTime`, `sleep`, `isDefined`, `generateId`
- **Types**: `ApiResponse`, `PaginationParams`, `PaginatedResponse`, `PartialBy`, `RequiredBy`

### Como usar

```typescript
// Em qualquer app
import { formatCurrency, formatDate } from '@pessoal/shared'
import type { ApiResponse } from '@pessoal/shared/types'
```

## Regras

### Package Manager
**Bun é o package manager ÚNICO. NUNCA use npm, yarn ou pnpm.**

| ❌ NUNCA | ✅ SEMPRE |
|---------|----------|
| `npm run` | `bun run` |
| `npm install` | `bun install` |
| `npx` | `bunx` |

### Linting & Formatting
**Biome é o linter e formatter. NUNCA use ESLint ou Prettier.**

```bash
bun run lint        # Verificar erros
bun run lint:fix    # Corrigir erros automaticamente
bun run format      # Formatar código
bun run check       # Lint + Format juntos
bun run check:fix   # Corrigir tudo
```

### Git Hooks
Pre-commit hook executa `lint-staged` automaticamente.

### TypeScript
Todos os apps devem estender `tsconfig.base.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    // configs específicas do app
  }
}
```

### Linguagem
- **Código**: Inglês
- **UI**: Português Brasileiro
- **Commits**: Português ou Inglês

## Comandos por App

```bash
# Budget Cortihouse
bun --filter budget-cortihouse dev

# Cortex Cash
bun --filter cortex-cash dev

# Gestor Obsidian
bun --filter gestor-obsidian dev
```

## VSCode

Extensões recomendadas instaladas automaticamente:
- **Biome** - Linter/Formatter
- **Tailwind CSS IntelliSense** - Autocomplete Tailwind
- **Pretty TypeScript Errors** - Erros mais legíveis
- **EditorConfig** - Configurações de editor
