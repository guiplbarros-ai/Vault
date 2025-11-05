# Estratégia de Versionamento - Cortex Cash

## Visão Geral

O Cortex Cash será desenvolvido em versões incrementais, começando com armazenamento local simples (v0.1) e evoluindo para uma arquitetura multi-usuário com Supabase (v1). Este documento define claramente o que entra em cada versão e como a arquitetura evolui.

---

## Princípios de Evolução

1. **Dados primeiro**: A estrutura de dados deve ser pensada desde o início para suportar evolução
2. **Migração suave**: Cada versão deve permitir migração dos dados da versão anterior
3. **Sem breaking changes**: Mudanças devem ser aditivas, não destrutivas
4. **Progressive enhancement**: Funcionalidades novas não quebram funcionalidades antigas

---

## v0.1 - MVP Local (4 semanas)

### Objetivo
Aplicação funcional para **1 usuário**, armazenamento **local apenas**, sem autenticação, foco em importação e visualização básica.

### Escopo Funcional

#### ✅ Incluído
- **Importação**
  - Upload manual de CSV/OFX
  - Parser tolerante com detecção de cabeçalho
  - Preview de dados antes de importar
  - Dedupe básico por hash
  - Salvar template de mapeamento (localStorage)

- **Contas**
  - CRUD de instituições
  - CRUD de contas (banco, cartão, investimento)
  - Seleção de conta na importação

- **Transações**
  - Listagem com filtros básicos (data, conta)
  - Busca por texto
  - Visualização de detalhes

- **Dashboards Básicos**
  - Cards de saldo por conta
  - Lista de últimas transações
  - Gráfico simples de entradas vs saídas (mês atual)

- **Armazenamento**
  - SQLite local (via sql.js ou similar)
  - Dados persistidos no navegador (IndexedDB)
  - Sem criptografia (v0.1 foca em funcionalidade)

#### ❌ Fora do Escopo
- Autenticação/login
- Classificação automática (regras ou IA)
- Orçamento
- Recorrências/parceladas
- Sincronização/nuvem
- Multi-dispositivo
- RLS ou controle de acesso
- Criptografia

### Arquitetura de Dados v0.1

```typescript
// Estrutura simplificada - local apenas

interface Instituicao {
  id: string;              // UUID
  nome: string;            // "Bradesco", "Inter", etc.
  tipo: 'banco' | 'cartao' | 'corretora';
  created_at: string;      // ISO timestamp
}

interface Conta {
  id: string;
  instituicao_id: string;
  apelido: string;         // "Bradesco CC 21121-4"
  tipo: 'corrente' | 'poupanca' | 'cartao' | 'investimento';
  moeda: string;           // "BRL"
  ativa: boolean;
  saldo_atual?: number;    // Calculado ou manual
  created_at: string;
}

interface Transacao {
  id: string;
  conta_id: string;
  data: string;            // YYYY-MM-DD
  descricao: string;
  valor: number;           // Positivo = entrada, Negativo = saída
  tipo?: string;           // 'credito', 'debito', 'transferencia'
  id_externo?: string;     // FITID do OFX ou ref externa
  saldo_apos?: number;     // Saldo após a transação (se disponível)
  hash_dedupe: string;     // SHA256(data|valor|descricao|conta_id)

  // Campos para evolução futura (null em v0.1)
  categoria_id?: string | null;
  centro_id?: string | null;
  tags?: string[] | null;

  created_at: string;
  updated_at: string;
}

interface TemplateImportacao {
  id: string;
  instituicao_id: string;
  nome: string;            // "Bradesco CSV Padrão"
  tipo_arquivo: 'csv' | 'ofx' | 'excel';
  config: {
    separador?: string;    // ";" para CSV
    encoding?: string;     // "ISO-8859-1"
    header_row?: number;   // Linha do cabeçalho (0-indexed)
    skip_rows?: number;    // Linhas para pular no início
    mapeamento: {
      data: string;        // Nome da coluna de data
      descricao: string;   // Nome da coluna de descrição
      valor?: string;      // Se houver coluna única de valor
      credito?: string;    // Ou colunas separadas
      debito?: string;
      saldo?: string;
      documento?: string;
    };
  };
  created_at: string;
}

// Estado global da aplicação (localStorage)
interface AppState {
  versao: '0.1';
  inicializado: boolean;
  ultima_importacao?: string;
  preferencias: {
    moeda_padrao: 'BRL';
    formato_data: 'DD/MM/YYYY';
  };
}
```

