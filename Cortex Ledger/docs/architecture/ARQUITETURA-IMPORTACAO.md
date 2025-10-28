# Arquitetura de Importação - Cortex Ledger

## 🎯 Visão Geral

Sistema de importação bancária com **processamento 100% no backend**. O frontend apenas faz upload do arquivo e o backend cuida de todo o resto: detecção de banco, parsing, deduplicação e inserção no banco de dados.

---

## 🏗️ Arquitetura

```
┌─────────────┐
│  Frontend   │
│   (Upload)  │
└──────┬──────┘
       │ POST /api/transactions/import
       │ FormData: file, conta_id, banco (opcional)
       ▼
┌─────────────────────────────────────────┐
│         API Route (Backend)             │
│  /api/transactions/import/route.ts      │
├─────────────────────────────────────────┤
│  1. Recebe arquivo                      │
│  2. Detecta banco automaticamente       │
│  3. Chama parser apropriado             │
│  4. Converte para formato do DB         │
│  5. Verifica duplicatas (hash_dedupe)   │
│  6. Insere no Supabase                  │
│  7. Retorna resultado                   │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│          Parsers (Backend)              │
├─────────────────────────────────────────┤
│  • banco-detector.ts                    │
│    - Detecta banco por conteúdo/nome    │
│                                         │
│  • bradesco-parser.ts                   │
│    - Parse de Extrato CSV               │
│    - Parse de Fatura CSV                │
│    - Parse de OFX                       │
│                                         │
│  • (futuros)                            │
│    - itau-parser.ts                     │
│    - nubank-parser.ts                   │
│    - etc.                               │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         Supabase (Database)             │
│                                         │
│  Tabela: transacao                      │
│  - id, user_id, conta_id                │
│  - data, descricao, valor, tipo         │
│  - hash_dedupe (deduplicação)           │
│  - id_externo, moeda_original           │
└─────────────────────────────────────────┘
```

---

## 📁 Estrutura de Arquivos

```
apps/web/src/
├── app/
│   ├── api/
│   │   └── transactions/
│   │       └── import/
│   │           └── route.ts              # API de importação
│   └── (dashboard)/
│       └── importar/
│           └── page.tsx                  # Página de importação (Server Component)
│
├── components/
│   └── importacao/
│       └── simple-import-form.tsx        # Formulário simples (Client Component)
│
└── lib/
    ├── supabase-server.ts                # Cliente Supabase para Server
    └── parsers/
        ├── banco-detector.ts             # Detector de banco
        ├── bradesco-parser.ts            # Parser do Bradesco
        └── import-templates.ts           # (movido de frontend para backend)
```

---

## 🔄 Fluxo de Importação

### 1. Frontend (Upload)
```typescript
// O usuário faz upload do arquivo
const formData = new FormData()
formData.append('file', arquivo)
formData.append('conta_id', contaId)
formData.append('banco', 'bradesco') // opcional

const response = await fetch('/api/transactions/import', {
  method: 'POST',
  body: formData
})
```

### 2. Backend (Detecção)
```typescript
// Detecta o banco automaticamente
const banco = bancoHint || detectBanco(content, filename)
// Resultado: 'bradesco', 'itau', 'nubank', etc.
```

### 3. Backend (Parsing)
```typescript
// Chama parser específico
const parseResult = parseBradescoFile(content)
// Retorna: { transactions, metadata, errors }
```

### 4. Backend (Conversão)
```typescript
// Converte para formato do banco de dados
const transacoes = parseResult.transactions.map(t => ({
  user_id: user.id,
  conta_id: contaId,
  data: convertDate(t.data),
  descricao: t.descricao,
  valor: t.tipo === 'debito' ? -t.valor : t.valor,
  tipo: t.tipo,
  hash_dedupe: `${data}|${descricao}|${valor}`
}))
```

### 5. Backend (Deduplicação)
```typescript
// Busca transações existentes
const existing = await supabase
  .from('transacao')
  .select('hash_dedupe')
  .eq('user_id', user.id)
  .gte('data', minDate)
  .lte('data', maxDate)

// Filtra duplicatas
const novas = transacoes.filter(t =>
  !existing.has(t.hash_dedupe)
)
```

### 6. Backend (Inserção)
```typescript
// Insere apenas transações novas
await supabase
  .from('transacao')
  .insert(novas)
```

---

## 🔍 Detecção Automática de Banco

### Como Funciona

O detector verifica **padrões no conteúdo** e **keywords no nome do arquivo**:

```typescript
// Exemplo: Bradesco
{
  banco: 'bradesco',
  patterns: [
    /BRADESCO/i,
    /Extrato de:.*Ag:.*Conta:/i,
    /<BANKID>0237/i
  ],
  keywords: ['bradesco', 'extrato de:', 'ag:', 'amex']
}
```

### Bancos Suportados
- ✅ **Bradesco** (Extrato CSV, Fatura CSV, OFX)
- 🔜 **Itaú** (planejado)
- 🔜 **Nubank** (planejado)
- 🔜 **C6 Bank** (planejado)
- 🔜 **Inter** (planejado)

---

## 🛡️ Deduplicação

### Estratégia: Hash Dedupe

Cada transação gera um hash único baseado em:
```
hash_dedupe = `${data}|${descricao}|${valor}`
```

Exemplo:
```
"2025-07-01|Transfe Pix|-1296.00"
```

