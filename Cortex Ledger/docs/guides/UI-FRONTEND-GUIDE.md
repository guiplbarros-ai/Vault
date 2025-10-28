# Cortex Ledger — Guia de UI e Frontend (v1)

> **Objetivo:** padronizar o visual do produto (cores, temas, componentes e padrões de interação) para acelerar o desenvolvimento do **beta fechado** e manter consistência.
>
> **Stack alvo:** Next.js + React + Tailwind + ECharts + Lucide. Modo **auto** (segue o sistema) com variantes **light/dark**.

---

## 1) Princípios de Design

* **Densidade alta** e foco em produtividade.
* **Sem floreio:** textos curtos, diretos; microinterações discretas.
* **Acessibilidade AA:** contraste mínimo em textos e ações.
* **Semântica > Estética:** botões, toasts, badges e estados usam **tokens de cor semânticos**.
* **Local-first:** evitar dependências visuais pesadas; preferir bordas e contraste às grandes sombras.

---

## 2) Sistema de Cores

### 2.1 Brand (verde-acqua)

| Token       | Hex       | Uso                              |
| ----------- | --------- | -------------------------------- |
| `brand-700` | `#0EA08F` | Hover primário / borda forte     |
| `brand-600` | `#12B5A2` | **Ação primária** (botões/links) |
| `brand-500` | `#18C7B3` | Destaques suaves / ícones ativos |
| `brand-400` | `#63E0D1` | Focus ring / grafismos           |
| `brand-300` | `#95EDE5` | Fills sutis                      |
| `brand-200` | `#C6F7F3` | Backgrounds sutil                |
| `brand-100` | `#E9FCFA` | Chips/labels suaves              |

### 2.2 Grafites (neutros para dark)

`graphite-950 #0B0F12` • `900 #12161B` • `800 #171C22` • `700 #1E242C` • `600 #2A313B` • `500 #3B4552` • `400 #5B6676` • `300 #8A98AB` • `200 #C2CBD8` • `100 #E6EBF2`

### 2.3 Cinzas (neutros para light)

`slate-50 #F8FAFC` • `100 #F2F5F8` • `200 #E8EDF3` • `300 #DBE2EA` • `400 #C6D0DB` • `500 #9AA6B2` • `600 #6B7785` • `700 #47515C` • `800 #2F3740` • `900 #1C232B`

### 2.4 Estados / Feedback

| Categoria          | Fundo     | Texto/Borda |
| ------------------ | --------- | ----------- |
| Success            | `#EAF7EF` | `#16A34A`   |
| Warning (80%)      | `#FFF3E6` | `#C26719`   |
| Error (100%)       | `#FFECEC` | `#E2555A`   |
| Info               | `#E9F0FF` | `#2463EB`   |
| Insight (mostarda) | `#FFF6D8` | `#B8891A`   |

> **Regras:** ação primária = `brand-600`; hover = `brand-700`; ring de foco = `brand-400`. Evitar texto sobre `brand-300` (contraste baixo).

---

## 3) Tokens Semânticos (light/dark)

### Light

```css
:root {
  --bg:#F8FAFC; --surface:#FFFFFF; --surface-2:#F2F5F8;
  --text:#1C232B; --text-muted:#6B7785; --border:#E8EDF3;
  --brand:#12B5A2; --brand-contrast:#062A26; --focus-ring:#63E0D1;
}
```

