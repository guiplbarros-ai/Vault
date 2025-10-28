# Gestão de Cartões de Crédito — Cortex Ledger

> **Status:** ✅ UI Implementada | ⚠️ Backend Pendente
> **Data:** 2025-10-27
> **Versão:** v1.0

---

## 1. Visão Geral

A funcionalidade de **Gestão de Cartões de Crédito** centraliza todo o controle de cartões de crédito do usuário, incluindo:

- Visão consolidada de todos os cartões
- Faturas abertas, fechadas e históricas
- Limite disponível e utilização em tempo real
- Lançamentos futuros (compras ainda não faturadas)
- Histórico de pagamentos
- Cálculo automático do melhor dia de compra
- Alertas inteligentes de vencimento e limite

---

## 2. Estrutura de Arquivos

### 2.1 Páginas
```
apps/web/src/app/(dashboard)/cartoes/
├── page.tsx          # Dashboard principal de cartões
└── loading.tsx       # Estado de carregamento
```

### 2.2 Componentes
```
apps/web/src/components/cartoes/
├── cartao-card.tsx         # Card individual de cartão (grid)
├── cartao-form.tsx         # Formulário criar/editar cartão
└── fatura-detalhes.tsx     # Visualização detalhada da fatura
```

---

## 3. Componentes Implementados

### 3.1 Dashboard Principal (`/cartoes`)

**Funcionalidades:**
- 4 cards de resumo no topo:
  - **Total em Aberto**: soma de todas as faturas não pagas
  - **Próximo Vencimento**: data e valor da próxima fatura a vencer
  - **Limite Total Disponível**: soma dos limites disponíveis de todos os cartões
  - **Utilização Média**: percentual médio de uso dos limites

- Grid responsivo de cartões (3 colunas desktop, 2 tablet, 1 mobile)
- Empty state quando não há cartões cadastrados
- Botão "Adicionar Cartão" no header

**Dados Mock (atual):**
```typescript
{
  resumo: {
    totalAberto: 8450.32,
    proximoVencimento: { data, valor, cartao },
    limiteDisponivel: 15320.50,
    utilizacaoMedia: 42
  },
  cartoes: [{ id, nome, bandeira, ultimosDigitos, ... }]
}
```

---

### 3.2 CartaoCard (`cartao-card.tsx`)

**Props:**
```typescript
{
  cartao: {
    id: string
    nome: string                  // Ex: "Amex Platinum"
    bandeira: string              // visa, master, amex, elo
    ultimosDigitos: string        // 4 dígitos
    limiteTotal: number
    limiteDisponivel: number
    faturaAtual: number
    vencimento: string (ISO)
    utilizacao: number            // % de uso
    status: string
  }
  onClick?: () => void
}
```

**Funcionalidades:**
- Barra de progresso de utilização do limite
- Cores dinâmicas por status:
  - Verde: < 50% do limite (saudável)
  - Amarelo: 50-80% do limite (atenção)
  - Vermelho: > 80% do limite (crítico)
- Exibição de limite disponível vs. total
- Fatura atual e data de vencimento
- Botão "Ver Detalhes"

---

### 3.3 CartaoForm (`cartao-form.tsx`)

**Props:**
```typescript
{
  onSubmit: (data: CartaoFormData) => void
  onCancel: () => void
  initialData?: Partial<CartaoFormData>
}

CartaoFormData = {
  nome: string
  instituicao: string
  bandeira: 'visa' | 'master' | 'amex' | 'elo' | 'outro'
  ultimosDigitos: string
  limiteTotal: number
  diaFechamento: number (1-31)
  diaVencimento: number (1-31)
  tipoCartao: 'nacional' | 'internacional'
  anuidade?: number
  taxaJuros?: number
}
```

**Seções:**
1. **Informações Básicas**
   - Nome/apelido do cartão
   - Instituição emissora
   - Bandeira (select)
   - Últimos 4 dígitos
   - Tipo (nacional/internacional)

2. **Configurações Financeiras**
   - Limite total
   - Dia de fechamento da fatura
   - Dia de vencimento
   - **Cálculo automático do melhor dia de compra** (destaque visual)

3. **Custos Opcionais**
   - Anuidade (R$/ano)
   - Taxa de juros rotativos (% a.m.)

