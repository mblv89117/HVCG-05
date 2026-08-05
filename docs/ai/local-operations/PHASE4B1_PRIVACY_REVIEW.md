# Phase 4B-1 Privacy Review

## Data handling

- Staged files remain on the local machine under a configurable staging directory.
- Default TTL 24 hours; manual purge available.
- Redaction preview masks sensitive patterns before package display heuristics.
- Synthetic fixtures use `TEST —` banners; automated tests must not use real client files.

## Prohibitions (unchanged)

- No external model/OCR APIs
- No external communications
- No EVA intake
- No client-email automation
- No authoritative business-record writes
- No SharePoint sync in this phase

## Operator guidance

If Manny later selects a real client file for local review, purge the staged file after the review decision and do not commit extracted content.
