# Phase 11 stabilization and release boundary

The agreed sequence is: audit and stabilize the implemented Phase 1–11 feature set, review it, create a clearly scoped checkpoint prerelease, then begin Phases 12–17. No new Phase 12 implementation is part of this stabilization.

The checkpoint is v2.0.0b2, an existing-product prerelease rather than the complete terminal-first developer beta. Publication and performance evidence gates are not relaxed. New code invalidates old source-matched qualification; historical Phase 10 and b1 reports remain historical.

## Fixed issues

1. CLI scenario export previously checked its destination only after executing the workflow. An existing or invalid report path could therefore cause writes even though the command failed. Destinations are now reserved before submission; failed/uncertain execution retains a bounded incomplete marker and run ID. Completed reports replace that marker using the same open handle.
2. Release evidence previously accepted duplicate JSON keys, parser non-finite values and boolean schema identifiers. Deep nesting and extremely large soak duration integers could raise uncaught errors. Strict parsing and bounded numeric comparisons now reject these inputs with regression coverage.

No audit can establish that every possible issue is eliminated. Automated regressions, packaging checks, known limitations and actual qualification results define this checkpoint's readiness.

## Agreed subsequent product phases

| Phase | Scope |
| --- | --- |
| 12 | Final terminal-first PRD, supported frameworks, commands, interactive flows and acceptance criteria |
| 13 | Project/framework and OpenAPI discovery, reviewed startup/config setup |
| 14 | Guided baseline sessions and approved API performance workloads |
| 15 | Approved cache/optimization setup, adaptive policies, explanations and rollback |
| 16 | Keyboard-driven monitoring, comparable sessions and JSON exports |
| 17 | End-to-end qualification, pip/pipx/uv installation checks, independent pilots and developer beta |

Initial scope should prioritize FastAPI/OpenAPI HTTP APIs. Discovery does not imply starting arbitrary project code or replaying mutations without consent. Installing a tool alone does not put it in the request path; integration must be explicit. Optimization success must be measurable, resource bounded and reversible, with no promise of universally perfect performance.
