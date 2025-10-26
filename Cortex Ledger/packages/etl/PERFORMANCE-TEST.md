# Performance Testing Guide

Este documento descreve o procedimento completo para validar a performance do pipeline ETL do Cortex Ledger.

## Objetivo

Validar que o sistema consegue processar **10.000 transações em ≤ 2 minutos**, conforme especificado nos requisitos de aceitação do Agent C.

## Pré-requisitos

1. Database configurado e migrações aplicadas (Agent A)
2. Conta (`conta_id`) criada no sistema
3. Variáveis de ambiente configuradas (`.env` com `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`)
4. Pacotes instalados: `pnpm install`

## Etapa 1: Gerar Arquivo de Teste

O script `generate-large-file.ts` cria arquivos CSV realistas para testes de performance.

```bash
# Gerar arquivo com 10.000 transações (padrão)
pnpm --filter @cortex/etl tsx scripts/generate-large-file.ts

# Gerar arquivo customizado
pnpm --filter @cortex/etl tsx scripts/generate-large-file.ts 10000 large-test-10k.csv

# Gerar arquivo maior (50k transações)
pnpm --filter @cortex/etl tsx scripts/generate-large-file.ts 50000 large-test-50k.csv
```

**Características do arquivo gerado:**
- Data aleatória em 2024
- 20 templates diferentes de transações realistas
- Formato Bradesco CSV (separador `;`, valores com vírgula)
- Saldo calculado progressivamente
- Documentos únicos por linha

**Saída esperada:**
```
🔧 Generating CSV file with 10000 transactions...
✅ File created: /path/to/large-test-file.csv
📊 Size: 1024.56 KB
📝 Lines: 10001 (including header)

💡 Usage:
   pnpm --filter @cortex/etl dev large-test-file.csv <conta_id> bradesco-csv
```

## Etapa 2: Executar Teste de Performance

### 2.1 Preparação

```bash
# 1. Certifique-se que o database está limpo ou use uma conta de teste
# 2. Anote o conta_id que você vai usar
CONTA_ID="sua-conta-id-aqui"

# 3. Navegue até o diretório raiz do projeto
cd /path/to/Cortex\ Ledger
```

### 2.2 Executar Import com Medição de Tempo

**Linux/macOS:**
```bash
time pnpm --filter @cortex/etl dev large-test-10k.csv $CONTA_ID bradesco-csv
```

**Windows (PowerShell):**
```powershell
Measure-Command { pnpm --filter @cortex/etl dev large-test-10k.csv $env:CONTA_ID bradesco-csv }
```

### 2.3 Interpretar Resultados

**Saída esperada do CLI:**
```
📂 Importing: large-test-10k.csv
📋 Template: bradesco-csv
🏦 Account: 123e4567-e89b-12d3-a456-426614174000

✅ Parsing complete
   Transactions: 10000
   Errors: 0
   Skipped: 0

📤 Uploading to Supabase...
   Batch 1/10: 1000 rows ✓
   Batch 2/10: 1000 rows ✓
   ...
   Batch 10/10: 1000 rows ✓

✅ Import complete!
   Total imported: 10000
   Duplicates skipped: 0
   Duration: 87.5s
```

**Medição de tempo (macOS/Linux):**
```
real    1m27.532s
user    0m2.341s
sys     0m0.523s
```

**Critérios de sucesso:**
- ✅ `real` time ≤ 120s (2 minutos)
- ✅ Todas as 10.000 transações importadas
- ✅ Sem erros de parsing
- ✅ Hash de deduplicação funcionando (re-import deve marcar todas como duplicadas)

## Etapa 3: Validação de Deduplicação

Rode o import **novamente** com o mesmo arquivo para validar deduplicação:

```bash
time pnpm --filter @cortex/etl dev large-test-10k.csv $CONTA_ID bradesco-csv
```

**Resultado esperado:**
```
✅ Import complete!
   Total imported: 0
   Duplicates skipped: 10000
   Duration: 45.2s
```

**Critérios de sucesso:**
- ✅ 0 transações importadas
- ✅ 10.000 duplicatas detectadas
- ✅ Tempo menor que primeira execução (sem insert, só verificação de hash)

## Etapa 4: Validação no Database

Conecte ao Supabase e execute queries de validação:

```sql
-- 1. Verificar total de transações importadas
SELECT COUNT(*) FROM transacoes WHERE conta_id = 'sua-conta-id';
-- Esperado: 10000

-- 2. Verificar integridade dos hashes (sem duplicatas)
SELECT hash_dedupe, COUNT(*)
FROM transacoes
WHERE conta_id = 'sua-conta-id'
GROUP BY hash_dedupe
HAVING COUNT(*) > 1;
-- Esperado: 0 rows (nenhum hash duplicado)

-- 3. Verificar range de datas
SELECT MIN(data), MAX(data)
FROM transacoes
WHERE conta_id = 'sua-conta-id';
-- Esperado: 2024-01-01 to 2024-12-31

-- 4. Verificar somatório de valores
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END) as total_creditos,
  SUM(CASE WHEN valor < 0 THEN valor ELSE 0 END) as total_debitos,
  SUM(valor) as saldo_liquido
FROM transacoes
WHERE conta_id = 'sua-conta-id';
```

