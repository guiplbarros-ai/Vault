-- ============================================================
-- Cortex Cash — RLS Policy Fixes
-- 1. Restrict instituicoes INSERT/UPDATE (shared data, read-only for users)
-- 2. Add missing UPDATE/DELETE policies for child tables
-- ============================================================

-- ── 1. Instituicoes: restrict to read-only ────────────────────
-- Drop overly permissive INSERT/UPDATE policies
DROP POLICY IF EXISTS "instituicoes_insert" ON cortex_cash.instituicoes;
DROP POLICY IF EXISTS "instituicoes_update" ON cortex_cash.instituicoes;

-- Keep SELECT (shared data readable by all authenticated users)
-- INSERT/UPDATE should only happen via service_role (seeding/admin)

-- ── 2. Missing policies for child tables ──────────────────────

-- Histórico Investimentos (via investimento join) — DELETE only (history is immutable, no UPDATE)
CREATE POLICY historico_investimentos_delete ON cortex_cash.historico_investimentos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.investimentos i
      WHERE i.id = historico_investimentos.investimento_id AND i.usuario_id = auth.uid()
    )
  );

-- Patrimônio Snapshots — DELETE only (snapshots are point-in-time, no UPDATE)
CREATE POLICY patrimonio_snapshots_delete ON cortex_cash.patrimonio_snapshots
  FOR DELETE USING (usuario_id = auth.uid());

-- Rendimentos Tributáveis (via declaração join) — UPDATE and DELETE
CREATE POLICY rendimentos_tributaveis_update ON cortex_cash.rendimentos_tributaveis
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = rendimentos_tributaveis.declaracao_id AND d.usuario_id = auth.uid()
    )
  );
CREATE POLICY rendimentos_tributaveis_delete ON cortex_cash.rendimentos_tributaveis
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = rendimentos_tributaveis.declaracao_id AND d.usuario_id = auth.uid()
    )
  );

-- Rendimentos Isentos (via declaração join) — UPDATE and DELETE
CREATE POLICY rendimentos_isentos_update ON cortex_cash.rendimentos_isentos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = rendimentos_isentos.declaracao_id AND d.usuario_id = auth.uid()
    )
  );
CREATE POLICY rendimentos_isentos_delete ON cortex_cash.rendimentos_isentos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = rendimentos_isentos.declaracao_id AND d.usuario_id = auth.uid()
    )
  );

-- Despesas Dedutíveis (via declaração join) — UPDATE and DELETE
CREATE POLICY despesas_dedutiveis_update ON cortex_cash.despesas_dedutiveis
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = despesas_dedutiveis.declaracao_id AND d.usuario_id = auth.uid()
    )
  );
CREATE POLICY despesas_dedutiveis_delete ON cortex_cash.despesas_dedutiveis
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = despesas_dedutiveis.declaracao_id AND d.usuario_id = auth.uid()
    )
  );

-- Bens e Direitos (via declaração join) — UPDATE and DELETE
CREATE POLICY bens_direitos_update ON cortex_cash.bens_direitos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = bens_direitos.declaracao_id AND d.usuario_id = auth.uid()
    )
  );
CREATE POLICY bens_direitos_delete ON cortex_cash.bens_direitos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = bens_direitos.declaracao_id AND d.usuario_id = auth.uid()
    )
  );

-- Dívidas e Ônus (via declaração join) — UPDATE and DELETE
CREATE POLICY dividas_onus_update ON cortex_cash.dividas_onus
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = dividas_onus.declaracao_id AND d.usuario_id = auth.uid()
    )
  );
CREATE POLICY dividas_onus_delete ON cortex_cash.dividas_onus
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cortex_cash.declaracoes_ir d
      WHERE d.id = dividas_onus.declaracao_id AND d.usuario_id = auth.uid()
    )
  );
