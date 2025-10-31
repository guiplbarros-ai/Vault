# Configurações da Aplicação - Cortex Cash PRD

> **Seção adicional ao PRD principal**
> **Data**: 2025-01-29
> **Versão**: 1.0
> **Status**: Especificação completa

---

## 1. Visão Geral

O módulo de **Configurações** centraliza todas as preferências do usuário, integrações e configurações do sistema. O design segue os princípios do produto: **transparência**, **controle** e **simplicidade**. Cada configuração impacta diretamente no comportamento da aplicação e deve ser **explicada claramente** ao usuário.

### 1.1 Princípios de Design

- **Transparência**: Cada configuração explica claramente seu impacto
- **Sensibilidade ao Contexto**: Configurações mostram efeito em tempo real quando possível
- **Padrões Inteligentes**: Valores default otimizados para caso comum
- **Reversibilidade**: Fácil resetar para padrões ou voltar atrás
- **Busca**: Todas configurações são pesquisáveis por nome ou descrição

---

## 2. Categorias de Configurações

### 2.1 Aparência e Tema

**Objetivo**: Personalizar a interface visual do aplicativo.

**Configurações**:

#### **Modo de Tema**
- Opções: `Auto (sistema)` | `Dark` | `Light`
- Padrão: `Auto` (v0.1-0.4 apenas Dark)
- Impacto: Altera paleta de cores em toda aplicação
- Persiste em: localStorage `theme_preference`
- **Como afeta**:
  - Auto: Segue configuração do SO (dark/light)
  - Dark: Paleta Cortex Pixel Teal (atual)
  - Light: Paleta invertida (v1.0+)

#### **Densidade da Interface**
- Opções: `Compacta` | `Confortável` | `Espaçosa`
- Padrão: `Compacta`
- **Impacto por opção**:
  - **Compacta**:
    - Padding: 4px/8px
    - Line height: 1.4
    - Mais linhas visíveis
    - Ideal: Telas grandes, usuários avançados
  - **Confortável**:
    - Padding: 8px/12px
    - Line height: 1.5
    - Balanço densidade/legibilidade
    - Ideal: Uso diário
  - **Espaçosa**:
    - Padding: 12px/16px
    - Line height: 1.6
    - Mais ar entre elementos
    - Ideal: Touch, mobile, acessibilidade
- Classes CSS aplicadas: `density-compact`, `density-comfortable`, `density-spacious`

#### **Tamanho da Fonte**
- Opções: `Pequeno (90%)` | `Normal (100%)` | `Grande (110%)` | `Muito Grande (120%)`
- Padrão: `Normal`
- Impacto: Acessibilidade para usuários com dificuldades visuais
- Aplica: `font-size` no `:root`
- **Exemplos**:
  - Pequeno: H1=24px, Body=13.5px
  - Normal: H1=27px, Body=15px
  - Grande: H1=30px, Body=16.5px
  - Muito Grande: H1=33px, Body=18px

#### **Pixel Art Mode** (Estético)
- Toggle: ON/OFF
- Padrão: ON
- Impacto: Ativa/desativa classe `.pixel-corners` em cards e botões
- Não afeta funcionalidade, apenas estética
- **Visual**:
  - ON: Cantos "pixelados" (clip-path polygon)
  - OFF: Border-radius padrão (8px)

**Critérios de aceite**:
- ✅ Mudanças refletem instantaneamente (sem reload)
- ✅ Tema persiste entre sessões
- ✅ Transição suave entre temas (200ms)
- ✅ Preview em tempo real ao ajustar

---

### 2.2 Localização e Formato

**Objetivo**: Adequar formatos de data, hora e moeda às preferências regionais.

**Configurações**:

#### **Idioma** (v1.0+)
- Opções: `Português (Brasil)` | `English (US)` | `Español`
- Padrão: `pt-BR`
- Impacto: Tradução de toda interface via i18n
- v0.1: Apenas pt-BR hardcoded
- **Requer reload**: Sim (troca de bundle de idioma)

#### **Formato de Data**
- Opções: `DD/MM/AAAA` | `MM/DD/AAAA` | `AAAA-MM-DD`
- Padrão: `DD/MM/AAAA` (Brasil)
- **Impacto**:
  - Exibição de datas em tabelas, gráficos e formulários
  - Parse de importação CSV usa formato configurado
  - Date pickers seguem formato
