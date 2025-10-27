# 🚨 Migração Necessária

## Problema
O aplicativo está tentando acessar a coluna `categoria_id` na tabela `transacao`, mas essa coluna não existe no banco de dados.

## Solução
Você precisa aplicar a migração SQL ao seu banco de dados Supabase.

### Opção 1: SQL Editor (Recomendado) ⭐

1. Acesse o SQL Editor do seu projeto:
   ```
   https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/sql/new
   ```

2. Copie e cole o seguinte SQL:

```sql
-- Add categoria_id column to transacao table
-- This column links transactions to categories for classification

alter table transacao
  add column if not exists categoria_id uuid references categoria(id) on delete set null;

-- Create index for better query performance
create index if not exists idx_tx_categoria on transacao(categoria_id);

-- Add created_at columns if missing (for consistency)
alter table instituicao add column if not exists created_at timestamptz not null default now();
alter table conta add column if not exists created_at timestamptz not null default now();
alter table categoria add column if not exists created_at timestamptz not null default now();
alter table categoria add column if not exists ordem int not null default 0;
alter table transacao add column if not exists created_at timestamptz not null default now();
```

3. Clique em "Run" ou "Executar"

4. Verifique se foi aplicado com sucesso executando:
```sql
select column_name, data_type
from information_schema.columns
where table_name = 'transacao';
```

### Opção 2: Supabase CLI

Se você tiver a service role key:

```bash
# Link ao projeto
supabase link --project-ref xborrshstfcvzrxyqyor

# Aplicar migrações
supabase db push
```

### Opção 3: Script Node.js

Se você tiver a SUPABASE_SERVICE_ROLE_KEY:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/apply-categoria-migration.mjs
```

## Verificação

Após aplicar a migração, execute:

```bash
node scripts/check-schema.mjs
```

Você deve ver:
```
✅ categoria_id column exists!
✅ Relationship query works!
```

## Estado Atual

- ❌ Coluna `categoria_id` não existe
- ✅ Migração criada: `supabase/migrations/20251026T000001_add_categoria_to_transacao.sql`
- ⚠️  Hook temporariamente modificado para funcionar sem categorias

## Após Aplicar a Migração

O aplicativo funcionará completamente, incluindo:
- ✅ Filtros por categoria nas transações
- ✅ Relatórios com categorias
- ✅ Classificação automática de transações
- ✅ Top 5 Despesas com categorias
- ✅ Alertas de orçamento funcionando
- ✅ Gráfico Orçado vs Realizado com dados reais

## Hooks Afetados (com fix temporário aplicado)

### ✅ Funcionando com limitações:
1. `use-top-expenses.ts` - Retorna despesas SEM categoria
2. `use-budget-mutations.ts` - Lista orçamentos com categorias (query separada)
3. `use-budget-data.ts` - Mostra orçado mas realizado=0
4. `use-budget-alerts.ts` - Desabilitado temporariamente

### 🔄 Para restaurar funcionalidade completa:
Após aplicar migration, descomentar blocos marcados com:
```typescript
/* UNCOMMENT AFTER MIGRATION:
  ...
*/
```
