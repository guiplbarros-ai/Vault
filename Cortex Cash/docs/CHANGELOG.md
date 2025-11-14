# Changelog - Cortex Cash

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [v0.5] - 2025-11-05 🚧 **EM DESENVOLVIMENTO**

### 🐛 Correções Críticas (05/11/2025)

**Problema 1: Conflito de função `generateHash`**
- **Problema**: Duas funções com mesmo nome mas assinaturas diferentes causavam conflito de importação
- **Solução**: Renomeado `generateHash` → `generateTransactionHash` em `lib/import/dedupe.ts`
- **Arquivos**: `lib/import/dedupe.ts`, `app/api/import/process/route.ts`

**Problema 2: Hash sem `conta_id`**
- **Problema**: Transações idênticas em contas diferentes eram consideradas duplicatas
- **Solução**: Adicionado parâmetro `conta_id` opcional ao hash de transação
- **Hash agora**: `conta_id | data | descrição | valor` (era apenas `data | descrição | valor`)
- **Arquivos**: `lib/import/dedupe.ts` (5 funções atualizadas)

**Problema 3: Templates hardcoded duplicados**
- **Problema**: Função `getTemplateMapping` duplicada em 2 rotas API
- **Solução**: Removido código hardcoded, usando sistema oficial `lib/import/templates`
- **Arquivos**: `app/api/import/upload/route.ts`, `app/api/import/process/route.ts`

**Testes após correções**:
- ✅ Build: PASSOU
- ✅ Testes unitários: 32/32 (100%)
- ✅ Smoke tests: 10/10 (100%)

---

### Sistema de Importação Completo

#### ✨ Funcionalidades Adicionadas

**APIs de Importação**
- `POST /api/import/upload` - Upload de arquivo CSV/OFX com preview
  - Validação de tipo (CSV, OFX, XLSX)
  - Validação de tamanho (máximo 10MB)
  - Detecção automática de encoding (UTF-8 / ISO-8859-1)
  - Detecção automática de separador (`,`, `;`, `|`, `\t`)
  - Preview com primeiras 100 transações
  - Suporte a templates de bancos

- `POST /api/import/process` - Processamento com auto-classificação
  - Dedupe via SHA-256 hash
  - Classificação automática em batch (opcional)
  - Integração com endpoint `/api/ai/classify/batch`
  - Suporte a skip duplicates
  - Retorna estatísticas (imported/duplicates/errors)

- `GET /api/import/templates` - Listagem de templates
  - Busca por ID ou termo
  - 7 templates pré-configurados
  - Filtros por formato e banco

**Bibliotecas de Parsing**
- `lib/import/parsers/csv.ts` - Parser CSV genérico
  - Parsing com respeito a aspas (quote-aware)
  - Mapeamento customizado de colunas
  - Detecção automática de separador
  - Tratamento de erros por linha
  - Metadata completa (totalRows, validRows, invalidRows)

- `lib/import/parsers/ofx.ts` - Parser OFX (v1 e v2)
  - Suporte a formato SGML (OFX 1.x)
  - Suporte a formato XML (OFX 2.x)
  - Extração de transações bancárias
  - Extração de informações de conta
  - Normalização de datas e valores

**Normalizadores**
- `lib/import/normalizers/date.ts` - Normalização de datas
  - 6 formatos suportados: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD/MM/YY, DD-MM-YY, YYYYMMDD
  - Retorno em ISO 8601 (YYYY-MM-DD)
  - Validação de datas inválidas

- `lib/import/normalizers/value.ts` - Normalização de valores monetários
  - Detecção automática de formato BR (1.234,56) e US (1,234.56)
  - Remoção de símbolos de moeda (R$, USD, EUR, BRL)
  - Tratamento de múltiplos pontos como separador de milhar
  - Tratamento de vírgula como separador decimal ou milhar

**Detectores**
- `lib/import/detectors/separator.ts` - Detecção de separador CSV
  - Algoritmo baseado em consistência de colunas
  - Suporta: `,`, `;`, `|`, `\t`
  - Retorna separador mais provável

