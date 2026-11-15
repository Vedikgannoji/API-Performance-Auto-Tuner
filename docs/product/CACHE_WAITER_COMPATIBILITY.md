# Cache waiter telemetry compatibility fix

## Observed failure

GitHub run 43730587474, commit be2eb1ae72d5d7ac05d79ef3c323c430f471e348, failed the same test on Windows, Linux and macOS with Python 3.11. Each job reported 500 passing tests and one failure in `test_coalesces_cold_key_and_releases_all_coordination`. The Python 3.12/3.13 jobs passed.

The original integration test confirmed one upstream call, seven cached responses and released coordination resources. Its final assertion expected seven coalesced waiters but received zero. This was a telemetry defect rather than a failure of those already-asserted request-sharing behaviors.

## Cause and correction

The counter inspected `asyncio.Lock.locked()` during registration. On Python 3.11, `asyncio.wait_for(lock.acquire(), timeout)` can queue acquisition in another task. Additional requests can register before that task acquires the lock, so all registrations observe an unlocked lock.

Count additional registrations in the active same-key coordination group instead. Registration and reference-count increments contain no await, making the count independent of acquisition scheduling within the supported single event loop. The first request for each group is its leader; later registrations increment the cumulative waiter counter. Cancellation releases references but does not undo the fact that a request joined that group.

## Verification

Keep the original eight-request integration assertion unchanged. New deterministic cases register the same group with and without immediate leader acquisition. Both require seven waiters; a separate key adds no waiter. Cancelled registrations release references, completed groups retain no coordination objects, and a new group starts with a leader without incrementing the counter.

The fix does not change cache keys, cached content, admission limits, invalidation, lock acquisition or release behavior. No CI matrix entry, test assertion, coverage threshold or supported Python version is removed. Verification results and execution limits are recorded in cache_waiter_validation.json. Hosted Python 3.11 verification requires a new run after the fix is pushed.
