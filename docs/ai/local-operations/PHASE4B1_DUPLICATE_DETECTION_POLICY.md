# Phase 4B-1 Duplicate Detection Policy

## Signals

1. SHA-256 checksum (exact)
2. Normalized filename similarity
3. Extracted text sample overlap
4. Page count proximity
5. (Package-level) shared dates / parties / amounts when available from heuristics

## Statuses

| Status | Meaning |
| --- | --- |
| `exact_duplicate` | Same checksum |
| `probable_duplicate` | Strong filename/text overlap |
| `prior_version` | Related naming / version cues |
| `related_document` | Partial overlap |
| `unique` | No match |
| `unable_to_determine` | Insufficient evidence |

## Rules

- `fileDeleted: false` always
- Never auto-delete duplicates
- Manny may **Mark Duplicate** / **Mark Unique** on the review record only
