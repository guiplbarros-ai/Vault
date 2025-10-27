# ✅ Correção de Nomes de Colunas - Tabela Orcamento

## Erro Original
```
column orcamento.mes_ref does not exist
```

## Causa Raiz
O código estava usando nomes de colunas incorretos para a tabela `orcamento`:
- ❌ Código usava: `mes_ref`, `valor_planejado`, `valor_alerta_80`, `valor_alerta_100`
- ✅ Banco tem: `mes`, `valor_alvo`

## Schema Real da Tabela `orcamento`
```sql
create table orcamento (
  id uuid primary key,
  user_id uuid not null,
  mes date,                    -- ✅ NOT mes_ref
  categoria_id uuid,
  valor_alvo numeric(14,2)     -- ✅ NOT valor_planejado
);
```

## Correções Aplicadas

### 1. ✅ Hooks Corrigidos

#### `use-budget-mutations.ts`
- Linha 28: `mes_ref` → `mes`
- Linha 29: `valor_planejado` → `valor_alvo`
- Linha 61: `mes_ref` → `mes`
- Linha 58: `valor_planejado` → `valor_alvo`
- Linha 136: `order('mes_ref')` → `order('mes')`
- Linha 140: `.eq('mes_ref')` → `.eq('mes')`
- Linha 114: Interface `mes_ref` → `mes`
- Linha 115: Interface `valor_planejado` → `valor_alvo`
- Removido: `valor_alerta_80`, `valor_alerta_100` (não existem no schema)

#### `use-budget-data.ts`
- Linha 28: `.eq('mes_ref')` → `.eq('mes')`
- Linha 62: `valor_planejado` → `valor_alvo`

#### `use-budget-alerts.ts`
- Linha 29: `.eq('mes_ref')` → `.eq('mes')`
- Linha 16: Interface `mes_ref` → `mes`
- Linha 100: `valor_planejado` → `valor_alvo`
- Linha 104: `mes_ref` → `mes`

### 2. ✅ Componentes Corrigidos

#### `budget-list.tsx:89`
```typescript
// Antes
{format(new Date(budget.mes_ref), "MMMM 'de' yyyy", { locale: ptBR })}

// Depois
{format(new Date(budget.mes), "MMMM 'de' yyyy", { locale: ptBR })}
```

```typescript
// Antes
{formatCurrency(budget.valor_planejado)}

// Depois
{formatCurrency(budget.valor_alvo)}
```

Removido: Seção de alertas (80% e 100%) que não existem no schema

#### `budget-form.tsx`
- Linha 26: `budget.mes_ref` → `budget.mes`
- Linha 31: `budget.valor_planejado` → `budget.valor_alvo`
- Removido: Todos os campos de alertas personalizados
- Simplificado: Submit apenas com `categoria_id`, `mes`, `valor_planejado`

### 3. ✅ Interfaces TypeScript

#### Budget Interface
```typescript
// Antes
export interface Budget {
  id: string
  categoria_id: string
  mes_ref: string              // ❌
  valor_planejado: number      // ❌
  valor_alerta_80: number      // ❌
  valor_alerta_100: number     // ❌
  categoria?: {...}
}

// Depois
export interface Budget {
  id: string
  categoria_id: string
  mes: string                  // ✅
  valor_alvo: number          // ✅
  categoria?: {...}
}
```

#### BudgetAlert Interface
```typescript
// Antes
mes_ref: string              // ❌

// Depois
mes: string                  // ✅
```

## Arquivos Modificados

### Hooks:
- ✅ `apps/web/src/lib/hooks/use-budget-mutations.ts`
- ✅ `apps/web/src/lib/hooks/use-budget-data.ts`
- ✅ `apps/web/src/lib/hooks/use-budget-alerts.ts`

### Componentes:
- ✅ `apps/web/src/components/orcamento/budget-list.tsx`
- ✅ `apps/web/src/components/orcamento/budget-form.tsx`

## Features Removidas (Não existem no schema)

### Alertas de Orçamento
O schema original não inclui:
- ❌ `valor_alerta_80`
- ❌ `valor_alerta_100`

**Removido**:
- Campos de alertas personalizados no formulário
- Display de alertas na lista de orçamentos
- Lógica de cálculo de alertas baseada em colunas que não existem

**Nota**: Após a migration de `categoria_id` em transacao, os alertas poderão ser calculados dinamicamente comparando `valor_alvo` com gastos reais.

## Estado Atual

### ✅ Funcionando:
- Criar orçamento (categoria + mês + valor)
- Listar orçamentos
- Editar orçamento
- Excluir orçamento
- Filtrar por mês
- Visualizar gráfico (orçado)

### ⚠️ Limitações:
- Valores realizados = R$ 0 (requer migration)
- Alertas desabilitados (requer migration)
- Sem campos de alerta personalizado (não existem no schema)

## Teste Rápido

1. Acesse `http://localhost:3000/orcamento`
2. ✅ Página carrega sem erro
3. ✅ Clique em "Novo Orçamento"
4. ✅ Formulário simplificado (sem alertas)
5. ✅ Criar orçamento funciona
6. ✅ Lista exibe corretamente

## Próximos Passos

Se quiser adicionar alertas de volta:
1. Criar migration para adicionar colunas `valor_alerta_80` e `valor_alerta_100`
2. OU calcular alertas dinamicamente após migration de `categoria_id`
