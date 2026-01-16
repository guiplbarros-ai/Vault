# Configuração Supabase - Budget Cortihouse

**Projeto criado em:** Janeiro 2026
**Região:** South America (São Paulo)

---

## Dados do Projeto

| Campo | Valor |
|-------|-------|
| Project ID | `yxiitvlzelzzqkbeyvuk` |
| Project URL | `https://yxiitvlzelzzqkbeyvuk.supabase.co` |
| Region | São Paulo (gru) |

---

## Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yxiitvlzelzzqkbeyvuk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=***SUPABASE_ANON_KEY_REDACTED***
SUPABASE_SERVICE_ROLE_KEY=***SUPABASE_SERVICE_KEY_REDACTED***

# Database (senha URL-encoded)
DATABASE_URL=postgresql://postgres.yxiitvlzelzzqkbeyvuk:***DB_PASSWORD_REDACTED***@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.yxiitvlzelzzqkbeyvuk:***DB_PASSWORD_REDACTED***@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

### Nota sobre a senha
A senha contém caracteres especiais e precisa ser URL-encoded:
- Original: `***DB_PASSWORD_REDACTED***`
- Encoded: `***DB_PASSWORD_REDACTED***`

---

## Links Úteis

- **Dashboard:** https://supabase.com/dashboard/project/yxiitvlzelzzqkbeyvuk
- **SQL Editor:** https://supabase.com/dashboard/project/yxiitvlzelzzqkbeyvuk/sql
- **Auth Users:** https://supabase.com/dashboard/project/yxiitvlzelzzqkbeyvuk/auth/users
- **Storage:** https://supabase.com/dashboard/project/yxiitvlzelzzqkbeyvuk/storage/buckets
- **API Docs:** https://supabase.com/dashboard/project/yxiitvlzelzzqkbeyvuk/api

---

## Configurações Necessárias no Dashboard

### 1. Autenticação
Em **Authentication > Providers**:
- [x] Email (habilitado por padrão)
- [ ] Desabilitar "Confirm email" para desenvolvimento

### 2. Storage Buckets (criar manualmente)
Em **Storage > New bucket**:
- `logos` - Para logos das empresas (público)
- `pdfs` - Para PDFs gerados (privado, opcional)

### 3. Criar Primeiro Usuário
Em **Authentication > Users > Add user**:
- Email: vanda@cortihouse.com.br (ou o email dela)
- Password: (definir uma senha inicial)

---

## Conexão com Drizzle

O Supabase usa connection pooling via PgBouncer. Para Drizzle:

```typescript
// Para queries normais (com pooling)
DATABASE_URL=postgresql://...?pgbouncer=true

// Para migrations (conexão direta)
DIRECT_URL=postgresql://...
```

---

*Credenciais configuradas e prontas para uso*