- **Exemplos**:
  - DD/MM/AAAA: 29/01/2025
  - MM/DD/AAAA: 01/29/2025
  - AAAA-MM-DD: 2025-01-29 (ISO 8601)

#### **Formato de Hora**
- Opções: `24 horas` | `12 horas (AM/PM)`
- Padrão: `24 horas`
- Impacto: Timestamps em logs, importações, auditoria
- **Exemplos**:
  - 24h: 14:30
  - 12h: 2:30 PM

#### **Moeda Principal**
- Opções: `BRL (R$)` | `USD ($)` | `EUR (€)` | `GBP (£)`
- Padrão: `BRL`
- Impacto: Símbolo exibido em valores monetários
- v0.1: Apenas BRL, multi-moeda em v1.2+
- **Não converte valores**, apenas símbolos

#### **Separador Decimal**
- Opções: `Vírgula (,)` | `Ponto (.)`
- Padrão: `Vírgula` (Brasil)
- **Impacto crítico**:
  - Parse de valores em importação CSV
  - Input de valores em formulários
  - Exibição de números
- **Exemplos**:
  - Vírgula: 1.234,56 (milhar=ponto, decimal=vírgula)
  - Ponto: 1,234.56 (milhar=vírgula, decimal=ponto)
- Sugestão automática baseada em localização

#### **Primeiro Dia da Semana**
- Opções: `Domingo` | `Segunda-feira`
- Padrão: `Domingo` (Brasil)
- Impacto: Calendários, filtros por semana, gráficos semanais
- **Usado em**:
  - Componente DatePicker
  - Dashboards de gastos semanais
  - Relatórios por semana

**Critérios de aceite**:
- ✅ Formatos aplicados consistentemente em toda aplicação
- ✅ Importação respeita formato de data/decimal configurado
- ✅ Mudanças não corrompem dados existentes
- ✅ Validação previne conflitos (ex: DD/MM com ponto decimal)

---

### 2.3 Dados e Privacidade

**Objetivo**: Controle total sobre armazenamento, backup e privacidade dos dados.

**Configurações**:

#### **Armazenamento Local**
- **Informações exibidas**:
  - Uso atual: XX MB / YY MB disponível
  - Progresso visual (barra)
  - Breakdown por tipo:
    - Transações: X MB
    - Cache: Y MB
    - Configurações: Z MB
- **Botões de ação**:
  - `Limpar Cache` (mantém transações)
  - `Resetar Aplicativo` (⚠️ apaga tudo, confirmação dupla)
- **Alerta**: Quando uso > 80%, sugerir backup

#### **Backup Automático**
- Toggle: ON/OFF
- Padrão: ON
- **Frequência**: `Diário` | `Semanal` | `Mensal`
- **Horário**: Seletor de hora (padrão: 02:00)
- **Local**: Download para pasta `~/Downloads/cortex-backups/`
- **Formato**: JSON criptografado + SHA256 checksum
- **Nomenclatura**: `cortex-backup-YYYY-MM-DD-HHmm.json`
- **Impacto**:
  - ✅ Proteção contra perda de dados
  - ⚠️ Consome espaço em disco (compactado gzip)
  - ⚠️ Backup pode interromper se browser inativo
- **Retenção**: Mantém últimos 7 backups, deleta antigos

#### **Backup Manual**
- Botão: `Exportar Backup Agora`
- **Opções de escopo**:
  - `Completo` (tudo)
  - `Últimos 6 meses`
  - `Últimos 12 meses`
  - `Custom` (seletor de data início/fim)
- **Formato**:
  - JSON (padrão, importável)
  - CSV (apenas transações, Excel-friendly)
- **Criptografia**: Senha opcional (AES-256)
  - Se ativada, requer senha para restaurar
  - Senha NÃO é armazenada (irrecuperável se perder)

#### **Restaurar Backup**
- Upload de arquivo `.cortex.backup.json`
- **Validação**:
  - Checksum SHA256
  - Versão do schema (migração automática se compatível)
  - Integridade dos dados
