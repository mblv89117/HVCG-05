# Phase 4B-1 Architecture — Local Document Intake / Extraction / OCR

**Branch:** `feature/atlas-local-ai-operations`  
**Depends on:** Phase 4A Fast Operations model (`db6a988`)  
**Mode:** Manual local file selection only · draft outputs only

## Objective

Reduce Manny’s time spent opening routine documents, classifying them, extracting dates/amounts/obligations, spotting missing pages/signatures, and preparing filing/naming recommendations — without moving files or writing authoritative records.

## Components

| Layer | Path |
| --- | --- |
| Schemas | `packages/atlas-integration-core/src/local-ai/documentIntake.ts` |
| Policies | `.../documentPolicies.ts` (classify, fields, naming, folder, duplicates) |
| Staging | `apps/atlas-integration-api/src/local-ai/documentStaging.ts` |
| Extraction / OCR | `.../documentExtraction.ts` |
| Orchestration | `.../documentReviewService.ts` |
| HTTP | `.../http.ts` (`/api/local-ai/documents*`) |
| Elite UI | `apps/atlas-elite-os/src/pages/local-ai/AiOperationsQueuePage.tsx` |

## Flow

```
Manny selects file in UI (explicit only)
 → Hub stages to gitignored local directory (safe name + checksum + TTL)
 → Extract embedded text (type-safe parsers)
 → OCR locally via tesseract only when needed (images / low embedded text / force)
 → Redaction + injection scan (treat text as untrusted)
 → Deterministic draft classification / fields / naming / folder / duplicate
 → Document Review Package (draftOnly)
 → Manny decisions (approve draft ≠ move/rename/write)
 → Manual purge or TTL expiration
```

## Extraction libraries

| Type | Tool | Notes |
| --- | --- | --- |
| PDF | `pdf-parse` v2 (`PDFParse`) | Embedded text first |
| PDF raster | Poppler `pdftoppm` | Local only, for OCR fallback |
| DOCX | `mammoth` | Raw text; no embedded execution |
| XLSX | `xlsx` | Sheet values + formulas as text; no macros |
| CSV/TXT | UTF-8 safe parse | Formula cells neutralized |
| Images | Tesseract CLI | Local OCR only |

## OCR

- Engine: **tesseract** (local Homebrew install)
- Version recorded per run (e.g. `tesseract 5.5.3`)
- No external OCR API
- Guards: max pages (40), timeouts, cancellation, page confidence, failed pages

## Model routing

Deterministic rules select **Fast Operations** vs **Deep Analysis** profile from proposed document type (`isDeepDocumentType`). Phase 4B-1 classification/naming/folder run as **local heuristics** with the selected profile recorded; Ollama enrichment is deferred (see known limitations).

Untrusted document text never chooses the model.

## Safety invariants

- `LocalAIWritesEnabled=false`
- `LocalAIExternalMessagesEnabled=false`
- `EvaIntakeEnabled=false`
- `ClientEmailsEnabled=false`
- No automatic SharePoint / Outlook / OneDrive / watched-folder ingest
- Approval never renames, moves, uploads, emails, or writes business records
- Staged files outside Git (`.data/local-ai-document-staging/`)
