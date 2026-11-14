# Phase 5: storage and reporting

Status: implemented, awaiting joint review. Scope: MET01/MET02/MET03 and RPT01 from the product PRD. Forwarding remains observation-only; no shared cache serving or tuning has been added in this phase.

## Delivered behavior

- SQLite summaries survive a restart and are isolated from the demo's business database.
- A single background thread aggregates observations through a bounded, nonblocking producer queue. Forwarding never waits for a SQLite write. Transactions batch at most 64 observations.
- Each persisted duration-frequency row groups a UTC minute, session, timing boundary, configured method/template, status, cache outcome and exact measured duration. Repeated equal observations increment a frequency count. Request bodies, response bodies, cookies, authorization, raw request paths and query strings are never captured.
- JSON run reports and CSV endpoint summaries include tool version, Python source fingerprint, session/config identity, counts, errors, outcomes, exact means and nearest-rank p50/p95/p99.
- Config digests identify the validated effective configuration. SHA-256 is computed before redaction; exports replace upstream authority, listener and local storage path with placeholders. Explicit operation templates remain visible. A fingerprint is identity evidence, not a signature or a measured benchmark result.
- Session history includes start/end UTC times and recorded storage health. An absent clean-shutdown timestamp means the session could still be running or could have exited abruptly.

Default memory retention is a **combined 10,000 raw observations across both proxy and upstream histories**, with an additional bounded 1,024-observation writer queue and a transaction batch of at most 64. A request can produce two observations, one for each timing boundary. The two counters must not be added together as a business request total. The demo's separate metrics implementation retains its existing behavior.

## Commands

| Command | Behavior |
|---|---|
| `autotuner status --json` | Live phase/mode, transport counters, storage health and pressure counters |
| `autotuner endpoints --window 300 --json` | Live rolling raw-window metrics, evictions and possible incomplete-window flag |
| `autotuner sessions --json` | Read retained sessions from SQLite without starting a proxy |
| `autotuner sessions --live --json` | Flush earlier accepted observations and list sessions from the running proxy |
| `autotuner report --format json` | Read latest retained session for the exact effective config from disk |
| `autotuner report --format csv` | CSV endpoint rows, with identity and sample-completeness columns |
| `autotuner report --live --format json` | Flush earlier accepted observations and report the current live session |
| `autotuner report --session ID` | Select a retained session belonging to the same effective config |
| `autotuner report --output PATH` | Write an export, refusing existing files unless `--force` is given |

All commands accept `--config PATH`. Reports written to stdout are directly usable JSON/CSV; successful file export writes its confirmation to stderr. Local control requests bypass HTTP proxy environment settings and do not follow redirects. Report/config mismatch, unavailable storage and incompatible schemas fail with a sanitized runtime error. No offline command creates a missing telemetry database.

Read-only exports use a consistent SQLite read transaction. Prefer `--live` while serving: an external reader can briefly block the writer, and resulting pressure is counted. Reserved `GET /_autotuner/report` and `GET /_autotuner/sessions` expose the same live functionality; they do not create business traffic.

## Configuration

Existing v1 configuration files continue to load with defaults. New fields:

```json
{
  "metrics": {
    "raw_capacity": 10000,
    "retention_days": 7,
    "storage_max_bytes": 104857600,
    "storage_path": ".autotuner/metrics.sqlite3",
    "writer_queue_capacity": 1024
  }
}
```

`storage_path` resolves relative to the configuration file for CLI commands; directly constructed Python sessions use the supplied path. The supplied `examples/proxy-demo.json` points to `../.autotuner/metrics.sqlite3`, placing its telemetry under the repository root. SQLite in-memory/URI destinations and NUL paths are rejected. Use a dedicated telemetry file: foreign database schemas and unsupported telemetry versions are refused without changing their data.

`storage_max_bytes` has a 128 KiB minimum. Approximately half the configured allowance is reserved for SQLite's rollback journal, with additional slack for headers and the writer lock. The main database page limit uses `floor(budget / 8192) - 4` pages of 4096 bytes. Consequently a 100 MiB allowance does not mean 100 MiB of summary payload. SQLite page/metadata overhead also consumes space. A configuration whose own metadata cannot fit is reported as unavailable.

The configured allowance covers telemetry SQLite files, not exported reports, SQLite query working memory, Python metadata or OS caches. A separate zero-length SQLite writer-lock file uses an OS-managed exclusive lock. Only one writer can own a telemetry path; a second proxy continues forwarding with degraded telemetry health. OS locks are released on exit, so an abrupt stop requires no manual PID-lock cleanup. SQLite rollback recovery remains SQLite's responsibility.

## Retention and pressure semantics

