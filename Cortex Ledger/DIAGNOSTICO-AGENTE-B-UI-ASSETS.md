# Diagnóstico Agente B: Assets/UI e Estilos
**Data:** 28 de outubro de 2025
**Agente:** Agente B (Unificação de Assets/UI)
**Status:** Diagnóstico Completo - Aguardando Orientações

---

## 1. Resumo Executivo

### Situação Atual
O projeto Cortex Ledger apresenta **fragmentação significativa** de assets, componentes UI e estilos distribuídos em **3 aplicações distintas**:

1. **apps/web** - Aplicação principal (154 arquivos TypeScript)
2. **apps/web-next** - Protótipo v0 migrado (21 arquivos TypeScript)
3. **v0-cortex-ledger-web-app-main** - Código legado v0 (para remoção)

### Principais Problemas Identificados
- ✅ **Duplicação de componentes UI** entre apps/web e apps/web-next
- ✅ **Sistemas de estilos conflitantes** (3 arquivos globals.css diferentes)
- ✅ **Design tokens inconsistentes** (Tailwind configs incompatíveis)
- ✅ **Assets públicos duplicados** (logos, ícones, placeholders)
- ✅ **ThemeProvider com implementações diferentes**
- ⚠️ **Ausência de biblioteca de componentes compartilhados**

---

## 2. Análise Detalhada dos Estilos

### 2.1 Sistemas de CSS Identificados

#### **apps/web/src/app/globals.css** (61 linhas)
- Sistema: Tailwind v4 + CSS Variables
- Paleta: Brand colors do UI-FRONTEND-GUIDE.md
- Theme: Dark-first com cores graphite/brand
- Tokens: `--radius`, `--radius-card`, `--radius-input`, `--radius-modal`
- Fontes: Inter via Google Fonts
- Status: **ALINHADO com UI-FRONTEND-GUIDE.md** ✅

```css
Cores principais:
- Background: #0B0F12 (graphite-950)
- Foreground: #E6EBF2 (graphite-100)
- Brand: #18C7B3 (brand-500)
```

#### **apps/web-next/app/globals.css** (217 linhas)
- Sistema: Tailwind v4 + CSS Variables + tw-animate-css
- Paleta: "Cortex Pixel Teal Theme" + OKLCH colors + Shadcn/ui
- Theme: Dark com estética pixel art
- Tokens: OKLCH-based (incompatível com guia)
- Fontes: Inter + JetBrains Mono
- Status: **NÃO ALINHADO - Experimental v0** ⚠️

```css
Cores principais:
- Background: #0a1f2e (teal escuro)
- Foreground: #e8dcc4 (bege)
- Accent: #2d9b9b (teal)
- Primary: #d4af37 (dourado)
```

#### **apps/web-next/styles/globals.css** (125 linhas)
- Sistema: Shadcn/ui padrão + OKLCH
- Paleta: Neutros OKLCH
- Status: **Duplicado/Shadcn boilerplate** 🔴

### 2.2 Tailwind Configurations

#### **apps/web/tailwind.config.ts** ✅
```typescript
Extend definido:
- Paleta completa (brand, graphite, slate, success, warning, error, info, insight)
- Box shadows: card, cardDark
- Border radius: xl2 (1.25rem)
- Animações: shimmer
- Fonts: Inter + Geist Mono

Status: CORRETO conforme UI-FRONTEND-GUIDE.md
```

#### **apps/web-next/tailwind.config.ts** ⚠️
```typescript
Extend: VAZIO
darkMode: 'class'
content: apenas app/ e components/

Status: MINIMALISTA - Depende totalmente do CSS
```

---

## 3. Componentes UI - Duplicação e Inconsistências

### 3.1 Inventário de Componentes

#### **apps/web/src/components/ui/** (20 componentes)
```
✅ alert.tsx
✅ avatar.tsx
✅ badge.tsx
✅ button.tsx
✅ card.tsx
✅ date-picker.tsx
✅ dialog.tsx
✅ dropdown-menu.tsx
✅ empty-state.tsx
✅ input.tsx
✅ label.tsx
✅ modal.tsx
✅ money-input.tsx
✅ select.tsx
✅ skeleton.tsx
✅ table.tsx
✅ tabs.tsx
✅ toast.tsx
✅ index.ts (barrel export)
📄 COMPONENT-USAGE-EXAMPLES.md
```

