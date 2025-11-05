# 🎨 Handoff: Interface de Importação - Agent APP

**Data**: 05 de Novembro de 2025
**De**: Agent DATA (Agent 3)
**Para**: Agent APP (Agent 2)
**Commit**: `4e370c2d` - Agent DATA v0.5 completo

---

## 🎯 Objetivo

Implementar a **interface de usuário** para o sistema de importação de transações que já está 100% funcional no backend.

O backend oferece:
- ✅ Upload de CSV/OFX
- ✅ Parsing automático com 7 templates de bancos
- ✅ Preview de transações antes de importar
- ✅ Dedupe automático (SHA-256 + conta_id)
- ✅ Classificação com IA em batch (opcional)

**Sua tarefa**: Criar a página `/import` com wizard multi-step e UX moderna.

---

## 📦 Backend Disponível

### APIs Prontas

#### 1. **GET /api/import/templates**
Lista templates de importação disponíveis.

**Exemplo de resposta**:
```json
{
  "templates": [
    {
      "id": "bradesco",
      "nome": "Bradesco - Extrato Conta Corrente",
      "instituicao": "Bradesco",
      "formato": "csv",
      "separador": ";",
      "encoding": "ISO-8859-1",
      "exemplo": "Data;Descrição;D/C;Valor;Saldo\n01/01/2024;COMPRA CARTAO;D;150,00;2.850,00"
    },
    // ... mais 6 templates (Inter, Nubank, Santander, Itaú, Caixa, Generic)
  ]
}
```

**Busca por termo**:
```
GET /api/import/templates?search=nubank
```

**Template específico**:
```
GET /api/import/templates?id=bradesco
```

---

#### 2. **POST /api/import/upload**
Upload de arquivo com preview.

**FormData esperado**:
```typescript
{
  file: File,              // Arquivo CSV/OFX
  templateId?: string      // Opcional: 'bradesco', 'nubank', etc.
}
```

**Resposta (preview)**:
```json
{
  "file": {
    "name": "extrato.csv",
    "size": 45821,
    "type": "text/csv",
    "encoding": "UTF-8"
  },
  "metadata": {
    "totalRows": 150,
    "validRows": 148,
    "invalidRows": 2,
    "separator": ",",
    "format": "CSV",
    "hasHeader": true
  },
  "transactions": [
    {
      "data": "2024-01-15",
      "descricao": "NETFLIX",
      "valor": 39.90,
      "tipo": "despesa"
    }
    // ... primeiras 100 transações
  ],
  "errors": [
    { "row": 10, "message": "Data inválida: 'xx/xx/xxxx'" }
  ],
  "summary": {
    "total": 150,
    "preview": 100,
    "hasMore": true,
    "errorCount": 2
  }
}
```

**Validações automáticas**:
- ✅ Tipo de arquivo (CSV, OFX, TXT)
- ✅ Tamanho máximo: 10MB
- ✅ Encoding: UTF-8 / ISO-8859-1 (detectado automaticamente)
- ✅ Separador: `,`, `;`, `|`, `\t` (detectado automaticamente)

**Erros possíveis**:
- `400`: Arquivo não fornecido / tipo inválido / muito grande
- `501`: OFX ainda não suportado (implementação futura)
- `500`: Erro no parsing

---

#### 3. **POST /api/import/process**
Processa e salva transações no banco.

**Body esperado**:
```typescript
{
  file: {
    content: string,    // Conteúdo do arquivo
    name: string        // Nome do arquivo
  },
  options: {
    conta_id: string,          // ID da conta (obrigatório)
    templateId?: string,       // Template a usar
    autoClassify?: boolean,    // Classificar com IA (padrão: false)
    skipDuplicates?: boolean   // Pular duplicatas (padrão: true)
  }
}
```

**Resposta**:
```json
{
  "success": true,
  "summary": {
    "total": 150,
    "imported": 145,
    "duplicates": 3,
    "errors": 2,
    "autoClassified": 140  // Se autoClassify = true
  },
  "imported": ["txn-id-1", "txn-id-2", ...],
  "duplicates": ["hash-1", "hash-2", "hash-3"],
  "errors": [
    { "row": 10, "message": "Data inválida" },
    { "row": 25, "message": "Valor inválido" }
  ],
  "classification": {  // Se autoClassify = true
    "total": 145,
    "successful": 140,
    "failed": 5,
    "cached": 80,
    "api_calls": 60
  }
}
```

**Dedupe automático**:
- Usa hash SHA-256 de: `conta_id | data | descricao | valor`
- Transações duplicadas são puladas automaticamente (se `skipDuplicates = true`)

