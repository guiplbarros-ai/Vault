# Supabase Deployment Checklist

Este documento guia o deployment completo do classify_batch Edge Function e configuração inicial do projeto Cortex Ledger no Supabase.

---

## Pré-requisitos

- [x] Supabase CLI instalado (`brew install supabase/tap/supabase`)
- [ ] Conta Supabase ativa
- [ ] Acesso de Admin ao projeto `xborrshstfcvzrxyqyor`
- [ ] OpenAI API Key válida
- [ ] Node.js 18+ instalado (para desenvolvimento local)

---

## Etapa 1: Autenticação no Supabase

### 1.1 Login via Browser (recomendado)

```bash
supabase login
```

Isso abrirá o browser para autenticação OAuth. Após o login, você receberá um token de acesso.

### 1.2 Login via Token (CI/CD)

Se estiver em ambiente não-interativo:

```bash
# Obter token em: https://app.supabase.com/account/tokens
export SUPABASE_ACCESS_TOKEN="sbp_..."
supabase login --token $SUPABASE_ACCESS_TOKEN
```

### 1.3 Verificar autenticação

```bash
supabase projects list
```

Você deve ver `xborrshstfcvzrxyqyor` na lista.

---

## Etapa 2: Link ao Projeto

```bash
cd /path/to/cortex-ledger
supabase link --project-ref xborrshstfcvzrxyqyor
```

**Esperado:** `Linked to project xborrshstfcvzrxyqyor`

---

## Etapa 3: Configurar Secrets no Vault

### 3.1 Obter SERVICE_ROLE_KEY

