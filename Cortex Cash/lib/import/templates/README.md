# Sistema de Templates de Importação

**Agent DATA**: Owner
**Última atualização**: 05 de Novembro de 2025

---

## 📚 Dois Sistemas de Templates

Este diretório contém **dois sistemas de templates** com propósitos diferentes:

### 1. **Sistema Simplificado** (`index.ts`) - Em Uso ✅

**Propósito**: Templates stateless para uso direto nas APIs

**Localização**: `lib/import/templates/index.ts`

**Usado por**:
- ✅ `app/api/import/upload/route.ts`
- ✅ `app/api/import/process/route.ts`
- ✅ `app/api/import/templates/route.ts`

**Formato**:
```typescript
export interface ImportTemplate {
  id: string;
  nome: string;
  instituicao: string;
  formato: 'csv' | 'ofx';
  separador?: ',' | ';' | '\t';
  encoding?: 'UTF-8' | 'ISO-8859-1';
  hasHeader: boolean;
  columnMapping: {
    date: number | string;
    description: number | string;
    value: number | string;
  };
  exemplo: string;
}
```

**Características**:
- ✅ **Stateless**: Não persiste no banco
- ✅ **Hardcoded**: Templates definidos em código
- ✅ **Rápido**: Sem I/O de banco de dados
- ✅ **7 templates**: Bradesco, Inter, Nubank, Santander, Itaú, Caixa, Generic

**Funções**:
```typescript
listTemplates(): ImportTemplate[]
getTemplate(id: string): ImportTemplate | undefined
searchTemplates(query: string): ImportTemplate[]
```

---

### 2. **Sistema de Seed** (`bank-templates.ts` + `seed-templates.ts`) - Futuro 🔮

**Propósito**: Templates persistidos no Dexie (IndexedDB) para gerenciamento via UI

**Localização**:
- `lib/import/templates/bank-templates.ts` - Definições dos templates
- `lib/import/templates/seed-templates.ts` - Função de seed

**Usado por**:
- ✅ `app/dev/seed-templates/page.tsx` - Página de desenvolvimento

**Formato**:
```typescript
export const NUBANK_TEMPLATE: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'> = {
  nome: 'Nubank - Extrato de Conta',
  tipo_arquivo: 'csv',
  separador: ',',
  encoding: 'utf-8',
  pular_linhas: 1,
  mapeamento_colunas: JSON.stringify({
    data: 0,
    descricao: 2,
    valor: 3,
  }),
  formato_data: 'yyyy-MM-dd',
  separador_decimal: '.',
  contador_uso: 0,
};
```

**Características**:
- 🔮 **Stateful**: Persiste no IndexedDB via Dexie
- 🔮 **Editável**: Usuário pode modificar via UI (futuro)
- 🔮 **Rastreável**: Contador de uso, timestamps
- 🔮 **Completo**: Metadata adicional (formato_data, separador_decimal, etc.)

**Funções**:
```typescript
seedBankTemplates(): Promise<number>
// Faz seed dos templates no banco Dexie
```

---

## 🤔 Por que Dois Sistemas?

### Decisão Arquitetural

Inicialmente planejamos **apenas** o sistema de seed (Dexie), mas durante implementação da v0.5 percebemos:

**Problema**:
- Seed no Dexie requer inicialização do DB
- APIs precisam de templates **antes** do DB estar pronto
- Seed é assíncrono (pode falhar)
- Usuário pode deletar templates acidentalmente

**Solução**:
- Sistema simplificado (`index.ts`) para **uso imediato** nas APIs
- Sistema de seed para **funcionalidade futura** (gerenciamento via UI)

**Trade-off aceitável**:
- ✅ Redundância de dados (templates em 2 lugares)
- ✅ Mas: Sistema sempre funciona, mesmo sem DB
- ✅ Mas: APIs são stateless e rápidas

---

## 🎯 Quando Usar Cada Um

