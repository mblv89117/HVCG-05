# Phase 4B-1 OCR Design

## Engine

- **Local only:** Tesseract CLI (`tesseract`)
- **PDF rasterization:** Poppler `pdftoppm` (PNG @ 150 DPI, capped pages)
- **No external OCR API**

## Capabilities

- Page-level OCR
- Mixed embedded-text + scanned PDF (OCR when embedded text is insufficient or forced)
- Partial failure (per-page)
- Cancellation via AbortSignal
- Timeout per OCR invocation
- Max pages: `DEFAULT_MAX_OCR_PAGES` (40)
- Image size / file-byte guardrails

## Recorded per run (`OcrRunSummary`)

- engine (`tesseract`)
- version string from `tesseract --version`
- pagesProcessed / pagesSkipped
- averageConfidence
- failedPages
- durationMs
- cancelled / timedOut
- disclaimer: **OCR-derived text is not guaranteed accurate**

## Presentation rules

- UI and packages must not present OCR text as guaranteed accurate.
- Embedded vs OCR vs model inference remain distinct (`TextSourceKind`).

## Rotation / poor quality

- Tesseract PSM 3 used; low-confidence and empty results surface as low confidence / failed pages.
- Dedicated deskew model not bundled in 4B-1 (known limitation).
