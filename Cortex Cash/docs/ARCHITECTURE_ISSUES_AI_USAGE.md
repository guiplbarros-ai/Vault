# 🚨 Problemas de Arquitetura - AI Usage System

**Agent CORE: Audit Report**
**Data**: 2025-11-05
**Arquivo Analisado**: `app/api/ai/usage/route.ts`, `lib/services/ai-usage.service.ts`

---

## ⚠️ PROBLEMAS CRÍTICOS (Geram Conflitos)

### 1. 🔴 **Taxa de Câmbio Duplicada e Inconsistente**

**Localização:**
- `app/api/ai/usage/route.ts:5` → `const USD_TO_BRL = 6.0`
- `lib/services/ai-usage.service.ts:144` → `usdToBrl: number = 6.0`

**Problema:**
Dois valores hardcoded em lugares diferentes. Se um mudar, o outro não muda automaticamente.

**Impacto:**
- Cálculos de BRL podem divergir entre endpoint e service
- Difícil manutenção (DRY violation)
- Risco de inconsistência em relatórios

**Evidência de Conflito:**
```typescript
// No endpoint
const summary = await getAIUsageSummary(startOfMonth, endOfMonth, USD_TO_BRL); // 6.0
return NextResponse.json({
  limitBrl: limit * USD_TO_BRL, // Pode usar taxa diferente!
});
```

**Recomendação:**
- Criar `lib/config/currency.ts` com taxa centrali zada
- Ou buscar de API externa (mais correto)

---

### 2. 🔴 **`checkAIBudgetLimit` Ignora Taxa de Câmbio**

**Localização:**
- `lib/services/ai-usage.service.ts:237-264`

**Problema:**
A função `checkAIBudgetLimit` chama `getAIUsageSummary()` **SEM passar `usdToBrl`**, sempre usando o valor padrão (6.0).

**Código Problemático:**
```typescript
export async function checkAIBudgetLimit(...) {
  const summary = await getAIUsageSummary(
    new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    // ❌ FALTA: usdToBrl aqui!
  );
  // ...
}
```

**Conflito Real:**
```typescript
// No endpoint (route.ts:22)
const summary = await getAIUsageSummary(startOfMonth, endOfMonth, USD_TO_BRL);
// summary.total_cost_brl = X * 6.0

// No endpoint (route.ts:25)
const budgetCheck = await checkAIBudgetLimit(currentMonth, limit, 0.8);
// Internamente chama getAIUsageSummary() SEM usdToBrl
// Usa valor padrão 6.0, mas pode não ser o mesmo!
```

**Impacto:**
- **CRITICAL**: Se taxa mudar em um lugar, `budgetCheck` continua usando valor antigo
- Cálculos de porcentagem ficam errados
- Limite de gastos pode não funcionar corretamente

**Recomendação:**
- Adicionar parâmetro `usdToBrl` em `checkAIBudgetLimit`
- Ou calcular tudo em USD e converter apenas na apresentação

---

### 3. 🔴 **Recálculo de Datas Desnecessário (Code Smell)**

**Localização:**
- `app/api/ai/usage/route.ts:17-19` (calcula datas)
- `lib/services/ai-usage.service.ts:248-250` (recalcula as mesmas datas)

**Problema:**
Lógica de cálculo de datas duplicada. Se mudar em um lugar, esquece de mudar no outro.

**Código Duplicado:**
```typescript
// Endpoint
const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
const summary = await getAIUsageSummary(startOfMonth, endOfMonth, USD_TO_BRL);

// Service (dentro de checkAIBudgetLimit)
const summary = await getAIUsageSummary(
  new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), // DUPLICADO
  new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0) // DUPLICADO
);
```

