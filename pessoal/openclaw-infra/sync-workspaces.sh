#!/bin/bash
# Sincroniza workspaces, daily-sync e cria diretórios auxiliares
# Rodar de dentro do diretório openclaw-infra

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SHARED_USER="$SCRIPT_DIR/workspaces/shared-USER.md"
OPENCLAW_DIR="$HOME/.openclaw"

# 1. Sincronizar USER.md compartilhado para todos os workspaces locais
for agent in backstage data review ops pessoal; do
  cp "$SHARED_USER" "$SCRIPT_DIR/workspaces/$agent/USER.md"
  echo "✓ USER.md → workspace-$agent"
done

# 2. Copiar workspaces para ~/.openclaw se existir
if [ -d "$OPENCLAW_DIR" ]; then
  for agent in backstage data review ops pessoal; do
    WORKSPACE="$OPENCLAW_DIR/workspace-$agent"
    if [ -d "$WORKSPACE" ]; then
      # Copiar todos os .md do repo para ~/.openclaw (AGENTS.md, SOUL.md, USER.md, MEMORY.md)
      cp "$SCRIPT_DIR/workspaces/$agent/"*.md "$WORKSPACE/"
      echo "✓ Synced workspace-$agent → ~/.openclaw/"
    fi
  done
fi

# 3. Copiar daily-sync para ~/.openclaw
if [ -d "$OPENCLAW_DIR" ]; then
  mkdir -p "$OPENCLAW_DIR/daily-sync"
  cp "$SCRIPT_DIR/daily-sync/"*.js "$OPENCLAW_DIR/daily-sync/" 2>/dev/null
  echo "✓ Synced daily-sync → ~/.openclaw/"
fi

# 4. Copiar cortex-cash-monitor para ~/.openclaw
if [ -d "$OPENCLAW_DIR" ]; then
  mkdir -p "$OPENCLAW_DIR/cortex-cash-monitor"
  cp "$SCRIPT_DIR/cortex-cash-monitor/"*.js "$OPENCLAW_DIR/cortex-cash-monitor/" 2>/dev/null
  echo "✓ Synced cortex-cash-monitor → ~/.openclaw/"
fi

# 4b. Copiar weekly-balance para ~/.openclaw
if [ -d "$OPENCLAW_DIR" ]; then
  mkdir -p "$OPENCLAW_DIR/weekly-balance"
  cp "$SCRIPT_DIR/weekly-balance/"*.js "$OPENCLAW_DIR/weekly-balance/" 2>/dev/null
  echo "✓ Synced weekly-balance → ~/.openclaw/"
fi

# 4c. Copiar tools para ~/.openclaw
if [ -d "$OPENCLAW_DIR" ] && [ -d "$SCRIPT_DIR/tools" ]; then
  mkdir -p "$OPENCLAW_DIR/tools"
  cp "$SCRIPT_DIR/tools/"* "$OPENCLAW_DIR/tools/" 2>/dev/null
  chmod +x "$OPENCLAW_DIR/tools/"* 2>/dev/null
  echo "✓ Synced tools/ → ~/.openclaw/tools/"
fi

# 5. Criar diretórios auxiliares
mkdir -p "$OPENCLAW_DIR/stats" 2>/dev/null
mkdir -p "$OPENCLAW_DIR/logs" 2>/dev/null
echo "✓ Diretórios stats/ e logs/ garantidos"

# 5. Sync reverso: copiar MEMORY.md de ~/.openclaw de volta para o repo (se existir e for mais recente)
if [ -d "$OPENCLAW_DIR" ]; then
  for agent in backstage data review ops pessoal; do
    SRC="$OPENCLAW_DIR/workspace-$agent/MEMORY.md"
    DST="$SCRIPT_DIR/workspaces/$agent/MEMORY.md"
    if [ -f "$SRC" ] && [ -f "$DST" ]; then
      if [ "$SRC" -nt "$DST" ]; then
        cp "$SRC" "$DST"
        echo "✓ MEMORY.md ← workspace-$agent (reverse sync)"
      fi
    fi
  done
fi

echo ""
echo "Done. Todos os workspaces sincronizados."
