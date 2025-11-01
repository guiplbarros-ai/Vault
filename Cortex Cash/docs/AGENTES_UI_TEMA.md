# Agentes de UI - Correção de Tema Claro/Escuro
> ATENÇÃO: Este documento foi substituído por `docs/AGENTES_IA_3_AGENTS.md`. Use o novo documento como fonte única de verdade.
---
**Status**: 🟡 EM ANDAMENTO (AGENTE UI 2 COMPLETO)
**Data**: 2025-10-29
**Objetivo**: Corrigir todos os componentes para usarem CSS variables do tema ao invés de cores hardcoded

---

## 🎯 Contexto

A aplicação já possui:
- ✅ Sistema de alternância de tema funcionando (claro/escuro/automático)
- ✅ CSS variables definidas no `app/globals.css` (`:root` para light, `.dark` para dark)
- ✅ Paleta Cortex Pixel Teal (Navy + Teal + Gold + Orange)

**Problema**: Os componentes usam cores hardcoded (ex: `bg-slate-900`, `text-white`, `border-slate-700`) ao invés dos tokens do tema (ex: `bg-card`, `text-foreground`, `border-border`).

**Resultado esperado**: Todos os componentes devem responder visualmente à mudança de tema usando as CSS variables.

---

## 🎨 Como Funciona o Sistema de Temas

### Conceito Fundamental

O sistema usa **CSS variables** que mudam automaticamente quando a classe `.dark` é aplicada ao `<html>`:

```css
/* app/globals.css */

/* LIGHT MODE - Padrão (:root sem classe) */
:root {
  --background: 165 30% 97%;    /* #F5FAFA - Verde acqua muito claro */
  --foreground: 200 61% 11%;    /* #0B2230 - Navy escuro */
  --card: 0 0% 100%;            /* #FFFFFF - Branco puro */
  --primary: 175 73% 39%;       /* #18B0A4 - Teal 500 */
  /* ... outras variáveis */
}

/* DARK MODE - Quando <html class="dark"> */
.dark {
  --background: 200 61% 11%;    /* #0B2230 - Navy escuro */
  --foreground: 165 64% 92%;    /* #E6F7F4 - Verde acqua claro */
  --card: 200 55% 15%;          /* #123041 - Navy médio */
  --primary: 175 73% 39%;       /* #18B0A4 - Teal 500 (mesma cor) */
  /* ... outras variáveis */
}
```

### Como o JavaScript Aplica

```typescript
// app/providers/settings-provider.tsx
if (theme === 'dark') {
  document.documentElement.classList.add('dark');
  // CSS variables de .dark são aplicadas automaticamente
} else {
  document.documentElement.classList.remove('dark');
  // CSS variables de :root são aplicadas automaticamente
}
```

### Como os Componentes Usam

```tsx
// ❌ ERRADO - Cor fixa que não muda com o tema
<div className="bg-slate-900 text-white">

// ✅ CORRETO - Usa CSS variable que muda automaticamente
<div className="bg-card text-foreground">
  // No light mode: branco com texto navy
  // No dark mode: navy médio com texto verde acqua
```

**IMPORTANTE**: Você **NÃO** precisa usar `dark:bg-xxx` quando está usando tokens! O token já muda automaticamente.

---

## 📋 Tokens do Tema Disponíveis

### Paleta Completa - Light vs Dark

