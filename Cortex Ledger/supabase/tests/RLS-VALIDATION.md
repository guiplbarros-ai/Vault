# RLS Validation Tests - Cortex Ledger

Este documento descreve os testes de validação de Row Level Security (RLS) para garantir que os dados dos usuários estão completamente isolados.

## Objetivo

Validar que:
1. Cada usuário só pode acessar seus próprios dados
2. Tentativas de acesso cross-user são bloqueadas
3. Políticas RLS estão ativas em todas as tabelas
4. Triggers estão funcionando corretamente

## Pré-requisitos

1. Migração aplicada (`supabase/migrations/20251026T000000_init.sql`)
2. Dois usuários criados via Supabase Dashboard:
   - `user-a@test.com`
   - `user-b@test.com`
3. Seed executado (`supabase/seed.sql`) com dados para ambos usuários

## Método 1: Testes via SQL (Supabase Studio)

### 1.1 Verificar que RLS está habilitado

Execute no SQL Editor:

```sql
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Resultado esperado:** Todas as tabelas devem ter `rls_enabled = true`.

### 1.2 Verificar políticas existentes

```sql
SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Resultado esperado:** Cada tabela deve ter uma política `*_is_owner` com:
- `qual`: `(user_id = auth.uid())`
- `with_check`: `(user_id = auth.uid())`

### 1.3 Simular contexto de usuário via SQL

**IMPORTANTE:** Estes testes usam `set local role` e assumem que você tem SERVICE_ROLE. Para testes mais realistas, use o Método 2 (via JavaScript/TypeScript).

```sql
-- Obter IDs dos usuários de teste
SELECT id, email FROM auth.users WHERE email IN ('user-a@test.com', 'user-b@test.com');

-- Anotar os UUIDs:
-- user_a_id: [UUID DO USER A]
-- user_b_id: [UUID DO USER B]
```

### 1.4 Teste de isolamento: User A não vê dados de User B

```sql
-- Simular contexto de User A
SET LOCAL request.jwt.claims TO '{"sub": "USER_A_ID_AQUI"}';

-- Tentar acessar instituições
SELECT * FROM instituicao;
-- Deve retornar APENAS dados de User A (Bradesco, Nubank)

-- Tentar acessar transações de User B (deve retornar vazio)
SELECT * FROM transacao WHERE conta_id IN (
  SELECT id FROM conta WHERE user_id = 'USER_B_ID_AQUI'
);
-- Deve retornar 0 linhas

RESET request.jwt.claims;
```

### 1.5 Teste de escrita: User B não pode inserir dados para User A

```sql
-- Simular contexto de User B
SET LOCAL request.jwt.claims TO '{"sub": "USER_B_ID_AQUI"}';

-- Tentar inserir instituição com user_id de User A (deve falhar)
INSERT INTO instituicao (user_id, nome, tipo)
VALUES ('USER_A_ID_AQUI', 'Banco Hackeado', 'banco');
-- Deve retornar erro: new row violates row-level security policy

RESET request.jwt.claims;
```

## Método 2: Testes via TypeScript/JavaScript (Recomendado)

Este método é mais realista pois usa autenticação real via Supabase client.

### 2.1 Setup do teste

