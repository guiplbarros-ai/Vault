# Fórmulas de Cálculo - Budget Cortihouse

## 1. CORTINAS HOSPITALARES

### Fator de Franzido
```
FATOR_HOSPITALAR = 1.65
```

### Cálculo de Materiais

```typescript
interface InputHospitalar {
  largura: number       // metros
  altura: number        // metros (geralmente 2.00)
  peDireito: number     // metros
  incluiTrilho: boolean
  incluiInstalacao: boolean
  quantidadeCurvas: number
}

function calcularHospitalar(input: InputHospitalar) {
  const FATOR = 1.65
  const ALTURA_VINIL = 2.00
  const ESPACAMENTO_GANCHO = 0.15 // 15cm

  // Largura do tecido com franzido
  const larguraTecido = input.largura * FATOR

  // Determinar altura da tela colméia
  let alturaTela: number
  if (input.peDireito <= 2.60) {
    alturaTela = 0.60
  } else {
    alturaTela = 0.90
  }

  // Verificar necessidade de rebaixamento
  const precisaRebaixamento = input.peDireito > 3.10

  // Calcular metros quadrados
  const m2Vinil = larguraTecido * ALTURA_VINIL
  const m2Tela = larguraTecido * alturaTela

  // Calcular acessórios
  const qtdGanchos = Math.ceil(larguraTecido / ESPACAMENTO_GANCHO)
  const qtdIlhoses = qtdGanchos
  const qtdDeslizantes = qtdGanchos

  // Calcular trilho (se incluído)
  let trilho = null
  if (input.incluiTrilho) {
    trilho = {
      metros: input.largura, // trilho = largura do vão
      suportes: calcularSuportes(input.largura),
      tampas: 1, // par
      curvas: input.quantidadeCurvas
    }
  }

  return {
    vinil: { m2: m2Vinil },
    telaColmeia: { m2: m2Tela },
    ilhoses: { quantidade: qtdIlhoses },
    ganchos: { quantidade: qtdGanchos },
    deslizantes: { quantidade: qtdDeslizantes },
    trilho,
    precisaRebaixamento,
    alturaTela
  }
}

function calcularSuportes(comprimentoTrilho: number): number {
  // Regra: 1 suporte a cada ~1m, mínimo 2
  if (comprimentoTrilho <= 1.5) return 2
  if (comprimentoTrilho <= 3.0) return 3
  return Math.ceil(comprimentoTrilho) + 1
}
```

### Tabela de Preços (PENDENTE)

| Material | Unidade | Preço | Status |
|----------|---------|-------|--------|
| Vinil VNS 45 | m² | R$ ? | ⏳ Aguardando |
| Tela Colméia | m² | R$ ? | ⏳ Aguardando |
| Trilho Suíço Luxo | m | R$ ? | ⏳ Aguardando |
| Suporte trilho | un | R$ ? | ⏳ Aguardando |
| Tampa trilho | par | R$ ? | ⏳ Aguardando |
| Curva trilho | un | R$ 30,00 | ✅ Confirmado |
| Ilhós niquelado | un | R$ ? | ⏳ Aguardando |
| Gancho PVC | un | R$ ? | ⏳ Aguardando |
| Deslizante | un | R$ ? | ⏳ Aguardando |
| Confecção | cortina | R$ ? | ⏳ Aguardando |
| Instalação | cortina | R$ ? | ⏳ Aguardando |

---

## 2. CORTINAS RESIDENCIAIS

### Fatores de Franzido (PENDENTE)

| Tipo | Fator | Status |
|------|-------|--------|
| Cortina de trilho | ? | ⏳ Aguardando |
| Cortina wave | ? | ⏳ Aguardando |
| Blackout | ? | ⏳ Aguardando |
| Voil | ? | ⏳ Aguardando |
| Painel | 1.0 (sem franzido) | ✅ Assumido |

### Cálculo de Tecido

```typescript
interface InputResidencial {
  largura: number         // largura da janela em metros
  altura: number          // altura desejada
  tipoCortina: string     // 'trilho' | 'wave' | 'blackout' | 'voil' | 'painel'
  tecidoId: string
}

function calcularResidencial(input: InputResidencial) {
  const FATORES: Record<string, number> = {
    trilho: 2.0,    // PENDENTE - confirmar
    wave: 2.5,      // PENDENTE - confirmar
    blackout: 2.0,  // PENDENTE - confirmar
    voil: 2.5,      // PENDENTE - confirmar
    painel: 1.0     // sem franzido
  }

  const MARGEM_LATERAL_TRILHO = 0.15 // 15cm de cada lado
  const MARGEM_ALTURA = 0.20 // 20cm para barras

  const fator = FATORES[input.tipoCortina] || 2.0

  // Largura do tecido necessária
  const larguraTecido = input.largura * fator

  // Altura do tecido necessária
  const alturaTecido = input.altura + MARGEM_ALTURA

  // Comprimento do trilho
  const comprimentoTrilho = input.largura + (MARGEM_LATERAL_TRILHO * 2)

  // Calcular panos (se largura > largura do rolo)
  const LARGURA_ROLO = 2.80 // PENDENTE - confirmar por tecido
  const quantidadePanos = Math.ceil(larguraTecido / LARGURA_ROLO)
  const metrosTecido = quantidadePanos * alturaTecido

  return {
    tecido: {
      larguraNecessaria: larguraTecido,
      alturaNecessaria: alturaTecido,
      quantidadePanos,
      metrosLineares: metrosTecido,
      precisaEmenda: quantidadePanos > 1
    },
    trilho: {
      comprimento: comprimentoTrilho,
      suportes: calcularSuportes(comprimentoTrilho)
    }
  }
}
```

