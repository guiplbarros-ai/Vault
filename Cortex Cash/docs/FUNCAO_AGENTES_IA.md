# Função e Coordenação de Agentes IA - Cortex Cash

## Visão Geral

Este documento define a orquestração de **4 agentes Claude Code** trabalhando em paralelo no desenvolvimento do Cortex Cash, com estratégias para evitar conflitos, manter coesão arquitetural e maximizar velocidade de desenvolvimento.

---

## Arquitetura de Agentes

### Setup Físico

```
Cursor IDE
├── Terminal 1: Agent CORE (líder arquitetural)
├── Terminal 2: Agent IMPORT (importação e ETL)
├── Terminal 3: Agent FINANCE (lógica financeira e cálculos)
└── Terminal 4: Agent UI (interfaces e dashboards)
```

**Princípios**:
1. **Separação por domínio** (não por camada técnica)
2. **Contratos explícitos** entre agentes
3. **Ownership claro** de arquivos e módulos
4. **Coordenação via líder** (Agent CORE)
5. **Git branches** por agente com merge frequente

---

## Agent 1: CORE (Líder Arquitetural)

### Responsabilidades

**Arquitetura e Infraestrutura**:
- Setup inicial do projeto (Next.js, estrutura de pastas)
- Configuração de banco de dados (**Dexie.js/IndexedDB** v0.x, Supabase v1.0+)
- Schema de dados (Dexie stores) - **NOTA**: Migrado de sql.js para Dexie.js por compatibilidade com Next.js 16 + Turbopack
- Tipos TypeScript compartilhados
- Utilitários e helpers globais
- Configuração de CI/CD
- Gestão de dependências

**Coordenação**:
- Define contratos/interfaces entre módulos
- Revisa PRs dos outros agentes
- Resolve conflitos de merge
- Mantém coesão arquitetural
- Define padrões de código

**Autenticação e Segurança** (v1.0+):
- Integração Supabase Auth
- RLS policies
- Middleware de autenticação
- Gestão de sessões

**Rotas e Navegação**:
- App Router do Next.js (estrutura)
- Layouts compartilhados
- Middleware
- Error boundaries globais

### Arquivos de Ownership

```
Cortex Cash/
├── app/
│   ├── layout.tsx              ✓ CORE
│   ├── globals.css             ✓ CORE
│   ├── error.tsx               ✓ CORE
│   └── middleware.ts           ✓ CORE (v1.0+)
├── lib/
│   ├── db/
│   │   ├── client.ts           ✓ CORE
│   │   ├── schema.ts           ✓ CORE
│   │   └── migrations/         ✓ CORE
│   ├── supabase/
│   │   ├── client.ts           ✓ CORE (v1.0+)
│   │   ├── server.ts           ✓ CORE (v1.0+)
│   │   └── middleware.ts       ✓ CORE (v1.0+)
│   ├── types/
│   │   └── index.ts            ✓ CORE (types globais)
│   └── utils/
│       ├── cn.ts               ✓ CORE
│       ├── date.ts             ✓ CORE
│       └── format.ts           ✓ CORE
├── components/
│   ├── ui/                     🤝 CORE + UI (shadcn components)
│   └── providers/              ✓ CORE
├── package.json                ✓ CORE
├── tsconfig.json               ✓ CORE
├── next.config.ts              ✓ CORE
└── drizzle.config.ts           ✓ CORE
```

### Cronograma de Trabalho por Versão

#### v0.1 (Semana 1) ✅ COMPLETO!
**Dia 1-2**: Setup
- [x] Criar projeto Next.js 16 + TypeScript ✅
- [x] Configurar Tailwind + shadcn/ui ✅
- [x] Setup ~~SQLite (sql.js ou Dexie.js)~~ **Dexie.js** (migrado por compatibilidade)
- [x] Definir estrutura de pastas
- [x] Criar schema inicial (12 tabelas via Dexie)
- [x] ~~Configurar Drizzle~~ **Migrado para Dexie API**

**Dia 3-4**: Fundação
- [x] Tipos TypeScript compartilhados
- [x] Layout base (sidebar + header)
- [x] Tema dark implementado
- [x] Utilitários de data e formatação
- [x] Cliente de DB com helpers (Dexie)
- [x] **DB Provider com inicialização automática**
- [x] **Seed de 39 categorias padrão**

