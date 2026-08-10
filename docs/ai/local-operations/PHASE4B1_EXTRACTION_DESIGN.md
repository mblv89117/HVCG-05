# Phase 4B-1 Extraction Design

## Principles

1. Prefer safest local extraction for each type.
2. Never execute macros, scripts, embedded executables, shell commands, document actions, or remote content.
3. Formulas and links are inspected as **text only**.
4. Distinguish **embedded**, **OCR**, and **model inference** text sources.
5. All extracted values are drafts.

## By type

| Type | Method | Behavior |
| --- | --- | --- |
| PDF | `pdf-parse` then optional OCR | Embedded text first; OCR pages when usable text is low or `forceOcr` |
| DOCX | `mammoth.extractRawText` | Text + note that objects/scripts are not executed |
| XLSX | `xlsx` sheet → CSV-like text | Metadata/sheet names/visible values; formulas as text; no recalculation |
| CSV | UTF-8 decode + neutralize | Lines starting with `=+/−@` treated as text; formula warning |
| TXT | UTF-8 (latin1 fallback) | Encoding validation warning if needed |
| PNG/JPG | Local tesseract | Image OCR only |

## PDF page mapping

- Embedded text attached to page blocks when available.
- OCR adds page-level blocks with `sourceKind: 'ocr'` and confidence.

## Failures

- Password-protected / encrypted PDFs → `encrypted_pdf` (400)
- Unsupported type → reject at staging
- Partial OCR failures recorded in `ocr.failedPages` without discarding successful pages
