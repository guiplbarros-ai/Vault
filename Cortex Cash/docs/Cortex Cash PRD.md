# Cortex Cash — Product Requirements Document (PRD) v1

> **Status:** Draft final - Estrutura de versionamento definida
> **Versão Atual em Desenvolvimento:** **v0.1 - MVP Local**
> **Data-alvo v0.1:** 4 semanas
> **Responsável:** Guilherme (PO)
> **Time de execução:** Guilherme + Claude Code (3–4 terminais) dentro do Cursor
> **Nome do produto:** **Cortex Cash**
>
> **Arquitetura Evolutiva:**
> - **v0.1-0.3**: SQLite local (single-user, sem auth)
> - **v1.0+**: Supabase (multi-user, RLS, sync)
>
> **Documentação Completa:** Ver `/docs/data-architecture/VERSIONING_STRATEGY.md`

---

## 1. Visão e Objetivo

**Cortex Cash** é um web app **local-first** para controle financeiro pessoal que prioriza **disciplina orçamentária** com visão 360º suficiente para decisões rápidas. A proposta é consolidar **bancos, cartões e investimentos**, importar extratos (CSV/OFX/Excel), **classificar automaticamente** (regras + IA), orçar por categorias/centros e oferecer **dashboards práticos** (DFC simplificado, Orçado vs. Realizado, comparativos M/M e YTD). Tudo isso com **custo de IA monitorado e limitado** (teto **US$ 10/mês**), foco em **privacidade** e sem dependência obrigatória de nuvem.

### 1.1 Problema que resolvemos
- Dispersão de dados entre bancos, cartões e corretoras.
- Fricção em importação/configuração e tempo gasto com higienização.
- Falta de **disciplina de orçamento** com feedbacks claros (alertas e previsões simples).
- Alto esforço manual de classificação sem reaproveitar inteligência histórica.
- Pouca rastreabilidade de custo/latência em processos com IA.

### 1.2 Princípios de produto
- **Local-first por padrão** (dados ficam na máquina do usuário).  
- **Transparência**: explicabilidade das classificações (regras vs. IA) e dedupe visível.  
- **Velocidade**: importar 10k linhas ≤ 2 min (máximo), classificação em massa assistida.  
- **Custo sob controle**: teto de IA por mês, painel de custos com alertas a 80% e 100%.  
- **Foco em orçamento**: tudo converge para planejamento e disciplina (alertas simples e úteis).  
- **Sem floreio**: UX direta, copy objetiva, densidade alta e modo tema que segue o SO (auto).

### 1.3 Metas v1 (KPIs)
- **Setup inicial** (mapear modelo de extrato + importar + configurar orçamento básico) em ≤ **15 min**.
- **Importação**: 10k linhas ≤ **2 min**; dedupe reduz duplicatas exatas com assertividade > **99%**.
- **Classificação**: ≥ **85%** com sugestão automática no 1º uso; ≥ **90–95%** de acurácia após reforço com 2 iterações de feedback do usuário.
- **Custos IA**: ≤ **US$ 10/mês**; alertas em **80%** e **100%** do teto.
- **Confiabilidade**: 0 perda de dados em crash (persistência incremental local).

---

## 2. Público-alvo e Cenários de Uso

- **Usuário-alvo:** pessoa física (uso individual).  
- **Cenário principal:** consolidar contas/ cartões/ investimentos, classificar e orçar mensalmente.
- **Cenários secundários:**
  1. Importar extratos mensais do Bradesco/Inter/Santander (banco e cartão), Aeternum/Amex, e posição simples de investimentos.
  2. Fechar o mês: revisar classificações pendentes, conferir alertas de orçamento, olhar DFC simplificado e evolução M/M; registrar recorrências e parceladas.
  3. Acompanhar custo de IA e latência por tarefa para manter performance e orçamento sob controle.

---

## 3. Roadmap de Versões

> **IMPORTANTE**: Este projeto evolui de forma incremental. A v0.1 é local-first e single-user. A v1.0 introduz multi-usuário com Supabase. Cada versão prepara o terreno para a próxima sem breaking changes.

### v0.1 - MVP Local (4 semanas) - **EM DESENVOLVIMENTO**

**Objetivo**: Aplicação funcional local, 1 usuário, sem auth, foco em importação e visualização.

**Funcionalidades**:
- ✅ Importação CSV/OFX (Bradesco, Inter, Santander)
- ✅ Detecção automática de cabeçalho e formato
- ✅ Preview antes de importar
- ✅ Dedupe por hash
- ✅ Templates de importação salvos
- ✅ CRUD de instituições e contas
- ✅ Listagem de transações com filtros básicos
- ✅ Dashboard: saldos, últimas transações, gráfico entrada/saída
- ✅ SQLite local (sql.js ou Dexie.js)
- ✅ Dados persistidos no navegador

**Fora do Escopo v0.1**:
- ❌ Autenticação
- ❌ Classificação (regras ou IA)
- ❌ Orçamento
- ❌ Parceladas/recorrências
- ❌ Multi-usuário
- ❌ Sincronização

**Stack**: Next.js 14 + SQLite (local) + Tailwind + shadcn/ui + Recharts

---

### v0.2 - Classificação Manual e Plano de Contas (3 semanas)

**Novas Funcionalidades**:
- **Sistema de categorias hierárquico** (Grupo > Categoria > Subcategoria — máximo 2 níveis)
- **Gestão completa de Plano de Contas**:
  - CRUD de categorias e subcategorias com drag-and-drop para reordenação
  - Ícones personalizáveis por categoria (emoji ou Lucide)
  - Cores customizáveis por categoria
  - Merge/fusão de categorias (mantendo histórico)
  - Ativação/desativação de categorias (sem deletar histórico)
  - Exportação/importação do plano de contas (CSV)
- **Sistema de Tags para Transações**:
  - Tags predefinidas: `essencial`, `importante`, `supérfluo`, `extraordinário`, `recorrente`
  - Tags customizadas criadas pelo usuário
  - Filtros avançados por tags nos dashboards
  - Coloração visual por tipo de tag
  - Estatísticas por tag (ex.: "% de gastos supérfluos")
- **Relatórios por Categoria**:
  - Linha de tendência mensal por categoria
  - Linha de tendência por subcategoria
  - Comparativo M/M e Y/Y por categoria
  - Drill-down: categoria → subcategorias → transações
  - Top 5 categorias com maior variação
  - Gráfico de distribuição (pizza + barras empilhadas)
- Classificação manual de transações
- Edição em massa (aplicar categoria/tags a múltiplas transações)
- Dashboard por categoria (pizza, barras)
- Filtros por categoria e tags

**Dados**:
- Tabela `categorias` com campos: `id`, `nome`, `tipo`, `grupo`, `pai_id` (para subcategorias), `icone`, `cor`, `ordem`, `ativa`
- Campo `tags` (JSON array) em `transacoes`
- Tabela `tags_disponiveis`: `id`, `nome`, `cor`, `tipo` (sistema/customizada)

---

### v0.3 - Cartões e Parceladas (3 semanas)

> **PRIORIDADE ALTA**: Gestão de cartões é fundamental para controle financeiro pessoal

**Novas Funcionalidades**:
- Configuração de cartões (fechamento, vencimento, limite)
- Ciclos de fatura automatizados
- Detecção de pagamento (conciliação)
- Parceladas com cronograma automático
- Câmbio (valor original + taxa)
- Alertas de limite (70%, 90%)
- Projeção de próximas faturas

**Dados**: Adiciona `cartoes_config`, `faturas`, `faturas_lancamentos`

---

### v0.4 - Calendário e Visualizações Temporais (2 semanas)

**Objetivo**: Adicionar visualizações baseadas em calendário para análise de padrões de gastos ao longo do tempo.

**Novas Funcionalidades**:
- **Calendário de Gastos Mensal**:
  - Visualização em grade de calendário (estilo heatmap)
  - Valor total de despesas por dia
  - Coloração por intensidade de gasto (gradiente: baixo → médio → alto)
  - Tooltip com breakdown por categoria ao hover
  - Destaque para dias com gastos extraordinários (outliers)
  - Comparação com média diária do mês
- **Relatórios Temporais**:
  - Gráfico de linha: evolução diária de gastos
  - Identificação de dias da semana com maior volume (ex.: "Sextas têm 30% mais gastos")
  - Padrões mensais: início vs meio vs final do mês
  - Alertas de "dias pesados" (quando gasto diário > 2x média)
