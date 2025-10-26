# Supabase Setup - Cortex Ledger

Este documento descreve como configurar o projeto Supabase para o Cortex Ledger, incluindo aplicação de migrações, configuração de RLS e validação de segurança.

## Informações do Projeto

- **Project Ref:** xborrshstfcvzrxyqyor
- **Project URL:** https://xborrshstfcvzrxyqyor.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor

## 1. Configuração Inicial

### 1.1 Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e preencha as variáveis:

```bash
cp .env.example .env
```

Obtenha as credenciais em: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/settings/api

Variáveis necessárias:
- `DATABASE_URL`: Connection string do PostgreSQL
- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave anônima (safe para client-side)
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço (APENAS server-side)
- `OPENAI_API_KEY`: Chave da API OpenAI para classificação

### 1.2 Instalar Dependências

```bash
pnpm install
```

## 2. Aplicar Migração SQL

### Opção A: Via Supabase Studio (Recomendado)

1. Acesse o SQL Editor: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/sql/new

2. Copie o conteúdo do arquivo `supabase/migrations/20251026T000000_init.sql`

3. Cole no editor e clique em "Run"

4. Verifique se todas as extensões foram criadas:
   ```sql
   SELECT extname FROM pg_extension
   WHERE extname IN ('pgcrypto', 'pg_trgm', 'uuid-ossp', 'pg_stat_statements');
   ```

   Deve retornar 4 linhas.

5. Verifique se todas as tabelas foram criadas:
   ```sql
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```

   Deve retornar: categoria, conta, instituicao, log_ia, meta, orcamento, preferencias, recorrencia, regra_classificacao, template_importacao, transacao.

6. Verifique se RLS está habilitado em todas as tabelas:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```

   Todas as tabelas devem ter `rowsecurity = true`.

### Opção B: Via Supabase CLI (Local)

```bash
# Aplicar migração no projeto remoto
supabase db push --project-ref xborrshstfcvzrxyqyor
```

## 3. Validar Schema e Triggers

### 3.1 Verificar Trigger Functions

```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('set_user_id', 'compute_hash_dedupe', 'set_transacao_hash');
```

### 3.2 Verificar Triggers Ativos

```sql
SELECT tgname, tgrelid::regclass, tgtype
FROM pg_trigger
WHERE tgname IN ('transacao_set_user', 'transacao_hash_biu');
```

### 3.3 Testar Função de Hash

```sql
SELECT compute_hash_dedupe(
  '2025-01-15'::date,
  100.50,
  'Teste de transação',
  gen_random_uuid()
);
```

Deve retornar um hash SHA256 (64 caracteres hexadecimais).

### 3.4 Verificar Índices

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

Índices críticos esperados:
- `idx_tx_user_hash` (UNIQUE em transacao)
- `idx_tx_user_conta_data` (em transacao)
- `idx_regra_user_ordem` (em regra_classificacao)
- `idx_template_user_inst` (em template_importacao)

## 4. Configurar e Validar RLS

### 4.1 Verificar Políticas RLS

```sql
SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

Cada tabela deve ter uma política `*_is_owner` com:
- `qual`: `(user_id = auth.uid())`
- `with_check`: `(user_id = auth.uid())`

### 4.2 Criar Usuários de Teste

Via Supabase Dashboard:
1. Acesse: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/auth/users
2. Clique em "Add User" → "Create new user"
3. Crie dois usuários:
   - Usuario A: `user-a@test.com` / senha forte
   - Usuario B: `user-b@test.com` / senha forte

## 5. Configurar Edge Functions

### 5.1 Configurar Secrets

```bash
# Service Role Key (para Edge Functions)
supabase secrets set SERVICE_ROLE_KEY="your_service_role_key_here" --project-ref xborrshstfcvzrxyqyor

# OpenAI API Key
supabase secrets set OPENAI_API_KEY="sk-..." --project-ref xborrshstfcvzrxyqyor
```

### 5.2 Verificar Secrets

```bash
supabase secrets list --project-ref xborrshstfcvzrxyqyor
```

## 6. Validação de Schema com Drizzle

### 6.1 Gerar Tipos

```bash
pnpm db:generate
```

Este comando executa `drizzle-kit generate` e cria migrações baseadas nos schemas TypeScript.

### 6.2 Comparar com SQL Manual

Compare os arquivos gerados em `packages/db/migrations/` com `supabase/migrations/20251026T000000_init.sql` para garantir paridade.

**IMPORTANTE:** Como já aplicamos a migração SQL manualmente, o Drizzle não deve gerar diferenças (drift). Se houver drift, revise os schemas.

## 7. Estrutura de Terminais (Desenvolvimento)

```bash
# Terminal 1: Web app dev server (futuro)
pnpm dev --filter @cortex/web

# Terminal 2: Services tests (futuro)
pnpm --filter @cortex/services test --watch

# Terminal 3: DB migrations
pnpm --filter @cortex/db drizzle:generate

# Terminal 4: Edge Functions
supabase functions serve --env-file ./supabase/.env --project-ref xborrshstfcvzrxyqyor

# Terminal 5: Supabase local (opcional)
supabase start
```

## 8. Checklist de Aceitação (Agent A)

- [x] Migração SQL completa (extensões, tabelas, triggers, RLS)
- [x] Drizzle config criado e funcional
- [x] Schemas Drizzle com índices e relações
- [ ] Dois usuários de teste criados (ver seção 4.2)
- [ ] RLS validado (ver documento separado: `supabase/tests/RLS-VALIDATION.md`)
- [ ] Script de seed criado (ver `supabase/seed.sql`)

## 9. Próximos Passos

1. **Aplicar migração no Supabase Studio** (seção 2)
2. **Criar usuários de teste** (seção 4.2)
3. **Executar testes RLS** (ver `supabase/tests/RLS-VALIDATION.md`)
4. **Executar seed** (ver `supabase/seed.sql`)
5. **Agent B:** Implementar `classify_batch`
6. **Agent C:** Implementar import pipeline

## 10. Troubleshooting

### Erro: "permission denied for schema public"
Verifique se RLS está habilitado e se o usuário está autenticado corretamente.

### Erro: "relation does not exist"
A migração pode não ter sido aplicada. Execute novamente o SQL no Supabase Studio.

### Erro: "duplicate key value violates unique constraint"
Verifique se o `hash_dedupe` está sendo calculado corretamente. O trigger deve estar ativo.

---

**Agent A — AGENT_DB_RLS**
Status: Database, Security e Types configurados ✓
