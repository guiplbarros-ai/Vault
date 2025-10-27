# Aplicar Paleta "Creme & Bordeaux Olive" – Instruções Completas

## 🎨 Visão Geral da Paleta

**Cores Base:**
- Creme Claro A: `#FCF6D2` – Canvas/fundo principal (light)
- Creme Claro B: `#FBE2B9` – Superfícies (cards, inputs)
- Oliva Neutra: `#C6C39A` – Elevação, toolbars, bordas sutis
- Bordeaux Escuro: `#281F20` – Texto, ações primárias, fundo dark

**Filosofia:**
- **Light Mode**: Fundo creme, textos/bordas em bordeaux
- **Dark Mode**: Fundo bordeaux, superfícies em "creme queimado", textos em creme

---

## 📋 PASSO 1: Atualizar `apps/web/src/app/globals.css`

**AÇÃO**: Substituir TODAS as variáveis CSS existentes por este bloco:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================
   PALETA CREME & BORDEAUX OLIVE
   ============================================ */

/* LIGHT MODE – padrão */
:root {
  /* Neutros estruturais */
  --bg: 252 246 210;      /* #FCF6D2 – canvas principal */
  --surface: 251 226 185; /* #FBE2B9 – cards, inputs */
  --elev: 198 195 154;    /* #C6C39A – elevação sutil, toolbars */
  --line: 40 31 32;       /* #281F20 – bordas, divisores */

  /* Texto */
  --text: 40 31 32;       /* #281F20 – texto primário */
  --muted: 78 63 65;      /* #4E3F41 – texto secundário (derivado) */

  /* Marca & Ações */
  --brand: 40 31 32;            /* #281F20 – botão primário */
  --brand-contrast: 252 246 210; /* #FCF6D2 – texto em botões primários */

  /* Estados semânticos */
  --success: 58 142 110;   /* #3A8E6E – oliva + verde */
  --warning: 196 150 60;   /* #C4963C – oliva quente */
  --danger: 165 65 72;     /* #A54148 – bordeaux avermelhado */
  --info: 116 116 92;      /* #74745C – oliva neutra */

  /* Raio de borda padrão */
  --radius: 0.75rem; /* 12px */
}

/* DARK MODE – invertendo hierarquia com tons quentes */
.dark {
  --bg: 40 31 32;         /* #281F20 – canvas escuro */
  --surface: 54 42 44;    /* #362A2C – cards */
  --elev: 70 56 58;       /* #46383A – elevação */
  --line: 198 195 154;    /* #C6C39A – bordas claras */

  --text: 252 246 210;    /* #FCF6D2 – texto claro */
  --muted: 224 211 188;   /* #E0D3BC – texto secundário */

  --brand: 251 226 185;        /* #FBE2B9 – botão primário claro */
  --brand-contrast: 40 31 32;  /* #281F20 – texto escuro em botões */

  --success: 165 224 192; /* #A5E0C0 – versão clara */
  --warning: 238 196 118; /* #EEC476 */
  --danger: 230 140 145;  /* #E68C91 */
  --info: 198 195 154;    /* #C6C39A */
}

/* ============================================
   CLASSES BASE & UTILITÁRIAS
   ============================================ */

@layer base {
  * {
    @apply border-line/25;
  }

  body {
    @apply bg-bg text-text;
    font-feature-settings: "rlig" 1, "calt" 1;
    font-size: 15px;
    line-height: 1.6;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply text-text font-semibold;
  }
}

