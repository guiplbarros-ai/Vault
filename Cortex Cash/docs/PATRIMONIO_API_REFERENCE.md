# API Reference - Patrimônio & Investimentos

## InvestimentoService API

### Import
```typescript
import { investimentoService } from '@/lib/services/investimento.service';
```

---

### `listInvestimentos(options?)`
Lista todos os investimentos com filtros, ordenação e paginação.

**Parâmetros**:
```typescript
{
  status?: string;                    // 'ativo' | 'resgatado' | 'vencido'
  tipo?: TipoInvestimento;            // Filtro por tipo
  instituicao_id?: string;            // Filtro por instituição
  limit?: number;                     // Limite de resultados
  offset?: number;                    // Offset para paginação
  sortBy?: 'nome' | 'valor_atual' | 'data_aplicacao' | 'rentabilidade';
  sortOrder?: 'asc' | 'desc';
}
```

**Retorno**: `Promise<Investimento[]>`

**Exemplo**:
```typescript
const investimentos = await investimentoService.listInvestimentos({
  tipo: 'renda_variavel',
  status: 'ativo',
  sortBy: 'rentabilidade',
  sortOrder: 'desc',
  limit: 20
});
```

---

### `getInvestimentoById(id)`
Busca um investimento por ID.

**Parâmetros**:
- `id: string` - UUID do investimento

**Retorno**: `Promise<Investimento | null>`

**Exemplo**:
```typescript
const investimento = await investimentoService.getInvestimentoById('uuid-123');
if (investimento) {
  console.log(investimento.nome);
}
```

---

### `getInvestimentoComRelacoes(id)`
Busca investimento com todas as relações populadas (instituição, conta origem, histórico).

**Parâmetros**:
- `id: string` - UUID do investimento

**Retorno**: `Promise<InvestimentoComRelacoes | null>`

**Exemplo**:
```typescript
const investimento = await investimentoService.getInvestimentoComRelacoes('uuid-123');
if (investimento) {
  console.log('Instituição:', investimento.instituicao.nome);
  console.log('Histórico:', investimento.historico.length, 'movimentações');
}
```

---

### `createInvestimento(data)`
Cria um novo investimento com validação Zod.

**Parâmetros**: `CreateInvestimentoDTO`
```typescript
{
  instituicao_id: string;             // Obrigatório
  nome: string;                       // 1-100 caracteres
  tipo: TipoInvestimento;             // Obrigatório
  ticker?: string;                    // Opcional, max 20 chars
  valor_aplicado: number;             // Não-negativo
  valor_atual: number;                // Não-negativo
  quantidade?: number;                // Opcional
  data_aplicacao: Date | string;      // Obrigatório
  data_vencimento?: Date | string;    // Opcional
  taxa_juros?: number;                // % ao ano
  rentabilidade_contratada?: number;  // % (ex: 100 para CDI 100%)
  indexador?: string;                 // 'CDI', 'IPCA', etc
  conta_origem_id?: string;           // UUID da conta origem
  observacoes?: string;               // Max 500 chars
  cor?: string;                       // Hex format (#RRGGBB)
}
```

**Retorno**: `Promise<Investimento>`

**Exemplo**:
```typescript
try {
  const investimento = await investimentoService.createInvestimento({
    instituicao_id: 'uuid-banco',
    nome: 'CDB Banco XYZ 123% CDI',
    tipo: 'renda_fixa',
    valor_aplicado: 50000,
    valor_atual: 50000,
    data_aplicacao: new Date(),
    taxa_juros: 13.5,
    rentabilidade_contratada: 123,
    indexador: 'CDI',
    observacoes: 'Vencimento em 2 anos'
  });
  console.log('Investimento criado:', investimento.id);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Erro de validação:', error.details);
  }
}
```

---

### `updateInvestimento(id, data)`
Atualiza um investimento existente.

**Parâmetros**:
- `id: string` - UUID do investimento
- `data: Partial<CreateInvestimentoDTO>` - Dados para atualizar

**Retorno**: `Promise<Investimento>`

**Exemplo**:
```typescript
const updated = await investimentoService.updateInvestimento('uuid-123', {
  valor_atual: 52500,
  observacoes: 'Atualizado após rendimento mensal'
});
```

---

### `deleteInvestimento(id)`
Soft delete - marca investimento como "resgatado".

