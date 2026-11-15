# Phase 10: reliability and qualification evidence

Status: implementation ready for joint review; performance qualification, reference-host validation, 30-minute stability and hosted compatibility evidence remain pending. Baseline commit: `79ff6ad` (reviewed Phase 9). This phase does not publish a package or start Phase 11.

## Quick-run review and timing correction

The 60-second external recovery check returned to `ready` but still recorded 31 write errors, so the new telemetry gate correctly failed. A reproducer identified page-level fragmentation: deleting one small audit row per retry could exhaust the retry bound without releasing a page for metric-table growth. The fix reclaims bounded groups of up to eight oldest audit records, preserving per-session truncation accounting and the configured disk limit. The mixed small-audit/metric regression uses actual controller records; a structural reproducer completed 250 audit and 500 metric writes without errors. This is storage-correctness evidence, not new HTTP/performance qualification. A short source-matched recovery rerun remains required; use a fresh output filename such as `tmp/phase10-storage-recovery-v2.json` with the 60-second command below.

The subsequent user soak completed 1,801 seconds and 106,400 requests with zero unexpected response failures, zero late-half task growth and about 3.03 MiB late-half RSS growth. It also recorded 18,492 storage write errors and degraded persistence under the 128 KiB pressure budget. The original forwarding/resource stability gate passed, but this is not evidence of healthy persistence. The qualification workload still had an invalid overhead pair; median repeated-read benefit was 84.97% for that workload.

The storage follow-up reclaims bounded oldest audit records as well as metric buckets when SQLite reaches its page budget. It retries within a fixed bound, attributes truncated audit history to the correct session, and marks overall sampling incomplete when audit records are lost. A real minimum-budget SQLite regression fills the audit table, then writes metrics and verifies healthy persistence, no write errors, disclosed truncation and disk bounds. A separate `telemetry_health` gate now fails degraded/nonpersistent writers or recorded write errors even when API forwarding/resource stability passes. Expected bounded retention or queue losses remain visible and are not fabricated into complete history.

Validate this targeted fix using a short pressure run before investing in another full soak:

```bat
cd /d E:\API-Performance-Auto-Tuner
python -m pip install -e ".[test,benchmark]"
python -m pytest
python -m autotuner.quality coverage.json
autotuner benchmark --profile soak --duration-seconds 60 --output tmp/phase10-storage-recovery.json
```

This single terminal needs no manually started servers. Expect `telemetry_health: passed`, persistent state ready, zero write errors and truthful incompleteness/truncation counters. The short run must keep `stability_30_minutes: not_qualified`; the new code still needs full-duration external verification and the performance/reference-host/CI gates before release. Owned servers stop on completion or Ctrl+C.

The final implementation follow-up adds a maximum 20 ms / 64-observation telemetry batching window. The background writer can coalesce small arrivals rather than immediately committing each one; API forwarding never waits for this interval. Export, decision and close messages remain FIFO barriers, and SQLite FULL synchronization and ordinary shutdown draining are retained. Health/report fields expose `writer_batch_window_ms`, `writer_batch_limit`, `write_batches` and `largest_batch_observations`. This changes the asynchronous batching interval, not the already documented crash/checkpoint durability boundary. Actual overhead after batching remains pending a source-matched HTTP rerun.

The user qualification run passed response correctness/accounting/shutdown/memory and showed 74.52% median repeated-read benefit, but median overhead was 3.73 ms and one direct baseline achieved only 71.88 requests/s with a 287.57 ms p95. Such a pair cannot qualify overhead at the required offered rate. The gate evaluator now marks overhead results `invalid_workload` when any paired overhead cohort misses the unchanged rate requirement, while preserving all raw comparisons and their threshold outcome. No cohort is discarded or automatically replaced. Correctness and other independent gates remain independently visible; the offered-rate failure still blocks qualification.

The user ran all 48 quick cohorts on Windows/Python 3.12. Correctness, cache accounting, shutdown and idle memory passed. The report showed 36.75% median repeated-read improvement, but observe overhead and the achieved-rate gate failed. That report remains historical evidence and is not silently replaced by a favorable summary.

