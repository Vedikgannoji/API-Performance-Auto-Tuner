# Project audit and rebuild proposal

Reviewed 14 November 2026. Scope: repository source, README files, dashboard, test scripts, and historical QA reports. No application behavior changed during this review.

## Current system

This is an Express/CommonJS application, not a FastAPI application. Dependencies are Express, cors, dotenv and development-only nodemon. The frontend is plain HTML/CSS/JavaScript with Chart.js loaded from a CDN. There is no database, Redis client, Python backend, container setup, CI workflow or coverage configuration in this checkout.

| Location | Responsibility |
| --- | --- |
| `server.js` | Starts HTTP listener; exits on unhandled rejection |
| `config/app.js` | Body parsing, static files, middleware ordering, route mounting, 404/error handling |
| `config/config.js` | PORT, NODE_ENV, CORS_ORIGIN |
| `routes/`, `controllers/` | HTTP mapping and response envelopes |
| `services/user.service.js`, `product.service.js`, `order.service.js` | Fixed sample data behind random timer delays; no actual database queries |
| `middleware/performance.middleware.js` | Wraps response end; records duration, method, URL, status and cache flag |
| `services/performance.service.js` | Process-local array; averages, counts, slow requests, cached/uncached comparison |
| `services/analysis.service.js` | Five fixed rules: slow, very slow, repeated slow, cumulative high count, server errors |
| `middleware/cache.middleware.js`, `services/cache.service.js` | GET response cache; process-local Map with fixed URL-dependent TTLs |
| `public/` | Dashboard polls five APIs every 30 seconds; aggregates raw logs for chart |
| Root test files | Standalone HTTP checks and demonstrations requiring an already running server |
| `test_reports/` | Historical narrative reports; not reproducible current validation evidence |

Business data flow on a miss: logging -> cache lookup -> performance wrapper -> route -> controller -> simulated service -> cache response -> record duration -> response end. On a hit: logging -> cache -> response. Performance tracking is bypassed.

## Routes actually present

There are 18 explicitly declared method/path operations, but only THREE business operations are monitored in normal successful usage. Control/observability operations are excluded from monitoring; they do not substantiate 10+ monitored business endpoints.

| Group | Operations |
| --- | --- |
| Business | GET /users; GET /products; GET /orders |
| Health | GET /health |
| Metrics | GET /metrics; GET /metrics/slow; GET /metrics/stats; GET /metrics/comparison; DELETE /metrics |
| Analysis | GET /analysis; GET /analysis/critical; GET /analysis/summary |
| Cache | POST /cache/enable; POST /cache/disable; DELETE /cache/clear; GET /cache/stats; GET /cache/keys; DELETE /cache/:key |

## Resume evidence check

| Claim | Current evidence | Required evidence |
| --- | --- | --- |
| FastAPI backend | Contradicted by Express implementation | Implement and run a Python/FastAPI backend, or change resume technology |
| 10+ monitored endpoints | Three business GET operations | At least ten meaningful business method/path operations with explicit instrumentation tests |
| Latency | Partial: duration, mean/min/max | Include cached responses, failures, validated windowing and p50/p95/p99 |
| Throughput | Request counts only | Completed requests per second over a defined time window |
| Error rates | Rule-based 5xx detection exists | Per-route and aggregate 4xx/5xx rates with defined denominators and tests |
| Regressions | Absolute thresholds only | Baseline versus recent window; minimum samples and deterministic degradation tests |
| Automated unit/API tests | HTTP scripts exist; no isolated unit suite | Deterministic unit and integration tests with reliable failing exit codes |
| 90%+ coverage | No measured coverage evidence | Coverage report and enforced threshold across explicitly enumerated core modules |
| Adaptive caching | Fixed TTL by URL; caches eligible GETs immediately | Metrics-driven enable/disable or TTL decisions with documented rules, bounds and decision history |
| 20%+ under load | Not established by checked-in evidence | Repeatable matched baseline/optimized runs with raw results and stated workload |

Passing 90% of test assertions is not executing 90% of source code. The existing report's 91.8% pass rate cannot support a coverage claim.

## Findings, ordered by impact