- `lib/import/detectors/encoding.ts` - Detecção de encoding
  - Detecção de caracteres ISO-8859-1 (ã, õ, ç, etc.)
  - Fallback para UTF-8
  - Conversão automática quando necessário

**Templates de Bancos**
- `lib/import/templates/index.ts` - 7 templates pré-configurados
  - ✅ Bradesco (CSV, separador `;`, ISO-8859-1)
  - ✅ Inter (CSV, separador `,`, UTF-8)
  - ✅ Nubank (CSV, separador `,`, UTF-8)
  - ✅ Santander (CSV, separador `;`, ISO-8859-1)
  - ✅ Itaú (CSV, separador `;`, ISO-8859-1)
  - ✅ Caixa (CSV, separador `;`, ISO-8859-1)
  - ✅ Generic (CSV, separador auto, UTF-8)

**Sistema de Dedupe**
- `lib/import/dedupe/hash.ts` - Geração de hash SHA-256
  - Hash baseado em: data + descrição + valor + conta_id
  - Normalização de data para ISO
  - Arredondamento de valores para 2 casas decimais

#### 🧪 Testes Implementados

**Testes Unitários** (32/32 PASSED - 100%)
- `tests/import/normalizers.test.ts` - 15 testes
  - Normalização de datas (8 testes)
    - Formatos DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    - Formatos curtos DD/MM/YY, DD-MM-YY
    - Formato compacto YYYYMMDD
    - Datas inválidas retornam null
  - Normalização de valores (7 testes)
    - Formato brasileiro (1.234,56)
    - Formato americano (1,234.56)
    - Valores negativos
    - Símbolos de moeda (R$, USD, EUR)
    - Múltiplos pontos como separador de milhar

- `tests/import/separator.test.ts` - 7 testes
  - Detecção de vírgula como separador
  - Detecção de ponto e vírgula
  - Detecção de pipe (|)
  - Detecção de tab (\t)
  - Fallback para vírgula quando ambíguo

- `tests/import/parser.test.ts` - 10 testes
  - Parsing CSV básico com header
  - Detecção automática de separador
  - Normalização de datas e valores
  - Mapeamento de colunas customizado
  - Detecção de tipo de transação (receita/despesa)
  - Registro de erros para linhas inválidas
  - Pular linhas vazias
  - Descrições com vírgulas (entre aspas)
  - Arquivo vazio retorna erro
  - Raw data para debug

**Smoke Tests API** (10/10 PASSED - 100%)
- `scripts/test-import-smoke.js` - 10 testes E2E
  - ✅ GET /api/import/templates (lista todos)
  - ✅ GET /api/import/templates?id=bradesco (template específico)
  - ✅ GET /api/import/templates?search=inter (busca)
  - ✅ POST /api/import/upload (validação de arquivo ausente)
  - ✅ POST /api/import/upload (parsing de CSV válido)
  - ✅ POST /api/import/process (validação de dados ausentes)
  - ✅ GET /api/import/templates?id=inexistente (template não encontrado)
  - ✅ POST /api/import/upload (arquivo muito grande >10MB)
  - ✅ POST /api/import/upload (tipo de arquivo inválido)
  - ✅ Upload CSV com separador `;`

#### 🐛 Correções de Bugs

1. **CSV Quote Handling** (`lib/import/parsers/csv.ts:47-68`)
   - Implementado parser `parseCSVLine` que respeita aspas
   - Corrige problema de descrições com vírgulas sendo divididas em múltiplas colunas

2. **Normalização de Múltiplos Pontos** (`lib/import/normalizers/value.ts:44-49`)
   - Adicionado tratamento para múltiplos pontos como separador de milhar
   - Exemplo: "1.234.567" → 1234567 (não 1.234)

3. **Test CSV com Valor Decimal BR** (`tests/import/parser.test.ts:35`)
   - Adicionado quotes ao redor de valores com vírgula: "R$ 1.234,56"
   - Corrige problema de vírgula ser confundida com separador CSV

#### 📊 Métricas

