# Guia de Integração de IA v2.0
**Agent IA: Owner**

## Resumo das Mudanças

Reestruturação completa da infraestrutura de IA para segurança e integração com settings do cliente.

---

## Arquitetura Implementada

### **Decisão: API Key via .env (Server-side Only)**

**Por quê?**
- ✅ Segurança: API key nunca exposta ao cliente
- ✅ Padrão Next.js recomendado
- ✅ Zero risk de vazamento em bundle JavaScript

**Trade-off aceito:**
- Usuário precisa reiniciar servidor ao alterar API key
- Não suporta múltiplas API keys (multi-tenant)

---

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENTE (Browser)                                               │
│                                                                 │
│  localStorage (cortex_settings)                                 │
│    └── aiCosts:                                                 │
│         ├── enabled: true                                       │
│         ├── defaultModel: 'gpt-4o-mini'                         │
│         ├── monthlyCostLimit: 10.0                              │
│         ├── allowOverride: false                                │
│         └── strategy: 'balanced'                                │
│                                                                 │
│  ↓ Settings lidos pelo hook                                     │
│                                                                 │
│  useAIClassification()                                          │
│    └── getAISettings() → lê localStorage                        │
│    └── classify() → POST /api/ai/classify + config             │
└─────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│ SERVIDOR (Next.js API Routes)                                   │
│                                                                 │
│  POST /api/ai/classify                                          │
│    └── Recebe: { descricao, valor, tipo, config }              │
│    └── Usa: process.env.OPENAI_API_KEY                         │
│    └── Respeita: config.defaultModel, strategy, limit          │
│    └── Retorna: { categoria_sugerida_id, confianca, ... }      │
│                                                                 │
│  GET /api/ai/usage?limit=10.0                                   │
│    └── Recebe: limite do cliente via query param               │
│    └── Calcula: uso real do banco (logs_ia)                    │
│    └── Retorna: { usedBrl, limitBrl, percentage, ... }         │
│                                                                 │
│  GET /api/ai/status                                             │
│    └── Verifica: !!process.env.OPENAI_API_KEY                  │
│    └── Retorna: { apiKeyConfigured: boolean }                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos Modificados

### **1. UI de Settings** (`app/settings/sections/ai-costs-section.tsx`)

**Mudanças:**
- ❌ Removido campo de input para API key
- ✅ Adicionado indicador visual de status (API key configurada/não configurada)
- ✅ Conectado ao endpoint `/api/ai/status` para verificar configuração

**Código:**
```tsx
const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

useEffect(() => {
  async function checkApiKey() {
    const response = await fetch('/api/ai/status');
    if (response.ok) {
      const data = await response.json();
      setApiKeyConfigured(data.apiKeyConfigured);
    }
  }
  checkApiKey();
}, []);
```

---

### **2. Hook de Classificação** (`lib/hooks/use-ai-classification.ts`)

**Mudanças:**
- ✅ Lê settings de `localStorage` antes de classificar
- ✅ Valida se IA está habilitada (`aiCosts.enabled`)
- ✅ Envia configurações junto com requisição

**Código:**
```typescript
function getAISettings() {
  const settings = localStorage.getItem('cortex_settings');
  if (!settings) return null;
  return JSON.parse(settings).aiCosts || null;
}

const classify = async (data: ClassifyRequest) => {
  const aiSettings = getAISettings();

  if (aiSettings && !aiSettings.enabled) {
    toast.error('IA desativada');
    return null;
  }

  const response = await fetch('/api/ai/classify', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      config: {
        defaultModel: aiSettings.defaultModel,
        monthlyCostLimit: aiSettings.monthlyCostLimit,
        allowOverride: aiSettings.allowOverride,
        strategy: aiSettings.strategy,
      },
    }),
  });
};
```

---

### **3. API de Classificação** (`app/api/ai/classify/route.ts`)

**Mudanças:**
- ✅ Aceita configurações no body da requisição (`config`)
- ✅ Usa `config.defaultModel` em vez de hardcoded `'gpt-4o-mini'`
- ✅ Respeita `config.monthlyCostLimit` para check de budget
- ✅ Respeita `config.allowOverride` (permite ultrapassar limite se true)
- ✅ Ajusta `temperature` e `max_tokens` baseado em `config.strategy`

**Estratégias:**
```typescript
const strategyParams = {
  aggressive: { temperature: 0.5, max_tokens: 150 }, // Mais rápido
  balanced: { temperature: 0.3, max_tokens: 200 },   // Padrão
  quality: { temperature: 0.1, max_tokens: 300 },    // Mais preciso
};
```