| Token | Light Mode | Dark Mode | Uso |
|-------|-----------|-----------|-----|
| `--background` | 🤍 Verde acqua claro `#F5FAFA` | 🖤 Navy escuro `#0B2230` | Fundo principal |
| `--foreground` | 🖤 Navy escuro `#0B2230` | 🤍 Verde acqua claro `#E6F7F4` | Texto principal |
| `--card` | 🤍 Branco `#FFFFFF` | 🔵 Navy médio `#123041` | Cards, containers |
| `--card-foreground` | 🖤 Navy escuro `#0B2230` | 🤍 Verde acqua claro `#E6F7F4` | Texto em cards |
| `--popover` | 🤍 Branco `#FFFFFF` | 🔵 Navy médio `#123041` | Popovers, dropdowns |
| `--popover-foreground` | 🖤 Navy escuro `#0B2230` | 🤍 Verde acqua claro `#E6F7F4` | Texto em popovers |
| `--primary` | 🔷 Teal `#18B0A4` | 🔷 Teal `#18B0A4` | Cor principal (igual em ambos) |
| `--primary-foreground` | 🤍 Branco `#FFFFFF` | 🖤 Navy escuro `#0B2230` | Texto sobre primary |
| `--secondary` | 💚 Verde acqua 50 `#EFF6F5` | 🔵 Navy claro `#173B4D` | Backgrounds secundários |
| `--secondary-foreground` | 🖤 Navy escuro `#0B2230` | 🤍 Verde acqua claro `#E6F7F4` | Texto em secondary |
| `--muted` | 💚 Verde acqua 50 `#EFF6F5` | 🔵 Navy muito escuro `#0F2A39` | Desabilitados, sutis |
| `--muted-foreground` | 🔘 Navy médio `#5A7B87` | 💙 Verde acqua médio `#B5D8D2` | Texto secundário |
| `--accent` | 💚 Verde acqua 100 `#E5F2F1` | 🔵 Navy claro `#173B4D` | Hover states |
| `--accent-foreground` | 🖤 Navy escuro `#0B2230` | 🤍 Verde acqua claro `#E6F7F4` | Texto em accent |
| `--border` | 🌿 Verde acqua 200 `#D8E8E6` | 🔹 Navy borda `#1E4657` | Bordas padrão |
| `--input` | 🌿 Verde acqua 200 `#D8E8E6` | 🔹 Navy borda `#1E4657` | Bordas de inputs |
| `--ring` | 🔷 Teal `#18B0A4` | 🔷 Teal `#18B0A4` | Focus ring (igual) |
| `--destructive` | 🔴 Vermelho `#EF4444` | 🔴 Vermelho `#EF4444` | Erros (igual) |
| `--destructive-foreground` | 🤍 Branco `#FFFFFF` | 🤍 Verde acqua `#E6F7F4` | Texto em erro |

### Como Usar no Código

```tsx
// Backgrounds
className="bg-background"   // Muda automaticamente: light=#F5FAFA, dark=#0B2230
className="bg-card"         // Muda automaticamente: light=#FFFFFF, dark=#123041
className="bg-muted"        // Muda automaticamente: light=#EFF6F5, dark=#0F2A39

// Textos
className="text-foreground"        // light=#0B2230, dark=#E6F7F4
className="text-muted-foreground"  // light=#5A7B87, dark=#B5D8D2

// Bordas
className="border-border"   // light=#D8E8E6, dark=#1E4657
className="border-input"    // light=#D8E8E6, dark=#1E4657

// Primary (Teal - mesma cor em ambos)
className="bg-primary text-primary-foreground"
// light: bg=#18B0A4 text=#FFFFFF
// dark:  bg=#18B0A4 text=#0B2230
```

### Cores para Gráficos (Recharts/ECharts)

**Paleta Cortex Pixel Teal** (mesma em ambos os temas, ajuste de saturação/luminosidade):

| Variável | Light Mode | Dark Mode | Uso |
|----------|-----------|-----------|-----|
| `--chart-1` | `hsl(175 73% 39%)` | `hsl(175 73% 39%)` | Teal principal |
| `--chart-2` | `hsl(42 89% 50%)` | `hsl(42 89% 63%)` | Gold (mais escuro no light) |
| `--chart-3` | `hsl(171 69% 50%)` | `hsl(171 69% 61%)` | Teal médio |
| `--chart-4` | `hsl(32 99% 45%)` | `hsl(32 99% 48%)` | Orange (mais escuro no light) |
| `--chart-5` | `hsl(175 78% 27%)` | `hsl(175 78% 27%)` | Teal escuro |
| `--chart-6` | `hsl(38 74% 45%)` | `hsl(38 74% 57%)` | Gold escuro |
| `--chart-7` | `hsl(175 78% 21%)` | `hsl(175 78% 21%)` | Teal muito escuro |
| `--chart-8` | `hsl(142 71% 40%)` | `hsl(142 71% 45%)` | Success green |