- **Análise de Padrões**:
  - Gastos recorrentes por dia do mês (ex.: sempre dia 5 e 15)
  - Sazonalidade semanal (seg-dom)
  - Comparação de calendário M/M (mesmo dia em meses diferentes)
- **Filtros**:
  - Por conta, categoria, tag
  - Apenas despesas ou incluir receitas
  - Excluir transferências

**Dashboards**:
- Card "Calendário do Mês" na Home
- Página dedicada "Análise Temporal" com múltiplas visualizações
- Widget "Próximos Dias de Alto Gasto" (previsão baseada em histórico)

**Dados**: Sem novas tabelas (usa `transacoes` existente com agregações)

---

### v0.5 - Regras e IA (3 semanas)

**Novas Funcionalidades**:
- Motor de regras (regex, contains, starts, ends)
- Integração OpenAI para sugestões
- Confirmação de classificação em massa
- Painel de custos e uso de IA
- Alertas de custo (80%, 100%)
- Explicabilidade (origem da classificação)

**Dados**: Adiciona `regras_classificacao`, `logs_ia`

---

### v1.0 - Orçamento e Multi-usuário (4 semanas)

**Grande Migração**: Local → Supabase + Orçamento Completo

**Novas Funcionalidades**:
- **Orçamento**: por categoria e centro de custo, alertas 80%/100%, projeções
- **Dashboard**: Orçado vs Realizado, comparativos M/M e YTD
- **Autenticação**: email/senha
- **Row Level Security (RLS)**: dados isolados por usuário
- **Realtime sync**
- **Storage**: arquivos importados
- **Migração**: dados v0.x → v1.0

**Arquitetura**: PostgreSQL (Supabase) como source of truth + cache local opcional

**Dados**: Adiciona `user_id` em todas as tabelas, RLS policies, `centros`, `orcamentos`

---

### v2.0 - Controle Patrimonial (4-5 semanas)

**Objetivo**: Visão 360º do patrimônio líquido consolidando todas as fontes.

**Módulo: Investimentos**
- Posição consolidada de ativos financeiros
- Proventos (dividendos, JCP, rendimentos, cupons)
- MTM (Mark-to-Market) com cotações atualizadas
- Rentabilidade por ativo (% e R$)
- Alocação por classe de ativo
- Importação de extratos de corretoras (XP, Clear, Rico, BTG)
- Custodia de ativos (ações, FIIs, Tesouro, CDBs, LCIs/LCAs)

**Módulo: Patrimônio Total**
- Consolidação de contas correntes + poupanças + investimentos
- Dívidas (cartões, empréstimos, financiamentos)
- Patrimônio líquido (ativos - passivos)
- Evolução patrimonial ao longo do tempo
- Gráficos de crescimento/decrescimento
- Comparativo M/M e Y/Y
- Meta de patrimônio

**Módulo: Imóveis e Veículos** (opcional v2.0)
- Cadastro manual de bens
- Valor estimado e atualização periódica
- Financiamentos vinculados
- Despesas recorrentes (IPTU, seguro, manutenção)

**Dashboards**:
- Visão geral: ativo total, passivo total, patrimônio líquido
- Pizza de alocação por tipo (contas, investimentos, imóveis)
- Linha do tempo de evolução
- Rentabilidade acumulada vs. CDI/IPCA

**Dados**: Adiciona `ativos`, `proventos`, `cotacoes`, `patrimonio_historico`, `bens_patrimoniais`, `dividas`

---

### v2.1 - Imposto de Renda (4-5 semanas)

**Novas Funcionalidades**:
- Consolidação de rendimentos tributáveis
- Cálculo de ganho de capital
- Carnê-leão (aluguéis, freelance)
- Exportação de dados para IRPF
- Relatórios formatados para declaração
- Apoio a dedução de despesas
- Previsão de imposto a pagar/restituir

**Dados**: Adiciona `declaracoes_ir`, `rendimentos_tributaveis`, `deducoes`

---

### v3.0 - Mobile e Open Finance (8-10 semanas)

**Mobile**:
- App React Native (Expo)
- Leitura de transações
- Lançamento rápido de gastos
- Notificações push
- Sync com web

**Open Finance Brasil**:
- Integração com APIs do Open Finance
- Sincronização automática de extratos
- Atualização de saldos em tempo real
- Gestão de consentimentos
- Suporte a múltiplas instituições

---

## 4. Escopo v0.1 (Detalhado) e Fora de Escopo

> Esta seção descreve especificamente a **v0.1**. Para versões futuras, consulte a seção 3 (Roadmap).

### 4.1 No escopo v0.1
- **Importação manual** CSV/OFX com **assistente de mapeamento** + **templates** por instituição
- **Detecção automática** de cabeçalho, separador e formato de dados
- **Preview** antes de confirmar importação
- **Dedupe** por hash (data, valor, descrição normalizada, conta)
- **CRUD de instituições** (banco, cartão, corretora)
- **CRUD de contas** (corrente, poupança, cartão, investimento)
- **Listagem de transações** com filtros básicos (data, conta, busca por texto)
- **Dashboard básico**: cards de saldo por conta, últimas transações, gráfico entrada vs saída
- **Templates de importação**: salvar mapeamento de colunas por instituição
- **Armazenamento local**: SQLite via sql.js ou Dexie.js (IndexedDB)
- **Persistência no navegador**: dados salvos automaticamente

### 4.2 Fora de escopo v0.1
- **Autenticação/Login** (não há usuários na v0.1)
- **Classificação automática** (regras ou IA) — entra na v0.2 e v0.3
- **Orçamento** — entra na v1.2
- **Parceladas e recorrências** — entra na v1.1
- **Multi-usuário e RLS** — entra na v1.0
- **Sincronização/nuvem** — entra na v1.0
- **Criptografia** — entra na v1.0
- **Mobile nativo** — entra na v2.0
- **Open Finance** — entra na v3.0
- **Patrimônio físico** (imóveis/veículos/cripto)
- **Split de transações**

---

## 4. Decisões de Produto (consolidadas e textuais)

> Todas as decisões abaixo estão **explicadas** e **não** dependem de códigos como “67B”. São declarações explícitas para o time de implementação.

1. **Foco do produto**: orçamento e disciplina de gastos, com visão suficiente para tomada de decisão, sem complexidade desnecessária.  
2. **Perfil de uso**: individual.  
3. **Plataforma**: web app (Next.js) rodando no Chrome, instalável (PWA/atalho) com ícone monograma no Dock do macOS.  
4. **Dados**: local-first, criptografia em repouso, login por **senha local**; sem telemetria por padrão; backups locais agendáveis (exportáveis).  
5. **Localização**: PT-BR, BRL e padrões brasileiros.  
6. **Contas v1**: bancos, cartões e investimentos (posição/saldo consolidado) — sem derivativos avançados.  
7. **Importação**: manual CSV/OFX/Excel; assistente para mapeamento de colunas e salvamento de templates por instituição.  
8. **Sincronização/Cloud**: **Supabase core no v1** (Postgres como sistema de registro com **RLS** por usuário) + **cache local** (SQLite/OPFS) opcional para offline/latência; Storage opcional para arquivar arquivos importados.  
9. **Dedupe**: hash de `(data | valor | descrição normalizada | conta_id)`; pré-visualização marca suspeitas antes de importar.  
10. **Investimentos v1**: posição/saldo consolidado; sem proventos/MTM no v1.
11. **Plano de contas**: 2 níveis (grupo > conta) + **tags livres**; CRUD com reordenação/merge; importação/exportação via CSV/Notion em etapas futuras.  
12. **Classificação**: regras (regex/contains/starts/ends) + IA (OpenAI). IA **sugere** e o usuário confirma;
    quando houver conflito, **regra do usuário vence**.  
