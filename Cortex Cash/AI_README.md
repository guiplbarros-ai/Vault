claude# 🤖 IA no Cortex Cash - Configuração Necessária

## ⚠️ API Key da OpenAI Não Configurada

Para usar recursos de IA (classificação automática de transações), você precisa configurar uma API Key da OpenAI.

---

## 🚀 Setup Rápido (3 minutos)

### Passo 1: Obter API Key

Acesse: **https://platform.openai.com/api-keys**

Clique em **"Create new secret key"** e copie a chave.

### Passo 2: Configurar

```bash
npm run ai:setup
```

Cole sua API key quando solicitado.

### Passo 3: Testar

```bash
npm run ai:test
```

### Passo 4: Iniciar

```bash
npm run dev
```

---

## 📖 Documentação Completa

- **Índice Geral da Documentação:** `docs/README.md`
- **Getting Started (IA - setup rápido):** `docs/guides/GETTING_STARTED.md#setup-de-ia-opcional`
- **Setup Detalhado de OpenAI:** `OPENAI_SETUP.md`
- **Guia de Integração de IA:** `docs/ai/AI_GUIDE.md`
- **Referência de Endpoints de IA:** `docs/ai/AI_ENDPOINTS.md`

---

## 💰 Custos

**Grátis:** $5 USD em créditos iniciais (~100.000 classificações)

**Depois:** Pay-as-you-go
- 100 classificações = ~R$ 0,03
- 1.000 classificações = ~R$ 0,30
- 10.000 classificações = ~R$ 3,00

---

## ❓ Precisa de Ajuda?

Execute: `npm run ai:test` para diagnóstico completo

---

**Contato:** abra uma issue com detalhes do problema e logs do `npm run ai:test`.
