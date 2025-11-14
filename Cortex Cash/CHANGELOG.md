# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.5.0] - Em desenvolvimento

Para o changelog detalhado e atualizações diárias desta versão, consulte `docs/CHANGELOG.md`.

## [0.4.0] - 2025-11-02

### Adicionado
- **Health Check Monitoring**
  - 6 verificações automatizadas (Database, IndexedDB, LocalStorage, Services, Data Integrity, Browser Compatibility)
  - Dashboard visual de status do sistema com cores (healthy/degraded/unhealthy)
  - Histórico dos últimos 50 health checks
  - Página `/settings/system` para visualização em tempo real
  - Hook `useHealthCheck` para integração com componentes

- **Performance Monitoring**
  - Sistema de tracking de queries do banco de dados
  - Detecção automática de slow queries (threshold configurável)
  - Monitoramento de page loads (load time + render time)
  - Métricas de memória JS Heap em tempo real
  - Dashboard visual com alertas para gargalos
  - Página `/settings/performance` para análise detalhada
  - Funções utilitárias `measureAsync` e `measureSync`
  - Hook `usePerformance` para auto-refresh de métricas

- **Progressive Web App (PWA)**
  - Service Worker completo com estratégias de cache:
    - Cache-first para assets estáticos (imagens, CSS, JS)
    - Network-first para requisições de API
    - Network-first com fallback offline para páginas HTML
  - PWA manifest.json configurado com:
    - Ícones 192x192 e 512x512
    - Shortcuts para ações rápidas
    - Cores de tema personalizadas
  - Página `/offline` personalizada para modo offline
  - Componente `ServiceWorkerUpdatePrompt` para notificar atualizações
  - Auto-registro do service worker no app layout
  - Hook `useServiceWorker` para gerenciar SW e status online/offline
  - Suporte completo a instalação como app nativo

- **Sistema de Backup/Export**
  - Export completo do IndexedDB para JSON
  - Import com validação estrutural automática
  - Dois modos de import:
    - Replace: substitui todos os dados
    - Merge: pula registros duplicados
  - Download de backup como arquivo timestamped
  - Preview detalhado do backup antes de importar (size, records, tables, date)
  - Validação robusta de integridade de dados
  - Interface visual intuitiva com warnings e erros claros
  - Botão "Clear All Data" com confirmação dupla (danger zone)
  - Página `/settings/backup` para gestão completa
  - Hook `useBackup` para operações de backup/restore
  - Suite de testes automatizados e manual (6 cenários de teste)
  - Documentação completa de uso e teste

- **Testes e Qualidade**
  - Suite de testes automatizados para backup/restore
  - Testes manuais documentados com 6 cenários principais
  - Guia detalhado de testes (`tests/BACKUP_TESTING_GUIDE.md`)
  - Teste de validação de backups inválidos
  - Teste de integridade de dados
  - Documentação PWA para geração de ícones

### Modificado
- Botão de seleção de mês (`MonthPicker`) agora tem largura fixa (`w-[160px]`)
- Layout principal (`app/layout.tsx`) agora inclui PWA metadata e ServiceWorkerUpdatePrompt
- Manifest.json atualizado com ícones PWA reais
- Metadata `themeColor` e `viewport` movidos para export separado (Next.js 16 requirement)

### Infraestrutura
- 3 novos módulos criados:
  - `lib/monitoring/` (health-check e performance)
  - `lib/backup/` (export/import de dados)
  - `lib/finance/classification/` (preparação para IA)
- 5 novos hooks criados:
  - `useHealthCheck`
  - `usePerformance`
  - `useServiceWorker`
  - `useBackup`
- 6 novos componentes:
  - `HealthCheckStatus`
  - `PerformanceDashboard`
  - `ServiceWorkerUpdatePrompt`
  - `BackupManager`
- 3 novas páginas de settings:
  - `/settings/system`
  - `/settings/performance`
  - `/settings/backup`
- 1 nova página:
  - `/offline` (PWA offline fallback)

### Documentação
- `PWA_ICONS_README.md` - Guia para gerar ícones PWA
- `BACKUP_TESTING_GUIDE.md` - Guia completo de testes de backup
- Status consolidado atualizado em `docs/status/README.md`
- `CHANGELOG.md` criado

### Técnico
- 30 arquivos alterados
- 3,976 linhas adicionadas
- 121 linhas removidas
- 0 erros de build
- PWA totalmente funcional
- Backup/restore validado e testado

---

## [0.3.0] - 2025-11-01

### Adicionado
- **Sistema de Orçamentos Mensais**
  - `OrcamentoService` completo (CRUD + tracking + alertas)
  - `BudgetForm` com validação Zod
  - Cálculo automático de valor realizado
  - Sistema de alertas 80%/100%
  - Resumo mensal e cópia entre meses
  - Suporte a orçamento por categoria e centro de custo
  - Página `/budgets` com CRUD completo e navegação por mês

