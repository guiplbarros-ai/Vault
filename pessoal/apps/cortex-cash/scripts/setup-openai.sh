#!/bin/bash

# Setup OpenAI API Key
# Agent IA: Owner

echo "========================================="
echo "  OpenAI API Key Setup"
echo "========================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Erro: .env.local não encontrado"
    exit 1
fi

# Check current status
if grep -q "^OPENAI_API_KEY=sk-" .env.local; then
    echo "✅ API Key já configurada"
    echo ""
    echo "Para substituir, edite manualmente o arquivo .env.local"
    exit 0
fi

echo "📝 Instruções:"
echo ""
echo "1. Acesse: https://platform.openai.com/api-keys"
echo "2. Faça login (ou crie uma conta)"
echo "3. Clique em 'Create new secret key'"
echo "4. IMPORTANTE: Copie a chave imediatamente (só aparece uma vez)"
echo "5. A chave começa com 'sk-proj-' ou 'sk-'"
echo ""
echo "========================================="
echo ""
read -p "Cole sua API Key da OpenAI aqui: " api_key

# Validate format
if [[ ! $api_key =~ ^sk- ]]; then
    echo "❌ Erro: API Key inválida (deve começar com 'sk-')"
    exit 1
fi

# Update .env.local
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$api_key|" .env.local
else
    # Linux
    sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$api_key|" .env.local
fi

echo ""
echo "✅ API Key configurada com sucesso!"
echo ""
echo "Próximos passos:"
echo "1. Reinicie o servidor: npm run dev"
echo "2. Acesse: http://localhost:3000/settings"
echo "3. Verifique o status em 'IA e Custos'"
echo ""
