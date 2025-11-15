# Expected File Formats Reference

This document shows the exact format each bank template expects, so you know if your files will match.

---

## Nubank Format

**File encoding:** UTF-8
**Separator:** Comma (`,`)
**Header:** Yes (skip 1 line)
**Date format:** yyyy-MM-dd
**Decimal separator:** Dot (`.`)

### Example file:
```csv
Data,Categoria,Título,Valor
2024-11-01,Compras,Mercado X,150.50
2024-11-02,Saúde,Farmácia Y,35.99
2024-11-03,Transporte,Uber,25.00
```

**Template status:** ✓ WORKING

---

## Inter Format

**File encoding:** UTF-8
**Separator:** Semicolon (`;`)
**Header:** Yes (skip 1 line)
**Date format:** dd/MM/yyyy
**Decimal separator:** Comma (`,`)

### Example file:
```csv
Data;Descrição;Valor;Saldo
01/11/2024;Compra débito;-150,50;5000,00
02/11/2024;Depósito;1000,00;6000,50
03/11/2024;Transferência enviada;-500,00;5500,50
```

**Template status:** ✓ WORKING

---

## Bradesco Format

**File encoding:** ISO-8859-1
**Separator:** Semicolon (`;`)
**Header:** Yes (skip 1 line)
**Date format:** dd/MM/yyyy
**Decimal separator:** Comma (`,`)

### Example file:
```csv
Data;Histórico;Número do Documento;Valor;Saldo
01/11/2024;Compra no débito;12345678;-150,50;5000,00
02/11/2024;Depósito recebido;87654321;1000,00;6000,50
03/11/2024;Transferência enviada;11223344;-500,00;5500,50
```

**Notes:**
- Encoding is important! Must be ISO-8859-1 for special characters
- Column 2 (Documento) is ignored
- Column 4 (Saldo) is ignored

**Template status:** ✓ WORKING

---

## Itaú Format

**File encoding:** ISO-8859-1
**Separator:** Comma (`,`)
**Header:** Yes (skip 1 line)
**Date format:** dd/MM/yyyy
**Decimal separator:** Comma (`,`)

### Example file:
```csv
data,lançamento,ag.,conta,valor
01/11/2024,Compra no débito,0001,12345,"-150,50"
02/11/2024,Depósito recebido,0001,12345,"1.000,00"
03/11/2024,Transferência enviada,0001,12345,"-500,00"
```

**Notes:**
- Encoding is important! Must be ISO-8859-1
- Amounts may be quoted
- Columns 2 and 3 (ag., conta) are ignored

**Template status:** ✓ WORKING

---

## Santander Format

**File encoding:** ISO-8859-1
**Separator:** Semicolon (`;`)
**Header:** Yes (skip 1 line)
**Date format:** dd/MM/yyyy
**Decimal separator:** Comma (`,`)

### Example file:
```csv
Data;Descrição;Número;Agência;Valor;Saldo
01/11/2024;Compra no débito;12345;0001;-150,50;5000,00
02/11/2024;Depósito recebido;67890;0001;1000,00;6000,50
03/11/2024;Transferência enviada;11111;0001;-500,00;5500,50
```

**Notes:**
- Encoding is important! Must be ISO-8859-1
- Columns 2 and 3 (Número, Agência) are ignored
- Column 5 (Saldo) is ignored

**Template status:** ✓ WORKING

---

## Banco do Brasil Format

**File encoding:** ISO-8859-1
**Separator:** Semicolon (`;`)
**Header:** Yes (skip 1 line)
**Date format:** dd/MM/yyyy
**Decimal separator:** Comma (`,`)

### Example file:
```csv
Data;Histórico;DocIdentificador;ValorTransacao;SaldoContaCorrente
01/11/2024;Compra no débito;12345;-150,50;5000,00
02/11/2024;Depósito recebido;67890;1000,00;6000,50
03/11/2024;Transferência enviada;11111;-500,00;5500,50
```

**Notes:**
- Encoding is important! Must be ISO-8859-1
- Column 2 (DocIdentificador) is ignored
- Column 4 (SaldoContaCorrente) is ignored

**Template status:** ✓ WORKING

---

## Caixa Econômica Format

**File encoding:** ISO-8859-1
**Separator:** Semicolon (`;`)
**Header:** Yes (skip 1 line)
**Date format:** dd/MM/yyyy
**Decimal separator:** Comma (`,`)

### Example file:
```csv
Data;Descrição;Valor;Saldo
01/11/2024;Compra no débito;-150,50;5000,00
02/11/2024;Depósito recebido;1000,00;6000,50
03/11/2024;Transferência enviada;-500,00;5500,50
```

**Notes:**
- Encoding is important! Must be ISO-8859-1
- Column 3 (Saldo) is ignored

