# Internal roadmap: terminal-first developer product

## Handover boundary

The existing monitoring proxy, approved response cache, adaptive cache controller, bounded telemetry, scenario runner and exports provide the foundation. The checkpoint release is not the completed project-discovery and guided-optimization product.

Local verification through commit 89cb5b2 reports 527 passing Python tests. Hosted run 43735945746 passed all nine OS/Python jobs, confirming the compatibility fixes. A short CI soak does not replace current-source 30-minute stability or reference-host performance qualification. Existing published v2.0.0b2 assets predate subsequent fixes; a refreshed prerelease should use a new version/tag and freshly built matching artifacts.

This document is internal. Public commands, menus, documentation and release notes use features and versions, never development phase numbers. No phase implementation is authorized merely by recording this roadmap.

## Product outcome

Install with pip, pipx or uv; enter a project directory; open Autotuner in a terminal; discover supported APIs; review the connection/setup; analyze performance; approve suitable optimizations; monitor behavior; compare controlled sessions; export JSON.

All essential work is available through keyboard-operated terminal flows and scriptable commands. A browser, dashboard, Node installation and frontend server are not required. Preserve the current optional dashboard as a separate legacy/optional surface while keeping the new CLI dependency footprint small.

Installing a package does not automatically intercept application traffic. Integration is explicit: a configured proxy or a separately supported framework adapter. Initial supported discovery prioritizes FastAPI projects and local OpenAPI descriptions, with explicit/manual upstream configuration as a fallback.

## Phase 12: product contract and terminal foundation

Deliverables:

- Revise the technical PRD and acceptance criteria around the complete terminal-first workflow.
- Define supported frameworks, HTTP behaviors, discovery confidence, proxy/adapter integration boundaries and project configuration ownership.
- Finalize command names, interactive menu structure, JSON output contracts, exit codes and non-interactive behavior. Keep existing scripting commands compatible.
- Define the menu shell: keyboard selection, help, back navigation, clear errors and Ctrl+C behavior. Features are enabled only when implemented and supported.
- Define dependency, startup, idle-memory, active CPU, response-overhead and storage budgets with a reproducible reference environment. Measure baseline costs before committing to new targets.
- Resolve or explicitly assign the owner license, package identity and publishing decisions early.

Acceptance/tests:

- Review an install-to-export walkthrough before building discovery.
- TTY/menu and redirected/non-interactive behavior have deterministic tests. Missing input never causes an unattended hang; JSON stdout contains no prompts or ANSI sequences.
- If new executable schemas/config contracts are introduced, test valid input, invalid input, compatibility and boundaries with pytest.

## Phase 13: project discovery and guided setup

Deliverables:

- Detect supported project manifests/framework signals and possible startup entry points without importing or executing project modules.
- Discover operation candidates from local OpenAPI documents and supported source patterns; label incomplete/static findings rather than claiming complete route coverage.
- Fetch a running API's OpenAPI description only through an explicitly selected connection. Handle dynamic routers, missing schemas and unsupported projects with a manual configuration path.
- Preview discovered method/path operations and let the developer choose what to monitor.
- Generate project-local configuration, check ports/upstream reachability on request and guide explicit proxy/adapter integration.
- Preview any project startup command before executing it; track owned subprocesses and stop only those processes. Preserve existing project files/config unless explicitly replacing them.

Acceptance/tests:

- Disposable FastAPI/OpenAPI fixtures demonstrate discovery, review, setup and observed traffic.
- Test multiple entry points, malformed/oversized schemas, unsupported projects, missing paths, filesystem errors, symlinks, ignored virtual environments and interrupted setup.
- Tests prove discovery does not import project code, start servers, replay API requests or overwrite existing configuration silently.

## Phase 14: guided performance analysis

Deliverables:

- Passive observation sessions and separately approved active test sessions against the developer's selected API.
- Explicit operation selection, test data, request limits, duration, concurrency and environment confirmation. No automatic mutation replay.
- Baseline latency distribution, throughput, errors, queue pressure, upstream costs, cache eligibility/reuse and resource usage.
- Explain actionable findings with evidence and confidence. Distinguish observed upstream slowness from unproven internal causes such as SQL behavior.
- Save bounded baseline sessions with workload/config/source identity and sampling limitations.

Acceptance/tests:

- A controlled API fixture produces expected slow-route, error, contention and caching-suitability findings.
- Test credentials/redaction, approved request selection, timeouts, cancellation, partial sessions, rate/size limits and insufficient evidence.
- Default project entry/discovery generates no benchmark traffic. Load runs require an explicit action and remain bounded.

## Phase 15: approved optimization and automatic tuning

Deliverables:

- Present proposed optimizations with their reason, scope, prerequisites and rollback behavior before applying them.
- Integrate existing safe public-response caching, cache-miss sharing, adaptive activation/TTL and declared dependent-write invalidation.
- Support bounded request-concurrency tuning only where a reviewed controller and sufficient measurements establish a supported path. Define latency/error/resource guardrails and automatic rollback; otherwise provide a recommendation instead of applying a speculative change.
- Save policy revisions and decisions. Provide pause, disable, inspect and rollback commands.
- Re-evaluate under changing traffic, failures and mutation patterns without serving private data or bypassing origin freshness rules.
- Keep source rewrites, automatic database/index changes and deployment/infrastructure modification out of the initial automatic-optimization scope.

Acceptance/tests:

- Repeated eligible public reads reduce origin work while verified mutations remain fresh and private traffic stays isolated.
- Test stale in-flight fills, concurrent readers/writes, cancellation, TTL expiry, memory pressure, policy oscillation, upstream failures and rollback.
- Concurrency-control changes require controlled contention/error tests and live integration evidence before being exposed as supported auto-tuning.
- Insufficient evidence or fast origins can correctly produce no optimization. No universal speedup guarantee.

## Phase 16: terminal monitoring and comparison

Deliverables:

- Live terminal views for endpoint metrics, cache state, tuning decisions, resource use and session health.
- Keyboard navigation, pause/resume, interval selection, operation filters and accessible plain-text alternatives.
- Before/after comparisons using matched workloads, duration, concurrency, request mix and application state, with correctness checks and confounders disclosed.
- Export baseline, optimized, comparison and tuning-history data as versioned JSON. Preserve useful existing CSV reports.
- Session listing, reliable stop/resume boundaries and bounded history; no fabricated values for missing data.

Acceptance/tests:

- A developer can complete monitoring, inspection, comparison and export without a browser.
- Test small/resized terminals, redirected output, missing history, incompatible sessions, stale metrics, interrupted exports, Ctrl+C and resource limits.
- A known controlled improvement appears correctly; incomparable sessions are labeled/rejected rather than producing a misleading percentage.

## Phase 17: developer beta qualification and distribution

Deliverables:

- End-to-end tests of the complete supported-project workflow, using isolated project fixtures and real HTTP integration where required.
- Clean pip/venv, pipx and uv tool installations, upgrades, uninstallation and standalone imports outside the checkout.
- Hosted OS/Python matrix, startup/resource budgets, reference-host overhead and workload-specific benefit gates, current-source full soak and failure/recovery evidence.
- At least two independent supported-API pilot integrations, including invalidation, privacy bypass and rollback reviews.
- Feature-based beginner guide, CLI reference, troubleshooting, support/security boundaries and final licensing/publisher metadata.
- Verified TestPyPI rehearsal and installed artifacts, then a separately authorized developer-beta registry release.

Acceptance/tests:

- A new developer can install, discover, analyze, approve optimization, monitor, compare, export and remove/disable integration using the documented terminal workflow.
- No required browser/Node/frontend server, no unbounded storage/process growth and no silently altered application/database code.
- All required tests, compatibility checks and release gates pass against the frozen candidate. No silent threshold reductions or unsupported performance claims.
- Registry publication is explicitly authorized after evidence review; it is not implied by finishing implementation.

## Working agreements

Implement one phase at a time. Add pytest coverage for new Python behavior and meaningful integration/regression cases. Run focused tests, the complete coverage-enforced suite, and relevant packaging/terminal/UI checks. Use isolated data, injected clocks and controlled synchronization. Preserve the existing coverage gates.

After each phase, record actual results and limitations, stop for joint review, provide a concise commit title after review and wait for the user's instruction to proceed. Whenever terminal testing is requested, provide all setup/start/test commands with working directories, terminal roles and stop instructions.

## First-beta boundaries

The product improves supported API workloads through measured observation and approved request/cache policies. It cannot promise perfect API behavior, repair arbitrary application logic, discover every framework automatically, or optimize an upstream it has not been connected to. Distributed production operation, universal framework support and automatic source/database modification require separately reviewed designs.
