# 📚 Documentação do Cortex Ledger

Bem-vindo à documentação do Cortex Ledger! Esta pasta contém toda a documentação técnica, relatórios e guias do projeto.

---

## 📋 Índice Rápido

### 🚀 Começando
- **[LEIA-ME-PRIMEIRO.md](./LEIA-ME-PRIMEIRO.md)** — Índice de navegação principal

### 📊 Relatórios
- **[STATUS-REPORT.md](./reports/STATUS-REPORT.md)** — Relatório consolidado do projeto (Backend + Frontend)

### 📖 Guias
- **[DESBLOQUEIO-BACKEND-GUIA.md](./guides/DESBLOQUEIO-BACKEND-GUIA.md)** — Guia operacional para setup do backend
- **[UI-FRONTEND-GUIDE.md](./guides/UI-FRONTEND-GUIDE.md)** — Guia do Design System

### 🏗️ Arquitetura
- **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** — Decisões arquiteturais principais
- **[ARQUITETURA-IMPORTACAO.md](./architecture/ARQUITETURA-IMPORTACAO.md)** — Arquitetura do sistema de importação

---

## 📁 Estrutura de Pastas

```
docs/
├── README.md                          # Este arquivo - Índice da documentação
├── LEIA-ME-PRIMEIRO.md               # Navegação principal do projeto
│
├── reports/                           # Relatórios de status e progresso
│   └── STATUS-REPORT.md              # Relatório consolidado (v5.0)
│
├── guides/                            # Guias operacionais e técnicos
│   ├── DESBLOQUEIO-BACKEND-GUIA.md   # Setup backend (migrations, deploy)
│   └── UI-FRONTEND-GUIDE.md          # Design System e componentes
│
└── architecture/                      # Documentação arquitetural
    ├── ARCHITECTURE.md                # Decisões arquiteturais gerais
    └── ARQUITETURA-IMPORTACAO.md     # Arquitetura do ETL
```

---

## 🎯 Documentos por Público

### Para Desenvolvedores
1. **Começando no projeto:**
   - [LEIA-ME-PRIMEIRO.md](./LEIA-ME-PRIMEIRO.md)
   - [../README.md](../README.md) (raiz do projeto)

2. **Setup do Backend:**
   - [guides/DESBLOQUEIO-BACKEND-GUIA.md](./guides/DESBLOQUEIO-BACKEND-GUIA.md)
   - [../supabase/README.md](../supabase/README.md)

3. **Desenvolvimento Frontend:**
   - [guides/UI-FRONTEND-GUIDE.md](./guides/UI-FRONTEND-GUIDE.md)
   - [../apps/web/src/components/ui/COMPONENT-USAGE-EXAMPLES.md](../apps/web/src/components/ui/COMPONENT-USAGE-EXAMPLES.md)

4. **Arquitetura e Decisões:**
   - [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md)
   - [architecture/ARQUITETURA-IMPORTACAO.md](./architecture/ARQUITETURA-IMPORTACAO.md)

### Para Product Owners / PMs
1. **Estado do Projeto:**
   - [reports/STATUS-REPORT.md](./reports/STATUS-REPORT.md)
   - [../PRD-v1.md](../PRD-v1.md)

2. **Roadmap e Próximos Passos:**
   - Ver seção "Próximos Passos" no [STATUS-REPORT.md](./reports/STATUS-REPORT.md)

### Para DevOps / SRE
1. **Setup de Infraestrutura:**
   - [guides/DESBLOQUEIO-BACKEND-GUIA.md](./guides/DESBLOQUEIO-BACKEND-GUIA.md)
   - [../supabase/README.md](../supabase/README.md)
   - [../supabase/DEPLOYMENT.md](../supabase/DEPLOYMENT.md)

---

## 📊 Status Atual do Projeto

> **Última atualização:** 27 de outubro de 2025

```
Backend:   ██████████████████████████████████████████ 100%
Frontend:  ███████████████████████████████████████░░░  95%
═══════════════════════════════════════════════════
TOTAL:     ███████████████████████████████████████░░░  97%
```

**Detalhes completos:** [reports/STATUS-REPORT.md](./reports/STATUS-REPORT.md)

---

## 🔗 Links Úteis

### Documentação Técnica em Subdiretórios
- **Supabase:** [../supabase/README.md](../supabase/README.md)
- **Edge Function:** [../supabase/functions/classify_batch/README.md](../supabase/functions/classify_batch/README.md)
- **ETL/Parsers:** [../packages/etl/README.md](../packages/etl/README.md)
- **Services:** [../packages/services/README.md](../packages/services/README.md)

### MCP (Model Context Protocol)
- **Setup MCP:** [../mcp-supabase/README.md](../mcp-supabase/README.md)
- **Exemplos:** [../mcp-supabase/EXAMPLES.md](../mcp-supabase/EXAMPLES.md)

---

## 📝 Convenções de Documentação

### Nomenclatura
- **Arquitetura:** `ARCHITECTURE-*.md` ou `ARQUITETURA-*.md`
- **Guias:** `*-GUIDE.md` ou `GUIA-*.md`
- **Relatórios:** `*-REPORT.md` ou `RELATORIO-*.md`
- **Índices:** `README.md` ou `LEIA-ME-*.md`

### Estrutura de Documento
Todos os documentos devem seguir:
1. **Título e metadados** (data, versão, autor)
2. **Índice** (para docs longos)
3. **Conteúdo** (seções organizadas)
4. **Próximos passos** (quando aplicável)
5. **Links relacionados**

### Atualização
- Documentos de arquitetura: atualizar quando houver mudanças arquiteturais
- Guias: manter atualizados com mudanças de processo
- Relatórios: criar novos ou atualizar versão (v1.0, v2.0, etc)

---

## 🚀 Próximos Passos

1. **Aplicar migrations** (5min) — Ver [DESBLOQUEIO-BACKEND-GUIA.md](./guides/DESBLOQUEIO-BACKEND-GUIA.md)
2. **Deploy Edge Function** (5min) — Ver [../supabase/DEPLOYMENT.md](../supabase/DEPLOYMENT.md)
3. **Completar Design System** (1-2 dias) — Ver [UI-FRONTEND-GUIDE.md](./guides/UI-FRONTEND-GUIDE.md)

---

**Última atualização:** 27 de outubro de 2025
**Mantido por:** Equipe Cortex Ledger
