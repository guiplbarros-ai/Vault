# Arquitetura de Agentes IA — 3 Agentes (Cortex Cash)

> Este documento consolida e substitui os materiais anteriores de agentes (FUNCAO_AGENTES_IA.md, GETTING_STARTED_AGENTS.md, STATUS_AGENTES.md, AGENTES_UI_TEMA.md, AGENTE_UI_2_RELATORIO.md). A partir de agora, adotamos uma arquitetura com 3 agentes.

## Objetivo

- Garantir responsabilidades claras, contratos explícitos e coordenação simples entre agentes
- Padronizar como IA é usada (classificação, custos, limites, métricas)
- Servir como fonte única de verdade para agentes e contribuidores

## Os 3 Agentes

1. Agent CORE (Arquitetura e Orquestração)
   - Define schema, contratos TypeScript, guidelines e padrões de projeto
   - Revisa PRs, resolve conflitos, publica releases e mantém esta documentação
   - Garante qualidade (testes, checklist de integração) e coerência entre módulos
   - Mantém matriz de ownership e interfaces entre agentes

2. Agent DATA (Importação, ETL e Classificação via IA)
   - Importação (CSV/OFX), mapeamento de colunas, regras, normalização e QA de dados
   - Classificação automática de transações (OpenAI), logging de uso e limites de custo
   - Expõe e mantém endpoints de IA e serviços de uso/custos
   - Otimiza prompts, estratégia e batch/performances

3. Agent APP (UI + Finance)
   - Interfaces, dashboards, gráficos, formulários e UX (tema, acessibilidade)
   - Lógica financeira do front (budget, cashflow, insights) e confirmação/rejeição de sugestões de IA
   - Integra componentes com serviços/endereços expostos por DATA e contratos CORE

---

## Ownership por diretório/arquivo

- Agent DATA
  - `app/api/ai/classify/route.ts`
  - `app/api/ai/config/route.ts`
  - `app/api/ai/status/route.ts`
  - `app/api/ai/usage/route.ts`
  - `lib/services/ai-usage.service.ts`
  - `docs/AI_CLASSIFICATION_GUIDE.md`, `docs/AI_INTEGRATION_V2.md`, `OPENAI_SETUP.md`, `AI_README.md` (conteúdo técnico de IA)

- Agent APP
  - `app/**` (páginas e UI), `components/**`, `components/forms/**`, `components/*charts*`, `components/settings/**`
  - Integração com IA (visual, botões de confirmar/rejeitar, custos, status)

- Agent CORE
  - `lib/types/**`, `lib/validations/**`, `lib/db/**` (contratos e schema)
  - Documentação viva (este arquivo), revisão e coordenação

> Regra de ouro: cada arquivo tem um owner primário. Alterações fora do seu domínio passam por PR com revisão do owner.

---

## Contratos e Endpoints (mantidos por Agent DATA)

### POST `/api/ai/classify`
- Request (JSON):
```json
{
  "descricao": "string",
  "valor": 123.45,
  "tipo": "receita" | "despesa",
  "transacao_id": "string (opcional)",
  "config": {
    "defaultModel": "gpt-4o-mini" | "gpt-4o" | "gpt-3.5-turbo",
    "monthlyCostLimit": 10.0,
    "allowOverride": false,
    "strategy": "aggressive" | "balanced" | "quality"
  }
}
```
- Response (JSON):
```json
{
  "categoria_sugerida_id": "string|null",
  "categoria_nome": "string|null",
  "confianca": 0.0,
  "reasoning": "string"
}
```
- Comportamento:
  - Valida `OPENAI_API_KEY`; valida campos obrigatórios; consulta categorias ativas por `tipo`
  - Prompt força saída JSON (sem texto extra) e aplica parâmetros por `strategy`
  - Registra uso via `logAIUsage` (tokens, custo, confiança, categoria sugerida)
  - Respeita budget: bloqueia quando `checkAIBudgetLimit` indica limite excedido (salvo `allowOverride`)

### POST `/api/ai/config`
- Recebe uma configuração do cliente, valida e devolve `{ success: true, config }`
- Stateless: cliente deve enviar `config` em cada chamada que precisar dela

### GET `/api/ai/status`
- Responde `{ apiKeyConfigured: boolean, timestamp: string }`

### GET `/api/ai/usage?limit=10`
- Responde resumo de uso mensal e flags de orçamento (em BRL e USD):
```json
{
  "usedBrl": 0,
  "limitBrl": 60,
  "percentage": 0,
  "isNearLimit": false,
  "isOverLimit": false,
  "summary": {
    "total_requests": 0,
    "total_tokens": 0,
    "confirmed_suggestions": 0,
    "rejected_suggestions": 0,
    "average_confidence": 0
  }
}
```

---

## Serviços de Uso e Custos (Agent DATA)

