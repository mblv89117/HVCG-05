# Phase 4C-1 Architecture — Durable Local Review Store

**Branch:** `feature/atlas-local-ai-operations`  
**Depends on:** Phase 4B-2 (`6c17c19`)  
**Mode:** Local drafts only · SQLite persistence · no authoritative writes

## Objective

Survive Integration Hub and machine restarts without losing document review state, multi-document packs, corrections, approvals, or audit history.

## Storage

| Item | Value |
| --- | --- |
| Technology | Node built-in `node:sqlite` (`DatabaseSync`) |
| Default path | `<repo>/.data/local-ai-document-reviews/document-reviews.sqlite` |
| Env override | `LOCAL_AI_DOCUMENT_REVIEW_DB` |
| Permissions | DB `0600`, directory `0700` |
| Git | Gitignored (`.data/`, `*.sqlite*`) |
| Schema version | `1` / label `1.0.0-phase4c1` |

## Components

| Area | Path |
| --- | --- |
| Durable types / lifecycle | `packages/.../documentDurable.ts` |
| SQLite + migrations | `apps/.../documentReviewDb.ts` |
| Orchestration | `documentReviewService.ts` |
| HTTP | `/api/local-ai/documents/*` (search, packs, recovery, storage) |
| UI | `AiOperationsQueuePage.tsx` — Library, Packs, Recovery, Local Storage |

## Safety

Writes / ExternalMessages / EVA / ClientEmails remain **Off**. No SharePoint/OneDrive sync. No file movement. No email. No EVA.
