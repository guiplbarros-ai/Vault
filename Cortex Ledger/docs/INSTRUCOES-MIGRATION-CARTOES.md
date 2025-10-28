# Instruções: Aplicar Migration de Cartões de Crédito

> **Data:** 2025-10-27
> **Migrations:** 002_add_cartoes_credito.sql + 002_add_cartoes_credito_seed.sql

---

## 1. Pré-requisitos

Antes de executar a migration, certifique-se de:

1. ✅ Ter acesso ao Supabase Studio (SQL Editor)
2. ✅ Estar conectado ao projeto correto: `xborrshstfcvzrxyqyor`
3. ✅ Ter a migration 001 (tabelas base) aplicada
4. ✅ Ter pelo menos 1 usuário cadastrado no `auth.users`

---

## 2. Passo a Passo

### 2.1 Aplicar Migration Principal

1. Acesse o Supabase Studio: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/editor
2. Clique em **SQL Editor** no menu lateral
3. Clique em **New query**
4. Cole o conteúdo do arquivo: `packages/db/migrations/002_add_cartoes_credito.sql`
5. Clique em **Run** (ou pressione `Ctrl+Enter`)

**Resultado esperado:**
```
Success: Query returned successfully
```

**Tabelas criadas:**
- ✅ `cartao_credito`
- ✅ `fatura`
- ✅ `alerta_cartao`
- ✅ Extensões na tabela `transacao`
- ✅ View `v_cartoes_resumo`

**Funções criadas:**
- ✅ `calcular_melhor_dia_compra()` — Trigger automático
- ✅ `calcular_limite_disponivel(uuid)` — Função manual/trigger
- ✅ `atualizar_limite_disponivel()` — Trigger automático
- ✅ `update_updated_at_column()` — Trigger automático

**RLS Policies criadas:**
- ✅ Políticas para `cartao_credito` (SELECT, INSERT, UPDATE, DELETE)
- ✅ Políticas para `fatura` (SELECT, INSERT, UPDATE, DELETE)
- ✅ Políticas para `alerta_cartao` (ALL)

---

### 2.2 Verificar se Migration foi Aplicada

Execute no SQL Editor:

```sql
-- Verificar tabelas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('cartao_credito', 'fatura', 'alerta_cartao')
ORDER BY table_name;

-- Verificar colunas adicionadas em transacao
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transacao'
  AND column_name IN ('fatura_id', 'is_parcelada', 'parcela_atual', 'parcelas_total')
ORDER BY column_name;

-- Verificar funções criadas
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%cartao%' OR routine_name LIKE '%fatura%' OR routine_name LIKE '%limite%'
ORDER BY routine_name;

-- Verificar RLS policies
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('cartao_credito', 'fatura', 'alerta_cartao')
ORDER BY tablename, policyname;
```

**Resultado esperado:**
- 3 tabelas encontradas
- 4+ colunas encontradas em `transacao`
- 3+ funções encontradas
- 10+ policies encontradas

---

### 2.3 Aplicar Seed Data (Opcional - para Testes)

⚠️ **ATENÇÃO:** Use o seed **simplificado** para evitar problemas com hash_dedupe.

**Arquivo recomendado:** `002_add_cartoes_credito_seed_simple.sql`

1. Buscar o `user_id` de um usuário de teste:

```sql
-- Buscar user_id
SELECT id, email FROM auth.users LIMIT 5;
```

2. Editar o arquivo `002_add_cartoes_credito_seed_simple.sql`:
   - Substituir **todas** as ocorrências de `'SEU_USER_ID_AQUI'::UUID` pelo UUID real
   - Use Find & Replace (Ctrl+H ou Cmd+H) para substituir todas de uma vez

3. Colar e executar o seed no SQL Editor

**Resultado esperado:**
```
Success: Query returned successfully
2 instituições criadas
2 contas criadas
2 cartões criados
3 faturas criadas
4 alertas criados
```

