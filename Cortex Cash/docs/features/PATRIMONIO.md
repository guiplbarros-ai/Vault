# Patrimônio - Funcionalidade Completa
**Agents: CORE + UI | v0.1**

## 📋 Visão Geral

Sistema completo de gestão de patrimônio, incluindo investimentos e cálculos agregados.

**Status:** ✅ **COMPLETO!** Backend + Frontend funcionando

### Funcionalidades

- ✅ **CRUD de Investimentos**: Gestão completa de ativos
- ✅ **Histórico de Movimentações**: Aportes, resgates, rendimentos
- ✅ **Cálculos de Rentabilidade**: Performance individual e agregada
- ✅ **Patrimônio Consolidado**: Contas + Investimentos
- ✅ **Análise de Diversificação**: Por tipo e instituição
- ✅ **Seed Data**: 9 investimentos de exemplo

---

## Tipos de Investimento

- **Renda Fixa**: CDB, LCI, LCA, Tesouro Direto
- **Renda Variável**: Ações, FIIs
- **Fundos**: Fundos de investimento diversos
- **Previdência**: PGBL, VGBL
- **Criptomoedas**: Bitcoin, Ethereum
- **Outros**: Outros tipos de ativos

---

## Estrutura de Dados

### Investimento

```typescript
interface Investimento {
  id: string;
  nome: string;
  tipo: TipoInvestimento;
  ticker?: string;
  instituicao_id?: string;
  conta_origem_id?: string;
  
  // Valores
  valor_aplicado: number;
  valor_atual: number;
  quantidade?: number;
  
  // Datas
  data_aplicacao: Date;
  data_vencimento?: Date;
  
  // Rentabilidade
  taxa_juros?: number;
  rentabilidade_contratada?: number;
  indexador?: string;
  
  // Meta
  status: 'ativo' | 'resgatado' | 'vencido';
  observacoes?: string;
  tags?: string[];
  
  created_at: Date;
  updated_at?: Date;
}
```

### Histórico de Investimento

```typescript
interface HistoricoInvestimento {
  id: string;
  investimento_id: string;
  tipo_movimentacao: 'aporte' | 'resgate' | 'rendimento' | 'ajuste';
  valor: number;
  quantidade?: number;
  data: Date;
  observacoes?: string;
  created_at: Date;
}
```

---

## Services

### InvestimentoService

**Localização:** `lib/services/investimento.service.ts`

**Métodos principais:**
- `createInvestimento()` - Criar investimento
- `listInvestimentos()` - Listar com filtros e paginação
- `getInvestimentoById()` - Buscar por ID
- `updateInvestimento()` - Atualizar dados
- `deleteInvestimento()` - Soft delete
- `hardDeleteInvestimento()` - Delete permanente
- `addHistorico()` - Adicionar movimentação
- `getHistoricoByInvestimento()` - Histórico completo
- `calcularRentabilidade()` - Calcular performance

### PatrimonioService

**Localização:** `lib/services/patrimonio.service.ts`

**Métodos principais:**
- `getPatrimonioTotal()` - Patrimônio consolidado
- `getPatrimonioPorTipo()` - Agregação por tipo
- `getPatrimonioPorInstituicao()` - Agregação por instituição
- `getAnaliseAtivos()` - Análise de diversificação
- `getDashboardSummary()` - Resumo para dashboard

---

## Frontend

### Página `/wealth`

**Localização:** `app/wealth/page.tsx`

**Seções:**
1. **Overview** - Cards de resumo (patrimônio, investimentos, rentabilidade)
2. **Investimentos** - Lista completa com rentabilidade individual
3. **Análises** - Gráficos de diversificação e performance

**Componentes:**
- `PatrimonioOverview` - Cards de métricas
- `InvestimentosList` - Tabela de investimentos
- Tabs para navegação entre seções

---

## Exemplos de Uso

### Criar Investimento

