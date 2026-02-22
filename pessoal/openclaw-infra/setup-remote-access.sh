#!/bin/bash
# ============================================================
# setup-remote-access.sh — One-time SSH + Tailscale setup for WSL2
# Run INSIDE WSL2. Enables direct access from Mac via Tailscale.
#
# Usage:
#   bash setup-remote-access.sh "ssh-ed25519 AAAA... your-mac-pubkey"
# ============================================================

set -e

MAC_PUBKEY="${1:-}"
CURRENT_USER="$(whoami)"

echo "=== OpenClaw Remote Access Setup ==="
echo "User: $CURRENT_USER"
echo ""

# ── 1. Install openssh-server ──────────────────────────────
echo "[1/6] Installing openssh-server..."
if dpkg -l 2>/dev/null | grep -q "ii  openssh-server"; then
  echo "  Already installed"
else
  sudo apt-get update -qq && sudo apt-get install -y -qq openssh-server
fi

sudo ssh-keygen -A 2>/dev/null || true

# ── 2. Configure sshd ─────────────────────────────────────
echo "[2/6] Configuring sshd (key-only auth)..."
sudo tee /etc/ssh/sshd_config.d/openclaw.conf > /dev/null << 'SSHEOF'
# OpenClaw remote access — key-only, hardened
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
ChallengeResponseAuthentication no
X11Forwarding no
SSHEOF
echo "  /etc/ssh/sshd_config.d/openclaw.conf created"

# ── 3. Add Mac's public key ────────────────────────────────
echo "[3/6] Setting up authorized_keys..."
mkdir -p ~/.ssh && chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys

if [ -n "$MAC_PUBKEY" ]; then
  if grep -qF "$MAC_PUBKEY" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "  Key already present"
  else
    echo "$MAC_PUBKEY" >> ~/.ssh/authorized_keys
    echo "  Public key added"
  fi
else
  echo "  WARNING: No public key provided."
  echo "  Run on Mac: cat ~/.ssh/id_ed25519.pub"
  echo "  Then re-run: bash setup-remote-access.sh 'ssh-ed25519 AAAA...'"
  echo "  Or manually add to ~/.ssh/authorized_keys"
fi

# ── 4. Enable and start sshd ──────────────────────────────
echo "[4/6] Enabling sshd..."
sudo systemctl enable ssh 2>/dev/null || true
sudo systemctl restart ssh
echo "  sshd running on port 22"

# ── 5. Install Tailscale ──────────────────────────────────
echo "[5/6] Installing Tailscale..."
if command -v tailscale &>/dev/null; then
  echo "  Already installed: $(tailscale version 2>/dev/null | head -1)"
else
  curl -fsSL https://tailscale.com/install.sh | sh
fi

sudo systemctl enable tailscaled 2>/dev/null || true
sudo systemctl start tailscaled 2>/dev/null || true

# Check if already authenticated
if tailscale status &>/dev/null; then
  TS_IP=$(tailscale ip -4 2>/dev/null || echo "unknown")
  echo "  Tailscale already connected: $TS_IP"
else
  echo ""
  echo "  Tailscale installed but NOT authenticated."
  echo "  Run: sudo tailscale up --ssh"
  echo "  Then note IP: tailscale ip -4"
fi

# ── 6. Enable linger for user services ─────────────────────
echo "[6/6] Enabling loginctl linger for $CURRENT_USER..."
sudo loginctl enable-linger "$CURRENT_USER" 2>/dev/null || true
echo "  Linger enabled — user services run at boot"

# ── Summary ────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "SETUP COMPLETE"
echo "============================================================"
echo ""
echo "Status:"
echo "  SSH:       $(systemctl is-active ssh 2>/dev/null || echo 'unknown')"
echo "  Tailscale: $(systemctl is-active tailscaled 2>/dev/null || echo 'unknown')"
echo "  Linger:    $(loginctl show-user "$CURRENT_USER" 2>/dev/null | grep Linger || echo 'unknown')"
echo ""

if ! tailscale status &>/dev/null; then
  echo "NEXT STEPS:"
  echo ""
  echo "1. Authenticate Tailscale:"
  echo "   sudo tailscale up --ssh"
  echo ""
  echo "2. Note your WSL2 Tailscale IP:"
  echo "   tailscale ip -4"
  echo ""
  echo "3. On Mac, install Tailscale:"
  echo "   brew install --cask tailscale"
  echo "   (open app, sign in with same account)"
  echo ""
  echo "4. On Mac, add to ~/.ssh/config:"
  echo "   Host wsl2"
  echo "     HostName <WSL2_TAILSCALE_IP>"
  echo "     User $CURRENT_USER"
  echo "     IdentityFile ~/.ssh/id_ed25519"
  echo "     AddKeysToAgent yes"
  echo "     UseKeychain yes"
  echo "     ServerAliveInterval 30"
  echo "     ServerAliveCountMax 3"
  echo ""
  echo "5. Test from Mac:"
  echo "   ssh wsl2 'echo hello from WSL2'"
  echo "   ./ops.sh status"
else
  TS_IP=$(tailscale ip -4 2>/dev/null || echo "<IP>")
  echo "READY! On Mac, add to ~/.ssh/config:"
  echo ""
  echo "  Host wsl2"
  echo "    HostName $TS_IP"
  echo "    User $CURRENT_USER"
  echo "    IdentityFile ~/.ssh/id_ed25519"
  echo "    AddKeysToAgent yes"
  echo "    UseKeychain yes"
  echo "    ServerAliveInterval 30"
  echo "    ServerAliveCountMax 3"
  echo ""
  echo "Then test: ssh wsl2 'echo hello'"
fi
