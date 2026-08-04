# Phase 3 Rollback

1. Set `LOCAL_AI_ENABLED=false`, `LOCAL_AI_EXECUTOR=mock`
2. Stop using `/api/local-ai/content-packs`
3. Revert Phase 3 commit(s) on `feature/atlas-local-ai-operations`
4. Do not touch Production tags/tenants