13. **Prioridade de regras**: por **ordem manual** definida pelo usuário.  
14. **Aprendizado contínuo**: novas confirmações criam oportunidades de “gerar regra a partir da seleção”.  
15. **Recorrências**: criar/gerenciar lançamentos recorrentes; detectar padrões para sugestão.  
16. **Transferências entre contas**: heurística automática por descrição/valor em ±1 dia; usuário pode confirmar o par.  
17. **Estorno/chargeback**: transação vinculada à original para efeito líquido.  
18. **Parceladas**: registrar total e cronograma automático **e** permitir granularidade por parcela (configurável por caso); alocação em **caixa**, com lembretes futuros.  
19. **Dinheiro em espécie**: não suportar no v1.  
20. **Orçamento**: por centro + categoria; ajustes **manuais**; metas/cofrinhos por conta; forecast simples (média).  
21. **Alertas**: de orçamento a 80% e 100%; notificações por toast (canto inferior direito).  
22. **Dashboards**: DFC simplificado; Orçado vs. Realizado; evolução M/M; comparativos M/M e YTD; filtros por mês, conta, categoria, tag.  
23. **Tempo**: granularidade **mensal** no v1 (semana/diário entram depois).  
24. **Arquitetura**: Next.js (UI) + **Supabase** (Auth, Postgres, Storage, Edge Functions, Realtime, pg_cron) + Drizzle; ECharts; Lucide; logs (Supabase + locais). **SQLite** apenas como **cache offline**.  
25. **Conflitos de sync** (quando existir): last-write-wins (padrão simples).  
26. **Jobs**: cron local (agendador) para importações/rotinas; fila/edge functions ficam para versões futuras.  
27. **Segredos**: **Vault do Supabase** (OpenAI key e service role); no cliente apenas **anon key**. Keychain local apenas para o **lock local** do app.  
28. **Testes**: foco em unitários; meta de 60% de cobertura; smoke de importação.  
29. **Lançamento**: beta fechado com **1 usuário** (o próprio PO).  
30. **Pós-v1 prioritário**: 1) Mobile leitura/lançamentos rápidos; 2) Patrimônio total; 3) Open Finance BR + Supabase.

---

## 5. Análise de Arquivos Reais (CSV/OFX) e Orientações de Importação

> **Arquivos analisados** (amostras):  
> • `extrato bradesco agosto.csv` (bancário, separador **;**)  
> • `extrato bradesco agosto.ofx` (OFX 1.x, 18 registros)  
> • `aeternum agosto.csv` (cartão internacional, com `Valor(US$)` e `Valor(R$)`)  
> • `amex agosto.csv` (cartão; arquivo com cabeçalhos e seções; existe sumário com termos como “Taxa ao Ano/CET”)

### 5.1 Padrões observados e inferências
- **Separador**: muitos extratos brasileiros usam **ponto e vírgula (;)**; alguns usam **vírgula (,)** ou **tab**.
- **Cabeçalho com metadados**: linhas de banner, nome do cliente, período e observações **antes** do cabeçalho real; é necessário detectar a **linha correta de cabeçalho**.
- **Colunas típicas (Bradesco CSV)**: `Data`, `Histórico`, `Docto.`, `Crédito (R$)`, `Débito (R$)`, `Saldo (R$)`; pode existir coluna vazia “Unnamed”.
- **OFX**: registros `<STMTTRN>` com campos como `TRNTYPE`, `DTPOSTED`, `TRNAMT`, `FITID`, `NAME`, `MEMO`.
- **Cartões internacionais** (Aeternum/Amex): tabelas com **moeda original** e **valor convertido em BRL**; podem coexistir colunas de resumo do ciclo, juros (CET), limites etc. O que importa para **transações** são as linhas tabulares de lançamentos, não o cabeçalho/sumário.

### 5.2 Requisitos do Parser (v1)
1. **Detecção de cabeçalho**: heurística que encontra a primeira linha com pelo menos 3 separadores do mesmo tipo (ex.: `;`) e **colunas que pareçam nomes** (Data, Histórico, etc.).
2. **Tolerância a linhas inválidas**: pular linhas com campos a mais/menos (`on_bad_lines='skip'`) e alertar quantas foram descartadas (exibir na pré-visualização).
3. **Padronização de datas**: converter automaticamente para **`AAAA-MM-DD`** (ISO), com `dayfirst=True` quando detectar formato brasileiro.
4. **Normalização de valores**: tratar **decimal com vírgula**; criar coluna **`valor`**:
   - Bancário: `valor = crédito - débito` (um ou outro por linha).  
   - Cartão: `valor` em **BRL**; se houver `Valor(US$)`, persistir como `valor_original` + `moeda_original='USD'` e **taxa FX** (se disponível) ou inferir.
5. **Descrição**: a partir de `Histórico` (ou `NAME/MEMO` no OFX); remover múltiplos espaços e caracteres não informativos; manter conteúdo útil para regras (ex.: “UBER * TRIP HELP”).
6. **Conta/Instituição**: exigir que o usuário selecione **conta** ao importar (ex.: “Bradesco Corrente 21121-4”, “Amex final 09294”, “Aeternum final 3683”); gravar no registro importado.
7. **Deduplicação**: gerar `hash_dedupe = SHA256(date|value|normalized_description|account_id)` e marcar suspeitas antes de confirmar importação; permitir **merge**.
8. **Template por instituição**: salvar mapeamento detectado e **linha inicial do cabeçalho** para reutilização futura. Usuário pode corrigir e salvar novamente.

### 5.3 Mapeamentos propostos por instituição (v1)

#### 5.3.1 Bradesco (CSV “bancário”)
- **Separador**: `;`  
- **Colunas de origem**: `Data`, `Histórico`, `Docto.`, `Crédito (R$)`, `Débito (R$)`, `Saldo (R$)`  
- **Normalização**:
  - `data` ⇐ `Data` (converter `DD/MM/AAAA` → `AAAA-MM-DD`)  
  - `descricao` ⇐ `Histórico`  
  - `documento` ⇐ `Docto.` (opcional)  
  - `valor` ⇐ `Crédito (R$)` (positivo) **ou** `Débito (R$)` (negativo)  
  - `saldo_apos` ⇐ `Saldo (R$)`  
  - `tipo` = inferido (`crédito`/`débito`/`transferência`/`estorno`) por heurística (palavras-chave)  
  - `conta_id` = selecionada na UI (ex.: “Bradesco CC 21121-4”)  
  - `hash_dedupe` = SHA256(`data|valor|descricao_normalizada|conta_id`)

#### 5.3.2 Bradesco (OFX)
- **Campos**: `TRNTYPE`, `DTPOSTED`, `TRNAMT`, `FITID`, `NAME`, `MEMO`.  
- **Normalização**:
  - `data` ⇐ `DTPOSTED` (parse `YYYYMMDD` → ISO)  
  - `descricao` ⇐ `NAME` + `MEMO` (quando existir)  
  - `valor` ⇐ `TRNAMT` (float dot-decimal)  
  - `id_externo` ⇐ `FITID`  
  - `tipo` ⇐ `TRNTYPE` (mapear para domínio: `debit`, `credit`, `paymt`, etc.)  
  - `conta_id` selecionada na UI; `hash_dedupe` como acima.

#### 5.3.3 Aeternum (CSV, cartão com moeda original)
- **Colunas observadas (amostra)**: `Data`, `Histórico`, `Valor(US$)`, `Valor(R$)` (há possibilidade de colunas “Unnamed”).
- **Normalização**:
  - `data` ⇐ `Data`  
  - `descricao` ⇐ `Histórico`  
  - `valor` ⇐ `Valor(R$)` (sinal conforme débito/crédito; por padrão compras = negativo)  
  - `valor_original` ⇐ `Valor(US$)` (quando preenchido)  
  - `moeda_original` = `USD` (se houver `Valor(US$)`); gravar `fx_source='operadora_cartao'`  
  - `conta_id` = ex.: “Aeternum **** 3683”  
  - `hash_dedupe` conforme padrão.

#### 5.3.4 Amex (CSV, cartão)
- **Estrutura**: arquivo com grande cabeçalho e seções; detectar a **primeira linha tabular** com lançamentos.  
- **Colunas esperadas** (variantes comuns): `Data`, `Descrição`, `Moeda/Valor Original`, `Valor (R$)`, possivelmente `País`, `MCC`, etc.  
- **Normalização**:
  - Igual ao Aeternum: privilegiar `Valor (R$)` para `valor` e, quando existir, capturar `valor_original` + `moeda_original`.
  - Ignorar linhas de sumário do ciclo (ex.: CET, taxas, limites), mantendo apenas lançamentos.

