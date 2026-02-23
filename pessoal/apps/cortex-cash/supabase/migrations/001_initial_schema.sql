-- ============================================================
-- Cortex Cash — Initial Schema (PostgreSQL / Supabase)
-- Schema: cortex_cash (isolado do atlas-app no mesmo projeto)
--
-- Migrado de Dexie.js (IndexedDB) → Supabase (PostgreSQL)
-- 25 tabelas (usuarios removida → Supabase Auth + profiles)
-- ============================================================

CREATE SCHEMA IF NOT EXISTS cortex_cash;

-- ── Helpers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cortex_cash.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 1. Profiles (linked to auth.users) ─────────────────────

CREATE TABLE cortex_cash.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  avatar_url text,
  telefone text,
  data_nascimento date,
  cpf text,
  biografia text,
  tema_preferido text DEFAULT 'auto',
  moeda_preferida text DEFAULT 'BRL',
  idioma_preferido text DEFAULT 'pt-BR',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON cortex_cash.profiles
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 2. Instituições Financeiras ─────────────────────────────

CREATE TABLE cortex_cash.instituicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text,
  logo_url text,
  cor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER instituicoes_updated_at
  BEFORE UPDATE ON cortex_cash.instituicoes
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 3. Contas Bancárias ─────────────────────────────────────

CREATE TABLE cortex_cash.contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instituicao_id uuid NOT NULL REFERENCES cortex_cash.instituicoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('corrente', 'poupanca', 'investimento', 'carteira')),
  agencia text,
  numero text,
  saldo_referencia numeric(15,2) NOT NULL DEFAULT 0,
  data_referencia timestamptz NOT NULL DEFAULT now(),
  saldo_atual numeric(15,2) NOT NULL DEFAULT 0,
  ativa boolean NOT NULL DEFAULT true,
  cor text,
  icone text,
  observacoes text,
  conta_pai_id uuid REFERENCES cortex_cash.contas(id) ON DELETE SET NULL,
  pluggy_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER contas_updated_at
  BEFORE UPDATE ON cortex_cash.contas
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 4. Categorias ───────────────────────────────────────────

CREATE TABLE cortex_cash.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
  grupo text,
  pai_id uuid REFERENCES cortex_cash.categorias(id) ON DELETE SET NULL,
  icone text,
  cor text,
  ordem integer NOT NULL DEFAULT 0,
  ativa boolean NOT NULL DEFAULT true,
  is_sistema boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER categorias_updated_at
  BEFORE UPDATE ON cortex_cash.categorias
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 5. Tags ─────────────────────────────────────────────────

CREATE TABLE cortex_cash.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cor text,
  tipo text NOT NULL DEFAULT 'customizada' CHECK (tipo IN ('sistema', 'customizada')),
  is_sistema boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 6. Centros de Custo ─────────────────────────────────────

CREATE TABLE cortex_cash.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  cor text,
  icone text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER centros_custo_updated_at
  BEFORE UPDATE ON cortex_cash.centros_custo
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 7. Transações ───────────────────────────────────────────

CREATE TABLE cortex_cash.transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_id uuid NOT NULL REFERENCES cortex_cash.contas(id) ON DELETE CASCADE,
  categoria_id uuid REFERENCES cortex_cash.categorias(id) ON DELETE SET NULL,
  centro_custo_id uuid REFERENCES cortex_cash.centros_custo(id) ON DELETE SET NULL,
  data timestamptz NOT NULL,
  descricao text NOT NULL,
  valor numeric(15,2) NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
  observacoes text,
  tags jsonb,
  transferencia_id uuid,
  conta_destino_id uuid REFERENCES cortex_cash.contas(id) ON DELETE SET NULL,
  parcelado boolean NOT NULL DEFAULT false,
  parcela_numero integer,
  parcela_total integer,
  grupo_parcelamento_id uuid,
  classificacao_confirmada boolean NOT NULL DEFAULT false,
  classificacao_origem text CHECK (classificacao_origem IN ('manual', 'regra', 'ia')),
  classificacao_confianca numeric(3,2),
  hash text UNIQUE,
  origem_arquivo text,
  origem_linha integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER transacoes_updated_at
  BEFORE UPDATE ON cortex_cash.transacoes
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 8. Templates de Importação ──────────────────────────────

