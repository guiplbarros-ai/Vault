# Infraestrutura de Patrimônio - Cortex Cash

## Visão Geral

Este documento descreve a infraestrutura backend completa implementada para a aba de **Patrimônio Total**, começando pelos **Investimentos**.

**Status**: ✅ CORE Infrastructure Complete
**Build**: ✅ Passing
**Versão**: v0.1
**Data**: 2025-01-28

---

## 🎯 Objetivo

Criar toda a infraestrutura CORE necessária para que a aba de Patrimônio Total exista e funcione perfeitamente, incluindo:
- Gestão completa de investimentos
- Cálculos agregados de patrimônio (contas + investimentos)
- Histórico de rentabilidade
- Diversificação de portfólio
- Análises por tipo e instituição

---

## 📦 Componentes Implementados

### 1. Types (`lib/types/index.ts`)

#### Novos Enums
```typescript
export type TipoInvestimento =
  | 'renda_fixa'          // CDB, LCI, LCA, Tesouro Direto
  | 'renda_variavel'      // Ações, FIIs
  | 'fundo_investimento'  // Fundos diversos
  | 'previdencia'         // PGBL, VGBL
  | 'criptomoeda'         // Bitcoin, Ethereum, etc
  | 'outro';

export type StatusInvestimento = 'ativo' | 'resgatado' | 'vencido';
```

#### Entidades Principais
- **`Investimento`**: Entidade principal com 18 campos
  - Dados básicos: nome, tipo, ticker, instituição
  - Valores: valor_aplicado, valor_atual, quantidade
  - Datas: data_aplicacao, data_vencimento
  - Taxas: taxa_juros, rentabilidade_contratada, indexador
  - Relacionamentos: instituicao_id, conta_origem_id
  - Status e metadados

- **`HistoricoInvestimento`**: Registro de movimentações
  - Tipos: aporte, resgate, rendimento, ajuste
  - Campos: valor, quantidade, data, observações

#### DTOs (Data Transfer Objects)
- `CreateInvestimentoDTO`: Para criação de investimentos
- `CreateHistoricoInvestimentoDTO`: Para registro de histórico
- `InvestimentoComRelacoes`: Investimento + instituição + conta_origem + histórico

#### Types de Agregação (Patrimônio)
- **`PatrimonioTotal`**: Visão consolidada
  - saldo_contas, saldo_investimentos, patrimonio_total
  - variacao_mes, rentabilidade_investimentos

- **`PatrimonioPorTipo`**: Agrupamento por tipo de investimento
  - Valores aplicado e atual
  - Rentabilidade absoluta e percentual
  - Lista de investimentos do tipo

- **`PatrimonioPorInstituicao`**: Agrupamento por instituição
  - Separação entre contas e investimentos
  - Percentual do patrimônio total
  - Listas completas de contas e investimentos

- **`RentabilidadeHistorico`**: Série temporal de performance
  - Valores aplicado e atual ao longo do tempo
  - Rentabilidade acumulada

---

### 2. Database Schema (`lib/db/client.ts`)

#### Novas Tabelas

**investimentos**
```typescript
investimentos: 'id, instituicao_id, nome, tipo, ticker, status, data_aplicacao, conta_origem_id'
```

**historico_investimentos**
```typescript
historico_investimentos: 'id, investimento_id, data, tipo_movimentacao'
```

#### Funcionalidades de Backup
- `exportDatabase()`: Exporta dados incluindo investimentos
- `importDatabase()`: Importa dados preservando investimentos
- `clearDatabase()`: Limpa todas as tabelas incluindo investimentos

---

### 3. InvestimentoService (`lib/services/investimento.service.ts`)

**Responsabilidade**: CRUD completo e operações sobre investimentos individuais

#### Métodos CRUD

**`listInvestimentos(options?)`**
- Filtros: status, tipo, instituicao_id
- Paginação: limit, offset
- Ordenação: nome, valor_atual, data_aplicacao, rentabilidade
- Retorna: `Promise<Investimento[]>`

**`getInvestimentoById(id)`**
- Busca simples por ID
- Retorna: `Promise<Investimento | null>`

**`getInvestimentoComRelacoes(id)`**
- Busca com relacionamentos populados
- Inclui: instituição, conta_origem, histórico
- Retorna: `Promise<InvestimentoComRelacoes | null>`

**`createInvestimento(data)`**
- Validação Zod integrada
- Cria investimento + histórico inicial (aporte)
- Retorna: `Promise<Investimento>`

**`updateInvestimento(id, data)`**
- Atualização parcial
- Conversão automática de datas
- Retorna: `Promise<Investimento>`

**`deleteInvestimento(id)`**
- Soft delete (marca como "resgatado")
- Retorna: `Promise<void>`

**`hardDeleteInvestimento(id)`**
- Delete permanente com transação
- Remove investimento + histórico
- Retorna: `Promise<void>`

#### Métodos de Histórico

**`createHistoricoInvestimento(data)`**
- Validação Zod integrada
- Tipos: aporte, resgate, rendimento, ajuste
- Retorna: `Promise<HistoricoInvestimento>`

