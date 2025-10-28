# Guia de Exemplos Dexie.js - Cortex Cash

**Para**: Agent IMPORT, Agent UI, Agent FINANCE
**De**: Agent CORE
**Data**: 28 de Outubro de 2025

---

## Contexto da Migração

O projeto foi **migrado de sql.js para Dexie.js** devido a incompatibilidades do sql.js com Next.js 16 + Turbopack.

- **Antes**: SQL queries + Drizzle ORM
- **Agora**: Dexie.js API (wrapper do IndexedDB nativo do browser)

---

## 1. Setup Básico

### Importar o banco de dados

```typescript
import { getDB } from '@/lib/db/client';

// Em qualquer componente ou service
const db = getDB();
```

### Acessar tabelas

```typescript
// Cada tabela é acessível como propriedade do db
db.instituicoes
db.contas
db.categorias
db.transacoes
db.templates_importacao
db.regras_classificacao
db.logs_ia
db.cartoes_config
db.faturas
db.faturas_lancamentos
db.centros_custo
db.orcamentos
```

---

## 2. Operações CRUD Básicas

### CREATE - Adicionar registros

```typescript
// Adicionar um registro
const categoria: Categoria = {
  id: crypto.randomUUID(),
  nome: 'Alimentação',
  tipo: 'despesa',
  grupo: null,
  icone: '🍔',
  cor: '#FF5733',
  ordem: 1,
  ativa: true,
  created_at: new Date(),
  updated_at: new Date(),
};

await db.categorias.add(categoria);
```

```typescript
// Adicionar múltiplos registros de uma vez (bulk)
const categorias = [
  { id: '1', nome: 'Categoria 1', tipo: 'despesa', ... },
  { id: '2', nome: 'Categoria 2', tipo: 'receita', ... },
];

await db.categorias.bulkAdd(categorias);
```

### READ - Buscar registros

```typescript
// Buscar por ID
const categoria = await db.categorias.get('uuid-aqui');
// Retorna: Categoria | undefined

// Buscar todos
const todasCategorias = await db.categorias.toArray();
// Retorna: Categoria[]

// Contar registros
const total = await db.categorias.count();
// Retorna: number
```

### UPDATE - Atualizar registros

```typescript
// Atualizar campos específicos
await db.categorias.update('uuid-aqui', {
  nome: 'Novo Nome',
  updated_at: new Date(),
});

// Atualizar ou inserir (upsert)
await db.categorias.put({
  id: 'uuid-aqui',
  nome: 'Categoria',
  // ... outros campos obrigatórios
});
```

### DELETE - Deletar registros

```typescript
// Deletar por ID
await db.categorias.delete('uuid-aqui');

// Deletar múltiplos
await db.categorias.bulkDelete(['uuid-1', 'uuid-2', 'uuid-3']);

// Soft delete (recomendado para categorias, contas)
await db.categorias.update('uuid-aqui', {
  ativa: false,
  updated_at: new Date(),
});
```

---

## 3. Queries e Filtros

### WHERE - Filtrar por campo indexado

**IMPORTANTE**: Apenas campos definidos no schema podem usar `.where()`

Ver schema completo em `lib/db/client.ts`:

```typescript
categorias: 'id, nome, tipo, grupo, ativa, ordem'
transacoes: 'id, conta_id, categoria_id, data, tipo, hash, transferencia_id'
contas: 'id, instituicao_id, nome, tipo, ativa'
```

#### Exemplos de WHERE

```typescript
// Buscar por campo único
const ativas = await db.categorias
  .where('ativa')
  .equals(true)
  .toArray();

// Buscar por múltiplos valores (OR)
const tipos = await db.categorias
  .where('tipo')
  .anyOf(['despesa', 'receita'])
  .toArray();

// Buscar transações de uma conta
const transacoes = await db.transacoes
  .where('conta_id')
  .equals('uuid-da-conta')
  .toArray();

// Buscar com range de datas (campo indexado: 'data')
const dataInicio = new Date('2025-01-01');
const dataFim = new Date('2025-12-31');

const transacoes2025 = await db.transacoes
  .where('data')
  .between(dataInicio, dataFim, true, true) // inclusive nos extremos
  .toArray();
```