**Impacto:**
- Violação de DRY (Don't Repeat Yourself)
- Bug potencial: se lógica de data mudar (ex: timezone), pode divergir
- Código difícil de manter

**Recomendação:**
- Criar helper `getMonthDateRange(date: Date)` centralizado
- Ou passar datas calculadas para `checkAIBudgetLimit`

---

### 4. 🔴 **Type Safety Quebrado: `any` em Log Creation**

**Localização:**
- `lib/services/ai-usage.service.ts:103`

**Problema:**
```typescript
const log: any = {  // ❌ PERDE TYPE SAFETY
  id: crypto.randomUUID(),
  // ...
};
```

**Impacto:**
- Pode salvar dados inválidos no banco
- TypeScript não valida estrutura
- Bugs em runtime difíceis de debugar

**Evidência de Risco:**
```typescript
// Isso compila sem erro:
const log: any = {
  id: 123, // ❌ Deveria ser string
  modelo: 'invalid-model', // ❌ Não é keyof PRICING
  tokens_prompt: "abc", // ❌ Deveria ser number
};
await db.logs_ia.add(log); // Salva dados corrompidos!
```

**Recomendação:**
- Criar type `LogIA` consistente com schema
- Remover `any` e usar type explícito

---

### 5. 🔴 **Inconsistência de Types: `modelo`**

**Localização:**
- `lib/services/ai-usage.service.ts:31` → `modelo: string`
- `lib/services/ai-usage.service.ts:46` → `modelo: keyof typeof PRICING`

**Problema:**
```typescript
export interface AIUsageLog {
  modelo: string; // ❌ Qualquer string aceita
  // ...
}

export interface CreateAIUsageLogDTO {
  modelo: keyof typeof PRICING; // ✅ Apenas 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo'
  // ...
}
```

**Conflito:**
Se `AIUsageLog` tem `modelo: string`, pode conter valor inválido que quebra `calculateCost`.

**Cenário de Falha:**
```typescript
// Alguém salva diretamente no banco:
await db.logs_ia.add({
  id: '...',
  modelo: 'gpt-5-ultra', // ❌ Modelo inválido
  // ...
});

// Depois, ao buscar:
const logs = await db.logs_ia.toArray();
logs.forEach(log => {
  const cost = calculateCost(log.modelo, ...); // 💥 CRASH! Modelo não existe em PRICING
});
```

**Recomendação:**
- Fazer `AIUsageLog.modelo` ser `keyof typeof PRICING` também
- Adicionar validação em `calculateCost` com erro claro

---

### 6. 🟡 **Falta Validação de `limitUsd`**

**Localização:**
- `lib/services/ai-usage.service.ts:237-264`

**Problema:**
```typescript
export async function checkAIBudgetLimit(
  currentMonth: Date = new Date(),
  limitUsd: number, // ❌ Sem validação
  warningThreshold: number = 0.8
) {
  // ...
  const percentageUsed = limitUsd > 0 ? (usedUsd / limitUsd) * 100 : 0;
  // ❌ E se limitUsd for negativo? -10?
}
```

**Cenário de Falha:**
```typescript
await checkAIBudgetLimit(new Date(), -5, 0.8);
// percentageUsed = (10 / -5) * 100 = -200% 🤯
// isOverLimit = 10 > -5 = true (tecnicamente correto, mas não faz sentido)
```

**Recomendação:**
- Validar `limitUsd >= 0`
- Lançar `ValidationError` se inválido

---

### 7. 🔴 **"Rejected" ≠ "Not Confirmed"**

**Localização:**
- `lib/services/ai-usage.service.ts:165`

**Problema:**
```typescript
const rejected_suggestions = suggestions.filter(log => !log.confirmada).length;
```

**Lógica Falha:**
- `confirmada: false` pode significar:
  1. Usuário **rejeitou** ativamente
  2. Usuário **ainda não decidiu** (pending)
  3. Sugestão nunca foi apresentada

**Impacto:**
- Métricas erradas
- Dashboard mostra "rejeitadas" mas na verdade são "pendentes"

**Recomendação:**
- Adicionar campo `status: 'pending' | 'accepted' | 'rejected'`
- Ou adicionar `rejected_at: Date | null`

---

### 8. 🔴 **Performance: Sem Índice de Data**

**Localização:**
- `lib/services/ai-usage.service.ts:152-156`, `199-203`

**Problema:**
```typescript
const allLogs = await db.logs_ia.toArray(); // ❌ Carrega TUDO na memória
const logs = allLogs.filter(log => {
  const logDate = log.created_at instanceof Date ? log.created_at : new Date(log.created_at);
  return logDate >= start && logDate <= end;
});
```

**Impacto:**
- Com 10.000+ logs, fica **muito lento**
- Usa muita memória
- Não escala

**Schema Atual:**
```typescript
logs_ia: 'id, transacao_id, modelo, created_at'
```

**Problema:**
`created_at` está no índice, mas query não usa `.where('created_at')`, usa `.toArray()` + `filter()`

**Recomendação:**
- Usar Dexie queries com índice:
```typescript
const logs = await db.logs_ia
  .where('created_at')
  .between(start, end, true, true)
  .toArray();
```

---

### 9. 🟡 **Missing BRL Consistency in Response**

**Localização:**
- `app/api/ai/usage/route.ts:27-32`

**Problema:**
```typescript
return NextResponse.json({
  usedBrl: summary.total_cost_brl,      // Calculado com usdToBrl do getAIUsageSummary
  limitBrl: limit * USD_TO_BRL,         // Calculado com USD_TO_BRL do endpoint
  // ❌ Podem usar taxas diferentes!
});
```

**Conflito:**
Se `getAIUsageSummary` usar taxa 5.8 e endpoint usar 6.0, os números não batem.

**Evidência:**
```typescript
// Se o service usar usdToBrl = 5.8:
summary.total_cost_brl = 10 USD * 5.8 = R$ 58

// E o endpoint usar USD_TO_BRL = 6.0:
limitBrl = 10 USD * 6.0 = R$ 60

// Usuário vê: Gastou R$ 58 de R$ 60
// Mas percentual é 10/10 = 100%! 🤯
```

**Recomendação:**
- Usar mesma taxa em ambos os lugares
- Ou retornar apenas USD e converter no frontend

---

### 10. 🟡 **`confirmAISuggestion` Não Integrado**

**Localização:**
- `lib/services/ai-usage.service.ts:129-136`

**Problema:**
Função existe mas não é chamada em nenhum lugar do código.

**Busca realizada:**
```bash
grep -r "confirmAISuggestion" .
# Resultado: Apenas a definição, nenhum uso
```

**Impacto:**
- Funcionalidade órfã
- Métricas de `confirmed_suggestions` sempre será 0
- Dashboard de accuracy não funciona

**Recomendação:**
- Integrar com fluxo de confirmação de categoria
- Ou remover se não for usado

---

## 📊 Resumo

| Severidade | Quantidade | Problemas |
|------------|------------|-----------|
| 🔴 **Critical** | 7 | Taxa duplicada, checkBudgetLimit sem usdToBrl, type safety quebrado, inconsistência de modelo, performance sem índice, BRL inconsistente, rejected != not confirmed |
| 🟡 **Warning**  | 3 | Recálculo de datas, falta validação limitUsd, confirmAISuggestion órfã |
| **TOTAL** | **10** | **Problemas de arquitetura identificados** |

---

## 🎯 Prioridade de Correção

### P0 - Urgente (Quebra Produção)
1. Corrigir `checkAIBudgetLimit` para receber `usdToBrl`
2. Fixar inconsistência de BRL no response
3. Adicionar índice de data e usar queries otimizadas

### P1 - Alta (Bugs Potenciais)
4. Remover `any` type em log creation
5. Fixar type de `modelo` (usar keyof PRICING)
6. Centralizar taxa de câmbio

### P2 - Média (Code Quality)
7. Criar helper para cálculo de datas
8. Adicionar validação de limitUsd
9. Adicionar status field para suggestions

### P3 - Baixa (Nice to Have)
10. Integrar ou remover confirmAISuggestion

---

**Próximos Passos:**
1. Criar testes que exponham esses problemas
2. Fixar problemas P0 primeiro
3. Refatorar arquitetura gradualmente
