# Benchmark checkpoint completion boundary

## CI evidence

Run 43732273878 at commit f538a589f51a9195dce5a2aa3816d3832f6e2ddd passed the Python test suites on all nine OS/Python combinations. Eight complete jobs passed. The macOS/Python 3.11 job failed its two-second soak smoke after the tests, clean installation and quick benchmark succeeded.

The uploaded soak-smoke.json reports 200 requests, zero unexpected failures, zero storage write errors, reconciled final monitoring and graceful shutdown. Three intermediate checkpoints sampled these pairs of client requests/server completions: 60/59, 100/99 and 140/139. Each had one request still in flight. Later checkpoints and the final 200/200 snapshot were settled. The stability gate treated those transient post-response samples as leaks.

Client receipt of the response's final bytes can precede ASGI post-response cleanup and metric recording. A checkpoint taken immediately after client completion therefore does not establish that server bookkeeping has completed.

## Correction

Before recording a proxy benchmark checkpoint, observe the read-only status endpoint until completed requests exactly match the measured request count, origin and hot-read admission counters are zero, and coordination keys are released. Bound the observation by a five-second deadline and 100 polls. Each status request is limited by the remaining deadline. Yield scheduling between busy observations without assuming a fixed cleanup delay.

Record settlement state, poll count and waiting duration alongside every checkpoint. This applies to paired measurements as well as soak batches. Waiting occurs outside timed client load: no workload request is replayed, no response timing or correctness result is discarded, and no favorable benchmark cohort is selected.

If the server remains unsettled, retain its last status as an explicitly unsettled checkpoint. Correctness/stability still fail. If status cannot be obtained, fail the run instead of manufacturing evidence. Cache-budget, persistence-health, shutdown, growth, workload-mixture and 30-minute qualification requirements remain enforced. A two-second smoke can exercise the runner but cannot qualify 30-minute stability.

## Regression coverage

- Deferred accounting reaches a settled snapshot before recording a checkpoint.
- Under-counted/over-counted completions, admitted requests, hot reads and coordination leaks remain unsettled.
- Deadline and poll exhaustion are bounded; timeouts and control errors cannot qualify a sample.
- Full soak orchestration accepts transient completion lag and rejects persistent lag.

Local verification uses controlled synchronization and injected clocks with the managed Windows socketless runner. Real macOS/TCP verification requires the next hosted run. Results are recorded in benchmark_checkpoint_validation.json.
