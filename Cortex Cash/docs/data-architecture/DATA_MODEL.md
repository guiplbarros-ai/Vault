# Modelo de Dados - Cortex Cash

## Visão Geral

Este documento detalha o modelo de dados do Cortex Cash em cada versão, com especial atenção à evolução e compatibilidade entre versões.

---

## Convenções

### Nomenclatura
- **Tabelas**: plural, snake_case (ex: `transacoes`, `cartoes_config`)
- **Colunas**: snake_case (ex: `user_id`, `categoria_id`)
- **IDs**: UUID (v4) em todas as versões
- **Timestamps**: ISO 8601 / RFC 3339 (`YYYY-MM-DDTHH:MM:SS.sssZ`)
- **Datas**: ISO 8601 (`YYYY-MM-DD`)
- **Valores monetários**: `DECIMAL(15,2)` - suporta até 999.999.999.999,99

### Tipos de Dados

#### SQLite (v0.1-0.3)
```sql
TEXT     -- Strings, UUIDs, JSON
INTEGER  -- Inteiros, booleans (0/1)
REAL     -- Números decimais
BLOB     -- Binários (raramente usado)
```

#### PostgreSQL (v1.0+)
```sql
UUID          -- IDs
TEXT          -- Strings
INTEGER       -- Inteiros
BOOLEAN       -- true/false
DECIMAL(p,s)  -- Valores monetários
DATE          -- Datas
TIMESTAMPTZ   -- Timestamps com timezone
JSONB         -- JSON estruturado (indexável)
TEXT[]        -- Arrays de texto
```

---

## v0.1 - Modelo Local (SQLite)

### Diagrama ER

```
┌─────────────────┐
│  instituicoes   │
│─────────────────│
│ id (PK)         │
│ nome            │
│ tipo            │
│ created_at      │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────┴────────┐
│     contas      │
│─────────────────│
│ id (PK)         │
│ instituicao_id  │
│ apelido         │
│ tipo            │
│ moeda           │
│ ativa           │
│ saldo_atual     │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────┴──────────────┐
│     transacoes        │
│───────────────────────│
│ id (PK)               │
│ conta_id (FK)         │
│ data                  │
│ descricao             │
│ valor                 │
│ tipo                  │
│ id_externo            │
│ saldo_apos            │
│ hash_dedupe (UNIQUE)  │
│ created_at            │
│ updated_at            │
└───────────────────────┘

┌─────────────────────────┐
│  templates_importacao   │
│─────────────────────────│
│ id (PK)                 │
│ instituicao_id (FK)     │
│ nome                    │
│ tipo_arquivo            │
│ config (JSON)           │
│ uso_count               │
│ ultima_utilizacao       │
│ created_at              │
└─────────────────────────┘
```

### Schema SQL v0.1