```tsx
// Uso em gráficos (deve ser string HSL, não classe Tailwind)
<Bar fill="hsl(var(--chart-1))" />  // Teal
<Bar fill="hsl(var(--chart-2))" />  // Gold
<Line stroke="hsl(var(--chart-4))" />  // Orange
```

---

## 🔧 Regras de Conversão

### ❌ NUNCA USE (cores hardcoded do Tailwind)
```tsx
// Evite cores específicas:
bg-slate-900, bg-slate-800, bg-slate-700, bg-slate-600
text-slate-300, text-slate-400, text-white
border-slate-700, border-slate-600
bg-teal-600, bg-teal-700, text-teal-400
bg-white, bg-gray-100, etc.

// Evite usar dark: variants desnecessários se já estiver usando tokens:
// ❌ BAD: "bg-white dark:bg-slate-900"
// ✅ GOOD: "bg-card"
```

### ✅ USE (tokens do tema)
```tsx
// Backgrounds
"bg-card"           // Cards, containers
"bg-background"     // Fundo geral
"bg-muted"          // Áreas desabilitadas
"bg-accent"         // Hover states
"bg-primary"        // Botões principais

// Textos
"text-foreground"         // Texto padrão
"text-muted-foreground"   // Texto secundário
"text-primary"            // Links, ações principais

// Bordas
"border-border"     // Bordas padrão
"border-input"      // Inputs
```

---

## 🖼️ Exemplos Visuais Esperados

### Tema Escuro (Dark Mode)
```
┌─────────────────────────────────────────────┐
│ 🔵 Sidebar (Navy médio #123041)            │
│   🤍 Texto (Verde acqua #E6F7F4)           │
│   🔷 Item ativo (Teal #18B0A4)             │
│   ┌───────────────────────────────┐        │
│   │ 🔵 Card (Navy médio #123041)  │        │
│   │ 🤍 Título (Verde acqua)       │        │
│   │ 💙 Subtítulo (Verde médio)    │        │
│   │ ┌─────────────────┐           │        │
│   │ │ 🔷 Button Primary│           │        │
│   │ └─────────────────┘           │        │
│   └───────────────────────────────┘        │
└─────────────────────────────────────────────┘
Fundo geral: 🖤 Navy escuro (#0B2230)
```

### Tema Claro (Light Mode)
```
┌─────────────────────────────────────────────┐
│ 🤍 Sidebar (Branco #FFFFFF)                │
│   🖤 Texto (Navy #0B2230)                  │
│   🔷 Item ativo (Teal #18B0A4)             │
│   ┌───────────────────────────────┐        │
│   │ 🤍 Card (Branco #FFFFFF)      │        │
│   │ 🖤 Título (Navy)              │        │
│   │ 🔘 Subtítulo (Navy médio)     │        │
│   │ ┌─────────────────┐           │        │
│   │ │ 🔷 Button Primary│           │        │
│   │ └─────────────────┘           │        │
│   └───────────────────────────────┘        │
└─────────────────────────────────────────────┘
Fundo geral: 🤍 Verde acqua claro (#F5FAFA)
```

### Comparação Lado a Lado