**Classificação IA**:
- Se `autoClassify = true`, chama `/api/ai/classify/batch`
- Classifica todas as transações importadas
- Usa cache + regras + OpenAI
- Atualiza categorias com confiança >= 70%

---

## 🎨 UI/UX Recomendado

### Página: `/import`

#### Layout Geral
```
┌─────────────────────────────────────────┐
│  Importar Transações                     │
│  ─────────────────────────────────────  │
│                                          │
│  [Step 1] → [Step 2] → [Step 3]        │
│  Arquivo   Preview    Confirmar         │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │                                    │ │
│  │   [Conteúdo do Step Atual]        │ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
│                                          │
│           [Voltar]  [Próximo]           │
└─────────────────────────────────────────┘
```

---

### Step 1: Upload de Arquivo

**Componentes necessários**:
- `FileUploadZone` - Drag and drop area
- `TemplateSelector` - Dropdown com templates
- `AccountSelector` - Dropdown de contas (obrigatório)

**UI**:
```
┌─────────────────────────────────────────┐
│ 📥 Selecione o arquivo para importar    │
├─────────────────────────────────────────┤
│                                          │
│  Conta:  [Dropdown: Minhas contas]      │
│                                          │
│  Template (opcional):                    │
│  [Dropdown: Detecção automática      ▼] │
│  └─ Bradesco                             │
│  └─ Inter                                │
│  └─ Nubank                               │
│  └─ ...                                  │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │                                    │ │
│  │   📄 Arraste o arquivo aqui        │ │
│  │      ou clique para selecionar     │ │
│  │                                    │ │
│  │   Formatos: CSV, OFX, TXT          │ │
│  │   Tamanho máximo: 10MB             │ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ℹ️ Dica: Use o template correto do     │
│     seu banco para melhor resultado     │
│                                          │
└─────────────────────────────────────────┘
```

**Lógica**:
1. Usuário seleciona conta (obrigatório)
2. Usuário seleciona arquivo (drag-and-drop ou click)
3. [Opcional] Usuário seleciona template
4. Faz POST para `/api/import/upload` com FormData
5. Mostra loading spinner durante upload
6. Se sucesso → avança para Step 2
7. Se erro → mostra toast com mensagem

**Validações frontend**:
- Conta selecionada (obrigatório)
- Arquivo selecionado
- Tipo de arquivo válido (CSV, OFX, TXT)
- Tamanho <= 10MB

**shadcn/ui componentes**:
- `Select` (conta e template)
- `Card` (drag zone)
- `Button` ("Próximo")
- `toast` (erros)

---

### Step 2: Preview e Revisão

**Componentes necessários**:
- `PreviewTable` - Tabela com primeiras 100 transações
- `SummaryCards` - Cards com estatísticas
- `ErrorList` - Lista de erros (se houver)

**UI**:
```
┌──────────────────────────────────────────┐
│ 👁️ Visualizar e Revisar                  │
├──────────────────────────────────────────┤
│                                           │
│  📊 Resumo da Importação                 │
│                                           │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │  150   │ │  148   │ │   2    │       │
│  │  Total │ │ Válidas│ │ Erros  │       │
│  └────────┘ └────────┘ └────────┘       │
│                                           │
│  📝 Visualizando 100 de 150 transações   │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ Data       Descrição      Valor     │ │
│  ├─────────────────────────────────────┤ │
│  │ 15/01/2024 NETFLIX        R$ 39,90  │ │
│  │ 16/01/2024 UBER           R$ 25,00  │ │
│  │ 17/01/2024 SALÁRIO      R$ 5.000,00 │ │
│  │ ...                                 │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ⚠️ 2 linhas com erro (não serão        │
│     importadas):                         │
│  • Linha 10: Data inválida              │
│  • Linha 25: Valor inválido             │
│                                           │
│  ┌────────────────────────────────────┐ │
│  │ ☐ Classificar automaticamente       │ │
│  │   com Inteligência Artificial       │ │
│  └────────────────────────────────────┘ │
│                                           │
└──────────────────────────────────────────┘
```

**Lógica**:
1. Exibe dados do preview (retorno de `/api/import/upload`)
2. Mostra estatísticas em cards
3. Mostra tabela com transações
4. Mostra erros (se houver) em alert
5. Checkbox para auto-classificação IA
6. Botões: "Voltar" (Step 1) e "Importar" (Step 3)

**shadcn/ui componentes**:
- `Card` (summary cards)
- `Table` (preview)
- `Alert` (erros)
- `Checkbox` (auto-classificação)
- `Button` (voltar/importar)

---

### Step 3: Processamento e Resultado

