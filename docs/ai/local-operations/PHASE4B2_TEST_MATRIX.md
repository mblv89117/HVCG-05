# Phase 4B-2 Test Matrix + Evidence

**Command:** `npm test --workspace=@hvcg/atlas-integration-api`  
**Result:** 67 pass / 0 fail (2026-08-05)

| Case | Result |
| --- | --- |
| Synthetic malware override when ClamAV absent | PASS |
| Extract → redaction → mock enrich | PASS |
| Encrypted PDF reject | PASS |
| MIME mismatch | PASS |
| DOCX / XLSX extract | PASS |
| Deterministic vs model conflict merge | PASS |
| Version compare | PASS |
| Multi-doc pack | PASS |
| Correction audit | PASS |
| Safety flags Off | PASS |
| Phase 1–4B-1 regression | PASS |

## Performance (honest)

- Mock enrichment path: well under 30s (milliseconds in tests).  
- Live Ollama Fast/Deep latency not re-benchmarked in this commit (depends on local models). Targets remain: Fast &lt;30s after extraction, Deep &lt;180s where feasible.  
- Schema validation on mock merge: 100% in covered tests.  
- Prohibited-action / external-action blocking: covered by regression suites.
