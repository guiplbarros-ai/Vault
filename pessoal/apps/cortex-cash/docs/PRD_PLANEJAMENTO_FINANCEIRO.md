# PRD - Planejamento Financeiro Familiar

**Versão:** 1.0
**Data:** 2025-11-08
**Autor:** Claude Code
**Status:** Em Desenvolvimento

---

## 1. Visão Geral

### 1.1 Problema
Usuários precisam de uma forma de **planejar o futuro financeiro familiar** além de apenas controlar gastos atuais. Orçamentos definem limites (reativo), mas não permitem:
- Projetar comportamento financeiro futuro
- Simular cenários "E se...?"
- Planejar mudanças de hábitos financeiros
- Visualizar impacto de decisões no longo prazo

### 1.2 Solução
Uma ferramenta de **Planejamento Financeiro Familiar** que:
- Analisa padrões históricos de receitas/despesas
- Projeta o futuro financeiro baseado em comportamento atual
- Permite criar **cenários customizados** com mudanças de comportamento
- Compara diferentes cenários lado a lado
- Visualiza impacto no patrimônio ao longo do tempo

### 1.3 Diferencial vs Orçamentos
| Recurso | Orçamento | Planejamento |
|---------|-----------|--------------|
| **Objetivo** | Controlar gastos mensais | Projetar futuro financeiro |
| **Horizonte** | Mês atual | 1-10 anos |
| **Natureza** | Reativo (limites) | Proativo (cenários) |
| **Foco** | "Quanto posso gastar?" | "Onde estarei em X anos?" |
| **Uso** | Dia a dia | Decisões estratégicas |

---

## 2. Objetivos

### 2.1 Objetivos de Negócio
- [ ] Aumentar engajamento do usuário com planejamento de longo prazo
- [ ] Diferenciar a aplicação com recurso único
- [ ] Educar usuários sobre impacto de decisões financeiras
- [ ] Facilitar conversas familiares sobre finanças

### 2.2 Objetivos de Produto
- [ ] Permitir criação de múltiplos cenários de planejamento
- [ ] Projetar receitas, despesas e patrimônio até 10 anos
- [ ] Comparar cenários visualmente
- [ ] Simular mudanças de comportamento financeiro
- [ ] Adicionar objetivos financeiros (metas) aos cenários

### 2.3 Objetivos do Usuário
- [ ] Entender onde estarei financeiramente em X anos
- [ ] Simular impacto de mudanças (ex: trocar de emprego, reduzir gastos)
- [ ] Planejar aposentadoria, compra de casa, viagens
- [ ] Tomar decisões informadas sobre investimentos
- [ ] Ter conversas familiares baseadas em dados

---

## 3. Requisitos Funcionais

### 3.1 Criação de Cenários

#### RF-01: Cenário Base (Automático)
**Prioridade:** Alta
**Descrição:** Sistema cria automaticamente um cenário "Base" baseado em dados históricos.

**Critérios de Aceitação:**
- Analisa últimos 6-12 meses de transações
- Calcula médias de receitas por categoria
- Calcula médias de despesas por categoria
- Calcula taxa de saving média
- Projeta comportamento atual para o futuro

**Cálculos:**
```
Receita Mensal Projetada = Média(receitas últimos 6 meses) por categoria
Despesa Mensal Projetada = Média(despesas últimos 6 meses) por categoria
Taxa de Saving = (Receitas - Despesas) / Receitas
Patrimônio Projetado(mês N) = Patrimônio Atual + Σ(Saving mensal * N)
```

#### RF-02: Criação de Cenários Personalizados
**Prioridade:** Alta
**Descrição:** Usuário pode criar cenários customizados.

**Campos do Cenário:**
- Nome do cenário (ex: "Aposentadoria 2030", "Compra Casa 2026")
- Descrição
- Horizonte temporal (1-10 anos)
- Data início
- Configurações de comportamento financeiro (RF-03)

#### RF-03: Configuração de Comportamento Financeiro
**Prioridade:** Alta
**Descrição:** Dentro de cada cenário, usuário define como comportamento será diferente.

**Configurações disponíveis:**

1. **Receitas:**
   - Manter padrão atual
   - Aumentar/diminuir % (ex: +20% aumento salarial)
   - Definir valor fixo mensal
   - Adicionar receita nova (ex: aluguel, freelance)
   - Remover receita (ex: parar freelance)
   - Aplicar mudança em data específica (ex: "promoção em Jan/2026")