@layer components {
  /* Cards */
  .card {
    @apply bg-surface border border-line/25 rounded-2xl shadow-md;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
  }

  .card-elev {
    @apply bg-elev;
  }

  /* Botões */
  .btn-primary {
    @apply bg-brand text-brand-contrast rounded-xl px-4 py-2.5 font-semibold;
    @apply hover:brightness-90 focus:outline-none focus:ring-4 focus:ring-brand/25;
    transition: all 0.2s ease;
  }

  .btn-ghost {
    @apply bg-surface text-text border border-line/25 rounded-xl px-4 py-2.5;
    @apply hover:bg-elev focus:outline-none focus:ring-4 focus:ring-line/20;
    transition: all 0.2s ease;
  }

  .btn-danger {
    @apply bg-danger text-white rounded-xl px-4 py-2.5 font-semibold;
    @apply hover:brightness-90 focus:outline-none focus:ring-4 focus:ring-danger/25;
  }

  /* Inputs */
  .input {
    @apply bg-surface border border-line/25 rounded-xl px-3 py-2.5 text-text;
    @apply placeholder:text-muted focus:outline-none focus:ring-4 focus:ring-brand/20;
    transition: all 0.2s ease;
  }

  /* Labels */
  .label {
    @apply text-xs text-muted uppercase tracking-wider font-medium;
  }

  /* Bordas sutis */
  .border-subtle {
    @apply border-line/25;
  }

  /* Tabelas */
  .table-header {
    @apply bg-elev text-text font-semibold text-sm;
  }

  .table-row {
    @apply border-b border-line/20 hover:bg-surface/50;
  }

  /* Estados */
  .status-success {
    @apply text-success;
  }

  .status-danger {
    @apply text-danger;
  }

  .status-warning {
    @apply text-warning;
  }

  .status-info {
    @apply text-info;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

---

## 📋 PASSO 2: Atualizar `apps/web/tailwind.config.ts`

**AÇÃO**: Substituir a seção `theme.extend.colors` por:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores estruturais
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        elev: "rgb(var(--elev) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",

        // Texto
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",

        // Marca
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          contrast: "rgb(var(--brand-contrast) / <alpha-value>)",
        },

        // Estados
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 6px 24px rgba(0, 0, 0, 0.08)",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.12)",
      },
      fontSize: {
        base: ["15px", "24px"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## 📋 PASSO 3: Criar Constante de Tema para Gráficos

**AÇÃO**: Criar arquivo `apps/web/src/lib/chart-theme.ts`:

```typescript
/**
 * Tema de cores para gráficos (Recharts)
 * Paleta Creme & Bordeaux Olive
 */

export const chartTheme = {
  // Grid & Eixos
  light: {
    grid: "rgba(40, 31, 32, 0.12)",
    axis: "rgba(40, 31, 32, 0.7)",
    tooltip: {
      bg: "#FBE2B9",
      border: "rgba(40, 31, 32, 0.25)",
      text: "#281F20",
    },
    series: {
      primary: "#281F20",
      secondary: "#C6C39A",
    },
    area: {
      fill: "rgba(40, 31, 32, 0.16)",
      stroke: "#281F20",
    },
  },
  dark: {
    grid: "rgba(198, 195, 154, 0.18)",
    axis: "rgba(252, 246, 210, 0.85)",
    tooltip: {
      bg: "#362A2C",
      border: "rgba(198, 195, 154, 0.3)",
      text: "#FCF6D2",
    },
    series: {
      primary: "#FBE2B9",
      secondary: "#C6C39A",
    },
    area: {
      fill: "rgba(251, 226, 185, 0.20)",
      stroke: "#FBE2B9",
    },
  },
  // Cores semânticas (consistentes em ambos os modos)
  semantic: {
    income: "#3A8E6E",    // success
    expense: "#A54148",   // danger
    transfer: "#74745C",  // info
    budget: "#C4963C",    // warning
  },
};

/**
 * Hook para obter tema atual
 */
export function useChartTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  return isDark ? chartTheme.dark : chartTheme.light;
}
```

---

## 📋 PASSO 4: Atualizar Componentes de UI Base

### 4.1 Button (`apps/web/src/components/ui/button.tsx`)

**AÇÃO**: Adicionar variantes da nova paleta:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-brand text-brand-contrast hover:brightness-90 focus-visible:ring-brand/25",
        destructive: "bg-danger text-white hover:brightness-90 focus-visible:ring-danger/25",
        outline: "border border-line/25 bg-surface hover:bg-elev focus-visible:ring-line/20",
        ghost: "hover:bg-surface focus-visible:ring-line/15",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2.5",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### 4.2 Input (`apps/web/src/components/ui/input.tsx`)

**AÇÃO**: Atualizar classes:

```typescript
<input
  className={cn(
    "flex h-10 w-full rounded-xl border border-line/25 bg-surface px-3 py-2 text-sm text-text",
    "placeholder:text-muted",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20",
    "disabled:cursor-not-allowed disabled:opacity-50",
    className
  )}
  ref={ref}
  {...props}
/>
```

### 4.3 Card (`apps/web/src/components/ui/card.tsx`)

**AÇÃO**: Atualizar classes:

```typescript
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-line/25 bg-surface shadow-card",
        className
      )}
      {...props}
    />
  )
);

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
);

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-xl font-semibold leading-none tracking-tight text-text", className)}
      {...props}
    />
  )
);

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted", className)}
      {...props}
    />
  )
);
```

### 4.4 Select (`apps/web/src/components/ui/select.tsx`)

**AÇÃO**: Atualizar triggers e conteúdo:

```typescript
const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-xl border border-line/25 bg-surface px-3 py-2 text-sm",
      "placeholder:text-muted focus:outline-none focus:ring-4 focus:ring-brand/20",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border border-line/25 bg-surface shadow-card",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
```

---

## 📋 PASSO 5: Atualizar Layout Principal

### 5.1 Dashboard Layout (`apps/web/src/components/layout/dashboard-layout.tsx`)

**AÇÃO**: Atualizar classes de fundo e estrutura:

```typescript
export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

### 5.2 Sidebar (`apps/web/src/components/layout/sidebar.tsx`)

**AÇÃO**: Usar `bg-surface` e bordas sutis:

```typescript
<aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-surface border-r border-line/25 overflow-y-auto">
  <nav className="p-4 space-y-1">
    {/* Items de navegação */}
    <a
      href="/home"
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
        isActive
          ? "bg-brand text-brand-contrast"
          : "text-text hover:bg-elev"
      )}
    >
      <Icon className="w-5 h-5" />
      <span>Home</span>
    </a>
  </nav>
