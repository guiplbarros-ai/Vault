# 🚀 Quick Start - IA no Cortex Cash

**Agent IA: Owner**

## TL;DR - 3 Passos Rápidos

```bash
# 1. Obter API Key da OpenAI
# → https://platform.openai.com/api-keys

# 2. Configurar automaticamente
npm run ai:setup
# Cole sua API key quando solicitado

# 3. Testar se funcionou
npm run ai:test
```

---

## Passo a Passo Detalhado

### 1️⃣ Obter API Key da OpenAI

**Acesse:** https://platform.openai.com/api-keys

1. Faça login (ou crie conta)
2. Clique em **"Create new secret key"**
3. Dê um nome: "Cortex Cash"
4. **IMPORTANTE:** Copie a chave IMEDIATAMENTE (só aparece uma vez!)
5. A chave começa com `sk-proj-...` ou `sk-...`

**Custo:** $5 USD grátis em créditos iniciais (suficiente para ~100.000 classificações)

---

### 2️⃣ Configurar no Projeto

**Opção A - Automático (Recomendado):**

```bash
npm run ai:setup
```

Cole sua API key quando solicitado.

**Opção B - Manual:**

Edite `.env.local`:

```bash
OPENAI_API_KEY=sk-proj-sua-chave-aqui
```

---

### 3️⃣ Testar Configuração

```bash
npm run ai:test
```

**Output esperado:**

```
========================================
  OpenAI API Key Validation
========================================

✅ API Key configurada
   Formato: sk-proj-...****

🔄 Testando chamada à API...

✅ API funcionando!

Resposta da IA:
  "Hello from Cortex Cash!"

Uso de tokens:
  Input:  15 tokens
  Output: 5 tokens
  Total:  20 tokens

Custo desta chamada:
  $0.000005 USD (~R$ 0.0003)

========================================
✅ Tudo pronto para usar IA!
========================================
```

---

### 4️⃣ Iniciar Servidor

```bash
npm run dev
```

Acesse: http://localhost:3000

---

### 5️⃣ Ativar IA no App

1. Ir em **Configurações → IA e Custos**
2. Verificar: 🟢 **"API Key configurada"**
3. Ativar: **"Ativar recursos de IA"** (toggle)
4. Ajustar settings:
   - **Modelo:** GPT-4o Mini (recomendado)
   - **Limite mensal:** 10 USD (padrão)
   - **Estratégia:** Balanceada

---

### 6️⃣ Testar Classificação

1. Ir em **Transações → Nova Transação**
2. Preencher:
   - **Descrição:** "Almoço no McDonald's"
   - **Valor:** R$ 35,00
3. Clicar em **"Sugerir categoria com IA"** ✨
4. Aguardar 1-2 segundos
5. Ver sugestão: **"Alimentação"** (~95% confiança)
6. Salvar transação

---

### 7️⃣ Monitorar Uso

No **Dashboard**, o card **"Uso de IA"** mostra:
- R$ usado / R$ limite
- Barra de progresso colorida
- Alertas quando próximo do limite

---

## Troubleshooting

### ❌ Erro: "API Key não configurada"

```bash
# Verificar se está vazio
cat .env.local | grep OPENAI_API_KEY

# Se vazio, rodar setup novamente
npm run ai:setup
```

---

### ❌ Erro: "Invalid API Key"

**Causas comuns:**
- Chave copiada com espaços extras
- Chave revogada na OpenAI
- Formato inválido

**Solução:**
1. Gerar nova chave em: https://platform.openai.com/api-keys
2. Rodar `npm run ai:setup` novamente

---

### ❌ Erro: "Insufficient quota"

**Problema:** Sem créditos na conta

**Solução:**
1. Adicionar método de pagamento: https://platform.openai.com/account/billing
2. Adicionar créditos ($10-20 USD é suficiente)

---

## Custos Reais

### Com GPT-4o Mini (Recomendado)

| Uso | Custo USD | Custo BRL (R$ 6,00) |
|-----|----------:|--------------------:|
| 10 classificações | $0.0005 | R$ 0,003 |
| 100 classificações | $0.005 | R$ 0,03 |
| 1.000 classificações | $0.05 | R$ 0,30 |
| 10.000 classificações | $0.50 | R$ 3,00 |

**Limite padrão:** $10 USD/mês = ~200.000 classificações

---

## Comandos Úteis

```bash
# Setup inicial
npm run ai:setup

# Testar API key
npm run ai:test

# Iniciar servidor
npm run dev

# Build para produção
npm run build
```

---

## Links Importantes

- 🔑 **Criar API Key:** https://platform.openai.com/api-keys
- 💳 **Billing:** https://platform.openai.com/account/billing
- 📊 **Dashboard de Uso:** https://platform.openai.com/usage
- 💰 **Pricing:** https://openai.com/api/pricing/

---

## Segurança

✅ **Implementado:**
- API key apenas no servidor (`.env.local`)
- Nunca exposta ao cliente
- `.gitignore` protege o arquivo
- Limite de gastos configurável
- Monitoramento em tempo real

⚠️ **Lembre-se:**
- Nunca commitar `.env.local`
- Nunca compartilhar sua API key
- Configurar billing limits na OpenAI
- Rotacionar key a cada 3-6 meses

---

## Próximos Passos

Após configurar, você pode:

1. ✅ Classificar transações automaticamente
2. ✅ Ajustar estratégia (velocidade vs qualidade)
3. ✅ Monitorar custos em tempo real
4. ✅ Configurar limite mensal personalizado
5. ✅ Permitir override se necessário

---

## Documentação Completa

- 📖 **Setup Detalhado:** `OPENAI_SETUP.md`
- 📖 **Guia de Integração:** `docs/AI_INTEGRATION_V2.md`
- 📖 **Guia de Classificação:** `docs/AI_CLASSIFICATION_GUIDE.md`

---

**Última atualização:** 2025-10-29
**Versão:** 2.0.0
**Status:** ✅ Pronto para uso
