# Guia de Importação - Cortex Cash

> **Agent IMPORT - Owner**
> Sistema de importação de transações de extratos bancários

## 📋 Sumário

- [Visão Geral](#visão-geral)
- [Formatos Suportados](#formatos-suportados)
- [Fluxo de Importação](#fluxo-de-importação)
- [Estrutura Técnica](#estrutura-técnica)
- [API Reference](#api-reference)
- [Exemplos de Uso](#exemplos-de-uso)

---

## Visão Geral

O sistema de importação permite que usuários carreguem extratos bancários em diferentes formatos (CSV, OFX, Excel) e importem transações automaticamente para o Cortex Cash.

### Funcionalidades Principais

- ✅ **Upload de Arquivos**: Drag & drop ou seleção manual
- ✅ **Detecção Automática de Formato**: Identifica CSV, OFX ou Excel
- ✅ **Mapeamento de Colunas**: Interface visual para mapear campos CSV
- ✅ **Parse OFX Nativo**: Suporte completo ao formato OFX
- ✅ **Deduplicação**: Detecta e remove transações duplicadas via hash
- ✅ **Preview**: Visualização das transações antes da importação
- ✅ **Validação**: Múltiplas camadas de validação de dados
- ✅ **Error Handling**: Relatório detalhado de erros

---

## Formatos Suportados

### 1. CSV (Comma-Separated Values)

**Características:**
- Separadores suportados: `,` `;` `|` `\t`
- Encoding: UTF-8
- Aspas: Suporta campos entre aspas duplas
- Headers: Primeira linha como cabeçalho

**Campos Obrigatórios:**
- Data
- Descrição
- Valor

**Campos Opcionais:**
- Tipo (Receita/Despesa)
- Categoria
- Observações

**Exemplo CSV:**
```csv
Data,Descrição,Valor,Tipo
01/01/2025,Salário,5000.00,Receita
05/01/2025,Supermercado,-350.50,Despesa
10/01/2025,Combustível,-200.00,Despesa
```

### 2. OFX (Open Financial Exchange)

**Características:**
- Parse nativo de tags XML/SGML
- Extração automática de transações
- Suporte a campos padrão OFX

**Tags Extraídas:**
- `<DTPOSTED>`: Data da transação
- `<TRNAMT>`: Valor (positivo/negativo)
- `<MEMO>` ou `<NAME>`: Descrição
- `<TRNTYPE>`: Tipo da transação

**Exemplo OFX:**
```xml
<?OFX OFXHEADER="200" VERSION="203"?>
<OFX>
  <BANKTRANLIST>
    <STMTTRN>
      <TRNTYPE>CREDIT</TRNTYPE>
      <DTPOSTED>20250101</DTPOSTED>
      <TRNAMT>5000.00</TRNAMT>
      <MEMO>Salário Empresa XYZ</MEMO>
    </STMTTRN>
  </BANKTRANLIST>
</OFX>
```

### 3. Excel (.xlsx, .xls)

**Status:** 🚧 Em desenvolvimento
- Planejado para suportar planilhas Excel
- Leitura via biblioteca xlsx/exceljs

---

## Fluxo de Importação

### Passo 1: Upload do Arquivo

```
┌─────────────────────────────────┐
│   Upload de Arquivo             │
│                                 │
│  [Drag & Drop ou Selecionar]   │
│                                 │
│  Formatos: CSV, OFX, Excel     │
│  Tamanho máximo: 10 MB         │
└─────────────────────────────────┘
```

### Passo 2: Detecção de Formato

O sistema detecta automaticamente o formato baseado no conteúdo:

```typescript
const formato = await importService.detectFormat(content);
// formato.tipo: 'csv' | 'ofx' | 'excel'
// formato.confianca: 0-1 (percentual de certeza)
```

### Passo 3: Configuração (apenas CSV)

Para arquivos CSV, o usuário mapeia as colunas:

```
┌─────────────────────────────────┐
│  Mapeamento de Colunas          │
├─────────────────────────────────┤
│  Data          →  Coluna 1      │
│  Descrição     →  Coluna 2      │
│  Valor         →  Coluna 3      │
│  Categoria     →  Não mapear    │
├─────────────────────────────────┤
│  Formato Data: DD/MM/AAAA       │
│  Separador Decimal: Vírgula     │
└─────────────────────────────────┘
```

### Passo 4: Preview

Visualização das transações antes de importar:

```
┌─────────────────────────────────┐
│  Preview (50 transações)        │
├─────────────────────────────────┤
│  ☑ 01/01/2025 | Salário  | +5k │
│  ☑ 05/01/2025 | Mercado  | -350│
│  ☐ 10/01/2025 | Gas      | -200│
├─────────────────────────────────┤
│  Total: 50 | Selecionadas: 48   │
│  Duplicadas: 2                  │
└─────────────────────────────────┘
```

### Passo 5: Importação

Importação em lote com:
- Validação de cada transação
- Cálculo de hash para deduplicação
- Atualização de saldo de conta
- Relatório de erros

---

## Estrutura Técnica

### Arquitetura de Componentes

```
app/import/page.tsx
├── FileUpload               (Upload de arquivo)
├── ColumnMapper             (Mapeamento CSV)
├── TransactionPreview       (Preview antes de importar)
└── StepIndicator            (Indicador de progresso)
```

### Service Layer

**`lib/services/import.service.ts`**

```typescript
class ImportService {
  // Detecção de formato
  detectFormat(fileContent: string): Promise<FileFormat>

  // Parse de arquivos
  parseCSV(content: string, mapping: MapeamentoColunas, config: ParseConfig): Promise<ParseResult>
  parseOFX(content: string): Promise<ParseResult>

  // Deduplicação
  deduplicateTransactions(contaId: string, transacoes: ParsedTransacao[]): Promise<DedupeResult>

  // Importação
  importTransactions(contaId: string, transacoes: ParsedTransacao[]): Promise<{ importadas: number; erros: ParseError[] }>

  // Templates (salvamento de configurações)
  saveTemplate(template: TemplateImportacao): Promise<TemplateImportacao>
  listTemplates(instituicaoId?: string): Promise<TemplateImportacao[]>
}
```

### Tipos de Dados

```typescript
interface ParsedTransacao {
  data: Date;
  descricao: string;
  valor: number;
  tipo?: TipoTransacao;
  categoria?: string;
  observacoes?: string;
  linha_original: number;
  hash?: string;
}

interface ParseResult {
  success: boolean;
  transacoes: ParsedTransacao[];
  erros: ParseError[];
  resumo: {
    total_linhas: number;
    linhas_validas: number;
    linhas_invalidas: number;
    duplicatas: number;
  };
}

interface DedupeResult {
  total: number;
  duplicatas: number;
  novas: number;
  transacoes_unicas: ParsedTransacao[];
  transacoes_duplicadas: ParsedTransacao[];
}
```

---

## API Reference

### `importService.detectFormat(content: string)`

**Detecta automaticamente o formato do arquivo**

**Parâmetros:**
- `content`: Conteúdo do arquivo como string

**Retorno:**
```typescript
{
  tipo: 'csv' | 'ofx' | 'excel',
  confianca: number,
  detectado: {
    separador?: string,
    encoding?: string,
    headers?: string[]
  }
}
```

---

### `importService.parseCSV(content, mapping, config)`

**Faz parse de arquivo CSV**

**Parâmetros:**
- `content`: Conteúdo do CSV
- `mapping`: Mapeamento de colunas
- `config`: Configurações de parse

**Exemplo:**
```typescript
const result = await importService.parseCSV(
  csvContent,
  { data: 0, descricao: 1, valor: 2 },
  {
    separador: ',',
    pular_linhas: 1,
    formato_data: 'dd/MM/yyyy',
    separador_decimal: ','
  }
);
```

---

### `importService.parseOFX(content: string)`

**Faz parse de arquivo OFX**

**Parâmetros:**
- `content`: Conteúdo do OFX

**Retorno:**
```typescript
ParseResult // Mesmo formato do CSV
```

---

### `importService.deduplicateTransactions(contaId, transacoes)`

**Remove transações duplicadas baseado em hash**

**Algoritmo:**
1. Busca transações existentes da conta
2. Gera hash para cada transação: `sha256(contaId-data-descricao-valor)`
3. Compara com hashes existentes
4. Retorna transações únicas e duplicadas

**Exemplo:**
```typescript
const dedupe = await importService.deduplicateTransactions(
  'conta-uuid',
  parsedTransacoes
);

console.log(`${dedupe.novas} novas, ${dedupe.duplicatas} duplicadas`);
```

---

### `importService.importTransactions(contaId, transacoes)`

**Importa transações para o banco de dados**

**Processo:**
1. Para cada transação:
   - Valida dados
   - Cria no banco via `transacaoService.createTransacao()`
   - Atualiza saldo da conta
2. Coleta erros
3. Retorna resumo

**Exemplo:**
```typescript
const result = await importService.importTransactions(
  'conta-uuid',
  transacoes
);

console.log(`${result.importadas} importadas, ${result.erros.length} erros`);
```

---

## Exemplos de Uso

### Exemplo 1: Importação CSV Completa

```typescript
import { importService } from '@/lib/services/import.service';

// 1. Detectar formato
const formato = await importService.detectFormat(csvContent);

// 2. Parse com mapeamento
const parseResult = await importService.parseCSV(
  csvContent,
  { data: 0, descricao: 1, valor: 2 },
  { separador: ',', formato_data: 'dd/MM/yyyy' }
);

// 3. Deduplica
const dedupe = await importService.deduplicateTransactions(
  contaId,
  parseResult.transacoes
);

// 4. Importa
const importResult = await importService.importTransactions(
  contaId,
  dedupe.transacoes_unicas
);

console.log(`✅ ${importResult.importadas} transações importadas!`);
```

### Exemplo 2: Importação OFX

```typescript
// OFX é mais simples (não precisa mapeamento)
const parseResult = await importService.parseOFX(ofxContent);

const dedupe = await importService.deduplicateTransactions(
  contaId,
  parseResult.transacoes
);

const importResult = await importService.importTransactions(
  contaId,
  dedupe.transacoes_unicas
);
```

### Exemplo 3: Salvar Template de Importação

```typescript
// Salvar configuração de mapeamento para reutilizar
const template = await importService.saveTemplate({
  nome: 'Nubank CSV',
  instituicao_id: nubankId,
  tipo_arquivo: 'csv',
  separador: ',',
  formato_data: 'dd/MM/yyyy',
  mapeamento_colunas: JSON.stringify({
    data: 0,
    descricao: 1,
    valor: 2,
    categoria: 3
  }),
  contador_uso: 0
});

// Reutilizar template
const templates = await importService.listTemplates(nubankId);
```

---

## Validações e Error Handling

### Validações Implementadas

1. **Arquivo:**
   - Tamanho máximo: 10 MB
   - Formatos aceitos: .csv, .ofx, .xlsx, .xls

2. **Transação:**
   - Data: Formato válido, não no futuro
   - Descrição: Mínimo 1 caractere
   - Valor: Número válido, não zero

3. **Deduplicação:**
   - Hash único por transação
   - Comparação com transações existentes

### Tipos de Erro

```typescript
interface ParseError {
  linha: number;
  campo?: string;
  mensagem: string;
  valor_original?: string;
}
```

**Exemplos:**
- `"Data inválida: 32/01/2025"` (linha 45, campo: data)
- `"Valor inválido: abc"` (linha 12, campo: valor)
- `"Campos obrigatórios faltando"` (linha 8)

---

## Roadmap

### Implementado ✅
- [x] Upload de arquivos
- [x] Parse CSV
- [x] Parse OFX
- [x] Mapeamento de colunas
- [x] Deduplicação
- [x] Preview de transações
- [x] Import em lote
- [x] Error handling

### Em Desenvolvimento 🚧
- [ ] Suporte Excel (.xlsx)
- [ ] Templates de importação salvos
- [ ] Import history (log de importações)
- [ ] Classificação automática via IA

### Futuro 🔮
- [ ] Import de faturas de cartão de crédito
- [ ] Import de investimentos
- [ ] Integração com Open Banking
- [ ] Import automático via webhook

---

## FAQ

### Como lidar com datas em formatos diferentes?

O sistema suporta múltiplos formatos de data no componente `ColumnMapper`:
- DD/MM/AAAA (padrão brasileiro)
- MM/DD/AAAA (padrão americano)
- AAAA-MM-DD (ISO 8601)

### E se meu banco usa vírgula como decimal?

Configure o `separador_decimal` no `ColumnMapper`:
- Vírgula (,): Padrão brasileiro
- Ponto (.): Padrão internacional

### Como evitar duplicatas?

O sistema gera um hash único para cada transação baseado em:
- Conta
- Data
- Descrição
- Valor

Transações com o mesmo hash são automaticamente filtradas.

### Posso importar transações de múltiplas contas ao mesmo tempo?

Não diretamente. Cada importação é vinculada a uma conta específica. Para múltiplas contas, faça importações separadas.

---

## Contribuindo

Este módulo é gerenciado pelo **Agent IMPORT**.

Para contribuir:
1. Leia a documentação técnica
2. Siga os padrões de código existentes
3. Adicione testes para novas funcionalidades
4. Atualize esta documentação

---

**Última atualização:** 2025-01-29
**Versão:** 1.0.0
**Agent:** IMPORT
