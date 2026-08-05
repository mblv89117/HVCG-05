# Phase 4B-1 Rollback Plan

## Immediate (code)

1. Stop Hub / Elite local processes.
2. Revert or reset branch commit(s) for Phase 4B-1 on `feature/atlas-local-ai-operations` only (do not touch Production).
3. Purge staging directory: `rm -rf .data/local-ai-document-staging` (or configured `LOCAL_AI_DOCUMENT_STAGING_DIR`).

## Config

- Leave safety flags **Off**.
- Optional: unset `LOCAL_AI_DOCUMENT_*` env vars.

## Data

- Staged files are disposable drafts — purge is the recovery action.
- No production tags, deploys, or merges are part of this phase.

## Verify

```bash
npm test --workspace=@hvcg/atlas-integration-api
```

Confirm Phase 4A suites still pass after rollback.