- **Estratégia**:
  - `Sobrescrever tudo` (⚠️ apaga dados atuais)
  - `Mesclar (sem duplicar)` (usa hash_dedupe)
- **Pré-visualização**:
  - Resumo do que será importado
  - Data do backup
  - Quantidade de registros por tipo
  - Conflitos detectados (se houver)
- **Rollback**: Cria backup automático antes de restaurar

#### **Telemetria** (opt-in)
- Toggle: ON/OFF
- Padrão: OFF (privacidade por padrão)
- **O que é enviado** (quando ON):
  - Eventos anônimos: clicks, navegação, features usadas
  - Crashes e erros (stack trace)
  - Métricas de performance (tempos de carregamento)
  - Device info: SO, browser, resolução (anônimo)
- **O que NÃO é enviado**:
  - Valores de transações
  - Descrições
  - Nomes de contas
  - Qualquer dado financeiro
- **Impacto**: Ajuda a melhorar produto via analytics
- **Revogação**: Usuário pode desativar a qualquer momento

#### **Criptografia em Repouso** (v1.0+)
- Toggle: ON/OFF (não disponível em v0.1 local-only)
- **Impacto**:
  - ON: Dados criptografados com AES-256
  - OFF: Dados em texto claro (SQLite padrão)
  - Ativar requer senha mestra (não recuperável)
- **Aviso**: ⚠️ Perda de senha = perda de dados
- **Performance**: ~10% overhead de CPU ao ler/escrever

**Critérios de aceite**:
- ✅ Backup completo < 30s para 10k transações
- ✅ Restaurar backup valida integridade (checksum)
- ✅ Telemetria respeita opt-out permanentemente
- ✅ Alertas claros antes de ações destrutivas
- ✅ Rollback funciona caso restauração falhe

---

### 2.4 Importação e Classificação

**Objetivo**: Ajustar comportamento de importações e classificação automática.

**Configurações**:

#### **Detecção Automática de Duplicatas**
- Toggle: ON/OFF
- Padrão: ON
- **Impacto**:
  - **ON**: Hash comparado antes de importar, preview exibe duplicatas
  - **OFF**: Todas transações importadas (⚠️ pode duplicar)
- **Algoritmo**: SHA256(conta_id + data + descricao + valor)
- **Recomendado**: Manter ON sempre

#### **Criar Transações Pendentes**
- Toggle: ON/OFF
- Padrão: ON (quando sem categoria)
- **Impacto**:
  - **ON**: Transações sem categoria ficam "pendentes" até classificar
  - **OFF**: Importa tudo como "Sem Categoria"
- **Badge de notificação**: "N pendentes" na sidebar
- **Útil para**: Forçar revisão de importações

#### **Auto-aplicar Regras na Importação**
- Toggle: ON/OFF
- Padrão: ON
- **Impacto**:
  - **ON**: Regras aplicadas automaticamente durante import
  - **OFF**: Transações importadas sem categoria, usuário aplica depois
- **Útil quando**: Testando novos mapeamentos ou regras

#### **Sugerir Categorias via IA** (v0.4+)
- Toggle: ON/OFF
- Padrão: OFF (v0.1-0.3), ON (v0.4+)
- **Impacto**:
  - **ON**: IA sugere categorias para transações não classificadas
  - **OFF**: Apenas regras manuais
- **Depende de**: API OpenAI configurada (seção 2.6)
- **Custo**: Consome tokens (monitorado em seção IA)

#### **Confiança Mínima para IA**
- Slider: 0% - 100%
- Padrão: 70%
- **Impacto**: Sugestões com confiança < threshold não são exibidas
- **Ajuste fino**:
  - Reduzir: Mais sugestões, mas menos precisas
  - Aumentar: Apenas certezas, mas menos cobertura
- **Exemplo**:
  - 70%: Sugestões "razoáveis"
  - 90%: Apenas altamente confiantes
  - 50%: Todas sugestões (útil para treinar regras)

#### **Salvar Templates Automaticamente**
- Toggle: ON/OFF
- Padrão: ON
- **Impacto**:
  - **ON**: Ao confirmar importação, salva mapeamento para instituição
  - **OFF**: Não salva, usuário mapeia sempre
