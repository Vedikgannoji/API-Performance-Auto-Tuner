# Phase 14 guided analysis and baseline review

The baseline CLI captures existing proxy observations and advisory findings or explicitly runs a reviewed GET workload. The menu offers passive baseline capture. Active workloads require CLI preview and an exact review token tied to the config, path, workload bounds, environment, window and report destination. The proxy verifies the expected session before accepting the scenario. Active tests allow one selected concrete path, one request at a time, 1–20 requests, 100–1000 ms between requests, a 1–5 second request timeout, and a planned request budget of at most 90 seconds. The developer supplies the test-data path and attests local or staging use. Requests carry no user-supplied query, headers or body. The first response other than HTTP 200, timeout or execution error ends the scenario. Interrupted runs request a stop after the current request. If capture fails, the reserved report preserves any available workload result with an incomplete state.

The report distinguishes scenario timings from rolling proxy and upstream observations. Rolling data includes evidence counts, queue findings, suitability, and storage quality from the existing analysis engine. Resource evidence is limited to runtime counters, cache accounting and storage health. Identity fields record proxy session and version, client source hash, config digest and, where applicable, workload digest. These are baseline inputs for a later comparison workflow.

## Windows review

Run the following in Command Prompt. Use ports 3000 and 8080 only if they are free. The example creates a disposable upstream and stores the generated config and baseline files under `tmp\baseline-review`.

Terminal 1, start the upstream and leave it running:

```bat
cd /d E:\API-Performance-Auto-Tuner
.venv\Scripts\activate
python -m autotuner demo --listen 127.0.0.1:3000
```

Terminal 2, generate the config and start the proxy. Replace `YOUR_SETUP_TOKEN` with the token printed by the first setup command. If reusing an existing review directory, choose fresh output filenames or a fresh directory.

```bat
cd /d E:\API-Performance-Auto-Tuner
.venv\Scripts\activate
mkdir tmp\baseline-review
echo {"openapi":"3.1.0","paths":{"/api/products":{"get":{}}}}>tmp\baseline-review\openapi.json
python -m autotuner setup --project tmp\baseline-review --select 1 --upstream http://127.0.0.1:3000 --output review.json --json
python -m autotuner setup --project tmp\baseline-review --select 1 --upstream http://127.0.0.1:3000 --output review.json --json --apply YOUR_SETUP_TOKEN
python -m autotuner serve --config tmp\baseline-review\review.json
```

Terminal 3, generate one explicit request, capture passive evidence, then preview the active baseline. Replace `YOUR_BASELINE_TOKEN` with the token printed by the active preview. Expect `written: false` in preview and `written: true` after applying. Inspect `active_result` for the five timed GETs and `insights` for sample sufficiency and advisories. A fast fixture can produce zero findings.

```bat
cd /d E:\API-Performance-Auto-Tuner
.venv\Scripts\activate
curl.exe http://127.0.0.1:8080/api/products
python -m autotuner baseline --config tmp\baseline-review\review.json --output tmp\baseline-review\passive.json --json
python -m autotuner baseline --config tmp\baseline-review\review.json --output tmp\baseline-review\active.json --get /api/products --environment local --requests 5 --json
python -m autotuner baseline --config tmp\baseline-review\review.json --output tmp\baseline-review\active.json --get /api/products --environment local --requests 5 --json --apply YOUR_BASELINE_TOKEN
```

Stop the proxy in terminal 2 with Ctrl+C, then stop the upstream in terminal 1 with Ctrl+C.

## Verification

| Check | Result |
| --- | --- |
| `python scripts/test_socketless.py tests/test_baseline.py tests/test_terminal.py tests/test_console.py tests/test_insights.py -o addopts=""` | 122 passed |
| `python scripts/test_socketless.py --junitxml=tmp/phase14-tests.xml --tb=short` | 620 passed, 1 skipped, 96.30% aggregate coverage |
| `python -m autotuner.quality coverage.json` | 100% statement and branch coverage for the quality-gated modules |
| Wheel and source distribution build and `twine check` | Both distributions passed |
| Isolated CLI smoke from the extracted wheel | Discovery, reviewed setup and offline baseline preview passed using the existing venv dependencies |

Automated proxy coverage used in-process ASGI in the managed Windows sandbox. The separate live Windows TCP review passed. The passive report recorded one request, and the active report recorded five HTTP 200 responses with zero errors, a mean of 4.81 ms, and a p95 of 9.96 ms. The active report's rolling metrics counted six requests, including the earlier manual GET. Both reports identify the same proxy session. No advisory threshold was exceeded in the active capture.
