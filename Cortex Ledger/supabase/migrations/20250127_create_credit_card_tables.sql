-- Migration: Create Credit Card Management Tables
-- Description: Tables for managing credit cards, invoices, and installments
-- Author: Claude
-- Date: 2025-01-27

-- ============================================
-- 1. Create cartao_credito table
-- ============================================
CREATE TABLE IF NOT EXISTS public.cartao_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  bandeira VARCHAR(50) NOT NULL DEFAULT 'outros',
  ultimos_digitos VARCHAR(4) NOT NULL,
  limite_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  dia_fechamento INTEGER NOT NULL DEFAULT 1 CHECK (dia_fechamento >= 1 AND dia_fechamento <= 31),
  dia_vencimento INTEGER NOT NULL DEFAULT 10 CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cartao_credito_user_id ON public.cartao_credito(user_id);
CREATE INDEX IF NOT EXISTS idx_cartao_credito_ativo ON public.cartao_credito(ativo);

-- ============================================
-- 2. Create fatura_cartao table
-- ============================================
CREATE TABLE IF NOT EXISTS public.fatura_cartao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_credito_id UUID NOT NULL REFERENCES public.cartao_credito(id) ON DELETE CASCADE,
  mes_referencia VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  valor_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  data_fechamento DATE,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'paga', 'vencida')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cartao_credito_id, mes_referencia)
);

-- Create indexes for performance
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_parcelamento_user_id ON public.parcelamento(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelamento_cartao_id ON public.parcelamento(cartao_credito_id);
CREATE INDEX IF NOT EXISTS idx_parcelamento_status ON public.parcelamento(status);

-- ============================================
-- 4. Add cartao_credito_id to transacao table (if not exists)
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
END $$;

-- ============================================
-- 5. Add parcelamento_id to transacao table (if not exists)
-- ============================================
DO $$
BEGIN
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
END $$;

-- ============================================
-- 6. Add data_pagamento to transacao table (if not exists)
-- ============================================
DO $$
BEGIN
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
-- 7. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE public.cartao_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatura_cartao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelamento ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. Create RLS Policies for cartao_credito
-- ============================================
DROP POLICY IF EXISTS "Users can view their own credit cards" ON public.cartao_credito;
CREATE POLICY "Users can view their own credit cards"
  ON public.cartao_credito
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own credit cards" ON public.cartao_credito;
CREATE POLICY "Users can insert their own credit cards"
  ON public.cartao_credito
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credit cards" ON public.cartao_credito;
CREATE POLICY "Users can update their own credit cards"
  ON public.cartao_credito
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own credit cards" ON public.cartao_credito;
CREATE POLICY "Users can delete their own credit cards"
  ON public.cartao_credito
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 9. Create RLS Policies for fatura_cartao
-- ============================================
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.fatura_cartao;
CREATE POLICY "Users can view their own invoices"
  ON public.fatura_cartao
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.fatura_cartao;
CREATE POLICY "Users can insert their own invoices"
  ON public.fatura_cartao
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own invoices" ON public.fatura_cartao;
CREATE POLICY "Users can update their own invoices"
  ON public.fatura_cartao
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.fatura_cartao;
CREATE POLICY "Users can delete their own invoices"
  ON public.fatura_cartao
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 10. Create RLS Policies for parcelamento
-- ============================================
DROP POLICY IF EXISTS "Users can view their own installments" ON public.parcelamento;
CREATE POLICY "Users can view their own installments"
  ON public.parcelamento
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own installments" ON public.parcelamento;
CREATE POLICY "Users can insert their own installments"
  ON public.parcelamento
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own installments" ON public.parcelamento;
CREATE POLICY "Users can update their own installments"
  ON public.parcelamento
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own installments" ON public.parcelamento;
CREATE POLICY "Users can delete their own installments"
  ON public.parcelamento
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 11. Create trigger functions for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
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
-- 12. Grant permissions
-- ============================================
GRANT ALL ON public.cartao_credito TO authenticated;
GRANT ALL ON public.fatura_cartao TO authenticated;
GRANT ALL ON public.parcelamento TO authenticated;

-- ============================================
-- Migration completed successfully!
-- ============================================