- Retention runs at startup, accepted writes, live export and graceful shutdown. Idle storage is cleaned on its next such operation. Minute buckets older than the retention cutoff are removed; bucket rounding can retain up to one extra minute.
- History is capped at 100 sessions per database. Expired sessions and older overflow sessions are removed. Changing config retains separately identifiable sessions until those limits apply.
- At the disk page limit, oldest minute buckets are removed, even when that bucket belongs to the current session. Older session metadata can also be removed when needed for a startup/checkpoint. If a bounded transaction still cannot fit, its observations are dropped and counted. The tool does not grow past the database page budget to save telemetry.
- A full producer queue drops new telemetry observations immediately. It does not reject the API request or fabricate a successful telemetry write.
- Open/permission/schema faults show `state=degraded`. Write/lock/full errors increment counters; later successful writes can recover the state. Initial open or second-writer failures require a restart after fixing the cause.
- Ctrl+C through Uvicorn drains accepted writes, records a clean shutdown and closes the worker. Forced termination can lose queued observations; it does not record a clean shutdown. Shutdown drain time depends on pending work and disk behavior.

Storage health fields include `queue_depth`, `queue_capacity`, `disk_bytes`, `disk_budget_bytes`, `enqueued_observations`, `persisted_observations`, `dropped_queue`, `dropped_storage`, `write_errors`, `retention_truncated`, `budget_truncated`, `sessions_truncated` and `sampling_incomplete`. Truncation/drop counts refer to observations across both timing boundaries. Storage health is a checkpoint snapshot in offline reports, not a claim about the current health of another process.

`persisted_observations` is cumulative writes for that session and may exceed retained report counts after truncation. The live process can report losses of rows belonging to earlier sessions; affected retained session reports are marked incomplete too. Deleted sessions no longer have an export. `sessions_truncated` explains history loss separately from route counts.

`sampling_may_be_incomplete` is also set for a session without clean shutdown or with pending work at its checkpoint. This conservatively covers active sessions and unknown losses after a crash. Raw-window `evicted_samples` and `window_may_be_incomplete` describe in-memory eviction, independently of durable-summary completeness. An empty report means no retained samples; faults produce an error instead of invented zero latency.

## Measurement and report boundaries

Proxy timing measures server handling through downstream completion. Upstream timing measures active upstream I/O excluding local admission and downstream send waits. Transport counters additionally describe failed attempts, cancellation and incomplete responses. Incomplete upstream streams are not misrepresented as completed upstream samples.

Persisted reports cover a **retained session**, not an arbitrary last-N-seconds window. Buckets have minute resolution, but grouped duration values retain their original floating-point precision. Weighted nearest-rank percentiles are exact for the retained samples; they are not percentile averages or approximated histogram bounds. Live `endpoints` still calculates RPS across its full selected window. No persistent-session RPS or causal speedup is inferred from partial samples.

The source fingerprint identifies packaged Python code. Reports describe observed proxy traffic, not a reproducible replay workload or a performance benchmark. Phase 6 will add insights; safe generic caching and automatic tuning remain Phases 7 and 8.

## Joint review

Stop the old proxy on 8080. Keep or restart the demo on 8000 using `start.bat --no-browser`. From the repository root:

```cmd
python -m pip install -e ".[test]"
python -m pytest tests/test_storage.py tests/test_proxy.py tests/test_cli.py -o addopts=""
python -m pytest
```

In a separate terminal:

```cmd
autotuner serve --config examples/proxy-demo.json
```

In the test terminal:

```cmd
curl.exe http://127.0.0.1:8080/api/products
curl.exe http://127.0.0.1:8080/api/reports/sales
autotuner status --config examples/proxy-demo.json --json
autotuner report --config examples/proxy-demo.json --live --format json
autotuner report --config examples/proxy-demo.json --live --format csv
autotuner sessions --config examples/proxy-demo.json --live --json
```

Expect phase 5, storage ready/persistent, no storage drops on this small workload, and two timing-boundary rows per observed operation. Cache hits remain zero at the generic proxy. The demo's own cache is independent.

Stop the proxy with Ctrl+C and run:

```cmd
autotuner sessions --config examples/proxy-demo.json --json
autotuner report --config examples/proxy-demo.json --format json
```

Expect retained counts and `shutdown_recorded=true`. Restart the proxy and list sessions: the previous session remains available, while the new session starts with an empty history. Export the older one using its ID:

```cmd
autotuner report --config examples/proxy-demo.json --session YOUR_PREVIOUS_SESSION_ID --format csv
```

To save an export, add `--output YOUR_REPORT_PATH`; an existing file requires `--force`. Review the JSON for redaction and identity, and compare route counts and percentiles with the traffic you sent. Automated pressure tests use temporary databases and injected synchronization; they never target the demo business database.

Managed-sandbox verification uses the socketless pytest runner. Normal-terminal live forwarding, Ctrl+C drain, offline exports and restart persistence remain joint-review checks until run on the user's machine. Windows/Linux/macOS qualification and sustained overhead/memory benchmarks are still Phase 10 work. Stop here for review before Phase 6; provide the commit title after that review.
