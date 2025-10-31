# Guia de Classificação Automática com IA

## 📋 Sumário

Sistema completo de classificação automática de transações usando OpenAI GPT-4o-mini, com tracking de uso e controle de custos.

---

## 🎯 Funcionalidades Implementadas

### 1. **Service de Tracking de IA** (`lib/services/ai-usage.service.ts`)

Gerencia todo o uso da API OpenAI:

- ✅ Registro automático de uso (tokens, custos, modelo)
- ✅ Cálculo de custos por modelo (GPT-4o-mini, GPT-4o, GPT-4-turbo)
- ✅ Resumos de uso (requests, tokens, custos USD/BRL)
- ✅ Verificação de limites de gastos com alertas
- ✅ Agrupamento de uso por período (dia/mês)
- ✅ Tracking de precisão (sugestões confirmadas vs rejeitadas)

**Principais funções:**

```typescript
// Registra uso da API
await logAIUsage({
  transacao_id: '123',
  prompt: 'texto do prompt',
  resposta: 'resposta da IA',
  modelo: 'gpt-4o-mini',
  tokens_prompt: 100,
  tokens_resposta: 50,
  categoria_sugerida_id: 'cat-id',
  confianca: 0.95,
});

// Obtém resumo de uso
const summary = await getAIUsageSummary(startDate, endDate, usdToBrl);

// Verifica limite
const budget = await checkAIBudgetLimit(new Date(), 10.0, 0.8);
```

---

### 2. **API Routes**

#### `/api/ai/classify` (POST)

Classifica automaticamente uma transação:

**Request:**
```json
{
  "descricao": "Almoço no restaurante",
  "valor": 45.50,
  "tipo": "despesa",
  "transacao_id": "optional-id"
}
```

**Response:**
```json
{
  "categoria_sugerida_id": "cat-123",
  "categoria_nome": "Alimentação",
  "confianca": 0.95,
  "reasoning": "Compra em restaurante"
}
```

**Segurança:**
- ✅ Verifica limite de gastos antes de processar
- ✅ Retorna 429 (Too Many Requests) se limite excedido
- ✅ API key armazenada apenas no servidor
- ✅ Registra automaticamente uso no banco

#### `/api/ai/usage` (GET)

Retorna dashboard de uso atual:

**Response:**
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

---

### 3. **Hook Reutilizável** (`lib/hooks/use-ai-classification.ts`)

Hook React para classificação com IA:

```typescript
const { classify, isClassifying, suggestion, clearSuggestion } = useAIClassification();

// Classificar transação
await classify({
  descricao: 'Uber para trabalho',
  valor: 25.00,
  tipo: 'despesa',
});

// suggestion.categoria_sugerida_id -> 'cat-transport'
// suggestion.confianca -> 0.92
```

**Recursos:**
- ✅ Loading state (`isClassifying`)
- ✅ Toasts automáticos de sucesso/erro
- ✅ Tratamento de limite excedido (429)
- ✅ Parse automático da resposta JSON

---

### 4. **Componente Visual** (`components/ai-usage-card.tsx`)

Card no dashboard mostrando uso de IA:

**Recursos:**
- ✅ R$ usado / R$ limite com porcentagem
- ✅ Barra de progresso colorida:
  - Verde: < 80% do limite
  - Amarelo: 80-100% do limite
  - Vermelho: > 100% do limite
- ✅ Ícones dinâmicos (Sparkles/AlertTriangle)
- ✅ Alertas visuais de proximidade do limite
- ✅ Fallback para dados mock se API não disponível

---

### 5. **Integração no Formulário** (`components/forms/transaction-form.tsx`)

Botão "Sugerir categoria com IA" integrado no formulário de transações:

**UX Flow:**
1. Usuário preenche descrição e valor
2. Botão "Sugerir categoria com IA" aparece automaticamente
3. Clica no botão → Loading "Classificando..."
4. IA retorna sugestão em card visual (categoria + confiança + reasoning)
5. Campo de categoria é preenchido automaticamente
6. Usuário pode aceitar ou escolher outra manualmente