**Dia 5**: Integração
- [x] Revisar interfaces definidas para outros agentes
- [x] Garantir que Agent IMPORT pode salvar no DB
- [x] Garantir que Agent UI pode ler do DB
- [x] Implementar services com Dexie API ✅
- [x] Criar exemplos de CRUD para outros agents ✅
- [x] **Implementar 3 services core** (transacao, conta, categoria) ✅
- [x] **Criar DEXIE_EXAMPLES.md** (guia completo para outros agents) ✅
- [x] **Componente DBTest** (teste visual funcionando no dashboard) ✅
- [x] **Seed de categorias com emojis** 🎨 ✅

#### v0.2 (Semana 1)
- [x] Adicionar tabela `categorias` ao schema - **JÁ FEITO em v0.1**
- [x] Seed de categorias padrão - **JÁ FEITO (39 categorias)**
- [x] Tipos atualizados

#### v0.3 (Semana 1)
- [x] Schema de cartões (cartoes_config, faturas, faturas_lancamentos) - **JÁ FEITO em v0.1**
- [x] ~~Migrations~~ **N/A com Dexie** (schema definido no construtor)
- [x] Tipos atualizados

#### v0.4 (Semana 1)
- [x] Schema de regras e logs IA - **JÁ FEITO em v0.1**
- [ ] Integração OpenAI (helper genérico)
- [ ] Rate limiting e cost tracking

#### v1.0 (Semana 1-2)
- [ ] **GRANDE MIGRAÇÃO**: Supabase setup
- [ ] Auth integration
- [ ] RLS policies completas
- [ ] Middleware de autenticação
- [ ] Script de migração SQLite → Postgres
- [ ] Schema com user_id em todas as tabelas

---

## Agent 2: IMPORT (Importação e ETL)

### Responsabilidades

**Importação de Arquivos**:
- Parser CSV (tolerante a variações)
- Parser OFX (1.x e 2.x)
- Parser Excel (futuro)
- Detecção automática de formato
- Detecção de cabeçalho e separador
- Normalização de dados (datas, valores)

**ETL e Transformação**:
- Normalização de descrições
- Dedupe (hash-based)
- Detecção de transferências
- Mapeamento de colunas
- Templates por instituição

**Gestão de Templates**:
- CRUD de templates de importação
- Sugestão inteligente de mapeamento
- Reutilização e atualização de templates

**Contas e Instituições**:
- CRUD de instituições
- CRUD de contas
- Vínculo conta ↔ instituição

### Arquivos de Ownership

```
Cortex Cash/
├── app/
│   ├── import/
│   │   ├── page.tsx            ✓ IMPORT (UI básica)
│   │   ├── preview/
│   │   │   └── page.tsx        ✓ IMPORT
│   │   └── confirm/
│   │       └── page.tsx        ✓ IMPORT
│   ├── contas/
│   │   ├── page.tsx            ✓ IMPORT
│   │   ├── [id]/
│   │   │   └── page.tsx        ✓ IMPORT
│   │   └── nova/
│   │       └── page.tsx        ✓ IMPORT
│   └── instituicoes/
│       └── ...                 ✓ IMPORT
├── lib/
│   ├── import/
│   │   ├── parsers/
│   │   │   ├── csv.ts          ✓ IMPORT
│   │   │   ├── ofx.ts          ✓ IMPORT
│   │   │   └── excel.ts        ✓ IMPORT
│   │   ├── detectors/
│   │   │   ├── format.ts       ✓ IMPORT
│   │   │   ├── header.ts       ✓ IMPORT
│   │   │   └── separator.ts    ✓ IMPORT
│   │   ├── normalizers/
│   │   │   ├── date.ts         ✓ IMPORT
│   │   │   ├── value.ts        ✓ IMPORT
│   │   │   └── description.ts  ✓ IMPORT
│   │   ├── dedupe.ts           ✓ IMPORT
│   │   ├── transfer-detector.ts ✓ IMPORT
│   │   └── template-matcher.ts ✓ IMPORT
│   ├── services/
│   │   ├── import.service.ts   ✓ IMPORT
│   │   ├── conta.service.ts    ✓ IMPORT
│   │   └── instituicao.service.ts ✓ IMPORT
│   └── types/
│       └── import.ts           ✓ IMPORT
└── components/
    ├── import/
    │   ├── file-upload.tsx     ✓ IMPORT
    │   ├── preview-table.tsx   ✓ IMPORT
    │   ├── column-mapper.tsx   ✓ IMPORT
    │   └── dedupe-review.tsx   ✓ IMPORT
    └── contas/
        ├── conta-form.tsx      ✓ IMPORT
        └── conta-list.tsx      ✓ IMPORT
```

### Cronograma de Trabalho por Versão

