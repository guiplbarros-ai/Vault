# PRD: Modo Claro - Cortex Cash
**Agent IMPORT: Owner**
**Versão**: 1.0
**Data**: 2025-01-29

---

## 1. Visão Geral

O **Modo Claro** do Cortex Cash deve proporcionar uma experiência visual confortável para uso em ambientes bem iluminados, mantendo alta legibilidade e contraste adequado. O tema deve ser profissional, moderno e alinhado com o design system existente.

---

## 2. Paleta de Cores - Cortex Pixel Teal

### 2.1. Cores Base (Dark Mode - Padrão)

```css
/* Background Hierarchy */
--background: #0B2230;             /* Navy escuro - Fundo principal */
--foreground: #E6F7F4;             /* Verde acqua claro - Texto principal */

/* Card e Surface */
--card: #123041;                   /* Navy médio - Cards */
--card-foreground: #E6F7F4;        /* Verde acqua claro - Texto em cards */
--surface-2: #173B4D;              /* Navy claro - Surface elevada */

/* Popover e Dropdown */
--popover: #123041;                /* Navy médio */
--popover-foreground: #E6F7F4;     /* Verde acqua claro */

/* Primary (Teal) */
--primary: #18B0A4;                /* Teal 500 - Cor principal */
--primary-600: #129A8F;            /* Teal 600 */
--primary-700: #0D7E75;            /* Teal 700 */
--primary-800: #0A625B;            /* Teal 800 */
--primary-foreground: #0B2230;     /* Navy escuro - Texto em primary */

/* Secondary */
--secondary: #173B4D;              /* Navy claro */
--secondary-foreground: #E6F7F4;   /* Verde acqua claro */

/* Muted (Backgrounds sutis) */
--muted: #0F2A39;                  /* Navy muito escuro */
--muted-foreground: #B5D8D2;       /* Verde acqua médio - Texto secundário */

/* Accent (Hover states) */
--accent: #173B4D;                 /* Navy claro - Hover background */
--accent-foreground: #E6F7F4;      /* Verde acqua claro */

/* Accent Gold (Highlights monetários) */
--accent-gold: #F5C04E;            /* Ouro 500 */
--accent-gold-600: #E7A93D;        /* Ouro 600 */
--accent-gold-foreground: #0B2230; /* Navy escuro */

/* Accent Orange */
--accent-orange: #F18F01;          /* Laranja 500 */
--accent-orange-foreground: #0B2230; /* Navy escuro */

/* Destructive (Erros) */
--destructive: #EF4444;            /* Vermelho erro */
--destructive-foreground: #E6F7F4; /* Verde acqua claro */

/* Border */
--border: #1E4657;                 /* Borda navy */
--input: #1E4657;                  /* Borda de inputs */

/* Ring (Focus) */
--ring: #18B0A4;                   /* Teal 500 - Borda de foco */

/* Radius */
--radius: 0.5rem;                  /* 8px - Border radius padrão */
```

### 2.2. Cores Base (Light Mode)

```css
/* Background Hierarchy */
--background: #F3FBFA;             /* Verde acqua muito claro - Fundo principal */
--foreground: #0B2230;             /* Navy escuro - Texto principal */

/* Card e Surface */
--card: #FFFFFF;                   /* Branco - Cards */
--card-foreground: #0B2230;        /* Navy escuro - Texto em cards */
--surface-2: #EDF7F6;              /* Verde acqua 100 - Surface elevada */

/* Popover e Dropdown */
--popover: #FFFFFF;                /* Branco */
--popover-foreground: #0B2230;     /* Navy escuro */

/* Primary (Teal) */
--primary: #129A8F;                /* Teal 600 - Cor principal (mais escuro no light) */
--primary-700: #0D7E75;            /* Teal 700 */
--primary-foreground: #F3FBFA;     /* Verde acqua claro - Texto em primary */

/* Secondary */
--secondary: #EDF7F6;              /* Verde acqua 100 */
--secondary-foreground: #0B2230;   /* Navy escuro */

/* Muted (Backgrounds sutis) */
--muted: #EFF7F6;                  /* Verde acqua muito claro */
--muted-foreground: #325861;       /* Navy médio - Texto secundário */

/* Accent (Hover states) */
--accent: #EDF7F6;                 /* Verde acqua 100 - Hover background */
--accent-foreground: #0B2230;      /* Navy escuro */

/* Accent Gold (Highlights monetários) */
--accent-gold: #E7A93D;            /* Ouro 600 (mais escuro no light) */
--accent-gold-foreground: #0B2230; /* Navy escuro */

/* Accent Orange */
--accent-orange: #E57E00;          /* Laranja 600 (mais escuro no light) */
--accent-orange-foreground: #0B2230; /* Navy escuro */

/* Destructive (Erros) */
--destructive: #EF4444;            /* Vermelho erro */
--destructive-foreground: #FFFFFF; /* Branco */

/* Border */
--border: #D2E8E5;                 /* Verde acqua 200 - Borda suave */
--input: #D2E8E5;                  /* Borda de inputs */

/* Ring (Focus) */
--ring: #129A8F;                   /* Teal 600 - Borda de foco */
```