### Dark

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg:#0B0F12; --surface:#12161B; --surface-2:#171C22;
    --text:#E6EBF2; --text-muted:#8A98AB; --border:#2A313B;
    --brand:#18C7B3; --brand-contrast:#0B0F12; --focus-ring:#63E0D1;
  }
}
```

> Use `text-[color:var(--brand-contrast)]` para o texto dentro de botões primários.

---

## 4) Tailwind Config (extend)

```ts
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          100:'#E9FCFA',200:'#C6F7F3',300:'#95EDE5',
          400:'#63E0D1',500:'#18C7B3',600:'#12B5A2',700:'#0EA08F',
        },
        graphite: {
          100:'#E6EBF2',200:'#C2CBD8',300:'#8A98AB',400:'#5B6676',
          500:'#3B4552',600:'#2A313B',700:'#1E242C',800:'#171C22',
          900:'#12161B',950:'#0B0F12'
        },
        slate: {
          50:'#F8FAFC',100:'#F2F5F8',200:'#E8EDF3',300:'#DBE2EA',400:'#C6D0DB',
          500:'#9AA6B2',600:'#6B7785',700:'#47515C',800:'#2F3740',900:'#1C232B'
        },
        success:{100:'#EAF7EF',600:'#16A34A'},
        warning:{100:'#FFF3E6',600:'#C26719'},
        error:{100:'#FFECEC',600:'#E2555A'},
        info:{100:'#E9F0FF',600:'#2463EB'},
        insight:{100:'#FFF6D8',600:'#B8891A'},
      },
      boxShadow:{ card:'0 8px 24px rgba(0,0,0,0.08)', cardDark:'0 8px 24px rgba(0,0,0,0.35)' },
      borderRadius:{ xl2:'1.25rem' },
    },
  },
};
```

### Classes base sugeridas

```css
html { color-scheme: light dark; }
body { background: var(--bg); color: var(--text); }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 1.25rem; }
```

---

## 5) Componentes — Padrões de Estilo

### 5.1 Botões

* **Primário:** `bg-brand-600 hover:bg-brand-700 text-[color:var(--brand-contrast)] focus:outline-none focus:ring-2 focus:ring-brand-400`
* **Secundário:** `bg-slate-100 dark:bg-graphite-700 text-slate-700 dark:text-graphite-100 border border-slate-300 dark:border-graphite-600`
* **Ghost:** `text-brand-600 hover:text-brand-700 hover:bg-brand-100/40`
* **Desabilitado:** `opacity-45 cursor-not-allowed`

### 5.2 Inputs / Fields

`bg-white dark:bg-graphite-700 border border-slate-300 dark:border-graphite-600 rounded-lg px-3 h-10 focus:ring-2 focus:ring-brand-400 focus:border-brand-600 placeholder:text-slate-500 dark:placeholder:text-graphite-300`

**Ajuda/Erro:** usar `text-slate-600` e `text-error-600`.

### 5.3 Cards

* Light: `bg-white shadow-card border border-slate-200`
* Dark: `bg-graphite-800 shadow-cardDark border border-graphite-700`
* Título: `text-slate-900 dark:text-graphite-100`

### 5.4 Tabelas densas

* Cabeçalho fixo, `text-sm`.
* Listras: linhas pares `bg-[var(--surface)]`, ímpares `bg-[color:var(--surface-2)]`.
* Hover: leve `bg-brand-100/40` (light) ou `bg-graphite-600/30` (dark).
* Seleção em massa: checkbox com **focus ring** `brand-400`.

### 5.5 Chips/Badges

* Padrão: `rounded-full px-2.5 py-1 text-xs`.
* Estados de orçamento:

  * Saudável `<80%`: `bg-brand-100 text-brand-700`
  * Atenção `≥80%`: `bg-warning-100 text-warning-600`
  * Estourado `≥100%`: `bg-error-100 text-error-600`

### 5.6 Toasts

* Posição: canto inferior direito.
* Layout: `card` + ícone Lucide à esquerda.
* Cores por severidade (success/warning/error/info) da tabela de estados.

---

## 6) Tipografia e Ícones

* **Fonte:** Inter — títulos `font-semibold`, corpo `font-normal`.
* Tamanhos: `text-xl` (títulos de card), `text-base` (corpo), `text-sm` (tabela), `text-xs` (badges).
* **Ícones:** Lucide, stroke 1.5; cor herda do texto.

---

## 7) Espaçamento, Bordas e Sombras

* **Grid:** base 4px. Principais: 8, 12, 16, 24.
* **Radii:** `rounded-lg` (8px) padrão; `rounded-xl2` (20px) em cards hero.
* **Sombras:** `shadow-card` (light) e `shadow-cardDark` (dark). Evitar mais de 1 nível de sombra aninhada.

---

## 8) Tema para ECharts

```ts
export const cortexEchartsTheme = {
  color: [
    '#12B5A2', // Receita / série positiva
    '#E2555A', // Despesa
    '#B8891A', // Orçado
    '#3B4552', // Realizado (grafite 500)
    '#63E0D1', // Variação brand
    '#C26719', // Alertas
  ],
  textStyle: { color: 'var(--text)' },
  title: { textStyle: { color: 'var(--text)' } },
  axisLine: { lineStyle: { color: 'var(--border)' } },
  axisLabel: { color: 'var(--text-muted)' },
  splitLine: { lineStyle: { color: 'var(--border)' } },
  tooltip: {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
    textStyle: { color: 'var(--text)' }
  },
};
```

**Mapeamento recomendado:**

* Série "Entradas/Receitas" → brand
* Série "Saídas/Despesas" → vermelho
* "Orçado" → mostarda
* "Realizado" → grafite 500

---

## 9) Exemplo — Tela de Login

**Fundo:** `bg-slate-50 dark:bg-graphite-950`

**Cards:** `card` (seção esquerda e formulário)

**Título:** `text-slate-900 dark:text-graphite-100`

**Inputs:** conforme seção 5.2

**Botão Entrar:**

```html
<button class="w-full h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-[color:var(--brand-contrast)] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400">
  Entrar
