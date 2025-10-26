# @cortex/etl

ETL (Extract, Transform, Load) package for Cortex Ledger.

Provides tolerant parsers for CSV and OFX files, pre-configured templates for major Brazilian financial institutions, and a CLI tool for importing transactions to Supabase.

## Features

- **CSV Parser**: Tolerant parser with automatic header detection and separator inference
- **OFX Parser**: Supports OFX 1.x and 2.x formats
- **Pre-configured Templates**: Bradesco (CSV/OFX), Aeternum, American Express
- **Deduplication**: Hash-based deduplication using SHA256
- **Batch Upsert**: Efficient batch processing (1k-5k rows)
- **CLI Tool**: Command-line interface for quick imports

## Installation

This package is part of the Cortex Ledger monorepo and uses workspace dependencies.

```bash
pnpm install
```

## Usage

### CLI Import Tool

Import a file to Supabase:

```bash
# Basic usage (auto-detect format)
pnpm --filter @cortex/etl dev path/to/extrato.csv <conta_id>

# Using a specific template
pnpm --filter @cortex/etl dev extrato.csv <conta_id> bradesco-csv

# OFX file
pnpm --filter @cortex/etl dev extrato.ofx <conta_id>
```

### Environment Variables

Create a `.env` file at the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
USER_ACCESS_TOKEN=your-user-jwt-token  # For testing
```

### Programmatic Usage

```typescript
import { parseCSV, parseOFX } from '@cortex/etl/parsers';
import { getTemplate } from '@cortex/etl/templates';
import { computeHashDedupe } from '@cortex/services';

// Parse CSV with template
const template = getTemplate('bradesco-csv');
const result = parseCSV(fileContent, template);

console.log(`Parsed ${result.transactions.length} transactions`);
console.log(`Skipped ${result.skipped} invalid lines`);

// Compute hash for deduplication
const hash = computeHashDedupe({
  data: '2024-10-25',
  valor: -123.45,
  descricao: 'COMPRA UBER',
  contaId: 'uuid-here'
});
```

## Templates

### Available Templates

| Key | Institution | Format | Notes |
|-----|-------------|--------|-------|
| `bradesco-csv` | Bradesco | CSV | Separator: `;`, Encoding: UTF-8 |
| `bradesco-ofx` | Bradesco | OFX | Standard OFX 1.x/2.x |
| `aeternum-csv` | Aeternum | CSV | International card, USD → BRL |
| `amex-csv` | American Express | CSV | Multi-section file, auto-detect header |

### Template Structure

```typescript
{
  instituicaoNome: 'Bradesco',
  tipo: 'csv',
  sep: ';',
  encoding: 'UTF-8',
  dateFormat: 'DD/MM/YYYY',
  valueFormat: 'BR',
  columnMapping: {
    data: 'DATA',
    descricao: 'HISTORICO',
    credito: 'CREDITO (R$)',
    debito: 'DEBITO (R$)',
    saldo: 'SALDO (R$)',
    documento: 'DOCTO.'
  }
}
```

## Parser Features

### CSV Parser

- **Automatic header detection**: Finds the first line with ≥3 separators and column-like names
- **Separator inference**: Auto-detects `;`, `,`, `\t`, or `|`
- **Tolerant parsing**: Skips invalid lines and reports errors
- **Brazilian format support**: Handles `DD/MM/YYYY` dates and `1.234,56` values
- **Multi-currency**: Supports `valor_original` + `moeda_original` columns

### OFX Parser

- **OFX 1.x SGML**: Converts to XML for parsing
- **OFX 2.x XML**: Native XML parsing
- **Bank and Credit Card**: Supports both `BANKMSGSRSV1` and `CREDITCARDMSGSRSV1`
- **Transaction types**: Maps OFX types to domain types (credito/debito/transferencia)

## Normalization

All parsers apply consistent normalization:

- **Dates**: Converted to ISO format `YYYY-MM-DD`
- **Values**: Decimal format with dot separator (e.g., `1234.56`)
- **Descriptions**: Uppercase, accent removal, multi-space collapse

## Deduplication

Hash formula: `SHA256(date|value|normalized_description|account_id)`

Example:
```
date: 2024-10-25
value: -123.45
description: UBER * TRIP HELP  → UBER TRIP HELP (normalized)
account_id: uuid

hash = SHA256("2024-10-25|-123.45|UBER TRIP HELP|uuid")
```

## Performance

Per PRD requirements:
- **Target**: 10k lines in ≤ 2 minutes
- **Batch size**: 1k-5k rows per Supabase upsert
- **Deduplication**: >99% accuracy for exact duplicates

## Testing

```bash
# Run tests
pnpm --filter @cortex/etl test

# Watch mode
pnpm --filter @cortex/etl test:watch
```

## Example Files

See `examples/` directory for sample CSV and OFX files (anonymized).

## Troubleshooting

### "Could not detect header row"

- Check that the file has a valid header with column names like DATA, HISTORICO, VALOR
- Verify separator (try specifying a template)
- Ensure the file is UTF-8 encoded

### "Authentication required"

- Set `USER_ACCESS_TOKEN` in `.env`
- Use `supabase auth` to generate a test token

### "Batch upsert error"

- Check that `conta_id` exists in the `conta` table
- Verify RLS policies allow inserts for your user
- Check Supabase logs for detailed error messages

## License

Private - Cortex Ledger
