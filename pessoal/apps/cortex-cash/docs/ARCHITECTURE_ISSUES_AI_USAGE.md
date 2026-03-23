# Problemas de Arquitetura - AI Usage System

**Audit Report Original**: 2025-11-05
**Última Revisão**: 2026-03-23

---

## Status Geral

| Severidade | Total | Corrigido | Restante |
|------------|-------|-----------|----------|
| 🔴 Critical | 7 | 6 | 1 |
| 🟡 Warning | 3 | 1 | 2 |
| **TOTAL** | **10** | **7** | **3** |

---

## ✅ Corrigidos

### 1. ~~Taxa de Câmbio Duplicada~~ → Centralizada em `lib/config/currency.ts`
### 2. ~~`checkAIBudgetLimit` sem `usdToBrl`~~ → Parâmetro adicionado
### 3. ~~Recálculo de Datas~~ → Helper `getMonthDateRange()` adicionado
### 4. ~~Type Safety (`any` em log)~~ → Objeto tipado corretamente
### 5. ~~Inconsistência `modelo`~~ → `AIModel` type alias unificado
### 6. ~~Falta Validação `limitUsd`~~ → `limitUsd >= 0` validado
### 9. ~~BRL Inconsistente~~ → Mesma taxa centralizada usada em ambos

---

## 🔴 Restantes

### 7. "Rejected" ≠ "Not Confirmed"

**Localização:** `lib/services/ai-usage.service.ts` — `getAIUsageSummary()`

**Problema:**
`confirmada: false` pode significar "rejeitado" ou "pendente". Métricas de `rejected_suggestions` são imprecisas.

**Recomendação:**
Adicionar campo `status: 'pending' | 'accepted' | 'rejected'` na tabela `logs_ia`.

**Prioridade:** P2 — Quando implementar dashboard de accuracy.

---

### 8. Performance: Sem Index Otimizado (Server Store)

**Localização:** `lib/services/ai-usage.store.ts` — `ServerAIUsageStore`

**Problema:**
`ServerAIUsageStore` (in-memory) itera todos os records com `.filter()`. Com muitos logs, isso degrada performance.

**Nota:** `SupabaseAIUsageStore` já usa `.gte()/.lte()` corretamente. O service principal também. Issue é apenas no server store em memória.

**Prioridade:** P3 — Server store é efêmero e normalmente tem poucos records.

---

### 10. `confirmAISuggestion` Não Integrado

**Localização:** `lib/services/ai-usage.service.ts`

**Problema:** Função existe mas não é chamada em nenhum lugar. Métricas de `confirmed_suggestions` são sempre 0.

**Prioridade:** P3 — Integrar quando implementar fluxo de confirmação de categoria.
