# Phase 8: automatic activation and TTL tuning

Status: implemented, awaiting joint review. PRD trace: TUN01Ã¢â‚¬â€œTUN03. The generic proxy now supports a deterministic adaptive controller within explicitly approved public-read rules. Phase 7 representation, freshness, capacity, coalescing and invalidation checks remain mandatory for every stored response.

## Modes and approval

| Global mode | Behavior |
|---|---|
| `observe` | Forward and measure; do not train or serve the adaptive cache |
| `off` | Explicit no-cache override; forwarding/metrics continue, with no adaptive training or serving |
| `recommend` | Evaluate approved adaptive rules and record hypothetical decisions; never store or serve cache entries |
| `cache` | Fixed-TTL caching for explicit `policy: cache` rules; adaptive rules remain observing |
| `adaptive` | Learn, activate and adjust approved `policy: adaptive` rules; explicit fixed `policy: cache` rules remain fixed overrides |

A route with `policy: observe` never trains or serves a shared cache. Authorization, Cookie, conditional/range requests, request directives and body-bearing GETs do not enter shared training. No rule is inferred or approved automatically. Configuration is read once per session; change a file or CLI `--mode` and restart to apply it. No live mode mutation or configuration hot reload is introduced.

Existing adaptive declarations now become operational when the global mode is also adaptive. The default global mode remains observe. Static `examples/cache-demo.json` remains available for Phase 7 behavior; `examples/proxy-demo.json` remains observation-only.

## Controller configuration

The new optional `tuning` object uses these defaults:

```json
{
  "sample_capacity": 20,
  "minimum_samples": 4,
  "reuse_minimum": 2,
  "enable_ms": 2.0,
  "retain_ms": 1.5,
  "cooldown_seconds": 5.0,
  "reuse_window_seconds": 60.0,
  "learning_window_seconds": 300.0,
  "history_capacity": 100
}
```

Counts are strict integers; timing/latency values are finite numeric values with validated positive/nonnegative bounds. Sample capacity is 2Ã¢â‚¬â€œ100, minimum samples cannot exceed it, reuse minimum is at least 2 and cannot exceed capacity, history capacity is 1Ã¢â‚¬â€œ1000, and retain cost cannot exceed enable cost. Semantic validation also rejects TTL values that cannot be represented by the controller's numeric state. `config check` is authoritative for constraints not fully expressed by the JSON shape schema.

## Learning and transitions

1. The proxy identifies an eligible request using the same privacy/method/rule gates as the cache.
2. A complete response must pass full Phase 7 HTTP freshness, representation and size checks before its cost becomes a successful learning sample. A privacy/unsupported response, inadequate freshness, oversized representation or origin failure becomes a guardrail failure instead.
3. Origin cost is active upstream I/O only. Admission delay, downstream send time and cache-hit duration are excluded. Hits can supply key-reuse evidence, but never substitute for an origin-cost measurement.
4. At least four successful samples, sufficient recent same-key reuse, no failures in the retained cohort and mean cost >=2 ms allow activation by default.
5. An active policy can remain active down to 1.5 ms. Fast origins, lost reuse or aged-out evidence return it toward observing, subject to cooldown. Guardrail failures disable it immediately, even during cooldown.
6. Normal expiry/eviction produces new origin samples. The controller sends no synthetic requests, background probes, traffic replay or writes.

The latest 20 attempts and latest 20 reuse observations are retained per adaptive rule by default. Origin evidence expires after 300 seconds; reuse expires after 60 seconds. The count of configured rules bounds the number of policy states. Histories do not retain raw URLs, payloads or credentials. Reuse uses an internal representation digest; exported inputs contain counts, never digest values.

The default target preference uses **one second of TTL per millisecond of successful mean origin cost**, clamped to each rule's TTL minimum/maximum. This is a deterministic heuristic, not a measured net-benefit estimate. Origin remaining freshness always caps actual storage. A cap below the policy minimum still prevents storage.