**Parâmetros**:
- `id: string` - UUID do investimento

**Retorno**: `Promise<void>`

**Exemplo**:
```typescript
await investimentoService.deleteInvestimento('uuid-123');
```

---

### `hardDeleteInvestimento(id)`
Delete permanente - remove investimento e todo seu histórico.

**Parâmetros**:
- `id: string` - UUID do investimento

**Retorno**: `Promise<void>`

**Exemplo**:
```typescript
await investimentoService.hardDeleteInvestimento('uuid-123');
```

---

### `createHistoricoInvestimento(data)`
Registra uma movimentação no histórico do investimento.

**Parâmetros**: `CreateHistoricoInvestimentoDTO`
```typescript
{
  investimento_id: string;                    // Obrigatório
  data: Date | string;                        // Data da movimentação
  valor: number;                              // Valor da movimentação
  quantidade?: number;                        // Quantidade (ações, cotas)
  tipo_movimentacao: 'aporte' | 'resgate' | 'rendimento' | 'ajuste';
  observacoes?: string;                       // Max 500 chars
}
```

**Retorno**: `Promise<HistoricoInvestimento>`

**Exemplo**:
```typescript
await investimentoService.createHistoricoInvestimento({
  investimento_id: 'uuid-123',
  data: new Date(),
  valor: 5000,
  tipo_movimentacao: 'aporte',
  observacoes: 'Aporte mensal'
});
```

---

### `getHistoricoInvestimento(investimento_id)`
Lista histórico de um investimento ordenado por data (descendente).

**Parâmetros**:
- `investimento_id: string` - UUID do investimento

**Retorno**: `Promise<HistoricoInvestimento[]>`

**Exemplo**:
```typescript
const historico = await investimentoService.getHistoricoInvestimento('uuid-123');
historico.forEach(h => {
  console.log(`${h.tipo_movimentacao}: R$ ${h.valor} em ${h.data}`);
});
```

---

### `calcularRentabilidade(id)`
Calcula rentabilidade de um investimento.

**Parâmetros**:
- `id: string` - UUID do investimento

**Retorno**:
```typescript
Promise<{
  rentabilidade: number;              // Valor absoluto (R$)
  rentabilidade_percentual: number;   // Percentual (%)
}>
```

**Exemplo**:
```typescript
const { rentabilidade, rentabilidade_percentual } =
  await investimentoService.calcularRentabilidade('uuid-123');
console.log(`Ganho: R$ ${rentabilidade.toFixed(2)} (${rentabilidade_percentual.toFixed(2)}%)`);
```

---

### `getInvestimentosPorTipo(tipo)`
Busca todos os investimentos de um tipo específico.

**Parâmetros**:
- `tipo: TipoInvestimento`

**Retorno**: `Promise<Investimento[]>`

**Exemplo**:
```typescript
const acoes = await investimentoService.getInvestimentosPorTipo('renda_variavel');
```

---

### `getInvestimentosAtivos()`
Busca apenas investimentos com status "ativo".

**Retorno**: `Promise<Investimento[]>`

**Exemplo**:
```typescript
const ativos = await investimentoService.getInvestimentosAtivos();
```

---

### `getValorTotalInvestido()`
Calcula soma de valor_aplicado de todos os investimentos ativos.

**Retorno**: `Promise<number>`

**Exemplo**:
```typescript
const totalInvestido = await investimentoService.getValorTotalInvestido();
console.log(`Total investido: R$ ${totalInvestido.toFixed(2)}`);
```

---

### `getValorTotalAtual()`
Calcula soma de valor_atual de todos os investimentos ativos.

**Retorno**: `Promise<number>`

**Exemplo**:
```typescript
const totalAtual = await investimentoService.getValorTotalAtual();
console.log(`Valor atual: R$ ${totalAtual.toFixed(2)}`);
```

---

## PatrimonioService API

### Import
```typescript
import { patrimonioService } from '@/lib/services/patrimonio.service';
```

---

### `getPatrimonioTotal()`
Calcula patrimônio total consolidado (contas + investimentos).

