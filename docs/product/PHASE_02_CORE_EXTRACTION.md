# Phase 2 reusable core extraction

Status: implemented and ready for joint review. Phase 3 has not started.

## What changed

| Component | New responsibility |
|---|---|
| `autotuner/core/cache.py` | Bounded adaptive object cache, high-resolution timing, coalescing and origin telemetry |
| `autotuner/core/metrics.py` | Aggregation and analysis with injectable bounded observation storage |
| `autotuner/core/contracts.py` | Structural `MetricSink` and `ObservationStore` interfaces |
| `autotuner/core/monitoring.py` | Pure ASGI observation with injected inclusion predicate, route labels and duration clock |
| `autotuner/core/engine.py` | Explicit public reads, credential bypass, coordinated writes and performance analysis |
| `autotuner/main.py` | Demo-specific route registration, headers, SQLite services and resource mapping |

`autotuner.cache` and `autotuner.metrics` remain compatibility import locations. The existing demo factory, dashboard, workflow asset and app.state.cache/app.state.metrics access still work. app.state.engine exposes the shared coordinator.

The core imports no FastAPI, Starlette, demo database, schema or business-route module. Origin callables currently run synchronously in worker threads. Arbitrary async upstream forwarding and HTTP representation correctness remain later phases.

## Integration contracts

```python
from autotuner.core import PerformanceEngine

engine = PerformanceEngine()

# Invoke inside an async adapter. The adapter explicitly approves this public read.
result = await engine.read(
    route='/catalog/{item}',
    path='/catalog/widget',
    query=[('locale', 'en')],
    loader=lambda: repository.get_widget(),
    credentialed=False,
)
# result.value, result.outcome and result.reason are framework-independent.

updated = await engine.write(
    lambda: repository.update_widget(),
    invalidate=('/catalog', '/reports'),
)
```

The example assumes a repository provided by the integrating application; the core supplies no business database. Adapters preserve their own HTTP status codes, headers, payload validation and privacy classification.

Invalidation uses explicit canonical path prefixes, not business resource names: `/catalog` matches `/catalog` and `/catalog/item`, but does not match `/catalog-extra`. The demo maps its own names to `/api/...` prefixes outside the core. Callers of the old internal `invalidate(('products',))` convention must now pass `('/api/products',)`.

Every write invalidates its declared dependencies before and after the worker, including failed attempts. A cancelled request holds write coordination until its worker finishes; cancellation remains the outward outcome even if the worker then fails. Generations still prevent stale in-flight reads refilling the cache. Failed-write invalidation is intentionally conservative.

## Monitoring and storage

Monitoring accepts an ASGI callable and a MetricSink. An adapter supplies inclusion rules and normalized operation labels; the default label is bounded `/{unmatched}` rather than raw request paths. The FastAPI demo supplies its route templates and `/api/` filter. The independent ASGI fixture supplies `/inventory/{item}` without importing the demo.

Metrics accepts an ObservationStore with append, iteration, length and positive finite maxlen. The default remains a bounded deque. SQL persistence and async storage writers are Phase 5 work; injecting a store here does not make it durable or thread-safe automatically.

The engine retains the demo's adaptive default for compatibility. Product configuration is not wired to it yet. Phase 3 and the later proxy adapter must enforce global observe/recommend modes before serving shared cache responses. This phase does not claim a generic HTTP proxy, public CLI, route-policy matcher or protocol-aware response cache.

## Acceptance evidence

Nine focused cases verify both independent backends, dynamic route labels, metrics for hits, mutation freshness, credential bypass, framework-free imports, prefix boundaries, injected services/storage, write failures and cancellation. Existing demo and workflow tests remain in the full suite.

- Focused: `python -m pytest tests/test_core.py -o addopts=""`
- Full suite: `python -m pytest`
- JavaScript: `node --test tests/workflow.test.cjs`

Local verification used the socketless runner because the managed Windows sandbox blocks asyncio's TCP self-pipe: `python scripts/test_socketless.py`. Result: 90 Python tests and 9 JavaScript tests passed; 100% statement and branch coverage across the core/package. This is in-process functional evidence, not a fresh HTTP load benchmark. Normal terminal verification remains part of our joint review.

## Joint review

1. Run the focused command above, then the full pytest suite in your normal terminal.
2. Restart the existing demo with start.bat and run one full playground workflow. Check cache outcomes and metrics still populate.
3. Review the explicit prefix contract and the separation between object caching and future HTTP response caching.
4. Once we review this phase together, proceed to Phase 3 CLI packaging and lifecycle. No package publication or remote push has been performed.
