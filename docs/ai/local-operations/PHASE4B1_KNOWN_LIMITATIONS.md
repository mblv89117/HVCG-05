# Phase 4B-1 Known Limitations

1. **Ollama not invoked for document classify/name/folder in 4B-1** — deterministic heuristics select Fast/Deep *policy*; model enrichment deferred.
2. **Malware scan** is an integration point (`not_configured`), not a live AV engine.
3. **Synthetic fixture coverage** is partial for DOCX/XLSX binary builders, encrypted PDF, password-protected Office, rotated/poor images, scanned-only PDF — paths exist; expand fixtures before production use.
4. **OCR deskew / rotation detection** is basic (Tesseract PSM); no dedicated orientation model.
5. **Confidence for OCR** is approximate when Tesseract CLI does not emit TSV confidence.
6. **Upload transport** is base64 JSON to Hub (local); not a hardened multipart production API.
7. **No SharePoint sync**, no authoritative writes, no EVA, no external messages (by design).
8. Homebrew **tesseract** / **poppler** must be installed on the Mac mini for OCR paths.
