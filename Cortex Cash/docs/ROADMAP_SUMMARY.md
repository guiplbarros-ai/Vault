# Roadmap Summary - Cortex Cash

## Visão Atualizada (Janeiro 2025)

### Prioridades Estratégicas

1. **Cartões em Destaque**: Gestão de cartões movida para v0.3 (antes de IA)
2. **Imposto de Renda**: Nova funcionalidade v2.1 para suporte fiscal
3. **Mobile + Open Finance**: Consolidados em v3.0

---

## Timeline de Desenvolvimento

```
v0.1 ────► v0.2 ────► v0.3 ────► v0.4 ────► v1.0 ────► v2.0 ────► v2.1 ────► v3.0
MVP       Categorias  Cartões     IA       Multi-user  Invest    IR        Mobile+OF
4 sem     2 sem       3 sem       3 sem    4 sem       3-4 sem   4-5 sem   8-10 sem
```

**Total até v1.0 (production-ready)**: ~16 semanas (4 meses)
**Total até v2.1 (completo com IR)**: ~29-31 semanas (7-8 meses)

---

## Versões Detalhadas

### v0.1 - MVP Local ✅ **(EM DESENVOLVIMENTO)**
**Duração**: 4 semanas

**Stack**: SQLite local + Next.js 14 + shadcn/ui

**Entregáveis**:
- Importação CSV/OFX (Bradesco, Inter, Santander)
- Detecção automática de formato
- Preview e dedupe
- CRUD contas/instituições
- Dashboard básico (saldos + transações)
- Templates salvos (localStorage)

**Sem**:
- ❌ Auth
- ❌ Classificação
- ❌ Orçamento
- ❌ Multi-user

---

### v0.2 - Classificação Manual
**Duração**: 2 semanas

**Entregáveis**:
- Sistema de categorias (Grupo > Categoria)
- Seed de 13 categorias padrão
- Classificação manual em massa
- Tags livres
- Dashboard por categoria

**Schema**: Adiciona `categorias` + campos em `transacoes`

---

### v0.3 - Cartões e Parceladas 💳 **(PRIORIDADE ALTA)**
**Duração**: 3 semanas

**Rationale**: Gestão de cartões é crítica para finanças pessoais no Brasil. Movido para antes de IA para entregar valor mais cedo.

**Entregáveis**:
- Configuração de cartões (dia fechamento/vencimento, limite)
- Ciclos de fatura automatizados
- Detecção de pagamento (conciliação)
- Parcelamento com cronograma
- Câmbio (moeda original + taxa)
- Alertas de limite (70%, 90%)
- Projeção de fatura

**Schema**: Adiciona `cartoes_config`, `faturas`, `faturas_lancamentos`

**Dashboards**:
- Utilização de limite por cartão
- Gastos do ciclo atual
- Projeção até fechamento
- Comparativo ciclos anteriores

---

### v0.4 - Regras e IA 🤖
**Duração**: 3 semanas

**Entregáveis**:
- Motor de regras (regex, contains, starts, ends)
- Priorização de regras pelo usuário
- Integração OpenAI (GPT-4o-mini)
- Classificação em massa com confirmação
- Painel de custos de IA
- Alertas 80%/100% do teto (US$ 10/mês)
- Explicabilidade (origem da classificação)

**Schema**: Adiciona `regras_classificacao`, `logs_ia`

---

### v1.0 - Multi-usuário + Orçamento 🚀
**Duração**: 4 semanas

**GRANDE MIGRAÇÃO**: SQLite local → PostgreSQL (Supabase)

**Entregáveis**:

**Orçamento**:
- Por categoria e centro de custo
- Alertas 80%/100%
- Projeções (média móvel)
- Dashboard Orçado vs Realizado
- Comparativos M/M e YTD

**Multi-user**:
- Autenticação (Supabase Auth)
- Row Level Security (RLS)
- Dados isolados por usuário
- Realtime sync
- Storage de arquivos
- Script de migração de dados

**Schema**: Adiciona `user_id` em todas as tabelas, `centros`, `orcamentos`, RLS policies

---

### v2.0 - Investimentos e Patrimônio 📈
**Duração**: 3-4 semanas

**Entregáveis**:
- Posição consolidada de investimentos
- Proventos (dividendos, JCP, rendimentos)
- MTM (Mark-to-Market) com cotações
- Patrimônio líquido total
- Evolução patrimonial ao longo do tempo
- Rentabilidade por ativo
- Alocação por classe

**Schema**: Adiciona `ativos`, `proventos`, `cotacoes`, `patrimonio_historico`

**Integrações**:
- APIs de cotação (B3, Alpha Vantage, ou similar)
- Importação de extratos de corretoras

---

### v2.1 - Imposto de Renda 📋 **(NOVO)**
**Duração**: 4-5 semanas

**Rationale**: Feature estratégica para usuários brasileiros. Suporte fiscal aumenta stickiness do produto.

**Entregáveis**:

**Consolidação**:
- Rendimentos tributáveis por fonte pagadora
- Cálculo de ganho de capital (ações, FIIs)
- Carnê-leão (aluguéis, freelance, exterior)
- Despesas dedutíveis (saúde, educação, dependentes)