### Filtros em memória (campos não-indexados)

Se o campo **não está indexado**, use `.toArray()` primeiro e depois `.filter()`:

```typescript
// Filtrar por descrição (não indexado)
const transacoes = await db.transacoes.toArray();
const comPalavra = transacoes.filter((t) =>
  t.descricao.toLowerCase().includes('mercado')
);

// Combinar filtro indexado + filtro em memória
const transacoesConta = await db.transacoes
  .where('conta_id')
  .equals('uuid-da-conta')
  .toArray();

const comDescricao = transacoesConta.filter((t) =>
  t.descricao.toLowerCase().includes('aluguel')
);
```

---

## 4. Ordenação e Paginação

### Ordenar resultados

```typescript
// Dexie não tem .orderBy() universal
// Solução: buscar tudo e ordenar em memória

const categorias = await db.categorias.toArray();

// Ordenar por ordem (crescente)
categorias.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

// Ordenar por data (decrescente)
transacoes.sort((a, b) => {
  const dateA = a.data instanceof Date ? a.data : new Date(a.data);
  const dateB = b.data instanceof Date ? b.data : new Date(b.data);
  return dateB.getTime() - dateA.getTime();
});
```

### Paginação

```typescript
// Buscar com limit e offset
const page = 2;
const pageSize = 10;

const transacoes = await db.transacoes
  .orderBy('data') // Se 'data' está indexado
  .reverse() // Mais recente primeiro
  .offset(page * pageSize)
  .limit(pageSize)
  .toArray();

// Ou em memória (mais flexível)
const todasTransacoes = await db.transacoes.toArray();
// Ordenar como quiser
todasTransacoes.sort(...);
// Paginar
const paginadas = todasTransacoes.slice(page * pageSize, (page + 1) * pageSize);
```

---

## 5. JOINs (Alternativas)

**Dexie não tem JOINs nativos**. Use buscas separadas e combine em memória.

### Exemplo: Transações com Categoria e Conta

```typescript
async function getTransacoesComRelacionamentos(contaId: string) {
  // 1. Buscar transações
  const transacoes = await db.transacoes
    .where('conta_id')
    .equals(contaId)
    .toArray();

  // 2. Buscar IDs únicos de categorias
  const categoriaIds = [...new Set(transacoes.map((t) => t.categoria_id).filter(Boolean))];

  // 3. Buscar categorias de uma vez
  const categorias = await db.categorias.bulkGet(categoriaIds as string[]);
  const categoriasMap = new Map(categorias.map((c) => [c!.id, c!]));

  // 4. Buscar conta
  const conta = await db.contas.get(contaId);

  // 5. Combinar dados
  const transacoesComDados = transacoes.map((t) => ({
    ...t,
    categoria: t.categoria_id ? categoriasMap.get(t.categoria_id) : null,
    conta,
  }));

  return transacoesComDados;
}
```

### Exemplo: Contas com Instituição

```typescript
async function getContasComInstituicao() {
  // 1. Buscar todas as contas ativas
  const contas = await db.contas.where('ativa').equals(true).toArray();

  // 2. Buscar instituições únicas
  const instituicaoIds = [...new Set(contas.map((c) => c.instituicao_id))];
  const instituicoes = await db.instituicoes.bulkGet(instituicaoIds);
  const instituicoesMap = new Map(instituicoes.map((i) => [i!.id, i!]));

  // 3. Combinar
  const contasComInstituicao = contas.map((c) => ({
    ...c,
    instituicao: instituicoesMap.get(c.instituicao_id),
  }));

  return contasComInstituicao;
}
```

---

## 6. Agregações e Cálculos

### Somar valores (SUM)

