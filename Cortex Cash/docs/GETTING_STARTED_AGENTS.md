# Getting Started - Guia para Agentes
> ATENÇÃO: Este documento foi substituído por `docs/AGENTES_IA_3_AGENTS.md`. Use o novo documento como fonte única de verdade.
---
Este guia ajuda os outros agentes (IMPORT, FINANCE, UI) a começarem o trabalho no Cortex Cash.

---

## Setup do Ambiente

### Pré-requisitos
- Node.js 18+
- npm ou pnpm

### Instalação

```bash
# Clone o repositório (se ainda não o fez)
cd "Cortex Cash"

# Instale as dependências
npm install --legacy-peer-deps

# Execute o servidor de desenvolvimento
npm run dev
```

O app estará disponível em: http://localhost:3000

---

## Estrutura do Projeto

```
Cortex Cash/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # ✓ CORE - Layout raiz
│   ├── globals.css               # ✓ CORE - Estilos globais
│   ├── page.tsx                  # 🤝 UI - Dashboard Home
│   ├── transactions/             # 🤝 UI - Página de transações
│   ├── accounts/                 # 🤝 IMPORT - Página de contas
│   ├── import/                   # 🤝 IMPORT - Página de importação
│   ├── categories/               # 🤝 FINANCE - Página de categorias
│   ├── budgets/                  # 🤝 FINANCE - Página de orçamentos
│   ├── credit-cards/             # 🤝 FINANCE - Página de cartões
│   └── settings/                 # ✓ CORE - Configurações
│
├── lib/
│   ├── db/
│   │   ├── schema.ts             # ✓ CORE - Schema do banco
│   │   ├── client.ts             # ✓ CORE - Cliente SQLite
│   │   └── seed.ts               # ✓ CORE - Seed de categorias
│   │
│   ├── types/
│   │   └── index.ts              # ✓ CORE - Tipos compartilhados
│   │
│   ├── utils/
│   │   ├── cn.ts                 # ✓ CORE - Utilitário Tailwind
│   │   ├── date.ts               # ✓ CORE - Utilitários de data
│   │   └── format.ts             # ✓ CORE - Utilitários de formatação
│   │
│   ├── services/
│   │   ├── interfaces.ts         # ✓ CORE - Interfaces de serviços
│   │   ├── transacao.service.ts  # ✓ CORE - Serviço de transações
│   │   ├── categoria.service.ts  # ✓ CORE - Serviço de categorias
│   │   ├── import.service.ts     # ⏳ IMPORT - A implementar
│   │   ├── conta.service.ts      # ⏳ IMPORT - A implementar
│   │   └── classificacao.service.ts # ⏳ FINANCE - A implementar
│   │
│   ├── import/                   # ⏳ IMPORT - Seu domínio
│   │   ├── parsers/
│   │   ├── normalizers/
│   │   └── detectors/
│   │
│   └── finance/                  # ⏳ FINANCE - Seu domínio
│       ├── classification/
│       ├── budget/
│       └── cards/
│
├── components/
│   ├── ui/                       # ✓ CORE - Componentes shadcn/ui
│   ├── dashboard-layout.tsx      # ✓ CORE - Layout do dashboard
│   ├── import/                   # ⏳ IMPORT - Seus componentes
│   ├── transacoes/               # ⏳ UI - Seus componentes
│   └── dashboard/                # ⏳ UI - Seus componentes
│
└── docs/
    ├── FUNCAO_AGENTES_IA.md      # Documento de coordenação
    ├── STATUS_AGENTES.md         # Status atual de cada agent
    └── GETTING_STARTED_AGENTS.md # Este arquivo

✓ = Pronto
🤝 = Colaborativo
⏳ = A fazer
```

---

## Para Agent IMPORT

### Status
🟡 **PODE INICIAR AGORA!**

### Arquivos Principais

**Leia primeiro**:
- `lib/types/index.ts` - Tipos compartilhados
- `lib/services/interfaces.ts` - Interface `IImportService`
- `lib/db/schema.ts` - Schema do banco de dados

**Implemente**:
- `lib/import/parsers/csv.ts` - Parser CSV
- `lib/import/parsers/ofx.ts` - Parser OFX
- `lib/import/normalizers/date.ts` - Normalizador de datas
- `lib/import/normalizers/value.ts` - Normalizador de valores
- `lib/services/import.service.ts` - Implementação do serviço
- `lib/services/conta.service.ts` - CRUD de contas
- `lib/services/instituicao.service.ts` - CRUD de instituições

**Componentes UI** (básicos):
- `app/import/page.tsx` - Página de importação
- `components/import/file-upload.tsx` - Upload de arquivo
- `components/import/preview-table.tsx` - Preview de importação

### Cronograma Sugerido

**Semana 1**:
1. Parser CSV básico
2. Normalização de datas e valores
3. Detecção de separador

**Semana 2**:
1. Dedupe por hash
2. Preview e salvamento
3. CRUD de contas e instituições

### Helpers Disponíveis

