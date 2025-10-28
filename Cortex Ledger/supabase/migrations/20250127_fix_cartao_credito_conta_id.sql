-- Migration: Fix cartao_credito table - remove conta_id constraint
-- Description: Cartões de crédito não precisam estar associados a uma conta
-- Author: Claude
-- Date: 2025-01-27

-- Remove conta_id column if it exists (credit cards don't need to be linked to an account)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cartao_credito'
    AND column_name = 'conta_id'
  ) THEN
    ALTER TABLE public.cartao_credito DROP COLUMN conta_id;
  END IF;
END $$;

-- Migration completed successfully!