</aside>
```

### 5.3 Header (`apps/web/src/components/layout/header.tsx`)

**AÇÃO**: Usar `bg-elev` para destaque:

```typescript
<header className="sticky top-0 z-50 w-full bg-elev border-b border-line/25 backdrop-blur supports-[backdrop-filter]:bg-elev/95">
  <div className="flex h-16 items-center px-6 justify-between">
    <div className="flex items-center gap-4">
      <h1 className="text-xl font-bold text-text">Cortex Ledger</h1>
    </div>

    <div className="flex items-center gap-4">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl hover:bg-surface transition-colors"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* User Menu */}
    </div>
  </div>
</header>
```

---

## 📋 PASSO 6: Atualizar Componentes de Dashboard

### 6.1 KPI Cards (`apps/web/src/components/dashboard/KpiCard.tsx`)

**AÇÃO**: Usar classes semânticas:

```typescript
<div className="card p-6">
  <div className="flex items-center justify-between mb-2">
    <span className="label">{label}</span>
    <Icon className="w-5 h-5 text-muted" />
  </div>

  <div className="text-3xl font-bold text-text mb-1">
    {formatCurrency(value)}
  </div>

  <div className={cn(
    "text-sm font-medium flex items-center gap-1",
    trend >= 0 ? "status-success" : "status-danger"
  )}>
    {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
    <span>{Math.abs(trend)}%</span>
  </div>
</div>
```

### 6.2 Gráficos (Exemplo: Evolution Chart)

**AÇÃO**: Importar e usar `chartTheme`:

```typescript
import { chartTheme } from "@/lib/chart-theme";
import { useEffect, useState } from "react";

export function EvolutionChart({ data }: EvolutionChartProps) {
  const [theme, setTheme] = useState(chartTheme.light);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? chartTheme.dark : chartTheme.light);

    // Observer para mudanças de tema
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? chartTheme.dark : chartTheme.light);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={theme.series.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={theme.series.primary} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />

        <XAxis
          dataKey="month"
          stroke={theme.axis}
          style={{ fontSize: 12 }}
        />

        <YAxis
          stroke={theme.axis}
          style={{ fontSize: 12 }}
          tickFormatter={(value) => formatCurrency(value)}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: theme.tooltip.bg,
            border: `1px solid ${theme.tooltip.border}`,
            borderRadius: 12,
            color: theme.tooltip.text,
          }}
        />

        <Area
          type="monotone"
          dataKey="value"
          stroke={theme.area.stroke}
          fill="url(#colorValue)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

---

## 📋 PASSO 7: Implementar Toggle de Tema