CREATE TABLE cortex_cash.templates_importacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  instituicao_id uuid REFERENCES cortex_cash.instituicoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo_arquivo text NOT NULL CHECK (tipo_arquivo IN ('csv', 'ofx', 'excel')),
  separador text,
  encoding text DEFAULT 'utf-8',
  pular_linhas integer DEFAULT 0,
  mapeamento_colunas jsonb NOT NULL,
  formato_data text DEFAULT 'DD/MM/YYYY',
  separador_decimal text DEFAULT ',',
  ultima_utilizacao timestamptz,
  contador_uso integer NOT NULL DEFAULT 0,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER templates_importacao_updated_at
  BEFORE UPDATE ON cortex_cash.templates_importacao
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 9. Regras de Classificação ──────────────────────────────

CREATE TABLE cortex_cash.regras_classificacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES cortex_cash.categorias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo_regra text NOT NULL CHECK (tipo_regra IN ('contains', 'starts_with', 'ends_with', 'regex')),
  padrao text NOT NULL,
  prioridade integer NOT NULL DEFAULT 0,
  ativa boolean NOT NULL DEFAULT true,
  total_aplicacoes integer NOT NULL DEFAULT 0,
  ultima_aplicacao timestamptz,
  total_confirmacoes integer NOT NULL DEFAULT 0,
  total_rejeicoes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER regras_classificacao_updated_at
  BEFORE UPDATE ON cortex_cash.regras_classificacao
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 10. Logs IA ─────────────────────────────────────────────

CREATE TABLE cortex_cash.logs_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transacao_id uuid REFERENCES cortex_cash.transacoes(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  resposta text NOT NULL,
  modelo text NOT NULL,
  tokens_prompt integer NOT NULL,
  tokens_resposta integer NOT NULL,
  tokens_total integer NOT NULL,
  custo_usd numeric(10,6) NOT NULL,
  categoria_sugerida_id uuid REFERENCES cortex_cash.categorias(id) ON DELETE SET NULL,
  confianca numeric(3,2),
  confirmada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 11. Orçamentos ──────────────────────────────────────────

CREATE TABLE cortex_cash.orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('categoria', 'centro_custo')),
  categoria_id uuid REFERENCES cortex_cash.categorias(id) ON DELETE CASCADE,
  centro_custo_id uuid REFERENCES cortex_cash.centros_custo(id) ON DELETE CASCADE,
  mes_referencia text NOT NULL,
  valor_planejado numeric(15,2) NOT NULL,
  valor_realizado numeric(15,2) NOT NULL DEFAULT 0,
  alerta_80 boolean NOT NULL DEFAULT true,
  alerta_100 boolean NOT NULL DEFAULT true,
  alerta_80_enviado boolean NOT NULL DEFAULT false,
  alerta_100_enviado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER orcamentos_updated_at
  BEFORE UPDATE ON cortex_cash.orcamentos
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 12. Cartões de Crédito ──────────────────────────────────

CREATE TABLE cortex_cash.cartoes_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instituicao_id uuid NOT NULL REFERENCES cortex_cash.instituicoes(id) ON DELETE CASCADE,
  conta_pagamento_id uuid REFERENCES cortex_cash.contas(id) ON DELETE SET NULL,
  nome text NOT NULL,
  ultimos_digitos text,
  bandeira text CHECK (bandeira IN ('visa', 'mastercard', 'elo', 'amex')),
  limite_total numeric(15,2) NOT NULL,
  dia_fechamento integer NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento integer NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  ativo boolean NOT NULL DEFAULT true,
  cor text,
  pluggy_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER cartoes_config_updated_at
  BEFORE UPDATE ON cortex_cash.cartoes_config
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 13. Faturas ─────────────────────────────────────────────

