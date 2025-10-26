-- Seed script para Cortex Ledger
-- Este script cria dados de exemplo para dois usuários de teste: User A e User B
-- Requisito: Dois usuários já devem existir no auth.users (criados via Supabase Dashboard)

-- IMPORTANTE: Substitua os UUIDs abaixo pelos IDs reais dos usuários criados
-- Para obter os UUIDs dos usuários:
-- SELECT id, email FROM auth.users WHERE email IN ('user-a@test.com', 'user-b@test.com');

-- Variáveis (ajustar conforme IDs reais dos usuários)
-- USER_A_ID: UUID do user-a@test.com
-- USER_B_ID: UUID do user-b@test.com

-- ============================================================================
-- DADOS PARA USER A (user-a@test.com)
-- ============================================================================

-- ATENÇÃO: Troque 'USER_A_ID_AQUI' pelo UUID real do usuário A
DO $$
DECLARE
  user_a_id uuid := 'USER_A_ID_AQUI'::uuid; -- SUBSTITUIR
  user_b_id uuid := 'USER_B_ID_AQUI'::uuid; -- SUBSTITUIR
  inst_bradesco_a uuid;
  inst_nubank_a uuid;
  conta_corrente_a uuid;
  conta_poupanca_a uuid;
  cat_alimentacao_a uuid;
  cat_transporte_a uuid;
  cat_lazer_a uuid;
  inst_itau_b uuid;
  conta_corrente_b uuid;
  cat_moradia_b uuid;
