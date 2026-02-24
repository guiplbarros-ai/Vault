#!/bin/bash
# ============================================================
# ops.sh — Remote operations for OpenClaw infrastructure
# Runs on Mac, executes commands on WSL2 via SSH (Tailscale)
#
# Usage: ./ops.sh <command> [args]
# ============================================================

set -euo pipefail

# ── Config ──────────────────────────────────────────────────
SSH_HOST="${OPS_SSH_HOST:-wsl2}"
OPENCLAW_DIR="/home/guipl/.openclaw"
INFRA_DIR="/mnt/c/Users/guipl/Documents/Coding/pessoal-repo/pessoal/openclaw-infra"

# Discord webhook for #status notifications
DISCORD_WEBHOOK_OPS="${DISCORD_WEBHOOK_OPS:-https://discord.com/api/webhooks/1475264785506373823/dqfvRWVpaFpqKC3S11xLIukRK1L7FMinRSIHBCp0ilcLA_o_phPx9y944Qw227wxsr1G}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Embed colors
COLOR_OK=5025616       # green
COLOR_FAIL=15158332    # red
COLOR_WARN=16776960    # yellow
COLOR_INFO=5865522     # blue

# ── Helpers ─────────────────────────────────────────────────

run() { ssh "$SSH_HOST" "$@"; }

ok()    { echo -e "  ${GREEN}✓${NC} $*"; }
fail()  { echo -e "  ${RED}✗${NC} $*"; }
info()  { echo -e "  ${CYAN}→${NC} $*"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $*"; }
header() { echo -e "\n${BOLD}── $* ──${NC}"; }

# Discord notification (non-blocking, fire-and-forget)
notify() {
  local title="$1" desc="${2:-}" color="${3:-$COLOR_INFO}"
  [ -z "$DISCORD_WEBHOOK_OPS" ] && return 0
  # Escape quotes in desc for JSON
  desc=$(echo "$desc" | sed 's/"/\\"/g' | tr '\n' ' ')
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  curl -sf -X POST "$DISCORD_WEBHOOK_OPS" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"OpenClaw Ops\",\"embeds\":[{\"title\":\"$title\",\"description\":\"$desc\",\"color\":$color,\"timestamp\":\"$ts\",\"footer\":{\"text\":\"ops.sh\"}}]}" \
    &>/dev/null &
}

# ── Commands ────────────────────────────────────────────────

cmd_status() {
  header "SSH"
  if run "echo ok" &>/dev/null; then
    ok "Connected to WSL2"
  else
    fail "Cannot reach WSL2 via SSH"
    exit 1
  fi

  header "System"
  run "uptime -p 2>/dev/null || uptime"

  header "Tailscale"
  local ts_status
  ts_status=$(run "tailscale status --json 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f\"IP: {d[\"TailscaleIPs\"][0]}  Online: {d[\"Self\"][\"Online\"]}\")' 2>/dev/null" || echo "not running")
  echo "  $ts_status"

  header "Claude Relay"
  local relay_status
  relay_status=$(run "systemctl --user is-active claude-relay 2>/dev/null" || echo "inactive")
  if [ "$relay_status" = "active" ]; then
    ok "systemd: active"
    local health
    health=$(run "curl -sf http://127.0.0.1:18790/health 2>/dev/null" || echo "")
    if [ -n "$health" ]; then
      local uptime queued agents
      uptime=$(echo "$health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('uptime','?'))" 2>/dev/null || echo "?")
      queued=$(echo "$health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('queued','?'))" 2>/dev/null || echo "?")
      agents=$(echo "$health" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('agents',[])))" 2>/dev/null || echo "?")
      ok "health: uptime=${uptime}s  queued=${queued}  agents=${agents}"
    else
      warn "health endpoint not responding"
    fi
  else
    fail "systemd: $relay_status"
  fi

  header "Gateway"
  local gw_pid
  gw_pid=$(run "pgrep -f 'openclaw gateway' 2>/dev/null" || echo "")
  if [ -n "$gw_pid" ]; then
    ok "running (PID $gw_pid)"
  else
    fail "NOT running"
  fi

  header "Daily Sync Timer"
  local timer_status
  timer_status=$(run "systemctl --user is-active daily-sync.timer 2>/dev/null" || echo "inactive")
  if [ "$timer_status" = "active" ]; then
    local next_run
    next_run=$(run "systemctl --user show daily-sync.timer --property=NextElapseUSecRealtime --value 2>/dev/null" || echo "unknown")
    ok "active (next: $next_run)"
  else
    warn "$timer_status"
  fi

  header "Transaction Monitor Timer"
  local txm_status
  txm_status=$(run "systemctl --user is-active tx-monitor.timer 2>/dev/null" || echo "inactive")
  if [ "$txm_status" = "active" ]; then
    local txm_next
    txm_next=$(run "systemctl --user show tx-monitor.timer --property=NextElapseUSecRealtime --value 2>/dev/null" || echo "unknown")
    ok "active (next: $txm_next)"
  else
    warn "$txm_status"
  fi

  header "Weekly Balance Timer"
  local wb_status
  wb_status=$(run "systemctl --user is-active weekly-balance.timer 2>/dev/null" || echo "inactive")
  if [ "$wb_status" = "active" ]; then
    local wb_next
    wb_next=$(run "systemctl --user show weekly-balance.timer --property=NextElapseUSecRealtime --value 2>/dev/null" || echo "unknown")
    ok "active (next: $wb_next)"
  else
    warn "$wb_status"
  fi

  header "Ports"
  run "ss -tlnp 2>/dev/null | grep -E '18789|18790|:22 ' || echo '  no relevant ports'"
}

