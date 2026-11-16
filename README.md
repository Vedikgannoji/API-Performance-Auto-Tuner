# API Performance Auto Tuner

Local API monitoring, performance insights and adaptive response caching. **The current development snapshot is 2.1.0.dev0. Full performance qualification and package-registry publication remain pending.**

Observe latency, throughput, errors and queueing. Opt into fixed or adaptive response caching with route rules and dependent-write invalidation. Inspect policy decisions, execute ordered API scenarios and export bounded persistent telemetry.

Discover FastAPI route candidates or import OpenAPI operations, then review an observe configuration for your upstream. The terminal workspace provides configuration, session insights and cache controls. Guided optimization and live terminal comparisons are planned. See the [preview release notes](docs/release/v2.0.0b2.md).

## Install from source

Python 3.11–3.13 is the target range; the hosted OS/Python matrix still requires execution. Windows Command Prompt:

```bat
cd /d E:\API-Performance-Auto-Tuner
python -m venv .venv
.venv\Scripts\activate
python -m pip install -e ".[test,benchmark,release]"
autotuner --version
```

For a built wheel, use `python -m pip install path-to-wheel.whl` in a virtual environment, or `pipx install path-to-wheel.whl` for an isolated CLI. uv is optional. Registry availability and publisher ownership are not yet verified; do not install a similarly named registry package assuming it is ours.

## Try it in three terminals

For keyboard-operated configuration, session insights, cache controls and exports, run `autotuner` in a terminal or `autotuner menu --project .`. Select a number or letter and press Enter. Use **b** to go back, **q** to quit and **h** for help. Opening the workspace stays offline and does not scan or modify your project.

Choose **Setup and configuration → Discover project API operations** to inspect the selected project. Start the proxy separately for session actions, as shown below. Browser use is optional. See the [terminal guide](docs/TERMINAL_GUIDE.md).

Scripts can use `autotuner menu --json` to list available actions without prompts. Bare `autotuner` prints help when input or output is redirected; explicit interactive entry requires terminal input and output. Use `autotuner --no-input COMMAND ...` to make non-interactive intent explicit.

Terminal 1 — disposable RAM upstream, resets on restart. Keep running:

```bat
cd /d E:\API-Performance-Auto-Tuner
.venv\Scripts\activate
autotuner demo --listen 127.0.0.1:3000
```

Terminal 2 — observe-only proxy. Keep running:

```bat
cd /d E:\API-Performance-Auto-Tuner
.venv\Scripts\activate
autotuner init --config beta.local.json --upstream http://127.0.0.1:3000
autotuner serve --config beta.local.json
```

If beta.local.json already exists, reuse it and skip init. Overwrite only deliberately with `--force`.

Terminal 3 — traffic and monitoring:

```bat
cd /d E:\API-Performance-Auto-Tuner
.venv\Scripts\activate
curl.exe -i http://127.0.0.1:8080/api/products
autotuner status --config beta.local.json --json
autotuner dashboard --config beta.local.json
autotuner insights --config beta.local.json --json
```

Stop terminals 1 and 2 with Ctrl+C after testing. The dashboard is at http://127.0.0.1:8080/_autotuner/dashboard. The original application on port 8000 is separate: [demo guide](README_DEMO.md).

## Review adaptive caching

Stop terminal 2 with Ctrl+C, then run `autotuner serve --config examples/adaptive-demo.json` there. Keep terminal 1 running. In terminal 3:

```bat
for /L %i in (1,1,8) do @curl.exe -s -o NUL http://127.0.0.1:8080/api/products
autotuner cache explain /api/products --config examples/adaptive-demo.json --json
autotuner dashboard --config examples/adaptive-demo.json
```

Preview the mutation/invalidation scenario and acknowledge its writes before running. Fast origins can correctly remain uncached. For your own API, approve routes and invalidation dependencies explicitly; demo rules are examples.

## Product boundaries

- One local worker, loopback listener, finite HTTP requests; no WebSockets or distributed cache.
- Observe mode does not serve cached responses. Adaptive mode adjusts approved cache policies, not application code or database indexes.
- Credentials, private/no-store responses and unsupported semantics bypass shared caching. Configure write invalidation for all dependencies.
- SQLite retention, queues and memory are bounded; exports disclose sampling loss.
- Management has no mandatory token. Keep it local and do not expose it to untrusted clients.
- Qualification remains incomplete: reference-host overhead, current-source 30-minute soak, hosted compatibility CI and external pilot review are pending. Historical workload improvements are not universal guarantees.

## Develop

```bat
python -m pytest
python -m autotuner.quality coverage.json
node --test tests/workflow.test.cjs tests/product_ui.test.cjs
python -m build
python -m twine check dist/*
python scripts/smoke_wheel.py dist
autotuner release check --evidence docs/release/candidate.json --json
```

Keep dist limited to one wheel. The pending release check deliberately exits **3**. Node is needed for JavaScript checks. In the managed Windows sandbox only, use `python scripts/test_socketless.py` instead of pytest; it does not qualify real TCP.

See [contributing](CONTRIBUTING.md), [security](SECURITY.md) and [changelog](CHANGELOG.md). License and publisher identity await owner approval; no license grant or public package availability is implied.