> **Observação**: para **todos** os cartões, a estrutura de **parceladas** deve considerar: `parcela_n`, `parcelas_total`, `link_original_id` (quando possível), e `cronograma` gerado automaticamente.

### 5.4 Pré-visualização e confirmação de importação
- Ao importar, mostrar **tabela unificada** com colunas normalizadas (data, descrição, valor, tipo, conta, saldo_após/opcional) e destaques para:
  1. **Linhas inválidas** descartadas (contagem e botão “ver detalhes”).
  2. **Duplicatas suspeitas** (checklist para mesclar/ignorar).  
  3. **Detecção de transferência** (sugestões de pares com score; o usuário confirma).  
- Após confirmar, exibir **resumo**: N linhas importadas, M descartadas, K mescladas; tempo total.

---

## 6. Domínio de Dados e Esquema

### 6.1 Entidades e atributos essenciais
- **instituicao**: `id`, `nome`, `tipo` (banco/cartão/corretora), `created_at`.
- **conta**: `id`, `instituicao_id`, `apelido`, `tipo` (corrente, poupança, cartão, corretora), `moeda='BRL'`, `ativa`.
- **transacao**: `id`, `conta_id`, `data`, `descricao`, `valor`, `tipo`, `id_externo`, `saldo_apos`, `hash_dedupe`, `parcela_n`, `parcelas_total`, `link_original_id`, `valor_original`, `moeda_original`, `tags` (JSON array).
- **categoria**: `id`, `nome`, `tipo`, `grupo`, `pai_id` (para subcategorias), `icone`, `cor`, `ordem`, `ativa`.
- **tags_disponiveis**: `id`, `nome`, `cor`, `tipo` (sistema|customizada), `created_at`.
- **regra_classificacao**: `id`, `ordem`, `expressao`, `tipo_regra` (`regex|contains|starts|ends`), `categoria_id`, `tags`, `confianca_min`.
- **template_importacao**: `id`, `instituicao_id`, `mapeamento_json`, `header_idx`, `sep`, `exemplos`.
- **recorrencia**: `id`, `descricao`, `periodicidade`, `proximo_lanc`, `valor_est`.
- **orcamento**: `id`, `mes`, `categoria_id`, `valor_alvo`.
- **meta**: `id`, `nome`, `conta_id`, `valor_alvo`, `progresso`.
- **log_ia**: `id`, `ts`, `tarefa`, `modelo`, `tokens_in`, `tokens_out`, `custo_usd`, `score`, `detalhe`.
- **preferencias**: `id`, `moeda`, `fuso`, `modo_tema`, `limites_alerta` (80/100 por padrão).

### 6.2 Índices e chaves
- `transacao(hash_dedupe)`
- `transacao(conta_id, data)`
- `categoria(pai_id)` — para queries de subcategorias
- `categoria(ordem)` — para reordenação
- `tags_disponiveis(tipo)` — filtrar tags sistema vs customizadas
- `regra_classificacao(ordem)`
- `template_importacao(instituicao_id)`