cmd_restart_relay() {
  header "Restarting Claude Relay"
  run "systemctl --user restart claude-relay"
  info "Waiting 3s for startup..."
  sleep 3

  local status
  status=$(run "systemctl --user is-active claude-relay 2>/dev/null" || echo "failed")
  if [ "$status" = "active" ]; then
    ok "Relay active"
    local health
    health=$(run "curl -sf http://127.0.0.1:18790/health 2>/dev/null" || echo "")
    if [ -n "$health" ]; then
      ok "Health endpoint responding"
      echo "$health" | python3 -m json.tool 2>/dev/null || echo "$health"
      local uptime agents
      uptime=$(echo "$health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('uptime','?'))" 2>/dev/null || echo "?")
      agents=$(echo "$health" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('agents',[])))" 2>/dev/null || echo "?")
      notify "Relay reiniciado" "Status: active | Uptime: ${uptime}s | Agents: ${agents}" $COLOR_OK
    else
      warn "Health endpoint not ready yet (may need more time)"
      notify "Relay reiniciado" "Status: active | Health: not responding yet" $COLOR_WARN
    fi
  else
    fail "Relay failed to start"
    info "Check logs: ./ops.sh logs relay"
    notify "Relay FALHOU ao reiniciar" "Status: $status" $COLOR_FAIL
  fi
}

cmd_restart_gateway() {
  header "Restarting OpenClaw Gateway"
  run "pkill -f 'openclaw gateway' 2>/dev/null || true"
  info "Waiting 2s..."
  sleep 2
  run "mkdir -p $OPENCLAW_DIR/logs"
  run "cd $OPENCLAW_DIR && nohup openclaw gateway > $OPENCLAW_DIR/logs/gateway.log 2>&1 &"
  sleep 3

  local gw_pid
  gw_pid=$(run "pgrep -f 'openclaw gateway' 2>/dev/null" || echo "")
  if [ -n "$gw_pid" ]; then
    ok "Gateway running (PID $gw_pid)"
    notify "Gateway reiniciado" "PID: $gw_pid" $COLOR_OK
  else
    fail "Gateway did NOT start"
    info "Check: ./ops.sh logs gateway"
    notify "Gateway FALHOU ao reiniciar" "Verifique: ops.sh logs gateway" $COLOR_FAIL
  fi
}

cmd_sync() {
  header "Syncing Workspaces"
  info "git pull..."
  run "cd $INFRA_DIR && git pull --rebase 2>&1 || echo '(git pull skipped)'"
  info "sync-workspaces.sh..."
  run "cd $INFRA_DIR && bash sync-workspaces.sh"
  ok "Sync complete"
  notify "Workspaces sincronizados" "git pull + sync-workspaces.sh" $COLOR_OK
}