**Validações:**
- Campos obrigatórios marcados com `*`
- Últimos dígitos limitados a 4 caracteres
- Dias de fechamento/vencimento entre 1-31
- Valores numéricos positivos

**Regra de Negócio — Melhor Dia de Compra:**
```typescript
melhorDia = (diaFechamento % 31) + 1
prazo = diaVencimento - diaFechamento + 30
// Ex: Fechamento dia 10 → Melhor dia 11 (prazo ~40 dias)
```

---

### 3.4 FaturaDetalhes (`fatura-detalhes.tsx`)

**Props:**
```typescript
{
  fatura: {
    id: string
    mesReferencia: string (YYYY-MM)
    dataFechamento: string (ISO)
    dataVencimento: string (ISO)
    valorTotal: number
    valorPago: number
    status: 'aberta' | 'fechada' | 'paga' | 'atrasada' | 'parcial'
  }
  transacoes: Array<{
    id, data, descricao, categoria, valor,
    parcelaAtual?, parcelasTotal?
  }>
  onPagarFatura?: () => void
}
```

**Funcionalidades:**
- **Header da Fatura:**
  - Título com mês/ano de referência
  - Badge de status com cores (paga=verde, atrasada=vermelho, etc.)
  - Período de referência

- **Valores:**
  - Valor total (grande, destaque)
  - Valor pago (verde)
  - Saldo devedor (vermelho)

- **Datas:**
  - Fechamento
  - Vencimento (com contagem de dias restantes)

- **Alertas Inteligentes:**
  - Amarelo: vencimento em ≤7 dias
  - Vermelho: fatura vencida
  - Texto explicativo e call-to-action

- **Lista de Transações:**
  - Descrição, data, categoria
  - Badge para parceladas (ex: "3/12")
  - Valor formatado

- **Botão "Registrar Pagamento":**
  - Aparece apenas para faturas não pagas
  - Call da função `onPagarFatura` (implementação futura)

---

## 4. Modelo de Dados

### 4.1 Tabelas Necessárias (Supabase)

#### `cartao_credito` (estende `conta`)
```sql
CREATE TABLE cartao_credito (
  id UUID PRIMARY KEY REFERENCES conta(id),
  bandeira VARCHAR(20) CHECK (bandeira IN ('visa', 'master', 'amex', 'elo', 'outro')),
  ultimos_digitos VARCHAR(4) NOT NULL,
  limite_total DECIMAL(12,2) NOT NULL,
  limite_disponivel DECIMAL(12,2) NOT NULL, -- calculado
  dia_fechamento INTEGER CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31),
  melhor_dia_compra INTEGER CHECK (melhor_dia_compra BETWEEN 1 AND 31), -- calculado
  taxa_juros_mes DECIMAL(5,2), -- opcional
  anuidade_valor DECIMAL(10,2), -- opcional
  anuidade_proximo_venc DATE, -- opcional
  tipo_cartao VARCHAR(20) CHECK (tipo_cartao IN ('nacional', 'internacional')),
  status VARCHAR(20) CHECK (status IN ('ativo', 'bloqueado', 'cancelado')) DEFAULT 'ativo',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS
ALTER TABLE cartao_credito ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cards" ON cartao_credito
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON cartao_credito
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON cartao_credito
  FOR UPDATE USING (auth.uid() = user_id);
```

#### `fatura`
```sql
CREATE TABLE fatura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id UUID NOT NULL REFERENCES cartao_credito(id) ON DELETE CASCADE,
  mes_referencia VARCHAR(7) NOT NULL, -- YYYY-MM
  data_fechamento DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_pago DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('aberta', 'fechada', 'paga', 'atrasada', 'parcial')) DEFAULT 'aberta',
  data_pagamento DATE,
  transacao_pagamento_id UUID REFERENCES transacao(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(cartao_id, mes_referencia)
);

-- RLS
ALTER TABLE fatura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invoices" ON fatura
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own invoices" ON fatura
  FOR ALL USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_fatura_cartao ON fatura(cartao_id);
CREATE INDEX idx_fatura_status ON fatura(status);
CREATE INDEX idx_fatura_vencimento ON fatura(data_vencimento);
```