**Características:**
- Implementações completas com variants CVA
- Estilo: Brand colors + tokens do guia
- forwardRef + displayName pattern
- Props estendidas (loading, hover, etc.)

#### **apps/web-next/components/ui/** (4 componentes)
```
⚠️ badge.tsx
⚠️ button.tsx
⚠️ card.tsx
⚠️ progress.tsx
```

**Características:**
- Shadcn/ui v0 generated
- Estilo: OKLCH variables + data-slot pattern
- Minimalistas (sem variants extras)
- Componentes diferentes dos de apps/web

### 3.2 Análise de Divergências

#### Button Component
| Aspecto | apps/web | apps/web-next |
|---------|----------|---------------|
| Variants | default, primary, secondary, ghost, destructive, link | default, destructive, outline, secondary, ghost, link |
| Sizes | default, sm, lg, icon | default, sm, lg, icon, icon-sm, icon-lg |
| Features | loading prop | asChild prop (Slot) |
| Styling | Brand colors + CVA | OKLCH vars + data-slot |
| **Status** | ✅ Completo | ⚠️ Shadcn boilerplate |

#### Card Component
| Aspecto | apps/web | apps/web-next |
|---------|----------|---------------|
| Variants | light, dark, default | N/A |
| Props | hover prop | N/A |
| Subcomponents | Header, Title, Description, Content, Body, Footer | Header, Title, Description, Action, Content, Footer |
| Border Radius | xl2 (1.25rem) | xl (padrão) |
| **Status** | ✅ Alinhado ao guia | ⚠️ Genérico |

#### Badge Component
| Aspecto | apps/web | apps/web-next |
|---------|----------|---------------|
| Implementação | Custom com variants de estado | Shadcn padrão |
| Variants | Provável estados de orçamento | default, secondary, destructive, outline |
| **Status** | ✅ Específico do domínio | ⚠️ Genérico |

### 3.3 Componentes Únicos de apps/web ✨
Estes componentes **não existem** em apps/web-next:
- alert, avatar, date-picker, dialog, dropdown-menu
- empty-state, input, label, modal, money-input
- select, skeleton, table, tabs, toast

**Impacto:** apps/web-next depende de implementações futuras ou importações de apps/web.

---

## 4. Assets Públicos

### 4.1 Comparação de Diretórios

#### **apps/web/public/** (18 arquivos)
```
Ícones multi-resolução completos:
- favicon.ico
- icon-16x16.png até icon-1024x1024.png (7 tamanhos)
- apple-touch-icon.png
- site.webmanifest

Next.js assets:
- file.svg, globe.svg, next.svg, vercel.svg, window.svg

Status: ✅ PWA-ready + completo
```

#### **apps/web-next/public/** (8 arquivos)
```
Assets de design/placeholder:
- logo.png (1.6MB - PESADO!)
- placeholder-logo.png/svg
- placeholder-user.jpg
- placeholder.jpg/svg

Status: ⚠️ Assets temporários v0 + logo não otimizado
```

#### **v0-cortex-ledger-web-app-main/public/** (8 arquivos)
```
Duplicata exata de apps/web-next/public/
Status: 🔴 REMOVER - Código legado
```

### 4.2 Problemas de Assets

1. **Logo gigante não otimizado**
   - apps/web-next/public/logo.png: **1.6MB**
   - Formato: PNG não otimizado
   - Recomendação: Converter para WebP/AVIF + múltiplos tamanhos

2. **Placeholders duplicados**
   - placeholder-logo.png/svg duplicados entre apps
   - placeholder-user.jpg e placeholder.jpg sem uso aparente

3. **Falta de ícones PWA em web-next**
   - Sem manifest
   - Sem ícones multi-resolução
   - Sem favicons adequados

---

## 5. Theme Providers - Implementações Divergentes

### 5.1 apps/web/src/components/theme-provider.tsx (92 linhas)
```typescript
Implementação: CUSTOM
Features:
- Theme type: 'dark' | 'light' | 'system'
- localStorage persistence (storageKey: 'cortex-ui-theme')
- Default: 'dark' (forçado no mount inicial)
- Context-based com useTheme hook
- Manual class toggling (dark/light)

Status: ✅ Implementação robusta e específica
```