### 6.3 Regras e integridade
- **Regra vence IA**: ao aplicar classificação, as regras explícitas são aplicadas **antes**; IA só entra quando não há match.
- **Dedupe imutável**: reprocessar importações **não** muda `hash_dedupe` de registros confirmados; duplicatas futuras terão merge.
- **Hierarquia de categorias**: Máximo 2 níveis de profundidade (Grupo > Categoria > Subcategoria). Campo `pai_id` NULL = categoria raiz.
- **Tags em transações**: Campo `tags` armazena JSON array de strings. Validação contra `tags_disponiveis` opcional (permite tags ad-hoc).
- **Integridade referencial**: Ao desativar categoria, manter transações vinculadas (não deletar). Merge de categorias atualiza `categoria_id` em todas as transações.
- **Coloração**: Cores em formato hex (#RRGGBB). Ícones podem ser emoji (Unicode) ou nome de ícone Lucide (string).

---

## 7. Fluxos Funcionais e Critérios de Aceite

### 7.1 F1 — Importação de arquivo
**Passos**:
1. Usuário clica **Importar** e seleciona instituição (ou cadastra nova) e tipo de conta (banco/cartão/corretora).  
2. Faz upload do arquivo; parser tenta detectar separador e linha de cabeçalho.  
3. UI mostra pré-visualização com colunas normalizadas e **linhas inválidas/duplicatas** sinalizadas.  
4. Usuário escolhe **conta** (ex.: “Bradesco CC 21121-4”) e confirma.  
5. Transações são persistidas; dedupe executado; resumo exibido.

**Aceite**:
- Importar CSV/OFX/Excel em UTF-8/Latin-1; tolerar cabeçalhos acima da tabela; permitir salvar template por instituição.
- Descartar linhas inválidas com relatório simples; dedupe >99% de duplicatas exatas.
- Tempo ≤ 2 min para 10k linhas.

### 7.2 F2 — Classificação de transações
**Passos**:
1. Aplicar **regras** do usuário na ordem definida (regex/contains/starts/ends).  
2. Sem match: **IA sugere** `{categoria, grupo, tags[], score, motivo}`.  
3. Usuário **confirma em massa** (com filtro por score) e pode **“criar regra”** a partir de uma seleção.  
4. Log de decisão salva (origem `regra` ou `IA`, score, motivo).

**Aceite**:
- ≥ 85% de cobertura com sugestão automática no 1º uso; melhoria para ≥ 90–95% com feedback.  
- Regras do usuário **sempre vencem** IA.  
- **Explicabilidade visível**: origem + motivo simples.

### 7.3 F3 — Orçamento e alertas
**Passos**:
1. Definir orçamento mensal por **centro + categoria** (setup rápido).  
2. Ajustes **manuais** ao longo do mês (indexação/sazonalidade ficam para v1.x).  
3. Alertas automáticos a **80%** e **100%**; toasts; resumo em “Saúde Financeira”.

**Aceite**:
- Configuração mensal em ≤ 5 min.  
- Alertas disparam no mês correto; painel Orçado vs. Realizado reflete imediatamente após confirmação de classificações.

### 7.4 F4 — Parceladas e estorno
**Passos**:
1. Ao marcar uma compra como parcelada, o sistema gera **cronograma** (n parcelas, datas).  
2. **Lembretes** de parcelas futuras aparecem no painel “Semana/Mês”.  
3. Estorno vincula à original para efeito líquido.

**Aceite**:
- Parcelas distribuídas corretamente nos meses; lembretes exibidos; efeito líquido com estorno refletido.

### 7.5 F5 — Custos de IA e desempenho
**Passos**:
1. Painel de custos mostra: **custo acumulado** no mês, custo por **tarefa** (classificação/insights/anomalias), **chamadas por dia**, **latência média** por lote e **alertas 80/100%** do teto.
2. Ao atingir 100%, **hard stop** por padrão; opção de override manual.

**Aceite**:
- Precisão do custo ±5% em comparação com dashboard da OpenAI.
- Alertas funcionam; bloqueio ao atingir o teto.

---

### 7.6 F6 — Gestão de Categorias e Subcategorias (Plano de Contas)
**Passos**:
1. Usuário acessa aba **"Categorias"** no menu principal.
2. Visualiza árvore hierárquica: Grupo > Categoria > Subcategoria (máximo 2 níveis).
3. Pode **criar**, **editar**, **reordenar** (drag-and-drop), **ativar/desativar** e **mesclar** categorias.
4. Atribui **ícone** (emoji ou Lucide) e **cor** customizada por categoria.
5. Vê estatísticas inline: nº de transações vinculadas, valor total, % do total de gastos.
6. Exporta/importa plano de contas como CSV para backup ou reutilização.

**Aceite**:
- Hierarquia respeitada (máximo 2 níveis de profundidade).
- Reordenação visual salva e refletida em todos os dashboards.
- Merge de categorias consolida histórico sem perda de dados.
- Exportação CSV inclui toda a hierarquia e metadados (ícone, cor, ordem).

---

### 7.7 F7 — Sistema de Tags para Transações
**Passos**:
1. Ao classificar uma transação, usuário pode adicionar **tags**: `essencial`, `importante`, `supérfluo`, `extraordinário`, `recorrente` (predefinidas).
2. Pode criar **tags customizadas** (ex.: "viagem", "presente", "trabalho").
3. Filtros em dashboards incluem seleção por tags (múltipla seleção).
4. Dashboard exibe **estatísticas por tag**: "% de gastos supérfluos", "Total em despesas essenciais".
5. Tags têm **cores** configuráveis para visualização rápida.

**Aceite**:
- Tags predefinidas disponíveis desde o primeiro uso.
- Criação de tags customizadas é intuitiva (input inline na interface de classificação).
- Filtros por tags funcionam em todos os dashboards relevantes.
- Estatísticas calculadas corretamente (agregação por tags em transações).

---

### 7.8 F8 — Relatórios de Tendência por Categoria
**Passos**:
1. Na aba **"Categorias"**, usuário seleciona uma categoria.
2. Sistema exibe **linha de tendência mensal** dos últimos 6-12 meses.
3. Drill-down: ao clicar em categoria pai, vê breakdown de **subcategorias**.
4. Comparativos **M/M** e **Y/Y** visíveis em cards.
5. Gráfico de **distribuição** (pizza + barras empilhadas) por subcategoria.
6. **Top 5 categorias** com maior variação (positiva ou negativa) destacadas.

**Aceite**:
- Gráficos renderizam em < 1s para 12 meses de dados.
- Drill-down funciona corretamente (categoria → subcategorias → transações).
- Comparativos M/M e Y/Y calculados com precisão.
- Top 5 atualiza dinamicamente conforme filtros aplicados.

---

### 7.9 F9 — Calendário de Gastos
**Passos**:
1. Usuário acessa aba **"Calendário"** no menu ou vê widget na Home.
2. Visualiza grade de calendário mensal com **heatmap** de intensidade de gastos por dia.
3. Coloração gradiente: **verde claro** (gastos baixos) → **vermelho escuro** (gastos altos).
4. Ao passar o mouse sobre um dia, vê **tooltip** com:
   - Valor total do dia
   - Breakdown por categoria (top 3)
   - Comparação com média diária do mês
5. Dias com gastos > 2x média são destacados com **ícone de alerta**.
6. Filtros: conta, categoria, tag, tipo (despesa/receita).

**Aceite**:
- Calendário carrega em < 1s para mês corrente.
- Tooltip exibe dados corretos e atualizados.
- Heatmap reflete intensidade de gastos com gradiente visualmente claro.
- Filtros funcionam e recalculam heatmap em tempo real.

---

### 7.10 F10 — Análise Temporal e Padrões de Gastos
**Passos**:
1. Na página **"Análise Temporal"**, usuário vê:
   - Gráfico de linha: **evolução diária de gastos** no mês.
   - Gráfico de barras: **gastos por dia da semana** (seg-dom).
   - Card: **"Dias da semana com maior volume"** (ex.: "Sextas: +30% acima da média").
   - Lista: **"Gastos recorrentes por dia do mês"** (ex.: "Dia 5: Netflix, dia 15: Academia").
2. Comparação de padrões **M/M**: mesmo dia em meses diferentes.
3. **Previsão simples**: "Próximos dias de alto gasto" baseada em histórico.

**Aceite**:
- Gráficos renderizam dados de até 12 meses em < 2s.
- Identificação de padrões semanais é precisa (baseada em estatísticas).
- Previsão de dias de alto gasto usa média móvel ou padrões históricos.
- Comparação M/M exibe dados alinhados por dia do mês.

---

## 8. UX/UI

### 8.1 Princípios
- **Densidade alta** (listas e tabelas compactas); foco em produtividade.  
- **Copy direta/objetiva**; evitar jargões sempre que possível.  
- **Navegação**: sidebar fixa à esquerda + header fino; busca global no topo.

### 8.2 Tema e paleta

Orientação consolidada em um único documento. Consulte:

- `docs/features/TEMA.md` — Tema — Orientação de UI (Dark, sólido)

### 8.3 Tipografia e ícones
- **Fonte**: Inter (títulos semibold, corpo regular).  
- **Ícones**: Lucide (traço fino, consistentes com densidade).  
- **Motion**: transições de 150–200ms, easing padrão; microinterações só quando somam.

### 8.4 Componentes e padrões
- Cards/KPIs: bg `--bg-card`, borda `1px solid var(--border)`, raio `--radius-lg`, sombra `--shadow-1`; ícone em pill 36px (`--bg-card-2`).
- Tabelas: cabeçalho `#162B26`; linhas `--bg-card` (hover `--hover`), zebra `--bg-card-2`; borda externa `--border`, canto `--radius-md`.
- Botões: primário `--accent` → hover `--accent-emph`; secundário `--bg-card-2` + `--border`; ghost `transparent` + texto `--link`; destrutivo `--error`.
- Inputs/Menus: campos com `--bg-card-2` e borda `--border`; dropdown com bg `--bg-card`, raio `--radius-md`, sombra `--shadow-2`.
- Sidebar: fundo `#111C1A`, borda direita `--border`; item ativo `--bg-card-2` com indicador `--accent`.
- Divisores/seções: `1px solid var(--divider)`; headers com H2 + descrição `--fg-muted`.
- Toasts: bg `--bg-card`, borda `--border`, sombra `--shadow-2`; ícone por status.
- Acessibilidade: foco com `outline: 2px solid var(--focus); outline-offset: 2px;`.
- Proibido: transparência (`opacity < 1` em superfícies), `backdrop-filter`, `blur`, `bg-opacity-*`.

### 8.5 Acessibilidade e atalhos
- Contraste mínimo AA (dark/light).  
- Atalhos: `/` (busca global), `G` (mês atual), `I` (importar), `B` (orçamento).

---

## 9. IA: Escopo, Custos e Explicabilidade

### 9.1 Casos de IA v1
- **Classificação de transações** (principal).  
- **Insights mensais** (resumo de variações e outliers).  
- **Detecção leve de anomalias** (valores atípicos, novos comerciantes recorrentes).

### 9.2 Estratégia de custo
- **Teto mensal**: **US$ 10**.  
- **Seleção de modelo automática** por tarefa/custo (modellight para classificação, premium sob critérios).  
- **Redução de custo**: cache de prompts; embeddings + regras antes do LLM; truncamento de contexto; limite de tokens por lote.

### 9.3 Explicabilidade e auditabilidade
- Em cada decisão, exibir **origem** (`regra` ou `IA`) e **motivo** (ex.: “regex `/^UBER/` encontrou ‘UBER DO BRASIL’”).  
- Log por transação em **`log_ia`** com **score** e campos essenciais (sem guardar dado sensível além do necessário).  
- Botão **“Rever com IA”**: reenvia apenas amostra/trecho necessário com hash de referência.

### 9.4 Critérios para elevar a modelo premium (configuráveis)
- `score < limiar_min` **e** (valor absoluto da transação > R$ X **ou** comerciante novo com recorrência potencial) **e** custo mensal < 80% do teto.

---

## 10. Arquitetura e Implementação

### 10.1 Stack
- **UI**: Next.js + React  
- **Back-end**: **Supabase** (Auth, Postgres, Storage, Edge Functions, Realtime, pg_cron) — **já conectado ao projeto** provisionado  
- **ORM**: Drizzle (migrações)  
- **Cache offline**: SQLite/OPFS (opcional)  
- **Gráficos**: ECharts  
- **Ícones**: Lucide  
- **Observabilidade**: logs do Supabase + logs locais; métricas simples de custo IA

### 10.2 Organização (monorepo)
```
/cortex-cash
  /apps
    /web              # Next.js (UI)
  /packages
    /db               # schema Drizzle (SQLite), migrações
    /services         # classificação, parser CSV/OFX, dedupe, regras, IA
    /etl              # importadores (mapeamentos por instituição)
    /ui               # componentes compartilhados (tabela, chips, chart wrappers)
```

### 10.3 Terminais (Cursor + Claude Code)
- **Terminal 1 – UI**: servidor Next.js (dev)  
- **Terminal 2 – API/Serviços**: watch + testes unitários de classificação/dedupe  
- **Terminal 3 – DB/Migrações**: gerar e aplicar migrações (Drizzle)  
- **Terminal 4 – ETL/Importação** (quando necessário): rodar import test com arquivos reais

### 10.4 Persistência e criptografia
- Base **SQLite** criptografada em repouso (biblioteca a definir no ambiente local).  
- Segredos (chaves de API): `.env` local + keychain do SO.

### 10.5 Conflitos e concorrência
- Como v1 é **single user** local, a concorrência é baixa; manter primitivo **last-write-wins**.  
- Se sincronização for habilitada no futuro (Supabase), revisar estratégia (CRDT por entidade crítica).

---

## 11. Regras de Negócio (detalhadas)

### 11.1 Classificação
- **Ordem de aplicação**: regras do usuário (na ordem definida) → IA (sugestão) → confirmação manual em massa.  
- **Tipos de regra**: `regex`, `contains`, `starts`, `ends`.  
- **Campos match**: `descricao` (normalizada), `valor` (faixa opcional), `conta_id` (opcional).  
- **Ações**: atribuir `categoria`, `grupo`, `tags[]`, (opcional) `centro`.

### 11.2 Transferências
- Heurística: transações com **mesmo valor** (sinal invertido quando aplicável), **descrição semelhante** e **±1 dia** entre contas distintas; sugerir par; usuário confirma.

### 11.3 Parceladas
- Registrar **total** e gerar **cronograma**; popular `parcelas_total`, `parcela_n` e `link_original_id`; alocação pelo **fluxo de caixa**; lembretes futuros.

### 11.4 Estornos
- Vincular à transação original; efeito líquido zero na categoria quando apropriado.

### 11.5 Dedupe
- `hash_dedupe = SHA256(date|value|normalized_description|account_id)`  
- Marcar duplicatas **antes** da confirmação; permitir merge/ignorar.

---

### 11.6 Gestão de Cartões de Crédito (v1.1)

**Objetivo**: oferecer controle completo de cartões (ciclos, faturas, parceladas, encargos, limites, câmbio, cartões adicionais) com conciliação automática com a conta de pagamento da fatura.

**Entidades adicionais**  
- **cartao_config**: `conta_id (FK conta)`, `bandeira` (Visa/Master/Amex/Outros), `emissor` (Bradesco/Inter/Santander/Aeternum/Amex), `dia_fechamento`, `dia_vencimento`, `limite_total`, `valor_minimo_rule` (ex.: 15%), `anuidade_mensal`, `iof_padrao` (cartão internacional), `cobranca_fatura` (débito automatico|manual), `cartao_principal_id` (para adicionais), `apelido`.
- **fatura**: `id`, `conta_id` (cartão), `ciclo_inicio`, `ciclo_fim`, `vencimento`, `status` (aberta|fechada|paga|em_atraso|cancelada), `valor_fechado`, `valor_minimo`, `juros`, `encargos`, `iof`, `creditos` (estornos/ajustes), `pagamento_tx_id` (FK `transacao` na conta pagadora), `nota`.
- **fatura_lancamento**: `id`, `fatura_id`, `transacao_id` (compra/estorno), `parcela_n`, `parcelas_total`, `moeda_original`, `valor_original`, `fx_rate`, `descricao_normalizada`.

> **Modelagem**: compras no cartão continuam sendo **transações** (`transacao`) da **conta tipo 'cartão'**; a tabela `fatura_lancamento` apenas vincula cada transação à fatura correta e guarda metadados de parceladas/câmbio.

**Fluxos**
- **F6 — Fechamento de fatura**: em `dia_fechamento`, consolidar lançamentos (`status=aberta → fechada`), calcular `valor_fechado`, `valor_minimo`, `juros/encargos` (quando houver), gerar **resumo** (cards: total, mínimo, IOF, juros).  
- **F7 — Pagamento de fatura**: detectar **pagamento** via transação na **conta bancária** com descrição similar (ex.: `PAGAMENTO FATURA AMEX`), valor e janela de datas (±3 dias do **vencimento**); vincular `pagamento_tx_id`; se parcial, marcar status `parcial` e recalcular encargos.  
- **F8 — Cartões adicionais**: `cartao_config.cartao_principal_id` permite agregar gastos de adicionais na fatura do titular, mantendo tags por portador (chip color).  
- **F9 — Limite e alertas**: calcular **utilização de limite** em tempo real (gastos do ciclo corrente / limite_total). **Alertas** em 70% e 90% (toast), com filtro para ocultar no mês.  
- **F10 — Parceladas**: registrar `parcelas_total`, `parcela_n` e `link_original_id`; cronograma automático; editar quando a operadora alterar; refletir no orçamento em **caixa**.  
- **F11 — Câmbio**: para lançamentos com `valor_original` e `moeda_original`, mostrar `fx_rate`; quando houver apenas `Valor(R$)`, manter origem “operadora do cartão”; `iof` padrão de cartão internacional opcional em `cartao_config`.

**Heurísticas de conciliação (pagamento)**
- **Match por valor**: `abs(valor)` igual ao `valor_fechado` ou ao `valor_minimo` (ou `valor_fechado` − créditos).  
- **Janela de datas**: `vencimento ± 3 dias`.  
- **Descrição**: tokens “FATURA”, “PAGTO”, “AMEX/BRADESCO/INTER/SANTANDER”, número final do cartão.  
- **Prioridade**: se múltiplos matches, priorizar a transação com descrição mais similar e data mais próxima do vencimento.

**Critérios de aceite (cartões)**
- Configurar `fechamento/vencimento` por cartão e ver fatura corrente/anterior.  
- Detectar pagamento automático e conciliar com a fatura; permitir ajuste manual.  
- Suportar parceladas com cronograma e edição.  
- Alertar 70%/90% do limite; exibir **limite disponível**.  
- Tratar lançamentos internacionais com `valor_original`, `moeda_original` e exibir `fx_rate`/`iof` quando houver.

**Dashboards específicos**  
- Card **Utilização de limite**; gráfico de **gastos por categoria** no ciclo; lista de **Top Merchants** do mês; **projeção de fatura** até o fechamento.

---

## 12. Dashboards e Relatórios

### 12.1 Painel principal (Home)
- **Saldo por conta** (cards)
- **DFC simplificado** (Entradas – Saídas por mês)
- **Orçado vs. Realizado** (barra/linha)
- **Evolução M/M** (linha)
- **Próximos lançamentos** (recorrências/parcelas)
- **Top 5 despesas** (lista)
- **Widget Calendário do Mês** (mini heatmap — v0.4)

### 12.2 Saúde Financeira
- **Poupança/Receita (%)**, **Burn**, **Runway**
- **Índice de dívidas** (cartões/receitas)

### 12.3 Categorias e Plano de Contas (v0.2)
- **Árvore hierárquica** de categorias e subcategorias
- **Gráfico de distribuição** (pizza + barras empilhadas)
- **Linha de tendência** por categoria (últimos 6-12 meses)
- **Drill-down**: categoria → subcategorias → transações individuais
- **Top 5 categorias** com maior variação M/M
- **Estatísticas por tag**: % de gastos por tipo (essencial, supérfluo, etc.)
- **Ferramentas**: criar, editar, reordenar, mesclar, ativar/desativar categorias
- **Exportação/importação** do plano de contas (CSV)

### 12.4 Calendário e Análise Temporal (v0.4)
- **Calendário mensal** com heatmap de intensidade de gastos por dia
- **Gráfico de evolução diária** (linha temporal)
- **Análise semanal**: gastos por dia da semana (seg-dom)
- **Identificação de padrões**: "Sextas têm +30% mais gastos"
- **Gastos recorrentes** por dia do mês (ex.: sempre dia 5 e 15)
- **Comparação M/M**: mesmo dia em meses diferentes
- **Previsão de dias de alto gasto** baseada em histórico
- **Filtros**: conta, categoria, tag, tipo (despesa/receita)

### 12.5 Filtros Gerais
- Mês (obrigatório), Conta, Categoria, Tag, busca por texto.
- **Filtros avançados por tags** (múltipla seleção)
- Tipo de transação (receita/despesa/transferência)

### 12.6 Exportação
- **CSV/Excel** no v1 (relatórios padrão).
- **Exportação de plano de contas** (CSV com hierarquia completa)
- PDF/JSON em v1.x.

---

## 13. Segurança, Privacidade e Backups

- **Login** com senha local (bloqueio do app).  
- **Criptografia local** dos dados.  
- **Sem telemetria** por padrão; eventual opt-in futuro.  
- **Backups** locais agendados (criptografados) e exportáveis on-demand.

---

## 14. Testes e Qualidade

### 14.1 Testes mínimos
- **Unitários** (60% cobertura): parser CSV/OFX, normalização de datas/valores, dedupe, aplicação de regras e ordenação, geração de cronograma de parceladas.  
- **Smoke de importação**: importar amostras dos 4 arquivos analisados; verificar shape e colunas esperadas; tempo total.

### 14.2 Dados de teste
- **CSV/OFX amostrais** anonimizados, com cenários: duplicatas, transferências, parceladas, estorno e moeda estrangeira.

### 14.3 Observabilidade
- Logs estruturados locais; registrar **latência** por lote de classificação e **custo** por tarefa de IA.

---

## 15. Roadmap e Cronograma (4 semanas)

> **Objetivo**: ter o beta fechado rodando, com importação confiável, classificação assistida e dashboards essenciais.

**Semana 1**  
- Estrutura monorepo; setup Next.js; pacotes `db`, `services`, `etl`, `ui`.  
- Drizzle + SQLite; schema inicial e migrações.  
- Layout base (sidebar + header), tema/cores, Inter/Lucide.  
- Tela “Importar” (upload + detecção de cabeçalho + preview básica).  

**Semana 2**  
- Parser tolerante (CSV/OFX), normalização de **datas/valores**, dedupe; templates por instituição.  
- Fluxo de confirmação (linhas inválidas/duplicatas).  
- Painel de **custos IA** (estrutura de logs e UI básica).  

**Semana 3**  
- Classificação (regras + IA com sugestão + explicabilidade).  
- Recorrências e parceladas (cronograma e lembretes).  
- Estorno vinculado.  

**Semana 4**  
- Dashboards: DFC, Orçado vs. Realizado, Evolução M/M, Saúde Financeira.  
- Alertas 80%/100%; toasts.  
- Testes unit e smoke; hardening; empacotamento PWA/atalho.

**Pós-v1**  
1) Mobile leitura/lançamentos  
2) Patrimônio total  
3) Open Finance + Supabase (sync)  
4) Comparativos avançados (Y/Y, rolling 3/6/12) e vistas salvas  
5) Export PDF/JSON

