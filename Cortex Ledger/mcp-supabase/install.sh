#!/bin/bash

# Script de instalação do MCP Supabase Server

set -e

echo "🚀 Instalando MCP Supabase Server..."
echo ""

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js primeiro."
    echo "   Visite: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"
echo ""

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Por favor, instale o npm primeiro."
    exit 1
fi

echo "✅ npm encontrado: $(npm --version)"
echo ""

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "⚠️  Arquivo .env não encontrado."
    echo "   Copiando .env.example para .env..."
    cp .env.example .env
    echo ""
    echo "⚠️  ATENÇÃO: Por favor, edite o arquivo .env com suas credenciais do Supabase!"
    echo ""
fi

# Compilar TypeScript
echo "🔨 Compilando TypeScript..."
npm run build

echo ""
echo "✅ Instalação concluída!"
echo ""
echo "📝 Próximos passos:"
echo ""
echo "1. Configure suas credenciais no arquivo .env (se ainda não fez)"
echo "2. Configure o servidor MCP:"
echo ""
echo "   Para Claude Code:"
echo "   - Edite: ~/.config/claude-code/mcp.json"
echo "   - Veja: SETUP_CLAUDE_CODE.md"
echo ""
echo "   Para Cursor:"
echo "   - Edite: ~/.cursor/mcp.json ou ~/.config/cursor/mcp.json"
echo "   - Veja: SETUP_CURSOR.md"
echo ""
echo "3. (Opcional) Execute o SQL em setup.sql no Supabase para habilitar"
echo "   as funcionalidades de listagem de tabelas e schema"
echo ""
echo "4. Reinicie o Claude Code ou Cursor"
echo ""
echo "📚 Para exemplos de uso, veja: EXAMPLES.md"
echo ""
echo "🎉 Pronto para usar!"
