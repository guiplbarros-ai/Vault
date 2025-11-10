# Guia da Interface - Planejamento Financeiro

**Versão:** 1.0
**Data:** 2025-11-08
**Status:** Em Desenvolvimento

---

## 1. Visão Geral da UI

### 1.1 Estrutura de Navegação
```
Dashboard
└── Planejamento (/planejamento)
    ├── Lista de Cenários (grid de cards)
    ├── Detalhes do Cenário (/planejamento/[id])
    │   ├── Tab: Comportamento
    │   ├── Tab: Objetivos
    │   └── Tab: Eventos
    └── Modals
        ├── Novo Cenário
        ├── Ver Projeção Mensal
        └── Confirmação de Exclusão
```

### 1.2 Páginas Principais

#### Página de Listagem: `/planejamento/page.tsx`
- Grid responsivo de cards de cenários (3 colunas em desktop)
- Banner informativo com gradiente
- Modal de criação de cenário
- Modal de visualização de projeções
- Ações: Ver, Editar, Duplicar, Excluir

#### Página de Edição: `/planejamento/[id]/page.tsx`
- Sistema de tabs para organização (Comportamento, Objetivos, Eventos)
- Layout two-column: formulário + preview/resultados
- Projeção mensal em tempo real
- Lista de configurações ativas

---

## 2. Componentes da UI

### 2.1 Página de Listagem (`/planejamento`)

#### Header
```tsx
<PageHeader
  title="Planejamento Financeiro"
  description="Projete seu futuro financeiro e simule diferentes cenários"
/>
<Button>+ Novo Cenário</Button>
```