**`getHistoricoInvestimento(investimento_id)`**
- Ordenado por data (descendente)
- Retorna: `Promise<HistoricoInvestimento[]>`

#### Métodos Utilitários

**`calcularRentabilidade(id)`**
- Rentabilidade absoluta e percentual
- Fórmula: (valor_atual - valor_aplicado) / valor_aplicado * 100
- Retorna: `Promise<{ rentabilidade: number; rentabilidade_percentual: number }>`

**`getInvestimentosPorTipo(tipo)`**
- Filtra por TipoInvestimento
- Retorna: `Promise<Investimento[]>`

**`getInvestimentosAtivos()`**
- Apenas investimentos com status "ativo"
- Retorna: `Promise<Investimento[]>`

**`getValorTotalInvestido()`**
- Soma de valor_aplicado (ativos)
- Retorna: `Promise<number>`

**`getValorTotalAtual()`**
- Soma de valor_atual (ativos)
- Retorna: `Promise<number>`

---

### 4. PatrimonioService (`lib/services/patrimonio.service.ts`)

**Responsabilidade**: Cálculos agregados e análises de patrimônio total

#### Métodos de Agregação

**`getPatrimonioTotal()`**
- Calcula patrimônio total = contas + investimentos
- Rentabilidade geral dos investimentos
- Variação mensal (preparado para futuro)
- Retorna: `Promise<PatrimonioTotal>`

**`getPatrimonioPorTipo()`**
- Agrupa investimentos por tipo
- Calcula rentabilidade por grupo
- Ordena por valor_atual (descendente)
- Retorna: `Promise<PatrimonioPorTipo[]>`

**`getPatrimonioPorInstituicao()`**
- Agrupa contas + investimentos por instituição
- Calcula percentual de cada instituição no patrimônio
- Inclui listas completas de contas e investimentos
- Ordena por valor_total (descendente)
- Retorna: `Promise<PatrimonioPorInstituicao[]>`

**`getRentabilidadeHistorico()`**
- Série temporal de rentabilidade (snapshot atual)
- Preparado para expansão com historico_investimentos
- Retorna: `Promise<RentabilidadeHistorico[]>`

#### Métodos de Análise

**`getDiversificacao()`**
- Análise de diversificação completa:
  - Por tipo de conta (corrente, poupança, etc)
  - Por tipo de investimento (renda fixa, variável, etc)
  - Contas vs Investimentos (distribuição geral)
- Percentuais calculados sobre patrimônio total
- Retorna objeto complexo com 3 níveis de análise

**`getResumoPatrimonio()`**
- Dashboard summary otimizado
- Inclui: patrimônio total, rentabilidade, maior investimento, maior conta
- Ideal para widgets e visões rápidas
- Retorna objeto com 7 campos principais

---

### 5. Validações Zod (`lib/validations/dtos.ts`)

#### Schemas de Validação

**`createInvestimentoSchema`**
```typescript
- instituicao_id: string obrigatório
- nome: string 1-100 caracteres
- tipo: enum TipoInvestimento
- ticker: string opcional max 20 chars
- valor_aplicado: number não-negativo finito
- valor_atual: number não-negativo finito
- quantidade: number não-negativo finito opcional
- data_aplicacao: Date | string obrigatório
- data_vencimento: Date | string opcional
- taxa_juros: number não-negativo finito opcional
- rentabilidade_contratada: number não-negativo finito opcional
- indexador: string max 20 chars opcional
- conta_origem_id: string opcional
- observacoes: string max 500 chars opcional
- cor: string hex format (#RRGGBB) opcional
```

**`createHistoricoInvestimentoSchema`**
```typescript
- investimento_id: string obrigatório
- data: Date | string obrigatório
- valor: number finito
- quantidade: number não-negativo finito opcional
- tipo_movimentacao: enum ('aporte' | 'resgate' | 'rendimento' | 'ajuste')
- observacoes: string max 500 chars opcional
```

#### Função Helper

**`validateDTO<T>(schema, data)`**
- Runtime validation com Zod
- Lança `ValidationError` com detalhes dos erros
- Retorna dados tipados após validação

---

### 6. Service Interfaces (`lib/services/interfaces.ts`)

#### IInvestimentoService
Contrato completo para o serviço de investimentos (14 métodos)

#### IPatrimonioService
Contrato completo para o serviço de patrimônio (6 métodos)

#### IServices (atualizado)
```typescript
export interface IServices {
  // ... existing services
  investimento: IInvestimentoService;
  patrimonio: IPatrimonioService;
}
```

---

## 🔗 Relacionamentos

```
Investimento
  ├─> instituicao_id → Instituicao (obrigatório)
  ├─> conta_origem_id → Conta (opcional)
  └─> HistoricoInvestimento[] (1:N)

PatrimonioTotal
  ├─> ContaService.getSaldoTotal()
  └─> InvestimentoService.getValorTotalAtual()

PatrimonioPorInstituicao
  ├─> Instituicao
  ├─> Conta[]
  └─> Investimento[]
```

