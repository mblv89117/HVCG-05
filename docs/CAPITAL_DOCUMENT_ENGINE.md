# Capital Document Engine

**As of:** 2026-08-17  
**Code:** `packages/atlas-capital-core/src/checklist.ts`, `intelligence.ts` (`classifyDocumentName`, `reviewDocument`, `detectDuplicate`)  
**SoR rows:** `HVCG_DocumentRequests` (checklist) + `HVCG_CapitalDocumentReviews` (advisory review)  
**Files:** existing SharePoint / client libraries. Originals are preserved. This engine does not rewrite source PDFs.

---

## Purpose

Generate a **transaction-type checklist**, track request/receipt/acceptance, and optionally run **advisory** classification and extraction. Completeness is operational. It is not a credit approval.

---

## Checklist generation

`generateChecklist(ctx)` filters `CHECKLIST_RULES` by `transactionType` and optional `applies` predicates (`realEstateComponent`, `personalGuaranteeExpected`, SBA, etc.).

Common required keys include formation, ownership, YTD P&L and balance sheet, 3-year business tax returns, 3 months bank statements, debt schedule, owner ID.

Conditional / type-specific examples (patterns, not legal advice):

| itemKey | When |
|---------|------|
| sba-1919, sba-413 | SBA families (use current successor form names in UI copy if SBA renumbers) |
| pfs | Personal guarantee expected |
| ar-aging, ap-aging | AR / ABL / WC |
| eq-invoice | equipment |
| re-psa, re-appraisal | CRE / acquisition / construction |
| construction-budget | construction |
| acq-quality-of-earnings | acquisition / recap |
| refi-notes | refinance / bridge |

`Requiredness`: `REQUIRED | OPTIONAL | CONDITIONAL`. `Condition` stores the human-readable predicate.

ACCG/Prodigy historical packages inform **shape only**. Do not load real client files into fixtures.

---

## Status model

Keep legacy `RequestStatus` on `HVCG_DocumentRequests`.

Operational checklist field: `ChecklistStatus`

`MISSING | REQUESTED | RECEIVED | NEEDS_REVIEW | INCOMPLETE | OUTDATED | ACCEPTED | NOT_APPLICABLE`

Blocking for required items: MISSING, REQUESTED, INCOMPLETE, OUTDATED, NEEDS_REVIEW (`isBlockingStatus`).

`completenessPercent` counts required, non-N/A items that are ACCEPTED.

`markOutdated` flips ACCEPTED → OUTDATED past `expiration` / current-through.

Human override requires `OverrideReason` + `OverrideBy` (`overrideChecklistItem`). Audit that write.

---

## Files and integrity

| Field | Use |
|-------|-----|
| FileLink | Existing URL to library object |
| SHA256 | Optional hash of the original bytes |
| VersionNumber | Metadata version; do not overwrite the original file |
| RelatedLenderId | Lender-specific addendum items |
| FolderTarget | Existing library folder hint |

`detectDuplicate` matches SHA-256 first, then file name. Duplicates are flagged on the review row (`DuplicateOf`), not silently dropped.

---

## Review pipeline (advisory)

1. Associate file to a checklist row / opportunity.
2. Optional AI job on existing `HVCG_AI*` lists (human-gated).
3. `reviewDocument` writes `HVCG_CapitalDocumentReviews`: type guess, summary, extracted facts.
4. Any incoming `VERIFIED` extraction is forced down from VERIFIED (core behavior). A human must confirm against the source document before Hub may set `VerificationStatus=VERIFIED` on the request or profile field.
5. Incomplete pages, stale, inconsistent period, Atlas conflicts stay on the review row.

Classifier confidence is a number, not a fact.

---

## Client requests

`consolidateMissingRequest` builds one outstanding-items message. Send remains a human step (draft email lists exist; no auto-send).

Portal visibility (`PortalVisible`) is unchanged policy: V1 default is request-link upload, not standing client membership.

---

## Limits

- Engine does not OCR in this worktree. Extraction is a future AI job output, still unverified.
- Engine does not submit packages to lenders.
- `RequestStatus` and `ChecklistStatus` can diverge until adapters keep them aligned; document that in Hub mapping when built.
