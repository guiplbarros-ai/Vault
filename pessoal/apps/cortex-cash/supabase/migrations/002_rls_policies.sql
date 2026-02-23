-- ============================================================
-- Cortex Cash — RLS Policies
-- Cada tabela: usuario_id = auth.uid()
-- Categorias/Tags com is_sistema: visíveis para todos (read-only)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE cortex_cash.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.instituicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.templates_importacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.regras_classificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.logs_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.cartoes_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.faturas_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.investimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.historico_investimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.patrimonio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.declaracoes_ir ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.rendimentos_tributaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.rendimentos_isentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.despesas_dedutiveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.bens_direitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.dividas_onus ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.cenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.configuracoes_comportamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_cash.objetivos_financeiros ENABLE ROW LEVEL SECURITY;

-- ── Profiles ────────────────────────────────────────────────

CREATE POLICY profiles_select ON cortex_cash.profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_insert ON cortex_cash.profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON cortex_cash.profiles
  FOR UPDATE USING (id = auth.uid());

-- ── Instituicoes (shared data — all users can read) ─────────

CREATE POLICY instituicoes_select ON cortex_cash.instituicoes
  FOR SELECT USING (true);
CREATE POLICY instituicoes_insert ON cortex_cash.instituicoes
  FOR INSERT WITH CHECK (true);
CREATE POLICY instituicoes_update ON cortex_cash.instituicoes
  FOR UPDATE USING (true);

-- ── Standard usuario_id tables ──────────────────────────────

-- Contas
CREATE POLICY contas_select ON cortex_cash.contas
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY contas_insert ON cortex_cash.contas
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY contas_update ON cortex_cash.contas
  FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY contas_delete ON cortex_cash.contas
  FOR DELETE USING (usuario_id = auth.uid());

-- Categorias (sistema visível para todos, custom por usuário)
CREATE POLICY categorias_select ON cortex_cash.categorias
  FOR SELECT USING (is_sistema = true OR usuario_id = auth.uid());
CREATE POLICY categorias_insert ON cortex_cash.categorias
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY categorias_update ON cortex_cash.categorias
  FOR UPDATE USING (usuario_id = auth.uid() AND is_sistema = false);
CREATE POLICY categorias_delete ON cortex_cash.categorias
  FOR DELETE USING (usuario_id = auth.uid() AND is_sistema = false);

-- Tags (mesma lógica de categorias)
CREATE POLICY tags_select ON cortex_cash.tags
  FOR SELECT USING (is_sistema = true OR usuario_id = auth.uid());
CREATE POLICY tags_insert ON cortex_cash.tags
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY tags_update ON cortex_cash.tags
  FOR UPDATE USING (usuario_id = auth.uid() AND is_sistema = false);
CREATE POLICY tags_delete ON cortex_cash.tags
  FOR DELETE USING (usuario_id = auth.uid() AND is_sistema = false);

-- Centros de Custo
CREATE POLICY centros_custo_select ON cortex_cash.centros_custo
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY centros_custo_insert ON cortex_cash.centros_custo
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY centros_custo_update ON cortex_cash.centros_custo
  FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY centros_custo_delete ON cortex_cash.centros_custo
  FOR DELETE USING (usuario_id = auth.uid());

-- Transações
CREATE POLICY transacoes_select ON cortex_cash.transacoes
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY transacoes_insert ON cortex_cash.transacoes
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY transacoes_update ON cortex_cash.transacoes
  FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY transacoes_delete ON cortex_cash.transacoes
  FOR DELETE USING (usuario_id = auth.uid());

-- Templates Importação
CREATE POLICY templates_importacao_select ON cortex_cash.templates_importacao
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY templates_importacao_insert ON cortex_cash.templates_importacao
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY templates_importacao_update ON cortex_cash.templates_importacao
  FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY templates_importacao_delete ON cortex_cash.templates_importacao
  FOR DELETE USING (usuario_id = auth.uid());

-- Regras Classificação
CREATE POLICY regras_classificacao_select ON cortex_cash.regras_classificacao
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY regras_classificacao_insert ON cortex_cash.regras_classificacao
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY regras_classificacao_update ON cortex_cash.regras_classificacao
  FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY regras_classificacao_delete ON cortex_cash.regras_classificacao
  FOR DELETE USING (usuario_id = auth.uid());