### Use `index.ts` (Sistema Simplificado)

**Cenários**:
- ✅ APIs precisam de templates
- ✅ Código que não acessa Dexie
- ✅ Testes unitários (mock fácil)
- ✅ Operações rápidas

**Exemplo**:
```typescript
import { getTemplate } from '@/lib/import/templates';

const template = getTemplate('bradesco');
if (template) {
  console.log(template.separador); // ';'
}
```

---

### Use `bank-templates.ts` + `seed-templates.ts` (Sistema de Seed)

**Cenários**:
- ✅ Seed inicial do banco Dexie
- ✅ Página de gerenciamento de templates (futuro)
- ✅ Quando precisar de metadata completa
- ✅ Rastreamento de uso (contador_uso)

**Exemplo**:
```typescript
import { seedBankTemplates } from '@/lib/import/templates/seed-templates';

// Em página de desenvolvimento ou seed inicial
const inserted = await seedBankTemplates();
console.log(`${inserted} templates inseridos no Dexie`);
```

---

## 🔄 Sincronização

**Problema**: Como manter os 2 sistemas sincronizados?

**Solução Atual**:
- Sistema simplificado é **fonte da verdade**
- Seed é feito **manualmente** quando necessário
- Não há sincronização automática

**Solução Futura** (se necessário):
1. Converter `bank-templates.ts` para importar de `index.ts`
2. Ou: Criar script de geração automática
3. Ou: Mesclar ambos em sistema híbrido

---

## 📊 Status Atual

| Sistema | Status | Usado Por | Templates |
|---------|--------|-----------|-----------|
| `index.ts` | ✅ Em Produção | 3 APIs | 7 bancos |
| `bank-templates.ts` | 🔮 Preparado | Dev page | 7 bancos |
| `seed-templates.ts` | 🔮 Preparado | Dev page | Função de seed |

---

## 🚀 Roadmap

### v0.5 (Atual) ✅
- [x] Sistema simplificado funcional
- [x] 7 templates hardcoded
- [x] APIs integradas

### v0.6 (Futuro) 🔮
- [ ] UI de gerenciamento de templates
- [ ] CRUD de templates customizados
- [ ] Importar/exportar templates
- [ ] Rastreamento de uso
- [ ] Templates comunitários

### v1.0 (Visão) 🌟
- [ ] Marketplace de templates
- [ ] Auto-detecção de banco por padrão
- [ ] Templates gerados por IA
- [ ] Validação automática de templates

---

## 📝 Notas para Desenvolvedores

### Adicionando um Novo Template

**Opção 1: Apenas para APIs (Rápido)**

1. Edite `lib/import/templates/index.ts`
2. Adicione novo template ao objeto `TEMPLATES`
3. Teste com `/api/import/templates`

**Opção 2: Completo (Seed + APIs)**

1. Edite `lib/import/templates/bank-templates.ts`
2. Adicione novo template (ex: `C6_BANK_TEMPLATE`)
3. Adicione ao array `ALL_BANK_TEMPLATES`
4. Edite `lib/import/templates/index.ts` e adicione versão simplificada
5. Execute seed: acesse `/dev/seed-templates`

---

## ❓ FAQ

### Por que não usar apenas Dexie?

**R**: APIs precisam ser stateless e rápidas. Acessar Dexie adiciona latência e dependência de DB estar inicializado.

### Por que não usar apenas o sistema simplificado?

**R**: No futuro, queremos permitir usuários criarem templates customizados via UI. Isso requer persistência no banco.

### Como sei qual usar?

**R**: Se você está em uma API ou código stateless → `index.ts`. Se está fazendo seed ou gerenciamento de estado → `bank-templates.ts`.

### Os templates estão duplicados?

**R**: Sim, intencionalmente. É um trade-off entre simplicidade (APIs) e flexibilidade (UI futura).

---

**Última atualização**: 05 de Novembro de 2025
**Dúvidas**: Consulte Agent DATA
