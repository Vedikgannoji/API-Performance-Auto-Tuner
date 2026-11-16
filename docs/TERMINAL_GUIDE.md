# Autotuner terminal workspace

Open `autotuner` in a terminal from your project directory, or run `autotuner menu --project .`. Select a number or letter and press Enter. Use **b** or **0** to return, **q** to quit and **h** or **?** for help. This interface uses ordinary line input; raw arrow-key navigation and a live monitoring viewport are planned.

Opening the workspace stays offline. It shows the selected project and configuration without scanning project files, starting an application or generating API traffic. Choose discovery explicitly from Setup to inspect the project.

## Available actions

| Menu | Actions |
| --- | --- |
| Setup and configuration | Validate config, create observe config, run proxy, offline diagnostics, explicit TCP check |
| Session and insights | Session status, endpoint metrics, advisory performance insights |
| Cache and policies | Explain a route; clear stored responses after confirmation |
| Reports and history | List stored sessions; show/export stored JSON; export live JSON |

Use **p** to select another project or **c** to select its configuration. Relative paths resolve against the selected project. Changing the project resets the selected config to that project's autotuner.json. Selecting a path does not create or read its configuration. An explicit --config value overrides AUTOTUNER_CONFIG, then the default is autotuner.json.

Configuration creation asks for the upstream URL and acknowledgement, uses observe mode and refuses to overwrite. Running the proxy here asks for acknowledgement and occupies this terminal until Ctrl+C stops it. For menu session actions, keep the proxy running in another terminal. Clearing cached responses retains configured rules. Export paths resolve against the selected project and existing files are not overwritten.

## Windows walkthrough

### Discover and review an observe configuration

From an activated repository environment, run the following for your API project's directory. `discover` prefers `openapi.json` at the project root. Otherwise it inspects literal decorators on top-level FastAPI instances and simple factories that return a locally constructed app. Use `--openapi path/to/schema.json` for another local OpenAPI 3 JSON file, or `--openapi-url http://127.0.0.1:8000/openapi.json` to explicitly read a running local API's description. The URL mode requires a loopback IP and uses a bounded GET with redirects disabled.

```bat
python -m autotuner discover --project .
python -m autotuner setup --project . --select 1 --upstream http://127.0.0.1:8000 --output discovered.json --json
```

Choose an ID from the inventory instead of `1` if appropriate. Repeat `--select` for additional operations and use the same discovery source flags for preview and apply. Review the operation labels, upstream, loopback listener and destination. To create the file, rerun the preview command with `--apply YOUR_REVIEW_TOKEN`, replacing `YOUR_REVIEW_TOKEN` with the printed token. Use a new output filename if the destination already exists. The config starts in observe mode with an empty cache policy list.

Static discovery reports candidates. Router prefixes, more complex factories, mounts and dynamic paths may require the running OpenAPI description or manual configuration. Paths with whole-segment parameters become `*` labels. Unsupported paths and referenced OpenAPI path items are skipped, and ambiguous selections need to be narrowed before writing. Possible entry points are informational. Start your API with its documented command, then run `python -m autotuner serve --config discovered.json` in another terminal. Stop the proxy with Ctrl+C.

### Try the disposable upstream

Install from the checkout first. These commands use Windows Command Prompt and the existing repository location. No browser or frontend server is needed.

```bat
cd /d E:\API-Performance-Auto-Tuner
python -m venv .venv
.venv\Scripts\activate
python -m pip install -e ".[test,benchmark,release]"
autotuner --version
autotuner menu --json
```

Stop older demo/proxy terminals with Ctrl+C before starting this walkthrough, so ports 3000 and 8080 are available. Terminal 1: start the disposable demo upstream and keep it running.

```bat
cd /d E:\API-Performance-Auto-Tuner
.venv\Scripts\activate
autotuner demo --listen 127.0.0.1:3000
```

Terminal 2: create an observe config once, then start the proxy and keep it running. If menu-review.local.json already exists, reuse it and skip init; do not replace it unintentionally.

```bat
cd /d E:\API-Performance-Auto-Tuner
.venv\Scripts\activate
autotuner init --config menu-review.local.json --upstream http://127.0.0.1:3000
autotuner serve --config menu-review.local.json
```

Terminal 3: send an explicit request, then inspect the running session using the menu.

```bat
cd /d E:\API-Performance-Auto-Tuner
.venv\Scripts\activate
curl.exe -i http://127.0.0.1:8080/api/products
autotuner menu --project . --config menu-review.local.json
```

Choose **2**, then **1**, **2** or **3** to inspect status, endpoint metrics or insights. Choose **b**, then **4** for stored reports/history or a live JSON export. Quit with **q**. Stop terminals 2 and 1 with Ctrl+C when finished. The RAM demo resets on restart; reports use the selected config's bounded local telemetry store.

Linux/macOS use `source .venv/bin/activate` and `curl` instead of the Windows activation path and curl.exe. Change to your checkout/project path in each terminal.

## Capture performance baselines

Choose **Session and insights → Save passive baseline** or run `autotuner baseline --config YOUR_CONFIG --window 300 --output baseline.json`. The running proxy supplies rolling latency, throughput, errors, upstream measurements, cache suitability, resource counters and advisory findings. The baseline file includes the session and configuration identity, tool versions and client source hash. Read the saved JSON for the evidence and each finding's recommended next step.

For a controlled read, add `--get /api/products --environment local --requests 10` and use a new output filename. Use a concrete path with test data and verify that repeating the GET is appropriate for your API. The preview shows the chosen upstream and workload limits. Repeat with `--apply` and the printed review token to start. The workload runs sequentially in observe or off mode and expects HTTP 200. It stops on the first failed request. Ctrl+C requests a stop after the current request. Existing baseline files are preserved.

Saved scenario timings describe the proxy-side workload. Rolling observations may include concurrent traffic and are sampled separately. Check the sample counts and incomplete evidence markers before comparing results. The resource section reports runtime task and request counters, cache accounting and storage state.

## Scripts and interruption

`autotuner menu --json` prints available actions and effects without prompting. `autotuner --no-input status --config menu-review.local.json --json` uses an existing scripted command. Place global --no-input before a command; it may also follow menu.

Bare autotuner prints help when either input or output is redirected. Explicit menu entry requires interactive input and output, unless --json is used; --no-input rejects interactive menu entry. Successful JSON descriptions contain no prompts or terminal formatting. Errors go to stderr.

EOF closes the menu with exit 0. Ctrl+C at a prompt exits 130. Foreground serve retains its existing graceful-stop behavior and returns to the menu when launched there. No application process is started on menu entry, and a failed action is not retried automatically.

Keep listeners local. Current adaptive tuning concerns explicitly approved response-cache policies; it does not modify application/database code or automatically discover APIs. Fast reads can correctly remain uncached.