**Build Status**
- ✅ TypeScript: Zero erros
- ✅ Next.js Build: Sucesso (4.8s)
- ✅ 30 rotas estáticas geradas
- ✅ 6 rotas dinâmicas (/api/*)

**Cobertura de Testes**
- Testes unitários: 32/32 PASSED (100%)
- Smoke tests: 10/10 PASSED (100%)
- Tempo de execução: ~700ms (unitários) + ~2s (smoke)

**Arquivos Criados/Modificados**
- APIs: 3 arquivos novos (upload, process, templates)
- Parsers: 2 arquivos novos (csv, ofx)
- Normalizers: 2 arquivos novos (date, value)
- Detectors: 2 arquivos novos (separator, encoding)
- Templates: 1 arquivo novo (index)
- Dedupe: 1 arquivo novo (hash)
- Testes: 3 arquivos novos (normalizers, separator, parser)
- Scripts: 1 arquivo novo (test-import-smoke.js)

**Total de Linhas de Código**
- Implementação: ~1200 linhas
- Testes: ~350 linhas
- Total: ~1550 linhas

---

## [v0.4] - 2025-11-04 ✅ **COMPLETA**

### Sistema de Classificação Automática + Infraestrutura

#### ✨ Backend

**Sistema de Classificação Automática**
- Motor híbrido (cache → regras → OpenAI)
- Cache de prompts (economia 30-50%)
- Batch processing para múltiplas transações
- CRUD completo de regras de classificação
- Serviços de AI usage e custos
- Endpoints:
  - `POST /api/ai/classify` - Classificação individual
  - `POST /api/ai/classify/batch` - Classificação em lote
  - `GET /api/ai/usage` - Estatísticas de uso
  - `GET /api/ai/config` - Configuração do sistema

#### 🏗️ Infraestrutura

**Error Handling Global**
- ErrorBoundary component para captura de erros React
- GlobalErrorHandler para erros JavaScript globais
- Error Logging System em localStorage (últimos 30 erros)
- Error Recovery UI com retry e go home
- Toast notifications automáticas

**Monitoring**
- Health Check System
  - 6 checks automatizados (Database, IndexedDB, LocalStorage, Services, Data Integrity, Browser)
  - Dashboard visual em `/settings/system`
  - Histórico dos últimos 50 checks
  - Status colorido (healthy/degraded/unhealthy)

- Performance Monitoring
  - Tracking de queries com detecção de slow queries
  - Monitoramento de page loads
  - Métricas de memória JS Heap
  - Dashboard em `/settings/performance`

**PWA (Progressive Web App)**
- Service Worker com estratégias de cache
  - Cache-first para assets estáticos
  - Network-first para API requests
  - Network-first com fallback para HTML
- PWA manifest configurado
- Página `/offline` para modo offline
- Notificações de atualização disponível
- Ícones PWA (192x192 e 512x512)

**Sistema de Backup/Export**
- Export completo do IndexedDB para JSON
- Import com validação e modos (replace/merge)
- Download de backup como arquivo
- Preview de backup antes de importar
- Clear all data (danger zone)
- Interface em `/settings/backup`

#### 🎨 Frontend

**Gestão de Regras**
- Página `/settings/classification-rules`
- Lista de regras com filtros e busca
- Formulário de criar/editar regras
- Preview de regras antes de salvar
- Toggle ativa/inativa
- 4 tipos de regras (contains, starts_with, ends_with, regex)

**Auditoria de IA**
- Página `/settings/ai-usage`
- Gráficos de custos por dia (Recharts)
- Gráfico de requisições por dia
- Stats cards (requisições, custos, taxa de aceitação)
- Tabela de logs recentes (últimos 50)
- Badges de status (confirmada/pendente)

**Classificação na UI**
- Botão "Classificar com IA" na página de transações
- Componente BulkAIClassify para classificação em massa
- Feedback visual de sucesso/erro
- Indicador de cache hit
- AccuracyWidget no dashboard

---

## [v0.3] - 2025-11-02 ✅ **COMPLETA**

### Sistema de Orçamentos e Cartões

#### ✨ Financeiro

**Sistema de Orçamentos**
- OrcamentoService completo (CRUD + tracking + alertas)
- BudgetForm com validação Zod
- Cálculo automático de valor realizado
- Sistema de alertas 80%/100%
- Resumo mensal e cópia entre meses
- Suporte a orçamento por categoria e centro de custo

**Lançamentos de Fatura**
- FaturaLancamentoForm completo
- Suporte a parcelamento
- Suporte a compras no exterior (múltiplas moedas)
- Cálculo automático de valor BRL com câmbio
- Hook de alertas de limite
- Monitoramento automático com thresholds

#### 🎨 Frontend

**Página de Orçamentos** (`/budgets`)
- CRUD completo de orçamentos
- Navegação por mês com controles
- Cards de resumo com métricas
- Lista visual com cards de progresso
- Dropdown menu para ações
- Cópia de orçamentos entre meses
- Padrão visual 100% consistente

**Página de Detalhes de Fatura**
- Gestão completa de lançamentos (CRUD)
- Estatísticas por categoria
- Visualizações gráficas

**Dashboard Visual**
- BudgetProgressChart (barras horizontais)
- BudgetDistributionChart (pizza)
- Cores semânticas por status
- Tooltips customizados
- Responsivo e performático

---

## [v0.2] - 2025-10-30 ✅ **COMPLETA**

### UI Completa + Integração com DB

#### ✨ Frontend

**Páginas CRUD**
- Dashboard Home com dados reais
- Página de Transações (CRUD completo)
- Página de Contas (CRUD completo)
- Página de Categorias (CRUD completo)

**Componentes**
- DataTable component completo
- Currency Input component
- DateRangePicker component
- 6 utility components (empty-state, loading-spinner, stat-card, etc.)

**Formulários**
- TransactionForm com validação
- AccountForm com validação
- CategoryForm com validação

**Dashboard**
- StatCards com dados reais
- RecentTransactions conectado ao DB
- CashFlowChart com últimos 6 meses
- Loading states em todos componentes
- Empty states para quando não há dados

**UX**
- Toast notifications com sonner
- Feedback visual em todas operações CRUD
- Styled toast com tema dark mode

---

## [v0.1] - 2025-10-28 ✅ **COMPLETA**

### Setup Inicial e Migração Dexie.js

#### 🏗️ Infraestrutura

**Setup do Projeto**
- Next.js 16 + TypeScript configurado
- Tailwind CSS + shadcn/ui instalado
- Estrutura de pastas criada
- Tema dark implementado (Cortex Pixel Teal)

**Migração sql.js → Dexie.js**
- Motivo: sql.js incompatível com Next.js 16 + Turbopack
- Solução: Dexie.js (wrapper nativo do IndexedDB)
- Status: Migração completa e funcional
- Impacto: Todos os agents usam Dexie API

**Schema IndexedDB**
- 12 tabelas criadas via Dexie:
  - instituicoes, contas, categorias, transacoes
  - templates_importacao, regras_classificacao, logs_ia
  - cartoes_config, faturas, faturas_lancamentos
  - centros_custo, orcamentos
- Índices otimizados para performance
- Seed de 39 categorias padrão com emojis 🎨

**Services Layer**
- 3 services core implementados:
  - TransacaoService
  - ContaService
  - CategoriaService
- Interfaces TypeScript compartilhadas
- Utilitários de data e formatação

**Documentação**
- DEXIE_EXAMPLES.md - Guia completo de uso
- STATUS_AGENTES.md - Status por agente
- Componente DBTest para validação

---

## Formato das Entradas

### Tipos de Mudanças
- ✨ `Funcionalidades Adicionadas` - Novos recursos
- 🔧 `Alterações` - Mudanças em recursos existentes
- 🐛 `Correções de Bugs` - Correções de bugs
- 🗑️ `Removido` - Recursos removidos
- 🔒 `Segurança` - Correções de vulnerabilidades

### Padrão de Commit
```
<tipo>(<escopo>): <descrição curta>

<corpo opcional com detalhes>

<rodapé opcional com breaking changes>
```

**Exemplo:**
```
feat(import): Adicionar parser OFX para bancos brasileiros

- Suporte a OFX 1.x (SGML) e 2.x (XML)
- Extração de transações bancárias
- Normalização de datas e valores

Closes #123
```

---

**Última atualização**: 14 de Novembro de 2025
**Versão atual**: v0.5.0-dev (em desenvolvimento)