```sql
-- Instituições Financeiras
CREATE TABLE instituicoes (
  id TEXT PRIMARY KEY,                           -- UUID
  nome TEXT NOT NULL,                            -- "Bradesco", "Inter", "Nubank"
  tipo TEXT NOT NULL CHECK(tipo IN ('banco', 'cartao', 'corretora')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_instituicoes_tipo ON instituicoes(tipo);

-- Contas
CREATE TABLE contas (
  id TEXT PRIMARY KEY,
  instituicao_id TEXT NOT NULL REFERENCES instituicoes(id) ON DELETE CASCADE,
  apelido TEXT NOT NULL,                         -- "Bradesco CC 21121-4"
  tipo TEXT NOT NULL CHECK(tipo IN ('corrente', 'poupanca', 'cartao', 'investimento')),
  moeda TEXT NOT NULL DEFAULT 'BRL',
  ativa INTEGER NOT NULL DEFAULT 1,              -- 0 = false, 1 = true
  saldo_atual REAL,                              -- Pode ser null
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_contas_instituicao ON contas(instituicao_id);
CREATE INDEX idx_contas_ativa ON contas(ativa) WHERE ativa = 1;

-- Transações
CREATE TABLE transacoes (
  id TEXT PRIMARY KEY,
  conta_id TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,

  -- Dados da transação
  data TEXT NOT NULL,                            -- YYYY-MM-DD
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,                           -- Positivo = entrada, Negativo = saída
  tipo TEXT,                                     -- 'credito', 'debito', 'transferencia', 'estorno'

  -- Metadados
  id_externo TEXT,                               -- FITID do OFX ou ref do banco
  saldo_apos REAL,                               -- Saldo após a transação (se disponível)
  hash_dedupe TEXT NOT NULL,                     -- SHA256(data|valor|descricao_norm|conta_id)

  -- Campos preparados para evolução (null em v0.1)
  categoria_id TEXT,
  centro_id TEXT,
  tags TEXT,                                     -- JSON array serializado
  classificacao_origem TEXT,
  classificacao_regra_id TEXT,
  classificacao_score REAL,
  classificacao_explicacao TEXT,
  parcela_n INTEGER,
  parcelas_total INTEGER,
  link_original_id TEXT,
  valor_original REAL,
  moeda_original TEXT,
  taxa_cambio REAL,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_transacoes_hash ON transacoes(hash_dedupe);
CREATE INDEX idx_transacoes_conta_data ON transacoes(conta_id, data DESC);
CREATE INDEX idx_transacoes_data ON transacoes(data DESC);

-- Templates de Importação
CREATE TABLE templates_importacao (
  id TEXT PRIMARY KEY,
  instituicao_id TEXT NOT NULL REFERENCES instituicoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL CHECK(tipo_arquivo IN ('csv', 'ofx', 'excel')),
  config TEXT NOT NULL,                          -- JSON serializado
  uso_count INTEGER DEFAULT 0,
  ultima_utilizacao TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_templates_instituicao ON templates_importacao(instituicao_id);

-- Preferências da Aplicação (localStorage em paralelo)
CREATE TABLE app_state (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,                           -- JSON serializado
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seeds iniciais
INSERT INTO app_state (chave, valor) VALUES
  ('versao', '"0.1.0"'),
  ('inicializado', 'false'),
  ('preferencias', '{"moeda_padrao":"BRL","formato_data":"DD/MM/YYYY","tema":"auto"}');
```

### Estrutura do config em templates_importacao

```typescript
interface TemplateConfig {
  // Configuração de parsing
  separador?: string;              // ";" ou "," ou "\t"
  encoding?: string;               // "UTF-8" ou "ISO-8859-1"
  header_row?: number;             // Linha do cabeçalho (0-indexed)
  skip_rows?: number;              // Linhas para pular no início

  // Mapeamento de colunas
  mapeamento: {
    data: string;                  // Nome da coluna de data
    descricao: string;             // Nome da coluna de descrição
    valor?: string;                // Se houver coluna única de valor
    credito?: string;              // Ou colunas separadas
    debito?: string;
    saldo?: string;                // Opcional
    documento?: string;            // Opcional
    tipo?: string;                 // Opcional
  };

  // Transformações
  transformacoes?: {
    data_formato?: string;         // "DD/MM/YYYY" ou "YYYYMMDD"
    valor_separador_decimal?: string; // "," ou "."
    inverter_sinais?: boolean;     // Para alguns cartões
  };
}
```

### Exemplo de Dados v0.1

```sql
-- Instituição
INSERT INTO instituicoes VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Bradesco', 'banco', '2024-01-15T10:00:00Z');

-- Conta
INSERT INTO contas VALUES
  ('660e8400-e29b-41d4-a716-446655440001',
   '550e8400-e29b-41d4-a716-446655440000',
   'Bradesco CC 21121-4',
   'corrente',
   'BRL',
   1,
   5234.56,
   '2024-01-15T10:05:00Z',
   '2024-01-15T10:05:00Z');

-- Transação
INSERT INTO transacoes (id, conta_id, data, descricao, valor, tipo, hash_dedupe) VALUES
  ('770e8400-e29b-41d4-a716-446655440002',
   '660e8400-e29b-41d4-a716-446655440001',
   '2024-01-20',
   'SALARIO MES 01/2024',
   8500.00,
   'credito',
   'abc123...def456');

-- Template
INSERT INTO templates_importacao VALUES
  ('880e8400-e29b-41d4-a716-446655440003',
   '550e8400-e29b-41d4-a716-446655440000',
   'Bradesco CSV Padrão',
   'csv',
   '{"separador":";","encoding":"ISO-8859-1","header_row":5,"mapeamento":{"data":"Data","descricao":"Histórico","credito":"Crédito (R$)","debito":"Débito (R$)","saldo":"Saldo (R$)"}}',
   0,
   null,
   '2024-01-15T10:10:00Z',
   '2024-01-15T10:10:00Z');
```