#### v0.1 (Semana 1-2)
**Semana 1**:
- [ ] Parser CSV básico (Bradesco)
- [ ] Parser OFX básico (Bradesco)
- [ ] Detecção de separador (`;`, `,`, `\t`)
- [ ] Detecção de cabeçalho (heurística)
- [ ] Normalização de datas (DD/MM/YYYY → ISO)
- [ ] Normalização de valores (vírgula → ponto)

**Semana 2**:
- [ ] Dedupe por hash (SHA256)
- [ ] Preview de importação (UI básica)
- [ ] Confirmação e salvamento no DB
- [ ] CRUD de instituições
- [ ] CRUD de contas
- [ ] Templates: salvar e carregar (localStorage)

**Semana 3-4** (refinamento):
- [ ] Parser tolerante (linhas inválidas)
- [ ] Detecção de transferências (heurística básica)
- [ ] Templates por instituição (Inter, Santander)
- [ ] Suporte a encoding (UTF-8, ISO-8859-1)

#### v0.2 (Nada específico)
Foco em refinamento de parsers.

#### v0.3 (Semana 2)
- [ ] Parser específico para cartões (Amex, Aeternum)
- [ ] Detecção de moeda original + taxa cambial
- [ ] Campo `parcela_n` e `parcelas_total` nos imports
- [ ] Vinculação automática a fatura (quando cartão)

#### v1.0 (Semana 3)
- [ ] Upload de arquivos para Supabase Storage
- [ ] Histórico de importações por usuário
- [ ] Templates com user_id (RLS)

---

## Agent 3: FINANCE (Lógica Financeira e Cálculos)

### Responsabilidades

**Classificação** (v0.2+):
- Motor de regras (regex, contains, starts, ends)
- Priorização de regras
- Aplicação de regras em massa
- Integração com IA (OpenAI)
- Confirmação de sugestões
- Explicabilidade

**Orçamento** (v1.0+):
- CRUD de orçamentos (categoria, centro)
- Cálculo de % realizado
- Alertas 80%/100%
- Projeções (média móvel)
- Comparativos M/M, YTD

**Cartões** (v0.3):
- Lógica de ciclos de fatura
- Fechamento automático de fatura
- Detecção de pagamento (heurística)
- Cálculo de juros/encargos
- Projeção de fatura até fechamento
- Alertas de limite

**Investimentos** (v2.0):
- Cálculo de MTM
- Cálculo de rentabilidade (XIRR)
- Alocação por classe
- Integração com APIs de cotação

**Patrimônio** (v2.0):
- Consolidação de ativos/passivos
- Cálculo de patrimônio líquido
- Evolução ao longo do tempo

**Imposto de Renda** (v2.1):
- Consolidação de rendimentos
- Cálculo de ganho de capital
- Carnê-leão
- Deduções
- Simulação de imposto

### Arquivos de Ownership

```
Cortex Cash/
├── lib/
│   ├── finance/
│   │   ├── classification/
│   │   │   ├── rule-engine.ts      ✓ FINANCE
│   │   │   ├── ai-classifier.ts    ✓ FINANCE
│   │   │   └── explainer.ts        ✓ FINANCE
│   │   ├── budget/
│   │   │   ├── calculator.ts       ✓ FINANCE
│   │   │   ├── alerts.ts           ✓ FINANCE
│   │   │   └── projections.ts      ✓ FINANCE
│   │   ├── cards/
│   │   │   ├── cycle.ts            ✓ FINANCE
│   │   │   ├── payment-detector.ts ✓ FINANCE
│   │   │   ├── installments.ts     ✓ FINANCE
│   │   │   └── limit-tracker.ts    ✓ FINANCE
│   │   ├── investments/
│   │   │   ├── mtm.ts              ✓ FINANCE
│   │   │   ├── returns.ts          ✓ FINANCE
│   │   │   ├── allocation.ts       ✓ FINANCE
│   │   │   └── dividends.ts        ✓ FINANCE
│   │   ├── patrimony/
│   │   │   ├── consolidator.ts     ✓ FINANCE
│   │   │   ├── evolution.ts        ✓ FINANCE
│   │   │   └── calculator.ts       ✓ FINANCE
│   │   └── tax/
│   │       ├── income-tax.ts       ✓ FINANCE
│   │       ├── capital-gains.ts    ✓ FINANCE
│   │       └── carne-leao.ts       ✓ FINANCE
│   ├── services/
│   │   ├── classificacao.service.ts ✓ FINANCE
│   │   ├── orcamento.service.ts    ✓ FINANCE
│   │   ├── cartao.service.ts       ✓ FINANCE
│   │   ├── investimento.service.ts ✓ FINANCE
│   │   └── patrimonio.service.ts   ✓ FINANCE
│   └── types/
│       ├── classification.ts       ✓ FINANCE
│       ├── budget.ts               ✓ FINANCE
│       └── cards.ts                ✓ FINANCE
```