**Exportação**:
- Relatórios formatados para IRPF
- Export em formatos compatíveis com IRPF (TXT, CSV)
- Apoio a preenchimento de fichas específicas

**Simulação**:
- Previsão de imposto a pagar/restituir
- Cenários de otimização fiscal

**Conformidade**:
- Atualização anual com tabelas da Receita Federal
- Validação de dados conforme regras do IRPF

**Schema**: Adiciona `declaracoes_ir`, `rendimentos_tributaveis`, `deducoes`, `operacoes_capital`

---

### v3.0 - Mobile + Open Finance 📱🔗
**Duração**: 8-10 semanas

**Mobile (React Native + Expo)**:
- App nativo iOS/Android
- Leitura de transações
- Lançamento rápido de gastos
- Captura de nota fiscal via câmera
- Notificações push (faturas, orçamento, etc.)
- Sync bidirecional com web
- Modo offline

**Open Finance Brasil**:
- Integração com APIs do Open Finance
- Sincronização automática de extratos
- Atualização de saldos em tempo real
- Gestão de consentimentos
- Suporte a múltiplas instituições
- Renovação automática de tokens

**Arquitetura**:
- Edge Functions para comunicação com Open Finance
- Webhooks para notificações de transações
- Queue de sincronização

---

## Decisões de Roadmap

### Por que Cartões antes de IA?

1. **Valor imediato**: Gestão de cartões resolve dor real dos usuários
2. **Complexidade independente**: Não depende de IA para funcionar
3. **Dados ricos**: Ciclos e faturas geram insights valiosos para IA depois
4. **Adoção**: Cartões são usados diariamente, aumenta engajamento

### Por que Imposto de Renda em v2.1?

1. **Timing sazonal**: Feature tem pico de uso de fevereiro a abril
2. **Dados existentes**: v2.0 (investimentos) já fornece base necessária
3. **Diferenciação**: Poucos apps de finanças pessoais oferecem suporte fiscal robusto
4. **Retenção**: Feature aumenta dependência do produto (lock-in positivo)

### Por que Mobile + Open Finance juntos em v3.0?

1. **Sinergia**: Mobile se beneficia muito de sync automática do OF
2. **Complexidade**: Ambos exigem infraestrutura robusta (webhooks, edge functions)
3. **Usuário**: Jornada completa = cadastrar contas via OF + acompanhar no mobile
4. **Priorização**: v1.0-v2.1 já entregam valor completo para web

---

## Métricas de Sucesso por Versão

### v0.1
- [ ] Importar 10k transações em < 2min
- [ ] Dedupe > 99% de acurácia
- [ ] Setup inicial em < 15min

### v0.2
- [ ] 13 categorias padrão seed
- [ ] Classificação manual de 100 transações em < 5min

### v0.3
- [ ] Detecção de pagamento de fatura > 90% acurácia
- [ ] Projeção de fatura com erro < 5%
- [ ] Alertas de limite disparam corretamente

### v0.4
- [ ] Classificação automática ≥ 85% no 1º uso
- [ ] Custo de IA < US$ 10/mês
- [ ] Latência média < 2s por lote de 50 transações

### v1.0
- [ ] Migração SQLite → Supabase sem perda de dados
- [ ] RLS sem vazamento de dados entre usuários
- [ ] Orçamento configurado em < 5min

### v2.0
- [ ] MTM atualizado diariamente
- [ ] Cálculo de rentabilidade correto (XIRR)

### v2.1
- [ ] Export IRPF validado por contador
- [ ] Previsão de imposto com erro < R$ 100

### v3.0
- [ ] Mobile com sync < 5s
- [ ] Open Finance com 5+ instituições
- [ ] Uptime webhooks > 99.5%

---

## Riscos e Mitigações

### v0.3 (Cartões)
**Risco**: Conciliação de pagamento pode ter falsos positivos
**Mitigação**: Sempre exigir confirmação manual, score de confiança visível

### v0.4 (IA)
**Risco**: Estouro de custo de IA
**Mitigação**: Hard limit + alertas + cache agressivo

### v1.0 (Migração)
**Risco**: Perda de dados na migração
**Mitigação**: Backup obrigatório + validação pós-migração + rollback plan

### v2.1 (IR)
**Risco**: Mudanças anuais nas regras da Receita
**Mitigação**: Arquitetura configurável + ciclo de atualização anual + disclaimers

### v3.0 (Open Finance)
**Risco**: APIs instáveis ou mudanças de contrato
**Mitigação**: Retry logic + fallback para importação manual + monitoramento

---

## Próximos Passos Imediatos

1. **Concluir v0.1** (em desenvolvimento)
2. Atualizar `VERSIONING_STRATEGY.md` com novo roadmap
3. Criar issues/milestones no GitHub para cada versão
4. Definir datas-alvo para v0.2-v0.4
5. Pesquisar APIs de cotação para v2.0
6. Estudar Open Finance Brasil para v3.0

---

## Referências

- **PRD Completo**: `../Cortex Cash PRD.md`
- **Estratégia de Versionamento**: `./data-architecture/VERSIONING_STRATEGY.md`
- **Modelo de Dados**: `./data-architecture/DATA_MODEL.md`