cmd_deploy() {
  header "Full Deploy"
  notify "Deploy iniciado" "pull > sync > copy > restart" $COLOR_INFO

  info "Step 1/7: git pull"
  run "cd $INFRA_DIR && git pull --rebase 2>&1 || echo '(skipped)'"

  info "Step 2/7: sync workspaces"
  run "cd $INFRA_DIR && bash sync-workspaces.sh"

  info "Step 3/7: copy relay server.js"
  run "cp $INFRA_DIR/claude-relay/server.js $OPENCLAW_DIR/claude-relay/server.js"

  info "Step 3b/7: copy MCP browser config"
  run "cp $INFRA_DIR/claude-relay/mcp-headless-browser.json $OPENCLAW_DIR/claude-relay/mcp-headless-browser.json 2>/dev/null || true"

  info "Step 4/7: copy daily-sync"
  run "cp $INFRA_DIR/daily-sync/daily-sync.js $OPENCLAW_DIR/daily-sync/daily-sync.js 2>/dev/null || true"
  run "cp $INFRA_DIR/daily-sync/daily-sync.service ~/.config/systemd/user/daily-sync.service 2>/dev/null || true"
  run "cp $INFRA_DIR/daily-sync/daily-sync.timer ~/.config/systemd/user/daily-sync.timer 2>/dev/null || true"

  info "Step 4b/7: copy cortex-cash-monitor"
  run "mkdir -p $OPENCLAW_DIR/cortex-cash-monitor"
  run "cp $INFRA_DIR/cortex-cash-monitor/tx-monitor.js $OPENCLAW_DIR/cortex-cash-monitor/tx-monitor.js 2>/dev/null || true"
  run "cp $INFRA_DIR/cortex-cash-monitor/tx-monitor.service ~/.config/systemd/user/tx-monitor.service 2>/dev/null || true"
  run "cp $INFRA_DIR/cortex-cash-monitor/tx-monitor.timer ~/.config/systemd/user/tx-monitor.timer 2>/dev/null || true"

  info "Step 4c/7: copy weekly-balance"
  run "mkdir -p $OPENCLAW_DIR/weekly-balance"
  run "cp $INFRA_DIR/weekly-balance/weekly-balance.js $OPENCLAW_DIR/weekly-balance/weekly-balance.js 2>/dev/null || true"
  run "cp $INFRA_DIR/weekly-balance/weekly-balance.service ~/.config/systemd/user/weekly-balance.service 2>/dev/null || true"
  run "cp $INFRA_DIR/weekly-balance/weekly-balance.timer ~/.config/systemd/user/weekly-balance.timer 2>/dev/null || true"

  info "Step 5/7: copy relay service"
  run "cp $INFRA_DIR/claude-relay/claude-relay.service ~/.config/systemd/user/claude-relay.service 2>/dev/null || true"

  info "Step 6/7: daemon-reload + restart relay + enable timers"
  run "systemctl --user daemon-reload"
  run "systemctl --user restart claude-relay"
  run "systemctl --user enable --now tx-monitor.timer 2>/dev/null || true"
  run "systemctl --user enable --now weekly-balance.timer 2>/dev/null || true"
  sleep 3

  info "Step 7/7: verify"
  local status
  status=$(run "systemctl --user is-active claude-relay 2>/dev/null" || echo "failed")
  if [ "$status" = "active" ]; then
    ok "Relay: active"
  else
    fail "Relay: $status"
  fi

  local health
  health=$(run "curl -sf http://127.0.0.1:18790/health 2>/dev/null" || echo "")
  if [ -n "$health" ]; then
    ok "Health: responding"
    local uptime agents
    uptime=$(echo "$health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('uptime','?'))" 2>/dev/null || echo "?")
    agents=$(echo "$health" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('agents',[])))" 2>/dev/null || echo "?")
    notify "Deploy completo" "Relay: active | Uptime: ${uptime}s | Agents: ${agents}" $COLOR_OK
  else
    warn "Health: not responding yet"
    notify "Deploy completo (com aviso)" "Relay: $status | Health: not responding" $COLOR_WARN
  fi

  info "Step 8/8: smoke test"
  cmd_smoke_test

  ok "Deploy complete"
}

cmd_smoke_test() {
  header "Smoke Test"
  local failures=0

  # 1. Required env vars loaded by relay
  local required_vars="CORTEX_CASH_API_KEY ANTHROPIC_API_KEY OPENCLAW_GATEWAY_TOKEN DISCORD_BOT_PESSOAL DISCORD_WEBHOOK_CORTEX_CASH"
  for var in $required_vars; do
    local val
    val=$(run "grep -c '^${var}=' $OPENCLAW_DIR/.env 2>/dev/null" || echo "0")
    if [ "$val" -gt 0 ]; then
      ok "env: $var"
    else
      fail "env: $var MISSING in .env"
      failures=$((failures + 1))
    fi
  done

  # 2. Tools directory and executables
  if run "test -d $OPENCLAW_DIR/tools" 2>/dev/null; then
    ok "dir: tools/"
    local tools
    tools=$(run "ls $OPENCLAW_DIR/tools/ 2>/dev/null" || echo "")
    for tool in $tools; do
      if run "test -x $OPENCLAW_DIR/tools/$tool" 2>/dev/null; then
        ok "tool: $tool (executable)"
      else
        fail "tool: $tool (not executable)"
        failures=$((failures + 1))
      fi
    done
  else
    fail "dir: tools/ MISSING"
    failures=$((failures + 1))
  fi

  # 3. Workspace directories exist
  for agent in backstage data review ops pessoal; do
    if run "test -d $OPENCLAW_DIR/workspace-$agent" 2>/dev/null; then
      ok "workspace: $agent"
    else
      fail "workspace: $agent MISSING"
      failures=$((failures + 1))
    fi
  done

  # 4. Required system tools
  local sys_tools="curl jq git node"
  for tool in $sys_tools; do
    if run "which $tool" &>/dev/null; then
      ok "sys: $tool"
    else
      fail "sys: $tool NOT FOUND"
      failures=$((failures + 1))
    fi
  done

  # 5. cortex-cash-api connectivity test
  local api_test
  api_test=$(run "export CORTEX_CASH_API_KEY=\$(grep CORTEX_CASH_API_KEY $OPENCLAW_DIR/.env | cut -d= -f2) && curl -sf -o /dev/null -w '%{http_code}' https://cortex-cash.fly.dev/api/financeiro/resumo -H \"Authorization: Bearer \$CORTEX_CASH_API_KEY\" 2>/dev/null" || echo "000")
  if [ "$api_test" = "200" ]; then
    ok "api: cortex-cash (HTTP 200)"
  else
    fail "api: cortex-cash (HTTP $api_test)"
    failures=$((failures + 1))
  fi

  if [ "$failures" -gt 0 ]; then
    warn "$failures issue(s) found — check above"
    notify "Smoke test: $failures issue(s)" "Deploy needs attention" $COLOR_WARN
  else
    ok "All checks passed"
  fi
}