- `lib/services/ai-usage.service.ts`
  - `calculateCost(modelo, tokens_prompt, tokens_resposta)` → custo em USD
  - `logAIUsage(dto)` → persiste log (tokens, custo, confiança, confirmação)
  - `confirmAISuggestion(logId)` → marca sugestão como confirmada
  - `getAIUsageSummary(start, end, usdToBrl)` → totais e médias
  - `getAIUsageByPeriod(start, end, groupBy)` → agregação por dia/mês
  - `checkAIBudgetLimit(currentMonth, limitUsd, warningThreshold)`

### Pricing (USD por 1M tokens)
- gpt-4o-mini: input 0.150, output 0.600
- gpt-4o: input 2.50, output 10.00
- gpt-4-turbo: input 10.00, output 30.00

> Cálculo de custo: `custo = (tokens_prompt/1e6)*input + (tokens_resposta/1e6)*output`

---

## Prompt e Estratégia

- System: “Você é um assistente financeiro… Responda APENAS com JSON válido.”
- User: transação + lista de categorias ativas + regras
- Estratégias:
  - aggressive: temperature 0.5, max_tokens 150
  - balanced: temperature 0.3, max_tokens 200
  - quality: temperature 0.1, max_tokens 300
- Parsing robusto: remover cercas ```json/``` antes de `JSON.parse`

---

## Fluxo de Classificação (FIM‑A‑FIM)

1. APP coleta inputs do usuário e chama `POST /api/ai/classify` (incluindo `config` quando necessário)
2. DATA valida entrada, verifica budget, busca categorias ativas e monta prompt
3. OpenAI retorna JSON; DATA valida `categoria_id` e resolve `categoria_nome`
4. DATA registra uso (`logAIUsage`) e responde com `categoria_sugerida_id`, `confianca`, `reasoning`
5. APP exibe sugestão e permite confirmar/rejeitar; confirmações chamam `confirmAISuggestion`
6. APP monitora custos via `GET /api/ai/usage` e status via `GET /api/ai/status`

---

## Governança e Processo (CORE)

- Branch por agente; PR com revisão do owner do arquivo e do CORE
- CORE mantém contratos em `lib/types/**`, `lib/validations/**` e guia de integração
- Convenções:
  - Sem `NEXT_PUBLIC_OPENAI_API_KEY`
  - Logs de IA não devem conter dados sensíveis do usuário
  - Rotas são stateless; configs do cliente acompanham cada chamada

---

## Migração: 4 → 3 Agentes

- Anterior: CORE, IMPORT, FINANCE, UI
- Novo: CORE, DATA (IMPORT + Classificação), APP (UI + FINANCE)
- Passos:
  1. Consolidar documentação (este arquivo) e atualizar referências
  2. Apontar `AI_README.md` para este documento
  3. Marcar documentos antigos como substituídos (banner no topo)
  4. Manter endpoints e serviços atuais sob ownership do DATA

---

## Checklist de Validação

- Infra
  - `OPENAI_API_KEY` configurada e validada com `npm run ai:test`
  - `GET /api/ai/status` retorna `apiKeyConfigured: true`
- Funcional
  - `POST /api/ai/classify` retorna JSON válido para exemplos de receita e despesa
  - `GET /api/ai/usage?limit=10` reflete crescimento de custo após chamadas
  - Confirmar sugestão marca log como `confirmada: true`
- UI
  - APP exibe sugestão de categoria com confiança e reasoning
  - UI de custos/limite alerta próximo/excedido

### Exemplos de uso (curl)

```bash
# Status de IA
curl -s http://localhost:3000/api/ai/status | jq .

# Classificar transação (despesa)
curl -s -X POST http://localhost:3000/api/ai/classify \
  -H 'Content-Type: application/json' \
  -d '{
    "descricao": "Uber aeroporto",
    "valor": 78.50,
    "tipo": "despesa",
    "config": { "defaultModel": "gpt-4o-mini", "monthlyCostLimit": 10, "strategy": "balanced" }
  }' | jq .

# Uso mensal (limite em USD)
curl -s 'http://localhost:3000/api/ai/usage?limit=10' | jq .
```

---

## Roadmap (curto prazo)

- DATA: habilitar `batchProcessing` e cache de prompts quando seguro
- APP: UI de auditoria de classificações e feedback loop
- CORE: suíte de smoke tests para rotas de IA e contratos de tipos

---

## Referências

- `app/api/ai/*` (DATA)
- `lib/services/ai-usage.service.ts` (DATA)
- `AI_README.md`, `docs/AI_INTEGRATION_V2.md`, `docs/AI_CLASSIFICATION_GUIDE.md`, `OPENAI_SETUP.md`
- (Histórico) `docs/FUNCAO_AGENTES_IA.md`, `docs/STATUS_AGENTES.md`, `docs/GETTING_STARTED_AGENTS.md`, `docs/AGENTES_UI_TEMA.md`, `docs/AGENTE_UI_2_RELATORIO.md`

