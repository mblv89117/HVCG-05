# Phase 4B-1 Test Evidence

**Date:** 2026-08-05  
**Branch:** `feature/atlas-local-ai-operations`  
**Command:** `npm test --workspace=@hvcg/atlas-integration-api`

## Result

- **62 pass / 0 fail** (includes Phase 1–4A regression + Phase 4B-1 suites)

## Phase 4B-1 suites

- `phase4b1 document policies` — classify + deep type + naming
- `phase4b1 staging and extraction` — unsupported, injection, CSV/PDF, duplicate/purge/approve, MIME mismatch

## Local tooling observed

- tesseract `5.5.3`
- pdftoppm present (`/opt/homebrew/bin/pdftoppm`)
- npm: `pdf-parse@2.4.5`, `mammoth`, `xlsx`, `file-type`

## Feature flags (asserted in tests)

```
LocalAIWritesEnabled=false
LocalAIExternalMessagesEnabled=false
EvaIntakeEnabled=false
ClientEmailsEnabled=false
```