| Elemento | Light Mode | Dark Mode |
|----------|-----------|-----------|
| **Fundo** | 🤍 Verde acqua claro | 🖤 Navy escuro |
| **Cards** | 🤍 Branco puro | 🔵 Navy médio |
| **Texto principal** | 🖤 Navy escuro | 🤍 Verde acqua claro |
| **Texto secundário** | 🔘 Navy médio | 💙 Verde acqua médio |
| **Bordas** | 🌿 Verde acqua 200 | 🔹 Navy borda |
| **Hover** | 💚 Verde acqua 100 | 🔵 Navy claro |
| **Primary (Teal)** | 🔷 #18B0A4 | 🔷 #18B0A4 |
| **Primary text** | 🤍 Branco | 🖤 Navy escuro |

**Regra de ouro**: Em ambos os temas, o contraste deve ser **alto e legível**. Se algo está difícil de ler, você está usando o token errado!

---

## 👥 DIVISÃO DE TRABALHO

### 🟦 AGENTE UI 1 - Componentes de Layout e Navegação

**Responsabilidade**: Estrutura principal da aplicação

**Arquivos para corrigir**:
1. `components/dashboard-layout.tsx` (REVISAR - parece OK mas confirmar)
2. `components/ui/button.tsx` (REVISAR variants)
3. `components/ui/card.tsx` (REVISAR)
4. `components/ui/badge.tsx`
5. `components/ui/alert.tsx`
6. `components/ui/alert-dialog.tsx`
7. `components/theme-toggle.tsx` (REVISAR se ícones estão corretos)

**Checklist**:
- [ ] Sidebar: `bg-card border-border text-foreground`
- [ ] Items ativos: `bg-accent text-primary` (não usar bg-primary se conflitar com o fundo)
- [ ] Items hover: `hover:bg-accent hover:text-foreground`
- [ ] Header: `bg-card border-b border-border`
- [ ] Buttons: verificar todas as variants (default, outline, ghost, destructive)
- [ ] Cards: `bg-card text-card-foreground border-border`

**Critério de sucesso**: Layout deve ter aparência limpa e profissional em ambos os temas, com navegação claramente visível.

---

### 🟩 AGENTE UI 2 - Componentes de Formulário e Interação

**Responsabilidade**: Inputs, selects, pickers, dialogs

**Arquivos para corrigir**:
1. `components/ui/month-picker.tsx` ⚠️ **PRIORIDADE ALTA** (muitas cores hardcoded)
2. `components/ui/input.tsx`
3. `components/ui/select.tsx`
4. `components/ui/dropdown-menu.tsx`
5. `components/ui/popover.tsx`
6. `components/ui/dialog.tsx`
7. `components/ui/date-picker.tsx`
8. `components/ui/date-range-picker.tsx`
9. `components/ui/slider.tsx`
10. `components/ui/tag-input.tsx`

**Exemplo de correção (month-picker.tsx)**:

**ANTES** (linhas 90-92):
```tsx
className="h-9 w-9 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
```

**DEPOIS**:
```tsx
className="h-9 w-9 rounded-lg border-input hover:bg-accent"
```

**ANTES** (linhas 113-114):
```tsx
<div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4 rounded-t-2xl border-b border-slate-700">
```

**DEPOIS**:
```tsx
<div className="bg-gradient-to-br from-primary/20 to-primary/10 text-foreground p-4 rounded-t-2xl border-b border-border">
```

**ANTES** (linhas 137):
```tsx
<div className="p-6 bg-slate-900 rounded-b-2xl">
```

**DEPOIS**:
```tsx
<div className="p-6 bg-card rounded-b-2xl">
```

**ANTES** (linhas 144-148):
```tsx
className={cn(
  "h-12 rounded-lg font-medium text-sm transition-all",
  "hover:bg-slate-800",
  isCurrentMonth(index)
    ? "bg-teal-600 text-white hover:bg-teal-700"
    : "text-slate-300 hover:text-white"
)}
```

**DEPOIS**:
```tsx
className={cn(
  "h-12 rounded-lg font-medium text-sm transition-all",
  "hover:bg-accent",
  isCurrentMonth(index)
    ? "bg-primary text-primary-foreground hover:bg-primary/90"
    : "text-muted-foreground hover:text-foreground"
)}
```