#### Banner Informativo
- **Estilo:** Gradiente #2C3E50 → #1a252f
- **Ícone:** Sparkles (cor #18B0A4)
- **Texto:** Explicação sobre funcionalidade

#### Cenário Card
**Layout:**
```
┌──────────────────────────────────────────┐
│ Nome do Cenário          [Badge: Base] ⋮ │ <- Dropdown menu
├──────────────────────────────────────────┤
│ 📅 Horizonte: 5 anos                     │
│                                           │
│ Patrimônio Final: R$ XXX                 │
│ Saving Acumulado: R$ XXX (verde)         │
│ Taxa de Saving: XX%                      │
│                                           │
│ 🎯 Objetivos (N)                         │
│   • Objetivo 1          [Badge: Status]  │
│   • Objetivo 2          [Badge: Status]  │
└──────────────────────────────────────────┘
```

**Métricas Exibidas:**
- Patrimônio Final (branco)
- Saving Acumulado (cor: #18B0A4)
- Taxa de Saving Média (branco)
- Lista de objetivos com status badges

**Dropdown Menu Actions:**
1. Editar Cenário (→ `/planejamento/[id]`)
2. Ver Projeção (abre modal)
3. Duplicar
4. Excluir (desabilitado se tipo="base")

#### Status de Objetivos
- **no_caminho:** Badge verde + CheckCircle
- **precisa_ajustes:** Badge amarelo + AlertTriangle
- **inviavel:** Badge vermelho + XCircle

---

### 2.2 Página de Edição (`/planejamento/[id]`)

#### Header com Breadcrumb
```tsx
[← Voltar] Nome do Cenário                [Badge: Cenário Base]
           Descrição do cenário
```

#### Sistema de Tabs
```
[⚙️ Comportamento] [🎯 Objetivos] [⚡ Eventos]
```
- **Tab ativa:** Background #18B0A4 + texto branco
- **Tab inativa:** Background white/10

---

### 2.3 Tab: Comportamento

#### Layout Two-Column

**Coluna Esquerda: Formulário de Nova Configuração**
```
┌─────────────────────────────────────────┐
│ Nova Configuração                        │
├─────────────────────────────────────────┤
│ Tipo: [Dropdown: Receita/Despesa/Inv]  │
│                                          │
│ (Se receita/despesa)                     │
│ Categoria: [Dropdown com categorias]    │
│ Modo: [Percentual / Valor Fixo / Zerar]│
│                                          │
│ (Se modo=percentual)                     │
│ Percentual de Mudança (%): [Input]      │
│                                          │
│ (Se modo=valor_fixo)                     │
│ Novo Valor Fixo: [Input]                │
│                                          │
│ (Se tipo=investimento)                   │
│ % do Saving para Investir: [Input]      │
│ Taxa de Retorno Mensal (%): [Input]     │
│                                          │
│ [+ Adicionar Configuração]               │
└─────────────────────────────────────────┘
```

**Campos Dinâmicos:**
- **Receita/Despesa:**
  - Categoria (filtrada por tipo)
  - Modo de Alteração
  - Percentual ou Valor Fixo (condicional)

- **Investimento:**
  - % do Saving para Investir
  - Taxa de Retorno Mensal

**Coluna Direita: Preview + Projeção**

**1. Configurações Ativas (Card)**
```
Configurações Ativas (N)
─────────────────────────
↗️ receita +10%           [🗑️]
↘️ despesa -30%          [🗑️]
📈 investimento           [🗑️]
```
- Max-height: 200px com scroll
- Cada config: tipo (ícone) + categoria + valor + botão delete

**2. Projeção Mensal (Card)**
```
Próximos 12 meses com as configurações aplicadas

┌───────┬──────────┬──────────┬─────────┬──────────┐
│ Mês   │ Receitas │ Despesas │ Saving  │ Patrimônio│
├───────┼──────────┼──────────┼─────────┼──────────┤
│ nov/25│ R$ X     │ R$ Y     │ R$ Z    │ R$ W     │
│ dez/25│ R$ X     │ R$ Y     │ R$ Z    │ R$ W     │
│ ...   │ ...      │ ...      │ ...     │ ...      │
└───────┴──────────┴──────────┴─────────┴──────────┘

Estados:
- Loading: Spinner
- Sem dados: "Nenhuma projeção disponível / Aguardando dados históricos"
- Com dados: Tabela com 12 linhas
```

**Cores da Tabela:**
- Receitas: Verde (#34D399)
- Despesas: Vermelho (#F87171)
- Saving: Verde/Vermelho (condicional)
- Patrimônio: #18B0A4 (bold)

---

### 2.4 Tab: Objetivos

#### Layout Two-Column

**Coluna Esquerda: Formulário de Novo Objetivo**
```
┌─────────────────────────────────────────┐
│ Novo Objetivo                            │
├─────────────────────────────────────────┤
│ Nome do Objetivo: [Input]               │
│ Valor Alvo: [Input number]              │
│ Data Alvo: [Input date]                 │
│ Categoria: [Select]                     │
│   • Casa                                │
│   • Carro                               │
│   • Viagem                              │
│   • Educação                            │
│   • Aposentadoria                       │
│   • Outro                               │
│ Prioridade: [Select]                    │
│   • Alta                                │
│   • Média                               │
│   • Baixa                               │
│                                          │
│ [+ Adicionar Objetivo]                  │
└─────────────────────────────────────────┘
```

**Coluna Direita: Preview - Objetivos Definidos**
```
Preview - Objetivos Definidos
N objetivo(s) cadastrado(s)

┌─────────────────────────────────────┐
│ 🎯 Comprar Casa    [Badge: Alta] [🗑️]│
│                                     │
│ Valor: R$ 500.000                   │
│ 📅 Data: 31/12/2028                │
│ Categoria: casa                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🎯 Viagem Europa   [Badge: Média] [🗑️]│
│                                     │
│ Valor: R$ 30.000                    │
│ 📅 Data: 15/06/2026                │
│ Categoria: viagem                   │
└─────────────────────────────────────┘
```

**Estados:**
- Vazio: Ícone Target + mensagem "Adicione objetivos à esquerda"
- Com dados: Lista com scroll (max-h-600px)

**Badge de Prioridade:**
- Alta: Variant "destructive" (vermelho)
- Média: Variant "secondary" (cinza)
- Baixa: Variant "default" (azul)

---

### 2.5 Tab: Eventos

**Estado Atual:** Em desenvolvimento
```
┌───────────────────────────────────────┐
│ Eventos Únicos                         │
├───────────────────────────────────────┤
│ Em breve: adicione eventos pontuais   │
│ como bônus, 13º, compras grandes, etc.│
└───────────────────────────────────────┘
```

---

## 3. Modais

### 3.1 Modal: Novo Cenário
**Trigger:** Botão "+ Novo Cenário"
**Campos:**
- Nome do Cenário* (placeholder: "Ex: Aposentadoria 2035, Compra de Casa")
- Descrição (textarea, opcional)
- Horizonte de Tempo (anos)* (min: 1, max: 10, default: 5)
**Ações:**
- [Cancelar] [Criar Cenário]

### 3.2 Modal: Ver Projeção Mensal
**Trigger:** Dropdown menu > "Ver Projeção"
**Conteúdo:**
- Tabela completa de projeções mês a mês
- Max-height: 80vh com scroll
- Colunas: Mês | Receitas | Despesas | Saving | Rendimentos | Patrimônio
**Ações:**
- [Fechar]

### 3.3 AlertDialog: Confirmar Exclusão
**Trigger:** Dropdown menu > "Excluir"
**Mensagem:**
"Tem certeza que deseja excluir este cenário? Esta ação não pode ser desfeita. Todos os dados de configurações e objetivos serão perdidos."
**Ações:**
- [Cancelar] [Excluir]

---

## 4. Design System

As orientações de UI foram consolidadas em um único documento. Para tokens, padrões visuais, componentes, estados e exemplos, consulte:

- `docs/features/TEMA.md` — Tema — Orientação de UI (Dark, sólido)

---

## 5. Interações e Comportamento

### 5.1 Fluxo de Criação de Cenário
1. Clicar "+ Novo Cenário"
2. Preencher modal (nome*, descrição, horizonte*)
3. Salvar → Redireciona para `/planejamento/[id]`
4. Adicionar configurações de comportamento
5. Adicionar objetivos financeiros
6. Ver projeções atualizadas em tempo real

### 5.2 Fluxo de Edição de Cenário
1. Na lista, clicar no menu dropdown (⋮)
2. Selecionar "Editar Cenário"
3. Navegar entre tabs:
   - **Comportamento:** Adicionar/remover configurações
   - **Objetivos:** Adicionar/remover objetivos
   - **Eventos:** (em desenvolvimento)
4. Ver projeção mensal atualizar automaticamente
5. Clicar "Voltar para Cenários"

### 5.3 Fluxo de Duplicação
1. Na lista, clicar no menu dropdown (⋮)
2. Selecionar "Duplicar"
3. Sistema cria cópia com sufixo " (Cópia)"
4. Toast de confirmação
5. Lista atualiza automaticamente

### 5.4 Fluxo de Exclusão
1. Na lista, clicar no menu dropdown (⋮)
2. Selecionar "Excluir" (desabilitado se tipo="base")
3. AlertDialog de confirmação
4. Confirmar → Deletar + Toast
5. Lista atualiza automaticamente

### 5.5 Fluxo de Visualização de Projeção
1. Na lista, clicar no menu dropdown (⋮)
2. Selecionar "Ver Projeção"
3. Modal com tabela completa (todos os meses)
4. Scroll vertical se necessário
5. Fechar modal

### 5.6 Atualizações em Tempo Real
- **Trigger:** Adicionar/remover configuração
- **Efeito:** `useEffect` detecta mudança em `configuracoes`
- **Ação:** Chama `loadProjecao()` automaticamente
- **UI:** Spinner durante recálculo → Tabela atualizada

---

## 6. Estados da UI

### 6.1 Loading States
- **Initial Load:** Spinner centralizado (h-8 w-8)
- **Saving Action:** Botão com spinner (h-4 w-4) + disabled
- **Projeção Recalculando:** Spinner no card de projeção

### 6.2 Empty States

#### Sem Cenários
```
┌───────────────────────────────────────┐
│          🎯 (h-16 w-16)               │
│     Nenhum cenário criado             |
│                                        │
│ Crie seu primeiro cenário de          │
│ planejamento para começar a projetar  │
│ seu futuro financeiro.                │
│                                        │
│    [+ Criar Primeiro Cenário]         │
└───────────────────────────────────────┘
```

#### Sem Projeção Disponível
```
┌───────────────────────────────────────┐
│          📅 (h-12 w-12)               │
│   Nenhuma projeção disponível         │
│   Aguardando dados históricos         │
└───────────────────────────────────────┘
```

#### Sem Configurações
- Não há empty state, apenas lista vazia

#### Sem Objetivos
```
┌───────────────────────────────────────┐
│          🎯 (h-12 w-12)               │
│   Adicione objetivos à esquerda       │
│   Eles aparecerão aqui como preview   │
└───────────────────────────────────────┘
```

### 6.3 Error States
- **Toast de Erro:** `toast.error('Mensagem')`
- **Sem tratamento visual específico** (confia em logs + toasts)

### 6.4 Success States
- **Toast de Sucesso:** `toast.success('Ação realizada!')`
- **Atualização automática** da lista/preview

---

## 7. Responsividade

### 7.1 Breakpoints
- **Desktop (lg):** 3 colunas no grid
- **Tablet (md):** 2 colunas no grid
- **Mobile:** 1 coluna

### 7.2 Layout Two-Column (Edit Page)
- **Desktop:** `grid-cols-2` (50/50)
- **Mobile:** Não implementado (assume desktop por enquanto)

---

## 8. Acessibilidade

### 8.1 Semântica
- ✅ Uso de `<Label>` + `htmlFor` em formulários
- ✅ `aria-label` em botões de ícone (menu dropdown)
- ⚠️ Falta `aria-label` em alguns botões de trash

### 8.2 Navegação por Teclado
- ✅ Tabs navegáveis com teclado
- ✅ Modais com foco automático
- ✅ Dropdowns com navegação arrow keys

### 8.3 Contraste de Cores
- ✅ Texto branco sobre backgrounds escuros (WCAG AA+)
- ✅ Botões com contraste adequado
- ⚠️ Alguns text-white/40 podem ter contraste baixo

---

## 9. Integrações com Services

### 9.1 PlanejamentoService
```typescript
// Usado em: page.tsx + [id]/page.tsx
const planejamentoService = getPlanejamentoService()

// CRUD Cenários
await planejamentoService.listCenarios()
await planejamentoService.getCenario(id)
await planejamentoService.createCenario(data)
await planejamentoService.duplicarCenario(id)
await planejamentoService.deleteCenario(id)

// Configurações
await planejamentoService.addConfiguracao(cenarioId, config)
await planejamentoService.listConfiguracoes(cenarioId)
await planejamentoService.removeConfiguracao(configId)

// Objetivos
await planejamentoService.addObjetivo(cenarioId, objetivo)
await planejamentoService.listObjetivos(cenarioId)
await planejamentoService.removeObjetivo(objetivoId)
```

### 9.2 ProjecaoService
```typescript
// Usado em: page.tsx + [id]/page.tsx
const projecaoService = getProjecaoService()

// Calcular projeções
const resultado = await projecaoService.calcularProjecao(cenarioId)
// Retorna: ResultadoProjecao { projecoes, resumo, objetivos_analise }
```

### 9.3 CategoriaService
```typescript
// Usado em: [id]/page.tsx
const categorias = await categoriaService.listCategorias()
// Filtradas por tipo (receita/despesa) no dropdown
```

---

## 10. Performance

### 10.1 Otimizações Implementadas
- **Cálculo Paralelo:** Projeções calculadas em `Promise.all()` (page.tsx:88)
- **Cache de Projeções:** Armazenadas em `Map<string, ResultadoProjecao>`
- **Loading States:** Evitam re-renders desnecessários
- **Debounce:** Não implementado (projeções recalculam imediatamente)

### 10.2 Otimizações Futuras
- [ ] Debounce em mudanças de configuração (500ms)
- [ ] Virtual scrolling para tabelas grandes
- [ ] Memoização de componentes de card
- [ ] Lazy loading de modais

---

## 11. Referências de Código

### 11.1 Arquivos Principais
- **Lista:** `app/planejamento/page.tsx` (609 linhas)
- **Edição:** `app/planejamento/[id]/page.tsx` (783 linhas)
- **Services:**
  - `lib/services/planejamento.service.ts`
  - `lib/services/projecao.service.ts`
- **Types:** `lib/types/index.ts`

### 11.2 Componentes Utilizados
- `DashboardLayout` (wrapper principal)
- `PageHeader` (título + descrição)
- `Button`, `Input`, `Label`, `Textarea` (formulários)
- `Select`, `SelectContent`, `SelectItem` (dropdowns)
- `Card`, `CardHeader`, `CardContent` (containers)
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (tabs)
- `Badge` (status indicators)
- `Dialog`, `AlertDialog` (modais)
- `DropdownMenu` (menu de ações)
- Ícones: `lucide-react`

---

## 12. TODOs e Melhorias

### 12.1 Funcionalidades Pendentes
- [ ] Tab "Eventos" (eventos únicos)
- [ ] Gráficos visuais de evolução patrimonial
- [ ] Comparador de cenários (side-by-side)
- [ ] Exportação de projeções (CSV/PDF)
- [ ] Templates de cenários prontos

### 12.2 UX/UI
- [ ] Animações de transição entre estados
- [ ] Skeleton loaders em vez de spinners
- [ ] Tooltips explicativos em campos
- [ ] Preview de impacto antes de adicionar config
- [ ] Confirmação antes de deletar configuração/objetivo

### 12.3 Responsividade
- [ ] Layout mobile para tela de edição
- [ ] Drawer em vez de modal no mobile
- [ ] Grid adaptativo melhorado

### 12.4 Acessibilidade
- [ ] Adicionar `aria-label` em todos os botões de ícone
- [ ] Testar com screen reader
- [ ] Melhorar contraste de cores em placeholders
- [ ] Adicionar skip links

### 12.5 Performance
- [ ] Implementar debounce em recálculos
- [ ] Cachear resultados de projeção
- [ ] Lazy load de tabs
- [ ] Code splitting da página de edição

---

## 13. Guia Rápido para Desenvolvedores

### 13.1 Como Adicionar um Novo Tipo de Configuração
1. Atualizar `TipoConfiguracao` em `lib/types/index.ts`
2. Adicionar opção no `<Select>` de tipo (linha 304-306)
3. Adicionar campos específicos com conditional rendering
4. Atualizar `handleAddConfiguracao()` para incluir novos campos
5. Atualizar `ProjecaoService` para processar novo tipo

### 13.2 Como Adicionar um Novo Campo em Cenário
1. Atualizar interface `Cenario` em `lib/types/index.ts`
2. Atualizar schema Dexie em `lib/db/client.ts`
3. Adicionar campo no modal "Novo Cenário" (página listagem)
4. Adicionar campo no header da página de edição (se necessário)
5. Atualizar `createCenario()` para incluir novo campo

### 13.3 Como Adicionar uma Nova Tab
1. Adicionar `<TabsTrigger>` no `<TabsList>` (linha 259-271)
2. Adicionar `<TabsContent>` correspondente
3. Implementar formulário + preview (seguir padrão two-column)
4. Adicionar ícone apropriado do `lucide-react`

---

## 14. Screenshot de Referência

**Última captura:** 2025-11-08
**Página:** `/planejamento/[id]` - Tab "Comportamento"

### Elementos Visíveis na Screenshot:
- ✅ Header com breadcrumb "← Cenário 1" + descrição
- ✅ Tabs: Comportamento (ativo), Objetivos, Eventos
- ✅ Formulário "Nova Configuração" (coluna esquerda)
- ✅ Card "Configurações Ativas (1)" mostrando "receita +10%"
- ✅ Card "Projeção Mensal" com empty state
- ✅ Botão "Voltar para Cenários" no rodapé
- ✅ Sidebar com navegação completa
- ✅ Badge "Uso de IA" no canto inferior esquerdo

---

**Status:** ✅ Documentação Completa
**Última Atualização:** 2025-11-08
