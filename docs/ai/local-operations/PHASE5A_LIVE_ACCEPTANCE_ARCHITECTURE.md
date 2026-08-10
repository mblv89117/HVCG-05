# Phase 5A Live Acceptance Architecture

**Commit basis:** Phase 5A acceptance hardening on `feature/atlas-local-ai-operations`  
**Not Phase 5B.** Production EVA remains disabled.

## Explicit review modes

| Mode | Behavior |
| --- | --- |
| **Deterministic Intake Test** | Validate → match → synthetic prospect → deterministic Manny package (no Ollama) |
| **Full Local AI End-to-End Test** | Same intake + Fast preliminary + Deep complete review via loopback Ollama |

Mode is displayed in the sandbox UI and recorded in audit (`eva_submission_received`, `eva_deterministic_review_completed` / `eva_ai_review_completed`).

## Live model routing

| Profile | Model | Use |
| --- | --- | --- |
| Fast Operations | `qwen2.5:7b-instruct` | Missing info, completeness, preliminary risk flags |
| Deep Analysis | `glm-4.7-flash:q4_K_M` | Full EVA analysis, services, capital/EV readiness, Manny package |

Each hop records: requested/actual profile & model, fallback reason, queue/generation/total duration, schema result, confidence, retry count.

## Queues

- **Ready queue:** `Waiting on Manny` / `Needs More Information` only  
- **Revision queue:** `Failed` / pending AI — excluded until governed retry  

## Safety

`EvaIntakeEnabled`, `ClientEmailsEnabled`, `LocalAIWritesEnabled`, `LocalAIExternalMessagesEnabled` remain **false**. Local origin + loopback Ollama only.
