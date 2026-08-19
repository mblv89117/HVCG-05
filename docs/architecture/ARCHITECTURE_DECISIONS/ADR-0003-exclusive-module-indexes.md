# ADR-0003 — Exclusive Module Indexes; Locked Shared Indexes

| Field | Value |
|-------|--------|
| ID | ADR-0003 |
| Title | Exclusive module indexes; locked shared `_index.json` files |
| Status | Accepted |
| Date | 2026-07-15 |
| Decision owner | architect (affirming Master SF-001 / QA CF-001 direction) |

## Context

Operations Hub previously edited shared `flows/_index.json`, `definitions/_index.json`, `lists/_index.json`, and `command-center-views.json`, creating merge-unsafe tip residue (QA CF-001 / DEF-QA-001). Portal introduced exclusive `_module_index.json`.

## Problem

Shared indexes cannot be rewritten by parallel module branches without CORRUPTING the integration SoR.

## Options considered

1. Allow each module to edit shared indexes
2. Freeze shared indexes; modules use exclusive indexes; parent append-only replay
3. Generate indexes only at release packaging time

## Decision

**Option 2** (option 3 as future enhancement).  
Shared indexes are **locked**. Modules ship exclusive indexes (Portal pattern). Parent/integration replay appends approved entries later.

## Rationale

Matches Master decision SF-001 closure intent and QA merge-safety findings. Prevents recurring CONFLICT storms.

## Consequences

- Ops must finish tip hygiene for CF-001
- Architect rejects reviews that modify locked indexes without Master path-filter plan

## Affected modules

operations (immediate), all modules (ongoing), integration (merge packets).

## Migration / testing / rollback

Strip or path-filter divergent shared index commits; retest merge-base identity for the four locked files. Rollback = restore files to merge-base `b75b19b` (or current approved SoR commit).

## Related files and branches

Locked paths above; `cursor/operations-hub`; QA_CONFLICT_REPORT.md CF-001.
