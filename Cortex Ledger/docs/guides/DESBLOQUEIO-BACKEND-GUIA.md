# 🚀 Guia de Desbloqueio Backend - Agente G

> **Status:** Preparado para execução
> **Data:** 2025-10-26
> **Responsável:** Agente G + DevOps

---

## ✅ Resumo Executivo

O Agente G preparou **scripts automatizados** e **instruções passo-a-passo** para desbloquear o backend do Cortex Ledger.

**6 passos necessários:** ⏱️ ~30min total

1. ✅ **Scripts criados** - `apply-migrations.mjs` e `apply-migration-api.mjs`
2. ⚠️ **Execução manual necessária** - Migrations e Seeds (limitação da API Supabase)
3. ✅ **Próximos passos preparados** - Secrets, Deploy, Testes

---

## 📋 CHECKLIST DE EXECUÇÃO RÁPIDA

### ✅ Passo 1 & 2: Aplicar Migrations + Seed (5-8 min)

**Opção A - Via Supabase Studio (RECOMENDADO - mais simples):**

```bash
# 1. Copiar migration para área de transferência
cat "/Users/guilhermebarros/Documents/Coding/Cortex Ledger/supabase/migrations/20251026T000000_init.sql" | pbcopy

# 2. Abrir SQL Editor
open "https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/sql/new"

# 3. Colar (Cmd+V) e executar (Cmd+Enter ou botão "Run")

# 4. Copiar seed
cat "/Users/guilhermebarros/Documents/Coding/Cortex Ledger/supabase/seed.sql" | pbcopy

# 5. Colar no SQL Editor e executar novamente
```

**Opção B - Via psql (se preferir linha de comando):**

```bash
# 1. Obter password do banco
open "https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/settings/database"
# Copie o "Database Password"

# 2. Executar migrations
export PGPASSWORD="sua_senha_aqui"
psql -h aws-0-us-east-1.pooler.supabase.com -p 6543 \
  -U postgres.xborrshstfcvzrxyqyor -d postgres \
  -f "/Users/guilhermebarros/Documents/Coding/Cortex Ledger/supabase/migrations/20251026T000000_init.sql"

# 3. Executar seed
psql -h aws-0-us-east-1.pooler.supabase.com -p 6543 \
  -U postgres.xborrshstfcvzrxyqyor -d postgres \
  -f "/Users/guilhermebarros/Documents/Coding/Cortex Ledger/supabase/seed.sql"
```

**✅ Resultado esperado:**
- 11 tabelas criadas
- RLS policies aplicadas
- Triggers configurados
- 2 usuários de teste criados

---

### ⚠️ Passo 3: Validar RLS (5-10 min)

```bash
# Após aplicar migrations, validar RLS
# Consultar arquivo de testes RLS
cat "/Users/guilhermebarros/Documents/Coding/Cortex Ledger/supabase/tests/RLS-VALIDATION.md"

# Ou executar no SQL Editor:
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**✅ Resultado esperado:**
- Policies presentes em todas as 11 tabelas
- Cada tabela deve ter policies de SELECT, INSERT, UPDATE, DELETE

---

### ⚠️ Passo 4: Configurar Secrets OpenAI (2-5 min)

**Pré-requisito:** Token de acesso Supabase ou login via browser

**Opção A - Via CLI (requer autenticação):**

```bash
# 1. Login no Supabase (abre browser)
supabase login

# 2. Obter OpenAI API Key
open "https://platform.openai.com/api-keys"
# Criar ou copiar uma API key (sk-proj-...)

# 3. Configurar secrets
supabase secrets set \
  OPENAI_API_KEY='sk-proj-sua-key-aqui' \
  OPENAI_MODEL='gpt-4o-mini' \
  --project-ref xborrshstfcvzrxyqyor

# 4. Verificar
supabase secrets list --project-ref xborrshstfcvzrxyqyor
```

**Opção B - Via Dashboard:**

```bash
# 1. Abrir settings de Edge Functions
open "https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/settings/functions"

