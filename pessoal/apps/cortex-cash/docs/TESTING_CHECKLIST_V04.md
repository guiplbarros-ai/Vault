# Testing Checklist - v0.4
**Validação completa das features implementadas | Agent APP**

## 🎯 Objetivo

Validar todas as features da v0.4 enquanto aguardamos os outros agentes completarem suas tarefas.

---

## ✅ Checklist de Testes

### 🤖 1. Classificação com IA (Agent APP)

#### 1.1 Botão de Classificação em Transações
**Arquivo:** `app/transactions/page.tsx`

- [ ] **Visibilidade do botão**
  - Ir em `/transactions`
  - Criar nova transação sem categoria
  - Verificar se botão "Classificar com IA" (ícone 🧠) aparece no dropdown de ações

- [ ] **Classificação individual**
  - Clicar em "Classificar com IA" em uma transação
  - Verificar loading state (spinner)
  - Verificar se categoria sugerida aparece após 1-2s
  - Confirmar se confiança (%) é exibida

- [ ] **Estados de erro**
  - Tentar classificar sem API Key configurada
  - Verificar mensagem de erro amigável
  - Tentar classificar transação já classificada
  - Verificar comportamento esperado

#### 1.2 AIUsageCard no Dashboard
**Arquivo:** `app/page.tsx:226`

- [ ] **Renderização**
  - Ir em `/` (Dashboard)
  - Verificar se `AIUsageCard` é exibido
  - Card deve mostrar: custo do mês, total de classificações, limite configurado

- [ ] **Dados em tempo real**
  - Fazer classificação de uma transação
  - Voltar ao Dashboard
  - Verificar se contador aumentou
  - Verificar se custo foi atualizado

- [ ] **Indicador de limite**
  - Se custo > 80% do limite: deve exibir warning (amarelo)
  - Se custo > 100% do limite: deve exibir erro (vermelho)
  - Se custo < 80%: normal (verde)

#### 1.3 AccuracyWidget no Dashboard
**Arquivo:** `app/page.tsx:249` (linha 249 na grid de widgets)

- [ ] **Renderização**
  - Ir em `/` (Dashboard)
  - Verificar se `AccuracyWidget` é exibido
  - Widget deve mostrar: acurácia geral, total de classificações, gráfico de confiança

- [ ] **Cálculo de acurácia**
  - Classificar 3 transações com IA
  - Aceitar 2, rejeitar 1 (manualmente mudar categoria)
  - Verificar se acurácia = 66.7%

- [ ] **Gráfico de distribuição**
  - Verificar se gráfico de barras mostra distribuição de confiança
  - Categorias: Alta (>80%), Média (50-80%), Baixa (<50%)

---

### 📊 2. Páginas de Gestão de IA

#### 2.1 Página de Regras de Classificação
**Arquivo:** `app/settings/classification-rules/page.tsx`

- [ ] **Listagem de regras**
  - Ir em `/settings/classification-rules`
  - Verificar se regras seed aparecem (se banco foi populado)
  - Verificar ordenação por prioridade

- [ ] **Criar nova regra**
  - Clicar em "Nova Regra"
  - Preencher: padrão = "spotify", categoria = "Streaming", prioridade = 10
  - Salvar
  - Verificar se regra aparece na lista

- [ ] **Editar regra**
  - Clicar em "Editar" em uma regra
  - Alterar padrão ou categoria
  - Salvar
  - Verificar se mudança foi persistida

- [ ] **Ativar/desativar regra**
  - Toggle switch de ativar/desativar
  - Verificar se regra fica visualmente diferente quando inativa
  - Fazer classificação: regra inativa não deve ser aplicada

- [ ] **Deletar regra**
  - Clicar em "Deletar" em uma regra
  - Confirmar modal
  - Verificar se regra foi removida

#### 2.2 Página de Auditoria de IA
**Arquivo:** `app/settings/ai-audit/page.tsx`

- [ ] **Listagem de classificações**
  - Ir em `/settings/ai-audit`
  - Verificar se histórico de classificações aparece
  - Colunas: data, transação, categoria sugerida, confiança, aceito/rejeitado

- [ ] **Filtros**
  - Filtrar por mês/período
  - Filtrar por categoria
  - Filtrar por aceito/rejeitado
  - Verificar se resultados mudam corretamente

- [ ] **Gráficos de análise**
  - Verificar gráfico de acurácia ao longo do tempo
  - Verificar gráfico de distribuição de confiança
  - Verificar gráfico de custos por mês

- [ ] **Export de dados**
  - Clicar em "Exportar CSV"
  - Verificar se arquivo é baixado com dados corretos

---

### ⚙️ 3. Configurações de IA

**Arquivo:** `app/settings/page.tsx` (seção de IA)

- [ ] **Configurar API Key**
  - Ir em `/settings`
  - Seção "IA e Custos"
  - Inserir API Key válida
  - Salvar
  - Verificar se sistema detecta (fazer teste de classificação)