**Checklist**:
- [ ] Inputs: `bg-background border-input text-foreground placeholder:text-muted-foreground`
- [ ] Selects/Dropdowns: `bg-popover text-popover-foreground border-border`
- [ ] Dialogs: `bg-card text-card-foreground`
- [ ] Popovers: `bg-popover border-border`
- [ ] Month picker: remover TODAS as referências a slate-* e teal-*
- [ ] Date pickers: mesma lógica do month picker

**Critério de sucesso**: Todos os formulários e interações devem ser claramente visíveis e responsivos ao tema em ambos os modos.

---

### 🟨 AGENTE UI 3 - Gráficos, Cards de Stats e Componentes de Dados

**Responsabilidade**: Visualizações de dados, gráficos, widgets

**Arquivos para corrigir**:
1. `components/cash-flow-chart.tsx` (REVISAR gradients)
2. `components/expense-distribution-chart.tsx`
3. `components/expense-trends-chart.tsx`
4. `components/ui/stat-card.tsx`
5. `components/ui/progress.tsx`
6. `components/budget-overview.tsx`
7. `components/recent-transactions.tsx`
8. `components/popular-tags-widget.tsx`
9. `components/popular-categories-widget.tsx`
10. `components/ai-usage-card.tsx`
11. `components/credit-card-limit.tsx`
12. `components/fatura-card.tsx`

**Atenção Especial aos Gráficos (Recharts)**:

**Tooltips devem usar**:
```tsx
<Tooltip
  contentStyle={{
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.75rem',
    color: 'hsl(var(--foreground))',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  }}
  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
/>
```

**CartesianGrid deve usar**:
```tsx
<CartesianGrid
  strokeDasharray="3 3"
  className="stroke-border"
  opacity={0.5}
/>
```

**Eixos X/Y devem usar**:
```tsx
<XAxis
  className="text-muted-foreground"
  tick={{ fill: 'hsl(var(--muted-foreground))' }}
  tickLine={false}
  axisLine={false}
/>
```

**Gradients devem usar variáveis HSL**:
```tsx
<defs>
  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={1} />
    <stop offset="100%" stopColor="hsl(142 71% 35%)" stopOpacity={1} />
  </linearGradient>
</defs>
```

