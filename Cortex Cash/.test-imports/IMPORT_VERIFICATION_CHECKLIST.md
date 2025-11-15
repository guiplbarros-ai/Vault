# Import Verification Checklist

## Status: READY FOR FILES ✓

The test import system is fully prepared. This checklist documents exactly what I will verify once you upload CSV files.

---

## Pre-Upload System Status

### ✓ Folder Structure
- [x] `.test-imports/` folder created
- [x] Bank subfolders created (bradesco/, nubank/, itau/, inter/, santander/, bb/, outros/)
- [x] README.md created with instructions
- [x] Analysis templates prepared

### ✓ Import System Code
- [x] 10 bank templates configured and working
- [x] CSV parser with improved separator detection (70% consistency threshold)
- [x] Encoding detection (UTF-8, ISO-8859-1)
- [x] Error grouping and reporting system
- [x] Import service methods: parseCSV(), detectFormat(), validateColumns()
- [x] Build passes all checks
- [x] No TypeScript errors

### ✓ Application Code
- [x] Import wizard UI functional
- [x] Error messages display properly
- [x] Toast notifications working
- [x] File upload handler implemented
- [x] Column preview system ready

---

## Analysis Process (Automated Once Files Uploaded)

### Phase 1: File Discovery
When you upload files, I will:

- [ ] Scan all subdirectories for CSV files
- [ ] List files by bank folder
- [ ] Record file sizes and names
- [ ] Note any OFX files (if present)

**Command used:** `find .test-imports -type f -name "*.csv" -o -name "*.ofx"`

### Phase 2: Structure Detection

For each CSV file:

- [ ] Read first 10 lines
- [ ] Detect separator (`;`, `,`, `\t`, `|`)
- [ ] Detect encoding (UTF-8, ISO-8859-1, etc.)
- [ ] Count columns
- [ ] Extract header row
- [ ] Analyze column names

**Key checks:**
- ✓ Separator consistency across 70% of lines
- ✓ Encoding compatibility
- ✓ Required columns present (Date, Description, Value)

### Phase 3: Template Matching

For each file, verify:

- [ ] Does it match Nubank template?
  - Separator: `,` → Check
  - Encoding: UTF-8 → Check
  - Columns: Data, Categoria, Título, Valor → Check
  - Date format: yyyy-MM-dd → Check

- [ ] Does it match Inter template?
  - Separator: `;` → Check
  - Encoding: UTF-8 → Check
  - Columns: Data, Descrição, Valor, Saldo → Check
  - Date format: dd/MM/yyyy → Check

- [ ] Does it match Bradesco template?
  - Separator: `;` → Check
  - Encoding: ISO-8859-1 → Check
  - Columns: Data, Histórico, Número, Valor, Saldo → Check
  - Date format: dd/MM/yyyy → Check

- [ ] Does it match other templates (Itaú, Santander, BB, Caixa, C6, PicPay)?
  - [Template-specific checks]

- [ ] Does it require a new/custom template?
  - If no match → Create new template

### Phase 4: Sample Data Validation

For each file:

- [ ] Extract first 3 data rows (skipping header)
- [ ] Validate date format
  - Parse date: `dd/MM/yyyy` or `yyyy-MM-dd`
  - Verify all values are valid dates
  - Check date range is reasonable

- [ ] Validate amount/value column
  - Identify decimal separator (`,` or `.`)
  - Parse as number
  - Check all values are numeric

- [ ] Validate description/narrative column
  - Check for text content
  - Note any special characters or encoding issues
  - Identify common transaction types

**Example validation:**
```
Row 1: 01/11/2024 | TRANSFERÊNCIA ENVIADA | -500,00
  ✓ Date parses correctly
  ✓ Description contains text
  ✓ Amount parses correctly (decimal: comma)

Row 2: 02/11/2024 | DEPÓSITO RECEBIDO | 1000,00
  ✓ Date parses correctly
  ✓ Description contains text
  ✓ Amount parses correctly
```

### Phase 5: Encoding Verification

