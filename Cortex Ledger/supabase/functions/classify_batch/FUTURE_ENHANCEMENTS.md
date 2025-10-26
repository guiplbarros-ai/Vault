# Future Enhancements for classify_batch

Este documento descreve melhorias planejadas mas não implementadas no v1 da Edge Function `classify_batch`.

---

## 1. Confidence Threshold Gating (`confianca_min`)

### Problema

Atualmente, regras são binárias: match ou não match. Não há conceito de "confiança" na aplicação de uma regra.

### Proposta

Implementar `confianca_min` como um **gate para validação adicional via IA**, mesmo quando uma regra já deu match.

#### Use Case

Uma regra pode ser muito genérica (ex: `contains: 'PIX'`) e capturar muitos tipos de transação. O usuário pode querer:
1. Aplicar a regra normalmente (categoria padrão)
2. MAS também pedir validação da IA para casos ambíguos

#### Implementação Proposta

```typescript
interface Regra {
  // ... campos existentes
  confianca_min: number | null; // 0.0 - 1.0
  validar_com_ia: boolean;       // novo campo
}

function applyRulesWithConfidence(
  tx: Transacao,
  regras: Regra[]
): ClassificationResult | null {
  const normalizedDesc = normalizeDescription(tx.descricao);

  for (const regra of regras.sort((a, b) => a.ordem - b.ordem)) {
    if (!matchRule(regra, normalizedDesc)) continue;

    // Match encontrado!
    const ruleResult: ClassificationResult = {
      categoria_id: regra.categoria_id,
      tags: regra.tags,
      source: "rule",
      score: 1.0,
      reason: `Rule #${regra.ordem}`,
    };

    // Se regra requer validação adicional
    if (regra.validar_com_ia && regra.confianca_min !== null) {
      // Calcular heurística de confiança
      const heuristicScore = calculateHeuristicConfidence(tx, regra);

      // Se confiança heurística < threshold, chamar IA também
      if (heuristicScore < regra.confianca_min) {
        // Retornar para que OpenAI valide
        return null; // forçar fallback
      }
    }

    return ruleResult;
  }

  return null; // nenhuma regra deu match
}

function calculateHeuristicConfidence(
  tx: Transacao,
  regra: Regra
): number {
  // Heurísticas possíveis:
  // 1. Especificidade da regra (regex complexo = maior confiança)
  // 2. Histórico de acertos desta regra (accuracy em classificações passadas)
  // 3. Valor da transação (altos valores = maior cautela = menor confiança)
  // 4. Frequência do merchant (novo merchant = menor confiança)

  let score = 0.7; // baseline

  // Heurística 1: tipo de regra
  switch (regra.tipo_regra) {
    case "regex":
      score += 0.2; // regex é mais específico
      break;
    case "starts":
    case "ends":
      score += 0.1; // moderadamente específico
      break;
    case "contains":
      score += 0.0; // menos específico
      break;
  }

  // Heurística 2: valor alto = cautela
  if (Math.abs(tx.valor) > 500) {
    score -= 0.2;
  }

  // Heurística 3: comprimento da expressão (proxy para especificidade)
  if (regra.expressao.length > 10) {
    score += 0.1;
  }

  return Math.max(0, Math.min(1, score));
}
```

#### Schema Update Needed

```sql
ALTER TABLE regra_classificacao
ADD COLUMN validar_com_ia BOOLEAN DEFAULT false;

-- Exemplo de uso:
-- Regra genérica que quer validação IA em casos duvidosos
INSERT INTO regra_classificacao (ordem, expressao, tipo_regra, categoria_id, confianca_min, validar_com_ia)
VALUES (10, 'PIX', 'contains', 'cat-transferencias', 0.8, true);

