# Phase 1 product specification and review

Status: implemented contracts, ready for joint review. Reference: `docs/reference/Autotuner_Technical_PRD.docx`.

## Deliverable and implementation boundary

This phase establishes executable configuration validation and the product contracts. It does not install an `autotuner` command, forward arbitrary APIs, or change the existing demo application's startup. The configuration module is deliberately separate from the demo's `CacheConfig`. Phase 2 extracts reusable engine interfaces; Phase 3 adds the CLI; Phase 4 adds forwarding.

Implemented: `autotuner/product_config.py`, a real example at `examples/autotuner.json`, a generated shape schema at `docs/product/config.schema.json`, and configuration acceptance tests. Python semantic validation is authoritative: the generated JSON Schema does not express all cross-field and route-overlap constraints.

## Product decisions for review

| Decision | Initial contract | Reason |
|---|---|---|
| Integration | One fixed upstream reverse proxy | Works without business-code imports or a framework adapter |
| Default behavior | Observe, no shared response serving | Installing the tool does not implicitly change API responses |
| Configuration format | UTF-8 JSON, schema version 1 | Standard-library parsing; strict validation without a YAML dependency |
| Listener | Explicit loopback IP and port only | Local product needs no account or management token |
| Upstream | HTTP(S) authority with optional port; no credentials, query, fragment or base path | Fixed destination; route paths carry API prefixes |
| Rules | Exact path or whole-segment `*`; no recursive wildcards | A small matching language is testable and predictable |
| Resolution | More literal segments win; equally specific overlapping rules rejected | No order-dependent policy behavior |
| Cache methods | GET only | Mutations and HEAD cannot be accidentally approved for shared caching |
| Variant dimensions | Accept and Accept-Encoding initially | Other Vary values force bypass until supported |
| Invalidation | Explicit POST/PUT/PATCH/DELETE dependencies | Tool cannot infer business relationships safely |
| Distribution name | Working name only | Availability and publishing permissions are not yet verified |
| License | MIT recommendation, awaiting owner choice | Licensing is a publication prerequisite, not silently assigned |

An adaptive route inside global observe mode is only a declaration of future eligibility. Global observe always wins. The proxy implementation must enforce that precedence; the schema itself never serves traffic.

## CLI contract for Phase 3

| Command | Contract |
|---|---|
| `autotuner init` | Write a validated example; fail on existing file unless explicit replacement |
| `autotuner serve --config PATH` | Foreground session; validate before opening sockets; observe by default |
| `autotuner status --json` | Mode, upstream authority, session, limits and storage health |
| `autotuner endpoints --json` | Route metrics, window and sample completeness |
| `autotuner insights --json` | Evidence-based findings and their thresholds |
| `autotuner cache explain ROUTE` | Exact rule, eligibility, TTL caps and decision reason |
| `autotuner cache clear` | Explicit invalidation of the running local instance |
| `autotuner dashboard` | Open the bundled local UI; do not start traffic |
| `autotuner doctor --config PATH` | Configuration checks; explicit bounded connectivity diagnostics |
| `autotuner benchmark --scenario PATH` | Preview/execute an explicitly requested workload; validate correctness |
| `autotuner report --format json` | Versioned report with source/config identity and measurement boundaries |

Exit codes: 0 success; 1 runtime failure; 2 argument/configuration failure; 3 scenario or benchmark assertion failure. JSON commands write parseable output to stdout, diagnostics to stderr. Effective precedence: defaults, file, documented environment settings, explicit CLI options. Environment field names will be introduced with the CLI, not implicitly accepted by this phase's file loader. Diagnostics must redact sensitive invalid input instead of dumping raw validation objects.

## HTTP compatibility boundary for Phase 4

Support ordinary finite HTTP/1.1 API requests using GET, HEAD, POST, PUT, PATCH, DELETE and OPTIONS. Preserve duplicate query value order, status, end-to-end headers and representation bytes. Forward upstream HTTPS with certificate verification and return redirects without following them. Never automatically retry a mutation.