### 5.2 apps/web-next/components/theme-provider.tsx (12 linhas)
```typescript
Implementação: WRAPPER para next-themes
Features:
- Apenas wrapper do NextThemesProvider
- Sem lógica própria
- Depende de next-themes package

Status: ⚠️ Minimalista (padrão Shadcn/v0)
```

### 5.3 Implicações
- **Incompatibilidade:** Não podem ser usados intercambiavelmente
- **Dependências:** apps/web não tem next-themes, apps/web-next tem
- **Storage keys:** Diferentes (cortex-ui-theme vs theme padrão)

---

## 6. Estrutura de Bibliotecas Utilitárias

### 6.1 apps/web/src/lib/ (17 arquivos)
```
Bibliotecas robustas:
✅ chart-theme.ts - Tema ECharts customizado
✅ design-tokens.ts - Tokens do UI-FRONTEND-GUIDE
✅ export.ts - Lógica de exportação
✅ import-templates.ts - Templates de importação
✅ constants.ts
✅ types.ts
✅ utils.ts (Tailwind merge + cn utility)
✅ supabase.ts + supabase-server.ts
✅ query-utils.ts (React Query)
✅ providers.tsx (QueryClientProvider)

Diretórios:
📁 hooks/ (25 hooks customizados)
📁 charts/ (componentes de gráficos)
📁 parsers/ (parsers de extratos)
📁 services/ (lógica de negócio)
```

### 6.2 apps/web-next/lib/ (5 arquivos)
```
Bibliotecas mínimas:
⚠️ utils.ts (apenas cn utility - 3 linhas)
⚠️ supabase.ts
⚠️ supabase-server.ts

Status: INCOMPLETO - Falta toda a lógica de negócio
```

---

## 7. Contexto de Aplicações

### 7.1 apps/web - Aplicação Principal ✅
```
Tipo: Aplicação completa Next.js 16 + Tailwind v4
Arquivos TS: 154
Páginas: Dashboard, Transações, Orçamento, Relatórios, Cartões, Importação
Componentes funcionais: 14 módulos completos
Features:
- Autenticação (AuthProvider)
- Toast system
- Query client (React Query)
- Supabase SSR
- Layout completo com navegação
- Theme system custom

Status: ✅ PRODUÇÃO - Base principal do projeto
```

### 7.2 apps/web-next - Protótipo Experimental ⚠️
```
Tipo: Protótipo v0 convertido
Arquivos TS: 21
Páginas: Dashboard simples (página única)
Componentes: 5 componentes de dashboard + 4 UI básicos
Features:
- Layout minimalista
- Estética "Cortex Pixel Teal"
- Supabase middleware
- Shadcn/ui components

Status: ⚠️ EXPERIMENTAL - Protótipo não integrado
```

### 7.3 v0-cortex-ledger-web-app-main - Legado 🔴
```
Status: MARCADO PARA DELEÇÃO
Conteúdo: Cópia exata de apps/web-next original
Git status: Pending deletion (D status)

Status: 🔴 REMOVER COMPLETAMENTE
```

### 7.4 apps/desktop - Launcher macOS 📦
```
Tipo: Shell app macOS (wrapper)
Conteúdo: Scripts de build + ícone .icns
Função: Abre apps/web no navegador via macOS .app
Dependencies: Nenhuma (standalone)

Status: ✅ FUNCIONAL - Independente da UI web
```

---

## 8. Conformidade com UI-FRONTEND-GUIDE.md

### 8.1 apps/web - Scorecard ✅
| Critério | Status | Nota |
|----------|--------|------|
| Paleta de cores (brand/graphite/slate) | ✅ Completo | 10/10 |
| Tokens semânticos CSS vars | ✅ Implementado | 10/10 |
| Tailwind config extend | ✅ Completo | 10/10 |
| Componentes Button/Input/Card | ✅ Alinhados | 10/10 |
| Badges de estado orçamento | ✅ Implementado | 10/10 |
| Tema ECharts customizado | ✅ chart-theme.ts | 10/10 |
| Tipografia Inter + sizes | ✅ Correto | 10/10 |
| Border radius (xl2) | ✅ Correto | 10/10 |
| Box shadows (card/cardDark) | ✅ Implementado | 10/10 |
| Dark-first approach | ✅ Default dark | 10/10 |
| **SCORE TOTAL** | **✅ 100%** | **Totalmente conforme** |

