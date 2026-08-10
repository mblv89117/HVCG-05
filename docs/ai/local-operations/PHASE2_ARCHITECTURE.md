# Local AI Operations — Phase 2 Architecture

**Branch:** `feature/atlas-local-ai-operations`  
**Depends on:** Phase 1 commit `52e3296`  
**Mode:** Read-only drafts via loopback Ollama — **no writes, no external messages, no EVA**

## Detected local environment (Aug 3, 2026)

| Item | Value |
|------|-------|
| Ollama version | 0.32.5 |
| Base URL | `http://127.0.0.1:11434` |
| Bind | `127.0.0.1:11434` (loopback only) |
| Selected model | `glm-4.7-flash:q4_K_M` |
| Context length | 202752 |
| Parameter size | 29.9B (Q4_K_M) |
| Auth on Ollama | None (local loopback) |
| Open WebUI | Detected on `:3000` (Docker) — optional chat UI; **not used by Atlas executor** |

Machine-specific discovery is written to gitignored `.secrets/local-ai.discovery.json` and `.secrets/local-ai.env`.

## Flow

```
AI Job → validate operation → redact → injection scan → prompt builder
  → loopback Ollama /api/chat (format=json)
  → JSON extract + schema validate
  → AI job output → Waiting on Manny / Draft Ready
```

## Hard boundaries

- Loopback-only Ollama URL by default
- `LocalAIWritesEnabled=false`
- `LocalAIExternalMessagesEnabled=false`
- `EvaIntakeEnabled=false`
- `ClientEmailsEnabled=false`
- No SharePoint/Dataverse/Outlook/banking/accounting connectors from executor
- No tool execution / shell
