# Rollback Runbook

> This document describes the rollback procedure for the HungerCues / Baby Tracker backend.
> Every release must have a tested rollback path before going live.

---

## When to Rollback

Trigger a rollback if **any** of the following occur within 30 minutes of a deploy:
- Error rate on `/health` rises above 1% sustained
- UptimeRobot alerts on 2+ consecutive failed health checks
- Sentry shows a new crash-level exception affecting core flows (auth, feeding, sleep)
- Database connection errors appear in logs
- Any P0/P1 user-reported issue confirmed in production

---

## Backend Rollback (Docker / Hetzner)

### Option A — Redeploy previous image (preferred)

The CD pipeline tags every image with both `latest` and the Git SHA.
To roll back to the previous release:

```bash
# SSH into the VPS
ssh deploy@<HETZNER_HOST>
cd /opt/baby-tracker

# Find the previous image SHA from the GitHub Actions run history,
# or from the container registry:
# ghcr.io/<owner>/baby-tracker-backend:<previous-sha>

# Edit docker-compose.prod.yml → change the backend image tag to the previous SHA
# Then:
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Verify
curl -sf http://localhost:8000/health
```

### Option B — Git revert + redeploy via CI

```bash
# Locally:
git revert HEAD --no-edit
git push origin main
# CI/CD will trigger automatically and deploy the reverted commit
```

---

## Database Migration Rollback

If the new release included a database migration that must be reversed:

```bash
# SSH into VPS
ssh deploy@<HETZNER_HOST>
cd /opt/baby-tracker

# Run Alembic downgrade (one step back)
docker compose -f docker-compose.prod.yml run --rm backend alembic downgrade -1

# Then redeploy the previous backend image (Option A above)
```

> [!CAUTION]
> **Always take a manual pg_dump backup BEFORE running a migration downgrade.**
> Data written after the migration but before the downgrade may be lost.

```bash
# Take emergency backup before downgrading
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U postgres baby_tracker | gzip > /opt/backups/emergency-$(date +%Y%m%d-%H%M%S).sql.gz
```

---

## Mobile App Rollback

Since we target dev builds first, rollback = simply distributing the previous EAS build.

1. Go to [expo.dev](https://expo.dev) → your project → Builds
2. Find the previous successful build
3. Download the `.apk` / `.ipa` and redistribute to testers

For production App Store / Play Store releases (future):
- iOS: Use Apple's phased release controls to halt rollout
- Android: Use Google Play's "Halt rollout" button

---

## Verification After Rollback

Run the smoke test against production:

```bash
./scripts/smoke-test.sh https://<your-domain>
```

Expected output: all checks `✓ PASS`, exit code 0.

---

## Incident Timeline Template

| Time | Action | Who |
|------|--------|-----|
| HH:MM | Issue detected (Sentry alert / UptimeRobot) | On-call |
| HH:MM | Decision to rollback made | Lead |
| HH:MM | Rollback started | On-call |
| HH:MM | Rollback complete, health check passing | On-call |
| HH:MM | Users notified (if applicable) | Lead |
| HH:MM | Post-mortem scheduled | Lead |

---

## Key Contacts & Links

- **Sentry Dashboard**: https://sentry.io/organizations/<org>/
- **UptimeRobot**: https://uptimerobot.com/
- **GitHub Actions runs**: https://github.com/<owner>/HungerCues/actions
- **Container Registry**: https://github.com/<owner>/HungerCues/pkgs/container/baby-tracker-backend