2. **Despesas por Categoria:**
   - Manter padrão atual
   - Reduzir/aumentar % (ex: -30% em "Restaurantes")
   - Definir valor fixo mensal
   - Zerar categoria (ex: parar assinatura)
   - Aplicar mudança em data específica

3. **Investimentos:**
   - Definir % de saving para investir
   - Definir valor fixo mensal
   - Escolher taxa de retorno esperada (ex: 0.8% a.m.)

4. **Eventos Únicos:**
   - Adicionar receitas/despesas pontuais (ex: "Venda carro em Jun/2025: +50k")
   - 13º salário automático
   - Férias (mês de despesa extra)

### 3.2 Projeções

#### RF-04: Projeção Mensal
**Prioridade:** Alta
**Descrição:** Calcular projeções mês a mês para todo horizonte temporal.

**Dados projetados:**
- Receitas totais e por categoria
- Despesas totais e por categoria
- Investimentos
- Saving (receitas - despesas - investimentos)
- Patrimônio acumulado

**Formato de Saída:**
```typescript
interface ProjecaoMensal {
  mes: Date
  receitas: {
    total: number
    porCategoria: Record<string, number>
  }
  despesas: {
    total: number
    porCategoria: Record<string, number>
  }
  investimentos: number
  saving: number
  patrimonioAcumulado: number
}
```

#### RF-05: Ajustes por Inflação (Opcional)
**Prioridade:** Média
**Descrição:** Permitir aplicar inflação às projeções.

**Configurações:**
- Taxa de inflação anual (%)
- Aplicar a receitas, despesas ou ambos
- Visualizar valores nominais vs ajustados

### 3.3 Comparação de Cenários

#### RF-06: Comparador Visual
**Prioridade:** Alta
**Descrição:** Comparar até 3 cenários lado a lado.

**Visualizações:**
- Tabela comparativa de métricas chave
- Gráfico de evolução patrimonial
- Gráfico de saving mensal
- Gráfico de composição de despesas

**Métricas Comparadas:**
- Patrimônio final (fim do horizonte)
- Saving acumulado
- Taxa média de saving
- Receita total acumulada
- Despesa total acumulada

#### RF-07: Análise de Sensibilidade
**Prioridade:** Baixa
**Descrição:** Mostrar impacto de variações em parâmetros.

**Exemplo:**
- "E se receitas crescerem 10% a mais?"
- "E se despesas aumentarem 5%?"
- Range de patrimônio final (melhor/pior cenário)

### 3.4 Objetivos Financeiros

#### RF-08: Adicionar Objetivos (Metas)
**Prioridade:** Média
**Descrição:** Definir objetivos financeiros dentro de cenários.

**Campos do Objetivo:**
- Nome (ex: "Compra Casa", "Aposentadoria")
- Valor alvo
- Data alvo
- Categoria (casa, viagem, educação, aposentadoria, outro)
- Prioridade (alta/média/baixa)

#### RF-09: Acompanhamento de Objetivos
**Prioridade:** Média
**Descrição:** Mostrar se cenário permite alcançar objetivos.

**Indicadores:**
- Status: "No caminho" | "Precisa ajustes" | "Inviável"
- Diferença entre patrimônio projetado e valor alvo
- Sugestões de ajustes necessários
- Visualização de marcos no gráfico de evolução

### 3.5 Relatórios

#### RF-10: Resumo Executivo
**Prioridade:** Média
**Descrição:** Dashboard com visão geral de todos cenários.

**Componentes:**
- Cards de métricas chave por cenário
- Comparação rápida de patrimônio final
- Objetivos mais próximos de serem alcançados
- Cenário recomendado (maior patrimônio ou melhor saving)

#### RF-11: Exportar Cenário
**Prioridade:** Baixa
**Descrição:** Exportar projeções para análise externa.

**Formatos:**
- CSV (tabela mensal)
- PDF (relatório visual)
- JSON (dados completos)

---

## 4. Requisitos Técnicos

### 4.1 Modelo de Dados

#### Cenário
```typescript
interface Cenario {
  id: string
  nome: string
  descricao?: string
  tipo: 'base' | 'personalizado'
  horizonte_anos: number
  data_inicio: Date
  created_at: Date
  updated_at: Date
}
```