Investigation found roughly 330 ms of scheduling lag across direct and proxy cohorts. The load generator started its pacing clock before constructing/entering HTTPX's client. Initialization consumed most of a 40-request schedule, causing catch-up bursts. The earlier rate/latency results therefore do not establish the intended steady 100-request/s experiment.

Measurement revision 2 starts the workload clock after client initialization, stops it after the last response, and records client setup/close separately. Absolute deadlines are rechecked after early timer wakeups, preventing early dispatch. Clock implementation/resolution is included in environment metadata. Cold connections and adaptive learning still occur within measured requests; request counts, rate, SQL workload, thresholds and correctness checks remain unchanged. No system timer setting or event-loop policy is changed.

A controlled-clock regression injects eight seconds of setup and seven seconds of close work, and verifies that neither shifts the dispatch schedule nor inflates the measured workload. Additional checks cover early timer wakeups and cancellation while pacing. An ASGI instrumentation probe also found repeated construction of identical policy audit records; those records are now materialized only when the existing decision signature changes. Audit histories, thresholds, cooldown and public results remain covered by the controller regressions. These probes are structural evidence, not real HTTP speedup measurements.

Keep the earlier report and run this follow-up in one Command Prompt terminal (the benchmark owns all required servers):

```bat
cd /d E:\API-Performance-Auto-Tuner
python -m pip install -e ".[test,benchmark]"
python -m pytest
python -m autotuner.quality coverage.json
autotuner benchmark --profile quick --output tmp/phase10-quick-after.json
```

Expected report field: `measurement_revision: 2`. Inspect correctness, accounting, shutdown, overhead, achieved throughput and scheduling lag. Compare only source-matched runs with the same measurement revision for qualification; retain the first run to explain the correction. Real HTTP overhead after this change remains unverified until that rerun. Normal completion stops owned servers; Ctrl+C interrupts and stops them. No demo or dashboard startup is required.

## Delivered scope and evidence boundaries

| Area | Deliverable | What remains to verify |
| --- | --- | --- |
| Controlled performance | Installed `autotuner benchmark`, disposable SQL fixture, four modes, four workload cohorts, three or more alternating repetitions, response hashes and raw client samples | Real HTTP results on the agreed reference host |
| Memory and resources | Optional psutil RSS samples, lifetime cache-accounting high-water mark, in-flight/hot-read/task status, bounded soak checkpoints | Reference-host RSS and full sustained-run growth review |
| Fault/stress | Unique-key pressure, admission limits, expected origin errors, mutation invalidation, cancellation storms and storage pressure with isolated data | Real long-duration execution, checkpoint and incomplete-telemetry review |
| Coverage | Existing 90% combined gate retained; separate 90% core statement and branch gates | All selected CI matrix jobs |
| Compatibility/install | Windows/Linux/macOS × Python 3.11/3.12/3.13 CI, clean-venv wheel smoke script, short HTTP/soak smoke jobs and archived artifacts | Hosted CI has not been run by this session |
| Reproducibility | Full JSON report with source/config digests, effective fixture config, hardware/software metadata, request hashes, raw timings, gate states and shutdown outcomes | External reproduction and joint acceptance |

The original `scripts/benchmark.py` and its historical application-specific results remain separate. They do not qualify the generic product. The new command measures the actual `ControlSession`/`ObservationProxy` data plane against an isolated real SQL fixture.

Phase 1 anticipated `benchmark --scenario PATH`. Phase 9 now provides arbitrary declarative correctness workflows through `scenario run`. For reliability qualification, this phase deliberately provides reviewed **fixture profiles**, not concurrent replay of arbitrary user scenarios or writes against a user-configured upstream. That CLI boundary is a review decision; generic upstream load generation is not claimed.

## Isolated process protocol

The coordinator creates an owned temporary directory, seeds a new SQLite file with exclusive creation, starts a fixture child on an OS-assigned loopback port, and starts a separate proxy child for proxy modes. It never reads `autotuner.json`, `AUTOTUNER_UPSTREAM`, demo databases or a running user's proxy. All fixture mutations remain inside that disposable dataset. No management token, browser or Node process is required.

