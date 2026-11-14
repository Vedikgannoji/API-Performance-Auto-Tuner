# Phase 4 observation proxy and review

Status: implementation and in-process qualification ready for joint review. Live listener behavior and direct-versus-proxy overhead remain normal-terminal review items. No shared response-cache serving, product persistence or adaptive response tuning is enabled by this phase.

## Delivered behavior

`autotuner serve` now runs the observation proxy, rather than the Phase 3 control-only shell. It forwards ordinary finite HTTP/1.x API requests to one configured HTTP(S) upstream. GET, HEAD, POST, PUT, PATCH, DELETE and OPTIONS are supported. Upstream redirects are returned without being followed. Mutations are never automatically retried.

Forwarding preserves body representation bytes (including compressed payloads), duplicate query value order, end-to-end response headers and repeated Set-Cookie headers. It removes hop-by-hop fields, including fields nominated by Connection. Host is derived from the configured upstream. Client-supplied forwarding identity headers are stripped. An absolute target, double-slash path or client Host cannot replace that authority.

Cookies and Authorization from an individual request are forwarded; the proxy does not retain upstream Set-Cookie values in a shared cookie jar. HTTPS verification is enabled and environment proxy settings are ignored. These options are tested/configured, but a live certificate/TLS interoperability exercise has not been run in the sandbox.

The proxy is a different origin from the upstream. Browser cookie domain/SameSite rules, CORS and absolute redirects can therefore affect browser integrations. This phase does not rewrite domains, relax CORS, intercept TLS or promise browser-origin equivalence. HTTP trailers are not a supported metadata contract. Raw finite response bytes stream with backpressure; large responses do not become cache entries or an unbounded response buffer.

## Modes and control endpoints

`status` reports phase 4, forwarding_enabled=true, effective_mode=observe and cache_serving_enabled=false. The mode field retains the configured preference for later phases. Even adaptive configuration cannot turn on product caching yet. The original demo's independent cache can still return its own X-Cache header; that is upstream behavior, not a product-proxy hit.

The local namespace `/_autotuner` is reserved and never forwarded:

| Endpoint or command | Behavior |
|---|---|
| GET /_autotuner/status | Session identity, modes, limits and transport counters |
| GET /_autotuner/health | Same session health/status snapshot |
| GET /_autotuner/metrics?window=60 | Proxy and upstream timing summaries, route counts, RPS, errors and percentiles |
| autotuner endpoints --json | Query the metrics endpoint of the configured local listener |
| autotuner endpoints --window 300 --json | Select a window from 1 to 3600 seconds |

Control requests are excluded from business metrics. Operation labels come from `operations` declarations, independently of cache eligibility. Exact/more-literal patterns win; equally specific overlapping rules for the same method are rejected. Unrecognized paths share `/{unmatched}` to prevent request IDs or query strings creating unlimited labels. Existing cache path declarations are a bounded-label fallback, not approval for response caching.

## Limits and errors

New version-one configuration fields are additive. Existing valid configurations keep their defaults.

| Setting | Default | Meaning |
|---|---|---|
| upstream_concurrency | 8 | Active admitted data-plane requests |
| queue_capacity | 64 | Additional requests waiting before body buffering |
| request_body_bytes | 8388608 | Maximum buffered request payload |
| header_bytes | 65536 | Limit checked on request headers and received upstream headers |
| connect_timeout_seconds | 5 | Upstream connect budget and local admission wait budget |
| read_timeout_seconds | 30 | Client upload total budget, network read/write timeout, downstream send timeout |
| response_timeout_seconds | 60 | Overall response consumption deadline, including downstream backpressure |

Body buffering happens only after admission, so queued requests do not each allocate the full request-body budget. HTTPX has a bounded connection pool. Upstream header-size validation is applied after the HTTP client parses headers; this is not a replacement for its native parser limits or server/network resource controls.

