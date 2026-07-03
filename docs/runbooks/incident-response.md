# Incident Response Runbook — HungerCues / Baby Tracker

> **Purpose**: This runbook guides on-call engineers through detecting, containing, and resolving production incidents.

---

## Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|--------------|---------|
| **P1 — Critical** | Full service outage or data loss risk | Immediate | `/health` returning 5xx, DB unreachable |
| **P2 — High** | Severe degradation, major feature broken | < 30 min | Auth failing for >10% of users, AI endpoint down |
| **P3 — Medium** | Minor degradation, workaround available | < 2 hours | Single endpoint slow, non-critical feature broken |
| **P4 — Low** | Cosmetic issue or minor inconvenience | < 24 hours | UI glitch, warning in logs |

---

## Alert Sources

| Source | What it detects |
|--------|----------------|
| **UptimeRobot** | `/health` down for 2 consecutive checks |
| **Sentry** | New exception types, error spikes, crash-level events |
| **Grafana** | p95 latency > 3s, error rate > 1%, container OOM |
| **GitHub Actions** | Failed CD deploy |

---

## Step 1 — Acknowledge & Assess

1. **Acknowledge** the alert in UptimeRobot / Sentry.
2. **Identify scope**: Is it a full outage or partial degradation?
3. **Check Sentry** for exception details and stack trace.
4. **Check Grafana** dashboards for latency/error rate spikes.
5. **Check backend logs**:
   ```bash
   ssh deploy@<HETZNER_HOST>
   cd /opt/baby-tracker
   docker compose -f docker-compose.prod.yml logs --tail=100 backend
   ```

---

## Step 2 — Contain

### If backend is crashing / OOM:
```bash
docker compose -f docker-compose.prod.yml restart backend
```

### If database is unreachable:
```bash
# Check Postgres health
docker compose -f docker-compose.prod.yml ps db
docker compose -f docker-compose.prod.yml logs --tail=50 db

# Restart if healthy but stuck
docker compose -f docker-compose.prod.yml restart db
```

### If disk full (common cause of SQLite / Postgres failures):
```bash
df -h
# Clean old Docker images/logs
docker system prune -f
```

---

## Step 3 — Diagnose

```bash
# Check all container statuses
docker compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats --no-stream

# Check Nginx logs for upstream errors
docker compose -f docker-compose.prod.yml logs --tail=100 nginx
```

---

## Step 4 — Resolve

| Root Cause | Resolution |
|-----------|-----------|
| Bad code deploy | Follow [Rollback Runbook](rollback.md) |
| DB migration failure | `alembic downgrade -1`, then rollback image |
| DB corruption | Restore from R2 backup (see [DR Plan](../disaster-recovery.md)) |
| Memory leak | Restart backend, open GitHub issue, monitor |
| Dependency CVE | Patch + redeploy via `uv add <pkg>==<safe-version>` |

---

## Step 5 — Verify

```bash
# Smoke test after resolution
./scripts/smoke-test.sh https://<your-domain>
```

Expected: all checks **PASS**, exit code 0.

---

## Step 6 — Post-Mortem

For P1 and P2 incidents, create a post-mortem within 48 hours:

1. **Timeline**: When detected, when resolved.
2. **Root cause**: What exactly went wrong.
3. **Impact**: Users affected, data at risk.
4. **Resolution**: What was done to fix it.
5. **Prevention**: What changes prevent recurrence (tests, alerts, code).

Store post-mortems in `docs/runbooks/post-mortems/YYYY-MM-DD-<title>.md`.

---

## Communication Templates

### Initial alert (Slack / email):
```
[P1] Production incident: <brief description>
Detected: <time>
Impact: <what's broken>
Status: Investigating
```

### Resolution notification:
```
[RESOLVED] <incident title>
Duration: <X> minutes
Root cause: <summary>
Follow-up: <post-mortem link>
```

---

## Key Links

- **Sentry Dashboard**: https://sentry.io/organizations/<org>/
- **UptimeRobot**: https://uptimerobot.com/
- **Grafana**: https://<your-domain>/grafana/
- **GitHub Actions**: https://github.com/<owner>/HungerCues/actions
- **Container Registry**: https://github.com/<owner>/HungerCues/pkgs/container/baby-tracker-backend