### Stack Técnica v0.1

- **Frontend**: Next.js 14 + React
- **Estado**: Zustand ou Context API
- **Banco Local**: sql.js (SQLite em WASM) ou Dexie.js (IndexedDB)
- **UI**: Tailwind + shadcn/ui + Lucide icons
- **Charts**: Recharts (mais simples que ECharts para começar)
- **Build**: Vercel (deploy estático)

### Telas v0.1

1. **Home** - Dashboard com cards de saldo e últimas transações
2. **Importar** - Upload de arquivo + preview + confirmação
3. **Transações** - Lista com filtros
4. **Contas** - Gerenciar contas
5. **Configurações** - Preferências básicas

### Entregáveis v0.1

- [ ] Aplicação rodando localmente
- [ ] Importar Bradesco CSV
- [ ] Importar Bradesco OFX
- [ ] Dedupe funcional
- [ ] Templates salvos
- [ ] Dashboard básico
- [ ] Documentação de uso

---

## v0.2 - Classificação Manual (2 semanas)

### Objetivo
Adicionar sistema de categorias e classificação manual de transações.

### Novas Funcionalidades

- **Categorias**
  - Estrutura hierárquica (Grupo > Categoria)
  - CRUD de categorias
  - Categorias padrão seed (Alimentação, Transporte, etc.)

- **Classificação Manual**
  - Atribuir categoria a transação
  - Tags livres
  - Edição em massa (selecionar múltiplas transações)

- **Dashboards Melhorados**
  - Gastos por categoria (pizza/barras)
  - Evolução M/M básica
  - Filtros por categoria

### Novos Modelos de Dados

```typescript
interface Categoria {
  id: string;
  grupo: string;           // "Essenciais", "Estilo de Vida", etc.
  nome: string;            // "Alimentação", "Transporte"
  cor?: string;            // Cor hex para UI
  icone?: string;          // Nome do ícone Lucide
  ativa: boolean;
  ordem: number;           // Para ordenação customizada
  created_at: string;
}

// Transacao ganha campos preenchidos:
// - categoria_id (antes null)
// - tags (antes null)
```

### Entregáveis v0.2

- [ ] Sistema de categorias funcional
- [ ] Classificação manual em massa
- [ ] Dashboard por categoria
- [ ] Export CSV de transações classificadas

---

## v0.3 - Regras e IA (3 semanas)

### Objetivo
Classificação automática usando regras do usuário + IA (OpenAI).

### Novas Funcionalidades

- **Regras de Classificação**
  - Criar regras (regex, contains, starts, ends)
  - Ordem de prioridade
  - Preview de matches antes de aplicar

- **IA Classificação**
  - Integração OpenAI (GPT-4o-mini para custo baixo)
  - Sugestões de categoria com score
  - Confirmação em massa
  - Log de custo e uso

- **Painel de IA**
  - Custo mensal acumulado
  - Alertas em 80% e 100% do teto (US$ 10)
  - Latência média por lote

### Novos Modelos de Dados