| HTTP status | Failure |
|---|---|
| 400 | Invalid target, length mismatch or ambiguous framing |
| 408 | Client request body timed out |
| 413 / 431 | Request body / headers exceed limits |
| 501 | Unsupported method, explicit upgrade or SSE request |
| 502 | Upstream connection/protocol failure, unsupported upstream stream or header failure |
| 503 | Admission capacity exceeded or admission wait expired |
| 504 | Upstream timeout/deadline |
| 505 | Unsupported downstream HTTP version |
| 508 | Forwarding loop marker detected |

ASGI WebSocket scopes are closed with code 1003, rather than performing an upgrade. If an upstream error occurs after downstream headers were sent, a replacement JSON error cannot be sent: the response is aborted, its stream is closed and incomplete_responses increases. It is not recorded as a successfully completed request. Sanitized post-header errors do not print raw upstream error messages. Cancellation releases capacity and closes the active response. Uvicorn access logging and HTTPX informational URL logging are disabled by the CLI to avoid logging arbitrary query values.

## Measurement boundaries

Top-level metrics describe proxy processing through downstream completion. Their p50/p95/p99 are not database timing or browser round-trip latency. The nested upstream summary measures active upstream I/O waits, excluding admission and downstream send waits. Its samples include only fully consumed supported upstream responses. Transport totals also account for attempted/failed I/O, so their sample denominator differs.

Transport counters expose upstream attempts, completed requests, failures, incomplete responses, cancellations, overload rejection, queue time and upstream active-I/O time. Each of the two measurement histories is bounded to metrics.raw_capacity. State is process-local and resets at restart; durable summaries and retention are Phase 5. Raw paths, query values, credentials and payloads are not stored in the observation histories.

## Joint test sequence

Stop any old product listener on 8080. Update the editable installation and run the tests:

```cmd
python -m pip install -e ".[test]"
python -m pytest tests/test_proxy.py tests/test_cli.py tests/test_product_config.py -o addopts=""
python -m pytest
```

Terminal 1 starts the existing demo upstream without changing its data:

```cmd
start.bat --no-browser
```

Terminal 2 starts the proxy, using a supplied configuration with 13 operation labels and zero cache rules:

```cmd
autotuner serve --config examples/proxy-demo.json
```

Terminal 3 compares supported responses and queries product metrics:

```cmd
curl.exe -s http://127.0.0.1:8000/api/products
curl.exe -s http://127.0.0.1:8080/api/products
curl.exe -s http://127.0.0.1:8080/api/reports/sales
autotuner status --config examples/proxy-demo.json --json
autotuner endpoints --config examples/proxy-demo.json --window 300 --json
```

Expect matching product bodies, phase 4, forwarding enabled, shared cache serving disabled, GET route counts and positive timing samples. A product call through 8080 also reaches the demo, so its original dashboard may record that upstream traffic. Repeated calls must still reach the upstream regardless of configured product mode.

For timing smoke checks, compare curl's `-w` time_total output over repeated alternating direct/proxy requests to the same deterministic path. A single timing is not an overhead benchmark. The PRD overhead budgets remain unqualified until a source-matched controlled network experiment is run. No new speedup number is claimed here.

Stop the demo upstream and send a proxy request: expect a sanitized 502 (or 504 on timeout) without automatic write retries. Stop the proxy with Ctrl+C and verify status reports it unavailable. Review before Phase 5; the commit title will be provided after the joint review.

## Implementation references

- HTTPX async manual streaming and response closure: https://www.python-httpx.org/async/
- Connection-specific field removal: RFC 9110 section 7.6.1, https://www.rfc-editor.org/rfc/rfc9110.html#section-7.6.1

Tests use HTTPX mock byte streams and an actual ASGI upstream fixture without public network traffic or writes to the user's application database. Live TLS, TCP disconnect interoperability, HTTP trailer support and cross-platform performance qualification are not established by these tests.
