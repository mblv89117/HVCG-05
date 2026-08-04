# Phase 3 Architecture — Controlled Live Content (Read-Only)

**Branch:** `feature/atlas-local-ai-operations`  
**Depends on:** Phase 1 `52e3296`, Phase 2 `7766165`

## Objective

Manny manually selects anonymized/approved content → redaction preview → explicit approval → loopback Ollama draft → approval queue. **No authoritative writes. No external communications. No EVA.**

## Installed models (discovery)

Only **`glm-4.7-flash:q4_K_M`** is installed. It is configured as **Deep Analysis Model** and **Fallback Model**. Fast Operations Model is unconfigured; fast ops fall back to Deep with recorded reason `no_faster_model_installed`. Recommended faster models (do not auto-pull): `llama3.2:3b`, `qwen2.5:7b-instruct`, `phi4-mini`, `gemma2:9b`.

## Flow

```
Manny initiates Content Pack
 → source confirm + client + sensitivity
 → redaction + injection preview
 → Approve Redacted / Edit / Cancel
 → (only after Approve) AI Job + model routing
 → Ollama loopback draft
 → time-protection classification
 → Waiting on Manny / Draft Ready
 → approve/reject/return/archive/no-action/automation/eliminate
```

Approval accepts a **draft for later use** only.