---

## 16. Riscos e Mitigações

- **Variação de layouts de extratos**: mitigado por **assistente de mapeamento**, `header_idx`, `sep` e templates por instituição.  
- **Linhas problemáticas** em CSV (separadores em descrição): `on_bad_lines='skip'` + relatório e opção de revisão manual.  
- **Custo de IA**: teto mensal + cache/embeddings; alertas a 80/100% e bloqueio automático.  
- **Desempenho em arquivos grandes**: streaming/lotização de import; indexação mínima; estruturas enxutas.  
- **Persistência local (quota)**: usar IndexedDB/OPFS; monitorar uso e exibir aviso quando próximo do limite; exportar backup.  
- **Complexidade de parceladas**: testes explícitos; UI simples para revisão de cronogramas.

---

## 17. Especificações Detalhadas (Anexos)

### 17.1 Esquema SQL (resumo)
```sql
-- contas e instituições
CREATE TABLE instituicao (
  id TEXT PRIMARY KEY, nome TEXT, tipo TEXT, created_at TEXT
);
CREATE TABLE conta (
  id TEXT PRIMARY KEY, instituicao_id TEXT, apelido TEXT, tipo TEXT,
  moeda TEXT DEFAULT 'BRL', ativa INTEGER DEFAULT 1,
  FOREIGN KEY(instituicao_id) REFERENCES instituicao(id)
);

-- transações
CREATE TABLE transacao (
  id TEXT PRIMARY KEY,
  conta_id TEXT,
  data TEXT,
  descricao TEXT,
  valor REAL,
  tipo TEXT,
  id_externo TEXT,
  saldo_apos REAL,
  hash_dedupe TEXT,
  parcela_n INTEGER,
  parcelas_total INTEGER,
  link_original_id TEXT,
  valor_original REAL,
  moeda_original TEXT,
  FOREIGN KEY(conta_id) REFERENCES conta(id)
);
CREATE INDEX idx_tx_hash ON transacao(hash_dedupe);
CREATE INDEX idx_tx_conta_data ON transacao(conta_id, data);

-- classificação
CREATE TABLE categoria (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- receita|despesa|transferencia
  grupo TEXT,
  pai_id TEXT, -- FK para categoria pai (subcategorias)
  icone TEXT, -- emoji ou nome do ícone Lucide
  cor TEXT, -- hex color
  ordem INTEGER DEFAULT 0,
  ativa INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY(pai_id) REFERENCES categoria(id)
);
CREATE INDEX idx_categoria_pai ON categoria(pai_id);
CREATE INDEX idx_categoria_ordem ON categoria(ordem);

CREATE TABLE tags_disponiveis (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT, -- hex color
  tipo TEXT NOT NULL, -- sistema|customizada
  created_at TEXT
);
CREATE INDEX idx_tags_tipo ON tags_disponiveis(tipo);
CREATE TABLE regra_classificacao (
  id TEXT PRIMARY KEY,
  ordem INTEGER,
  expressao TEXT,
  tipo_regra TEXT,
  categoria_id TEXT,
  tags TEXT,
  confianca_min REAL DEFAULT 0.7
);

-- importação
CREATE TABLE template_importacao (
  id TEXT PRIMARY KEY,
  instituicao_id TEXT,
  mapeamento_json TEXT,
  header_idx INTEGER,
  sep TEXT,
  exemplos TEXT
);

-- orçamento e metas
CREATE TABLE orcamento (
  id TEXT PRIMARY KEY, mes TEXT, categoria_id TEXT, valor_alvo REAL
);
CREATE TABLE meta (
  id TEXT PRIMARY KEY, nome TEXT, conta_id TEXT, valor_alvo REAL, progresso REAL
);

-- recorrências
CREATE TABLE recorrencia (
  id TEXT PRIMARY KEY, descricao TEXT, periodicidade TEXT, proximo_lanc TEXT, valor_est REAL
);

-- IA
CREATE TABLE log_ia (
  id TEXT PRIMARY KEY, ts TEXT, tarefa TEXT, modelo TEXT,
  tokens_in INTEGER, tokens_out INTEGER, custo_usd REAL, score REAL, detalhe TEXT
);
```