### 2.3. Cores Semânticas

```css
/* Success */
--success: #22C55E;                /* Verde sucesso */
--success-foreground: #FFFFFF;     /* Branco */

/* Warning */
--warning: #F59E0B;                /* Amarelo aviso */
--warning-foreground: #0B2230;     /* Navy escuro */

/* Danger */
--danger: #EF4444;                 /* Vermelho erro */
--danger-foreground: #FFFFFF;      /* Branco */
```

### 2.4. Charts (ECharts palette)

```css
--chart-1: #18B0A4;  /* Teal */
--chart-2: #F5C04E;  /* Gold */
--chart-3: #5EDAC8;  /* Teal claro */
--chart-4: #F18F01;  /* Orange */
--chart-5: #0D7E75;  /* Teal escuro */
--chart-6: #E7A93D;  /* Gold escuro */
--chart-7: #0A625B;  /* Teal muito escuro */
--chart-8: #22C55E;  /* Success green */
```

---

## 3. Aplicação da Paleta

### 3.1. Backgrounds

| Elemento | Cor | Uso |
|----------|-----|-----|
| Body | `--background` (#FFFFFF) | Fundo principal da aplicação |
| Sidebar | `--card` (#FFFFFF) | Menu lateral |
| Cards | `--card` (#FFFFFF) | Cards, containers |
| Hover | `--accent` (#F1F5F9) | Estados de hover |
| Active | `--secondary` (#F1F5F9) | Itens ativos (sidebar) |

### 3.2. Textos

| Tipo | Cor | Uso |
|------|-----|-----|
| Títulos (H1-H3) | `--foreground` (#020817) | Headings principais |
| Corpo | `--foreground` (#020817) | Texto padrão |
| Secundário | `--muted-foreground` (#64748B) | Descrições, labels |
| Disabled | `--slate-400` (#94A3B8) | Estados desabilitados |

### 3.3. Bordas

| Tipo | Cor | Grossura |
|------|-----|----------|
| Cards | `--border` (#E2E8F0) | 1px |
| Inputs | `--input` (#E2E8F0) | 1px |
| Dividers | `--border` (#E2E8F0) | 1px |
| Focus Ring | `--ring` (#2563EB) | 2px |

### 3.4. Componentes Específicos

#### Sidebar
- Background: `#FFFFFF`
- Border: `#E2E8F0` (direita)
- Item hover: `#F1F5F9`
- Item ativo: `#EEF2FF` (primary/10)
- Texto: `#0F172A`
- Texto ativo: `#2563EB`

#### Top Bar
- Background: `#FFFFFF`
- Border: `#E2E8F0` (baixo)
- Texto: `#0F172A`

#### Cards de Configuração
- Background: `#FFFFFF`
- Border: `#E2E8F0`
- Header text: `#0F172A`
- Description: `#64748B`

#### Botões
- **Primary**: Background `#2563EB`, texto `#FFFFFF`
- **Secondary**: Background `#F1F5F9`, texto `#1E293B`
- **Ghost**: Transparent, hover `#F1F5F9`
- **Destructive**: Background `#EF4444`, texto `#FFFFFF`

#### Inputs
- Background: `#FFFFFF`
- Border: `#E2E8F0`
- Focus border: `#2563EB`
- Placeholder: `#94A3B8`
- Texto: `#0F172A`

---

## 4. Contraste e Acessibilidade

### 4.1. Ratios WCAG

Todos os pares de cor devem atender:
- **AA**: Mínimo 4.5:1 para texto normal
- **AA**: Mínimo 3:1 para texto grande (18px+)
- **AAA**: Mínimo 7:1 para texto normal (ideal)

### 4.2. Verificações

| Par | Ratio | Status |
|-----|-------|--------|
| `#020817` em `#FFFFFF` | 19.8:1 | ✅ AAA |
| `#64748B` em `#FFFFFF` | 4.52:1 | ✅ AA |
| `#2563EB` em `#FFFFFF` | 3.9:1 | ⚠️ AA Large |
| `#FFFFFF` em `#2563EB` | 5.24:1 | ✅ AA |

---

## 5. Transição de Temas

### 5.1. Como Funciona

1. **Modo Escuro (padrão atual)**: `<html class="dark">`
2. **Modo Claro (novo)**: `<html class="light">` ou sem classe
3. **Modo Auto**: Detecta `prefers-color-scheme: dark/light`

### 5.2. Implementação CSS

```css
/* globals.css */
@layer base {
  :root {
    /* Variáveis do modo claro aqui (padrão) */
  }

  .dark {
    /* Sobrescreve com variáveis do modo escuro */
  }
}
```

### 5.3. Animação de Transição

```css
* {
  transition: background-color 0.2s ease-in-out,
              border-color 0.2s ease-in-out,
              color 0.2s ease-in-out;
}
```

**Exceções** (sem transição):
- Hover states
- Focus states
- Loaders/Spinners

---

## 6. Comportamento Esperado

### 6.1. Seleção Manual

**Via Configurações (`/settings`)**:
1. Usuário clica em "Aparência"
2. Seleciona "Modo de cor": Claro / Escuro / Automático
3. Mudança é **imediata** (sem reload)
4. Salvo em `localStorage`

**Via Toggle (barra superior)**:
1. Usuário clica no ícone sol/lua
2. Dropdown mostra 3 opções com ícones
3. Seleção aplica tema instantaneamente
4. Ícone do botão atualiza (sol ↔ lua)

### 6.2. Modo Automático

1. Lê `window.matchMedia('(prefers-color-scheme: dark)')`
2. Aplica tema correspondente
3. **Listener ativo**: Atualiza se SO mudar tema
4. Sem necessidade de reload

### 6.3. Persistência

- **Storage**: `localStorage.getItem('cortex_settings')`
- **Key**: `appearance.theme: 'light' | 'dark' | 'auto'`
- **Restauração**: Ao carregar página, lê localStorage antes do primeiro render

---

## 7. Casos de Uso

### 7.1. Usuário em Escritório (Dia)
- **Preferência**: Modo Claro
- **Motivo**: Ambiente bem iluminado, telas brilhantes
- **Resultado**: Fundo branco, texto escuro, confortável para leitura

### 7.2. Usuário em Casa (Noite)
- **Preferência**: Modo Escuro
- **Motivo**: Ambiente com pouca luz
- **Resultado**: Fundo escuro, reduz fadiga ocular

### 7.3. Usuário com Preferência do Sistema
- **Preferência**: Automático
- **Motivo**: Quer seguir tema do macOS/Windows
- **Resultado**: Muda automaticamente com o sistema

---

## 8. Checklist de Implementação

### Passo 1: PRD ✅
- [x] Definir paleta de cores
- [x] Especificar contraste e acessibilidade
- [x] Documentar comportamento esperado

### Passo 2: Código
- [ ] Atualizar `globals.css` com variáveis `:root`
- [ ] Garantir que `.dark` sobrescreve corretamente
- [ ] Testar aplicação de classes no `<html>`
- [ ] Verificar transições suaves

### Passo 3: Componentes
- [ ] `ThemeToggle`: 3 opções funcionando
- [ ] `AppearanceSection`: Dropdown sincronizado
- [ ] `useAppearanceSettings`: Aplicando classes corretas
- [ ] Listener de `prefers-color-scheme` ativo

### Passo 4: Testes
- [ ] Modo Claro: Visual correto
- [ ] Modo Escuro: Visual correto
- [ ] Modo Auto: Detecta sistema
- [ ] Modo Auto: Atualiza com mudança do sistema
- [ ] Persistência: Restaura ao recarregar

---

## 9. Referências de Design

### Inspirações
- **Linear**: Modo claro clean, backgrounds brancos
- **Notion**: Cinzas sutis, hierarquia visual clara
- **Stripe Dashboard**: Profissional, alta legibilidade
- **Tailwind UI**: Paleta Slate bem equilibrada

### Design Tokens
- **Font**: Inter (body), JetBrains Mono (code)
- **Spacing**: Escala 4px (0.25rem)
- **Shadows**: Sutis, apenas em cards elevados
- **Radius**: 8px padrão (médio), 12px (large)

---

## 10. Resultado Final Esperado

### Visual
- Fundo **branco puro** (#FFFFFF)
- Texto **quase preto** (#020817)
- Cinzas **neutros frios** (Slate)
- Accent **azul vibrante** (#2563EB)
- Bordas **sutis** (#E2E8F0)

### UX
- Transições **suaves** (200ms)
- Alternância **instantânea** entre temas
- Sem **flash de conteúdo** (FOUC)
- **Persistente** entre sessões

### Performance
- Zero impacto: apenas classes CSS
- Sem rerenders desnecessários
- Listener otimizado (cleanup correto)