-- Logs IA (read via transacao join, no direct usuario_id)
CREATE POLICY logs_ia_select ON cortex_cash.logs_ia
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.transacoes t
      WHERE t.id = logs_ia.transacao_id AND t.usuario_id = auth.uid()
    )
  );
CREATE POLICY logs_ia_insert ON cortex_cash.logs_ia
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cortex_cash.transacoes t
      WHERE t.id = transacao_id AND t.usuario_id = auth.uid()
    )
  );

-- Orçamentos
CREATE POLICY orcamentos_select ON cortex_cash.orcamentos
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY orcamentos_insert ON cortex_cash.orcamentos
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY orcamentos_update ON cortex_cash.orcamentos
  FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY orcamentos_delete ON cortex_cash.orcamentos
  FOR DELETE USING (usuario_id = auth.uid());

-- Cartões Config
CREATE POLICY cartoes_config_select ON cortex_cash.cartoes_config
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY cartoes_config_insert ON cortex_cash.cartoes_config
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY cartoes_config_update ON cortex_cash.cartoes_config
  FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY cartoes_config_delete ON cortex_cash.cartoes_config
  FOR DELETE USING (usuario_id = auth.uid());

-- Faturas
CREATE POLICY faturas_select ON cortex_cash.faturas
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY faturas_insert ON cortex_cash.faturas
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY faturas_update ON cortex_cash.faturas
  FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY faturas_delete ON cortex_cash.faturas
  FOR DELETE USING (usuario_id = auth.uid());

-- Faturas Lançamentos (via fatura join)
CREATE POLICY faturas_lancamentos_select ON cortex_cash.faturas_lancamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.faturas f
      WHERE f.id = faturas_lancamentos.fatura_id AND f.usuario_id = auth.uid()
    )
  );
CREATE POLICY faturas_lancamentos_insert ON cortex_cash.faturas_lancamentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cortex_cash.faturas f
      WHERE f.id = fatura_id AND f.usuario_id = auth.uid()
    )
  );
CREATE POLICY faturas_lancamentos_update ON cortex_cash.faturas_lancamentos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.faturas f
      WHERE f.id = faturas_lancamentos.fatura_id AND f.usuario_id = auth.uid()
    )
  );
CREATE POLICY faturas_lancamentos_delete ON cortex_cash.faturas_lancamentos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.faturas f
      WHERE f.id = faturas_lancamentos.fatura_id AND f.usuario_id = auth.uid()
    )
  );

-- Investimentos
CREATE POLICY investimentos_select ON cortex_cash.investimentos
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY investimentos_insert ON cortex_cash.investimentos
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY investimentos_update ON cortex_cash.investimentos
  FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY investimentos_delete ON cortex_cash.investimentos
  FOR DELETE USING (usuario_id = auth.uid());

-- Histórico Investimentos (via investimento join)
CREATE POLICY historico_investimentos_select ON cortex_cash.historico_investimentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.investimentos i
      WHERE i.id = historico_investimentos.investimento_id AND i.usuario_id = auth.uid()
    )
  );
CREATE POLICY historico_investimentos_insert ON cortex_cash.historico_investimentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cortex_cash.investimentos i
      WHERE i.id = investimento_id AND i.usuario_id = auth.uid()
    )
  );

-- Patrimônio Snapshots
CREATE POLICY patrimonio_snapshots_select ON cortex_cash.patrimonio_snapshots
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY patrimonio_snapshots_insert ON cortex_cash.patrimonio_snapshots
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY patrimonio_snapshots_update ON cortex_cash.patrimonio_snapshots
  FOR UPDATE USING (usuario_id = auth.uid());

-- Declarações IR
CREATE POLICY declaracoes_ir_select ON cortex_cash.declaracoes_ir
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY declaracoes_ir_insert ON cortex_cash.declaracoes_ir
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY declaracoes_ir_update ON cortex_cash.declaracoes_ir
  FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY declaracoes_ir_delete ON cortex_cash.declaracoes_ir
  FOR DELETE USING (usuario_id = auth.uid());

