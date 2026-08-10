# Phase 5A Architecture — Local Synthetic EVA Intake

**Branch:** `feature/atlas-local-ai-operations`  
**Mode:** Local sandbox only · synthetic test records · no Production EVA  
**Production baseline:** `atlas-v1.0.1-production` (untouched)

## Flow

Synthetic EVA form (Elite OS `/ai-operations/eva`)  
→ `POST /api/local-ai/eva/intake` (localhost / approved dev origin only)  
→ schema + size + rate + idempotency validation  
→ deterministic duplicate matching  
→ synthetic company / contact / prospect (never active client)  
→ local AI `review_eva_submission` (Deep: `glm-4.7-flash:q4_K_M`)  
→ structured Manny decision package  
→ local approval queue  

## Persistence

Separated SQLite: `.data/local-ai-eva/eva-intake.sqlite` (`LOCAL_AI_EVA_DB` override).  
Tables: submissions, companies, contacts, prospects, audit, failures, rate_limits.  
No SharePoint, Dataverse, OneDrive, Outlook, or Power Automate writes.

## Feature flags (must remain)

| Flag | Required state |
| --- | --- |
| `EvaIntakeEnabled` | **false** (Production EVA off; sandbox does not flip this) |
| `ClientEmailsEnabled` | **false** |
| `LocalAIWritesEnabled` | **false** |
| `LocalAIExternalMessagesEnabled` | **false** |
| `LocalAIEnabled` | may be true locally only |

## Key modules

| Layer | Path |
| --- | --- |
| Schemas / matching / review contract | `packages/atlas-integration-core/src/local-ai/evaIntake.ts` |
| Store | `apps/atlas-integration-api/src/local-ai/evaStore.ts` |
| Orchestration | `apps/atlas-integration-api/src/local-ai/evaService.ts` |
| HTTP | `apps/atlas-integration-api/src/local-ai/http.ts` (`/api/local-ai/eva/*`) |
| UI | `apps/atlas-elite-os/src/pages/local-ai/EvaSandboxPage.tsx` |

## Explicit non-goals (Phase 5A)

- Live website form connection  
- Production EVA enablement  
- Email / meeting / proposal / client activation  
- Authoritative business-record writes  
