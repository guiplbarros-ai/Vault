# CSV File Analysis Report

This file will be populated once your CSV files are uploaded. It will contain:

## Analysis for Each File

### File: [filename]
**Location:** `.test-imports/[bank]/[filename]`

#### Structure Detection
- **Separator:** `;` or `,` or `\t` or `|`
- **Encoding:** UTF-8 or ISO-8859-1 or other
- **Column Count:** X columns
- **Header:** [actual header row]
- **Data Rows:** X rows of data

#### Column Mapping
| Column # | Detected Name | Expected Field | Match |
|----------|---------------|-----------------|-------|
| 0 | Data | date | ✓ |
| 1 | Descrição | description | ✓ |
| 2 | Valor | amount | ✓ |
| 3 | Saldo | (ignored) | N/A |

#### Template Matching
- **Best Match:** BRADESCO_TEMPLATE
- **Confidence:** 95%
- **Issues:** None detected
- **Action:** Use existing template

#### Sample Data Preview
```
01/11/2024;Compra no débito;-150,00;5000,00
02/11/2024;Depósito recebido;+2000,00;7000,00
```

#### Validation Results
- ✓ All dates parse correctly (dd/MM/yyyy)
- ✓ All amounts parse correctly (decimal: `,`)
- ✓ No encoding issues detected
- ✓ Column structure consistent

#### Recommendation
**Status:** ✓ Ready to import
**Template to use:** BRADESCO_TEMPLATE
**Next step:** Click "Import" in the UI

---

## Summary Table

| Bank | File | Template | Status | Notes |
|------|------|----------|--------|-------|
| Bradesco | extrato_nov.csv | BRADESCO_TEMPLATE | ✓ | Works perfectly |
| Nubank | statement.csv | NUBANK_TEMPLATE | ⚠️ | Encoding mismatch - ISO-8859-1 instead of UTF-8 |
| Itaú | extrato.csv | CUSTOM | ✗ | New template needed - different column order |

---

## Code Changes Required (if any)

### Updated Templates
```typescript
// Example of template update if needed
export const BRADESCO_TEMPLATE_UPDATED = {
  // ... changes ...
}
```

### New Templates
```typescript
// Example of new template if needed
export const NEW_BANK_TEMPLATE = {
  // ... configuration ...
}
```

---

**Report Generated:** [timestamp]
**Analysis Status:** Ready for implementation
**Next Steps:** Update code and test import
