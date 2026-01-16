# Testes

- Plano de Testes v0.5: [TEST_PLAN_V05.md](./TEST_PLAN_V05.md)
- Resultados v0.4: [../TEST_RESULTS_V04.md](../TEST_RESULTS_V04.md)
- Checklist v0.4: [../TESTING_CHECKLIST_V04.md](../TESTING_CHECKLIST_V04.md)
- Suite de testes (código): [../../tests](../../tests)

### Estratégia

- Unit (Vitest + jsdom/happy-dom): serviços Dexie, cálculos, validadores.
- Integration: rotas de API (classify, batch, usage, import), cenários de erro.
- UI: Testing Library para DataTable, forms e componentes críticos.
- Smoke: páginas principais e endpoints essenciais.

Veja casos detalhados em [TEST_PLAN_V05.md](./TEST_PLAN_V05.md).