```typescript
interface RegraClassificacao {
  id: string;
  nome: string;
  ordem: number;           // Prioridade (menor = maior prioridade)
  ativa: boolean;

  // Condições
  tipo_regra: 'regex' | 'contains' | 'starts_with' | 'ends_with';
  expressao: string;
  campo_match: 'descricao' | 'valor';
  valor_min?: number;      // Para regras de valor
  valor_max?: number;

  // Ações
  categoria_id: string;
  tags?: string[];

  // Metadados
  matches_count: number;   // Quantas vezes aplicou
  created_at: string;
  updated_at: string;
}

interface LogIA {
  id: string;
  timestamp: string;
  tarefa: 'classificacao' | 'insights' | 'anomalias';
  modelo: string;          // "gpt-4o-mini"
  tokens_entrada: number;
  tokens_saida: number;
  custo_usd: number;
  latencia_ms: number;

  // Contexto
  transacoes_processadas?: number;
  score_medio?: number;

  // Resultado
  sucesso: boolean;
  erro?: string;
}

// Transacao ganha campos:
interface Transacao {
  // ... campos anteriores

  classificacao_origem?: 'manual' | 'regra' | 'ia';
  classificacao_regra_id?: string;
  classificacao_score?: number;      // Score da IA (0-1)
  classificacao_explicacao?: string; // "Regex /UBER/ encontrou..."
}
```

### Entregáveis v0.3

- [ ] Motor de regras funcional
- [ ] Classificação com IA
- [ ] Painel de custo IA
- [ ] Explicabilidade (origem da classificação)

---

## v1.0 - Multi-usuário + Supabase (4 semanas)

### 🎯 Objetivo Principal
Migrar de local-only para arquitetura cliente-servidor com **Supabase**, suportando **múltiplos usuários** com autenticação e **Row Level Security (RLS)**.

### Grandes Mudanças Arquiteturais

#### 1. Autenticação
- **Supabase Auth**
  - Login com email/senha
  - Magic link (opcional)
  - OAuth (Google, GitHub) em v1.1

#### 2. Banco de Dados
- **Migração**: SQLite local → PostgreSQL (Supabase)
- **RLS**: Todas as tabelas com políticas de acesso
- **user_id**: Adicionado a todas as entidades principais

#### 3. Arquitetura Híbrida
- **Supabase como source of truth**
- **Cache local opcional** (SQLite/IndexedDB para offline)
- **Sync bidirecional** (quando reconectar)

### Schema v1 - Supabase Postgres

