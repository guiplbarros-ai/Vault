# classify_batch — Edge Function

Server-side classification of uncategorized transactions using deterministic rules first, then optional OpenAI fallback. Enforces RLS and logs all AI usage to `log_ia`.

---

## Architecture & Flow

1. **JWT Validation**: Extract `user_id` from `Authorization: Bearer <token>`
2. **Fetch Rules**: Load `regra_classificacao` ordered by `ordem` ASC
3. **Fetch Transactions**: Select uncategorized (`categoria_id IS NULL`) transactions for the user, respecting `limit` and optional `contaId` filter
4. **Apply Rules Deterministically**:
   - **regex**: PostgreSQL `~*` (case-insensitive regex)
   - **contains**: `ILIKE '%expr%'`
   - **starts**: `ILIKE 'expr%'`
   - **ends**: `ILIKE '%expr'`
   - First match by `ordem` wins; ties resolved by lower `categoria_id` (string sort)
5. **OpenAI Fallback** (if no rule match and `useOpenAI=true`):
   - Call OpenAI API with transaction context
   - Parse JSON response: `{categoria_id, tags, score, reason}`
   - Track tokens, cost, and model
6. **Persist**:
   - Update `transacao.categoria_id` (unless `dryRun=true`)
   - Insert `log_ia` row for every OpenAI call (only when `source='openai'`)
7. **Return Summary**: `{processed, categorized, openaiCalls, errors[]}`

---

## Request Contract

**Headers:**
- `Authorization: Bearer <USER_ACCESS_TOKEN>` (required)

**Body (JSON):**
```json
{
  "limit": 500,          // 1–5000, default 500
  "dryRun": false,       // if true, skip writes; just return summary
  "useOpenAI": true,     // if false, skip OpenAI fallback
  "filters": {
    "contaId": "uuid"    // optional: filter by account
  }
}
```

**Response (JSON):**
```json
{
  "processed": 123,
  "categorized": 98,
  "openaiCalls": 25,
  "errors": []
}
```

---

## Secrets (Vault)

Set function-scoped secrets. **Never commit keys.**

```bash
# From repo root
supabase secrets set \
  SERVICE_ROLE_KEY='eyJhb...' \
  OPENAI_API_KEY='sk-proj-...' \
  --project-ref xborrshstfcvzrxyqyor

# Optional tuning
supabase secrets set \
  OPENAI_MODEL='gpt-4o-mini' \
  REQUEST_TIMEOUT_MS='20000' \
  --project-ref xborrshstfcvzrxyqyor
```

**List secrets:**
```bash
supabase secrets list --project-ref xborrshstfcvzrxyqyor
```

**Unset a secret:**
```bash
supabase secrets unset OPENAI_API_KEY --project-ref xborrshstfcvzrxyqyor
```

---

## Local Development

**Serve locally:**
```bash
supabase functions serve classify_batch \
  --env-file ./supabase/.env.local \
  --project-ref xborrshstfcvzrxyqyor
```

Create `supabase/.env.local`:
```env
SUPABASE_URL=https://xborrshstfcvzrxyqyor.supabase.co
SERVICE_ROLE_KEY=eyJhb...
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
REQUEST_TIMEOUT_MS=20000
```

---

## Deploy

```bash
supabase functions deploy classify_batch \
  --project-ref xborrshstfcvzrxyqyor
```

---

## Testing & Examples

### 1. Dry Run (no writes)

```bash
curl -X POST \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10, "dryRun": true, "useOpenAI": false}' \
  "https://xborrshstfcvzrxyqyor.supabase.co/functions/v1/classify_batch"
```

**Expected:**
```json
{
  "processed": 10,
  "categorized": 7,
  "openaiCalls": 0,
  "errors": []
}
```

### 2. Real Classification (with OpenAI)

```bash
curl -X POST \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50, "dryRun": false, "useOpenAI": true}' \
  "https://xborrshstfcvzrxyqyor.supabase.co/functions/v1/classify_batch"
```

**Expected:**
```json
{
  "processed": 50,
  "categorized": 45,
  "openaiCalls": 12,
  "errors": []
}
```

### 3. Filter by Account

```bash
curl -X POST \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100, "filters": {"contaId": "uuid-here"}}' \
  "https://xborrshstfcvzrxyqyor.supabase.co/functions/v1/classify_batch"
```

### 4. Unauthorized Request (no JWT)

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}' \
  "https://xborrshstfcvzrxyqyor.supabase.co/functions/v1/classify_batch"
```

**Expected:**
```
Unauthorized (401)
```

---

## Rule Semantics (PRD 11.1 Compliance)

**Priority:** User rules (by `ordem` ASC) → OpenAI fallback (only if no match)

**Rule Types:**

| Type       | SQL Equivalent         | Description                          |
|------------|------------------------|--------------------------------------|
| `regex`    | `~*`                   | Case-insensitive regex match         |
| `contains` | `ILIKE '%expr%'`       | Substring match                      |
| `starts`   | `ILIKE 'expr%'`        | Prefix match                         |
| `ends`     | `ILIKE '%expr'`        | Suffix match                         |

**Determinism:**
- First match by `ordem` (ascending)
- Ties resolved by `categoria_id` (string sort, ascending)

**Normalization:**
- Description: trim, collapse multi-spaces, lowercase

---

## Observability

**Check `log_ia` for AI usage:**
```sql
SELECT ts, tarefa, modelo, tokens_in, tokens_out, custo_usd, score, detalhe
FROM log_ia
WHERE user_id = auth.uid()
  AND tarefa = 'classify'
ORDER BY ts DESC
LIMIT 20;
```

**Cost tracking:**
- Rough estimates: `gpt-4o-mini` ≈ $0.15/1M tokens; `gpt-4` ≈ $2.50/1M
- Adjust `costPerMillion` in `classifyWithOpenAI()` as needed

---

## Security & RLS

- Edge function runs with `SERVICE_ROLE_KEY` but **scoped by user JWT** via `Authorization` header
- All DB queries enforce RLS: `user_id = auth.uid()`
- Never perform cross-user operations
- Secrets are stored in Supabase Vault (never in repo)

---

## Troubleshooting

**Error: "Missing server configuration"**
→ Set `SERVICE_ROLE_KEY` via `supabase secrets set`

**Error: "Unauthorized"**
→ Provide valid JWT in `Authorization: Bearer <token>`

**OpenAI timeout:**
→ Increase `REQUEST_TIMEOUT_MS` or reduce batch size

**High costs:**
→ Use `dryRun=true` first; set `useOpenAI=false` to test rules; monitor `log_ia`

---

## Related Documentation

- **[DEPLOYMENT.md](../../DEPLOYMENT.md)** — Complete deployment checklist and step-by-step guide
- **[FUTURE_ENHANCEMENTS.md](./FUTURE_ENHANCEMENTS.md)** — Planned optimizations and features for v2

---

## Next Steps

See [FUTURE_ENHANCEMENTS.md](./FUTURE_ENHANCEMENTS.md) for detailed implementation plans:

- **Priority 1:** Batch processing optimization (parallel OpenAI calls with rate limiting)
- **Priority 2:** Few-shot learning with user examples
- **Priority 3:** Error recovery and retry logic
- **Priority 4:** Caching for recurring transactions
- **Priority 5:** `confianca_min` gating (confidence threshold validation)
- **Priority 6:** Realtime notification hook for UI updates