- **Template salvo contém**:
  - Mapeamento de colunas
  - Separador detectado
  - Formato de data
  - Linha de cabeçalho (skip lines)

#### **Pular Linhas Inválidas Automaticamente**
- Toggle: ON/OFF
- Padrão: ON
- **Impacto**:
  - **ON**: Linhas com erros são ignoradas, relatório ao final
  - **OFF**: Import falha ao encontrar linha inválida
- **Recomendado**: ON para extratos bancários reais (cabeçalhos, rodapés)
- **Relatório**: Exibe linhas ignoradas e motivo

**Critérios de aceite**:
- ✅ Configurações aplicadas imediatamente na próxima importação
- ✅ Slider de confiança IA atualiza preview em tempo real
- ✅ Templates salvos aparecem em dropdown por instituição
- ✅ Detecção de duplicatas previne 99%+ de duplicações exatas

---

### 2.5 Orçamento e Alertas

**Objetivo**: Configurar limites, alertas e comportamento de orçamento.

**Configurações**:

#### **Alertas de Orçamento**
- Toggle geral: ON/OFF
- Padrão: ON
- **Níveis configuráveis**:
  - `80%`: Aviso amarelo (toast)
  - `100%`: Alerta vermelho (toast + banner no topo)
  - `120%`: Crítico (alerta persistente)
- **Impacto**: Notificações aparecem ao salvar transação que excede limites
- **Frequência**: Uma vez por categoria por dia (evita spam)

#### **Método de Cálculo**
- Opções: `Caixa (data de transação)` | `Competência (data de vencimento)`
- Padrão: `Caixa`
- **Impacto**:
  - **Caixa**: Considera quando dinheiro entra/sai (data efetiva)
  - **Competência**: Considera quando despesa/receita é reconhecida (data vencimento)
- **Afeta**: Dashboards, alertas, projeções, comparações M/M
- **Exemplo**:
  - Compra parcelada em 10/01 para pagar em 10/02
  - Caixa: Conta em fevereiro
  - Competência: Conta em janeiro

#### **Considerar Transferências no Orçamento**
- Toggle: ON/OFF
- Padrão: OFF
- **Impacto**:
  - **ON**: Transferências contam como receita/despesa
  - **OFF**: Transferências ignoradas (recomendado)
- **Justificativa OFF**: Transferências não são receitas/despesas reais

#### **Projeção Automática**
- Toggle: ON/OFF
- Padrão: ON
- **Método**:
  - `Média dos últimos 3 meses` (recomendado)
  - `Média dos últimos 6 meses`
  - `Mesmo valor do mês passado`
  - `Manual` (sem projeção)
- **Impacto**: Auto-preenche orçamentos futuros com projeção
- **Editable**: Usuário pode sobrescrever projeções

#### **Resetar Orçamento Mensalmente**
- Toggle: ON/OFF
- Padrão: ON
- **Impacto**:
  - **ON**: Orçamento reseta todo dia 1º (mensal)
  - **OFF**: Orçamento acumula (anual)
- **Útil OFF quando**: Orçamento anual dividido por mês

#### **Alertas de Fatura de Cartão** (v1.1+)
- Configurações por nível:
  - `70% do limite`: Aviso
  - `90% do limite`: Alerta forte
  - `100% do limite`: Crítico
  - `Fatura próxima vencimento (3 dias)`: Lembrete
- Toggle individual para cada nível
- Padrão: Todos ON

**Critérios de aceite**:
- ✅ Alertas disparam no momento correto (ao salvar transação)
- ✅ Método de cálculo reflete em todos dashboards consistentemente
- ✅ Projeção automática pode ser editada manualmente
- ✅ Notificações respeitam frequência (não spam)

---

### 2.6 IA e Custos

**Objetivo**: Monitorar e limitar custos de IA, configurar modelos e comportamento.

**Configurações**:

#### **API OpenAI**
- Campo: `API Key`
- Tipo: Password
- Placeholder: `sk-...`
- **Validação ao salvar**:
  - Testa conectividade
  - Verifica quota disponível
  - Exibe modelos disponíveis
- **Armazenamento**:
  - v0.4: localStorage criptografado
  - v1.0+: Supabase Vault (server-side)
