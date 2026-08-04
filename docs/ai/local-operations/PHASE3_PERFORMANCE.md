# Performance Metrics

Endpoint: `GET /api/local-ai/performance`

Includes averages by operation/model, failure + validation-failure rates, redaction/Manny review times, estimated time saved, queue wait, fallback usage, cancelled, timeouts.

Flags: routine >30s, deep >180s, repeated retries, frequent schema failures.
