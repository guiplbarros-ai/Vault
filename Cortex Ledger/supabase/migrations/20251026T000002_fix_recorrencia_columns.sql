ALTER TABLE recorrencia RENAME COLUMN proximo_lanc TO proximo_vencimento;

ALTER TABLE recorrencia RENAME COLUMN valor_est TO valor_estimado;

ALTER TABLE recorrencia ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categoria(id);

CREATE INDEX IF NOT EXISTS idx_recorrencia_categoria ON recorrencia(categoria_id);

ALTER TABLE recorrencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own recorrencias" ON recorrencia;

CREATE POLICY "Users can view their own recorrencias" ON recorrencia FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recorrencias" ON recorrencia;

CREATE POLICY "Users can insert their own recorrencias" ON recorrencia FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recorrencias" ON recorrencia;

CREATE POLICY "Users can update their own recorrencias" ON recorrencia FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recorrencias" ON recorrencia;

CREATE POLICY "Users can delete their own recorrencias" ON recorrencia FOR DELETE USING (auth.uid() = user_id);
