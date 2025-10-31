# Sistema de Importação - Cortex Cash

> **Agent IMPORT** - Sistema completo de importação de extratos bancários

## ✨ Funcionalidades

- 📤 Upload de arquivos (drag & drop ou seleção)
- 🔍 Detecção automática de formato (CSV, OFX)
- 🗺️ Mapeamento visual de colunas (CSV)
- 🔄 Deduplicação inteligente via hash
- 👀 Preview antes de importar
- ✅ Validação em múltiplas camadas
- 📊 Relatório detalhado de importação

## 🚀 Como Usar

### 1. Acesse a página de importação
```
/import
```

### 2. Selecione a conta
Escolha para qual conta deseja importar as transações.

### 3. Faça upload do arquivo
- Arraste e solte o arquivo
- Ou clique em "Selecionar Arquivo"

### 4. Configure o mapeamento (apenas CSV)
Indique qual coluna corresponde a cada campo:
- Data (obrigatório)
- Descrição (obrigatório)
- Valor (obrigatório)
- Tipo, Categoria, Observações (opcional)

### 5. Revise o preview
- Veja todas as transações detectadas
- Selecione quais deseja importar
- Veja quantas são duplicadas

### 6. Confirme a importação
Clique em "Importar" e pronto!

## 📄 Formatos Suportados

### CSV
- Separadores: `,` `;` `|` `\t`
- Encoding: UTF-8
- [Arquivo de exemplo](../public/examples/extrato-exemplo.csv)

### OFX
- Formato padrão bancário
- Parse automático de tags
- Sem necessidade de mapeamento

## 📁 Arquivos Importantes

### Service
- `lib/services/import.service.ts` - Lógica de importação

### Componentes
- `components/import/file-upload.tsx` - Upload de arquivo
- `components/import/column-mapper.tsx` - Mapeamento de colunas
- `components/import/transaction-preview.tsx` - Preview

### Página
- `app/import/page.tsx` - Interface principal

### Documentação
- `docs/IMPORT_GUIDE.md` - Guia técnico completo

## 🔧 Desenvolvimento

### Adicionar novo formato de arquivo

1. Adicione o parser em `import.service.ts`:
```typescript
async parseExcel(content: ArrayBuffer): Promise<ParseResult> {
  // Implementação
}
```

2. Atualize a detecção em `detectFormat()`

3. Adicione lógica no `handleFileSelect()` da página

### Adicionar campo customizado

1. Atualize `MapeamentoColunas` em `lib/types/index.ts`
2. Adicione campo em `ColumnMapper.tsx`
3. Processe no parser CSV/OFX

## 🐛 Troubleshooting

**Erro: "Formato não suportado"**
- Verifique se o arquivo é CSV ou OFX
- Confira o encoding (deve ser UTF-8)

**Erro: "Nenhuma transação válida"**
- Verifique se o mapeamento está correto
- Confira o formato da data
- Verifique se os valores são números válidos

**Duplicatas não detectadas**
- O hash é baseado em: conta + data + descrição + valor
- Pequenas diferenças geram transações distintas

## 📊 Status do Projeto

- ✅ Upload de arquivos
- ✅ Parse CSV
- ✅ Parse OFX
- ✅ Mapeamento de colunas
- ✅ Deduplicação
- ✅ Preview
- ✅ Importação
- 🚧 Parse Excel (.xlsx)
- 🚧 Templates salvos
- 🔮 Classificação automática via IA

## 🤝 Contribuindo

Este módulo é mantido pelo **Agent IMPORT**.

Para contribuir, consulte a [documentação técnica completa](./IMPORT_GUIDE.md).

---

**Versão:** 1.0.0
**Data:** 2025-01-29
**Agent:** IMPORT