WebSocket upgrade requests and explicit SSE requests are rejected with a documented 501 before upstream dispatch. An unexpected unsupported upgraded/event-stream upstream response produces a documented 502 before downstream headers; no cache entry is stored. Ordinary finite chunked bodies require tested bounded forwarding, not an assumption that chunked encoding means indefinite streaming. A response too large for the cache is forwarded without caching under streaming/backpressure and read-timeout limits. Timeout, framing and size behavior must pass protocol fixtures before Phase 4 closes.

Client-supplied Host or absolute URLs cannot override the configured authority. Credentialed requests are forwarded but bypass shared caching; their upstream work remains visible. External binding and multi-worker operation are excluded from this release contract.

## Acceptance backlog and requirement trace

| PRD trace | Phase | Required evidence |
|---|---|---|
| CLI03 CFG01 CFG03 | 1 and 3 | Strict defaults, unknown fields, URL/listener validation, budgets, duplicate IDs and overlapping rule rejection |
| ARC01 | 2 | Core imports no demo business modules; existing demo tests still pass |
| CLI01 CLI02 CLI04 | 3 | Clean install, machine-readable output, precedence, exits and graceful shutdown |
| PRX01 PRX02 PRX03 PRX04 | 4 | Byte/header golden tests, fixed authority, no duplicate writes, bounded forwarding |
| MET01 MET02 MET03 RPT01 | 5 | Exact aggregates, persistence, retention, redaction and pressure diagnostics |
| ANA01 | 6 | Recent disjoint cohorts; relative and absolute alert thresholds |
| CAC01 through CAC08 INV01 through INV05 | 7 | Credential/variant/freshness corpus, generation races, coalescing and bounded capacity |
| TUN01 TUN02 TUN03 | 8 | Automatic activation, adaptation, recovery, cooldown and explanations |
| UX01 UX02 WF01 WF02 | 9 | Distinct views, meaningful empty states, scenario dependency and stop behavior |
| NFR01 through NFR06 | 10 | Stress tests, privacy checks, overhead and cross-platform qualification |
| Installation and publication | 11 | Package identity, license, published-wheel verification and external pilot feedback |
| Production expansion | 12 | Separate approved design; no implied distributed consistency |

## Benchmark reference contract

Use a documented 4-core, 8 GiB reference host, Python 3.12, 1 KiB JSON, eight concurrent clients and 100 requests per second for proxy-overhead qualification. Identify exact hardware/OS in each report before comparing results. Proposed observe-mode overhead gates are median <=3 ms and p95 <=8 ms. These are targets, not measurements from this phase. Linux qualification and the Windows/macOS compatibility matrix are Phase 10 work.

Compare direct upstream, observe proxy, caching disabled and adaptive proxy with matched data, equal warmups, cold-learning costs and at least three alternating paired repetitions. Validate responses before evaluating the repeated-read 20% gain target. Existing demo benchmarks cannot establish the generic proxy's overhead or benefit.

## Joint review procedure

1. Run `python -m pytest tests/test_product_config.py -o addopts=""` for configuration-only tests.
2. Load the real example using the command below; observe mode and explicit route declarations should appear.
3. Copy the example into a scratch file and change listen to `0.0.0.0:8080`, add an unknown key, or add an equally specific overlapping route. Validation must reject it without opening sockets or sending traffic.
4. Review JSON-first configuration, the HTTP exclusions, package-name deferral and the MIT recommendation.
5. After we agree the Phase 1 contract, proceed to core extraction in Phase 2. Do not treat this review as permission to publish a package or change the existing demo's runtime.

```powershell
python -c "from autotuner.product_config import load_config; print(load_config('examples/autotuner.json').model_dump_json(indent=2))"
```

Package availability, license choice and reference-host selection remain explicit decisions for review. The product is not yet a globally installable proxy, and no existing command has been relabeled as one.