Each child reports its actual bound port only after startup. Its stdin stop message requests ordinary Uvicorn shutdown and storage drain. The parent waits up to 15 seconds, then kills only that owned child and marks shutdown non-graceful. Startup failure, network errors, Ctrl+C and process cleanup are tested. Incomplete/runtime-failure output is explicitly marked as non-evidence, rather than resembling a successful benchmark.

The fixture performs a real SQL GROUP BY over deterministically seeded orders for every `/report` origin load. No handler sleeps, injected baseline delay, cache-only shortcut in the upstream, SQL optimizer manipulation or artificial timing threshold reduction is used. Response JSON is padded with legal JSON whitespace to exactly 1 KiB. Reference response hashes are computed independently from the seeded arithmetic, not copied from whichever mode happened to respond first. SQLite connections explicitly close after transactions, including on Windows.

## Benchmark cohorts

| Cohort | Requests and purpose |
| --- | --- |
| `overhead` | GET `/payload`, fixed 1 KiB response, intended 100 requests/s and concurrency 8; direct versus observe overhead |
| `repeated` | Reused GET `/report`; actual SQL aggregation; adaptive learning costs included |
| `unique` | GET `/report` with a different query key each time; same correct SQL response, distinct cache keys; report unfavorable low-reuse behavior |
| `mixed` | Read epochs separated by acknowledged POST `/mutate`; verify the new aggregate/version after every mutation |

Every cohort runs `direct`, `observe`, `off` and `adaptive`. Even-numbered repetitions reverse the order. Every mode gets a newly seeded dataset with identical contents, one direct SQL warmup, fresh proxy state and a new client pool. The proxy receives no warmup traffic, so cold policy learning remains in measured latency. Default adaptive thresholds remain 2 ms to activate and 1.5 ms to retain.

The load generator has at most `concurrency` worker tasks, bounded samples and no request retries or redirect following. Pacing uses scheduled dispatch times and reports scheduling lag; throughput is **achieved**, not presumed from the offered rate. Raw latency is client request through complete response; it includes worker admission when applicable and excludes explicit pacing. Read epochs finish before a mutation, and its result is verified before dependent reads begin. No warmup or diagnostic export is counted as workload traffic.

Outside the measured workload, read-only diagnostics may retry a 503 busy-writer response up to 20 times with 100 ms pacing. API requests and writes are never retried. Proxy completed-request counters reconcile with the client count. Fixture read/write/failure deltas show origin loads. Status and persisted report snapshots disclose storage drops and incomplete history.

Correctness failures block latency-comparison gates. They do not disappear into a mean or get dropped from the samples. All cohort timings remain in the JSON, including slow or unsuccessful results. Expected soak 503s remain HTTP errors even when their expected-status checks pass.

## Profiles, bounds and output

| Option/profile | Behavior |
| --- | --- |
| `quick` (default) | 40 requests per cohort, 2,000 orders, concurrency 8, rate 100/s, three repetitions; smoke/diagnostic run |
| `qualification` | 120 requests per cohort, 50,000 orders, otherwise same defaults; evaluate proposed performance thresholds |
| `soak` | 1,800 seconds, 50,000 orders, batches of 100, adaptive mode; mixed repeated/unique reads, mutations and expected 503s |
| Common bounds | Requests 20–100,000; concurrency 1–64; repeats 3–10; orders 8–1,000,000; rate 1–1,000/s |
| Total raw report bound | At most 200,000 samples across all four-mode/four-workload repetitions |
| Paced batch bound | Requests/rate at most 600 seconds for paired runs, 60 seconds for soak checkpoints; actual slow responses add work time |
| Soak bounds | Duration 1–3,600 seconds; at most 3,601 retained checkpoints, with truncation explicitly blocking stability qualification |
| Pressure limits | Soak uses 64 KiB cache accounting, 16 entries, 128 raw observations, queue 32 and 128 KiB persistent storage budget |
| JSON | Authoritative full evidence: all cohorts, raw samples/hashes, source files, canonical configs, host metadata and gates |
| CSV | Summary rows with source/config digests and gate states; includes a soak summary row, but not full raw samples/checkpoints; retain JSON for reproduction |