### Cronograma de Trabalho por Versão

#### v0.1 (Nada)
Aguarda v0.2.

#### v0.2 (Semana 1-2)
**Semana 1**:
- [ ] CRUD de categorias
- [ ] Seed de categorias padrão (13 categorias)
- [ ] Atualização de transação com categoria_id e tags

**Semana 2**:
- [ ] Edição em massa de transações
- [ ] Busca e filtros por categoria

#### v0.3 (Semana 1-3)
**Semana 1**:
- [ ] CRUD de configuração de cartões
- [ ] Cálculo de ciclo (data_inicio, data_fim)
- [ ] Fechamento manual de fatura

**Semana 2**:
- [ ] Fechamento automático (cron job simulado)
- [ ] Cálculo de valor_total, valor_minimo
- [ ] Detecção de pagamento (heurística por valor + data)
- [ ] Conciliação automática

**Semana 3**:
- [ ] Lógica de parcelamento
- [ ] Cronograma de parcelas
- [ ] Projeção de fatura (ciclo atual)
- [ ] Alertas de limite (70%, 90%)
- [ ] Câmbio (valor_original + moeda + taxa)

#### v0.4 (Semana 1-3)
**Semana 1**:
- [ ] Motor de regras (4 tipos)
- [ ] Aplicação de regras (ordem de prioridade)
- [ ] API de classificação manual

**Semana 2**:
- [ ] Integração OpenAI
- [ ] Prompts de classificação
- [ ] Confirmação em massa
- [ ] Log de custos

**Semana 3**:
- [ ] Explicabilidade (origem + motivo)
- [ ] Painel de custos de IA
- [ ] Alertas 80%/100%
- [ ] Cache de prompts

#### v1.0 (Semana 2-4)
**Orçamento**:
- [ ] CRUD de centros de custo
- [ ] CRUD de orçamentos
- [ ] Cálculo de realizado vs planejado
- [ ] Alertas 80%/100%
- [ ] Projeções (média dos últimos 3 meses)

#### v2.0 (Semana 1-5)
**Investimentos**:
- [ ] CRUD de ativos
- [ ] CRUD de proventos
- [ ] Integração API de cotação
- [ ] Cálculo de MTM
- [ ] Cálculo de rentabilidade (XIRR)
- [ ] Alocação por classe

**Patrimônio**:
- [ ] Consolidação de saldos
- [ ] Cálculo de passivos (dívidas)
- [ ] Patrimônio líquido
- [ ] Evolução ao longo do tempo

#### v2.1 (Semana 1-5)
- [ ] Consolidação de rendimentos tributáveis
- [ ] Cálculo de ganho de capital (ações, FIIs)
- [ ] Carnê-leão
- [ ] Deduções
- [ ] Simulação de imposto
- [ ] Export para IRPF

---

## Agent 4: UI (Interfaces e Dashboards)

### Responsabilidades

**Dashboards**:
- Dashboard principal (Home)
- Dashboard por categoria
- Dashboard de cartões
- Dashboard de investimentos
- Dashboard de patrimônio
- Dashboard de orçamento
- Dashboard de IR

**Listagens e Tabelas**:
- Listagem de transações
- Tabelas com filtros e ordenação
- Paginação
- Busca

**Formulários**:
- Formulários de cadastro/edição
- Validação com Zod
- Feedback de erro/sucesso

**Componentes Específicos**:
- Cards informativos
- Gráficos (Recharts)
- Modais
- Drawers
- Toasts (notificações)

**Navegação**:
- Sidebar (dashboard-layout)
- Breadcrumbs
- Tabs

### Arquivos de Ownership