---

### **4. API de Usage** (`app/api/ai/usage/route.ts`)

**Mudanças:**
- ✅ Aceita limite via query param (`?limit=10.0`)
- ✅ Usa limite do cliente em vez de valor hardcoded
- ✅ Retorna dados reais do banco (sem mock)

**Antes:**
```typescript
const DEFAULT_LIMIT_USD = 10.0; // Hardcoded
const budgetCheck = await checkAIBudgetLimit(currentMonth, DEFAULT_LIMIT_USD, 0.8);
```

**Depois:**
```typescript
const limitParam = searchParams.get('limit');
const limit = limitParam ? parseFloat(limitParam) : DEFAULT_LIMIT_USD;
const budgetCheck = await checkAIBudgetLimit(currentMonth, limit, 0.8);
```

---

### **5. Componente AIUsageCard** (`components/ai-usage-card.tsx`)

**Mudanças:**
- ❌ Removido fallback para mock data
- ✅ Lê limite de `localStorage` e envia na requisição
- ✅ Mostra erro real se API falhar

**Antes:**
```typescript
catch (error) {
  // Usa dados mock se API não existe
  setData({ usedBrl: 2.34, limitBrl: 10.00, ... });
}
```

**Depois:**
```typescript
const aiSettings = getAISettings();
const limit = aiSettings?.monthlyCostLimit ?? 10.0;

const response = await fetch(`/api/ai/usage?limit=${limit}`);
// Sem mock data - erro real se falhar
```

---

## Arquivos Criados

### **1. Endpoint de Status** (`app/api/ai/status/route.ts`)

Verifica se API key está configurada no servidor.

**Response:**
```json
{
  "apiKeyConfigured": true,
  "timestamp": "2025-10-29T..."
}
```

---

### **2. Endpoint de Config** (`app/api/ai/config/route.ts`)

Valida configurações enviadas pelo cliente (para uso futuro).

**Request:**
```json
{
  "enabled": true,
  "defaultModel": "gpt-4o-mini",
  "monthlyCostLimit": 10.0,
  "allowOverride": false,
  "strategy": "balanced"
}
```

**Response:**
```json
{
  "success": true,
  "config": { ... }
}
```

---

## Como Configurar

### **Passo 1: Obter API Key**

1. Acesse: https://platform.openai.com/api-keys
2. Crie uma nova API key
3. Copie a chave (começa com `sk-proj-...`)

### **Passo 2: Adicionar no .env.local**

```bash
# OpenAI API (para classificação automática e sugestões de categorias)
# Obtenha sua chave em: https://platform.openai.com/api-keys
# Após adicionar a chave, reinicie o servidor (npm run dev)
OPENAI_API_KEY=sk-proj-your-key-here
```

### **Passo 3: Reiniciar Servidor**

```bash
# Ctrl+C para parar o servidor
npm run dev
```

### **Passo 4: Verificar Status**

1. Abra o app em http://localhost:3000
2. Vá em **Configurações → IA e Custos**
3. Verifique se aparece: **"API Key configurada"** (bolinha verde)

---

## Como Usar

### **1. Configurar Preferências**

Em **Configurações → IA e Custos**:

- **Ativar recursos de IA**: Toggle on/off
- **Modelo padrão**: GPT-4o Mini (recomendado)
- **Limite mensal**: Ex: 10 USD
- **Permitir override**: Se pode ultrapassar limite
- **Estratégia**: Balanced (padrão)

### **2. Classificar Transação**

1. Ir em **Transações → Nova Transação**
2. Preencher descrição (ex: "Almoço no Subway")
3. Preencher valor (ex: R$ 28,90)
4. Clicar em **"Sugerir categoria com IA"** ✨
5. Aguardar 1-2 segundos
6. Revisar sugestão e salvar

### **3. Monitorar Uso**

No **Dashboard principal**, o card "Uso de IA" mostra:
- R$ usado / R$ limite
- Porcentagem (com barra de progresso)
- Alertas visuais quando próximo do limite

---

## Troubleshooting

### ❌ "API Key não configurada"

**Problema:** Indicador amarelo na página de settings

**Solução:**
1. Verificar `.env.local` tem `OPENAI_API_KEY=sk-...`
2. Reiniciar servidor (`npm run dev`)
3. Atualizar página de configurações

---

### ❌ "IA desativada"

**Problema:** Toast de erro ao tentar classificar