**Recursos:**
- ✅ Botão aparece apenas quando descrição e valor preenchidos
- ✅ Loading state durante classificação
- ✅ Card visual com sugestão (fundo roxo)
- ✅ Auto-preenchimento do campo categoria
- ✅ Usuário pode rejeitar e escolher manualmente

---

### 6. **Página de Configurações** (`app/settings/sections/ai-costs-section.tsx`)

Já existente e funcional:

**Seções:**

1. **OpenAI API**
   - Campo de API key (password)
   - Toggle: Ativar recursos de IA
   - Select: Modelo padrão (GPT-4o-mini, GPT-4o, GPT-3.5-turbo)

2. **Controle de Custos**
   - Slider: Limite mensal (0-100 USD)
   - Toggle: Permitir override do limite
   - Select: Estratégia (agressiva/balanceada/qualidade)

3. **Otimizações**
   - Toggle: Cache de prompts
   - Toggle: Processamento em lote
   - Select: Tamanho do lote (10/25/50/100)

---

## 🔒 Segurança

### Variáveis de Ambiente

**`.env.local`:**
```bash
# Gemini API
GEMINI_API_KEY=sua-chave-gemini
NEXT_PUBLIC_GEMINI_API_KEY=sua-chave-gemini

# OpenAI API (APENAS servidor - SEM NEXT_PUBLIC_)
OPENAI_API_KEY=sua-chave-openai
```

**⚠️ IMPORTANTE:**
- ❌ **NÃO** use `NEXT_PUBLIC_OPENAI_API_KEY` - expõe chave no cliente
- ✅ Apenas `OPENAI_API_KEY` (servidor)
- ✅ `.env.local` já protegido no `.gitignore`
- ✅ API Routes fazem chamadas server-side

### Arquitetura de Segurança

```
Cliente (React)
    ↓
    POST /api/ai/classify
    ↓
API Route (Servidor)
    ↓ (usa OPENAI_API_KEY)
    OpenAI API
    ↓
    Resposta para cliente
```

---

## 💰 Preços e Custos (Jan 2025)

| Modelo | Input ($/1M tokens) | Output ($/1M tokens) | Recomendado para |
|--------|--------------------:|---------------------:|------------------|
| GPT-4o-mini | $0.150 | $0.600 | **Produção** ✅ |
| GPT-4o | $2.50 | $10.00 | Qualidade máxima |
| GPT-4-turbo | $10.00 | $30.00 | Legado |

**Estimativa de custos:**
- 1 classificação ≈ 150 tokens input + 50 tokens output
- GPT-4o-mini: ~$0.00005 por classificação (~R$ 0,0003)
- 1000 classificações/mês: ~$0.05 USD (~R$ 0,30)
- Limite padrão: $10 USD/mês (R$ 60,00)

---

## 🚀 Como Usar

### 1. Configurar API Key

1. Obter chave em: https://platform.openai.com/api-keys
2. Adicionar no `.env.local`:
   ```bash
   OPENAI_API_KEY=sk-proj-...
   ```
3. Reiniciar servidor de desenvolvimento

### 2. Usar no Formulário de Transações

1. Ir em "Transações" → "Nova Transação"
2. Preencher descrição (ex: "Almoço no Outback")
3. Preencher valor (ex: R$ 85,00)
4. Clicar em "Sugerir categoria com IA" ✨
5. Aguardar classificação (1-2 segundos)
6. Revisar sugestão e ajustar se necessário
7. Salvar transação

### 3. Monitorar Uso

- Dashboard principal → Card "Uso de IA"
- Mostra: R$ usado / R$ limite (%)
- Alerta visual quando próximo do limite

### 4. Ajustar Configurações

- Ir em "Configurações" → "IA e Custos"
- Ajustar limite mensal
- Escolher modelo (recomendado: GPT-4o-mini)
- Ativar/desativar recursos

---

## 📊 Schema do Banco (IndexedDB)

### Tabela: `logs_ia`

