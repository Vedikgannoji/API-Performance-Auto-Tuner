# Phase 11 — beta release preparation

Scope: prepare an installable beta candidate and review process. This phase does **not** publish a release or claim Phase 10 qualification complete. Version 2.0.0b1 is centralized in autotuner/_version.py and used by CLI, package metadata, demo API and reports.

## Deliverables

- Wheel and source distribution metadata, bundled dashboard/scenario assets and disposable `autotuner demo` RAM fixture. The old example entry point remains compatible.
- Product-first README with complete terminal setup, optional adaptive demo and supported boundaries. Historical demo guide retained in README_DEMO.md.
- Offline `autotuner release check --evidence FILE --json`: exit 0 ready, 3 blocked, 2 invalid input, 1 I/O failure. It never publishes or connects to a registry.
- Manual GitHub distribution preparation workflow. No publish step, registry credentials, OIDC permission or tag-triggered publication exists.
- Clean-wheel smoke coordinator accepts one wheel or a directory containing exactly one wheel; CI no longer hardcodes a stable version filename.
- Changelog, contributing/security instructions and bug/pilot issue templates.

## Evidence contract

docs/release/candidate.json intentionally contains missing evidence. Each proof entry is an object containing `path` and `sha256`. Paths resolve within the manifest's directory (including symlink resolution); copy sanitized reports into that review directory. JSON manifests are limited to 256 KiB and proofs to 32 MiB. Unknown schema, bad hashes, stale source/version, incomplete gates and missing review attestations block readiness. Diagnostics do not echo payloads or paths.

Qualification proof must be schema 1, measurement revision 2, evidence_type real_http_isolated_product_benchmark, profile qualification, and pass every measured performance/correctness/memory/telemetry gate. Reference environment must be confirmed. Soak proof must use profile soak for at least 1800 seconds, graceful shutdown, passed telemetry health and stability gates. Both must match the running candidate's source digest and version. The digest is SHA-256 over sorted JSON mapping runtime-relative source paths to SHA-256 file hashes, matching the benchmark report's source_digest.

The review receipt uses docs/release/review-receipt.example.json. Its compatibility list requires all nine combinations of os linux/windows/macos and python 3.11/3.12/3.13, each with boolean pytest, node, core_coverage and clean_wheel_install set true only after inspecting the actual successful run. Record CI links and artifact hashes as additional receipt fields. License approval, actual license file/metadata review, verified publisher identity, wheel/sdist inspection and independent pilot review require explicit maintainer attestations. Retain two independent integration reports with disposable invalidation/bypass/failure reproductions before marking pilot review complete.

This is a **local review aid**, not cryptographic provenance or independent verification of claims inside a JSON report. Hashes bind local files; they do not authenticate their author. Human reviewers must inspect actual benchmark data, CI runs, installation artifacts, license and pilot records. Rebuild and rerun qualification whenever candidate source changes. Synthetic complete receipts appear only in unit tests.

## Open release decisions and blockers

Owner license selection and LICENSE/package metadata are pending. Package identity and registry ownership are unverified. Hosted compatibility CI and clean isolated dependency installation must execute externally. Current-source full soak and reference-host overhead qualification remain deferred. External pilots and their acceptance reviews are not yet collected.

After these are resolved, separately authorize TestPyPI rehearsal, verify its installed artifact and provenance, then authorize production publication. Configure separate protected environments and trusted publishers at that time; no permanent API token is required by this preparation. This phase intentionally stops before those actions.

## Review commands — Windows Command Prompt

One terminal; stop existing demo/proxy terminals with Ctrl+C first. Build and tests do not need a live upstream:

```bat
cd /d E:\API-Performance-Auto-Tuner
python -m venv .venv
.venv\Scripts\activate
python -m pip install -e ".[test,benchmark,release]"
python -m pytest
python -m autotuner.quality coverage.json
node --test tests/workflow.test.cjs tests/product_ui.test.cjs
python -m build --outdir tmp/phase11-dist
python -m twine check tmp/phase11-dist/*
python scripts/smoke_wheel.py tmp/phase11-dist
autotuner release check --evidence docs/release/candidate.json --json
```

The final command must report ready false and exit 3 for the pending template. Build into a fresh directory or ensure it contains exactly one wheel. Clean installation requires package-index connectivity for dependencies; it runs outside repository imports in a disposable virtual environment. Follow README's complete three-terminal instructions to review the packaged demo/dashboard. No additional long soak is required for this preparation review.