**Checklist**:
- [ ] Stat cards: `bg-card text-card-foreground border-border`
- [ ] Progress bars: usar `bg-primary` para filled, `bg-muted` para track
- [ ] Gráficos: CartesianGrid, Tooltips, Eixos usando tokens
- [ ] Gradients: converter de RGB (#059669) para HSL (hsl(142 71% 45%))
- [ ] Legendas: text-muted-foreground
- [ ] Cards de transações: bg-card, hover:bg-accent

**Critério de sucesso**: Gráficos e visualizações de dados devem ser legíveis e esteticamente agradáveis em ambos os temas, com cores da paleta Cortex.

---

## 🚀 Instruções de Execução

### Para cada agente:

1. **Leia este documento completo** antes de começar
2. **Trabalhe APENAS nos arquivos da sua seção**
3. **Teste visualmente** após cada arquivo corrigido (alterne entre light/dark no navegador)
4. **Não use `!important`** a menos que absolutamente necessário
5. **Mantenha a estrutura HTML** - mude apenas as classes CSS
6. **Use o padrão de classes do Tailwind** - não crie estilos inline a menos que seja para valores dinâmicos

### Padrão de trabalho:

```bash
# 1. Para cada arquivo:
# - Leia o arquivo completo
# - Identifique TODAS as cores hardcoded
# - Substitua por tokens do tema
# - Teste no navegador (npm run dev já está rodando)

# 2. Após cada 2-3 arquivos:
# - Recarregue a página e alterne o tema
# - Verifique se as mudanças estão visíveis
# - Se algo estiver errado, corrija antes de continuar

# 3. Ao finalizar sua seção:
# - Faça um teste completo navegando pela aplicação
# - Verifique AMBOS os temas (claro e escuro)
# - Reporte qualquer problema encontrado
```

---

## ✅ Critérios de Aceitação Geral

### Tema Escuro (Navy + Teal)
- Fundo: Navy escuro, legível
- Cards: Navy médio, bem delimitados
- Texto: Verde acqua claro, alto contraste
- Hover: Sutil mas perceptível

### Tema Claro (Verde Acqua + Navy)
- Fundo: Verde acqua muito claro, clean
- Cards: Branco puro, sombras sutis
- Texto: Navy escuro, alto contraste
- Bordas: Verde acqua 200, visíveis mas suaves

### Ambos os Temas
- ✅ Contraste WCAG AA mínimo (4.5:1 para texto normal)
- ✅ Todos os elementos interativos claramente visíveis
- ✅ Estados de hover/focus/active bem definidos
- ✅ Gráficos usando paleta Cortex (Teal, Gold, Orange, Green)
- ✅ Transições suaves (200ms) entre estados
- ✅ Sem flash/glitch ao alternar temas

---

## 🐛 Troubleshooting

### Se algo não mudar ao trocar o tema:
1. Verifique se está usando `dark:` variants - remova-os se estiver usando tokens
2. Confirme que a classe é um token válido (ex: `bg-card` existe no globals.css)
3. Inspecione o elemento no DevTools e veja o valor computado da CSS variable
4. Limpe o cache do navegador (Ctrl+Shift+R)

### Se as cores estiverem "erradas":
1. Compare com o globals.css (`:root` vs `.dark`)
2. Verifique se não há `!important` sobrescrevendo
3. Confirme a ordem das classes (especificidade CSS)

### Se hover/focus não funcionar:
1. Verifique se tem `transition-colors` ou `transition-all`
2. Confirme que o estado hover está usando tokens (`hover:bg-accent`)
3. Teste com `:hover` no DevTools para isolar o problema

---

## 📊 Progresso

### AGENTE UI 1 - Layout
- [ ] dashboard-layout.tsx
- [ ] button.tsx
- [ ] card.tsx
- [ ] badge.tsx
- [ ] alert.tsx
- [ ] alert-dialog.tsx
- [ ] theme-toggle.tsx

### AGENTE UI 2 - Formulários ✅ COMPLETO
- [x] month-picker.tsx (14 correções aplicadas)
- [x] input.tsx (já estava correto)
- [x] select.tsx (já estava correto)
- [x] dropdown-menu.tsx (já estava correto)
- [x] popover.tsx (já estava correto)
- [x] dialog.tsx (1 correção aplicada)
- [x] date-picker.tsx (já estava correto)
- [x] date-range-picker.tsx (já estava correto)
- [x] slider.tsx (1 correção aplicada)
- [x] tag-input.tsx (já estava correto)

### AGENTE UI 3 - Gráficos
- [ ] cash-flow-chart.tsx
- [ ] expense-distribution-chart.tsx
- [ ] expense-trends-chart.tsx
- [ ] stat-card.tsx
- [ ] progress.tsx
- [ ] budget-overview.tsx
- [ ] recent-transactions.tsx
- [ ] popular-tags-widget.tsx
- [ ] popular-categories-widget.tsx
- [ ] ai-usage-card.tsx
- [ ] credit-card-limit.tsx
- [ ] fatura-card.tsx

---

## 🎯 Meta Final

Quando TODOS os agentes terminarem:
- ✅ Aplicação deve ser **igualmente bonita** em ambos os temas
- ✅ Alternância deve ser **suave e sem glitches**
- ✅ **Zero cores hardcoded** (slate-*, white, black hardcoded)
- ✅ **100% uso de tokens** do design system
- ✅ **Contraste acessível** WCAG AA em todos os elementos

---

**BOA SORTE, AGENTES! 🚀**
