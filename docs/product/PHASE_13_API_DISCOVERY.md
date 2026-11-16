# Phase 13 API discovery and guided setup

`autotuner discover` inventories direct FastAPI route candidates or operations from OpenAPI 3 JSON. Static discovery parses Python syntax without importing project modules. The root `openapi.json` takes precedence over static discovery. An explicit local file must be inside the project, with no linked path components. An explicitly supplied live description must use an HTTP(S) loopback IP. The request disables environment proxies and redirects and applies read limits.

The static scan skips hidden, dependency and scratch folders such as tmp and temp and linked files/directories. It limits traversal to five levels below the project root, 4,000 directory entries, and 200 Python files. Source files and OpenAPI descriptions are limited to 1 MiB each. The inventory is bounded to 1,000 operations. Static candidates cover literal decorators on top-level FastAPI instances and simple synchronous factories that return a locally constructed app. `APIRouter`, mounted applications, more complex factories, and dynamic composition may require an OpenAPI description. A candidate entry point is informational. The developer starts the upstream using their own command.

`autotuner setup` takes explicit inventory IDs and previews the validated observe config. The review token binds the selected source rows, normalized operation labels, upstream, listener and destination. Applying a stale preview fails. An accepted preview creates a new project-root JSON file exclusively. Duplicate and ambiguous labels are rejected by configuration validation. Application code and existing configuration files are preserved.

## Review

Use Windows Command Prompt. Run the commands without copying a prompt from the terminal. The fixture is isolated under `tmp`, and the discovery and setup checks below need no running server.

```bat
cd /d E:\API-Performance-Auto-Tuner
.venv\Scripts\activate
mkdir tmp\discovery-review
echo {"openapi":"3.1.0","paths":{"/items/{id}":{"get":{}}}}>tmp\discovery-review\openapi.json
python -m autotuner discover --project tmp\discovery-review
python -m autotuner setup --project tmp\discovery-review --select 1 --upstream http://127.0.0.1:8000 --output reviewed.json --json
```

Expect one `GET /items/{id}` operation and a preview containing `GET /items/*` in the operation list, with `written` set to `false`. Repeat the setup command, adding `--apply` followed by the printed review token. Then validate the saved file:

```bat
python -m autotuner config check --config tmp\discovery-review\reviewed.json --json
```

Repeat the apply to verify that the existing file is refused. For a second successful apply, choose a different filename in both preview and apply. The forwarding integration test uses an in-process HTTPX transport and checks the metrics label on a real proxy session. The existing three-terminal guide covers separately starting an upstream and proxy with real sockets.

## Verification results

- Focused: `python scripts/test_socketless.py tests/test_discovery.py tests/test_cli.py tests/test_terminal.py tests/test_public_metadata.py -o addopts="" --tb=short` passed 106 tests, with one skip.
- Full: `python scripts/test_socketless.py --junitxml=tmp/phase13-tests.xml --tb=short` passed 603 tests, with one skip and 96.46% combined coverage. The skip was the symlink creation test on this Windows environment. The live schema request was checked with a fake HTTP response. Real TCP and hosted CI remain to be verified.
- Setuptools built the wheel and source distribution. `python -m twine check tmp/phase13-dist/*` passed on both. A smoke test extracted the wheel outside the checkout and used installed virtual environment dependencies to run discovery, setup preview/apply and config validation.

The review transcript exposed two gaps: generated Python files consumed the scan budget, and the demo defines routes inside an application factory. Discovery now skips scratch directories, visits shallower directories first, and recognizes simple factory candidates. `python -m autotuner discover --project .` found 21 candidates in this checkout, including `GET /api/products`. Setup preview returned the expected operation without writing a file.

- Factory regression checks: `python scripts/test_socketless.py tests/test_discovery.py tests/test_cli.py -o addopts="" --tb=short` passed 42 tests with one skip.
- Updated full run: `python scripts/test_socketless.py --junitxml=tmp/phase13-factory-tests.xml --tb=short` passed 604 tests with one skip and 96.47% combined coverage.
- Rebuilt wheel and source archive both passed `python -m twine check tmp/phase13-factory-dist/*`. Extracted-wheel smoke passed against the checkout's factory using existing virtual environment dependencies.
