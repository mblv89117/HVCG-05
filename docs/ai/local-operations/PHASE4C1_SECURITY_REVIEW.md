# Phase 4C-1 Security Review

- Local file permissions 0600/0700
- Path traversal defense on backup/restore paths
- Parameterized SQL only (no raw query from document content)
- No secrets in DB; no public listener; no remote/external DB
- Correlation audit; purge/backup/restore authorization gates
