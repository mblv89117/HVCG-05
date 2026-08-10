# Phase 1 Test Matrix

| # | Case | Result |
|---|------|--------|
| 1 | Clean AI job creation | PASS |
| 2 | Duplicate/idempotent job | PASS |
| 3 | Successful mock output | PASS |
| 4 | Malformed mock output | PASS |
| 5 | Timeout | PASS |
| 6 | Processing failure | PASS |
| 7 | Retry | PASS |
| 8 | Low-confidence response | PASS |
| 9 | Validation failure | PASS (malformed path) |
| 10 | Unauthorized approval | PASS |
| 11 | Manny approval | PASS |
| 12 | Manny rejection | PASS |
| 13 | Returned for revision | PASS |
| 14 | Prohibited action blocked | PASS |
| 15 | External communication blocked | PASS |
| 16 | EVA remains disabled | PASS |
| 17 | Client emails remain disabled | PASS |
| 18 | Former team members not present | PASS (forbidden name scan) |
| 19 | Future operator assignable | PASS |
| 20 | Audit history complete | PASS |
| 21 | No authoritative writes before approval | PASS |
| 22 | Feature flags remain Off (defaults) | PASS |

Suites:

- `packages/atlas-integration-core/tests/local-ai.test.ts`
- `apps/atlas-integration-api/tests/local-ai-phase1.test.ts`
