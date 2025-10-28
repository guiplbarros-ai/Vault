# 📁 Estrutura de Documentação do Cortex Ledger

Este documento mostra a organização completa da documentação do projeto.

---

## 🗂️ Estrutura Visual

```
Cortex Ledger/
│
├── 📄 README.md                          # README principal do projeto
├── 📄 PRD-v1.md                          # Product Requirements Document
│
├── 📁 docs/                              # 📚 Toda a documentação
│   │
│   ├── 📄 README.md                      # Índice da documentação
│   ├── 📄 LEIA-ME-PRIMEIRO.md           # 🚀 Começar aqui!
│   │
│   ├── 📁 reports/                       # 📊 Relatórios de status
│   │   └── STATUS-REPORT.md             # Relatório consolidado (v5.0)
│   │
│   ├── 📁 guides/                        # 📖 Guias operacionais
│   │   ├── DESBLOQUEIO-BACKEND-GUIA.md  # Setup backend (migrations, deploy)
│   │   └── UI-FRONTEND-GUIDE.md         # Design System e componentes UI
│   │
│   └── 📁 architecture/                  # 🏗️ Documentação arquitetural
│       ├── ARCHITECTURE.md               # Decisões arquiteturais gerais
│       └── ARQUITETURA-IMPORTACAO.md    # Arquitetura do sistema ETL
│
├── 📁 supabase/                          # Documentação técnica Supabase
│   ├── README.md                         # Setup e configuração
│   ├── DEPLOYMENT.md                     # Guia de deploy
│   ├── tests/RLS-VALIDATION.md          # Validação de segurança
│   └── functions/classify_batch/
│       └── README.md                     # Edge Function docs
│
├── 📁 packages/                          # Documentação dos pacotes
│   ├── etl/README.md                     # Parsers e importação
│   └── services/README.md                # Dedupe e normalização
│
└── 📁 mcp-supabase/                      # Model Context Protocol
    ├── README.md                         # Setup MCP
    ├── EXAMPLES.md                       # Exemplos de uso
    ├── SETUP_CLAUDE_CODE.md             # Setup para Claude Code
    └── SETUP_CURSOR.md                  # Setup para Cursor
```

---

## 🎯 Navegação Rápida por Necessidade

### 🚀 Estou Começando no Projeto
1. **[README.md](../README.md)** na raiz
2. **[docs/LEIA-ME-PRIMEIRO.md](./LEIA-ME-PRIMEIRO.md)**
3. **[docs/README.md](./README.md)** — Índice completo

### 📊 Quero Ver o Status
- **[docs/reports/STATUS-REPORT.md](./reports/STATUS-REPORT.md)**

### 🔧 Preciso Fazer Setup do Backend
1. **[docs/guides/DESBLOQUEIO-BACKEND-GUIA.md](./guides/DESBLOQUEIO-BACKEND-GUIA.md)**
2. **[supabase/README.md](../supabase/README.md)**

### 🎨 Vou Trabalhar no Frontend
1. **[docs/guides/UI-FRONTEND-GUIDE.md](./guides/UI-FRONTEND-GUIDE.md)**
2. **[apps/web/src/components/ui/COMPONENT-USAGE-EXAMPLES.md](../apps/web/src/components/ui/COMPONENT-USAGE-EXAMPLES.md)**

### 🏗️ Preciso Entender a Arquitetura
1. **[docs/architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md)**
2. **[docs/architecture/ARQUITETURA-IMPORTACAO.md](./architecture/ARQUITETURA-IMPORTACAO.md)**
3. **[PRD-v1.md](../PRD-v1.md)**

### 🔐 Questões de Segurança (RLS)
- **[supabase/tests/RLS-VALIDATION.md](../supabase/tests/RLS-VALIDATION.md)**

### 📦 Trabalho com Parsers/ETL
- **[packages/etl/README.md](../packages/etl/README.md)**
- **[docs/architecture/ARQUITETURA-IMPORTACAO.md](./architecture/ARQUITETURA-IMPORTACAO.md)**

---

## 📈 Estatísticas da Documentação