---

## v0.2 - Adiciona Categorias

### Novas Tabelas

```sql
-- Categorias
CREATE TABLE categorias (
  id TEXT PRIMARY KEY,
  grupo TEXT NOT NULL,                           -- "Essenciais", "Estilo de Vida"
  nome TEXT NOT NULL,                            -- "Alimentação", "Transporte"
  cor TEXT,                                      -- Hex color: "#10B981"
  icone TEXT,                                    -- Nome do ícone Lucide: "utensils"
  ativa INTEGER NOT NULL DEFAULT 1,
  ordem INTEGER NOT NULL DEFAULT 0,
  is_padrao INTEGER NOT NULL DEFAULT 0,          -- 1 se é categoria seed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(grupo, nome)
);

CREATE INDEX idx_categorias_grupo ON categorias(grupo);
CREATE INDEX idx_categorias_ativa ON categorias(ativa) WHERE ativa = 1;

-- Seed de categorias padrão
INSERT INTO categorias (id, grupo, nome, cor, icone, is_padrao, ordem) VALUES
  (hex(randomblob(16)), 'Essenciais', 'Moradia', '#4F46E5', 'home', 1, 1),
  (hex(randomblob(16)), 'Essenciais', 'Alimentação', '#10B981', 'utensils', 1, 2),
  (hex(randomblob(16)), 'Essenciais', 'Transporte', '#F59E0B', 'car', 1, 3),
  (hex(randomblob(16)), 'Essenciais', 'Saúde', '#EF4444', 'heart', 1, 4),
  (hex(randomblob(16)), 'Estilo de Vida', 'Lazer', '#8B5CF6', 'smile', 1, 5),
  (hex(randomblob(16)), 'Estilo de Vida', 'Educação', '#3B82F6', 'book', 1, 6),
  (hex(randomblob(16)), 'Estilo de Vida', 'Vestuário', '#EC4899', 'shirt', 1, 7),
  (hex(randomblob(16)), 'Financeiro', 'Investimentos', '#14B8A6', 'trending-up', 1, 8),
  (hex(randomblob(16)), 'Financeiro', 'Transferências', '#6B7280', 'arrow-left-right', 1, 9),
  (hex(randomblob(16)), 'Financeiro', 'Tarifas', '#DC2626', 'receipt', 1, 10),
  (hex(randomblob(16)), 'Receitas', 'Salário', '#22C55E', 'banknote', 1, 11),
  (hex(randomblob(16)), 'Receitas', 'Freelance', '#06B6D4', 'briefcase', 1, 12),
  (hex(randomblob(16)), 'Receitas', 'Outros', '#A3A3A3', 'plus-circle', 1, 13);
```

### Alterações em Tabelas Existentes

```sql
-- Agora categoria_id e tags são preenchidos
-- Nenhuma alteração no schema, apenas uso dos campos
```

---

## v0.3 - Adiciona Regras e IA

### Novas Tabelas

```sql
-- Regras de Classificação
CREATE TABLE regras_classificacao (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL,                        -- Menor = maior prioridade
  ativa INTEGER NOT NULL DEFAULT 1,

  -- Condições
  tipo_regra TEXT NOT NULL CHECK(tipo_regra IN ('regex', 'contains', 'starts_with', 'ends_with')),
  expressao TEXT NOT NULL,
  campo_match TEXT NOT NULL DEFAULT 'descricao' CHECK(campo_match IN ('descricao', 'valor')),
  valor_min REAL,
  valor_max REAL,

  -- Ações
  categoria_id TEXT NOT NULL REFERENCES categorias(id),
  tags TEXT,                                     -- JSON array

  -- Estatísticas
  matches_count INTEGER DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_regras_ordem ON regras_classificacao(ordem ASC);
CREATE INDEX idx_regras_ativa ON regras_classificacao(ativa) WHERE ativa = 1;

-- Logs de IA
CREATE TABLE logs_ia (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  tarefa TEXT NOT NULL CHECK(tarefa IN ('classificacao', 'insights', 'anomalias')),
  modelo TEXT NOT NULL,                          -- "gpt-4o-mini"

  -- Custos e performance
  tokens_entrada INTEGER NOT NULL,
  tokens_saida INTEGER NOT NULL,
  custo_usd REAL NOT NULL,
  latencia_ms INTEGER,

  -- Contexto
  transacoes_processadas INTEGER,
  score_medio REAL,

  -- Resultado
  sucesso INTEGER NOT NULL DEFAULT 1,
  erro TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_logs_ia_timestamp ON logs_ia(timestamp DESC);
CREATE INDEX idx_logs_ia_tarefa ON logs_ia(tarefa);
```