```typescript
// Calcular saldo de uma conta
async function getSaldoConta(contaId: string): Promise<number> {
  const transacoes = await db.transacoes
    .where('conta_id')
    .equals(contaId)
    .toArray();

  return transacoes.reduce((saldo, t) => {
    if (t.tipo === 'receita') {
      return saldo + t.valor;
    } else if (t.tipo === 'despesa') {
      return saldo - t.valor;
    }
    return saldo;
  }, 0);
}
```

### Agrupar por campo (GROUP BY)

```typescript
// Somar despesas por categoria
async function getDespesasPorCategoria(dataInicio: Date, dataFim: Date) {
  const transacoes = await db.transacoes
    .where('tipo')
    .equals('despesa')
    .toArray();

  // Filtrar por data em memória
  const filtradas = transacoes.filter((t) => {
    const data = t.data instanceof Date ? t.data : new Date(t.data);
    return data >= dataInicio && data <= dataFim;
  });

  // Agrupar por categoria_id
  const porCategoria = filtradas.reduce((acc, t) => {
    const key = t.categoria_id || 'sem-categoria';
    acc[key] = (acc[key] || 0) + t.valor;
    return acc;
  }, {} as Record<string, number>);

  return porCategoria;
}
```

### Contar por tipo (COUNT)

```typescript
// Contar transações por tipo
async function getContagemPorTipo() {
  const transacoes = await db.transacoes.toArray();

  const contagem = transacoes.reduce((acc, t) => {
    acc[t.tipo] = (acc[t.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return contagem;
  // Ex: { receita: 120, despesa: 450, transferencia: 30 }
}
```

---

## 7. Transações (Atomicidade)

Use `db.transaction()` para operações que devem ser atômicas:

```typescript
// Transferência entre contas (exemplo conceitual)
async function transferirEntreContas(
  contaOrigemId: string,
  contaDestinoId: string,
  valor: number,
  descricao: string
) {
  const transferenciaId = crypto.randomUUID();

  await db.transaction('rw', db.transacoes, async () => {
    // 1. Criar transação de saída
    const transacaoSaida: Transacao = {
      id: crypto.randomUUID(),
      conta_id: contaOrigemId,
      tipo: 'transferencia',
      valor: -valor,
      descricao: `Transferência para conta destino: ${descricao}`,
      data: new Date(),
      transferencia_id: transferenciaId,
      created_at: new Date(),
      updated_at: new Date(),
      // ... outros campos
    };

    // 2. Criar transação de entrada
    const transacaoEntrada: Transacao = {
      id: crypto.randomUUID(),
      conta_id: contaDestinoId,
      tipo: 'transferencia',
      valor: valor,
      descricao: `Transferência de conta origem: ${descricao}`,
      data: new Date(),
      transferencia_id: transferenciaId,
      created_at: new Date(),
      updated_at: new Date(),
      // ... outros campos
    };

    // 3. Inserir ambas (se uma falhar, ambas são revertidas)
    await db.transacoes.bulkAdd([transacaoSaida, transacaoEntrada]);
  });
}
```

---

## 8. Buscas Complexas

### Busca por texto (autocomplete)

```typescript
async function searchCategorias(termo: string): Promise<Categoria[]> {
  // Buscar todas ativas
  const categorias = await db.categorias
    .where('ativa')
    .equals(true)
    .toArray();

  // Filtrar por termo em memória
  const termoLower = termo.toLowerCase();
  const resultados = categorias.filter((c) =>
    c.nome.toLowerCase().includes(termoLower)
  );

  // Ordenar por relevância (começando com o termo = prioridade)
  resultados.sort((a, b) => {
    const aStarts = a.nome.toLowerCase().startsWith(termoLower);
    const bStarts = b.nome.toLowerCase().startsWith(termoLower);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.nome.localeCompare(b.nome);
  });

  return resultados;
}
```

### Filtros múltiplos

