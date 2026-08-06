# Phase 4C-1 Schema and Migrations

- Forward migration v1 creates all durable tables.
- Startup runs migrations inside a transaction; failure rolls back.
- Incomplete schema throws on open (no silent destructive migration).
- Backup before restore; restore requires `authorized=true`.
- Rollback: restore prior `.sqlite` backup from `.data/local-ai-document-backups/`.