</button>
```

**Links:** `text-brand-600 hover:text-brand-700`

**Chips de credenciais de teste:** `bg-slate-100 dark:bg-graphite-700 text-slate-700 dark:text-graphite-200`

---

## 10) Acessibilidade e Estados

* **Focus visível** em todos os elementos interativos (ring brand-400, 2px).
* **Tamanhos mínimos de alvo**: 36x36px em toques/clicks críticos.
* **Contraste:** manter AA para texto normal; AAA para texto < 14px quando possível.
* **Estados:** hover, active, disabled e focus definidos para botões, links, inputs e linhas de tabela.

---

## 11) Diretrizes de Conteúdo (Copy)

* **Login:** "Digite seu email e senha para acessar sua conta".
* **Empty state Home:** "Comece importando seus extratos. **Importar dados** abre o assistente e salva seu template para a próxima vez."
* **Tooltips de classificação:** "Regras têm prioridade. Gere regras a partir de confirmações para acelerar o próximo ciclo."
* **Alertas de orçamento:** 80% (warning), 100% (error) — mensagens objetivas.

---

## 12) Checklist de Implementação (Semana 1)

* [ ] Configurar **Tailwind** com `extend` de cores.
* [ ] Injetar **CSS vars** (light/dark via `prefers-color-scheme`).
* [ ] Criar componentes base (`Button`, `Input`, `Card`, `Chip`, `Toast`).
* [ ] Refatorar **Login** com os tokens acima.
* [ ] Registrar tema do **ECharts** e aplicar nos gráficos do dashboard.
* [ ] Auditar contraste e foco (axe/Storybook a11y, se disponível).

---

## 13) Exemplos de Uso (Snippet Kitchen)

### Botão Secundário

```html
<button class="h-10 px-4 rounded-lg bg-slate-100 dark:bg-graphite-700 border border-slate-300 dark:border-graphite-600 text-slate-700 dark:text-graphite-100 hover:bg-slate-200 dark:hover:bg-graphite-600 focus:outline-none focus:ring-2 focus:ring-brand-400">Cancelar</button>
```

### Campo com Erro

```html
<div>
  <label class="block text-sm mb-2 text-slate-700 dark:text-graphite-200">Senha</label>
  <input class="w-full h-10 px-3 rounded-lg bg-white dark:bg-graphite-700 border border-error-600 focus:ring-2 focus:ring-error-600"/>
  <p class="mt-1 text-sm text-error-600">Senha inválida</p>
</div>
```

### Tabela Densa

```html
<table class="w-full text-sm">
  <thead class="sticky top-0 bg-[var(--surface)]">
    <tr class="text-slate-600 dark:text-graphite-300">
      <th class="py-2 text-left">Data</th>
      <th class="py-2 text-left">Descrição</th>
      <th class="py-2 text-right">Valor</th>
    </tr>
  </thead>
  <tbody>
    <tr class="odd:bg-[var(--surface-2)] even:bg-[var(--surface)] hover:bg-brand-100/40 dark:hover:bg-graphite-600/30">
      <td class="py-2">2025-10-05</td>
      <td>UBER*TRIP HELP</td>
      <td class="text-right text-error-600">-R$ 32,90</td>
    </tr>
  </tbody>
</table>
```

---

## 14) Versão e Manutenção

* **v1** (este arquivo) cobre o essencial para beta.
* Alterações de cor/tokens devem manter contraste e semântica.
* Próximos passos: biblioteca de componentes compartilhados em `packages/ui` com Storybook.

---

**Autor:** Guilherme (PO) · **Última atualização:** 27 de outubro de 2025

