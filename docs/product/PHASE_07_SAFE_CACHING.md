# Phase 7: safe opt-in response caching

Status: implemented, awaiting joint review. PRD trace: CAC01â€“CAC08 and INV01â€“INV05. This phase implements an explicit fixed-TTL cache. Automatic activation, TTL adaptation and recovery decisions remain Phase 8.

## Activation and compatibility

The new global `mode: "cache"` and route `policy: "cache"` must both be selected. Existing observe/recommend/adaptive configurations retain observation-only behavior in this phase. No old adaptive declaration silently starts serving responses. Configuration schema version remains 1; the generated schema and CLI mode choices include the additional explicit value.

Static mode uses the route's `ttl_min_seconds` as its fixed TTL. The existing minimum/maximum bounds remain valid for future adaptive policies. An origin freshness allowance below the minimum prevents storage. There is no heuristic reuse when the upstream provides no explicit freshness.

The original business demo and its existing adaptive cache remain separate. `examples/proxy-demo.json` still observes port 8000 and has zero cache rules. It is not the Phase 7 caching fixture.

## Implemented rules

| Area | Behavior |
|---|---|
| Public read approval | Only GET with an explicit matching cache policy; more literal path segments win |
| Credentials | Authorization and Cookie bypass lookup and storage, including when a public entry already exists |
| Request semantics | Range, conditional requests, Cache-Control, Pragma, GET bodies and transfer-encoded GETs bypass caching |
| only-if-cached | In cache mode, this unsupported directive returns 504 without contacting the upstream |
| Response privacy | Set-Cookie, private, no-store and no-cache are never stored |
| Supported directives | public, numeric max-age and s-maxage; shared freshness takes precedence |
| Unsupported directives | Conservatively bypass, including must-revalidate, proxy-revalidate, no-transform and stale extensions |
| Dates and age | Validate Date, Age and Expires; reject ambiguity/malformed values; Expires alone needs a valid Date |
| Freshness | Bound reuse by remaining origin freshness and fixed policy TTL; equality with expiry is expired |
| Variants | Always key Accept and Accept-Encoding; a response Vary dimension must also be explicitly approved by its rule |
| Representation | Cache only complete 200 responses; preserve compressed representation bytes and end-to-end header values; reconstruct Age and Content-Length |
| Partial/unsupported responses | Exclude non-200, Content-Range, unsupported Vary/star, trailers and connection-nominated end-to-end metadata |
| No stale fallback | Expired/invalidated entries are not served after upstream failure; no background refresh or write retry |

The cache key hashes fixed upstream identity, GET, raw target including ordered query bytes, and raw variant value lists. Different IDs, query ordering, repeated values, missing headers and encoding/Accept variants cannot share an entry. Key digests are not exposed by cache controls or telemetry exports.

Age accounting uses apparent age from Date, upstream Age plus response-header delay, and monotonic resident time. On a hit, Age advances and Content-Length matches the exact stored representation bytes. Date is generated for storage when missing; malformed dates conservatively bypass. No decode/re-encode is performed on stored bodies. Reference: [RFC 9111, HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html), particularly freshness, age and Vary processing.

## Invalidation and concurrency

Each read policy has an invalidation generation and a count of active declared writes. `invalidate_on` lists exact mutation methods and exact/single-segment-wildcard paths. All variants belonging to a dependent rule are evicted before upstream mutation dispatch and again after the attempt, regardless of success, failure or cancellation. Multiple overlapping writes keep dependent reads blocked from cache serving/storage until the final write ends.

An origin read carries its generation across upstream admission and streaming. A generation change, active write or elapsed freshness prevents publication. A read already in progress may return its pre-write snapshot to its original caller, but it cannot refill the cache after the write. Unrelated rules retain their entries. Clearing the cache also advances generations so outstanding fills cannot repopulate it.

Concurrent eligible cold callers coordinate by representation key. One eligible cold fetch can populate the cache for its waiters. Private/unsupported responses are not shared; waiters may need their own fetch. Coordination has a bounded admission count and timeout, and cancellation releases waiter references, locks, buffers, upstream slots and write boundaries.

Fresh hits skip upstream admission, including when the cold queue is full. A separate bounded hot-read lane validates zero-body framing and checks freshness again after reading the request. Both hot and cold lanes allow at most `upstream_concurrency + queue_capacity` active requests each. If a previously hot entry expires during validation, the request must obtain cold admission or receive 503; it never serves the expired entry. Waiting/slow operations remain subject to configured timeouts.

External writes sent directly to the upstream and other proxy processes do not participate in these generations. Correct dependency declarations and routing relevant writes through this single-worker proxy are required for mutation invalidation. The cache does not infer business relationships or provide distributed coherence.

## Capacity and lifetime

- LRU eviction bounds resident entry count, per-entry representation size and total accounted bytes.
- Accounted bytes include stored bodies/headers/keys, in-progress fills and evicted bodies still pinned by in-flight hits. Dropping an entry from the lookup table does not pretend its pinned payload has been freed.
- Buffering uses immutable byte chunks without joining a second whole-body copy. If an entry or shared staging budget is exceeded, forwarding continues and staging is released.
- Python object overhead, HTTPX/server buffers, raw request buffers and process RSS are not identical to representation-byte accounting. They need separate Phase 10 memory qualification.
- Expiry is lazy: an unused expired representation may remain resident until lookup, eviction or clear, but cannot be served after expiry.
- Restart creates an empty response cache, empty coordination state and fresh generations. SQLite retains telemetry summaries, not response bodies or cache keys.
- Storage pressure or an unavailable telemetry database does not change cache correctness. The storage health/drop counters still report degradation.