- Toggle: `Ativar IA` (ON/OFF)
- **Sem API key**: IA desabilitada (apenas regras)

#### **Modelo Padrão**
- Opções:
  - `gpt-4o-mini` (rápido, barato) - Recomendado
  - `gpt-4o` (preciso, caro)
  - `gpt-3.5-turbo` (legado, descontinuado em breve)
- Padrão: `gpt-4o-mini`
- **Impacto**:
  - Custo: mini=$0.15/1M tokens, 4o=$5/1M tokens
  - Qualidade: 4o ~5% mais preciso
  - Latência: mini ~30% mais rápido
- **Custos estimados**:
  - 100 transações: $0.01 (mini) vs $0.03 (4o)
  - 1000 transações: $0.10 (mini) vs $0.30 (4o)

#### **Teto de Custo Mensal**
- Slider: $0 - $50
- Padrão: $10
- Unidade: USD
- **Impacto**: Hard stop ao atingir limite (exceto se override)
- **Visual**: Gráfico de uso atual vs. limite
  - Verde: < 80%
  - Amarelo: 80-99%
  - Vermelho: 100%+
- **Reset**: Todo dia 1º do mês

#### **Alertas de Custo**
- `80%`: Aviso amarelo (toast)
- `100%`: Bloqueio (banner vermelho)
- Toggle: `Permitir Override` (continuar após 100%)
  - Padrão: OFF (hard stop)
  - ON: Usuário pode continuar manualmente

#### **Estratégia de Economia**
- Opções:
  - **Agressiva**: Cache + embeddings + batch + sempre mini
  - **Balanceada**: Cache + batch quando possível
  - **Qualidade**: Sempre gpt-4o, sem cache
- Padrão: `Balanceada`
- **Impacto estimado**:
  - Agressiva: ~70% economia vs. qualidade
  - Balanceada: ~40% economia vs. qualidade
  - Qualidade: Melhor precisão, custo máximo
- **Trade-off**: Custo vs. precisão vs. latência

#### **Cache de Prompts**
- Toggle: ON/OFF
- Padrão: ON
- **Impacto**: Reutiliza respostas para descrições idênticas
- **TTL**: 30 dias
- **Economia estimada**: ~60% (descrições recorrentes)
- **Exemplo**: "UBER * TRIP" aparece 20x → classificado 1x, cache 19x

#### **Batch Processing**
- Toggle: ON/OFF
- Padrão: ON
- **Tamanho do lote**: `10` | `25` | `50` | `100`
- Padrão: `25`
- **Impacto**: Classifica múltiplas transações em uma única chamada
- **Economia**: ~40% vs. individual
- **Latência**: Maior latência total, mas throughput melhor

#### **Painel de Custos**
- Link: "Ver Detalhes" abre modal
- **Métricas exibidas**:
  - Custo acumulado no mês (atual vs. limite)
  - Custo por tarefa (classificação, insights, anomalias)
  - Chamadas por dia (gráfico linha)
  - Latência média por lote (ms)
  - Top 5 descrições mais classificadas
  - Economia por cache (% e $)
- **Exportação**: CSV com log completo
  - Colunas: timestamp, tarefa, tokens_in, tokens_out, custo, modelo, latência

**Critérios de aceite**:
- ✅ API key validada ao salvar (teste de conexão)
- ✅ Hard stop ao atingir 100% (exceto se override ON)
- ✅ Cache economiza tokens comprovadamente (log)
- ✅ Painel de custos atualiza em tempo real
- ✅ Estimativas de custo ±5% do real (dashboard OpenAI)

---

### 2.7 Performance e Cache

**Objetivo**: Otimizar performance e uso de recursos.

**Configurações**:

#### **Cache de Dados**
- Toggle: ON/OFF
- Padrão: ON
- **Impacto**: Consultas frequentes cacheadas em memória
- **TTL**: 5 minutos
- **O que é cacheado**:
  - Transações do mês atual
  - Categorias ativas
  - Contas ativas
  - Totalizadores de dashboard
- **Economia**: ~80% menos queries ao banco
- **Trade-off**: Usa ~10MB RAM adicional