A 5-second cooldown limits ordinary enable/disable/TTL changes. `candidate_enabled`, `candidate_ttl_seconds`, `reason`, `cooldown_blocking` and `cooldown_remaining_seconds` distinguish the current applied state from the next candidate decision. The candidate reason remains visible while a change is deferred. Failure rollback bypasses cooldown.

A recent failure remains a blocker until it leaves the latest bounded cohort or ages out. For example, with capacity 20, twenty clean new attempts remove a retained failure; cooldown still applies to reactivation. If old evidence expires, sufficient new valid samples are still required. This favors explainability over aggressive recovery.

## Cache correctness during feedback

- Activation does not retroactively capture an earlier uncached body. With default volume gates and qualifying traffic, the first four calls learn, a subsequent eligible call can MISS/store, and a following call can HIT.
- Increasing a preference does not extend an already stored response. Decreasing it shortens existing entry deadlines, while future entries use the new preference subject to origin freshness.
- Disabling a policy evicts its entries and advances its invalidation generation. In-flight fills cannot repopulate the disabled policy.
- Reads crossing a declared mutation or clear generation do not train or refill the old snapshot.
- Incomplete/failed upstream streams are not successful cost samples or cache entries. Cancellation releases coordination/staging without manufacturing a successful sample.
- Clear removes entries and invalidates fills while retaining the current documented learning state. Restart starts with an empty cache, empty cohorts and new policy state.
- All origin freshness, credential, variant and byte-budget gates still apply after activation. Automatic tuning cannot override them.

Input summaries also expose origin observation counts, cache-hit observations and invalidation boundaries. Invalidation counts include writes, manual clear and policy eviction. They are diagnostic inputs and safety boundaries; a separate invalidation-frequency/net-benefit scoring rule is not claimed in this phase. Route-wide origin cost may mix public variants, so activation is not proof of a causal speedup or benefit for every key.

## Explanations, persistence and reports

```cmd
autotuner cache explain /api/products --config examples/adaptive-demo.json --json
autotuner insights --config examples/adaptive-demo.json --json
autotuner report --config examples/adaptive-demo.json --live --format json
```

Explain includes the current tuning state, candidate, reason, cohort counts, thresholds and bounded decision history for the matching rule. Status counts rules actually serving. Insights expose the actual runtime tuning state alongside their advisory analysis; the advisory subsystem itself does not apply changes.

A decision includes session, rule, UTC timestamp, action, exact reason, previous/new enabled state and TTL, candidate preference, thresholds, aggregate inputs and whether it was applied. Actions include enabled, disabled, adjusted TTL, cooldown and recommendation-only actions. Identical hot-hit/status polling does not generate a new audit record on every hit; meaningful input/decision changes are recorded.

Decision history is bounded to `history_capacity` across the session in memory and SQLite. The existing bounded writer queue carries decision records without waiting on disk in the request path. Queue/storage loss increments `dropped_tuning_decisions`; retained history trimming increments `tuning_decisions_truncated`. `tuning_history_may_be_incomplete` explains audit completeness separately. A storage fault cannot authorize unsafe caching or interrupt successful forwarding merely because an audit write failed.

SQLite adds an owned `decisions` table without restoring policy state. JSON reports include retained `tuning_decisions`; CSV remains an endpoint-summary format. Age/session retention and disk budgets still apply, and expired/evicted sessions remove their decision rows. Histories are evidence, not restart instructions. An older read-only database without the table returns an empty decision list, rather than creating one.

Default tuning is omitted from configuration identity normalization so existing Phase 7 config digests remain queryable. Non-default tuning changes the digest. Effective config exports still include tuning values, and source fingerprints distinguish implementation revisions. Older stored configs without the tuning marker retain their historical cache/observe effective mode; an old adaptive declaration is not relabeled as an applied adaptive run.

## Joint review