```typescript
{
  id: string                    // UUID
  transacao_id: string | null   // Ref para transacoes.id
  prompt: string                // Texto enviado para IA
  resposta: string              // Resposta da IA
  modelo: string                // 'gpt-4o-mini', 'gpt-4o', etc
  tokens_prompt: number         // Tokens usados no input
  tokens_resposta: number       // Tokens usados no output
  tokens_total: number          // Soma dos dois
  custo_usd: number            // Custo calculado em USD
  categoria_sugerida_id: string | null  // Categoria sugerida
  confianca: number | null     // 0-1 (0% a 100%)
  confirmada: boolean          // Se usuário aceitou sugestão
  created_at: Date            // Timestamp
}
```

---

## 🧪 Testando

### Teste Manual

1. Criar nova transação com descrição "Uber para casa"
2. Clicar em "Sugerir categoria com IA"
3. Verificar se retorna categoria "Transporte" com alta confiança
4. Verificar card de uso atualizado no dashboard

### Teste de Limite

1. Ir em Configurações → IA e Custos
2. Definir limite baixo (ex: $0.01 USD)
3. Tentar classificar múltiplas transações
4. Verificar toast de erro "Limite excedido" ao ultrapassar

---

## 🔧 Troubleshooting

### Erro: "OpenAI API key not configured"

**Solução:**
1. Verificar `.env.local` tem `OPENAI_API_KEY`
2. Reiniciar servidor de desenvolvimento
3. Verificar chave não está vazia

### Erro 429: "AI budget limit exceeded"

**Solução:**
1. Ir em Configurações → IA e Custos
2. Aumentar limite mensal
3. Ou aguardar início do próximo mês

### Card de IA mostra dados mock

**Solução:**
- API `/api/ai/usage` ainda não tem dados reais
- Faça algumas classificações primeiro
- Aguarde alguns segundos para dados carregarem

### Classificação não sugere categoria

**Possíveis causas:**
1. Descrição muito vaga
2. Nenhuma categoria ativa compatível
3. IA retornou baixa confiança (< 50%)

**Solução:**
- Tornar descrição mais específica
- Criar categorias mais abrangentes
- Escolher categoria manualmente

---

## 📈 Próximas Melhorias

- [ ] Classificação em lote (múltiplas transações)
- [ ] Aprendizado com histórico (fine-tuning)
- [ ] Sugestão de tags além de categorias
- [ ] Detecção de transações duplicadas
- [ ] Auto-classificação em background (importação)
- [ ] Relatório de acurácia por categoria
- [ ] Cache de classificações similares
- [ ] Integração com Gemini como alternativa

---

## 📝 Arquivos Criados/Modificados

### Criados
- `lib/services/ai-usage.service.ts` - Service de tracking
- `lib/hooks/use-ai-classification.ts` - Hook React
- `app/api/ai/classify/route.ts` - Classificação API
- `app/api/ai/usage/route.ts` - Dashboard API
- `components/ai-usage-card.tsx` - Card visual
- `docs/AI_CLASSIFICATION_GUIDE.md` - Este documento

### Modificados
- `app/page.tsx` - Adicionado AIUsageCard
- `components/forms/transaction-form.tsx` - Botão IA
- `.env.local` - API keys

### Dependências
- `openai@^4.x` - SDK oficial OpenAI

---

## 🎓 Aprendizados

### Por que GPT-4o-mini?

1. **Custo**: 15x mais barato que GPT-4o
2. **Velocidade**: Respostas em 1-2 segundos
3. **Qualidade**: Suficiente para classificação simples
4. **Produção**: Recomendado pela OpenAI para tarefas simples

### Por que não Gemini?

- Gemini já configurado (key presente)
- OpenAI tem melhor suporte para JSON responses
- Possível adicionar Gemini como fallback futuro

### Cache de Prompts

- Reduz custos em 50% para prompts repetidos
- OpenAI tem cache automático (prompt caching)
- Útil para descrições similares

---

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar este guia primeiro
2. Conferir console do browser (F12)
3. Verificar logs do servidor (`npm run dev`)
4. Testar com descrições mais específicas

---

**Última atualização:** 2025-10-29
**Versão:** 1.0.0
**Status:** ✅ Produção
