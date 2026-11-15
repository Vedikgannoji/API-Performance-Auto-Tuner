# Changelog

## Unreleased

- Wait for bounded server-side completion before benchmark checkpoints; keep leaks and accounting mismatches as failures.
- Fix cache waiter counts when lock acquisition is deferred, including on Python 3.11.
- Use product features and version information in public documentation and session metadata.
- Advertise supported capabilities while remaining compatible with older local servers.

## 2.0.0b2 — API Monitoring & Adaptive Caching

- Reserve scenario report destinations before submitting requests, preventing mutations when an output already exists or cannot be opened.
- Keep an incomplete report with its run ID when execution cannot be confirmed; no automatic replay.
- Reject ambiguous, duplicate, non-finite, overly nested and invalid-schema release evidence. Bound soak duration checks without integer-to-float overflow.
- Checkpoint prerelease only; qualification, licensing, registry publication and independent pilots remain pending.

## 2.0.0b1 — unreleased

- Installable observation proxy, local dashboard and ordered API scenarios.
- Explicit fixed-TTL/adaptive public-read caching and dependent write invalidation.
- Bounded SQLite telemetry, JSON/CSV reports and isolated benchmarks.
- Packaged disposable demo and offline candidate-evidence review.
- Release preparation only: qualification, compatibility CI, licensing, publisher setup and independent pilots remain open.

The original FastAPI demo remains available separately. Historical evidence lives in docs/product.
