# 🤖 Setup da OpenAI API

## Como Obter sua API Key

### Passo 1: Criar Conta OpenAI

1. Acesse: **https://platform.openai.com/signup**
2. Crie uma conta (ou faça login se já tiver)
3. Verifique seu email

### Passo 2: Adicionar Método de Pagamento

1. Vá para: **https://platform.openai.com/account/billing/overview**
2. Clique em "Add payment method"
3. Adicione cartão de crédito
4. (Opcional) Configure um limite de gastos mensal

> **Dica:** Configure um limite de $10-20 USD para começar

### Passo 3: Criar API Key

1. Acesse: **https://platform.openai.com/api-keys**
2. Clique em "**Create new secret key**"
3. Dê um nome (ex: "Cortex Cash")
4. **IMPORTANTE:** Copie a chave IMEDIATAMENTE (ela só aparece uma vez!)
5. A chave começa com `sk-proj-...` ou `sk-...`

### Passo 4: Configurar no Projeto

**Opção A - Script Automático:**
```bash
./scripts/setup-openai.sh
# Cole sua API key quando solicitado
```

**Opção B - Manual:**
```bash
# Editar .env.local
nano .env.local

# Adicionar:
OPENAI_API_KEY=sk-proj-sua-chave-aqui
```

### Passo 5: Reiniciar Servidor

```bash
# Parar servidor (Ctrl+C)
npm run dev
```

### Passo 6: Verificar Status

1. Abra: http://localhost:3000/settings
2. Vá em "**IA e Custos**"
3. Deve aparecer: 🟢 **"API Key configurada"**

---

## Custos Esperados

### Pricing (Janeiro 2025)

| Modelo | Input | Output | Custo/Classificação |
|--------|------:|-------:|--------------------:|
| GPT-4o Mini ⭐ | $0.15/1M | $0.60/1M | ~$0.00005 |
| GPT-4o | $2.50/1M | $10.00/1M | ~$0.00083 |

### Estimativas Mensais

Com **GPT-4o Mini** (recomendado):

- 100 classificações = ~$0.005 USD (~R$ 0,03)
- 1.000 classificações = ~$0.05 USD (~R$ 0,30)
- 10.000 classificações = ~$0.50 USD (~R$ 3,00)

**Limite sugerido:** $10 USD/mês = ~200.000 classificações

---

## Segurança

### ✅ Boas Práticas Implementadas

- API key armazenada apenas no servidor (`.env.local`)
- Nunca exposta ao cliente (browser)
- `.env.local` protegido no `.gitignore`
- Limite de gastos configurável
- Monitoramento de uso em tempo real

### ⚠️ NUNCA faça:

- ❌ Committar `.env.local` no git
- ❌ Compartilhar sua API key publicamente
- ❌ Usar `NEXT_PUBLIC_OPENAI_API_KEY`
- ❌ Hardcodar a key no código

### 🔒 Recomendações:

- ✅ Configure billing limits na OpenAI
- ✅ Rotacione a key periodicamente (a cada 3-6 meses)
- ✅ Monitore uso no dashboard da OpenAI
- ✅ Desative a key se não for mais usada

---

## Troubleshooting

### ❌ "API Key não configurada"

**Problema:** Indicador amarelo na página de settings

**Solução:**
```bash
# Verificar se .env.local tem a key
cat .env.local | grep OPENAI_API_KEY

# Deve mostrar:
# OPENAI_API_KEY=sk-proj-...

# Se estiver vazio, adicione a key e reinicie:
npm run dev
```

---

### ❌ "Invalid API Key"

**Problema:** Erro 401 ao tentar classificar

**Possíveis causas:**
1. Key copiada incorretamente (espaços extras)
2. Key revogada na OpenAI
3. Conta OpenAI sem créditos

**Solução:**
1. Verificar key no .env.local (sem espaços)
2. Gerar nova key em https://platform.openai.com/api-keys
3. Verificar billing em https://platform.openai.com/account/billing

---

### ❌ "Insufficient quota"

**Problema:** Erro 429 - sem créditos

**Solução:**
1. Adicionar créditos na conta OpenAI
2. Ou aguardar renovação do limite gratuito (se aplicável)

---

## Links Úteis

- 🔑 **API Keys:** https://platform.openai.com/api-keys
- 💳 **Billing:** https://platform.openai.com/account/billing
- 📊 **Usage Dashboard:** https://platform.openai.com/usage
- 📖 **Pricing:** https://openai.com/api/pricing/
- 📚 **Docs:** https://platform.openai.com/docs

---

## Créditos Gratuitos

**Novas contas:**
- OpenAI oferece $5 USD em créditos gratuitos
- Válido por 3 meses
- Suficiente para ~100.000 classificações com GPT-4o Mini

**Após créditos:**
- Necessário adicionar método de pagamento
- Pay-as-you-go (pague apenas o que usar)
- Sem mensalidade fixa

---

**Última atualização:** 2025-10-29
**Agent responsável:** IA