**AÇÃO**: Criar hook `apps/web/src/lib/hooks/use-theme.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Ler preferência salva ou do sistema
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = stored === "dark" || (!stored && prefersDark);

    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newValue = !isDark;
    setIsDark(newValue);
    document.documentElement.classList.toggle("dark", newValue);
    localStorage.setItem("theme", newValue ? "dark" : "light");
  };

  return { isDark, toggleTheme };
}
```

---

## 📋 PASSO 8: Atualizar Tabelas

**AÇÃO**: Exemplo de tabela de transações:

```typescript
<div className="card overflow-hidden">
  <table className="w-full">
    <thead className="table-header">
      <tr>
        <th className="px-6 py-3 text-left">Data</th>
        <th className="px-6 py-3 text-left">Descrição</th>
        <th className="px-6 py-3 text-right">Valor</th>
      </tr>
    </thead>
    <tbody>
      {transactions.map((tx) => (
        <tr key={tx.id} className="table-row">
          <td className="px-6 py-4 text-sm text-muted">
            {formatDate(tx.date)}
          </td>
          <td className="px-6 py-4 text-sm font-medium text-text">
            {tx.description}
          </td>
          <td className={cn(
            "px-6 py-4 text-sm font-semibold text-right",
            tx.amount >= 0 ? "status-success" : "status-danger"
          )}>
            {formatCurrency(tx.amount)}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## 📋 PASSO 9: Checklist de Acessibilidade

**AÇÃO**: Verificar após aplicar mudanças:

- [ ] Contraste texto/fundo ≥ 4.5:1 (testar com ferramenta como WebAIM)
- [ ] No Light: nunca usar `#C6C39A` para texto principal (apenas superfícies)
- [ ] No Dark: texto sempre `#FCF6D2` ou `#E0D3BC` (muted)
- [ ] Foco visível em todos os elementos interativos (ring de 4px)
- [ ] Botões primários com contraste alto (brand vs. brand-contrast)
- [ ] Estados de erro/sucesso com cores + ícones (não apenas cor)

---

## 📋 PASSO 10: Testar em Ambos os Modos

**AÇÃO**: Checklist visual final:

### Light Mode:
- [ ] Canvas: `#FCF6D2` (creme claro)
- [ ] Cards: `#FBE2B9` (creme médio)
- [ ] Toolbars: `#C6C39A` (oliva)
- [ ] Texto: `#281F20` (bordeaux escuro)
- [ ] Botão primário: fundo `#281F20`, texto `#FCF6D2`
- [ ] Gráficos: linhas/áreas em bordeaux escuro

### Dark Mode:
- [ ] Canvas: `#281F20` (bordeaux escuro)
- [ ] Cards: `#362A2C` (marrom médio)
- [ ] Toolbars: `#46383A` (marrom claro)
- [ ] Texto: `#FCF6D2` (creme)
- [ ] Botão primário: fundo `#FBE2B9`, texto `#281F20`
- [ ] Gráficos: linhas/áreas em creme

---

## 🎯 Resumo de Execução

**Ordem recomendada:**

1. Atualizar `globals.css` (maior impacto visual imediato)
2. Atualizar `tailwind.config.ts` (habilita classes Tailwind)
3. Criar `chart-theme.ts` (preparar gráficos)
4. Atualizar componentes UI base (Button, Input, Card, Select)
5. Atualizar layouts (DashboardLayout, Sidebar, Header)
6. Atualizar componentes de dashboard (KPIs, gráficos)
7. Implementar toggle de tema
8. Atualizar tabelas e listas
9. Verificar acessibilidade
10. Testar ambos os modos

**Comando para reiniciar dev server após mudanças:**
```bash
npm run dev
```

---

## 📌 Notas Finais

- **Bordas**: Sempre usar `border-line/25` (25% de opacidade)
- **Elevação**: Usar `bg-elev` para toolbars, headers, elementos destacados
- **Foco**: Ring de 4px com `ring-brand/25` (light) ou `ring-line/20` (dark)
- **Transições**: Adicionar `transition-all duration-200 ease` em elementos interativos
- **Sombras**: Usar `shadow-card` para cards principais
- **Tipografia**: Corpo 15px/24px, headings com font-semibold (600) ou font-bold (700)

**Esta paleta é consistente, elegante e profissional – perfeita para uma aplicação financeira.** 🎨
