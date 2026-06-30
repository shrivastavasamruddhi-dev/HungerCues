import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// =============================================================================
// Baby Tracker — k6 Load Test
// Simulates 100 concurrent users hitting core read endpoints.
//
// Usage:
//   k6 run tests/load/k6_basic.js
//   k6 run --env BASE_URL=https://api.hungercues.com tests/load/k6_basic.js
//
// Targets:
//   - p95 latency < 2000ms
//   - Error rate < 1%
// =============================================================================

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

// Custom metrics
const errorRate = new Rate("errors");
const apiLatency = new Trend("api_latency", true);

export const options = {
  stages: [
    { duration: "30s", target: 20 },   // Ramp up to 20 users
    { duration: "1m",  target: 100 },  // Ramp up to 100 users
    { duration: "2m",  target: 100 },  // Hold at 100 users (peak load)
    { duration: "30s", target: 0 },    // Ramp down
  ],
  thresholds: {
    // 95th percentile response time must be below 2 seconds
    http_req_duration: ["p(95)<2000"],
    // Error rate must be below 1%
    errors: ["rate<0.01"],
    // All checks must pass
    checks: ["rate>0.99"],
  },
};

export default function () {
  const start = Date.now();

  // ── 1. Health check ─────────────────────────────────────────────────────────
  const healthRes = http.get(`${BASE_URL}/health`);
  apiLatency.add(Date.now() - start);

  const healthOk = check(healthRes, {
    "health: status 200": (r) => r.status === 200,
    "health: body has ok": (r) => r.json("status") === "ok",
    "health: has request-id header": (r) =>
      r.headers["X-Request-Id"] !== undefined ||
      r.headers["X-Request-ID"] !== undefined,
  });
  errorRate.add(!healthOk);

  sleep(0.5);

  // ── 2. Auth endpoint without token (should return 401/403 — not 500) ───────
  const authRes = http.get(`${BASE_URL}/api/v1/auth/me`);
  const authOk = check(authRes, {
    "auth: returns 401 or 403 (not 500)": (r) =>
      r.status === 401 || r.status === 403,
    "auth: does not crash server": (r) => r.status < 500,
  });
  errorRate.add(!authOk);

  sleep(0.5);

  // ── 3. Rate limit check — rapid fire to verify limiter responds with 429 ───
  // Only run this occasionally (1 in 20 VUs) to avoid skewing error rate
  if (__VU % 20 === 0) {
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(http.get(`${BASE_URL}/api/v1/auth/me`));
    }
    const anyRateLimited = results.some((r) => r.status === 429);
    // This is informational — not a hard failure
    check({ anyRateLimited }, {
      "rate limiter: responds with 429 under burst": (v) => v.anyRateLimited,
    });
  }

  sleep(1);
}
