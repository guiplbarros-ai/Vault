# Example Files

This directory contains anonymized sample files for testing the ETL pipeline.

## Files

### Bradesco Bank Account (CSV)
- **File**: `bradesco-sample.csv`
- **Format**: CSV with `;` separator
- **Encoding**: UTF-8
- **Template**: `bradesco-csv`
- **Transactions**: 11 mixed (credits/debits)

### Bradesco Bank Account (OFX)
- **File**: `bradesco-sample.ofx`
- **Format**: OFX 1.x (SGML)
- **Template**: `bradesco-ofx`
- **Transactions**: 10 mixed (credits/debits)

### Aeternum International Card (CSV)
- **File**: `aeternum-sample.csv`
- **Format**: CSV with `,` separator
- **Template**: `aeternum-csv`
- **Transactions**: 8 international (USD → BRL)
- **Note**: All transactions have original currency

### American Express (CSV)
- **File**: `amex-sample.csv`
- **Format**: CSV with `,` separator, multi-section file
- **Template**: `amex-csv`
- **Transactions**: 10 mixed (BRL and USD)
- **Note**: Header detection skips summary section

## Testing

To test import with these files:

```bash
# 1. Create a test account in Supabase
# Via Supabase Studio or CLI:
# INSERT INTO conta (user_id, instituicao_id, apelido, tipo)
# VALUES (auth.uid(), NULL, 'Teste Bradesco', 'corrente')
# RETURNING id;

# 2. Import the file
pnpm --filter @cortex/etl dev examples/bradesco-sample.csv <conta_id> bradesco-csv

# 3. Verify in Supabase Studio
# SELECT COUNT(*) FROM transacao WHERE conta_id = '<conta_id>';
```

## Expected Results

| File | Parsed | Skipped | Notes |
|------|--------|---------|-------|
| bradesco-sample.csv | 11 | 4 | Header + 3 metadata lines skipped |
| bradesco-sample.ofx | 10 | 0 | Clean OFX structure |
| aeternum-sample.csv | 8 | 3 | Header + 2 summary lines skipped |
| amex-sample.csv | 10 | 8 | Complex header with multiple sections |

## Data Privacy

All files contain **anonymized data**:
- No real account numbers
- Fictional names and amounts
- Realistic transaction patterns for testing

Do **not** commit real financial data to this repository.
