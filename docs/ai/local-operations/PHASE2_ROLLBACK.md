# Phase 2 Rollback

1. Set `LOCAL_AI_EXECUTOR=mock` and `LOCAL_AI_ENABLED=false`.
2. Stop hub; delete `{dataDir}/local-ai/local-ai-operations.json` if needed.
3. Revert Phase 2 commits on `feature/atlas-local-ai-operations`.
4. Ollama itself can remain running — Atlas simply stops calling it.
5. Do not touch Production tags or tenants.
