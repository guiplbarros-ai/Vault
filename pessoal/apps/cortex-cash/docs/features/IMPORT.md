# Importação de Extratos - Guia Completo
**Agent DATA: Owner | v0.1**

## 📋 Visão Geral

Sistema completo de importação de transações de extratos bancários.

**Status:** ✅ Implementado (CSV, OFX)

### Funcionalidades

- ✅ **Upload de Arquivos**: Drag & drop ou seleção manual
- ✅ **Detecção Automática**: Identifica CSV ou OFX
- ✅ **Mapeamento de Colunas**: Interface visual para CSV
- ✅ **Parse OFX Nativo**: Suporte completo ao formato OFX
- ✅ **Deduplicação**: Remove duplicatas via hash SHA256
- ✅ **Preview**: Visualização antes de confirmar
- ✅ **Validação**: Múltiplas camadas de validação
- ✅ **Templates**: Salva/carrega configurações por instituição

---

## Formatos Suportados

### 1. CSV

**Características:**
- Separadores: `,` `;` `|` `\t`
- Encoding: UTF-8
- Headers: Primeira linha
- Aspas duplas suportadas

**Campos obrigatórios:**
- Data
- Descrição
- Valor

**Campos opcionais:**
- Tipo (Receita/Despesa)
- Categoria
- Saldo

**Exemplo:**
```csv
Data,Descrição,Valor,Tipo
01/11/2025,Salário,5000.00,Receita
02/11/2025,Almoço,-45.50,Despesa
```

### 2. OFX (Open Financial Exchange)

**Versões suportadas:**
- OFX 1.x (SGML)
- OFX 2.x (XML)

**Tags processadas:**
- `<STMTTRN>` - Transações
- `<DTPOSTED>` - Data
- `<TRNAMT>` - Valor
- `<MEMO>` - Descrição
- `<FITID>` - ID único (para dedupe)

### 3. Excel (Futuro)

**Status:** 🚧 Planejado para v0.2

---

## Fluxo de Importação

```
1. Upload → 2. Detecção → 3. Parse → 4. Mapeamento* → 5. Validação → 6. Preview → 7. Confirmação
```

*Apenas para CSV

### Detalhamento

**1. Upload**
- Drag & drop ou file input
- Tamanho máx: 10MB
- Tipos permitidos: .csv, .ofx, .qfx

**2. Detecção de Formato**
- CSV: Detecta separador (`,` `;` `\t`)
- OFX: Detecta versão (1.x ou 2.x)
- Valida estrutura básica

**3. Parse**
- **CSV**: Linha a linha com suporte a aspas
- **OFX**: XML/SGML parser
- **Normalização**: Remove BOM, trim espaços

**4. Mapeamento (CSV)**
- Usuário mapeia colunas → campos do sistema
- Campos obrigatórios: Data, Descrição, Valor
- Salva como template reutilizável

**5. Validação**
- Datas válidas (DD/MM/YYYY ou ISO)
- Valores numéricos
- Descrições não-vazias
- Tipos válidos (receita/despesa)

**6. Preview**
- Mostra primeiras 10 transações
- Destaca erros de validação
- Estatísticas: total, soma, média

**7. Confirmação**
- Dedupe automática (hash SHA256)
- Inserção em lote no banco
- Relatório de sucesso/erro

---

## Estrutura Técnica

### Services

**ImportService** (`lib/services/import.service.ts`)
- `parseCSV()` - Parse arquivo CSV
- `parseOFX()` - Parse arquivo OFX
- `detectFormat()` - Detecta formato do arquivo
- `detectSeparator()` - Detecta separador CSV
- `normalizeDates()` - Normaliza datas
- `normalizeValues()` - Normaliza valores
- `deduplicateTransactions()` - Remove duplicatas
- `saveTransactions()` - Salva no banco

**TemplateService** (`lib/services/template.service.ts`)
- `saveTemplate()` - Salva template de mapeamento
- `loadTemplate()` - Carrega template salvo
- `listTemplates()` - Lista todos templates
- `deleteTemplate()` - Remove template

### Parsers

**CSV Parser** (`lib/import/parsers/csv.ts`)
```typescript
interface CSVParseResult {
  rows: Array<Record<string, string>>;
  headers: string[];
  separator: string;
  encoding: string;
  rowCount: number;
}
```

**OFX Parser** (`lib/import/parsers/ofx.ts`)
```typescript
interface OFXParseResult {
  transactions: OFXTransaction[];
  accountId: string;
  startDate: Date;
  endDate: Date;
  balance: number;
}
```

### Detectors

**Format Detector** (`lib/import/detectors/format.ts`)
- Analisa primeiros 100 bytes
- Identifica BOM (UTF-8, UTF-16)
- Verifica tags OFX (`<OFX>`, `<STMTTRN>`)

**Separator Detector** (`lib/import/detectors/separator.ts`)
- Testa `,` `;` `\t` `|`
- Escolhe separador mais consistente
- Valida número de colunas

---

## Deduplicação

### Hash SHA256

```typescript
function generateTransactionHash(transaction: Transaction): string {
  const normalized = {
    data: format(transaction.data, 'yyyy-MM-dd'),
    descricao: transaction.descricao.toLowerCase().trim(),
    valor: transaction.valor.toFixed(2),
  };
  
  const str = JSON.stringify(normalized);
  return sha256(str);
}
```

**Por que SHA256?**
- Rápido (hardware-accelerated)
- Colisões praticamente impossíveis
- Detecta mudanças mínimas (ex: "R$ 10,00" vs "R$ 10,01")

