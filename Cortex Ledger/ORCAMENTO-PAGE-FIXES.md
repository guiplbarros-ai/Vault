# ✅ Correções Aplicadas - Página de Orçamento

## Erro Original
```
GET http://localhost:3000/orcamento 500 (Internal Server Error)
```

## Causa Raiz
Múltiplos hooks tentavam acessar:
1. Relacionamento `categoria:categoria_id` em `orcamento` (não suportado sem migration)
2. Coluna `categoria_id` em `transacao` (não existe)

## Correções Aplicadas

### 1. ✅ `use-budget-mutations.ts:124-174`
**Problema**: Query usava `select('*, categoria:categoria_id (id, nome, grupo)')`

**Solução**:
- Busca orçamentos sem relacionamento
- Busca categorias separadamente em segunda query
- Faz join manual via Record/Map
- Adiciona verificação de sessão

**Status**: Funciona! Lista orçamentos com categorias corretamente

---

### 2. ✅ `use-budget-alerts.ts:19-111`
**Problema**:
- Query usava relacionamento categoria em orcamento
- Tentava filtrar transacoes por `categoria_id` (não existe)

**Solução**:
- Desabilitado temporariamente (retorna `[]`)
- Código comentado para restaurar após migration
- Console warning informativo

**Status**: Sem erros, mas alertas desabilitados até migration

---

### 3. ✅ `use-budget-data.ts:13-102`
**Problema**:
- Query usava relacionamento categoria
- Tentava buscar transações por categoria_id

**Solução**:
- Busca categorias separadamente
- Retorna apenas valores orçados
- `realizado: 0` e `percentual: 0` temporariamente
- Código comentado para restaurar após migration

**Status**: Gráfico mostra barras de orçado, realizado zerado

---

## Estado Atual da Página `/orcamento`

### ✅ Funcionando:
- Página carrega sem erro 500
- Seletor de mês funciona
- Botão "Novo Orçamento" funciona
- Lista de orçamentos exibe com categorias
- Valores planejados são exibidos
- Botões editar/excluir funcionam

### ⚠️ Limitações Temporárias:
- Gráfico "Orçado vs Realizado" mostra apenas orçado
- Valores realizados aparecem como R$ 0
- Alertas de orçamento não são gerados
- Percentuais mostram 0%

### ❌ Requer Migration:
Para funcionalidade completa, aplicar:
```sql
alter table transacao
  add column if not exists categoria_id uuid references categoria(id) on delete set null;

create index if not exists idx_tx_categoria on transacao(categoria_id);
```

## Hooks Modificados

| Hook | Status | Limitação |
|------|--------|-----------|
| `use-budget-mutations.ts` | ✅ Funciona | Nenhuma |
| `use-budget-alerts.ts` | ⚠️ Desabilitado | Retorna [] |
| `use-budget-data.ts` | ⚠️ Parcial | realizado=0 |

## Arquivos com Código Comentado

Após migration, descomentar blocos em:
1. `apps/web/src/lib/hooks/use-budget-alerts.ts:62-110`
2. `apps/web/src/lib/hooks/use-budget-data.ts:70-101`
3. `apps/web/src/lib/hooks/use-top-expenses.AFTER-MIGRATION.ts`

## Teste Rápido

1. Acesse `http://localhost:3000/orcamento`
2. Deve carregar sem erro 500 ✅
3. Se tiver orçamentos, aparecerão na lista ✅
4. Gráfico mostra apenas barras azuis (orçado) ⚠️
5. Sem alertas exibidos ⚠️

## Próximos Passos

Para habilitar funcionalidade completa:
1. Aplicar migration SQL (ver MIGRATION-REQUIRED.md)
2. Descomentar código nos hooks
3. Reiniciar servidor
4. Testar alertas e valores realizados
