# Documentação — Cortex Cash

Este índice consolida e organiza a documentação por categorias. Use-o como ponto de partida.

## Status
- Status do projeto (canônico): [status/](./status/README.md)

## Changelogs
- Changelog em `docs`: [CHANGELOG.md](./CHANGELOG.md)
- Changelog na raiz do repo: [../../CHANGELOG.md](../../CHANGELOG.md)
- Índice de changelogs: [changelogs/](./changelogs/README.md)

## Issues e Bugfixes
- Arquitetura/IA (issues): [ARCHITECTURE_ISSUES_AI_USAGE.md](./ARCHITECTURE_ISSUES_AI_USAGE.md)
- Import (issues): [IMPORT_ISSUES_REPORT.md](./IMPORT_ISSUES_REPORT.md)
- Bugfix summary (IA Usage): [BUGFIX_SUMMARY_AI_USAGE.md](./BUGFIX_SUMMARY_AI_USAGE.md)
- Índice de issues: [issues/](./issues/README.md)

## Testes
- Plano de Testes v0.5: [tests/TEST_PLAN_V05.md](./tests/TEST_PLAN_V05.md)
- Resultados v0.4: [TEST_RESULTS_V04.md](./TEST_RESULTS_V04.md)
- Checklist v0.4: [TESTING_CHECKLIST_V04.md](./TESTING_CHECKLIST_V04.md)
- Pasta de testes (código): [../../tests](../../tests)
- Índice de testes: [tests/](./tests/README.md)

## Planejamento
- Planejamento v0.5: [V0.5_PLANNING.md](./V0.5_PLANNING.md)
- Tasks v0.5: [V0.5_TASKS.md](./V0.5_TASKS.md)
- Roadmap: [ROADMAP_SUMMARY.md](./ROADMAP_SUMMARY.md)
- PRD: [Cortex Cash PRD.md](./Cortex Cash PRD.md)
- Índice de planejamento: [planning/](./planning/README.md)

## Produto
- Índice de produto: [product/](./product/README.md)

## Arquitetura e Guias
- Arquitetura: [architecture/](./architecture)
- Data Architecture: [data-architecture/](./data-architecture)
- Guias: [guides/](./guides)
- AI Docs: [ai/](./ai)

## Traduções
- Lista de arquivos: [TRANSLATION_FILES_LIST.md](./TRANSLATION_FILES_LIST.md)
- Inventário: [TRANSLATION_INVENTORY.md](./TRANSLATION_INVENTORY.md)
- Índice de traduções: [translations/](./translations/README.md)

## Relatórios
- Índice por tema (recomendado): [reports/](./reports/README.md)
- Code Scan Report (2025-11-06): [issues/CODE_SCAN_REPORT_2025-11-06.md](./issues/CODE_SCAN_REPORT_2025-11-06.md)
- Finanças v0.5: [FINANCE_REPORTS_BUDGETS_V0.5.md](./FINANCE_REPORTS_BUDGETS_V0.5.md)

## Arquivo
- Arquivos históricos/legados: [archives/](./archives)

---

Dica: Ao adicionar novos documentos, vincule-os no índice da categoria correspondente para manter a organização.
# Documentação - Cortex Cash
**v0.5.0-dev | Última atualização: 14 de Novembro de 2025**

## 📚 Índice Rápido

### 🚀 Começando
- **[Getting Started](./guides/GETTING_STARTED.md)** - Setup e primeiro uso (5 minutos)
- **[Development Guide](./guides/DEVELOPMENT.md)** - Convenções e boas práticas

### 🏗️ Arquitetura
- **[Data Model](./architecture/DATA_MODEL.md)** - Schema do banco de dados
- **[Versioning Strategy](./architecture/VERSIONING_STRATEGY.md)** - Roadmap técnico (v0.1 → v3.0)
- **[Dexie Examples](./architecture/DEXIE_EXAMPLES.md)** - Exemplos de CRUD com IndexedDB