1. Acesse: [Dashboard Supabase](https://app.supabase.com/project/xborrshstfcvzrxyqyor)
2. Vá em: **Project Settings** > **API**
3. Copie a chave `service_role` (secret key)

### 3.2 Obter OPENAI_API_KEY

1. Acesse: [OpenAI Platform](https://platform.openai.com/api-keys)
2. Crie uma nova API key ou use uma existente
3. Copie a chave `sk-proj-...`

### 3.3 Configurar Secrets

```bash
# Secrets obrigatórios
supabase secrets set \
  SERVICE_ROLE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  OPENAI_API_KEY='sk-proj-...' \
  --project-ref xborrshstfcvzrxyqyor

# Secrets opcionais (tuning)
supabase secrets set \
  OPENAI_MODEL='gpt-4o-mini' \
  REQUEST_TIMEOUT_MS='20000' \
  --project-ref xborrshstfcvzrxyqyor
```

### 3.4 Verificar Secrets

```bash
supabase secrets list --project-ref xborrshstfcvzrxyqyor
```

**Esperado:**
```
SERVICE_ROLE_KEY      (digest: sha256:abc...)
OPENAI_API_KEY        (digest: sha256:def...)
OPENAI_MODEL          (digest: sha256:ghi...)
REQUEST_TIMEOUT_MS    (digest: sha256:jkl...)
```

---

## Etapa 4: Aplicar Migrations (Agent A)

**Nota:** Esta etapa é responsabilidade do Agent A, mas incluída aqui para completude.

### 4.1 Verificar Migration File

```bash
cat supabase/migrations/20251026T000000_init.sql | head -20
```

Deve conter: tables, extensions, triggers, RLS policies.

### 4.2 Aplicar via SQL Editor (Manual)

1. Acesse: [SQL Editor](https://app.supabase.com/project/xborrshstfcvzrxyqyor/sql)
2. Cole o conteúdo de `supabase/migrations/20251026T000000_init.sql`
3. Execute (Run)

### 4.3 Ou aplicar via CLI (se migrations estiverem em formato Supabase)

```bash
supabase db push --project-ref xborrshstfcvzrxyqyor
```

### 4.4 Verificar Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Esperado:**
- instituicao
- conta
- transacao
- categoria
- regra_classificacao
- template_importacao
- recorrencia
- orcamento
- meta
- log_ia
- preferencias

---

## Etapa 5: Deploy Edge Function

### 5.1 Verificar função localmente (opcional)

```bash
# Criar .env.local
cp supabase/.env.local.example supabase/.env.local
# Editar .env.local com valores reais

# Servir localmente
supabase functions serve classify_batch \
  --env-file supabase/.env.local \
  --project-ref xborrshstfcvzrxyqyor
```

### 5.2 Deploy para Production

```bash
supabase functions deploy classify_batch \
  --project-ref xborrshstfcvzrxyqyor \
  --no-verify-jwt
```

**Nota:** `--no-verify-jwt` permite que a função valide JWT internamente (nosso caso).

### 5.3 Verificar Deploy

```bash
supabase functions list --project-ref xborrshstfcvzrxyqyor
```

**Esperado:**
```
┌────────────────┬────────┬─────────┬──────────────────────┐
│ NAME           │ STATUS │ VERSION │ UPDATED AT           │
├────────────────┼────────┼─────────┼──────────────────────┤
│ classify_batch │ ACTIVE │ 1       │ 2025-10-26 10:30:00  │
└────────────────┴────────┴─────────┴──────────────────────┘
```

### 5.4 Obter URL da Função

```
https://xborrshstfcvzrxyqyor.supabase.co/functions/v1/classify_batch
```

---

## Etapa 6: Testes de Aceitação

### 6.1 Obter User Access Token (JWT)

**Opção A: Via Supabase Dashboard**
1. Acesse: [Auth](https://app.supabase.com/project/xborrshstfcvzrxyqyor/auth/users)
2. Crie um usuário de teste (email/senha)
3. Faça login via API para obter JWT:

```bash
curl -X POST 'https://xborrshstfcvzrxyqyor.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "password": "securepassword123"
  }'
```

**Opção B: Via Supabase Client (JavaScript)**
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'securepassword123'
})
const accessToken = data.session.access_token
```

### 6.2 Teste 1: Unauthorized (401)

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}' \
  https://xborrshstfcvzrxyqyor.supabase.co/functions/v1/classify_batch
```

**Esperado:** `Unauthorized` (401)

### 6.3 Teste 2: Dry Run (sem transações)

```bash
USER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10, "dryRun": true, "useOpenAI": false}' \
  https://xborrshstfcvzrxyqyor.supabase.co/functions/v1/classify_batch
```

**Esperado:**
```json
{
  "processed": 0,
  "categorized": 0,
  "openaiCalls": 0,
  "errors": []
}
```

### 6.4 Teste 3: Com dados reais

**Pré-requisito:** Inserir transações e regras de teste (ver seção 7)

```bash
curl -X POST \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50, "dryRun": false, "useOpenAI": true}' \
  https://xborrshstfcvzrxyqyor.supabase.co/functions/v1/classify_batch
```

**Esperado:**
```json
{
  "processed": 23,
  "categorized": 18,
  "openaiCalls": 5,
  "errors": []
}
```

---

## Etapa 7: Seed Data para Testes

### 7.1 Criar Instituição e Conta

```sql
-- Substituir 'USER_ID_AQUI' pelo UUID do usuário de teste
INSERT INTO instituicao (id, user_id, nome, tipo)
VALUES (gen_random_uuid(), 'USER_ID_AQUI', 'Banco Teste', 'banco');

INSERT INTO conta (id, user_id, instituicao_id, apelido, tipo, moeda, ativa)
SELECT gen_random_uuid(), 'USER_ID_AQUI', i.id, 'Conta Corrente Teste', 'corrente', 'BRL', true
FROM instituicao i
WHERE i.user_id = 'USER_ID_AQUI' AND i.nome = 'Banco Teste';
```

### 7.2 Criar Categorias

```sql
INSERT INTO categoria (id, user_id, grupo, nome, ativa) VALUES
(gen_random_uuid(), 'USER_ID_AQUI', 'Transporte', 'Uber', true),
(gen_random_uuid(), 'USER_ID_AQUI', 'Alimentação', 'iFood', true),
(gen_random_uuid(), 'USER_ID_AQUI', 'Assinaturas', 'Streaming', true);
```

### 7.3 Criar Regras

```sql
-- Regra para Uber (ordem 1)
INSERT INTO regra_classificacao (id, user_id, ordem, expressao, tipo_regra, categoria_id, tags)
SELECT gen_random_uuid(), 'USER_ID_AQUI', 1, 'uber', 'contains', c.id, ARRAY['ride']
FROM categoria c
WHERE c.user_id = 'USER_ID_AQUI' AND c.nome = 'Uber';

-- Regra para iFood (ordem 2)
INSERT INTO regra_classificacao (id, user_id, ordem, expressao, tipo_regra, categoria_id, tags)
SELECT gen_random_uuid(), 'USER_ID_AQUI', 2, 'ifood', 'contains', c.id, ARRAY['delivery']
FROM categoria c
WHERE c.user_id = 'USER_ID_AQUI' AND c.nome = 'iFood';

-- Regra para Netflix (ordem 3)
INSERT INTO regra_classificacao (id, user_id, ordem, expressao, tipo_regra, categoria_id, tags)
SELECT gen_random_uuid(), 'USER_ID_AQUI', 3, 'netflix', 'contains', c.id, ARRAY['streaming']
FROM categoria c
WHERE c.user_id = 'USER_ID_AQUI' AND c.nome = 'Streaming';
```

### 7.4 Criar Transações de Teste (sem categoria)

```sql
-- Obter conta_id
WITH conta_teste AS (
  SELECT id FROM conta WHERE user_id = 'USER_ID_AQUI' LIMIT 1
)
INSERT INTO transacao (id, user_id, conta_id, data, descricao, valor, tipo, hash_dedupe)
SELECT
  gen_random_uuid(),
  'USER_ID_AQUI',
  (SELECT id FROM conta_teste),
  '2025-01-15',
  unnest(ARRAY[
    'UBER *TRIP SAO PAULO',
    'IFOOD *RESTAURANTE',
    'NETFLIX.COM',
    'AMAZON MARKETPLACE',
    'GOOGLE *CLOUD STORAGE'
  ]),
  unnest(ARRAY[-25.50, -48.90, -45.90, -120.00, -15.00]),
  'debito',
  encode(digest(random()::text, 'sha256'), 'hex');
```

---

## Etapa 8: Monitoramento e Logs

### 8.1 Verificar Logs da Edge Function

```bash
supabase functions logs classify_batch \
  --project-ref xborrshstfcvzrxyqyor \
  --follow
```

### 8.2 Query de `log_ia` (custos)

```sql
SELECT
  ts,
  modelo,
  tokens_in,
  tokens_out,
  custo_usd,
  score,
  detalhe->>'transaction_id' as tx_id,
  detalhe->>'reason' as reason
FROM log_ia
WHERE user_id = 'USER_ID_AQUI'
  AND tarefa = 'classify'
ORDER BY ts DESC
LIMIT 20;
```

### 8.3 Custo Total do Mês

```sql
SELECT
  DATE_TRUNC('month', ts) as mes,
  COUNT(*) as chamadas,
  SUM(tokens_in + tokens_out) as total_tokens,
  SUM(custo_usd) as custo_total_usd
FROM log_ia
WHERE user_id = 'USER_ID_AQUI'
  AND tarefa = 'classify'
GROUP BY DATE_TRUNC('month', ts)
ORDER BY mes DESC;
```

---

## Etapa 9: Rollback (se necessário)

### 9.1 Unset Secrets

```bash
supabase secrets unset OPENAI_API_KEY --project-ref xborrshstfcvzrxyqyor
supabase secrets unset SERVICE_ROLE_KEY --project-ref xborrshstfcvzrxyqyor
```

### 9.2 Delete Edge Function

```bash
supabase functions delete classify_batch --project-ref xborrshstfcvzrxyqyor
```

### 9.3 Rollback Migrations (manual)

Execute DROP statements no SQL Editor (ordem reversa de criação).

---

## Checklist Final

- [ ] Autenticado no Supabase CLI
- [ ] Projeto linkado (`supabase link`)
- [ ] Secrets configurados no Vault
- [ ] Migrations aplicadas (tables, RLS, triggers)
- [ ] Edge Function deployed
- [ ] Teste 401 (unauthorized) passou
- [ ] Teste 200 (dry run) passou
- [ ] Seed data criado
- [ ] Teste real com classificação passou
- [ ] `log_ia` registrando custos corretamente
- [ ] Monitoramento configurado

---

## Troubleshooting

**Erro: "Your account does not have the necessary privileges"**
→ Verifique se você é Admin/Owner do projeto no dashboard

**Erro: "Missing server configuration"**
→ Secrets não foram configurados. Execute etapa 3.3

**Erro: OpenAI timeout**
→ Aumente `REQUEST_TIMEOUT_MS` ou reduza batch size

**High costs**
→ Use `dryRun=true` primeiro; monitore `log_ia`; considere `useOpenAI=false` para testes

---

## Próximos Passos (pós-deployment)

1. Integrar com Agent C (import pipeline)
2. Criar UI para invocar `classify_batch`
3. Implementar pg_cron para classificação automática (batch 2D)
4. Adicionar Realtime notifications
5. Otimizar batch processing de OpenAI (parallel calls com rate limiting)