#### Extensões em `transacao`
```sql
ALTER TABLE transacao ADD COLUMN fatura_id UUID REFERENCES fatura(id);
ALTER TABLE transacao ADD COLUMN is_parcelada BOOLEAN DEFAULT FALSE;
ALTER TABLE transacao ADD COLUMN parcela_atual INTEGER;
ALTER TABLE transacao ADD COLUMN parcelas_total INTEGER;
ALTER TABLE transacao ADD COLUMN valor_total_parcelado DECIMAL(12,2);
ALTER TABLE transacao ADD COLUMN compra_internacional BOOLEAN DEFAULT FALSE;
ALTER TABLE transacao ADD COLUMN moeda_original VARCHAR(3);
ALTER TABLE transacao ADD COLUMN taxa_conversao DECIMAL(10,6);
ALTER TABLE transacao ADD COLUMN iof DECIMAL(10,2);

CREATE INDEX idx_transacao_fatura ON transacao(fatura_id);
```

---

## 5. Regras de Negócio

### 5.1 Cálculo de Limite Disponível
```typescript
limite_disponivel = limite_total - (fatura_aberta + lancamentos_futuros)
```

### 5.2 Determinação da Fatura de um Lançamento
```typescript
if (data_transacao <= data_fechamento_fatura) {
  // vai para fatura atual
} else {
  // vai para próxima fatura
}
```

### 5.3 Melhor Dia de Compra
```typescript
melhor_dia = (dia_fechamento + 1) % 31 || 1
prazo_pagamento = vencimento - fechamento + dias_no_mes
```

**Exemplo:**
- Fechamento: dia 10
- Vencimento: dia 20
- Melhor dia: 11 (compra no dia 11 = ~40 dias para pagar)

### 5.4 Parceladas no Cartão
- Cada parcela é uma transação separada com referência à compra original
- `valor_total_parcelado` armazena o valor original
- Faturas futuras já mostram parcelas previstas
- Usuário pode vincular manualmente se importação não detectar

### 5.5 Pagamento de Fatura
1. Cria transação de saída na conta bancária
2. Cria transação de entrada no cartão (positiva, tipo "pagamento_fatura")
3. Atualiza `fatura.status` e `fatura.valor_pago`
4. Recalcula `limite_disponivel`

### 5.6 Compras Internacionais
- `moeda_original` e `valor_original` preservados
- IOF calculado (6,38% típico) e registrado separadamente
- Taxa de conversão salva para auditoria
- Categoria "Taxas/IOF" pode ser usada para o IOF

---

## 6. Alertas Inteligentes

### 6.1 Vencimento
- **Amarelo:** 7 dias ou menos antes do vencimento
- **Vermelho:** fatura vencida

**Mensagens:**
- Vencimento próximo: "Fatura vence em X dias"
- Vencida: "Fatura vencida! Realize o pagamento o quanto antes"

### 6.2 Limite
- **Verde:** < 50% do limite (saudável)
- **Amarelo:** 50-80% do limite (atenção)
- **Vermelho:** > 80% do limite (crítico)

**Triggers para notificações:**
- 80% do limite: toast de alerta
- 90% do limite: toast + destaque no card
- 100% do limite: toast crítico + bloqueio de novas compras (sugestão)

---

## 7. Integrações

### 7.1 Com Importação
- Templates de CSV/OFX reconhecem cartões automaticamente
- Vincular transações importadas à fatura correta
- Detectar parceladas por padrões (ex.: "3/12" na descrição)

### 7.2 Com Classificação
- Transações de pagamento de fatura auto-categorizadas como "Pagamento Cartão"
- IOF auto-categorizado como "Taxas/IOF"
- Regras específicas para descrições de cartão

### 7.3 Com Orçamento
- Gastos no cartão impactam orçamento na categoria correta
- Lançamentos futuros podem ser incluídos na projeção (toggle)
- Alertas de orçamento consideram compras pendentes

### 7.4 Com Dashboards
- DFC mostra entrada (pagamento recebido) e saída (compras)
- Evolução M/M compara gastos no cartão
- Top despesas inclui transações de cartão

### 7.5 Com Recorrências
- Assinaturas no cartão detectadas automaticamente
- Sugestão de criar recorrência para lançamentos mensais similares

---

## 8. Próximos Passos (Implementação)