### 🤖 Inteligência Artificial
- **[AI Guide](./ai/AI_GUIDE.md)** - Guia completo de classificação automática
- **[AI Endpoints](./ai/AI_ENDPOINTS.md)** - Referência de API (endpoints, contratos)

### 🎨 Features
- **[Import](./features/IMPORT.md)** - Sistema de importação (CSV, OFX)
- **[Patrimônio](./features/PATRIMONIO.md)** - Gestão de investimentos
- **[Configurações](./features/CONFIGURACOES.md)** - Sistema de settings
- **[Tema](./features/TEMA.md)** - Orientação de UI (Dark, sólido)

### 📋 Outros
- **[Roadmap Summary](./ROADMAP_SUMMARY.md)** - Visão geral do roadmap
- **[Cortex Cash PRD](./Cortex%20Cash%20PRD.md)** - Documento mestre do produto

---

## 🗂️ Estrutura Completa

```
docs/
├── README.md                      # Este arquivo (índice)
│
├── 📋 guides/                     # Guias de uso
│   ├── GETTING_STARTED.md        # Setup inicial (5min)
│   ├── DEVELOPMENT.md            # Convenções de código
│
├── 🏗️ architecture/               # Arquitetura técnica
│   ├── DATA_MODEL.md             # Schema completo
│   ├── VERSIONING_STRATEGY.md    # Roadmap técnico
│   └── DEXIE_EXAMPLES.md         # Exemplos de DB
│
├── 🤖 ai/                         # Inteligência Artificial
│   ├── AI_GUIDE.md               # Guia completo
│   └── AI_ENDPOINTS.md           # Referência de API
│
├── 🎨 features/                   # Features específicas
│   ├── IMPORT.md                 # Sistema de importação
│   ├── PATRIMONIO.md             # Gestão de investimentos
│   ├── CONFIGURACOES.md          # Sistema de settings
│   └── TEMA.md                   # Dark/Light mode
│
├── 📦 archives/                   # Documentos obsoletos
│   └── v0.2/                     # Docs da v0.2 (arquivados)
│
├── 📁 data-architecture/          # Diagramas e schemas antigos
├── 📁 sample-files/               # Exemplos de extratos
├── ROADMAP_SUMMARY.md            # Resumo do roadmap
├── Cortex Cash PRD.md            # PRD completo
└── TRANSLATION_*.md              # Inventários de tradução
```

---

## 🎯 Como Usar Esta Documentação

### Para Desenvolvedores Novos

1. **Setup rápido:** [Getting Started](./guides/GETTING_STARTED.md) (5 minutos)
2. **Entenda a arquitetura:** [Versioning Strategy](./architecture/VERSIONING_STRATEGY.md) e [Data Model](./architecture/DATA_MODEL.md)
3. **Convenções:** [Development Guide](./guides/DEVELOPMENT.md)
4. **Explore o código:** Leia os services em `lib/services/`

### Para Contribuir com Features

1. **Veja o roadmap:** [Versioning Strategy](./architecture/VERSIONING_STRATEGY.md)
2. **Entenda o schema:** [Data Model](./architecture/DATA_MODEL.md)
3. **Siga convenções:** [Development Guide](./guides/DEVELOPMENT.md)
4. **Crie PR:** Com descrição clara e testes

### Para Usar IA