- [ ] Read file with detected encoding
- [ ] Check for special characters (ç, ã, é, etc.)
- [ ] Verify no corruption or mojibake
- [ ] Test alternative encoding if issues detected

**Encodings tested:** UTF-8, ISO-8859-1, windows-1252

### Phase 6: Template Assignment & Recommendations

For each file, provide:

- [ ] **Best matching template** (if any)
  - NUBANK_TEMPLATE
  - INTER_TEMPLATE
  - BRADESCO_TEMPLATE
  - ITAU_TEMPLATE
  - SANTANDER_TEMPLATE
  - BB_TEMPLATE
  - CAIXA_TEMPLATE
  - C6_TEMPLATE
  - PICPAY_TEMPLATE
  - GENERIC_BR_TEMPLATE
  - (NEW CUSTOM TEMPLATE - if needed)

- [ ] **Confidence score** (95%, 80%, 50%, etc.)
  - 95%+: Perfect match with existing template
  - 80-95%: Minor adjustments may be needed
  - 60-80%: May work but validate carefully
  - <60%: New template likely needed

- [ ] **Required code changes** (if any)
  - Update template encoding
  - Modify column mapping
  - Create new template
  - Add special parsing logic

---

## Code Modification Plan

### If Template Matches Perfectly (No Changes Needed)
```
Status: ✓ READY TO USE
Action: None
Next: User can import directly from UI
```

### If Minor Adjustments Needed
```
Status: ⚠️ UPDATE TEMPLATE
Example changes:
1. Update encoding: 'utf-8' → 'iso-8859-1'
2. Update date format: 'dd/MM/yyyy' → 'yyyy-MM-dd'
3. Adjust column mapping: valor moved from column 3 → column 4
```

### If New Template Required
```
Status: ✗ CREATE NEW TEMPLATE
Example:
export const CUSTOM_BANK_TEMPLATE = {
  nome: 'Custom Bank - Extrato',
  tipo_arquivo: 'csv',
  separador: '[detected]',
  encoding: '[detected]',
  pular_linhas: [detected],
  mapeamento_colunas: JSON.stringify({
    data: [column_index],
    descricao: [column_index],
    valor: [column_index],
  }),
  formato_data: '[detected]',
  separador_decimal: '[detected]',
  contador_uso: 0,
  is_favorite: false,
  usuario_id: 'usuario-producao',
};
```

---

## Testing After Code Updates

- [ ] Update `lib/import/templates/bank-templates.ts` with any new/modified templates
- [ ] Run `npm run build` to verify no TypeScript errors
- [ ] Test import with actual file through UI
- [ ] Verify all transactions parse correctly
- [ ] Check amounts, dates, descriptions are correct
- [ ] Verify no encoding issues in imported data

---

## Final Deliverables

Once analysis is complete, you will receive:

### 1. Analysis Report (ANALYSIS_TEMPLATE.md)
Shows for each file:
- Structure detected
- Template matching results
- Sample data preview
- Validation results
- Recommendations

### 2. Code Changes (if needed)
- Updated templates in `bank-templates.ts`
- New templates added
- Build verification passed

### 3. Import Verification
- Confirmation that files import successfully
- Sample transactions in database
- Any issues resolved

### 4. Documentation
- Updated README in `.test-imports/` folder
- Notes about custom templates
- Instructions for future imports

---

## Ready for Next Steps

**Current Status:** ✓ System fully prepared

**What to do now:**
1. Copy your CSV files into the appropriate bank folders
2. I will automatically analyze them
3. Any code changes will be made
4. Imports will be tested and verified

**Example:**
```bash
cp ~/Downloads/extrato_bradesco_nov2024.csv .test-imports/bradesco/
cp ~/Downloads/nubank_statement.csv .test-imports/nubank/
cp ~/Downloads/itau_nov.csv .test-imports/itau/
```

Once files are in place, the analysis process begins automatically!

---

**Last Updated:** 2025-11-14
**System Status:** ✓ Ready for CSV imports
**Build Status:** ✓ Passing
