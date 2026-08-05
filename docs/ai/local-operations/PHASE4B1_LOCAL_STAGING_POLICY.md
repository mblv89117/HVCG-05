# Phase 4B-1 Local Staging Policy

## Location

- Default: `<repo>/.data/local-ai-document-staging/` (gitignored)
- Override: `LOCAL_AI_DOCUMENT_STAGING_DIR`
- Limits: `LOCAL_AI_DOCUMENT_MAX_BYTES` (default 26214400), `LOCAL_AI_DOCUMENT_TTL_HOURS` (default 24)

## Per-file record

- `stagedFileId` + `correlationId`
- Generated **safe filename** (UUID-based); original filename retained as metadata only
- Declared MIME, detected MIME, size, SHA-256 checksum
- Status lifecycle: Staged → Extracting / OcrInProgress → ReadyForReview → ReviewComplete | Failed | Purged | Expired
- Malware-scan integration point (`malwareScanStatus`: `not_configured` until a local scanner is wired)
- Complete audit events on stage / process / decide / purge / cancel

## Controls

- Automatic expiration (TTL) + manual **Purge Staged File**
- Duplicate detection by checksum (and heuristics on process)
- Never committed to Git; never preserved indefinitely by default

## Forbidden

- Storing staged bytes in source control
- Writing staged files into authoritative business systems
- Auto-moving or renaming originals outside staging
