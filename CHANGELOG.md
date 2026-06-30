# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Production readiness hardening:
  - Security HTTP headers middleware (HSTS, CSP, X-Content-Type-Options, X-Frame-Options)
  - Request ID middleware — every request gets a unique `X-Request-ID` header
  - Rate limiting on auth endpoints (20 req/min) and AI endpoints (10 req/min) via `slowapi`
  - CORS restricted to configurable allowlist (`ALLOWED_ORIGINS` env var) in production
  - API docs (`/docs`, `/redoc`, `/openapi.json`) disabled in production
  - Sentry error tracking integration (backend)
- CI/CD pipeline:
  - GitHub Actions CI: ruff lint, ruff format check, pip-audit, pytest on every PR
  - GitHub Actions CD: Docker build → push to GHCR → SSH deploy to Hetzner
  - Dependabot for Python, npm, and GitHub Actions updates
- Developer tooling:
  - `pytest-cov` with 70% minimum coverage threshold
  - `pip-audit` for dependency vulnerability scanning
  - Post-deploy smoke test script (`scripts/smoke-test.sh`)

---

## [0.1.0] — 2026-06-30

### Added
- Baby Tracker MVP backend:
  - Firebase authentication with token verification
  - Family management (create, invite, join)
  - Baby profiles (create, edit)
  - Feeding tracking (breastfeeding, bottle, pumping)
  - Sleep tracking (manual + live timer with cycle notifications)
  - Diaper tracking
  - Growth records and milestones
  - AI insights via Gemini 2.5 Pro (parenting insights, weekly summary, Q&A)
  - Push notifications via FCM
  - Cloudflare R2 storage integration
- React Native / Expo mobile app (Android + iOS)
- Docker + docker-compose development environment

---

[Unreleased]: https://github.com/raghvendras0612/HungerCues/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/raghvendras0612/HungerCues/releases/tag/v0.1.0