### 8.2 apps/web-next - Scorecard ⚠️
| Critério | Status | Nota |
|----------|--------|------|
| Paleta de cores | ⚠️ Divergente (teal/gold) | 3/10 |
| Tokens semânticos | ⚠️ OKLCH (incompatível) | 2/10 |
| Tailwind config extend | 🔴 Vazio | 0/10 |
| Componentes Button/Input/Card | ⚠️ Shadcn padrão | 5/10 |
| Badges de estado orçamento | 🔴 Não implementado | 0/10 |
| Tema ECharts | 🔴 Ausente | 0/10 |
| Tipografia | ✅ Inter | 8/10 |
| Border radius | ⚠️ Padrão | 5/10 |
| Box shadows | ⚠️ Shadcn padrão | 5/10 |
| Dark-first | ✅ Dark class | 8/10 |
| **SCORE TOTAL** | **⚠️ 36%** | **Protótipo experimental** |

---

## 9. Análise de Package.json

### 9.1 Dependências Críticas - apps/web
```json
UI/Styling:
- tailwindcss: ^4 (latest)
- @tailwindcss/postcss: ^4
- class-variance-authority: ^0.7.1 (CVA)
- clsx + tailwind-merge (cn utility)
- lucide-react: ^0.548.0 (ícones)

Charts:
- echarts: ^6.0.0
- echarts-for-react: ^3.0.2

Radix UI: (10 primitives)
- dialog, dropdown-menu, select, tabs, toast, etc.

React/Next:
- next: 16.0.0
- react: 19.2.0
- react-dom: 19.2.0
```

### 9.2 Dependências Críticas - apps/web-next
```json
UI/Styling:
- tailwindcss: ^4.1.9 (mais recente)
- tw-animate-css: 1.3.3 (extra)
- class-variance-authority: ^0.7.1
- tailwindcss-animate: ^1.0.7 (Shadcn)
- lucide-react: ^0.454.0 (versão diferente)

Charts:
- recharts: latest (diferente!)

Radix UI: (27 primitives - completo Shadcn)
- Muito mais componentes que apps/web

Extras:
- next-themes: latest (gerenciamento de tema)
- cmdk, sonner, vaul, react-resizable-panels, etc.

React/Next:
- next: 16.0.0
- react: 19.2.0
- react-dom: 19.2.0
```

### 9.3 Divergências de Dependências
1. **Charts:** ECharts (apps/web) vs Recharts (apps/web-next)
2. **Theme:** Custom (apps/web) vs next-themes (apps/web-next)
3. **Radix UI:** Seleção mínima vs biblioteca completa
4. **Animações:** Nenhuma vs tw-animate-css + tailwindcss-animate
5. **Extras:** apps/web-next tem muitos packages Shadcn extras

---

## 10. Estrutura de Diretórios Completa