---

## v1.0 - Migração para Supabase (PostgreSQL)

### Principais Mudanças

1. **Adiciona `user_id` em todas as tabelas principais**
2. **Troca `TEXT` por `UUID` para IDs**
3. **Adiciona Row Level Security (RLS)**
4. **Separa categorias do sistema de categorias do usuário**

### Schema Completo v1.0

Ver arquivo completo em: `/docs/data-architecture/VERSIONING_STRATEGY.md` seção v1.0

**Principais alterações**:
- Todas as tabelas ganham coluna `user_id UUID REFERENCES auth.users(id)`
- IDs mudam de `TEXT` para `UUID`
- Timestamps mudam de `TEXT` para `TIMESTAMPTZ`
- Booleans mudam de `INTEGER` para `BOOLEAN`
- Adiciona tabela `perfis` (estende `auth.users`)
- Todas as tabelas recebem políticas RLS

### Migração v0.3 → v1.0

Script de migração disponível em: `/docs/data-architecture/VERSIONING_STRATEGY.md` seção "Migração de Dados"

**Passos**:
1. Criar conta no Supabase
2. Fazer autenticação
3. Executar script de migração que:
   - Exporta dados do SQLite
   - Cria mapeamento de IDs antigos → novos
   - Insere dados no Postgres com `user_id`
   - Valida integridade referencial

---

## Índices e Performance

### v0.1-0.3 (SQLite)

**Índices críticos**:
```sql
-- Transações (queries principais)
CREATE INDEX idx_transacoes_conta_data ON transacoes(conta_id, data DESC);
CREATE INDEX idx_transacoes_data ON transacoes(data DESC);
CREATE UNIQUE INDEX idx_transacoes_hash ON transacoes(hash_dedupe);

-- Categorização
CREATE INDEX idx_transacoes_categoria ON transacoes(categoria_id) WHERE categoria_id IS NOT NULL;

-- Busca
CREATE INDEX idx_transacoes_descricao_fts ON transacoes(descricao); -- FTS5 se necessário
```

**Performance esperada**:
- Importação: ~5k transações/segundo
- Queries simples: <10ms
- Queries com JOIN: <50ms
- Dedupe check: <5ms

### v1.0+ (PostgreSQL)

**Índices críticos**:
```sql
-- Composto user + data para RLS
CREATE INDEX idx_transacoes_user_data ON transacoes(user_id, data DESC);
CREATE INDEX idx_transacoes_user_conta ON transacoes(user_id, conta_id);

-- Full text search
CREATE INDEX idx_transacoes_descricao_gin ON transacoes USING gin(to_tsvector('portuguese', descricao));

-- Aggregações
CREATE INDEX idx_transacoes_user_categoria_data ON transacoes(user_id, categoria_id, date_trunc('month', data));
```

**Performance esperada** (com RLS):
- Queries simples: 10-30ms
- Queries complexas: 50-200ms
- Importação batch: ~1k transações/segundo

---

## Integridade e Validações

### Constraints

```sql
-- v0.1+
CHECK(tipo IN ('corrente', 'poupanca', 'cartao', 'investimento'))
CHECK(valor != 0)  -- Transação não pode ter valor zero
UNIQUE(hash_dedupe)  -- Dedupe

-- v1.0+
CHECK(percentual_minimo >= 0 AND percentual_minimo <= 100)
CHECK(dia_fechamento BETWEEN 1 AND 31)
CHECK(ciclo_inicio < ciclo_fim)
```

