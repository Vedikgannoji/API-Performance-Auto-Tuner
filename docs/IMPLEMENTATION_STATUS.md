# Rebuild delivery status

Updated 14 November 2026. The original audit describes the previous Express prototype. The default documented runtime is now FastAPI; legacy Node files remain untouched for reference.

| Area | Result |
| --- | --- |
| Persistent backend | Complete: SQLite, strict schemas, users/products/orders/sales report; 13 business operations |
| Monitoring | Complete: all business responses, errors and cache hits; normalized route labels; bounded observations; windowed RPS, errors and percentiles |
| Safe cache | Complete: explicit eligible reads, credential bypass, bounded TTL/LRU, mutation invalidation, concurrent miss coordination and cancellation handling |
| Adaptive rules/analytics | Complete: origin latency and reuse drive cache activation/TTL; failure rollback, cooldown, decision history, disjoint-cohort regressions |
| Tests and quality gate | Verified locally: 55 tests pass; 100% statement and branch coverage across all core Python modules; 90% combined floor enforced; CI workflow added but not run remotely |
| Performance evidence | Runner implemented and its correctness contract tested; real HTTP latency reduction remains unverified because sandbox localhost connections are denied |

## Resume evidence

- **FastAPI / 10+ endpoints / monitoring:** implemented and integration-tested across 13 meaningful method/path operations. Controls and health endpoints are not counted.
- **90%+ core coverage:** verified; current suite executes all 451 statements and all 106 branches in the six Python core modules. This is source execution coverage, not a test pass percentage. Tests cannot prove absence of bugs.
- **Adaptive response caching / 20%+ reduction under load:** adaptation and response correctness are tested. The claimed numerical latency gain is pending real HTTP benchmark evidence. Do not treat the resume's 20% claim as substantiated yet.

## Verified and unverified boundaries

The managed Windows sandbox rejects localhost connections with WinError 10013 and prevents the normal Windows asyncio TCP self-pipe from starting. Local test verification used `python scripts/test_socketless.py`, executing the same HTTPX in-process API tests and core tests on a polling event loop. This does not verify Uvicorn networking or client round-trip latency. The benchmark's ASGI contract test is a correctness test, not a load-performance measurement.

Scope is a single-worker local engineering backend. SQLite stores business data durably; metrics, cache and policies are bounded process-local structures. Origin reads use bounded eight-way concurrency and per-key coalescing; writes serialize separately. Generations prevent stale in-flight cache fills, and invalidation is resource-scoped. Database calls run in worker threads, and origin policy timing excludes queue delay. Cross-process invalidation, Redis, PostgreSQL, tenant authentication, persisted metrics, distributed tracing and production deployment hardening are future work. Writes outside this application process can leave cached values stale until TTL expiry.

A wheel build succeeded earlier; it has not been rebuilt after the dashboard and cache-control changes. CLI help, dashboard JavaScript syntax, and whitespace checks passed. The dashboard HTML is served and its data APIs are tested, but visual browser QA has not been run. Existing historical QA reports apply to the old Node backend. Publication is performed only when requested; no deployment has been performed.

## Start and complete the final evidence step

Follow README.md to install, optionally seed, and start the service. Run `python -m pytest` on an unrestricted environment, then run:

```powershell
python scripts/benchmark.py --orders 50000 --requests 120 --concurrency 8 --repeats 3
```

Review `benchmarks/latest.json`, including every round, correctness checks and cache decisions. Retain the 20% resume number only if the actual measured result meets it; scope the claim to the benchmark workload. An insufficient result calls for investigation and another controlled run, never an invented percentage.

Cache controls now operate without an environment token or login, as requested. Keep the demo bound to localhost; anyone with access can change its cache mode or clear cached responses.

Tuning review: the sales join now uses a persistent covering index; the isolated SQL profile measured 63.68% lower median query duration (91.75 ms to 33.32 ms). Automatic caching, TTL changes, fast-origin disable and failure rollback are tested. The user reported a 94.67% median HTTP improvement on the earlier version; a fresh HTTP benchmark is required for this revision. See TUNING_REVIEW.md.

Automated playground scenarios now chain the complete business lifecycle with returned IDs, response assertions, read-only observation, bounded cycles/pacing, safe stop and JSON reports. Nine JavaScript engine tests pass, plus the Python suite now includes a real JS-to-ASGI workflow integration (Node required).

Final precision update: high-resolution perf_counter timing replaces the coarse Windows monotonic clock; policy reasons are explicit; regression alerts require >=1.5x and >=5 ms within five minutes. Current validation: 55 Python/backend integration tests, 9 JavaScript tests, 100% core statement/branch coverage. Retained HTTP result: 73.54% median reduction; rerun after the timing revision for current-version evidence.
