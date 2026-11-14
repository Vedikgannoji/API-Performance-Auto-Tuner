# Phase 6: performance insights

Status: implemented, awaiting joint review. PRD trace: ANA01 and Phase 6 performance insights. This phase adds advisory analysis over recent live observations. It does not enable shared caching, change concurrency, modify database queries or replay traffic.

## Deliverables

- `autotuner insights --config PATH --window 300 --json` queries the running proxy.
- Reserved `GET /_autotuner/insights?window=300` returns the same versioned analysis. A window must be 1–3600 seconds; invalid input returns 400, without contacting the upstream.
- Findings explain their operation, timing boundary, evidence, sample counts, thresholds and suggested next step. Every finding has `applied=false`; the response has `recommendations_applied=false` and `effective_mode=observe`.
- Evaluations show sample counts even when no alert qualifies. Cache suitability states explain fast origins, missing evidence, private/unsupported traffic, missing rules and potential candidates for policy review.
- Findings use the bounded raw histories added in earlier phases. Future timestamps and observations outside the selected window are excluded. Analysis is read-only and generates no upstream calls.

The phase adds optional per-observation advisory metadata to the reusable Metrics interface. Existing demo/core callers retain their previous behavior. The generic proxy now measures per-request admission wait separately from upstream execution. A regression test also ensures an upstream timeout does not count an already measured queue wait twice.

## Rules and evidence

| Finding | Evidence gate | Interpretation |
|---|---|---|
| `slow_upstream` | At least 5 successful non-HIT upstream samples; mean >=100 ms | Investigate upstream CPU, I/O and database work; timing does not identify the cause |
| `upstream_tail_latency` | At least 20 such samples; nearest-rank p95 >=250 ms | Inspect dependency variability and slow upstream requests |
| `upstream_regression` | Latest 5 successful origin samples versus preceding 5; recent mean >=1.5 times baseline AND >=5 ms increase; positive baseline; both cohorts within at most 300 seconds | Observed recent change, with disjoint cohorts; not a causal or historical deployment comparison |
| `operation_errors` | At least 5 completed proxy responses; 4xx+5xx rate >=10% | Inspect failures, validation and conflicts; intentional workflow errors remain included |
| `admission_pressure` | At least 5 completed responses with measured queue wait; queue p95 >=5 ms AND total queue time >=25% of proxy handling time | Inspect upstream capacity before changing concurrency |
| `cache_policy_review` | At least 4 screened successful GET origin samples, using latest 20; mean >=2 ms; same request key seen >=2 times within at most 60 seconds | Preliminary review opportunity; not cache approval or measured speedup |
| `telemetry_quality` | Raw evictions, observed storage drops/truncation or degraded storage | Findings may be based on partial evidence |
| `transport_failures` | At least one lifetime failed attempt, incomplete response or overload rejection | Session-wide diagnostic; not proof of a current-window regression |

Thresholds are returned with the analysis and tested as explicit defaults. They are heuristics, not per-API service-level objectives. Slow/tail/regression rules use completed, successful upstream observations, with cache HITs excluded. Proxy errors and admission delay are evaluated at their own boundary. No difference between two duration summaries is labeled measured proxy overhead or avoided work.

Regressions can mix query variants within an operation. The output recommends inspecting those differences before attributing a change to code or infrastructure. Five values at 3.04 ms followed by five at 4.68 ms do not alert; five at 10 ms followed by five at 20 ms do. Evidence older than five minutes does not qualify even when the selected general window is longer.

## Caching suitability and privacy

Repeated calls to different IDs under one template do not establish same-key reuse. The proxy constructs a per-session HMAC-SHA256 fingerprint from the raw target including ordered query values, Accept and Accept-Encoding, using a random in-memory salt. Exact target/variant repetitions share a fingerprint; different targets, query order, variants and sessions do not.

Fingerprint values are held only in the bounded raw histories and writer queue. They are excluded from insight responses, SQLite summary fields and JSON/CSV reports. The salt is never persisted. Credentials, header values, payloads and raw query strings are not added to telemetry. Storage continues to persist only its explicit Phase 5 summary fields.

The preliminary screen excludes:

- Non-GET methods and GET bodies.
- Authorization or Cookie headers.
- Range and conditional requests.
- Request Cache-Control or Pragma.
- Responses other than 200, Set-Cookie, Cache-Control or Pragma.
- Vary dimensions other than Accept and Accept-Encoding, including Vary star.