---

## 3. PRODUTOS DE FORNECEDOR

### Cálculo com Markup

```typescript
interface InputFornecedor {
  custoFornecedor: number  // preço de custo
  fornecedor: 'kazza' | 'liber'
}

function calcularFornecedor(input: InputFornecedor) {
  const MARKUPS: Record<string, number> = {
    kazza: 0.30,  // 30% - PENDENTE confirmar
    liber: 0.30   // 30% - PENDENTE confirmar
  }

  const markup = MARKUPS[input.fornecedor]
  const precoFinal = input.custoFornecedor * (1 + markup)

  return {
    custo: input.custoFornecedor,
    markup: markup * 100, // em %
    precoFinal
  }
}
```

---

## 4. DESCONTOS

```typescript
type TipoDesconto = 'percentual' | 'fixo'

function aplicarDesconto(
  subtotal: number,
  valor: number,
  tipo: TipoDesconto
): number {
  if (tipo === 'percentual') {
    return subtotal * (1 - valor / 100)
  }
  return subtotal - valor
}

// Desconto padrão à vista: 3%
const DESCONTO_AVISTA = 3
```

---

## 5. CONSTANTES DO SISTEMA

```typescript
// src/constants/calculo.ts

export const CALCULO = {
  // Hospitalares
  hospitalar: {
    fatorFranzido: 1.65,
    alturaVinil: 2.00,
    alturaTelaColmeiaPequena: 0.60,
    alturaTelaColmeiaGrande: 0.90,
    peDireitoLimiteTelaGrande: 2.60,
    peDireitoLimiteRebaixamento: 3.10,
    espacamentoGancho: 0.15,
    precoCurva: 30.00,
  },

  // Residenciais (PENDENTE)
  residencial: {
    fatoresFranzido: {
      trilho: 2.0,
      wave: 2.5,
      blackout: 2.0,
      voil: 2.5,
      painel: 1.0,
    },
    margemLateralTrilho: 0.15,
    margemAltura: 0.20,
    larguraRoloPadrao: 2.80,
  },

  // Fornecedores (PENDENTE)
  fornecedores: {
    markupKazza: 0.30,
    markupLiber: 0.30,
  },

  // Geral
  geral: {
    descontoAvista: 3,
    validadePadrao: 15,
    prazoEntregaPadrao: 15,
    taxaRetorno: 100.00,
  },
}

// Preços unitários (PENDENTE - preencher após entrevista)
export const PRECOS = {
  hospitalar: {
    vinilM2: 0,           // R$/m²
    telaColmeiaM2: 0,     // R$/m²
    trilhoM: 0,           // R$/m
    suporteUn: 0,         // R$/un
    tampasPar: 0,         // R$/par
    curvaUn: 30.00,       // R$/un ✅
    ilhosUn: 0,           // R$/un
    ganchoUn: 0,          // R$/un
    deslizanteUn: 0,      // R$/un
    confeccaoUn: 0,       // R$/cortina
    instalacaoUn: 0,      // R$/cortina
  },
  residencial: {
    // Preenchido por produto no banco
  },
  servicos: {
    freteBH: 0,
    freteInteriorMG: 0,
    freteSP: 0,
    icmsSP: 0.06, // 6%
  },
}
```

---

## 6. CHECKLIST DE PREÇOS PENDENTES

### Hospitalares
- [ ] Vinil VNS 45 (R$/m²)
- [ ] Tela Colméia (R$/m²)
- [ ] Trilho Suíço Luxo (R$/m)
- [ ] Suporte (R$/un)
- [ ] Tampas (R$/par)
- [ ] Ilhós (R$/un)
- [ ] Gancho (R$/un)
- [ ] Deslizante (R$/un)
- [ ] Confecção (R$/cortina)
- [ ] Instalação (R$/cortina)

### Frete
- [ ] Frete BH/região
- [ ] Frete interior MG
- [ ] Frete SP

### Residenciais
- [ ] Fatores de franzido por tipo
- [ ] Lista de tecidos com preços
- [ ] Preços de trilhos residenciais

### Fornecedores
- [ ] Markup Kazza (%)
- [ ] Markup Liber (%)

---

*Documento de Cálculos v1.0 - PENDENTE dados de preços*