**Retorno**: `Promise<PatrimonioTotal>`
```typescript
{
  saldo_contas: number;                 // Soma de todas as contas ativas
  saldo_investimentos: number;          // Soma de todos os investimentos ativos
  patrimonio_total: number;             // saldo_contas + saldo_investimentos
  variacao_mes: number;                 // Diferença para o mês anterior (TODO)
  variacao_mes_percentual: number;      // Percentual de variação (TODO)
  rentabilidade_investimentos: number;  // % de rentabilidade dos investimentos
  ultima_atualizacao: Date;             // Data/hora do cálculo
}
```

**Exemplo**:
```typescript
const patrimonio = await patrimonioService.getPatrimonioTotal();
console.log(`Patrimônio Total: R$ ${patrimonio.patrimonio_total.toLocaleString('pt-BR')}`);
console.log(`Rentabilidade: ${patrimonio.rentabilidade_investimentos.toFixed(2)}%`);
```

---

### `getPatrimonioPorTipo()`
Agrupa investimentos por tipo com análise de rentabilidade.

**Retorno**: `Promise<PatrimonioPorTipo[]>`
```typescript
[
  {
    tipo: TipoInvestimento;
    valor_aplicado: number;
    valor_atual: number;
    rentabilidade: number;                // Valor absoluto (R$)
    rentabilidade_percentual: number;     // Percentual (%)
    quantidade_ativos: number;            // Quantidade de investimentos deste tipo
    investimentos: Investimento[];        // Lista completa
  }
]
```

**Exemplo**:
```typescript
const porTipo = await patrimonioService.getPatrimonioPorTipo();
porTipo.forEach(grupo => {
  console.log(`\n${grupo.tipo}:`);
  console.log(`  Investido: R$ ${grupo.valor_aplicado.toFixed(2)}`);
  console.log(`  Atual: R$ ${grupo.valor_atual.toFixed(2)}`);
  console.log(`  Rentabilidade: ${grupo.rentabilidade_percentual.toFixed(2)}%`);
  console.log(`  Ativos: ${grupo.quantidade_ativos}`);
});
```

---

### `getPatrimonioPorInstituicao()`
Agrupa contas e investimentos por instituição.

**Retorno**: `Promise<PatrimonioPorInstituicao[]>`
```typescript
[
  {
    instituicao: Instituicao;
    valor_contas: number;
    valor_investimentos: number;
    valor_total: number;
    percentual_patrimonio: number;    // % do patrimônio total
    contas: Conta[];
    investimentos: Investimento[];
  }
]
```

**Exemplo**:
```typescript
const porInstituicao = await patrimonioService.getPatrimonioPorInstituicao();
porInstituicao.forEach(item => {
  console.log(`\n${item.instituicao.nome}:`);
  console.log(`  Contas: R$ ${item.valor_contas.toFixed(2)}`);
  console.log(`  Investimentos: R$ ${item.valor_investimentos.toFixed(2)}`);
  console.log(`  Total: R$ ${item.valor_total.toFixed(2)} (${item.percentual_patrimonio.toFixed(1)}%)`);
});
```

---

### `getRentabilidadeHistorico()`
Retorna série temporal de rentabilidade (snapshot atual).

**Retorno**: `Promise<RentabilidadeHistorico[]>`
```typescript
[
  {
    data: Date;
    valor_aplicado: number;
    valor_atual: number;
    rentabilidade: number;
    rentabilidade_percentual: number;
  }
]
```

**Exemplo**:
```typescript
const historico = await patrimonioService.getRentabilidadeHistorico();
historico.forEach(ponto => {
  console.log(`${ponto.data.toLocaleDateString()}: ${ponto.rentabilidade_percentual.toFixed(2)}%`);
});
```

---

### `getDiversificacao()`
Análise completa de diversificação do patrimônio.

**Retorno**:
```typescript
Promise<{
  por_tipo_conta: Array<{
    tipo: string;
    valor: number;
    percentual: number;
  }>;
  por_tipo_investimento: Array<{
    tipo: string;
    valor: number;
    percentual: number;
  }>;
  contas_vs_investimentos: {
    contas: number;
    investimentos: number;
    percentual_contas: number;
    percentual_investimentos: number;
  };
}>
```

