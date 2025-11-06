# FINANCE: Regras de Classificação v0.5

**Agent FINANCE**: Owner
**Data**: 05 de Novembro de 2025
**Status**: ✅ Completo

---

## 📋 Resumo

Implementação completa do sistema de regras de classificação automática com seed inicial e métricas de acurácia.

## ✨ Features Implementadas

### 1. Seed de Regras Comuns (15 regras)

**Arquivo**: `lib/db/seed-rules.ts`

**Categorias cobertas**:
- **Transporte** (3 regras): Uber, 99, Postos de gasolina
- **Alimentação** (4 regras): iFood, Rappi, Restaurantes, Supermercados
- **Entretenimento** (5 regras): Netflix, Spotify, Amazon Prime, Disney+, YouTube Premium
- **Casa** (3 regras): Luz, Internet/TV, Água

**Características**:
- ✅ Idempotente (não duplica regras existentes)
- ✅ Prioridades ordenadas (1-22)
- ✅ Mix de tipos: `contains` (9), `regex` (6)
- ✅ Padrões otimizados para mercado brasileiro

**Funções**:
```typescript
seedCommonRules(): Promise<{ inserted, skipped, errors }>
clearCommonRules(): Promise<number>
```

---

### 2. Página de Seed Dev

**Arquivo**: `app/dev/seed-rules/page.tsx`

**Features**:
- ✅ Executar seed (botão "Executar Seed")
- ✅ Limpar seed (botão "Limpar Seed")
- ✅ Reset completo (limpar + recriar)
- ✅ Resultado detalhado (inseridas/puladas/erros)
- ✅ Preview das 15 regras disponíveis
- ✅ Toasts informativos

**Acesso**: `http://localhost:3001/dev/seed-rules`

---

### 3. Métricas de Acurácia

#### 3.1 Campos Adicionados ao Type

**Arquivo**: `lib/types/index.ts`

```typescript
export interface RegraClassificacao {
  // ... campos existentes
  total_confirmacoes: number;  // NOVO
  total_rejeicoes: number;     // NOVO
  // ... outros campos
}
```

#### 3.2 Métodos no Service

**Arquivo**: `lib/services/regra-classificacao.service.ts`

**Novos métodos**:

1. **`registrarConfirmacao(regra_id: string)`**
   - Incrementa `total_confirmacoes`
   - Chamado quando usuário mantém classificação

2. **`registrarRejeicao(regra_id: string)`**
   - Incrementa `total_rejeicoes`
   - Chamado quando usuário altera categoria

3. **`getAcuracia(regra_id: string): Promise<number | null>`**
   - Calcula: `(confirmações / (confirmações + rejeições)) * 100`
   - Retorna null se sem dados

4. **`getMetricasDetalhadas(): Promise<Metrica[]>`**
   - Lista todas as regras com métricas completas
   - Útil para dashboards

#### 3.3 Componente de UI

**Arquivo**: `components/classification/rule-metrics.tsx`

**Features**:
- ✅ Lista top 10 regras por acurácia
- ✅ Indicadores visuais:
  - 🟢 Verde: ≥80% acurácia
  - 🟡 Amarelo: 60-79% acurácia
  - 🔴 Vermelho: <60% acurácia
- ✅ Estatísticas por regra:
  - Total de aplicações
  - Confirmações vs. Rejeições
  - Taxa de acurácia
- ✅ Resumo geral:
  - Total de aplicações (todas as regras)
  - Total de confirmações
  - Acurácia geral do sistema
- ✅ Estado vazio (sem dados)
- ✅ Loading state com skeletons

**Como usar**:
```tsx
import { RuleMetrics } from '@/components/classification/rule-metrics';

// Em qualquer página:
<RuleMetrics />
```

---

## 🔄 Fluxo de Tracking

### Quando classificação é aplicada:

1. **Regra aplicada** → `aplicarRegras()` incrementa `total_aplicacoes`
2. **Usuário edita transação**:
   - Manteve categoria? → `registrarConfirmacao(regra_id)`
   - Mudou categoria? → `registrarRejeicao(regra_id)`

### Cálculo de Acurácia:

```typescript
const acuracia = (confirmacoes / (confirmacoes + rejeicoes)) * 100;
```

**Exemplo**:
- 15 aplicações, 12 confirmadas, 3 rejeitadas → **80% de acurácia**

---

## 📦 Arquivos Criados/Modificados

