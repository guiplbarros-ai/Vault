#!/bin/bash

echo "🚀 CORTEX LEDGER — Quick Copy Helper"
echo "======================================"
echo ""

# Check if pbcopy is available (macOS)
if ! command -v pbcopy &> /dev/null; then
  echo "⚠️  pbcopy não disponível. Exibindo conteúdo em vez de copiar."
  echo ""
  USE_PBCOPY=false
else
  USE_PBCOPY=true
fi

function copy_or_show() {
  local file=$1
  local name=$2

  if [ "$USE_PBCOPY" = true ]; then
    cat "$file" | pbcopy
    echo "✅ $name copiado para clipboard!"
  else
    echo "📄 Conteúdo de $name:"
    echo "─────────────────────────────────────────"
    cat "$file"
    echo "─────────────────────────────────────────"
  fi
}

echo "Escolha o que copiar:"
echo ""
echo "1) Migration SQL (supabase/migrations/20251026T000000_init.sql)"
echo "2) Seed SQL (supabase/seed.sql)"
echo "3) Sair"
echo ""
read -p "Opção (1-3): " option

case $option in
  1)
    echo ""
    copy_or_show "supabase/migrations/20251026T000000_init.sql" "Migration SQL"
    echo ""
    echo "🌐 Próximo passo: Cole no Supabase SQL Editor"
    echo "   URL: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/sql/new"
    ;;
  2)
    echo ""
    echo "⚠️  ATENÇÃO: Antes de usar o seed, você precisa:"
    echo "   1. Criar 2 usuários via Supabase Dashboard:"
    echo "      - alice@cortexledger.test"
    echo "      - bob@cortexledger.test"
    echo "   2. Anotar os UUIDs dos usuários"
    echo "   3. Editar supabase/seed.sql (linhas 19-20) com os UUIDs"
    echo ""
    read -p "Você já fez isso? (s/n): " ready

    if [ "$ready" = "s" ] || [ "$ready" = "S" ]; then
      copy_or_show "supabase/seed.sql" "Seed SQL"
      echo ""
      echo "🌐 Próximo passo: Cole no Supabase SQL Editor"
      echo "   URL: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/sql/new"
    else
      echo ""
      echo "👉 Primeiro crie os usuários:"
      echo "   https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/auth/users"
    fi
    ;;
  3)
    echo "Saindo..."
    exit 0
    ;;
  *)
    echo "❌ Opção inválida"
    exit 1
    ;;
esac

echo ""
echo "✅ Concluído!"