### 17.2 DSL de Regras (exemplos)
- `contains:"UBER" -> categoria: Transporte, tags:[ride]`  
- `starts:"IFOOD" -> categoria: Alimentação, tags:[delivery]`  
- `regex:"^AMAZON\\s+MARKETPLACE" -> categoria: Compras`  
- `contains:"SPOTIFY" -> categoria: Assinaturas`  
- `contains:"NETFLIX" -> categoria: Assinaturas`  
- `contains:"DET. JUROS" -> categoria: Financeiro/Juros`  
- `contains:"PIX" AND valor>1000 -> categoria: Transferências`  

> **Nota**: as 3 exceções (lista negra) podem ser registradas como
> `never:"TERM_X" -> categoria:Y` para bloquear colisões.

### 17.3 Heurísticas de Transferência
- **Igualdade de valor** (absoluto) + descrições similares (normalizadas) + **Δ data ≤ 1 dia**  
- Penalizar correspondências entre a **mesma conta**.  
- Pontuar fortemente pares **cartão → conta** na data de pagamento da fatura.

### 17.4 Algoritmo de Dedupe (pseudocódigo)
```
normalized_description = normalize(descricao)
key = f"{data}|{valor}|{normalized_description}|{conta_id}"
hash = SHA256(key)
if exists(hash):
  marcar como duplicata e sugerir merge
```

### 17.5 Política de Parceladas
- **Registro**: `parcelas_total`, `parcela_n`, `link_original_id`  
- **Cronograma**: datas mensais previstas; lembretes iniciam no próximo período  
- **Alterações**: permitir editar cronograma quando a operadora alterar (recalcular)

### 17.6 Painel de Custos de IA (campos)
- `custo_total_mes_usd`  
- `custo_por_tarefa` (classificação/insights/anomalias)  
- `chamadas_por_dia`  
- `latencia_media_ms_por_lote`  
- **Alertas**: 80% / 100%

---

## 18. Conteúdo e Copy (exemplos)

- **Empty state Home**: "Comece importando seus extratos.
  **Importar dados** abre o assistente e salva seu template para a próxima vez."
