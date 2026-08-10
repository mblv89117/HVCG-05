# Phase 4C-1 Known Limitations

- Dual store: filesystem staging + SQLite metadata (files still on disk until purge).
- Soft status transitions allow resilience paths beyond the strict matrix.
- Backup encryption not yet applied (encryption-ready layout only).
- Interrupted-job resume marks eligibility only — does not auto-continue enrichment.
- Semantic search / embeddings deferred to later phases.
- Pack compare UI is draft; relationships are heuristic.
