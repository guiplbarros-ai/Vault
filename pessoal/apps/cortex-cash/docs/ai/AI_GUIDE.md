# Guia de Classificação Automática com IA
**Agent DATA: Owner | v0.4**

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Setup e Configuração](#setup-e-configuração)
4. [Uso Básico](#uso-básico)
5. [Sistema de Regras](#sistema-de-regras)
6. [Integração OpenAI](#integração-openai)
7. [Cache Inteligente](#cache-inteligente)
8. [Tracking e Custos](#tracking-e-custos)
9. [Melhores Práticas](#melhores-práticas)

---

## Visão Geral

Sistema completo de classificação automática de transações usando **regras determinísticas** + **IA (OpenAI)** com cache inteligente para redução de custos.

**Status:** ✅ **100% COMPLETO!** Backend + Frontend integrados e funcionando

### Funcionalidades

- ✅ **Regras Determinísticas**: Regex, contains, starts_with, ends_with
- ✅ **IA Híbrida**: OpenAI GPT-4o-mini com fallback manual
- ✅ **Cache Inteligente**: Fuzzy matching (85% threshold) com TTL de 7 dias
- ✅ **Tracking de Custos**: Logs completos de uso, tokens e gastos (USD/BRL)
- ✅ **Limites de Gastos**: Controle mensal com alertas 80%/100%
- ✅ **Confirmação de Sugestões**: Feedback loop para melhoria contínua
- ✅ **Estatísticas**: Taxa de acurácia, breakdown por origem (regras/IA/manual)

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│  FLUXO DE CLASSIFICAÇÃO                              │
│                                                      │
│  1. Verifica CACHE (fuzzy matching, 85% threshold) │
│     └─ HIT → Retorna categoria (custo R$ 0,00)     │
│     └─ MISS → Continua para etapa 2                │
│                                                      │
│  2. Aplica REGRAS (regex, contains, starts, ends)   │
│     └─ MATCH → Retorna categoria (confiança 1.0)   │
│     └─ NO MATCH → Continua para etapa 3            │
│                                                      │
│  3. Consulta IA OpenAI (prompt otimizado)           │
│     └─ Retorna categoria + confiança + reasoning    │
│     └─ Adiciona ao cache se confiança >= 0.7       │
│                                                      │
│  4. Retorna resultado ou null (classificação manual)│
└─────────────────────────────────────────────────────┘
```

### Componentes Principais

**Backend (Agent DATA)**:
- `lib/services/ai-usage.service.ts` - Tracking de uso e custos
- `lib/services/regra-classificacao.service.ts` - CRUD de regras
- `lib/finance/classification/rule-engine.ts` - Motor de classificação
- `lib/finance/classification/prompt-cache.ts` - Cache inteligente
- `app/api/ai/classify/route.ts` - Endpoint de classificação
- `app/api/ai/usage/route.ts` - Endpoint de métricas

**Frontend (Agent APP)**:
- `app/settings/classification-rules/page.tsx` - Gestão de regras
- `app/settings/ai-usage/page.tsx` - Auditoria de uso
- `components/classification/classify-button.tsx` - Botão de classificação
- `components/classification/accuracy-widget.tsx` - Widget de acurácia

---

## Setup e Configuração

### 1. Obter API Key da OpenAI

Acesse: **https://platform.openai.com/api-keys**

Clique em **"Create new secret key"** e copie a chave.

### 2. Configurar Ambiente

```bash
# Opção 1: Script automático
npm run ai:setup

# Opção 2: Manual
echo "OPENAI_API_KEY=sk-..." >> .env.local
```

**⚠️ IMPORTANTE:**
- NUNCA use `NEXT_PUBLIC_OPENAI_API_KEY` (expõe chave no client)
- A chave deve estar apenas em `.env.local`
- Adicione `.env.local` no `.gitignore`

### 3. Testar Conexão

```bash
npm run ai:test
```

**Saída esperada:**
```
✅ API Key configurada
✅ Conexão com OpenAI OK
✅ Modelo: gpt-4o-mini
✅ Sistema de IA pronto!
```

### 4. Iniciar Aplicação

```bash
npm run dev
```

---

## Uso Básico

### Classificação Simples

```typescript
import { classifyTransaction } from '@/lib/finance/classification/rule-engine';

const result = await classifyTransaction({
  descricao: 'Almoço no restaurante',
  valor: 45.50,
  tipo: 'despesa',
});

// result = {
//   categoria_id: 'cat-123',
//   categoria_nome: 'Alimentação',
//   origem: 'ia', // 'cache', 'regra', ou 'ia'
//   confianca: 0.95,
//   reasoning: 'Compra em restaurante',
// }
```

### Classificação em Lote

```typescript
import { classifyBatch } from '@/lib/finance/classification/rule-engine';

const transacoes = [
  { descricao: 'Uber Centro', valor: 15.50, tipo: 'despesa' },
  { descricao: 'Salário', valor: 5000, tipo: 'receita' },
  { descricao: 'Netflix', valor: 39.90, tipo: 'despesa' },
];

const results = await classifyBatch(transacoes);
// Array de resultados com mesma estrutura acima
```

### Classificação com Atualização no Banco

```typescript
import { classifyAndUpdateTransaction } from '@/lib/finance/classification/rule-engine';

await classifyAndUpdateTransaction('transacao-id-123');
// Classifica e atualiza categoria_id no banco automaticamente
```

---

## Sistema de Regras

### Tipos de Regra

#### 1. **Contains** (Contém)
```typescript
{
  nome: 'Uber',
  tipo_regra: 'contains',
  padrao: 'uber',
  categoria_id: 'cat-transporte',
  prioridade: 10,
  ativa: true,
}
```
Matches: "Uber Centro", "viagem de UBER", "Uber99"

#### 2. **Starts With** (Começa com)
```typescript
{
  nome: 'Pagamento PIX',
  tipo_regra: 'starts_with',
  padrao: 'Pix enviado',
  categoria_id: 'cat-transferencia',
  prioridade: 20,
}
```
Matches: "Pix enviado para João", "Pix enviado para Maria"

#### 3. **Ends With** (Termina com)
```typescript
{
  nome: 'Assinaturas Digitais',
  tipo_regra: 'ends_with',
  padrao: '.com.br',
  categoria_id: 'cat-assinaturas',
  prioridade: 5,
}
```
Matches: "Netflix.com.br", "Spotify.com.br"

#### 4. **Regex** (Expressão Regular)
```typescript
{
  nome: 'Parcelamento',
  tipo_regra: 'regex',
  padrao: '\\d+/\\d+',  // Detecta "3/12", "1/3", etc
  categoria_id: 'cat-parcelado',
  prioridade: 30,
}
```
Matches: "Compra 3/12", "Parcela 1/3"

### CRUD de Regras

#### Criar Regra

```typescript
import { regraClassificacaoService } from '@/lib/services/regra-classificacao.service';

const regra = await regraClassificacaoService.createRegra({
  nome: 'Supermercado',
  tipo_regra: 'contains',
  padrao: 'supermercado',
  categoria_id: 'cat-alimentacao',
  prioridade: 10,
  ativa: true,
});
```

#### Listar Regras

```typescript
const regras = await regraClassificacaoService.listRegras({
  ativa: true,
  sortBy: 'prioridade',
  sortOrder: 'desc',
});
```

#### Preview de Regra

```typescript
// Testa regra em transações existentes antes de salvar
const preview = await regraClassificacaoService.previewRegra({
  tipo_regra: 'contains',
  padrao: 'ifood',
  tipo_transacao: 'despesa',
});

// preview = {
//   matches: 15,
//   examples: ['iFood - Delivery', 'Pedido iFood', ...],
// }
```

#### Atualizar Prioridades (Drag & Drop)

```typescript
await regraClassificacaoService.updatePrioridades([
  { id: 'regra-1', prioridade: 1 },
  { id: 'regra-2', prioridade: 2 },
  { id: 'regra-3', prioridade: 3 },
]);
```

---

## Integração OpenAI

### Modelos Suportados

| Modelo | Custo (input) | Custo (output) | Uso Recomendado |
|--------|---------------|----------------|-----------------|
| **gpt-4o-mini** | $0.15 / 1M tokens | $0.60 / 1M tokens | **Padrão** (rápido + barato) |
| gpt-4o | $2.50 / 1M tokens | $10.00 / 1M tokens | Alta precisão |
| gpt-3.5-turbo | $0.50 / 1M tokens | $1.50 / 1M tokens | Econômico (menor precisão) |

### Prompt Otimizado

O sistema usa um prompt estruturado que:
1. Define role da IA como assistente financeiro
2. Fornece lista de categorias disponíveis (filtradas por tipo)
3. Inclui descrição + valor + tipo da transação
4. Força resposta em JSON válido
5. Exige campo `reasoning` para explicabilidade

**Exemplo de prompt:**
```
Você é um assistente financeiro. Classifique a transação abaixo em uma das categorias disponíveis.

Transação:
- Descrição: Almoço no restaurante
- Valor: R$ 45,50
- Tipo: despesa

Categorias disponíveis:
- 🍕 Alimentação (id: cat-123)
- 🚗 Transporte (id: cat-456)
- 🏠 Moradia (id: cat-789)
...

Responda APENAS com JSON válido:
{
  "categoria_id": "cat-123",
  "confianca": 0.95,
  "reasoning": "Compra em restaurante"
}
```

### Estratégias de Uso

Configurável em `/settings`:

#### Aggressive (Agressiva)
- Temperature: 0.5
- Max tokens: 150
- Uso: Sempre que possível (após cache + regras)
- Custo: Alto, Velocidade: Rápida

#### Balanced (Balanceada) - **PADRÃO**
- Temperature: 0.3
- Max tokens: 200
- Uso: Equilibrado
- Custo: Médio, Velocidade: Média

#### Quality (Qualidade)
- Temperature: 0.1
- Max tokens: 300
- Uso: Prioriza precisão
- Custo: Alto, Velocidade: Lenta

---

## Cache Inteligente

### Funcionamento

O cache armazena pares `(descrição normalizada → categoria)` e usa **fuzzy matching** para encontrar matches próximos.

**Normalização:**
```typescript
"Uber Centro R$ 15,50" → "uber centro"
"IFOOD - Delivery" → "ifood delivery"
```

**Fuzzy Matching (Jaccard Similarity):**
```typescript
similarity("uber centro", "uber sp") = 0.66  // ❌ < 85%
similarity("ifood delivery", "ifood entrega") = 0.50  // ❌ < 85%
similarity("netflix", "netflix") = 1.0  // ✅ >= 85%
```

### Configuração

```typescript
// Cache configurável
const cache = new PromptCache({
  maxSize: 1000,        // Máx 1000 entradas
  ttl: 7 * 24 * 60 * 60 * 1000,  // 7 dias
  similarityThreshold: 0.85,      // 85% de semelhança
});
```

### Estatísticas

```typescript
const stats = cache.getStats();
// {
//   size: 234,
//   hits: 1250,
//   misses: 456,
//   hitRate: 0.73,  // 73% de acerto
// }
```

**Economia estimada:**
- Hit rate de 70% = economia de 70% nos custos de IA
- 1000 transações/mês com 70% hit = ~$0.30 economizados (vs $1.00 sem cache)

---

## Tracking e Custos

### Registro Automático

Toda chamada à API OpenAI é registrada automaticamente:

```typescript
// Registro automático no endpoint /api/ai/classify
await logAIUsage({
  transacao_id: '123',
  prompt: 'texto completo do prompt',
  resposta: 'resposta JSON da IA',
  modelo: 'gpt-4o-mini',
  tokens_prompt: 150,
  tokens_resposta: 50,
  custo_usd: 0.000035,
  categoria_sugerida_id: 'cat-123',
  confianca: 0.95,
  confirmada: false,  // Será true após confirmação
});
```

### Consulta de Uso

```typescript
import { getAIUsageSummary } from '@/lib/services/ai-usage.service';

const startOfMonth = new Date(2025, 10, 1);  // Nov 2025
const endOfMonth = new Date(2025, 10, 30);
const USD_TO_BRL = 6.0;

const summary = await getAIUsageSummary(startOfMonth, endOfMonth, USD_TO_BRL);

// summary = {
//   total_requests: 150,
//   total_tokens: 25000,
//   total_cost_usd: 0.05,
//   total_cost_brl: 0.30,
//   confirmed_suggestions: 120,
//   rejected_suggestions: 30,
//   average_confidence: 0.87,
// }
```

### Controle de Limites

```typescript
import { checkAIBudgetLimit } from '@/lib/services/ai-usage.service';

const budget = await checkAIBudgetLimit(
  new Date(),  // Mês atual
  10.0,        // Limite de $10 USD
  0.8          // Alerta a partir de 80%
);

// budget = {
//   used_usd: 2.34,
//   limit_usd: 10.0,
//   percentage: 23.4,
//   is_near_limit: false,  // true se >= 80%
//   is_over_limit: false,  // true se >= 100%
// }
```

### Estimativa de Custos

**Exemplo realista (gpt-4o-mini):**

| Cenário | Transações/mês | Hit Rate Cache | Requests IA | Custo Mensal |
|---------|----------------|----------------|-------------|--------------|
| Pequeno | 200 | 60% | 80 | ~$0.10 USD |
| Médio | 1000 | 70% | 300 | ~$0.40 USD |
| Grande | 5000 | 80% | 1000 | ~$1.20 USD |

**Com créditos grátis ($5 USD):**
- Pequeno: ~50 meses grátis
- Médio: ~12 meses grátis
- Grande: ~4 meses grátis

---

## Melhores Práticas

### 1. Ordem de Prioridade das Regras

**Alta prioridade (30-40):**
- Regras muito específicas (ex: "Pagamento fatura cartão")
- Regex complexas

**Média prioridade (10-20):**
- Padrões comuns (ex: "Uber", "iFood")
- Contains genéricos

**Baixa prioridade (1-9):**
- Padrões amplos (ex: ".com", "delivery")
- Fallbacks genéricos

### 2. Criação de Regras Eficientes

**✅ BOM:**
```typescript
{ padrao: 'uber', tipo: 'contains' }  // Simples e eficaz
{ padrao: 'pix enviado', tipo: 'starts_with' }  // Específico
```

**❌ RUIM:**
```typescript
{ padrao: 'e', tipo: 'contains' }  // Muito genérico
{ padrao: '.*', tipo: 'regex' }  // Match em tudo
```

### 3. Confirmação de Sugestões

Sempre confirme ou rejeite sugestões da IA para melhorar o sistema:

```typescript
import { confirmClassification, rejectClassification } from '@/lib/finance/classification/rule-engine';

// Confirmar
await confirmClassification('transacao-123');

// Rejeitar
await rejectClassification('transacao-123');
```

**Por que importa:**
- Melhora taxa de acurácia
- Permite criar regras baseadas em padrões confirmados
- Estatísticas mais precisas

### 4. Monitoramento de Custos

Configure alertas em `/settings`:

```typescript
{
  monthlyCostLimit: 10.0,  // $10 USD/mês
  allowOverride: false,     // Bloquear ao atingir limite
  warningThreshold: 0.8,    // Alerta a partir de 80%
}
```

Visite `/settings/ai-usage` regularmente para:
- Ver custos diários/mensais
- Identificar picos de uso
- Verificar taxa de acurácia
- Ajustar configurações

### 5. Otimizações de Custo

**Ative Cache:**
```typescript
cachePrompts: true  // Economia de ~70% nos custos
```

**Use Batch Processing quando possível:**
```typescript
batchProcessing: true
batchSize: 25  // Processa 25 transações por vez
```

**Prefira gpt-4o-mini:**
- 5x mais barato que gpt-4o
- Precisão suficiente para 90%+ dos casos
- Só use gpt-4o para casos complexos

### 6. Manutenção de Regras

**Revisão mensal:**
1. Ir em `/settings/classification-rules`
2. Verificar regras com 0 aplicações
3. Deletar regras não utilizadas
4. Criar regras para padrões recorrentes da IA

**Criar regra a partir de IA:**
```
Se IA classifica "Uber" como Transporte 20+ vezes
→ Criar regra: { padrao: 'uber', categoria: Transporte }
→ Economiza ~$0.01 por classificação futura
```

---

## Troubleshooting

### Erro: "API Key não configurada"

**Solução:**
1. Verificar `.env.local` tem `OPENAI_API_KEY=sk-...`
2. Reiniciar servidor (`npm run dev`)
3. Testar com `npm run ai:test`

### Erro: "Limite de custos excedido"

**Solução:**
1. Ir em `/settings` → IA e Custos
2. Aumentar `monthlyCostLimit` OU
3. Ativar `allowOverride` temporariamente

### Taxa de Acurácia Baixa (<60%)

**Causas comuns:**
1. Poucas regras criadas (criar mais regras)
2. Descrições de transações confusas (normalizar fontes)
3. Categorias mal definidas (revisar taxonomia)

**Solução:**
1. Criar regras para top 10 padrões mais comuns
2. Usar preview de regras antes de criar
3. Confirmar/rejeitar sugestões regularmente

### Cache não está funcionando

**Verificar:**
1. `cachePrompts: true` nas configurações
2. Descrições normalizadas (remove números, lowercase)
3. Threshold não muito alto (padrão 85% é bom)

**Debug:**
```typescript
const stats = cache.getStats();
console.log('Hit rate:', stats.hitRate);
// Se < 20%, threshold pode estar muito alto
```

---

## Referências

- [API Endpoints](./AI_ENDPOINTS.md) - Documentação completa de APIs
- [Arquitetura de Agentes](../guides/AGENTES_IA.md) - Como IA se integra com os 3 agentes
- [OpenAI Pricing](https://openai.com/api/pricing/) - Preços atualizados
- [Setup Detalhado](../../OPENAI_SETUP.md) - Guia de setup passo a passo

---

**Última atualização:** 05 de Novembro de 2025 - v0.4
**Agent responsável:** Agent DATA