**Exemplo**:
```typescript
const div = await patrimonioService.getDiversificacao();

console.log('Contas vs Investimentos:');
console.log(`  Contas: ${div.contas_vs_investimentos.percentual_contas.toFixed(1)}%`);
console.log(`  Investimentos: ${div.contas_vs_investimentos.percentual_investimentos.toFixed(1)}%`);

console.log('\nPor tipo de conta:');
div.por_tipo_conta.forEach(item => {
  console.log(`  ${item.tipo}: ${item.percentual.toFixed(1)}%`);
});

console.log('\nPor tipo de investimento:');
div.por_tipo_investimento.forEach(item => {
  console.log(`  ${item.tipo}: ${item.percentual.toFixed(1)}%`);
});
```

---

### `getResumoPatrimonio()`
Resumo otimizado para dashboard.

**Retorno**:
```typescript
Promise<{
  patrimonio_total: number;
  contas: number;
  investimentos: number;
  rentabilidade_total: number;
  rentabilidade_percentual: number;
  maior_investimento: { nome: string; valor: number } | null;
  maior_conta: { nome: string; valor: number } | null;
}>
```

**Exemplo**:
```typescript
const resumo = await patrimonioService.getResumoPatrimonio();

console.log('Resumo do Patrimônio:');
console.log(`Total: R$ ${resumo.patrimonio_total.toLocaleString('pt-BR')}`);
console.log(`Contas: R$ ${resumo.contas.toLocaleString('pt-BR')}`);
console.log(`Investimentos: R$ ${resumo.investimentos.toLocaleString('pt-BR')}`);
console.log(`Rentabilidade: ${resumo.rentabilidade_percentual.toFixed(2)}%`);

if (resumo.maior_investimento) {
  console.log(`Maior Investimento: ${resumo.maior_investimento.nome} (R$ ${resumo.maior_investimento.valor.toFixed(2)})`);
}
```

---

## Error Handling

Todos os métodos podem lançar as seguintes exceções:

### `ValidationError`
Lançado quando validação Zod falha.
```typescript
import { ValidationError } from '@/lib/errors';

try {
  await investimentoService.createInvestimento(data);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Erros de validação:', error.details);
    // error.details é um array de strings com cada erro
  }
}
```

### `NotFoundError`
Lançado quando recurso não é encontrado.
```typescript
import { NotFoundError } from '@/lib/errors';

try {
  await investimentoService.getInvestimentoById('id-invalido');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error(`Não encontrado: ${error.message}`);
  }
}
```

### `DatabaseError`
Lançado em erros de operação de banco.
```typescript
import { DatabaseError } from '@/lib/errors';

try {
  await investimentoService.updateInvestimento(id, data);
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error('Erro de banco:', error.message);
    if (error.originalError) {
      console.error('Erro original:', error.originalError);
    }
  }
}
```

---

## Types Reference

### TipoInvestimento
```typescript
type TipoInvestimento =
  | 'renda_fixa'          // CDB, LCI, LCA, Tesouro Direto
  | 'renda_variavel'      // Ações, FIIs
  | 'fundo_investimento'  // Fundos diversos
  | 'previdencia'         // PGBL, VGBL
  | 'criptomoeda'         // Bitcoin, Ethereum, etc
  | 'outro';
```

### StatusInvestimento
```typescript
type StatusInvestimento = 'ativo' | 'resgatado' | 'vencido';
```

### TipoMovimentacao
```typescript
type TipoMovimentacao = 'aporte' | 'resgate' | 'rendimento' | 'ajuste';
```

---

## Complete Example: Investment Dashboard

```typescript
import { investimentoService } from '@/lib/services/investimento.service';
import { patrimonioService } from '@/lib/services/patrimonio.service';

async function loadDashboard() {
  // 1. Patrimônio total
  const patrimonio = await patrimonioService.getPatrimonioTotal();

  // 2. Investimentos ativos
  const investimentos = await investimentoService.listInvestimentos({
    status: 'ativo',
    sortBy: 'rentabilidade',
    sortOrder: 'desc'
  });

  // 3. Análise por tipo
  const porTipo = await patrimonioService.getPatrimonioPorTipo();

  // 4. Diversificação
  const diversificacao = await patrimonioService.getDiversificacao();

  // 5. Resumo para widgets
  const resumo = await patrimonioService.getResumoPatrimonio();

  return {
    patrimonio,
    investimentos,
    porTipo,
    diversificacao,
    resumo
  };
}

// Usage in component
const dashboard = await loadDashboard();
console.log('Dashboard loaded:', dashboard);
```

---

**Documento gerado automaticamente pelo Agent CORE**
**Última atualização**: 2025-01-28
