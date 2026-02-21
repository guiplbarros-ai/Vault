# PRD de Melhoramento — Cortex Cash v2

> Auditoria completa realizada em 2026-02-20. Atualizado após deep audit com 5 agentes paralelos.
> Estado atual: 43 pages, 26 tabelas IndexedDB, 20+ services, ~110 componentes.
> **~80 issues identificados**, organizados em 7 fases.

### Status das Fases
- [x] **Fase 2** — Validação de Dados (commit `a26b9d4d`, 2026-02-20)
- [ ] **Fase 3** — Integridade de Dados (CRÍTICA)
- [ ] **Fase 4** — Qualidade de Código
- [ ] **Fase 5** — Segurança de API
- [ ] **Fase 6** — Performance
- [ ] **Fase 7** — UI/UX

---

## Resumo Executivo

A aplicacao tem uma base funcional forte (transacoes, contas, orcamentos, investimentos, importacao, classificacao IA, planejamento, IRPF). Porem a auditoria revelou problemas em 5 eixos:

1. **Integridade de dados** — FK nao enforced no Dexie, transferencias orfas, multi-user com data leaks
2. **Validacao** — schemas Zod existem mas nao sao usados em metade dos paths (update, bulk, auth)
3. **UI/UX** — ~15 componentes com hex hardcoded, acessibilidade fraca, responsividade parcial
4. **Qualidade de codigo** — console.logs em producao, parsers OFX duplicados, dead code
5. **Testes** — auth, planejamento, projecao, IR sem testes; bugs criticos sem cobertura

---

## Fase 1 — Integridade de Dados (Critica)

### 1.1 Cascade Deletes no Dexie

**Problema**: `schema.ts` declara `onDelete: 'cascade'` e `onDelete: 'set null'` mas Dexie ignora — zero enforcement em runtime.

**Solucao**: Criar um middleware `cascadeDelete` no Dexie que:
- `deleteConta()` → deleta transacoes associadas (ou muda para soft-delete com flag)
- `deleteCategoria()` → seta `categoria_id = null` nas transacoes
- `deleteInstituicao()` → deleta contas (que cascade para transacoes)

**Arquivos**: `lib/db/client.ts`, `lib/services/conta.service.ts`, `lib/services/categoria.service.ts`

### 1.2 Transfer Pair Integrity

**Problema**: `deleteTransacao()` deleta apenas um leg de uma transferencia. O sibling fica orfao com `transferencia_id` apontando para registro deletado.

**Solucao**:
- Em `deleteTransacao()`, se `transferencia_id` existe, buscar e deletar o sibling
- Em `bulkDelete()`, coletar todos siblings antes de deletar
- Adicionar check no seed/migration para limpar orfaos existentes

**Arquivo**: `lib/services/transacao.service.ts` (linhas ~524, ~570)

### 1.3 Multi-User Data Isolation

**Problema**: Varios services nao filtram por `usuario_id`:
- `regra-classificacao.service.ts` → `listRegras()` retorna regras de TODOS os usuarios
- `relatorio.service.ts` → relatorios misturam dados de todos os usuarios
- `previewRegra()` → roda contra transacoes de todos os usuarios

**Solucao**: Auditar todos os services e adicionar `.where('usuario_id').equals(currentUserId)` em toda query que acessa dados de usuario.

**Arquivos**: `lib/services/regra-classificacao.service.ts`, `lib/services/relatorio.service.ts`

### 1.4 Budget Recalculation on Bulk Operations

**Problema**: `bulkUpdateCategoria()` nao dispara recalculo de orcamentos. Mover 50 transacoes de categoria X para Y deixa os orcamentos de X e Y incorretos.

**Solucao**: Ao final de `bulkUpdateCategoria()`, chamar `recalcularOrcamentosRelacionados()` para as categorias de origem e destino.

**Arquivo**: `lib/services/transacao.service.ts` (linha ~544)

### 1.5 Balance Calculation Consistency

**Problema**: `getSaldoConta()` usa logica diferente de `calcularSaldoEmData()`. Retorna resultado inconsistente.

**Solucao**: Unificar em um unico metodo. Deprecar `getSaldoConta()`.

**Arquivo**: `lib/services/conta.service.ts`

### 1.6 Floating-Point Rounding

**Problema**: Somas monetarias acumulam erro de floating-point (`0.1 + 0.2 !== 0.3`).

**Solucao**: Aplicar `Math.round(value * 100) / 100` apos toda soma/subtracao monetaria. Criar helper `roundCurrency(value: number): number`.