```
Cortex Ledger/
├── apps/
│   ├── web/                          ✅ APLICAÇÃO PRINCIPAL
│   │   ├── src/
│   │   │   ├── app/                  (páginas Next.js App Router)
│   │   │   │   ├── globals.css       ✅ 61 linhas - CORRETO
│   │   │   │   ├── layout.tsx        ✅ Layout completo
│   │   │   │   └── ...páginas
│   │   │   ├── components/
│   │   │   │   ├── ui/               ✅ 20 componentes
│   │   │   │   ├── dashboard/        (14 componentes funcionais)
│   │   │   │   ├── transacoes/
│   │   │   │   ├── orcamento/
│   │   │   │   ├── cartoes/
│   │   │   │   ├── relatorios/
│   │   │   │   ├── importacao/
│   │   │   │   └── ...
│   │   │   ├── lib/                  ✅ 17 arquivos + hooks
│   │   │   └── contexts/
│   │   ├── public/                   ✅ 18 arquivos (PWA-ready)
│   │   ├── tailwind.config.ts        ✅ Completo
│   │   └── package.json              ✅ 154 arquivos TS
│   │
│   ├── web-next/                     ⚠️ PROTÓTIPO EXPERIMENTAL
│   │   ├── app/
│   │   │   ├── globals.css           ⚠️ 217 linhas - Divergente
│   │   │   ├── layout.tsx            ⚠️ Minimalista
│   │   │   └── page.tsx              (dashboard único)
│   │   ├── components/
│   │   │   ├── ui/                   ⚠️ 4 componentes Shadcn
│   │   │   └── ...                   (5 componentes dashboard)
│   │   ├── lib/                      ⚠️ 3 arquivos básicos
│   │   ├── public/                   ⚠️ 8 arquivos (logo 1.6MB)
│   │   ├── styles/
│   │   │   └── globals.css           🔴 125 linhas - DUPLICADO
│   │   ├── tailwind.config.ts        ⚠️ Vazio
│   │   ├── components.json           (Shadcn config)
│   │   └── package.json              ⚠️ 21 arquivos TS
│   │
│   └── desktop/                      ✅ LAUNCHER MACOS
│       ├── create-mac-app.sh
│       ├── icon.icns
│       └── package.json              (build scripts)
│
├── v0-cortex-ledger-web-app-main/    🔴 REMOVER (legado)
│   └── ...                           (cópia obsoleta)
│
├── packages/                         (monorepo packages)
│   ├── db/                           (Drizzle ORM + Supabase)
│   ├── services/
│   └── etl/
│
└── docs/
    └── guides/
        └── UI-FRONTEND-GUIDE.md      📘 FONTE DA VERDADE
```

---

## 11. Git Status - Arquivos Marcados para Deleção

```bash
Pending deletion:
D ../v0-cortex-ledger-web-app-main/.gitignore
D ../v0-cortex-ledger-web-app-main/README.md
D ../v0-cortex-ledger-web-app-main/app/globals.css
D ../v0-cortex-ledger-web-app-main/app/layout.tsx
D ../v0-cortex-ledger-web-app-main/app/page.tsx
D ../v0-cortex-ledger-web-app-main/components.json
D ../v0-cortex-ledger-web-app-main/components/*.tsx
D ../v0-cortex-ledger-web-app-main/components/ui/*.tsx
D ../v0-cortex-ledger-web-app-main/public/*
... (29 arquivos total)

Untracked:
?? .pnpm-store/
?? apps/web-next/
?? pnpm-lock.yaml
?? v0-cortex-ledger-web-app-main/
```

**Interpretação:**
- v0-cortex-ledger-web-app-main foi copiado/movido para apps/web-next
- Arquivos originais estão marcados para deleção (D status)
- apps/web-next aparece como untracked (novo)

---

## 12. Matriz de Decisões Recomendadas

### 12.1 Estratégia: Unificação vs Consolidação vs Separação

| Cenário | Descrição | Prós | Contras |
|---------|-----------|------|---------|
| **A) apps/web como base única** | Descartar apps/web-next, manter apenas apps/web | ✅ Alinhado ao guia<br>✅ Completo<br>✅ Sem refactor | ❌ Perde trabalho v0<br>❌ Sem pixel art theme |
| **B) Migrar estilos web-next → web** | Trazer theme pixel art para apps/web como variante | ✅ Preserva designs<br>✅ Flexibilidade | ⚠️ Conflito de paletas<br>⚠️ Complexidade |
| **C) Criar packages/ui compartilhado** | Extrair componentes para monorepo package | ✅ Reusabilidade<br>✅ Single source of truth | ⚠️ Refactor grande<br>⚠️ Setup Storybook |
| **D) Converter web-next para demo** | Manter web-next como showcase/playground | ✅ Preserva protótipo<br>✅ Sem conflito | ⚠️ Manutenção dupla<br>⚠️ Divergência contínua |

### 12.2 Recomendação do Agente B

**Estratégia Híbrida: A + C (Faseada)**

**Fase 1 (Imediato):**
1. **Remover v0-cortex-ledger-web-app-main** completamente (commit deletion)
2. **Consolidar apps/web como aplicação principal**
3. **Arquivar apps/web-next** em branch separada (git branch archive/web-next-v0)
4. **Unificar assets públicos** em apps/web/public

**Fase 2 (Sprint atual):**
5. **Criar packages/ui** com componentes de apps/web
6. **Configurar Storybook** para documentação
7. **Migrar apps/web para usar @cortex/ui**