cmd_logs() {
  local service="${1:-relay}"
  header "Logs: $service"

  case "$service" in
    relay|claude-relay)
      run "journalctl --user -u claude-relay --no-pager -n 50 --output=short-iso 2>/dev/null || echo 'no logs found'"
      ;;
    daily-sync|sync)
      run "journalctl --user -u daily-sync --no-pager -n 50 --output=short-iso 2>/dev/null || echo 'no logs found'"
      ;;
    gateway)
      run "tail -50 $OPENCLAW_DIR/logs/gateway.log 2>/dev/null || echo 'no gateway log found'"
      ;;
    tailscale)
      run "sudo journalctl -u tailscaled --no-pager -n 30 --output=short-iso 2>/dev/null || echo 'no logs found'"
      ;;
    *)
      fail "Unknown service: $service"
      echo "  Available: relay, daily-sync, gateway, tailscale"
      exit 1
      ;;
  esac
}

cmd_stats() {
  header "Relay Stats (today)"
  run "curl -sf http://127.0.0.1:18790/v1/stats 2>/dev/null | python3 -m json.tool 2>/dev/null || echo 'Stats not available (relay may be down)'"
}

cmd_exec() {
  # Run arbitrary command on WSL2
  if [ $# -eq 0 ]; then
    fail "Usage: ops.sh exec <command>"
    exit 1
  fi
  run "$@"
}

cmd_ssh() {
  ssh "$SSH_HOST"
}

cmd_notify() {
  local title="${1:-}"
  local desc="${2:-}"
  if [ -z "$title" ]; then
    fail "Usage: ops.sh notify <title> [description]"
    exit 1
  fi
  notify "$title" "$desc" $COLOR_INFO
  ok "Notification sent to #status"
}

cmd_help() {
  echo -e "${BOLD}ops.sh${NC} — Remote operations for OpenClaw (Mac → WSL2 via SSH)"
  echo ""
  echo -e "${BOLD}Usage:${NC} ./ops.sh <command> [args]"
  echo ""
  echo -e "${BOLD}Commands:${NC}"
  echo "  status              Health check all services"
  echo "  restart-relay       Restart claude-relay service"
  echo "  restart-gateway     Kill + restart openclaw gateway"
  echo "  sync                Git pull + sync workspaces"
  echo "  deploy              Full deploy (pull, sync, copy, restart)"
  echo "  logs [service]      View logs (relay|daily-sync|gateway|tailscale)"
  echo "  stats               Relay usage stats for today"
  echo "  smoke-test          Validate env vars, tools, workspaces, connectivity"
  echo "  notify <t> [desc]   Send notification to Discord #status"
  echo "  exec <cmd>          Run arbitrary command on WSL2"
  echo "  ssh                 Interactive SSH session"
  echo "  help                Show this help"
  echo ""
  echo -e "${BOLD}Config:${NC}"
  echo "  SSH_HOST: $SSH_HOST (override with OPS_SSH_HOST env var)"
  echo "  Webhook: #status (DISCORD_WEBHOOK_OPS env var)"
}

# ── Main ────────────────────────────────────────────────────

case "${1:-help}" in
  status)           cmd_status ;;
  restart-relay)    cmd_restart_relay ;;
  restart-gateway)  cmd_restart_gateway ;;
  sync)             cmd_sync ;;
  deploy)           cmd_deploy ;;
  smoke-test)       cmd_smoke_test ;;
  logs)             shift; cmd_logs "$@" ;;
  stats)            cmd_stats ;;
  notify)           shift; cmd_notify "$@" ;;
  exec)             shift; cmd_exec "$@" ;;
  ssh)              cmd_ssh ;;
  help|--help|-h)   cmd_help ;;
  *)
    fail "Unknown command: $1"
    echo ""
    cmd_help
    exit 1
    ;;
esac