-- Rendimentos Tributáveis (via declaração join)
CREATE POLICY rendimentos_tributaveis_select ON cortex_cash.rendimentos_tributaveis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = rendimentos_tributaveis.declaracao_id AND d.usuario_id = auth.uid()
    )
  );
CREATE POLICY rendimentos_tributaveis_insert ON cortex_cash.rendimentos_tributaveis
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = declaracao_id AND d.usuario_id = auth.uid()
    )
  );

-- Rendimentos Isentos (via declaração join)
CREATE POLICY rendimentos_isentos_select ON cortex_cash.rendimentos_isentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = rendimentos_isentos.declaracao_id AND d.usuario_id = auth.uid()
    )
  );
CREATE POLICY rendimentos_isentos_insert ON cortex_cash.rendimentos_isentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = declaracao_id AND d.usuario_id = auth.uid()
    )
  );

-- Despesas Dedutíveis (via declaração join)
CREATE POLICY despesas_dedutiveis_select ON cortex_cash.despesas_dedutiveis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = despesas_dedutiveis.declaracao_id AND d.usuario_id = auth.uid()
    )
  );
CREATE POLICY despesas_dedutiveis_insert ON cortex_cash.despesas_dedutiveis
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = declaracao_id AND d.usuario_id = auth.uid()
    )
  );

-- Bens e Direitos (via declaração join)
CREATE POLICY bens_direitos_select ON cortex_cash.bens_direitos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = bens_direitos.declaracao_id AND d.usuario_id = auth.uid()
    )
  );
CREATE POLICY bens_direitos_insert ON cortex_cash.bens_direitos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = declaracao_id AND d.usuario_id = auth.uid()
    )
  );

-- Dívidas e Ônus (via declaração join)
CREATE POLICY dividas_onus_select ON cortex_cash.dividas_onus
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = dividas_onus.declaracao_id AND d.usuario_id = auth.uid()
    )
  );
CREATE POLICY dividas_onus_insert ON cortex_cash.dividas_onus
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = declaracao_id AND d.usuario_id = auth.uid()
    )
  );

-- Cenários
CREATE POLICY cenarios_select ON cortex_cash.cenarios
  FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY cenarios_insert ON cortex_cash.cenarios
  FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY cenarios_update ON cortex_cash.cenarios
  FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY cenarios_delete ON cortex_cash.cenarios
  FOR DELETE USING (usuario_id = auth.uid());

-- Configurações Comportamento (via cenário join)
CREATE POLICY configuracoes_comportamento_select ON cortex_cash.configuracoes_comportamento
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.cenarios c
      WHERE c.id = configuracoes_comportamento.cenario_id AND c.usuario_id = auth.uid()
    )
  );
CREATE POLICY configuracoes_comportamento_insert ON cortex_cash.configuracoes_comportamento
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cortex_cash.cenarios c
      WHERE c.id = cenario_id AND c.usuario_id = auth.uid()
    )
  );
CREATE POLICY configuracoes_comportamento_update ON cortex_cash.configuracoes_comportamento
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.cenarios c
      WHERE c.id = configuracoes_comportamento.cenario_id AND c.usuario_id = auth.uid()
    )
  );
CREATE POLICY configuracoes_comportamento_delete ON cortex_cash.configuracoes_comportamento
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.cenarios c
      WHERE c.id = configuracoes_comportamento.cenario_id AND c.usuario_id = auth.uid()
    )
  );

-- Objetivos Financeiros (via cenário join)
CREATE POLICY objetivos_financeiros_select ON cortex_cash.objetivos_financeiros
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.cenarios c
      WHERE c.id = objetivos_financeiros.cenario_id AND c.usuario_id = auth.uid()
    )
  );
CREATE POLICY objetivos_financeiros_insert ON cortex_cash.objetivos_financeiros
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cortex_cash.cenarios c
      WHERE c.id = cenario_id AND c.usuario_id = auth.uid()
    )
  );
CREATE POLICY objetivos_financeiros_update ON cortex_cash.objetivos_financeiros
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.cenarios c
      WHERE c.id = objetivos_financeiros.cenario_id AND c.usuario_id = auth.uid()
    )
  );
CREATE POLICY objetivos_financeiros_delete ON cortex_cash.objetivos_financeiros
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.cenarios c
      WHERE c.id = objetivos_financeiros.cenario_id AND c.usuario_id = auth.uid()
    )
  );
