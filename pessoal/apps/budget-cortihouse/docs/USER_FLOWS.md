# Fluxos de Usuário - Budget Cortihouse

## 1. MAPA DE NAVEGAÇÃO

```
LOGIN
  │
  ▼
DASHBOARD ─────────────────────────────────────────┐
  │                                                │
  ├── [Novo Orçamento] ──► WIZARD (4 etapas)       │
  │                           │                    │
  │                           ▼                    │
  │                        FINALIZAÇÃO             │
  │                           │                    │
  │                           ├── PDF              │
  │                           ├── WhatsApp         │
  │                           └── Email            │
  │                                                │
  ├── [Ver Orçamentos] ──► LISTA ──► DETALHES     │
  │                                    │          │
  │                                    ├── Editar │
  │                                    ├── Duplicar
  │                                    └── Status │
  │                                                │
  ├── [Clientes] ──► LISTA ──► DETALHES/EDITAR   │
  │                                                │
  ├── [Produtos] ──► LISTA ──► EDITAR            │
  │                                                │
  └── [Configurações] ──► EMPRESA / USUÁRIOS      │
```

---

## 2. FLUXO: CRIAR ORÇAMENTO

### Visão Geral
```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ CLIENTE  │ → │  ITENS   │ → │ REVISÃO  │ → │FINALIZAR │
│  (1/4)   │   │  (2/4)   │   │  (3/4)   │   │  (4/4)   │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

### Etapa 1: Cliente
```
┌─────────────────────────────────────────────────┐
│  NOVO ORÇAMENTO                      Passo 1/4  │
│  ───────────────────────────────────────────── │
│                                                 │
│  SELECIONAR CLIENTE                            │
│                                                 │
│  [🔍 Buscar por nome ou telefone...]           │
│                                                 │
│  ─── ou ───                                    │
│                                                 │
│  [+ Cadastrar novo cliente]                    │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Nome*:     [_________________________]  │   │
│  │ Telefone*: [(__)_____-____]            │   │
│  │ Email:     [_________________________]  │   │
│  │ Endereço:  [_________________________]  │   │
│  │ CNPJ:      [_________________________]  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│           [Cancelar]         [Próximo →]       │
└─────────────────────────────────────────────────┘
```

### Etapa 2: Itens
```
┌─────────────────────────────────────────────────┐
│  NOVO ORÇAMENTO                      Passo 2/4  │
│  ───────────────────────────────────────────── │
│                                                 │
│  AMBIENTES E ITENS                             │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🏠 SALA DE ESPERA                  [×]  │   │
│  │   ├─ Cortina Hospitalar 2.10×2.00m     │   │
│  │   │  Vinil Azul + Trilho               │   │
│  │   │  R$ 1.255,60                  [✏️] │   │
│  │   └─ [+ Adicionar item]                │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🛏️ LEITO 1                         [×]  │   │
│  │   ├─ Cortina Hospitalar 1.20×2.00m     │   │
│  │   │  Vinil Azul, sem trilho            │   │
│  │   │  R$ 639,00                    [✏️] │   │
│  │   └─ [+ Adicionar item]                │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [+ Adicionar ambiente]                        │
│                                                 │
│        [← Voltar]              [Próximo →]     │
└─────────────────────────────────────────────────┘
```

### Modal: Adicionar Item
```
┌─────────────────────────────────────────────────┐
│  ADICIONAR ITEM                            [×]  │
│  ───────────────────────────────────────────── │
│                                                 │
│  TIPO DE PRODUTO                               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│  │Hospital│ │Residenc│ │ Palco  │ │Fornece │  │
│  │   ✓    │ │        │ │        │ │  dor   │  │
│  └────────┘ └────────┘ └────────┘ └────────┘  │
│                                                 │
│  MEDIDAS                                       │
│  Largura: [2.10] m    Altura: [2.00] m        │
│                                                 │
│  PÉ DIREITO: [2.60] m                         │
│                                                 │
│  OPÇÕES                                        │
│  ☑️ Incluir trilho    ☑️ Incluir instalação   │
│  Curvas no trilho: [0]                         │
│                                                 │
│  ─────────────────────────────────────────     │
│  CÁLCULO AUTOMÁTICO                            │
│  • Vinil: 3.47m² × R$ 85 = R$ 294,95          │
│  • Tela: 2.08m² × R$ 45 = R$ 93,60            │
│  • Trilho: 2.10m × R$ 120 = R$ 252,00         │
│  • Acessórios: R$ 156,00                       │
│  • Mão de obra: R$ 350,00                      │
│  ─────────────────────────────────────────     │
│  SUBTOTAL: R$ 1.146,55                         │
│                                                 │
│           [Cancelar]           [Adicionar]     │
└─────────────────────────────────────────────────┘
```

### Etapa 3: Revisão
```
┌─────────────────────────────────────────────────┐
│  NOVO ORÇAMENTO                      Passo 3/4  │
│  ───────────────────────────────────────────── │
│                                                 │
│  REVISÃO                                       │
│                                                 │
│  Cliente: NEDG - Núcleo de Endoscopia          │
│  Endereço: Av. do Contorno, 2.905 - BH/MG     │
│                                                 │
│  ─────────────────────────────────────────     │
│  ITENS                                         │
│  ─────────────────────────────────────────     │
│                                                 │
│  SALA DE ESPERA                                │
│    • 3× Cortina 2.10×2.00m    R$ 3.766,80     │
│                                                 │
│  LEITO 1                                       │
│    • 5× Cortina 1.20×2.00m    R$ 3.195,00     │
│                                                 │
│  ─────────────────────────────────────────     │
│                    SUBTOTAL:   R$ 6.961,80     │
│                                                 │
│  DESCONTO                                      │
│  [  ]% ou R$[      ]          - R$ 0,00       │
│                                                 │
│  ═════════════════════════════════════════     │
│                       TOTAL:   R$ 6.961,80     │
│  ═════════════════════════════════════════     │
│                                                 │
│  Validade: [15] dias                           │
│  Prazo entrega: [15] dias úteis                │
│  Observações: [________________________]       │
│                                                 │
│        [← Voltar]              [Finalizar →]   │
└─────────────────────────────────────────────────┘
```

### Etapa 4: Finalização
```
┌─────────────────────────────────────────────────┐
│  NOVO ORÇAMENTO                      Passo 4/4  │
│  ───────────────────────────────────────────── │
│                                                 │
│           ✅ ORÇAMENTO CRIADO!                  │
│                                                 │
│           Proposta Nº 51/2026                  │
│           Cliente: NEDG                        │
│           Valor: R$ 6.961,80                   │
│                                                 │
│  ─────────────────────────────────────────     │
│                                                 │
│  O QUE DESEJA FAZER?                           │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │         📄 BAIXAR PDF                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │       📱 ENVIAR POR WHATSAPP            │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │         📧 ENVIAR POR EMAIL             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │           🖨️ IMPRIMIR                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│       [Criar outro]        [Ir para início]    │
└─────────────────────────────────────────────────┘
```

---

## 3. FLUXO: BUSCAR ORÇAMENTO

```
DASHBOARD
    │
    ├── Ver orçamentos recentes (últimos 5)
    │
    └── [Ver todos] ──► LISTA DE ORÇAMENTOS
                            │
                            ├── Buscar: [nome ou nº]
                            ├── Filtrar: [status ▼] [período ▼]
                            │
                            └── Clicar item ──► DETALHES
                                                    │
                                                    ├── [Editar] (se pendente)
                                                    ├── [Duplicar]
                                                    ├── [PDF]
                                                    ├── [WhatsApp]
                                                    └── [Alterar Status]