```sql
-- Habilitar RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Tabela de perfis (estende auth.users)
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  preferencias JSONB DEFAULT '{
    "moeda_padrao": "BRL",
    "formato_data": "DD/MM/YYYY",
    "tema": "dark"
  }'::jsonb,
  plano TEXT DEFAULT 'free', -- 'free', 'pro' (futuro)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para perfis
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprio perfil"
  ON perfis FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON perfis FOR UPDATE
  USING (auth.uid() = id);

-- Instituições (agora por usuário)
CREATE TABLE public.instituicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('banco', 'cartao', 'corretora')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE instituicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem apenas suas instituições"
  ON instituicoes FOR ALL
  USING (auth.uid() = user_id);

-- Contas
CREATE TABLE public.contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instituicao_id UUID NOT NULL REFERENCES instituicoes(id) ON DELETE CASCADE,

  apelido TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('corrente', 'poupanca', 'cartao', 'investimento')),
  moeda TEXT DEFAULT 'BRL',
  ativa BOOLEAN DEFAULT true,
  saldo_atual DECIMAL(15,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem apenas suas contas"
  ON contas FOR ALL
  USING (auth.uid() = user_id);

-- Transações
CREATE TABLE public.transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_id UUID NOT NULL REFERENCES contas(id) ON DELETE CASCADE,

  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  tipo TEXT,

  id_externo TEXT,
  saldo_apos DECIMAL(15,2),
  hash_dedupe TEXT NOT NULL,

  -- Classificação
  categoria_id UUID REFERENCES categorias(id),
  centro_id UUID REFERENCES centros(id),
  tags TEXT[],

  classificacao_origem TEXT CHECK (classificacao_origem IN ('manual', 'regra', 'ia')),
  classificacao_regra_id UUID REFERENCES regras_classificacao(id),
  classificacao_score DECIMAL(3,2),
  classificacao_explicacao TEXT,

  -- Parcelamento (v1.1)
  parcela_n INTEGER,
  parcelas_total INTEGER,
  link_original_id UUID REFERENCES transacoes(id),

  -- Câmbio (v1.1)
  valor_original DECIMAL(15,2),
  moeda_original TEXT,
  taxa_cambio DECIMAL(10,4),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices importantes
CREATE INDEX idx_transacoes_user_data ON transacoes(user_id, data DESC);
CREATE INDEX idx_transacoes_conta ON transacoes(conta_id);
CREATE INDEX idx_transacoes_hash ON transacoes(hash_dedupe);
CREATE INDEX idx_transacoes_categoria ON transacoes(categoria_id);

ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem apenas suas transações"
  ON transacoes FOR ALL
  USING (auth.uid() = user_id);

-- Categorias (compartilhadas + customizadas)
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = categoria padrão do sistema

  grupo TEXT NOT NULL,
  nome TEXT NOT NULL,
  cor TEXT,
  icone TEXT,
  ativa BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  is_sistema BOOLEAN DEFAULT false, -- true para categorias seed

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, grupo, nome) -- Previne duplicatas por usuário
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem categorias do sistema e próprias"
  ON categorias FOR SELECT
  USING (is_sistema = true OR auth.uid() = user_id);

CREATE POLICY "Usuários gerenciam apenas próprias categorias"
  ON categorias FOR ALL
  USING (auth.uid() = user_id AND is_sistema = false);

-- Regras de Classificação
CREATE TABLE public.regras_classificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  ativa BOOLEAN DEFAULT true,

  tipo_regra TEXT NOT NULL CHECK (tipo_regra IN ('regex', 'contains', 'starts_with', 'ends_with')),
  expressao TEXT NOT NULL,
  campo_match TEXT DEFAULT 'descricao' CHECK (campo_match IN ('descricao', 'valor')),

  valor_min DECIMAL(15,2),
  valor_max DECIMAL(15,2),

  categoria_id UUID REFERENCES categorias(id),
  tags TEXT[],

  matches_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_regras_user_ordem ON regras_classificacao(user_id, ordem);

ALTER TABLE regras_classificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam apenas próprias regras"
  ON regras_classificacao FOR ALL
  USING (auth.uid() = user_id);

-- Templates de Importação
CREATE TABLE public.templates_importacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instituicao_id UUID NOT NULL REFERENCES instituicoes(id),

  nome TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL CHECK (tipo_arquivo IN ('csv', 'ofx', 'excel')),
  config JSONB NOT NULL,

  uso_count INTEGER DEFAULT 0,
  ultima_utilizacao TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE templates_importacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam apenas próprios templates"
  ON templates_importacao FOR ALL
  USING (auth.uid() = user_id);

-- Log de IA
CREATE TABLE public.logs_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  timestamp TIMESTAMPTZ DEFAULT NOW(),
  tarefa TEXT NOT NULL CHECK (tarefa IN ('classificacao', 'insights', 'anomalias')),
  modelo TEXT NOT NULL,

  tokens_entrada INTEGER NOT NULL,
  tokens_saida INTEGER NOT NULL,
  custo_usd DECIMAL(10,6) NOT NULL,
  latencia_ms INTEGER,

  transacoes_processadas INTEGER,
  score_medio DECIMAL(3,2),

  sucesso BOOLEAN DEFAULT true,
  erro TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_ia_user_mes ON logs_ia(user_id, DATE_TRUNC('month', timestamp));

ALTER TABLE logs_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem apenas próprios logs"
  ON logs_ia FOR SELECT
  USING (auth.uid() = user_id);

-- Centros de Custo (v1.0+)
CREATE TABLE public.centros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT,
  ativo BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE centros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam apenas próprios centros"
  ON centros FOR ALL
  USING (auth.uid() = user_id);

-- Orçamento (v1.0+)
CREATE TABLE public.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  mes DATE NOT NULL, -- Primeiro dia do mês
  categoria_id UUID REFERENCES categorias(id),
  centro_id UUID REFERENCES centros(id),

  valor_planejado DECIMAL(15,2) NOT NULL,
  valor_realizado DECIMAL(15,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, mes, categoria_id, centro_id)
);

ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam apenas próprios orçamentos"
  ON orcamentos FOR ALL
  USING (auth.uid() = user_id);

-- Funções e Triggers úteis

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER set_updated_at BEFORE UPDATE ON perfis FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON instituicoes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON transacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON regras_classificacao FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON orcamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed de categorias padrão
INSERT INTO categorias (grupo, nome, cor, icone, is_sistema) VALUES
  ('Essenciais', 'Moradia', '#4F46E5', 'home', true),
  ('Essenciais', 'Alimentação', '#10B981', 'utensils', true),
  ('Essenciais', 'Transporte', '#F59E0B', 'car', true),
  ('Essenciais', 'Saúde', '#EF4444', 'heart', true),
  ('Estilo de Vida', 'Lazer', '#8B5CF6', 'smile', true),
  ('Estilo de Vida', 'Educação', '#3B82F6', 'book', true),
  ('Estilo de Vida', 'Vestuário', '#EC4899', 'shirt', true),
  ('Financeiro', 'Investimentos', '#14B8A6', 'trending-up', true),
  ('Financeiro', 'Transferências', '#6B7280', 'arrow-left-right', true),
  ('Financeiro', 'Tarifas', '#DC2626', 'receipt', true),
  ('Receitas', 'Salário', '#22C55E', 'banknote', true),
  ('Receitas', 'Freelance', '#06B6D4', 'briefcase', true),
  ('Receitas', 'Outros', '#A3A3A3', 'plus-circle', true);
```