Crie o arquivo `supabase/tests/rls-test.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testRLS() {
  // 1. Login como User A
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: sessionA, error: errorA } = await clientA.auth.signInWithPassword({
    email: 'user-a@test.com',
    password: 'SUA_SENHA_AQUI',
  })

  if (errorA) {
    console.error('Erro ao fazer login com User A:', errorA)
    return
  }

  const userAId = sessionA.user!.id
  console.log('✓ User A autenticado:', userAId)

  // 2. Login como User B
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: sessionB, error: errorB } = await clientB.auth.signInWithPassword({
    email: 'user-b@test.com',
    password: 'SUA_SENHA_AQUI',
  })

  if (errorB) {
    console.error('Erro ao fazer login com User B:', errorB)
    return
  }

  const userBId = sessionB.user!.id
  console.log('✓ User B autenticado:', userBId)

  // 3. User A cria uma instituição
  const { data: instA, error: instErrorA } = await clientA
    .from('instituicao')
    .insert({ nome: 'Banco Teste A', tipo: 'banco' })
    .select()
    .single()

  if (instErrorA) {
    console.error('✗ User A não conseguiu criar instituição:', instErrorA)
    return
  }

  console.log('✓ User A criou instituição:', instA.nome, '(ID:', instA.id, ')')

  // 4. User B tenta ler instituição de User A (deve retornar vazio)
  const { data: instB, error: instErrorB } = await clientB
    .from('instituicao')
    .select()
    .eq('id', instA.id)
    .maybeSingle()

  if (instB !== null) {
    console.error('✗ FALHA DE SEGURANÇA: User B conseguiu ler dados de User A!', instB)
    return
  }

  console.log('✓ User B NÃO consegue ler instituição de User A (RLS OK)')

  // 5. User B tenta atualizar instituição de User A (deve falhar)
  const { error: updateError } = await clientB
    .from('instituicao')
    .update({ nome: 'Hackeado!' })
    .eq('id', instA.id)

  if (!updateError) {
    console.error('✗ FALHA DE SEGURANÇA: User B conseguiu atualizar dados de User A!')
    return
  }

  console.log('✓ User B NÃO consegue atualizar dados de User A (RLS OK)')

  // 6. User B tenta deletar instituição de User A (deve falhar)
  const { error: deleteError } = await clientB
    .from('instituicao')
    .delete()
    .eq('id', instA.id)

  if (!deleteError) {
    console.error('✗ FALHA DE SEGURANÇA: User B conseguiu deletar dados de User A!')
    return
  }

  console.log('✓ User B NÃO consegue deletar dados de User A (RLS OK)')

  // 7. User A pode ler suas próprias instituições
  const { data: myInsts, error: myInstsError } = await clientA
    .from('instituicao')
    .select()

  if (myInstsError) {
    console.error('✗ User A não conseguiu ler suas próprias instituições:', myInstsError)
    return
  }

  console.log(`✓ User A consegue ler suas próprias instituições (${myInsts.length} registros)`)

  // 8. User B só vê suas próprias instituições
  const { data: bInsts, error: bInstsError } = await clientB
    .from('instituicao')
    .select()

  if (bInstsError) {
    console.error('✗ User B não conseguiu ler suas próprias instituições:', bInstsError)
    return
  }

  console.log(`✓ User B consegue ler apenas suas próprias instituições (${bInsts.length} registros)`)

  // 9. Teste de trigger: hash_dedupe
  const { data: conta, error: contaError } = await clientA
    .from('conta')
    .select()
    .limit(1)
    .single()

  if (contaError || !conta) {
    console.error('✗ User A não tem conta para testar transação')
    return
  }

  const { data: txn, error: txnError } = await clientA
    .from('transacao')
    .insert({
      conta_id: conta.id,
      data: '2025-01-26',
      descricao: 'Teste RLS',
      valor: 99.99,
      tipo: 'debito',
    })
    .select()
    .single()

  if (txnError) {
    console.error('✗ User A não conseguiu criar transação:', txnError)
    return
  }

  if (!txn.hash_dedupe || txn.hash_dedupe.length !== 64) {
    console.error('✗ Trigger hash_dedupe não funcionou! Hash:', txn.hash_dedupe)
    return
  }

  console.log('✓ Trigger hash_dedupe funcionando corretamente (hash:', txn.hash_dedupe.substring(0, 16) + '...)')

  // 10. Cleanup: deletar dados de teste
  await clientA.from('transacao').delete().eq('id', txn.id)
  await clientA.from('instituicao').delete().eq('id', instA.id)

  console.log('\n===========================================')
  console.log('✓ TODOS OS TESTES RLS PASSARAM COM SUCESSO!')
  console.log('===========================================')
}

testRLS().catch(console.error)
```

### 2.2 Executar o teste

```bash
# Instalar dependências
pnpm add -D tsx @supabase/supabase-js

# Configurar .env com credenciais
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Executar teste
pnpm tsx supabase/tests/rls-test.ts
```

## Método 3: Testes via Supabase Client (Browser/Postman)

Você também pode testar RLS via requisições HTTP:

### 3.1 Obter Access Tokens

1. Faça login com User A via Supabase Auth e obtenha o `access_token`
2. Faça login com User B via Supabase Auth e obtenha o `access_token`

### 3.2 Testar via cURL

```bash
# User A lista suas instituições
curl -X GET 'https://xborrshstfcvzrxyqyor.supabase.co/rest/v1/instituicao' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer USER_A_ACCESS_TOKEN"

# User B tenta acessar mesma instituição (deve retornar vazio)
curl -X GET 'https://xborrshstfcvzrxyqyor.supabase.co/rest/v1/instituicao?id=eq.INST_A_ID' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer USER_B_ACCESS_TOKEN"
```

## Checklist de Validação

- [ ] RLS habilitado em todas as tabelas
- [ ] Políticas RLS criadas para todas as tabelas
- [ ] User A pode ler/escrever seus próprios dados
- [ ] User B pode ler/escrever seus próprios dados
- [ ] User A **NÃO** pode ler dados de User B
- [ ] User B **NÃO** pode ler dados de User A
- [ ] User A **NÃO** pode modificar dados de User B
- [ ] User B **NÃO** pode modificar dados de User A
- [ ] Triggers funcionando (hash_dedupe, user_id auto-set)
- [ ] Tentativas cross-user retornam erro ou vazio (não expõem dados)

## Resultado Esperado

Todos os testes devem passar sem falhas de segurança. Se algum usuário conseguir acessar ou modificar dados de outro usuário, há uma falha crítica de RLS que deve ser corrigida antes de prosseguir.

## Troubleshooting

### "RLS policy violation" ao inserir dados

Verifique se o trigger `set_user_id` está ativo e se `auth.uid()` está retornando o ID correto do usuário autenticado.

### User consegue ver dados de outro usuário

Verifique se a política RLS está usando `user_id = auth.uid()` corretamente. Execute:

```sql
SELECT policyname, qual, with_check FROM pg_policies WHERE tablename = 'instituicao';
```

### Hash_dedupe não está sendo gerado

Verifique se o trigger `transacao_hash_biu` está ativo:

```sql
SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname = 'transacao_hash_biu';
```

---

**Status:** Testes RLS documentados ✓
**Próximo passo:** Executar testes e validar isolamento completo entre usuários