```

---

## 4. ESTADOS DE ORÇAMENTO

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ PENDENTE │ → │ APROVADO │ → │PRODUÇÃO  │ → │FINALIZADO│
└──────────┘   └──────────┘   └──────────┘   └──────────┘
      │
      ▼
┌──────────┐
│ CANCELADO│
└──────────┘
```

**Regras:**
- Pendente: pode editar
- Aprovado+: só pode duplicar

---

## 5. COMPONENTES DE UI

### Estados Visuais

**Loading:**
```
┌─────────────────────┐
│    ⟳ Carregando...  │
└─────────────────────┘
```

**Empty:**
```
┌─────────────────────────────────────┐
│                                     │
│     📋 Nenhum orçamento ainda       │
│                                     │
│     [Criar primeiro orçamento]      │
│                                     │
└─────────────────────────────────────┘
```

**Error:**
```
┌─────────────────────────────────────┐
│  ⚠️ Algo deu errado                 │
│                                     │
│  Não foi possível carregar.         │
│                                     │
│  [Tentar novamente]                 │
└─────────────────────────────────────┘
```

**Success (Toast):**
```
┌─────────────────────────────────────┐
│  ✅ Orçamento salvo com sucesso!    │
└─────────────────────────────────────┘
```

---

*Fluxos de Usuário v1.0*