### Migração de Dados v0.x → v1.0

```typescript
// Script de migração
async function migrateToSupabase(localDb: SQLiteDB, supabase: SupabaseClient) {
  const userId = (await supabase.auth.getUser()).data.user?.id;

  if (!userId) throw new Error('Usuário não autenticado');

  // 1. Migrar instituições
  const instituicoes = await localDb.select('SELECT * FROM instituicoes');
  const instituicoesMap = new Map();

  for (const inst of instituicoes) {
    const { data } = await supabase
      .from('instituicoes')
      .insert({
        user_id: userId,
        nome: inst.nome,
        tipo: inst.tipo
      })
      .select()
      .single();

    instituicoesMap.set(inst.id, data.id);
  }

  // 2. Migrar contas
  const contas = await localDb.select('SELECT * FROM contas');
  const contasMap = new Map();

  for (const conta of contas) {
    const { data } = await supabase
      .from('contas')
      .insert({
        user_id: userId,
        instituicao_id: instituicoesMap.get(conta.instituicao_id),
        apelido: conta.apelido,
        tipo: conta.tipo,
        moeda: conta.moeda,
        ativa: conta.ativa,
        saldo_atual: conta.saldo_atual
      })
      .select()
      .single();

    contasMap.set(conta.id, data.id);
  }

  // 3. Migrar categorias customizadas
  const categorias = await localDb.select('SELECT * FROM categorias WHERE is_custom = true');
  const categoriasMap = new Map();

  for (const cat of categorias) {
    const { data } = await supabase
      .from('categorias')
      .insert({
        user_id: userId,
        grupo: cat.grupo,
        nome: cat.nome,
        cor: cat.cor,
        icone: cat.icone,
        ordem: cat.ordem
      })
      .select()
      .single();

    categoriasMap.set(cat.id, data.id);
  }

  // 4. Migrar transações (em lotes de 1000)
  const transacoes = await localDb.select('SELECT * FROM transacoes ORDER BY data');
  const batchSize = 1000;

  for (let i = 0; i < transacoes.length; i += batchSize) {
    const batch = transacoes.slice(i, i + batchSize);

    const toInsert = batch.map(tx => ({
      user_id: userId,
      conta_id: contasMap.get(tx.conta_id),
      data: tx.data,
      descricao: tx.descricao,
      valor: tx.valor,
      tipo: tx.tipo,
      id_externo: tx.id_externo,
      saldo_apos: tx.saldo_apos,
      hash_dedupe: tx.hash_dedupe,
      categoria_id: tx.categoria_id ? categoriasMap.get(tx.categoria_id) : null,
      tags: tx.tags,
      classificacao_origem: tx.classificacao_origem,
      classificacao_score: tx.classificacao_score
    }));

    await supabase.from('transacoes').insert(toInsert);
  }

  // 5. Migrar regras
  const regras = await localDb.select('SELECT * FROM regras_classificacao');

  for (const regra of regras) {
    await supabase.from('regras_classificacao').insert({
      user_id: userId,
      nome: regra.nome,
      ordem: regra.ordem,
      ativa: regra.ativa,
      tipo_regra: regra.tipo_regra,
      expressao: regra.expressao,
      campo_match: regra.campo_match,
      categoria_id: categoriasMap.get(regra.categoria_id),
      tags: regra.tags
    });
  }

  console.log('Migração concluída com sucesso!');
}
```