```typescript
async function getTransacoesFiltradas(filters: {
  contaId?: string;
  categoriaId?: string;
  tipo?: string;
  dataInicio?: Date;
  dataFim?: Date;
  busca?: string;
}) {
  // 1. Começar com filtro indexado (mais eficiente)
  let transacoes: Transacao[];

  if (filters.contaId) {
    transacoes = await db.transacoes
      .where('conta_id')
      .equals(filters.contaId)
      .toArray();
  } else if (filters.tipo) {
    transacoes = await db.transacoes
      .where('tipo')
      .equals(filters.tipo)
      .toArray();
  } else {
    transacoes = await db.transacoes.toArray();
  }

  // 2. Aplicar filtros em memória
  if (filters.categoriaId) {
    transacoes = transacoes.filter((t) => t.categoria_id === filters.categoriaId);
  }

  if (filters.dataInicio) {
    const dataInicioTime = filters.dataInicio.getTime();
    transacoes = transacoes.filter((t) => {
      const tData = t.data instanceof Date ? t.data : new Date(t.data);
      return tData.getTime() >= dataInicioTime;
    });
  }

  if (filters.dataFim) {
    const dataFimTime = filters.dataFim.getTime();
    transacoes = transacoes.filter((t) => {
      const tData = t.data instanceof Date ? t.data : new Date(t.data);
      return tData.getTime() <= dataFimTime;
    });
  }

  if (filters.busca) {
    const buscaLower = filters.busca.toLowerCase();
    transacoes = transacoes.filter((t) =>
      t.descricao.toLowerCase().includes(buscaLower)
    );
  }

  return transacoes;
}
```

---

## 9. Padrões Úteis

### Soft Delete

```typescript
// Desativar ao invés de deletar
async function deleteCategoria(id: string): Promise<void> {
  await db.categorias.update(id, {
    ativa: false,
    updated_at: new Date(),
  });
}

// Listar apenas ativas
async function listCategoriasAtivas(): Promise<Categoria[]> {
  return db.categorias.where('ativa').equals(true).toArray();
}
```

### Timestamps automáticos

```typescript
async function updateCategoria(id: string, data: Partial<Categoria>) {
  await db.categorias.update(id, {
    ...data,
    updated_at: new Date(), // Sempre atualizar timestamp
  });
}
```

### Verificar existência

```typescript
// Verificar se registro existe
const existe = await db.categorias.get(id);
if (!existe) {
  throw new Error(`Categoria ${id} não encontrada`);
}
```

### Dedupe por hash

```typescript
import { generateHash } from '@/lib/utils/format';

async function createTransacao(data: CreateTransacaoDTO) {
  // Gerar hash para dedupe
  const hashInput = `${data.conta_id}-${data.data}-${data.descricao}-${data.valor}`;
  const hash = await generateHash(hashInput);

  // Verificar se já existe
  const existente = await db.transacoes.where('hash').equals(hash).first();
  if (existente) {
    throw new Error('Transação duplicada');
  }

  // Criar nova
  const transacao: Transacao = {
    id: crypto.randomUUID(),
    ...data,
    hash,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db.transacoes.add(transacao);
  return transacao;
}
```

---

## 10. Exemplos de Serviços Implementados

### Ver código completo em:

1. **`lib/services/transacao.service.ts`** - CRUD completo + filtros + bulk operations
2. **`lib/services/conta.service.ts`** - CRUD + cálculo de saldo
3. **`lib/services/categoria.service.ts`** - CRUD + busca + filtros

### Padrão de Service