### Vantagens
- ✅ Simples e eficiente
- ✅ Funciona mesmo com importações repetidas
- ✅ Permite re-importação sem duplicatas
- ✅ Índice no banco para performance

---

## 📊 Formato das Transações

### Entrada (Parser)
```typescript
interface ParsedTransaction {
  data: string              // "01/07/25"
  descricao: string         // "Transfe Pix"
  valor: number             // 1296.00
  tipo: 'credito' | 'debito'
  documento?: string        // "1357553"
  saldo?: number            // 19312.00
  moeda?: 'BRL' | 'USD'
  titular?: string          // "GUILHERME BARROS"
}
```

### Saída (Database)
```typescript
interface TransacaoDB {
  id: uuid
  user_id: uuid
  conta_id: uuid
  data: date                 // "2025-07-01"
  descricao: string
  valor: numeric(14,2)       // -1296.00 (negativo = débito)
  tipo: 'credito' | 'debito'
  id_externo?: string
  moeda_original?: string
  hash_dedupe: string
  created_at: timestamp
}
```

---

## 🎨 Interface do Usuário

### Simplicidade Máxima

O usuário só precisa:
1. **Selecionar arquivo** (CSV ou OFX)
2. **Selecionar conta de destino**
3. **Opcionalmente** selecionar banco (auto-detectado por padrão)
4. **Clicar em "Importar"**

### Feedback Visual

```
✅ Sucesso
  ✓ 137 transações importadas
  ⚠ 5 duplicatas ignoradas
  ℹ Banco: Bradesco | Tipo: Fatura | Formato: CSV
  ℹ Período: 01/06/2025 a 30/06/2025

❌ Erro
  • Não foi possível detectar o banco
  • Nenhuma transação encontrada
```

---

## 🚀 Como Adicionar um Novo Banco

### Passo 1: Criar Parser

```typescript
// apps/web/src/lib/parsers/itau-parser.ts

export function parseItauFile(content: string): BradescoParseResult {
  // Implementar lógica de parsing...
  return {
    transactions: [...],
    metadata: { banco: 'itau', tipo: 'extrato', formato: 'csv' },
    errors: []
  }
}
```

### Passo 2: Adicionar Detecção

```typescript
// apps/web/src/lib/parsers/banco-detector.ts

{
  banco: 'itau',
  patterns: [
    /ITAU|ITAÚ/i,
    /<BANKID>341/i
  ],
  keywords: ['itau', 'itaú']
}
```

### Passo 3: Integrar na API

```typescript
// apps/web/src/app/api/transactions/import/route.ts

switch (banco.toLowerCase()) {
  case 'bradesco':
    parseResult = parseBradescoFile(content)
    break
  case 'itau':
    parseResult = parseItauFile(content)
    break
  // ...
}
```

---

## 📝 Exemplos de Uso

### Frontend - Upload Simples

```tsx
<form onSubmit={handleSubmit}>
  <input type="file" accept=".csv,.ofx" />
  <select name="conta_id">
    {contas.map(c => <option value={c.id}>{c.apelido}</option>)}
  </select>
  <select name="banco">
    <option value="auto">Detectar automaticamente</option>
    <option value="bradesco">Bradesco</option>
    <option value="itau">Itaú</option>
  </select>
  <button type="submit">Importar</button>
</form>
```

### Backend - Resposta da API

```json
{
  "success": true,
  "transactions": 137,
  "duplicates": 5,
  "metadata": {
    "banco": "bradesco",
    "tipo": "fatura",
    "formato": "csv",
    "total_arquivo": 142,
    "periodo": {
      "inicio": "01/06/2025",
      "fim": "30/06/2025"
    }
  }
}
```

---

## 🔐 Segurança

### Autenticação
- ✅ Verifica token do Supabase Auth
- ✅ Garante que user_id é do usuário autenticado
- ✅ RLS (Row Level Security) ativo no banco

### Validações
- ✅ Tamanho máximo de arquivo
- ✅ Formato de arquivo (.csv, .ofx)
- ✅ Validação de dados antes de inserir
- ✅ Proteção contra SQL injection (Supabase)

### Isolamento
- ✅ Cada usuário vê apenas suas transações
- ✅ conta_id deve pertencer ao usuário
- ✅ Hash dedupe por usuário

---

## 📈 Performance

### Otimizações
- ✅ Parsing em memória (rápido)
- ✅ Batch insert de transações
- ✅ Índice em hash_dedupe
- ✅ Query de duplicatas otimizada (range de datas)

### Limites
- ⚠️ Arquivo: até ~10MB
- ⚠️ Transações: até ~10.000 por arquivo
- ⚠️ Timeout: 60 segundos

---

## 🧪 Testes

### Arquivos de Exemplo
```
exemplos-importacao/
├── extrato bradesco julho.csv      # ✅ 11 transações
├── extrato bradesco julho.ofx      # ✅ 24 transações
├── amex julho.csv                  # ✅ 137 transações
└── aeternum julho.csv              # ✅ 63 transações
```

### Script de Teste
```bash
node scripts/test-bradesco-parsers.mjs
```

---

## 📚 Referências

- **Parsers**: `/apps/web/src/lib/parsers/`
- **API**: `/apps/web/src/app/api/transactions/import/`
- **UI**: `/apps/web/src/app/(dashboard)/importar/`
- **Docs anteriores**: `IMPORTACAO-BRADESCO.md`

---

**Status**: ✅ Sistema completo e funcional
**Data**: 26/10/2025
**Próximo**: Testar em produção e adicionar mais bancos
