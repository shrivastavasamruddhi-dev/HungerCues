#!/usr/bin/env bash
# =============================================================================
# Smoke test — runs after every production or staging deploy.
# Usage: ./scripts/smoke-test.sh [BASE_URL]
# Default BASE_URL: http://localhost:8000
# =============================================================================
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"
PASS=0
FAIL=0

# Helper: print coloured pass/fail
ok()   { echo -e "\033[32m✓ PASS\033[0m  $1"; ((PASS++)) || true; }
fail() { echo -e "\033[31m✗ FAIL\033[0m  $1"; ((FAIL++)) || true; }

echo ""
echo "========================================="
echo "  Baby Tracker — Smoke Test"
echo "  Target: $BASE_URL"
echo "========================================="
echo ""

# --- 1. Health check ----------------------------------------------------------
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/health" || echo "000")
if [ "$STATUS" = "200" ]; then
  ok "GET /health → 200"
else
  fail "GET /health → $STATUS (expected 200)"
fi

# --- 2. Health check body contains status:ok ----------------------------------
BODY=$(curl -sf "${BASE_URL}/health" 2>/dev/null || echo "{}")
if echo "$BODY" | grep -q '"status".*"ok"'; then
  ok "GET /health body contains status:ok"
else
  fail "GET /health body missing status:ok — got: $BODY"
fi

# --- 3. Docs are hidden in production ----------------------------------------
# In production ENVIRONMENT the /docs endpoint should return 404
DOC_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/docs" 2>/dev/null || echo "000")
if [ "$DOC_STATUS" = "404" ] || [ "$DOC_STATUS" = "000" ]; then
  ok "GET /docs → 404 (docs disabled)"
elif [ "$DOC_STATUS" = "200" ]; then
  # 200 is acceptable in dev; treat as warning not failure
  echo -e "\033[33m⚠ WARN\033[0m  GET /docs → 200 (docs visible — expected only in dev)"
else
  fail "GET /docs → unexpected status $DOC_STATUS"
fi

# --- 4. Auth endpoint reachable (should return 401 without token) ------------
AUTH_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/auth/me" || echo "000")
if [ "$AUTH_STATUS" = "401" ] || [ "$AUTH_STATUS" = "403" ]; then
  ok "GET /api/v1/auth/me → $AUTH_STATUS (auth guard active)"
else
  fail "GET /api/v1/auth/me → $AUTH_STATUS (expected 401/403)"
fi

# --- 5. Security headers present on response ----------------------------------
HEADERS=$(curl -sI "${BASE_URL}/health" 2>/dev/null || echo "")
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
  ok "Security header X-Content-Type-Options present"
else
  fail "Security header X-Content-Type-Options missing"
fi

if echo "$HEADERS" | grep -qi "x-frame-options"; then
  ok "Security header X-Frame-Options present"
else
  fail "Security header X-Frame-Options missing"
fi

if echo "$HEADERS" | grep -qi "x-request-id"; then
  ok "Request ID header X-Request-ID present"
else
  fail "Request ID header X-Request-ID missing"
fi

# --- Summary ------------------------------------------------------------------
echo ""
echo "========================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "========================================="
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