RSS samples are optional through `.[benchmark]` (`psutil`); missing measurements remain null. Idle proxy RSS is measured after readiness and before load. The sampled peak is checked at approximately 200 ms intervals; it is not an instantaneous RSS maximum. Cache `peak_accounted_bytes` tracks every successful reservation, including staging and pinned representations, and persists for the lifetime of the session. Python metadata/allocator overhead is assessed through RSS separately.

`--output PATH` is required. The destination is reserved before traffic starts; existing files require explicit `--force`. Output parents must already exist. Progress goes to stderr. Neither successful benchmark reports nor failure markers contain response bodies, user headers or resolved query values. Fixture names and report paths are local test data.

Exit codes: 0 completed smoke checks; 1 runtime/launch failure; 2 invalid input/output path or overwrite conflict; 3 correctness, cache-budget, shutdown or requested qualification assertion failure, including interrupted runs. Quick mode reports performance threshold misses but does not fail solely because a non-reference smoke host missed a speed target. Qualification mode fails measured failed gates. `--require-gates` also fails missing/unconfirmed gates. Every report stays `qualification_status: review_required`: publication requires reviewing separate performance, soak, coverage, compatibility and reference-host evidence.

## Gate interpretation

| PRD requirement | Evaluation |
| --- | --- |
| Repeated-read benefit | Median of paired off-versus-adaptive mean-latency reductions must be ≥20%; only after status/hash/counter correctness |
| NFR01 overhead | Median paired p50 addition ≤3 ms; median paired p95 addition ≤8 ms; achieved overhead-cohort rate 95–105/s at configured 100/s |
| Reference environment | Explicit `--reference-host` attestation plus Python 3.12, measured four physical cores, 7–9 GiB total RAM (8 GiB nominal) and concurrency 8; exact OS/CPU/Python recorded |
| NFR02 memory | Idle proxy RSS ≤150 MiB; all-reservation cache-accounting high-water mark ≤configured byte budget |
| NFR03 coverage | `python -m autotuner.quality coverage.json` independently enforces ≥90% core statements and ≥90% core branches; ordinary pytest still enforces its combined floor |
| NFR04 stability | At least 1,800 seconds and 30 checkpoints, no unexpected errors, graceful shutdown, settled coordination/in-flight state, observed hits/misses/mutations/faults, available RSS, no checkpoint truncation |
| Growth diagnostics | Late-half RSS growth ≤16 MiB and active-task growth ≤2; these explicit engineering diagnostics supplement review of checkpoint history rather than prove arbitrary future boundedness |
| NFR05 compatibility | Hosted matrix and clean install artifacts must pass; not inferred from one Windows in-process suite |
| NFR06 trust | Explicit invocation, owned loopback-only fixture/processes, no arbitrary replay or user upstream mutation; existing isolation/default tests retained |

The 7–9 GiB recognition band and growth diagnostic bounds are implementation choices for joint review, not retroactively measured PRD achievements. A laptop or shared CI runner can produce useful evidence while remaining an unconfirmed reference host. A 2-second soak is only a smoke check. Missing gates must not be treated as passed or used to authorize a public beta.

## Complete joint review commands: Windows Command Prompt

**One terminal only.** No upstream, dashboard or proxy startup command is required: the benchmark starts/stops its own isolated processes and uses dynamic ports. Existing demo servers on 3000/8000/8080 can be stopped in their terminals with Ctrl+C to avoid competing CPU/disk work. Do not start the old demo benchmark alongside this one.

Use the same Python environment throughout; if using `.venv`, first run `.venv\Scripts\activate` in this terminal.

```bat
cd /d E:\API-Performance-Auto-Tuner
python -m pip install -e ".[test,benchmark]"
python -m pytest tests/test_qualification.py tests/test_reliability.py tests/test_install_contract.py -o addopts=""
python -m pytest
python -m autotuner.quality coverage.json
node --test tests/workflow.test.cjs tests/product_ui.test.cjs
autotuner benchmark --profile quick --output tmp/phase10-quick.json
```