CREATE TABLE cortex_cash.faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_id uuid NOT NULL REFERENCES cortex_cash.cartoes_config(id) ON DELETE CASCADE,
  mes_referencia text NOT NULL,
  data_fechamento timestamptz NOT NULL,
  data_vencimento timestamptz NOT NULL,
  valor_total numeric(15,2) NOT NULL DEFAULT 0,
  valor_minimo numeric(15,2) NOT NULL DEFAULT 0,
  valor_pago numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'paga', 'atrasada')),
  fechada_automaticamente boolean NOT NULL DEFAULT false,
  data_pagamento timestamptz,
  transacao_pagamento_id uuid REFERENCES cortex_cash.transacoes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER faturas_updated_at
  BEFORE UPDATE ON cortex_cash.faturas
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 14. Lançamentos de Fatura ───────────────────────────────

CREATE TABLE cortex_cash.faturas_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id uuid NOT NULL REFERENCES cortex_cash.faturas(id) ON DELETE CASCADE,
  transacao_id uuid REFERENCES cortex_cash.transacoes(id) ON DELETE CASCADE,
  data_compra timestamptz NOT NULL,
  descricao text NOT NULL,
  valor_brl numeric(15,2) NOT NULL,
  parcela_numero integer,
  parcela_total integer,
  moeda_original text,
  valor_original numeric(15,4),
  taxa_cambio numeric(10,4),
  categoria_id uuid REFERENCES cortex_cash.categorias(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 15. Investimentos ───────────────────────────────────────

CREATE TABLE cortex_cash.investimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instituicao_id uuid NOT NULL REFERENCES cortex_cash.instituicoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('renda_fixa', 'renda_variavel', 'fundo_investimento', 'previdencia', 'criptomoeda', 'outro')),
  ticker text,
  valor_aplicado numeric(15,2) NOT NULL,
  valor_atual numeric(15,2) NOT NULL,
  quantidade numeric(15,6),
  data_aplicacao timestamptz NOT NULL,
  data_vencimento timestamptz,
  taxa_juros numeric(8,4),
  rentabilidade_contratada numeric(8,4),
  indexador text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'resgatado', 'vencido')),
  conta_origem_id uuid REFERENCES cortex_cash.contas(id) ON DELETE SET NULL,
  observacoes text,
  cor text,
  pluggy_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER investimentos_updated_at
  BEFORE UPDATE ON cortex_cash.investimentos
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 16. Histórico de Investimentos ──────────────────────────

CREATE TABLE cortex_cash.historico_investimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investimento_id uuid NOT NULL REFERENCES cortex_cash.investimentos(id) ON DELETE CASCADE,
  data timestamptz NOT NULL,
  valor numeric(15,2) NOT NULL,
  quantidade numeric(15,6),
  tipo_movimentacao text NOT NULL CHECK (tipo_movimentacao IN ('aporte', 'resgate', 'rendimento', 'ajuste')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 17. Patrimônio Snapshots ────────────────────────────────

CREATE TABLE cortex_cash.patrimonio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes text NOT NULL,
  saldo_contas numeric(15,2) NOT NULL,
  saldo_investimentos numeric(15,2) NOT NULL,
  patrimonio_total numeric(15,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, mes)
);

-- ── 18. Declarações IR ──────────────────────────────────────

CREATE TABLE cortex_cash.declaracoes_ir (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ano_calendario text NOT NULL,
  ano_exercicio text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('completa', 'simplificada')),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizada', 'enviada', 'processada')),
  data_envio timestamptz,
  recibo text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER declaracoes_ir_updated_at
  BEFORE UPDATE ON cortex_cash.declaracoes_ir
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 19. Rendimentos Tributáveis ─────────────────────────────

CREATE TABLE cortex_cash.rendimentos_tributaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaracao_id uuid NOT NULL REFERENCES cortex_cash.declaracoes_ir(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('salario', 'prolabore', 'aposentadoria', 'aluguel', 'outro')),
  fonte_pagadora_nome text NOT NULL,
  fonte_pagadora_cnpj text,
  valor_bruto numeric(15,2) NOT NULL,
  imposto_retido numeric(15,2) NOT NULL DEFAULT 0,
  inss_retido numeric(15,2) NOT NULL DEFAULT 0,
  contribuicao_previdenciaria numeric(15,2) NOT NULL DEFAULT 0,
  pensao_alimenticia_paga numeric(15,2) NOT NULL DEFAULT 0,
  mes_inicio integer NOT NULL CHECK (mes_inicio BETWEEN 1 AND 12),
  mes_fim integer NOT NULL CHECK (mes_fim BETWEEN 1 AND 12),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 20. Rendimentos Isentos ─────────────────────────────────