**Arquivos**: `lib/services/conta.service.ts`, `lib/services/orcamento.service.ts`, `lib/services/relatorio.service.ts`

---

## Fase 2 — Validacao de Dados

### 2.1 Validar Updates

**Problema**: `updateTransacao()`, `updateCategoria()`, `updateConta()` aceitam dados sem validacao Zod. Um `tipo: "typo"` seria gravado no DB.

**Solucao**: Criar `updateTransacaoSchema`, `updateContaSchema`, etc. Chamar `validateDTO()` em todo metodo de update.

**Arquivos**: `lib/validations/dtos.ts`, todos os services com metodos `update*`

### 2.2 Validar Entities Sem Schema

**Problema**: Nao existem schemas Zod para:
- `RegraClassificacao` (create/update)
- `Cenario`, `ConfiguracaoComportamento`, `ObjetivoFinanceiro`
- `Tag` (create/update)
- `Usuario` (profile update)

**Solucao**: Criar schemas em `lib/validations/` e aplicar nos services correspondentes.

### 2.3 Consistencia Auth vs Zod

**Problema**: `authService.register()` valida senha com `length >= 6` inline. O `passwordSchema` em `common.ts` exige `min(8)` + maiuscula + minuscula + numero. O schema forte nunca e usado.

**Solucao**: Usar `passwordSchema` de `common.ts` em `register()` e `changePassword()`.

**Arquivo**: `lib/services/auth.service.ts`

### 2.4 Limpar Dead Code de Validacao

**Problema**: `validations/transaction.ts`, `account.ts`, `category.ts` usam nomes em ingles (`name`, `accountId`, `type: 'income'`) que nao batem com o DB (portugues). Parecem ser prototipos nao usados.

**Solucao**: Verificar se algum componente importa esses schemas. Se nao, deletar. Se sim, migrar para os schemas de `dtos.ts`.

### 2.5 DuplicateError Swallowed

**Problema**: Em `createTransacao()`, `DuplicateError` e capturado e re-thrown como `DatabaseError`, perdendo a semantica HTTP 409.

**Solucao**: Adicionar `DuplicateError` ao filtro de re-throw:
```ts
if (error instanceof ValidationError || error instanceof DuplicateError) {
  throw error
}
```

**Arquivo**: `lib/services/transacao.service.ts` (linha ~403)

### 2.6 Currency Schema Silent Zero

**Problema**: `currencySchema` converte input invalido em `0` silenciosamente. Uma transacao com valor `"abc"` vira R$0,00.

**Solucao**: Rejeitar (throw) em vez de converter para 0.

**Arquivo**: `lib/validations/common.ts`

---

## Fase 3 — UI/UX Design System

### 3.1 Eliminar Hardcoded Hex (15 componentes)

**Componentes com hex hardcoded que precisam migrar para tokens:**

| Componente | Problema | Prioridade |
|---|---|---|
| `components/ui/tag-input.tsx` | `#1e293b`, `#1f2937`, `#374151`, `!important` overrides | Critica |
| `components/profile-menu.tsx` | Inteiro feito com inline styles e `onMouseEnter` JS | Critica |
| `components/ui/color-picker.tsx` | `#1e293b`, `rgba(255,255,255,0.2)` | Alta |
| `components/ui/stat-card.tsx` | `bg-[#1a3329]`, `bg-[#2e1f1f]`, etc | Alta |
| `components/financial-summary.tsx` | `rgb(15,23,42)`, `rgb(30,41,59)` | Alta |
| `components/categories/sortable-category-item.tsx` | `#1e293b`, `#ffffff` | Alta |
| `components/import/file-upload.tsx` | `#18B0A4`, `rgba(255,255,255,0.1)` | Media |
| `components/import/template-selector.tsx` | `#1e293b` | Media |
| `components/financial-health-score.tsx` | `#22C55E`, `#84CC16`, `#EAB308`, etc | Media |
| `components/onboarding-check.tsx` | `#152821`, `#111f1c`, etc | Media |
| `components/health-check-status.tsx` | `text-green-500`, `text-yellow-500`, `text-red-500` | Media |
| `app/reports/page.tsx` | Raw `<style>` tag + `text-red-600`/`text-green-600` | Media |
| `app/transactions/page.tsx` | `border-gray-400` | Baixa |
| `components/badge.tsx` | `bg-[#1a262e]`, `text-[#7aa6bf]` | Baixa |
| `components/forms/transaction-form.tsx` | `text-white` (deveria ser `text-foreground`) | Baixa |

### 3.2 Acessibilidade

