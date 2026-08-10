# Phase 4A Rollback

1. Clear or blank `OLLAMA_FAST_MODEL=` in `.secrets/local-ai.env`
2. Restart hub — Fast ops fall back to Deep with recorded reason
3. Optionally `ollama rm qwen2.5:7b-instruct` (local disk only)
4. Revert Phase 4A commit on `feature/atlas-local-ai-operations`
5. Do not touch Production tags
