-- Index for polling new transactions by created_at (tx-monitor)
CREATE INDEX IF NOT EXISTS idx_transacoes_usuario_created_at
  ON cortex_cash.transacoes (usuario_id, created_at DESC);