#### Configuração de Comportamento
```typescript
interface ConfiguracaoComportamento {
  id: string
  cenario_id: string
  tipo: 'receita' | 'despesa' | 'investimento' | 'evento_unico'

  // Para receitas/despesas por categoria
  categoria_id?: string
  modo: 'manter_padrao' | 'percentual' | 'valor_fixo' | 'zerar'
  percentual_mudanca?: number // Ex: -30 (redução de 30%)
  valor_fixo?: number
  data_aplicacao?: Date // Quando a mudança entra em vigor

  // Para investimentos
  percentual_saving?: number
  taxa_retorno_mensal?: number

  // Para eventos únicos
  evento?: {
    descricao: string
    valor: number
    data: Date
    tipo: 'receita' | 'despesa'
  }
}
```

#### Objetivo Financeiro
```typescript
interface ObjetivoFinanceiro {
  id: string
  cenario_id: string
  nome: string
  valor_alvo: number
  data_alvo: Date
  categoria: 'casa' | 'viagem' | 'educacao' | 'aposentadoria' | 'outro'
  prioridade: 'alta' | 'media' | 'baixa'
  created_at: Date
}
```

### 4.2 Services

#### PlanejamentoService
```typescript
class PlanejamentoService {
  // Criar cenário base automaticamente
  async createCenarioBase(): Promise<Cenario>

  // CRUD cenários
  async createCenario(data: CenarioInput): Promise<Cenario>
  async listCenarios(): Promise<Cenario[]>
  async getCenario(id: string): Promise<Cenario>
  async updateCenario(id: string, data: Partial<Cenario>): Promise<Cenario>
  async deleteCenario(id: string): Promise<void>

  // Configurações de comportamento
  async addConfiguracao(cenarioId: string, config: ConfiguracaoInput): Promise<ConfiguracaoComportamento>
  async listConfiguracoes(cenarioId: string): Promise<ConfiguracaoComportamento[]>
  async removeConfiguracao(configId: string): Promise<void>

  // Objetivos
  async addObjetivo(cenarioId: string, objetivo: ObjetivoInput): Promise<ObjetivoFinanceiro>
  async listObjetivos(cenarioId: string): Promise<ObjetivoFinanceiro[]>
}
```

#### ProjecaoService
```typescript
class ProjecaoService {
  // Calcular projeções
  async calcularProjecao(cenarioId: string): Promise<ProjecaoMensal[]>

  // Comparar cenários
  async compararCenarios(cenarioIds: string[]): Promise<ComparativoResultado>

  // Análise de objetivos
  async analisarObjetivos(cenarioId: string): Promise<ObjetivoAnalise[]>

  // Helpers internos
  private calcularBaselineHistorico(): BaselineData
  private aplicarConfiguracoes(baseline: BaselineData, configs: ConfiguracaoComportamento[]): ProjecaoMensal[]
  private calcularPatrimonioAcumulado(projecoes: ProjecaoMensal[]): ProjecaoMensal[]
}
```

### 4.3 Tabelas do Banco (IndexedDB)

```typescript
// Adicionar ao db.ts
db.version(2).stores({
  // ... tabelas existentes
  cenarios: '++id, nome, tipo, created_at',
  configuracoes_comportamento: '++id, cenario_id, tipo, categoria_id',
  objetivos_financeiros: '++id, cenario_id, data_alvo, categoria',
})
```

---

## 5. User Stories

### US-01: Visualizar Projeção Base
**Como** usuário
**Quero** ver automaticamente onde estarei financeiramente se continuar no padrão atual
**Para** ter uma baseline de comparação

**Cenário de Uso:**
1. Usuário acessa aba "Planejamento"
2. Sistema analisa histórico e cria cenário "Base" automaticamente
3. Usuário vê gráfico de evolução patrimonial para próximos 5 anos
4. Usuário vê tabela com projeções mês a mês

### US-02: Criar Cenário de Aposentadoria
**Como** usuário
**Quero** criar um cenário onde me aposento em 10 anos
**Para** ver se consigo viver com investimentos

**Cenário de Uso:**
1. Usuário cria novo cenário "Aposentadoria 2035"
2. Define horizonte de 10 anos
3. Configura: "Em Jan/2035, zerar todas receitas de salário"
4. Configura: "Viver com 3% a.m. de rendimento dos investimentos"
5. Sistema projeta e mostra se é viável

