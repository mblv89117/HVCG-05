# Model Routing Policy

Profiles: Fast Operations · Deep Analysis · Fallback

Env: `OLLAMA_FAST_MODEL`, `OLLAMA_DEEP_MODEL`, `OLLAMA_FALLBACK_MODEL` (see `.secrets/local-ai.env`)

- Fast ops: classify/summarize/agenda/status/meeting brief
- Deep ops: decision package, synthetic EVA, document/client packs, complex/strategic review
- Fallback only when preferred unavailable — **always recorded** (`requestedProfile`, `actualModel`, `fallbackReason`)
- Never auto-pull models
