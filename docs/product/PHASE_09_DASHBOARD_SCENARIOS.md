# Phase 9: product dashboard and declarative scenarios

Status: implemented, awaiting joint testing and review. PRD trace: UX01–UX02 and WF01–WF02. Phase 8 was committed by the user before this work. No Phase 10 features, publication or remote deployment are included.

## Product console

`autotuner dashboard --config FILE` checks the running local session, then opens its bundled dashboard. `--no-browser` prints the address; `--json` prints structured output without opening a browser. `autotuner serve` also prints the address. There is no frontend build step, CDN, account or management token.

The console lives at `http://127.0.0.1:8080/_autotuner/dashboard` with the example configs. `/` still forwards to the upstream. The original business demo dashboard on port 8000 is separate. Control routes do not count as observed API traffic. Merely opening the console generates no upstream requests.

| View | Delivered behavior |
| --- | --- |
| Overview | Windowed request count, throughput, p95, error rate, cache offload, upstream mean, actual bucket chart and searchable per-operation p50/p95/p99 table |
| Playground | Configured or custom methods/relative paths, explicit JSON headers/body, optional response inspection, bounded metadata history and generic scenario runner |
| Cache & insights | Cache occupancy/bytes, serving rules, current/candidate adaptive state, sample/reuse thresholds, admission reasons, declared invalidation dependencies, transport counters, findings, decision history, storage health and report export |
| Getting started | Startup guide, timing definitions, caching approval, privacy, missing-data explanations and scenario limitations |

Views are distinct sections with hash navigation and `aria-current` updates. `#tester` and `#policies` map to Playground and Cache for older links. Back/Forward follows hash changes. Light/dark theme preference persists locally; request data does not. Tables scroll horizontally on narrow screens and the sidebar becomes a compact navigation row.

Data polls every three seconds without overlap. Select 60, 300, 900 or 3600 seconds; pause and refresh independently. A failed refresh retains the last snapshot and visibly marks it stale. Empty windows show unavailable latency/error percentages rather than fabricated measurements. Charts leave latency gaps where no observations exist; their request/latency axes are independently normalized. Counts and latency are retained observations, not controlled benchmark results. Lifetime transport/cache counters are labeled separately from windowed metrics.

Policy explanations reuse the existing engine. Snapshot payloads include global cache state and decision history once, rather than duplicating them inside every rule. Mode changes require editing configuration and restarting. Clear removes stored responses while retaining policy learning.

## Explicit request execution

`POST /_autotuner/playground/request` accepts `method`, upstream-relative `path`, explicit `headers`, optional JSON `body`, `timeout_seconds` (1–120; default 30), and `include_response` (default false). It dispatches to the **same proxy data plane in process**, so the browser's HTTP cache, cookies and request directives cannot silently change eligibility. Explicit Cookie or Authorization headers still trigger the engine's normal bypass. There are no retries or redirect following.

By default only status, duration, body byte count, truncation and cache metadata are returned. Checking inspection explicitly returns response headers and at most 64 KiB of response preview. The full upstream response is consumed, but preview storage is bounded. Bodies/headers remain in the current inspector only. Request history holds the latest 20 metadata rows and removes query strings. Console round-trip duration and proxy execution duration are different boundaries and labeled separately.

The executor preserves wire bytes. Compressed/binary responses are not automatically decompressed into JSON; JSON assertions/captures require a suitable JSON representation. Response previews truncate at 64 KiB and steps requiring JSON checks/captures fail explicitly if truncated. A timeout, cancellation or lost connection can occur after a write committed upstream. Inspect state before any manual retry.

## Scenario format

The editor-friendly structural schema is in `scenario.schema.json`. Runtime validation additionally enforces dependency ordering, selectors, reserved paths, finite JSON values and total expanded budgets.

```json
{
  "schema_version": 1,
  "name": "Create and verify",
  "cycles": 1,
  "delay_ms": 0,
  "steps": [
    {
      "name": "Create an item",
      "method": "POST",
      "path": "/items",
      "body": {"name": "review-{{run_id}}-{{cycle}}"},
      "expect_status": 201,
      "capture": {"item_id": "id"}
    },
    {
      "name": "Verify returned ID",
      "path": "/items/{{item_id}}",
      "checks": [{"field": "id", "equals": "{{item_id}}"}]
    }
  ]
}
```

The default method/status are GET/200. `{{run_id}}` and `{{cycle}}` are built in. Each capture name must be unique and available before use; context resets per cycle. A whole-value variable preserves its JSON type; embedded text converts it to a string and path substitutions are URL-encoded. Selectors support dot fields, numeric array indexes and `$` for the root. Captures accept finite scalar values only, with strings bounded to 256 characters. Checks compare value and JSON/Python type strictly, including booleans versus integers. Object keys are literal, and prototype-related selectors are forbidden. There is no script, expression, shell or arbitrary code execution.

