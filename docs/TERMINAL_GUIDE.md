# Autotuner terminal workspace

Open `autotuner` in a terminal from your project directory, or run `autotuner menu --project .`. Select a number or letter and press Enter. Use **b** or **0** to return, **q** to quit and **h** or **?** for help. This interface uses ordinary line input; raw arrow-key navigation and a live monitoring viewport are planned.

Opening the workspace stays offline. It shows the selected project and configuration without scanning project files, starting an application or generating API traffic. Discovery and guided optimization are planned; the current menu runs existing, explicitly configured operations.

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

## Scripts and interruption

`autotuner menu --json` prints available actions and effects without prompting. `autotuner --no-input status --config menu-review.local.json --json` uses an existing scripted command. Place global --no-input before a command; it may also follow menu.

Bare autotuner prints help when either input or output is redirected. Explicit menu entry requires interactive input and output, unless --json is used; --no-input rejects interactive menu entry. Successful JSON descriptions contain no prompts or terminal formatting. Errors go to stderr.

EOF closes the menu with exit 0. Ctrl+C at a prompt exits 130. Foreground serve retains its existing graceful-stop behavior and returns to the menu when launched there. No application process is started on menu entry, and a failed action is not retried automatically.

Keep listeners local. Current adaptive tuning concerns explicitly approved response-cache policies; it does not modify application/database code or automatically discover APIs. Fast reads can correctly remain uncached.
