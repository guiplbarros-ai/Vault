# API de Classificação com IA - Referência Completa
**Agent DATA: Owner | v0.4**

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Endpoints](#endpoints)
4. [Schemas e Tipos](#schemas-e-tipos)
5. [Códigos de Erro](#códigos-de-erro)
6. [Rate Limiting](#rate-limiting)
7. [Exemplos de Uso](#exemplos-de-uso)

---

## Visão Geral

Base URL: `http://localhost:3000/api` (dev) ou `https://your-domain.com/api` (prod)

**Endpoints disponíveis:**
- `POST /ai/classify` - Classifica uma transação
- `POST /ai/config` - Valida configuração de IA
- `GET /ai/status` - Status da API key
- `GET /ai/usage` - Métricas de uso e custos

**Formato:** Todos os endpoints usam JSON

**Headers obrigatórios:**
```
Content-Type: application/json
```

---

## Autenticação

As APIs de IA são **server-side only**. A chave OpenAI nunca é exposta ao client.

**Configuração (server-side):**
```bash
# .env.local
OPENAI_API_KEY=sk-...
```

**⚠️ NUNCA faça:**
```bash
# ❌ ERRADO - expõe chave no client
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
```

---

## Endpoints

### 1. POST `/api/ai/classify`

Classifica automaticamente uma transação usando regras + IA.

#### Request

```typescript
POST /api/ai/classify
Content-Type: application/json

{
  "descricao": string,           // Obrigatório
  "valor": number,                // Obrigatório
  "tipo": "receita" | "despesa",  // Obrigatório
  "transacao_id"?: string,        // Opcional (para logging)
  "config"?: {                    // Opcional (usa defaults se omitido)
    "defaultModel": "gpt-4o-mini" | "gpt-4o" | "gpt-3.5-turbo",
    "monthlyCostLimit": number,   // USD
    "allowOverride": boolean,
    "strategy": "aggressive" | "balanced" | "quality"
  }
}
```

**Campos:**
- `descricao`: Texto da transação (ex: "Almoço no restaurante")
- `valor`: Valor monetário (ex: 45.50)
- `tipo`: Tipo da transação (receita ou despesa)
- `transacao_id`: ID da transação (opcional, para vincular log)
- `config`: Configurações opcionais (usa defaults do localStorage se omitido)

#### Response (Sucesso)

```typescript
200 OK

{
  "categoria_sugerida_id": string | null,
  "categoria_nome": string | null,
  "confianca": number,              // 0.0 - 1.0
  "reasoning": string,
  "cached"?: boolean                // true se veio do cache
}
```

**Exemplo:**
```json
{
  "categoria_sugerida_id": "cat-123",
  "categoria_nome": "Alimentação",
  "confianca": 0.95,
  "reasoning": "Compra em restaurante",
  "cached": false
}
```

**Resposta quando não encontra categoria:**
```json
{
  "categoria_sugerida_id": null,
  "categoria_nome": null,
  "confianca": 0.0,
  "reasoning": "Não foi possível classificar automaticamente"
}
```

#### Response (Erro)

**400 Bad Request** - Validação falhou
```json
{
  "error": "Campos obrigatórios ausentes",
  "message": "Campo 'descricao' é obrigatório",
  "details": {
    "missing_fields": ["descricao"]
  }
}
```

**429 Too Many Requests** - Limite de custo excedido
```json
{
  "error": "Limite de custos excedido",
  "message": "Você atingiu o limite mensal de $10.00 USD",
  "details": {
    "used_usd": 10.5,
    "limit_usd": 10.0,
    "percentage": 105
  }
}
```

**500 Internal Server Error** - Erro na OpenAI
```json
{
  "error": "Erro ao classificar transação",
  "message": "OpenAI API error: Rate limit exceeded",
  "details": {
    "provider": "openai",
    "status_code": 429
  }
}
```

**503 Service Unavailable** - API key não configurada
```json
{
  "error": "API key não configurada",
  "message": "Configure OPENAI_API_KEY no arquivo .env.local"
}
```

#### Comportamento

1. **Verifica API key** - Retorna 503 se não configurada
2. **Valida entrada** - Retorna 400 se campos obrigatórios ausentes
3. **Verifica orçamento** - Retorna 429 se limite excedido (exceto se `allowOverride: true`)
4. **Busca no cache** - Se encontrar (similarity >= 85%), retorna com `cached: true`
5. **Aplica regras** - Busca regras ativas por tipo e ordem de prioridade
6. **Consulta IA** - Se não encontrou em cache nem regras, chama OpenAI
7. **Registra uso** - Salva log com tokens, custo, confiança
8. **Retorna resultado** - Categoria + confiança + reasoning

---

### 2. POST `/api/ai/config`

Valida uma configuração de IA sem fazer classificação.

#### Request

```typescript
POST /api/ai/config
Content-Type: application/json

{
  "defaultModel": "gpt-4o-mini" | "gpt-4o" | "gpt-3.5-turbo",
  "monthlyCostLimit": number,
  "allowOverride": boolean,
  "strategy": "aggressive" | "balanced" | "quality",
  "cachePrompts": boolean,
  "batchProcessing": boolean,
  "batchSize": 10 | 25 | 50 | 100
}
```

#### Response

```typescript
200 OK

{
  "success": true,
  "config": {
    "defaultModel": "gpt-4o-mini",
    "monthlyCostLimit": 10.0,
    "allowOverride": false,
    "strategy": "balanced",
    "cachePrompts": true,
    "batchProcessing": false,
    "batchSize": 25
  }
}
```

**Uso:**
Valida configuração antes de salvar no localStorage client-side.

---

### 3. GET `/api/ai/status`

Verifica status da API key OpenAI.

#### Request

```typescript
GET /api/ai/status
```

#### Response

```typescript
200 OK

{
  "apiKeyConfigured": boolean,
  "timestamp": string  // ISO 8601
}
```

**Exemplos:**

**Com API key configurada:**
```json
{
  "apiKeyConfigured": true,
  "timestamp": "2025-11-05T18:30:00.000Z"
}
```

**Sem API key:**
```json
{
  "apiKeyConfigured": false,
  "timestamp": "2025-11-05T18:30:00.000Z"
}
```

**Uso:**
- Verificar status antes de exibir features de IA
- Mostrar banner de configuração se `apiKeyConfigured: false`
- Polling para detectar quando usuário configurou a key

---

### 4. GET `/api/ai/usage`

Retorna métricas de uso e custos do mês atual.

#### Request

```typescript
GET /api/ai/usage?limit=10
```

**Query params:**
- `limit` (opcional): Limite mensal em USD (default: 10.0)

#### Response

```typescript
200 OK

{
  "usedBrl": number,
  "limitBrl": number,
  "percentage": number,
  "isNearLimit": boolean,      // true se >= 80%
  "isOverLimit": boolean,      // true se >= 100%
  "summary": {
    "total_requests": number,
    "total_tokens": number,
    "confirmed_suggestions": number,
    "rejected_suggestions": number,
    "average_confidence": number  // 0.0 - 1.0
  }
}
```

**Exemplo:**
```json
{
  "usedBrl": 2.34,
  "limitBrl": 60.00,
  "percentage": 3.9,
  "isNearLimit": false,
  "isOverLimit": false,
  "summary": {
    "total_requests": 15,
    "total_tokens": 2500,
    "confirmed_suggestions": 12,
    "rejected_suggestions": 3,
    "average_confidence": 0.87
  }
}
```

**Cálculo:**
- `usedBrl` = soma de `custo_usd * USD_TO_BRL` dos logs do mês
- `limitBrl` = `limit (query param) * USD_TO_BRL`
- `percentage` = `(usedBrl / limitBrl) * 100`
- `isNearLimit` = `percentage >= 80`
- `isOverLimit` = `percentage >= 100`

**Taxa de câmbio:**
```typescript
const USD_TO_BRL = 6.0;  // Hardcoded (TODO: API de cotação)
```

---

## Schemas e Tipos

### Config de IA

```typescript
interface AIConfig {
  defaultModel: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';
  monthlyCostLimit: number;    // USD
  allowOverride: boolean;
  strategy: 'aggressive' | 'balanced' | 'quality';
  cachePrompts?: boolean;
  batchProcessing?: boolean;
  batchSize?: 10 | 25 | 50 | 100;
}
```

**Defaults:**
```typescript
{
  defaultModel: 'gpt-4o-mini',
  monthlyCostLimit: 10.0,
  allowOverride: false,
  strategy: 'balanced',
  cachePrompts: true,
  batchProcessing: false,
  batchSize: 25,
}
```

### Estratégias

```typescript
type Strategy = 'aggressive' | 'balanced' | 'quality';

const strategyConfigs = {
  aggressive: {
    temperature: 0.5,
    max_tokens: 150,
  },
  balanced: {
    temperature: 0.3,
    max_tokens: 200,
  },
  quality: {
    temperature: 0.1,
    max_tokens: 300,
  },
};
```

### Resultado de Classificação

```typescript
interface ClassificationResult {
  categoria_sugerida_id: string | null;
  categoria_nome: string | null;
  confianca: number;
  reasoning: string;
  cached?: boolean;
}
```

### Log de IA

```typescript
interface LogIA {
  id: string;
  transacao_id?: string;
  prompt: string;
  resposta: string;
  modelo: string;
  tokens_prompt: number;
  tokens_resposta: number;
  tokens_total: number;
  custo_usd: number;
  categoria_sugerida_id?: string;
  confianca?: number;
  confirmada: boolean;
  created_at: Date;
}
```

---

## Códigos de Erro

| Código | Situação | Causa | Solução |
|--------|----------|-------|---------|
| **400** | Bad Request | Campos obrigatórios ausentes ou inválidos | Verificar payload do request |
| **429** | Too Many Requests | Limite de custo mensal excedido | Aumentar limite ou esperar próximo mês |
| **500** | Internal Server Error | Erro na OpenAI API (rate limit, down, etc) | Tentar novamente em alguns minutos |
| **503** | Service Unavailable | API key não configurada | Configurar `OPENAI_API_KEY` no `.env.local` |

---

## Rate Limiting

### Lado Cliente

**Sem limite fixo**, mas recomendações:
- Evitar múltiplas classificações simultâneas (use batch)
- Debounce de 300ms em classificação automática durante digitação
- Mostrar loading state durante request

### Lado Servidor (OpenAI)

**Limites da OpenAI (tier free):**
- **Requests:** 500/dia, 10.000/mês
- **Tokens:** 200K/dia, 2M/mês

**Nosso controle adicional:**
- Limite mensal configurável (default $10 USD)
- Bloqueio automático ao atingir limite (exceto se `allowOverride`)
- Alerta em 80% do limite

**Para aumentar limites:**
1. Adicionar cartão de crédito na OpenAI (tier paid)
2. Limites sobem para milhões de tokens/mês

---

## Exemplos de Uso

### cURL

#### Classificar transação

```bash
curl -X POST http://localhost:3000/api/ai/classify \
  -H 'Content-Type: application/json' \
  -d '{
    "descricao": "Uber aeroporto",
    "valor": 78.50,
    "tipo": "despesa"
  }'
```

#### Verificar status

```bash
curl http://localhost:3000/api/ai/status
```

#### Ver uso mensal

```bash
curl 'http://localhost:3000/api/ai/usage?limit=10'
```

---

### JavaScript (Fetch)

```typescript
// Classificar transação
const response = await fetch('/api/ai/classify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    descricao: 'Almoço no restaurante',
    valor: 45.50,
    tipo: 'despesa',
    transacao_id: '123',
  }),
});

if (response.ok) {
  const result = await response.json();
  console.log('Categoria:', result.categoria_nome);
  console.log('Confiança:', result.confianca);
} else {
  const error = await response.json();
  console.error('Erro:', error.message);
}
```

---

### React Hook (Custom)

```typescript
import { useState } from 'react';

export function useClassifyTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classify = async (descricao: string, valor: number, tipo: 'receita' | 'despesa') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao, valor, tipo }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { classify, loading, error };
}
```

**Uso:**
```typescript
function TransactionForm() {
  const { classify, loading } = useClassifyTransaction();

  const handleClassify = async () => {
    const result = await classify('Uber Centro', 15.50, 'despesa');
    if (result?.categoria_sugerida_id) {
      setCategoria(result.categoria_sugerida_id);
    }
  };

  return (
    <button onClick={handleClassify} disabled={loading}>
      {loading ? 'Classificando...' : 'Classificar com IA'}
    </button>
  );
}
```

---

### Next.js Server Action

```typescript
'use server';

export async function classifyTransaction(
  descricao: string,
  valor: number,
  tipo: 'receita' | 'despesa'
) {
  const response = await fetch('http://localhost:3000/api/ai/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ descricao, valor, tipo }),
  });

  if (!response.ok) {
    throw new Error('Falha ao classificar');
  }

  return response.json();
}
```

---

## Webhooks (Futuro)

**Status:** 🚧 Não implementado em v0.4

**Planejado para v1.1:**
- Webhook para notificar quando limite de custo atingir 80%
- Webhook para notificar quando limite for excedido
- Webhook para alertar sobre erros frequentes da OpenAI

---

## Versionamento

**Versão atual:** v0.4

**Breaking changes:**
- v1.0: Migração para multi-usuário (adiciona auth headers)
- v2.0: Suporte a múltiplos providers de IA (Anthropic, Gemini)

**Non-breaking changes:**
- v0.5: Cache distribuído (Redis)
- v0.6: Batch processing assíncrono
- v0.7: Fine-tuning de modelos

---

## Referências

- [Guia de IA](./AI_GUIDE.md) - Guia completo de uso
- [Setup OpenAI](../../OPENAI_SETUP.md) - Como configurar API key
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference) - Documentação oficial
- [Pricing Calculator](https://openai.com/api/pricing/) - Calcular custos

---

**Última atualização:** 05 de Novembro de 2025 - v0.4
**Agent responsável:** Agent DATA
