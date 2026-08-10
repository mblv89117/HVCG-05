# Phase 4C-1 Restart Recovery Guide

On Hub start:

1. Open SQLite and run migrations.
2. Hydrate any staging-only records into durable store.
3. Reload multi-document packs.
4. Mark in-progress extraction/malware/enrichment as interrupted.
5. Do **not** auto-reprocess, re-scan, or re-OCR without policy/Manny action.
6. Record recovery audit actions.