### Novas Funcionalidades v1.0

- **Autenticação**
  - Login/Signup
  - Recuperação de senha
  - Perfil do usuário

- **Multi-usuário**
  - Dados isolados por usuário
  - RLS em todas as queries

- **Sincronização**
  - Realtime updates via Supabase Realtime
  - Conflict resolution (last-write-wins)

- **Storage**
  - Upload de arquivos CSV/OFX para Supabase Storage
  - Histórico de importações

### Entregáveis v1.0

- [ ] Auth completo
- [ ] Migração de dados funcional
- [ ] RLS testado e seguro
- [ ] Realtime sync
- [ ] Storage de arquivos
- [ ] Deploy em produção

---

## v1.1 - Cartões e Parceladas (2-3 semanas)

### Objetivo
Gestão completa de cartões de crédito com ciclos, faturas e parcelamento.

### Novas Funcionalidades

- **Configuração de Cartões**
  - Dia de fechamento e vencimento
  - Limite total e disponível
  - Anuidade
  - Cartões adicionais

- **Faturas**
  - Ciclo de fatura com lançamentos
  - Cálculo de valor total, mínimo
  - Juros e encargos
  - Detecção de pagamento (conciliação)

- **Parceladas**
  - Registro de compra parcelada
  - Cronograma automático
  - Projeção em orçamento

- **Câmbio**
  - Valor original + moeda
  - Taxa de câmbio
  - IOF

### Novos Modelos de Dados

```sql
CREATE TABLE public.cartoes_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_id UUID NOT NULL REFERENCES contas(id) ON DELETE CASCADE,

  bandeira TEXT CHECK (bandeira IN ('visa', 'mastercard', 'amex', 'elo', 'outros')),
  emissor TEXT,

  dia_fechamento INTEGER NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),

  limite_total DECIMAL(15,2),
  percentual_minimo DECIMAL(5,2) DEFAULT 15.00,
  anuidade_mensal DECIMAL(10,2),
  iof_internacional DECIMAL(5,2) DEFAULT 6.38,

  cartao_principal_id UUID REFERENCES cartoes_config(id), -- Para adicionais
  apelido TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cartoes_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários gerenciam configurações de próprios cartões"
  ON cartoes_config FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_config_id UUID NOT NULL REFERENCES cartoes_config(id) ON DELETE CASCADE,

  ciclo_inicio DATE NOT NULL,
  ciclo_fim DATE NOT NULL,
  vencimento DATE NOT NULL,

  status TEXT NOT NULL CHECK (status IN ('aberta', 'fechada', 'paga', 'paga_parcial', 'em_atraso', 'cancelada')),

  valor_total DECIMAL(15,2) DEFAULT 0,
  valor_minimo DECIMAL(15,2),
  valor_pago DECIMAL(15,2) DEFAULT 0,

  juros DECIMAL(15,2) DEFAULT 0,
  iof DECIMAL(15,2) DEFAULT 0,
  encargos DECIMAL(15,2) DEFAULT 0,
  creditos DECIMAL(15,2) DEFAULT 0, -- Estornos/cashback

  pagamento_transacao_id UUID REFERENCES transacoes(id),
  nota TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(cartao_config_id, ciclo_inicio)
);

ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários gerenciam apenas próprias faturas"
  ON faturas FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.faturas_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID NOT NULL REFERENCES faturas(id) ON DELETE CASCADE,
  transacao_id UUID NOT NULL REFERENCES transacoes(id) ON DELETE CASCADE,

  parcela_n INTEGER,
  parcelas_total INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(fatura_id, transacao_id)
);

-- View útil: Utilização de limite
CREATE VIEW v_cartoes_utilizacao AS
SELECT
  cc.id as cartao_id,
  cc.user_id,
  cc.limite_total,
  COALESCE(SUM(t.valor) FILTER (WHERE t.valor < 0), 0) * -1 as utilizado,
  cc.limite_total - COALESCE(SUM(t.valor) FILTER (WHERE t.valor < 0), 0) * -1 as disponivel,
  (COALESCE(SUM(t.valor) FILTER (WHERE t.valor < 0), 0) * -1 / NULLIF(cc.limite_total, 0) * 100) as percentual_uso
FROM cartoes_config cc
LEFT JOIN contas c ON c.id = cc.conta_id
LEFT JOIN faturas f ON f.cartao_config_id = cc.id AND f.status = 'aberta'
LEFT JOIN faturas_lancamentos fl ON fl.fatura_id = f.id
LEFT JOIN transacoes t ON t.id = fl.transacao_id
GROUP BY cc.id;
```

