# Owner Actions — Phase 3

1. Review Phase 3 docs under `docs/ai/local-operations/`
2. Keep Production untouched — no push/merge/deploy/tag from this work
3. Decide whether to authorize installing a distinct Fast Operations model (recommended list in Model Routing Policy)
4. If authorizing a fast model: install manually via Ollama, set `OLLAMA_FAST_MODEL`, restart Hub API — **do not** ask the agent to auto-pull
5. Use content packs only with synthetic or explicitly approved content
6. For local preview only: set `LOCAL_AI_ENABLED=true` in local `.secrets/local-ai.env` (never enable Writes / External / EVA / ClientEmails)
7. Do **not** authorize Phase 4 until Phase 3 review is accepted in writing
