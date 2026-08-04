# Phase 3 Rollback

1. Set `LOCAL_AI_ENABLED=false` and/or `LOCAL_AI_KILL_SWITCH=true` in `.secrets/local-ai.env`
2. Stop using `/api/local-ai/content-packs` and Elite AI Operations Queue pack actions
3. Keep `LOCAL_AI_WRITES_ENABLED=false` (never enable to “roll back”)
4. Optionally revert Phase 3 commit(s) on `feature/atlas-local-ai-operations` only — **do not** touch Production tags or deploy
5. Local data under `INTEGRATION_DATA_DIR` / temp repos can be deleted; no production Dataverse rows were written by Phase 3