#### **Lazy Loading de Transações**
- Toggle: ON/OFF
- Padrão: ON
- **Impacto**: Carrega transações sob demanda (scroll infinito)
- **OFF**: Carrega todas transações (⚠️ pode ser lento >1000 itens)
- **Batch size**: 50 transações por scroll
- **Útil OFF quando**: Pouquíssimas transações (<100)

#### **Paginação Padrão**
- Opções: `25` | `50` | `100` | `200`
- Padrão: `50`
- **Impacto**: Número de transações por página em tabelas
- **Recomendações**:
  - 25: Conexões lentas
  - 50: Balanço performance/usabilidade (recomendado)
  - 100: Telas grandes, muita RAM
  - 200: Usuários avançados, filtros pesados

#### **Otimização de Gráficos**
- Toggle: `Animações` ON/OFF
- Padrão: ON
- **Impacto**:
  - **ON**: Gráficos animados (transições 300ms)
  - **OFF**: Renderização instantânea (mais rápido)
- **Performance**:
  - ON: +200ms renderização, mais bonito
  - OFF: Instantâneo, melhor para máquinas lentas

#### **Pré-carregar Dashboards**
- Toggle: ON/OFF
- Padrão: ON
- **Impacto**: Carrega dados de dashboards em background após login
- **Trade-off**:
  - Usa mais memória (~20MB)
  - Navegação instantânea entre abas
  - Reduz tempo de espera em 90%
- **Útil OFF quando**: Dispositivos com pouca RAM

#### **Limpar Cache Automaticamente**
- Toggle: ON/OFF
- Padrão: ON
- **Frequência**: `Ao fechar` | `Diariamente` | `Semanalmente`
- Padrão: `Diariamente`
- **Impacto**: Libera memória, mas força recalcular na próxima abertura
- **Timing**: Executado às 03:00 (quando app fechado)

**Critérios de aceite**:
- ✅ Cache acelera navegação comprovadamente (métricas)
- ✅ Lazy loading funciona com scroll suave (sem janks)
- ✅ Animações podem ser desabilitadas sem quebrar UI
- ✅ Pré-carregamento não bloqueia interação inicial

---

## 3. Arquitetura de Configurações

### 3.1 Armazenamento

**Hierarquia**:

```
v0.1-0.4: localStorage
  └── cortex_settings
       ├── appearance {...}
       ├── localization {...}
       ├── dataPrivacy {...}
       ├── importClassification {...}
       ├── budgetAlerts {...}
       ├── aiCosts {...}
       └── performance {...}

v1.0+: Supabase
  └── user_preferences (table)
       ├── user_id (UUID, FK)
       ├── category (string)
       ├── settings_json (JSONB)
       └── updated_at (timestamp)
```

**Migração v0.x → v1.0**:
1. Exporta localStorage como JSON
2. Valida contra schema
3. Cria registros no Supabase
4. Mantém localStorage como fallback offline

### 3.2 Schema TypeScript

```typescript
interface Settings {
  appearance: {
    theme: 'auto' | 'dark' | 'light';
    density: 'compact' | 'comfortable' | 'spacious';
    fontSize: 90 | 100 | 110 | 120;
    pixelArtMode: boolean;
  };
  localization: {
    language: 'pt-BR' | 'en-US' | 'es';
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '24h' | '12h';
    currency: 'BRL' | 'USD' | 'EUR' | 'GBP';
    decimalSeparator: ',' | '.';
    firstDayOfWeek: 0 | 1; // 0=Sunday, 1=Monday
  };
  dataPrivacy: {
    autoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    backupTime: string; // HH:mm
    backupRetention: number; // days
    telemetry: boolean;
    encryption: boolean; // v1.0+
  };
  importClassification: {
    autoDetectDuplicates: boolean;
    createPendingTransactions: boolean;
    autoApplyRules: boolean;
    aiSuggestions: boolean;
    aiConfidenceThreshold: number; // 0-100
    autoSaveTemplates: boolean;
    skipInvalidLines: boolean;
  };
  budgetAlerts: {
    enabled: boolean;
    alert80: boolean;
    alert100: boolean;
    alert120: boolean;
    calculationMethod: 'cash' | 'accrual';
    considerTransfers: boolean;
    autoProjection: boolean;
    projectionMethod: 'avg3months' | 'avg6months' | 'lastMonth' | 'manual';
    resetMonthly: boolean;
  };
  aiCosts: {
    apiKey: string; // encrypted
    enabled: boolean;
    defaultModel: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';
    monthlyCostLimit: number; // USD
    allowOverride: boolean;
    strategy: 'aggressive' | 'balanced' | 'quality';
    cachePrompts: boolean;
    batchProcessing: boolean;
    batchSize: 10 | 25 | 50 | 100;
  };
  performance: {
    cache: boolean;
    cacheTTL: number; // minutes
    lazyLoading: boolean;
    pagination: 25 | 50 | 100 | 200;
    chartAnimations: boolean;
    preloadDashboards: boolean;
    autoClearCache: boolean;
    cacheClearFrequency: 'on_close' | 'daily' | 'weekly';
  };
  advanced: {
    devMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    experiments: Record<string, boolean>;
  };
}
```

