# Disaster Recovery Plan — HungerCues / Baby Tracker

## Recovery Objectives

| Metric | Target | Notes |
|--------|--------|-------|
| **RTO** (Recovery Time Objective) | 2 hours | Time from failure detection to service restored |
| **RPO** (Recovery Point Objective) | 24 hours | Maximum acceptable data loss = 1 day's activity logs |

---

## Backup Strategy

### Database (PostgreSQL)
- **Frequency**: Daily at 02:00 UTC via cron job on VPS
- **Method**: `pg_dump` → gzip → upload to Cloudflare R2 (`backups/db/YYYY-MM-DD.sql.gz`)
- **Retention**: 7 daily + 4 weekly + 3 monthly backups
- **Encryption**: R2 server-side encryption enabled

### Application Code
- Full source in GitHub — code is never "at risk"

### Configuration
- All infra config (docker-compose, nginx, prometheus) in repo
- Secrets in GitHub Actions Secrets → never on disk unencrypted

---

## Backup Automation Script

Located at: `scripts/backup-db.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="/tmp/baby_tracker_${DATE}.sql.gz"

# Dump and compress
docker compose -f /opt/baby-tracker/docker-compose.prod.yml exec -T db \
  pg_dump -U postgres baby_tracker | gzip > "$BACKUP_FILE"

# Upload to Cloudflare R2
aws s3 cp "$BACKUP_FILE" "s3://${R2_BUCKET_NAME}/backups/db/${DATE}.sql.gz" \
  --endpoint-url "${R2_ENDPOINT}"

# Clean up local copy
rm -f "$BACKUP_FILE"
echo "Backup complete: backups/db/${DATE}.sql.gz"
```

Add to crontab:
```
0 2 * * * /opt/baby-tracker/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

---

## Disaster Scenarios & Recovery Steps

### Scenario 1: VPS Goes Down (Most Likely)

**Cause**: Hardware failure, network issue, or accidental shutdown.

**Recovery**:
1. Provision a new Hetzner VPS (CX22+)
2. Run server bootstrap script (`scripts/bootstrap-vps.sh`)
3. Clone repo: `git clone https://github.com/<owner>/HungerCues.git /opt/baby-tracker`
4. Restore `.env` from secrets (inject from password manager)
5. Restore database from latest R2 backup:
   ```bash
   aws s3 cp s3://<bucket>/backups/db/<latest>.sql.gz /tmp/restore.sql.gz \
     --endpoint-url $R2_ENDPOINT
   gunzip /tmp/restore.sql.gz
   docker compose -f docker-compose.prod.yml exec -T db \
     psql -U postgres baby_tracker < /tmp/restore.sql
   ```
6. Start stack: `docker compose -f docker-compose.prod.yml up -d`
7. Update DNS to new VPS IP
8. Run smoke test: `./scripts/smoke-test.sh https://<domain>`

**Estimated time**: ~60–90 minutes

---

### Scenario 2: Database Corruption

1. Stop backend: `docker compose -f docker-compose.prod.yml stop backend`
2. Take emergency dump of current (corrupt) state for forensics
3. Restore from latest clean backup (see Scenario 1, step 5)
4. Restart backend
5. Verify with smoke test

---

### Scenario 3: Bad Deployment Breaks Production

See [Rollback Runbook](runbooks/rollback.md).

**Estimated time**: < 15 minutes (image redeploy)

---

## Testing the DR Plan

| Test | Frequency | Procedure |
|------|-----------|-----------|
| Backup file exists | Weekly (automated) | Check R2 for yesterday's backup file |
| Restore test | Monthly | Restore to a local/dev PostgreSQL, verify row counts |
| Full DR drill | Quarterly | Simulate VPS loss on a staging environment |

---

## Contact During Incidents

Document your team contacts and escalation path in a private runbook (not committed to repo).