**Componentes necessários**:
- `LoadingState` - Spinner durante processamento
- `ResultSummary` - Cards com resultado final
- `DuplicatesList` - Lista de duplicatas (se houver)

**UI (durante processamento)**:
```
┌──────────────────────────────────────────┐
│ ⏳ Processando...                        │
├──────────────────────────────────────────┤
│                                           │
│          🔄 Importando transações...     │
│                                           │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 50%               │
│                                           │
│  Processadas: 75/150                     │
│                                           │
│  Aguarde enquanto processamos suas       │
│  transações...                            │
│                                           │
└──────────────────────────────────────────┘
```

**UI (após sucesso)**:
```
┌──────────────────────────────────────────┐
│ ✅ Importação Concluída                  │
├──────────────────────────────────────────┤
│                                           │
│  🎉 Suas transações foram importadas!    │
│                                           │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │  145   │ │   3    │ │   2    │       │
│  │Importa │ │ Dupli  │ │ Erros  │       │
│  │  das   │ │ cadas  │ │        │       │
│  └────────┘ └────────┘ └────────┘       │
│                                           │
│  🤖 Classificação Automática:            │
│  • 140 transações classificadas          │
│  • 80 via cache (economizou $0.002)     │
│  • 60 via OpenAI                         │
│                                           │
│  ℹ️ 3 transações duplicadas foram        │
│     ignoradas (já existiam no banco)     │
│                                           │
│  [Ver Transações]  [Nova Importação]    │
│                                           │
└──────────────────────────────────────────┘
```

**Lógica**:
1. Prepara payload com conteúdo do arquivo + opções
2. Faz POST para `/api/import/process`
3. Mostra loading com progress (pode simular baseado em totalRows)
4. Quando resposta chega:
   - Se sucesso → mostra resultado com cards
   - Se erro → mostra toast com erro
5. Botões:
   - "Ver Transações" → redireciona para `/transactions`
   - "Nova Importação" → reseta wizard para Step 1

**shadcn/ui componentes**:
- `Progress` (barra de progresso)
- `Card` (summary final)
- `Alert` (duplicatas/erros)
- `Button` (ações finais)

---

## 🛠️ Componentes Reutilizáveis Sugeridos

### 1. `ImportWizard`
Componente principal que gerencia os 3 steps.

**Props**:
```typescript
interface ImportWizardProps {
  defaultAccountId?: string;  // Pré-seleciona uma conta
  onComplete?: (result: ImportResult) => void;
}
```

**Estado**:
```typescript
const [step, setStep] = useState<1 | 2 | 3>(1);
const [file, setFile] = useState<File | null>(null);
const [accountId, setAccountId] = useState<string>('');
const [templateId, setTemplateId] = useState<string>('');
const [preview, setPreview] = useState<PreviewData | null>(null);
const [autoClassify, setAutoClassify] = useState(false);
```

---

### 2. `FileUploadZone`
Área de upload com drag-and-drop.

**Props**:
```typescript
interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  accept: string;  // 'text/csv,.csv,.ofx,.txt'
  maxSize: number;  // 10 * 1024 * 1024
  disabled?: boolean;
}
```

**Features**:
- Drag-and-drop
- Click para selecionar
- Validação de tipo e tamanho
- Feedback visual (hover, dropping)

---

### 3. `TemplateSelector`
Dropdown com templates de bancos.

**Props**:
```typescript
interface TemplateSelectorProps {
  value: string;
  onChange: (templateId: string) => void;
  disabled?: boolean;
}
```

**Lógica**:
- Carrega templates de `/api/import/templates` no mount
- Mostra loading enquanto carrega
- Agrupa por banco (opcional)

---

### 4. `TransactionPreviewTable`
Tabela com preview de transações.

**Props**:
```typescript
interface TransactionPreviewTableProps {
  transactions: ParsedTransaction[];
  maxRows?: number;  // Limite de linhas visíveis
}
```

**Features**:
- Formatação de data (DD/MM/YYYY)
- Formatação de valor (R$ 1.234,56)
- Badge de tipo (receita/despesa)
- Scroll vertical se > 10 linhas

---

### 5. `ImportSummaryCards`
Cards com estatísticas.

**Props**:
```typescript
interface ImportSummaryCardsProps {
  summary: {
    total: number;
    valid: number;
    invalid?: number;
    imported?: number;
    duplicates?: number;
    classified?: number;
  };
}
```

---

## 📝 Exemplo de Fluxo Completo