### 3.3 API de Configuração

```typescript
// lib/services/settings.service.ts

class SettingsService {
  // Get configuração específica (deep path)
  get<T>(path: string): T;

  // Set configuração específica
  set<T>(path: string, value: T): Promise<void>;

  // Get todas configurações
  getAll(): Settings;

  // Reset para padrões
  resetToDefaults(category?: string): Promise<void>;

  // Export configurações
  exportSettings(): string; // JSON

  // Import configurações
  importSettings(json: string): Promise<void>;

  // Validar configurações
  validate(settings: Partial<Settings>): boolean;

  // Listeners (reactive)
  subscribe(path: string, callback: (value: any) => void): () => void;

  // Migrate (v0.x → v1.0)
  migrateToSupabase(): Promise<void>;
}

// Exemplos de uso
settingsService.get('appearance.theme'); // 'dark'
settingsService.set('appearance.theme', 'light');
settingsService.set('aiCosts.monthlyCostLimit', 15);

// Subscribe para mudanças
const unsubscribe = settingsService.subscribe('appearance.theme', (theme) => {
  applyTheme(theme);
});

// Reset categoria
await settingsService.resetToDefaults('appearance');

// Export/Import
const json = settingsService.exportSettings();
await settingsService.importSettings(json);
```

---

## 4. Interface de Usuário

### 4.1 Layout da Página

```
┌─────────────────────────────────────────────────────────┐
│  Configurações                              [Busca] [?] │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  Sidebar     │  Conteúdo (Cards)                        │
│              │                                          │
│  • Aparência │  ┌──────────────────────────────────┐   │
│  • Local...  │  │ Modo de Tema                     │   │
│  • Dados     │  │ [Auto] [Dark] [Light]           │   │
│  • Import    │  └──────────────────────────────────┘   │
│  • Orçamento │                                          │
│  • IA        │  ┌──────────────────────────────────┐   │
│  • Perfor... │  │ Densidade da Interface           │   │
│  • Avançado  │  │ [Compacta] [Confortável] [...]  │   │
│              │  └──────────────────────────────────┘   │
│  ─────────── │                                          │
│  [Reset]     │  [Preview em tempo real]                │
│  [Export]    │                                          │
│              │  [Botão: Salvar] [Cancelar]             │
└──────────────┴──────────────────────────────────────────┘
```

### 4.2 Componentes

**SettingsCard**:
```tsx
<SettingsCard title="Modo de Tema" description="Escolha entre dark, light ou auto">
  <SegmentedControl options={['Auto', 'Dark', 'Light']} />
</SettingsCard>
```

**SettingsToggle**:
```tsx
<SettingsToggle
  label="Cache de Dados"
  description="Acelera consultas frequentes"
  value={settings.performance.cache}
  onChange={(value) => set('performance.cache', value)}
  tooltip="Usa ~10MB de RAM adicional"
/>
```

**SettingsSlider**:
```tsx
<SettingsSlider
  label="Confiança Mínima IA"
  value={settings.importClassification.aiConfidenceThreshold}
  min={0}
  max={100}
  step={5}
  unit="%"
  onChange={(value) => set('importClassification.aiConfidenceThreshold', value)}
  preview={(value) => `${value}%: ${getConfidenceLabel(value)}`}
/>
```

