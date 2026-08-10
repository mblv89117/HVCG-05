# Phase 2 Test Matrix

| Case | Result |
|------|--------|
| Ollama health / discovery (live inspect) | PASS (127.0.0.1:11434, glm-4.7-flash:q4_K_M) |
| Loopback restriction | PASS |
| Redaction | PASS |
| Injection detection | PASS |
| Successful synthetic summary (fake client) | PASS |
| Decision package (fake client) | PASS |
| Malformed / prose rejection | PASS |
| Offline / timeout | PASS |
| Prohibited-action claim rejection | PASS |
| Low-confidence + injection → Manny | PASS |
| Safety flags / external / writes blocked | PASS |
| Idempotency + cancel | PASS |
| Phase 1 regression | PASS (18 cases) |

Live end-to-end against local Ollama (`glm-4.7-flash:q4_K_M`): **PASS** — see `PHASE2_TEST_EVIDENCE.md` and `deployment/reports/local-ai-phase2/live-ollama-smoke.json`.
