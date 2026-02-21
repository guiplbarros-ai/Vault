#!/bin/bash
# Sincroniza USER.md compartilhado para todos os workspaces
# Rodar de dentro do diretório openclaw-infra

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SHARED_USER="$SCRIPT_DIR/workspaces/shared-USER.md"

for agent in backstage data review ops pessoal; do
  cp "$SHARED_USER" "$SCRIPT_DIR/workspaces/$agent/USER.md"
  echo "✓ USER.md → workspace-$agent"
done

# Também copiar para ~/.openclaw se existir
OPENCLAW_DIR="$HOME/.openclaw"
if [ -d "$OPENCLAW_DIR" ]; then
  for agent in backstage data review ops pessoal; do
    WORKSPACE="$OPENCLAW_DIR/workspace-$agent"
    if [ -d "$WORKSPACE" ]; then
      cp "$SCRIPT_DIR/workspaces/$agent/"*.md "$WORKSPACE/"
      echo "✓ Synced workspace-$agent → ~/.openclaw/"
    fi
  done
fi

echo ""
echo "Done. Todos os workspaces sincronizados."
