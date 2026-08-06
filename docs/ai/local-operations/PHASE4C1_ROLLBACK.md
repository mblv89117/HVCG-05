# Phase 4C-1 Rollback Plan

1. Stop local Integration Hub.
2. Restore prior SQLite from `.data/local-ai-document-backups/`.
3. Optionally delete `.data/local-ai-document-reviews/` to return to staging-JSON-only behavior (pre-4C-1 code required).
4. Do not touch Production tags or deploy.