```
Cortex Cash/
├── app/
│   ├── page.tsx                    ✓ UI (Dashboard Home)
│   ├── transacoes/
│   │   ├── page.tsx                ✓ UI
│   │   └── [id]/
│   │       └── page.tsx            ✓ UI
│   ├── categorias/
│   │   └── page.tsx                ✓ UI
│   ├── orcamento/
│   │   └── page.tsx                ✓ UI
│   ├── cartoes/
│   │   ├── page.tsx                ✓ UI
│   │   ├── [id]/
│   │   │   ├── page.tsx            ✓ UI
│   │   │   └── faturas/
│   │   │       └── [faturaId]/
│   │   │           └── page.tsx    ✓ UI
│   │   └── config/
│   │       └── page.tsx            ✓ UI
│   ├── investimentos/
│   │   └── page.tsx                ✓ UI
│   ├── patrimonio/
│   │   └── page.tsx                ✓ UI
│   └── ir/
│       └── page.tsx                ✓ UI
├── components/
│   ├── dashboard/
│   │   ├── saldo-cards.tsx         ✓ UI
│   │   ├── recent-transactions.tsx ✓ UI
│   │   ├── cashflow-chart.tsx      ✓ UI
│   │   └── budget-progress.tsx     ✓ UI
│   ├── transacoes/
│   │   ├── transacao-list.tsx      ✓ UI
│   │   ├── transacao-table.tsx     ✓ UI
│   │   ├── transacao-filters.tsx   ✓ UI
│   │   └── transacao-form.tsx      ✓ UI
│   ├── categorias/
│   │   ├── categoria-form.tsx      ✓ UI
│   │   ├── categoria-tree.tsx      ✓ UI
│   │   └── categoria-chart.tsx     ✓ UI
│   ├── cartoes/
│   │   ├── cartao-card.tsx         ✓ UI
│   │   ├── fatura-detail.tsx       ✓ UI
│   │   ├── limite-gauge.tsx        ✓ UI
│   │   └── projecao-chart.tsx      ✓ UI
│   ├── orcamento/
│   │   ├── orcamento-form.tsx      ✓ UI
│   │   ├── realizado-vs-planejado.tsx ✓ UI
│   │   └── alerts-panel.tsx        ✓ UI
│   ├── investimentos/
│   │   ├── portfolio-summary.tsx   ✓ UI
│   │   ├── asset-allocation.tsx    ✓ UI
│   │   └── returns-chart.tsx       ✓ UI
│   ├── patrimonio/
│   │   ├── patrimonio-summary.tsx  ✓ UI
│   │   ├── evolution-chart.tsx     ✓ UI
│   │   └── net-worth-gauge.tsx     ✓ UI
│   └── dashboard-layout.tsx        🤝 UI + CORE
└── lib/
    └── hooks/
        ├── use-transacoes.ts       ✓ UI
        ├── use-contas.ts           ✓ UI
        └── use-categorias.ts       ✓ UI
```

### Cronograma de Trabalho por Versão

#### v0.1 (Semana 2-4)
**Semana 2**:
- [ ] Dashboard layout (sidebar + header)
- [ ] Dashboard Home básico
- [ ] Cards de saldo por conta
- [ ] Lista de últimas transações

**Semana 3**:
- [ ] Página de transações com tabela
- [ ] Filtros básicos (data, conta)
- [ ] Busca por texto
- [ ] Modal de detalhes

**Semana 4**:
- [ ] Gráfico de entrada vs saída (Recharts)
- [ ] Paginação de transações
- [ ] Loading states
- [ ] Empty states

#### v0.2 (Semana 2)
- [ ] Formulário de categoria
- [ ] Árvore de categorias (grupo > categoria)
- [ ] Edição em massa de transações
- [ ] Gráfico pizza por categoria
- [ ] Gráfico barras por categoria

#### v0.3 (Semana 2-3)
**Semana 2**:
- [ ] Página de cartões
- [ ] Card de cartão (limite, utilização)
- [ ] Gauge de limite
- [ ] Lista de faturas

**Semana 3**:
- [ ] Detalhe de fatura
- [ ] Projeção até fechamento
- [ ] Modal de configuração de cartão
- [ ] Alertas de limite (toast)

#### v0.4 (Semana 2-3)
- [ ] Página de regras de classificação
- [ ] Formulário de regra
- [ ] Lista de regras com reordenação
- [ ] Painel de custos de IA
- [ ] Gráficos de uso de IA

#### v1.0 (Semana 3-4)
**Orçamento**:
- [ ] Página de orçamento
- [ ] Formulário de orçamento
- [ ] Dashboard Orçado vs Realizado
- [ ] Alertas de orçamento (toast)
- [ ] Comparativos M/M e YTD

**Auth** (em colaboração com CORE):
- [ ] Página de login
- [ ] Página de cadastro
- [ ] Página de perfil

#### v2.0 (Semana 3-5)
**Investimentos**:
- [ ] Dashboard de investimentos
- [ ] Portfolio summary
- [ ] Asset allocation (pizza)
- [ ] Returns chart (linha)
- [ ] Lista de ativos
- [ ] Lista de proventos

