# Tema — Orientação de UI (Dark, sólido)

Este documento consolida a orientação visual da aplicação com superfícies sólidas e sem translucência, adotando a base `#132421`. Substitui orientações anteriores (incluindo variantes “Cortex Pixel Teal” e “Modo Claro”).

---

## 1) Tokens (CSS)

```css
:root {
  /* Base — Melhor hierarquia de superfícies */
  --bg-app: #0e1c19;            /* Fundo principal (mais escuro para contraste) */
  --bg-card: #1a362f;           /* Superfície padrão (+20% contraste vs anterior) */
  --bg-card-2: #152b26;         /* Superfície aninhada */
  --bg-card-elevated: #1f3d36;  /* Cards com destaque (hover, ativo) */
  --bg-input: #13251f;          /* Background de inputs (mais escuro) */

  /* Bordas — Mais visíveis */
  --border: #2d5247;            /* Contorno principal (+35% visibilidade) */
  --border-subtle: #203a33;     /* Divisões internas sutis */
  --border-emphasis: #3a6456;   /* Bordas de destaque */

  /* Estados interativos */
  --hover: #1d3a33;             /* Hover de linhas/itens */
  --active: #234039;            /* Estado ativo/pressed */
  --focus: #3A8F6E;             /* Anel de foco */
  --divider: #213a34;           /* Linhas de divisão */

  /* Texto — Melhor legibilidade */
  --fg-primary: #F7FAF9;        /* Texto principal (mais claro) */
  --fg-secondary: #BBC5C2;      /* Texto secundário (melhor contraste) */
  --fg-muted: #94a8a1;          /* Texto terciário */
  --fg-disabled: #6b7d76;       /* Texto desabilitado */

  /* Ação / Marca */
  --accent: #3A8F6E;            /* Primário (adição/confirmar) */
  --accent-hover: #48a080;      /* Hover do accent (mais claro) */
  --accent-emph: #2E7D6B;       /* Ativo/pressed */
  --link: #8FCDBD;              /* Ação sutil */
  --money: #D4AF37;             /* Destaques monetários */

  /* Status — Cores saturadas para destaque */
  --success: #5FC883;           /* Verde mais vibrante */
  --success-bg: #1a3329;        /* Background sutil de sucesso */
  --warning: #E0B257;
  --warning-bg: #2e2819;        /* Background sutil de aviso */
  --error: #F07167;
  --error-bg: #2e1f1f;          /* Background sutil de erro */
  --info: #7AA6BF;
  --info-bg: #1a262e;           /* Background sutil de info */

  /* Charts — Paleta balanceada */
  --chart-1: #5FC883;           /* Verde (receitas) */
  --chart-2: #F07167;           /* Vermelho (despesas) */
  --chart-3: #E0B257;           /* Amarelo (investimentos) */
  --chart-4: #7AA6BF;           /* Azul (poupança) */
  --chart-5: #C49A6C;           /* Laranja (variável) */
  --chart-6: #9AA4AD;           /* Cinza (fixo) */

  /* Raio & sombras */
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --shadow-1: 0 1px 0 rgba(0,0,0,.4), 0 6px 14px rgba(0,0,0,.3);
  --shadow-2: 0 2px 0 rgba(0,0,0,.45), 0 12px 24px rgba(0,0,0,.35);
  --shadow-colored: 0 8px 16px -4px rgba(58, 143, 110, 0.25); /* Sombra colorida accent */
}
```

> Regra de ouro: superfícies sempre com opacidade 1 (sem `rgba(..., < 1)`, sem `backdrop-filter`, sem `blur`). Use `--bg-card`/`--bg-card-2` + `--border` + `--shadow-*`.

---

## 2) Camadas & Layout
- App root: fundo `--bg-app` (imagens só no root, nunca transparecendo nas superfícies).
- Content wrapper: max-width 1440, gutters 24–32px, grid 8pt.
- Elevação: card padrão usa `--shadow-1`; KPI/Modal/Dropdown usam `--shadow-2`.

### 2.1) Background com Efeito de Gradiente (App Root)

O fundo da aplicação utiliza um gradiente radial mais escuro para criar **maior contraste** com cards e superfícies, mantendo a paleta verde escura.

**Especificações do gradiente (ATUALIZADO 2025-11-10):**

```css
body, #app-root {
  background: radial-gradient(
    ellipse at center,
    #152821 0%,      /* Centro: tom médio */
    #111f1c 40%,     /* Transição: mais escuro */
    #0e1c19 70%,     /* Base: escuro (novo --bg-app) */
    #0a1512 100%     /* Bordas: muito escuro (vinheta forte) */
  );

  /* Garantir que o background cubra toda a viewport */
  min-height: 100vh;
  background-attachment: fixed;
  background-size: cover;
  background-repeat: no-repeat;
}
```

**Alternativa com CSS Variables (recomendado):**

Adicione ao `:root` do tokens (seção 1):

