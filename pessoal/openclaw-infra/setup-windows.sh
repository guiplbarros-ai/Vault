#!/bin/bash
# ============================================================
# OpenClaw Setup - Windows WSL2
# Rodar dentro do WSL2 no Windows
# ============================================================

set -e

echo "=== OpenClaw Infra Setup ==="
echo ""

# ------------------------------------------------------------
# 1. Instalar OpenClaw
# ------------------------------------------------------------
echo "[1/5] Instalando OpenClaw..."
if command -v openclaw &>/dev/null; then
  echo "   ✓ OpenClaw já instalado: $(openclaw --version 2>/dev/null || echo 'ok')"
else
  npm install -g openclaw
  echo "   ✓ OpenClaw instalado"
fi

# ------------------------------------------------------------
# 2. Criar estrutura de diretórios
# ------------------------------------------------------------
echo "[2/5] Criando diretórios..."

OPENCLAW_DIR="$HOME/.openclaw"
mkdir -p "$OPENCLAW_DIR"
mkdir -p "$OPENCLAW_DIR/credentials"
mkdir -p "$OPENCLAW_DIR/skills-freelaw"

# Workspaces (um por agente)
for agent in backstage data review ops pessoal; do
  mkdir -p "$OPENCLAW_DIR/workspace-$agent"
done

# Agent state dirs
for agent in backstage data review ops pessoal; do
  mkdir -p "$OPENCLAW_DIR/agents/$agent/sessions"
done

echo "   ✓ Estrutura criada em $OPENCLAW_DIR"

# ------------------------------------------------------------
# 3. Copiar workspaces
# ------------------------------------------------------------
echo "[3/5] Copiando workspaces..."

# Ajuste este path para onde está o repo openclaw-infra no Windows
INFRA_DIR="/mnt/c/Users/guipl/Documents/Coding/pessoal-repo/pessoal/openclaw-infra"

if [ -d "$INFRA_DIR/workspaces" ]; then
  for agent in backstage data review ops pessoal; do
    if [ -d "$INFRA_DIR/workspaces/$agent" ]; then
      cp "$INFRA_DIR/workspaces/$agent/"*.md "$OPENCLAW_DIR/workspace-$agent/" 2>/dev/null || true
      echo "   ✓ workspace-$agent"
    fi
  done
else
  echo "   ⚠ Diretório $INFRA_DIR/workspaces não encontrado."
  echo "   Copie manualmente os workspaces para ~/.openclaw/"
fi

# ------------------------------------------------------------
# 4. Copiar config + criar .env
# ------------------------------------------------------------
echo "[4/5] Configurando openclaw.json e .env..."

if [ -f "$INFRA_DIR/openclaw.json" ]; then
  cp "$INFRA_DIR/openclaw.json" "$OPENCLAW_DIR/openclaw.json"
  echo "   ✓ openclaw.json copiado"
else
  echo "   ⚠ openclaw.json não encontrado em $INFRA_DIR"
fi

# Copiar .env do .tokens se disponível, senão criar template
if [ -f "$INFRA_DIR/.tokens" ]; then
  # Gerar .env a partir dos tokens reais
  cat > "$OPENCLAW_DIR/.env" << 'ENVEOF'
# API Keys - PREENCHER COM SUAS CHAVES
ANTHROPIC_API_KEY=sk-ant-CHANGE_ME
OPENAI_API_KEY=sk-CHANGE_ME

# Gateway
OPENCLAW_GATEWAY_TOKEN=openclaw-local-dev-2026
ENVEOF
  # Append bot tokens do .tokens
  grep "^DISCORD_BOT_" "$INFRA_DIR/.tokens" >> "$OPENCLAW_DIR/.env"
  echo "   ✓ .env criado com tokens Discord reais"
  echo "   ⚠ EDITAR: Adicionar ANTHROPIC_API_KEY e OPENAI_API_KEY!"
else
  cat > "$OPENCLAW_DIR/.env" << 'ENVEOF'
# API Keys
ANTHROPIC_API_KEY=sk-ant-CHANGE_ME
OPENAI_API_KEY=sk-CHANGE_ME

# Gateway
OPENCLAW_GATEWAY_TOKEN=openclaw-local-dev-2026

# Discord Bot Tokens - PREENCHER
DISCORD_BOT_BACKSTAGE=CHANGE_ME
DISCORD_BOT_DATA=CHANGE_ME
DISCORD_BOT_REVIEW=CHANGE_ME
DISCORD_BOT_OPS=CHANGE_ME
DISCORD_BOT_PESSOAL=CHANGE_ME
ENVEOF
  echo "   ✓ .env template criado — EDITAR com tokens reais!"
fi

chmod 600 "$OPENCLAW_DIR/.env"

# ------------------------------------------------------------
# 5. Verificar setup
# ------------------------------------------------------------
echo "[5/5] Verificando..."
echo ""

echo "Estrutura final:"
ls -la "$OPENCLAW_DIR/" 2>/dev/null
echo ""
echo "Workspaces:"
for agent in backstage data review ops pessoal; do
  echo "  workspace-$agent/:"
  ls "$OPENCLAW_DIR/workspace-$agent/" 2>/dev/null || echo "    (vazio)"
done

echo ""
echo "============================================================"
echo "SETUP COMPLETO!"
echo "============================================================"
echo ""
echo "Discord já configurado:"
echo "  ✓ Servidor: OpenClaw HQ (1474803246022266911)"
echo "  ✓ 5 bots criados e autorizados"
echo "  ✓ Canais criados com categorias"
echo ""
echo "PRÓXIMO PASSO:"
echo "  1. Editar ~/.openclaw/.env com suas API keys:"
echo "     nano ~/.openclaw/.env"
echo "     → Preencher ANTHROPIC_API_KEY"
echo "     → Preencher OPENAI_API_KEY (opcional)"
echo ""
echo "  2. Iniciar o gateway:"
echo "     cd ~/.openclaw && openclaw gateway"
echo ""
echo "  3. Diagnosticar problemas:"
echo "     openclaw doctor"
echo "     openclaw channels status --probe"
echo "     openclaw agents list --bindings"
echo ""
