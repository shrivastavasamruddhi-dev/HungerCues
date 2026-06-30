#!/usr/bin/env bash
# =============================================================================
# VPS Bootstrap Script — Baby Tracker / HungerCues
#
# Run once on a freshly provisioned Hetzner VPS (Ubuntu 22.04 / Debian 12).
# Usage: bash <(curl -sSL https://raw.githubusercontent.com/<owner>/HungerCues/main/scripts/bootstrap-vps.sh)
# Or:    scp scripts/bootstrap-vps.sh root@<VPS_IP>:~ && ssh root@<VPS_IP> bash bootstrap-vps.sh
#
# What this does:
#   1. Creates a non-root deploy user
#   2. Hardens SSH (disable root login, disable password auth)
#   3. Configures UFW firewall (22, 80, 443 only)
#   4. Installs Docker + Docker Compose
#   5. Installs AWS CLI (for R2 backups)
#   6. Creates app directory structure
#   7. Sets up cron for daily backups
# =============================================================================
set -euo pipefail

DEPLOY_USER="deploy"
APP_DIR="/opt/baby-tracker"

echo "════════════════════════════════════════════"
echo "  Baby Tracker — VPS Bootstrap"
echo "════════════════════════════════════════════"

# ── 1. System update ──────────────────────────────────────────────────────────
echo "→ Updating system packages..."
apt-get update -q && apt-get upgrade -y -q

# ── 2. Create deploy user ─────────────────────────────────────────────────────
if ! id "$DEPLOY_USER" &>/dev/null; then
  echo "→ Creating user: $DEPLOY_USER"
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER" 2>/dev/null || true
fi

# Copy SSH authorized_keys from root to deploy user
mkdir -p /home/$DEPLOY_USER/.ssh
cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/authorized_keys 2>/dev/null || true
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh
chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys

# ── 3. Harden SSH ─────────────────────────────────────────────────────────────
echo "→ Hardening SSH..."
sed -i 's/#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl restart sshd

# ── 4. UFW Firewall ───────────────────────────────────────────────────────────
echo "→ Configuring UFW firewall..."
apt-get install -y -q ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP (redirect to HTTPS)"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable

# ── 5. Install Docker ─────────────────────────────────────────────────────────
echo "→ Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | bash
fi
systemctl enable docker
systemctl start docker
usermod -aG docker "$DEPLOY_USER"

# ── 6. Install AWS CLI (for R2 backups) ───────────────────────────────────────
echo "→ Installing AWS CLI..."
if ! command -v aws &>/dev/null; then
  apt-get install -y -q awscli
fi

# ── 7. Create app directory ───────────────────────────────────────────────────
echo "→ Setting up app directory: $APP_DIR"
mkdir -p "$APP_DIR"
chown -R $DEPLOY_USER:$DEPLOY_USER "$APP_DIR"

mkdir -p /opt/backups
chown -R $DEPLOY_USER:$DEPLOY_USER /opt/backups

mkdir -p /var/log
touch /var/log/baby-tracker-backup.log
chown $DEPLOY_USER:$DEPLOY_USER /var/log/baby-tracker-backup.log

# ── 8. Setup backup cron ──────────────────────────────────────────────────────
echo "→ Installing backup cron job (runs daily at 02:00 UTC)..."
CRON_LINE="0 2 * * * /opt/baby-tracker/scripts/backup-db.sh >> /var/log/baby-tracker-backup.log 2>&1"
(crontab -u "$DEPLOY_USER" -l 2>/dev/null | grep -v "backup-db"; echo "$CRON_LINE") \
  | crontab -u "$DEPLOY_USER" -

echo ""
echo "════════════════════════════════════════════"
echo "  Bootstrap complete!"
echo ""
echo "  Next steps:"
echo "  1. Add deploy SSH key to GitHub Secrets (HETZNER_SSH_KEY)"
echo "  2. Push to main branch → CD pipeline will deploy"
echo "  3. For first deploy, run manually:"
echo "     su - $DEPLOY_USER"
echo "     cd $APP_DIR"
echo "     git clone https://github.com/<owner>/HungerCues.git ."
echo "     cp .env.example .env   # then fill in real values"
echo "     docker compose -f docker-compose.prod.yml up -d"
echo "     docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head"
echo "  4. Configure Nginx: update nginx/conf.d/app.conf with your domain"
echo "  5. Run Certbot to get SSL cert:"
echo "     docker compose -f docker-compose.prod.yml run --rm certbot certonly \\"
echo "       --webroot -w /var/www/certbot -d <YOUR_DOMAIN>"
echo "════════════════════════════════════════════"
