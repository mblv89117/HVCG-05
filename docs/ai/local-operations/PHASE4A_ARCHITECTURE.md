# Phase 4A Architecture — Fast Operations Model

**Branch:** `feature/atlas-local-ai-operations`  
**Authorized Fast model:** `qwen2.5:7b-instruct`  
**Deep / Fallback:** `glm-4.7-flash:q4_K_M`

## Installation

- Pulled via local Ollama only (`ollama pull qwen2.5:7b-instruct`)
- Loopback bind confirmed (`127.0.0.1:11434`)
- Model files are **not** committed to Git
- Machine config in gitignored `.secrets/local-ai.env`

## Routing

- Fast: summarize/classify/missing-info/agenda/meeting notes/status/task plan/meeting brief/outcomes
- Deep-only: decision package, synthetic EVA, document/client packs, complex/strategic review
- Untrusted model overrides rejected (`sanitizeModelProfileOverride`)
- Deep-only ops cannot be forced onto Fast

## Quality gate

If Fast returns malformed/invalid schema:

1. Record failure  
2. Retry Deep (`fast_model_schema_validation_failed`)  
3. Never silent substitution  

## Side-by-side

`POST /api/local-ai/model-compare` — local-only Fast vs Deep evaluation for Manny.