Stop the previous proxy on port 8080. The RAM-only fixture on 3000 can stay running. Update and test:

```cmd
python -m pip install -e ".[test]"
python -m pytest tests/test_adaptive_controller.py -o addopts=""
python -m pytest
```

If the fixture is not running, start it in terminal 1:

```cmd
python examples/cache_upstream.py
```

Terminal 2 starts the adaptive proxy:

```cmd
autotuner serve --config examples/adaptive-demo.json
```

The supplied profile uses the same RAM-only API and approved mutation dependencies as Phase 7. It lowers enable/retain thresholds to 0.1/0.05 ms and uses 2Ã¢â‚¬â€œ10 second TTL bounds so a fast local fixture can demonstrate the workflow without artificial delays. These are **demo settings**, not calibrated production defaults or a performance result.

Terminal 3 sends reads and inspects the decision:

```cmd
for /L %i in (1,1,8) do @curl.exe -sS --fail -o NUL http://127.0.0.1:8080/api/products
autotuner cache explain /api/products --config examples/adaptive-demo.json --json
autotuner status --config examples/adaptive-demo.json --json
autotuner report --config examples/adaptive-demo.json --live --format json
```

Expect phase 8 and effective adaptive mode. If measured cost/reuse clears the demo gates, explain should show enabled state, origin samples, bounded TTL and an applied enable decision; cache counters should show subsequent hits. If a gate does not qualify, the exact reason and candidate state explain why. Repeat two curl calls promptly if needed to inspect MISS/HIT headers.

The loop uses interactive CMD percent signs; a batch file needs doubled percent signs. Calls remain read-only. To verify declared invalidation in this disposable fixture:

```cmd
curl.exe -i -X PATCH http://127.0.0.1:8080/api/products/1 -H "Content-Type: application/json" --data-binary @examples/cache-price-update.json
curl.exe -i http://127.0.0.1:8080/api/products
```

Expect updated price 3500, never a post-write cached old representation. Clear is still available, and learning remains visible afterward.

For recommendation-only review, stop the proxy and restart with `--mode recommend`, using the same file. Send reads again: candidate decisions may qualify, but there must be no stored entries or HITs. For the explicit manual override, restart with `--mode off`; observation continues and no adaptive training or serving occurs. When querying reports after a CLI mode override, pass the same `--mode` so the queried effective configuration identity matches the session.

Stop the proxy and export its saved report without `--live` to verify audit persistence. Restarting with adaptive mode must begin fresh learning even though older session histories are retained.

## Evidence boundary

Tests use injected clocks and controlled events, temporary SQLite files, mock HTTP byte streams and in-process ASGI. They cover learning, same-key reuse, expiry probes, hit/queue exclusion, hysteresis, cooldown, TTL bounds, failure rollback/recovery, in-flight invalidation, persistence, audit pressure and manual modes. Managed Windows verification uses the socketless runner. Live HTTP transitions are a joint-review check. Sustained overhead, RSS, cross-platform qualification and causal performance benefits remain separate Phase 10 evidence. Stop here for review before Phase 9, and provide the commit title after acceptance.

## Control-request troubleshooting

The local CLI now distinguishes an unreachable proxy, request timeout, HTTP error and invalid/incompatible response, without printing raw error bodies or connection exception details. `curl -s -o NUL` hides connection errors and does not prove the proxy received traffic. First use visible requests:

```cmd
curl.exe -i --max-time 10 http://127.0.0.1:8080/_autotuner/status
curl.exe -i --max-time 10 "http://127.0.0.1:8080/_autotuner/cache/explain?path=/api/products"
```

A connection failure requires checking that the serve terminal is still running. An HTTP 500 requires the traceback from that terminal; do not treat it as an upstream-connectivity diagnosis. A regression test exercises the actual ASGI explanation endpoint and CLI response parsing after sixteen adaptive reads with multiple configured policies. Normal-terminal listener availability remains outside the managed sandbox’s visibility.
