# Relatório de Varredura de Código – 2025-11-06

## Resumo Executivo
- Build atual falha no `tsc --noEmit` devido a incompatibilidades de tipos entre APIs de IA e os DTOs de transação.
- As rotas de IA no backend dependem de Dexie (IndexedDB) via `getDB()`, o que quebra totalmente a execução em ambiente server-side.
- A aplicação ignora metadados de classificação automática ao chamar `transacaoService.updateTransacao`, impedindo rastrear classificações feitas pela IA.
- Testes automatizados e lint não passam no estado atual: `npm run lint` não encontra o binário `eslint` e múltiplos testes Vitest falham.

---

## Achados Críticos (impedem funcionamento)

1. **Rotas `/api/ai/classify` e `/api/ai/classify/batch` quebram no servidor por uso de Dexie**
   - `checkAIBudgetLimit` chama `getAIUsageSummary`, que invoca `getDB()` (Dexie) e exige `window`/IndexedDB.
   - Em ambiente server (`typeof window === 'undefined'`) `checkIndexedDBSupport` retorna erro e a rota responde 500 antes de chamar a OpenAI.
   - Evidências:
     - `app/api/ai/classify/route.ts:84`
     - `app/api/ai/classify/batch/route.ts:260`
     - `lib/services/ai-usage.service.ts:255`
     - `lib/db/client.ts:144-230`
   - Recomendação: mover cálculo de limites para um serviço server-friendly (ex.: banco relacional) ou injeta dados do cliente; remover dependência direta de Dexie do lado do servidor.

2. **`generateClassificationPrompt` exige `Categoria` completa, mas a API envia apenas `id`/`nome`**
   - `ClassifyRequest.categorias` usa `CategoriaLite` para evitar acessar Dexie no servidor, porém `generateClassificationPrompt` exige `Categoria[]`.
   - `tsc --noEmit` falha (`CategoriaLite[]` não compatível com `Categoria[]`).
   - Evidências:
     - `app/api/ai/classify/route.ts:14-114`
     - `lib/finance/classification/prompts.ts:11-23`
   - Recomendação: aceitar DTO compacto no prompt (ajustar assinatura e uso).

3. **`transacaoService.updateTransacao` descarta origem/confiança da IA**
   - Interface `ITransacaoService.updateTransacao` aceita `Partial<CreateTransacaoDTO>`; os DTOs não têm `classificacao_origem`/`classificacao_confianca`.
   - Mesmo quando a UI envia esses campos, o serviço força `classificacao_origem = 'manual'`, perdendo a informação da IA.
   - Impacta importação automática e revisão de sugestões.
   - Evidências:
     - `lib/services/interfaces.ts:444`
     - `lib/types/index.ts:294-323`
     - `lib/services/transacao.service.ts:303-308`
     - `app/import/page.tsx:396-401`
     - `components/classification/ai-suggestions-review.tsx:62-66`
   - Recomendação: usar `UpdateTransacaoDTO`, preservar valores recebidos e só marcar como manual quando apropriado.

---

## Achados de Alta Severidade

1. **UI de uso de IA acessa campos inexistentes**
   - `app/settings/ai-usage/page.tsx` filtra por `log.transacao_descricao` e `log.categoria_sugerida_nome`, propriedades ausentes em `LogIA`.
   - Causa erro de compilação (`Property does not exist`) e quebra busca/filtro.
   - Evidências:
     - `app/settings/ai-usage/page.tsx:186-192`
     - `lib/types/index.ts:145-159`
   - Ajustar para enriquecer os logs ou atualizar o filtro para usar apenas campos reais.

2. **Tabela de preços não cobre `gpt-3.5-turbo`**
   - O front permite configurar `gpt-3.5-turbo`, porém `PRICING` em `calculateCost` não tem entrada, disparando `ValidationError`.
   - A UI força um cast de tipo, então o erro só aparece em runtime ao registrar uso.
   - Evidências:
     - `app/api/ai/classify/route.ts:11`
     - `lib/hooks/use-batch-classification.ts:155-164`
     - `lib/services/ai-usage.service.ts:11-52` e `74-80`
   - Adicionar preço correspondente ou impedir seleção do modelo.

3. **Endpoint `/api/ai/usage` devolve 501, mas os testes exigem 200**
   - Vitest importa `GET` diretamente e checa `response.status === 200`.
   - Resultado: 3 falhas em `tests/api/ai-usage.test.ts`.
   - Evidências:
     - `app/api/ai/usage/route.ts:8-14`
     - `tests/api/ai-usage.test.ts:28-73`
   - Sincronizar implementações (ou ajustar testes se a rota realmente não for suportada no servidor).

4. **Lint não roda**
   - `npm run lint` falha com `eslint: command not found`; `eslint` não está listado em `devDependencies`.
   - Evidência:
     - `package.json:5-101`
     - Execução local de `npm run lint`.
   - Incluir `eslint` (e config) ou atualizar script.

---

## Achados Médios

1. **Parser OFX gera datas com -1 dia em alguns fusos**
   - `normalizeDate` retorna string ISO, mas `parseDateOFX` instancia `new Date(normalized)` (interpretação UTC), produzindo `14` em vez de `15` para `UTC-3`.
   - Dois testes em `lib/import/parsers/ofx.test.ts` falham.
   - Evidências:
     - `lib/import/parsers/ofx.ts:241-258`
     - `lib/import/normalizers/date.ts:14-43`
     - `lib/import/parsers/ofx.test.ts:97-125`
   - Recomendação: fixar timezone (`T00:00:00` local) ou trabalhar com `Date` local sem converter para UTC.

2. **Smoke tests dependem de servidor Next rodando**
   - `tests/api/ai.smoke.test.ts` faz `fetch` contra `http://localhost:3000`; sem servidor pós-build, tudo falha com `connect EPERM`.
   - Evidências:
     - `tests/api/ai.smoke.test.ts:11-80`
     - Falhas ao rodar `npx vitest tests/api/ai.smoke.test.ts`.
   - Sugerir mock das rotas (importar handlers) ou subir servidor dentro da suíte.

3. **Testes de uso de IA expõem métricas inconsistentes**
   - `rejected_suggestions` considera logs pendentes como rejeitados; `confirmAISuggestion` nunca é chamado.
   - Embora marcados como “EXPÕE BUG”, refletem comportamento atual.
   - Evidências:
     - `tests/api/ai-usage.test.ts:121-154`
     - Logs durante `npx vitest tests/api/ai-usage.test.ts`.
   - Confirmar estratégia de status (`pending` vs `rejected`) e integrar confirmação na UI.

---

## Outros Pontos de Atenção

- Stack usa `next@16.0.0` + `react@19.2.0` (versões experimentais). Verificar se o time está ciente da maturidade dos pacotes.
- `USD_TO_BRL` aparece hardcoded tanto em `app/api/ai/usage/route.ts` quanto em `lib/config/currency.ts`; evitar divergência.

---

## Próximos Passos Recomendados
1. Refatorar serviços de IA para não depender de Dexie no servidor e garantir que a API responde com 200.
2. Ajustar DTOs/serviços de transação para preservar metadados da IA e resolver os erros de compilação.
3. Restaurar cobertura de lint/testes (`eslint`, suites Vitest) após corrigir os itens de cima.
4. Corrigir parser OFX e revisar métricas de IA antes da próxima release.

