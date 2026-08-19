# Smoke Test Validation

**updatedAt:** 2026-07-20T02:33:28Z

## Policy

- Smoke evidence required before QA GO is accepted for Prod-bound RC
- Use Atlas Dev wrappers / QA harness — never silent Prod smoke without approval
- Coordinator records pass/fail here when QA_STATUS_CHANGED includes smoke evidence

**smokeEvidenceInEvent:** `False`