- [ ] **Configurar modelo**
  - Alterar modelo entre: gpt-4o-mini, gpt-4o, gpt-3.5-turbo
  - Salvar
  - Fazer classificação
  - Verificar no console do browser qual modelo foi usado

- [ ] **Configurar limite de custo**
  - Definir limite mensal (ex: $10 USD)
  - Salvar
  - Verificar se `AIUsageCard` reflete novo limite

- [ ] **Estratégia de classificação**
  - Escolher entre: "balanced", "quality", "cost"
  - Salvar
  - Verificar comportamento em batch classification

---

### 🧪 4. Testes de Integração

#### 4.1 Fluxo Completo: Importação + Classificação
- [ ] **Setup**
  - Criar conta teste (ex: "Banco Teste")
  - Preparar arquivo CSV com 10 transações

- [ ] **Importação**
  - Ir em `/import`
  - Fazer upload do CSV
  - Mapear colunas
  - Marcar opção "Classificar automaticamente com IA" ✅
  - Confirmar importação

- [ ] **Validação**
  - Verificar se 10 transações foram criadas
  - Verificar se categorias foram sugeridas automaticamente
  - Verificar se confiança foi registrada
  - Ir em Dashboard: `AIUsageCard` deve mostrar +10 classificações

- [ ] **Auditoria**
  - Ir em `/settings/ai-audit`
  - Verificar se 10 registros de classificação aparecem
  - Verificar custo total da operação

#### 4.2 Fluxo Completo: Regra + IA
- [ ] **Setup**
  - Criar regra: padrão = "uber", categoria = "Transporte"
  - Ativar regra

- [ ] **Teste**
  - Criar transação: descricao = "uber viagem", sem categoria
  - Clicar em "Classificar com IA"

- [ ] **Validação**
  - Regra deve ser aplicada ANTES de chamar IA
  - Categoria = "Transporte" (pela regra)
  - Custo = R$ 0,00 (não chamou IA)
  - Verificar em `/settings/ai-audit`: deve aparecer "Rule matched"

---

### 📱 5. Responsividade e UX

#### 5.1 Mobile (viewport < 768px)
- [ ] **Dashboard**
  - Abrir em mobile (ou DevTools responsive)
  - Verificar se widgets empilham corretamente
  - `AIUsageCard` e `AccuracyWidget` devem ficar full-width

- [ ] **Transactions Page**
  - Dropdown de ações funciona no mobile
  - Botão "Classificar com IA" acessível
  - Loading states visíveis

- [ ] **Settings Pages**
  - Formulários de regras responsivos
  - Tabelas de auditoria com scroll horizontal

#### 5.2 Dark Mode
- [ ] **Tema escuro**
  - Ir em `/settings`
  - Alterar tema para "dark"
  - Verificar se todos os componentes de IA respeitam dark mode
  - Cores de gráficos devem ser legíveis

---

### 🐛 6. Testes de Edge Cases

- [ ] **Classificação sem internet**
  - Desconectar internet
  - Tentar classificar
  - Verificar mensagem de erro apropriada

- [ ] **API Key inválida**
  - Configurar API Key errada
  - Tentar classificar
  - Verificar mensagem: "API Key inválida"

- [ ] **Transação sem descrição**
  - Criar transação com descrição vazia
  - Tentar classificar
  - Verificar se sistema rejeita ou pede descrição

- [ ] **Limite de custo atingido**
  - Configurar limite = $0.01
  - Fazer múltiplas classificações até atingir
  - Verificar se sistema bloqueia novas classificações

- [ ] **Descrição muito longa**
  - Criar transação com 500+ caracteres na descrição
  - Classificar
  - Verificar se não quebra UI

---

## 🎯 Critérios de Aceitação v0.4

Para considerar v0.4 COMPLETA e APROVADA:

- [ ] **Todos os 6 blocos acima passam** (62 checkboxes)
- [ ] **Build passa** sem erros TypeScript
- [ ] **Lint passa** sem warnings críticos
- [ ] **Documentação atualizada** (já feito ✅)
- [ ] **Performance aceitável** (<2s para classificação individual)

---

## 📊 Resultado Esperado

Após completar esta checklist, você terá validado:

1. ✅ Integração completa de IA na UI (Agent APP)
2. ✅ Sistema de regras funcionando
3. ✅ Auditoria e monitoramento de custos
4. ✅ Widgets de analytics no dashboard
5. ✅ Responsividade e acessibilidade
6. ✅ Tratamento de erros robusto

---

## 🚀 Próximos Passos

Quando esta checklist estiver completa:

1. Marcar v0.4 como **VALIDADA** ✅
2. Documentar bugs encontrados (se houver)
3. Iniciar v0.5: drag-and-drop + analytics dashboard

---

**Criado em:** 05 de Novembro de 2025
**Agent responsável:** Agent APP
**Status:** Em validação
**Estimativa:** 2-3 horas de testes manuais