```typescript
import { investimentoService } from '@/lib/services/investimento.service';

const investimento = await investimentoService.createInvestimento({
  nome: 'Tesouro Selic 2027',
  tipo: 'renda_fixa',
  ticker: 'LFT',
  valor_aplicado: 10000,
  valor_atual: 10500,
  data_aplicacao: new Date(),
  data_vencimento: new Date('2027-01-01'),
  taxa_juros: 13.75,
  indexador: 'Selic',
  status: 'ativo',
});
```

### Registrar Aporte

```typescript
await investimentoService.addHistorico({
  investimento_id: 'inv-123',
  tipo_movimentacao: 'aporte',
  valor: 5000,
  data: new Date(),
  observacoes: 'Aporte mensal',
});
```

### Obter Patrimônio Total

```typescript
import { patrimonioService } from '@/lib/services/patrimonio.service';

const patrimonio = await patrimonioService.getPatrimonioTotal();

// patrimonio = {
//   saldo_contas: 15000,
//   saldo_investimentos: 50000,
//   patrimonio_total: 65000,
//   variacao_mes: 1500,
//   rentabilidade_investimentos: 3.0,
// }
```

### Análise por Tipo

```typescript
const porTipo = await patrimonioService.getPatrimonioPorTipo();

// [
//   {
//     tipo: 'renda_fixa',
//     valor_aplicado: 30000,
//     valor_atual: 31500,
//     rentabilidade_absoluta: 1500,
//     rentabilidade_percentual: 5.0,
//     quantidade: 3,
//   },
//   ...
// ]
```

---

## Cálculos de Rentabilidade

### Individual

```typescript
const rentabilidade = calcularRentabilidade({
  valor_aplicado: 10000,
  valor_atual: 10500,
});

// {
//   absoluta: 500,       // R$ 500,00
//   percentual: 5.0,     // 5%
//   anualizada: 12.5,    // 12.5% ao ano (estimativa)
// }
```

### Agregada (Portfolio)

```typescript
const dashboard = await patrimonioService.getDashboardSummary();

// {
//   patrimonio_total: 65000,
//   total_investido: 50000,
//   rentabilidade_total: 3.0,
//   rentabilidade_mes: 1.2,
//   diversificacao: {
//     tipos: 5,           // 5 tipos diferentes
//     instituicoes: 3,    // 3 instituições
//     score: 0.75,        // 75% diversificado
//   }
// }
```

---

## Seed Data

**9 investimentos de exemplo:**

1. Tesouro Selic 2027 (R$ 10.000)
2. CDB Banco Inter (R$ 15.000)
3. Ações ITSA4 (R$ 5.000)
4. FII HGLG11 (R$ 8.000)
5. Bitcoin (R$ 3.000)
6. LCI Santander (R$ 12.000)
7. Ações PETR4 (R$ 7.000)
8. Fundo Multimercado (R$ 20.000)
9. VGBL Bradesco (R$ 10.000)

**Total:** R$ 90.000

---

## Roadmap Futuro

### v0.2
- [ ] Gráficos de evolução temporal
- [ ] Comparação com benchmarks (CDI, IBOV)
- [ ] Export de relatório PDF

### v1.0
- [ ] Integração com APIs de cotação (B3, CoinGecko)
- [ ] Atualização automática de preços
- [ ] Alertas de vencimento
- [ ] Cálculo de IR (ganho de capital)

### v2.0
- [ ] Proventos (dividendos, JCP)
- [ ] Calendário de pagamentos
- [ ] Simulador de aportes
- [ ] Rebalanceamento de carteira

---

## Referências

- [Data Model](../architecture/DATA_MODEL.md) - Schema completo
- [Services](../../lib/services/) - Código fonte dos services
- [Página Wealth](../../app/wealth/page.tsx) - Interface de usuário

---

**Última atualização:** 05 de Novembro de 2025
**Agents responsáveis:** CORE + UI
