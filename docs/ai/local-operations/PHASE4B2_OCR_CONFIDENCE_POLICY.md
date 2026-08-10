# Phase 4B-2 OCR Confidence Policy

## Sources

Prefer Tesseract **TSV** word confidences when available; otherwise heuristic fallback with warning.

## Bands

| Band | Typical avg confidence |
| --- | --- |
| High confidence | ≥ 0.85 |
| Review recommended | ≥ 0.65 |
| Low confidence | ≥ 0.40 |
| Extraction unreliable | < 0.40 or null |

Low-confidence material fields require Manny review. OCR disclaimer remains mandatory.
