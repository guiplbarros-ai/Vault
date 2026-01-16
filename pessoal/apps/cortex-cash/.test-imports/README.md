# Test Imports - CSV File Analysis Guide

## Overview
This folder is set up to analyze and verify CSV/OFX import functionality for multiple Brazilian banks. Once you upload files from your actual bank accounts, I will:

1. **Analyze file structure** - Detect separator, encoding, columns
2. **Match against templates** - Verify if existing bank templates work
3. **Identify issues** - Find mismatches between file structure and templates
4. **Update templates** if needed - Modify code to handle your actual file formats
5. **Test imports** - Verify transactions import successfully

## Folder Structure

```
.test-imports/
├── bradesco/       → Bradesco bank statements
├── nubank/         → Nubank statements
├── itau/           → Itaú statements
├── inter/          → Inter statements
├── santander/      → Santander statements
├── bb/             → Banco do Brasil statements
└── outros/         → Other banks or formats
```

## Current Templates in System

The system has pre-configured templates for:

| Bank | Separator | Encoding | Date Format | Decimal | Columns |
|------|-----------|----------|------------|---------|---------|
| **Nubank** | , | UTF-8 | yyyy-MM-dd | . | Data, Categoria, Título, Valor |
| **Inter** | ; | UTF-8 | dd/MM/yyyy | , | Data, Descrição, Valor, Saldo |
| **Bradesco** | ; | ISO-8859-1 | dd/MM/yyyy | , | Data, Histórico, Doc, Valor, Saldo |
| **Itaú** | , | ISO-8859-1 | dd/MM/yyyy | , | data, lançamento, ag., conta, valor |
| **Santander** | ; | ISO-8859-1 | dd/MM/yyyy | , | Data, Descrição, Número, Agência, Valor, Saldo |
| **Banco do Brasil** | ; | ISO-8859-1 | dd/MM/yyyy | , | Data, Histórico, DocId, Valor, Saldo |
| **Caixa** | ; | ISO-8859-1 | dd/MM/yyyy | , | Data, Descrição, Valor, Saldo |
| **C6 Bank** | , | UTF-8 | dd/MM/yyyy | . | Data, Descrição, Valor, Categoria |
| **PicPay** | , | UTF-8 | dd/MM/yyyy | . | Data, Hora, Tipo, Descrição, Valor, Saldo |
| **Genérico** | ; | UTF-8 | dd/MM/yyyy | , | Data, Descrição, Valor |

## What I'll Check When You Upload Files

### 1. File Structure Analysis
- Detect separator (`;`, `,`, `\t`, `|`)
- Detect encoding (UTF-8, ISO-8859-1)
- Count columns
- Identify header row

### 2. Column Mapping
- Verify which columns contain: Date, Description, Amount
- Check date format (dd/MM/yyyy, yyyy-MM-dd, etc.)
- Identify decimal separator (`,` or `.`)

### 3. Template Matching
- Test against existing templates
- Identify if custom template needed
- Flag encoding mismatches

### 4. Data Validation
- Sample values to verify format consistency
- Check for potential parsing issues
- Validate date/amount formats

## Example: What Your File Should Look Like

### Bradesco Format (Current Template)
```
Data;Histórico;Número do Documento;Valor;Saldo
01/11/2024;TRANSFERÊNCIA ENVIADA;12345;-500,00;1500,00
02/11/2024;DEPÓSITO RECEBIDO;67890;1000,00;2500,00
```

### Nubank Format (Current Template)
```
Data,Categoria,Título,Valor
2024-11-01,Compras,Mercado X,50.00
2024-11-02,Saúde,Farmácia Y,35.99
```

## Process When Files Are Uploaded

1. **Scan folder** - `find .test-imports -name "*.csv" -o -name "*.ofx"`
2. **Read first 10 lines** of each file
3. **Analyze structure**:
   ```
   File: bradesco/extrato_nov_2024.csv
   - Detected separator: ;
   - Detected encoding: ISO-8859-1
   - Column count: 5
   - Header: Data;Histórico;Número do Documento;Valor;Saldo
   - Matching template: BRADESCO_TEMPLATE ✓
   ```

4. **Create analysis report** showing:
   - Which templates work ✓
   - Which need adjustment ⚠️
   - Which require new templates ✗

5. **Update code** if needed:
   - Modify encoding if file doesn't match
   - Adjust column mapping if different
   - Create new template if bank not covered

6. **Test import** - Verify file actually imports successfully

## How to Upload Files

Simply place your CSV files in the appropriate folder:
```bash
# Example
cp ~/Downloads/extrato_bradesco.csv .test-imports/bradesco/
cp ~/Downloads/nubank_nov.csv .test-imports/nubank/
```

Multiple files in same folder are fine:
```
.test-imports/bradesco/
├── extrato_setembro.csv
├── extrato_outubro.csv
└── extrato_novembro.csv
```

## Expected Outcomes

After analysis, I will provide:

1. **Compatibility Report**
   - ✓ Works with current templates
   - ⚠️ Minor adjustments needed
   - ✗ New template required

2. **Code Changes** (if needed)
   - Update encoding in template
   - Adjust column mapping
   - Add new bank template

3. **Verification**
   - Test import with your actual data
   - Confirm all transactions parse correctly
   - Validate amounts, dates, descriptions

## Status

**Ready for files:** ✓ Folder structure created and configured
**Awaiting:** Your CSV/OFX files in the appropriate bank folders

---

Once files are uploaded, analysis will begin automatically!