1. **Setup:** [Getting Started → Setup de IA](./guides/GETTING_STARTED.md#setup-de-ia-opcional)
2. **Guia completo:** [AI Guide](./ai/AI_GUIDE.md)
3. **Referência técnica:** [AI Endpoints](./ai/AI_ENDPOINTS.md)

### Para Entender Importação

1. **Visão geral:** [Import Guide](./features/IMPORT.md)
2. **Exemplos:** `sample-files/` (extratos anonimizados)
3. **Código:** `lib/import/` e `lib/services/import.service.ts`

---

## 📊 Status do Projeto

### ✅ Versão Atual: v0.5 (em desenvolvimento)

**Completo:**
- ✅ Setup inicial (Next.js 16 + Dexie.js)
- ✅ CRUD de transações, contas, categorias
- ✅ Sistema de orçamentos
- ✅ Gestão de cartões e faturas
- ✅ Importação (CSV, OFX)
- ✅ Classificação automática (regras + IA)
- ✅ Sistema de configurações
- ✅ PWA (offline-first)
- ✅ Monitoring & Performance
- ✅ Backup/Export completo

**Em Progresso:**
- 🚧 Integração visual de IA nas páginas
- 🚧 Dashboard de analytics consolidado

### 🚀 Próximas Versões

**v1.0** (Planejado)
- Migração para PostgreSQL (Supabase)
- Autenticação multi-usuário
- Row Level Security (RLS)
- Sync em tempo real

**v2.0** (Futuro)
- Módulo de investimentos avançado
- Cálculo de IR (ganho de capital)
- App mobile (React Native)

---

## 🔄 Changelog

Ver: [CHANGELOG.md](../CHANGELOG.md) na raiz do projeto

**Resumo das últimas mudanças:**

- **05/Nov/2025**: Consolidação de documentação (35→20 arquivos)
- **02/Nov/2025**: v0.4 - Monitoring, PWA, Backup/Export
- **01/Nov/2025**: v0.3 - Orçamentos e Cartões
- **28/Out/2025**: v0.1 - Setup inicial, CRUD básico

---

## 📝 Convenções de Documentação

### Markdown

- **Títulos:** `#` para principal, `##` para seções, `###` para subseções
- **Code blocks:** Com syntax highlighting (```typescript, ```bash)
- **Tabelas:** Para dados estruturados
- **Emojis:** Usados para categorias (📋 🏗️ 🤖 🎨)

### Estrutura de Documentos

```markdown
# Título Principal
**Metadata | Versão**

## 📋 Índice
...

## Seção 1
Conteúdo...

## Seção 2
Conteúdo...

---

**Última atualização:** DD/MMM/AAAA
**Responsável:** Guilherme Barros
```

### Links

- **Internos:** Relativos (`./guides/GETTING_STARTED.md`)
- **Externos:** Absolutos com descrição

---

## 🆘 Precisa de Ajuda?

### Dúvidas sobre Setup
→ [Getting Started](./guides/GETTING_STARTED.md)

### Dúvidas sobre IA
→ [AI Guide](./ai/AI_GUIDE.md)

### Dúvidas sobre Arquitetura
→ [Data Model](./architecture/DATA_MODEL.md) e [Versioning Strategy](./architecture/VERSIONING_STRATEGY.md)

### Bugs ou Issues
→ Abra issue no GitHub: https://github.com/seu-usuario/cortex-cash/issues

### Quer Contribuir
→ Leia [Development Guide](./guides/DEVELOPMENT.md)

---

## 🎓 Recursos Externos

### Tecnologias Usadas

- [Next.js](https://nextjs.org/docs) - Framework React
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [OpenAI](https://platform.openai.com/docs) - API de IA

### Padrões

- [OFX Specification](https://www.ofx.net/) - Formato de extratos
- [Open Finance Brasil](https://openfinancebrasil.org.br/) - Futuro (v3.0)

---

## 📈 Métricas da Documentação

**Antes da consolidação (02/Nov):**
- 35 arquivos MD
- ~12.500 linhas com duplicação
- Navegação confusa

**Depois da consolidação (05/Nov):**
- 20 arquivos MD
- ~8.000 linhas sem duplicação (43% redução)
- Estrutura clara por categoria
- Índice navegável

---

## 🏆 Contribuidores

**Desenvolvedor Principal:**
- Guilherme Barros

---

**Última atualização:** 05 de Novembro de 2025
**Versão da documentação:** 2.0 (consolidada)
**Status:** ✅ Atualizada e organizada