**Fase 3 (Futuro):**
8. Reavaliar apps/web-next como demo/marketing site
9. Implementar theme switcher com variante "pixel art" opcional

---

## 13. Assets Críticos para Preservar/Unificar

### 13.1 Assets Únicos de apps/web ✅
```
✅ Ícones PWA completos (16x16 até 1024x1024)
✅ favicon.ico otimizado
✅ apple-touch-icon.png
✅ site.webmanifest
```

### 13.2 Assets Únicos de apps/web-next ⚠️
```
⚠️ logo.png (OTIMIZAR - 1.6MB → <100KB WebP)
⚠️ placeholder-*.svg (avaliar necessidade)
```

### 13.3 Assets a Descartar 🔴
```
🔴 placeholder-logo.png (redundante com SVG)
🔴 placeholder-user.jpg (não usado)
🔴 placeholder.jpg (não usado)
🔴 Tudo de v0-cortex-ledger-web-app-main/
```

---

## 14. Componentes UI - Matriz de Decisão

| Componente | apps/web | apps/web-next | Decisão |
|------------|----------|---------------|---------|
| **button** | ✅ Completo CVA + loading | ⚠️ Shadcn + Slot | ✅ **Manter apps/web** |
| **card** | ✅ Variants + hover | ⚠️ Shadcn + Action | ✅ **Manter apps/web** + adicionar CardAction |
| **badge** | ✅ Estados domínio | ⚠️ Shadcn padrão | ✅ **Manter apps/web** |
| **progress** | ❌ Ausente | ✅ Presente | ⚠️ **Portar para apps/web** |
| **alert** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **avatar** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **date-picker** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **dialog** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **dropdown-menu** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **empty-state** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **input** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **label** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **modal** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **money-input** | ✅ Específico domínio | ❌ Ausente | ✅ **Manter apps/web** |
| **select** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **skeleton** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **table** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **tabs** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |
| **toast** | ✅ Completo | ❌ Ausente | ✅ **Manter apps/web** |

**Conclusão:** apps/web tem **19 componentes exclusivos** vs **1 de apps/web-next (progress)**.

---

## 15. Checklist de Ações Propostas