The repository already contains `tmp` after tests. If using a fresh installed tool elsewhere, use an existing output directory or a filename in the current directory. Node is optional for runtime but runs developer JavaScript checks here.

Expected quick result: progress for three repetitions × four workloads × four modes (48 cohorts), then a report path. Inspect `gates.correctness`, `gates.cache_budget` and `gates.shutdown` for `passed`; inspect all reported values and `qualification_status: review_required`. RSS should be numeric after installing the benchmark extra. A runtime failure is not a performance result. Existing report files are preserved unless you add `--force` deliberately.

**After reviewing quick output, use the same terminal for the full paired workload:**

```bat
autotuner benchmark --profile qualification --output tmp/phase10-qualification.json
```

This can take several minutes. Exit 3 means a measured threshold failed; send the report rather than changing thresholds or reducing the workload. Add `--reference-host` only when the allocated host actually matches the documented reference. Otherwise leave that gate unconfirmed. Do not use `--require-gates` to expect a complete release pass from a paired report: its long-run/hosted-CI gates intentionally require separate evidence.

**Short fault/pressure smoke, then the deliberate 30-minute run when ready:**

```bat
autotuner benchmark --profile soak --duration-seconds 5 --orders 2000 --requests 40 --output tmp/phase10-soak-smoke.json
autotuner benchmark --profile soak --duration-seconds 1800 --output tmp/phase10-soak.json
```

The short result should explicitly remain `not_qualified` for stability. The long run reports expected HTTP errors separately from unexpected assertion failures, records bounded checkpoints and still needs review. Stop early with Ctrl+C; the owned children shut down and output is marked interrupted, exit 3. Normal completion stops all owned servers automatically. No extra shutdown terminal commands are needed.

**Optional clean install reproduction:**

```bat
python -m pip wheel . --no-deps --wheel-dir dist
python scripts/smoke_wheel.py dist/api_performance_auto_tuner-2.0.0-py3-none-any.whl
```

This creates an owned temporary virtual environment, installs the wheel and runtime dependencies from the configured package index, verifies CLI/config/serve-check and bundled resources outside the checkout's import path, then removes the owned environment. It does not publish anything. The local target-install smoke is a different, weaker boundary when fresh dependency resolution is unavailable.

**Optional status/doctor review against your normal adaptive demo:**

Terminal A (leave running):

```bat
cd /d E:\API-Performance-Auto-Tuner
python examples/cache_upstream.py
```

Terminal B (leave running):

```bat
cd /d E:\API-Performance-Auto-Tuner
autotuner serve --config examples/adaptive-demo.json
```

Terminal C:

```bat
cd /d E:\API-Performance-Auto-Tuner
autotuner status --config examples/adaptive-demo.json --json
autotuner doctor --config examples/adaptive-demo.json --session --json
```

Expect phase 10, uptime, effective limits and runtime diagnostics. `doctor` without `--session` remains offline; `--connect` separately performs its explicit upstream TCP check. Stop Terminal B, then A with Ctrl+C.

## CI and remaining decisions

`backend.yml` now defines nine OS/Python combinations with Node checks, the full Python suite, independent core coverage floors, wheel build, fresh-venv install, short real HTTP benchmark and short soak. Artifact retention includes results even when later steps fail. `qualification.yml` is manual-only and runs full paired and 30-minute profiles on all three OSes; it is not scheduled or launched by this development session. Shared runners do not automatically establish the reference hardware.

Remaining release decisions: reproduce performance on a declared reference host, inspect the sustained checkpoint histories, execute the hosted matrix, review the profile/CLI boundary and diagnostic bounds, and collect a source-matched report for acceptance. A failed cache correctness gate blocks release regardless of speed. Publication, tagged releases and external pilot onboarding belong to Phase 11 after this review.

Exact executed commands, results, package hashes and verification limits are in `phase_10_validation.json`. Managed Windows verification uses the socketless polling runner with in-process ASGI tests. Real benchmark child startup failed in the sandbox; no real HTTP latency, RSS, reference-host, 30-minute stability or hosted-CI achievement is claimed here.