### 8.1 Backend/Database ⚠️ PENDENTE
- [ ] Criar migrations para `cartao_credito` e `fatura`
- [ ] Adicionar campos de cartão na tabela `transacao`
- [ ] Implementar RLS policies
- [ ] Criar índices necessários

### 8.2 Services ⚠️ PENDENTE
- [ ] **CartaoService:**
  - CRUD de cartões
  - Cálculo de limite disponível
  - Cálculo de melhor dia de compra
- [ ] **FaturaService:**
  - Criar fatura mensal automaticamente
  - Fechar fatura no dia correto
  - Vincular transação à fatura
  - Calcular valor total da fatura
  - Registrar pagamento
- [ ] **ParceladaService:**
  - Detectar parceladas na importação
  - Gerar cronograma de parcelas
  - Vincular parcelas à compra original

### 8.3 API Routes ⚠️ PENDENTE
- [ ] `POST /api/cartoes` — Criar cartão
- [ ] `GET /api/cartoes` — Listar cartões do usuário
- [ ] `GET /api/cartoes/:id` — Detalhes de um cartão
- [ ] `PATCH /api/cartoes/:id` — Atualizar cartão
- [ ] `DELETE /api/cartoes/:id` — Excluir cartão
- [ ] `GET /api/cartoes/:id/faturas` — Listar faturas do cartão
- [ ] `GET /api/faturas/:id` — Detalhes da fatura
- [ ] `POST /api/faturas/:id/pagar` — Registrar pagamento

### 8.4 UI/UX ⚠️ PENDENTE
- [ ] Modal de criação/edição de cartão (integrar `cartao-form.tsx`)
- [ ] Drawer/página de detalhes do cartão
- [ ] Modal de registro de pagamento
- [ ] Dashboard de análises e insights
- [ ] Visualização de faturas históricas (timeline)
- [ ] Projeção de faturas futuras
- [ ] Gráficos de evolução de gastos por cartão

### 8.5 Jobs/Automações ⚠️ PENDENTE
- [ ] **Cron diário:** verificar faturas a vencer e disparar alertas
- [ ] **Cron mensal:** fechar faturas automaticamente (dia de fechamento)
- [ ] **Cron mensal:** criar próxima fatura automaticamente
- [ ] **Trigger:** recalcular `limite_disponivel` ao adicionar transação

---

## 9. Testes

### 9.1 Unitários
- [ ] Cálculo de melhor dia de compra
- [ ] Cálculo de limite disponível
- [ ] Determinação da fatura de um lançamento
- [ ] Validações do formulário

### 9.2 Integração
- [ ] Criar cartão via API
- [ ] Importar transações e vincular à fatura correta
- [ ] Registrar pagamento e atualizar status/saldo
- [ ] Fechar fatura automaticamente

### 9.3 E2E
- [ ] Fluxo completo: criar cartão → importar extrato → visualizar fatura → pagar
- [ ] Alertas de vencimento disparam corretamente
- [ ] Parceladas aparecem em faturas futuras

---

## 10. Critérios de Aceite

- [x] Página `/cartoes` renderiza corretamente
- [x] Cards de resumo exibem dados mock
- [x] Grid de cartões responsivo (3/2/1 colunas)
- [x] Barra de progresso de limite funciona
- [x] Cores por status de utilização corretas
- [x] Formulário de cartão com todos os campos
- [x] Cálculo do melhor dia de compra correto
- [x] Componente de fatura com alertas de vencimento
- [x] Lista de transações na fatura
- [ ] CRUD de cartões funcional (backend)
- [ ] Transações importadas vinculam à fatura correta
- [ ] Limite disponível sempre preciso
- [ ] Fatura fecha automaticamente na data correta
- [ ] Alertas disparam nos momentos corretos
- [ ] Pagamento de fatura registra transações e atualiza saldos
- [ ] Parceladas exibem progresso (ex: "Parcela 5 de 12")
- [ ] UI responsiva e performática (<1s para carregar 10 cartões)

---

## 11. Documentação de Referência

- **PRD v1:** Seção 6 — Gestão de Cartões de Crédito
- **Arquitetura:** Seção 12 — Gestão de Cartões de Crédito
- **Figma/Designs:** (A definir)

---

**Última atualização:** 2025-10-27
**Responsável:** Guilherme (PO)
**Status:** ✅ UI completa | ⚠️ Backend e integrações pendentes