**O que será criado:**
- ✅ 2 cartões (Amex Platinum e Aeternum Visa)
- ✅ 3 faturas (Out/2025 para ambos + Set/2025 paga para Amex)
- ✅ 4 alertas padrão (vencimento e limite)
- ❌ Sem transações (você pode adicionar manualmente depois)

---

### 2.4 Verificar Dados de Exemplo

```sql
-- Ver cartões criados
SELECT
  nome,
  bandeira,
  ultimos_digitos,
  limite_total,
  limite_disponivel,
  dia_fechamento,
  dia_vencimento,
  status
FROM cartao_credito;

-- Ver faturas criadas
SELECT
  cc.nome AS cartao,
  f.mes_referencia,
  f.data_fechamento,
  f.data_vencimento,
  f.valor_total,
  f.status
FROM fatura f
JOIN cartao_credito cc ON cc.id = f.cartao_id
ORDER BY f.data_vencimento DESC;

-- Ver transações nas faturas
SELECT
  cc.nome AS cartao,
  t.data,
  t.descricao,
  t.valor,
  t.compra_internacional,
  t.moeda_original
FROM transacao t
JOIN conta c ON c.id = t.conta_id
JOIN cartao_credito cc ON cc.conta_id = c.id
WHERE t.fatura_id IS NOT NULL
ORDER BY t.data DESC;

-- Ver resumo usando a view
SELECT * FROM v_cartoes_resumo;
```

---

## 3. Testar Funcionalidades

### 3.1 Testar Cálculo de Melhor Dia de Compra

```sql
-- Inserir cartão e verificar melhor_dia_compra
INSERT INTO cartao_credito (
  conta_id,
  nome,
  instituicao,
  bandeira,
  ultimos_digitos,
  tipo_cartao,
  limite_total,
  dia_fechamento,
  dia_vencimento,
  user_id
)
VALUES (
  (SELECT id FROM conta WHERE tipo = 'cartao' LIMIT 1),
  'Teste Nubank',
  'Nubank',
  'master',
  '1234',
  'nacional',
  5000.00,
  10, -- Fecha dia 10
  20, -- Vence dia 20
  (SELECT id FROM auth.users LIMIT 1)
)
RETURNING id, dia_fechamento, melhor_dia_compra;

-- Resultado esperado: melhor_dia_compra = 11
```

### 3.2 Testar Cálculo de Limite Disponível

```sql
-- Calcular limite manualmente
SELECT
  id,
  nome,
  limite_total,
  limite_disponivel,
  calcular_limite_disponivel(id) AS limite_calculado
FROM cartao_credito;

-- Os valores de limite_disponivel e limite_calculado devem ser iguais
```

### 3.3 Testar Trigger de Atualização de Limite

```sql
-- Inserir transação em cartão e ver limite atualizar automaticamente
-- (Substitua os IDs conforme seu ambiente)

-- 1. Ver limite antes
SELECT nome, limite_disponivel FROM cartao_credito WHERE ultimos_digitos = '09294';

-- 2. Inserir transação
INSERT INTO transacao (conta_id, data, descricao, valor, tipo, user_id)
VALUES (
  (SELECT conta_id FROM cartao_credito WHERE ultimos_digitos = '09294' LIMIT 1),
  CURRENT_DATE,
  'TESTE COMPRA',
  -100.00,
  'debito',
  (SELECT user_id FROM cartao_credito WHERE ultimos_digitos = '09294' LIMIT 1)
);

-- 3. Ver limite depois (deve ter diminuído R$ 100)
SELECT nome, limite_disponivel FROM cartao_credito WHERE ultimos_digitos = '09294';

-- 4. Deletar transação de teste
DELETE FROM transacao WHERE descricao = 'TESTE COMPRA';
```

### 3.4 Testar RLS (Row Level Security)