---

## 🚀 Como Usar

### Exemplo 1: Criar Investimento
```typescript
import { investimentoService } from '@/lib/services/investimento.service';

const investimento = await investimentoService.createInvestimento({
  instituicao_id: 'uuid-banco',
  nome: 'CDB Banco XYZ',
  tipo: 'renda_fixa',
  valor_aplicado: 10000,
  valor_atual: 10500,
  data_aplicacao: new Date(),
  taxa_juros: 12.5,
  indexador: 'CDI',
  rentabilidade_contratada: 100,
});
```

### Exemplo 2: Obter Patrimônio Total
```typescript
import { patrimonioService } from '@/lib/services/patrimonio.service';

const patrimonio = await patrimonioService.getPatrimonioTotal();
console.log(`Patrimônio Total: R$ ${patrimonio.patrimonio_total.toFixed(2)}`);
console.log(`Rentabilidade: ${patrimonio.rentabilidade_investimentos.toFixed(2)}%`);
```

### Exemplo 3: Análise de Diversificação
```typescript
const diversificacao = await patrimonioService.getDiversificacao();

// Contas vs Investimentos
console.log('Distribuição:');
console.log(`Contas: ${diversificacao.contas_vs_investimentos.percentual_contas.toFixed(2)}%`);
console.log(`Investimentos: ${diversificacao.contas_vs_investimentos.percentual_investimentos.toFixed(2)}%`);

// Por tipo de investimento
diversificacao.por_tipo_investimento.forEach(item => {
  console.log(`${item.tipo}: R$ ${item.valor.toFixed(2)} (${item.percentual.toFixed(2)}%)`);
});
```

### Exemplo 4: Listar Investimentos com Filtros
```typescript
const investimentos = await investimentoService.listInvestimentos({
  tipo: 'renda_variavel',
  status: 'ativo',
  sortBy: 'rentabilidade',
  sortOrder: 'desc',
  limit: 10,
});
```

---

## ✅ Features Implementadas

- [x] Types completos para Investimentos e Patrimônio
- [x] Schema IndexedDB com 2 novas tabelas
- [x] InvestimentoService (395 linhas) - CRUD completo
- [x] PatrimonioService (283 linhas) - Agregações
- [x] Validações Zod runtime
- [x] Service Interfaces atualizadas
- [x] Error handling com custom errors
- [x] Paginação e ordenação em todas as listagens
- [x] Soft delete e hard delete
- [x] Histórico de movimentações
- [x] Cálculos de rentabilidade
- [x] Análise de diversificação
- [x] Agregação por tipo e instituição
- [x] Build Next.js 16 + Turbopack passing

---

## 🎯 Próximos Passos (Sugeridos)

### Frontend (Agent UI)
1. Página `/patrimonio` (ou `/wealth`)
2. Componentes:
   - `PatrimonioOverview` - Card com totais
   - `InvestimentosList` - Tabela de investimentos
   - `InvestimentoForm` - Formulário criar/editar
   - `PatrimonioPorTipoChart` - Gráfico pizza
   - `PatrimonioPorInstituicaoChart` - Gráfico barras
   - `RentabilidadeChart` - Gráfico linha temporal
   - `DiversificacaoWidget` - Indicadores de diversificação

### Testes
1. Unit tests para InvestimentoService
2. Unit tests para PatrimonioService
3. Integration tests para fluxos completos
4. Testes de validação Zod

### Melhorias Futuras
1. Sincronização com APIs de corretoras
2. Cotações em tempo real (ações, FIIs)
3. Cálculo de IR sobre investimentos
4. Projeções de rentabilidade
5. Rebalanceamento de carteira
6. Histórico temporal completo (série histórica)
7. Comparação com benchmarks (CDI, IBOV, IPCA)

---

## 📊 Estatísticas

- **Linhas de código**: ~900 linhas
- **Arquivos modificados**: 5
- **Arquivos criados**: 3
- **Métodos implementados**: 20+ métodos públicos
- **Types definidos**: 15+ interfaces/types
- **Build time**: 2.7s
- **Cobertura**: CORE backend 100% implementado

---

## 🤝 Agents Envolvidos

- **Agent CORE**: Owner e implementador principal
  - InvestimentoService
  - PatrimonioService
  - Types e validações
  - Database schema

- **Agent UI**: Próximo responsável (pendente)
  - Implementar páginas e componentes
  - Integrar com services CORE

---

## 📝 Notas Técnicas

### Performance
- IndexedDB com indexes otimizados para queries frequentes
- Ordenação em memória (aceitável para <10k registros)
- Paginação implementada para escalabilidade

### Segurança
- Validação Zod em todas as entradas
- Soft delete preserva dados históricos
- Transações Dexie para operações críticas

### Manutenibilidade
- Código documentado em português
- Interfaces claramente definidas
- Singleton pattern para services
- Error handling estruturado

---

**Documento gerado automaticamente pelo Agent CORE**
**Última atualização**: 2025-01-28