BEGIN

  -- ========== USER A: Instituições ==========
  INSERT INTO instituicao (id, user_id, nome, tipo)
  VALUES
    (gen_random_uuid(), user_a_id, 'Banco Bradesco', 'banco'),
    (gen_random_uuid(), user_a_id, 'Nubank', 'fintech')
  RETURNING id INTO inst_bradesco_a;

  SELECT id INTO inst_nubank_a FROM instituicao WHERE user_id = user_a_id AND nome = 'Nubank';

  -- ========== USER A: Contas ==========
  INSERT INTO conta (id, user_id, instituicao_id, apelido, tipo, moeda, ativa)
  VALUES
    (gen_random_uuid(), user_a_id, inst_bradesco_a, 'Conta Corrente Bradesco', 'corrente', 'BRL', true),
    (gen_random_uuid(), user_a_id, inst_nubank_a, 'Nubank Roxinho', 'corrente', 'BRL', true)
  RETURNING id INTO conta_corrente_a;

  SELECT id INTO conta_poupanca_a FROM conta WHERE user_id = user_a_id AND apelido = 'Nubank Roxinho';

  -- ========== USER A: Categorias ==========
  INSERT INTO categoria (id, user_id, grupo, nome, ativa)
  VALUES
    (gen_random_uuid(), user_a_id, 'Essencial', 'Alimentação', true),
    (gen_random_uuid(), user_a_id, 'Essencial', 'Transporte', true),
    (gen_random_uuid(), user_a_id, 'Lazer', 'Entretenimento', true)
  RETURNING id INTO cat_alimentacao_a;

  SELECT id INTO cat_transporte_a FROM categoria WHERE user_id = user_a_id AND nome = 'Transporte';
  SELECT id INTO cat_lazer_a FROM categoria WHERE user_id = user_a_id AND nome = 'Entretenimento';

  -- ========== USER A: Regras de Classificação ==========
  INSERT INTO regra_classificacao (user_id, ordem, expressao, tipo_regra, categoria_id, confianca_min)
  VALUES
    (user_a_id, 1, 'supermercado|mercado|padaria', 'contains', cat_alimentacao_a, 0.80),
    (user_a_id, 2, 'uber|99|taxi|combustivel', 'contains', cat_transporte_a, 0.75),
    (user_a_id, 3, 'netflix|spotify|cinema', 'contains', cat_lazer_a, 0.85);

  -- ========== USER A: Transações ==========
  -- NOTA: hash_dedupe será computado automaticamente pelo trigger
  INSERT INTO transacao (user_id, conta_id, data, descricao, valor, tipo)
  VALUES
    (user_a_id, conta_corrente_a, '2025-01-10', 'Compra Supermercado Pão de Açúcar', -150.00, 'debito'),
    (user_a_id, conta_corrente_a, '2025-01-12', 'Uber viagem Centro-Casa', -25.50, 'debito'),
    (user_a_id, conta_poupanca_a, '2025-01-15', 'Transferência recebida', 500.00, 'credito'),
    (user_a_id, conta_poupanca_a, '2025-01-18', 'Netflix assinatura mensal', -49.90, 'debito'),
    (user_a_id, conta_corrente_a, '2025-01-20', 'Padaria da esquina', -15.00, 'debito');

  -- ========== USER A: Orçamentos ==========
  INSERT INTO orcamento (user_id, mes, categoria_id, valor_alvo)
  VALUES
    (user_a_id, '2025-01-01', cat_alimentacao_a, 800.00),
    (user_a_id, '2025-01-01', cat_transporte_a, 300.00),
    (user_a_id, '2025-01-01', cat_lazer_a, 200.00);

  -- ========== USER A: Meta ==========
  INSERT INTO meta (user_id, nome, conta_id, valor_alvo, progresso)
  VALUES
    (user_a_id, 'Reserva de Emergência', conta_poupanca_a, 10000.00, 500.00);

  -- ========== USER A: Preferências ==========
  INSERT INTO preferencias (user_id, moeda, fuso, modo_tema)
  VALUES
    (user_a_id, 'BRL', 'America/Sao_Paulo', 'dark');

  -- ============================================================================
  -- DADOS PARA USER B (user-b@test.com)
  -- ============================================================================

  -- ========== USER B: Instituições ==========
  INSERT INTO instituicao (id, user_id, nome, tipo)
  VALUES
    (gen_random_uuid(), user_b_id, 'Itaú', 'banco')
  RETURNING id INTO inst_itau_b;

  -- ========== USER B: Contas ==========
  INSERT INTO conta (id, user_id, instituicao_id, apelido, tipo, moeda, ativa)
  VALUES
    (gen_random_uuid(), user_b_id, inst_itau_b, 'Conta Salário Itaú', 'corrente', 'BRL', true)
  RETURNING id INTO conta_corrente_b;

  -- ========== USER B: Categorias ==========
  INSERT INTO categoria (id, user_id, grupo, nome, ativa)
  VALUES
    (gen_random_uuid(), user_b_id, 'Essencial', 'Moradia', true)
  RETURNING id INTO cat_moradia_b;

  -- ========== USER B: Transações ==========
  INSERT INTO transacao (user_id, conta_id, data, descricao, valor, tipo)
  VALUES
    (user_b_id, conta_corrente_b, '2025-01-05', 'Salário Janeiro', 5000.00, 'credito'),
    (user_b_id, conta_corrente_b, '2025-01-08', 'Aluguel Janeiro', -1500.00, 'debito'),
    (user_b_id, conta_corrente_b, '2025-01-10', 'Conta de luz Cemig', -120.00, 'debito');

  -- ========== USER B: Orçamentos ==========
  INSERT INTO orcamento (user_id, mes, categoria_id, valor_alvo)
  VALUES
    (user_b_id, '2025-01-01', cat_moradia_b, 2000.00);

  -- ========== USER B: Preferências ==========
  INSERT INTO preferencias (user_id, moeda, fuso, modo_tema)
  VALUES
    (user_b_id, 'BRL', 'America/Sao_Paulo', 'light');

  RAISE NOTICE 'Seed concluído com sucesso! User A: %, User B: %', user_a_id, user_b_id;

END $$;

-- ============================================================================
-- VERIFICAÇÕES PÓS-SEED
-- ============================================================================

-- Verificar se dados foram criados corretamente
-- Descomentar e ajustar UUIDs para executar:

-- SELECT 'Instituições User A:' as info, count(*) FROM instituicao WHERE user_id = 'USER_A_ID_AQUI';
-- SELECT 'Contas User A:' as info, count(*) FROM conta WHERE user_id = 'USER_A_ID_AQUI';
-- SELECT 'Categorias User A:' as info, count(*) FROM categoria WHERE user_id = 'USER_A_ID_AQUI';
-- SELECT 'Transações User A:' as info, count(*) FROM transacao WHERE user_id = 'USER_A_ID_AQUI';
-- SELECT 'Orçamentos User A:' as info, count(*) FROM orcamento WHERE user_id = 'USER_A_ID_AQUI';

-- SELECT 'Instituições User B:' as info, count(*) FROM instituicao WHERE user_id = 'USER_B_ID_AQUI';
-- SELECT 'Contas User B:' as info, count(*) FROM conta WHERE user_id = 'USER_B_ID_AQUI';
-- SELECT 'Transações User B:' as info, count(*) FROM transacao WHERE user_id = 'USER_B_ID_AQUI';

-- Verificar hash_dedupe foi computado
-- SELECT id, descricao, hash_dedupe FROM transacao WHERE user_id = 'USER_A_ID_AQUI' LIMIT 3;