**Patrimônio**:
- [ ] Dashboard de patrimônio
- [ ] Net worth gauge
- [ ] Evolution chart
- [ ] Breakdown por tipo

#### v2.1 (Semana 3-5)
- [ ] Dashboard de IR
- [ ] Consolidação de rendimentos
- [ ] Simulação de imposto
- [ ] Export para IRPF

---

## Estratégias de Prevenção de Conflitos

### 1. Ownership Claro de Arquivos

**Regra de Ouro**: Cada arquivo tem **1 owner primário**. Outros agentes podem ler, mas **não editam** sem coordenação.

**Exceções** (arquivos compartilhados):
- `lib/types/index.ts` - CORE define, outros sugerem
- `components/ui/*` - CORE + UI colaboram
- `app/layout.tsx` - CORE + UI colaboram

**Protocolo para arquivos compartilhados**:
1. Agent secundário propõe mudança via comentário
2. Agent CORE revisa e aplica
3. Agent CORE notifica conclusão

### 2. Contratos de Interface

Cada módulo expõe **interfaces TypeScript** claras que outros agentes consomem.

**Exemplo**:

```typescript
// lib/services/import.service.ts (Agent IMPORT)
export interface ImportService {
  parseCSV(file: File, config: ParseConfig): Promise<ParseResult>;
  detectFormat(file: File): Promise<FileFormat>;
  saveTransactions(transactions: Transaction[], contaId: string): Promise<void>;
}

// lib/services/classificacao.service.ts (Agent FINANCE)
export interface ClassificationService {
  applyRules(transactions: Transaction[]): Promise<ClassificationResult[]>;
  applySuggestions(transactionId: string, categoryId: string): Promise<void>;
}

// components/transacoes/transacao-list.tsx (Agent UI)
// Consome ambos os services acima
```

**Agent CORE** define as interfaces iniciais e os outros agents implementam.

### 3. Git Workflow

```
main (protected)
├── core/setup          (Agent CORE)
├── import/csv-parser   (Agent IMPORT)
├── finance/budget      (Agent FINANCE)
└── ui/dashboard        (Agent UI)
```

**Workflow**:
1. Cada agent trabalha em sua branch
2. Commits frequentes (a cada feature)
3. Pull de `main` a cada 2-4 horas
4. Merge para `main` via PR (Agent CORE revisa)
5. Squash commits para manter histórico limpo

**Comunicação**:
- Terminal 1 (CORE) monitora branches
- Agent CORE faz merges
- Conflitos? Agent CORE coordena resolução

### 4. Ordem de Implementação por Fase

Cada versão tem **fases sequenciais**. Agentes trabalham em paralelo **dentro** de cada fase, mas respeitam dependências **entre** fases.

**Exemplo v0.1**:

```
Fase 1: Fundação (Semana 1, Dia 1-2)
├── CORE: Setup projeto + DB                    [BLOQUEANTE]
└── IMPORT/FINANCE/UI: Aguardam                 [BLOQUEADO]

Fase 2: Core Features (Semana 1, Dia 3-5)
├── CORE: Layout + types                        [PARALELO]
├── IMPORT: Parsers + normalizers               [PARALELO]
├── FINANCE: (aguarda v0.2)                     [IDLE]
└── UI: Dashboard layout                        [PARALELO, depende de CORE layout]

Fase 3: Integration (Semana 2)
├── IMPORT: Preview + salvamento                [PARALELO]
├── UI: Dashboard Home + transações             [PARALELO, depende de IMPORT service]
├── FINANCE: (aguarda v0.2)                     [IDLE]
└── CORE: Revisão + merge                       [COORDENAÇÃO]

Fase 4: Refinement (Semana 3-4)
├── IMPORT: Templates + detecção transferências [PARALELO]
├── UI: Gráficos + filtros                      [PARALELO]
├── FINANCE: (aguarda v0.2)                     [IDLE]
└── CORE: Testes + hardening                    [COORDENAÇÃO]
```

### 5. Comunicação entre Agentes

**Via Comentários no Código**:

```typescript
// TODO(FINANCE): Adicionar campo `categoria_id` após v0.2
// BLOCKED_BY(CORE): Aguardando schema de categorias
// ASK(IMPORT): Como detectar duplicatas? Ver lib/import/dedupe.ts
```

**Via Documento de Coordenação** (este arquivo):

Agent CORE atualiza este documento com:
- Status de cada fase
- Bloqueios ativos
- Próximos passos

### 6. Testing Strategy

Cada agent testa **seu domínio**:

- **CORE**: Testes de integração (DB, migrations)
- **IMPORT**: Testes unitários de parsers e normalizers
- **FINANCE**: Testes unitários de cálculos e regras
- **UI**: Testes de componentes (Vitest + Testing Library)

**Agent CORE** roda suite completa antes de merges.

### 7. Hotfixes e Emergências

**Cenário**: Bug crítico em produção.

**Protocolo**:
1. Agent CORE cria branch `hotfix/nome-do-bug`
2. Agent responsável pelo módulo faz fix
3. Agent CORE revisa e mergea direto em `main`
4. Todos os agents fazem pull imediato

---

## Matriz de Dependências entre Agentes

### v0.1

| Feature | Owner | Depende de | Bloqueia |
|---------|-------|------------|----------|
| Setup projeto | CORE | - | TODOS |
| Schema DB | CORE | - | IMPORT, UI |
| Parser CSV | IMPORT | Schema | - |
| Dashboard layout | UI | - | Dashboard Home |
| Dashboard Home | UI | Schema, Parser | - |
| Templates | IMPORT | Parser | - |

### v0.2

| Feature | Owner | Depende de | Bloqueia |
|---------|-------|------------|----------|
| Schema categorias | CORE | - | FINANCE, UI |
| Seed categorias | FINANCE | Schema | - |
| Classificação manual | FINANCE | Schema | UI |
| Dashboard categoria | UI | Classificação | - |

### v0.3

| Feature | Owner | Depende de | Bloqueia |
|---------|-------|------------|----------|
| Schema cartões | CORE | - | FINANCE, IMPORT |
| Parser cartão | IMPORT | Schema | FINANCE |
| Lógica de ciclo | FINANCE | Schema | UI |
| Detecção pagamento | FINANCE | Lógica ciclo | - |
| Dashboard cartões | UI | Lógica ciclo | - |
| Projeção fatura | FINANCE | Lógica ciclo | UI |

### v0.4

| Feature | Owner | Depende de | Bloqueia |
|---------|-------|------------|----------|
| Schema regras | CORE | - | FINANCE |
| Motor de regras | FINANCE | Schema | - |
| Integração OpenAI | FINANCE | Motor regras | - |
| UI de regras | UI | Motor regras | - |
| Painel custos IA | UI | Schema logs_ia | - |

### v1.0

| Feature | Owner | Depende de | Bloqueia |
|---------|-------|------------|----------|
| Setup Supabase | CORE | - | TODOS |
| Auth integration | CORE | Setup | UI |
| RLS policies | CORE | Setup | TODOS |
| Migração dados | CORE | RLS | TODOS |
| Schema orçamento | CORE | RLS | FINANCE |
| Lógica orçamento | FINANCE | Schema | UI |
| Dashboard orçamento | UI | Lógica | - |
| Login/Signup | UI | Auth | - |

---

## Checklist de Coordenação por Versão

### v0.1

#### Pré-desenvolvimento
- [ ] CORE: Definir schema completo v0.1
- [ ] CORE: Criar interfaces para services
- [ ] CORE: Documentar estrutura de pastas
- [ ] TODOS: Revisar contratos

#### Durante (Semana 1)
- [ ] CORE: Setup completo até Dia 2
- [ ] CORE: Notificar agents quando schema estiver pronto
- [ ] IMPORT: Começar parsers (Dia 3+)
- [ ] UI: Começar layout (Dia 3+)
- [ ] CORE: Merge diário de branches

#### Durante (Semana 2)
- [ ] IMPORT: Preview funcionando
- [ ] UI: Dashboard Home funcionando
- [ ] CORE: Integração testada
- [ ] TODOS: Demo end-to-end (importar + visualizar)

#### Pós-desenvolvimento
- [ ] CORE: Testes de integração
- [ ] TODOS: Code review mútuo
- [ ] CORE: Tag `v0.1` no Git
- [ ] CORE: Deploy

### v0.2

#### Pré-desenvolvimento
- [ ] CORE: Schema de categorias
- [ ] CORE: Seed SQL de categorias padrão
- [ ] FINANCE: Planejar lógica de classificação

#### Durante
- [ ] CORE: Notificar quando schema pronto
- [ ] FINANCE: Implementar classificação (Semana 1)
- [ ] UI: Dashboard categoria (Semana 2)
- [ ] CORE: Merge e testes

#### Pós-desenvolvimento
- [ ] Demo de classificação manual
- [ ] Tag `v0.2`

### v0.3

