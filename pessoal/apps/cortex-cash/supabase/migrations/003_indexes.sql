-- ============================================================
-- Cortex Cash — Performance Indexes
-- Compound indexes para queries mais comuns
-- ============================================================

-- Transações: query principal (por usuário + período)
CREATE INDEX idx_transacoes_usuario_data
  ON cortex_cash.transacoes (usuario_id, data DESC);

-- Transações: por conta
CREATE INDEX idx_transacoes_conta
  ON cortex_cash.transacoes (conta_id, data DESC);

-- Transações: por categoria
CREATE INDEX idx_transacoes_categoria
  ON cortex_cash.transacoes (categoria_id) WHERE categoria_id IS NOT NULL;

-- Transações: dedupe por hash
CREATE INDEX idx_transacoes_hash
  ON cortex_cash.transacoes (hash) WHERE hash IS NOT NULL;

-- Transações: parcelamento
CREATE INDEX idx_transacoes_grupo_parcelamento
  ON cortex_cash.transacoes (grupo_parcelamento_id) WHERE grupo_parcelamento_id IS NOT NULL;

-- Transações: transferências
CREATE INDEX idx_transacoes_transferencia
  ON cortex_cash.transacoes (transferencia_id) WHERE transferencia_id IS NOT NULL;

-- Contas: por usuário
CREATE INDEX idx_contas_usuario
  ON cortex_cash.contas (usuario_id);

-- Contas: conta pai (hierarquia)
CREATE INDEX idx_contas_pai
  ON cortex_cash.contas (conta_pai_id) WHERE conta_pai_id IS NOT NULL;

-- Categorias: hierarquia
CREATE INDEX idx_categorias_pai
  ON cortex_cash.categorias (pai_id) WHERE pai_id IS NOT NULL;

-- Categorias: sistema (para query de categorias padrão)
CREATE INDEX idx_categorias_sistema
  ON cortex_cash.categorias (is_sistema) WHERE is_sistema = true;

-- Orçamentos: por usuário + mês
CREATE INDEX idx_orcamentos_usuario_mes
  ON cortex_cash.orcamentos (usuario_id, mes_referencia);

-- Faturas: por cartão + mês
CREATE INDEX idx_faturas_cartao_mes
  ON cortex_cash.faturas (cartao_id, mes_referencia);

-- Faturas: por usuário
CREATE INDEX idx_faturas_usuario
  ON cortex_cash.faturas (usuario_id);

-- Faturas Lançamentos: por fatura
CREATE INDEX idx_faturas_lancamentos_fatura
  ON cortex_cash.faturas_lancamentos (fatura_id);

-- Investimentos: por usuário + status
CREATE INDEX idx_investimentos_usuario_status
  ON cortex_cash.investimentos (usuario_id, status);

-- Histórico Investimentos: por investimento + data
CREATE INDEX idx_historico_investimentos_inv_data
  ON cortex_cash.historico_investimentos (investimento_id, data DESC);

-- Patrimônio Snapshots: por usuário + mês
CREATE INDEX idx_patrimonio_snapshots_usuario_mes
  ON cortex_cash.patrimonio_snapshots (usuario_id, mes DESC);

-- Regras: por prioridade (para matching ordered)
CREATE INDEX idx_regras_usuario_prioridade
  ON cortex_cash.regras_classificacao (usuario_id, prioridade DESC)
  WHERE ativa = true;

-- Logs IA: por transação
CREATE INDEX idx_logs_ia_transacao
  ON cortex_cash.logs_ia (transacao_id);

-- Templates: por instituição
CREATE INDEX idx_templates_instituicao
  ON cortex_cash.templates_importacao (instituicao_id);

-- Declarações IR: por usuário + ano
CREATE INDEX idx_declaracoes_ir_usuario_ano
  ON cortex_cash.declaracoes_ir (usuario_id, ano_calendario);

-- Cenários: por usuário
CREATE INDEX idx_cenarios_usuario
  ON cortex_cash.cenarios (usuario_id);

-- Configurações: por cenário
CREATE INDEX idx_config_comportamento_cenario
  ON cortex_cash.configuracoes_comportamento (cenario_id);

-- Objetivos: por cenário
CREATE INDEX idx_objetivos_cenario
  ON cortex_cash.objetivos_financeiros (cenario_id);

-- Cartões: por usuário
CREATE INDEX idx_cartoes_usuario
  ON cortex_cash.cartoes_config (usuario_id);

-- Pluggy IDs (para sync upsert)
CREATE INDEX idx_contas_pluggy
  ON cortex_cash.contas (pluggy_id) WHERE pluggy_id IS NOT NULL;
CREATE INDEX idx_cartoes_pluggy
  ON cortex_cash.cartoes_config (pluggy_id) WHERE pluggy_id IS NOT NULL;
CREATE INDEX idx_investimentos_pluggy
  ON cortex_cash.investimentos (pluggy_id) WHERE pluggy_id IS NOT NULL;