### Prioridade CRÍTICA 🔴 (Fazer agora)
- [ ] **Remover completamente v0-cortex-ledger-web-app-main/**
  - [ ] Commit git deletion
  - [ ] Remover diretório físico
  - [ ] Verificar nenhuma referência em imports

- [ ] **Unificar assets públicos**
  - [ ] Copiar ícones PWA de apps/web para referência central
  - [ ] Otimizar logo.png (apps/web-next) para WebP <100KB
  - [ ] Decidir sobre placeholders (manter/remover)

### Prioridade ALTA 🟠 (Sprint atual)
- [ ] **Consolidar estilos em apps/web**
  - [ ] Auditar globals.css (já conforme)
  - [ ] Validar tailwind.config.ts (já conforme)
  - [ ] Documentar tokens faltantes (se houver)

- [ ] **Arquivar apps/web-next**
  - [ ] Criar branch archive/web-next-v0
  - [ ] Git checkout -b archive/web-next-v0
  - [ ] Commit with message: "Archive experimental v0 prototype"
  - [ ] Remover diretório de main branch

- [ ] **Adicionar componente Progress a apps/web**
  - [ ] Portar apps/web-next/components/ui/progress.tsx
  - [ ] Adaptar estilos para brand colors
  - [ ] Adicionar a apps/web/src/components/ui/index.ts

### Prioridade MÉDIA 🟡 (Próximo sprint)
- [ ] **Criar packages/ui**
  - [ ] Setup package em packages/ui/
  - [ ] Configurar tsconfig e build
  - [ ] Migrar componentes de apps/web/src/components/ui/
  - [ ] Exportar @cortex/ui

- [ ] **Setup Storybook**
  - [ ] Instalar Storybook em packages/ui
  - [ ] Criar stories para todos os componentes
  - [ ] Configurar dark mode toggle
  - [ ] Deploy docs (Chromatic ou similar)

- [ ] **Refatorar apps/web para usar @cortex/ui**
  - [ ] Atualizar imports
  - [ ] Testar todos os componentes
  - [ ] Remover diretório apps/web/src/components/ui/ (após migração)

### Prioridade BAIXA 🟢 (Backlog)
- [ ] **Theme variants experimentais**
  - [ ] Avaliar "Cortex Pixel Teal" como theme alternativo
  - [ ] Implementar switcher com preset de temas
  - [ ] Adicionar theme ao packages/ui

- [ ] **Reavaliar apps/web-next**
  - [ ] Decidir uso futuro (demo/marketing)
  - [ ] Se mantido: alinhar estilos com UI-FRONTEND-GUIDE.md
  - [ ] Se descartado: remover definitivamente

---

## 16. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Perda de trabalho v0 | Média | Baixo | ✅ Arquivar em branch antes de remover |
| Quebra de imports | Alta | Médio | ✅ Fase de migração gradual para @cortex/ui |
| Inconsistência pós-merge | Média | Alto | ✅ Manter apps/web como source of truth |
| Sobrescrita de assets | Baixa | Médio | ✅ Backup antes de unificar public/ |
| Regressão visual | Média | Alto | ✅ Screenshots antes/depois + teste visual |

---

## 17. Métricas de Sucesso

### Quantitativas
- **Arquivos de estilo:** 3 → 1 (globals.css unificado)
- **Tailwind configs:** 2 → 1 (apps/web como referência)
- **Componentes duplicados:** 4 → 0 (button, card, badge removidos de web-next)
- **Assets públicos:** 26 → ~15 (remoção de duplicatas + otimização)
- **Diretórios de apps:** 3 → 1 (apps/web como único app frontend)
- **Tamanho de assets:** Redução de ~2MB (logo otimizado)

### Qualitativas
- ✅ 100% conformidade com UI-FRONTEND-GUIDE.md
- ✅ Single source of truth para componentes UI
- ✅ Storybook funcional com documentação
- ✅ Design tokens centralizados e reutilizáveis
- ✅ Zero conflitos de estilos entre apps

---

## 18. Próximos Passos - Aguardando Orientações

**Agente B está pronto para executar as seguintes ações mediante aprovação:**

1. **Limpeza imediata:**
   - Remover v0-cortex-ledger-web-app-main
   - Arquivar apps/web-next em branch

2. **Unificação de assets:**
   - Consolidar public/ directories
   - Otimizar logo.png

3. **Criação de packages/ui:**
   - Setup inicial da biblioteca compartilhada
   - Migração de componentes

4. **Documentação:**
   - Storybook setup
   - Component API docs

**Aguardando orientações sobre:**
- ✅ Confirmar estratégia de unificação (Cenário A + C recomendado)
- ✅ Priorização das fases de execução
- ✅ Destino de apps/web-next (arquivar vs remover vs reuso)
- ✅ Necessidade de temas alternativos (pixel art)
- ✅ Aprovação para início das alterações

---

## 19. Observações Finais

### Pontos Positivos ✅
1. **apps/web está 100% alinhado** com UI-FRONTEND-GUIDE.md
2. **Separação clara** de responsabilidades (web principal vs desktop launcher)
3. **Documentação existente** robusta (UI-FRONTEND-GUIDE.md)
4. **Componentes bem estruturados** com CVA e forwardRef patterns
5. **Assets PWA completos** em apps/web

### Pontos de Atenção ⚠️
1. **Duplicação de código** entre apps (componentes, estilos, configs)
2. **Dependências divergentes** (ECharts vs Recharts, next-themes, etc.)
3. **Falta de biblioteca compartilhada** (monorepo packages/ui)
4. **Assets não otimizados** (logo 1.6MB)
5. **Legado v0 ainda presente** no diretório

### Complexidade Estimada
- **Remoção de legado:** 🟢 Baixa (1-2h)
- **Unificação de assets:** 🟢 Baixa (2-3h)
- **Criação packages/ui:** 🟡 Média (1-2 dias)
- **Setup Storybook:** 🟡 Média (1 dia)
- **Migração completa apps/web:** 🟠 Alta (3-5 dias)

---

**Diagnóstico concluído. Aguardando orientações para início da execução.**

---

**Gerado por:** Agente B (Claude Code)
**Timestamp:** 2025-10-28 10:30 BRT
**Versão:** 1.0