### US-03: Comparar Cenários de Redução de Gastos
**Como** usuário
**Quero** comparar impacto de reduzir 20% vs 30% dos gastos com lazer
**Para** decidir o que é sustentável

**Cenário de Uso:**
1. Usuário duplica cenário base
2. Cria "Redução 20% Lazer" com -20% em categoria Lazer
3. Cria "Redução 30% Lazer" com -30% em categoria Lazer
4. Seleciona comparador com 3 cenários
5. Vê lado a lado diferença de patrimônio final

### US-04: Planejar Compra de Casa
**Como** usuário
**Quero** adicionar objetivo de comprar casa de R$500k em 2028
**Para** ver se consigo com meu saving atual

**Cenário de Uso:**
1. Usuário acessa cenário personalizado
2. Adiciona objetivo "Casa" com valor R$500k e data 2028
3. Sistema calcula e mostra: "Faltam R$120k. Precisa aumentar saving em 15%."
4. Usuário ajusta configurações para bater meta
5. Gráfico mostra marco em 2028

---

## 6. UI/UX Design

### 6.1 Estrutura de Navegação
```
Dashboard
├── Transações
├── Categorias
├── Contas
├── Orçamentos (existente)
└── 📊 Planejamento (NOVO)
    ├── Visão Geral (todos cenários)
    ├── Cenário Base (auto)
    ├── Meus Cenários (lista)
    ├── Novo Cenário (+)
    └── Comparar (selecionar 2-3)
```

### 6.2 Layout da Página Principal

**Header:**
- Breadcrumb: Home > Planejamento
- Botão: "+ Novo Cenário"
- Botão: "Comparar Cenários"

**Body (Tabs):**

**Tab 1: Visão Geral**
- Cards de métricas de todos cenários
- Tabela comparativa rápida
- Gráfico de linha: Evolução patrimonial de todos cenários

**Tab 2: Cenários (Lista)**
- Cards de cada cenário com:
  - Nome
  - Horizonte temporal
  - Patrimônio final projetado
  - Saving acumulado
  - Status de objetivos
  - Ações: Ver detalhes | Editar | Duplicar | Excluir

**Tab 3: Detalhes do Cenário (ao clicar)**
- **Seção 1: Configurações**
  - Nome, descrição, horizonte
  - Botão "Editar Configurações"

- **Seção 2: Comportamento Financeiro**
  - Lista de configurações (receitas, despesas, investimentos)
  - Botão "+ Adicionar Regra"

- **Seção 3: Objetivos**
  - Lista de objetivos com progresso
  - Botão "+ Adicionar Objetivo"

- **Seção 4: Projeções**
  - Gráfico de evolução patrimonial
  - Gráfico de saving mensal
  - Gráfico de composição de despesas
  - Tabela mensal expandível

- **Seção 5: Insights**
  - "Patrimônio final: R$XXX"
  - "Saving acumulado: R$XXX"
  - "Taxa média de saving: XX%"
  - "Objetivos alcançados: X/Y"

### 6.3 Componentes UI

**CenarioCard**
```tsx
<CenarioCard
  nome="Aposentadoria 2035"
  descricao="Plano de aposentadoria..."
  patrimonioFinal={850000}
  savingAcumulado={350000}
  objetivos={3}
  objetivosAlcancados={2}
  onView={() => {}}
  onEdit={() => {}}
  onDuplicate={() => {}}
  onDelete={() => {}}
/>
```

**ProjecaoChart**
```tsx
<ProjecaoChart
  data={projecoesMensais}
  showReceitas={true}
  showDespesas={true}
  showPatrimonio={true}
  objetivos={[...]}
/>
```

**ComparadorCenarios**
```tsx
<ComparadorCenarios
  cenarios={[cenario1, cenario2, cenario3]}
  metricas={['patrimonio_final', 'saving_acumulado', 'taxa_saving']}
/>
```

### 6.4 Fluxos de Interação

**Criar Novo Cenário:**
1. Clicar "+ Novo Cenário"
2. Modal com formulário:
   - Nome*
   - Descrição
   - Horizonte (anos)*
   - Opção: "Duplicar de outro cenário" (dropdown)
3. Salvar → Redireciona para detalhes do cenário
4. Adicionar configurações de comportamento