```css
:root {
  /* ... tokens existentes ... */

  /* Background gradient — ATUALIZADO para maior contraste */
  --bg-gradient-center: #152821;
  --bg-gradient-mid: #111f1c;
  --bg-gradient-base: #0e1c19;
  --bg-gradient-edge: #0a1512;
}

/* Aplicação */
body, #app-root {
  background: radial-gradient(
    ellipse at center,
    var(--bg-gradient-center) 0%,
    var(--bg-gradient-mid) 40%,
    var(--bg-gradient-base) 70%,
    var(--bg-gradient-edge) 100%
  );
  min-height: 100vh;
  background-attachment: fixed;
}
```

**Detalhes importantes:**

1. **Forma do gradiente:** `ellipse` (não circular) para melhor distribuição na viewport
2. **Posição:** `at center` para irradiar do centro da tela
3. **Stops de cor (ATUALIZADO):**
   - 0%: centro tom médio (#152821) - mais escuro para contraste
   - 40%: transição escura (#111f1c)
   - 70%: base escuro (#0e1c19) - corresponde ao --bg-app
   - 100%: bordas muito escuras (#0a1512) - vinheta forte
4. **Contraste aumentado:** Background ~30% mais escuro que versão anterior para criar **melhor hierarquia visual** com cards (#1a362f)
5. **Fixed attachment:** mantém o gradiente fixo durante scroll para efeito imersivo
6. **Sem noise/textura:** manter superfície limpa e sólida conforme orientação "anti-transparência"

**Implementação em Tailwind (via config):**

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      backgroundImage: {
        'app-gradient': `radial-gradient(ellipse at center,
          #152821 0%,
          #111f1c 40%,
          #0e1c19 70%,
          #0a1512 100%
        )`,
      },
    },
  },
};

// Uso: class="bg-app-gradient min-h-screen"
```

**Nota sobre superfícies:**
- Este gradiente aplica-se **APENAS** ao fundo raiz da aplicação
- Todos os cards, modais, sidebars mantêm fundos **sólidos** (`--bg-card`, `--bg-card-2`)
- Nunca use este gradiente em componentes internos - eles devem ter `background-color` explícito e opaco

### 2.2) Background com Imagem Customizada (Opcional)

Para usar uma imagem como background da aplicação, adicione-a em `public/assets/backgrounds/` e utilize um **overlay radial** verde para manter a identidade visual e legibilidade.

**Exemplo com imagem:**

```css
html {
  /* Overlay verde escuro + imagem de fundo */
  background-image:
    radial-gradient(
      ellipse at center,
      rgba(21, 40, 33, 0.85) 0%,      /* Overlay com 85% opacidade */
      rgba(17, 31, 28, 0.90) 40%,     /* 90% opacidade */
      rgba(14, 28, 25, 0.93) 70%,     /* 93% opacidade */
      rgba(10, 21, 18, 0.96) 100%     /* 96% opacidade (vinheta) */
    ),
    url('/assets/backgrounds/background.jpg');

  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
  background-attachment: fixed;
  min-height: 100vh;
}
```

**Diretrizes para imagens de background:**

1. **Formato recomendado:** JPG (otimizado) ou WebP para melhor performance
2. **Resolução:** Mínimo 1920x1080px (Full HD)
3. **Peso:** Máximo 200KB (otimizar com ferramentas de compressão)
4. **Overlay obrigatório:** Sempre use o gradiente radial verde com opacidade 85-96% para:
   - Manter legibilidade do texto branco
   - Preservar a identidade visual verde escura
   - Criar vinheta nas bordas
5. **Tonalidade da imagem:** Preferir imagens com tons escuros ou neutros que harmonizem com o verde
6. **Contraste:** Garantir que elementos de UI (cards, texto) se destaquem sobre a imagem

**Alternativa: Background apenas com gradiente (padrão)**

Se não houver imagem, use apenas o gradiente sólido (seção 2.1):

```css
html {
  background: radial-gradient(
    ellipse at center,
    #152821 0%,
    #111f1c 40%,
    #0e1c19 70%,
    #0a1512 100%
  );
}
```

## 3) Tipografia
- Títulos (H1/H2/H3): `--fg-primary`, peso 700/600, tracking -0.2px.
- Subtítulos/labels: `--fg-secondary`, peso 500.
- Corpo: `--fg-primary`; metadados/legendas: `--fg-muted`.

## 4) Componentes (resumo)
- Cards/KPIs: bg `--bg-card`, borda `1px solid var(--border)`, raio `--radius-lg`, sombra `--shadow-1`. Ícone em pill 36px com `--bg-card-2`.
- Botões:
  - Primário: bg `--accent` → hover `--accent-emph`; texto `#FFF`; raio 12px.
  - Secundário: bg `--bg-card-2`; borda `--border`; hover `--hover`.
  - Ghost: bg `transparent`; texto `--link`; hover `--bg-card-2`.
  - Destrutivo: bg `--error`; hover -8%; texto `#0E0E0E`.
  - Foco: `outline: 2px solid var(--focus); outline-offset: 2px;`
- Menus/Dropdowns: menu com bg `--bg-card`, borda `--border`, raio `--radius-md`, sombra `--shadow-2`; item 36px, hover `--hover`.
- Inputs/Selects: bg `--bg-card-2`, texto `--fg-primary`, placeholder `--fg-muted`, borda `--border`, raio `--radius-sm`, 40–44px; focus com borda `--focus` + glow leve.
- Tabelas: cabeçalho `#162B26`; linhas bg `--bg-card` (hover `--hover`); zebra com `--bg-card-2`; borda externa `--border`, raio `--radius-md`.
- Gráficos (ECharts): background `--bg-card`; axisLabel `--fg-secondary`; splitLine `#1A3530`; tooltip `--bg-card-2` com borda `--border`; paleta `--chart-1..6`.
- Sidebar: fundo `#111C1A`; borda direita `--border`; item hover `--hover`; ativo `--bg-card-2` + indicador `--accent`.
- Divisores: `1px solid var(--divider)`; headers de seção com H2 + descrição `--fg-muted`.
- Toasts: bg `--bg-card`, borda `--border`, sombra `--shadow-2`, ícone por status.

### 4.1) Seletor de Datas (Date Picker)

**Posicionamento fixo:**
- Sempre localizado no canto **superior direito** da página
- Presente em todas as abas/telas que necessitem filtro de data
- Posição padronizada e consistente em toda a aplicação

**Estrutura do componente:**

1. **Barra principal:**
   - Exibe o mês vigente centralizado (ex.: "Novembro 2025")
   - Botão de navegação à esquerda (`←`) para retroceder meses
   - Botão de navegação à direita (`→`) para avançar meses
   - Visual: bg `--bg-card-2`, borda `--border`, raio `--radius-sm`
   - Altura: 40–44px

2. **Calendário (ao clicar no mês):**
   - Abre dropdown/modal com calendário completo
   - Permite seleção de datas específicas (início e fim)
   - bg `--bg-card`, borda `--border`, sombra `--shadow-2`, raio `--radius-md`
   - Dias do mês: hover `--hover`, selecionado `--accent`
   - Dias fora do mês: `--fg-muted` com opacidade reduzida

3. **Pré-configurações (quick filters):**
   - Lista de opções rápidas dentro do calendário:
     - Última semana
     - Último mês
     - Últimos 3 meses
     - Últimos 6 meses
     - Último ano
     - Ano vigente
     - Personalizado (abre calendário completo)
   - Cada opção como botão ghost (bg `transparent`, hover `--hover`)
   - Altura: 32px, texto `--fg-secondary`, ativo com bg `--accent` e texto `#FFF`

**Comportamento:**
- Ao selecionar navegação (← →): atualiza o mês exibido
- Ao clicar no mês: abre dropdown com calendário + pré-configurações
- Ao selecionar pré-configuração: aplica filtro imediatamente e fecha dropdown
- Ao selecionar datas no calendário: aplica range selecionado
- Estado ativo: exibir indicador visual (borda `--focus` ou badge com `--accent`)

**Exemplo visual (pseudo-código):**
```html
<div class="date-picker-container">
  <!-- Barra de navegação de mês -->
  <div class="month-bar bg-[--bg-card-2] border-[--border] rounded-[--radius-sm]">
    <button class="nav-btn">←</button>
    <span class="current-month text-[--fg-primary]">Novembro 2025</span>
    <button class="nav-btn">→</button>
  </div>
  
  <!-- Dropdown (quando ativo) -->
  <div class="calendar-dropdown bg-[--bg-card] border-[--border] shadow-[--shadow-2]">
    <!-- Quick filters -->
    <div class="quick-filters">
      <button>Última semana</button>
      <button>Último mês</button>
      <button>Últimos 3 meses</button>
      <!-- ... -->
    </div>
    <!-- Calendário completo -->
    <div class="calendar-grid">
      <!-- dias... -->
    </div>
  </div>
</div>
```

## 5) Interações & Estados
- Hover: nunca reduzir opacidade; alterar bg para `--hover` (±6–8%).
- Pressed/Active: escurecer ~10–12% ou usar `--accent-emph`.
- Disabled: manter bg sólido (ex.: `--bg-card-2`) e texto `--fg-muted`.

## 6) Exemplo (Tailwind-ish)
```html
<div class="bg-[#18322C] border border-[#2A4942] rounded-[18px] shadow-[var(--shadow-1)] p-6">
  ...
</div>
```

## 7) Checklist “anti-transparência”
- Remover `opacity < 1`, `backdrop-filter`, `backdrop-blur`, `bg-opacity-*`.
- Garantir `background-color` explícito em todos os componentes.
- Gráficos com `backgroundColor` setado (sem alpha).
- Sidebar com fundo sólido `#111C1A`.
- Bordas sempre `1px solid var(--border)`.

---

Para implementação via shadcn/ui ou Tailwind, podemos publicar esses tokens em `theme.ts` ou `tailwind.config.js (extend.colors)` conforme necessário.
