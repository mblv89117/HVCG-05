# ADR-BA-V2-003 — Absolute GO vs Written QA GO (scope distinction)

**Status:** ACCEPTED (documentation)  
**Date:** 2026-08-11  
**Authority:** CR-HVCG-BA-V2-001 / Owner clarity for future engineers  
**Does not reopen:** Production Absolute GO release

## Decision

Atlas maintains **two distinct gates**:

1. **Absolute GO (Production Elite cut)**  
   - Evidence: tag `atlas-v1.0.1-production` → commit `dceea798`, merged lineage on `origin/main`.  
   - Meaning: the Absolute GO Production cut for Elite was authorized and evidenced.  
   - Scope: that Production Absolute GO package — **not** a blanket statement that every Atlas workstream has Written QA GO.

2. **Written QA GO**  
   - Historical Atlas reporting: **Written QA GO NOT ISSUED** remains accurate for programs/workstreams that never received a separate Written QA GO artifact.  
   - Absolute GO **does not equal** Written QA GO.  
   - Do not fabricate a Written QA GO document to “reconcile” the labels.

## Interpretation for engineers

| Phrase | Means | Does not mean |
|--------|-------|---------------|
| Absolute GO | Evidenced Production Absolute GO for the tagged Elite cut | Every module has Written QA GO |
| Written QA GO NOT ISSUED | No separate Written QA GO artifact for the referenced program scope | Absolute GO was invalid or must be reopened |

## Rules

- Do not reopen a valid Absolute GO release without new Owner evidence.  
- Do not invent QA artifacts.  
- Future BA V2 / Revenue Experience work remains **Development-only** until separately authorized for Production.  
- When reporting status, cite **both** labels with this ADR as the canonical distinction.

## Related

- `ADR-BA-V2-001` (SoR / Current State discrepancy handling)  
- Tag `atlas-v1.0.1-production`  
- `PROJECT_ATLAS/Reports/HVCG_V2_UI_OWNERSHIP_SPRINT4.md`
