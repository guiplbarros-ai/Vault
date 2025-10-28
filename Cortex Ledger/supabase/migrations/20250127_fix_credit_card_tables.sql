-- Migration: Fix and Complete Credit Card Tables
-- Description: Add missing columns and create remaining tables
-- Author: Claude
-- Date: 2025-01-27

-- ============================================
-- 1. Add missing columns to cartao_credito (if they don't exist)
-- ============================================
DO $$
BEGIN
  -- Add ativo column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cartao_credito'
    AND column_name = 'ativo'
  ) THEN
    ALTER TABLE public.cartao_credito
    ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- Add other potentially missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cartao_credito'
    AND column_name = 'bandeira'
  ) THEN
    ALTER TABLE public.cartao_credito
    ADD COLUMN bandeira VARCHAR(50) NOT NULL DEFAULT 'outros';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cartao_credito'
    AND column_name = 'dia_fechamento'
  ) THEN
    ALTER TABLE public.cartao_credito
    ADD COLUMN dia_fechamento INTEGER NOT NULL DEFAULT 1 CHECK (dia_fechamento >= 1 AND dia_fechamento <= 31);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cartao_credito'
    AND column_name = 'dia_vencimento'
  ) THEN
    ALTER TABLE public.cartao_credito
    ADD COLUMN dia_vencimento INTEGER NOT NULL DEFAULT 10 CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cartao_credito'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.cartao_credito
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cartao_credito'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.cartao_credito
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Create indexes for cartao_credito (drop first to avoid conflicts)
DROP INDEX IF EXISTS idx_cartao_credito_user_id;
CREATE INDEX idx_cartao_credito_user_id ON public.cartao_credito(user_id);

DROP INDEX IF EXISTS idx_cartao_credito_ativo;
CREATE INDEX idx_cartao_credito_ativo ON public.cartao_credito(ativo);

-- ============================================
-- 2. Create fatura_cartao table
-- ============================================
CREATE TABLE IF NOT EXISTS public.fatura_cartao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_credito_id UUID NOT NULL REFERENCES public.cartao_credito(id) ON DELETE CASCADE,
  mes_referencia VARCHAR(7) NOT NULL,
  valor_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  data_fechamento DATE,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'paga', 'vencida')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cartao_credito_id, mes_referencia)
);

CREATE INDEX IF NOT EXISTS idx_fatura_cartao_user_id ON public.fatura_cartao(user_id);
CREATE INDEX IF NOT EXISTS idx_fatura_cartao_cartao_id ON public.fatura_cartao(cartao_credito_id);
CREATE INDEX IF NOT EXISTS idx_fatura_cartao_mes ON public.fatura_cartao(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_fatura_cartao_status ON public.fatura_cartao(status);

-- ============================================
-- 3. Create parcelamento table
-- ============================================
CREATE TABLE IF NOT EXISTS public.parcelamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_credito_id UUID NOT NULL REFERENCES public.cartao_credito(id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  valor_total DECIMAL(15, 2) NOT NULL,
  numero_parcelas INTEGER NOT NULL CHECK (numero_parcelas > 0),
  data_compra DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'em_andamento', 'concluido', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcelamento_user_id ON public.parcelamento(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelamento_cartao_id ON public.parcelamento(cartao_credito_id);
CREATE INDEX IF NOT EXISTS idx_parcelamento_status ON public.parcelamento(status);

-- ============================================
-- 4. Add columns to transacao table (if not exists)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transacao'
    AND column_name = 'cartao_credito_id'
  ) THEN
    ALTER TABLE public.transacao
    ADD COLUMN cartao_credito_id UUID REFERENCES public.cartao_credito(id) ON DELETE SET NULL;

    CREATE INDEX idx_transacao_cartao_credito_id ON public.transacao(cartao_credito_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transacao'
    AND column_name = 'parcelamento_id'
  ) THEN
    ALTER TABLE public.transacao
    ADD COLUMN parcelamento_id UUID REFERENCES public.parcelamento(id) ON DELETE SET NULL;

    CREATE INDEX idx_transacao_parcelamento_id ON public.transacao(parcelamento_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transacao'
    AND column_name = 'data_pagamento'
  ) THEN
    ALTER TABLE public.transacao
    ADD COLUMN data_pagamento DATE;

    CREATE INDEX idx_transacao_data_pagamento ON public.transacao(data_pagamento) WHERE data_pagamento IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- 5. Enable Row Level Security
-- ============================================
ALTER TABLE public.cartao_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatura_cartao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelamento ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS Policies for cartao_credito
-- ============================================
DROP POLICY IF EXISTS "Users can view their own credit cards" ON public.cartao_credito;
CREATE POLICY "Users can view their own credit cards"
  ON public.cartao_credito FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own credit cards" ON public.cartao_credito;
CREATE POLICY "Users can insert their own credit cards"
  ON public.cartao_credito FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credit cards" ON public.cartao_credito;
CREATE POLICY "Users can update their own credit cards"
  ON public.cartao_credito FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own credit cards" ON public.cartao_credito;
CREATE POLICY "Users can delete their own credit cards"
  ON public.cartao_credito FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. RLS Policies for fatura_cartao
-- ============================================
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.fatura_cartao;
CREATE POLICY "Users can view their own invoices"
  ON public.fatura_cartao FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.fatura_cartao;
CREATE POLICY "Users can insert their own invoices"
  ON public.fatura_cartao FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own invoices" ON public.fatura_cartao;
CREATE POLICY "Users can update their own invoices"
  ON public.fatura_cartao FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.fatura_cartao;
CREATE POLICY "Users can delete their own invoices"
  ON public.fatura_cartao FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 8. RLS Policies for parcelamento
-- ============================================
DROP POLICY IF EXISTS "Users can view their own installments" ON public.parcelamento;
CREATE POLICY "Users can view their own installments"
  ON public.parcelamento FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own installments" ON public.parcelamento;
CREATE POLICY "Users can insert their own installments"
  ON public.parcelamento FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own installments" ON public.parcelamento;
CREATE POLICY "Users can update their own installments"
  ON public.parcelamento FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own installments" ON public.parcelamento;
CREATE POLICY "Users can delete their own installments"
  ON public.parcelamento FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 9. Trigger function for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_cartao_credito_updated_at ON public.cartao_credito;
CREATE TRIGGER update_cartao_credito_updated_at
  BEFORE UPDATE ON public.cartao_credito
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_fatura_cartao_updated_at ON public.fatura_cartao;
CREATE TRIGGER update_fatura_cartao_updated_at
  BEFORE UPDATE ON public.fatura_cartao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_parcelamento_updated_at ON public.parcelamento;
CREATE TRIGGER update_parcelamento_updated_at
  BEFORE UPDATE ON public.parcelamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 10. Grant permissions
-- ============================================
GRANT ALL ON public.cartao_credito TO authenticated;
GRANT ALL ON public.fatura_cartao TO authenticated;
GRANT ALL ON public.parcelamento TO authenticated;

-- ============================================
-- Migration completed successfully!
-- ============================================