| Issue | Onde | Fix |
|---|---|---|
| DataTable sort headers sem keyboard nav | `data-table.tsx` linhas 200-213 | Adicionar `tabIndex={0}`, `role="button"`, `onKeyDown` |
| Checkbox customizado sem `aria-checked` | `transactions/page.tsx` linhas 242-256 | Usar `<Checkbox>` do shadcn ou adicionar aria attrs |
| Pagination botoes sem `aria-label` | `data-table.tsx` linhas 298-333 | Adicionar labels descritivos |
| Color picker sem keyboard support | `color-picker.tsx` | Adicionar keyboard navigation no grid |

### 3.3 Responsividade

| Issue | Onde | Fix |
|---|---|---|
| `PageHeader` nao empilha em mobile | `page-header.tsx` | `flex-col sm:flex-row gap-2` |
| DataTable clipa conteudo em mobile | `data-table.tsx` linha 190 | `overflow-hidden` → `overflow-x-auto` |
| Sidebar funciona (hamburger OK) | — | — |

### 3.4 Consistencia de Loading/Empty States

**Loading states inconsistentes:**
- `transactions/page.tsx` — spinner inline custom
- `accounts/page.tsx` — outro spinner inline custom
- `categories/page.tsx` — mais uma variante

**Fix**: Substituir todos por `<LoadingSpinner size="xl">` que ja existe.

**Empty states inconsistentes:**
- Poucos usam o componente `<EmptyState>` que existe
- `categories/page.tsx` nao tem empty state quando filtro retorna vazio

**Fix**: Padronizar uso de `<EmptyState>` em todas as list pages.

### 3.5 Skeleton Loading para Budgets

**Problema**: `budgets/page.tsx` usa `bg-secondary` para skeleton (que e cor de texto, nao superficie).

**Fix**: Trocar para `<Skeleton className="h-[400px]" />`.

---

## Fase 4 — Qualidade de Codigo

### 4.1 Remover console.logs de Producao

**Arquivos com console.log/console.error de debug:**
- `components/forms/account-form.tsx` — log POR KEYSTROKE (performance)
- `components/forms/cartao-form.tsx` — logs com emoji
- `components/forms/fatura-lancamento-form.tsx` — logs de validacao
- `lib/services/auth.service.ts` — 14 ocorrencias, logando email/session

**Solucao**: Remover todos ou substituir por `if (process.env.NODE_ENV === 'development')`.

### 4.2 Consolidar Parsers OFX Duplicados

**Problema**: Dois parsers OFX com comportamento divergente:
- `lib/import/parsers/ofx.ts` → detecta `XFER`/`TRANSFER` como tipo `'transferencia'`
- `lib/services/import.service.ts` → ignora `TRNTYPE`, deduz tipo pelo sinal do valor

**Solucao**: Deletar o parser duplicado em `import.service.ts` e usar apenas `lib/import/parsers/ofx.ts`.

### 4.3 Limpar Dead Code

- `validations/transaction.ts`, `account.ts`, `category.ts` — schemas em ingles possivelmente nao usados
- `confirmation-dialog.tsx` prop `isDark` — declarada mas nunca usada
- `components/forms/account-form.tsx` classes CSS `form-dark-input`, `form-dark-select` — nao existem em nenhum stylesheet
- `drizzle-orm` e `drizzle-kit` em `dependencies` — schema.ts e apenas documentacao, Dexie e o runtime

### 4.4 Protecao ReDoS em Regex Rules

**Problema**: Usuarios podem criar regras de classificacao com regex. Nao ha protecao contra padrao catastrofico (e.g. `(a+)+`).

**Solucao**: Usar `safe-regex` ou implementar timeout via `AbortController` no match.

**Arquivo**: `lib/services/regra-classificacao.service.ts`

### 4.5 Dev Pages Expostas em Producao

**Problema**: Rotas `/dev/*` (reset DB, seed data) sao navegaveis em producao.

**Solucao**: Adicionar guard `if (process.env.NODE_ENV !== 'development') redirect('/')` em cada dev page.

---

## Fase 5 — Features Novas

### 5.1 Dashboard Melhorado

- **Periodo selecionavel**: hoje o dashboard e fixo no mes atual. Adicionar date range picker
- **Comparativo**: mostrar delta vs mes anterior em cada stat card (ja tem os dados)
- **Quick actions**: botoes flutuantes para "Nova transacao", "Nova receita", "Nova despesa"

### 5.2 Importacao Avancada

