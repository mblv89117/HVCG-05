# Phase 3 Architecture — Controlled Live Content (Read-Only)

**Branch:** `feature/atlas-local-ai-operations`  
**Depends on:** Phase 1 `52e3296`, Phase 2 `7766165`  
**Phase:** Controlled live-content packs through the governed AI job lifecycle  
**Mode:** Read-only drafts only

## Objective

Prove the Local AI Operations Agent can reduce Manny’s administrative workload by drafting from **manually selected and anonymized** content — without writing authoritative Atlas records or sending communications.

## Installed models (discovery)

| Model | Role |
| --- | --- |
| `glm-4.7-flash:q4_K_M` | **Deep Analysis Model** and **Fallback Model** |

**Fast Operations Model:** not configured — no distinct faster model is installed. Fast operations fall back to Deep with recorded reason `no_faster_model_installed`.

**Do not auto-pull.** Recommended faster options awaiting owner authorization: `llama3.2:3b`, `qwen2.5:7b-instruct`, `phi4-mini`, `gemma2:9b`.

Config keys (`.secrets/local-ai.env`, gitignored): `OLLAMA_DEEP_MODEL`, `OLLAMA_FAST_MODEL`, `OLLAMA_FALLBACK_MODEL`.

## Components

| Layer | Path |
| --- | --- |
| Model routing | `packages/atlas-integration-core/src/local-ai/modelRouting.ts` |
| Content packs | `.../contentPack.ts` + API `LocalAiService` |
| Document / meeting / client packs | `documentReviewPack.ts`, `meetingWorkflow.ts`, `clientOperationsPack.ts` |
| Time protection | `timeProtectionOutput.ts` |
| Performance | `performanceMetrics.ts` |
| HTTP | `apps/atlas-integration-api/src/local-ai/http.ts` |
| Elite UI | `apps/atlas-elite-os/src/pages/local-ai/AiOperationsQueuePage.tsx` |

## Flow

```
Manny initiates Content Pack
 → source confirm + client + sensitivity + auditCorrelationId
 → redaction + injection preview (local)
 → Approve Redacted / Edit Redactions / Cancel
 → (only after Approve) AI Job + model routing audit
 → Loopback Ollama draft (no tools / no shell / no DB)
 → time-protection classification
 → Waiting on Manny / Draft Ready
 → approve / reject / return / archive / no-action / automation / eliminate
```

Approval accepts a **draft for later use** only. It never triggers an external action or authoritative write while `LocalAIWritesEnabled=false`.

## Safety invariants

- Localhost-only Ollama (`127.0.0.1`)
- No external model calls
- No tool / shell / direct DB access from the model path
- No automated file movement or communications
- No record writes, client conversion, financial actions, lender outreach, social/website publishing, or calendar changes
- Flags default Off: Writes, ExternalMessages, EvaIntake, ClientEmails
