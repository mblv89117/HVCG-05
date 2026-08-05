# Phase 4B-2 Architecture — Document Enrichment Hardening

**Branch:** `feature/atlas-local-ai-operations`  
**Depends on:** Phase 4B-1 (`4f16e96`)  
**Mode:** Manual local files only · draft outputs only · governed Ollama enrichment

## Flow

```
Manny selects file
 → local staging (gitignored)
 → malware scan gate (ClamAV if installed; else block / synthetic-test override)
 → deterministic extract + OCR
 → redaction preview + injection scan
 → Manny Approve Redacted Content
 → Fast or Deep Ollama enrichment (or mock enrichment in tests)
 → schema merge (deterministic wins on conflict)
 → draft review package
 → Manny decision (never moves/renames/writes)
```

## Components

| Area | Path |
| --- | --- |
| Enrichment schema | `packages/.../documentEnrichment.ts` |
| Ops / routing | `phase3Operations.ts`, `modelRouting.ts` |
| Malware gate | `apps/.../malwareScanner.ts` |
| OCR quality | `documentExtraction.ts` (OSD, sips preprocess, TSV confidence) |
| Fixtures | `documentFixtures.ts` |
| Orchestration | `documentReviewService.ts` + `LocalAiService.enrichStagedDocument` |
| HTTP | `/api/local-ai/documents/*`, `/compare`, `/multi-pack` |
| UI | `AiOperationsQueuePage.tsx` Document Review |

## Safety

Writes / ExternalMessages / EVA / ClientEmails remain **Off**. No SharePoint sync. No file movement.