| Bound | Limit |
| --- | --- |
| Scenario file / control input | 1 MiB; bounded reads |
| Steps / cycles | 100 / 10; default one cycle |
| Expanded requests | 1,000 total |
| Step repeat | 1–20; GET/HEAD/OPTIONS without captures only |
| Pacing | 0–5,000 ms, between requests only |
| Dispatch runtime | 600 seconds, plus the already executing request's bounded timeout |
| Request JSON body / nesting | 64 KiB / 12 levels |
| Headers | 32, with bounded ASCII values; framing/hop/proxy identity headers rejected |
| Captures / checks per step | 20 / 20; at most 50 captured variables per scenario |
| Concurrent scenario jobs | One per proxy session |
| Retained job reports | Latest three, in memory only |
| Concurrent console POST handlers | Four; excess returns 503 |
| Console input deadline | 30 seconds |

Only relative upstream URLs are allowed. Absolute/authority URLs, fragments, control characters, backslashes and reserved control namespace aliases are rejected. Unknown fields and invalid budgets fail validation before dispatch. Preview shows method/path templates, request/write counts, cycles and pacing; it omits bodies, headers and query values.

The runner executes each request exactly once in order. Captures feed dependencies; unexpected status, failed assertion, malformed/truncated JSON, invalid capture or transport failure stops subsequent dispatches. Expected 409/422 results can pass workflow assertions, but still count as HTTP errors in monitoring. Stop completes the current request and prevents later dispatches. Completed writes persist; no retry, rollback or cleanup is inferred. Closing the proxy requests stop before disposing its transport/storage.

Start requests carry a UUID. Repeating the same UUID and identical definition returns the same retained job, preventing duplicate start delivery; changing the definition with that UUID fails. CLI/browser never automatically replay a lost start. A lost connection leaves an uncertain outcome; the run ID is shown so the user can inspect the dashboard. The dashboard can reconnect to the current session job while its report remains retained.

Reports contain step names, method/path **templates**, expected/actual status, duration, cache observations, pass/fail reasons and a definition digest. They exclude bodies, headers, actual captured values and resolved query values. Reports are exportable from the browser or CLI; they are not persisted automatically, and disappear on restart. Do not embed secrets in scenario names, step names or literal path segments because these labels are report metadata. This runner is a sequential correctness test, not a load benchmark.

## Complete joint review: Windows Command Prompt

Stop any earlier fixture on 3000 and proxy on 8080 with Ctrl+C in their own terminals first. The port-8000 historical demo is not needed for the main review. Use the same Python environment in all terminals; if using `.venv`, prefix commands with `.venv\Scripts\activate` in each terminal. The fixture below uses disposable RAM state and does not touch the user's application database.

**Terminal 1 — update, verify, then run upstream on 3000; leave it running:**

```bat
cd /d E:\API-Performance-Auto-Tuner
python -m pip install -e ".[test]"
python -m pytest tests/test_scenarios.py tests/test_console.py -o addopts=""
python -m pytest
node --test tests/workflow.test.cjs tests/product_ui.test.cjs
python examples/cache_upstream.py
```

Node is optional for end users. If it is absent, skip the Node command; pytest reports two optional integrations as skipped. Browser assets do not require Node.

**Terminal 2 — validate and start adaptive proxy on 8080; leave it running:**

```bat
cd /d E:\API-Performance-Auto-Tuner
autotuner config check --config examples/adaptive-demo.json --json
autotuner serve --config examples/adaptive-demo.json
```

**Terminal 3 — open the product console, then optionally run CLI checks:**

```bat
cd /d E:\API-Performance-Auto-Tuner
autotuner status --config examples/adaptive-demo.json --json
autotuner dashboard --config examples/adaptive-demo.json
autotuner scenario preview examples/scenarios/reads.json --config examples/adaptive-demo.json --json
```

Expected: status phase 9 and dashboard at `http://127.0.0.1:8080/_autotuner/dashboard`. Opening it alone leaves API traffic unchanged. A previous retained session is not new live traffic.

