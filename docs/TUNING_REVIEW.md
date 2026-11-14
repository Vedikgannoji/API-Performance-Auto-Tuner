# Bottleneck review and automatic tuning

14 November 2026. Scope: single-worker FastAPI backend, SQLite, adaptive response cache.

## Findings and implemented fixes

| Bottleneck | Fix | Verification |
| --- | --- | --- |
| A global cache lock serialized unrelated origin requests, even with caching off | Per-key cold-miss locks and an eight-slot origin semaphore; cache-off reads can also run concurrently | Thread barrier test proves unrelated requests and cache-off requests overlap |
| A slow origin blocked hot cache hits | Check hits before origin worker admission | A hot hit completes while the only origin slot is occupied |
| Queue and thread-dispatch delay inflated apparent origin cost | Time the loader inside its worker; track miss queue wait separately | A simulated 100-second queue delay does not enable a 1 ms origin |
| Policy changes flushed every response | Route-specific disable/TTL adjustment | Unrelated route entries survive policy failure and TTL changes |
| Every business write flushed unrelated resources | User writes invalidate users; product writes invalidate products/reports; order writes invalidate orders/reports | HTTP integration test verifies unrelated resources remain HITs |
| Concurrent origin reads could refill stale snapshots after a write | Invalidate before and after writes and reject fills whose generation changed | Controlled in-flight read test and existing mutation/cancellation race tests |
| Sales aggregation built a transient join index repeatedly | Persistent covering index on orders(product_id, status, quantity, unit_price_cents), applied on startup | EXPLAIN QUERY PLAN and seven query samples per configuration, identical result bodies |
| Single activation threshold could cause boundary oscillation | Enable at 2 ms; retain active policy down to 1.5 ms; preserve 5-second cooldown | Threshold hysteresis and fast-origin disable tests |
| Lifetime reuse counts could enable caching on stale demand | Reuse evidence resets after 60 seconds without another origin observation for that key | Controlled-clock reuse-expiry test |
| Expired entries inflated reported occupancy | Prune expired entries when reporting cache status | Expiry/status test |

## What auto-tunes without manual controls

The application starts in adaptive mode. Four origin samples, reused request keys, mean origin work >=2 ms and no observed failures enable eligible public-read caching automatically. TTL scales with measured origin cost and remains within 2-30 seconds. Expired entries trigger fresh origin work, feeding the next policy decision. Cache hits do not make the origin appear faster.

New origin measurements can increase or decrease TTL, disable an active policy for fast/low-reuse work, or immediately disable it on a failure after learning. Error recovery requires clean observations replacing the failure in the latest 20-sample cohort. The cooldown limits ordinary policy changes; failures bypass it. A lower 1.5 ms retention threshold avoids toggling when mean origin work fluctuates near 2 ms.

Manual controls are optional overrides. Turning caching off still collects origin measurements but serves no cache hits. Clearing cached responses preserves learned policies. All automatic policy changes record action (enable, adjust_ttl, disable), reason, origin mean, error rate, TTL and a monotonic timestamp. This timestamp is process-local elapsed time, not a wall-clock date.

The auto-tuning scope is response-cache eligibility and TTL adaptation. Origin concurrency is a fixed safety bound, and the SQL index is a deliberate schema optimization applied on startup. The system does not autonomously rewrite SQL, create arbitrary indexes, change infrastructure, or train a machine-learning model.

## Measurements and visibility

`/analysis` now includes bottleneck alerts for observed route p95 >=50 ms and server-error rate >=5%, with at least five observations in its 60-second window. These are diagnostic recommendations; error rate alone does not authorize caching a failing response. Existing regression detection compares disjoint origin cohorts.

The Cache & insights view exposes origin loads/failures, mean origin execution, total miss queue wait, coalesced waiters, worker limit and estimated origin time avoided. Counters are process-local since restart. Estimated avoided time sums recent origin means for cache hits; it is not measured client latency savings and must not replace benchmark evidence.

The isolated SQL experiment used 100 products, 50,000 paid orders, one warmup per configuration and seven timed query repetitions. Median duration fell from **91.75 ms to 33.32 ms (63.68%)**. The query plan switched from an automatic partial covering index to the persistent covering index. Raw timings and plans are in `SQL_PROFILE.json`. This ordered local microbenchmark is sensitive to host load and page-cache conditions; it is evidence about this query, not an overall HTTP gain. Reproduce with `python scripts/profile_sql.py`.

## Validation and remaining benchmark

55 automated tests pass with 100% statement and branch coverage across core Python modules. Verification used the socketless ASGI runner because the managed execution sandbox blocks TCP self-pipe connections. Normal Windows pytest previously passed before this revision; rerun locally after these changes.

Restart the server to apply the new code and index. Then run:

```powershell
python -m pytest
python scripts/benchmark.py --orders 50000 --requests 120 --concurrency 8 --repeats 3
```

The earlier user-reported 94.67% HTTP improvement belongs to the old global-lock implementation. Removing that serialization and improving uncached SQL should improve the baseline too, so a smaller relative cache speedup can accompany a faster application. Retain the 20% resume claim for this revision only after a fresh matched baseline/adaptive run passes correctness and performance gates.

Remaining limits: a global write-generation change conservatively suppresses all in-flight cache fills (without evicting unrelated cached entries); writers serialize; persistent indexes add storage and write maintenance; metrics and cache are single-process; external database writes require TTL expiry; response JSON still serializes on hits. Further optimizations should follow profiling rather than making the uncached baseline artificially slow.