- **Lançamentos de Fatura de Cartão**
  - `FaturaLancamentoForm` completo
  - Suporte a parcelamento com cronograma
  - Suporte a compras no exterior (múltiplas moedas)
  - Cálculo automático de valor BRL com câmbio
  - Hook de alertas de limite (`use-cartao-limit-alerts`)
  - Monitoramento automático com thresholds configuráveis
  - Página de detalhes de fatura com CRUD de lançamentos

- **Dashboards Visuais**
  - `BudgetProgressChart` (barras horizontais)
  - `BudgetDistributionChart` (gráfico de pizza)
  - Integração na página `/budgets`
  - Cores semânticas por status
  - Tooltips customizados Recharts
  - Componentes responsivos e performáticos

- **Error Handling Global**
  - `ErrorBoundary` component para captura de erros React
  - `GlobalErrorHandler` para erros JavaScript globais
  - Sistema de logging em localStorage (últimos 30 erros)
  - UI de recuperação de erro com retry e go home
  - Integração com toasts para feedback ao usuário
  - Proteção global no `DashboardLayout`

### Modificado
- Melhorias em categorias:
  - Dashboard de analytics aprimorado
  - Classificação em massa otimizada
  - Página de categorias com layout melhorado
- Padrão visual 100% consistente em toda aplicação

---

## [0.1.0] - 2025-10-28

### Adicionado
- **Setup Inicial**
  - Projeto Next.js 16 + TypeScript
  - Tailwind CSS + shadcn/ui
  - Estrutura de pastas definida

- **Database**
  - Migração de sql.js para Dexie.js (IndexedDB)
  - Schema com 12 tabelas:
    - `instituicoes`, `contas`, `categorias`, `transacoes`
    - `templates_importacao`, `regras_classificacao`, `logs_ia`
    - `cartoes_config`, `faturas`, `faturas_lancamentos`
    - `centros_custo`, `orcamentos`
  - Seed de 39 categorias padrão com emojis
  - `DBProvider` com inicialização automática

- **Services Layer**
  - `transacao.service.ts`
  - `conta.service.ts`
  - `categoria.service.ts`
  - Interfaces TypeScript compartilhadas
  - Validação Zod para DTOs
  - Error handling customizado

- **UI Foundation**
  - Layout base com sidebar e header (`dashboard-layout`)
  - Tema dark implementado (Cortex Pixel Teal)
  - Páginas base para todas as rotas:
    - `/` - Dashboard
    - `/transactions` - Transações
    - `/accounts` - Contas
    - `/budgets` - Orçamentos
    - `/credit-cards` - Cartões
    - `/import` - Importação
    - `/categories` - Categorias
    - `/settings` - Configurações
  - 22 componentes shadcn/ui instalados
  - 9 form wrappers criados
  - 6 validation schemas Zod

- **Features**
  - CRUD completo de transações conectado ao DB
  - CRUD completo de contas conectado ao DB
  - CRUD completo de categorias conectado ao DB
  - Dashboard Home com dados reais
  - `RecentTransactions` component
  - `CashFlowChart` component
  - Loading states e empty states em todos componentes
  - Toast notifications com sonner

### Documentação
- `DEXIE_EXAMPLES.md` - Guia completo de uso do Dexie
- `docs/status/README.md` - Status do projeto (canônico)

### Técnico
- 0 mock data - 100% dados reais do Dexie
- 0 erros TypeScript
- Build Next.js 16 + Turbopack funcionando
- Compatibilidade total com browser IndexedDB

---

## Versões Futuras

### [0.5.0] - Em desenvolvimento
- Motor de regras de classificação
- Integração OpenAI para classificação automática
- Batch processing de transações
- UI de gestão de regras
- Painel de custos e auditoria de IA
- Cache de prompts de IA

### [1.0.0] - Planejado
- Migração para PostgreSQL (Supabase)
- Autenticação multi-usuário
- Row Level Security (RLS)
- Sync em tempo real
- Storage de arquivos
- Script de migração de dados
- Sistema de orçamentos avançado

### [2.0.0] - Planejado
- Módulo de investimentos
- Cálculo de patrimônio líquido
- Rentabilidade e XIRR
- Integração com APIs de cotação
- Proventos (dividendos, JCP)
- Alocação por classe de ativo

### [2.1.0] - Planejado
- Módulo de Imposto de Renda
- Cálculo de ganho de capital
- Carnê-leão
- Deduções automáticas
- Export para IRPF
- Simulação de imposto

### [3.0.0] - Planejado
- App mobile (React Native + Expo)
- Open Finance Brasil integration
- Sincronização automática de extratos
- Captura de nota fiscal via câmera
- Notificações push
- Modo offline avançado

---

## Links

- [Roadmap Completo](docs/ROADMAP_SUMMARY.md)
- [Status do Projeto](docs/status/README.md)
- [Guia de Contribuição](CONTRIBUTING.md) (a criar)

---

**Convenções deste Changelog:**
- `Adicionado` para novas funcionalidades
- `Modificado` para mudanças em funcionalidades existentes
- `Descontinuado` para funcionalidades que serão removidas
- `Removido` para funcionalidades removidas
- `Corrigido` para correções de bugs
- `Segurança` para vulnerabilidades corrigidas