**Adicionar Configuração de Comportamento:**
1. No detalhe do cenário, clicar "+ Adicionar Regra"
2. Modal com steps:
   - **Step 1**: Escolher tipo (Receita | Despesa | Investimento | Evento Único)
   - **Step 2**: Configurar detalhes específicos
   - **Step 3**: Preview do impacto
3. Salvar → Atualiza projeções automaticamente

**Comparar Cenários:**
1. Selecionar 2-3 cenários com checkboxes
2. Clicar "Comparar"
3. Visualização lado a lado:
   - Tabela de métricas
   - Gráfico de evolução sobreposta
   - Diferenças destacadas

---

## 7. Métricas de Sucesso

### 7.1 Métricas de Produto
- [ ] % de usuários que criam pelo menos 1 cenário personalizado: **> 40%**
- [ ] % de usuários que comparam cenários: **> 25%**
- [ ] Número médio de cenários por usuário: **> 2**
- [ ] % de usuários que adicionam objetivos: **> 30%**

### 7.2 Métricas de Engajamento
- [ ] Tempo médio na página de Planejamento: **> 5 min**
- [ ] Retorno à página em 7 dias: **> 50%**
- [ ] Edições de cenários por mês: **> 3**

### 7.3 Métricas de Impacto
- [ ] % de usuários que aumentam saving após usar planejamento: **> 20%**
- [ ] % de usuários que reportam decisões baseadas em cenários: **> 35%**

---

## 8. Roadmap de Implementação

### Fase 1: MVP Core (2-3 semanas)
**Objetivo:** Permitir criar cenários básicos e visualizar projeções.

- [x] Criar PRD completo
- [ ] Implementar modelo de dados (tabelas + types)
- [ ] Criar PlanejamentoService básico
- [ ] Criar ProjecaoService com algoritmo de projeção
- [ ] Implementar página de Planejamento (lista de cenários)
- [ ] Implementar criação de cenário base automático
- [ ] Implementar criação de cenário personalizado (form)
- [ ] Implementar configurações básicas de comportamento
- [ ] Adicionar gráfico de evolução patrimonial
- [ ] Adicionar tabela de projeções mensais

### Fase 2: Comparação e Objetivos (1-2 semanas)
**Objetivo:** Permitir comparar cenários e adicionar objetivos.

- [ ] Implementar comparador visual (2-3 cenários)
- [ ] Adicionar CRUD de objetivos financeiros
- [ ] Implementar análise de viabilidade de objetivos
- [ ] Adicionar marcos de objetivos nos gráficos
- [ ] Criar dashboard de visão geral

### Fase 3: Refinamentos (1 semana)
**Objetivo:** Melhorar UX e adicionar features avançadas.

- [ ] Adicionar eventos únicos (receitas/despesas pontuais)
- [ ] Implementar ajuste por inflação
- [ ] Adicionar sugestões automáticas de melhorias
- [ ] Implementar exportação (CSV, PDF)
- [ ] Adicionar templates de cenários prontos

### Fase 4: Análise Avançada (Futuro)
**Objetivo:** Features de análise mais sofisticadas.

- [ ] Análise de sensibilidade (range de cenários)
- [ ] Simulação Monte Carlo
- [ ] Recomendações baseadas em IA
- [ ] Integração com objetivos de investimentos
- [ ] Alertas de desvio do plano

---

## 9. Considerações Técnicas

### 9.1 Performance
- Projeções devem calcular em < 500ms para horizonte de 10 anos
- Usar Web Workers para cálculos pesados se necessário
- Cachear resultados de projeções (invalidar ao editar configuração)

### 9.2 Validações
- Horizonte temporal: mínimo 1 ano, máximo 10 anos
- Percentuais: -100% a +1000%
- Datas de eventos: dentro do horizonte do cenário
- Taxa de retorno de investimentos: 0% a 3% a.m.

### 9.3 Edge Cases
- Usuário sem histórico suficiente (< 3 meses): Não criar cenário base, pedir para definir manualmente
- Patrimônio negativo em projeção: Alertar usuário
- Múltiplas configurações conflitantes: Última configuração prevalece (por data)

### 9.4 Segurança
- Cenários são privados por usuário (localmente no IndexedDB)
- Não expor dados sensíveis em logs
- Validar inputs para evitar projeções absurdas

---

## 10. FAQ Técnico

### Q1: Como lidar com categorias que ainda não existem no histórico?
**R:** Permitir usuário definir valores estimados manualmente para essas categorias no cenário.