### Arquivos por Categoria

```
📊 Relatórios:           1 arquivo  (STATUS-REPORT.md)
📖 Guias:               2 arquivos (Backend + Frontend)
🏗️ Arquitetura:         2 arquivos (Geral + Importação)
📚 Índices:             2 arquivos (README + LEIA-ME)
📄 Raiz:                2 arquivos (README + PRD)
─────────────────────────────────────────────────
TOTAL DOCS/:            7 arquivos
TOTAL RAIZ:             2 arquivos
TOTAL PROJETO:        ~20 arquivos MD
```

### Linhas de Documentação

```
STATUS-REPORT.md:        ~800 linhas
ARCHITECTURE.md:         ~400 linhas
PRD-v1.md:              ~1000 linhas
Guias:                   ~600 linhas
Outros:                  ~400 linhas
─────────────────────────────────────────────────
TOTAL:                  ~3200 linhas de docs
```

---

## 🎨 Convenções de Nomenclatura

### Padrões de Nomes
- **Arquitetura:** `ARCHITECTURE-*.md` ou `ARQUITETURA-*.md`
- **Guias:** `*-GUIDE.md` ou `GUIA-*.md`
- **Relatórios:** `*-REPORT.md` ou `RELATORIO-*.md`
- **Índices:** `README.md` ou `LEIA-ME-*.md`

### Idioma
- **Português:** Arquivos de negócio e produto (PRD, STATUS-REPORT)
- **Inglês:** Arquivos técnicos padrão (README, ARCHITECTURE)
- **Misto:** Aceitável para acessibilidade

### Formato
- **Markdown:** Todos os documentos
- **Emojis:** Liberados para melhor navegação visual
- **Links relativos:** Sempre que possível

---

## 🔄 Manutenção da Documentação

### Quando Atualizar

**Relatórios (reports/):**
- Após conclusão de features importantes
- Weekly updates durante desenvolvimento ativo
- Antes de releases

**Guias (guides/):**
- Quando processos mudarem
- Após atualizações de dependências importantes
- Quando feedback de usuário indicar confusão

**Arquitetura (architecture/):**
- Após decisões arquiteturais importantes
- Quando padrões mudarem
- Quarterly reviews

### Versionamento de Relatórios

Para relatórios de status:
- Não deletar versões antigas, renomear com data
- Exemplo: `STATUS-REPORT.md` → `STATUS-REPORT-2025-10-27.md`
- Manter sempre um `STATUS-REPORT.md` atual como link simbólico ou cópia

---

## 📝 Checklist de Novo Documento

Ao criar um novo documento de documentação:

```markdown
- [ ] Título claro no topo
- [ ] Metadados (data, versão, autor)
- [ ] Índice (para docs > 200 linhas)
- [ ] Seções bem organizadas
- [ ] Links relativos para outros docs
- [ ] Exemplos quando aplicável
- [ ] "Próximos passos" se relevante
- [ ] Data de última atualização no rodapé
```

---

## 🔗 Links Principais

### Documentação Essencial
- **[README.md](../README.md)** — README raiz
- **[docs/README.md](./README.md)** — Índice docs
- **[docs/LEIA-ME-PRIMEIRO.md](./LEIA-ME-PRIMEIRO.md)** — Começar aqui

### Status e Progresso
- **[docs/reports/STATUS-REPORT.md](./reports/STATUS-REPORT.md)** — Status atual

### Guias Operacionais
- **[docs/guides/DESBLOQUEIO-BACKEND-GUIA.md](./guides/DESBLOQUEIO-BACKEND-GUIA.md)**
- **[docs/guides/UI-FRONTEND-GUIDE.md](./guides/UI-FRONTEND-GUIDE.md)**

### Arquitetura
- **[docs/architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md)**
- **[docs/architecture/ARQUITETURA-IMPORTACAO.md](./architecture/ARQUITETURA-IMPORTACAO.md)**

---

**Última atualização:** 27 de outubro de 2025
**Mantido por:** Equipe Cortex Ledger
**Feedback:** Abra uma issue ou PR