- **Limite de arquivo**: adicionar check de tamanho max (e.g. 10MB) antes de parsear
- **Progresso**: barra de progresso durante importacao de muitas transacoes
- **Undo import**: poder reverter uma importacao inteira (agrupar por batch_id)

### 5.3 Notificacoes e Alertas

- **Budget alerts visuais**: banner no topo quando orcamento atinge 80%/100%
- **Fatura proxima do vencimento**: alerta X dias antes
- **Transacoes sem categoria**: badge no sidebar mostrando quantas pendentes

### 5.4 Busca Global

- **Ctrl+K / Cmd+K**: busca global de transacoes, contas, categorias
- Usar `cmdk` (ja popular no ecossistema shadcn)

### 5.5 Exportacao

- **Export CSV**: exportar transacoes filtradas para CSV
- **Export PDF**: relatorios mensais em PDF (usar `@react-pdf/renderer`)

### 5.6 Grafico de Cash Flow

- **Waterfall chart**: mostrar como o saldo evolui dia a dia no mes
- **Projecao no grafico**: linhas pontilhadas para dias futuros baseado em media

### 5.7 Recurring Transactions

- **Transacoes recorrentes**: marcar como mensal/semanal e auto-gerar
- **Template**: salvar uma transacao como template para reusar

### 5.8 Multi-Currency

- **Suporte basico**: campo `moeda` na transacao (ja existe em faturas_lancamentos)
- **Conversao**: usar taxa de cambio do dia da transacao

---

## Fase 6 — Testes

### 6.1 Testes Criticos Ausentes

| Service | O que testar | Prioridade |
|---|---|---|
| `auth.service.ts` | Hash, session, expiry, role check | Critica |
| `transacao.service.ts` | Delecao simetrica de transfers | Critica |
| `regra-classificacao.service.ts` | Isolamento multi-user | Critica |
| `conta.service.ts` | `hardDeleteConta` nao orfana dados | Alta |
| `orcamento.service.ts` | `bulkUpdateCategoria` + recalculo | Alta |
| `import.service.ts` | OFX transfers tipados corretamente | Alta |
| `relatorio.service.ts` | Isolamento multi-user | Alta |
| `projecao.service.ts` | Projecao mensal basica | Media |
| `planejamento.service.ts` | CRUD cenarios | Media |
| `investimento.service.ts` | CRUD + historico | Media |
| `imposto-renda.service.ts` | Derivacao automatica de dados | Media |

### 6.2 Testes de Componente

- Formularios principais com React Testing Library
- DataTable: sort, pagination, empty state, loading
- Import wizard: fluxo completo

---

## Fase 7 — Performance

### 7.1 Sequential DB Calls

**Problema**: `accounts/page.tsx` faz N queries sequenciais em um `for` loop para carregar stats de cada conta.

**Solucao**: `Promise.all()` para paralelizar.

### 7.2 Rule Application in Loop

**Problema**: `aplicarRegras()` chama `incrementarAplicacao()` (read + write no DB) por cada match no loop.

**Solucao**: Batch update ao final do loop.

### 7.3 Import Deduplication

**Problema**: Dedupe compara hash contra TODAS as transacoes da conta.

**Solucao**: Indexar por `hash` + `conta_id` e usar query direta.

---

## Priorizacao Sugerida

```
Sprint 1 (1-2 semanas): Fase 1 (Integridade) + Fase 2.1-2.3 (Validacao critica)
Sprint 2 (1-2 semanas): Fase 3.1 (Hex hardcoded) + Fase 4.1-4.3 (Limpeza)
Sprint 3 (1 semana):    Fase 3.2-3.5 (UX polish) + Fase 6.1 (Testes criticos)
Sprint 4 (2 semanas):   Fase 5.1-5.4 (Features — Dashboard, Import, Busca, Alertas)
Sprint 5 (2 semanas):   Fase 5.5-5.8 (Features — Export, Cash Flow, Recurring, Multi-currency)
Sprint 6 (1 semana):    Fase 7 (Performance) + Fase 6.2 (Testes componente)
```

---

## Metricas de Sucesso

- [ ] Zero `console.log` em producao (grep verifica)
- [ ] Zero hex hardcoded fora de `globals.css` e `colors.ts` (grep verifica)
- [ ] 100% dos metodos create/update validados com Zod
- [ ] Transfer delete simetrico (teste automatizado)
- [ ] Multi-user isolation em todos os services (teste automatizado)
- [ ] DataTable acessivel por keyboard (teste manual)
- [ ] Todas as list pages com empty state padronizado
- [ ] Build sem warnings (exceto SSR `window` que e esperado)
