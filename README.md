# Self-Optimizing API Performance Monitoring System

The installable CLI now includes the **Phase 9 product dashboard and declarative scenario runner**. It runs beside the generic proxy, independently of the original demo below. Start your upstream, run `autotuner serve --config examples/adaptive-demo.json`, then open `autotuner dashboard --config examples/adaptive-demo.json` in another terminal. The product dashboard is at `http://127.0.0.1:8080/_autotuner/dashboard`; the proxy root continues forwarding to your upstream.

See the [Phase 9 review guide](docs/product/PHASE_09_DASHBOARD_SCENARIOS.md) for complete install/start/test commands, generic scenario syntax, bounds and review steps. Browser assets have no build step or Node dependency. Optional developer JavaScript checks run with `node --test tests/workflow.test.cjs tests/product_ui.test.cjs`; pytest skips the two Python/JavaScript integrations when Node is absent. The historical demo sections below describe port 8000, not the product console.

FastAPI backend with persistent business APIs, request monitoring, adaptive response caching, and baseline-based regression analysis. The Python backend is the current implementation; the original Express source remains in the repository for historical reference.

## One-click start (Windows)

After installing dependencies once, double-click `start.bat` or run it from Command Prompt. It uses `.venv` when present, starts FastAPI from the project root, waits for startup, then opens the dashboard in your browser. The frontend is bundled with the backend, so no separate frontend server is needed. Keep the terminal open; press Ctrl+C there to stop.

If port 8000 is occupied, stop the existing server or run `start.bat --port 8001`. Use `start.bat --no-browser` to start without opening a tab.

## Quick start

