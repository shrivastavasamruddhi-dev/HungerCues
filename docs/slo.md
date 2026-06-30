# Service Level Objectives — HungerCues / Baby Tracker

## Definitions

| Term | Definition |
|------|-----------|
| **SLI** (Service Level Indicator) | A quantitative measure of service behavior |
| **SLO** (Service Level Objective) | The target value for an SLI |
| **Error Budget** | 100% minus SLO — the allowable error margin |

---

## SLOs (MVP / Hetzner VPS)

| # | SLI | SLO | Measurement Window | Error Budget |
|---|-----|-----|--------------------|-------------|
| 1 | **Availability** — `GET /health` returns 200 | **99.5%** | 30 days | 3.6 hours/month |
| 2 | **API Latency** — p95 of all `/api/v1/` requests | **< 2,000 ms** | 7 days rolling | — |
| 3 | **Error Rate** — 5xx responses / total responses | **< 0.5%** | 24 hours | — |
| 4 | **Auth Success Rate** — valid token → 200, not 500 | **> 99.9%** | 24 hours | — |

> [!NOTE]
> These are **internal objectives**, not customer-facing SLAs. They guide capacity decisions and postmortems.

---

## Alerting Thresholds

Alerts fire when we are on track to **burn through the error budget faster than planned**:

| Alert | Trigger | Severity |
|-------|---------|----------|
| Health check down | 2 consecutive failures (10 min window) | P1 — page on-call |
| High error rate | 5xx rate > 1% for 5 min | P1 |
| Slow API | p95 latency > 3s for 10 min | P2 |
| Error budget burn | >5% of monthly budget consumed in 1 hour | P2 |

---

## How We Measure

- **Availability**: UptimeRobot pings `/health` every 5 minutes
- **Latency + Error Rate**: Prometheus scrapes `/metrics` every 15s; Grafana dashboards visualize p50/p95/p99
- **Auth Success Rate**: Sentry tracks 5xx exceptions tagged to `auth` router

---

## Review Cadence

- SLOs reviewed monthly in retrospect
- If error budget is >80% consumed → freeze non-critical deploys
- If error budget is <20% consumed → consider tightening SLO or shipping riskier changes

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-30 | Initial SLOs defined for MVP | — |
