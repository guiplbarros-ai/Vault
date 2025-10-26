#!/bin/bash

echo "🚀 GUIA: Aplicar Migração SQL no Supabase"
echo "=========================================="
echo ""
echo "📋 Passo 1: Abra o Supabase Studio SQL Editor"
echo "   URL: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/sql/new"
echo ""
echo "📋 Passo 2: Copie o conteúdo da migração"
echo "   Executando: pbcopy < supabase/migrations/20251026T000000_init.sql"

if command -v pbcopy &> /dev/null; then
  pbcopy < supabase/migrations/20251026T000000_init.sql
  echo "   ✅ Conteúdo copiado para clipboard!"
else
  echo "   ⚠️  pbcopy não disponível. Copie manualmente:"
  echo "   cat supabase/migrations/20251026T000000_init.sql"
fi

echo ""
echo "📋 Passo 3: Cole no editor SQL e clique em 'Run'"
echo ""
echo "📋 Passo 4: Valide a criação das tabelas:"
echo "   Execute no SQL Editor:"
echo "   SELECT table_name FROM information_schema.tables"
echo "   WHERE table_schema = 'public' ORDER BY table_name;"
echo ""
echo "   Deve retornar 11 tabelas:"
echo "   - categoria, conta, instituicao, log_ia, meta,"
echo "   - orcamento, preferencias, recorrencia,"
echo "   - regra_classificacao, template_importacao, transacao"
echo ""
echo "✅ Aguardando aplicação da migração..."
echo "   Pressione ENTER quando terminar"
read

echo ""
echo "🔍 Você aplicou a migração? (s/n)"
read APPLIED

if [ "$APPLIED" = "s" ] || [ "$APPLIED" = "S" ]; then
  echo "✅ Ótimo! Migração aplicada com sucesso!"
  echo "📝 Criando marcador de conclusão..."
  touch .migration-applied
  echo "timestamp=$(date)" > .migration-applied
else
  echo "⚠️  Por favor, aplique a migração antes de continuar."
  exit 1
fi
