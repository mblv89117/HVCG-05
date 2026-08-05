# Phase 4B-1 Test Matrix

| Case | Expected | Automated |
| --- | --- | --- |
| Unsupported type rejection | 400 / throw | YES |
| MIME mismatch rejection | reject | YES |
| File-size limit | reject oversized | YES (policy; fixture small) |
| Page limit | OCR capped at 40 | code path |
| Duplicate checksum | `exact_duplicate` | YES |
| PDF embedded text | chars > 0 via pdf-parse | YES |
| OCR fallback | when forced / low text | manual / env with tesseract |
| DOCX extraction | mammoth path | library wired; expand fixtures later |
| XLSX safe inspection | no macro exec | library wired |
| CSV parsing + formula neutralize | warning | YES |
| Image OCR | tesseract | requires local binary |
| Injection detection | warnings | YES |
| Classification | invoice etc. | YES |
| Naming / folder | proposed, not applied | YES |
| Fast vs Deep policy | `isDeepDocumentType` | YES |
| No file movement / rename | flags false | YES |
| No authoritative write / external | flags false | YES |
| Staged purge | file removed | YES |
| Safety flags unchanged | all Off | YES |

**Command:** `npm test --workspace=@hvcg/atlas-integration-api`  
**Result:** recorded in `PHASE4B1_TEST_EVIDENCE.md`