CREATE TABLE cortex_cash.rendimentos_isentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaracao_id uuid NOT NULL REFERENCES cortex_cash.declaracoes_ir(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('poupanca', 'indenizacao', 'doacao', 'heranca', 'seguro_vida', 'outro')),
  descricao text NOT NULL,
  valor numeric(15,2) NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 21. Despesas Dedutíveis ─────────────────────────────────

CREATE TABLE cortex_cash.despesas_dedutiveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaracao_id uuid NOT NULL REFERENCES cortex_cash.declaracoes_ir(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('saude', 'educacao', 'previdencia_privada', 'pensao_alimenticia')),
  beneficiario_nome text NOT NULL,
  beneficiario_cpf text,
  prestador_nome text NOT NULL,
  prestador_cnpj text,
  valor numeric(15,2) NOT NULL,
  data_pagamento timestamptz NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 22. Bens e Direitos ─────────────────────────────────────

CREATE TABLE cortex_cash.bens_direitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaracao_id uuid NOT NULL REFERENCES cortex_cash.declaracoes_ir(id) ON DELETE CASCADE,
  codigo_receita text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('imovel', 'veiculo', 'investimento', 'outros')),
  descricao text NOT NULL,
  valor_inicial numeric(15,2) NOT NULL,
  valor_final numeric(15,2) NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER bens_direitos_updated_at
  BEFORE UPDATE ON cortex_cash.bens_direitos
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 23. Dívidas e Ônus ──────────────────────────────────────

CREATE TABLE cortex_cash.dividas_onus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaracao_id uuid NOT NULL REFERENCES cortex_cash.declaracoes_ir(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('financiamento', 'emprestimo', 'cartao_credito', 'outros')),
  credor_nome text NOT NULL,
  credor_cnpj text,
  valor_inicial numeric(15,2) NOT NULL,
  valor_final numeric(15,2) NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER dividas_onus_updated_at
  BEFORE UPDATE ON cortex_cash.dividas_onus
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 24. Cenários de Planejamento ────────────────────────────

CREATE TABLE cortex_cash.cenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'base' CHECK (tipo IN ('base', 'personalizado')),
  horizonte_anos integer NOT NULL CHECK (horizonte_anos BETWEEN 1 AND 10),
  data_inicio timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER cenarios_updated_at
  BEFORE UPDATE ON cortex_cash.cenarios
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 25. Configurações de Comportamento ──────────────────────

CREATE TABLE cortex_cash.configuracoes_comportamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cenario_id uuid NOT NULL REFERENCES cortex_cash.cenarios(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa', 'investimento', 'evento_unico')),
  categoria_id uuid REFERENCES cortex_cash.categorias(id) ON DELETE SET NULL,
  modo text NOT NULL CHECK (modo IN ('manter_padrao', 'percentual', 'valor_fixo', 'zerar')),
  percentual_mudanca numeric(8,2),
  valor_fixo numeric(15,2),
  data_aplicacao timestamptz,
  percentual_saving numeric(8,2),
  taxa_retorno_mensal numeric(8,6),
  evento_descricao text,
  evento_valor numeric(15,2),
  evento_data timestamptz,
  evento_tipo text CHECK (evento_tipo IN ('receita', 'despesa')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER configuracoes_comportamento_updated_at
  BEFORE UPDATE ON cortex_cash.configuracoes_comportamento
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();

-- ── 26. Objetivos Financeiros ───────────────────────────────

CREATE TABLE cortex_cash.objetivos_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cenario_id uuid NOT NULL REFERENCES cortex_cash.cenarios(id) ON DELETE CASCADE,
  nome text NOT NULL,
  valor_alvo numeric(15,2) NOT NULL,
  data_alvo timestamptz NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('casa', 'viagem', 'educacao', 'aposentadoria', 'carro', 'outro')),
  prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('alta', 'media', 'baixa')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER objetivos_financeiros_updated_at
  BEFORE UPDATE ON cortex_cash.objetivos_financeiros
  FOR EACH ROW EXECUTE FUNCTION cortex_cash.update_updated_at();