```typescript
// Utilitários de data
import { parseDate, parseDateMultiFormat, formatDate } from '@/lib/utils/date';

// Utilitários de formatação
import { normalizeValue, generateHash } from '@/lib/utils/format';

// Cliente de banco de dados
import { getDB } from '@/lib/db/client';

// Tipos
import type { ParseConfig, ParseResult, Transacao } from '@/lib/types';
```

---

## Para Agent FINANCE

### Status
🔴 **AGUARDANDO v0.2**

### Quando Começar
- Quando categorias estiverem funcionando
- Quando houver transações no banco para classificar

### Arquivos Principais

**Leia primeiro**:
- `lib/types/index.ts` - Tipos compartilhados
- `lib/services/interfaces.ts` - Interface `IClassificacaoService`
- `lib/db/schema.ts` - Schema de categorias e regras

**Implemente** (v0.2):
- `lib/finance/classification/rule-engine.ts` - Motor de regras
- `lib/finance/classification/ai-classifier.ts` - Classificação IA
- `lib/services/classificacao.service.ts` - Serviço de classificação
- `lib/services/regra.service.ts` - CRUD de regras

**Implemente** (v0.3):
- `lib/finance/cards/cycle.ts` - Lógica de ciclo de fatura
- `lib/finance/cards/payment-detector.ts` - Detecção de pagamento
- `lib/services/cartao.service.ts` - Serviço de cartões

---

## Para Agent UI

### Status
🟡 **PODE INICIAR SEMANA 2**

### Quando Começar
- Quando Agent IMPORT tiver parsers funcionando
- Quando houver dados no banco para exibir

### Arquivos Principais

**Leia primeiro**:
- `components/dashboard-layout.tsx` - Layout já implementado
- `lib/types/index.ts` - Tipos compartilhados
- `lib/services/interfaces.ts` - Serviços disponíveis

**Implemente**:
- `app/page.tsx` - Dashboard Home com dados reais
- `components/dashboard/saldo-cards.tsx` - Cards de saldo
- `components/dashboard/recent-transactions.tsx` - Transações recentes
- `components/dashboard/cashflow-chart.tsx` - Gráfico de fluxo
- `app/transactions/page.tsx` - Listagem de transações
- `components/transacoes/transacao-table.tsx` - Tabela de transações
- `components/transacoes/transacao-filters.tsx` - Filtros

### Componentes UI Disponíveis

Todos os componentes do shadcn/ui estão disponíveis em `components/ui/`:
- Button, Card, Badge, Table, Dialog, etc.

### Tema

O tema dark "Cortex Pixel Teal" já está configurado em `app/globals.css`:
- Primary: `#d4af37` (Dourado)
- Accent: `#2d9b9b` (Teal)
- Background: `#0a1f2e` (Azul escuro)

---

## Workflow de Git

### Branches

Cada agent trabalha em sua própria branch:

```bash
# Agent IMPORT
git checkout -b import/csv-parser

# Agent FINANCE
git checkout -b finance/classification

# Agent UI
git checkout -b ui/dashboard
```

### Commits

Faça commits frequentes (a cada feature):

```bash
git add .
git commit -m "feat(import): add CSV parser"
```

### Pull de main

A cada 2-4 horas, faça pull da main para evitar conflitos:

```bash
git pull origin main
```

### Merge

Agent CORE revisará e fará merge dos PRs.

---

## Comunicação entre Agentes

### Via Comentários no Código

Use tags especiais nos comentários:

```typescript
// TODO(FINANCE): Adicionar classificação automática após v0.2
// BLOCKED_BY(CORE): Aguardando schema de categorias
// ASK(IMPORT): Como detectar duplicatas? Ver lib/import/dedupe.ts
```

### Via Documento de Status

Atualize `docs/STATUS_AGENTES.md` com:
- Tarefas concluídas
- Bloqueios
- Próximos passos

---

## Helpers e Dicas

### Acessar o Banco de Dados

```typescript
import { getDB } from '@/lib/db/client';

// Uso
const db = await getDB();
// Use queries SQL diretas ou Drizzle ORM
```

### Formatação de Valores

```typescript
import { formatCurrency, formatDate } from '@/lib/utils/format';

formatCurrency(1234.56); // "R$ 1.234,56"
formatDate(new Date(), 'dd/MM/yyyy'); // "28/10/2025"
```

### Tipos TypeScript

```typescript
import type { Transacao, Conta, ParseResult } from '@/lib/types';

// Use os tipos compartilhados para garantir consistência
```

---

## Testando

```bash
# Build do projeto
npm run build

# Lint
npm run lint

# Dev server
npm run dev
```

---

## Precisa de Ajuda?

1. Leia `docs/FUNCAO_AGENTES_IA.md` - Documento principal
2. Leia `docs/STATUS_AGENTES.md` - Status atual
3. Consulte `lib/services/interfaces.ts` - Contratos de serviços
4. Use comentários `ASK(AGENT)` no código

---

**Agent CORE**: Pronto para coordenar! 🚀

Boa sorte!