```typescript
// Pseudocódigo do fluxo

async function handleImport() {
  // Step 1: Upload
  const file = await selectFile();
  const accountId = await selectAccount();
  const templateId = await selectTemplate(); // opcional

  const preview = await uploadFile(file, templateId);
  // → POST /api/import/upload

  // Step 2: Preview
  showPreview(preview);
  const autoClassify = await confirmOptions();

  // Step 3: Process
  setLoading(true);

  const result = await processImport({
    file: {
      content: await file.text(),
      name: file.name
    },
    options: {
      conta_id: accountId,
      templateId,
      autoClassify,
      skipDuplicates: true
    }
  });
  // → POST /api/import/process

  setLoading(false);
  showResult(result);

  // Redirect
  if (result.success) {
    toast.success(`${result.summary.imported} transações importadas!`);
    router.push('/transactions');
  }
}
```

---

## 🎯 Critérios de Sucesso

### Must Have
- ✅ Wizard de 3 steps funcional
- ✅ Upload com validação de tipo/tamanho
- ✅ Preview de transações antes de importar
- ✅ Seleção de conta (obrigatório)
- ✅ Integração com 3 APIs
- ✅ Feedback de sucesso/erro claro
- ✅ Loading states em todas operações assíncronas

### Should Have
- ✅ Drag-and-drop para arquivo
- ✅ Seleção de template (opcional)
- ✅ Toggle de auto-classificação
- ✅ Exibir estatísticas (cards)
- ✅ Lista de erros (se houver)
- ✅ Lista de duplicatas (se houver)

### Nice to Have
- 🎨 Animações de transição entre steps
- 🎨 Progress bar real (streaming do backend)
- 🎨 Preview com scroll infinite (lazy load)
- 🎨 Filtros na preview (tipo, categoria)
- 🎨 Export de erros para CSV

---

## 🧪 Testes Sugeridos

### Testes Manuais
1. ✅ Upload de CSV válido
2. ✅ Upload de arquivo muito grande (> 10MB) → deve rejeitar
3. ✅ Upload de tipo inválido (PDF) → deve rejeitar
4. ✅ Preview com 100+ transações → deve limitar a 100
5. ✅ Importação com duplicatas → deve listar
6. ✅ Importação com erros → deve listar
7. ✅ Auto-classificação ativada → deve mostrar stats

### Testes de Integração
Use o arquivo `scripts/test-import-smoke.js` como referência:
```bash
npm run import:smoke
```

---

## 📚 Referências

### Documentação Backend
- `docs/IMPORT_SYSTEM_V05.md` - Sistema completo documentado
- `docs/IMPORT_ISSUES_REPORT.md` - Problemas resolvidos
- `lib/import/templates/index.ts` - Templates disponíveis

### Componentes shadcn/ui
- `Table` - Preview de transações
- `Card` - Summary cards
- `Select` - Dropdowns (conta, template)
- `Progress` - Barra de progresso
- `Alert` - Erros e avisos
- `Button` - Ações
- `Checkbox` - Auto-classificação
- `toast` - Feedback

### Ícones Lucide
- `Upload` - Área de upload
- `FileText` - Arquivo
- `Check` - Sucesso
- `AlertCircle` - Erro
- `Loader2` - Loading
- `Copy` - Duplicatas

---

## ✅ Checklist Final

Antes de considerar completo, verifique:

- [ ] Página `/import` criada
- [ ] Wizard de 3 steps implementado
- [ ] Integração com `/api/import/templates` (GET)
- [ ] Integração com `/api/import/upload` (POST)
- [ ] Integração com `/api/import/process` (POST)
- [ ] Validações frontend (conta, arquivo)
- [ ] Loading states em todas operações
- [ ] Feedback de sucesso/erro (toasts)
- [ ] Preview de transações funcional
- [ ] Cards de estatísticas
- [ ] Lista de erros (se houver)
- [ ] Opção de auto-classificação
- [ ] Redirecionamento para `/transactions` após sucesso
- [ ] Responsivo (mobile, tablet, desktop)
- [ ] Testes manuais com CSVs reais

---

## 🚀 Pronto para começar!

O backend está **100% funcional** e **testado**. Você tem total liberdade para criar a UX que achar melhor, desde que:
1. Use as 3 APIs documentadas
2. Implemente os 3 steps (upload → preview → process)
3. Valide entrada do usuário (conta + arquivo)
4. Dê feedback claro (loading, sucesso, erro)

**Dúvidas?** Leia:
- `docs/IMPORT_SYSTEM_V05.md`
- Smoke tests em `scripts/test-import-smoke.js`

**Boa sorte! 🎨🚀**

---

**Última atualização**: 05 de Novembro de 2025
**Agent DATA**: Disponível para dúvidas sobre o backend
