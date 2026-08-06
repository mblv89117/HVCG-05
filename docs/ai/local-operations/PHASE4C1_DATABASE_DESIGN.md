# Phase 4C-1 Local Database Design

## Tables

- `schema_migrations` — versioned forward migrations
- `document_reviews` — full review record JSON + indexed columns
- `review_transitions` — audited status transitions
- `review_corrections` — Manny corrections (no auto-retrain)
- `review_decisions` — local approval decisions (side-effect flags always false)
- `multi_document_packs` / `multi_document_pack_members`
- `review_audit_events` — correlation-based audit
- `idempotency_keys` — staging/extract/enrich/decision/purge
- `interrupted_jobs` — restart recovery queue
- `purge_tombstones` — minimal audit after content purge

## Indexes

Status, client, checksum, filename, document type, decision, updated_at, audit review/correlation.
