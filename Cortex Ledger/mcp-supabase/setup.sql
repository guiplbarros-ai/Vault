-- Execute este SQL no SQL Editor do Supabase para habilitar
-- as funcionalidades de listagem de tabelas e schema

-- Função para executar SQL dinâmico (necessária para list_tables e get_schema)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE sql INTO result;
  RETURN result;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION exec_sql(text) IS
'Função RPC para executar SQL dinâmico. Use com cuidado apenas com service_role key.';

-- Conceder permissão para authenticated users (opcional, ajuste conforme necessário)
-- GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