Python 3.11 or newer is required. Run from the repository root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e ".[test]"
# Optional: create a NEW database with a realistic reporting workload before starting.
python scripts/seed_demo.py --orders 50000
python -m uvicorn autotuner.main:create_app --factory --host 127.0.0.1 --port 8000
```

Linux/macOS: activate with `source .venv/bin/activate`. The seed command refuses to overwrite an existing database. Seeding is optional: without it the service creates an empty database and records can be created through the API.

Open the [dashboard](http://127.0.0.1:8000) and [interactive API documentation](http://127.0.0.1:8000/docs). Cache controls work without a token or login. Anyone who can reach the server can change cache settings. Business APIs are public demo APIs; use local binding as shown.

## Dashboard

The root URL serves a responsive dashboard with persistent light/dark theme selection and a Getting started guide tab. Overview, API playground, Cache & insights, and Getting started have separate views with matching active navigation and browser history. It includes a charcoal-and-sage monitoring workspace with live monitoring, percentile bars, a cache-offload meter, selectable time windows, pause/refresh controls, and an API playground for all 13 business operations. Inspect response JSON, status, client timing and cache headers; repeat GET requests six times to observe learning. A session-only history retains the last 20 playground requests.

The cache panel shows policies, TTLs, occupancy and decisions, with directly available mode and invalidation controls. POST and PATCH requests modify real business data. Monitoring polls do not generate business traffic. Browser client timings and server latency metrics are labeled separately.

## Automated playground workflows

In API playground, use **Automated API workflows** to preview and run a sequential scenario:

- **Full business lifecycle:** creates a unique user and product, uses returned IDs to create an order, covers all 13 business method/path operations, observes repeated reads, checks updates/report freshness and original order prices, then pays and ships the order. Optional expected 409/422 checks are counted as successful assertions.
- **Read-only cache observation:** repeats user, product, order and sales-report reads using existing data.

Configure 1-5 cycles, 1-30 reads per group and 0-2000 ms pacing. Adaptive mode can optionally be enabled before running; otherwise the existing global mode is respected. Each step logs method, URL, expected/actual status, client timing, cache header and response data. Unexpected failures stop dependencies immediately. Export the latest run as JSON for review.

Stop waits for the current request to finish and prevents further steps. Completed writes persist: the full scenario creates one user, one product and one shipped order per cycle, with no automatic deletion. Intentional 4xx requests increase monitored error rates. This runner exercises correctness and cache feedback; use the separate benchmark for concurrent load-performance claims.

Browser code needs no Node installation. Developers can run `node --test tests/workflow.test.cjs` for nine engine tests. When Node is available, pytest also runs the JavaScript workflow against the actual ASGI application through a pipe bridge; it skips that one integration check otherwise. CI installs Node and runs both suites.

## Implemented operations

| Resource | Operations |
| --- | --- |
| Users | GET/POST `/api/users`; GET/PATCH `/api/users/{item_id}` |
| Products | GET/POST `/api/products`; GET/PATCH `/api/products/{item_id}` |
| Orders | GET/POST `/api/orders`; GET `/api/orders/{item_id}`; PATCH `/api/orders/{item_id}/status` |
| Reports | GET `/api/reports/sales` |

All 13 business method/path operations are monitored. Lists support `limit` (1-100) and `offset`. Prices are integer cents from 1 to 1,000,000,000. IDs and pagination are bounded to avoid database integer overflow. Orders snapshot the product price at creation. Valid transitions are pending -> paid/cancelled and paid -> shipped/cancelled; repeating the current status is allowed. Foreign keys, duplicate email conflicts, strict request validation, pagination, and not-found behavior are covered by tests.

| Monitoring/control | Behavior |
| --- | --- |
| GET `/health` | Liveness; uncached and excluded from business metrics |
| GET `/metrics?window=60` | Count, RPS, p50/p95/p99, errors, server errors, and cache hits, per operation and overall |
| GET `/metrics/comparison` | Cache-hit versus origin server durations per route; null improvement until both cohorts exist |
| GET `/analysis` | Origin regression alerts, adaptive policies, bounded decision history |
| PUT `/cache/mode` | Body `{"mode":"off"}` or `{"mode":"adaptive"}` |
| DELETE `/cache` | Clear stored responses; no token required |

## How optimization works

Only explicitly registered public GET operations use the cache. Requests with Authorization or Cookie headers bypass shared caching. Keys include the path and query parameters; duplicate parameter order is preserved. Cached JSON receives `X-Cache: HIT`, `MISS`, or `BYPASS` and `Cache-Control: no-store` to prevent downstream stale caches.

The cache starts cold in adaptive mode. Each route retains the latest 20 origin observations. After at least four observations, a mean origin duration of at least 2 ms, reuse of the current key, and zero observed failures enable caching. TTL scales with origin latency, bounded to 2-30 seconds. A 5-second policy cooldown limits oscillation; origin failures bypass the cooldown to disable an active policy. An active policy uses a 1.5 ms lower disable threshold (versus 2 ms for activation) to avoid oscillation. Reuse evidence expires after 60 seconds. Fast or low-reuse workloads disable it after new origin observations. Expiry provides new origin samples; cache hits never dilute origin latency measurements. Policies, automatic enable/disable/TTL decisions, bottleneck alerts and contention counters appear in `/analysis` and the Cache & insights view.

The response cache and reuse history each hold at most 256 keys, and decision history holds at most 100 entries. Per-key locks coalesce cold misses while independent reads run concurrently through an eight-worker origin semaphore. Hot hits bypass the origin queue. Writes serialize separately, invalidate only dependent resources, and use generation checks to prevent stale in-flight reads from refilling the cache. SQLite work runs in worker threads; policy samples measure origin execution without queue delay. A persistent covering index accelerates the sales-report join.

Monitoring wraps all business processing, including malformed JSON, validation failures, not-found responses, cache hits, and handled database failures. Routes use templates rather than raw IDs. Metrics retain at most 10,000 completed observations. RPS divides observed requests by the complete requested window; capped retention can undercount a high-volume window. Latency measures server processing through response transmission to ASGI, not client network round-trip time. Error rate includes 4xx and 5xx; server-error rate includes 5xx only. Percentiles use nearest rank.

Regression analysis compares the latest five successful origin observations with the preceding five for the same method and route. An alert requires both a >=1.5x mean duration increase and at least 5 ms absolute increase, with both cohorts inside the last five minutes. These are disjoint sample cohorts within retained history, not a persisted historical baseline. Cache comparisons are observational and may mix query variants; use the controlled benchmark for causal performance evidence.

## Tests and benchmark

```powershell
python -m pytest
python scripts/benchmark.py --orders 50000 --requests 120 --concurrency 8 --repeats 3
```

Coverage includes every Python module in `autotuner`, with branch reporting and an enforced 90% combined coverage floor. The benchmark starts fresh single-worker HTTP servers, uses real SQL sales aggregation without artificial sleeps, alternates baseline/adaptive order, validates response hashes and status codes, and saves raw client timings plus cache decisions to `benchmarks/latest.json`. Adaptive rounds include cold policy learning. It exits unsuccessfully if the median mean-latency reduction is below 20%.

**Evidence:** Phase-specific current results are in `docs/product/phase_09_validation.json`. Earlier demo results and the retained user-run HTTP benchmark (73.54% median mean-latency reduction for its workload) predate the product proxy; they are not current product performance evidence. See [test guide](docs/TEST_GUIDE.md) and [delivery status](docs/IMPLEMENTATION_STATUS.md) for the historical demo boundary.

## Configuration and scope

- `AUTOTUNER_DB`: SQLite path, default `autotuner.sqlite3` in the working directory.
- Deploy with one worker. Metrics, cache, and policies are process-local and reset on restart; business data persists in SQLite.
- This is a local backend engineering demonstration, without business-user authentication, tenant isolation, Redis, shared multi-worker metrics, or production deployment hardening. Add those before exposing private data or scaling to multiple workers.

Source: `autotuner/`; tests: `tests/`; tools: `scripts/`; CI: `.github/workflows/backend.yml`. The original Node routes, dashboard and test scripts target the legacy server and are not the Python validation suite. The [original audit](docs/PROJECT_AUDIT.md) describes the pre-rebuild prototype.

See [tuning review](docs/TUNING_REVIEW.md) for the bottleneck fixes, automatic feedback rules, and isolated SQL measurements. Rerun the HTTP benchmark after these changes; the previous 94.67% result belongs to the earlier implementation.

### Cache bypass diagnostics

Dashboard requests explicitly omit browser credentials so ambient localhost cookies cannot silently bypass the public demo cache. External requests carrying Cookie or Authorization headers still bypass shared caching. These database reads are now counted in origin telemetry and a dedicated credential-bypass counter, while remaining excluded from shared policy learning. `X-Cache-Reason` identifies credentials, disabled caching, hits or origin observation. Policy cards expose sample counts, measured origin mean and activation threshold. Restart the server after updating; historical metrics cannot be retroactively added to the new counters. Empty stored responses can still be normal after writes or TTL expiry, and fast origins may correctly remain uncached.

### Timing and regression precision

Cache expiry, cooldown, origin duration and queue measurements now use `perf_counter`, a monotonic high-resolution clock. On the tested Windows/Python 3.12 environment, the old `monotonic` clock used a 15.625 ms timer while `perf_counter` reports a 100 ns resolution. Sub-millisecond origin durations are retained rather than quantized to zero. Policy cards explain sample collection, fast origins, low reuse, origin failures and cooldown. Regression alerts require both a 1.5x mean increase and at least 5 ms absolute increase across two five-sample cohorts within the last five minutes. This suppresses small changes such as 3.04 to 4.68 ms.

## CLI product development

Phase 1 introduces an executable configuration contract and a reviewed example, separate from the running demo. See [Phase 1 specification and review](docs/product/PHASE_01_SPECIFICATION.md). The generic proxy and installable CLI are future phases; the current demo startup is unchanged.

Phase 2 extracts the reusable core and integrates it with independent backend fixtures. See [Phase 2 core extraction and review](docs/product/PHASE_02_CORE_EXTRACTION.md). Run `python -m pytest tests/test_core.py -o addopts=""` for focused checks.

Phase 3 adds the installable `autotuner` CLI, configuration checks, diagnostics and a control-only session lifecycle. See [Phase 3 CLI review](docs/product/PHASE_03_CLI.md). API forwarding remains Phase 4 work.

Phase 4 adds an observation proxy with bounded upstream concurrency, streamed responses, sanitized errors and route metrics. Start the demo upstream on port 8000, then run `autotuner serve --config examples/proxy-demo.json` on port 8080. Inspect traffic with `autotuner endpoints --config examples/proxy-demo.json --window 300 --json`. Shared response caching remains disabled in this product phase. See [Phase 4 review guide](docs/product/PHASE_04_OBSERVATION_PROXY.md) for supported HTTP behavior, limits and joint tests.

Phase 5 persists bounded telemetry and session history to local SQLite through a bounded background writer. Export JSON/CSV with `autotuner report --config examples/proxy-demo.json --live --format json`, and list history using `autotuner sessions --config examples/proxy-demo.json --json`. After shutdown, omit `--live` to read retained data. Storage paths resolve relative to the configuration file. See [Phase 5 storage and reporting review](docs/product/PHASE_05_STORAGE_REPORTING.md).

Phase 6 adds advisory performance insights: `autotuner insights --config examples/proxy-demo.json --json`. Findings explain upstream latency, recent regressions, errors, admission pressure, telemetry quality and cache policy review opportunities with explicit evidence and thresholds. No cache rule or concurrency change is applied. See [Phase 6 insights review](docs/product/PHASE_06_PERFORMANCE_INSIGHTS.md).

Phase 7 adds opt-in fixed-TTL response caching with origin freshness, privacy/variant checks, bounded LRU/staging, cold-miss coalescing and declared mutation invalidation. Both global `mode: "cache"` and route `policy: "cache"` are required. Existing adaptive declarations remain observation-only until Phase 8. Use the RAM-only upstream and `examples/cache-demo.json` in the [Phase 7 review guide](docs/product/PHASE_07_SAFE_CACHING.md); the original demo intentionally sends no-store responses. Inspect or clear with `autotuner cache explain /api/products --config examples/cache-demo.json --json` and `autotuner cache clear --config examples/cache-demo.json --json`.

Phase 8 enables automatic activation and bounded TTL tuning for approved `policy: "adaptive"` rules in global `mode: "adaptive"`. The controller uses valid upstream cost and recent key reuse, with hysteresis, cooldown and immediate failure rollback. `recommend` evaluates without caching; `off` keeps observation without training/serving. Explain current/candidate decisions with `autotuner cache explain /api/products --config examples/adaptive-demo.json --json`; JSON session reports retain bounded decision history. See the [Phase 8 review guide](docs/product/PHASE_08_ADAPTIVE_TUNING.md). The adaptive demo uses lower workflow-test thresholds; it does not establish a speedup.