- **Importação (título)**: "Aponte o arquivo e deixe o Cortex Cash fazer o trabalho pesado."
- **Classificação (tooltip)**: "Regras sempre têm prioridade. Use 'Criar regra a partir desta seleção' para ensinar o sistema."
- **Orçamento (alerta 80%)**: "Você atingiu 80% do orçamento de *Alimentação* neste mês."
- **IA (custo)**: "Você atingiu 80% do limite mensal de IA (US$ 8/US$ 10). Reduza o uso ou confirme override."

---

## 19. Itens Abertos para a Próxima Iteração

1. **Categorias iniciais e metas** (serão configuradas dentro do app; manter seeds genéricas).  
2. **Critérios de elevação para modelo premium** (definir valores padrão para limiares).  
3. **Códigos hex da paleta** (travar as variações de verde-acqua e cinzas para dark/light).  
4. **Regras seed** com base em exemplos reais do usuário (enviar 10 descrições típicas).  
5. **Mostrar/ocultar `saldo_apos`** por padrão nas tabelas (preferência global).

---

## 20. Guia de Execução (Cursor + Claude Code)

### 20.1 Setup inicial
1. Criar monorepo `cortex-cash` com `apps/web` (Next) e `packages/{db,services,etl,ui}`.
2. Configurar Drizzle + SQLite; definir schema e migrações.
3. Criar base de UI (sidebar/header), tema, tokens de cor e tipografia.
4. Implementar tela de **Importação** com upload, detecção de header+sep, preview e salvamento de **template**.

### 20.2 Terminais
- **T1 (UI)**: `pnpm dev --filter @cortex/web`  
- **T2 (Serviços)**: `pnpm --filter @cortex/services test --watch`  
- **T3 (DB)**: `pnpm --filter @cortex/db drizzle:generate && drizzle:push`  
- **T4 (ETL)**: `pnpm --filter @cortex/etl dev` (rodar import com arquivos de exemplo)

### 20.3 Ordens de implementação (micro)
- Parser tolerante → Dedupe → Templates → Classificação (regras) → Classificação (IA) → Parceladas/Recorrências → Dashboards → Orçamento/Alertas → Painel de custo IA → Polimento/Tests.

---

## 21. Considerações de Implementação: Categorias, Tags e Calendário

### 21.1 Gestão de Categorias e Subcategorias

**Estrutura de dados**:
- Campo `pai_id` em `categoria` permite hierarquia recursiva
- Máximo 2 níveis enforced via lógica de aplicação (validação em create/update)
- Query de subcategorias: `SELECT * FROM categoria WHERE pai_id = ?`
- Query de categorias raiz: `SELECT * FROM categoria WHERE pai_id IS NULL`

**Reordenação (drag-and-drop)**:
- Campo `ordem` define posição visual
- Ao reordenar, atualizar `ordem` em lote (transaction)
- Ordenação padrão em queries: `ORDER BY ordem ASC, nome ASC`

**Merge de categorias**:
```sql
-- Exemplo de merge: categoria B → categoria A
UPDATE transacao SET categoria_id = 'A' WHERE categoria_id = 'B';
UPDATE orcamento SET categoria_id = 'A' WHERE categoria_id = 'B';
UPDATE regra_classificacao SET categoria_id = 'A' WHERE categoria_id = 'B';
UPDATE categoria SET ativa = 0 WHERE id = 'B';
```

**Exportação CSV**:
- Incluir colunas: `id`, `nome`, `tipo`, `grupo`, `pai_id`, `icone`, `cor`, `ordem`, `ativa`
- Respeitar hierarquia (exportar pais antes de filhos)
- Importação: validar `pai_id` existe antes de criar subcategoria

### 21.2 Sistema de Tags

**Tags predefinidas (seed)**:
```sql
INSERT INTO tags_disponiveis (id, nome, cor, tipo) VALUES
  ('tag_essencial', 'Essencial', '#10b981', 'sistema'),
  ('tag_importante', 'Importante', '#3b82f6', 'sistema'),
  ('tag_superfluo', 'Supérfluo', '#ef4444', 'sistema'),
  ('tag_extraordinario', 'Extraordinário', '#f59e0b', 'sistema'),
  ('tag_recorrente', 'Recorrente', '#8b5cf6', 'sistema');
```

**Armazenamento em transações**:
- Campo `tags` (TEXT) armazena JSON array: `["essencial", "recorrente"]`
- Parse/stringify em services (Dexie.js + Zod validation)
- Query por tag: `WHERE tags LIKE '%"essencial"%'` (basic) ou JSON functions (Dexie/IndexedDB)

**Filtros avançados**:
- Multi-select de tags: `tags.some(t => selectedTags.includes(t))`
- Estatísticas: agregação client-side (Dexie queries + reduce)

### 21.3 Calendário de Gastos

**Cálculo de heatmap**:
```typescript
// Pseudocódigo
const transacoesMes = await db.transacoes
  .where('data')
  .between(startOfMonth, endOfMonth)
  .toArray();

const gastosPorDia = transacoesMes.reduce((acc, tx) => {
  const dia = format(tx.data, 'yyyy-MM-dd');
  acc[dia] = (acc[dia] || 0) + Math.abs(tx.valor);
  return acc;
}, {});

// Calcular gradiente (percentis ou min-max)
const valores = Object.values(gastosPorDia);
const max = Math.max(...valores);
const min = Math.min(...valores);
// Coloração: interpolate entre verde (#10b981) e vermelho (#ef4444)
```

**Performance**:
- Índice composto: `transacao(data, tipo)` para filtros rápidos
- Cache de agregações diárias (opcional v1.x)
- Lazy loading: carregar apenas mês visível

**Padrões semanais**:
```typescript
// Agrupar por dia da semana
const gastosPorDiaSemana = transacoesMes.reduce((acc, tx) => {
  const diaSemana = format(tx.data, 'EEEE', { locale: ptBR });
  acc[diaSemana] = (acc[diaSemana] || []).concat(tx.valor);
  return acc;
}, {});

// Calcular média e identificar outliers
const mediaSemanal = Object.entries(gastosPorDiaSemana).map(([dia, valores]) => ({
  dia,
  media: valores.reduce((a, b) => a + b, 0) / valores.length,
  total: valores.reduce((a, b) => a + b, 0),
}));
```

### 21.4 Integração com Banco de Dados Atual

**Migrações necessárias**:
1. Adicionar campos à tabela `categoria`: `pai_id`, `icone`, `cor`
2. Criar tabela `tags_disponiveis`
3. Seed de tags predefinidas
4. Atualizar `transacoes.tags` (já existe, mas garantir formato JSON array)

**Compatibilidade retroativa**:
- Categorias existentes: `pai_id = NULL` (categorias raiz)
- Transações sem tags: `tags = '[]'` ou NULL
- Ordem padrão: categorias sem `ordem` recebem valor incremental na migração

### 21.5 Componentes UI Sugeridos

**Categorias**:
- `CategoryTree` (recursive component com drag-and-drop)
- `CategoryForm` (CRUD com color picker e icon selector)
- `CategoryMergeDialog` (seleção de categoria destino + confirmação)
- `CategoryTrendChart` (Recharts line chart com drill-down)

**Tags**:
- `TagInput` (multi-select com autocomplete)
- `TagBadge` (pill component colorido)
- `TagStatsCard` (agregação por tag com percentual)

**Calendário**:
- `CalendarHeatmap` (grid 7x5 com células coloridas)
- `DailyTrendChart` (line chart diário)
- `WeeklyPatternChart` (bar chart seg-dom)

---

## 22. Conclusão

**Cortex Cash** nasce para ser **rápido**, **confiável** e **prático** no que importa: importar, classificar, orçar e decidir. O v1 entrega o essencial com qualidade: importação tolerante e reutilizável, classificação transparente (regras + IA sob controle e custo limitado), dashboards que fazem sentido para o fechamento mensal e um foco real em disciplina orçamentária. O terreno fica preparado para evoluir sem refazer fundamentos: adicionar mobile, patrimônio total e Open Finance quando o núcleo estiver sólido.

**Novas funcionalidades v0.2-0.4**: O sistema de categorias hierárquico, tags para transações e calendário de gastos fortalecem a capacidade analítica do usuário, permitindo maior granularidade na classificação e identificação de padrões temporais sem comprometer a simplicidade do produto.

> Este documento é auto-suficiente para o desenvolvimento: não depende de qualquer "código de alternativa" (como 67B). Todas as decisões estão explicitadas em texto claro e operacional.