## Benchmarks de Referência

### Hardware de Teste
- **Dev Machine**: MacBook Pro M1, 16GB RAM
- **Network**: Banda larga 100Mbps
- **Supabase**: Free tier (região us-east-1)

### Resultados Esperados

| Transações | Tamanho | Parse Time | Upload Time | Total Time | Status |
|-----------|---------|------------|-------------|------------|--------|
| 1.000     | ~100 KB | ~2s        | ~8s         | ~10s       | ✅     |
| 10.000    | ~1 MB   | ~8s        | ~75s        | ~85s       | ✅     |
| 50.000    | ~5 MB   | ~35s       | ~380s       | ~415s      | ⚠️     |
| 100.000   | ~10 MB  | ~70s       | ~780s       | ~850s      | ⚠️     |

**Notas:**
- ✅ = Dentro do SLA (≤2min para 10k)
- ⚠️ = Acima do SLA, mas funcional
- Batch size: 1000 rows (otimizado para Supabase)
- Re-import (dedup): ~50% mais rápido (sem inserts)

## Troubleshooting

### Performance Abaixo do Esperado

**Sintoma**: Import de 10k leva > 2 minutos

**Possíveis causas:**

1. **Network latency**
   ```bash
   # Testar latência para Supabase
   ping your-project.supabase.co
   ```
   - Solução: Usar região mais próxima

2. **Batch size muito grande/pequeno**
   - Atual: 1000 rows/batch
   - Ajustar em `packages/etl/src/cli/import.ts:BATCH_SIZE`

3. **RLS muito complexo**
   - Verificar policies no Supabase
   - Temporariamente desabilitar RLS para teste

4. **Falta de índices**
   ```sql
   -- Verificar índices existentes
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'transacoes';
   ```
   - Deve ter índice em `hash_dedupe` e `conta_id`

### Parsing Lento

**Sintoma**: Parse time > 10s para 10k linhas

**Soluções:**
- Verificar se arquivo tem encoding correto (UTF-8)
- Verificar se há linhas malformadas (aumenta skipped count)
- Usar template específico ao invés de auto-detect

### Erros de Upload

**Sintoma**: Batches falhando durante upload

**Debug:**
```bash
# Executar com logs detalhados
DEBUG=* pnpm --filter @cortex/etl dev large-test-10k.csv $CONTA_ID bradesco-csv
```

**Verificar:**
- Service key tem permissões corretas
- RLS policies permitem insert
- Foreign key para `conta_id` existe

## Automação (Opcional)

### Script Bash Completo

Crie `scripts/performance-test.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Cortex Ledger - Performance Test"
echo "===================================="

# Config
CONTA_ID="${1:-}"
NUM_LINES="${2:-10000}"
TEST_FILE="perf-test-${NUM_LINES}.csv"

if [ -z "$CONTA_ID" ]; then
  echo "❌ Erro: conta_id não fornecido"
  echo "Uso: ./scripts/performance-test.sh <conta_id> [num_lines]"
  exit 1
fi

# 1. Gerar arquivo
echo ""
echo "📝 Gerando arquivo de teste com ${NUM_LINES} linhas..."
pnpm --filter @cortex/etl tsx scripts/generate-large-file.ts "$NUM_LINES" "$TEST_FILE"

# 2. Executar import
echo ""
echo "⏱️  Executando import (medindo tempo)..."
time pnpm --filter @cortex/etl dev "$TEST_FILE" "$CONTA_ID" bradesco-csv

# 3. Testar deduplicação
echo ""
echo "🔄 Testando deduplicação (re-import)..."
time pnpm --filter @cortex/etl dev "$TEST_FILE" "$CONTA_ID" bradesco-csv

# 4. Cleanup
echo ""
echo "🧹 Limpando arquivo de teste..."
rm "$TEST_FILE"

echo ""
echo "✅ Performance test completo!"
```

**Uso:**
```bash
chmod +x scripts/performance-test.sh
./scripts/performance-test.sh <sua-conta-id> 10000
```

## Métricas de Sucesso

Checklist para validação completa:

- [ ] ✅ 10k transações em ≤ 2min
- [ ] ✅ 0 erros de parsing
- [ ] ✅ 0 duplicatas no primeiro import
- [ ] ✅ 100% duplicatas detectadas no re-import
- [ ] ✅ Todos os hashes únicos no database
- [ ] ✅ Dados corretos (datas, valores, descrições)
- [ ] ✅ RLS funcionando (apenas dono vê transações)

## Próximos Passos

Após validar performance:

1. **Agent C**: ✅ Marcar performance test como completo
2. **Agent A**: Validar que índices estão otimizados
3. **Agent B**: Implementar dashboard de métricas de import
4. **DevOps**: Configurar monitoramento de performance em produção

---

**Documentação atualizada:** 2025-01-26
**Responsável:** Agent C (AGENT_IMPORT_ETL)