**Quando é duplicata?**
- Mesma data + descrição + valor
- Independente de: tipo, categoria, conta, observações

---

## Templates de Importação

### Estrutura

```typescript
interface ImportTemplate {
  id: string;
  nome: string;
  instituicao_nome: string;
  formato: 'csv' | 'ofx';
  
  // CSV-specific
  separador?: string;
  mapeamento?: {
    data: number;          // índice da coluna
    descricao: number;
    valor: number;
    tipo?: number;
    categoria?: number;
  };
  
  // OFX-specific
  accountIdPattern?: string;
  
  created_at: Date;
  last_used?: Date;
}
```

### Uso

```typescript
// Salvar template após mapear colunas
await templateService.saveTemplate({
  nome: 'Bradesco Conta Corrente',
  instituicao_nome: 'Bradesco',
  formato: 'csv',
  separador: ';',
  mapeamento: {
    data: 0,
    descricao: 1,
    valor: 2,
    tipo: 3,
  },
});

// Carregar para reutilizar
const template = await templateService.loadTemplate('template-id');
```

---

## Normalização

### Datas

**Formatos aceitos:**
- `DD/MM/YYYY` → `2025-11-05`
- `DD-MM-YYYY` → `2025-11-05`
- `YYYY-MM-DD` → `2025-11-05` (ISO)
- `YYYYMMDD` → `2025-11-05`

**Função:**
```typescript
function normalizeDate(dateStr: string): Date {
  // Remove caracteres não-numéricos
  const digits = dateStr.replace(/\D/g, '');
  
  if (digits.length === 8) {
    // DDMMYYYY ou YYYYMMDD
    if (parseInt(digits.substr(0, 4)) > 2000) {
      // YYYYMMDD
      return new Date(`${digits.substr(0, 4)}-${digits.substr(4, 2)}-${digits.substr(6, 2)}`);
    } else {
      // DDMMYYYY
      return new Date(`${digits.substr(4, 4)}-${digits.substr(2, 2)}-${digits.substr(0, 2)}`);
    }
  }
  
  throw new Error('Formato de data inválido');
}
```

### Valores

**Normalizações:**
- Vírgula → Ponto: `1.234,56` → `1234.56`
- Remove símbolos: `R$ 1.234,56` → `1234.56`
- Remove espaços: `1 234,56` → `1234.56`
- Detecta negativos: `-1234` ou `(1234)` ou `1234-`

**Função:**
```typescript
function normalizeValue(valueStr: string): number {
  // Remove tudo exceto dígitos, vírgula, ponto, menos
  let normalized = valueStr.replace(/[^\d,.-]/g, '');
  
  // Detecta formato brasileiro (1.234,56)
  if (normalized.includes(',') && normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  }
  
  // Remove pontos de milhar
  const parts = normalized.split('.');
  if (parts.length > 2) {
    normalized = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  }
  
  return parseFloat(normalized);
}
```

---

## Exemplos de Uso

### Upload e Parse CSV

```typescript
import { importService } from '@/lib/services/import.service';

const file = new File([csvContent], 'extrato.csv');

// Detectar formato
const format = await importService.detectFormat(file);
// 'csv'

// Parse
const result = await importService.parseCSV(file, {
  mapeamento: {
    data: 0,
    descricao: 1,
    valor: 2,
    tipo: 3,
  },
});

// result = {
//   transacoes: [...],
//   erros: [],
//   total: 150,
//   duplicatas: 5,
// }
```

### Import OFX

```typescript
const file = new File([ofxContent], 'extrato.ofx');

const result = await importService.parseOFX(file);

// result = {
//   transacoes: [
//     {
//       data: new Date('2025-11-05'),
//       descricao: 'COMPRA CARTAO',
//       valor: -45.50,
//       tipo: 'despesa',
//       fitid: '20251105001',
//     },
//     ...
//   ],
//   account_id: '12345-6',
//   balance: 1234.56,
// }
```

### Salvar com Dedupe

```typescript
const saved = await importService.saveTransactions(result.transacoes, {
  conta_id: 'conta-123',
  deduplicate: true,
});

// saved = {
//   inserted: 145,   // Novas transações
//   duplicated: 5,   // Já existiam
//   errors: [],
// }
```

---

## Tratamento de Erros

### Tipos de Erro

| Erro | Causa | Ação |
|------|-------|------|
| `INVALID_FORMAT` | Formato não reconhecido | Verificar extensão do arquivo |
| `PARSE_ERROR` | Falha ao fazer parse | Verificar estrutura do arquivo |
| `VALIDATION_ERROR` | Dados inválidos | Ver campo específico no erro |
| `ENCODING_ERROR` | Encoding não suportado | Converter para UTF-8 |
| `DUPLICATE_ERROR` | Transação já existe | Pode ser ignorado |

### Estrutura de Erro

```typescript
interface ImportError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: 'warning' | 'error';
}
```

**Exemplo:**
```json
{
  "row": 42,
  "field": "data",
  "value": "32/13/2025",
  "message": "Data inválida: mês deve estar entre 1 e 12",
  "severity": "error"
}
```

---

## Referências

- [Formatos de Arquivo](../sample-files/README.md) - Exemplos de cada instituição
- [Data Model](../architecture/DATA_MODEL.md) - Schema de transações
- [Services](../../lib/services/) - Código fonte

---

**Última atualização:** 05 de Novembro de 2025
**Agent responsável:** Agent DATA
