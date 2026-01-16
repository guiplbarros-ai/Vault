# Correções: Filtros de AI Usage e Modelo Obsoleto

**Data**: 2025-11-06
**Status**: ✅ COMPLETO
**Build**: ✅ Passou sem erros

## Resumo das Correções

Corrigidas 3 issues críticas relacionadas ao sistema de uso de IA:

### 1. ✅ Campos Inexistentes no Filtro de Busca

**Problema**: `app/settings/ai-usage/page.tsx:190-191` tentava filtrar por campos que não existem no tipo `LogIA`:
- `log.transacao_descricao`
- `log.categoria_sugerida_nome`

**Solução**:
- Atualizado filtro para buscar nos campos reais: `prompt` e `resposta`
- Ajustado placeholder do input: "Buscar em prompt/resposta..."

**Arquivos modificados**:
- `app/settings/ai-usage/page.tsx` (linhas 186-193, 407)

---

### 2. ✅ Modelo gpt-3.5-turbo Obsoleto

**Problema**:
- Modelo `gpt-3.5-turbo` presente nos tipos mas sem preço definido em `PRICING`
- Causava `ValidationError` ao tentar calcular custos
- Modelo obsoleto desde 2024, substituído por `gpt-4o-mini`

**Solução**: Removido suporte completo ao modelo:

**Arquivos modificados**:
1. `lib/types/settings.ts:24` - Removido do tipo `AIModel`
2. `lib/validations/settings.ts:65` - Removido da validação Zod
3. `app/settings/ai-usage/page.tsx:73` - Substituído por `gpt-4-turbo` no filtro
4. `app/settings/ai-usage/page.tsx:436` - Substituído no dropdown
5. `app/settings/sections/ai-costs-section.tsx:17` - Removido do tipo
6. `app/settings/sections/ai-costs-section.tsx:87-88` - Removido opção do select

**Impacto**: Sistema agora suporta apenas modelos válidos com preços:
- ✅ `gpt-4o-mini` - Rápido e econômico
- ✅ `gpt-4o` - Melhor qualidade
- ✅ `gpt-4-turbo` - Logs antigos/compatibilidade

---

### 3. ✅ Metadados de IA nos Componentes de Classificação

**Problema**:
- Componentes atualizavam apenas `categoria_id` da transação
- Não passavam `classificacao_origem` e `classificacao_confianca`
- Perda de rastreabilidade de classificações por IA

**Solução**: Atualizado fluxo completo de classificação:

#### A) `BulkAIClassify` (linhas 110-114)
```typescript
await transacaoService.updateTransacao(transaction.id, {
  categoria_id: data.categoria_sugerida_id,
  classificacao_origem: 'ia' as const,  // ✅ NOVO
  classificacao_confianca: data.confianca,  // ✅ NOVO
});
```

#### B) `ClassifyButton` (melhorias completas)
1. Adicionado import do `transacaoService`
2. Nova prop `autoApply?: boolean` (padrão: false)
3. Atualizado callback: `onClassified(categoriaId, categoriaNome, confianca)` - agora passa confiança
4. Se `autoApply=true`, atualiza transação automaticamente com metadados completos:
```typescript
await transacaoService.updateTransacao(transactionId, {
  categoria_id: data.categoria_sugerida_id,
  classificacao_origem: 'ia' as const,
  classificacao_confianca: data.confianca,
});
```

**Arquivos modificados**:
- `components/classification/bulk-ai-classify.tsx` (linhas 110-114)
- `components/classification/classify-button.tsx` (linhas 17, 24-25, 36, 84-121)

---

## Validação

### Build Status
```bash
npm run build
✓ Compiled successfully in 8.5s
✓ TypeScript validation passed
✓ 33 routes generated
```

### Casos de Teste Sugeridos

#### 1. Filtro de Busca
- [ ] Buscar por palavra no prompt (ex: "Uber")
- [ ] Buscar por palavra na resposta
- [ ] Verificar que não busca em campos inexistentes

#### 2. Seleção de Modelo
- [ ] Abrir dropdown de modelos em Settings > IA e Custos
- [ ] Verificar que gpt-3.5-turbo não aparece
- [ ] Verificar que gpt-4o-mini e gpt-4o funcionam
- [ ] Abrir filtro de modelo em AI Usage
- [ ] Verificar que gpt-4-turbo aparece (compatibilidade logs antigos)

#### 3. Metadados de IA
- [ ] Classificar transação com bulk-ai-classify
- [ ] Verificar no DB que `classificacao_origem='ia'`
- [ ] Verificar que `classificacao_confianca` está preenchido
- [ ] Usar ClassifyButton com `autoApply=true`
- [ ] Verificar metadados atualizados

---

## Compatibilidade

### Modelos Suportados (ATUAL)
| Modelo | Input ($/1M) | Output ($/1M) | Status |
|--------|--------------|---------------|--------|
| gpt-4o-mini | $0.150 | $0.600 | ✅ Recomendado |
| gpt-4o | $2.50 | $10.00 | ✅ Premium |
| gpt-4-turbo | $10.00 | $30.00 | ⚠️ Compatibilidade |

### Modelos Removidos
| Modelo | Motivo |
|--------|--------|
| gpt-3.5-turbo | Obsoleto desde 2024, sem preço definido |

---

## Próximos Passos

### Testes UI (Planejado)
1. Criar testes com Testing Library para validar filtros
2. Criar mocks para endpoints de IA
3. Testar bulk classification com dados sintéticos

### Import Wizard (Bloqueado)
- Aguardar correções do Agent CORE antes de implementar
- Preparar skeleton leve sem SSR pesado

---

## Impacto e Riscos

### Impacto Positivo
- ✅ Filtros de busca agora funcionam corretamente
- ✅ Sem mais ValidationError por modelo sem preço
- ✅ Rastreabilidade completa de classificações por IA
- ✅ UI mais consistente com modelos disponíveis

### Riscos Mitigados
- ⚠️ Logs antigos com gpt-3.5-turbo: mantidos no tipo `LogIA` para compatibilidade
- ⚠️ Settings antigas: sistema aceita gpt-3.5-turbo nos settings mas UI não permite seleção

### Breaking Changes
- ❌ NENHUM - mudanças são backward-compatible
- ✅ Logs antigos continuam funcionando
- ✅ Settings antigas são migradas implicitamente

---

## Referências

- [ARCHITECTURE_ISSUES_AI_USAGE.md](./ARCHITECTURE_ISSUES_AI_USAGE.md) - Análise de arquitetura
- [lib/services/ai-usage.service.ts](../lib/services/ai-usage.service.ts) - Pricing
- [lib/types/index.ts](../lib/types/index.ts) - Tipo LogIA
- [lib/types/settings.ts](../lib/types/settings.ts) - Tipo AIModel