#### Pré-desenvolvimento
- [ ] CORE: Schema cartões, faturas, faturas_lancamentos
- [ ] FINANCE: Planejar lógica de ciclo
- [ ] IMPORT: Planejar parser de cartões

#### Durante (3 semanas)
- [ ] CORE: Schema pronto (Dia 1)
- [ ] IMPORT: Parser cartões (Semana 1)
- [ ] FINANCE: Lógica ciclo + fechamento (Semana 1-2)
- [ ] FINANCE: Detecção pagamento (Semana 2)
- [ ] FINANCE: Parcelamento (Semana 3)
- [ ] UI: Dashboard cartões (Semana 2-3)
- [ ] CORE: Merge contínuo

#### Pós-desenvolvimento
- [ ] Demo completo de ciclo de fatura
- [ ] Validar detecção de pagamento (90% acurácia)
- [ ] Tag `v0.3`

### v0.4

#### Pré-desenvolvimento
- [ ] CORE: Schema regras + logs IA
- [ ] CORE: Helper OpenAI genérico
- [ ] FINANCE: Planejar motor de regras

#### Durante (3 semanas)
- [ ] FINANCE: Motor de regras (Semana 1)
- [ ] FINANCE: Integração OpenAI (Semana 2)
- [ ] FINANCE: Explicabilidade + custos (Semana 3)
- [ ] UI: UI de regras (Semana 2)
- [ ] UI: Painel custos IA (Semana 3)

#### Pós-desenvolvimento
- [ ] Demo de classificação automática
- [ ] Validar custo < US$ 10/mês
- [ ] Tag `v0.4`

### v1.0

#### Pré-desenvolvimento (CRÍTICO)
- [ ] CORE: Estudo de Supabase Auth + RLS
- [ ] CORE: Plano de migração detalhado
- [ ] CORE: Backup de dados de teste
- [ ] TODOS: Revisar plano

#### Durante (4 semanas)
**Semana 1-2**: Supabase + Auth
- [ ] CORE: Setup Supabase
- [ ] CORE: Auth integration
- [ ] CORE: RLS policies
- [ ] CORE: Testes de isolamento de dados
- [ ] UI: Login/Signup (paralelo)

**Semana 2-3**: Migração
- [ ] CORE: Script de migração
- [ ] CORE: Testes de migração em dev
- [ ] CORE: Validação de integridade
- [ ] TODOS: Revisar dados migrados

**Semana 3-4**: Orçamento
- [ ] CORE: Schema orçamento + centros
- [ ] FINANCE: Lógica de orçamento
- [ ] FINANCE: Alertas
- [ ] UI: Dashboard orçamento

#### Pós-desenvolvimento
- [ ] Migração de dados de teste bem-sucedida
- [ ] RLS validado (sem vazamento entre users)
- [ ] Demo completo multi-usuário
- [ ] Tag `v1.0` 🎉

---

## Resumo Executivo para PO

### Vantagens desta Arquitetura

1. **Paralelização**: 4 agents trabalhando simultaneamente
2. **Especialização**: Cada agent domina seu domínio
3. **Velocidade**: v0.1 em 4 semanas (vs 8-10 solo)
4. **Qualidade**: Code review cruzado, testes por domínio
5. **Escalabilidade**: Adicionar agentes é fácil

### Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Conflitos de merge | Média | Médio | Ownership claro, merges frequentes |
| Desalinhamento | Baixa | Alto | Agent CORE coordena, doc vivo |
| Bloqueios | Média | Médio | Fases com dependências explícitas |
| Overhead de comunicação | Baixa | Baixo | Protocolo via comentários + doc |

### Quando Usar Menos Agentes

- **v0.1-v0.2**: Talvez 3 agents (FINANCE ocioso)
- **v1.0**: 4 agents essenciais (migração complexa)
- **v2.0+**: Considerar 5º agent para Mobile (v3.0)

### Métricas de Sucesso da Coordenação

- [ ] Merge conflicts < 5% dos PRs
- [ ] Tempo de code review < 2h
- [ ] Tempo de bloqueio < 4h por agent
- [ ] Cobertura de testes > 60%
- [ ] Build quebrado < 10% do tempo

---

## Próximos Passos

1. ✅ Documentação criada
2. 🔄 Agent CORE: Setup inicial v0.1
3. ⏳ Agents IMPORT/UI: Aguardar notificação de CORE
4. ⏳ Monitorar progresso via este documento
5. ⏳ Atualizar matriz de dependências conforme necessário

---

**Versão deste documento**: 1.0
**Última atualização**: Janeiro 2025
**Próxima revisão**: Após v0.1 (atualizar com lições aprendidas)