### Q2: Como calcular o cenário base se usuário tem variação alta de receitas?
**R:** Usar mediana em vez de média, ou pedir para usuário ajustar manualmente se variância > 30%.

### Q3: Eventos únicos (13º, férias) são considerados automaticamente?
**R:** Sim, sistema detecta padrões sazonais e replica no cenário base. Usuário pode desabilitar.

### Q4: Como lidar com inflação de forma simples?
**R:** Aplicar taxa anual composta sobre valores projetados. Mostrar toggle "Valores nominais / Ajustados pela inflação".

### Q5: Posso criar cenários com diferentes datas de início?
**R:** Sim, mas todos partem do patrimônio atual (data de criação do cenário).

---

## 11. Anexos

### A1: Exemplo de Cálculo de Projeção

**Dados de Entrada:**
- Patrimônio atual: R$ 100.000
- Receita mensal média: R$ 10.000
- Despesa mensal média: R$ 7.000
- Investimentos mensais: R$ 2.000 (do saving de R$ 3.000)
- Taxa de retorno investimentos: 0.8% a.m.
- Horizonte: 12 meses

**Cálculo Mês 1:**
```
Receitas = R$ 10.000
Despesas = R$ 7.000
Saving = R$ 10.000 - R$ 7.000 = R$ 3.000
Investimentos = R$ 2.000
Caixa livre = R$ 3.000 - R$ 2.000 = R$ 1.000

Rendimento investimentos = R$ 100.000 * 0.008 = R$ 800
Patrimônio final = R$ 100.000 + R$ 2.000 + R$ 800 + R$ 1.000 = R$ 103.800
```

**Cálculo Mês 2:**
```
Patrimônio inicial = R$ 103.800
... (mesma lógica)
```

### A2: Wireframes (ASCII)

**Visão Geral - Desktop:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Planejamento Financeiro          [+ Novo Cenário] [Comparar] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │ Cenário Base│ │ Aposentado. │ │ Compra Casa │                │
│ │ R$ 500k     │ │ R$ 850k     │ │ R$ 380k     │                │
│ │ 5 anos      │ │ 10 anos     │ │ 3 anos      │                │
│ └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │  Evolução Patrimonial - Todos Cenários                    │   │
│ │                                                            │   │
│ │  800k ┤                                    ╱──── Aposent. │   │
│ │  600k ┤                      ╱────────────                │   │
│ │  400k ┤        ╱────────────╱                             │   │
│ │  200k ┤───────╱────── Base                                │   │
│ │       └────────────────────────────────────               │   │
│ │        2025  2027  2029  2031  2033  2035                 │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Detalhe do Cenário:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ← Voltar   Cenário: Aposentadoria 2035                [Editar]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ▼ Configurações                                                  │
│   Horizonte: 10 anos | Início: Jan/2025                         │
│                                                                   │
│ ▼ Comportamento Financeiro                      [+ Adicionar]   │
│   ✓ Receitas: +3% a.a. (crescimento salarial)                   │
│   ✓ Despesas Lazer: -20% (reduzir viagens)                      │
│   ✓ Investimentos: 40% do saving (aumentar aportes)             │
│   ✓ Evento: Venda de carro em Jun/2027 (+R$ 50.000)             │
│                                                                   │
│ ▼ Objetivos                                      [+ Adicionar]   │
│   🏠 Compra Casa - R$ 500.000 em 2030           ✅ Alcançável   │
│   ✈️ Viagem Europa - R$ 30.000 em 2027          ✅ Alcançável   │
│                                                                   │
│ ▼ Projeções                                                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ [Evolução Patrimonial] [Saving Mensal] [Composição]    │   │
│   │                                                          │   │
│   │  Patrimônio: R$ 100k → R$ 850k                          │   │
│   │  Gráfico aqui...                                        │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Próximos Passos

1. **Revisar PRD** com stakeholders
2. **Aprovar escopo** da Fase 1 (MVP)
3. **Iniciar desenvolvimento** dos modelos de dados
4. **Criar protótipo de UI** no Figma (opcional)
5. **Implementar backend** (services e cálculos)
6. **Implementar frontend** (páginas e componentes)
7. **Testar** com usuários beta
8. **Iterar** com base em feedback

---

**Status:** ✅ PRD Completo - Pronto para Desenvolvimento