1. Click all four views, use Back/Forward and load `#cache` and `#playground` directly. Visibility and highlight must match. Toggle themes and refresh; preference should remain. Try a narrow window and keyboard navigation.
2. In Playground, select `GET /api/products`, enable inspection and send. Check JSON/status/cache reason and separately labeled timings. Send again; requests should appear in Overview. Disable inspection; the new response must not retain body/header content in history.
3. Choose **RAM fixture 3000 — read-only learning**, Preview, then Run. Expect ten completed requests, zero unexpected failures, captured metadata rows and populated metrics/policies. Cache HITs depend on eligible origin observations; they are not a pass requirement. The example uses lower workflow thresholds than product defaults and proves no speedup target.
4. Choose **RAM fixture 3000 — mutation & invalidation**. Preview must show 15 requests and one write. Run stays disabled until **Allow the writes shown** is checked. Run and expect updated price 3500, no stale report result and zero unexpected failures. Repeating is safe in this disposable fixture. Editing the scenario must clear preview approval.
5. Increase cycles/pacing within the documented bounds, preview, run and Stop. Expect the current request to finish and later steps to stay unsent. Export JSON and inspect that bodies, headers and captured values are absent.
6. Open Cache & insights: inspect samples/reuse, candidate/current state, freshness/expiry reasons, decisions and transport/storage counters. Clear cache; learning remains. Pause live, wait, check stale indication, resume. Stop upstream with Ctrl+C and send a request: failures must be visible, never reported as success. Restart the fixture using Terminal 1's final command when finished.

Optional CLI execution (after reviewing the previews; no simultaneous browser job):

```bat
autotuner scenario run examples/scenarios/reads.json --config examples/adaptive-demo.json --json
autotuner scenario preview examples/scenarios/invalidation.json --config examples/adaptive-demo.json --json
autotuner scenario run examples/scenarios/invalidation.json --config examples/adaptive-demo.json --allow-writes --json
autotuner cache explain /api/products --config examples/adaptive-demo.json --json
autotuner report --config examples/adaptive-demo.json --live --format json
```

Use `--output PATH` to export CLI reports; existing files require `--force`. CLI Ctrl+C requests stop after the current request. Exit code 3 indicates failed/interrupted/runtime-limited scenarios, 2 invalid input, 1 local-control/I/O failure, and 0 completed or explicitly stopped.

**Shutdown:** Ctrl+C in Terminal 2 (proxy), then Ctrl+C in Terminal 1 (upstream). Close the dashboard tab. Neither process should be left running between reviews.

## Separate business-demo lifecycle test

`examples/scenarios/lifecycle.json` targets the original business demo, not the RAM fixture. Automated pytest exercises it against a temporary database, capturing generated IDs over two cycles. To manually review it without modifying an existing demo database, stop the 8080 proxy first, then use these separate terminals:

**Terminal A — isolated demo database on 8001 (leave running):**

```bat
cd /d E:\API-Performance-Auto-Tuner
set AUTOTUNER_DB=%TEMP%\autotuner-phase9-review.sqlite3
python -m uvicorn autotuner.main:create_app --factory --host 127.0.0.1 --port 8001
```

This creates or reuses only the named review database in TEMP; choose a fresh filename for an empty run. The historical demo intentionally sends `no-store`, so this workflow tests correctness rather than product shared-cache activation.

**Terminal B — observe proxy on 8080 (leave running):**

```bat
cd /d E:\API-Performance-Auto-Tuner
autotuner serve --config examples/proxy-demo.json --upstream http://127.0.0.1:8001
```

**Terminal C — preview, run with explicit write approval, inspect dashboard:**

```bat
cd /d E:\API-Performance-Auto-Tuner
autotuner scenario preview examples/scenarios/lifecycle.json --config examples/proxy-demo.json --json
autotuner scenario run examples/scenarios/lifecycle.json --config examples/proxy-demo.json --allow-writes --json
autotuner dashboard --config examples/proxy-demo.json
```

Expect eleven ordered requests per cycle, a shipped order with the original unit price, successful 409/422 assertions and corresponding nonzero monitored HTTP error rate. Actual generated IDs vary. Stop Terminal B, then A with Ctrl+C.

## Verification boundary

Exact commands/results, source hashes and package evidence are recorded in `phase_09_validation.json`. The managed Windows sandbox requires `scripts/test_socketless.py` because its standard asyncio self-pipe is blocked. These are in-process ASGI/HTTPX tests, including the actual console, proxy, RAM fixture and isolated business demo. They do not establish real HTTP latency, browser layout correctness or hosted-CI success.

Node checks exercise actual view/active-link handlers with a small DOM harness, theme selection, explicit preview approval, privacy, null metrics and chart gaps. A pytest integration passes real console snapshots to the shipped JavaScript formatter and full renderer using the DOM harness. Actual browser/visual QA remains pending: browser automation failed with a session mismatch and the panel opener failed before inspection. A temporary preview proxy used a different port/storage and did not change the user's database. Review the UI in your normal browser using the startup commands above.

Wheel verification uses the installed setuptools build backend after pip's temporary metadata replacement was denied by the sandbox. Target installation succeeds with TEMP/TMP pointing to `tmp/phase09-pip-temp` inside the workspace. Isolated package checks use the existing environment dependencies, not a clean dependency resolution. No package has been published and no performance target is newly claimed.