# 2. Na seção "Secrets", adicionar manualmente:
# - Key: OPENAI_API_KEY
# - Value: sk-proj-...
```

**✅ Resultado esperado:**
- Secret `OPENAI_API_KEY` configurado
- (Opcional) `OPENAI_MODEL` configurado

---

### ⚠️ Passo 5: Deploy Edge Function (5 min)

**Pré-requisito:** Supabase CLI autenticado (step 4)

```bash
# 1. Verificar função localmente (opcional)
cd "/Users/guilhermebarros/Documents/Coding/Cortex Ledger"
cat supabase/functions/classify_batch/index.ts | head -20

# 2. Deploy
supabase functions deploy classify_batch \
  --project-ref xborrshstfcvzrxyqyor \
  --no-verify-jwt

# 3. Verificar deploy
supabase functions list --project-ref xborrshstfcvzrxyqyor

# 4. Obter URL
echo "https://xborrshstfcvzrxyqyor.supabase.co/functions/v1/classify_batch"
```

**✅ Resultado esperado:**
```
┌────────────────┬────────┬─────────┐
│ NAME           │ STATUS │ VERSION │
├────────────────┼────────┼─────────┤
│ classify_batch │ ACTIVE │ 1       │
└────────────────┴────────┴─────────┘
```

---

### ⚠️ Passo 6: Teste E2E CLI (10 min)

```bash
cd "/Users/guilhermebarros/Documents/Coding/Cortex Ledger"

# 1. Verificar se há arquivos de exemplo
ls -la packages/etl/data/examples/

# 2. Executar importação de teste
# (Assumindo que o CLI está implementado em cli/import.ts)
pnpm tsx cli/import.ts \
  --file "packages/etl/data/examples/bradesco_cc.csv" \
  --template "bradesco-csv" \
  --dry-run

# 3. Se dry-run OK, executar importação real
pnpm tsx cli/import.ts \
  --file "packages/etl/data/examples/bradesco_cc.csv" \
  --template "bradesco-csv"