-- Regra específica sem necessidade de validação
INSERT INTO regra_classificacao (ordem, expressao, tipo_regra, categoria_id, confianca_min, validar_com_ia)
VALUES (1, '^UBER\\s+\*TRIP', 'regex', 'cat-transporte', NULL, false);
```

#### UI/UX Impact

- Checkbox na UI de criação de regra: "Validar com IA quando duvidoso"
- Slider para `confianca_min`: "Confiança mínima para aplicar automaticamente (0-100%)"

---

## 2. Batch Optimization for OpenAI Calls

### Problema

Atualmente, chamamos OpenAI **uma vez por transação** em série. Para 100 transações não classificadas:
- 100 requests sequenciais
- ~2-3s de latência cada
- Total: **3-5 minutos**

### Proposta

#### Opção A: Parallel Requests com Rate Limiting

```typescript
async function classifyBatchWithOpenAI(
  txs: Transacao[],
  openaiApiKey: string,
  model: string,
  maxConcurrency: number = 5
): Promise<Map<string, OpenAIResponse>> {
  const results = new Map<string, OpenAIResponse>();
  const queue = [...txs];

  async function worker() {
    while (queue.length > 0) {
      const tx = queue.shift();
      if (!tx) break;

      const response = await classifyWithOpenAI(tx, openaiApiKey, model);
      if (response) {
        results.set(tx.id, response);
      }

      // Rate limiting: aguardar 200ms entre requests
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Executar workers em paralelo
  await Promise.all(
    Array.from({ length: maxConcurrency }, () => worker())
  );

  return results;
}
```

**Ganho:** 100 txs em ~20-30s (vs 3-5 min)

#### Opção B: Batch Request com Múltiplas Transações por Prompt

```typescript
async function classifyBatchWithOpenAI(
  txs: Transacao[],
  openaiApiKey: string,
  model: string,
  batchSize: number = 10
): Promise<Map<string, OpenAIResponse>> {
  const results = new Map<string, OpenAIResponse>();

  for (let i = 0; i < txs.length; i += batchSize) {
    const batch = txs.slice(i, i + batchSize);

    const prompt = `Classify the following ${batch.length} transactions. Return a JSON array with one object per transaction.

Transactions:
${batch.map((tx, idx) => `${idx + 1}. "${tx.descricao}" (${tx.valor} on ${tx.data})`).join('\n')}

Respond ONLY with valid JSON array:
[
  {"index": 1, "categoria_id": "uuid or null", "tags": [], "score": 0.0-1.0, "reason": "..."},
  {"index": 2, "categoria_id": "uuid or null", "tags": [], "score": 0.0-1.0, "reason": "..."},
  ...
]`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1000, // mais tokens para batch
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "[]";
    const parsed = JSON.parse(content);

    // Mapear resultados de volta para transações
    for (const result of parsed) {
      const tx = batch[result.index - 1];
      if (tx) {
        results.set(tx.id, {
          categoria_id: result.categoria_id,
          tags: result.tags || [],
          score: result.score || 0.5,
          reason: result.reason || "Batch classification",
          tokens_in: data.usage?.prompt_tokens / batch.length || 0,
          tokens_out: data.usage?.completion_tokens / batch.length || 0,
          model: data.model || model,
          cost_usd: ((data.usage?.prompt_tokens + data.usage?.completion_tokens) / 1_000_000) * 0.15,
        });
      }
    }
  }

  return results;
}
```

**Ganho:** 100 txs em ~10-15s + economia de custos (menos overhead de requests)

**Trade-off:** Parsing mais complexo; risco de falha em batch inteiro se JSON inválido

---

## 3. Few-Shot Learning com Exemplos do Usuário

### Problema

OpenAI classifica "no escuro", sem conhecer o histórico de classificações do usuário.

### Proposta

Incluir **exemplos de classificações confirmadas** no prompt para melhorar acurácia.

```typescript
async function classifyWithOpenAI(
  tx: Transacao,
  openaiApiKey: string,
  model: string,
  userExamples: Array<{ descricao: string; categoria: string; tags: string[] }>
): Promise<OpenAIResponse | null> {
  const fewShotExamples = userExamples
    .slice(0, 5) // top 5 exemplos mais relevantes
    .map(
      (ex) =>
        `- Description: "${ex.descricao}" → Category: "${ex.categoria}", Tags: [${ex.tags.join(", ")}]`
    )
    .join("\n");

  const prompt = `You are a financial transaction classifier. Learn from these examples:

${fewShotExamples}

Now classify this new transaction:
- Description: "${tx.descricao}"
- Amount: ${tx.valor}
- Date: ${tx.data}

Respond ONLY with valid JSON:
{
  "categoria_id": "<UUID or null>",
  "tags": ["tag1", "tag2"],
  "score": <0.0-1.0>,
  "reason": "Brief explanation"
}`;

  // ... rest of OpenAI call
}
```

**Ganho:** Acurácia aumenta de ~70% para ~85-90% após feedback do usuário

---

## 4. Caching de Descrições Normalizadas

### Problema

Transações duplicadas ou muito similares são reclassificadas toda vez.

### Proposta

Cache em memória (ou Redis) de classificações recentes por `hash_dedupe` ou descrição normalizada.

```typescript
interface ClassificationCache {
  key: string; // hash da descrição normalizada
  categoria_id: string;
  tags: string[];
  score: number;
  ttl: number; // timestamp de expiração
}

const cache = new Map<string, ClassificationCache>();

function getCachedClassification(
  normalizedDesc: string
): ClassificationCache | null {
  const key = hashString(normalizedDesc);
  const cached = cache.get(key);

  if (cached && cached.ttl > Date.now()) {
    return cached;
  }

  cache.delete(key);
  return null;
}

function setCachedClassification(
  normalizedDesc: string,
  result: ClassificationResult
): void {
  const key = hashString(normalizedDesc);
  cache.set(key, {
    key,
    categoria_id: result.categoria_id || "",
    tags: result.tags || [],
    score: result.score,
    ttl: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 dias
  });
}
```

**Ganho:** Reduz custos de IA em ~30-40% para usuários com transações recorrentes

---

## 5. Realtime Notifications

### Problema

Cliente não sabe quando a classificação terminou.

### Proposta

Emitir evento Realtime ao final do batch.

```typescript
// No final de Deno.serve()
if (!dryRun && categorizedCount > 0) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type: "classification_complete",
    payload: {
      processed: txs.length,
      categorized: categorizedCount,
      openaiCalls: openaiCallCount,
    },
  });

  // Ou usar Realtime broadcast
  await supabase.realtime.channel(`user:${userId}`).send({
    type: "broadcast",
    event: "classification_complete",
    payload: { processed: txs.length, categorized: categorizedCount },
  });
}
```

**Ganho:** Melhor UX; cliente pode atualizar UI instantaneamente

---

## 6. Error Recovery e Retry Logic

### Problema

Falhas transientes de OpenAI (rate limit, timeout) abortam todo o batch.

### Proposta

Retry com exponential backoff.

```typescript
async function classifyWithOpenAIRetry(
  tx: Transacao,
  openaiApiKey: string,
  model: string,
  maxRetries: number = 3
): Promise<OpenAIResponse | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await classifyWithOpenAI(tx, openaiApiKey, model);
    } catch (error) {
      lastError = error as Error;

      // Retry apenas em erros transientes
      if (error.message?.includes("rate_limit") || error.message?.includes("timeout")) {
        const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      // Erro não-transiente: abortar
      break;
    }
  }

  console.error(`Failed to classify tx ${tx.id} after ${maxRetries} retries:`, lastError);
  return null;
}
```

**Ganho:** Maior resiliência; menos falhas em produção

---

## Priorização Recomendada

1. **Batch Optimization (Opção A)** — Alto impacto, baixo risco
2. **Few-Shot Learning** — Alto impacto na acurácia
3. **Error Recovery** — Importante para produção
4. **Caching** — Economia de custos
5. **Confidence Gating** — Menor prioridade (use case específico)
6. **Realtime Notifications** — UX, mas não crítico

---

## Implementação Incremental

**Sprint 1 (pós-v1):**
- Batch Optimization (parallel requests)
- Error Recovery

**Sprint 2:**
- Few-Shot Learning
- Caching

**Sprint 3:**
- Realtime Notifications
- Confidence Gating

---

## Testes Necessários

Para cada enhancement:
- Unit tests (isolados)
- Integration tests (com Supabase + OpenAI em dev)
- Load tests (simular 1000+ txs)
- Cost tracking (validar economia real)

---

## Referências

- [OpenAI Rate Limits](https://platform.openai.com/docs/guides/rate-limits)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Edge Function Best Practices](https://supabase.com/docs/guides/functions/best-practices)
