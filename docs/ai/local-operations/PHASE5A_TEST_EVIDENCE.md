# Phase 5A Test Evidence

Primary suite: `apps/atlas-integration-api/tests/local-ai-phase5a.test.ts`

Run:

```bash
cd apps/atlas-integration-api && npx tsx --test tests/local-ai-phase5a.test.ts
```

**Result (2026-08-06):** 19/19 Phase 5A tests passed. Full Local AI phase suite (`tests/local-ai-phase*.test.ts`): **103/103 passed**.

Safety assertions confirmed:

- `EvaIntakeEnabled=false`
- `ClientEmailsEnabled=false`
- `LocalAIWritesEnabled=false`
- `LocalAIExternalMessagesEnabled=false`
- `LocalAIEnabled=true` (local test harness only)

Production-origin rejection, idempotency, duplicate/conflict matching, Deep review, malformed/offline/injection AI failures, Manny local decisions, and restart recovery covered.