**Template status:** ✓ WORKING

---

## C6 Bank Format

**File encoding:** UTF-8
**Separator:** Comma (`,`)
**Header:** Yes (skip 1 line)
**Date format:** dd/MM/yyyy
**Decimal separator:** Dot (`.`)

### Example file:
```csv
Data,Descrição,Valor,Categoria
01/11/2024,Compra no débito,-150.50,Compras
02/11/2024,Depósito recebido,1000.00,Renda
03/11/2024,Transferência enviada,-500.00,Transferência
```

**Template status:** ✓ WORKING

---

## PicPay Format

**File encoding:** UTF-8
**Separator:** Comma (`,`)
**Header:** Yes (skip 1 line)
**Date format:** dd/MM/yyyy
**Decimal separator:** Dot (`.`)

### Example file:
```csv
Data,Hora,Tipo,Descrição,Valor,Saldo
01/11/2024,14:30:00,Débito,Mercado X,-150.50,5000.00
02/11/2024,09:15:00,Crédito,Salário,3000.00,8000.50
03/11/2024,16:45:00,Débito,Uber,-25.00,7975.50
```

**Notes:**
- Column 1 (Hora) is ignored
- Column 5 (Saldo) is ignored

**Template status:** ✓ WORKING

---

## Generic Brazilian Format

**File encoding:** UTF-8
**Separator:** Semicolon (`;`)
**Header:** Yes (skip 1 line)
**Date format:** dd/MM/yyyy
**Decimal separator:** Comma (`,`)

### Example file:
```csv
Data;Descrição;Valor
01/11/2024;Compra no débito;-150,50
02/11/2024;Depósito recebido;1000,00
03/11/2024;Transferência enviada;-500,00
```

**Notes:**
- This is the fallback format
- Works for any 3-column semicolon-separated file

**Template status:** ✓ WORKING

---

## What If My File Doesn't Match?

If your file has:

### Different column order?
Example: Valor appears in column 1 instead of column 3
- **Solution:** I'll create a new template with correct column mapping

### Different separator?
Example: Tab (`\t`) instead of semicolon
- **Solution:** I'll detect it and create new template

### Different encoding?
Example: Windows-1252 instead of ISO-8859-1
- **Solution:** I'll update the template encoding

### Extra columns?
Example: 7 columns instead of 5
- **Solution:** I'll map the 3 required columns (date, description, value) and ignore the rest

### Missing columns?
Example: No description field
- **Solution:** May still work if date and value are present

### Different date format?
Example: MM/dd/yyyy instead of dd/MM/yyyy
- **Solution:** I'll update the template date format

---

## Common Issues & Solutions

| Issue | Example | Solution |
|-------|---------|----------|
| **Wrong encoding** | Special chars show as ???? | Update template encoding to ISO-8859-1 or windows-1252 |
| **Wrong separator** | Columns not split correctly | Update separator to `;`, `,`, or `\t` |
| **Wrong date format** | Dates don't parse | Update format to match actual file (dd/MM/yyyy, yyyy-MM-dd, etc.) |
| **Extra columns** | More columns than expected | Map only required columns, ignore extras |
| **No header** | First line treated as data | Adjust pular_linhas from 1 to 0 |
| **Multiple headers** | Subtotals or summaries included | May need custom parsing or manual cleanup |

---

## How to Check Your File Format

### 1. Open in text editor (not Excel!)
Use: TextEdit, Notepad++, VS Code
- Look for separator (`;`, `,`, `\t`)
- Check first line (header)
- Check special characters (ç, ã, é)

### 2. Check encoding
**macOS:**
```bash
file -b --mime-encoding extrato.csv
# Output: iso-8859-1 or utf-8
```

**All systems:**
- Right-click → Properties → Details
- Or open in VS Code → bottom right corner shows encoding

### 3. Count columns
- Count `;` or `,` in first line
- Should match template expectations

### 4. Sample dates
- Format: dd/MM/yyyy or yyyy-MM-dd?
- All valid dates?

### 5. Sample amounts
- Decimal separator: `,` or `.`?
- Negative values use: `-` prefix, or just negative?

---

## Upload Checklist

Before uploading, verify:

- [ ] File is `.csv` format
- [ ] File has header row (usually line 1)
- [ ] File has at least 3 columns: Date, Description, Value
- [ ] File encoding is UTF-8 or ISO-8859-1
- [ ] File separator is `;`, `,`, `\t`, or `|`
- [ ] No empty rows in the middle of data
- [ ] No extra columns with subtotals/summaries

**Ready?** Place in appropriate folder in `.test-imports/`

---

**Reference Version:** 1.0
**Last Updated:** 2025-11-14
**Templates Included:** 10 major Brazilian banks + generic fallback