**Solução:**
1. Ir em **Configurações → IA e Custos**
2. Ativar toggle **"Ativar recursos de IA"**

---

### ❌ "Limite de gastos excedido"

**Problema:** Toast de erro 429 ao classificar

**Solução:**
1. Ir em **Configurações → IA e Custos**
2. Aumentar **"Limite mensal"** (slider)
3. Ou ativar **"Permitir override"**

---

### ❌ Card de IA vazio no dashboard

**Problema:** Card não mostra dados, apenas loading

**Solução:**
1. Verificar console do browser (F12) para erros
2. Fazer pelo menos 1 classificação para gerar dados
3. Aguardar alguns segundos para dados carregarem

---

## Custos Estimados

### **Modelos Disponíveis** (Jan 2025)

| Modelo | Input ($/1M tokens) | Output ($/1M tokens) | Custo por Classificação |
|--------|--------------------:|---------------------:|------------------------:|
| **GPT-4o Mini** ⭐ | $0.150 | $0.600 | ~$0.00005 (~R$ 0,0003) |
| GPT-4o | $2.50 | $10.00 | ~$0.00083 (~R$ 0,005) |
| GPT-3.5 Turbo | $0.50 | $1.50 | ~$0.00013 (~R$ 0,0008) |

### **Estimativas Mensais**

- **100 classificações/mês** (GPT-4o Mini): ~$0.005 USD (~R$ 0,03)
- **1000 classificações/mês** (GPT-4o Mini): ~$0.05 USD (~R$ 0,30)
- **10000 classificações/mês** (GPT-4o Mini): ~$0.50 USD (~R$ 3,00)

**Conclusão:** Com limite de R$ 60/mês (10 USD), você pode fazer **~200.000 classificações** com GPT-4o Mini.

---

## Melhorias Futuras

### **Em Roadmap**

- [ ] Cache de classificações similares (reduzir 50% de custos)
- [ ] Processamento em lote (classificar múltiplas transações de uma vez)
- [ ] Fine-tuning com histórico do usuário (melhor acurácia)
- [ ] Sugestão de tags além de categorias
- [ ] Detecção automática de transações duplicadas
- [ ] Dashboard de acurácia (% de sugestões aceitas)

### **Experimentais (aiCosts.experiments)**

- [ ] Fallback para Gemini se OpenAI falhar
- [ ] Modo offline com modelo local (Ollama)
- [ ] Auto-classificação em background durante importação

---

## Segurança

### **Checklist de Segurança Implementado**

- ✅ API key **NUNCA** exposta ao cliente (server-side only)
- ✅ Sem `NEXT_PUBLIC_OPENAI_API_KEY` (evita vazamento)
- ✅ `.env.local` protegido por `.gitignore`
- ✅ API Routes fazem chamadas server-side
- ✅ Validação de limite de gastos antes de cada chamada
- ✅ Logs de uso salvos no banco (auditoria)

### **Boas Práticas**

- 🔒 Nunca commitar `.env.local` no git
- 🔒 Rotacionar API key periodicamente
- 🔒 Monitorar uso no dashboard da OpenAI
- 🔒 Configurar billing limits na conta OpenAI

---

## Testes

### **Build Test**

```bash
npm run build
```

**Resultado esperado:**
```
✓ Compiled successfully
✓ Generating static pages (17/17)

Route (app)
├ ƒ /api/ai/classify
├ ƒ /api/ai/config
├ ƒ /api/ai/status
├ ƒ /api/ai/usage
```

### **Manual Test Flow**

1. ✅ Configurar API key no `.env.local`
2. ✅ Reiniciar servidor
3. ✅ Verificar status em Settings (bolinha verde)
4. ✅ Ativar IA e ajustar settings
5. ✅ Classificar uma transação ("Almoço no McDonald's")
6. ✅ Verificar sugestão ("Alimentação" com ~90% confiança)
7. ✅ Verificar card de uso no dashboard atualizado

---

## Resumo Técnico

### **Antes (v1.0)**
- ❌ API key no localStorage (inseguro)
- ❌ Mock data no dashboard
- ❌ Settings ignoradas pelo backend
- ❌ Modelo hardcoded

### **Depois (v2.0)**
- ✅ API key no .env (seguro)
- ✅ Dados reais do banco
- ✅ Settings integradas (modelo, limite, strategy)
- ✅ Configurável via UI

---

**Última atualização:** 2025-10-29
**Versão:** 2.0.0
**Status:** ✅ Produção
**Agent responsável:** IA
