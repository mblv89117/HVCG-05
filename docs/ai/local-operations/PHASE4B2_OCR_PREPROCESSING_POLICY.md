# Phase 4B-2 OCR Preprocessing Policy

Local-only (tesseract + macOS `sips` + poppler `pdftoppm`).

## Pipeline

1. Orientation detection (`tesseract --psm 0`)  
2. Rotate via `sips` when needed  
3. Grayscale / color-profile normalize attempt  
4. Resolution downsample when extremely large  
5. OCR with TSV confidence; PSM retry on low confidence  

## Rules

- Never silently replace stronger embedded text with weaker OCR.  
- Record preprocessing, dimensions, retry count, failed regions, confidence band.  
- Deskew beyond rotation is best-effort (`deskew_unavailable_sips` when true deskew unavailable).
