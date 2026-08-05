# Phase 4B-1 Owner Actions Required

1. Review staged document workflow on local Elite `/ai-operations` Document Review panel.
2. Confirm Homebrew tools available: `tesseract`, `pdftoppm` (poppler).
3. Confirm staging path is acceptable (`LOCAL_AI_DOCUMENT_STAGING_DIR` or default `.data/...`).
4. Decide whether to authorize Phase 4B-2 Ollama enrichment and/or malware scanner wiring.
5. Do **not** enable Writes / ExternalMessages / EVA / ClientEmails without a separate written authorization.
6. Do **not** push, merge, deploy, or move production tags for this worktree branch until authorized.
7. Purge any staged files that contained non-synthetic content after review.