```typescript
import { getDB } from '@/lib/db/client';
import type { MinhaEntidade } from '@/lib/types';

export class MeuService {
  async list(): Promise<MinhaEntidade[]> {
    const db = getDB();
    return db.minhaTabela.toArray();
  }

  async getById(id: string): Promise<MinhaEntidade | null> {
    const db = getDB();
    const entity = await db.minhaTabela.get(id);
    return entity || null;
  }

  async create(data: Omit<MinhaEntidade, 'id' | 'created_at' | 'updated_at'>): Promise<MinhaEntidade> {
    const db = getDB();
    const entity: MinhaEntidade = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    await db.minhaTabela.add(entity);
    return entity;
  }

  async update(id: string, data: Partial<MinhaEntidade>): Promise<MinhaEntidade> {
    const db = getDB();
    const existing = await db.minhaTabela.get(id);
    if (!existing) {
      throw new Error(`Entidade ${id} não encontrada`);
    }
    await db.minhaTabela.update(id, { ...data, updated_at: new Date() });
    const updated = await db.minhaTabela.get(id);
    return updated!;
  }

  async delete(id: string): Promise<void> {
    const db = getDB();
    await db.minhaTabela.delete(id);
  }
}

export const meuService = new MeuService();
```

---

## 11. Debugging e DevTools

### Console logs

```typescript
// Ver dados no console
const categorias = await db.categorias.toArray();
console.log('Categorias:', categorias);

// Ver contagem
const total = await db.categorias.count();
console.log('Total de categorias:', total);
```

### Browser DevTools

1. Abrir DevTools (F12)
2. Ir em **Application** > **IndexedDB** > **cortex-cash**
3. Ver tabelas e dados em tempo real
4. Executar queries no console:

```javascript
// No console do browser
const db = await window.indexedDB.open('cortex-cash');
```

---

## 12. Performance Tips

### Use campos indexados sempre que possível

```typescript
// ✅ BOM - usa campo indexado
await db.transacoes.where('conta_id').equals(id).toArray();

// ❌ RUIM - filtra tudo em memória
const todas = await db.transacoes.toArray();
const filtradas = todas.filter((t) => t.conta_id === id);
```

### Bulk operations são mais rápidas

```typescript
// ✅ BOM - uma operação
await db.categorias.bulkAdd(categorias);

// ❌ RUIM - N operações
for (const cat of categorias) {
  await db.categorias.add(cat);
}
```

### Minimize toArray() calls

```typescript
// ✅ BOM - busca uma vez
const transacoes = await db.transacoes.toArray();
const receitas = transacoes.filter((t) => t.tipo === 'receita');
const despesas = transacoes.filter((t) => t.tipo === 'despesa');

// ❌ RUIM - busca duas vezes
const receitas = await db.transacoes.where('tipo').equals('receita').toArray();
const despesas = await db.transacoes.where('tipo').equals('despesa').toArray();
```

---

## 13. Limitações do Dexie vs SQL

| Feature | SQL/Drizzle | Dexie.js | Solução |
|---------|-------------|----------|---------|
| JOINs | ✅ Nativo | ❌ Não tem | Buscar separado + combinar em memória |
| GROUP BY | ✅ Nativo | ❌ Não tem | `.reduce()` em memória |
| ORDER BY qualquer campo | ✅ Sim | ⚠️ Só campos indexados | Ordenar em memória com `.sort()` |
| LIMIT/OFFSET | ✅ Nativo | ⚠️ Só com .orderBy() | `.slice()` em memória |
| Agregações (SUM, AVG, etc) | ✅ Nativo | ❌ Não tem | `.reduce()` em memória |
| Transações ACID | ✅ Sim | ✅ Sim | `db.transaction()` |
| Full-text search | ✅ Sim | ❌ Não tem | `.filter()` + `.includes()` |

---

## 14. Recursos Adicionais

- **Documentação oficial**: https://dexie.org/
- **Schema do projeto**: `lib/db/client.ts`
- **Seed de dados**: `lib/db/seed.ts`
- **Services de exemplo**: `lib/services/*.service.ts`
- **Provider React**: `app/providers/db-provider.tsx`

---

## Dúvidas ou Problemas?

Se encontrar algum problema ou tiver dúvidas:

1. Verificar se o campo está indexado no schema (`lib/db/client.ts`)
2. Revisar os services já implementados como referência
3. Consultar documentação oficial do Dexie
4. Perguntar ao Agent CORE

---

**Agent CORE** está disponível para ajudar na implementação! 🚀