## Diagnostics and controls

Responses include `X-Autotuner-Cache` (HIT/MISS/BYPASS) and `X-Autotuner-Cache-Reason`. These are independent of any upstream `X-Cache` headers. HIT means a fresh proxy entry served the request. MISS means a cache lookup missed and forwarding was attempted; it does not promise that a representation was ultimately stored.

For finite streams without known size, a candidate can be rejected after response headers have already been sent. Its wire header cannot then be rewritten. The final completed decision, including capacity or invalidation rejection, is available through `cache explain`. Known oversized Content-Length values bypass before response headers. Interrupted streams never publish a successful entry.

```cmd
autotuner cache explain /api/products --config examples/cache-demo.json --json
autotuner cache clear --config examples/cache-demo.json --json
```

Explain shows the matching rule, effective mode, fixed TTL strategy, active-write flag, latest completed decision and completed origin sample count. Status exposes entries, accounted bytes/budget, retired pinned entries, coordination keys, writes, hits, misses, bypasses, stores, evictions, expirations, invalidations and coalesced waiters. Lookup misses can later become response bypasses, so lookup counters and final outcome counts have different meanings.

Local API controls are `GET /_autotuner/cache/explain?path=...` and `POST /_autotuner/cache/clear`. Clear removes reusable entries and invalidates fills; it preserves counters and observation history. A pinned response already being sent can finish. Route parameters cannot include query strings or fragments. Controls remain loopback-local and require no management token.

Overall metrics record hits; upstream metrics record only actual upstream work. Persistent JSON/CSV reports retain HIT/MISS/BYPASS aggregates and report effective cache mode. Phase 6 insights remain advisory: they cannot approve a policy automatically, and their conservative preliminary response screen is not the Phase 7 freshness evaluator.

## Joint review: use the disposable fixture

Stop the previous proxy on port 8080. Update and test:

```cmd
python -m pip install -e ".[test]"
python -m pytest tests/test_response_cache.py -o addopts=""
python -m pytest
```

Terminal 1 starts a dedicated in-memory upstream on port 3000:

```cmd
python examples/cache_upstream.py
```

This fixture has one product and a catalog report, uses explicit public freshness, and resets on restart. It has no database, artificial delays or benchmark claim. It is a repository review fixture, not a bundled public CLI command.

Terminal 2 starts the proxy on port 8080:

```cmd
autotuner serve --config examples/cache-demo.json
```

Terminal 3 tests reuse. Run the two product calls promptly, within the configured 10-second TTL:

```cmd
curl.exe -i http://127.0.0.1:8080/api/products
curl.exe -i http://127.0.0.1:8080/api/products
curl.exe -i http://127.0.0.1:8080/api/reports/catalog
curl.exe -i http://127.0.0.1:8080/api/reports/catalog
autotuner cache explain /api/products --config examples/cache-demo.json --json
```

Expect MISS then HIT, unchanged JSON, and valid Age/Content-Length on hits. Test declared mutation invalidation against the RAM-only fixture:

```cmd
curl.exe -i -X PATCH http://127.0.0.1:8080/api/products/1 -H "Content-Type: application/json" --data-binary @examples/cache-price-update.json
curl.exe -i http://127.0.0.1:8080/api/products
curl.exe -i http://127.0.0.1:8080/api/reports/catalog
```

Expect fresh MISS results: price 3500 and report version 1 after the first valid PATCH. Further PATCH calls increment the version again. Test credential isolation and clear:

```cmd
curl.exe -i http://127.0.0.1:8080/api/products -H "Authorization: Bearer review-only"
autotuner cache clear --config examples/cache-demo.json --json
autotuner status --config examples/cache-demo.json --json
autotuner report --config examples/cache-demo.json --live --format json
```

Expect BYPASS/credentials, clear confirmation, phase 7, effective cache mode, and appropriate HIT/MISS/BYPASS counts. Waiting past the TTL must cause a new MISS. Restart must start with zero cache entries while retained telemetry remains available.

Tests use injected clocks, controlled events, temporary SQLite files, in-process ASGI and HTTPX mock streams. Managed-sandbox verification uses the socketless runner. Normal-terminal HTTP reuse/invalidation, OS interoperability, load overhead and RSS qualification remain separate review/release evidence. Stop after Phase 7 for joint review; provide the commit title after acceptance before Phase 8.

## Joint-review header correction

The first normal-terminal review confirmed MISS then HIT, and exposed duplicate Date/Server fields from the proxy Uvicorn defaults alongside preserved upstream headers. The CLI now disables automatic proxy Date/Server headers. Forwarded and cached responses preserve the upstream Date/Server; application responses synthesize Date only when absent, including local control/error responses. Regression tests verify wire-header values in ASGI responses, CLI server options and Uvicorn’s generated default-header list without network sockets. Restart the proxy and repeat `curl.exe -i` twice to verify a single Date and Server on this fixture.