```sql
-- Verificar que RLS está ativo
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('cartao_credito', 'fatura', 'alerta_cartao');

-- Todas devem retornar rowsecurity = true

-- Testar política (deve retornar apenas cartões do usuário autenticado)
SELECT * FROM cartao_credito;
-- Se você estiver autenticado como X, só verá cartões de X
```

---

## 4. Rollback (se necessário)

Se algo der errado, você pode reverter a migration:

```sql
-- CUIDADO: Isso apagará TODOS os dados de cartões!

-- Remover triggers
DROP TRIGGER IF EXISTS trigger_calcular_melhor_dia_compra ON cartao_credito;
DROP TRIGGER IF EXISTS trigger_recalcular_limite_fatura ON fatura;
DROP TRIGGER IF EXISTS trigger_recalcular_limite_transacao ON transacao;
DROP TRIGGER IF EXISTS trigger_update_cartao_credito_updated_at ON cartao_credito;
DROP TRIGGER IF EXISTS trigger_update_fatura_updated_at ON fatura;
DROP TRIGGER IF EXISTS trigger_update_alerta_cartao_updated_at ON alerta_cartao;

-- Remover funções
DROP FUNCTION IF EXISTS calcular_melhor_dia_compra();
DROP FUNCTION IF EXISTS calcular_limite_disponivel(UUID);
DROP FUNCTION IF EXISTS atualizar_limite_disponivel();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remover view
DROP VIEW IF EXISTS v_cartoes_resumo;

-- Remover colunas de transacao
ALTER TABLE transacao
  DROP COLUMN IF EXISTS fatura_id,
  DROP COLUMN IF EXISTS is_parcelada,
  DROP COLUMN IF EXISTS parcela_atual,
  DROP COLUMN IF EXISTS parcelas_total,
  DROP COLUMN IF EXISTS valor_total_parcelado,
  DROP COLUMN IF EXISTS compra_original_id,
  DROP COLUMN IF EXISTS compra_internacional,
  DROP COLUMN IF EXISTS moeda_original,
  DROP COLUMN IF EXISTS taxa_conversao,
  DROP COLUMN IF EXISTS iof;

-- Remover tabelas (CASCADE apagará policies e constraints)
DROP TABLE IF EXISTS alerta_cartao CASCADE;
DROP TABLE IF EXISTS fatura CASCADE;
DROP TABLE IF EXISTS cartao_credito CASCADE;
```

---

## 5. Próximos Passos Após Migration

Depois de aplicar a migration com sucesso:

1. ✅ Testar queries no SQL Editor
2. ✅ Criar tipos TypeScript no frontend
3. ✅ Implementar services (CartaoService, FaturaService)
4. ✅ Criar API routes para CRUD
5. ✅ Conectar UI com backend
6. ✅ Implementar Edge Functions para jobs (fechamento de fatura, alertas)

---

## 6. Troubleshooting

### Erro: "relation conta does not exist"
**Causa:** A tabela `conta` ainda não foi criada (migration 001 pendente)
**Solução:** Aplique a migration 001 primeiro

### Erro: "permission denied"
**Causa:** Usuário sem permissões suficientes
**Solução:** Certifique-se de estar usando credenciais de admin no Supabase

### Erro: "duplicate key value violates unique constraint"
**Causa:** Você está tentando inserir dados duplicados no seed
**Solução:** Execute o rollback do seed e ajuste os dados

### Trigger não está disparando
**Causa:** Trigger pode não ter sido criado corretamente
**Solução:**
```sql
-- Verificar triggers existentes
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('cartao_credito', 'fatura', 'transacao');

-- Recriar trigger se necessário (copie do arquivo de migration)
```

---

## 7. Contato e Suporte

Se encontrar problemas:
1. Verifique os logs no Supabase Studio > Database > Logs
2. Execute as queries de verificação acima
3. Documente o erro e revise a migration

---

**Última atualização:** 2025-10-27
**Status:** ✅ Migration pronta para aplicação
