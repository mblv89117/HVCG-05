# Phase 4C-1 Backup and Restore Guide

- Local-only under `LOCAL_AI_DOCUMENT_BACKUP_DIR` (default `.data/local-ai-document-backups/`).
- Includes DB + schema version + metadata/decisions/corrections/audit/packs.
- Excludes staged originals by default.
- Manifest: checksum SHA-256, timestamp, version, dry-run flag.
- Encryption-ready (file permissions + future wrapper); no upload.
- Restore: validate → dry-run → authorized restore (auto safety backup first).