---

## v1.2 - Orçamento Completo (2 semanas)

### Funcionalidades

- Orçamento por categoria e centro
- Alertas 80%/100%
- Projeções simples (média móvel)
- Ajustes manuais
- Comparativos M/M e YTD

---

## v2.0 - Mobile (4-6 semanas)

### Funcionalidades

- App React Native (Expo)
- Leitura de transações
- Lançamento rápido
- Notificações push
- Sync com web

---

## v3.0 - Open Finance (6-8 semanas)

### Funcionalidades

- Integração Open Finance Brasil
- Sincronização automática de transações
- Atualização de saldos em tempo real
- Suporte a múltiplas instituições
- Gestão de consentimentos

---

## Checklist de Migração entre Versões

### v0.1 → v0.2
- [ ] Adicionar tabela `categorias`
- [ ] Adicionar colunas `categoria_id`, `tags` em `transacoes`
- [ ] Seed de categorias padrão

### v0.2 → v0.3
- [ ] Adicionar tabela `regras_classificacao`
- [ ] Adicionar tabela `logs_ia`
- [ ] Adicionar colunas de classificação em `transacoes`

### v0.3 → v1.0
- [ ] **GRANDE MIGRAÇÃO**: Local → Supabase
- [ ] Criar conta de usuário
- [ ] Executar script de migração
- [ ] Validar dados migrados
- [ ] Backup local antes de migrar

### v1.0 → v1.1
- [ ] Adicionar tabelas `cartoes_config`, `faturas`, `faturas_lancamentos`
- [ ] Migrar contas tipo 'cartão' para nova estrutura

---

## Considerações de Performance

### v0.1-0.3 (Local)
- SQLite pode lidar com 100k+ transações sem problemas
- Índices em `hash_dedupe`, `data`, `conta_id`
- Queries devem limitar a 1000 registros por vez

### v1.0+ (Supabase)
- RLS adiciona overhead (~10-20ms por query)
- Usar índices compostos: `(user_id, data)`, `(user_id, conta_id)`
- Pagination obrigatória (limite 100-500 por página)
- Considerar materialized views para dashboards

---

## Próximos Passos Imediatos

1. ✅ Estrutura de pastas criada
2. ✅ Documentação de versioning definida
3. 🔄 Começar implementação v0.1:
   - Setup Next.js
   - SQLite local
   - Tela de importação
   - Preview de dados
4. 📝 Documentar cada instituição em `docs/sample-files/`