### Criados (4 arquivos):
1. `lib/db/seed-rules.ts` - Seed de 15 regras comuns
2. `app/dev/seed-rules/page.tsx` - Página de seed dev
3. `components/classification/rule-metrics.tsx` - Componente de métricas
4. `scripts/test-seed-rules.mjs` - Script de teste

### Modificados (3 arquivos):
1. `lib/types/index.ts` - Adicionou campos `total_confirmacoes` e `total_rejeicoes`
2. `lib/services/regra-classificacao.service.ts` - Adicionou 4 métodos de métricas
3. `app/api/import/process/route.ts` - Fix: removeu duplicate import
4. `lib/services/transacao.service.ts` - Fix: adicionou import `generateHash`

---

## 🧪 Como Testar

### 1. Executar Seed
```bash
# Acesse a página dev
http://localhost:3001/dev/seed-rules

# Clique em "Executar Seed"
# Resultado esperado: "15 regras criadas com sucesso!"
```

### 2. Verificar Regras Criadas
```typescript
import { regraClassificacaoService } from '@/lib/services/regra-classificacao.service';

const regras = await regraClassificacaoService.listRegras();
console.log(`Total de regras: ${regras.length}`); // 15
```

### 3. Testar Métricas (Programático)
```typescript
// Simular aplicação de regra
const categoriaId = await regraClassificacaoService.aplicarRegras('UBER VIAGEM');
// categoriaId será o ID da categoria "Transporte"

// Simular confirmação
await regraClassificacaoService.registrarConfirmacao(regra.id);

// Verificar acurácia
const acuracia = await regraClassificacaoService.getAcuracia(regra.id);
console.log(`Acurácia: ${acuracia}%`);
```

### 4. Visualizar Métricas na UI
```tsx
// Adicione o componente em qualquer página:
import { RuleMetrics } from '@/components/classification/rule-metrics';

<RuleMetrics />
```

---

## 📊 Exemplos de Regras

### Regra Simples (contains)
```typescript
{
  nome: 'Uber',
  tipo_regra: 'contains',
  padrao: 'UBER',
  categoria_nome: 'Transporte',
  prioridade: 1,
}
```

**Match**: "UBER VIAGEM", "uber", "UBER*TRIP"

---

### Regra Regex (múltiplas opções)
```typescript
{
  nome: 'Combustível (Posto)',
  tipo_regra: 'regex',
  padrao: '(POSTO|SHELL|IPIRANGA|BR MANIA|PETROBRAS)',
  categoria_nome: 'Transporte',
  prioridade: 3,
}
```

**Match**: "POSTO SHELL", "IPIRANGA", "PETROBRAS BR"

---

## 🔮 Próximos Passos (Agent APP)

1. **Integrar `<RuleMetrics />` na página existente**
   - Adicionar em `app/settings/classification-rules/page.tsx`
   - Sugestão: adicionar como aba ou seção colapsável

2. **Implementar tracking automático**
   - Hook no `TransactionForm` para detectar edições
   - Se `classificacao_origem === 'regra'`:
     - Categoria mantida → `registrarConfirmacao()`
     - Categoria alterada → `registrarRejeicao()`

3. **UI de regra individual**
   - Ao clicar em uma regra no dashboard, mostrar:
     - Histórico de aplicações
     - Gráfico de acurácia ao longo do tempo
     - Exemplos de transações confirmadas/rejeitadas

---

## ⚠️ Notas Importantes

1. **Dexie Schema**: Campos novos são armazenados automaticamente (não precisa migração)
2. **Prioridade**: Menor número = maior prioridade (1 = mais importante)
3. **Idempotência**: Seed pode ser executado múltiplas vezes sem duplicar
4. **Performance**: getMetricasDetalhadas() não é indexado - OK para <1000 regras

---

## 📈 Métricas de Implementação

- **Linhas de código**: ~600 linhas
- **Arquivos criados**: 4
- **Arquivos modificados**: 4
- **Testes**: 100% compilação TypeScript
- **Tempo estimado**: 2-3h

---

## ✅ Checklist de Conclusão

- [x] Seed de 15 regras comuns
- [x] Página de seed dev (`/dev/seed-rules`)
- [x] Campos de métricas no type
- [x] Métodos de tracking no service
- [x] Componente de UI (`<RuleMetrics />`)
- [x] Script de teste
- [x] Documentação completa
- [x] TypeScript compilation OK
- [x] Zero erros relacionados

---

**Última atualização**: 05 de Novembro de 2025
**Dúvidas**: Consulte Agent FINANCE