# 4. Verificar no Supabase
# Abrir tabela de transações
open "https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/editor"
```

**✅ Resultado esperado:**
- Arquivo CSV parseado com sucesso
- Transações inseridas no banco
- Dedupe funcionando (sem duplicatas)
- Logs no console

---

## 🎯 STATUS DOS 6 PASSOS

| Passo | Descrição | Status | Tempo |
|-------|-----------|--------|-------|
| 1 | Aplicar migrations | ⚠️ **Preparado (execução manual)** | 5min |
| 2 | Aplicar seed | ⚠️ **Preparado (execução manual)** | 3min |
| 3 | Validar RLS | ⚠️ **Preparado (execução manual)** | 10min |
| 4 | Configurar secrets | ⚠️ **Requer autenticação** | 2min |
| 5 | Deploy Edge Function | ⚠️ **Requer autenticação** | 5min |
| 6 | Teste E2E CLI | ⚠️ **Requer passos 1-5** | 10min |

**⏱️ Total estimado:** 30-35 minutos

---

## 🛠️ Scripts Criados pelo Agente G

### 1. `scripts/apply-migrations.mjs`
- ✅ Verifica conexão Supabase
- ✅ Verifica se tabelas já existem
- ✅ Fornece instruções de execução manual
- ✅ Suporta múltiplas abordagens (Studio, psql, CLI)

**Uso:**
```bash
node scripts/apply-migrations.mjs
```

### 2. `scripts/apply-migration-api.mjs`
- ✅ Versão alternativa com mais detalhes
- ✅ Instruções de copy/paste
- ✅ Comandos prontos para psql

**Uso:**
```bash
node scripts/apply-migration-api.mjs
```

---

## 🚨 Bloqueios Identificados

### 1. Autenticação Supabase CLI
**Problema:** Ambiente não-interativo (Claude Code CLI) não pode abrir browser para OAuth

**Soluções:**
- **A)** Executar manualmente `supabase login` em outro terminal
- **B)** Usar token de acesso: `supabase login --token sbp_...`
  - Obter token em: https://app.supabase.com/account/tokens
- **C)** Executar via Supabase Studio (migrations) + Dashboard (secrets)

### 2. Execução de DDL via API
**Problema:** Supabase REST API não suporta DDL statements (CREATE TABLE, etc)

**Solução:** Usar SQL Editor do Supabase Studio (mais simples e visual)

---

## 📊 O Que Foi Automatizado vs. Manual

### ✅ **Automatizado pelo Agente G:**
- [x] Verificação de conexão Supabase
- [x] Verificação de estado do banco (tabelas existem?)
- [x] Scripts de aplicação de migrations
- [x] Instruções passo-a-passo
- [x] Comandos prontos para copy/paste
- [x] Validação de pré-requisitos

### ⚠️ **Requer Execução Manual:**
- [ ] Aplicar migrations (via Studio ou psql)
- [ ] Aplicar seed (via Studio ou psql)
- [ ] Autenticar Supabase CLI
- [ ] Configurar secrets
- [ ] Deploy Edge Function
- [ ] Teste E2E

**Motivo:** Limitações de ambiente não-interativo + Restrições da API Supabase para DDL

---

## 🎯 Próximos Passos Recomendados

### Para DevOps:

1. **AGORA (5min):**
   ```bash
   # Aplicar migrations via Studio (opção A acima)
   node scripts/apply-migration-api.mjs
   # Seguir instruções
   ```

2. **DEPOIS (10min):**
   ```bash
   # Autenticar + configurar secrets + deploy
   supabase login
   supabase secrets set OPENAI_API_KEY='...' --project-ref xborrshstfcvzrxyqyor
   supabase functions deploy classify_batch --project-ref xborrshstfcvzrxyqyor
   ```

3. **VALIDAR (10min):**
   ```bash
   # Teste E2E
   pnpm tsx cli/import.ts --file examples/test.csv --dry-run
   ```

### Para Próxima Fase (Agente D):

✅ **Backend 100% operacional** → Iniciar UI Foundation
- Autenticação (Login/Signup)
- Layout base (Sidebar + Header)
- Componentes UI
- Tema

---

## 📚 Referências

**Documentação criada/atualizada:**
- ✅ `scripts/apply-migrations.mjs` - Script de verificação e instruções
- ✅ `scripts/apply-migration-api.mjs` - Script com comandos prontos
- ✅ Este guia: `DESBLOQUEIO-BACKEND-GUIA.md`

**Documentação existente:**
- `supabase/DEPLOYMENT.md` - Guia completo de deployment (465 linhas)
- `supabase/README.md` - Setup backend
- `supabase/tests/RLS-VALIDATION.md` - Validação RLS
- `packages/etl/README.md` - Guia ETL/importação

---

## 🆘 Troubleshooting

### "Your account does not have the necessary privileges"
→ Verificar se é Admin/Owner do projeto no dashboard

### "Cannot find project ref"
→ Executar `supabase link --project-ref xborrshstfcvzrxyqyor` após login

### "Missing server configuration"
→ Secrets não foram configurados (Step 4)

### "OpenAI timeout"
→ Aumentar `REQUEST_TIMEOUT_MS` secret ou reduzir batch size

---

## ✅ Definition of Done

**Backend 100% Operacional quando:**
- [x] ✅ Scripts de migration criados
- [ ] ✅ Migrations aplicadas (11 tabelas visíveis no Studio)
- [ ] ✅ Seed aplicado (2 usuários de teste existem)
- [ ] ✅ RLS policies validadas (query retorna policies)
- [ ] ✅ Secrets configurados (OPENAI_API_KEY presente)
- [ ] ✅ Edge Function deployed (status ACTIVE)
- [ ] ✅ CLI import funcionando (teste E2E passa)

---

**Preparado por:** Agente G
**Data:** 2025-10-26
**Próxima atualização:** Após execução manual dos passos 1-6