1. **Cache hits are invisible to monitoring.** `config/app.js` mounts cache before performance middleware. Verified with actual middleware/services and a minimal request/response harness: MISS then HIT produced two cache lookups but only one performance record. This is a control-flow problem, not delayed asynchronous logging.
2. **Comparison reports gains without both cohorts.** In the same probe, cachedRequests=0 and improvementPercentage=100. Missing cached average defaults to zero. Return an insufficient-data state until both cohorts exist; compare matched routes/workloads rather than pooling unrelated routes.
3. **No adaptive feedback loop.** The analysis service never drives cache policy. The smart cache uses hardcoded TTLs: users 120s, products 180s, orders 90s, otherwise 60s. It starts enabled. Recommendations do not equal automatic optimization.
4. **Workload is simulated.** Users wait 200–399ms, orders 300–599ms, products 500–999ms before returning fixed arrays. Caching avoids these timers. This demonstrates cache mechanics, not database/query optimization. Keep simulation explicitly labeled if retained.
5. **Metrics lack time semantics.** No RPS, percentiles, rolling windows or regression baseline. A second service probe fed 51 requests spread over 50 days; the rule still called this high traffic. Query strings create separate endpoint groups and cache entries rather than normalized route labels.
6. **Storage is process-local and unbounded.** Metrics accumulate forever; cache has no capacity limit. Restart loses state; multiple workers have different metrics and policies. Every dashboard refresh fetches all logs and repeatedly scans them. Expiration cleanup limits old entries eventually, but does not bound active cardinality.
7. **Tests miss correctness.** `test-suite.js` warms cache in basic checks then clears metrics without clearing cache before tracking tests. Comparison absence becomes a warning. Assertions often check field types rather than expected values. No nonzero exit code is set for failed assertions. `test-production-improvements.js` prints a success summary without assertion-based checks and catches errors without setting failure status. Sequential requests are not a controlled load test.
8. **Cache semantics need tightening.** Broad GET caching includes health responses, making timestamp/uptime stale. URL-only keys cannot safely support future user-specific data. Response headers/status are not stored as a full representation. No mutation invalidation, request coalescing, explicit eligibility policy or protection against concurrent cold misses. Disabled requests still get MISS headers, although lookup counters do not count disabled lookups. Clearing cache does not reset hit/miss counters.
9. **Instrumentation starts too late.** JSON parsing happens before performance middleware, so malformed JSON errors bypass monitoring. Response end wrapping measures server handling before the underlying end call, not client round-trip time. Prefix exclusions can also hide unrelated paths such as /metrics-extra.
10. **Management and dashboard need hardening.** Cache toggles and metric deletion have no authorization. Dashboard inserts endpoint/insight strings into innerHTML; URLs originate in requests, so use text nodes/escaping before exposing it. Default CORS is unrestricted. These are source-review findings, not a completed penetration test.
11. **Reproducibility/docs gaps.** No npm test script; package-lock.json is ignored. README clone URL is a placeholder, Redis is described as optional without implementation, and frontend README calls fixed rules AI-powered. Referenced dashboard guides are absent. Historical reports contradict current filtering/delay behavior and contain inconsistent totals; do not treat their production approval or percentages as current evidence.

## Verification performed and limits

- Read application source, route/controller/service structure, READMEs/data-flow docs and test/report material.
- Ran dependency-free Node probes against real cache/performance middleware and services; reproduced findings 1, 2 and the cumulative traffic issue in finding 5.
- Runtime available: Node 24.11.1, npm 11.12.0, Python 3.12.0.
- Dependency installation stalled without completing and was stopped; Express was not available locally. The full HTTP suite and browser rendering were not run and must not be inferred from the service probes.
- No current coverage percentage or valid under-load latency improvement is established by this audit.

## Recommended destination

Since the explicit goal is to substantiate the existing FastAPI resume wording, recommend a deliberate FastAPI rebuild. Preserve this Express implementation as the reference baseline in git; avoid maintaining two production backends. If staying with Express is preferred, correct the resume and use the same acceptance criteria below.

Build a modular monolith: FastAPI routers and schemas, business services, database repositories, request instrumentation, metric aggregation, deterministic analytics and cache policy services. Use SQLite for easy local development and tests, with a clear PostgreSQL production option. Start single-worker with bounded metric storage; introduce Redis for shared caching and multi-worker coordination when that deployment is actually implemented. Keep the dashboard secondary to backend correctness. No ML or microservices are needed.

Suggested meaningful business operations (12): GET/POST /users; GET/PATCH /users/{id}; GET/POST /products; GET/PATCH /products/{id}; GET/POST /orders; GET /orders/{id}; PATCH /orders/{id}/status. Establish validation, persistence, not-found behavior and mutation invalidation. Monitor all 12; cache only explicitly eligible reads. Control/health routes remain separate.

## Work areas and exit criteria

| Area | Work | Exit criterion |
| --- | --- | --- |
| 0: Baseline and specification | Run current guide, record defects, choose metric/error/window definitions and backend direction | Reproducible defect results; agreed contracts |
| 1: Working backend | FastAPI structure, schemas, persistence, 12 business operations, config and error envelopes | Integration tests cover successful and invalid requests for every operation |
| 2: Correct observation | Monotonic durations around all API processing, route templates, cache flags, bounded windows, counts/RPS/error rates/percentiles | Known traffic produces exact counts and independently checked aggregates, including HITs and failures |
| 3: Safe caching | Explicit GET allowlist, bounded TTL/capacity, mutation invalidation, coalescing, failure handling | TTL, isolation, invalidation and concurrent cold-start tests pass |
| 4: Adaptation and regressions | Rules use uncached origin latency, reuse and error signals; adjust bounded TTL/policy with hysteresis; record decision reasons and rollback | Slow/reused workload enables cache; stale/error/unhelpful workload disables or reduces it; no oscillation under boundary tests |
| 5: Quality gate | pytest, HTTPX integration tests, pytest-cov, CI; isolated fixtures and controllable clock | All tests pass, coverage >=90% for declared core code, and branch coverage is reported |
| 6: Benchmark and delivery | Controlled load workload, baseline/optimized repeats, dashboard reconciliation, deployment/readme | Measured >=20% improvement under stated conditions without correctness/error-rate regression; raw artifacts committed |

For adaptation, first specify observation window, minimum samples, thresholds, TTL bounds, cooldown and correctness eligibility. These are design choices to test, not values to guess silently. Evaluate origin latency separately so successful cache hits do not falsely convince the policy that the origin is now fast.

Definition of done: a fresh checkout can start the service, run passing coverage-enforced tests, demonstrate 10+ genuinely monitored operations, trigger explainable adaptive decisions, detect an injected regression, and reproduce the documented performance result. Resume numbers should be retained only after that evidence exists.