### 4.3 Busca de Configurações

- Campo de busca no topo (hotkey: `/`)
- Busca por: Nome, descrição, categoria, tags
- Resultados destacam match (highlight)
- Navegação direta ao clicar
- Fuzzy search (tolera typos)

### 4.4 Preview em Tempo Real

Configurações visuais mostram preview:
- Tema: Mini mockup da UI
- Densidade: Exemplo de tabela
- Fonte: Texto em tamanhos diferentes
- Formato de data: Data de hoje formatada

---

## 5. Impacto nas Funcionalidades

### 5.1 Importação
- ✅ Formato de data/decimal afeta parse CSV
- ✅ Auto-aplicar regras acelera import
- ✅ Cache de templates melhora UX
- ✅ Detecção de duplicatas previne erros

### 5.2 Classificação
- ✅ Threshold de IA define qualidade vs. custo
- ✅ Cache de prompts economiza tokens
- ✅ Batch processing acelera grandes volumes
- ✅ Regras auto-aplicadas na importação

### 5.3 Dashboard
- ✅ Densidade afeta visualização de gráficos
- ✅ Método de cálculo (caixa/competência) muda totais
- ✅ Animações impactam performance
- ✅ Cache acelera carregamento

### 5.4 Orçamento
- ✅ Alertas configuram quando notificar
- ✅ Projeção automática reduz setup manual
- ✅ Reset mensal vs. anual muda estratégia
- ✅ Método de cálculo afeta comparações

### 5.5 IA
- ✅ Custo limite previne surpresas
- ✅ Modelo padrão define qualidade
- ✅ Estratégia balanceia custo vs. precisão
- ✅ Cache economiza até 60% de tokens

---

## 6. Roadmap de Configurações

**v0.1** (MVP - Atual):
- ✅ Aparência básica (tema dark, densidade, fonte)
- ✅ Localização (data DD/MM/YYYY, moeda BRL, vírgula decimal)
- ✅ Backup manual (export JSON)
- ⚠️ Performance (cache ON, paginação 50)

**v0.4** (IA):
- Custos de IA completo (teto, alertas, estratégias)
- Notificações granulares (orçamento, import, IA)
- Telemetria opt-in
- Backup automático (diário 02:00)

**v1.0** (Multi-user):
- Sync de configurações via Supabase
- Criptografia em repouso (AES-256)
- Backup automático em nuvem (Storage)
- Light mode completo

**v2.0+**:
- Integrações (Open Finance, Webhooks)
- Configurações por perfil (pessoal/empresa)
- Exportação para contabilidade
- Modo desenvolvedor avançado

---

## 7. Critérios de Aceite Global

- ✅ Todas mudanças refletem **instantaneamente** (sem reload, exceto idioma)
- ✅ Configurações **persistem** entre sessões (localStorage + Supabase)
- ✅ **Validação** previne valores inválidos (schema Zod)
- ✅ **Preview** mostra impacto antes de salvar (quando aplicável)
- ✅ **Reset** restaura padrões com confirmação dupla
- ✅ **Busca** encontra qualquer configuração em <1s (fuzzy)
- ✅ **Responsivo**: Funciona em mobile (v2.0+)
- ✅ **Acessível**: Contraste AA, navegação por teclado (Tab/Shift+Tab)
- ✅ **Documentação**: Cada configuração tem tooltip explicativo
- ✅ **Performance**: Nenhuma configuração adiciona >100ms de overhead

---

## 8. Métricas de Sucesso

**Adoção**:
- 80%+ usuários exploram configurações no primeiro mês
- 50%+ usuários customizam pelo menos 3 configurações

**Performance**:
- Tempo de carregamento de settings page < 500ms
- Busca retorna resultados < 100ms

**Economia (IA)**:
- Cache economiza 50%+ tokens (target: 60%)
- Batch processing economiza 30%+ (target: 40%)
- 95% usuários respeitam limite de custo (sem override)

**Backup**:
- 70%+ usuários habilitam backup automático
- 0 casos de perda de dados por falha de backup

---

**Última atualização**: 2025-01-29
**Versão**: 1.0
**Status**: Especificação completa, pronta para implementação
