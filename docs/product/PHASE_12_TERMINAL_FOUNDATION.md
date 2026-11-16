# Phase 12 terminal foundation review

## Scope

Adopt the revised terminal-first contract in docs/reference/Autotuner_CLI_Product_PRD.md and introduce a lightweight workspace around implemented commands. The historical Word draft is retained; its old scope/development sequence is superseded by the current Markdown contract. No regenerated Word export is claimed.

This implements menu entry, navigation, help, offline action descriptions, project/config selection, existing command dispatch, confirmations, error handling and cancellation. It does not implement Phase 13 discovery or the later guided analysis, concurrency controller, live terminal viewport or matched comparisons.

## Decisions

- Standard library only, using number/letter choices followed by Enter. No new runtime dependency, required browser or background menu process.
- Root command opens the menu only with TTY stdin and stdout; redirected entry prints help. Explicit menu requires a terminal unless --json is requested. Global --no-input prevents prompts.
- Help/version/menu startup avoids importing the proxy, HTTP client, database and model stack. Selected existing operations load their runtime dependencies lazily.
- Project selection is explicit and does not change process cwd. Config/export paths are anchored to the selected project. Existing configuration/environment/flag semantics are delegated to the original commands.
- Create/serve/clear require acknowledgement. Existing configs and exports are never silently overwritten. Routes and paths reject control characters; input lines are bounded to 4096 characters and overlong input aborts rather than interpreting a remainder as commands.
- EOF exits 0; prompt Ctrl+C exits 130. Existing foreground serve shutdown remains compatible.
- 2.1.0.dev0 identifies the new development snapshot. Frozen preview tags/assets remain unchanged.
- Owner license/name/publishing/reference-host decisions are assigned explicitly in the contract, not silently resolved.

## Verification plan

Tests cover actual CLI integration for config creation/validation, all menu dispatches, project/config precedence, explicit write acknowledgement, non-overwrite, errors, EOF, Ctrl+C, non-TTY input/output, oversized input, offline JSON and runtime import isolation. Existing CLI, cache, proxy, concurrency and storage regressions remain enforced. The clean-wheel coordinator includes offline menu JSON outside the repository.

Compare fresh process version/help/menu timings and record every trial. A local timing comparison does not qualify proposed startup targets or existing reference-host proxy budgets. No measured speedup for API requests is implied by faster CLI startup.

## User review commands

One Windows Command Prompt for automated checks; no upstream or proxy needs running:

```bat
cd /d E:\API-Performance-Auto-Tuner
python -m venv .venv
.venv\Scripts\activate
python -m pip install -e ".[test,benchmark,release]"
autotuner --version
python -m pytest
python -m autotuner.quality coverage.json
node --test tests/workflow.test.cjs tests/product_ui.test.cjs
autotuner menu --json
autotuner --no-input
autotuner menu
```

Expected version: 2.1.0.dev0. In the menu, h opens help, 1 opens setup, b returns and q exits. Entry should make no files or API requests. Bare --no-input prints help without waiting. Explicit `autotuner menu --no-input` returns 2; this is expected.

For live actions, use the complete three-terminal sequence in docs/TERMINAL_GUIDE.md. Review invalid menu choices, back/quit, a cancelled create/clear action, session status and JSON export. Stop the disposable proxy/upstream with Ctrl+C. No browser is required.

Packaging review in the same activated environment:

```bat
python -m build --outdir tmp/terminal-review-dist
python -m twine check tmp/terminal-review-dist/*
python scripts/smoke_wheel.py tmp/terminal-review-dist
```

Use a fresh output directory or ensure it contains exactly one wheel. Normal verification is python -m pytest; sandbox-only verification uses scripts/test_socketless.py and does not establish real TCP qualification. Stop for joint review before Phase 13. Actual commands/results and remaining limits are recorded in phase_12_validation.json.