### Foreign Keys

- **ON DELETE CASCADE**: Todas as relações 1:N (deletar pai deleta filhos)
- **ON DELETE RESTRICT**: Quando há lógica de negócio importante (discutir caso a caso)

### Triggers

```sql
-- Atualizar updated_at automaticamente (v1.0+)
CREATE TRIGGER set_updated_at BEFORE UPDATE ON transacoes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Recalcular saldo de conta após insert/update/delete de transação (v1.0+)
-- (Implementar se necessário para performance)
```

---

## Queries Comuns

### Saldo Total por Conta

```sql
-- v0.1
SELECT
  c.id,
  c.apelido,
  COALESCE(SUM(t.valor), 0) as saldo_calculado,
  c.saldo_atual as saldo_informado
FROM contas c
LEFT JOIN transacoes t ON t.conta_id = c.id
WHERE c.ativa = 1
GROUP BY c.id;

-- v1.0
SELECT
  c.id,
  c.apelido,
  COALESCE(SUM(t.valor), 0) as saldo_calculado
FROM contas c
LEFT JOIN transacoes t ON t.conta_id = c.id
WHERE c.user_id = auth.uid() AND c.ativa = true
GROUP BY c.id;
```

### Gastos por Categoria (Mês)

```sql
-- v0.2+
SELECT
  cat.grupo,
  cat.nome,
  SUM(t.valor) as total
FROM transacoes t
JOIN categorias cat ON cat.id = t.categoria_id
WHERE t.data >= '2024-01-01' AND t.data < '2024-02-01'
  AND t.valor < 0  -- Apenas saídas
GROUP BY cat.grupo, cat.nome
ORDER BY total ASC;

-- v1.0+
SELECT
  cat.grupo,
  cat.nome,
  SUM(t.valor) as total
FROM transacoes t
JOIN categorias cat ON cat.id = t.categoria_id
WHERE t.user_id = auth.uid()
  AND t.data >= '2024-01-01' AND t.data < '2024-02-01'
  AND t.valor < 0
GROUP BY cat.grupo, cat.nome
ORDER BY total ASC;
```

### Transações Não Classificadas

```sql
-- v0.2+
SELECT *
FROM transacoes
WHERE categoria_id IS NULL
ORDER BY data DESC
LIMIT 100;
```

### Custo de IA no Mês

```sql
-- v0.3+
SELECT
  DATE(timestamp) as dia,
  tarefa,
  SUM(custo_usd) as custo_dia,
  COUNT(*) as chamadas
FROM logs_ia
WHERE timestamp >= date('now', 'start of month')
GROUP BY dia, tarefa
ORDER BY dia DESC;

-- v1.0+
SELECT
  DATE(timestamp) as dia,
  tarefa,
  SUM(custo_usd) as custo_dia
FROM logs_ia
WHERE user_id = auth.uid()
  AND timestamp >= DATE_TRUNC('month', NOW())
GROUP BY dia, tarefa
ORDER BY dia DESC;
```

---

## Backup e Recuperação

### v0.1-0.3 (Local)

**Backup**:
```typescript
// Exportar banco inteiro
async function backupDatabase() {
  const db = await getDB();
  const data = await db.export();
  const blob = new Blob([data], { type: 'application/x-sqlite3' });
  downloadBlob(blob, `cortex-cash-backup-${Date.now()}.db`);
}
```

**Restauração**:
```typescript
async function restoreDatabase(file: File) {
  const buffer = await file.arrayBuffer();
  const db = await SQL.open(buffer);
  // Validar versão e integridade
  // Substituir banco atual
}
```

### v1.0+ (Supabase)

- Backups automáticos diários (Supabase)
- Point-in-time recovery (PITR) - plano Pro
- Export manual via SQL dump
- Soft deletes opcionais para tabelas críticas

---

## Próximos Passos

1. ✅ Documentação de versões criada
2. 🔄 Implementar v0.1
3. 📝 Criar scripts de seed
4. 📝 Criar scripts de migração entre versões
5. 🧪 Testes de integridade referencial