This intentionally excludes even some potentially cacheable Cache-Control responses. Full freshness, validation, variant, invalidation and race correctness belongs to Phase 7. Passing the advisory screen **does not prove data is public or safe to cache**. Recent upstream failures also suppress a policy-review suggestion.

`cache_suitability` reports one of:

| State | Meaning |
|---|---|
| `no_completed_upstream_samples` | The proxy has local evidence but no completed origin sample for the GET operation |
| `no_screened_public_reads` | No read passed the preliminary screen; reason counts explain why |
| `upstream_errors` | Recent origin failures require investigation first |
| `insufficient_samples` | Fewer than 4 screened origin samples |
| `fast_origin` | The screened origin mean is below 2 ms |
| `insufficient_key_reuse` | No same target/variant has enough recent repetitions |
| `explicit_rule_required` | Cost/reuse warrants review, but no configured rule covers the operation template |
| `policy_review_candidate` | A covering rule exists and cost/reuse warrants reviewing its semantics |

Even `policy_review_candidate` includes `approved_for_caching=false` and `response_cache_serving_enabled=false`. A covering rule may be exact or a broader single-segment wildcard; the most specific covering rule wins. Route-wide cost can mix request variants, so this is not a per-key net-benefit measurement. No TTL or policy is applied, regardless of the preferred mode in the configuration.

## Empty states and lifetime diagnostics

- `no_recent_traffic`: no current-window raw observations and no diagnostic finding.
- `collecting_samples`: operations have not reached the relevant volume gates.
- `no_thresholds_exceeded`: traffic exists, but no finding qualifies. Fast APIs can correctly produce this state.
- `findings_available`: one or more findings exist, including informational quality diagnostics.

The response includes separate evaluations, all thresholds and an evidence-quality section. In-memory evictions make window completeness uncertain; durable storage health is reported separately. Raw eviction and transport failure counters are lifetime counters and may remain relevant after the offending request leaves the selected window. They do not silently become current-window counts.

Insights require a running Phase 6 proxy. They reset on restart; Phase 5 session reports remain available offline. Persisted minute/duration frequencies cannot reconstruct chronological raw cohorts or request reuse, so the product does not manufacture retrospective regression or suitability findings from them. A JSON insight snapshot can be saved using normal shell output redirection.

## Joint review

Stop the previous proxy on port 8080, update the editable install, and test from the repository root:

```cmd
python -m pip install -e ".[test]"
python -m pytest tests/test_insights.py -o addopts=""
python -m pytest
```

Keep two server terminals open:

| Terminal | Command | Role |
|---|---|---|
| 1 | `start.bat --no-browser` | Demo upstream on port 8000 |
| 2 | `autotuner serve --config examples/proxy-demo.json` | Observation proxy on port 8080 |

In a third terminal, first check that both servers are available, then generate read-only traffic:

```cmd
curl.exe http://127.0.0.1:8000/api/products
curl.exe http://127.0.0.1:8080/api/products
for /L %i in (1,1,12) do @curl.exe -s -o NUL http://127.0.0.1:8080/api/products
autotuner status --config examples/proxy-demo.json --json
autotuner insights --config examples/proxy-demo.json --json
autotuner insights --config examples/proxy-demo.json --window 60 --json
```

The loop uses single percent signs at an interactive CMD prompt; a batch file needs double percent signs. Expect phase 6, matching operation sample counts, explicit sample requirements and no applied recommendations. A fast local demo may show `fast_origin` or `no_thresholds_exceeded`; no artificial delays or guaranteed alerts are added. The supplied example has no shared-cache rules, so a cost/reuse opportunity can show `explicit_rule_required`. This is expected.

Inspect the finding evidence and verify that no request fingerprint or raw query value is exported. Continue to use `autotuner report --live` for durable session summaries. Automated regression fixtures establish threshold behavior without touching the demo data. Stop after this phase for joint review; provide the commit title after acceptance and before Phase 7.

## Verification boundary

Tests use injected clocks, in-process ASGI and HTTPX mock byte streams, temporary SQLite files and the managed Windows socketless runner. Installed-wheel CLI checks verify command help and unchanged configuration/report compatibility. Normal-terminal live insights remain a joint-review check; real HTTP overhead, production bottleneck diagnosis and cross-platform qualification are not claimed by these tests.
