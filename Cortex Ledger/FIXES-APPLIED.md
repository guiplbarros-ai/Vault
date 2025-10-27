# ✅ Correções Aplicadas - Erro Top Expenses

## Problema Raiz Identificado

Havia **dois problemas principais** causando os erros:

### 1. Coluna `categoria_id` não existe na tabela `transacao`
- **Erro**: `Could not find a relationship between 'transacao' and 'categoria_id'`
- **Causa**: Migration não foi aplicada ao banco
- **Status**: ⚠️ Requer ação manual (ver MIGRATION-REQUIRED.md)

### 2. Valores incorretos para o campo `tipo`
- **Erro**: Queries usando `'DESPESA'` e `'RECEITA'`
- **Real**: Banco usa `'debito'` e `'credito'`
- **Status**: ✅ CORRIGIDO

## Correções Aplicadas

### 1. Criado arquivo de constantes
📁 `apps/web/src/lib/constants.ts`
- Define `TRANSACTION_TYPE.DEBITO` e `TRANSACTION_TYPE.CREDITO`
- Funções helper: `isExpense()`, `isIncome()`, `getTransactionTypeLabel()`

### 2. Criado utilitários de query
📁 `apps/web/src/lib/query-utils.ts`
- `requireSession()`: Verifica autenticação antes de queries
- `formatSupabaseError()`: Formata erros com detalhes completos

### 3. Hooks corrigidos

#### ✅ `use-top-expenses.ts:52-56`
```typescript
.eq('tipo', TRANSACTION_TYPE.DEBITO)
.lt('valor', 0) // Despesas têm valor negativo
.order('valor', { ascending: true }) // Valores mais negativos primeiro
```

#### ✅ `use-budget-alerts.ts:45-46`
```typescript
.eq('tipo', TRANSACTION_TYPE.DEBITO)
.lt('valor', 0) // Despesas têm valor negativo
```

#### ✅ `use-evolution-data.ts:39-45`
```typescript
.filter((t) => t.tipo === TRANSACTION_TYPE.CREDITO && t.valor > 0) // Receitas
.filter((t) => t.tipo === TRANSACTION_TYPE.DEBITO && t.valor < 0)  // Despesas
```

### 4. Componentes corrigidos

#### ✅ `transaction-detail-modal.tsx:127-134`
```typescript
transaction.tipo === 'credito' ? 'Receita' :
transaction.tipo === 'debito' ? 'Despesa' : transaction.tipo
```

### 5. Fix temporário aplicado
- Hook `use-top-expenses` não busca categoria (retorna `null`)
- Componente `top-expenses-card` já trata categoria nula corretamente
- Após aplicar migration, restaurar query completa de `use-top-expenses.AFTER-MIGRATION.ts`

### 6. Cache limpo
- ✅ Removido `.next` e `.turbo`
- ✅ Servidor deve ser reiniciado

## Estado Atual

### ✅ Funcionando Agora
- Hook não gera mais erro `{}`
- Queries usam valores corretos (`debito`/`credito`)
- Verificação de sessão funciona
- Erros são logados com detalhes completos

### ⚠️ Próximo Passo (Opcional mas Recomendado)
Para habilitar categorias nas despesas:

1. Acesse: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/sql/new
2. Execute o SQL de: `supabase/migrations/20251026T000001_add_categoria_to_transacao.sql`
3. Substitua conteúdo de `use-top-expenses.ts` por `use-top-expenses.AFTER-MIGRATION.ts`

## Scripts de Diagnóstico

- ✅ `scripts/check-schema.mjs` - Verifica se categoria_id existe
- ✅ `scripts/apply-categoria-migration.mjs` - Helper para aplicar migration

## Arquivos Criados/Modificados

### Criados
- ✅ `apps/web/src/lib/constants.ts`
- ✅ `apps/web/src/lib/query-utils.ts`
- ✅ `supabase/migrations/20251026T000001_add_categoria_to_transacao.sql`
- ✅ `apps/web/src/lib/hooks/use-top-expenses.AFTER-MIGRATION.ts`
- ✅ `scripts/check-schema.mjs`
- ✅ `scripts/apply-categoria-migration.mjs`
- ✅ `MIGRATION-REQUIRED.md`
- ✅ `FIXES-APPLIED.md` (este arquivo)

### Modificados
- ✅ `apps/web/src/lib/hooks/use-top-expenses.ts`
- ✅ `apps/web/src/lib/hooks/use-budget-alerts.ts`
- ✅ `apps/web/src/lib/hooks/use-evolution-data.ts`
- ✅ `apps/web/src/components/transacoes/transaction-detail-modal.tsx`

## Teste Rápido

Após reiniciar o servidor, você deve ver:
- ✅ Sem erros no console
- ✅ Top 5 Despesas carrega (sem categorias por enquanto)
- ✅ Se não houver transações, mostra mensagem apropriada

Para verificar se funciona completamente:
```bash
npm start
# ou
pnpm dev
```

Verifique o console do browser - não deve haver mais:
❌ `Error fetching top expenses: {}`
